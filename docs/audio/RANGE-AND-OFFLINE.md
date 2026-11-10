# Audio clips: Range requests and offline play

Measured 2026-11-05 on this repo's files. What was run and what was not is listed at the end. Nothing here says a clip was heard by a person.

## The problem that was found
A page that plays a clip with `new Audio(url).play()` makes the browser ask for `Range: bytes=0-`. The service worker used to return early for every request with a `Range` header, so the clip came from the network, was never put in the cache, and a learner who had already heard it got a media error offline (the app then falls back to the device voice, or to "No audio yet").

Reproduced with headless chromium 153.0.8010.12 in this sandbox (real Chromium, real service worker, local server that honours Range like a static host), on `#/words/trace?any=1&word=תֵּה`, clip `audio/m/israeli/word/il07-w6.mp3` (2,716 bytes):

| | old `sw.js` | new `sw.js` |
|---|---|---|
| Request Chrome sent | `GET ... Range: bytes=0-`, host answered 206 | same |
| Clip in `alef-runtime-v1` after playing once | no | yes, one full 200 entry, 2,716 bytes |
| Extra request to the host | none | one plain GET, made by the worker in the background |
| Offline reload, press Hear again | media element error code 4, no sound | media element reached `ended`, zero requests to the host |

Repeat with `node tools/qa/sw-range.mjs` (needs Playwright and Chrome; `QA_CHROME=/path` to pick a binary; `--json out.json` to save the record).

## What `sw.js` does now
Only for same-origin GET requests whose path ends in `.mp3 .m4a .ogg .wav` and that carry a `Range` header:
1. If a full copy is in `alef-runtime-v1`, answer from it: a 206 slice for `bytes=a-b`, `bytes=a-`, `bytes=-n` (end clamped to the file), 416 for an unsatisfiable start, and the whole file as 200 for anything it does not parse (for example several ranges). No network.
2. Otherwise pass the request to the network unchanged. When the answer is a 206 with a known total size, or a 200, and the total is at most 512 KiB (`MAX_CLIP_BYTES`), fetch the whole file once in the background (`event.waitUntil`) and store it as a normal 200. A 206 is never stored (the Cache API refuses it, and a partial body would poison later plain GETs). A failed background fetch is dropped silently; the next play tries again. One background fetch per URL at a time.
3. Offline and not cached: the request fails, exactly as before. The app's existing fallback applies.

Range requests for anything else (images, pdf, video, data) still bypass the worker as before. Plain (non-Range) audio GETs are still cache-first.

## Limits (all in `sw.js`, tested in `tests/sw.range.test.js`)
- Per-file cap: 512 KiB. A bigger file is never cached by the worker (it plays online only). Today's 87 synthetic clips are 2.7 to 21.6 KiB, 581 KiB in all.
- Count cap: 600 clips in `alef-runtime-v1`. When a store pushes it over, the oldest-inserted entries are deleted (Cache `keys()` is in insertion order; this is oldest-stored, not least-recently-played). A cap by count, not by bytes: at the 512 KiB per-file limit 600 files would be 300 MiB in the worst case, at today's sizes about 4 MiB.
- Nothing is cached at install. The clips are not in `precache-manifest.js`; `tests/sw.range.test.js` and the delivery audit in `tools/audio/ingest.mjs` both check that.
- The cache is only filled by a clip the learner actually played (or fetched through a plain GET). There is no "download all clips" button.

## What is NOT offline
- A clip the learner never played on this device.
- Any clip over 512 KiB.
- Clips evicted past 600.
- Clips after the browser clears site data. Safari may clear script-writable storage after about a week without use unless the app is installed (from Apple's WebKit tracking-prevention notes; not re-verified here).
- The lazy data a view needs to find the clip (`data/audio/manifest.json`, the word shard, `data/wordtrace/words.json`). They are runtime-cached only when fetched through the worker. Data the page fetched on the very first load, before the worker took control, is not in any cache until the next online load (seen in the probe: the first offline attempt after one load showed "Could not load the word data"; after a second online load it worked). The "Download for offline" card is the supported way to fetch them all.
- A page that is not already in the shell cache.

## Not tested
- Real Safari or iOS. Safari is known to send a `bytes=0-1` probe first and then more ranges; the worker handles any single range from a cached full copy, and the first probe on an uncached clip is passed to the network and triggers the same background fill, but none of this ran on WebKit. Do not rely on it until it is tried on a phone.
- Seeking inside a cached clip in a real browser (unit tests cover the slicing; the Chrome probe only played from the start).
- Firefox, Chrome on Android, an installed PWA, low-storage eviction, two tabs playing the same uncached clip at once.
- Audio output: headless Chrome plays to nothing. "Played" means the media element reached `ended`.
- Behaviour on the real host. `tools/serve.mjs` does not honour Range (it always answers 200), which is why the probe has its own server; Cloudflare Pages is expected to honour it but nothing here was deployed.
