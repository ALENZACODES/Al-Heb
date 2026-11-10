# Audio ingest report (APPLIED)

- input: `ingest83-in`; repo root: `/tmp/ingest83`
- tools: ffmpeg found, ffprobe found
- audio files found: 82; other files ignored: 0
- listing file: 83 row(s)

## Summary

| state | files | meaning |
|---|---:|---|
| applied | 82 | converted and written, manifest updated |

Matched by voice/tradition/kind: m/israeli/word 82

### Listing problems (1)

- listed but no such audio file: hf1da5ea6-7acb5f6ee5b5.wav

### Warnings on clips that passed (listen to these first) (27)

- `h07a5230b-8ffe6d6457b9.wav`: loudness after conversion -19.9 LUFS (target -16)
- `h0986ff35-d4845efbfa44.wav`: loudness after conversion -19.2 LUFS (target -16)
- `h32049c3e-5921869fa040.wav`: loudness after conversion -21.4 LUFS (target -16)
- `h378062a7-8e835cc63142.wav`: loudness after conversion -24.3 LUFS (target -16)
- `h4a3da4c1-8af7e2101ea4.wav`: loudness after conversion -20.1 LUFS (target -16)
- `h524e52f1-b9f3da6a2ace.wav`: loudness after conversion -22.8 LUFS (target -16)
- `h57072da4-5105d60b509f.wav`: loudness after conversion -21.8 LUFS (target -16)
- `h68594418-77c7ff6062f5.wav`: loudness after conversion -19.9 LUFS (target -16)
- `h850a3966-0762df8ebbb7.wav`: loudness after conversion -19.9 LUFS (target -16)
- `h899d2134-c6152cb79cd1.wav`: loudness after conversion -23.0 LUFS (target -16)
- `ha7e21a82-aed7e0804d8e.wav`: loudness after conversion -19.2 LUFS (target -16)
- `haccb2ff3-a955cf0921a8.wav`: loudness after conversion -19.9 LUFS (target -16)
- `hf5f3eb91-b92e7c898a1a.wav`: loudness after conversion -19.9 LUFS (target -16)
- `hff9ae755-ce3869531307.wav`: loudness after conversion -19.5 LUFS (target -16)
- `i-17-w9-95986151188c.wav`: loudness after conversion -21.6 LUFS (target -16)
- `i-18-w10-245550cd9fcd.wav`: loudness after conversion -21.6 LUFS (target -16)
- `i-18-w6-ac29e253e764.wav`: loudness after conversion -21.9 LUFS (target -16)
- `i-19-w9-193f1c80acfd.wav`: loudness after conversion -19.1 LUFS (target -16)
- `i-21-w1-3c6459b74219.wav`: loudness after conversion -19.4 LUFS (target -16)
- `i-38-w3-d35f4330506a.wav`: loudness after conversion -20.4 LUFS (target -16)
- `il07-w6-c37d0ed06dfb.wav`: loudness after conversion -70.0 LUFS (target -16)
- `il10-w4-6d6bf4596050.wav`: loudness after conversion -20.7 LUFS (target -16)
- `il17-w3-0a955838eee2.wav`: loudness after conversion -20.9 LUFS (target -16)
- `il23-w2-acc6c1ddd028.wav`: loudness after conversion -20.9 LUFS (target -16)
- `numbers-04-m-b4d544c36a73.wav`: loudness after conversion -23.5 LUFS (target -16)
- `r07-w1-787bf52db52a.wav`: loudness after conversion -70.0 LUFS (target -16)
- `r38-w4-02a8919e4a4c.wav`: loudness after conversion -20.7 LUFS (target -16)

## Input measurements (analysed clips)

- duration s: min 0.56, median 0.88, max 2.80
- sample rates: 24000 Hz; channels: 1; codecs: pcm_s16le
- integrated loudness LUFS: min -28.10, median -20.10, max -16.40
- peak dBFS: min -7.97, median -3.04, max 0.00
- clips with metadata/tags that conversion strips: 0

## Size budget

- already under audio/: 0.0 MB; new clips (written): 0.5 MB; total 0.5 MB against a budget of 300 MB: **within budget**
- average 6.6 KB per clip; if all 24906 manifest entries had a clip of this size, about 160 MB (a projection, not a measurement)
- per-clip cap 200 KB. The 300 MB budget is this tool's default, not a hosting-platform limit; committing clips to git makes the repository history grow by that much permanently.

## Delivery checks (precache and service worker)

- OK: tools/build-precache.mjs computeManifest(): 339 precached + 273 on-demand files, none under audio/ and none with an audio extension
- OK: precache-manifest.js (as committed) lists no audio/ file
- OK: sw.js: .mp3 matches its AUDIO pattern and is cached cache-first at runtime in "alef-runtime-v1", filled only when a clip is requested
- OK: sw.js lets Range requests go to the network uncached, so a browser that plays audio with Range requests may never fill the cache (not tested here)
- OK: tools/build-static.mjs ships audio/ in the static site folder (clips are served, not precached): hosting size counts them

## Applied

- 82 clip(s) written to audio/, each with a `.meta.json` sidecar; manifest entries set to status `synthetic-unreviewed`, source `outside-synthetic`, provenance in `synth` (not reviewed, licence not cleared). Next: `node tools/audio/build_manifest.mjs --check`, `node tools/build-precache.mjs`, run the tests, commit.

## What this report cannot tell you

- Whether the speech is correct Hebrew, the right word, the right vowels or the right tradition. Only a native listener can judge that. Every clip stays `synthetic-unreviewed` until a person has listened.
- Who made the clips, under what terms, and whether they may be redistributed or sold. The tool records `outside generator, not reviewed, licence not cleared`; get the terms in writing.
- Voice quality, accent and naturalness. The length-for-text check is a rough sanity filter only.
