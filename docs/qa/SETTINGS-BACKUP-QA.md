# Settings backup, restore and delete QA

Run on 2026-11-04. Headless Chromium (Playwright), viewport 375x667, local static server (`tools/serve.mjs`), fresh browser context per run. Two runs: service worker blocked, and service worker allowed (shell and runtime caches present). Scratch scripts were kept outside the repo and deleted.

## Seed data
Keys written through `window.alef.store`: `settings` (congregation ashkenazi, theme dark, goal both, voice m, script cursive, israelTrack on, lat/lon set), `morning.prefs` (on, 06:30, rescue 21:15, eravLatest 13:00, observant, freeze, dates), `notify.prefs` (enabled, 08:45, days Mon/Wed/Fri, shabbatQuiet off), `srs.cards`, `curriculum.progress`, plus the boot-written `streak`. A flag `alef.audioBannerSeen.v1` and an extra cache `alef-user-test` were also created.

## Observed results
| Check | Result |
|---|---|
| Page width at 375 | No horizontal overflow. |
| Export | File `alef-backup-2026-11-04.json` downloaded; contains all six store keys. The `alef.*` flag keys are not in the backup (they are not store keys). |
| Delete, box unticked, no service worker | Store emptied; `alef.*` flags removed; the extra cache removed; message "Deleted all saved progress and settings from this device, and 1 offline cache." |
| Delete, box unticked, worker present | Store and flags emptied; `alef-user-test` removed; `alef-shell-*` and `alef-runtime-v1` caches and the worker registration stayed (matches the code comment in `wipeAllData`). |
| Delete, box ticked, worker present | All caches (2 counted at that point) and the worker registration removed; message mentions removing the service worker. |
| Import after delete | Preview shown ("6 will be added"); confirm restored 6 items. `settings`, `morning.prefs`, `notify.prefs`, `srs.cards`, `curriculum.progress` identical to before (JSON compare). After a page reload the Settings screen showed voice m, congregation ashkenazi, goal both, script cursive, theme dark. |
| Right after restore, before reload | Radio buttons still showed the old defaults (sephardi, etc.) while the store held the restored values. The status line says to reload the page. Not changed. |
| Corrupt files (truncated JSON, tampered checksum, empty, `{}`, binary bytes) | Each refused with "Could not restore: <reason>. Your progress on this device was not changed."; confirm box stayed hidden. |
| Backup from schema 99 | Refused: "Backup is from a newer Aleph (schema 99). Your progress on this device was not changed." Storage identical afterwards (compared in the service-worker run; see note). |
| Keyboard | Import is a `button`; Enter and Space on it each opened the file chooser. After choosing a file, focus moved to "Replace my progress with this backup"; Enter confirmed; focus returned to the Import button. Cancel returned focus to Import and said nothing was changed. The file input itself is `tabindex=-1` (the button is the keyboard route). |
| Page errors | None in either run. |

Note: in the first run the "storage unchanged" comparison after bad files read false. A separate check showed the cause is the boot code rewriting `alef:streak` (`freeze` false to true, following `morning.prefs.freeze`) after a reload; a bad-file import on its own changed nothing. The second run compared equal for all six bad files.

## Defect found and fixed
Delete text said it removed "the offline copies of the app" every time, but the app and runtime caches are only removed when the service-worker box is ticked. `src/shell/settings.view.js` now says: "Tick the box below to remove the offline copy of the app too." and the checkbox reads "Also remove the offline copy of the app (Aleph will need a connection to open next time)" (wording from `docs/review/COPY-AUDIT.md`). No change was needed in `settings.data.js` or `store.js`.

## Tests
`tests/settings.roundtrip.browser.test.js` now also seeds `settings`, `morning.prefs`, `notify.prefs`, refuses a schema-99 file, checks the Import button opens the file chooser with Enter, and checks the new delete text. Passing: that test, `store.safety`, `settings.keys`, `settings.update`, `credits`, `progress.backup`, `pwa.backup` (all run individually). `node tools/meta/scan.mjs --text` passed. The full `npm test` did not finish within the time available here and was stopped, so it was not confirmed.
