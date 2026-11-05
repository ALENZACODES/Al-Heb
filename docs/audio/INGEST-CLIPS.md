# Ingesting a batch of clips from an outside source

Status: `tools/audio/ingest.mjs` is built and tested on generated tones, silence and clipped waves only (`tests/audio.ingest.test.js`). It has never seen a real batch, real speech, or the real folder layout; the matching rules below are guesses at common layouts, and the dry run exists so you can see what it makes of the real one before anything changes. Nothing here says anything about whether the speech is correct Hebrew.

## What you need

- Node 20+ (the repo's own), and `ffmpeg` and `ffprobe` on PATH. Without them the tool still runs, reads `.wav` files with a built-in reader, and says in its report that everything else was **not analysed**; `--apply` then refuses to convert.
- A folder, or a `.zip` (needs the system `unzip`; otherwise extract it yourself and pass the folder). Put it **outside** the repo.
- A clean working tree on a fresh branch (`git status` empty). `git fetch` and rebase before you push.

## Steps when the clips arrive

1. **Look at what came.** Note the file types, how files are named, and whether a listing (CSV or JSON) came with them. Ask the supplier, in writing: who made the clips, with what, under what terms, may they be redistributed or sold, and is the voice a real person's clone (and if so with a signed grant). The tool records "outside source, not reviewed, licence not cleared"; it cannot find these answers out.
2. **Dry run** (writes nothing):
   ```bash
   node tools/audio/ingest.mjs /path/to/clips --report /tmp/ingest-report.md --json /tmp/ingest.json
   ```
   Add `--listing /path/to/list.csv` if there is a listing. If file names do not say voice or tradition, add defaults: `--voice m`, `--tradition israeli`, `--kind word` (a default only fills a dimension the file name and folders leave open).
3. **Read the report top to bottom.** Fix the input, not the tool, where you can (rename, re-export, ask for a listing). The sections that matter:
   - Summary table: `ready` is what would be written. `unmatched` (no id in the name), `ambiguous` (several entries fit; for example `r01-w1.wav` with no voice or tradition, or `shema-1` which is both a `line` and a `prayer`), `duplicate-target` (two files for one entry), `rejected` (failed a check), `protected` (the entry is a human or reviewed clip), `exists`, `human-only` (letters, vowels and syllables are never taken from a synthetic source).
   - Warnings on clips that passed: listen to these first.
   - Size budget, conversion sample and delivery checks.
4. **Re-run** until the counts are what you expect. `--strict` makes warnings reject too. `--replace` lets a new clip overwrite an older *synthetic* one (never a recorded or reviewed one).
5. **Apply:**
   ```bash
   node tools/audio/ingest.mjs /path/to/clips --apply --batch "<neutral label, e.g. 2026-11 batch 1>" --report docs/audio/INGEST-REPORT.md
   ```
   Keep `--batch` and any `--batch-note` free of tool and company names: they are written into tracked files.
6. **Verify:**
   ```bash
   node tools/audio/build_manifest.mjs --check     # must say "manifest files are current"
   node tools/audio/coverage.mjs                   # synthetic count should have grown by the applied number
   node tools/meta/scan.mjs && node tools/meta/scan.mjs --text
   node tools/build-precache.mjs                   # only if src/, assets/ or data/ changed (the manifest files did); commit the result
   node tools/test/run.mjs unit
   ```
7. **Spot-listen before anyone else does.** Play a sample from each voice and tradition on a phone through the real app. Note wrong words, wrong vowels, wrong tradition, glitches. Delete a clip and set its manifest entry back to `missing` (and delete its `.meta.json`) if it is bad; a re-run of `build_manifest.mjs` reads the sidecars, so remove the sidecar too.
8. **Commit** (`audio/` is large: see "Size" below), push in small steps. Clips go into the repo only after the supplier's terms are known.

## Matching rules (file name to manifest entry)

A clip is identified by four things: voice (`m`, `f`), tradition (`israeli`, `sephardi`, `ashkenazi`), kind (`word`, `line`, `prayer`, `letter`, `vowel`, `syllable`) and id (`r01-w1`, `shema-1`, ...). The manifest path is `audio/<voice>/<tradition>/<kind>/<id>.mp3`.

- Case and extension are ignored (`R01-W1.WAV` = `r01-w1.mp3`). Audio extensions read: wav, mp3, ogg, oga, opus, m4a, aac, flac, webm. Other files are ignored and counted.
- Folder names that are a voice (`m`, `male`, `man`, `f`, `female`, `woman`), a tradition (`israeli`/`isr`/`il`, `sephardi`/`sep`, `ashkenazi`/`ash`/`ashk`) or a kind set that dimension; the deepest folder wins. The full manifest layout (`audio/m/israeli/word/r01-w1.mp3`) therefore matches exactly.
- The same words may also be peeled from either end of the file name, separated by `_`, `.`, `-` or space: `r01-w1_sephardi_f.ogg`, `ashkenazi-male-r01-w2.m4a`.
- A leading or trailing running number is ignored (`0007_r01-w2.wav`).
- What is left must be exactly a manifest id (ids contain hyphens; that is fine). If the folder and the name disagree, the file is ambiguous.
- Still open dimensions are filled from `--voice`, `--tradition`, `--kind`. If more than one entry remains, the file is **ambiguous** and is not written. The tool never picks one.
- A listing (`--listing`, csv or json) can give per file: `file` (or `filename`), and either `id` (with optional `voice`, `tradition`, `kind`) or `path` (a full manifest path starting `audio/`). If it has a `text` column with Hebrew, the consonants are compared with the manifest text and a mismatch rejects the clip. JSON may be an array of such objects or a map `{"file.wav": "id"}` or `{"file.wav": {"path": ...}}`. Files the listing does not mention are still matched by name.
- Two files for one entry: both are held back (`duplicate-target`).
- A listing row whose file is not in the folder is reported.

If the real layout does not fit these rules, do not edit the tool at 3 a.m.: write a small rename script, run it on a copy of the folder, and dry-run again.

## What the checker catches

Per matched clip (needs ffmpeg for non-WAV; WAV works without):

- Unreadable or truncated files, no audio stream.
- Too short (under 0.2 s) or too long (over 20 s); both limits are options.
- Silent clips (peak below -60 dBFS) and inaudibly quiet clips (below -50 LUFS).
- Clipping: more than 0.5% of samples at full scale rejects; any run of three or more at full scale warns.
- Odd shape (warnings): long silence at the start or end (trimmed on conversion), a silent gap over 1 s inside the clip (two clips joined, or cut speech), mostly silence, one dead stereo channel, low sample rate, loudness far from normal (it is normalised anyway).
- A rough sanity check on length against the number of letters in the text (warnings only): a one-second clip for a long line, or a ten-second clip for one letter.
- Byte-identical files matched to different entries (a generator repeating one clip).
- Metadata: tags, cover art and encoder strings are reported in the input and **removed** on conversion. The output is verified with `ffprobe` and a byte scan: mono, 44.1 kHz, MP3, no ID3, no Xing/Info header, no `LAME`/`Lavf` string (same encoder and checks as `tools/tts/post.mjs`; loudness -16 LUFS, true peak limit -1.5 dBTP, 64 kbps CBR).
- File names: output names are the manifest's own (`audio/m/israeli/word/r01-w1.mp3`). The sidecar `<clip>.mp3.meta.json` stores a SHA-256 of the input, never the original file name or tags.

## What it cannot catch

- **Whether the speech is correct Hebrew.** Wrong word, wrong vowels, a mispronounced letter, English read in a Hebrew voice, a different word than the id: none of this is detectable here. Only a native Hebrew listener can say. Plan a listening pass (see `docs/voices/tts-evaluation-protocol.md`) before treating any of it as good.
- Whether a Sephardi or Ashkenazi clip really sounds Sephardi or Ashkenazi. The file name claims a tradition; nothing verifies it. The in-app label says "style not verified".
- Voice quality, naturalness, background noise that is not silence, music, a second speaker.
- Who made it, the terms, and any voice-clone rights. Not a technical question.
- Whether a clip is the right length for its text beyond the crude check above.

## How the app labels these clips

`--apply` writes `status: "synthetic-unreviewed"` and `source: "outside-synthetic"`, plus `synth: { origin, reviewed: false, redistributionCleared: false, licence: "unknown: not cleared", batch, note, inputSha256, ingestedAt, ingestedBy }` into the manifest entry and the sidecar. It never writes `recorded` and never touches an entry that is `recorded` or `synthetic-reviewed`. It also updates `data/audio/summary.json`. `node tools/audio/build_manifest.mjs --check` passes afterwards (the sidecar reproduces the same entry; checked on a scratch copy with two tone clips).

`src/shell/audio-labels.js` shows: "Synthetic voice (outside generator; <Tradition> style not verified; not a recorded teacher; unreviewed)". It does not claim the clip was made from pointed Hebrew or a respelling, because nobody knows. The player now passes the manifest `source` through (`entrySource`) so the label can say this. `synthetic-reviewed` stays a manual edit by a person who has listened.

Isolated letters, vowels and syllables (`HUMAN_ONLY_GROUPS` in `tools/audio/coverage.mjs`) are reported as `human-only` and not written, as for the other synthetic route (`--allow-human-only-groups` overrides this on purpose).

## Size and delivery

- The clips live in `audio/` at the repo root. `tools/build-precache.mjs` only walks `src`, `assets` and `data`, and also skips `.mp3 .wav .ogg .m4a`, so they are not in the precache. `sw.js` handles `.mp3` cache-first in the runtime cache (`alef-runtime-v1`), filled when a clip is first requested. The dry run reads both files and prints the result; the test checks the real ones. A real Chrome run is recorded in [`RANGE-AND-OFFLINE.md`](RANGE-AND-OFFLINE.md): Chrome asks for clips with a Range request, and `sw.js` now fills the cache for those (small files only) and serves cached clips as 206 slices. Not tested: Safari or iOS.
- `tools/build-static.mjs` includes `audio/` in the static site folder, so hosting size counts the clips.
- Budget: the tool counts what is already in `audio/` plus the estimate for the new clips (64 kbps, about 8 KB per second) against `--budget-mb` (default 300, a default of this tool and not a platform limit) and a per-clip cap `--max-clip-kb` (default 200). Over budget: the dry run exits 1 and `--apply` refuses unless `--over-budget-ok`. The dry run also projects the size if every manifest entry had a clip like these; that is arithmetic, not a measurement.
- **Decision for you:** committing hundreds of MB of MP3 to git grows the repository history permanently (the repo is already large, and history rewrites are not allowed here). Consider whether the clips should be committed at all or hosted separately; the app only needs the manifest paths to resolve.

## Options

`--root`, `--listing`, `--voice`, `--tradition`, `--kind`, `--report`, `--json`, `--min-sec`, `--max-sec`, `--min-rate`, `--max-clip-pct`, `--max-clip-kb`, `--budget-mb`, `--over-budget-ok`, `--strict`, `--replace`, `--allow-human-only-groups`, `--try-convert N` (dry run: convert N sample clips in a scratch folder, delete them, report measured size and loudness; default 3), `--jobs`, `--max-list`, `--batch`, `--batch-note`, `--no-delivery-check`. Exit codes: 0 fine; 1 over budget, delivery check failed, conversion error or failed sample; 2 usage or unreadable input.
