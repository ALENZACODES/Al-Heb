# Letter memory chain: how it works, why, and where it is weak

Status (updated 2026-11-04 about 21:15): design rationale, not tested on learners. Nothing here has been checked by a native speaker or teacher, and no learner has used it. The Hebrew in the data is copied from the vocabulary file, which itself is unreviewed.

Files:
- `tools/letters/memory-chain.source.json` is the only hand-written input (no Hebrew in it).
- `tools/letters/build_memory_chain.mjs` verifies the source against the data and writes `data/letters/memory-chain.json`.
- `data/letters/memory-chain.json` is generated. Do not edit it by hand.
- Tests: `tests/letters.memorychain.test.js` (and the related `letters.memory*.test.js`).
- Reviewer rows: `tools/review/lib/extract.mjs` (function `memoryChain`) and `tools/review/questions.mjs` (`CHAIN_GENERAL_QUESTIONS`).

## How it works

Every one of the 27 letter forms (22 letters plus 5 final forms) gets the same three beats, always in this order.

1. SEE. The letter shape becomes one picture. The picture idea comes from `data/letters/mnemonics.json`; the drawing is `assets/letters/morph/<id>.svg`. One line of text (`tip`) names the look-alike letter and the feature that separates them.
2. SAY. One English hook word whose first sound (for tsadi, a middle sound; for resh, only the spelling) is the letter's sound. A one-line rule goes with it ("D like Dive").
3. SEAL. One Hebrew noun, with pointing, transliteration, gloss and frequency rank copied from `data/vocab/words.json`, that the same picture can show. A story of at most 14 words ties the three beats together and must contain the hook, the gloss and the transliteration (for example: a grumpy camel stomps off, G, gamal is a camel). The story is stored once for the Israeli setting (`story`) and the builder writes `storyByTradition` for each of the three settings by replacing the word's transliteration with the rule respelling (for example aba and abo, bayit and bayis).

The five final forms cannot start a word, so their chain uses a word that ENDS with the letter and reuses the base letter's hook sound.

What the builder checks (it refuses to write the file if any check fails):
- The ids in the source equal the ids in `letters.json`, in order, and equal the ids in `mnemonics.json`.
- The word exists, is not hidden, is a noun record, has frequency rank 1 to 1500, and its first letter (last letter for finals) is this letter.
- The gloss is found in the record's `en` (or `alt`) text.
- Where the sound claim depends on a dagesh or shin dot, the word actually carries that mark. A final kaf word must not carry a dagesh.
- Per tradition (israeli, sephardi, ashkenazi) the claim is checked against the English line in `data/pronunciation/consonants.json`. `same` must match the hook's sound pattern; `differs` must not match and needs a note; `cue-only` is used where the hook is a spelling cue (resh). The `perTradition` text is built from that file, not typed.
- The story is at most 14 words and contains the hook, gloss and transliteration; the alt text is at most 100 characters; the tip is one line.
- `--check` also fails if the file on disk differs from what the builder produces.

What the builder cannot check: whether the picture works, whether the hook is natural to a learner, whether the Hebrew word is the best choice, or whether any of it helps anyone remember.

## What changed on 2026-11-04 (read from the data and code at about 21:10)

- Hooks: loch replaced Chanukah (chet) and Bach (final kaf); hut (he), cup (kaf), mailbox (mem), swim ring (samekh), shortcake (shin), feather (final pe) and nuts (final tsadi) are new. The decisions and the reasons, letter by letter, are in `docs/letters/RECONCILE.md`; the picture for each was redrawn or its text changed to match.
- Stories follow the setting (above). Checked by reading the data for a few letters; not by an Ashkenazi reader.
- Card position (`src/letters/trace.view.js`): for a letter the learner has not traced yet, the compact card sits above the tracing box so the picture, sound and word are on the first screen; once the letter is traced it moves below the toggles. Trade-off: the box starts lower. In a scripted run at 375x667 the card is 90 px tall and the stage starts at y 415 to 533, so 160 to 252 px of its 326 px is visible without scrolling (numbers and caveats in `docs/STATUS.md`). No one has tested tracing with the box lower.
- Pictures offline: 9 of the 28 are in the install list (shin, bet, lamed, vav, mem, he, tav, final mem, alef: the letters of the first-day path, lessons r01 to r03 and the first card shown); 19, including sin, load on demand (`tools/build-precache.mjs`, `FIRST_DAY_LETTERS`). The chain data and code stay installed, so the card works from text alone. The committed `precache-manifest.js` has not been regenerated.
- Tests, from a run at about 21:05: 18 non-browser `tests/letters.*.test.js` files, 223 tests, 222 pass, 0 fail, 1 skipped; the chain and picture build checks pass.

## Why (design rationale, not tested on learners)

These are design choices, not findings. No claim is made that the chain improves recall, and no study is cited.

- One fixed shape for every letter, so a learner meets the same three steps each time and the lesson pages can share one layout.
- The hook is English and the sound line is short, so the sound is attached to a word the learner already knows.
- The Hebrew word is a common noun that the same picture can show, so the letter, the sound and a real word sit on one image. The rank cap (1500) keeps it to words in the app's own early vocabulary.
- Sound claims are generated from the pronunciation data and checked per tradition, so the chain cannot state a sound the project's own data does not support.

## How to add or change a letter

