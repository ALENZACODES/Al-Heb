# Letter Audit, 13 November 2026

All 27 letter forms were checked for sound, name, picture and explanation.

How the sound was checked: a Hebrew sound-writing model (it writes the sounds it hears, not words) listened to each clip, and the result was compared with what the clip should say. It is a machine listener. A clip it flags is very likely wrong. A clip it passes still needs a person's ear before launch.

How the pictures were checked: every letter picture was opened and compared with the real letter shape and with the memory story printed beside it.

## What Was Wrong And Is Now Fixed

### 1. Home page word builder: letter names

The builder played its own set of letter-name clips (`audio/builder/symbol-*.mp3`). These had been read without vowel points and most were wrong.

| Letter | Ari said | Noa said | Should be |
|---|---|---|---|
| Aleph | elef | elaf | alef |
| Gimel | gimEL | gimEL | GI-mel |
| Dalet | dalAT | not a word | DA-let |
| Lamed | lemED | lemED | LA-med |
| Samekh | semach | smech | SA-mekh |
| Ayin | a'im | ayin (fine) | ayin |
| Pe | te | te | pe |
| Resh | not a word | not a word | resh |
| Tav | ti | tu | tav |
| Tet | tet (fine) | tit | tet |
| Final Pe | pe sofit (fine) | besofit | pe sofit |

Fix: all 54 builder letter-name clips (27 letters, Ari and Noa) now use the checked letter-name recordings from `audio/{m,f}/israeli/letter/`. They are marked with a `source` in `tools/audio/builder-manifest.json`, and `render-builder.mjs` will not overwrite them.

Note: the letter names are now in the WaveNet voices. The builder words are still in the Chirp voices, so the voice changes slightly between a letter name and a word.

### 2. Pictures that did not match the story

The card text teaches one picture (Dalet is a diving board) while the picture shown was an older idea (a door frame). This was true for 20 letters. The matching pictures already existed in `assets/img/` but had never been added to the shown set.

Fix:
- The 25 matching pictures are now in `assets/img/gen/` as `L##_<letter>_quirky`, approved, with real alt text taken from the memory chain.
- Gimel and Dalet were mirrored (the camel's foot and the diving board pointed the wrong way for the letter). The shown copies are flipped. The originals are untouched.
- The older pictures for these 20 letters (`mnemonic`, `ari`, `noa`, `silhouette`) are set to `hold` in `data/images/approvals.json`: Aleph, Bet, Gimel, Dalet, He, Chet, Tet, Kaf, Lamed, Mem, Nun, Samekh, Pe, Tsadi, Qof, Resh, Final Kaf, Final Mem, Final Nun, Final Pe. No file was deleted.
- `src/img/resolve.js`: when a letter's old memory picture is on hold, the matching picture is used in its place.

### 3. Pictures with the wrong letter drawn

Set to `hold`:
- Dalet "meet" picture: the big letter is drawn like a T, with the leg in the middle.
- Ayin "meet" picture: the big letter drawn is Tet.
- Pe "meet" picture: the letter on the easel is Kaf.
- Final Nun "meet" picture: the letter drawn is Vav. Final Nun must drop below the line.
- He word pictures 3: a balloon. Balloon is "balon", which starts with Bet.

### 4. Pe was spelled as Fe

The letter name for Pe and Final Pe was written פֵא (reads "fe"). Now פֵּא in `data/letters/letters.json`, `data/videos/letters.json`, `src/letters/roster.js` and `tools/letters/build_letters.py`.

## Still Wrong: Needs A New Recording

These cannot be fixed without the Google voice key.

| Clip | Heard | Should be | How |
|---|---|---|---|
| Vet name (`letter/vet.mp3`, both voices) | beit | vet | `python tools/audio/asr-check/letter_takes.py vet` |
| Khaf name (`letter/khaf.mp3`, both voices) | kaf | khaf | `python tools/audio/asr-check/letter_takes.py khaf` |
| Vav sound and Vet sound (`letter/vav-sound.mp3`, `vet-sound.mp3`, and `syllable/vav-a.mp3`) | "wa" or "wow" | va | new take needed |
| Dagesh sound (`vowel/dagesh.mp3`) | bu | b | new take needed |
| Builder vowel and dot names, 15 marks, both voices | sheva = "sheso", qamats = "kemets", patah = "patoch", tsere = "tsei rei", holam = "cholem", dagesh = "degesh" | the pointed names | `node tools/audio/render-builder.mjs --execute` (30 clips, under one cent). They are now set to render in the WaveNet voices. Listen after rendering. |

Listen by ear (the machine was unsure): Noa's Resh name, Noa's Gimel name (stress), Ari's Shin name, Ari's Resh sound, Noa's Pe, Samekh, Fe and Yod sounds.

The Dalet letter name and sound in the letter lessons were heard correctly (DA-let, da) in both voices.

## Still Wrong: Needs A Decision Or New Art

- Final Nun old memory picture is a nail with a crossbar. It reads as a cross. It is on hold with the others; it should not come back.
- Gimel old picture is a giraffe. Giraffe starts with a J sound in English and in Hebrew. On hold.
- Shin word picture 3 is Shabbat candles labelled "nerot shabbat". The first word starts with Nun. Still shown.
- Seven "meet" pictures (Tsadi, Qof, Resh, Shin, Tav, Final Pe, Final Tsadi) are in a different style with child characters, not Ari and Noa. Still shown.
- Dalet, Ayin, Pe and Final Nun now have no "meet" picture. New ones are needed, with the correct letter.
- The spoken letter lectures (`audio/*/israeli/letter-lecture/*-explain-*`) are not used by the app. They should stay unused: the English one is read by a Hebrew voice and is hard to follow, the Hebrew one has English words inside it, and they teach a third set of pictures (Dalet as a table corner).
- Three memory-chain stories do not link the picture to the word: Lamed (lamp and bread), Nun (cat and candle), Mem (mailbox and water). The Hebrew is correct; the stories are weak.

## Checked And Found Correct

- Hebrew pointing, phonetic spelling and meaning of all 27 anchor words in `data/letters/mnemonics.json` and `data/letters/memory-chain.json`.
- Letter names, order and number values in `data/letters/letters.json` (apart from Pe).
- Israeli letter-name clips for both voices, apart from the ones listed above.
- Israeli vowel sound clips for both voices, apart from Dagesh.

## Not Checked In This Pass

- The 162 builder words and the lesson vocabulary, word by word. The earlier word check in `tools/audio/asr-check/` covers spelling-level errors only.
- Sephardi and Ashkenazi letter clips, apart from Dalet. Their bare letter-sound clips for Dalet were heard as "di" and "bi".
- Cursive letter pictures and stroke shapes.
- The letter videos.
