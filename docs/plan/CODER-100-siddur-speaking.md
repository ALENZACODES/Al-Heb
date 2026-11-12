# CODER-100: Siddur and Speaking Lane (F1-F10, G1-G6, G8-G10)

Lane branch `lane/siddur-speaking-2026-11-12c`. Every line below was built and checked by node tests in a fake DOM (view logic, not
browser rendering). No microphone, recognizer, IndexedDB or Web Audio run in a real browser was done here, and this worktree has no
audio files, so no clip was played.

| Idea | Status | Files | What the learner sees |
|---|---|---|---|
| F1 Weekday Follow | built (extends the existing Follow cards) | `data/service/orders.json`, `src/service/model.js` | Follow the service now has weekday morning: 23 cards from the order the repo already held; no stand/sit markers (the guide only quotes them for Shabbat morning), so each card says it varies. |
| F2 This Shabbat + festivals | extended existing | `src/service/shabbat.view.js`, `src/service/practice.model.js` | Shabbat Companion already had This Shabbat (dates, portion, candle time, practise list). Now a Festivals This Week card names a holiday starting within 8 days (app calendar) with the prayers Aleph holds or the gap. |
| F3 Line tutor for every line | built (generalises the Companion's word-by-word lines) | `src/service/practice.view.js`, `src/service/practice.model.js` | Prayer Practice, Line Tutor: every line of each service in order, tap a word to hear it where a word clip exists, transliteration toggle, English, Play the line, "I read this line aloud". |
| F4 Prayer word decks | built | same | Word Deck per service (303 / 507 / 353 words, the coverage's own count): "I can read it" / "Not yet", words known bar, put a word back. |
| F5 Parts roadmap | built | same | Parts Roadmap: the guide's sections in service order, held prayers linked, each missing part "Not in Aleph yet" with where and why from `gaps.json`; no dates promised. |
| F6 Join-in drills | already existed (verified) and extended | `data/service/companion.json` | The six Companion drills were verified; two added from the guide's roles: Gadlu (leader / congregation) and Kedushah (the three verses, leader's lines not held). |
| F7 Prayer fluency ladder | built | `src/service/practice.view.js`, `src/service/practice.model.js` | Fluency Ladder: Hear It, Follow It, Read It with Vowels, Read It without Vowels per prayer; Follow It also ticks from Companion marks or the tutor; self-check. |
| F8 One service ring | built | `src/lib/counts.js` (`serviceRing`, `serviceTotals`), `tools/counts/build-counts.mjs`, `src/lib/counts.generated.js`, `src/service/service.view.js`, `src/progress/progress.view.js` | One ring per service (lines read, words known, prayers followed, averaged), same denominators on Service, Progress and Prayer Practice: Friday 32 / 303 / 17, Shabbat 53 / 507 / 28, weekday 37 / 353 / 23. |
| F9 Festival skeleton | built | `src/service/practice.view.js`, `src/service/practice.model.js` | Festivals tab: the guide's festival and Hanukkah lists with held prayers and "Not in Aleph yet" parts (festival Amidah, full Hallel), plus the next holidays from the app calendar. |
| F10 Shabbat countdown | built | `src/service/shabbat.view.js`, `src/service/companion.model.js`, `src/service/practice.model.js` | Candle-lighting countdown from the existing `candleLighting()` computation for the Calendar location (none without a location), and Shabbat Mode, which hides menu, sound bar, teachers and footer while the page is open. |
| G1 Record and compare | built | `src/voice/voice.view.js`, `src/voice/voice.model.js` | Speaking Studio: record a service line, play yours and the model, both waveforms side by side; no score. |
| G2 Shadowing | built (Say it had a listen-then-rate shadow tab without timing) | same | Model, silent turn = clip length x 1 / 1.25 / 1.5 / 2, model again; 1-3 rounds; only for lines with a clip. |
| G3 Self-scored rubric | built | same | Vowels, stress, fluency 1-3, labelled self-assessment; by-week table. |
| G4 Minimal-pair speaking | extended existing | `src/recordcompare/model.js`, `src/recordcompare/recordcompare.view.js` | Record and compare already recorded both words; now a blind check plays one of your takes at random and you say which word it was. |
| G5 Machine transcription check | built on the existing browser recognizer path | `src/voice/voice.view.js` | Where the browser has a recognizer: "The machine heard X. The line is Y. A machine guess, not a grade." No Aleph server or key; the page says the browser may send the sound to its maker. Without one: says so. |
| G6 Pronunciation gym | built | `src/voice/*` | Five lines from your own latest ratings, weakest axis first. |
| G8 Fluency measurement | built (reads Timed read-aloud, which already measured wpm and self-reported stumbles) | `src/voice/*` | Weekly median words per minute and stumbles per 100 words, labelled "not pronunciation accuracy". Timed read-aloud unchanged. |
| G9 Speaking streak | built | `src/voice/*` | Speaking days (studio recordings and recorded Say it attempts), separate streak, weekly goal 1-7 days. |
| G10 Voice journal | built | `src/voice/journal.js`, `src/voice/*` | Keep a take in IndexedDB on this device, dated, per passage, oldest first with week numbers; play one, play all, delete. |

## Not done, or limits

- No browser run of microphone, recognizer, Web Audio decoding or IndexedDB; all tested with injected fakes.
- No clips played (no audio folder in this worktree); audio buttons are coded against the manifests.
- The weekday Follow cards have no stand/sit markers because no source quote exists for weekday morning.
- The festival Amidah is not in Aleph (gap `g-festival-kiddush`); the skeleton shows it as not yet. No liturgy was added.
