# Sephardi and Ashkenazi voices: the Israeli voices read the respelling (owner decision, Nov 7 2026, 22:56)

Lane 7 (accent voices), branch `lane/accents-2026-11-08` cut from `main` 3a2c4b19. Nothing in this environment has a speaker or a `GOOGLE_TTS_API_KEY`: every count below is a dry run and every audio check is a tone test. Nobody has listened to a clip made this way yet; the listening checklist at the end is the test.

## The decision (supersedes "Sephardi plays the Israeli clips", SEPHARDI-PLAYBACK-2026-11-07.md)

Both the Sephardi and the Ashkenazi clips are made with the Israeli voices (Google Cloud Text-to-Speech he-IL, Ari = `he-IL-Wavenet-B` man, Noa = `he-IL-Wavenet-A` woman) reading the tradition's **phonetic English respelling**: the "how to say it" line the app shows (`src/pronunciation/forTradition.js` `respell(he, tradition)`, `src/pronunciation/transliterate.js`, scheme `siddur`). So Ashkenazi says "shabos" and "adonoy", Sephardi keeps its vowel values ("shabat", "adonai"), and the sound is the natural Israeli voice. If a respelled clip comes out longer than its Israeli counterpart it is sped up, same pitch, so that it is **at most 26% longer** (duration <= 1.26 x the Israeli clip of the same id and voice). A clip is never slowed down.

What this does not claim: a respelling read by an Israeli voice is not a Sephardi or Ashkenazi reader. The guttural ayin and chet of a traditional Sephardi reading are not produced; Ashkenazi letter names and vowels come out only as far as the respelling spells them (`tov`/`beis`/`shabos` yes; stress and the "oy" cholam variant no, the engine writes `o`). The labels say "Israeli voice reading the Sephardi respelling", nothing more.

## What was built (one commit per step on the lane branch)

### 1. Renderer mode: `tools/audio/render_tts.mjs --tradition sephardi|ashkenazi`

