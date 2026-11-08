# Beginner awards and sample certificate

This lane adds an Awards page. It does not change the lesson engine. Lesson completion is not a certificate.

Approved artwork: none. The medallions and the certificate frame are temporary original vectors. Accepted image count is 0. They are not ChatGPT image files. `ART_FILES` in `src/awards/icons.js` is the replacement seam (`medallion`, `certificateFrame`, `seal` are null until a named file is approved).

## Confirmed criteria

None. `CRITERIA_REVIEWED` in `src/awards/rubric.js` is false. `REVIEW_STATUS` is `awaiting-review`. `certificateDecision` reads that constant. A copied rubric with `criteriaReviewed: true` still does not issue.

## Proposed checklist

Derived by `deriveBeginnerRubric` from:

- `data/curriculum/belts.json` white belt (`r01-r09`)
- `data/curriculum/lessons.json` letters, vowels, words, and prayer-line ids on those lessons

The belt sentence is shorter than the lesson graph. The proposal follows the graph and says so. Every item status is `proposed`.

A future item is satisfied only by an accepted event with `correct: true`. A wrong answer can be stored and does not satisfy the item.

## What is not evidence

| Writer | Path | Why it is not used |
| --- | --- | --- |
| Quick check | `src/curriculum/actions.js` `saveQuickCheck` | Completes when any result exists, including wrong answers |
| Mark complete | `src/curriculum/learn.view.js` | Writes completion with no answers |
| Intermediate | `src/curriculum/intermediate.view.js` | Completes when every exercise has a result, including wrong ones |
| Tracing | `src/letters/progress.js` | Stroke counter. D-11 groups tracing with self-report |
| Timed read | `src/timedread/timedread.view.js` | Learner marks "I read it all" |
| Say it | `src/speak/speak.js` | Learner can mark "I read it" |
| First 10 minutes | `src/firstday/model.js` | Self-reported |
| Ladder | `src/firstday/ladder.view.js` | "I read it" is self-reported |
| Fade-out | `src/curriculum/fade.view.js` | Some steps are self-graded |
| Preview badges | `preview/loops/badges.js` | Counts include self-reported reads. This lane does not read `loops.v1` |

## Adapter

Only `acceptAssessmentEvent` in `src/awards/contract.js` accepts evidence. `withEvidence` in `src/awards/record.js` stores an accepted event. Same `evidenceId` is a no-op.

Required fields: `kind: 'assessment.item'`, `rubricId: 'beginner-white-v1'`, `itemId`, `correct` boolean, `trust: 'objective'`, `source: 'assessment-engine'`, `evidenceId`, `at`.

Rejected: `completed`, `lessonComplete`, `selfMarked`, `win`, `xp`, `passed`, and sources such as `curriculum.progress`, `saveQuickCheck`, `letters.progress`, `timedread.v1`, `speak.v1`, `firstday.progress`, `loops.v1`, `visit`, `login`.

There is no function that turns a completion flag into an award. The page does not offer a control that submits a fake pass.

`evaluateProposedCertificate` does not issue unless `confirmed` is the boolean true, `criteriaReviewed` is the boolean true, the item list is exactly the shipped 40-id candidate with no holes or substitutions, and every item has objective evidence whose `rubricId` is `beginner-white-v1`. Omitted, null, and false `confirmed` do not issue. A short, empty, or rewritten list is not that candidate. The page calls `certificateDecision`, which passes `confirmed: false`, and `CRITERIA_REVIEWED` stays false, so this hypothetical check does not unlock a certificate.

`source` and `trust` on an event are strings the caller wrote. Comparing them to `assessment-engine` and `objective` does not identify the caller and is not authentication. Evidence from a different `rubricId` does not satisfy an item. Stored evidence is local-only in `awards.v1`. It has no learner id, no key, and no network send. Copying the record to another browser is still just local data. This document does not claim the record can detect tampering.

Every PDF and HTML certificate from this module is a design proof. The face carries one label, Design proof. A caller watermark such as EARNED is ignored. Passing `sample: false` or `issuable: true` still prints that label. There is no earned export until a separate issuance design is reviewed. The file name is `alef-certificate-DESIGN-PROOF.pdf`.

Matching the 40 shipped ids is not a content check and not approval. The evaluator still accepts those ids when the Hebrew, gloss, or requirement text on the items has been rewritten. It does not authenticate evidence. `CRITERIA_REVIEWED` stays false. That choice is unresolved and is not treated as a reviewed rubric.

## Unresolved choices

Not decided here:

