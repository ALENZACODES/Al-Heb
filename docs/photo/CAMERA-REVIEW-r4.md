# Camera Translator: Review Round 4 Of 5

Date: 2026-11-10. Reviewed: branch tip `e91ed5361` (fourth pass, CI green). Self-review by the builder. The review lane's own images have still not been run through the app path.

## Findings And Actions

| # | Finding on `e91ed5361` | Severity | Action in the fifth pass |
|---|---|---|---|
| 1 | The picture was always enlarged to 1800 pixels on its long side before reading, which made letters 200 pixels tall on a close-up sign. The reader does worse on letters that large. Nobody had measured this. | High | Size sweep run. First reading now at 1200; a second reading at the size that makes letters about 44 pixels tall; lines merged with the word list as referee. Wear set: lines read exactly 132 to 150 of 168. |
| 2 | Vowel-pointed lettering: 15 of 17. | Medium | 17 of 17 after the second reading. |
| 3 | A line the reader got wrong once was never looked at again. | Medium | A still-untranslated line is cut out and read on its own once more; the new reading is used only if the word list recognises it. |
| 4 | Whole-phrase guessing refused any line containing a word the phrasebook holds, even a listed sign word, once the phrasebook was loaded. The unit tests ran without the phrasebook and did not see it; the app always loads it. | High | Fixed. Unit test now also runs every phrasebook line through the loaded rules and requires no guess. |
| 5 | A partly read line could still be translated word for word from the dictionary ("Forbidden" for half of "No Smoking"). | Medium | Word-for-word is skipped on a line marked partly read. It still happens when the reader returns a clean first word and nothing else. |
| 6 | The false-guess rate of whole-phrase matching on real text had never been measured. | Medium | Measured on 20,000 random pairs of dictionary words: 1 guess at the current limit, 49 at a looser one that was tried. A unit test holds it. |
| 7 | All test phrases were the builder's own. | Medium | New set from the 48 sign phrases the review files name, under twelve conditions (576 images): 545 right (94.6%), 7 wrong. |

## Checked And Found In Order

- No request other than a plain GET of the app's own files, no storage, no inline script. The second reading and the line re-read use the same on-device reader; nothing new is downloaded.
- The four-letter name rules are unchanged; a held line is never re-read, merged away or translated.
- All 5,184 single dictionary words still pass through untranslated or exact, never "corrected".
- First-install size unchanged this round (no installed file was touched): about 2.6 KB under the limit.
- Time per image on the desktop is about the same as before (0.2 to 0.3 s) despite the extra readings, because the first reading is now smaller.

## Still Open After This Round

1. **A partly hidden sign: 40 of 76 lines, and 8 partial translations drawn.** Every other condition together is 863 of 881 (98.0%) with 1 wrong. Blocking partial translations by looking for unread ink beside the line was considered and not built: it would also hide correct translations of one-word signs with an arrow or logo beside them, and that trade could not be measured without real photos.
2. **No independent score.** The review's 71.41 was measured on its images with, it appears, the bare reader and a word-by-word lookup. The app path has not been run on those images.
3. No real photograph and no phone. Reading twice costs time and memory on a phone; neither was measured.
4. 105 of 156 word-list entries unchecked by a native speaker.
5. Coverage: every phrase in every test set is in the word list. A sign outside it gets a translation only if each word is in the dictionary exactly as written.

## Score Against The Bar

Builder's sets, lines with the right English on the photo: 903 of 957 (94.4%); 98.0% without the hidden-sign condition, 52.6% with it. Above 92 overall on these sets, but they are the builder's renderings and every phrase is listed. Round 5 should be the review lane's images and real photos, not another builder's set.
