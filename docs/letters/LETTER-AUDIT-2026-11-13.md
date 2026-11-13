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

## Second Pass, Same Day: Re-Recorded With The Google Key

Takes were recorded on the owner's computer with `RUN-LETTER-RETAKES.cmd` (`tools/audio/render_letter_takes.py`, three runs). Each take was listened to, the best was used, and the clip was listened to again in its final place. Takes used are kept in `audio-takes/letter-audit/`.

| Clip | Was | Now |
|---|---|---|
| Vet name, both voices | beit | vet |
| Khaf name, both voices | kaf | khaf |
| Resh name, Noa | re-ish | resh |
| Shin name, Ari | shim | shin |
| Vav sound, Vet sound, and the va syllable, both voices | wa / wow | va (cut from a "vav va" take) |
| Dagesh sound, both voices | bu | ba (the Bet sound clip) |
| Builder vowel and dot names, 15 marks, both voices | mostly misread | read from the points, WaveNet voices |
| Sephardi letter names and sounds, 56 clips | English letter names or other words (H sound as "aitch", Qof spelled out "kay oh ef", Yod as "yad", Aleph as "elef") | copies of the Israeli clip of the same voice, under the existing same-reading rule |

Listen by ear before launch:
- Noa's sheva says "sheva"; Ari's says "shva". Both are used; pick one.
- Noa's "nekudat shin" and "nekudat sin" were heard right at full quality and unclear after shrinking to builder size.
- Noa's Gimel name is still heard with the stress on the end in every take.

## A Correction To The First Table

The listener is reliable on the WaveNet voices (letter lessons). On the Chirp voices (word builder) it often hears "a" as "e" (aba as "abe", yam as "yem"). So in the first table, "elef" for Aleph and "lemED" for Lamed may be the listener's error, not the clip's. The builder clips that were wrong at the level of consonants or whole words stand: Dalet (Noa), Resh, Pe, Tav, sheva, tsere. All builder letter names now use the WaveNet clips either way.

## Still Wrong

### Ashkenazi letter clips (third pass: mostly fixed)

Fixed:
- Letter sounds, both voices: every clip that said an English letter name ("aitch", "dee", "tee", "vee", "kay") or the whole Hebrew name now plays the Israeli sound clip. The Tav sound plays the s sound.
- Names re-recorded from pointed Ashkenazi spellings: Fe ("fei"), Ari's Pe ("pei"), Lamed ("lomed"), Ari's Resh.
- Names now using the Israeli clip: Mem, Yod, Khaf, Noa's Resh, Ari's Qof, Gimel and Shin.

Not fixed:
- Vet still says "beis". Every take of "veis" came out "weis".
- Final Mem still says "me-im sofis" (Ari) or "meyim sof dis" (Noa). No take said it cleanly.
- Mem says "mem", not "meim", and Resh says "resh", not "reish": no take said the "ei" forms as one syllable.

### Letter videos

Rebuilt in the third pass: Pe and Final Pe (both voices, the name now shows its dot), Noa's Resh, Ari's Shin, and Vav in both voices (new V sound).

Still open:
- The Aleph video cuts its sound line off mid-word ("like the pause in 'uh").
- Dalet's leg sits further left than most teaching fonts draw it (it follows the DejaVu outline), which makes it look a little like a T. Letter shapes in all 27 videos are otherwise correct.

## Fourth Pass: The Rest

Done without the owner's computer (it was offline, so no new recordings were possible):
- Builder words: the ten flagged words (delet, peri, kir, neyar, dov, esh, katan, ragu'a, me'ushar, perach) now use the lesson recordings of the same words in both voices. Each was heard back correctly before it was copied.
- Ashkenazi Final Mem, both voices: rebuilt as "mem sofis" by joining the checked "mem" to a "sofis" cut from the Final Kaf clip. Heard back as "mem sofis".
- "Meet" pictures for Dalet, Ayin, Pe and Final Nun: new letter cards drawn from the app's own font, so the letter is right. They are plain cards, not illustrated scenes with Ari and Noa. The old files are kept in `assets/img/held/`.
- Video captions: the caption no longer runs under the mascot badge. Rebuilt in both voices: Aleph, Kaf, Ayin, Shin and the five final letters.

Fifth pass, with the Google key stored as a repository secret (workflow `letter-takes`, takes on branch `john/letter-takes`):
- Ashkenazi Vet, both voices: now says "veis". Cut from a take that said "vav-eis".

Left as they are:
- Ashkenazi Mem and Resh say "mem" and "resh". The app's Ashkenazi spelling is "meim" and "reish", but across 20 spellings the voice only ever said "me-im" and "re-ish", in two syllables, which is worse. A person's recording is the way to get these.

## Still Wrong: Needs A Decision Or New Art

- Final Nun old memory picture is a nail with a crossbar. It reads as a cross. It is on hold with the others; it should not come back.
- Gimel old picture is a giraffe. Giraffe starts with a J sound in English and in Hebrew. On hold.
- Shin word picture 3 is Shabbat candles labelled "nerot shabbat". The first word starts with Nun. Still shown.
- Seven "meet" pictures (Tsadi, Qof, Resh, Shin, Tav, Final Pe, Final Tsadi) are in a different style with child characters, not Ari and Noa. Still shown.
- Dalet, Ayin, Pe and Final Nun have plain letter cards as their "meet" picture (fourth pass). Illustrated ones in the style of the rest are still to be made.
- The spoken letter lectures (`audio/*/israeli/letter-lecture/*-explain-*`) are not used by the app. They should stay unused: the English one is read by a Hebrew voice and is hard to follow, the Hebrew one has English words inside it, and they teach a third set of pictures (Dalet as a table corner).
- Three memory-chain stories do not link the picture to the word: Lamed (lamp and bread), Nun (cat and candle), Mem (mailbox and water). The Hebrew is correct; the stories are weak.

## Checked And Found Correct

- Hebrew pointing, phonetic spelling and meaning of all 27 anchor words in `data/letters/mnemonics.json` and `data/letters/memory-chain.json`.
- Letter names, order and number values in `data/letters/letters.json` (apart from Pe).
- Israeli letter-name clips for both voices, apart from the ones listed above.
- Israeli vowel sound clips for both voices, apart from Dagesh.

## Checked In The Second Pass, No Change Made

- Print and cursive stroke shapes for all 27 letters were drawn out and looked at. No wrong letter was found. They are still marked draft and still need a native reader's eye; this was not an expert check.
- Builder words: all 162 words, both voices (324 clips), were listened to. Vowels cannot be judged on these voices (see the correction above), so only consonants were compared. 308 clips matched. These did not, and are worth a listen: peri (Ari, heard "bari"), kir (Ari), neyar (Noa), dov (Noa, heard "tov"), esh (Noa), katan (Noa), me'ushar (Noa), perach (both voices, heard "brach"), ragu'a (Ari, heard said twice). From the vowel side, delet was heard as "dalat" in both voices. No builder word clip was changed.

## Not Checked

- The lesson vocabulary outside the builder.
- Sephardi and Ashkenazi syllable, vowel, word and prayer clips.
- Cursive letter pictures (none are in the shown set).
