import {
  DEFAULT_POMODORO_CONFIG,
  DEFAULT_SCHEDULE,
  FOCUS_ALARM_NAME,
  HISTORY_LIMIT,
  SCHEDULE_ALARM_NAME,
  STORAGE_KEYS,
  bumpToday,
  getToday,
  storageGet,
  storageSet
} from '../utils/storage.js';
import { findOpenBlockedTabs, normalizeSites, redirectTab } from './blocking.js';

const DEFAULT_FOCUS_MINUTES = 25;

const BADGE_BG = '#CCFF00';
const BADGE_BREAK_BG = '#7BB0FF';
const BADGE_FG = '#0A0A0A';

function clampInt(value, min, max, fallback) {
  const num = Number.parseInt(value, 10);
  return Number.isFinite(num) && num >= min ? Math.min(num, max) : fallback;
}

export function normalizePomodoroConfig(raw = {}) {
  return {
    focusMinutes: clampInt(raw.focusMinutes, 1, 24 * 60, DEFAULT_POMODORO_CONFIG.focusMinutes),
    shortBreakMinutes: clampInt(raw.shortBreakMinutes, 1, 24 * 60, DEFAULT_POMODORO_CONFIG.shortBreakMinutes),
    longBreakMinutes: clampInt(raw.longBreakMinutes, 1, 24 * 60, DEFAULT_POMODORO_CONFIG.longBreakMinutes),
    rounds: clampInt(raw.rounds, 1, 12, DEFAULT_POMODORO_CONFIG.rounds)
  };
}

export function isBreakPhase(pomodoroState) {
  return pomodoroState?.phase === 'shortBreak' || pomodoroState?.phase === 'longBreak';
}

async function setBadge(text, backgroundColor = BADGE_BG) {
  try {
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color: backgroundColor });

    if (chrome.action.setBadgeTextColor) {
      await chrome.action.setBadgeTextColor({ color: BADGE_FG });
    }
  } catch {
    // Action API unavailable while the worker is tearing down.
  }
}

export async function updateBadge() {
  const state = await storageGet([
    STORAGE_KEYS.COUNTERS,
    STORAGE_KEYS.IS_FOCUS,
    STORAGE_KEYS.IS_PAUSED,
    STORAGE_KEYS.POMODORO_STATE
  ]);

  if (!state[STORAGE_KEYS.IS_FOCUS]) {
    await setBadge('');
    return;
  }

  if (state[STORAGE_KEYS.IS_PAUSED]) {
    await setBadge('II');
    return;
  }

  if (isBreakPhase(state[STORAGE_KEYS.POMODORO_STATE])) {
    await setBadge('BRK', BADGE_BREAK_BG);
    return;
  }

  const counters = state[STORAGE_KEYS.COUNTERS] || {};
  const total = Object.values(counters).reduce((sum, n) => sum + n, 0);

  await setBadge(total ? String(total) : 'ON');
}

export async function getSnapshot() {
  const state = await storageGet([
    STORAGE_KEYS.SITES,
    STORAGE_KEYS.LIST_MODE,
    STORAGE_KEYS.PROFILES,
    STORAGE_KEYS.ACTIVE_PROFILE,
    STORAGE_KEYS.IS_FOCUS,
    STORAGE_KEYS.IS_PAUSED,
    STORAGE_KEYS.IS_STRICT,
    STORAGE_KEYS.START_TS,
    STORAGE_KEYS.END_TS,
    STORAGE_KEYS.REMAINING_MS,
    STORAGE_KEYS.LAST_USED_TIME,
    STORAGE_KEYS.MODE,
    STORAGE_KEYS.POMODORO_CONFIG,
    STORAGE_KEYS.POMODORO_STATE,
    STORAGE_KEYS.SOUND_ENABLED,
    STORAGE_KEYS.DAILY_GOAL_MIN,
    STORAGE_KEYS.SCHEDULE,
    STORAGE_KEYS.COUNTERS,
    STORAGE_KEYS.SESSION_HISTORY
  ]);

  return { ...state, today: await getToday() };
}

