# Hebrew lint baseline refresh, 2026-11-04

The test "baseline: no NEW definite errors in data/" failed with 16 findings. None is a new bad string. Six vocab records were added earlier in `data/vocab/words.json` (see `data/vocab/corrections.json`, "added"), which moved every later record down by 15 positions. The baseline fingerprint includes the array path, so the same already-baselined strings showed up as new. Every item below has an identical hash in the previous baseline at the old index (old index in brackets).

These strings still need native review and a source-backed fix; they are known problems, not accepted ones.

| File | Record path (new) | Rule | String problem |
|---|---|---|---|
| data/vocab/words.json | .words[2590].he (was 2575), id h448338e7, "to plaster" | conflicting-marks | tsere and patah on one letter |
| data/vocab/words.json | .words[2676].example.he (was 2661), id heb3f471a, Micah 3:10 | conflicting-marks | hiriq and patah on one letter (source text as received) |
| data/vocab/words.json | .words[3159].forms.plural (was 3144), id h1da16296, twice | conflicting-marks | sheva/hiriq with holam on one letter |
| data/vocab/words.json | .words[3466].forms.plural (was 3451), id h9167dfb6 | conflicting-marks | hiriq and qamats on one letter |
| data/vocab/words.json | .words[5716].forms.plural (was 5701), id h654755af | conflicting-marks | hiriq and qamats on one letter |
| data/vocab/words.json | .words[4545].example.he, id h48fc3422 | nonfinal-letter-at-end | Tatoeba sentence "לכ- 20", abbreviation with hyphen, text as received |
| data/vocab/frequency.json | .entries[3181].he | conflicting-marks | copy of h448338e7 |
| data/vocab/index.json | .rows[2590][1] | conflicting-marks | copy of h448338e7 |
| data/vocab/vocab5000.json | .entries[2614].pointed | conflicting-marks | copy of h448338e7 |
| data/vocab/packs/vocab5k-tier-5000.json | .entries[614].pointed | conflicting-marks | copy of h448338e7 |
| data/pronunciation/variants/_vocab-2.json | .records[590].he | conflicting-marks | copy of h448338e7 |
| data/pronunciation/derived/_syllables-003.json | .records[43].w[0].h | conflicting-marks | copy of h448338e7 |
| data/pronunciation/derived/_ssml-006.json | .records[324].ssml.israeli / .sephardi / .ashkenazi | conflicting-marks | copy of h448338e7 inside SSML |

No Hebrew was changed to make the test pass.
