# Learner journey with the first synthetic clips present (2026-11-05)

Real-browser walk of the learning path (run on the tree after the concurrent audio-wording commit `ad58191`, rebased onto `3c4eda4`) at 360x640 and 390x844, fresh profile each time, now that 87 synthetic word clips are in the tree. It is headless Chrome 153 (touch and mobile emulation) driven by `tools/qa/journey-clips.mjs`. The script writes a JSON record of every step (`--out`; default `docs/qa/journey-clips/journey-clips.json`, not committed here). Screenshots (360 px, 22 PNGs, about 1.3 MB in total) are in `docs/qa/journey-clips/`.

**Nothing here was heard.** Headless Chrome has no audio output. For a clip the script records which file the page asked for (`audio/m/israeli/word/r07-w1.mp3`) and whether the media element fired `ended` or an error. That says the file was requested, decoded and finished; it says nothing about how it sounds or whether the Hebrew is right. The "device voice" cases use a stub `speechSynthesis` (one Hebrew voice, no voice, or an English-only voice) so the three button states can be reached on purpose; they are not a real phone's voices.

## The clips that exist (measured: read from `data/audio/*.json` and the files)

- 87 clips, all `synthetic-unreviewed`, all `source: outside-synthetic`, all voice `m` (man), all tradition `israeli`, all kind `word`. 35 are in `data/audio/manifest.json` (lesson-word ids such as `r07-w1`), 52 are in `data/audio/manifest-words-israeli.json` (vocabulary ids such as `h85cda534`).
- Zero clips for letters, vowels, prayer lines, or for the Woman voice, Sephardi or Ashkenazi. `manifest-words-sephardi.json` and `manifest-words-ashkenazi.json` have 0 non-missing entries. `data/audio/equivalence.json` has no rules, so no Israeli clip may stand in for another tradition.
- Reachability, computed by building the app's own player on the shipped manifests over all 940 lesson-word slots and all 448 word-trace words (generous: it loads the Israeli shard for every setting):

| Setting | Lesson-word slots with a clip | Word-trace words with a clip |
|---|---|---|
| Woman + Sephardi (the default) | 0 of 940 | 0 of 448 |
| Woman + Israeli | 0 | 0 |
| Man + Sephardi | 40 (only items flagged `israeli-only`, the Israel-track phrasebook) | 8 |
| Man + Israeli | 45 | 12 |

## Product finding: does a default learner ever reach a clip?

**No.** The default settings are Woman voice (`voice: 'f'`) and Sephardi (`congregation: 'sephardi'`) (`src/shell/settings.js`). A learner who finishes first run on the default answers, completes lessons r01 to r06, and then reaches lesson r07 ("Alef and He", first word "dad") or the word-trace word "dad" gets the **browser's device voice**, never the clip that exists for that very word. I pressed it: the page spoke the Hebrew text through the stub device voice and no mp3 was requested (`media` log empty, `spoken` contained the word). Two independent gates block the clip, and both are deliberate honesty rules:

1. Voice: the player never swaps a man's voice for a woman's or the reverse (`src/audio/player.js`). The default is Woman; every clip is Man.
2. Tradition: a clip may stand in for another tradition only through a human-reviewed rule in `data/audio/equivalence.json`, which is empty on purpose. The Sephardi shard that a default learner downloads (0.9 MB; it is also offered on the Offline page) contains 0 clips.

What the default learner sees instead, by device:

| Device | Lesson Listen button (r07 "dad") | Word-trace Hear button |
|---|---|---|
| Has a Hebrew voice | "Listen", note after press: "Device voice, not a recorded teacher; Israeli-style only." Sound bar: browser text-to-speech, "reads Israeli pronunciation, not Sephardi". | "Hear the word" with the chip "Device voice, not a recorded teacher; Israeli-style only" |
| No speech synthesis at all | lesson: the Listen buttons are replaced by "No audio yet" (seen on r07 in the Israeli/Man run with no voice; same code path) | "No audio yet", no button |
| Speech synthesis with only a non-Hebrew voice | same as no speech | "No audio yet" |

Nothing on those screens tells the learner that a clip for this word exists in another voice and style. The only way to reach one is to know to change Voice to Man and Pronunciation style to Israeli in Settings. Even then, Settings says "The Man and Woman choice is saved for later. It does not change the sound yet.", which is no longer true for Man + Israeli.

