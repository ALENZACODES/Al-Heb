# Lines for the shell owner (src/shell was not edited)

src/shell/router.js, before the `vocab` route:
```js
  { name: 'torahread',    pattern: '/torahread',          module: '../torahread/torahread.view.js', title: 'Torah reading', owner: 'torahread', optional: true, quick: 'nav.torahread' },
  { name: 'torahreadsec', pattern: '/torahread/:section', module: '../torahread/torahread.view.js', title: 'Torah reading', owner: 'torahread', optional: true },
```
src/shell/i18n.js: `'nav.torahread': 'Torah reading',`
Then run `node tools/build-precache.mjs` so `views.generated.js` lists `torahread/torahread.view.js` (optional routes are hidden until it does) and the precache includes src/torahread/*.js and data/torahread/*.json.
