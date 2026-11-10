# Image review queue (Nov 4, 2026)

State of the hashed-name returns from the image tool (931 files, `exec-<uuid>.png`, staged outside the repo) after batch 1 and before the batch 2 ingest. Nothing is approved; approval is always John's decision on the review page (`node tools/images/review_page.mjs`, then `data/images/review/index.html`).

## Identification (done)

The four identification maps were merged into `../alef-image-originals/hashed/map-all.json` (built by `build_map_all.mjs` next to it, from `map-b1.json` to `map-b4.json`): 931 files, 914 entries with an id, 17 dropped (13 retry losers or rejected tries with no id, 4 retry losers that carried the same id as a later file). Ids are unique. Two kinds of id were aligned to `data/images/run3.csv` and keep the map's spelling in `idInMap`: the trope slugs (`TROPE_sofpasuk` -> `TROPE_sof_pasuk`, `zakefkatan` -> `zakef_katan`, `zakefgadol` -> `zakef_gadol`, `karneypara` -> `karney_para`) and command 171, where the csv adds slot 1 (ten seeds) so the map's `NUM_tens_NN` is the csv's `NUM_tens_NN+1` (checked by eye: the map's `NUM_tens_01` is the twenty oranges).

| List | Entries | High | Medium | Already ingested (batch 1) | To ingest |
|---|---|---|---|---|---|
| manifest (runs 1 and 2) | 459 | 454 | 5 | 282 | 177 (L26, L27, V01 to V15 vowel sets, VOC themes) |
| next1000 (rows already in manifest.csv) | 9 | 9 | 0 | 0 | 9 (VOC_colours_04 to 10, VOC_synagogue_01, 02) |
| run3 (commands 150 to 194) | 446 | 439 | 7 | 0 | 446 |
| inter-pending, block-j | 0 | | | | nothing returned yet |

## Ingest (not done: stopped for the push point)

The 632 keepers (high + medium) are copied under their ids in `../alef-image-originals/hashed/stage-batch2/`, with the medium ids and notes in `../alef-image-originals/hashed/needs-eye-batch2.txt`. A dry run matched all 632 (0 unmatched, 0 conflicts, 44 aspect substitutions, 0 text hits at probe time). The real ingest was started twice and stopped before it finished (it writes `provenance.json` only at the end, and the box was shared with a full test run, about 10 images a minute), so **no batch 2 image is in `assets/img/gen`, `provenance.json` or the review page yet**; the WebPs it had written were removed again and `node tools/meta/scan.mjs` passes. The 1000 Run 3 rows were appended to `manifest.csv` for the dry run and taken out again, because `next1000`, the block J paste files and `book.images` treat every manifest row as planned work (`tools/images/append_manifest_rows.mjs` says to append only right before ingesting).

To finish, on a quiet box (about an hour with OCR):

```
node tools/images/append_manifest_rows.mjs --dry-run data/images/run3.csv
node tools/images/append_manifest_rows.mjs data/images/run3.csv
node tools/images/ingest.mjs ingest ../alef-image-originals/hashed/stage-batch2 --allow-aspect --jobs 2 \
  --tool "image tool (manual run; hashed originals identified by the maps in the originals folder)" \
  --needs-eye ../alef-image-originals/hashed/needs-eye-batch2.txt
node tools/images/alt_text.mjs && node tools/img/build_index.mjs && node tools/images/validate.mjs
node tools/images/review_page.mjs
```

Then update the row counts in `tests/images.ingest.test.js` (797 -> 1797), `tests/images.review.test.js` (37 text, 79 aspect, 58 backdrop are batch 1 only) and `tests/book.images.test.js`, and rebuild `next1000` and the block J paste files, which both read `manifest.csv`.

## Check by eye

The review page marks these "check by eye" (`needsEye` in `provenance.json`, filter "check by eye") once ingested; until then they are listed here.

Medium-confidence identifications (batch 2):

- `V11_chataf_patach_position`: retry of the position card; the earlier filled-navy-square attempt (map-b2 index 359) was dropped as a rejected try.
- `TROPE_hand_04`: palm-up hand; a near-identical earlier retry (508) dropped.
- `STORY_moses2_09`: dates and figs table; near-identical earlier retry (645) dropped.
- `NUM_tens_09` (map `NUM_tens_08`, "wrong count"): two files claim the 90 slot. Kept the later one, nine grape bunches of ten (`exec-bb118822`), as the map's "later try kept" rule says; the earlier one, nine rows of ten red discs (`exec-43e2d2c3`, listed in `map-all.json` under `dropped`), may be the better "nine rows of ten". Decide which.
- `NUM_tens_10` (map `NUM_tens_09`): one hundred seeds in an oval bowl; the no-bowl sibling (`exec-85172564`) dropped since the row asks for a bowl.
- `NUM_months2_10`, `VERB_home_04`, `HERO_amidah1_01`: two near-identical attempts each; the later one kept.
- `STORY_moses2_07` (combined entry 643): high confidence, but the bronze serpent stands on a pole that reads like a cross. Sensitivity check before approving.

Batch 1 (already on the review page, notes in `data/images/review-notes.json`):

- `L23_kaf_final_print_v3`: the prompt asked for "go (arrow)"; the image shows a walking man and no arrow.
- Retry pairs where the keeper was chosen by assumption: `STYLE_sample_cup` (two cup tries), `L07_zayin_print_mnemonic`, `L10_yod_print_noa` (the two-yo-yo try dropped), `L22_tav_print_mnemonic`.
- 37 images carry an OCR `contains_text` flag and 10 `possible_text`; the earlier eye check found no text and the hits look like noise, but nobody has confirmed each one.

Other things the ingest flags on batch 2 (from the dry run): 44 aspect substitutions, all squares delivered for wide rows or the other way round (`NUM_months1_01`, `_04` to `_10`, the fifteen `TROPE_*_card`, the fifteen `V*_card`, and others); the page shows "aspect substituted" on each.

## Still ungenerated

- manifest (runs 1 and 2, 797 rows): 329 rows after batch 2 (515 of them are also in `next1000`).
- next1000 (1000): 991 after batch 2; 485 have no manifest row yet (commands 102 to 149 of `spec_next.mjs`).
- inter-pending (100): all 100.
- block-j (1000): all 1000.
- run3 (1000): 554. Commands 150 to 193 are complete except 171 (`NUM_tens_01`, the ten-seeds anchor the builder added, was never generated); 194 has 7 of 10; 195 to 249 have nothing yet.

One hashed file in the uploads folder (`exec-56e695d7`) is in `listing.json` but in no map, and one map entry (`exec-c5edd953`, map-b4) is not in `listing.json`; neither affects the counts above.
