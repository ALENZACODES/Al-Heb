# Builder vocabulary

The builder selects entries from `data/games/firstwords.json` and
`data/firstday/buildable-words.json`. Their source data derives from
Wiktionary/Kaikki (CC BY-SA 4.0) and FrequencyWords; see
`data/vocab/attribution.json` and `docs/vocab/LICENSES.md` for the original
attribution and source notices. Preserve those notices when redistributing
the derived vocabulary. The added dog, cat, and flower entries are editorial
learning examples.

Israeli phonetics are inherited from the vocabulary. Sephardi and Ashkenazi
phonetics use the existing pronunciation module. Its documented dialect and
schwa limitations still apply; this selection has not had a new educator review.

All new audio is synthesized Israeli Hebrew. Phonetic settings never select
a different accent recording. The voice configuration, generation scripts,
and clip checksums are in `tools/audio/`.