1. Edit only `tools/letters/memory-chain.source.json`. Each letter entry needs: `id`, `soundClass` (a key of `soundChecks`), `hook`, `hookPosition`, `hookHas`, optional `needsMark` (`dagesh` or `shin-dot`), `line`, `trad` (a status for each of the three traditions), `diff` notes where a status is `same-with-dot` or `differs`, `picture` (`idea`, `alt`), `vocabId`, `gloss` (and `glossFrom: "alt"` if the gloss sits in the alternate senses), `position`, `story`, `tip`, `risk`.
2. Choose the word by `vocabId` from `words.json`. Never type Hebrew into the source; the builder copies it.
3. Build and verify: `node tools/letters/build_memory_chain.mjs`, then `node tools/letters/build_memory_chain.mjs --check`.
4. If the picture concept changed, make sure `data/letters/mnemonics.json` and the SVG match, and list the change in `risk`.
5. Run the letters tests (`node --test tests/letters.memorychain.test.js`), then rebuild the review packets so the reviewer rows pick up the change: `node tools/review/build_packet.mjs` and `node tools/review/build-packs.mjs` (full runs, not `--only`).
6. If the change answers or creates a reviewer question, update `CHAIN_GENERAL_QUESTIONS` in `tools/review/questions.mjs`.

## Known weak spots (stated honestly)

- Tsadi: the hook is the ts in the MIDDLE of "pizza" (and the end of "cats" in the rule line). No common English word starts with ts, so SAY does not follow the first-sound pattern the other letters use. The chain data records this as `hookPosition: medial`.
- Resh: "round" is a spelling cue only. The English r is not the Hebrew sound in any of the three traditions (back-of-throat for Israeli, rolled front for Sephardi, regional for Ashkenazi). The chain labels it `cue-only`, but a learner may still say an English r.
- Final forms: their words end in the letter, and the hook is borrowed from the base letter. The pattern differs from the other 22, and whether a beginner finds it clear is an open question.
- Word rank: of the 27 words, 9 have rank above 500 and 15 have rank above 300 (computed from `data/letters/memory-chain.json`; 3 are above 1000: chet 1139, tsadi 1302, nun 1318). Some are not words a beginner is likely to meet early. The rank cap of 1500 was chosen so that every letter could have a pictureable noun; it is not evidence that the words are easy.
- Cats: now only nun is a cat (the chet, tsadi, final nun and final tsadi pictures were redrawn without one, per `docs/review/MORPH-RECOGNITION-2.md`; the candle is no longer drawn with the cat). The earlier cat-interference worry is mostly closed; not tested on learners.
- Chet and final kaf share the hook loch. It needs a native check: a beginner may not know the Scottish word, and the Sephardi line for chet differs (pharyngeal sound) per `consonants.json`. The final kaf line still says "kh as in loch (k with dagesh, ...)", which names a dagesh inside a line about the kh sound and reads confusingly.
- Nuts (final tsadi) begins with the n that nap and nail teach for nun and final nun; the rule line points to the ts at the end of the word. My reading is that this could blur the two; not tested.
- Final pe: the chain says f in all three settings, which matches `consonants.json`, but the generated line reads "Same sound: f (p with dagesh)", which looks like the wrong half of the pe rule. Not traced to its cause.
- Weak pictures: the 20:32 blind read rated alef, he, lamed, mem-final, pe-final and tav weak (`docs/review/MORPH-RECOGNITION-2.md`); those files and four others were changed afterwards and not re-read.
- Tracing box: with the card above it the box starts lower on a phone (see above).
- Reviewer questions are stale: `tools/review/questions.mjs` (the `chet`, `chain-hooks` and `chain-hook-collisions` rows) still names the old hooks Chanukah, Bach and kernel, and the pack files in `docs/review/packs/` carry a 19:39 time, before the 20:12 redraw and hook changes (I did not open them to see which hooks they show). Edit the questions and rebuild the packs (steps above) before anyone reviews the chain. I did not change the tool.
- Gimel: the grumpy camel may read as a regional stereotype (already a reviewer question).
- The `tzipor` / `ts` split: the word is spelled tz in the vocabulary data, ts in the letter sound line.
- Hook words such as "loch" (chet, final kaf) and "shortcake" (shin) may not be simple for every reader.
- All Hebrew comes from `words.json` and is unreviewed; the build sets `needsNativeReview: true`.

## Review questions

These are in the reviewer packs as report-only rows (area `mnemonics`; ids `chain:<letter>` per letter and `chain-*` general questions). They are questions for a person, not findings.

- chain-words: are the words chosen for picturability (telephone, line, hook, baby, stone, nose, milk) natural beginner words, or too rare, abstract or odd?
- chain-finals: is "word ends with the letter" clear for a beginner, or should finals be taught only through the base letter?
- chain-hooks: which hooks would you change (pizza for tsadi, round for resh, loch for chet and final kaf, nuts for final tsadi, the vowel-only hooks for alef and ayin)?
- chain-traditions: is each per-tradition line fair for the tradition you teach?
- chain-pictures: do the three cats interfere, is the candle and cat pairing acceptable for children, and does the camel read as a stereotype?
- Per letter (`chain:<id>` rows): the pointing and meaning of the word, whether the picture suits the letter shape and is fine for adults and children, and whether the story or sound line says anything untrue in any tradition.
