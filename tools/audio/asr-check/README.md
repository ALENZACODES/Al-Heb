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
- Letters, vowels and syllables are not scanned here: speech-to-text is not reliable on sounds that are not words. They have their own check, below.

## Letters, vowels and syllables (sound check)

```
python tools/audio/asr-check/scan_sounds.py --model /path/to/phoneme-ct2                                   # every clip, 3 hearings
python tools/audio/asr-check/scan_sounds.py --model /path/to/phoneme-ct2 --disputed --first-pass 3 --passes 2   # more hearings for unsure clips
```

A sound model (renikud/whisper-he-ipa, converted once as in `.github/workflows/fill-clips.yml`) writes down the sounds it hears.
One half-second clip heard alone is not reliable (the same clip came back "ba" or "ma"), so each clip is heard several times,
each time in a different row of eight clips, and judged on the majority. Report: `docs/audio/SOUNDS-CHECK.md`,
`docs/audio/sounds-check.csv`; clips to re-record: `docs/audio/sounds-redo-israeli.txt`.

Fresh takes for the "listen" clips: `tools/audio/RUN-SOUND-RETAKES.cmd` (or `sound_takes.py --record`, needs the voice key), then
`sound_takes.py --pick --model ...` and, after listening, `sound_takes.py --apply`. `sound_takes.py` alone lists what it would record.

## Stale verdicts

`results.jsonl` is keyed by file. A clip re-recorded after the scan keeps its old verdict until it is heard again:

```
python tools/audio/asr-check/rehear_flagged.py     # hears every flagged word and builder clip again, one at a time
python tools/audio/asr-check/scan.py --report-only
```

## Builder words

`python tools/audio/asr-check/builder_swap.py --execute` replaces a home-page builder word that still fails with the checked
lesson recording of the same word in the same voice, where one exists. Both clips are heard again before anything is replaced.