/** Active rule set `{ sites, listMode }`. Empty `sites` while idle, paused, or on a Pomodoro break. */
export async function getActiveRuleSet() {
  const state = await storageGet([
    STORAGE_KEYS.SITES,
    STORAGE_KEYS.LIST_MODE,
    STORAGE_KEYS.IS_FOCUS,
    STORAGE_KEYS.IS_PAUSED,
    STORAGE_KEYS.POMODORO_STATE
  ]);

  if (
    !state[STORAGE_KEYS.IS_FOCUS]
    || state[STORAGE_KEYS.IS_PAUSED]
    || isBreakPhase(state[STORAGE_KEYS.POMODORO_STATE])
  ) {
    return { sites: [], listMode: 'block' };
  }

  return {
    sites: state[STORAGE_KEYS.SITES] || [],
    listMode: state[STORAGE_KEYS.LIST_MODE] === 'allow' ? 'allow' : 'block'
  };
}

/** Blocked sites currently in force. Empty while idle, paused, or on a Pomodoro break. */
export async function getActiveSites() {
  const { sites } = await getActiveRuleSet();
  return sites;
}

export async function recordAttempt(site) {
  const blockedSite = String(site || '').trim();

  if (!blockedSite) {
    return null;
  }

  const state = await storageGet([STORAGE_KEYS.COUNTERS]);
  const counters = { ...(state[STORAGE_KEYS.COUNTERS] || {}) };

  counters[blockedSite] = (counters[blockedSite] || 0) + 1;

  await storageSet({ [STORAGE_KEYS.COUNTERS]: counters });
  const today = await bumpToday({ attempts: 1, sites: { [blockedSite]: 1 } });
  await updateBadge();

  return {
    sessionCount: counters[blockedSite],
    todayCount: today.sites[blockedSite] || 0
  };
}

export async function clearCounters() {
  await storageSet({ [STORAGE_KEYS.COUNTERS]: {} });
  await updateBadge();
}

async function enforceOpenTabs(sites, listMode = 'block') {
  const hits = await findOpenBlockedTabs(sites, listMode);
  await Promise.all(hits.map(hit => redirectTab(hit.tabId, hit.site)));
  return hits;
}

async function beginPhase({ minutes, sites, listMode, strict, pomodoroState = null, extraStorage = {}, enforce = true }) {
  const startTs = Date.now();
  const endTs = startTs + minutes * 60000;

  const current = await storageGet([STORAGE_KEYS.SITES, STORAGE_KEYS.LIST_MODE, STORAGE_KEYS.IS_STRICT]);
  const requested = Array.isArray(sites) ? sites : current[STORAGE_KEYS.SITES] || [];
  const normalized = normalizeSites(requested);
  const resolvedListMode = listMode === 'allow' || listMode === 'block'
    ? listMode
    : (current[STORAGE_KEYS.LIST_MODE] === 'allow' ? 'allow' : 'block');
  const resolvedStrict = typeof strict === 'boolean' ? strict : Boolean(current[STORAGE_KEYS.IS_STRICT]);

  await chrome.alarms.clear(FOCUS_ALARM_NAME);
  await storageSet({
    [STORAGE_KEYS.SITES]: normalized,
    [STORAGE_KEYS.LIST_MODE]: resolvedListMode,
    [STORAGE_KEYS.IS_FOCUS]: true,
    [STORAGE_KEYS.IS_PAUSED]: false,
    [STORAGE_KEYS.IS_STRICT]: resolvedStrict,
    [STORAGE_KEYS.START_TS]: startTs,
    [STORAGE_KEYS.END_TS]: endTs,
    [STORAGE_KEYS.REMAINING_MS]: 0,
    [STORAGE_KEYS.COUNTERS]: {},
    [STORAGE_KEYS.POMODORO_STATE]: pomodoroState,
    ...extraStorage
  });

  await chrome.alarms.create(FOCUS_ALARM_NAME, { when: endTs });
  if (enforce) {
    await enforceOpenTabs(normalized, resolvedListMode);
  }
  await updateBadge();
}

export async function startFocus(minutes, sites, options = {}) {
  const focusMinutes = Number.isFinite(minutes) && minutes > 0
    ? Math.min(Math.round(minutes), 24 * 60)
    : DEFAULT_FOCUS_MINUTES;

  await beginPhase({
    minutes: focusMinutes,
    sites,
    listMode: options.listMode,
    strict: Boolean(options.strict),
    pomodoroState: null,
    extraStorage: { [STORAGE_KEYS.LAST_USED_TIME]: focusMinutes }
  });
}

