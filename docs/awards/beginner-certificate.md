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

`evaluateProposedCertificate` is the pure rule (reviewed flag and every item correct). The page calls `certificateDecision`, which forces the shipped flag.

## Activity and mastery

Practice badges `game-session` and `game-return` read play counts already saved by the five built games (`src/games/*.view.js` via `src/awards/observe.js`). A play count is a finished session, including sessions with wrong answers. The copy says activity, not mastery.

Matte, polished, and foil are locked layout slots from the art direction. None is earned. The other programme games are not badge sources here.

Store key: `awards.v1`. Local only. No account, no email, no server copy. The sample PDF is watermarked `SAMPLE / NOT EARNED` and is not stored as an earned certificate.

## Certificate face

The printable sheet and the PDF use the same short face: ALEF, Beginner reading, Proposed completion, the learner's name, the preview date, one sentence that ALEF is an independent course and the sample is not a diploma or an accredited credential, and the line "Temporary layout." SAMPLE / NOT EARNED is on the sheet as a banner and as large page text.

Approved artwork: 0. That count sits beside the preview on the Awards page. The longer notes — no signature, no verification website, local-only file, not tamper-proof — are in the page disclosure "Record, storage, and what this sample is not" (`SAMPLE_PAGE_NOTES` in `src/awards/certificate.js`) and in this document. They are not printed on the certificate face.
