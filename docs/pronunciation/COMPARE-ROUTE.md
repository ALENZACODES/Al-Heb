# Compare traditions: route and nav string (for the shell owner)

The view and data are in place; **the shell files are not edited here**. Add the two lines below.

## `src/shell/router.js` (next to the `sprint` line)
```js
{ name: 'compare', pattern: '/compare', module: '../pronunciation/compare.view.js', title: 'Compare traditions', owner: 'lane3', optional: true, group: 'learn', quick: 'nav.compare' },
```
`optional: true` hides the route if the view file is missing. After adding the file run `node tools/build-precache.mjs` (not run here) so
`src/shell/views.generated.js` lists `pronunciation/compare.view.js`.

## `src/shell/i18n.js` (the `en` table, next to `'nav.sprint'`)
```js
'nav.compare': 'Compare traditions',
```

## Offline
`src/shell/offline.js` already maps `src/pronunciation/` and `data/pronunciation/` to the "Sounds and pronunciation" group, so
`data/pronunciation/runtime/` (6 lookup shards of about 110 KB, plus index, reasons and picks, about 700 KB in all) is covered.
The files are not underscore-prefixed, so `tools/build-precache.mjs` will precache them on its next run; the bulk
`variants/_*.json` and `derived/_*.json` files stay out.

## Contract
- `mount(root, ctx)` returns an unmount function. Optional deep link: `#/compare?text=<pointed Hebrew>` (read as `ctx.query.text`).
- Store key `compare.v1`: `{ text, recent: [up to 8 texts] }`.
- Data: `data/pronunciation/runtime/` built by `node tools/pronunciation/build_runtime.mjs`; model in `src/pronunciation/compare.model.js`.
- Listening: Israeli plays the pointed text with a Hebrew voice; Sephardi and Ashkenazi play the Latin respelling with an English voice and
  are labelled approximations. SSML with IPA hints is used only if `ctx.compareSsml` is true. With no speech synthesis (or no Hebrew
  voice for Israeli) the view is text only.
- Limits: only words already in the lookup table (6,985 pointed words from the vocabulary, phrasebook and prayer texts) can be compared;
  unknown or unpointed words are reported, never guessed.
- Everything shown is rule-generated and has not been checked by a native speaker; the view says so on screen.
