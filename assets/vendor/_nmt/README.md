# Talk Translation Packs (lazy, NOT precached)

Two small translation models, one per direction, that run in the browser on the learner's device. Nothing here is fetched until the learner asks for a pack on the Talk or Camera screen.

| Pack | Size | Model | Licence |
|---|---|---|---|
| `he-en/` | 77.2 MiB | OPUS-MT Tatoeba heb-eng, `opus-2021-02-19` (University of Helsinki, Language Technology) | Apache-2.0 |
| `en-he/` | 78.6 MiB | OPUS-MT en-he, `Helsinki-NLP/opus-mt-en-he` (University of Helsinki, Language Technology) | Apache-2.0 |

Each pack holds three graphs in parts of at most 16 MiB (`table`, `encoder`, `decoder`), the piece list `vocab.json` and `pack.json`. `manifest.json` lists every part with its size and SHA-256; the app checks both.

The graphs are built by `tools/talk/nmt/export.py` (weights at 8 bits, the word table stored once) and split by `tools/talk/nmt/pack.mjs`. The files carry no author, tool or date metadata beyond what the graph format needs.

Scores of the shipped packs are in `docs/talk/README.md`. Rerun: `node tools/talk/nmt/score.mjs tests/fixtures/talk.heldout.json`.