- Row set: the manifest rows of that tradition for the voice set and kinds; `status: missing` rows by default, every row with `--redo` (the retired respelled files are `status: tts`, so re-rendering them needs `--redo`). Alias rows (a one-line prayer that doubles as its line) are skipped in kind mode, as for Israeli.
- Text sent: `tools/audio/accent.mjs` `respellFor(text, tradition)` = the pointed Hebrew cleaned as for an Israeli render (`cleanHebrewForTts`: cantillation, sof pasuq, meteg off, maqaf -> space), then respelled for the tradition. Plain Latin text, no SSML, `languageCode` he-IL, the same voice name as the Israeli run (the WaveNet pair by default; a Chirp 3 HD voice only with `GOOGLE_TTS_ALLOW_HD=1` + `GOOGLE_TTS_VOICE_M/_F`, and Chirp reads Latin letters differently, so listen to a few before trusting a batch; the names `he-IL-Chirp3-HD-Charon` / `-Kore` in this repo are unverified picks, see RENDER-QUEUE-2026-11-07.md).
- How the respelling passes the text cleaner: `cleanHebrewForTts()` now returns Latin input untouched apart from whitespace (it only strips Hebrew marks when the text contains Hebrew). Checked by test: `chalah`, `tzedek`, `shabos`, `yevarekhkha adonai veyishmerekha`, `ha'olam`, `borukh-atoh` all survive, and `textWarnings('shabos')` is empty (a respelling is not "Latin mixed into Hebrew").
- Sidecar `<clip>.mp3.meta.json`: `status: synthetic-unreviewed`, `source: tts-respelled-israeli-voice`, `provider`, `voiceName`, `languageCode`, `tradition`, `madeFrom: 'respelling'`, `spokenText` (the respelling), `hebrew` (the pointed text), `israeliRef` (the Israeli clip's path), `tempo` (below), `normalized`, `redistributionCleared: false`.
- Dry run prints every row's path, the respelling and the Hebrew, rows per kind, clips, characters and cost per tradition; `--tradition both` runs the two traditions one after the other. Rows whose respelling is empty (the silent letters `alef-sound`, `ayin-sound`, both voices) are listed and skipped.
- Manifest marking: after an `--execute` run the renderer itself updates the rows it wrote (`accent.mjs` `markAccentRows`: status `synthetic-unreviewed`, source `tts-respelled-israeli-voice`, `equivalentTo` dropped). `tools/tts/manifest_update.mjs` is the local-pipeline marker (it needs that pipeline's render log and verify report) and does not apply; `tools/audio/mark_present.mjs` only handles `missing` rows and would not re-mark the retired `tts` rows. `--no-mark` turns the marking off.

### 2. Tempo cap in the renderer

After render + loudness pass, if the Israeli counterpart file exists and the new clip is longer than 1.26 x its duration, ffmpeg `atempo` brings it to exactly 1.26 x (same pitch; two or more chained `atempo` filters when the factor is beyond 2.0; never below 1), then the loudness pass runs again. The sidecar's `tempo` records `{ applied, factor, cap, before, after, israeliSec, israeliRef }`. Durations are measured by decoding to PCM and counting samples, so the mp3 encoder's padding (about 0.05 s per file, which `ffprobe`'s format duration includes) does not count.

- `tempoFactor(newSec, israeliSec, cap = 1.26)` is a pure function with unit tests (1 within the cap, exactly `new / (cap x israeli)` above it, never below 1, 1 with unknown durations).
- Tone test (`tests/audio.accent-render.test.js`): a 4 s tone against a 2 s reference comes out at 2.528 s (allowed 2.52 +- 0.05); a 2.2 s clip is left alone; a 9 s clip (factor beyond 2, chained filters) comes out at 2.52 s. A renderBatch test with a fake fetch returning the 4 s tone proves the whole path: respelling sent, he-IL WaveNet-A, file capped, sidecar written, manifest row admitted.

### 3. `tools/audio/tempo_cap.mjs` for the EXISTING clips

`node tools/audio/tempo_cap.mjs --tradition sephardi|ashkenazi --voice both [--kinds ...] [--execute] [--admit-all]`. Dry run by default: lists every own-tradition file over the cap with current -> target duration and the Israeli duration, totals per kind. `--execute` speeds each file over the cap up to exactly 1.26 x (same pitch), re-normalizes, writes `tempo` into the sidecar and re-admits the manifest row (below). Files already within the cap are not rewritten and stay retired unless `--admit-all` is passed (then they are marked too, with `tempo.factor: 1`). Files with no Israeli counterpart on disk are listed and left alone.

### 4. Playback rule (`src/audio/player.js`)

- `ACCENT_SOURCES = { israeliVoice: 'tts-respelled-israeli-voice', tempoCapped: 'tts-respelled-tempo-capped' }`; `isAccentClip(row)` is true for a Sephardi/Ashkenazi row whose status is not `missing` and whose `source` is one of these (or whose status is `recorded`: a human recording of the tradition always plays as itself).
- The Sephardi and the Ashkenazi setting play **their own clip** when `isAccentClip` holds for the row (exact id, a linked lesson/vocab id, or a prayer row that aliases an admitted line); otherwise they fall back to the **Israeli clip of the same voice** (`PLAYBACK_TRADITION = { israeli, sephardi: 'israeli', ashkenazi: 'israeli' }`), captioned "Israeli voice; Sephardi/Ashkenazi reading shown in English letters". Every other own-tradition file, the 258 + 258 respelled line clips and the 4,897 + 5,120 respelled word clips with `source: paid-cloud` or `tts-respelled`, stays retired until it is re-rendered or tempo-capped.
- Change for Ashkenazi: until now the Ashkenazi setting played its old respelled files and fell silent (device voice off) where it had none. It now follows the same rule as Sephardi, so the old Ashkenazi files are retired and the Israeli clips play in their place (every Ashkenazi clip has an Israeli counterpart, so nothing falls silent). The device (Web Speech) voice stays refused for Ashkenazi (`tts-pronunciation-mismatch`), because Ashkenazi letter names and vowels differ audibly and the device voice cannot read the respelling. Trade-off to keep in mind (SEPHARDI-PLAYBACK-2026-11-07.md "Ashkenazi: not ruled on"): for letters, vowels and syllables an Israeli clip contradicts the Ashkenazi on-screen reading (tav/sav, kamatz "o") until the Ashkenazi letter clips are rendered from the respelling.
- Re-admission, exactly: a row is admitted when a tool writes an admitted `source` into it. The renderer writes `tts-respelled-israeli-voice` for the clips it makes. `tempo_cap.mjs --execute` writes `tts-respelled-tempo-capped` for a rewritten old file (or keeps `tts-respelled-israeli-voice` when the renderer made the file), and the same for within-cap files only with `--admit-all`. A `:mock` suffix, `tts-respelled`, `paid-cloud`, `outside-respelled` do not admit. Neither tool touches a `recorded` or `synthetic-reviewed` row or an Israeli row.
- Labels (`src/shell/audio-labels.js`): `tts-respelled-israeli-voice` -> "Synthetic voice (Israeli voice reading the Sephardi respelling; not a recorded teacher; unreviewed)"; `tts-respelled-tempo-capped` -> "Synthetic voice (outside voice reading the Sephardi respelling, sped up to the Israeli clip's pace; Sephardi style not verified; not a recorded teacher; unreviewed)". Dictionary (`src/vocab/clips.js` `lookupClip`/`alternateClip`), phrasebook (`src/phrases/phrases.view.js`), `forTradition.js` `playLine`/`audioNote`/`audioSupport` follow the same rule; `data/vocab/clip-lookup.json` regenerated (rule text).
- Tests: `tests/audio.tradition-playback.test.js` runs the real manifests for both settings and both voices (every id with an Israeli file resolves to it; no result points at `/sephardi/` or `/ashkenazi/`; the manifests hold no admitted row yet, so nothing changes for the learner today) and a fixture row of each new provenance (the own file plays, with the new label; the man's voice, the Israeli setting and the other tradition are untouched). `tests/audio.player.test.js`, `audio.access`, `trust-copy`, `vocab.search`, `audio.accent-render`, `audio.tempo-cap` cover the rest.

### 5. GitHub Actions: `.github/workflows/render-accents.yml`

`workflow_dispatch` only (never on push). Inputs: `tradition` (sephardi | ashkenazi | both), `kinds`, `voice` (both | m | f), `redo`, `cap_existing`, `dry_run` (default true), `chirp` (+ the two voice-name inputs). Ubuntu 24.04, Node 22, `apt-get install ffmpeg`. Steps: renderer -> `tempo_cap.mjs` per tradition -> `tools/audio/summary.mjs` and `tools/vocab/build-clip-lookup.mjs` (the rows themselves are marked by the renderer and the cap tool, see step 1) -> targeted tests (`audio.accent-render`, `audio.tempo-cap`, `audio.tradition-playback`, `audio.player`, `audio.access`, `audio.labels`, `audio.tts`, `vocab.search`, `phrases`) and `summary.mjs --check` -> commit of `audio/`, `data/audio/`, `data/vocab/clip-lookup.json` as John Khan (`git config user.name "John Khan"`, `user.email "johnnykhan1@gmail.com"`, no trailers) and push to the branch the run was dispatched on. Dispatch it from `main`.

Where the key goes: repository Settings -> Secrets and variables -> Actions -> New repository secret -> name `GOOGLE_TTS_API_KEY`. The "Key present" step fails a non-dry run without it. A `dry_run: true` run needs no secret and prints the counts below plus every existing file over the cap.

Local dry-run of the workflow's shell steps (same scripts, `DRY_RUN=true`, no key): the render step printed the per-tradition summaries below, the Chirp branch printed `m=he-IL-Chirp3-HD-Charon, f=he-IL-Chirp3-HD-Kore` and the Chirp price, the tempo-cap loop ran for both traditions, the "admitted rows" report printed `{}`, `summary.mjs --check` passed, and the test step passed (91 tests). The commit step was not run here (nothing to commit; never push from this environment).

## Commands

```sh
# dry runs (no network): what would be sent, rows per kind, characters, cost
node tools/audio/render_tts.mjs --provider google --tradition sephardi  --voice both --kinds letter,vowel,syllable,word,line,prayer
node tools/audio/render_tts.mjs --provider google --tradition ashkenazi --voice both --kinds letter,vowel,syllable,word,line,prayer
node tools/audio/render_tts.mjs --provider google --tradition both --voice both --kinds letter,vowel,syllable,word,line,prayer --redo   # every row, replaces the retired files

# render (needs the key and ffmpeg); the manifest rows are marked by the renderer
GOOGLE_TTS_API_KEY=... node tools/audio/render_tts.mjs --provider google --tradition sephardi --voice both --kinds line --redo --execute

# cap what already exists (dry run, then execute); rewritten files are re-admitted
node tools/audio/tempo_cap.mjs --tradition sephardi --voice both
node tools/audio/tempo_cap.mjs --tradition sephardi --voice both --execute

# afterwards
node tools/audio/summary.mjs && node tools/vocab/build-clip-lookup.mjs
node --test tests/audio.accent-render.test.js tests/audio.tempo-cap.test.js tests/audio.tradition-playback.test.js tests/audio.player.test.js tests/vocab.search.test.js
```

Chirp 3 HD instead of WaveNet (listen first; names unverified): prefix `GOOGLE_TTS_ALLOW_HD=1 GOOGLE_TTS_VOICE_M=he-IL-Chirp3-HD-Charon GOOGLE_TTS_VOICE_F=he-IL-Chirp3-HD-Kore`.

Actions route: GitHub -> Actions -> render-accents -> Run workflow (branch main) -> choose tradition/kinds/redo, `dry_run: true` first, read the log, then run again with `dry_run: false`.

## Dry-run counts and cost (both voices; WaveNet rate US$4 per million characters, list price, free tier ignored)

Rows per kind are for both voices together (two clips per id). "Missing" = rows with no file today (what a run without `--redo` renders); "all" = every row of the tradition (`--redo`). Lines exist for both traditions as retired files, so they appear only under `--redo`; prayer = the 36 whole-prayer ids (the other 104 prayer rows alias a line and are skipped).

| Tradition | Set | letter | vowel | syllable | word | line | prayer | clips | characters | est. cost |
|---|---|---|---|---|---|---|---|---|---|---|
| Sephardi | missing | 114 | 30 | 220 | 1,451 | 0 | 36 | 1,851 | 20,581 | US$0.0823 |
| Sephardi | all (`--redo`) | 114 | 30 | 220 | 6,348 | 258 | 36 | 7,006 | 80,250 | US$0.3210 |
| Ashkenazi | missing | 114 | 30 | 220 | 1,228 | 0 | 36 | 1,628 | 19,847 | US$0.0794 |
| Ashkenazi | all (`--redo`) | 114 | 30 | 220 | 6,348 | 258 | 36 | 7,006 | 81,810 | US$0.3272 |

Each run reports 4 rows with warnings (skipped): `alef-sound` and `ayin-sound` in both voices, whose respelling is empty (silent letters). Every other row (7,002 per tradition) has its Israeli counterpart on disk, so the cap can be applied to all of them. Lines only, `--redo`: Sephardi 258 clips, 26,398 characters, US$0.1056; Ashkenazi 258 clips, 26,842 characters, US$0.1074. The 36 whole prayers with Chirp 3 HD would be US$0.367 (Sephardi) / US$0.373 (Ashkenazi) instead of about US$0.05.

## Tempo-cap dry run on the existing files (`tempo_cap.mjs`, both voices, all kinds)

Run here on the committed files (`node tools/audio/tempo_cap.mjs --tradition <t> --voice both`, 43 min for the two traditions; durations decoded, not probed). "over" = files longer than 1.26 x their Israeli counterpart, the ones `--execute` would rewrite and re-admit; "within" = already inside the cap (left alone; re-admitted only with `--admit-all`); every file had its Israeli counterpart on disk (noRef 0).

| Tradition | kind | files on disk | over the cap | within | median length / Israeli (over set) | median speed-up | largest speed-up | seconds removed |
|---|---|---|---|---|---|---|---|---|
| Sephardi | line | 258 | 257 | 1 | 2.36x | x1.873 | x2.65 | 2,161 |
| Sephardi | word | 4,897 | 4,191 | 706 | 1.72x | x1.369 | x2.33 | 2,442 |
| Sephardi | total | 5,155 | 4,448 | 707 | | | | 4,603 |
| Ashkenazi | line | 258 | 206 | 52 | 1.47x | x1.171 | x1.64 | 281 |
| Ashkenazi | word | 5,120 | 958 | 4,162 | 1.40x | x1.114 | x2.12 | 249 |
| Ashkenazi | total | 5,378 | 1,164 | 4,214 | | | | 530 |

Letters, vowels, syllables and whole prayers: no Sephardi or Ashkenazi file exists on disk, so nothing to cap (0 rows). The Sephardi files are the slow ones (the live `bless-priestly-1`: 6.40 s / 6.71 s against Israeli 2.42 s / 2.66 s, x2.10 / x2.01 to reach 3.04 s / 3.35 s; `hanerot-halalu` 48.3 s -> 24.0 s against 19.0 s; `avot-1` 42.7 s / 44.1 s -> 24.5 s / 24.4 s). The Ashkenazi files were made at a pace much closer to the Israeli clips (`bless-priestly-1` 3.62 s / 4.38 s, x1.19 / x1.31); 4,162 of its 5,120 word clips are already within the cap. The lesson word *shalom* `r03-w1` (Sephardi): 1.55 s / 1.50 s against 1.02 s / 1.14 s, x1.20 / x1.04.

## Listening checklist (before anything is pushed to learners)

Nobody has heard an Israeli WaveNet voice read these Latin strings. Listen to these first, in both voices, against the Israeli clip of the same id:

1. **shalom**: `audio/m/sephardi/word/r03-w1.mp3` (sent "shalom") and `audio/m/ashkenazi/word/r03-w1.mp3` (sent "sholom"), against `audio/m/israeli/word/r03-w1.mp3`. Does the voice say sha-LOM, or spell the letters, or read it as an English word?
2. **Shabbat / Shabbos**: `word/r02-w1` (also `r04-w1`): Sephardi "shabat", Ashkenazi "shabos". The Ashkenazi clip must end in -os, not -at. Also `line/candle-shabbat` (ends "... ner shel shabat" / "... neir shel shabos").
3. **The Priestly Blessing**: `line/bless-priestly-1`, `-2`, `-3` ("yevarekhkha adonai veyishmerekha" / "yevorekhkho adonoy veyishmerekho"; "... veyasem lekha shalom" / "... veyoseim lekho sholom"). Check: `kh` as a throat sound (not "k-h"), `ch` in `vichuneka` as a throat sound (not the ch of chair), the divine name read as Adonai/Adonoy, the pace after the cap against `audio/f/israeli/line/bless-priestly-1.mp3` (2.66 s decoded; a capped clip may be up to 3.35 s).
4. **Letter names and sounds**: `letter/tav` ("tav" / "tov"), `letter/bet` ("beit" / "beis"), and a letter-sound row such as `letter/bet-sound` (sent a single letter "v"): a one-letter string may come out as a letter name or as nothing useful; 44 letter-sound rows per voice are like this. If they fail, render the letter kind without the `-sound` rows (`--ids`) and leave those to the Israeli fallback.
5. **Vowels and syllables**: `vowel/kamatz` (sent "a" / "o"), `syllable/alef-a` ("a"): the same one-letter question.
6. **Glottal stops and apostrophes**: `line/aleinu-1` ("la'adon", "ha'aratzot", "yoshi'a"): does the apostrophe produce a catch or a pause?
7. **Long lines**: `prayer/aleinu` or `line/hanerot-halalu`: the cap compresses a 2.5x clip to 1.26x; check it is still intelligible at that pace. If not, the cap is a constant (`TEMPO_CAP` in `tools/audio/accent.mjs`, `--cap` on `tempo_cap.mjs`).

If the WaveNet voice reads the Latin letters badly, the alternative the renderer already supports is Chirp 3 HD (`GOOGLE_TTS_ALLOW_HD=1`), which reads Latin text as a multilingual voice; it must be listened to in the same way and costs 7.5x more.

## Honest limits and open items

- No clip was rendered and no clip was listened to here. The numbers above are dry runs; the audio checks are ffmpeg tones.
- Whether an he-IL WaveNet voice reads "shabos" as a Hebrew word, as English, or letter by letter is unknown until someone listens. The Chirp 3 HD names in this repo are unverified (RENDER-QUEUE-2026-11-07.md).
- The respelling is rule-made and not checked by a native speaker of either tradition (`src/pronunciation/transliterate.js` header). The Ashkenazi cholam is written `o`, not `oy`; the Sephardi line is identical to the Israeli one in Latin letters, so a Sephardi clip and an Israeli clip of the same id are the same voice reading the same string, one from Latin and one from pointed Hebrew.
- 44 letter-sound rows per voice are single Latin letters; 2 per voice (`alef-sound`, `ayin-sound`) have no respelling at all and are skipped.
- Ashkenazi letters, vowels and syllables fall back to Israeli clips until rendered, which contradicts the on-screen Ashkenazi reading for those items (see step 4).
- `audio/INDEX.csv` (`tools/audio/apply-clip-labels.mjs`) is not refreshed by the workflow; it is a derived listing, not read by the app.
- The service worker caches clips up to 524,288 bytes; `audio/f/sephardi/line/avot-1.mp3` (529,449 bytes, 44.1 s) is over that today; capped to 24.4 s at the same bitrate it should come in near 290 KB (not measured here; `tempo_cap.mjs` does not check the size).
