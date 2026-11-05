# Reading path QA: /read, /torahreader, /torahread, /trope at 375 x 667

Run on 2026-11-04 with a scripted headless browser (touch input, 2x pixel ratio, 375 x 667) against this repo served as is by `tools/serve.mjs` (no build, no precache run). Each check was run once per tradition setting (Israeli, Sephardi, Ashkenazi); the setting was read back from the app to confirm it applied. Audio was replaced by a recorder, so what was checked is the text each Hear button would send, not any sound. Only observed results are written here. No person, cantor or native speaker read or listened to any of it.

## Text against the corpus files

The text was read from the page and compared as exact strings (no normalisation) with the data file for the displayed record. 435 comparisons across the three settings, 0 differences.

| Route | Compared with | Result |
|---|---|---|
| /torahreader, Priestly Blessing (Num 6:22-27) and Shema/V'ahavta (Deut 6:4-9), 12 verses, cantillation on | `heTrope` in data/corpus/reader/*.json, and `raw` in data/corpus/trope/*.json | Every word equal, all marks present. Sof pasuq shown once at the end of each verse. |
| Same, cantillation off | `he` in data/corpus/reader/*.json | Equal. |
| Same | English line and the passage attribution text | Equal to the JSON; attribution shown in the footer. |
| /read: Priestly Blessing (3 lines), Shema Yisrael, Shema and V'ahavta (6 lines), Barchu (2), Modeh Ani, both Torah blessings, Baruch shem, blessing formula | `he` in data/corpus/registry.json, line by line | Every word button equal, no character lost. |
| /torahread ladder, step 1, every line in the picker | `he` in registry.json or data/torahread/verses.json | Equal when the run was made except the sof pasuq, which the ladder did not draw. Since fixed: `wordsWithStops` in src/torahread/pointing.js now returns a `stop` flag for the sof pasuq after each word; this row has not been re-run against the corpus files by me. |
| /trope, 12 questions per setting | words in data/corpus/trope/*.json | Every word shown is in the file. |

Notes:
- The registry text has no cantillation by design ("Cantillation removed" in its attribution); /read shows none and the registry has none. Cantillation is shown only on /torahreader and /trope.
- Fixed after this run: on /torahreader a paseq that stands after a space in the source was drawn attached to the previous word (for example יְהוָ֥ה׀). `spacePaseq` in src/torahreader/model.js now puts the space back. Re-checked afterwards on the rendered page: word buttons carry the paseq with a space (for example `יְהוָ֧ה ׀`), and the test "paseq keeps the space the source has before it" passes.
- Sources are shown: /torahreader footer, /read per-text source block, /torahread "Source and licence" details, /trope footer (UXLC, Tanach.us).

## Divine name

- Display: the four-letter name is shown as in the source on every route.
- Speech text sent by Hear: /torahreader word and verse buttons, /read word buttons and the ladder send the spoken substitute (אֲדֹנָי) for the name in every setting; none sent the four-letter name.
- Respelling: Israeli and Sephardi settings give "adonai"; Ashkenazi gives "adonoy" (the Ashkenazi respelling of the substitute).
- writeGodAsGd: with the setting on, "God" became "G-d" on /torahreader and on the /torahread self-check answer. On /read it did not (see fixed bug 1). Upper-case English lines, for example the Shema Yisrael line "THE LORD OUR GOD", are not changed by the setting on any route, because the rule matches only "God".

## Controls in details, keyboard, large text

- /read, /torahreader and /torahread each have a closed details holding the secondary controls. The summary was reached by Tab (1, 3 and 6 presses), Enter opened it, and the next Tab went inside. Every button, select and input inside was reached by Tab except a disabled Previous button on /torahread's first line.
- Large text: with the root font size forced to 200 percent, no route had horizontal page overflow. On /torahread two step buttons ended 12 px past the right edge (before the fix). /torahreader has its own Normal, Large, Largest steps: no overflow, all word buttons at least 44 px at each step. There is no app-wide text-size setting; 200 percent root size is an approximation of a browser font setting.
- Console: 0 errors, 0 warnings, 0 failed or 4xx requests across all of the above.

## Bugs fixed (mechanical)

1. /read ignored writeGodAsGd: English lines are now passed through `uiEnglish` (src/corpus/read.view.js, two lines plus a separate import line, because tests/corpus.versionlabel.test.js matches the existing import by regex). Re-run: "G-d" appears on /read for Shema/V'ahavta and the Torah blessing.
2. /torahread step buttons overflowed at large text: `.trd-levels` in src/torahread/ui.js now uses `repeat(auto-fit, minmax(min(100%, 10rem), 1fr))`. Re-run: no element past the edge at 200 percent.

## Seen and not changed

- Divine name rule is now one shared rule: `speechText` in src/shell/names.js, used by /read and /torahreader (`spokenText` in src/torahreader/model.js now just calls it), including the name after a maqaf. Checked: `speechText('בָּרוּךְ כְּבוֹד־יְהוָה')` returns the spoken substitute after the maqaf. Applied by default pending clergy; see question 2c in docs/sensitivity/REVIEW-FOR-CLERGY.md. The earlier "two copies disagree on kedushah-baruch" note no longer applies; I did not re-run the 159-string comparison.
- Open source quirk for the reviewer, maqaf then space: in data/corpus/reader/*.json the verse field `heTrope` (and `raw` in data/corpus/trope/*.json) has a space after every maqaf, for example Deuteronomy 6:5 `בְּכָל־ לְבָבְךָ֥ וּבְכָל־ נַפְשְׁךָ֖ וּבְכָל־ מְאֹדֶֽךָ׃` (12 occurrences across the two reader files, 0 maqafs without a following space in `heTrope`). The unpointed `he` and the word-level data join them (`he` has `בְּכָל־לְבָבְךָ`; the token joins words 4 and 5; the word has `joinedWithNext: true`). The display follows the word-level data: /torahreader shows `בְּכָל־לְבָבְךָ֥` as one button, so displayed text differs from `heTrope` by that space. I judged joined to be right for display (the maqaf links the two words; the other fields in the same record agree), but I did not check the Leningrad Codex or UXLC itself, and a reviewer should confirm. The displayed-equals-source test notes this exception.
- Upper-case English lines are not affected by writeGodAsGd (see above).
- No audio was played; real devices, screen readers and recorded voices were not tested.

## Tests

`node --test` on tests/corpus*, torahread*, torahreader*, trope* (130 tests when this run was made): 130 pass. Later changes: see the section below. `node tools/meta/scan.mjs --text`: pass.

## Screen-reader-oriented check of /torahreader word buttons (2026-11-04)

Headless Chromium, Playwright aria snapshot of the first three verses (Numbers 6:22 to 6:24) plus 6:25 and Deuteronomy 6:4 to 6:5. No screen reader was run; this reads the accessibility tree only.
- Each word button's name is `<visible Hebrew>, <transliteration>, word n of N`, for example `וַיְדַבֵּ֥ר, vaydaber, word 1 of 35`. Every button checked has a name that starts with its exact visible text (so the label-in-name rule is met on these), and the divine name reads `adonai` in the transliteration slot.
- The Hebrew in the name keeps its cantillation marks (same characters as the visible text). I kept it that way: a name that starts with different characters than the visible text would break label-in-name, and I did not test how any real screen reader speaks the marks. Not judged.
- The paseq word is named `יְהוָ֧ה ׀, adonai, word 19 of 35`; the spaced paseq did not break the name. The sof pasuq is aria-hidden. The maqaf compound is one button, `בְּכָל־לְבָבְךָ֥, bekhol-levavekha, word 11 of 42`.
