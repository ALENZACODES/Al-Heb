# Speech-to-text check for the Israeli audio

Plays every Israeli clip to a Hebrew speech-to-text model and compares what it heard with the Hebrew the clip is meant to say.
A clip that comes back as a different word (שָׁלוֹם heard as "שסלום", בָּרוּךְ heard as "ברור") is mispronounced.

Model: [ivrit-ai/whisper-large-v3-turbo-ct2](https://huggingface.co/ivrit-ai/whisper-large-v3-turbo-ct2), Whisper fine-tuned on
Hebrew, run on the CPU with faster-whisper. It downloads itself (about 1.6 GB) the first time.

## Setup (once)

```
pip install faster-whisper
```

ffmpeg must be on the PATH (it already is for the other audio tools).

## 1. Scan

```
python tools/audio/asr-check/scan.py
```

About 1 second per word clip on a laptop CPU; resumable (stop it and run again, it carries on).
Writes `docs/audio/ASR-CHECK.md` (summary and worst clips), `docs/audio/asr-check.csv` (every clip) and
`docs/audio/asr-redo-israeli.txt` (the files to re-record).

## 2. Fix

```
set GOOGLE_TTS_API_KEY=your-key        (macOS/Linux: export GOOGLE_TTS_API_KEY=your-key)
python tools/audio/asr-check/fix.py                 # dry run: what it would re-record
python tools/audio/asr-check/fix.py --execute --only shalom,barukh   # try the two known ones first
python tools/audio/asr-check/fix.py --execute       # everything the scan failed
```

For each failing recording it renders up to four takes (WaveNet voice with vowel points, WaveNet without, Chirp 3 HD without,
Chirp 3 HD with), checks each take the same way, and writes the best passing take over every file that shared the bad audio.
A recording no take passes is left alone and listed in `docs/audio/ASR-NEEDS-HUMAN.md` for a real voice.
Every take is logged in `tools/audio/asr-check/fix-log.jsonl`.

Then run the scan again (`scan.py --report-only` is not enough: the fixed files must be heard again; delete
`tools/audio/asr-check/results.jsonl` lines for the fixed files, or the whole file, and rerun `scan.py`).

## Dictionary words

After `node tools/audio/render_dictionary.mjs --execute`, check only the new dictionary clips, then re-record the ones that fail:

```
python tools/audio/asr-check/scan.py --kinds dictionary
python tools/audio/asr-check/fix.py --execute
node tools/vocab/build-clip-lookup.mjs
```

The report lists each word as pass, borderline or fail; `fix.py` tries up to four new takes for every fail and keeps the best one that passes.

## Limits

- It is a machine listener. A **fail** is strong evidence; a **pass** means the word is recognisable, not that a teacher approved
  the accent or stress. Cantor and teacher review still matter.
- The scorer allows spelling-only differences (ו/י vowel letters, ט/ת, כ/ק, ע/א, ס/ש, a final א/ה), so true homophones
  (לוֹ / לֹא) cannot be told apart.
- Rare prayer forms the model has not heard much can come back respelled as a common word; those show as **borderline**, check by ear.
- Letters, vowels and syllables are not scanned: speech-to-text is not reliable on sounds that are not words.
