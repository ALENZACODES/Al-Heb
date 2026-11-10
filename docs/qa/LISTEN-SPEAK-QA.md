# Listen and Speak QA at 375 x 667

Screens: `#/listen` (src/listen) and `#/speak` with tabs say, drills, sounds, read, shadow, history (src/speak).

## How this was run, and what it is not

- Headless browser, viewport 375 x 667, touch enabled, local static server, hash routes. Scripted clicks and key presses only.
- No real phone, finger, screen reader, microphone, speaker or real browser speech engine. Headless has no voices, so `speechSynthesis`, `SpeechSynthesisUtterance`, `SpeechRecognition`, `MediaRecorder` and `getUserMedia` were replaced by page-level mocks that each scenario configured (voices listed or not, speak ends / errors / never answers, recognizer returns the target / wrong text / `no-speech` / `not-allowed` / `network`, recorder works / is absent / permission denied). What a real Chrome, Safari or Firefox does in those states was not observed.
- The shipped audio manifest lists every word, line, prayer and letter clip as `missing`. To see the "recorded" and "synthetic" paths, the manifest request was intercepted and entries were added with status `recorded` or `tts`, and the `.mp3` request was answered with a tiny wav (or a 404 for the failure cases). Those clips are test doubles, not real recordings.
- Each scenario ran in a fresh context with `alef:settings` seeded to `{onboarded:true, congregation: <tradition>}`. Traditions: israeli, sephardi, ashkenazi.
- Scratch scripts lived in `/tmp` and were deleted after the run. The numbers below are from that run only.

## Listen (`#/listen`)

| Check | Result | Observed |
|---|---|---|
| Real manifest, all 3 traditions | PASS | Home says "Audio not recorded yet." and offers "Start read-and-match" (meaning shown, pick the written word). It does not claim listening. Round, answer feedback, "Next word" and the final "Done" screen all work. |
| Tradition line when no clip | PASS | Israeli: no extra line. Sephardi / Ashkenazi: "No Sephardi (Ashkenazi) recording yet: the device voice speaks Israeli Hebrew, so it will not match your ... setting. Read the respelling instead." |
| No speech synthesis at all | PASS | Same read-and-match drill; no dead end, no error. |
| Mocked clips with status `recorded` (3 traditions) | PASS | Home: "600 words have audio for your <tradition> setting." Drill starts, plays on entry, "Play" replays. Status line: "Playing this word: Recorded by a human reader." |
| Mocked clips with status `tts` (3 traditions) | PASS | Status line: "Playing this word: Synthetic voice (Israeli only), not a recorded teacher." |
| Clip file 404, device voice present, israeli | PASS | Falls back to the device voice and says so: "Playing this word with the browser voice: a computer voice, not a person. It speaks Israeli Hebrew and may ignore the vowel points." The utterance was spoken with lang he-IL. |
| Clip file 404, device voice present, sephardi / ashkenazi | PASS | Same line plus "not Sephardi" / "not Ashkenazi". |
| Clip file 404, no synthesis (3 traditions) | PASS | "This clip could not play. You can press Play to try again." Options stay usable; answering and "Next word" work. |
| Touch targets | PASS | No control under 44 x 44 on the home, round or feedback states in any scenario run. |
| Horizontal overflow | PASS | scrollWidth minus clientWidth = 0 in every state checked. |
| Keyboard | PASS | Start with Enter; options answered with Space; focus moves to "Next word" after an answer; Enter advances; focus moves to the new question paragraph. |
| Console / page errors | PASS | None in any scenario. |

### Listen findings (both addressed in code; not re-run in a browser)

