# Synthetic voices on a small disk or a modest GPU PC

One page, commands in order. Nothing here has been run with a real model: the workspace this was written in has 1.9 GB free (measured by `preflight.mjs`), no GPU and no model. Everything that touches the real model is untested. Every clip this makes is labelled `synthetic-unreviewed` (a computer voice no human has listened to), never recorded. Details and the full honest state: `docs/tts/RUN-ON-YOUR-PC.md`.

Israeli (pointed Hebrew) only. Sephardi and Ashkenazi clips come from respellings, are untested, and are a separate opt-in (`--tradition sephardi`); do not use them here.

## What it costs (per 100 clips)

| | Value |
|---|---|
| Disk, raw WAV | not measured |
| Disk, MP3 | not measured (the encoder is set to 96 kbps, which is 12 KB per second of speech; clip length not measured) |
| Disk, model weights, Python packages, caches | not measured |
| Time, render / encode / check | not measured; fill in from your first 20 clips (table in RUN-ON-YOUR-PC.md) |

`preflight.mjs` uses placeholder minimums (10 GB disk, 6 GB VRAM, 8 GB RAM). They are not measured needs. Change them with `--min-disk-gb`, `--min-vram-gb`, `--min-ram-gb` once you have real numbers.

## Windows (PowerShell)

```powershell
# 0. Tools: Python 3.11, Node 20+, ffmpeg (a new window may be needed after installing)
winget install Python.Python.3.11; winget install OpenJS.NodeJS.LTS; winget install Gyan.FFmpeg

# 1. Put the big things on the drive with space (change D:\ as needed)
$env:ALEF_TTS_WORK = "D:\alef-tts-work"      # WAV and MP3 work folder (outside the repo)
$env:HF_HOME       = "D:\hf"                 # model weights cache
$env:PIP_CACHE_DIR = "D:\pip-cache"
$env:TMP = "D:\tmp"; $env:TEMP = "D:\tmp"; New-Item -ItemType Directory -Force D:\tmp | Out-Null
$env:ALEF_REF_M = "C:\voices\m.wav"; $env:ALEF_REF_F = "C:\voices\f.wav"   # two DIFFERENT voices you own or a signed donor

# 2. Python environment (NVIDIA: install the CUDA torch from pytorch.org first, then the rest)
py -3.11 -m venv D:\alef-tts-venv; D:\alef-tts-venv\Scripts\Activate.ps1
pip install chatterbox-tts faster-whisper

# 3. Check this PC (changes nothing, downloads nothing). Run it with the venv active.
cd C:\path\to\Al-Heb
node tools/tts/preflight.mjs --ref-m $env:ALEF_REF_M --ref-f $env:ALEF_REF_F

# 4. One plan, Israeli only, written outside the repo
node tools/tts/plan.mjs --israeli-only --confidence high --voice m --out "$env:ALEF_TTS_WORK\plan.json" --donor-dir "$env:ALEF_TTS_WORK\donor"

# 5. One batch of 100 new clips (add --device cpu if there is no usable GPU; slow, speed not measured)
python tools/tts/render_chatterbox.py --plan "$env:ALEF_TTS_WORK\plan.json" --work $env:ALEF_TTS_WORK --israeli-only --max-clips 100 --resume --ref-m $env:ALEF_REF_M --ref-f $env:ALEF_REF_F
node tools/tts/post.mjs --plan "$env:ALEF_TTS_WORK\plan.json" --work $env:ALEF_TTS_WORK
python tools/tts/verify.py --plan "$env:ALEF_TTS_WORK\plan.json" --work $env:ALEF_TTS_WORK --report "$env:ALEF_TTS_WORK\report.csv" --resume

# 6. Listen to the batch yourself, then preview and apply (the app plays them, labelled synthetic and unreviewed)
node tools/tts/manifest_update.mjs --work $env:ALEF_TTS_WORK --report "$env:ALEF_TTS_WORK\report.csv" --dry-run
node tools/tts/manifest_update.mjs --work $env:ALEF_TTS_WORK --report "$env:ALEF_TTS_WORK\report.csv"
node tools/audio/build_manifest.mjs --check
```

