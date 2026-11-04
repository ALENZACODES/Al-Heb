# Vocabulary data: licence notes

This is a plain list of the obligations that `docs/vocab/LICENSES.md` and `docs/corpus/LICENSES.md` already record, in one place, plus the text a public page needs. It is not legal advice. Items marked LEGAL REVIEW were not settled by anyone qualified and should go to a lawyer before the data is published or sold. Record-level detail: `data/vocab/attribution.json`, summary `docs/vocab/ATTRIBUTION.md`.

## Share-alike (CC BY-SA 4.0)

Applies to 6,027 of 6,297 records in `words.json`, and to the whole file as distributed.

1. Wiktionary contributors, via Wiktextract / kaikki.org Hebrew extract: lemma, gloss, pointed headword, part of speech, forms. Licence stated in LICENSES.md: CC BY-SA 4.0 (and GFDL); kaikki.org states its extracts follow the same terms.
2. hermitdave/FrequencyWords 2018 Hebrew (OpenSubtitles2018): the rank order. Licence stated: "CC-by-sa-4.0 for content".

Obligations (LICENSES.md, "Share-alike consequence"): (a) give the attribution below; (b) link the licence; (c) say that changes were made (filtering, re-ranking, topic assignment, gloss shortening, and, since Stage 6, removal of 2 duplicate records and 65 transliteration fixes); (d) distribute the vocabulary data, as distributed, under CC BY-SA 4.0 or a compatible licence. The data files covered: `words.json`, `packs/`, `packs.json`, `index.json`, `vocab5000.json`, and what is derived from them here (`themes/`, `frequency.json`, `deck-order.json`, `attribution.json`).

## Attribution only (no share-alike of its own)

3. Tatoeba example sentences, CC BY 2.0 FR: 5,315 records carry one. Each record keeps the Hebrew and English sentence ids, both authors and the sentence URL (in `words.json` under `example.source`, and in `attribution.json`). The attribution must name the authors per sentence; the Hebrew side is unpointed in Tatoeba.
4. Leningrad Codex (UXLC 2.6, tanach.us): 434 verse examples and the Tanakh word counts. Public domain / copy without restriction; citation appreciated; do not represent the text as the WLC (docs/corpus/LICENSES.md).

## Project text

5. Phrasebook entries (153 records): each phrasebook record states "original (project-owned)". Pointing and glosses are unreviewed.
6. Lesson-derived entries (117 records): `data/curriculum/lessons.json` states no licence; its note says the pointing and glosses are not reviewed. These records are bundled into the CC BY-SA data set, but the repo does not say on what terms they were created or may be reused. Flag `lesson-licence-not-stated` on each. Decision needed from the project owner: state a licence for lessons.json (or release the 117 records under CC BY-SA 4.0 explicitly), or remove them from the distributed set.

## Attribution text for a public page

Exactly as in the app (`ATTRIBUTION` in `src/vocab/vocab.view.js`, About screen):

> Word ranking derived from the OpenSubtitles-based FrequencyWords lists by Hermit Dave (CC BY-SA 4.0); lemmas, glosses and vocalisation derived from Wiktionary contributors (CC BY-SA 4.0), via Wiktextract/kaikki.org. Changes were made (filtering, re-ranking, topic assignment, gloss shortening). This vocabulary data is shared under CC BY-SA 4.0.

Licence link: https://creativecommons.org/licenses/by-sa/4.0/

Needed in addition wherever example sentences are shown (suggested wording, not yet in the app): "Example sentences from Tatoeba (tatoeba.org), CC BY 2.0 FR; the author of each sentence is named with it." and, for verse examples, "Hebrew text of the Tanakh: Unicode/XML Leningrad Codex (UXLC 2.6), tanach.us."

## LEGAL REVIEW

- The Wiktionary licence page itself was not re-read (LICENSES.md marks it UNVERIFIED); the GFDL mention is unexamined.
- Whether CC BY 2.0 FR example sentences may sit inside a data set distributed under CC BY-SA 4.0, and what the per-sentence author attribution must look like on a public page.
- The licence of the 117 lesson-derived records (item 6).
- Whether a bundle that merges this data with ALEF's own code, audio and book text becomes share-alike as a whole (LICENSES.md says to get an opinion before selling a mixed bundle; none was obtained).
- Unreviewed pointing and glosses in the project-owned records: whether the project can license them at all.