Proposal (not applied): `docs/release/patches/clips-default/`. It keeps both gates and adds an opt-in, labelled "Hear the synthetic Israeli man clip" button where a clip exists for the item in that voice and style.

## Steps (360 px; every step was also run at 390 and behaved the same except line wrapping; 0 console errors, 0 page errors, 0 HTTP 400+, 0 sideways scroll in all 12 profile runs)

Profiles: **D** = default settings (Woman, Sephardi), stub Hebrew device voice, onboarding done through the real screens. **IM** = Israeli + Man set up front, with a Hebrew device voice (IM-dev), no speech synthesis (IM-none), or only an English voice (IM-en). **D-none / D-en** = default settings with no speech / English-only voice.

| # | Step | Profile | Result | Screenshot |
|---|---|---|---|---|
| 1 | First run, open the app | D | Redirects to `#/welcome`. Goal and "can you read letters" questions; "No, start from the beginning" then Continue. | 01-first-run-welcome |
| 2 | Pronunciation step | D | Sephardi pre-selected. Note: "No Sephardi audio yet. You chose to hear the device voice anyway..." The learner has not chosen anything (see wording). "Start without sound" and its description now on two lines (was run together, fixed). | 02-after-welcome |
| 3 | Continue | D | "Starting point: Your first 10 minutes. Sephardi pronunciation." plus a 7-day plan. | 02b-after-pronunciation |
| 4 | Home | D | "Learn your first letter: Shin (2 min)", "No reviews due". Yellow bar: "Sound: the list has not been loaded yet." | 03-home |
| 5 | Settings | D | Voice Woman (Noa) and Sephardi selected. Settings now states the 87 synthetic clips in the intro, then still says "The Man and Woman choice is saved for later. It does not change the sound yet." "What is ready" is a collapsed disclosure. | 04-settings |
| 6 | First 10 minutes, press "Hear it" | D | Device voice spoke the Hebrew for Shin (stub). Note: "Playing it with the browser voice: a computer voice, not a person. It speaks Israeli Hebrew, not Sephardi and may ignore the vowel points." | 05-firstday |
| 7 | Letters Shin, Bet | D | Letter pages have 0 Hear/Listen buttons. Nothing to hear, nothing claims there is. | 06-letter-shin, 06-letter-bet |
| 8 | Vowel lesson r01, press Listen on Kamatz | D | Note: "Device voice, not a recorded teacher; Israeli-style only." No letter or vowel clip exists. | 07-lesson-r01-vowel |
| 9 | Complete r01 to r06 by the quick checks (first option each time) | D | All six reported "Lesson complete". | none |
| 10 | Lesson r05, Priestly Blessing | D | Three prayer lines, each with Listen and Read. Line 1 Listen: device voice. No clip exists for any blessing word. Layout defect found and fixed here (below). | 11-lesson-r05 |
| 11 | Lesson r07, press Listen on "dad" | D | Device voice, no mp3 (see finding). | 10-lesson-r07-default |
| 12 | Word trace pick screen | D | After r01 to r06: 6 letters known, 18 words. Preview banner shown. | 08-wordtrace-pick |
| 13 | Word trace, a word with no clip ("brother") | D | "Hear the word", chip "Device voice...". Pressing: device voice. | 09-wordtrace-noclip-device |
| 14 | Word trace, no voice at all | D-none | One "Hear the word" button with the chip "Checking audio..." (before the fix) or "No audio yet" and no button (after). | 15-default-none-wordtrace |
| 15 | Word trace, clip word "dad" | IM-dev | Button "Hear the word", chip "Synthetic voice (outside generator; Israeli style not verified; not a recorded teacher; unreviewed)". Pressing: `audio/m/israeli/word/r07-w1.mp3` requested, `ended`. Sound bar: "Synthetic voice (...) (man, Israeli)." | 20-wordtrace-clip-device |
| 16 | Same, no speech / English-only voice | IM-none, IM-en | Identical: the clip needs no speech voice. | (same image) |
| 17 | Word trace, a word with no clip | IM-dev / IM-none / IM-en | Device voice chip / "No audio yet" / "No audio yet". | 09 / 21-wordtrace-noclip-none |
| 18 | Lesson r07, press Listen on "dad" | IM-dev, IM-none, IM-en | Clip requested and ended in all three. Note after the fix: "Playing a computer-made clip, not a recording: Synthetic voice (...unreviewed)." Before the fix it said "Playing a recorded file." | 22-lesson-r07-device, 22-lesson-r07-none |
| 19 | Review session | D | After r01 to r06: "Card 1 of 6", Show answer, rate; the Listen button on the card is the device voice. | 12-review |
| 20 | About, readiness text | D, IM | "Audio: not ready. 87 short word clips with a synthetic voice, unreviewed by native speakers; no recorded teacher; the rest of the app uses your device voice when it has a Hebrew voice. 87 of 24,906 planned clips exist, and none is a person recording." | 13-about, 24-about-with-clips |
| 21 | Offline page (no service worker in this run) | D | "Offline use is not switched on for this page yet", "0 of 339 files are saved". Its closing note says the synthetic word clips are fetched when played and that whether one works offline "has not been tested" (step 22 tested it). | 14-offline |
| 22 | Offline, with the real service worker (separate probe, Israeli/Man) | IM | Clip played online once, then went offline and reloaded: the media element errored (code 4) and the note said "No sound: the browser voice reported an error." Clips are not cached by the worker (Range requests bypass its cache, see `sw.js`). | none Superseded 2026-11-05: the worker now caches clips played with Range requests, see `../audio/RANGE-AND-OFFLINE.md`. |
| 23 | How this works, sound paragraph | D | Before the concurrent wording commit it said "no synthetic voice files exist either" (false). Now it states the 87 clips. It still says "the Man (Ari) / Woman (Noa) choice cannot change it yet". | none |