export async function startPomodoro(config, sites, options = {}) {
  const normalizedConfig = normalizePomodoroConfig(config);

  await beginPhase({
    minutes: normalizedConfig.focusMinutes,
    sites,
    listMode: options.listMode,
    strict: Boolean(options.strict),
    pomodoroState: {
      phase: 'focus',
      round: 1,
      ...normalizedConfig
    },
    extraStorage: {
      [STORAGE_KEYS.MODE]: 'pomodoro',
      [STORAGE_KEYS.POMODORO_CONFIG]: normalizedConfig
    }
  });
}

async function recordCompletedOrStoppedFocus(state, completed) {
  const now = Date.now();
  const startTs = state[STORAGE_KEYS.START_TS] || now;
  const endTs = state[STORAGE_KEYS.END_TS] || now;
  const counters = state[STORAGE_KEYS.COUNTERS] || {};

  const plannedMs = Math.max(0, endTs - startTs);

  // Elapsed time, not remaining.
  //
  // While paused there is no usable "now": the wall clock keeps moving but the
  // session does not, so derive the figure from the frozen remainder instead.
  // While running, resumeFocus has already pushed startTs past any pauses, so
  // now - startTs is honest; cap it in case the worker slept past the alarm.
  const focusedMs = state[STORAGE_KEYS.IS_PAUSED]
    ? Math.max(0, plannedMs - (state[STORAGE_KEYS.REMAINING_MS] || 0))
    : Math.max(0, Math.min(now - startTs, plannedMs));

  const session = {
    date: new Date(now).toISOString(),
    focusedMs,
    plannedMinutes: Math.round(plannedMs / 60000),
    completed,
    counters
  };

  const history = state[STORAGE_KEYS.SESSION_HISTORY] || [];
  history.push(session);

  await storageSet({
    [STORAGE_KEYS.SESSION_HISTORY]: history.slice(-HISTORY_LIMIT)
  });

  await bumpToday({ focusMs: focusedMs, sessions: 1 });
  return session;
}

/**
 * Ends the session (or advances the Pomodoro cycle on natural completion)
 * and files focus blocks in history.
 *
 * `completed` separates the alarm firing (ran to the end) from the user
 * stopping early, so the summary can report both honestly.
 */
export async function stopFocus({ completed = false } = {}) {
  const state = await storageGet([
    STORAGE_KEYS.COUNTERS,
    STORAGE_KEYS.START_TS,
    STORAGE_KEYS.END_TS,
    STORAGE_KEYS.IS_FOCUS,
    STORAGE_KEYS.IS_PAUSED,
    STORAGE_KEYS.IS_STRICT,
    STORAGE_KEYS.REMAINING_MS,
    STORAGE_KEYS.SESSION_HISTORY,
    STORAGE_KEYS.POMODORO_STATE,
    STORAGE_KEYS.SITES
  ]);

  if (!state[STORAGE_KEYS.IS_FOCUS]) {
    await chrome.alarms.clear(FOCUS_ALARM_NAME);
    await updateBadge();
    return null;
  }

  const pomo = state[STORAGE_KEYS.POMODORO_STATE] || null;
  const inBreak = isBreakPhase(pomo);

  if (!completed && state[STORAGE_KEYS.IS_STRICT] && !inBreak) {
    return null;
  }

  await chrome.alarms.clear(FOCUS_ALARM_NAME);

  let session = null;
  if (!inBreak) {
    session = await recordCompletedOrStoppedFocus(state, completed);
  }

  if (pomo && completed) {
    if (pomo.phase === 'focus') {
      const nextPhase = pomo.round >= pomo.rounds ? 'longBreak' : 'shortBreak';
      const breakMinutes = nextPhase === 'longBreak'
        ? pomo.longBreakMinutes
        : pomo.shortBreakMinutes;

      await beginPhase({
        minutes: breakMinutes,
        sites: state[STORAGE_KEYS.SITES] || [],
        pomodoroState: { ...pomo, phase: nextPhase },
        enforce: false
      });

      return session;
    }

    const nextRound = pomo.phase === 'longBreak' ? 1 : pomo.round + 1;
    await beginPhase({
      minutes: pomo.focusMinutes,
      sites: state[STORAGE_KEYS.SITES] || [],
      pomodoroState: { ...pomo, phase: 'focus', round: nextRound },
      enforce: true
    });

    return null;
  }

  await storageSet({
    [STORAGE_KEYS.IS_FOCUS]: false,
    [STORAGE_KEYS.IS_PAUSED]: false,
    [STORAGE_KEYS.IS_STRICT]: false,
    [STORAGE_KEYS.START_TS]: 0,
    [STORAGE_KEYS.END_TS]: 0,
    [STORAGE_KEYS.REMAINING_MS]: 0,
    [STORAGE_KEYS.POMODORO_STATE]: null
  });

  await updateBadge();
  return session;
}

