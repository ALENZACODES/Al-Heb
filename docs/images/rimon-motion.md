# Rimon's body movement

Updated 2026-11-11 (America/Toronto).

Rimon already had drawn moves: a 12-frame sheet for each reaction in `assets/img/rimon/`, 200 stills, and the flip-books in
`data/images/rimon/anim/`. Between those moments Rimon was close to a still picture: a faint breath, a blink every six seconds,
and no movement at all while dressed for a screen. This layer adds body movement on top. It needs no new art.

## What moves

| When | Movement |
| --- | --- |
| Waiting | A slow sway with the breath, on the sprite and on a still |
| Every 5.5 to 11 seconds while waiting | One short fidget: hop, wiggle, nod, twirl, lean, or duck and pop up |
| Every third idle beat | One of Rimon's drawn moves, unprompted: wave, wink, bounce or laugh |
| A reaction plays | The body moves with it: a real jump for bounce, a shake for laugh, a droop for a miss, a lean for "next lesson" |
| A new screen | A hop in |
| A new still | A small pop |
| A tap or the mouse over Rimon | A squash and bounce, and on a tap a happy drawn move |
| Rimon drawn into a page | The large Rimon under a heading hops in; it, the bottom card and the in-page sprite keep a gentle float |

## When Rimon keeps still

Reduced motion, calm mode, Hide Rimon, quiet days and quiet screens (prayer, Torah, service) all stop it. On phones nothing plays
while Rimon is ducked behind the bottom bar. From Friday 18:00 to Saturday 21:00 local time only the gentle sway stays: no
fidgets and no unprompted moves. No fidget plays over a reaction.

## Files

- `src/shell/rimon-motion.js`: timing and classes. Mounted from `src/app.js` after the companion, inside try/catch.
- `assets/css/rimon-motion.css`: the keyframes. Loaded by the module, transforms and opacity only.
- `tests/shell.rimon-motion.test.js`.

Both files are on demand (`tools/build-precache.mjs`), so the first install stays the same size. If they cannot load, Rimon
behaves as before.
