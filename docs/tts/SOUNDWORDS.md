# Sound words: a respelling workaround for Sephardi and Ashkenazi synthetic voices

**Status: a workaround, not a result.** The respelling is audible only through a real TTS run. **Nobody has listened to any output. No native speaker has approved any item.** Whether a given TTS voice reads this alphabet the way the table below intends is untested. Every sentence below about how a voice "should" read a letter is an intention, not a measurement.

## What this is for

The local TTS factory (`docs/tts/README.md`) uses a model that speaks Israeli Hebrew natively, so it can only make Israeli clips. The trick under test: give the model a Latin respelling of each pointed Hebrew item (a "sound word") in a Spanish or Italian language slot instead of the Hebrew, so a Sephardi or Ashkenazi reading can be steered by spelling. One respelling per tradition.

How the plan uses these respellings (opt-in per tradition, the `tts-respelled` source label, the language-token setting) is described in `docs/tts/README.md` and `tools/tts/plan.mjs`, which read `soundText()` defensively. This file documents only the respelling itself.

## Files

| File | What |
|---|---|
| `tools/tts/soundtext.mjs` | the engine: `soundText(pointedHebrew, tradition, opts)` |
| `tools/tts/build_soundwords.mjs` | writes the three data files; `--check` tells if they are stale; `--lang it` builds the Italian-slot variant (to another folder with `--out`) |
| `data/tts/soundwords.israeli.json`, `.sephardi.json`, `.ashkenazi.json` | one record per audio-manifest item (kind + id): `id`, `kind`, `group`, `voices`, `he`, `soundtext`, `confidence`, `flags`; the header has the model, the language token, the flag legend and the measured summary |
| `tests/tts.soundtext.test.js` | regression rows from stored data, property tests over the whole manifest, staleness check of the data files |

`data/tts/` is skipped by `tools/build-precache.mjs` (one line added to its skip list): these are build-time inputs for the TTS factory, about 2.6 MB in all, and must not be installed into learners' offline caches. The precache manifest itself was not rebuilt.

```bash
node tools/tts/build_soundwords.mjs            # writes data/tts/*.json
node tools/tts/build_soundwords.mjs --check    # exit 1 if the files are stale
node --test tests/tts.soundtext.test.js
```

## Output format

`soundtext` is one string per item: words separated by a space, syllables by a hyphen, the stressed syllable marked by an acute accent on its vowel (the Spanish and Italian way of marking stress), lower case, with `. , ? !` kept from the source. Example: `שַׁבָּת` gives Israeli `sha-bát`, Ashkenazi `shá-bos`. `opts.hyphens:false` and `opts.accents:false` give the flat forms; whether hyphens help or hurt a given voice is untested.

`soundText()` returns `{soundtext, confidence, flags, voiced, words, tradition, model, lang}`.

## How it works

It reuses the existing rule engine instead of forking it. `renderWord()` in `tools/pronunciation/build_variants.mjs` (the engine behind `docs/pronunciation/VARIANTS.md`) drives `src/pronunciation/shva.js` (vocal or silent shva), `kamatz-katan.js`, `src/photo/syllabify.js` (syllables, vowel letters, furtive patach) and the stress lists in `data/pronunciation/`. It returns IPA per tradition with syllable dots and a stress mark. `soundtext.mjs` adds only: splitting running text into words (maqaf and hyphen joins, punctuation), turning that IPA into the alphabet below, and assigning confidence and flags. Every pronunciation rule is therefore the one already stated in `data/pronunciation/consonants.json`, `niqqud.json`, `stress.json`, `prayerwords.json` and `VARIANTS.md`; this lane added no new linguistic rule.

## The respelling alphabet

Five pure vowels (a e i o u), no English-irregular vowel digraphs, one Latin string per sound. The language slot (`opts.lang`, default `es`, recorded in each file header as `ttsLanguageToken`) changes only two things: the back-of-throat sound and g before e or i. "Intended reading" is what a Spanish or Italian reader of the spelling would say; "Risk" is where I expect it to go wrong. None of this was heard.

| Sound | Written | Intended reading | Risk |
|---|---|---|---|
| a e i o u | a e i o u | five pure vowels, both languages | none expected |
| Ashkenazi kamatz (open o) | o | o | the open quality is lost |
| Ashkenazi vocal shva (schwa) | e | e | schwa becomes e |
| tzere (Ashkenazi), cholam (Ashkenazi) | ei, oi | two vowels gliding | a voice may read them as two syllables |
| chet, khaf, Ashkenazi x | es: `j`, it: `kh` | es: the back-of-throat sound | it: `kh` is likely read as k (as I understand it, Italian has no such sound) |
| bet without dagesh, vav | v | it: v | es reads v as b, so vav and vet may sound like bet |
| bet with dagesh | b | b | none expected |
| gimel | g; before e or i: es `gu`, it `gh` | hard g | a letter u or h is added to the spelling |
| he | h | h | h is silent in Spanish and Italian, so he may vanish |
| zayin | z | z | es reads it as s or th, it as ts or dz |
| shin | sh | sh | neither language has a plain `sh` spelling; the voice may say s |
| tsadi | ts | t then s | none expected |
| yod (consonant) | y | y | Italian does not use y |
| yod after a vowel (ai, oi) | i | diphthong | none expected |
| resh | r | trilled or tapped r | the Israeli uvular resh is not written |
| tav with dagesh, tet | t | t | none expected |
| tav without dagesh, Ashkenazi only | s | s | none expected |
| kaf with dagesh, qof | k | k | none expected |
| alef, ayin | (nothing) | silent; the vowel stays as its own hyphen-separated syllable | a voice may merge the vowels (ha-o-lám) |
| pharyngeal chet and ayin (Sephardi) | merged, see D2 | | cannot be written |