export async function skipBreak() {
  const state = await storageGet([
    STORAGE_KEYS.IS_FOCUS,
    STORAGE_KEYS.POMODORO_STATE,
    STORAGE_KEYS.SITES
  ]);

  const pomo = state[STORAGE_KEYS.POMODORO_STATE];
  if (!state[STORAGE_KEYS.IS_FOCUS] || !isBreakPhase(pomo)) {
    return null;
  }

  const nextRound = pomo.phase === 'longBreak' ? 1 : pomo.round + 1;
  await beginPhase({
    minutes: pomo.focusMinutes,
    sites: state[STORAGE_KEYS.SITES] || [],
    pomodoroState: { ...pomo, phase: 'focus', round: nextRound },
    enforce: true
  });

  return { round: nextRound };
}

export async function pauseFocus() {
  const state = await storageGet([
    STORAGE_KEYS.IS_FOCUS,
    STORAGE_KEYS.IS_PAUSED,
    STORAGE_KEYS.IS_STRICT,
    STORAGE_KEYS.POMODORO_STATE,
    STORAGE_KEYS.END_TS
  ]);

  if (
    !state[STORAGE_KEYS.IS_FOCUS]
    || state[STORAGE_KEYS.IS_PAUSED]
    || (state[STORAGE_KEYS.IS_STRICT] && !isBreakPhase(state[STORAGE_KEYS.POMODORO_STATE]))
  ) {
    return;
  }

  const remainingMs = Math.max(0, (state[STORAGE_KEYS.END_TS] || Date.now()) - Date.now());

  await chrome.alarms.clear(FOCUS_ALARM_NAME);
  await storageSet({
    [STORAGE_KEYS.IS_PAUSED]: true,
    [STORAGE_KEYS.REMAINING_MS]: remainingMs
  });

  await updateBadge();
}

export async function resumeFocus() {
  const state = await storageGet([
    STORAGE_KEYS.IS_FOCUS,
    STORAGE_KEYS.IS_PAUSED,
    STORAGE_KEYS.REMAINING_MS,
    STORAGE_KEYS.START_TS,
    STORAGE_KEYS.END_TS,
    STORAGE_KEYS.SITES,
    STORAGE_KEYS.LIST_MODE,
    STORAGE_KEYS.POMODORO_STATE
  ]);

  if (!state[STORAGE_KEYS.IS_FOCUS] || !state[STORAGE_KEYS.IS_PAUSED]) {
    return;
  }

  const remainingMs = state[STORAGE_KEYS.REMAINING_MS] || 0;

  if (remainingMs <= 0) {
    await stopFocus({ completed: true });
    return;
  }

  const now = Date.now();
  const endTs = now + remainingMs;

  // Push the start forward by however long we sat paused, so that
  // elapsed time in history excludes the pause.
  const pausedSinceTs = (state[STORAGE_KEYS.END_TS] || now) - remainingMs;
  const pausedForMs = Math.max(0, now - pausedSinceTs);

  await storageSet({
    [STORAGE_KEYS.IS_PAUSED]: false,
    [STORAGE_KEYS.END_TS]: endTs,
    [STORAGE_KEYS.START_TS]: (state[STORAGE_KEYS.START_TS] || now) + pausedForMs,
    [STORAGE_KEYS.REMAINING_MS]: 0
  });

  await chrome.alarms.create(FOCUS_ALARM_NAME, { when: endTs });
  if (!isBreakPhase(state[STORAGE_KEYS.POMODORO_STATE])) {
    const mode = state[STORAGE_KEYS.LIST_MODE] === 'allow' ? 'allow' : 'block';
    await enforceOpenTabs(state[STORAGE_KEYS.SITES] || [], mode);
  }
  await updateBadge();
}

