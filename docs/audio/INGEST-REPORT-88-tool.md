# Audio ingest report (APPLIED)

- input: `in88`; repo root: `/tmp/ingest88`
- tools: ffmpeg found, ffprobe found
- audio files found: 5; other files ignored: 1 (.csv x1)
- listing file: 6 row(s)

## Summary

| state | files | meaning |
|---|---:|---|
| applied | 5 | converted and written, manifest updated |

Matched by voice/tradition/kind: m/israeli/word 5

### Listing problems (1)

- listed but no such audio file: hf1da5ea6-7acb5f6ee5b5.wav

### Warnings on clips that passed (listen to these first) (2)

- `h9aaba801-46189243cad3.wav`: loudness after conversion -20.8 LUFS (target -16)
- `hfdbafdf6-3477435ecd25.wav`: loudness after conversion -20.0 LUFS (target -16)

## Input measurements (analysed clips)

- duration s: min 0.84, median 0.92, max 1.76
- sample rates: 24000 Hz; channels: 1; codecs: pcm_s16le
- integrated loudness LUFS: min -22.10, median -19.80, max -17.50
- peak dBFS: min -5.85, median -3.23, max -0.10
- clips with metadata/tags that conversion strips: 0

## Size budget

- already under audio/: 0.5 MB; new clips (written): 0.0 MB; total 0.6 MB against a budget of 300 MB: **within budget**
- average 7.3 KB per clip; if all 24906 manifest entries had a clip of this size, about 177 MB (a projection, not a measurement)
- per-clip cap 200 KB. The 300 MB budget is this tool's default, not a hosting-platform limit; committing clips to git makes the repository history grow by that much permanently.

## Delivery checks (precache and service worker)

- OK: tools/build-precache.mjs computeManifest(): 339 precached + 273 on-demand files, none under audio/ and none with an audio extension
- OK: precache-manifest.js (as committed) lists no audio/ file
- OK: sw.js: .mp3 matches its AUDIO pattern and is cached cache-first at runtime in "alef-runtime-v1", filled only when a clip is requested
- OK: sw.js lets Range requests go to the network uncached, so a browser that plays audio with Range requests may never fill the cache (not tested here)
- OK: tools/build-static.mjs ships audio/ in the static site folder (clips are served, not precached): hosting size counts them

## Applied

- 5 clip(s) written to audio/, each with a `.meta.json` sidecar; manifest entries set to status `synthetic-unreviewed`, source `outside-synthetic`, provenance in `synth` (not reviewed, licence not cleared). Next: `node tools/audio/build_manifest.mjs --check`, `node tools/build-precache.mjs`, run the tests, commit.

## What this report cannot tell you

- Whether the speech is correct Hebrew, the right word, the right vowels or the right tradition. Only a native listener can judge that. Every clip stays `synthetic-unreviewed` until a person has listened.
- Who made the clips, under what terms, and whether they may be redistributed or sold. The tool records `outside generator, not reviewed, licence not cleared`; get the terms in writing.
- Voice quality, accent and naturalness. The length-for-text check is a rough sanity filter only.
