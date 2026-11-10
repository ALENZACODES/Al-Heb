# Israeli voice: why clips sounded wrong on 2026-11-07, and the fix

Report of a read-through of the audio pipeline after the maintainer heard words such as *shalom* pronounced wrongly and some clips not loading, where they had been right the day before. Everything below was checked in the repository at `main` 670b400c; nothing was listened to here (no speaker in this environment), so the voice finding is an inference from the code and the commit history, marked as such.

## What was checked

| Question | Finding | How |
|---|---|---|
| Is the voice fed Hebrew or transliteration? | Hebrew with vowel points, for every clip. `r03-w1` (the lesson word *shalom*) is sent as `שָׁלוֹם`; the `phonetic` field is only a label. | `data/audio/manifest-kind-word.json`, `tools/audio/tts/google.mjs` |
| Which voices were approved? | `he-IL-Wavenet-B` (man) and `he-IL-Wavenet-A` (woman), Israeli Hebrew, passed for production by the maintainer on 2026-11-05. | `docs/audio/CASTING-REPORT.md` rows 14–15, 39–40 |
| Which voice did the renderer default to? | The multilingual "Chirp 3: HD" pair (Charon, Kore), chosen as an "arbitrary listening-test pick" and never changed. These voices read Hebrew without custom pronunciation or pause control and take no SSML. | `tools/audio/tts/google.mjs` before this change |
| What changed on 2026-11-07? | Four commits "Prayers: upgrade the prayer clips to the high-grade voices" replaced 124 prayer clips (62 ids × 2 voices) in place: same paths, new bytes, about 18% longer, sidecars still say only `tts:google` with no voice name. "HD" is the vendor's name for the Chirp 3 tier. | `git show --stat 6e1c8bcc 7c467e9c 04f5f4c8 739b5ba4` |
| Do the manifests match the files? | Yes. 0 entries claim a file that is absent; 5 entries say `missing` for a file that exists; the Israeli word set has 3 + 2 missing out of 6,174 + 3,776. The 800 missing core entries are all Sephardi/Ashkenazi letters, vowels, syllables and prayers (human-only by design). | cross-check script, this report's commit |
| What text marks go to the voice unchanged? | 282 Israeli rows end in a sof pasuq (`׃`), 169 carry a maqaf (`־`), 57 end in a full stop or colon. 27 `letter-lecture` "-he" rows mix English phrases into Hebrew sentences. | `node tools/audio/text_audit.mjs` |
| Why might a clip not load? | (a) The player plays a file only when the manifest lists it; everything else goes to the phone's own Hebrew voice, which varies by device and is often absent on Android. (b) The core manifest and its word shard load together after first paint; if either fetch fails the whole list is treated as unavailable and every clip falls back to the phone voice until a retry. (c) A clip already played is served from the worker's cache first and was never checked against the host again, so a replaced clip stayed old on that phone. | `src/audio/player.js`, `src/shell/audio-manifest.js`, `sw.js` |

Most likely cause of the regression, in order of evidence: the 124 prayer clips were re-rendered through the HD default rather than the approved Israeli WaveNet voices. The lesson-word *shalom* clips (`r03-w1`, `r04-w2`, `r04-w3`) were not touched that day; if those also sound wrong on a phone, the phone-voice fallback (b) is the thing to look at: open Settings → the sound line, which reports whether the manifest loaded.

## What changed in this commit

1. **Approved voices are the default.** `tools/audio/tts/google.mjs` now defaults to `he-IL-Wavenet-B` / `he-IL-Wavenet-A`. An HD voice is refused unless asked for by name with `allowHd: true` (or `GOOGLE_TTS_ALLOW_HD=1`). Price constant corrected to the WaveNet rate (US$16 per million characters).
2. **Text is cleaned before it is spoken.** `cleanHebrewForTts()` removes cantillation, meteg, rafe, paseq and sof pasuq, turns a maqaf into a space and drops a trailing full stop or colon; vowel points, dagesh, shin/sin dots and question/exclamation marks stay. `textWarnings()` flags unpointed Hebrew and Latin mixed into Hebrew; the batch renderer skips those rows unless told otherwise.
3. **Batch renderer** (`tools/audio/render_tts.mjs`): `--voice both`, `--ids <file>`, `--redo` (replace existing files), loudness normalization to the repo's delivery format (mono 44.1 kHz 96 kbps, −16 LUFS) right after the render, and the voice name plus the exact spoken text written into each `.meta.json`, so the next person can tell which voice made a clip.
4. **Redo list**: `docs/audio/redo-israeli-2026-11-07.txt` holds the 62 prayer ids replaced on 2026-11-07.
5. **Service worker**: a clip served from the cache is revalidated once per worker lifetime while online (conditional GET in the background); if the host has different bytes the cached copy is replaced, so a re-rendered clip reaches a phone that already played the old one on the next play. Offline behaviour is unchanged (tests: `tests/sw.range.test.js`).
6. **Audit tool**: `node tools/audio/text_audit.mjs` lists the rows above.

## How to regenerate the 124 prayer clips with the approved Israeli voices

Needs a Google Cloud Text-to-Speech API key in `GOOGLE_TTS_API_KEY` and `ffmpeg` on the path. Cost at list price: 124 clips, 18,664 characters, about US$0.30 (the first million characters a month are free).

```sh
# 1. see exactly what will be sent (no network)
node tools/audio/render_tts.mjs --provider google --voice both --kinds prayer --ids docs/audio/redo-israeli-2026-11-07.txt --redo

# 2. render, normalize, write sidecars with the voice name
GOOGLE_TTS_API_KEY=... node tools/audio/render_tts.mjs --provider google --voice both --kinds prayer --ids docs/audio/redo-israeli-2026-11-07.txt --redo --execute

# 3. listen to a few before pushing (the ones with shalom first)
#    audio/m/israeli/prayer/oseh-shalom.mp3  audio/f/israeli/prayer/sim-shalom.mp3  audio/m/israeli/prayer/bless-priestly-3.mp3

# 4. commit as John Khan; the manifest entries already point at these paths, so nothing else changes
```

To re-render any other set the same way, put its ids in a text file and pass `--ids`; to render the still-missing Israeli clips, drop `--ids` and `--redo`.

## Still open

- Nobody has listened to the 124 new clips side by side with the 2026-11-06 production. The regeneration above is the test: if the WaveNet render sounds like the 11-06 clips, the diagnosis holds.
- `tools/audio/build_manifest.mjs` no longer reproduces the committed manifests (a rebuild would relabel 1,492 synthetic clips as `recorded` and drop 216 entries). The manifests are maintained by `tools/tts/manifest_update.mjs` and `tools/audio/apply-clip-labels.mjs`; do not run the builder until it is brought back in step.
- 27 `letter-lecture` Hebrew explanations contain English phrases; they need a Hebrew rewrite before rendering.
- The 1,488 book clips and 370 arcade clips are not in any manifest (their views load them by path); `tests/audio.truth.test.js` fails on that gap.
