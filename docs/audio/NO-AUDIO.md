# Audio-less experience (0 recorded clips)

Three honest levels, decided by `audioAccess()` in `src/shell/audio-access.js` (re-exported from `src/shell/ui.js`):

| level | when | shown |
|---|---|---|
| file | manifest entry is recorded/tts | "Recorded by a human reader" or "Synthetic voice (Israeli only), not a recorded teacher" (src/shell/audio-labels.js) |
| device | no clip, a he-IL browser voice exists or may exist (voices not yet loaded) | "Device voice, not a recorded teacher; Israeli-style only" (never Sephardi/Ashkenazi) |
| none | no clip and no usable voice (no speechSynthesis, only non-Hebrew voices, unknown item) | "No audio yet" plus the written respelling where the view has one |

- `audioButton(h, ctx, {kind,id,label,respelling})` is the shared button: a real button only for file/device, otherwise a one-line "No audio yet".
- First-run banner (`mountAudioBanner`, called from `src/app.js`) explains the state once; dismissal is kept in localStorage `alef.audioBannerSeen.v1`.
- Tradition mismatch: the browser voice is Israeli only; `browserVoiceAnyway` still decides whether it speaks for Sephardi/Ashkenazi settings.
- Views touched (audio buttons only): `curriculum/audio-ui.js` (playButton, wording), `placement/placement.view.js`. Other views already gate on `ctx.audio.has/status` or report a "No audio" line after tapping (israel, sprint, service, morning, wordtrace, pronunciation, soundgap, vocab, themes, speak, torahread, atlas, corpus read, listen, curriculum voiceButton/ladder). Those were reviewed, not rewritten; moving them onto `audioButton` is a follow-up.
- Known limit: `plan()` ignores a caller-supplied `text`, so ids absent from the manifest report "unknown-item" (shown as "No audio yet").

Tests: `tests/audio.access.test.js` (fake audio/speech objects). Browser pass: speechSynthesis stubbed off/on, banner text verified for both; route-level button counts were not conclusive (0 on the routes tried).
