# Changelog

All notable changes to **Lock In** are documented in this file.

## [1.2.0] - 2026-11-23

### Added
- **Strict mode (`strict`)**: disables Pause and Unlock during active focus sessions until the timer finishes (Pomodoro breaks remain unlocked).
- **Allowlist mode (`block | allow only`)**: invert the list to block all `http(s)` sites except the ones you allow.
- **Quick profiles (`default`, `work`, `study`)**: switch between independent site lists in one click.
- **Local Web Audio chime**: gentle 2-note cue when a focus or break phase finishes, with a mute toggle in the popup.
- **Global keyboard shortcut (`Alt+Shift+L`)**: start, pause, or resume Lock In without extra permissions.
- **Summary page (`summary.html`)**:
  - **Clean sessions (%)** and **Daily goal (%)** stats.
  - **Daily goal** target setting (minutes/day).
  - **Auto-lock schedule** by start/end time and weekdays.
  - **Export / Import JSON** local backup.
- **Blocked page (`blocked.html`)**: displays the current Pomodoro round (e.g., `locked · 2/4`).

### Fixed
- Forwarded `strict` and `listMode` options in the local preview harness (`tools/harness.js`).

## [1.1.1] - 2026-11-23

### Added
- **6 new languages**: French (`fr`), German (`de`), Italian (`it`), Japanese (`ja`), Korean (`ko`), and Simplified Chinese (`zh_CN`), alongside English, Portuguese (BR), and Spanish (9 languages total).
- **Compact language selector**: accessible dropdown menu in the header with SVG flags and native language names.
- **GitHub Actions release workflow** (`.github/workflows/release.yml`): runs `npm test`, `npm run zip`, and publishes GitHub Releases on `v*` tags.
- **Localized Chrome Web Store SEO copy** for all 9 languages in `docs/store-listing.md`.

### Fixed
- Prevented mode toggle clipping in longer translations (such as French) at `344px` popup width.

## [1.1.0] - 2026-11-23

### Added
- **Pomodoro mode**: configurable focus, short break, long break, and round counts with automatic transitions, round pips, `BRK` badge, and a **Skip break** action.
- Automatic unlocking of blocked sites during Pomodoro breaks and immediate re-enforcement when the next focus round starts.

## [1.0.4] - 2026-09-16

### Changed
- Documentation, store screenshots, and minor copy fixes.

## [1.0.3] - 2026-09-15

### Changed
- Repository URL alignment and commands documentation (`docs/commands.md`).

## [1.0.0] - 2026-09-10

### Added
- Initial release of Lock In: timed website blocker with domain, path, and keyword matching, per-site attempt counter, block page, 14-day summary & streak tracking, and `en` / `pt_BR` / `es` translations.
