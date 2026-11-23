import {
  DEFAULT_POMODORO_CONFIG,
  FOCUS_ALARM_NAME,
  HISTORY_LIMIT,
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
    STORAGE_KEYS.IS_FOCUS,
    STORAGE_KEYS.IS_PAUSED,
    STORAGE_KEYS.START_TS,
    STORAGE_KEYS.END_TS,
    STORAGE_KEYS.REMAINING_MS,
    STORAGE_KEYS.LAST_USED_TIME,
    STORAGE_KEYS.MODE,
    STORAGE_KEYS.POMODORO_CONFIG,
    STORAGE_KEYS.POMODORO_STATE,
    STORAGE_KEYS.COUNTERS,
    STORAGE_KEYS.SESSION_HISTORY
  ]);

  return { ...state, today: await getToday() };
}

/** Blocked sites currently in force. Empty while idle, paused, or on a Pomodoro break. */
export async function getActiveSites() {
  const state = await storageGet([
    STORAGE_KEYS.SITES,
    STORAGE_KEYS.IS_FOCUS,
    STORAGE_KEYS.IS_PAUSED,
    STORAGE_KEYS.POMODORO_STATE
  ]);

  if (
    !state[STORAGE_KEYS.IS_FOCUS]
    || state[STORAGE_KEYS.IS_PAUSED]
    || isBreakPhase(state[STORAGE_KEYS.POMODORO_STATE])
  ) {
    return [];
  }

  return state[STORAGE_KEYS.SITES] || [];
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

async function enforceOpenTabs(sites) {
  const hits = await findOpenBlockedTabs(sites);
  await Promise.all(hits.map(hit => redirectTab(hit.tabId, hit.site)));
  return hits;
}

async function beginPhase({ minutes, sites, pomodoroState = null, extraStorage = {}, enforce = true }) {
  const startTs = Date.now();
  const endTs = startTs + minutes * 60000;

  const requested = Array.isArray(sites)
    ? sites
    : (await storageGet([STORAGE_KEYS.SITES]))[STORAGE_KEYS.SITES] || [];
  const normalized = normalizeSites(requested);

  await chrome.alarms.clear(FOCUS_ALARM_NAME);
  await storageSet({
    [STORAGE_KEYS.SITES]: normalized,
    [STORAGE_KEYS.IS_FOCUS]: true,
    [STORAGE_KEYS.IS_PAUSED]: false,
    [STORAGE_KEYS.START_TS]: startTs,
    [STORAGE_KEYS.END_TS]: endTs,
    [STORAGE_KEYS.REMAINING_MS]: 0,
    [STORAGE_KEYS.COUNTERS]: {},
    [STORAGE_KEYS.POMODORO_STATE]: pomodoroState,
    ...extraStorage
  });

  await chrome.alarms.create(FOCUS_ALARM_NAME, { when: endTs });
  if (enforce) {
    await enforceOpenTabs(normalized);
  }
  await updateBadge();
}

export async function startFocus(minutes, sites) {
  const focusMinutes = Number.isFinite(minutes) && minutes > 0
    ? Math.min(Math.round(minutes), 24 * 60)
    : DEFAULT_FOCUS_MINUTES;

  await beginPhase({
    minutes: focusMinutes,
    sites,
    pomodoroState: null,
    extraStorage: { [STORAGE_KEYS.LAST_USED_TIME]: focusMinutes }
  });
}

export async function startPomodoro(config, sites) {
  const normalizedConfig = normalizePomodoroConfig(config);

  await beginPhase({
    minutes: normalizedConfig.focusMinutes,
    sites,
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
  await chrome.alarms.clear(FOCUS_ALARM_NAME);

  const state = await storageGet([
    STORAGE_KEYS.COUNTERS,
    STORAGE_KEYS.START_TS,
    STORAGE_KEYS.END_TS,
    STORAGE_KEYS.IS_FOCUS,
    STORAGE_KEYS.IS_PAUSED,
    STORAGE_KEYS.REMAINING_MS,
    STORAGE_KEYS.SESSION_HISTORY,
    STORAGE_KEYS.POMODORO_STATE,
    STORAGE_KEYS.SITES
  ]);

  if (!state[STORAGE_KEYS.IS_FOCUS]) {
    await updateBadge();
    return null;
  }

  const pomo = state[STORAGE_KEYS.POMODORO_STATE] || null;
  const inBreak = isBreakPhase(pomo);

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
    STORAGE_KEYS.END_TS
  ]);

  if (!state[STORAGE_KEYS.IS_FOCUS] || state[STORAGE_KEYS.IS_PAUSED]) {
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
    await enforceOpenTabs(state[STORAGE_KEYS.SITES] || []);
  }
  await updateBadge();
}

/** Re-arms the alarm after a browser restart or service-worker respawn. */
export async function restoreState() {
  const state = await storageGet([
    STORAGE_KEYS.IS_FOCUS,
    STORAGE_KEYS.IS_PAUSED,
    STORAGE_KEYS.END_TS,
    STORAGE_KEYS.SITES
  ]);

  if (!state[STORAGE_KEYS.IS_FOCUS] || state[STORAGE_KEYS.IS_PAUSED]) {
    await updateBadge();
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
