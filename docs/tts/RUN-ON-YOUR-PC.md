# Render the synthetic voices on your own GPU computer

Read this first, because it is the whole honest state of things:

- **No real audio has been generated.** Not one clip. The pipeline below was run only in `--mock` mode, where the "voice" is a sine tone. That proves the plumbing (plan, render, encode, check, manifest, labels). It says nothing about how any voice sounds.
- **Nobody has listened to anything.**
- **The quality of respelled Sephardi and Ashkenazi speech is unknown.** The idea is to give a model that only speaks Israeli Hebrew natively a Latin-letter respelling ("sound word") of the Hebrew, in a language slot such as Spanish, and hope it says the Sephardi or Ashkenazi reading. It may work badly, or only for some words. The respelling rules themselves are an untested workaround (see the header of `tools/tts/soundtext.mjs` and `docs/tts/SOUNDWORDS.md`).
- The cloud workspace this was built in has no GPU and its disk filled during an earlier model install, so the model was **not** installed or run there. Everything in this file that involves the real model is a set of commands that have not been run.
- Every clip this makes is labelled in the app as a synthetic voice that no human has reviewed, for example "Synthetic voice (Sephardi style, made from a respelling; not a recorded teacher; unreviewed)". It is never presented as a recorded teacher.

## What you need

- A computer with an NVIDIA GPU (or an Apple silicon Mac with `--device mps`; CPU works but slowly), Python 3.11, Node 20 or newer, ffmpeg and ffprobe on the path, and a clone of this repo.
- Two reference voices, one for the man and one for the woman: about 10 to 20 seconds of clean speech each, no music, **two different voices**. Use only a voice that is yours, or a donor who signed `docs/voices/donor-rights-grant.md`. The renderer refuses to start if the two reference files are the same audio, and refuses to run with no references unless you pass `--allow-default-voice` (then man and woman sound alike and nothing from that run may be shipped). Do not clone any real person's voice without that signed grant.
- Open question you will learn from the pilot: the same two reference voices are used for all three traditions. A reference recorded in an Israeli accent may pull the Sephardi and Ashkenazi output toward an Israeli sound. Nobody has checked.

## One-time setup

```bash
python3.11 -m venv ~/alef-tts-venv && source ~/alef-tts-venv/bin/activate
# NVIDIA GPU: install the CUDA build of torch first, per pytorch.org.
pip install chatterbox-tts faster-whisper
cd ~/alef                                   # your clone of the repo
node --test tests/tts.pipeline.test.js      # plumbing check in mock mode; takes a minute or two
```

Version note, from `docs/tts/README.md`: the pip release inspected earlier only loads the "v2" checkpoint of the multilingual model; the "v3" checkpoint may need the GitHub version. The renderer detects which one loaded and writes `model_name` and `model_version` into `render-log.jsonl` for every clip, and `manifest_update.mjs` copies them into the manifest.

Set two shell variables used below, and keep the work folder **outside** the repo:

```bash
export WORK=~/alef-tts-work
export REFM=~/voices/m.wav REFF=~/voices/f.wav     # your two different reference voices
mkdir -p $WORK
```

## How the choices work

| Option | Where | Meaning |
|---|---|---|
| `--tradition israeli\|sephardi\|ashkenazi\|all\|a,b` | `plan.mjs`, `render_chatterbox.py`, `run_all.sh` | Which traditions to plan or render. Default in `plan.mjs` is `israeli`; the respelled traditions are opt-in. |
| `--confidence high\|all` | same | `high` keeps only high-confidence items. For Sephardi and Ashkenazi that is the respelling engine's own rating. For Israeli it only means "the Hebrew text has vowel points"; it says nothing about how the speech will sound. Default `all`, with high-confidence items sorted first. |
| `--lang-tokens sephardi=es,ashkenazi=es` | `plan.mjs` | The language slot given to the model for sound words. Default `es`, the slot `soundtext.mjs` is written for; `it` is the other one it supports. Which slot sounds better is unknown. |
| `--voice m\|f` | `plan.mjs`, `render_chatterbox.py` | One voice only. |

