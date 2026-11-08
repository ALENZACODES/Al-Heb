# Opening prayer veil: sound, Nov 7 2026

Owner report: on the main page "Listen to this prayer" does not work, and the prayer should play by itself.

## What headless Chromium showed before the change

Driver: Playwright against `/usr/bin/google-chrome`, served by `tools/serve.mjs`, service worker blocked, `--mute-audio`, `HTMLMediaElement.prototype.play` wrapped to log the verdict.

- The Listen button is `hidden` only until `data/homepage/prayers.json` resolves (about 0.7 s after `domcontentloaded` here); from then on it is visible and `elementFromPoint` at its centre is the button at 320, 360, 390 and 430 px wide.
- Clicking Listen worked in Chromium: `play()` resolved about 130 ms after the click under the default autoplay policy (a click is a gesture) and under `--autoplay-policy=no-user-gesture-required`. The listen counter moved to 1. The veil then closed 1 s after `ended`. The 160 veil clips are 2.3 to 6 s long, so the whole experience after a tap lasted 3 to 7 s.
- Nothing played without a tap. The veil closed on its 6 s (returning) or 9 s (first visit) dwell, so a learner who did not find and tap the small pill in time heard nothing. That is the most likely reading of "does not work" on a phone.
- At 320 px wide (iPhone SE class) the Listen pill (x 19 to 171) and the Skip pill (x 149 to 301) overlapped by 22 px on the same row; Skip comes later in the DOM at the same z-index, so a tap on the right third of "Listen to this prayer" hit Skip and closed the veil. At 360 px and up they did not overlap.
- `alef-prayer-skip` has no handler of its own; its click bubbles to the veil's click-to-dismiss, which is the intended behaviour and works.
- Not reproduced here: a stale `prayers.json` served by an older service worker (the file is precached per version, so an un-activated update keeps the old copy, which has no `audio` map and leaves Listen hidden), and an iPhone with the ring/silent switch on, which mutes `<audio>` with no error. Both would read as "Listen does nothing".

## What changed

`src/shell/prayer-veil.js`, `index.html` (one `<p id="alef-prayer-audio-prompt">` and `aria-pressed` on Listen), `assets/css/astral-home.css`.

- When the prayer renders and a clip exists for it (learner's voice setting, woman by default; none when `audioFree` is on), `audio.play()` is attempted at once.
- If the browser rejects with `NotAllowedError` (autoplay policy), the veil shows "Tap anywhere to hear the prayer" (`data-audio-state="blocked"`); the first `pointerdown` or a key other than Escape/Tab/modifiers on the veil starts the clip and does not dismiss the veil (the click that follows that pointerdown is swallowed once). Buttons keep their own meaning: Skip, Close, Don't show again and Escape still dismiss; Listen starts the clip.
- While the clip plays the veil holds (18 s ceiling as before) and closes 1 s after `ended`. Listen toggles: "Listen to this prayer" / "Pause the prayer" / "Continue the prayer", with `aria-pressed`. A hand pause lets the veil close on a 4 s dwell unless Continue is tapped.
- The Awards listen counter (`LISTEN_COUNT_KEY`) moves once per prayer, only after `play()` resolved; a refused or failed play never counts, and pause/continue does not count again.
- `prefers-reduced-motion`: the prompt's pulse is covered by the existing `animation: none` rule for every veil descendant, and dismissal removes the veil at once as before. The clip still plays: reduced motion is about motion, not sound.
- Under 360 px the Listen pill moves one row up so it no longer shares a row with Skip.

## What headless Chromium showed after the change

Same driver. Each line is one fresh profile.

- Default autoplay policy, no interaction: `play()` rejected with `NotAllowedError` about 250 ms after navigation; state `blocked`, prompt visible, Listen visible; veil closed on the 9 s first-visit dwell; counter untouched.
- `--autoplay-policy=no-user-gesture-required`, no interaction: `play()` resolved about 50 ms after `domcontentloaded`; state `playing`; veil closed about 5.6 s after load (clip length plus 1 s); counter 1.
- Default policy, tap on the veil background while blocked: `play()` resolved 40 ms after the tap, state `playing`, veil still up, counter 1; a second tap 1.2 s later dismissed the veil. Enter on the blocked veil did the same; a mouse click right after it dismissed.
- Listen toggle: blocked, Listen -> playing ("Pause the prayer", `aria-pressed=true`); Listen -> paused ("Continue the prayer"); Listen -> playing; veil gone after the clip; counter stayed at 1.
- Skip, Close, Don't show again (sets `veilOptOut`) and Escape each removed the veil both while blocked and while playing.
- `audioFree: true`: Listen stays hidden, no clip requested, no state set. `voice: 'm'`: the `-m.mp3` clip was requested; default profile: the `-f.mp3` clip.
- `reducedMotion: 'reduce'`: prompt `animation-name: none`; Skip removed the veil within 50 ms.
- Geometry: at 320 px Listen sits at y 631 to 671 and Skip at y 680 to 721 (no overlap); at 360 px they share the row without overlapping; `elementFromPoint` 4 px inside Listen's right edge is Listen at both widths.

Honest limits: headless Linux Chromium with muted output; no real phone, no iOS Safari, no check of the silent switch or of a stale service-worker cache on the live site.

## Completion-credit correction — 8 November 2026

The earlier report accurately describes the previous implementation, which credited the Prayer Voice medallion when `play()` resolved. That is **not** evidence that a clip was heard or even played to the end: a learner may skip it, close the overlay or have a silent device.

The proposed QA correction credits a prayer **only after the media element reports `ended`**, once per opening. A successful `play()` alone, early Skip/Close and failed playback do not earn credit. The existing local-storage key remains unchanged for continuity; already-saved counts may include starts made by earlier versions and cannot safely be reinterpreted as verified completions. Awards and privacy wording now describe reported completion rather than human hearing. No recordings, Hebrew text, images, voice assets or source licences were changed.

This is a draft branch-only correction. It requires a genuine full-checkout precache generation, project unit/browser CI, and phone/audio verification before any release. An `ended` signal confirms media completion, not whether the learner could hear it.