Not written at all: doubling (dagesh chazak), vowel length, glottal stop, uvular or pharyngeal quality.

## Confidence and flags

`confidence` is a function of `flags` and nothing else:

| Level | Rule |
|---|---|
| `high` | no flag fired |
| `medium` | only default-rule flags fired (the legend in each file header gives the reason per flag) |
| `low` | at least one guess flag fired: `shva-heuristic-L3`, `possible-segolate`, `kamatz-katan-before-chataf`, `vav-cholam-consonantal`, `he-patach-no-mappiq`, `shin-undotted`, `non-hebrew-token`, `aramaic` |
| `unvoiced` | not respelled; `soundtext` is empty |

`unvoiced` is used when a word has no vowel signs at all (letter-sound items such as `ב`, an isolated dagesh or shin dot, and five lesson/vocab words written without niqqud) or no spoken vowel can be derived. The engine refuses to guess vowels. A line with one unvoiced word is unvoiced as a whole.

Measured on the current manifest (counts of unique kind + id items; the m and f voices share one text, so these cover 9,370 Israeli and 7,768 + 7,768 Sephardi and Ashkenazi manifest entries):

| Tradition | Items | high | medium | low | unvoiced |
|---|---|---|---|---|---|
| Israeli (ISR-STD-v1) | 4,685 | 1,403 | 2,731 | 517 | 34 |
| Sephardi (SEPH-TEXTBOOK-v1) | 3,884 | 839 | 2,539 | 472 | 34 |
| Ashkenazi (ASHK-POLISH-v1) | 3,884 | 539 | 2,963 | 348 | 34 |

Largest flags (Israeli / Sephardi / Ashkenazi): final stress assumed 2,732 / 2,263 / -; Ashkenazi penultimate stress by default - / - / 2,749; mobile shva 1,282 / 1,093 / 1,093; stress from a short unreviewed list 478 / 450 / 437; Aramaic text 197 each; Sephardi pharyngeal merged - / 1,085 / -; shva-after-long-vowel heuristic 178 / 165 / 165; possible segolate (likely first-syllable stress read as final) 176 / 145 / -. The full per-flag and per-group counts are in each file's `summary`.

`high` does not mean correct. It means no known heuristic fired. In particular, almost every multi-syllable word carries a stress flag, because stress is a default rule applied to words that no list covers.

## Decisions for a human

None of these is settled. Each choice below is the one the code makes today so that output exists; it should be reviewed by someone with authority over the target community's reading.

**D1. Ashkenazi model.** Chosen: `ASHK-POLISH-v1`, the same model `build_variants.mjs` already uses: kamatz gadol o, tzere ei, cholam oi, tav without dagesh s, resh r, chet and khaf one sound, penultimate stress by default, unstressed final kamatz+he or kamatz+alef reduced to e. Alternatives:
- Lithuanian cholam (ei instead of oi): `opts.ashkModel:'lithuanian'`, which changes the cholam only (the one Lithuanian value stored in the repo; no other Lithuanian feature is generated).
- Southern German cholam (o) or northern German (ow), kamatz as aw or u: listed in `data/pronunciation/niqqud.json`, not generated.
- Tav without dagesh as t, not s: would be the Sephardi/Israeli sound; not generated. The stored data (`consonants.json`) marks the s as the most audible switch.
- Final stress (the Torah-reading register) instead of penultimate: not generated.
- Whether the final-vowel reduction should apply at all: `prayerwords.json` writes אַתָּה as "AH-toh" while the rules give `á-te`; the two stored sources disagree (recorded in the tests). Also `prayerwords.json` writes שָׁלוֹם as "SHO-lom" while the rules give `shó-loim`.

