# Camera Translator: Review Round 5 Of 5

Date: 2026-11-10. Reviewed: branch tip `2da2671b5` (sixth pass, CI green). Self-review by the builder. The review lane's own images have still not been run through the app path, and no real photograph or phone has been used.

## Findings And Actions

| # | Finding on `2da2671b5` | Severity | Action in the seventh pass |
|---|---|---|---|
| 1 | 9 wrong English drawings on 957 lines, 8 of them on partly hidden signs. Seven had the same shape: one listed word, sometimes with a stray digit or mark, drawn as if it were the whole sign ("Store", "House 2", "4 Hours"). A wrong translation on the photo is worse than none. | High | A reading that looks cut off is not drawn. It is listed under the photo as "Possibly: ..." with the reason. Wrong drawings 9 to 3; right lines unchanged at 896. |
| 2 | A line re-read on its own could come back clean and be drawn, although the first look had seen a stray mark beside it. | Medium | The second look is held to the same rule as the first. |
| 3 | When nothing could be drawn because the sign was hidden, the notice said none of the Hebrew could be translated, which was not the reason. | Low | New notice for that case, and one for a photo where some lines were drawn and one was left. |
| 4 | "Gate 2" and "Room 4" are real signs, so the rule against a lone kind-of-place word with a number could not be applied to every such word. | Medium | Gate and Room are marked as taking a number in the word list; a unit test holds both sides. |
| 5 | Round 4 declined to build this rule because its cost on one-word signs could not be measured. | Medium | Built in a narrower form and measured on the four sets: no right line lost. The cost on real photos is still unmeasured and is listed as open. |

## Checked And Found In Order

- No request other than a plain GET of the app's own files, no storage, no inline script, no other address contacted, in all four image runs (849 images) and the 5 browser tests.
- The four-letter name rules are unchanged. A held line is never offered as a possibility.
- A possible reading is never drawn, never translated word for word, and never counted as translated in the results.
- All 5,184 single dictionary words still pass through untranslated or exact.
- Author on every commit of the branch is John Khan. Nothing was merged to main, force-pushed or deployed.

## Still Open After This Round

1. **A partly hidden sign: 34 of 76 lines right.** It now mostly stays untranslated instead of being drawn wrong (2 wrong drawings, was 8). Reading the hidden letters is not solved.
2. **No independent score.** The review's 71.41 was measured on its images with, it appears, the bare reader and a word-by-word lookup. The app path has not been run on those images.
3. **No real photograph and no phone.** Speed, memory and accuracy on a phone are unknown.
4. **106 of 159 word-list entries are unchecked by a native speaker.**
5. Coverage: a sign outside the word list is translated only when each word is in the dictionary with one naming meaning.
6. The cut-off rule could hide a correct one-word translation when a logo or arrow beside the word is read as a stray mark. Not seen on the builder's sets; not measured on photos.

## Score Against The Bar

Builder's sets only, computer-made signs in headless desktop Chromium: 896 of 957 lines with the right English on the photo (93.6%), 3 wrong drawings (0.3% of lines). Without the hidden-sign condition 862 of 881 (97.8%), 1 wrong. With it 34 of 76 (44.7%), 2 wrong.

That is above the 92 bar on these sets and below the 95 to 100 target. It is not a score for real use: the images and most phrases are the builder's own, and nothing here was photographed. The honest launch position is that the screen is safe to show (it runs on the device, sends nothing, and now prefers no answer to a wrong one) and its accuracy on real signs is unproven.
