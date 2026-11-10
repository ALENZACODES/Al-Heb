# Practical Fixes, Round 2

Reply to the 4:22 AM update of the Practical fails list: 67 unique items, 77 failing occurrences. Lane C, 2026-11-10.

## Fix or Pull: All 67 Pulled, None Rewritten

- **No Hebrew or gloss changed.** The round 1 check still holds. Every item's source matches the list, none has a pointing slip
  against the vocabulary file, and none involves the divine Name. Changing sourced Hebrew to pass a transcript would be
  inventing it.
- **Pulled in committed data.** The pull used to depend on `failing_keys` in the untracked `gcloud-results.json`. Without that
  file the live view showed every item. All 67 keys are now in **`data/curriculum/practical/hidden-items.json`**. The Practical
  view folds that list into the check results on every load, so a fresh install also hides them.
  - On a written page, a hidden item also loses its speaking prompt and its pick-the-meaning round.
  - Two tests check this, one of them rendering `pu-numbers-p04` without `numbers-16`.
- **To un-hide an item,** delete its key after a person listens to the clip. Each entry records its source, cause and verdict.
- **New pages avoid hidden items.** The ten `pu-cafe` pages written this round use none of the hidden keys: not the vegetarian
  lines, mint tea, "very tasty", bread, cheese or tea. A test enforces it.

## Already Cleared

- The three numeral items were cleared by the digit fix.
- The 12 women's forms on the level-0 pages passed.
- `politeness-21` stays blocked and held for John; it never reaches a page.

## Scorer Proposal (Unchanged From Round 1, Still Off)

- Word-boundary matching (spaces, maqaf, hyphen).
- Same-sound letter folding (א/ע/ה, ט/ת, כ/ק, ח/כ, ב/ו). Report these as passing on sound only.
- Scoring `numbers-0N` against the gendered clip the page plays.

Any item these would clear still needs a person's listen before its key leaves `hidden-items.json`.
