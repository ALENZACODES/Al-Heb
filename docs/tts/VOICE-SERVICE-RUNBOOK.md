# Runbook: Sephardi and Ashkenazi words from an outside voice service (man and woman)

Read this first, because it is the honest state of things:

- **No real clip exists.** The tools in this runbook were written and tested without a key. Everything was run only in `--mock` mode (sine tones that stand in for speech) and against a local stand-in server that replays recorded-shape replies. Nothing has been sent to the real service, and nobody has heard any output.
- The endpoint paths and field names were read from the service's public API reference. They have not been used with a key. If the first pilot call fails with something unexpected, stop and look at the error message; the render log keeps it.
- The text sent for each word is its stored **respelling** (Latin letters, from `data/tts/soundwords.sephardi.json` and `data/tts/soundwords.ashkenazi.json`), never the pointed Hebrew. Whether the service's multilingual model reads a respelling as Sephardi or Ashkenazi Hebrew is **unknown**. That is why the pilot comes first and a native listener decides.
- Israeli voices are made elsewhere and are not part of this runbook.
- Every clip is recorded as `synthetic-unreviewed`, made from a respelling, with the licence field `licence not cleared`.

**The key must never be pasted into the repo, a file in the repo, a commit message, a chat, a screenshot or a log.** The tools read it from an environment variable only and never print it. If it leaks anywhere, revoke it in your account and make a new one.

Costs and limits: the plan prints a **character count**, not a price. What a character costs, your monthly allowance, which output formats your plan allows and your request limits are all things to **check your plan** for. The same goes for the speech-to-text step used by judge 2.

A note on the model: the default is the service's multilingual model (`eleven_multilingual_v2`), as asked. The API reference says the language-code field is not supported for that model, so none is sent; the model guesses the language from the Latin-letter text. An earlier adapter note in `tools/audio/tts/` says the same model was reported unintelligible for pointed Hebrew, and that a newer model needs a language code; that does not settle how it reads a respelling, which only the pilot shows. To try another model, set `model_id` (and `language_code` where the model accepts one) in your config copy; other models may restrict the voice settings, and the service's error message will say so. The model, settings and seed are written into every log line.

## 0. What you need

- Node 20 or newer (18 works), `ffmpeg` and `ffprobe` on the PATH, and a clone of this repo on a clean branch.
- An account with the voice service, its key, and two voices you have listened to.

## 1. Set the key (this terminal only)

PowerShell (Windows):

```powershell
$env:VOICE_SERVICE_API_KEY = Read-Host "paste the key here (nothing is shown in the repo)"
$env:ALEF_VOICE_WORK = "$HOME/alef-voice-work"
New-Item -ItemType Directory -Force $env:ALEF_VOICE_WORK | Out-Null
```

Linux or macOS:

```bash
read -rs VOICE_SERVICE_API_KEY && export VOICE_SERVICE_API_KEY
export ALEF_VOICE_WORK="$HOME/alef-voice-work" && mkdir -p "$ALEF_VOICE_WORK"
```

The work folder is outside the repo on purpose (raw audio is large). Close the terminal when you are done; the variable goes with it.

## 2. List your account's voices

```
node tools/tts/voice_list.mjs
node tools/tts/voice_list.mjs --search calm --gender female
```

It prints name, id, category, labels, verified languages, a preview link, and a note when a voice may come from a shared library. **It chooses nothing.** Open the preview links and listen. A voice from a shared library can carry its own commercial-use conditions; read the terms of each voice you consider. (`--mock` shows the output shape with invented rows.)

## 3. Pick two ids

Copy the template and put your two ids in the copy (not in the repo file):

```powershell
Copy-Item tools/tts/voices.config.json "$env:ALEF_VOICE_WORK/voices.config.json"
notepad "$env:ALEF_VOICE_WORK/voices.config.json"
```

```bash
cp tools/tts/voices.config.json "$ALEF_VOICE_WORK/voices.config.json" && ${EDITOR:-nano} "$ALEF_VOICE_WORK/voices.config.json"
```

Fill `m_pleasant.voice_id` (the pleasant man voice) and `f_extra_feminine.voice_id` (the extra-feminine pleasant woman voice). `licence_note` is free text for what you find in the terms; it is copied into the logs but the clips stay `licence not cleared` until you clear them yourself. Every tool takes `--config <that file>`; the commands below use `$CFG`.

```powershell
$CFG = "$env:ALEF_VOICE_WORK/voices.config.json"
```
```bash
CFG="$ALEF_VOICE_WORK/voices.config.json"
```

