# First 10 minutes: routes for main to wire (DRAFT, unreviewed)

Nothing in src/shell or src/app.js was edited. Add to `src/shell/router.js`, next to `sprint`:

```js
  { name: 'firstday', pattern: '/firstday', module: '../firstday/firstday.view.js', title: 'Your first 10 minutes', owner: 'firstday', optional: true, group: 'learn' },
```

Optional i18n key if a quick link is wanted: `'nav.firstday': 'First 10 minutes'` in src/shell/i18n.js, then add `quick: 'nav.firstday'` to the entry.

Then run `node tools/build-precache.mjs` so src/firstday and data/firstday/*.json are precached (offline use is not verified).

Notes
- Export style matches sprint: `export function mount(root, ctx)` returning an unmount function.
- Store key: `firstday.progress` (self-reported step and words read).
- Audio: the view calls `ctx.audio.extend(...)` with `firstday-*` word ids (status missing) and `ctx.audio.play(kind, id)`. No recordings exist; the Israeli speech fallback speaks where available.
- Ladder (data/firstday/ladder.json, 20 steps) is tested in the model (`checkLadder`, `unpointedScore`) but has no view yet; a `/firstday/ladder` route should wait for a view.
- Suggested first-run link: onboarding could send true beginners to `#/firstday`. Not wired.
- All content is draft and proofread:false. The Day-1 claim (P001) is a target until the 5-learner test is run.
