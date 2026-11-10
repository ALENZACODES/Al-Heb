# English-reader respelling: rules (DRAFT)

**Status: DRAFT. Nobody has listened to any output. Nothing is reviewed. Every rule below is a guess, written for a native English reader to check and correct.** Whether an English-voice text-to-speech reads these spellings the way the table intends is untested.

## Purpose

Write each Hebrew item the way it sounds to an English reader ("John" becomes "jawn"), to feed an English-voice text-to-speech. Input is the existing Spanish-style `soundtext` in `data/tts/soundwords.sephardi.json` and `soundwords.ashkenazi.json` (see `SOUNDWORDS.md`). This step only re-spells that text; it adds no Hebrew pronunciation rule, so every error in the soundtext (stress defaults, shva, pharyngeals merged) carries over unchanged.

```bash
node tools/tts/to_english_respelling.mjs            # writes data/tts/english-respelled.{sephardi,ashkenazi}.csv
node tools/tts/to_english_respelling.mjs --check    # exit 1 if the CSVs are stale
node tools/tts/to_english_respelling.mjs --no-caps  # same, stress not marked
node --test tests/tts.english-respelling.test.js
```

Output columns: `id, he, soundtext, english, confidence`. `confidence` is copied from the input and is the confidence of the Hebrew-to-soundtext step only; it says nothing about the English step. `english` is empty where the input is unvoiced.

## Format

Syllables joined by a hyphen, words by a space, punctuation kept. The stressed syllable (the one carrying the acute accent in the input) is UPPER CASE, all others lower case: `a-léf` becomes `ah-LEF`. Risk: a voice may spell out capitals as letters; `--no-caps` drops the marking.

## Rule table

| Input (soundtext) | English | Example | Guess / risk |
|---|---|---|---|
| a | ah | a-léf -> ah-LEF | none expected |
| e, open syllable | eh | be-va -> beh-vah | none expected |
| e, closed syllable | e | lef, mel | a final plain e could be read as a silent e |
| i | ee | gui-mél -> ghee-MEL | none expected |
| o | oh | sha-lóm -> shah-LOHM | none expected |
| u | oo | | none expected |
| ei (tsere, Ashkenazi) | ay | béis -> BAYS | "ays" may be read as a plural |
| oi (cholam, Ashkenazi) | oy | yóid -> YOYD | none expected |
| ai (not followed by a vowel) | igh | a-do-nái -> ah-doh-NIGH | "igh" may read oddly after some consonants |
| gu before e or i (hard g) | gh | gué -> GHEH | "gh" could be read as silent; the u of a real gu+vowel sequence is lost |
| g elsewhere | g | | none expected |
| j (chet, khaf, Ashkenazi x) | ch | já -> CHAH | an English reader may say the "ch" of "church", not the throat sound |
| sh | sh | | none expected |
| ts | ts | a-tsór -> ah-TSOHR | initial "ts" is unusual in English |
| y | y | ye-va -> yeh-vah | none expected |
| b d f h k l m n p r s t v z | same letter | | v and z are as English; h before a vowel only |
| any other character (. , ? ! ...) | kept as is | | |

## Known gaps

- A hyphen between `s` and `h` (or `t` and `s`) can be read as the digraph `sh` or `ts`; the soundtext already has that ambiguity.
- Vowels are always written as digraphs (ah, oh, ee, oo), so an English reader will hear long vowels where Hebrew has short ones.
- The Spanish `gu` spelling is undone only before e and i; an actual g followed by the vowel u and then e or i cannot be told apart.
- Doubling, the glottal stop, pharyngeal and uvular sounds are not written (same limits as `SOUNDWORDS.md`); Sephardi and Israeli respellings are identical in the soundtext for that reason.
- The tests pin 15 hand-checked conversions. They show the code follows this table, not that the table is right.