1. **Listen could not reach its audio drill with the data as shipped.** Addressed afterwards: manifest lesson-word entries now carry `vocabId` (from `data/curriculum/word-vocab-map.json`, exact pointed-text match), vocab-id entries exist for every mapped id and the Listen pool, and `src/audio/player.js` resolves a clip by either id (unit tests with synthetic manifests; no real recording exists, and no browser run was repeated). Original finding: `src/listen` checks `ctx.audio.has('word', id)` with ids from `data/vocab/words.json` (for example `h7c9d2ffe`). The manifest's word clips use lesson-word ids (`r01-w1` ...). The two id sets do not overlap (0 of the vocabulary ids appear among the manifest's israeli female word entries). So even after clips are recorded under the current manifest ids, Listen will keep saying "Audio not recorded yet." until the manifest carries the vocabulary ids or Listen maps ids. It fails safe (honest text, usable drill). Observed by comparing the two files and by the mocked run, which only reached the audio drill after vocabulary-id entries were injected.
2. **A failed clip with only a non-Hebrew device voice was reported as the browser voice.** Addressed afterwards in `planWithoutFile` (unit test; not re-run in a browser). Original finding: With the clip 404 and a mocked voice list containing only `en-US`, the status line still said "Playing this word with the browser voice ...". The check for "no Hebrew browser voice" exists in the first-choice path in `src/audio/player.js` but not in the fallback after a file error (`planWithoutFile`). That file is outside the scope of this pass and has uncommitted edits from someone else, so it was not changed.

## Speak (`#/speak`)

### Say it (tab say)

Scenarios (sephardi unless noted; the "full" one was run for all three traditions): full support; voices list empty; only an `en-US` voice; speak errors; speak never answers; no synthesis; no recognizer but recorder works; neither; recognizer `not-allowed`; `no-speech`; `network`; wrong text; recorder permission denied.

| Check | Result | Observed |
|---|---|---|
| Capability line on the start screen | PASS with note | Says recognition offered / not available, recording available / not available, and model voice state. With only an `en-US` voice it says "this browser lists no Hebrew voice, so Listen may stay silent or read with a wrong accent." With no synthesis it says so. Note: for the empty voice list and the "voice present" cases it says "no recorded clips exist yet, so Listen uses the browser's voice." That sentence is fixed text; it is true for the shipped manifest but is not derived from it. |
| Mode radios | PASS | Unavailable modes are disabled and labelled "(not available in this browser)". Default picks asr, else record, else self. |
| Model voice, israeli | PASS | "Played the browser's voice, not a recording; its Hebrew is unverified." |
| Model voice, sephardi / ashkenazi | PASS | Same plus the "No <tradition> recording yet: the device voice speaks Israeli Hebrew ..." line. |
| Speak errors | PASS | "No sound: The browser reported: synthesis-unavailable." Listen stays enabled. |
| No synthesis | PASS | "No sound: this browser has no speech synthesis and no clip exists for this item yet." The attempt controls still work. |
| Recognizer match / wrong / no-speech / network | PASS | "That matched the target." / "That did not match. ..." with self-judge buttons and Next / "Nothing was heard ..." / "... needs a network connection ...". The mic button re-enables ("Say it again"); Skip stays available. |
| Recognizer `not-allowed` | PASS after wording fix | "I said it" and "Not yet" appear, so there is a way forward. |
| Recorder only | PASS | Record, Stop, "Recorded 0.4 seconds. Play it back, then decide." then self-judge buttons. |
| Recorder permission denied | PASS | Error shown; "I said it" / "Not yet" appear; Skip stays. |
| Neither recognizer nor recorder | PASS | "I said it" / "Not yet" shown from the start. |
| Touch targets | PASS | No control under 44 x 44 on any tab (say, drills, sounds, history) or any question state checked. Radios were measured by their label. |
| Overflow | PASS | 0 on every tab and state checked. |
| Keyboard | PASS | Tab order on the home: tab links, set select, mode radio, Start. Enter on Start moves focus to the question heading; after an answer focus moves to Next. |
| Divine name in say sets | N/A | No set under `data/speak/sets` contains the four-letter name (searched the files). |

### Read a prayer aloud and Shadowing (tabs read, shadow)

Prayer `shema-1` (contains the four-letter name twice) for all scenarios above, and `torah-barchu` (two lines, per-line clips) for all three traditions in read and shadow.

