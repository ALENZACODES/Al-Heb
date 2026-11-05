# Morning card and streak (DRAFT copy). src/shell and src/app.js were NOT edited; lines for the parent:

src/shell/router.js (before `vocab`):
```js
  { name: 'morning', pattern: '/morning', module: '../morning/morning.view.js', title: 'Start your day with God', owner: 'morning', optional: true, quick: 'nav.morning' },
```
src/shell/i18n.js: `'nav.morning': 'Morning verse',`
src/app.js, after the router starts: `import('./morning/boot.js').then((m) => m.startMorning({ store, audio })).catch(() => {});`
Home (optional): `import { streakPanel } from '../morning/morning.view.js'` with `createMorningModel(store)`; Home's existing count already agrees (same projection).
Then `node tools/build-precache.mjs` (views.generated.js, precache of src/morning, data/morning-verses.json).