function parseHHMM(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export async function syncScheduleAlarm() {
  const state = await storageGet([STORAGE_KEYS.SCHEDULE]);
  const schedule = { ...DEFAULT_SCHEDULE, ...(state[STORAGE_KEYS.SCHEDULE] || {}) };

  await chrome.alarms.clear(SCHEDULE_ALARM_NAME);
  if (schedule.enabled) {
    await chrome.alarms.create(SCHEDULE_ALARM_NAME, { periodInMinutes: 1 });
  }
}

export async function checkSchedule(nowDate = new Date()) {
  const state = await storageGet([
    STORAGE_KEYS.SCHEDULE,
    STORAGE_KEYS.IS_FOCUS,
    STORAGE_KEYS.SITES,
    STORAGE_KEYS.LIST_MODE
  ]);

  if (state[STORAGE_KEYS.IS_FOCUS]) {
    return false;
  }

  const schedule = { ...DEFAULT_SCHEDULE, ...(state[STORAGE_KEYS.SCHEDULE] || {}) };
  const sites = state[STORAGE_KEYS.SITES] || [];

  if (!schedule.enabled || !sites.length) {
    return false;
  }

  const day = nowDate.getDay();
  if (!Array.isArray(schedule.days) || !schedule.days.includes(day)) {
    return false;
  }

  const startMin = parseHHMM(schedule.start);
  const endMin = parseHHMM(schedule.end);
  if (startMin === null || endMin === null || endMin <= startMin) {
    return false;
  }

  const nowMin = nowDate.getHours() * 60 + nowDate.getMinutes();
  if (nowMin < startMin || nowMin >= endMin) {
    return false;
  }

  const remainingMin = Math.max(1, endMin - nowMin);
  await startFocus(remainingMin, sites, {
    listMode: state[STORAGE_KEYS.LIST_MODE]
  });
  return true;
}

export async function toggleFocus() {
  const state = await storageGet([
    STORAGE_KEYS.IS_FOCUS,
    STORAGE_KEYS.IS_PAUSED,
    STORAGE_KEYS.MODE,
    STORAGE_KEYS.LAST_USED_TIME,
    STORAGE_KEYS.POMODORO_CONFIG,
    STORAGE_KEYS.SITES,
    STORAGE_KEYS.LIST_MODE
  ]);

  if (state[STORAGE_KEYS.IS_FOCUS]) {
    if (state[STORAGE_KEYS.IS_PAUSED]) {
      await resumeFocus();
    } else {
      await pauseFocus();
    }
    return;
  }

  const sites = state[STORAGE_KEYS.SITES] || [];
  if (!sites.length) {
    return;
  }

  if (state[STORAGE_KEYS.MODE] === 'pomodoro') {
    await startPomodoro(state[STORAGE_KEYS.POMODORO_CONFIG], sites, {
      listMode: state[STORAGE_KEYS.LIST_MODE]
    });
  } else {
    await startFocus(state[STORAGE_KEYS.LAST_USED_TIME] || DEFAULT_FOCUS_MINUTES, sites, {
      listMode: state[STORAGE_KEYS.LIST_MODE]
    });
  }
}

/** Re-arms the alarm after a browser restart or service-worker respawn. */
export async function restoreState() {
  await syncScheduleAlarm();

  const state = await storageGet([
    STORAGE_KEYS.IS_FOCUS,
    STORAGE_KEYS.IS_PAUSED,
    STORAGE_KEYS.END_TS,
    STORAGE_KEYS.SITES
  ]);

  if (!state[STORAGE_KEYS.IS_FOCUS] || state[STORAGE_KEYS.IS_PAUSED]) {
    await updateBadge();
    await checkSchedule();
    return;
  }

  const endTs = state[STORAGE_KEYS.END_TS] || 0;

  if (endTs <= Date.now()) {
    await stopFocus({ completed: true });
    return;
  }

  await chrome.alarms.create(FOCUS_ALARM_NAME, { when: endTs });
  await updateBadge();
}
