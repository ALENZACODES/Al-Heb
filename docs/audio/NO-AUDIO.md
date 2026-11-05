# Audio-less experience (0 recorded clips)

Three honest levels, decided by `audioAccess()` in `src/shell/audio-access.js` (re-exported from `src/shell/ui.js`):

| level | when | shown |
|---|---|---|
| file | manifest entry is recorded/tts or synthetic (incl. outside-source clips, labelled "outside generator ... unreviewed") | "Recorded by a human reader" or "Synthetic voice (Israeli only), not a recorded teacher" (src/shell/audio-labels.js) |
| device | no clip, a he-IL browser voice exists or may exist (voices not yet loaded) | "Device voice, not a recorded teacher; Israeli-style only" (never Sephardi/Ashkenazi) |
| none | no clip and no usable voice (no speechSynthesis, only non-Hebrew voices, unknown item) | "No audio yet" plus the written respelling where the view has one |

- `audioButton(h, ctx, {kind,id,label,respelling,text,name})` is the shared button: a real button only for file/device, otherwise a one-line "No audio yet". `text` is the pointed Hebrew the screen shows (the device voice may read it when the item is not in the recording list); `name` is added to the accessible name (e.g. the English gloss) so a list of Listen buttons does not repeat one name.
- One sound bar at the top (`.sound-bar` in `index.html`, wired by `wireSoundBar` in `src/shell/audio-access.js`, called from `src/app.js`): the status sentence, a "Details" link to `#/how` and a dismiss button. Dismissal is kept in localStorage `alef.audioBannerSeen.v1`; the bar returns for a non-idle status (e.g. the recording list could not be loaded).
- Tradition mismatch: the browser voice is Israeli only; `browserVoiceAnyway` still decides whether it speaks for Sephardi/Ashkenazi settings.
- Views on the shared button: `curriculum/audio-ui.js` (playButton, wording), `placement/placement.view.js`, `vocab/vocab.view.js` (word list) and `vocab/themes.view.js` (theme packs). Vocabulary and theme packs used to call the browser voice directly; they now go through the player, so the same rules apply as everywhere else: the device voice is Israeli only (a Sephardi or Ashkenazi setting shows "No audio yet" plus the respelling when "Use my browser's voice anyway" is off; it is on by default, and then the button is labelled "Device voice, not a recorded teacher; Israeli-style only"), and the liturgical-name check runs before anything is spoken.
- Still on their own buttons (they gate on `ctx.audio.has/status` or report a "No audio" line after tapping): israel, sprint, service, morning, wordtrace, pronunciation, soundgap, speak, torahread, atlas, corpus read, listen, curriculum voiceButton/ladder, first day. Moving them is a follow-up.
- Caller text: `plan()` accepts `o.text` as a last resort, after every file step and after the manifest's own text. So an id that is not in the recording list can still use the device voice with the text the screen shows, under the same Israeli-only and name checks (tests: `tests/audio.access.test.js`, "caller text").

Tests: `tests/audio.access.test.js` (fake audio/speech objects). Browser pass: speechSynthesis stubbed off/on, banner text verified for both; route-level button counts were not conclusive (0 on the routes tried).
