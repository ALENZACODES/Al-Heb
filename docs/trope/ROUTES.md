# Trope trainer: route and nav string (main wires)

Add to the route table in `src/shell/router.js`:

```js
{ name: 'trope', pattern: '/trope', module: '../trope/trope.view.js', title: 'Trope trainer', owner: 'trope', optional: true, group: 'learn', quick: 'nav.trope' },
```

Add to the strings in `src/shell/i18n.js`: `'nav.trope': 'Trope trainer'`.

Offline group (`src/shell/offline.js`): paths `src/trope/`, `data/trope-trainer/` and `data/corpus/trope/` are needed.

## What it is

`src/trope/trope.view.js` exports `mount(root, ctx)` returning an unmount function. It shows one word from `data/corpus/trope/shema.json` or `priestly-blessing.json` and four mark names from `table.json`. Names are Ashkenazi when `ctx.settings.get('congregation')` is `ashkenazi`, otherwise Sephardi/Mizrahi. Levels (`data/trope-trainer/levels.json`) group marks by occurrence count in those two passages. Only words with exactly one trope mark are used. Progress is stored under `trope.v1`.

Honesty: draft and unreviewed (machine parse, no cantor review); melodies differ by community; no audio exists yet.
