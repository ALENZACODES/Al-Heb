# Placement check: route entry (DRAFT, UNREVIEWED)

`src/shell/router.js` was NOT edited. To enable the screen, add this line to `ROUTES` (next to the `sprint` entry):

```js
{ name: 'placement', pattern: '/placement', module: '../placement/placement.view.js', title: 'Placement check (draft)', owner: 'placement', optional: true, group: 'learn', quick: 'nav.placement' },
```

Also needed by whoever owns the shell: a `nav.placement` string, and the files in `src/placement/` and `data/placement/` in the precache manifest (`npm run precache`).

Status: everything here is a draft. It has not been run in a browser, on a phone, or by a learner, and no Hebrew teacher has reviewed it. The cutoffs in `data/placement/config.json` (stop after 3 misses in the last 5 once 6 are asked; forgive a lone miss followed by 3 correct; item lesson caps) are untested guesses. Store key: `placement.v1`. Audio: `ctx.audio.play('word'|'prayer', id)`; there are no recorded clips yet, so it may use the browser voice or nothing.
