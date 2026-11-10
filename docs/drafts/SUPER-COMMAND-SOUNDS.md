# SUPER COMMAND: every word and phrase, in all three traditions, with the sounds explained

This is the master prompt for the outside drafting assistant. It does two jobs for each item Aleph needs a voice for:

1. **Say it**: give a Latin-letter "sound word" for the Modern Israeli, Sephardi and Ashkenazi reading (the same trick the build uses, so the assistant's answer can be compared line by line with the build's).
2. **Explain it**: explain every sound in plain English (mouth, tongue, throat, an English comparison, the mistake to avoid), per tradition.

Everything it returns is a DRAFT for a native reader, a rabbi or cantor, and a teacher. It is a second opinion for the build's own engine, not a replacement for a human ear.

The inputs are ready: `docs/drafts/batches/batch-01-letter.csv` to `batch-50-word.csv` (4,685 rows in total, 100 rows per file, columns `id,kind,group,he`). Rebuild them any time with `node tools/drafts/export_batches.mjs` (`--check` tells you if they are stale). Output goes into `docs/drafts/inbox/lane2/` (text and data) with file names `lane2-<item#>-<short-name>.csv`; item numbers are given below.

---

## PART 1. Paste this at the top of every chat (the SUPER COMMAND)

```
You are the Aleph pronunciation drafter. Aleph is a free Hebrew-learning app and book for adults (intro to intermediate). Learners want to read prayers and Torah aloud with a congregation and to get around in Israel. They are nervous beginners.

YOUR JOB. For each row I paste (columns: id, kind, group, he; "he" is fully pointed Hebrew), return one row with a sound word for each of three traditions, plus notes. Then, when I ask, explain the sounds.

THE THREE TRADITIONS (use exactly these models; do not blend them):
1. ISRAELI (modern standard, careful reading). Kamatz and patach both sound like "a"; tzere and segol both like "e"; chirik "i"; cholam and kubutz/shuruk "o" / "u". Tav and tet both "t"; kaf-with-dot and qof both "k"; vav and vet "v"; chet and khaf the same scratchy back-of-throat "kh"; alef and ayin are silent (a tiny catch or nothing); resh is produced at the back of the throat in everyday speech; samekh and sin both "s"; tsadi "ts". A vocal shva is written "e" in this careful reading (everyday speech often drops it). Stress is on the last syllable unless the word is a known exception.
2. SEPHARDI (the app's "textbook Sephardi" reading, not any one community): five pure vowels, kamatz and patach both "a", tzere and segol both "e"; resh rolled; bet with a dot "b", without a dot "v"; tav "t"; stress on the last syllable by default. Chet and ayin are pharyngeal (made deep in the throat) in many Sephardi communities: you cannot show this in Latin letters, so write them as in the Israeli reading and put the flag "pharyngeal" on the row.
3. ASHKENAZI (the app's Polish-style model): kamatz gadol "o" (as in "or"), patach "a", tzere "ei", segol "e", chirik "i", cholam "oi", kubutz/shuruk "u"; tav WITHOUT a dot is "s" (Shabbos), with a dot "t"; chet and khaf are the same scratchy "kh" (write "x" is NOT allowed; write "kh"); resh rolled or tapped; stress on the NEXT-TO-LAST syllable by default, final only for words I tell you are exceptions; unstressed final vowels are weak. If you know the word is a different community's reading (Lithuanian, German), say so in the notes instead of switching models.

THE SOUND-WORD ALPHABET (write exactly this so my tools can compare):
- Lower case. Syllables joined by hyphens. Mark the stressed vowel with an acute accent (á é í ó ú). Words separated by a space; keep . , ? ! from the source.
- Vowels: a e i o u only. Pure sounds. No "ee", "oo", "ay", "ow" spellings, except the Ashkenazi glides: ei and oi.
- Consonants: b d f g h k l m n p r s t v y z; sh for shin; ts for tsadi; kh for chet / khaf / Ashkenazi chet; g is always hard (write "gu" before e or i only if I ask for the Spanish setting).
- Alef and ayin are not written; the vowel after them stays its own syllable (ha-o-lám).
- No doubled letters (the dagesh chazak is not written). No apostrophes.

HARD RULES.
- Never invent Hebrew. If a word has no vowel marks (niqqud), do NOT guess: set soundword to empty and doubt to "unpointed".
- If you are not certain of a vowel, stress, shva (vocal or silent), or a kamatz katan, still give your best sound word but write the reason in "doubt" and add the tag ?? CHECK. Do not hide doubt.
- Divine names and their substitutes: do NOT respell them yourself. Copy the source Hebrew in "he", leave soundword empty, set doubt "divine name: rabbi to decide", and add ?? CHECK. Never put a divine name in a new example.
- Aramaic (for example Kaddish): apply the same rules, but set doubt to "aramaic" and add ?? CHECK.
- Do not claim any native speaker, rabbi, cantor or teacher reviewed anything. Everything is a draft.
- No names of AI tools, companies or authors in any output or file name. No copied book or song text.
- Output plain CSV with a header row, no commentary inside the data, one deliverable per reply. At the end of every reply print: DONE <item#>, then the next item number.
```