- A later miss under a new evidence id does not clear an earlier `correct: true`. Whether a miss replaces a pass is a mastery rule for a later review.
- Which of the three draft bars is the checklist, whether a word id should follow the Hebrew string instead of `word:<lesson>:<index>`, and whether evidence needs a question id, are curriculum corrections for MAIN. This lane does not adopt them.

## Proposal for MAIN criteria review

Not adopted. Do not treat this section as a reviewed standard, and do not flip `CRITERIA_REVIEWED`.

Independent QA of the draft white belt (`lessons.json` status `draft-needs-native-review`) found three different bars and two addressing gaps. A later review has to pick one list before any engine scores against it.

1. Belt sentence in `data/curriculum/belts.json`: reads Shabbat Shalom; Shin, Bet, Tav, Lamed, final-Mem, Vav; kamatz, patach, cholam, dagesh.
2. Lesson r04 goal text says "6 letters, 3 vowels". Lessons r01–r03 list 6 letters and 5 vowel-array entries, because r01 also lists `shin-dot` on the vowels array.
3. The derived proposal is 40 items: 11 letters, 7 vowel-array entries, 19 words, and 3 Priestly Blessing line ids. It follows the lesson graph, not the shorter belt sentence.

Item reuse: `שַׁבָּת` is only `word:r02:1` (r04 references that id). `שָׁלוֹם` is only `word:r03:1` (r04 and r05 reference it). The greeting phrase is `word:r04:3`. An event for `word:r04:1` is a different id and is not a proposal item. A correction worth reviewing, not applied here: bind a word item to the reviewed Hebrew string and gloss, not only to `word:<lesson>:<index>`.

Question ids: no proposed item has `questionId`. The r05 line text says a tap that you heard the line does not count, but an event has no question id, so the parser cannot tell that sentence from any other `correct: true`. A correction worth reviewing, not applied here: a future evidence schema should name the checked prompt. This lane does not add that field and does not issue from line items.

## Activity and mastery

Practice badges `game-session` and `game-return` read play counts already saved by the five built games (`src/games/*.view.js` via `src/awards/observe.js`). A play count is a finished session, including sessions with wrong answers. The copy says activity, not mastery.

Matte, polished, and foil are locked layout slots from the art direction. None is earned. The other programme games are not badge sources here.

Store key: `awards.v1`. Local only. No account, no email, no server copy. The PDF is marked Design proof and is not stored as an earned certificate.

## Certificate face

The printable sheet, the screen preview, and the PDF share one landscape hierarchy on warm eggshell stock with a fine grain: a small ALEF wordmark for the learning programme, the issuer line "ALEF is Key Foundation", Certificate of Completion, Presented to, the learner's name, for, Beginner Hebrew Foundations between thin rules, a temporary crimson circular seal, and the sample reference `Cert #`. The footer remains "Independent learning programme", then the preview date, then one line: Design proof.

`Cert #` is built only from the display name and the preview instant. The first whitespace-separated token is the given-name token and the last is the family-name token. Tokens between them are ignored. The reference is the last token's first Unicode letter, then the first token's first Unicode letter, then a hyphen and the America/Toronto calendar date `YYYYMMDD`. Ada Learner at 12:00 UTC on 6 November 2026 is `Cert # LA-20261106`. A single name, a missing name, a token with no letter, or an invalid instant is `Cert # incomplete`. The same name and date share one reference, so it is not unique. It is not checked, and it is not an accreditation number. The learner can edit the display name. The printed preview-date line stays in UTC. The `Cert #` date uses America/Toronto so the calendar day does not follow the machine timezone.

Key Foundation is a display name on this sample. It is not a claim of a registered charity, company, or accreditation. The seal is a temporary crimson stamp with the words KEY FOUNDATION on the ring and ALEF in the center. It is not a royal arms, a state crest, or a sign of endorsement. Approved artwork remains 0.

HTML uses Frank Ruhl Libre, already shipped under SIL OFL 1.1 (`assets/fonts/FONTS.md`, `assets/fonts/web/frank-ruhl-libre.woff2`). The PDF embeds the same face: Latin static instances at weights 400 and 700, taken from `assets/fonts/frankruhllibre-FrankRuhlLibre[wght].ttf`, licence `assets/fonts/frankruhllibre-OFL.txt`. No reserved font name. No new typeface and no paid font service. The eggshell curves, the grain, and the distressed seal are drawn in the PDF content, not only in the page CSS.

Approved artwork: 0. The seal is a temporary geometric drawing. The longer notes stay in the page disclosure and in this document.