Other measured facts: "Start the next word" in word trace landed on a clip word ("dad") on 15 of 30 presses at default settings, but only 2 distinct words appeared in 30 presses (it alternates between the first two unfinished words when none is finished). The "Hear the word" button is 153x44 px (measured); lesson Listen buttons are 104x48.

## Defects

| # | Where | Defect | How found | Severity | Status |
|---|---|---|---|---|---|
| 1 | Lesson r05, prayer lines 2 and 3, at 360, 390 and 412 px | The Listen and Read buttons and the line title were squeezed to 0 to 9 px wide and pushed past the card edge (the Hebrew line took its full single-line width). Line 1 only just fit. Not caught by the sideways-scroll test because the overflow is clipped inside the card. | seen in the 360 screenshot, then measured (columns `264px 8.9px` and `273px 0px`) | high (cannot press Listen or Read on two of the three blessing lines) | fixed: `assets/css/learn.css` closing block, one column for `.alef-line`. Test: `tests/journey-clips.browser.test.js`. Same rule covers the shared markup in `src/curriculum/lesson.parts.js`. |
| 2 | Lesson Listen note | After playing a synthetic clip the note said "Playing a recorded file." (`describePlay`). The sound bar was right; the note beside the button was not. | pressed Listen on "dad" with Israeli + Man | high (a computer-made, unreviewed clip described as a recording) | fixed: `src/curriculum/audio-ui.js`. Tests in `tests/audio.ui.test.js` and the browser test. |
| 3 | How this works | Said "no synthetic voice files exist either". 87 exist. | read the page | medium (false claim) | fixed by the concurrent commit `ad58191` (my edit to the same paragraph was dropped in the rebase in favour of it). |
| 4 | Word trace Hear button | Reached through the pick screen, the button stayed on "Checking audio..." indefinitely (checked for 8 s; the clip list was loaded within 100 ms). The shell skips its one re-render mid-exercise. The label (synthetic clip, device voice or nothing) only appeared after the button was pressed, and a learner with no voice saw a button that led to "No audio yet". | measured with a 100 ms, 2 s and 8 s sample | medium | fixed: `audioButton` in `src/shell/audio-access.js` re-reads the state once the list loads. Test in the browser test file. |
| 5 | First run, pronunciation step | "Start without sound" ran straight into its description ("Start without soundEvery first-day step..."). The label lacked the class that stacks them. | seen in the screenshot | low | fixed: `src/onboarding/firstrun.view.js` (class only). Test in the browser test file. |
| 6 | Offline page | Said spoken clips "none are recorded yet" and did not mention the synthetic clips. | step 22 probe | medium | fixed by `ad58191` (new wording says they are fetched when played and offline use "has not been tested"). My measurement, a clip played online errored offline, is not in that sentence; see Left. |

Fixes 1, 2, 4 and 5 each have a browser test that fails on the code before the change and passes after (checked by stashing that change). Fix 3 and 6 came from the other commit; `tests/audio.ui.test.js` keeps two small guards (How this works must not say no synthetic files exist; the Offline page must mention the synthetic voice and not claim clips are saved).

