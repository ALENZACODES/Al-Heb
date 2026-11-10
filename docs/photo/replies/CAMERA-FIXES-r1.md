# Camera Fixes, Reply To Review Round 1

Date: 2026-11-10. Applies to the review file "Camera translator failures" (3,958 runs scored, mean 89.35, bar 92).

## What Changed The Ground Under The Review

Owner decision, 2026-11-10: the Camera Translator runs in the browser with no server and no upload. The review read the signs with a cloud vision model. The app now reads them with its own in-browser reader, so the reader-side groups in the review (dark, noise, angle, blur, occlusion) describe a reader the learner never meets. The translation-side findings apply in full and are fixed below. The 80 listed rows are now a permanent regression fixture: `tools/camera-translate/tests/fixtures/review-r1-fails.json`.

## Result On The 80 Listed Rows (Text Level, Same Reader Output)

| | Right English | Wrong English | Left untranslated |
|---|---|---|---|
| As reviewed | 15 | 12 | 53 |
| Now | 43 | 4 | 33 |

All 80 source phrases translate when read correctly (60 before).

## By Review Group

| Group | Count in review | What was done | Status |
|---|---:|---|---|
| ocr-error-nikkud | 155 | Vowel points were already stripped before matching. The listed rows in this group are misreadings, not pointing. A partly pointed line (`מסעדה בְּשֵׁרָה`) now resolves through phrase context. | Fixed where it was a matching problem |
| glossary-miss-after-ok-ocr | 53 | Added the missing sign words (danger, elevators, supermarket, pull, push, exit as `מוצא`, bookshop, hours, and others: 87 to 155 entries). Closest-match rules reworked. | Fixed |
| ocr-error-mixed-script | 10 | On a bilingual line only the Hebrew is matched; Latin words and a number that follows them are dropped; a line read twice is halved. | Fixed |
| ocr-letter-or-word-error | 86 | The reader returning the plural `חנויות` for `חנות` is handled as a listed other form (labelled closest match). One-letter look-alikes were already handled; two look-alike letters (bet and kaf) are now accepted when unique. | Fixed for the listed patterns |
| ocr-empty-or-total-miss | 67 | A line with no Hebrew now returns nothing instead of echoing Latin text. A line read twice is halved. Total misreadings are left untranslated. | Partly: nothing can be recovered from a wrong reading |
| ocr-error-on-occlude | 117 | Nothing is invented: a word two or more letters from anything listed stays untranslated. | By design |
| ocr-error-on-dark / noise / angle / blur | 127 | Reader side. The in-browser reader now levels tilted signs, enlarges small ones and turns letters black on white before reading. Measured separately below. | Addressed on the app's own reader |

## Wrong Answers Went Down On Purpose

The rules now refuse more guesses:

- A real Hebrew word is never "corrected" into a listed word (374 guard words built from the app dictionary and phrasebook; a unit test checks all 5,184 single dictionary words). Example: the word for "where" is one letter from "Haifa" and used to become it.
- A general two-letter rule was tried and removed: 3 wrong for 2 right on these rows.
- The 4 remaining wrong rows are a different real listed word returned by the reader (entrance for danger, hello for salad, falafel for push, bank for hospital).

## Expected English Strings

`בית קפה` now gives "Coffee Shop" (was "Cafe"), matching the review's expected string. "Cafe" is kept as an accepted alternative in the data (`alt`).

## The App's Own Reader, Measured

Computer-made signs, headless desktop Chromium, not photographs, not a phone.

| Set | Lines | Right English on the photo | Wrong English drawn | Character error rate |
|---|---|---|---|---|
| Stored 20 signs | 28 | 27 (96.4%) | 0 | 2.9% |
| 20 signs x 6 kinds of wear | 168 | 156 (92.9%) | 0 | 4.0% |

One sign is kept outside the word list on purpose (1 of 28, 6 of 168). These sets were written by the same hand as the word list, so they do not measure coverage of real signs. Please run the review's own image suite through the app path for an independent score: `node tools/camera-translate/e2e-batch.mjs <folder>` takes any folder with a `ground-truth.json` (`{items:[{id, file, variant, lines:[{he, en}]}]}`) and reports the same measures, with no cloud calls.

## Not Fixed

- Occluded or badly misread words stay untranslated.
- A price read as letters with no digit left (`10` read as two letters) is not repaired.
- No real photographs yet.
