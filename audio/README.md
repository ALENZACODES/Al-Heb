# Audio files

Each file follows the project contract:

`audio/<voice>/<tradition>/<kind>/<id>.mp3`

- **Voices:** `m` is Ari (man); `f` is Noa (woman).
- **Traditions:** `israeli`, `sephardi`, and `ashkenazi`.
- **Kinds:** `letter`, `vowel`, `syllable`, `word`, `line`, and `prayer`.
- **ID:** the stable lesson, phrase, or prayer-item identifier.

For example, `audio/f/israeli/word/bless-priestly-1-w1.mp3` is Noa’s Israeli pronunciation of the first word in the first Priestly Blessing line.

The pointed Hebrew, IPA where available, section, and status for every produced clip are indexed in [INDEX.csv](INDEX.csv) and the corresponding entries under [`data/audio/manifest.json`](../data/audio/manifest.json) and `data/audio/manifest-words-<tradition>.json`. Keep the file path and manifest `path` identical.

In the index, `voice`, `tradition`, `section`, `kind`, `id`, and `file` identify the clip; `pointed_hebrew` and `ipa` give its reading; `takes` and `preferred_take` support recording handoff. All clips currently in this index have one produced take.
