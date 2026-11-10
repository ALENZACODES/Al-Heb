# Camera Translator: Review Round 3 Of 5

Date: 2026-11-10. Reviewed: branch tip `87a4a48a3` (third pass, CI green) against the second review file (on-device reader, 50,000 runs, mean 71.41) and the owner's rules. Self-review by the builder; the review lane's images have still not been run through the app path.

## Findings And Actions

| # | Finding on `87a4a48a3` | Severity | Action in the fourth pass |
|---|---|---|---|
| 1 | The builder's test sets had none of the review's harder conditions: dark, bright, something in front of the sign, tight crop, bilingual line, vowel-pointed lettering. The 92.9% figure said nothing about them. | High | A hard set of 133 images in those conditions. First run on the previous push: 152 of 185 lines (82.2%), 3 wrong drawings. Now 162 of 185 (87.6%), 2 wrong. |
| 2 | On a bilingual line the box covered the sign's own English as well, so the English was painted out and redrawn. | High | Only the Hebrew words are boxed. Browser test added. |
| 3 | A closest-match word was accepted even when it made nonsense with its neighbour ("Train Bus"). | High | A closest match must fit where it stands (alone, listed phrase, name pattern, describing word). |
| 4 | Word-for-word drawing used grammar words: the letter he alone became "Interrogative Particle". | High | Grammar words and single letters are never drawn word for word. |
| 5 | A digit with punctuation stuck to it (noise from a pole) was drawn as a price. | Medium | Treated as noise. |
| 6 | Letters at the edge of a tight crop were lost. | Medium | White frame added before reading: tight crop 25 to 27 of 28. |
| 7 | A price read entirely as letters was not repaired (open item from round 2). | Low | Repaired in one narrow case: two or three look-alike letters straight after a listed word. |
| 8 | The offline rig kept a second copy of the word-list rules in Python. Two copies had to be changed for every rule. | Medium | The rig now runs the app's own rules through Node. One implementation. |
| 9 | A sign with a hidden letter was always left untranslated. | Medium | Closest whole phrase for a line in pieces, with a strict margin. Pole test 7 to 13 of 28. |
| 10 | Nothing told the learner that part of a line was unreadable. | Low | Lines the reader returned noise on are marked "partly read" in the panel. |

## Checked And Found In Order

- No request other than a plain GET of the app's own files; no storage; no inline script; tests enforce each.
- The real-word guard still holds after the new rules: all 5,184 single dictionary words run through the translator and none is "corrected". An early version of the whole-phrase rule broke this (30 words, for example the word for car became "Taxi"); it was caught by that test and the rule was limited to lines in two or more pieces with no real word in them.
- The four-letter name rules are unchanged and their tests pass.
- First-install size: about 2.6 KB under the limit, unchanged this round (no installed file was touched).

## Still Open After This Round

1. **Below the bar on hidden letters.** 13 of 28 with a pole in front of the sign, and 2 partial translations drawn. This is the main reason the hard set is 87.6%.
2. **The review's 71.41 has not been reproduced or re-scored on the app path.** The builder's numbers come from the builder's images. Until the review lane runs `e2e-batch.mjs` on its own images, there is no independent score for the current code.
3. No real photograph and no phone.
4. 105 of 156 word-list entries unchecked by a native speaker.
5. The reader sometimes invents vowel points and misreads pointed lettering (15 of 17 on the pointed test).

## Score Against The Bar

Builder's sets, lines with the right English on the photo: stored 96.4, wear 94.6, hard 87.6 (94.9 without the pole condition). Taken together the wear and hard sets are 321 of 353 (90.9), below 92. Not a pass.
