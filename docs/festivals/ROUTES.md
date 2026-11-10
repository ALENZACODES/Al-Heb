# Festivals routes (to be pasted by the owner of `src/shell/router.js` and `src/shell/i18n.js`)

`router.js` and `i18n.js` are not owned by the festivals lane, so nothing was edited there. Until these lines are added the screens are reachable only by mounting `src/festivals/festivals.view.js` directly (as `tests/festivals.test.js` does), and the card's own links (`#/festivals/...`) are hidden by `ctx.hasRoute('festival')`.

## Route table lines (`ROUTES` in `src/shell/router.js`)

```js
  { name: 'festivals', pattern: '/festivals',     module: '../festivals/festivals.view.js', title: 'This week in the Jewish year', owner: 'festivals', optional: true, group: 'learn', quick: 'nav.festivals' },
  { name: 'festival',  pattern: '/festivals/:id', module: '../festivals/festivals.view.js', title: 'Festival words', owner: 'festivals', optional: true, paramQuery: { id: 'id' } },
```

`:id` is one of `shabbat-ready` or a pack id: `rosh-hashanah`, `yom-kippur`, `sukkot`, `shemini-atzeret`, `hanukkah`, `tu-bishvat`, `purim`, `pesach`, `shavuot`, `tisha-bav`. Any other id shows "No such festival pack".

## Nav string (`src/shell/i18n.js`)

```js
'nav.festivals': 'This week in the Jewish year',
```

The `festival` route has no `quick` entry (it is reached from the card).

## After adding

- Run `node tools/build-precache.mjs` so `views.generated.js` and the precache list include `src/festivals/festivals.view.js`, `src/festivals/model.js`, and `data/festivals/*.json` (the festivals lane did not run it). Until then the test "views.generated.js lists exactly the *.view.js files on disk" fails because of the new view file.
- The view reads `ctx.store` (key `calendar.prefs` for the city, written by the Calendar screen), `ctx.settings.location` or `.lat/.lon` as a fallback, `ctx.hasRoute`, `ctx.query.id`, and optionally `ctx.now()`. It writes nothing to the store.
- Routes the card links to when they exist: `text` (`#/read/<id>`), `learn` (`#/learn?lesson=<id>`), `torahread`, `calendar`, `festival`, `festivals`.
