# Animation poses: checker and player (DRAFT tooling)

Status: DRAFT. The 764 pose SVGs under `docs/drafts/animation-poses/` have not been reviewed by a designer or a native reader. This folder documents the two tools built for them. Nothing here is wired into the app: no route plays the poses and they are not in the offline cache.

## The contract (short form)

Full text: `docs/drafts/SUPER-COMMAND-ANIMATIONS-6H.md`.

- 142 items in 8 batch folders (`batch-001` .. `batch-008`, 100 files each, last one 64), each with a `batch-NNN.json` record, plus `state.json`.
- Letters (27 items, 7 poses): times 0, 400, 800, 1300, 1800, 2200, 2600 ms; k6 eases out, the rest ease in and out; k7 equals k5 and is the still frame.
- Vowel and mark signs (15 items) and words (100 items, no Hebrew): 5 poses at 0, 400, 900, 1400, 1900 ms; k5 is the still frame.
- Every pose of an item has the same `<path>` count, the same ids (`p1`, `p2`, ...) and the same commands, so one pose can morph into the next. Paths use only absolute `M L C Z` and whole numbers. The canvas is `0 0 200 200`.
- Only `svg`, `title`, `desc`, `path`. No image, script, foreignObject, filter or links. Title and a two-sentence description in each file. No divine names, no tool or company names. Total animation time at most 3000 ms.

## Commands

```
node tools/anim/check_poses.mjs                       # check docs/drafts/animation-poses
node tools/anim/check_poses.mjs <dir> --report FILE   # check another folder, write a Markdown report
node tools/anim/check_poses.mjs --self-test           # run the built-in bad-input fixtures
node tools/anim/check_poses.mjs --json                # machine-readable problems
node --test tests/anim.tween.test.js tests/anim.check_poses.test.js
```

Exit codes: 0 no problems, 1 problems found, 2 usage error. The latest run on the real folder is in `docs/anim/CHECK-REPORT.md`.

## The player: `src/letters/tween.js`

Pure functions (`lerpPath`, `getEasing`, `sampleFrame`, `validatePoses`, `parsePoseSvg`, `posesFromRecords`) and one player, `playPoses(host, poses, opts)`.

- Nothing runs on import. `playPoses` is meant to be called from a press handler. It draws the first pose, then moves to the last with `requestAnimationFrame`, and stops there. It never loops and never restarts.
- Under `prefers-reduced-motion`, a `data-calm` ancestor or page root, or `{reduced:true}`, it draws the last pose at once and requests no frame.
- Each frame is a pure function of elapsed time, so a late frame skips ahead and never replays an earlier pose. Only path shape and opacity change, each over at least 400 ms per step; colours are never animated.
- Easing between two poses is that of the pose being arrived at (so the letters' k6 settle eases out). Sets longer than 3000 ms are scaled down.
- `cancel()` stops the frame loop. `finish()` jumps to the last pose. A second `playPoses` on the same host cancels the first. Poses that cannot be tweened (different commands or ids) do not throw: the last pose is shown and `ctl.error` says why.
- The drawn svg is `aria-hidden`; the caller must put the title/description (`parsePoseSvg(...).title/.desc`) in visible or screen-reader text next to it.

Example (inside a button handler):

```js
const { playPoses, posesFromRecords } = await import('../letters/tween.js');
const rec = (await (await fetch(url + 'batch-001.json')).json()).files.filter((r) => r.item === 'shin');
const texts = {}; for (const r of rec) texts[r.file] = await (await fetch(url + 'batch-001/' + r.file)).text();
playPoses(hostEl, posesFromRecords(rec, texts));
```

## Loading on demand, and why there is no demo route

Poses must never join the first-install precache. `docs/` is not part of the precache, and the player should be imported with `import()` only when a learner presses play. Fetch the item's 5 or 7 files (a few KB each) at that moment; never the whole set.

No preview-tier demo route was added. A route needs entries in `src/shell/router.js` (`tier: 'preview'`, which keeps the v0 count at 15, as `tests/a11y.b2.test.js` checks), `src/shell/nav-model.js` and `src/shell/nav.strings.js`, a view module, and a place to serve the pose files from (they live under `docs/drafts/`, which is not deployed as app content). That touches shared files other work is changing, so it was left out. To wire it later: copy only the approved items into a served data folder, add the preview route in the three shell files, mount a view with a Play button that calls `playPoses`, and re-run `node tools/build-precache.mjs`.

## Limits

- No designer or native reader has looked at any pose. Letter outlines are hand-traced polygons and some do not look like the printed letters; the middle poses of each morph are rough. The checker proves structure only.
- The checker does not test visual quality, colour contrast, the "at most 6 units of movement" rule for k6, or that descriptions are accurate.
- The player was tested with a fake DOM and a fake frame clock in Node. It was not run in a browser, on a phone, or with a screen reader.
