# Theme packs route

View: `src/vocab/themes.view.js` (`mount(root, ctx)` returns an unmount function, same shape as `src/sprint/sprint.view.js`). Not yet registered; the shell owner adds the line and the nav string:

```js
{ name: 'vocab-themes', pattern: '/vocab/themes', module: '../vocab/themes.view.js', title: 'Theme packs', owner: 'lane9', optional: true, group: 'learn', quick: 'nav.vocab-themes' },
```

Also add the string `nav.vocab-themes` ("Theme packs") to `src/shell/i18n.js` and regenerate `src/shell/views.generated.js` (it lists `vocab/themes.view.js` once the file exists). Deep link: `#/vocab/themes?pack=food-drink-set01`. If `/vocab/themes` sits next to the existing `/vocab` pattern, list the longer pattern first.

Data it reads (all lazy, via fetch): `data/vocab/themes/index.json`, `data/vocab/themes/<id>.json` (about 50 KB each, add them to the runtime cache, not the precache), and, on "Send to my review deck", the four tier packs `data/vocab/packs/vocab5k-tier-*.json`.

Store keys: own `vocab.themes.v1` (`{ v:1, last, sent: { [packId]: { at, added, existing, skipped } } }`); writes SRS cards to the existing `srs.vocab` (same cards the Vocabulary screen reviews). Pack words are matched to the 5,000-word list by pointed form + part of speech; words outside that list are reported as skipped and not added.

Context used: `ctx.store`, `ctx.audio.has/play/stop` (falls back to the browser voice, labelled), `ctx.settings.get('ttsRate')`, `ctx.query.pack`.
