# ALEF game UI SFX — media staging required

This directory is the intended **runtime-only** location for short UI effects.
It must contain the files from the approved shared staging pack:

- source: `/workspace/shared/al-heb/sfx-free/ui/*.mp3`
- mapping: `/workspace/shared/al-heb/sfx-free/ui/MAP.json`
- credits: `/workspace/shared/al-heb/sfx-free/CREDITS.md`

Those source files were **not mounted in the build environment**, so they have
**not** been copied, verified, re-encoded, or committed by this task. The UI
helper (`src/audio/sfx.js`) uses the names documented in `SFX_FILES` as
filename expectations, not as evidence that any MP3 exists. Reconcile the real
MAP.json values against that table when the actual staged assets are available.

Only use the approved original CC0 pack; do not substitute generated sounds or
production language/prayer/word clips. Keep original attribution and licence
details in this directory, verbatim from staging.

The app's `soundEffects` setting is opt-in (defaults to false); `calmMode`,
`audioFree`, and `prefers-reduced-motion` suppress feedback. Missing files
fail silently. Do not claim end-to-end audio success before loading the actual
MP3s in a browser and checking the license/manifest.

Precache constraint: the repository's `tools/build-precache.mjs` scans
`src/`, `assets/`, and `data/` (not `audio/`) and excludes MP3. Keep
all UI MP3s out of `ALEF_PRECACHE`; audio is loaded on demand by games.
