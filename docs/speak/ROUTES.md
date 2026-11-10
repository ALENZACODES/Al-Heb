# Say it: routes to add (shell owner)

The module is `src/speak/speak.js` (not `*.view.js` on purpose: `tests/integration.test.js` requires `views.generated.js` to list
every `*.view.js`, and that file is regenerated only by `node tools/build-precache.mjs`, which this lane does not run).
`/speak` is already wired in `src/shell/router.js`:

```js
{ name: 'speak', pattern: '/speak', module: '../speak/speak.js', title: 'Say it', owner: 'speak', optional: true, group: 'learn', quick: 'nav.speak' },
```

## Sub-pages

The six sections (Say it, Listening drills, Sounds by tradition, Read a prayer aloud, Shadowing, History) are tabs inside
`speak.js`. Their links are `#/speak?tab=<id>`, which the existing `/speak` route already matches (the router passes the query as
`ctx.query`). `speak.js` also reads `location.hash`, so `#/speak/read`-style links open the right tab if a router entry for them is
ever added, and clicking a tab updates the hash with `history.replaceState` (no router remount). No router change is needed.

Optional entries, only if the sub-pages should appear in the More sheet or have their own titles (each shares the same module; `tab`
is read from `ctx.query.tab`):

```js
{ name: 'speak-drills',  pattern: '/speak/drills',  module: '../speak/speak.js', title: 'Listening drills',     owner: 'speak', optional: true, query: { tab: 'drills' },  quick: 'nav.speak-drills' },
{ name: 'speak-sounds',  pattern: '/speak/sounds',  module: '../speak/speak.js', title: 'Sounds by tradition',  owner: 'speak', optional: true, query: { tab: 'sounds' },  quick: 'nav.speak-sounds' },
{ name: 'speak-read',    pattern: '/speak/read',    module: '../speak/speak.js', title: 'Read a prayer aloud',  owner: 'speak', optional: true, query: { tab: 'read' },    quick: 'nav.speak-read' },
{ name: 'speak-shadow',  pattern: '/speak/shadow',  module: '../speak/speak.js', title: 'Shadowing',            owner: 'speak', optional: true, query: { tab: 'shadow' },  quick: 'nav.speak-shadow' },
{ name: 'speak-history', pattern: '/speak/history', module: '../speak/speak.js', title: 'Speaking history',     owner: 'speak', optional: true, query: { tab: 'history' }, quick: 'nav.speak-history' },
```

Strings for `src/shell/i18n.js` (English):

```js
'nav.speak-drills': 'Listening drills', 'nav.speak-sounds': 'Sounds by tradition', 'nav.speak-read': 'Read a prayer aloud',
'nav.speak-shadow': 'Shadowing', 'nav.speak-history': 'Speaking history',
```

`nav.speak` ("Say it") exists already. Add `/^\/speak/` to `COUNTED` in `src/morning/engage.js` if speaking time should count toward the streak.

## Query parameters

`tab` (say | drills | sounds | read | shadow | history; aliases tradition, listen, read-aloud, shadowing), `set` (a set id from
`data/speak/sets.json`), `contrast` (bet-vet | het-khaf | kamatz | shin-sin), `tradition` (israeli | sephardi | ashkenazi; default is
the `congregation` setting), `prayer` (a prayer id from `data/speak/prayers.json`).

## Precache

`data/speak/sets.json`, `pairs.json`, `prayers.json` and `minimal-pairs.json` are small; the 60 set files under `data/speak/sets/` are
fetched when a set starts. Nothing in `data/speak/` is in the precache manifest until someone runs `node tools/build-precache.mjs`.
