# Rimon animation

Verified November 8, 2026. This update extends the initial Rimon integration with full movement sequences and slower, action-specific timing.

## Movement

Twelve active transparent sprite sheets, each a four-column by three-row grid. Each action has 12 distinct drawings: a starting pose, ten intermediate frames, and a finishing pose. There are 144 active frames in total. Actions: wave, blink, wink, laugh, jump, high-five, nervous nail-biting, gentle disappointment, thinking, pointing, stretching and yawning. The original reference and earlier sixteen-pose sheet are retained.

Jumping is brisk; thinking, nail-biting, stretching and yawning unfold more slowly. The animator holds anticipation, the main gesture and the finish. Repeated scoring cannot restart an unfinished sequence. A single pending reaction prioritizes achievements. Idle breathing is subtle, with randomized blinks every 3–6 seconds and a yawn after 60 seconds without interaction.

The home-page mascot remains in its existing hero position, moving into a dismissible corner when that area scrolls out of view. The shell companion remains available on games, results, Awards, Progress and Daily. Phone placement clears the bottom navigation. Dismissal persists within the browser tab and can be reversed. Reduced motion shows one static frame, including after the preference changes.

## Connections

Existing game session, arcade score/miss, Word Finder, curriculum exercise and builder signals are preserved. Correct answers celebrate, every third consecutive session answer winks, and every fifth high-fives. Low arcade time prompts nail-biting. Results react to stars; newly earned badges stretch. Successful lesson saves retain a link to the next available lesson. No scoring, badge criteria or audio content is changed by the animation.

## Verification

- 148 focused tests passed, including all 30 arcade games mounting and starting.
- 12 sheets load, 144 distinct cells, zero missing mascot assets.
- Real builder correct/wrong taps and shared arcade scoring, misses and finishing checked in the browser.
- Home, Awards, Progress and Daily checked; phone controls tested at 375px.
- Static reduced-motion state, hide/restore, reload persistence, saved-lesson link and 60-second yawn checked. The yawn check advances the browser clock.
- Zero uncaught browser errors in the recorded run.

The approximately 22-second rimon-animation.gif shows the actual home-page component at 280 × 332 pixels. It includes waving, idle blinking, jumping, high-fiving, nail-biting and stretching. The recording sends explicit reaction events so the timing is repeatable; separate checks exercise real game and lesson functions.

The latest game-end results are recorded in rimon-results.json. Not every game has been played to completion. Phone testing uses a browser viewport rather than a physical phone. Audio and pronunciation were not re-audited in this animation update.

## Reproduce

Set PLAYWRIGHT_MODULE and BROWSER_EXECUTABLE if using an external browser installation. Run tools/qa/qa-rimon.mjs; it starts a local server and saves screenshots and capture frames outside the repository. For actual game endings, start the static server, set RIMON_URL, then run tools/qa/qa-rimon-games.mjs. GIF export uses the captured frames with their recorded timing.

Runtime changes are in src/shell/rimon.js, rimon-events.js, assets/css/rimon.css, the twelve named sheets under assets/img/rimon, and the shared game/lesson connections. The old rimon-model.js and rimon-sprite.png are retained for reference; the active animator uses the twelve-frame sheets.

## Speech bubbles

Added all ten requested encouragements in pointed Hebrew with the English directly underneath. The speech bubble sits beside Rimon, pops in when a reaction begins, and stays long enough to read. It clears the phone navigation and disappears with the mascot when dismissed. A short animation is suppressed for reduced-motion users, while the text still responds to game events.

Every Friday in the visitor's local calendar, Shabbat Shalom remains in the bubble alongside any reaction message. The date is rechecked while the page is open and when the tab becomes visible, including Friday/Saturday midnight boundaries. No sound is added; these are written speech bubbles.

151 focused tests pass. Browser checks cover desktop, 375px phone positioning, Hebrew/English order, reduced motion, hide/restore, and both Friday midnight transitions, with zero uncaught page errors. Reproduce with tools/qa/qa-rimon-bubbles.mjs. The phrase list and action mapping live in src/shell/rimon-speech.js.

Speech timing: first encounter shows Shalom / Hello. Encouragement is scheduled after five minutes and every five minutes thereafter; game signals select the next scheduled phrase without creating extra popups. Tired and pomegranate-break phrases require 15 minutes without site interaction or one hour since the encounter. Fridays retain Shabbat Shalom. Verified the timing boundaries with unit tests and mobile/desktop browser checks. The deployment explicitly includes assets/img/rimon; optional tracing and typing modules load on demand to keep the initial cache at 3.93 MiB. All 45 deployment checks pass.
