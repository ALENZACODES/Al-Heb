# Ladder route for main (DRAFT, unreviewed)

router.js was not edited. Add next to `firstday`:

```js
  { name: 'firstday-ladder', pattern: '/firstday/ladder', module: '../firstday/ladder.view.js', title: 'Pointed to unpointed ladder', owner: 'firstday', optional: true, group: 'learn' },
```

Check that the router matches `/firstday/ladder` before `/firstday` if it does prefix matching, then run `node tools/build-precache.mjs`.

- Store key `firstday.ladder`: `{ n, answers, hinted }`. Self-reported only.
- A word read after tapping the hint is never counted as read unpointed.
- Audio ids `firstday-ladder-N` via `ctx.audio.extend` and `ctx.audio.play`; no recordings exist.
- Mount test is skipped without jsdom (not installed here); logic is tested through the model.