The man and woman ids must be different; the renderer refuses placeholders and identical ids.

## 4. Dry-run the plan and read the character estimate

```
node tools/tts/voice_plan.mjs --out "$ALEF_VOICE_WORK/plan/voice-plan.json"
```

(PowerShell: use `"$env:ALEF_VOICE_WORK/plan/voice-plan.json"`.) No call is made. It prints characters per tradition and voice slot, the total, the total including the second take that judge 3 needs, and the time at the request rate (arithmetic, not a measurement). Default: words only, both traditions, slots m and f, ordered by `tools/audio/priority.mjs` rank and then list order. Options: `--words N`, `--max-clips N`, `--batch-size 200`, `--traditions sephardi`, `--slots m`, `--kinds word,line,prayer` (lines and prayers are long; read the estimate), `--no-take2`, `--rate 30` (requests per minute), `--resume`.

Compare the estimate with your plan's allowance before going on.

## 5. Pilot first: 20 words, both traditions, both voices (80 clips)

```
node tools/tts/voice_plan.mjs --words 20 --out "$ALEF_VOICE_WORK/plan/pilot.json"
node tools/tts/voice_render.mjs --plan "$ALEF_VOICE_WORK/plan/pilot.json" --config "$CFG" --dry-run
node tools/tts/voice_render.mjs --plan "$ALEF_VOICE_WORK/plan/pilot.json" --config "$CFG" --yes
node tools/tts/voice_clip.mjs
```

`voice_render` prints the characters it is about to send and sends nothing without `--yes`. The clipped files are in `$ALEF_VOICE_WORK/clips/take1/audio/<m|f>/<sephardi|ashkenazi>/word/<id>.mp3`. **Listen to all of them yourself, then give a sample to a native listener, before deciding anything.** Questions for the pilot: does the respelling come out as the tradition you meant? Are the voices pleasant? Is the woman voice distinct from the man's? If not, change the voices or stop; fixing respellings is a job for the respelling lane, not this tool.

Only if the pilot is worth continuing, run the judges on it to see their numbers (they are starting points, not calibrated):

```
node tools/tts/voice_render.mjs --plan "$ALEF_VOICE_WORK/plan/pilot.json" --config "$CFG" --take 2 --yes
node tools/tts/voice_clip.mjs --take 2
node tools/tts/voice_judge.mjs --judge j1
node tools/tts/voice_judge.mjs --judge j2,j3 --config "$CFG" --yes
```

## 6. The full run, in batches of 200

```
node tools/tts/voice_plan.mjs --out "$ALEF_VOICE_WORK/plan/voice-plan.json" --batch-size 200
node tools/tts/voice_render.mjs --plan "$ALEF_VOICE_WORK/plan/voice-plan.json" --config "$CFG" --max-clips 200 --resume --yes
node tools/tts/voice_clip.mjs
```

Repeat the last two commands for each batch (the render command with `--resume` picks up after what is already rendered). Pilot clips are reused, not paid for twice, because the log and file hashes say they exist. `--rate 30` spaces the requests; `--concurrency 2` allows two at once if your plan does. A `429` is retried with backoff and the `Retry-After` wait is honoured; `401`, `402`, `403` and `404` stop the run (key, quota, plan or voice id) and leave the rest untouched. `--max-chars N` stops after N characters. Ctrl-C finishes the request in flight and stops; run it again with `--resume`. A lock file prevents two runs on one work folder.

Then the second take for judge 3 (a different seed, otherwise the same settings), in batches of the same size:

```
node tools/tts/voice_render.mjs --plan "$ALEF_VOICE_WORK/plan/voice-plan.json" --config "$CFG" --take 2 --max-clips 200 --resume --yes
node tools/tts/voice_clip.mjs --take 2
```

## 7. Judges

```
node tools/tts/voice_judge.mjs --judge j1
node tools/tts/voice_judge.mjs --judge j2 --config "$CFG" --yes
node tools/tts/voice_judge.mjs --judge j3 --config "$CFG" --yes
```

- J1 is local (ffmpeg): length for the word, silence ratio, gaps, clipping on the raw render, loudness, sample rate, metadata, energy at the tail.
- J2 sends each clip to the service's speech-to-text (Hebrew) and compares the transcript with the expected Hebrew (niqqud, punctuation, spaces and final forms removed; edit-distance similarity, threshold 0.7, `--min-similarity` to change it). To avoid the service for this step, set `"recogniser": {"mode": "command", "command": ["your-program", "{file}"]}` in your config copy: the program must print the Hebrew transcript on stdout.
- J3 compares take 1 with take 2 (length ratio, transcript similarity, long-term spectral similarity) and checks each clip against the same word in the other voice slot. With no second take it **fails**; it never passes by default.