Repeat step 5 as often as you like; stop with Ctrl+C at any time.

## Linux

```bash
# 0. Tools: python3.11 (+venv), node 20+, ffmpeg
sudo apt install python3.11 python3.11-venv ffmpeg

# 1. Put the big things on the drive with space
export ALEF_TTS_WORK=/mnt/big/alef-tts-work HF_HOME=/mnt/big/hf PIP_CACHE_DIR=/mnt/big/pip-cache TMPDIR=/mnt/big/tmp
mkdir -p "$TMPDIR" "$ALEF_TTS_WORK"
REFM=~/voices/m.wav; REFF=~/voices/f.wav       # two DIFFERENT voices you own or a signed donor

# 2. Python environment (NVIDIA: install the CUDA torch from pytorch.org first)
python3.11 -m venv /mnt/big/alef-tts-venv && source /mnt/big/alef-tts-venv/bin/activate
pip install chatterbox-tts faster-whisper

# 3. Check this PC (changes nothing, downloads nothing). Run it with the venv active.
cd ~/Al-Heb && node tools/tts/preflight.mjs --ref-m $REFM --ref-f $REFF

# 4. One plan, Israeli only
node tools/tts/plan.mjs --israeli-only --confidence high --voice m --out $ALEF_TTS_WORK/plan.json --donor-dir $ALEF_TTS_WORK/donor

# 5. One batch of 100 new clips (add --device cpu if there is no usable GPU)
python3 tools/tts/render_chatterbox.py --plan $ALEF_TTS_WORK/plan.json --work $ALEF_TTS_WORK --israeli-only --max-clips 100 --resume --ref-m $REFM --ref-f $REFF
node tools/tts/post.mjs --plan $ALEF_TTS_WORK/plan.json --work $ALEF_TTS_WORK
python3 tools/tts/verify.py --plan $ALEF_TTS_WORK/plan.json --work $ALEF_TTS_WORK --report $ALEF_TTS_WORK/report.csv --resume

# 6. Listen to the batch yourself, then preview and apply
node tools/tts/manifest_update.mjs --work $ALEF_TTS_WORK --report $ALEF_TTS_WORK/report.csv --dry-run
node tools/tts/manifest_update.mjs --work $ALEF_TTS_WORK --report $ALEF_TTS_WORK/report.csv
node tools/audio/build_manifest.mjs --check
```

## Stop and restart

- `--max-clips 100` renders at most 100 new clips and exits; the same command continues. Clips already rendered do not count.
- Ctrl+C or a crash is safe: the renderer writes each WAV to a temporary file first, and on the next run `--resume` deletes leftovers and any WAV with no log line, then renders them again. A clip with no log line is never marked in the manifest.
- `verify.py --resume` keeps rows already accepted and checks only the rest. Rejected clips are checked again; to retry one, delete its WAV and MP3 under the work folder.

## When the disk is nearly full

- After a batch is marked (step 6), the MP3s are copied into the repo's `audio/` folder. You may then delete `raw\` (WAV, the largest part) from the work folder. A later `plan.mjs` run no longer lists clips that are marked, so they are not rendered again.
- Keep `raw\` for clips that were rejected or not yet marked, or they will be rendered again.
- `pip cache purge` clears the package cache. The model weights in `HF_HOME` are needed for every run.
- Disk numbers above are unmeasured; check free space after your first 20 clips and re-run `preflight.mjs`.

## What preflight does and does not tell you

It reports free disk, RAM, GPU and VRAM (nvidia-smi), Python and torch versions, whether torch can use the GPU, whether the two Python packages and the model weights are present, ffmpeg and ffprobe, and your two reference WAVs. It prints GO, GO WITH WARNINGS or NO-GO and names the first missing piece with the command that fixes it. GO does not mean the voices sound right: nobody has listened to any output.