Each plan item carries: clip id (kind and id), tradition, voice, the text to speak, and the language token. Israeli items speak the pointed Hebrew with language `he` (source `tts-hebrew`). Sephardi and Ashkenazi items speak the sound word with the language token (source `tts-respelled`). Letters, vowels and syllables are never synthesised in any tradition; they stay human-only. The renderer refuses any item that breaks these rules.

The automatic check (`verify.py`) listens to Israeli clips with a speech recogniser and compares them with the Hebrew text. It cannot do that for respelled clips, because their target is Latin letters, so respelled clips are only checked for length (not too short, not too long) and the report says `gate=duration-only`. A respelled clip that passes is "not obviously broken", nothing more. Your listener is the only real check.

## Recommended order

1. Israeli, high confidence, pilot of 20, then listen.
2. Israeli, high confidence, the rest.
3. Sephardi, high confidence, pilot of 20, then listen. Only if it passes, continue.
4. Ashkenazi, high confidence, pilot of 20, then listen. Only if it passes, continue.
5. Medium confidence and below only after the high-confidence pass is accepted, with a fresh listener sample.

Do not move on from a pilot that fails the listening check. If a respelled tradition fails, the respelling rules or the language slot need changing (a job for the respelling lane), and the pilot must be re-listened to after any change.

## Pilot: first 20 clips of a tradition

Replace `TRAD` with `israeli`, then later `sephardi`, then `ashkenazi`. `--voice m` gives 20 different words in the man's voice; do the woman's voice afterwards in the same way with `--voice f` and `$REFF`.

```bash
cd ~/alef && source ~/alef-tts-venv/bin/activate
TRAD=israeli
PLAN=$WORK/plan-$TRAD-pilot.json
REPORT=$WORK/report-$TRAD-pilot.csv

# 1 plan (writes into $WORK, not into the repo)
node tools/tts/plan.mjs --tradition $TRAD --confidence high --voice m --limit 20 --out $PLAN --donor-dir $WORK/donor

# 2 render on the GPU (first run downloads the model weights)
time python3 tools/tts/render_chatterbox.py --plan $PLAN --work $WORK --device cuda --ref-m $REFM --ref-f $REFF

# 3 encode to MP3 and 4 automatic check
node tools/tts/post.mjs --plan $PLAN --work $WORK
python3 tools/tts/verify.py --plan $PLAN --work $WORK --report $REPORT

# 5 preview what would be marked in the manifest (changes nothing)
node tools/tts/manifest_update.mjs --work $WORK --report $REPORT --root ~/alef --dry-run
```

The MP3s are in `$WORK/mp3/audio/m/$TRAD/...`. Listen to all 20 yourself first (silent, clipped, wrong word?), then give them to a native listener with the checklist below.

Nothing in the repo changes until you run `manifest_update.mjs` without `--dry-run`. Once you do, the app plays those clips to learners (labelled synthetic and unreviewed). So run it for a tradition only after its pilot has passed.

### Measure on the first 20 clips (do not trust any number in advance)

No time or disk figure has been measured. Fill these in from your first 20 clips:

| What | Value | How to measure |
|---|---|---|
| Disk, model weights and caches | `[measure on first 20 clips]` | `du -sh ~/.cache/huggingface ~/alef-tts-venv` |
| Disk, raw WAV per clip | `[measure on first 20 clips]` | `du -sh $WORK/raw` divided by 20 |
| Disk, MP3 per clip | `[measure on first 20 clips]` | `du -sh $WORK/mp3` divided by 20 |
| Render time per clip on your GPU | `[measure on first 20 clips]` | the `time` line above, divided by 20 |
| Encode (post) time per clip | `[measure on first 20 clips]` | `time node tools/tts/post.mjs ...` divided by 20 |
| Check (verify) time per clip | `[measure on first 20 clips]` | `time python3 tools/tts/verify.py ...` divided by 20 |

Then size the whole job (clip counts, not hours). Run this once and keep the output:

```bash
node tools/tts/plan.mjs --tradition all --out $WORK/plan-all.json --donor-dir $WORK/donor
node -e "const p=require('$WORK/plan-all.json'); console.log(JSON.stringify(p.counts))"
```

