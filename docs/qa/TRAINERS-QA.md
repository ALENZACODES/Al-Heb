# Trainers QA at 375 x 667

Run: `QA_CHROME=/usr/bin/google-chrome node tools/qa/trainers.mjs [--out file.json] [--shots dir]` (headless Chromium 375 x 667, touch enabled, synthetic clicks and typing, local static server, fresh profile with `onboarded` set). About 5 minutes. Accessibility uses the axe-core copy in `tools/a11y/node_modules` (default rule set, violations only).

What this is not: no real phone, finger, screen reader or iOS Safari; Chromium only. Hebrew and trope content was not judged for correctness; "names" below means the label shown equals the label in `data/corpus/trope/table.json` for that tradition.

## Result of the final run

21 screens audited (6 Preview-group entries plus 7 rule pages, 6 grammar topics, trope in 3 settings, plus results states). Page or console errors: 0. Failed requests: 0. Horizontal overflow (scrollWidth) 375 on all 21.

| Check | Observed |
|---|---|
| Reached from the More sheet Preview group by tapping | All 6 (`/rules`, `/grammar`, `/trope`, `/compare`, `/tradition-quiz`, `/read-my-way`) are listed, each row 48 px high, tapping lands on the right hash, closes the sheet, and shows the page. Reopening More on a Preview page opens the Preview group. |
| Preview banner | Present as the first child of `main` on all 21 screens, plus the not-found states for `/grammar/nonesuch`. Text: "Preview: unreviewed, may change". |
| h1 | One visible h1 per screen. |
| axe-core | 0 violations on all 21 screens, and after interaction on Read it my way (converted sheet) and Compare (result). |
| Touch targets | Nothing under 44 px in `main`, the bottom nav, or the header on any screen, after the two fixes below. Trope, quiz and grammar answer buttons are 343 x 52; More-sheet rows 48. |
| Dead ends | Rules index links to 7 rule pages and Compare; every rule page has an "All rules" link and previous/next. Unknown `/rules/x` shows the index with a status line; unknown `/grammar/x` shows an alert and a back link. Each grammar topic has "All grammar notes" and the practice finish screen has "Back to the note" and "All grammar notes". Trope, tradition quiz, Read it my way and Compare have no in-page links; they are left via the bottom nav (visible at 375 x 667 on all of them) and More. |
| Rule pages | Both tables per page are 480 px wide inside a focusable labelled scroll region; the page itself does not scroll sideways. |
| Grammar | 6 topics, 6 examples each, 6 practice questions each, all 4 options, no duplicate options, the "answer is" text is always one of the options, Next enabled after answering. Over 1,800 generated questions per topic (node, seeded): 0 duplicate options, 0 bad answer indexes. |
| Trope, per tradition | Setting Ashkenazi: labels seen Darga, Etnachta, Gershayim, Kadma, Mahpach, Mercha, Munach, Pashta, Revia, Sof pasuk, Tevir, Tipcha, Zakef katan. Setting Sephardi: Atnach, Azla, Darga, Kadma, Maarich, Revia, Shenei gerishin, Shofar holech, Shofar mehupach, Siluk, Tarcha, Tevir, Zakef katon. All are exactly the table's names for that tradition; none leaked from the other system. Setting Israeli shows the Sephardi/Mizrahi set (by design: only `ashkenazi` selects the other set). 36 questions per setting over levels 1-3: always 4 options, 0 duplicate labels. 3,000 generated questions per system per level (node): 0 with duplicate option labels. Right/wrong text names the correct mark; options disable after answering; score persists across reload (36 answered stayed 36). |
| Tradition quiz | 3 full rounds, 30 questions: 10 three-option "sounds" questions, 20 two-option "respelling" questions; option counts always as expected, no duplicate options. In every sound question exactly one of the three shown readings equals the text shown. Pool check (node): 257 words where all three IPA strings differ; 362 words where the respelling differs. Score screen and Play again work. |
| Read it my way | Convert with empty box says "Paste some pointed Hebrew first." Three pointed words convert in each tradition (3 rows each); "also show other two" gives 7 columns inside the page width. An unpointed word is listed as "not in the table, left out", not guessed. Text persists after reload. |
| Compare | 53 examples in the picker; picking one and Compare shows three readings and the "what differs and why" list; unpointed word is reported as not in the table. |

## Bugs found and fixed

1. Grammar topic page: the closing "All grammar notes" link was a plain 139 x 25 px link. Now the same full-width 48 px `btn gr-link` used elsewhere in that view (`src/grammar/grammar.view.js`).
2. Read it my way: the "Also show the other two traditions" checkbox was 13 x 13 px with a text-height label. The label is now a 48 px high row and the box 24 px (`src/pronunciation/readmyway.view.js`, two CSS rules). Tapping the label toggles it (checked in the run).

## Open observations

- Resolved after the first pass: trope trainer first screen now shows question, word and all 4 options above the bottom nav at 375 x 667 (level picker and source line moved below the options); trope options and feedback show the Hebrew mark name next to the transliteration (`he` from the table); the Compare picker gloss for ילד now reads "child, a kid, a boy" (picks.json rebuilt with `node tools/pronunciation/build_runtime.mjs`; the stale-picks test passes); the router title and the Compare h1 now say "Compare pronunciations".
- Grammar and root questions: only structural checks were run (4 distinct options, valid answer index). Whether a distractor could also be a correct answer was not verified semantically.
- Not tested: audio, offline, keyboard-only order, dark theme, Safari.

## Tests run after the changes

`tests/grammar.test.js` 8 pass, `pronunciation.readmyway` 5 pass, `pronunciation.tradquiz` 6 pass, `trope` 5 pass (run file by file). `pronunciation.compare` 12 pass, 1 fail (stale picks.json, above). `node tools/meta/scan.mjs --text` passed. The full unit run was not done.

## Files

`tools/qa/trainers.mjs` (new), `docs/qa/TRAINERS-QA.md` (this file), `src/grammar/grammar.view.js`, `src/pronunciation/readmyway.view.js`.
