# Rimon frames: the mascot as a flip-book

Superseded for new work: the twelve animated sheets (docs/images/rimon-animation.md) are what the app plays, and the 200 stills in docs/images/RIMON-STILLS.md are the next pictures to make. This page is kept as the record of the earlier flip-book plan.

Order sheet: `docs/images/rimon-frames.csv` (19 frames, 256 x 256 PNG with transparency). Nothing has been drawn yet; the helper below renders nothing until frames exist.

| Action | Frames | Files |
| --- | --- | --- |
| idle blink | 4 | `assets/img/rimon/frames/idle-01.png` to `idle-04.png` (01 is the base pose, eyes open) |
| smile | 1 | `smile-01.png` |
| wink | 1 | `wink-01.png` |
| yawn | 3 | `yawn-01.png` to `yawn-03.png` |
| stretch | 3 | `stretch-01.png` to `stretch-03.png` |
| laugh | 3 | `laugh-01.png` to `laugh-03.png` |
| nod | 2 | `nod-01.png`, `nod-02.png` |
| wave | 2 | `wave-01.png`, `wave-02.png` |

The whole point is that the frames flip cleanly: `idle-01` is the base pose and every other row says what moves and that nothing else does. Ask the studio for a contact sheet of all 19 and check that Rimon's outline sits in the same place in every tile before saving any of them.

## Master command (paste once, with the Rimon character sheet from `docs/images` attached, then the 19 rows)

```
You are drawing animation frames of Rimon, the mascot of a Hebrew learning app, from the attached character sheet.
Rimon: a small round pomegranate-red sprite with a gold crown-shaped calyx on top, two olive-green leaf ears,
big friendly dot eyes, tiny arms and feet, thick charcoal outline; never any writing.

HOUSE STYLE: flat vector, thick rounded charcoal outlines, palette pomegranate red (#B0373B), warm gold (#D9A441),
olive green (#6B7F3A), charcoal (#2B2B2B). No gradients, no gloss, no sparkle, no shadow on the ground.

EVERY FRAME: 256 x 256, transparent background, Rimon alone, the same size and in the same spot in every frame so
the frames flip-book cleanly: feet on the same baseline, body outline unchanged unless the row says otherwise.
The first row (idle-01) is the BASE POSE; draw it first and keep it on screen as the reference for all the rest.
Only the part named in a row moves. No text, no letters, no numbers, no props unless the row names one.

Save each file under the exact path in its row. Strip all metadata. After all 19, show me a contact sheet in a
grid so I can check that the outline sits in the same place in every tile. Reply "ready" and I will paste the rows.
```

## The helper (`src/shell/mascot.js`)

Zero dependencies. Not wired into any view yet; the owner wants to see the frames first. When it is time, the mount is one line:

```js
import { mountMascot } from './shell/mascot.js';
const mascot = mountMascot(someElement, { fps: 6 });   // later: mascot.destroy()
```

What it does, as checked by `tests/shell.mascot.test.js` (scheduler and preload logic as pure functions, no browser):

- preloads every frame with `Image()`; a frame that fails to load is dropped silently (no exception, nothing logged by the helper);
- no frame loaded at all: renders nothing (`ready` resolves `false`);
- idle loop: `idle-01` (eyes open) is held for about two seconds, the blink frames show one tick each, repeat;
- after each idle loop there is a one-in-five chance that one other action with frames plays once (each frame two ticks), then idle resumes from `idle-01`; actions whose frames did not load are never chosen;
- `prefers-reduced-motion: reduce` (or `{ reduceMotion: true }`): one still, `idle-01`, no timer;
- options: `fps` (1 to 24, default 6), `actions` (action -> frame count, default the table above), `base` (default `assets/img/rimon/frames`), `random` (for deterministic tests), `label` (alt text, default "Rimon, the pomegranate mascot").

Not done: the helper has not been opened in a browser with real frames, because there are none yet. The DOM part (`mountMascot`) is a thin wrapper over the tested scheduler.

## Getting the frames in

`node tools/images/ingest_queue.mjs <drop folder>` matches files named by their target basename (`idle-01.png` is ambiguous on its own, so for Rimon name them `rimon__idle-01.png`, or hand the tool a `file,path` CSV), checks they are 256 x 256 with transparency, strips metadata and writes them under `assets/img/rimon/frames/`. Details in `docs/images/QUEUE-2026-11-07.md`.
