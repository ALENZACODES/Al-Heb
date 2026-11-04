# ALEF project handoff

Updated: 2026-11-04

This work continues from main commit `40df88d37bc0befa399b2b1941cf572b4bfe0ff7`. The app remains a functional draft pending the content and publishing decisions in `docs/COMPLETION.md`.

## Changes

- Placement now saves an accepted starting lesson separately from completed lessons. That lesson is usable, completion unlocks the next lesson, and Home resumes at the correct point. Earlier lessons are never falsely marked complete.
- Lesson and review writes report failures and retain a retry path. Review answers, Progress and Class Track no longer render literal `null` text.
- Browser storage access cannot crash startup when denied. Existing readable progress survives a full storage area. Backup imports validate before mutation and roll back on failure. If rollback cannot persist, Settings explicitly tells the learner to export the retained session copy before closing.
- Service-worker shell files stay immutable within their version. Updates wait for the learner's Reload action and refuse activation while another ALEF tab is open. Runtime refreshes remain alive until cache writes finish; cache quota errors do not discard successful responses.
- Sound-status details have a keyboard-accessible button. The typing keyboard wraps within narrow phones and retains 44-pixel targets.
- Hosted photo scanning explains and disables unsupported online vowels and local-helper integrations. Localhost development retains explicit opt-in. The security policy was not broadened.
- Windows file-URL conversions and command entry checks now work. Book font/image URLs use URL separators. Generated-text comparisons accept CRLF without ignoring substantive differences. Runtime line endings are pinned for stable precache hashes.
- Deployment tests build their own fixture instead of requiring an existing `dist`. Browser smoke is a required CI check, with a dedicated multi-tab update regression. The smoke test waits for loaded Home state; the tracing harness refreshes geometry before each stroke. No tracing thresholds or letter data were weakened.
- Older status reports are marked historical; strategy evidence now points at the tracked QR generator rather than an absent generated folder.

- Streak initialization now finishes before lesson actions become available, preserving earned history and consistently requiring five minutes of active learning. Home, Learn and Progress explain the rule; initially hidden tabs do not accrue time.

## Validation

- Full Node suite: 1,100 passed, 22 skipped, zero failures. Skips are optional browser/external-tool checks; browser checks below were run separately with Edge/Playwright.
- Deployment checker: 42/42 passed. Six informational warnings identify external origins in source; hosted network access remains governed by the existing policy.
- Browser smoke: 30 route states, onboarding, lesson completion, saved review ratings and offline shell reload passed.
- Initial deep browser sweep: 390 visits across phone/desktop, light/dark and fresh/seeded states. It exposed the repaired null-text and keyboard issues. One transient update error occurred while source files were being edited; final checks use the integrated source.
- Repaired Progress, Class Track and typing screens checked at 320, 390 and 1280 pixels: no stray null text or clipped keyboard keys.
- Interaction suite: all 31 checks passed, including Bet tracing and its saved completion badge. Its earlier failure did not reproduce; the harness now waits for fonts and refreshes stroke coordinates.
- Real-browser update regression: old module bytes stay unchanged, the new worker waits, a second tab blocks activation, and explicit single-tab activation loads matching new document/modules.
- Five offline routes passed: Home, Learn, Letters, Sounds and Read.
- Final targeted sweep: 35 visits across seven repaired/integrated routes, zero console/page errors, overflow, clipping, stray null text or unnamed controls. The sound-details target was subsequently enlarged to 44 pixels and rechecked.

## Continue here

1. Read `docs/COMPLETION.md` before treating this as a production course. Native Hebrew/clergy approval, recordings, approved artwork, licensing and real-device checks remain outstanding. Do not change review flags without actual reviewer decisions.
2. Choose the host before rebuilding book QR codes; `book/config.json` still contains a placeholder domain. No production deployment was made in this review.
3. Run `npm test`. Browser checks require Playwright: `node tools/smoke.mjs`, `node tools/qa/update.cjs`, and `node tools/qa/walk.mjs`. `QA_CHROME` optionally selects an installed Chromium-family browser. `--out` keeps smoke/QA artifacts outside tracked documentation; `--routes` narrows a QA walk to comma-separated known paths.
4. After runtime edits, run `node tools/build-precache.mjs` last. Build the deployable app with `node tools/deploy/make-dist.mjs`, then run `node tools/deploy/check-deploy.mjs`.
5. Preserve third-party license and attribution notices. This review does not choose a project license or grant missing content rights.
