# Listen and pick: route to add (shell owner)

Module: `src/listen/listen.view.js` (not in `views.generated.js` until someone runs `node tools/build-precache.mjs`; this lane does not).

```js
{ name: 'listen', pattern: '/listen', module: '../listen/listen.view.js', title: 'Listen and pick', owner: 'listen', optional: true, group: 'learn', quick: 'nav.listen' },
```

Nav string for `src/shell/i18n.js`: `'nav.listen': 'Listen and pick',`

Store key: `listen.v1` `{ v, answered, correct, missed:{wordId:n}, last }`. Data: `data/listen/config.json` (copy and sizes), words from `data/vocab/words.json`.
Audio: uses `ctx.audio.has('word', id)` / `play('word', id)`. With fewer than 4 words that have audio, the screen says "Audio not recorded yet" and offers read-and-match (meaning shown, pick the written word). `data/dialogues` does not exist, so it is not used.