**D2. Sephardi model.** Chosen: `SEPH-TEXTBOOK-v1`, the idealised reading in `data/pronunciation` (five vowels, final stress by default, trilled r). `data/traditions` states that it is not a model of any community. Alternatives: Spanish-Portuguese (bet between b and v, ayin as ng), Moroccan, Syrian, Iraqi, Yemenite, Greek or Balkan readings (tav as th or d, gimel as a voiced throat sound, tsadi as s), all described in the repo as reference only and not generated.
Pharyngeal chet and ayin cannot be written with Latin letters. They are **merged** with the Israeli sounds and every affected item is flagged `pharyngeal-merged` (1,085 Sephardi items). **Consequence, measured: the Sephardi and Israeli sound words are identical for all 3,884 shared items.** With the stored rules, the two traditions differ only in pharyngeals and the glottal stop, which this alphabet cannot show. A Sephardi voice made from these files would sound like the Israeli one unless a human chooses an approximation for the pharyngeals (candidates, none tried: a doubled or extra h, a different language slot for Sephardi, or leaving Sephardi to human recordings).

**D3. Israeli model.** Chosen: `ISR-STD-v1`, the careful reading used by the rule engine: vocal shva read as e (colloquial speech drops many, e.g. zman; 31 Israeli items are flagged `words-ipa-colloquial-shva-drop` where the repo's own IPA shows the drop), chet = khaf, ayin and alef silent, no doubling, uvular resh written r. Alternatives: colloquial shva dropping, glottal stop at alef, final-versus-penultimate stress as Israeli speech drifts toward the penultimate (`data/traditions/sounds.json`).

**D4. Language slot and form.** Chosen: `es`, because Spanish `j` gives the back-of-throat sound that chet, khaf and the Ashkenazi x need and its five vowels are pure; its known weaknesses are v read as b, silent h, and z. Alternative: `it` (v is v; no back-of-throat sound, no plain sh). Other slots, hyphens versus flat words, and accents versus none are untested alternatives. The slot is a parameter paired with the output, not a claim of quality.

**D5. Tradition labels are too broad to certify a voice model.** "Sephardi" and "Ashkenazi" each cover many communities with different sounds. A synthetic voice made from these files should not be labelled as "the" Sephardi or Ashkenazi reading. For every voice model that is ever built, record provenance and accepted variants next to it, at least: the model name from this file's header (`ASHK-POLISH-v1` etc.) and the build date; the language slot used; the reference speaker's community, region and training, if a cloned reference voice is used; which variants the reviewer accepted (for example cholam oi but not ei; kamatz o; final stress or penultimate; shva dropped or kept) and which were rejected; the reviewer's name and role; the date; and the items sampled. No such record exists today, because no model has been run and no reviewer has heard anything.

**D6. Policy and labelling.** Whether Sephardi and Ashkenazi synthetic clips may be offered to learners at all, and under which wording and review status. `docs/tts/README.md` and the app labels set the current wording; this lane did not change either. The licence and disclosure questions listed in `docs/tts/README.md` still apply.

## What it cannot do

- **It is not tested.** Nobody has run any item through a TTS or listened to it. The intended-reading column above could be wrong for any given voice.
- **Latin letters cannot write** pharyngeals, uvular r, doubling, the exact quality of Ashkenazi open o, or length. See D2: Sephardi equals Israeli here.
- **Stress is a default** for almost every word: final for Israeli and Sephardi, penultimate for Ashkenazi. Only short, unreviewed lists give exceptions. Segolate-type words are probably mis-stressed unless listed (`data/pronunciation/stress.json` notes first-syllable stress for them), and so are some letter names (אָלֶף comes out `a-léf`; not checked against a source); 176 Israeli items are flagged `possible-segolate` for this reason.
- **Shva** is classified by the existing rules, including one heuristic (`shva-heuristic-L3`, 178 Israeli items). Mobile shva is written e (careful reading), where colloquial Israeli often drops it.
- **Kamatz katan** is recognised only from U+05C7, a four-word list, one extra form and a kamatz before chataf-kamatz. Other kamatz katan words are read as gadol (and as o in Ashkenazi).
- **Aramaic** (Kaddish, Brich Shmei, 197 items) gets the Hebrew rules applied mechanically and is flagged `aramaic` (low). Other Aramaic or non-Hebrew words are not detected.
- **No niqqud, no sound.** Unpointed words are refused (`unvoiced`). Partly pointed words (a letter missing its vowel) are read as the syllabifier sees them and may be wrong without a flag.
- **Running text** is split on spaces and maqaf. Each word gets its own stress accent (only the last part of a maqaf chain does), which a voice may read as over-stressed prayer lines. Phrase-level prosody is not modelled.
- **Tests prove consistency, not correctness.** The 100+ regression rows check the respelling layer against IPA rows stored in `data/pronunciation/runtime/` and `VARIANTS.md`; those rows came from the same rule engine. The independent source, `prayerwords.json`, is hand-written and unreviewed, and it agrees with the rules on stress and syllable count for all 10 words in both traditions, and disagrees on the vowel in two Ashkenazi words (אַתָּה, שָׁלוֹם; recorded in the tests).

Nothing here replaces recordings by human readers (`docs/voices/`), or the blind listening protocol in `docs/voices/tts-evaluation-protocol.md`.