Each judge writes `judges/j1.jsonl`, `j2.jsonl`, `j3.jsonl` with the measured values and thresholds per clip. Transcripts are cached by clip hash, so re-runs do not pay twice.

**What the judges cannot prove.** They test whether the file is technically sound and whether a recogniser trained mostly on Israeli Hebrew can understand the respelling. They do not test that the accent is really Ashkenazi or Sephardi, that vowels or stress are right, that the word sounds right to a learner, or that a voice is suitable. Only a native listener can judge those.

## 8. Hand-off folder for a real person

```
node tools/tts/voice_handoff.mjs --out "$ALEF_VOICE_WORK/handoff/Aleph-RESPELLED-THREE-JUDGE-PASSED"
```

It copies only clips that all three judges passed ("unanimous-machine-pass") and whose verdicts were made on the exact delivered file, writes `manifest.csv` and `manifest.json` (the 14 columns of the earlier outside batch, plus `tradition`, `voice_slot`, `respelled_text`), `failures.csv` with reasons, `listing.csv` for ingest, `listen/<tradition>-<slot>.html` listening pages with matching sheets, and a `README.md` with the caveats. `--include-wav` adds the raw take-1 files. `human_approved` is `False` on every row.

Send the folder (or the four listening pages with `audio/`) to a native listener. Nothing is approved by sending it, or by their listening; approval is a separate, manual step in the repo.

## 9. Ingest into the repo

On a clean branch, after fetching and rebasing:

```
node tools/audio/ingest.mjs "<hand-off folder>/audio" --listing "<hand-off folder>/listing.csv" --origin respelled --batch "<neutral label>" --report /tmp/ingest-report.md
```

(PowerShell: `--report "$env:TEMP/ingest-report.md"`.) That is a dry run. Read the report. The folder layout `audio/<m|f>/<sephardi|ashkenazi>/word/<id>.mp3` is the repo's own, so voice, tradition and kind are read from the path. Then add `--apply`, and:

```
node tools/audio/build_manifest.mjs --check
node tools/meta/scan.mjs
node tools/meta/scan.mjs --text
node tools/build-precache.mjs
node tools/test/run.mjs unit
```

`--origin respelled` writes `source: "outside-respelled"`, status `synthetic-unreviewed`, and a `synth` record with `madeFrom: "respelling"`, `accentVerified: false`, `licence: "licence not cleared"`. The in-app label then reads, for example, "Synthetic voice (Sephardi style not verified; made from a respelling; not a recorded teacher; unreviewed)". Keep `--batch` free of tool and company names: it is written into tracked files. Committing thousands of mp3 files grows the repository permanently; read the size section of `docs/audio/INGEST-CLIPS.md` first.

To make a listening packet from the ingested clips (one tradition and voice at a time, because the packet keys on id):

```
node tools/review/build_audio_packet.mjs --tradition sephardi --voice m --zip /tmp/listen-sephardi-m.zip
```

## 10. Licence provenance

Every log line, hand-off row and ingested clip says `licence not cleared`. Before the clips are sold inside an app, you need to have checked, for your plan and for each voice used: the service terms on commercial use and on redistributing generated audio, the terms of any shared-library voice, and any disclosure rules that apply to synthetic voices. Write what you found into `licence_note` in your config copy; the tools copy that text into the logs but do not change the `licence not cleared` status for you. That change, if you decide to make it, is a manual edit with your own record of what you checked.

## 11. If something goes wrong

| Symptom | What it means |
|---|---|
| `set the key first` | The key variable is empty in this terminal (step 1). |
| `placeholder` | Your config copy still holds `PASTE_..._HERE` (step 3); pass `--config`. |
| Run stops with a key, quota, plan or voice-id message | `401`, `402`, `403` or `404`. Check the account, the allowance, the plan and the voice id. Nothing further was sent. |
| `gave up after 6 attempts` on an item | Repeated `429` or `5xx`. Lower `--rate`, wait, run again with `--resume`. |
| Judge 3 says `no second take` | Run the take-2 render and clip commands in step 6. |
| `already rendered ... pass --resume` | Intended: it will not overwrite. Use `--resume`, or `--force` to render again (that sends the text again). |
