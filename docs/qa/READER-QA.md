# Reader QA: /read, /torahread, /torahreader at 375 x 667

Run on 2026-11-04 with a scripted headless browser (touch input, 2x pixel ratio, 375 x 667), against a temporary copy of the repo served by `tools/serve.mjs`. The copy had `tools/build-precache.mjs` run in it so the new /torahreader route appears; nothing was built in this repo. Each check was run once per tradition setting (Israeli, Sephardi, Ashkenazi) unless noted. Only what was observed is written here. No person, cantor or native speaker listened to or read any of it.

## What was checked and what was seen

| Area | Observed |
|---|---|
| Word tap, /torahreader | Tapping a word shows the pointed word, "Say it (tradition)" respelling, a literal gloss or "No literal gloss is stored for this word.", the mark name and class, and a "Hear it" button. Deut 6:4 words have glosses (hear, Israel, the LORD, our-God, the LORD, one). Num 6:24-26 words checked (words 1 to 3 of 6:24, the second word of 6:25 and the fourth of 6:26) all had glosses, for example may-he-bless-you, the LORD, and-may-he-keep-you, his-face, toward-you. Num 6:23 words checked (el-aharon, ve'el-banav, leimor in Ashkenazi) have no stored gloss and say so. |
| Respelling per tradition | Deut 6:4: Israeli and Sephardi gave the same text (shema, yisra'el, adonai, adonai, echad). Ashkenazi gave shema, yisro'eil, adonoy, adonoy, echod. Num 6:24-26: Israeli yevarekhkha, adonai, veyishmerekha, panav, elekha; Ashkenazi yevorekhkho, adonoy, veyishmerekho, ponov, eilekho. Num 6:23: Israeli/Sephardi el-aharon, ve'el-banav, lemor; Ashkenazi el-aharon, ve'el-bonov, leimor. The on-screen note says Israeli and Sephardi match for these words, and the Ashkenazi screen omits that sentence. |
| Mark names | Ashkenazi setting shows the Ashkenazi name; the Israeli and Sephardi settings show the Sephardi name (for example 6:24 first word Maarich vs Mercha, second word Tarcha vs Tipcha, last word Siluk vs Sof pasuk). Ashkenazi names seen: (Tipcha, Etnachta, Mercha, Sof pasuk, Pashta, Munach, Zakef katan). A word with two marks lists both (mercha, pasek; meteg, pashta). |
| Trope marks visible | Marks are in the text (Deut 6:4: 5, 7, 7, 10, 6, 3 marks per verse) and draw under or over the letters (zoomed capture of the first word shows the tipcha). They are small at the 32 px Hebrew size. The Cantillation toggle removes all of them (0 left); the Vowel toggle removes points and keeps marks. |
| RTL | Hebrew lines are `dir=rtl lang=he`; the first word of a verse sits at the right edge and the verse-end sign at the left of the last row. Arrow keys follow reading order (left arrow goes to the next word). |
| Font sizes | /torahreader Hebrew 32 px, English 17 px, verse label 14.4 px, buttons 17 px. /read Hebrew 35.2 px, respelling 15.2 px, gloss 13.6 px. /torahread ladder Hebrew 32 px. No horizontal page overflow on any of the three routes (scroll width 375). No button on /torahreader under 44 px. |
| Large letters (ע ד, Deut 6:4) | Data (`largeLetters`) lists ע and ד for Deut 6:4 only. Before the fix nothing drew them (all glyphs one size). After the fix /torahreader draws the ayin ending שמע and the dalet ending אחד at 1.6 times the line size, in the verse and in the word detail, with a line "Written large in the source text: ע, ד." /read (Shema Yisrael) and /torahread still draw every letter at one size; those are not changed. |
| Prayer cards, /read | Shema Yisrael: respelling and gloss under every word (hear, Israel, the LORD, our-God, the LORD, one). Modeh Ani (12 words) and Barchu (9 words): respelling only; no word glosses are stored, and none are shown. Respelling follows the setting (for example Modeh Ani "lefanekha" Israeli/Sephardi, "lefonekho" Ashkenazi; Barchu "barkhu" vs "borkhu"). No trope marks on /read (0 in the text). Tapping a word plays audio, it does not open a detail. |
| /torahread | Ladder lines Shema Yisrael, Priestly Blessing line 1 and 2, and Genesis 1:1 (בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ, 7 words) open. Tapping a word toggles its points and shows the respelling under it (Israeli "yisra'el", Ashkenazi "yisro'eil"). No trope marks and no per-word gloss in the ladder. The "30 Torah words" card shows points, respelling and meaning (for example את: "marks the definite direct object"). |
| Read with me | Fast pace: after 2.2 s the highlight was on word 3 and the status said "Word 3 of 42: adonai". Pause reported "Paused at word 3 of 42." Screen text says it is not synchronised with audio. |
| Trope legend | 30 mark rows in three tables. Before the fix the tables were 530 to 545 px wide inside a 343 px column and the right-hand columns were cut off with no way to reach them. After the fix each table sits in a focusable box that scrolls sideways (576 px inside 343 px). The legend notice starts with the same sentence twice ("Reference, not a chanting teacher. Reference only, not a chanting teacher."); not changed. |
| Audio status | In this headless browser every Hear button ended with an honest "no audio" line, never "playing": /torahreader "No audio for this word (speech-error)." and "No audio for Deuteronomy 6:4 (speech-error)."; /read "No audio for word 2 (speech-error)."; /torahread "No audio yet for Shema Yisrael: speech-error." Real devices, recordings and voices were not tested. |
| Back navigation | /torahreader to /read and back (browser back) returned to /torahreader on the Trope legend view that had been chosen (the view is stored). A second back left the app (the entry before it was the blank start page). |
| Offline | With the service worker active, after visiting /torahreader, /torahread and /read online once, with the network switched off a fresh load of each route showed its title and words (35, 3 and 15 word buttons at the first view). Offline, the Shema tab, a word tap and the detail panel worked; Hear it gave the same no-audio line. Not tested: opening these routes offline without a prior visit. Their data files are listed as on-demand in the precache manifest, so that case is expected to need a visit or "Download everything" first; this was not tried. |
| Console | No page errors from the app. The only errors seen came from the test script touching storage on the blank page. |

## Bugs found and fixed (src/torahreader)

1. Word details were out of sight. The detail box sat after the last verse, about 2750 px down the Shema page, so tapping a word changed only a dashed border on screen. The box now opens inside the verse of the selected word (it follows the word to the new verse, survives the show/hide toggles) and the tap hint is above the verses.
2. Large letters were not drawn (see table). Added `largePositions` and `displayParts` in `model.js` and a note line per verse.
3. Trope legend tables were clipped on a phone (see table).

Tests: `node --test tests/torahreader.view.test.js tests/torahreader.model.test.js` passes (22 tests; 3 are new). The rest of the test suite was not run.

## Seen and not changed

- The switches, pace buttons and Read-with-me buttons take about three screens before the first verse.
- /read and /torahread do not draw the large letters; /read Modeh Ani and Barchu have no word glosses; trope marks are small at 32 px.
- The respelling sentence "does not mark which syllable is stressed" appears on every detail.

## Follow-up, 2026-11-04 (second pass)

Checked with a scripted headless browser at 375 x 667 against this repo served as is (no build). Seen:

- Large letters: /read (Shema Yisrael) and /torahread (Shema Yisrael line) now draw the ayin and dalet at 1.6 times the line size (56.3 px on 35.2 px, 51.2 px on 32 px) with the line "Written large in the source text: ע, ד." The helper is shared from `src/torahreader/model.js`. On /read the sof pasuq after the dalet sits in the same enlarged piece.
- Controls: secondary controls are in a closed details on all three routes. First Hebrew word bottom edge, page coordinates: /torahreader 553 px, /torahread (default line, Priestly Blessing) 576 px, /read (default text) 598 px. The app's own bottom bar starts at about 610 px, so /read is tight.
- Legend notice: the first sentence is no longer repeated.
- Text size: /torahreader has Normal, Large, Largest (x1, x1.35, x1.7 on verses, word detail and legend marks); stored in the torahreader.v1 state. Word buttons keep a 44 px minimum. The smallest button measured at Largest was 48 px. /read and /torahread have no text-size control.
- Not run: the full test suite (only torahread*, torahreader*, corpus*, pronunciation.readmyway tests, 129 pass), real devices, screen readers.
