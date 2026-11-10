# Rimon movement artwork

Reference: assets/img/gen/MASCOT_rimon.800.webp. Preserve the round red pomegranate, gold crown, two olive leaves, dark eyes, pink cheeks, blue knotted sash and thin red arms and feet.

The active assets are twelve named sheets under assets/img/rimon. Each sheet has four columns and three rows, read left to right and top to bottom. Frame 1 starts the gesture, frames 2–11 are ten intermediate drawings, and frame 12 finishes it. Keep the complete character within each square cell, consistent scale and center, with clear padding. Transparent background; no labels, grid lines, scenery or decorative particles. Flat, clean illustration matching the reference.

Action directions:

- wave: arm at rest, gradually raised, palm waves left and right, arm lowers.
- bounce: standing, crouching, pushing off, rising, airborne hold, descending, landing squash, settling.
- highfive: hand rises from rest, palm reaches toward the viewer, holds, retracts.
- nervous: hands approach the mouth, fingers nibble with worried brows, pause, lower with a hopeful smile.
- laugh: smile grows, mouth opens, eyes curve and close, shoulders and body rock, smile returns.
- wink: left eye slowly closes and opens, right eye briefly winks, relaxed smile returns.
- yawn: eyelids droop, mouth opens, hand covers the yawn, mouth closes and hand lowers.
- stretch: arms lift outward and overhead, body lengthens, pose holds, arms lower.
- sad: smile softens to a gentle frown, shoulders lower, head tilts encouragingly, hopeful smile returns.
- thinking: hand rises to chin, eyes glance upward, head tilts, hand lowers.
- point: arm lifts across the chest, extends to the right, holds, then retracts.
- blink: eyelids gradually lower from open to fully closed, pause, then reopen; body remains aligned with subtle breathing.

The 200 still drawings that let Rimon do something different on each screen (greetings, answers, festivals, Brain Lab, books, streaks, errors) are catalogued in docs/images/RIMON-STILLS.md and shown by src/shell/rimon-stage.js over these sheets.

The active sequence timing and frame selection live in src/shell/rimon.js. Background positioning selects a cell in its action sheet. Assets load on demand and are reused. The earlier rimon-sprite.png and rimon-frames.csv remain historical references.
