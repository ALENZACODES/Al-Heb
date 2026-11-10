# Camera Translator: Review Round 2 Of 5

Date: 2026-11-10. Reviewed: branch tip `45d6e9c88` (the second pass) against the owner's rules, the no-server decision, and the round 1 fail list. Findings are listed with what was done in the third pass. Self-review by the builder of the branch; an independent run of the review lane's image suite is still needed.

## Findings And Actions

| # | Finding on `45d6e9c88` | Severity | Action in the third pass |
|---|---|---|---|
| 1 | The screen could send a photo to a service if a config file named one. The owner has since decided: no server, nothing uploaded. | High | Service call, config file, send notice and the related privacy-page entry removed from the app. A unit test fails if `src/camera` gains any request other than a plain GET of the app's own data files. Browser tests assert no non-GET request and no other address. |
| 2 | Closest-match rule turned real words into listed words (the word for "where" became "Haifa"). | High | Guard list of 374 real words, phrase-context exception, test over all 5,184 single dictionary words. |
| 3 | A bilingual line was translated as English plus English ("Museum Museum Museum Museum"). | High | Only the Hebrew part of a line is matched; repeated halves collapse. |
| 4 | Two listed words in a row came out in Hebrew order ("Price New"). | Medium | Describing words are marked in the word list and placed before their noun. |
| 5 | The in-browser reader did no levelling, enlarging or colour flipping; the service path had all three. With no server, the weaker path was the only path. | High | All three moved into the browser path. Stored set 24 of 28 before; 27 of 28 now on a changed set (see the main report for why this is not like-for-like). |
| 6 | Only words in the 87-entry list were ever drawn. | Medium | List grown to 155; phrasebook tier; dictionary word-for-word tier. |
| 7 | The stored test set no longer had an out-of-list sign once bookshop and petrol station joined the list. | Medium | Two new signs: one kept outside the list on purpose, one that tests word order. |
| 8 | Tap targets were placed for the levelled picture even when the photo as taken was showing. | Low | Targets are mapped back onto the photo as taken; browser test added. |
| 9 | The saved translated photo was never checked for metadata (only the upload was). | Medium | Browser test saves the photo from a phone-style file with camera details and a position and checks the saved bytes. |
| 10 | First-install size was 1.7 KB under the 3.95 MiB limit. | Low | Now about 2.6 KB under, after the privacy entry was removed. Still tight: the next change to any installed file may trip the test. |
| 11 | Report text described a service as the main path. | Low | Report rewritten around the no-server design. |

## Checked And Found In Order

- No inline script, no HTML strings, no storage use, no animation in the camera screen (so nothing for the motion audit).
- The four-letter name: never translated, drawn, shown as text, broken into words or spoken; tests cover each.
- Headings and buttons are in Title Case; no tool names in user-visible text.
- Camera files are on demand; none is installed up front.
- Commits carry only the owner's name.

## Still Open After This Round

1. No real photograph and no phone has been tested. This is the largest gap between the measured numbers and what a learner will see.
2. 104 of the 155 word-list entries have not been checked by a native speaker.
3. A price read entirely as letters is not repaired.
4. The Python service in `tools/camera-translate` is now only a test rig. Its Google adapters have never been run. Deleting them is the owner's call.
5. The other branch (`feature/live-translator-2026-11-10`) carries a second `#/camera`. It was not touched from here. Whoever merges the two should keep this branch's `src/camera/` and drop the other's.

## Score Against The Bar

The review bar is 92. On the builder's own sets the app path scores 96.4 (stored) and 92.9 (wear) for lines with the right English on the photo, with no wrong English drawn. Those sets are not independent of the word list, so this is a floor check, not a pass. Rounds 3 to 5 should use the review lane's images and at least a few real photos.