| Check | Result | Observed |
|---|---|---|
| Setting line | PASS | "Your setting: Israeli. The respelling below follows it." For the other two: "... (rule-generated, not checked by a native Sephardi / Ashkenazi speaker)." The respelling changes with the setting (for example "adonai" vs "adonoy" for Ashkenazi). |
| Divine-name audio target | PASS | The line is shown as in the source (`יְהוָה`). The utterance handed to speech synthesis was `שְׁמַע יִשְׂרָאֵל אֲדֹנָי אֱלֹהֵינוּ אֲדֹנָי אֶחָד׃` in read, shadow, and the slow shadow rate (0.6), in all three traditions. |
| Divine name in recognizer scoring | PASS after a small fix | Recognizer text `אדני` or `אדוני` or `יהוה` scored a full match. `ה׳` (he plus geresh) scored 4 of 6 words before the fix, 6 of 6 after. |
| Per-line clips (`torah-barchu`, mocked `recorded`) | PASS | Line 1 requested `.../line/torah-barchu-l1.mp3`, line 2 `...-l2.mp3`, in all three traditions, read and shadow. Status "Played a recorded clip." |
| Mocked `tts`-status line clip | PASS after fix | Before: "Played a recorded clip." for a synthetic clip. After: "Played a synthetic-voice clip (a computer voice, not a recording)." |
| Shadow slow listen | PASS | Always uses the device voice at rate 0.6 and says so; not offered when synthesis is missing. |
| Read: every error path | PASS | After a recognizer error or a recorder denial, "I read it" and "Not yet" appear; "Finish now" is always present. With no recognizer and no recorder those two buttons are shown immediately. |
| Shadow: no recognizer needed | PASS | Ratings 1, 2, 3 are always available, with or without voice, synthesis or recorder. Record is offered only if recording exists; a denied microphone shows the error and ratings still work. |
| Flow to the end (`torah-barchu`, 2 lines) | PASS | Read: "Reading done ... 2 lines tried, 2 read in full." Shadow: "Shadowing done ... average self-rating 2.5 of 3." Focus lands on Next after each answer. Keyboard only (Enter / Space) was enough. |
| Touch targets and overflow | PASS | None under 44 x 44; overflow 0 on start and line screens in every scenario. |

### Bugs found and fixed in src/speak

1. **"Listen" stuck disabled when the browser accepts a speak request and never answers** (seen with the mock set to never fire end or error). The button stayed disabled for the rest of the item, the status line stayed empty, so the screen gave no reason. Fix in `playModel` (`src/speak/speak.js`): a time limit (4 s plus 0.7 s per word) cancels the utterance and reports "No sound: the browser voice gave no answer. It may have no Hebrew voice installed, so use the respelling and judge it yourself." Re-run: button enabled again, message shown. The limit is a guess at a reasonable wait; it was not tuned against a real engine.
2. **Synthetic clip reported as recorded** in the Speak model-voice status (see above). Fixed in the same function. It now also names the stand-in tradition when the player used another tradition's file, using the same wording pattern as `playLine`.
3. **Mic-denied message pointed at a control that is not on that screen** ("switch to 'No microphone' below"; the mode choice lives on the start screen). Now: "... or judge it yourself with the buttons below." The buttons it refers to were present in all three denied scenarios.
4. **Voice list with no Hebrew voice still said only "Played the browser's voice."** Now appends "This browser lists no Hebrew voice, so it may have used a voice for another language." when the voice list was answered and has no `he` voice. (When the list is empty the browser has not said, and no claim is added.)
5. **Recognizer writing the divine name abbreviation** (`ה׳`) counted as missed words. A lone `ה` token is now folded to the spoken form in `spokenTarget` (`src/speak/model.js`). Whether a real recognizer ever writes it that way was not observed; the change only widens what counts as a match for that one token.

### Edits made, and the uncommitted work around them

- `src/speak/speak.js` already had someone else's uncommitted edits (the `lineClips` lookup in `lineClip`, `uiEnglish` calls, an import). Those were read first and left as they were. The edits above are confined to `ERRORS`, `playModel`, and nothing else in that file.
- `src/speak/model.js` had no prior uncommitted change.
- `node --test tests/speak.test.js tests/listen.test.js`: 52 of 52 pass after the edits. The full unit suite was started by mistake and stopped, so it was not run to completion. No test was added or changed.
- `node tools/meta/scan.mjs --text`: PASS.

### Not checked

- Any real browser voice, recognizer or microphone; Safari, Firefox, Android.
- Whether a real engine ever fires neither `end` nor `error` (the time limit was added for that case only because the mock showed the stuck state).
- Screen reader behaviour of the status regions.
- Drills and Sounds tabs beyond layout, touch size, and that they open; their quiz logic was not walked in this pass.
- Landscape, zoom, and widths other than 375.
