# Say it: routes to add (shell owner)

The module is `src/speak/speak.js` (not `*.view.js` on purpose: `tests/integration.test.js` requires `views.generated.js` to list
every `*.view.js`, and that file is regenerated only by `node tools/build-precache.mjs`, which this lane does not run).
When wiring the route, either point `module` at `../speak/speak.js` as below, or rename the file to `speak.view.js` and run
`node tools/build-precache.mjs` so the generated list and the precache manifest pick it up.

Route lines for `ROUTE_DEFS` in `src/shell/router.js`:

```js
{ name: 'speak', pattern: '/speak', module: '../speak/speak.js', title: 'Say it', owner: 'speak', optional: true, group: 'learn', quick: 'nav.speak' },
```

Optional deep links (same module; `tab` is read from `ctx.query`):

```js
{ name: 'speak-drills', pattern: '/speak/drills', module: '../speak/speak.js', title: 'Listening drills', owner: 'speak', optional: true, query: { tab: 'drills' } },
{ name: 'speak-history', pattern: '/speak/history', module: '../speak/speak.js', title: 'Speaking history', owner: 'speak', optional: true, query: { tab: 'history' } },
```

Also: the string `nav.speak` ("Say it") in `src/shell/i18n.js`, and `/^\/speak/` in `COUNTED` in `src/morning/engage.js` if speaking
time should count toward the streak. Query parameters understood: `tab` (say | drills | history), `set` (a set id from
`data/speak/sets.json`), `contrast` (bet-vet | het-khaf | kamatz | shin-sin).

Precache: `data/speak/sets.json` and `data/speak/pairs.json` are small (index + 130 drill items); the 60 set files under
`data/speak/sets/` are fetched when a set starts. Nothing in `data/speak/` is in the precache manifest yet (not run by this lane).
