# Rimon animation — Task 2

Verified November 8, 2026, in the local app, after integrating main at b68bc518.

## Implementation

- One 1254 × 1254 transparent sprite sheet, arranged in four rows and four columns. All 16 cells have distinct pixel hashes (recorded in rimon-results.json).
- Open, half-closed and closed eyes; left/right wink; yawn; stretch; two laughs; bounce; sad; thinking; pointing; two wave poses; breathing pose.
- Shared clock and lightweight DOM controller: breathing, random 3–6-second blinks, initial wave, correct-answer laugh/bounce, wrong-answer shake, 60-second idle yawn, next-lesson pointing and earned-streak stretching.
- Real answer events come from the shared game session, arcade score/miss handlers, Word Finder, curriculum exercises and the home builder. Lesson pointing follows a successful save and links to an available lesson. Award changes trigger stretching only for newly earned streak badges.
- The companion belongs to the app shell, so it survives route changes and remains on all game results, Awards, Progress and Daily. Home also has an inline companion. Phone corner controls support dismiss, persistence within the tab and restore.
- Reduced motion is static from initial load and when the setting changes. Animation timers stop while hidden, dismissed or reduced. No animation library or runtime image service.

## Verified counts

129 focused checks passed: 122 across the mascot, arcade, lesson saves, exercises, builder, site and awards suites; seven additional game robustness/accessibility checks. The arcade suite mounts and starts all 30 arcade games. Its local-file handling now works on Windows.

Browser checks:
- 16 distinct sprite cells; zero missing mascot assets.
- Main, Awards, Progress and Daily: four routes checked at 375px; main hero also checked at 1280px.
- Three actual game endings at each of 960px and 375px: Tug-of-War, arcade Word Builder and Word Finder (six completed sessions). Rechecked after the latest Tug-of-War update.
- Initial and dynamically changed reduced motion; dismiss, reload while dismissed and restore.
- 60-second idle yawn with the browser clock advanced; no minute-long real-time idle recording.
- Zero uncaught browser errors in these runs; zero console errors in the final main-page check.
- No new audio clips in this task. Task 1 playback counts remain in builder.md; its listening feedback is clarified as conditional, not a pronunciation certification.

The committed rimon-animation.gif is exactly 20 seconds, 768 × 640. It records the real page: initial wave and idle blinking, a wrong builder tap at about 7 seconds, a completed word at 9.5 seconds, saved-lesson pointing at 12.5 seconds and an earned streak at 16 seconds. For repeatability, the last two call the real lesson-save and award-settlement functions using test data in an isolated browser profile. They are not a claim of studying for three days during the recording.

## Limits

Not every game was played to its ending in this task. All routes share the same companion, and the three different end-screen families above were exercised. Exhaustive game play-throughs remain Task 4. Mobile checks used a 375px browser viewport, not physical iOS/Android devices. Screen-reader announcements were not checked with assistive hardware. No independent pronunciation review was performed.

The initial broader run found a Tug-of-War replay issue and stale game-test imports; the newer main commit fixed these, and the corresponding seven checks now pass. No unresolved failure remains in the reported focused suites.

## Reproduce locally

Start the static server. Set RIMON_URL to its address. Run tools/qa/qa-rimon.mjs, then tools/qa/qa-rimon-games.mjs. Set PLAYWRIGHT_MODULE and BROWSER_EXECUTABLE when using a separately installed browser runtime. The video recorder must be available in that runtime's browser directory. Intermediate video lives outside the repository under work/rimon-video. Export its first 20 seconds at 12 frames per second to docs/qa/rimon-animation.gif.

Run:

    node --test tests/games.arcade.test.js tests/shell.rimon.test.js tests/curriculum.save-failure.test.js tests/curriculum.exercises.test.js tests/home.builder.test.js tests/site.quality.test.js tests/awards.model.test.js tests/games.retry-a11y.test.js tests/games.robustness.test.js

## Changed files

Runtime: index.html; precache-manifest.js; assets/css/rimon.css; assets/img/rimon/rimon-sprite.png; src/app.js; src/shell/rimon.js, rimon-model.js, rimon-events.js, showcase.js; src/games/engine.js, arcade.js, wordfinder.view.js; src/home/builder.js; src/curriculum/actions.js, exercises.ui.js.

Verification: tests/shell.rimon.test.js, games.arcade.test.js, site.quality.test.js; tools/qa/qa-rimon.mjs, qa-rimon-games.mjs; docs/qa/rimon-results.json, rimon-animation.gif, rimon-home.png, rimon-desktop.png, rimon-phone.png, rimon-game-end-375.png, rimon-game-end-960.png, rimon.md; docs/images/rimon-animation.md. Also corrected the conditional listening note in docs/qa/builder.md.