---

## PART 2. The work, in order (item numbers continue after 210)

Paste Part 1, then paste the batch file's contents under the command for that item. Save each reply as `lane2-<item#>-<name>.csv`.

### A. Say it: sound words for every item

For every batch file `batch-NN-<kind>.csv`, paste the file and say:

```
Item 211-<NN>. For each row, return CSV: id,kind,he,israeli,sephardi,ashkenazi,stress_israeli,stress_sephardi,stress_ashkenazi,doubt
- "israeli", "sephardi", "ashkenazi" are the three sound words in the alphabet above.
- "stress_*" is the number of the stressed syllable counting from the start of the word (1 = first), or "mixed" for a line with several words.
- "doubt" is empty only if you are sure. Otherwise explain in under 15 words and add ?? CHECK.
Do all 100 rows. If you cannot finish, stop and print how many you did; never pad.
```

Order to run them (the order of the files is already the priority order):

| Files | Content | Rows | Why first |
|---|---|---|---|
| batch-01 | the 27 letter names (22 letters + 5 final forms) plus variants and the letter sounds | 57 | everything else rests on these |
| batch-02 | vowel signs (niqqud) | 15 | the second thing a learner meets |
| batch-03 to 04 | syllables | 110 | the bridge to reading |
| batch-05 to 07 | prayer lines (Shema, Modeh Ani, blessing formula, Priestly Blessing and the rest) | 290 | the main reason learners come |
| batch-08 | prayer words | 70 | word by word practice |
| batch-09 to 50 | words: anchor words, lesson words, phrasebook words and the rest of the vocabulary | 4,143 | by manifest order |

(The counts are from `data/tts/soundwords.israeli.json`: letter 57, vowel 15, syllable 110, line 290, prayer 70, word 4,143. The three traditions share most ids: Israeli has 4,685 items, Sephardi and Ashkenazi 3,884 each.)

Do the first eight files (the letters, vowels, syllables, prayer lines and prayer words: 542 rows) completely, with a native reader's eyes on them, before you spend time on the 4,143 words.

### B. Explain it: the sounds, super detailed

Run these after A-batch-01 and A-batch-02, because they use the letter and vowel lists.

**Item 212. The consonants, one row per letter per tradition (27 forms x 3 = 81 rows).** Say:

```
Item 212. For each of the 22 letters and 5 final forms (alef, bet, vet, gimel, dalet, he, vav, zayin, chet, tet, yod, kaf, khaf, final kaf, lamed, mem, final mem, nun, final nun, samekh, ayin, pe, fe, final pe, tsadi, final tsadi, qof, resh, shin, sin, tav) and for each tradition (israeli, sephardi, ashkenazi), return CSV:
letter,tradition,sound_word_letter,english_comparison,mouth_throat_tongue,common_mistake,tiny_practice,same_as_other_traditions,doubt
- sound_word_letter: how this letter is written in the alphabet above.
- english_comparison: one real English word that has the sound, or "none in English" and say what is closest. Do not use a comparison you are not sure of.
- mouth_throat_tongue: one or two plain sentences (lips, tongue tip or back, throat, voiced or not).
- common_mistake: what an English speaker usually does wrong, in one sentence.
- tiny_practice: one 10-second exercise using a word or syllable, written in the sound-word alphabet.
- same_as_other_traditions: yes or "differs: <how>".
- doubt: empty only if sure; else reason and ?? CHECK.
Keep each cell under 30 words. State which tradition each row is for.
```

**Item 213. The vowels (niqqud), 15 signs x 3 traditions.** Same columns, with `vowel` instead of `letter`; add a column `looks_like` describing where the dots or dashes sit under or over a block letter, in words, so a screen-reader user can use it.

**Item 214. The difference sheet.** Say: "Using only what you wrote in items 212 and 213, list every sound that differs between the three traditions, grouped (vowels, tav, chet/khaf, ayin/alef, resh, stress), with 3 example words from the batches for each group, and one sentence a learner can remember. CSV: group,sound,israeli,sephardi,ashkenazi,example_ids,memory_sentence,doubt."

**Item 215. Stress rules per tradition.** Say: "For each tradition give the default stress rule, ten real exceptions taken only from the batch files I pasted (give the id), and how a learner can tell by looking. CSV: tradition,rule,exception_ids,how_to_tell,doubt."

**Item 216. Shva.** Say: "Explain vocal versus silent shva in each tradition in under 120 words, with 8 example ids from the batches, and the 3 cases you are least sure about marked ?? CHECK."

**Item 217. Say-it lines for the app.** Say: "For each letter and tradition write one sentence of at most 15 words in the form '<Name> says <SOUND>, like <comparison>.' Return CSV: letter,tradition,sentence,doubt." (The app already has such lines; the build will compare yours with its own.)

**Item 218. Listening guide for a native reader.** Say: "Write a one-page sheet a native listener can use with the 20 clips of one tradition: what to listen for, how to mark it, and the five mistakes most likely in that tradition's synthetic voice. One sheet per tradition."

### C. Cross-check (afterwards, with the build's own files)

The build has its own sound words in `data/tts/soundwords.israeli.json`, `.sephardi.json`, `.ashkenazi.json`. After A is saved, paste the assistant's CSV and the build's JSON for the same ids into a new chat and say:

```
Item 219-<NN>. Compare the two sets row by row. Return CSV: id,tradition,assistant,build,differs_how(vowel|stress|shva|consonant|other),which_is_likelier_right,doubt. Group the rows by difference type and finish with a table: difference type, count, one example id. Do not assume either side is right.
```

A human then decides each difference type once. That is what fixes thousands of items at a time.

---

## PART 3. What the assistant must never be trusted with

- Final decisions on any Hebrew vowel, stress or shva. Only a native reader decides.
- Sephardi pharyngeal chet and ayin: they cannot be written in Latin letters; flag them, never "fix" them.
- Liturgy: it must not rewrite or "improve" prayer text, and must not respell divine names.
- Claims of review or approval: none exist.

## Facts this document rests on (from the repo)

- The sound-word alphabet and the three models are the ones in `docs/tts/SOUNDWORDS.md` (Israeli ISR-STD-v1, Sephardi SEPH-TEXTBOOK-v1, Ashkenazi ASHK-POLISH-v1).
- In the build's own output, the Sephardi and Israeli sound words are identical for all 3,884 shared items, because the stored rules differ only in the pharyngeals. That is why this command makes the assistant flag them and why item 219 compares against the build.
- The build's stored Ashkenazi forms disagree with its rules on a few vowels (for example the final -ah of אַתָּה and the o in שָׁלוֹם); a human has to settle that.
- Nothing in the batches has been spoken by a TTS or listened to.