At the time of writing, in the repo state the author checked, that printed about 21,400 items in total (Israeli about 8,200, Sephardi and Ashkenazi about 6,600 each, both voices), of which about 10,200 were high confidence. Re-run it, because other work changes the manifest. Multiply by your measured seconds per clip; do not use any estimate from this file.

## Full run for one tradition, once its pilot passed

Either by hand with the same commands (drop `--limit 20`, and run `--voice m` then `--voice f`), or in one go:

```bash
tools/tts/run_all.sh --tradition $TRAD --confidence high --voice m --ref-m $REFM --ref-f $REFF
```

Note: without `--mock`, `run_all.sh` writes `tools/tts/plan.json` and `tools/tts/verify-report.csv` inside the repo. Do not commit them. The by-hand commands above write to `$WORK` instead and are the safer choice.

Everything is resumable: a finished WAV or MP3 is skipped on a re-run. Delete a file to redo it.

## 20-clip listening checklist (give one copy per tradition to a native listener)

Who listens: a native speaker who reads Hebrew in that tradition. For Sephardi and Ashkenazi, that tradition is a broad family, not one community: write down the listener's community, and treat their approval as approval of that reading only. Tradition names are too broad to certify a voice by themselves.

Method: play the 20 MP3s in a random order. Show the listener the pointed Hebrew word only (not the sound word, not which voice or tradition it is). They judge each clip against how they expect that word to be read in their tradition.

Fill the header once:

| Tradition | Listener name | Community / nusach | Date | Voice (m or f) | Reference voice approved for use? |
|---|---|---|---|---|---|

