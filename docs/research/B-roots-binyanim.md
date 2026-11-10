# B: roots and verb patterns (feature b)

Status: PREVIEW tier, DRAFT. Route `#/roots`. Gameplan pillar 2.

## What is real
- Existing data was found and used: `data/vocab/words.json` has `root` (1,610 rows, 997 distinct roots), `binyan` (1,817 verbs) and `forms` (present, future, infinitive; 1,799 verbs).
- `node tools/roots/build.mjs` writes `data/roots/families.json` (364 roots with 2 or more rows, 151 with 3 or more; plus coverage counts) and `data/roots/verbs.json` (verbs with a pattern and forms, most frequent plus all family members). Nothing is generated; a family is exactly the rows sharing one `root` string.
- `src/roots/model.js` (pure) + `src/roots/roots.view.js`: root-family browser with search, per-verb table of the forms in the data, and an 8-question drill (which word is from root R; which pattern is this verb; same root as X but in pattern Y). Drill answers are checked against the same data, so the check is objective, but it is only as correct as the dictionary data.
- Coverage is stated on screen: roots are listed for 501 of 1,820 verbs (28%), so most verbs are not in any family.
- Tests: `tests/roots.test.js` (10): data current, families equal a fresh grouping, coverage numbers, forms copied unchanged, no past tense row, search, quiz distractor rules over 40 seeds, view behaviour in the fake DOM.

## What is not real
- No conjugation is generated. The table shows one present, one future and one infinitive form per verb. It says plainly that the data has no past tense and no other persons/genders. A generator for past tense and weak/guttural root classes (R-004) is not built.
- Binyan one-line glosses in `BINYAN` are textbook summaries and need native review. No Hebrew pattern names (e.g. in pointed script) are shown.
- Root/pattern links come from a dictionary source; 831 rows in the vocabulary data are flagged needsReview and the page says links may be loose. A few words under a root are loosely related (for example an adverb under a verbal root).
- The seven-pattern "same root, new pattern" drill covers only roots whose family has verbs in two or more patterns.
- Not wired into word pages, lessons or review (R-002 asks for that); this is a standalone route.
- Browser rendering at 375x667 not run; 44px size is inline and checked in the fake DOM only.

## Update after R/M audit (same session)
- Title changed to "Roots and verb families": the page lists the dictionary's root labels, not verb patterns taught.
- Honest relatedness (R audit, main issues 1 and 5): each family now has `ruleChecked` (also returned by the grammar lane's `rootFamilies()`: 82 of the 364 groups) and `verified` (true only for roots a native reader lists in `data/roots/verified.json`; empty today). Headings say "words listed under the letters X". Prompts say "comes from the root" only for a verified family, so today none do. Drills use only rule-checked families and only their rule-checked words. Loose groups are labelled "Loose".
- Deviation from R's acceptance: R asked that drills be built only from verified families. With none verified that would remove the root drills, so they use rule-checked families with the "listed under the letters" wording instead. The pattern-of-a-verb question does not depend on families.
- Still not done: past tense import (R-004 revised needs a Wiktionary dump and a licence decision), a shared `src/vocab/roots.js` (M-R-002), the strip on word pages (R-002).
- Data under CC BY-SA terms: roots and patterns come from the vocabulary file's dictionary source (Wiktionary); keep that attribution on /credits.