Left, not fixed:

- Default learners cannot reach any clip (product finding above; proposal in `docs/release/patches/clips-default/`).
- Offline: a clip played online is not served offline (step 22, measured with the real service worker, error code 4). The Offline page says this "has not been tested"; it has now been, for one clip. The fallback sentence in the lesson note then blames "the browser voice" even though a clip was tried. Not changed: it needs a decision about caching clips, and the precache and headroom rules are out of scope here.
- Lesson Listen buttons (`playButton` in `src/curriculum/audio-ui.js`) show no state before they are pressed, unlike word trace. A learner cannot tell clip from device voice until after pressing.
- The yellow sound bar on every screen reads "Sound: the list has not been loaded yet." until something asks about audio, and its text is cut to two lines at 360 px ("Full message" opens it). After the clip list loads it says "0 clips listed as 'Recorded by a human reader' and 35 as 'Synthetic voice...'" while About says 87: the bar counts only the core list (the other 52 are in a per-tradition list loaded on demand). Known from the phone QA (row 15).
- "Hear the word" in word trace is 44 px tall. Word trace is a Preview route, outside the 48 px rule's 15 routes.
- The checkbox "Include letters I have not traced yet" on the word-trace pick screen sits below four rows of buttons at 360x640; a new learner with 0 known letters sees an empty state telling them to tick a box they have to scroll to find. (The script uses `?any=1` instead.)
- Word rows in lessons (r07) have a ragged left edge: the Hebrew column is as wide as each word, so the gloss starts at a different x on each row (seen, not measured).

## Confusing wording (left, needs a product call)

- "No Sephardi audio yet. You chose to hear the device voice anyway" is shown to a learner who has chosen nothing: `browserVoiceAnyway` defaults to true (`src/pronunciation/forTradition.js`, `audioSupport`). It says "You chose" about a default.
- Settings: "The Man and Woman choice is saved for later. It does not change the sound yet." and How this works: "the Man (Ari) / Woman (Noa) choice cannot change it yet". Both are false for Man + Israeli (45 lesson words, 12 word-trace words) and, for Israel-track phrases, Man + Sephardi (40 lesson words). The new "Sound: 87 short word clips..." line never says which setting gets them.
- "Audio: not ready ... the rest of the app uses your device voice" is accurate; what a learner cannot learn from About, Settings or How this works is that the only way to hear any of the 87 clips is Man + Israeli.
- The clip label "Synthetic voice (outside generator; Israeli style not verified; not a recorded teacher; unreviewed)" is accurate and long; on a 360 px phone it takes four lines under the button.

## Measured vs eyeballed

Measured by script: the 87-clip census and reachability table; Hear-button states, labels, `data-audio-state`, box sizes; which file was requested and `ended`/error events; the Checking-audio duration; r05 column widths; sideways scroll, console, page and HTTP errors in all runs; the offline probe's error code; the 15 of 30 and 2 distinct words figures.

Eyeballed in the screenshots: the run-together "Start without sound" text, the ragged word rows, the cut-off sound bar text, the r05 layout before and after, the look of every state. Nothing was listened to. A real phone, real voices, a real finger and a real network were not used; real device voices will differ from the stub (the real headless browser here has no voices at all, which is why the unstubbed offline probe fell through to an error).

## Tests and checks run

- `node tools/test/run.mjs unit` on the final rebased tree: 2764 tests, 2755 passed, 8 skipped, 1 failed: `docs/INDEX.md lists exactly the folders and top-level files on disk` ("anim/ count 2 is far from 32"). I did not touch `docs/anim`; the same test failed on my first run for a different folder (release/), so it looks like a docs-index drift in the clone, not something this lane changed. An earlier run, before the rebase, also failed `ingest copies one recording...` ("no audio leaked into the real repo"); that passes on the final tree.
- `node --test tests/journey-clips.browser.test.js` (5 tests): pass; tests 1, 3, 4 and 5 fail with their own fix stashed. `tests/phoneqa.browser.test.js`: 5 of 5 passed after my changes, before the rebase (not re-run after it). The walk was re-run in full after the rebase: 12 profile runs, 0 errors, 0 sideways scroll.
- Re-run the walk: `node tools/qa/journey-clips.mjs` (about 6 minutes; `QA_CHROME` selects a browser).
