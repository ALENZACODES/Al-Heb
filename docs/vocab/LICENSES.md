# Vocabulary licences (data/vocab/vocab5000.json)

Not legal advice; this records what each source says about itself, checked against the files cached by `tools/vocab/fetch.py` on 2026-11-03 (sha256 in `data/vocab/sources.lock.json`).

| Source | Used for | Licence as stated | Consequence |
|---|---|---|---|
| hermitdave/FrequencyWords, `content/2018/he/he_50k.txt` and `he_full.txt` (derived from OpenSubtitles2018) | Spoken-frequency ranking | Repo README: "MIT License for code. CC-by-sa-4.0 for content." The repo LICENSE file is the MIT text. | Rank order is a derivative of CC BY-SA 4.0 content. See "Share-alike" below. |
| Wiktionary via Wiktextract dump (kaikki.org Hebrew JSONL) | Lemmas, glosses, pointed headwords (`wv` head-template argument), POS, category hints for topics | Wiktionary text is CC BY-SA 4.0 (and GFDL); kaikki.org states its extracts follow the same terms. The licence page itself was not re-read this session: UNVERIFIED. | Pointed forms and glosses are share-alike derivatives; credit Wiktionary contributors. |
| Tanakh (UXLC) and prayer registry (`data/corpus`) | Boost for Torah/prayer words (stage 2 `readRank`) | Public domain / copy without restriction (see `docs/corpus/LICENSES.md`) | No obligation; only counts are used. |
| Topic structure, curated core list (days, months, seasons, colours, directions, time words, a few numerals) | Topic coverage | Own work (lists in `tools/vocab/build_vocab5k.py`) | Hebrew strings for these still take pointed forms from Wiktionary. |
| `top625-user-supplied.csv` | Coverage COUNTS only (`docs/vocab/COVERAGE.md`) | UNSTATED | No row, word or translation from it is stored in the repo. `tools/vocab/coverage.py` reads it from an external path and prints counts. |

## Share-alike consequence

`data/vocab/vocab5000.json` (and `words.json`, `packs*`, `index.json`) is an adaptation of CC BY-SA 4.0 material. Distributing it, or an app bundle that embeds it, means:

1. Attribute: "Word ranking derived from the OpenSubtitles-based FrequencyWords lists by Hermit Dave (CC BY-SA 4.0); lemmas, glosses and vocalisation derived from Wiktionary contributors (CC BY-SA 4.0), via Wiktextract/kaikki.org." Link the licence and say that changes were made (filtering, re-ranking, topic assignment, gloss shortening).
2. Licence the vocabulary data, as distributed, under CC BY-SA 4.0 (or a compatible licence). This applies to the data files only; it does not by itself extend to separately written code, audio or book text, but a combined work that merges the data into one text should be treated as share-alike. Get a lawyer's opinion before selling a bundle that mixes the two; none was obtained.
3. The in-app credits screen and the book colophon should carry the attribution (owned by lanes 8 and 7: not edited here).

Phrases/examples in `words.json` that come from Tatoeba (CC BY 2.0 FR) keep their per-example attribution; `vocab5000.json` contains no example sentences.

## Pointing (niqqud) honesty

4,998 of 5,000 entries carry a pointed form taken from a Wiktionary headword. Nothing was auto-vocalised or invented. The two without pointing (`עכשיו`, `יום שישי`: Wiktionary pages are unpointed) have `pointed: null`, `needsPointing: true`. Wiktionary points without matres lectionis (ktiv haser), so a few pointed forms are spelled slightly differently from the unpointed lemma (checked by skeleton in `tests/vocab.schema.test.js`). No Hebrew educator has reviewed any entry: all have `proofread: false`.