Also record, per `docs/tts/SOUNDWORDS.md` decision D5, next to the result: the sound-rule model name (`SEPH-TEXTBOOK-v1`, `ASHK-POLISH-v1`, `ISR-STD-v1`; it is in each clip's `synth.soundModel`), the language slot used, the reference speaker's community and region, which variants the listener accepted or rejected (for example cholam as oi but not ei; final or next-to-last stress), the date, and the clips sampled. No such record exists today.

Then one row per clip (20 rows). Take the clip ids and Hebrew from `$PLAN` (the first 20 items in order).

| # | Clip id | Pointed Hebrew | Heard as the intended word? (Y/N) | Vowels (ok / wrong) | Stress (ok / wrong) | Consonants (ok / wrong) | Reads as this tradition? (Y / sounds Israeli / sounds foreign / other) | Naturalness 1-5 | Usable for a learner? (Y/N) | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | | | |
| 2 | | | | | | | | | | |
| 3 | | | | | | | | | | |
| 4 | | | | | | | | | | |
| 5 | | | | | | | | | | |
| 6 | | | | | | | | | | |
| 7 | | | | | | | | | | |
| 8 | | | | | | | | | | |
| 9 | | | | | | | | | | |
| 10 | | | | | | | | | | |
| 11 | | | | | | | | | | |
| 12 | | | | | | | | | | |
| 13 | | | | | | | | | | |
| 14 | | | | | | | | | | |
| 15 | | | | | | | | | | |
| 16 | | | | | | | | | | |
| 17 | | | | | | | | | | |
| 18 | | | | | | | | | | |
| 19 | | | | | | | | | | |
| 20 | | | | | | | | | | |

Totals: usable ____ / 20. Suggested pass rule (a suggestion for you to confirm, the same one as `docs/tts/PRODUCTION-ORDER.md`): at least 18 of 20 usable, and no clip where the vowel is wrong in a way that would teach the wrong thing. Also ask: does the voice sound like a person, or like an obvious machine; and is the output labelled honestly in the app (below).

What the listener should know the model is aiming at (from the header of `tools/tts/soundtext.mjs`; these are the engine's stated targets, not verified facts about any community):

- **Israeli** (pointed Hebrew spoken directly, language `he`): the careful reading; the model's own native Hebrew. This is the baseline, so do it first. Judge vowels and stress, and whether it sounds like normal modern Hebrew.
- **Sephardi** (sound word): an idealised textbook reading, not a model of any one community: five pure vowels, stress on the last syllable by default, trilled r. Latin letters cannot write the pharyngeal chet and ayin, so the engine merges them with the Israeli sounds and flags those words `pharyngeal-merged`; a Sephardi listener may well hear no pharyngeal. Without a pharyngeal, the Sephardi sound word can be letter-for-letter identical to the Israeli one, so the Sephardi clip may be indistinguishable from the Israeli clip. That would be a failure of this method, not a fault of the listener.
- **Ashkenazi** (sound word): a Polish-type model: kamatz gadol as o, tzere as ei, cholam as oi, tav without dagesh as s, resh as r, chet and khaf as one back-of-throat sound, stress on the next-to-last syllable by default. Other Ashkenazi readings (for example Lithuanian) are not generated by default. If the listener's community reads it differently, record that rather than failing the clip silently.

Write down for the whole batch: what the voice does to the sound words (reads "j" as a Spanish j? stumbles on hyphens or accent marks? reads some words as English or Spanish words?). That is the evidence the respelling lane needs.

## Copy the results back into the repo

On the same machine as the clone, `manifest_update.mjs` (without `--dry-run`) copies the accepted MP3s into `~/alef/audio/`, writes a `.mp3.meta.json` next to each, and updates the manifest. It marks a clip only if it is accepted in the report and has a record in `render-log.jsonl` (that record supplies the sound word, language token, model name and version). Then:

```bash
cd ~/alef
node tools/tts/manifest_update.mjs --work $WORK --report $REPORT --root ~/alef      # after --dry-run looked right
node tools/audio/build_manifest.mjs --check     # must say the manifest files are current; if it says stale, run it without --check
node --test tests/audio*.test.js tests/tts.pipeline.test.js
node tools/meta/scan.mjs --text
git status                                      # review; this tooling commits nothing
```

Then commit yourself, and run your normal release step (including the precache build) before publishing.

On a different machine from the repo, pack and unpack:

```bash
# on the GPU computer
cd $WORK && tar czf alef-tts-handback.tgz mp3 render-log.jsonl report-*.csv
# on the repo machine
mkdir -p ~/alef-handback && tar xzf alef-tts-handback.tgz -C ~/alef-handback
cd ~/alef
node tools/tts/manifest_update.mjs --work ~/alef-handback --report ~/alef-handback/report-TRAD-pilot.csv --root ~/alef --dry-run
node tools/tts/manifest_update.mjs --work ~/alef-handback --report ~/alef-handback/report-TRAD-pilot.csv --root ~/alef
```

`render-log.jsonl` must travel with the MP3s: without it a clip has no provenance and is not marked.

## What the manifest and the app say about each clip

In the manifest each clip made here has `status: "synthetic-unreviewed"` and `source: "tts-hebrew"` (Israeli) or `"tts-respelled"` (Sephardi, Ashkenazi), plus a `synth` object: sound word, sound-rule model name, language token, model name and version, confidence, flags, which check it passed, and a short digest of the reference voice file (not its name or path). Tradition and voice are the entry's own fields. The sidecar `.mp3.meta.json` repeats this and carries `reviewed: false`.

`synthetic-unreviewed` becomes `synthetic-reviewed` only when a person marks it so by editing the sidecar and the manifest by hand; there is no tool for that yet, and nothing here does it automatically. The tool never writes `recorded`, and never overwrites a human recording or a `synthetic-reviewed` clip. A later human recording replaces a synthetic clip through `tools/record-kit/ingest.mjs`, which drops the `synth` record.

The app reads these labels from `src/shell/audio-labels.js`:

- "Synthetic voice (Sephardi style, made from a respelling; not a recorded teacher; unreviewed)"
- "Synthetic voice (Ashkenazi style, made from a respelling; not a recorded teacher; unreviewed)"
- "Synthetic voice (Israeli style, made from pointed Hebrew; not a recorded teacher; unreviewed)"

The browser's own device voice is unchanged and stays Israeli-only: a learner set to Sephardi or Ashkenazi with no clip gets "No audio yet", not a device voice reading Israeli Hebrew.

## Stop and ask someone if

- Any pilot clip is silent, clipped, or says a different word.
- The two reference voices sound the same, or you are unsure the donor signed the grant.
- The Sephardi pilot sounds identical to the Israeli one, or the Ashkenazi pilot does not sound Ashkenazi to the listener. Do not scale; report what the voice did with the sound words.
- The disk fills. Delete the model cache you do not need and the `$WORK/raw` WAVs of clips already encoded and handed back.
