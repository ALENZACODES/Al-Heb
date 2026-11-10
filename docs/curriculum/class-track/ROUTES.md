# Class track: wiring for the parent (src/shell was not edited)

Add to `ROUTES` in `src/shell/router.js` (before the catch-all, next to `progress`):

```js
  { name: 'classtrack',         pattern: '/classtrack',               module: '../classtrack/classtrack.view.js', title: 'Class track', owner: 'lane10', group: 'learn', quick: 'nav.classtrack' },
  { name: 'classtrackweek',     pattern: '/classtrack/:week',         module: '../classtrack/classtrack.view.js', title: 'Class track week', owner: 'lane10', paramQuery: { week: 'week' } },
  { name: 'classtrackmode',     pattern: '/classtrack/:week/:mode',   module: '../classtrack/classtrack.view.js', title: 'Class track sheet', owner: 'lane10', paramQuery: { week: 'week', mode: 'mode' } },
```
`:mode` is `handout` or `teacher`; anything else shows the week page.

Add to the English strings in `src/shell/i18n.js` (same object as `'nav.progress'`):

```js
'nav.classtrack': 'Class track',
```

Then run `node tools/build-precache.mjs` (regenerates `views.generated.js` and `precache-manifest.js`). Until then `node --test tests/integration.test.js` fails 2 tests ("views.generated.js lists exactly the *.view.js files", "precache ... file list is stale"); both are only the new files not being registered. All other 31 integration tests pass.

Data files: `data/curriculum/class-track.json` (fetched by relative path through `loadJSON`; add to the precache list the same way as other `data/curriculum/*.json`). The view also reads lessons.json, hints.json, soundgap.json, belt-gates.json and the corpus registry.
