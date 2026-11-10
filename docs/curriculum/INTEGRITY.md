# Curriculum integrity

Check: `node tools/curriculum/integrity.mjs` (exit 1 on any violation); enforced by `tests/curriculum.integrity.test.js`, which also injects one fault per defect class into an in-memory copy and requires the checker to catch it.

## What is checked (125 lessons: r01-r51, il01-il24, I-01..I-50)

- ids unique in `lessons.json` and `intermediate-index.json`; 51 + 24 + 50 lessons; index and `lessons-intermediate/*.json` agree with `lessons.json`.
- title, goals, estMinutes present; level label valid for the track; `black` never labels a lesson.
- prerequisites exist, stay in-track, no cycle; a simulated "complete everything that unlocks" run reaches all 125 lessons from the roots `r01` and `il01`; I-01 follows r51, I-11 follows il24.
- known set: for every read-track lesson, the letters and marks taught on its own prerequisite path (not array order) must cover every letter and mark in its words and prayer lines (r05, a listen-and-spot preview, is the only exemption). Each letter and mark is introduced exactly once (27 letters, 15 marks).
- every lesson word, prayer-line id and every Hebrew string in an exercise is found in the repo data (whole entry or whitespace tokens of `data/**`, excluding the lesson files themselves).
- I-01..I-50 exercise sets: produce answer index inside options and no duplicate options, match 3-5 unique pairs, order lines of 3+ tokens, spot/fade lines exist in the corpus registry and the spot target is a tappable token, at least 3 auto-graded exercises per lesson, correct answers grade correct through `intermediate-adapter.gradeExercise`.
- r/il lessons: at least one SRS practice card (`cardsForLesson`).

## Result and fixes

All checks pass after the fixes below. Nothing in the 125-lesson path teaches a letter or mark before its introduction, and all 305 beginner words are found in existing data.

| # | Defect | Fix |
|---|---|---|
| 1 | Duplicate `I-01` in `intermediate-index.json` (reported earlier) | Confirmed fixed: 50 unique ids; regression test added. |
| 2 | The 20 synagogue lessons (I-01..I-10, I-26..I-35) carried `level: "black"`, but `black` in `belts.json` is a fluency target with no lessons (and the lesson page showed "black" to learners) | Level is now `intermediate`, changed at the source: `tools/curriculum/intermediate/dsl.py`, `data/curriculum/lessons-intermediate/*.json`, `intermediate-index.json` (lessons and units), `lessons.json`, `docs/curriculum/INTERMEDIATE.md`; `tests/curriculum.intermediate.test.js` and the belt-order test in `tests/curriculum.lessons.test.js` updated. Israel intermediate stays `B1`. |
| 3 | Spot exercises I-01-e10, I-03-e03, I-05-e14, I-07-e05 had targets that sit after a maqaf (for example the second half of `בְּכָל־לְבָבְךָ`); the lesson player split on whitespace only, so the learner could not tap the answer | `src/curriculum/intermediate.view.js` now also splits after a maqaf; `heKey` in `intermediate-adapter.js` ignores a trailing maqaf. No Hebrew was changed. |

## Not fixed in this lane

- The 75 beginner lessons (r01-r51, il01-il24) have no `exercises` array. Their practice set is the SRS cards created on completion plus Spot It, the syllable ladder and fade-out. r05, r27 and r48-r51 create only 1 card each. Only I-01..I-50 have a built-in exercise player (`#/intermediate/:id`).
- The lesson list and `#/learn?lesson=I-xx` page do not link to `#/intermediate/:id`; those files are owned by another lane.
- No audio exists for intermediate items; the checks do not cover audio.

## Needs a native speaker

Everything is draft (`needsNativeReview: true`, `proofread: false` on all lessons). Specifically:

- 189 of the 635 intermediate words are `source.file: "composed"`: each token exists in the data, but the combination, its pointing and its gloss were assembled for this project and not reviewed.
- Beginner drill words (for example `שָׁב`) exist in the data but their glosses are unreviewed.
- Prayer-text choices: nusach of Kaddish (Ashkenaz, no Ten Days of Repentance additions, I-04), Edot HaMizrach text in I-08, Yigdal `transcribed-needs-check` (I-09), Tefillat HaDerekh and all corpus gaps named in each lesson `note` (Hallel, Haggadah, Megillah, Birkat Hamazon rest, Yom Kippur liturgy; I-02..I-10, I-26..I-34).
- Register labels (formal, neutral, casual, slang) on I-11..I-50 and the gender pairs.
- Machine transliteration lines (`pronunciation`) in all I lessons.
- Whether `intermediate` is the right learner-facing name for the synagogue unit and whether level `B1` fits the Israel unit.
