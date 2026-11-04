# Record-level attribution (words.json)

`data/vocab/attribution.json` maps every word id in `data/vocab/words.json` to where it came from and under what licence, built by `node tools/vocab/attribution.mjs` from fields already in the repo. It quotes `docs/vocab/LICENSES.md` and `docs/corpus/LICENSES.md`; it adds no licence reading of its own. It is not legal advice, and `words.json` itself still has no per-record licence field (changing it was out of scope).

Required attribution text (identical to `ATTRIBUTION` in `src/vocab/vocab.view.js`; a test compares them):

> Word ranking derived from the OpenSubtitles-based FrequencyWords lists by Hermit Dave (CC BY-SA 4.0); lemmas, glosses and vocalisation derived from Wiktionary contributors (CC BY-SA 4.0), via Wiktextract/kaikki.org. Changes were made (filtering, re-ranking, topic assignment, gloss shortening). This vocabulary data is shared under CC BY-SA 4.0.

## Counts (6,297 records)

| origin | records | licence recorded | share-alike |
|---|---|---|---|
| wiktionary (lemma, gloss, pointing) | 6,027 | CC BY-SA 4.0 | yes (also FrequencyWords for rank) |
| phrasebook (`data/corpus/phrasebook.json`) | 153 | "original (project-owned)" as written in each phrasebook record | no |
| lessons (`data/curriculum/lessons.json`) | 117 | none stated anywhere in the repo | no |

- Every record is distributed under CC BY-SA 4.0 as part of the data set (`distribution` field; LICENSES.md "Share-alike consequence"). 6,027 records are themselves share-alike derivatives; 270 are project text that is bundled into it.
- 51 Wiktionary entries also carry merged phrasebook text and 143 carry lesson references; their `sources` list includes `phrasebook` / `lessons` and `merged` names the ids (all ids checked to exist).
- Examples: 5,315 Tatoeba sentences (CC BY 2.0 FR; both authors, both sentence ids and the URL are kept on the record, none missing), 434 verses from the Leningrad Codex (public domain), 548 records without an example.
- Rank sources: `opensubtitles-he-2018` -> FrequencyWords (CC BY-SA 4.0, share-alike); `uxlc-tanakh+prayer-registry` -> counts only, no obligation (LICENSES.md row 3).
- Every record's pack file exists under `data/vocab/packs/` and contains the id.

## Could not be traced or settled (flags)

- `lesson-licence-not-stated` (117): lesson-derived entries. `lessons.json` states no licence and the repo says nothing about how these records may be reused; the owner decision and the legal-review list are in `data/vocab/LICENSE-NOTES.md`.
- `pointing-ai-written` (270): phrasebook and lesson entries; the vowel points and glosses were not taken from Wiktionary and are unreviewed.
- Not a per-record flag but applies to all 6,027 Wiktionary records: LICENSES.md says the Wiktionary licence page itself was not re-read (UNVERIFIED); kaikki.org's statement was taken from the extract's own terms.
- `data/vocab/overrides.json` (hand corrections) feeds `vocab5000.json`, not `words.json`, and its ids use a different scheme, so it is not traced here.
