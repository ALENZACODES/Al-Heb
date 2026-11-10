# Audit: does `settings.congregation` change what the learner sees?

Method: grep and read of each view in src/ on 2026-11-04 (static reading plus the unit tests named below; not a browser run). Values: israeli | sephardi | ashkenazi, default sephardi (src/shell/settings.js). "yes" = respelling, vowel wording or names follow the setting. "n/a" = the view shows no pronunciation text (audio only or Hebrew only).

| view | respects tradition | file:line | what it does |
|---|---|---|---|
| Read view, prayers | yes | src/corpus/read.view.js:165,174 | `congregationOf(settings)` then `transliterate(..., {tradition})`; re-renders on settings change (line 144) |
| Torah read (ladder, words, aliyah) | yes | src/torahread/ui.js:58,74 (used by ladder.view.js:76,102, words.view.js:33, aliyah.view.js:35) | `loadTranslit(settings)` per word and line |
| Torah reader (tap a word) | yes | src/torahreader/torahreader.view.js:60-61; model.js:97 | respelling and trope names (Ashkenazi list vs Sephardi list) |
| Trope quiz | yes | src/trope/trope.view.js:51; model.js:6 | naming system only (ashkenazi vs the rest) |
| Service follow-along | yes | src/service/service.view.js:50; model.js:90 | per-card respelling |
| Morning card | yes | src/morning/morning.view.js:109 | respelling |
| Vocab cards and flashcards | yes | src/vocab/vocab.view.js:82,137-139 | `translitFor(entry, tradition)` shown on the card |
| Vocab sprint | yes | src/sprint/sprint.view.js:42-43 | pick-sound options are in the tradition |
| Transliteration fade (scaffold) | yes | src/curriculum/scaffold.view.js:20,48 | note: fallback there is israeli, elsewhere sephardi (harmless: the real setting is never unset) |
| Lessons: vowels and marks | yes | src/curriculum/lesson.view.js:26,70 | `vowelEnglish/vowelIpa(V, congregation)` |
| Lessons: letters | NO | src/curriculum/lesson.view.js:50 | prints `L.sound.en` from letters.json, which is Israeli only (tav reads "t" for an Ashkenazi learner) |
| Lessons: words and prayer lines | n/a | lesson.view.js:74 | no respelling shown; audio follows the player rules below |
| Intermediate lessons | PARTIAL | src/curriculum/intermediate.view.js:33,55 | uses `pronunciation[tradition]`; only 243 of 635 words have sephardi/ashkenazi lines, the other 392 silently show the Israeli line |
| Flashcards (review): vowel cards | yes | src/curriculum/review.view.js:32 | |
| Flashcards (review): letter cards | NO | src/curriculum/review.view.js:26 | `L.sound.en`, Israeli only |
| Flashcards (review): word, prayer-line, gender | n/a | review.view.js:38-50 | no respelling; gender card shows an Israeli translit of the man form (line 46, israel content) |
| Quick check after lesson | PARTIAL | src/curriculum/exercises.session.js:159 | feedback sentence quotes Israeli letter sound |
| First 10 minutes | NO | src/firstday/firstday.view.js:35,36,40; data/firstday/first10.json | fixed "ah", "oh", "shah-LOHM"; audio hard-wired to israeli (model.js:62) |
| Letters atlas and trace | NO | src/letters/atlas.view.js:31; src/letters/trace.view.js:159 | Israeli sound text |
| Speak sets (say it, drills) | NO | src/speak/speak.js:220,297,362 | `item.translit` from vocab data (Israeli style) |
| Speak: sounds by tradition | yes | src/speak/speak.js:406-411; tradition.js | defaults to the setting, selectable |
| Speak: read aloud | PARTIAL | src/speak/speak.js:507 | shows a note that the recognizer expects Israeli; no respelling |
| Timed read | n/a | src/timedread/timedread.view.js | no respelling or audio; timing only |
| Listen drill | n/a | src/listen/listen.view.js:41 | hears the word and picks the spelling; audio follows the player rules |
| Sounds (vowel chart) | yes | src/pronunciation/sounds.view.js:62; now persists the switch (fixed) | |
| Sound-gap lab | yes | src/pronunciation/soundgap.view.js:29,70 | switch now persists (fixed) |
| Read it my way | yes | src/pronunciation/readmyway.view.js:49,111 | switch now persists (fixed) |
| Niqqud dial | yes | src/pronunciation/niqquddial.view.js:27,52 | |
| Compare, Tradition quiz, Traditions screens | yes | src/pronunciation/compare.view.js, tradquiz.view.js; src/traditions/traditions.view.js:118 | show all three by design; Traditions screen write is broken (see below) |
| Photo word card | yes | src/photo/word-card.js:35 | all three at once |
| Placement check | NO (low) | src/placement/model.js:58 | static Israeli translit options |
| Audio player (clip choice) | yes | src/audio/player.js:56,65 | picks the congregation clip; israeli-only content stays israeli; falls back to the Israeli device voice and warns |
| Lazy clip shard | yes | src/shell/audio-shards.js:35,42 | loads the congregation shard, sephardi falls back to israeli shard |
| First-run choice | yes | src/onboarding/firstrun.view.js:82 | `settings.set({congregation})` correct; tests below |

## Defect found and fixed

`settings.set('congregation', v)` (key, value) was called by src/pronunciation/ui.js:91, sounds.view.js:102, soundgap.view.js:100, readmyway.view.js:111 and src/traditions/traditions.view.js:122. The real `settings.set(patch)` (src/shell/settings.js) iterates `Object.entries(patch)`, so a string produced one rejected key per character and changed nothing: switching tradition inside those screens never reached the setting and never persisted. Test doubles in the old tests used `set(key, value)`, which hid it. Reproduced with the real settings, fixed in the four pronunciation files via `setCongregation()`. The traditions.view.js copy is NOT fixed (not my file): PATCHES.md item 1.

## First-run check

Onboarding already asks (src/onboarding/firstrun.view.js:78-89, "Which pronunciation does your synagogue use?") and writes `settings.set({congregation: pron})`. tests/accents.test.js drives the real view with the real settings object for israeli, sephardi and ashkenazi (starting from a different value each time), and checks the value is in `settings.congregation`, `settings.get`, and survives a reload from the store; Skip leaves the value (default sephardi). The "American synagogue" wording maps to `sephardi`. Not checked: a real browser.
