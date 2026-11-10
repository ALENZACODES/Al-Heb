# Audio files

Each file keeps the exact project path contract:

`audio/<voice>/<tradition>/<kind>/<id>.mp3`

- **Voices:** `m` is Ari (man); `f` is Noa (woman).
- **Traditions:** `israeli`, `sephardi`, and `ashkenazi`.
- **Kinds:** `letter`, `vowel`, `syllable`, `word`, `line`, and `prayer`.
- **ID:** the stable lesson, phrase, or prayer-item identifier. It is intentionally not a filename translation.

For example, `audio/f/israeli/word/bless-priestly-1-w1.mp3` is Noa’s Israeli pronunciation of **יְבָרֶכְךָ** (may-he-bless-you; `yevarekhekha`).

## Find what every clip says

Open **[INDEX.csv](INDEX.csv)** for **pointed Hebrew → English → phonetic** for every produced audio file. Search for the filename or ID to find the label.

Open **[LABELS-israeli-words.md](LABELS-israeli-words.md)** for a browsable table of **every Israeli word and produced reading-line clip**: clickable file, Hebrew, plain-English meaning, and phonetic reading.

Hebrew is read **right to left (←)**. In the learner layout, put the English beneath the Hebrew and the phonetics beneath the English.

The index keeps all existing columns, including `ipa`, and adds `english` and `phonetic` immediately after `pointed_hebrew`. Word and line phonetics use the project’s siddur-style Latin transliteration. Letter sounds use the existing IPA where available. Latin spellings are learner guides, not a replacement for listening to the audio.

English vocabulary meanings and full-line translations come from the existing vocabulary, corpus, and phrasebook data. `UNKNOWN` means a reliable per-word English meaning was not available; it is deliberately not a guessed translation. The point-by-point prayer word meanings currently supplied by the corpus cover the early explicit-gloss lessons; the remaining prayer words still carry their exact Hebrew and phonetic labels.

The corresponding produced entries under `data/audio/manifest.json` and `data/audio/manifest-words-<tradition>.json` contain the same `text`, `english`, and `phonetic`. Keep each file path and manifest `path` identical.
