# Route lines for main to wire (not applied by the legal lane)

Router has no `more` group, so these use `learn`. Both views are standalone: no new `needs` file beyond the data file below.

Add to `src/shell/router.js` (next to the `about` route):

```js
  { name: 'credits', pattern: '/credits', module: './credits.view.js', title: 'Credits and licences', owner: 'legal', optional: true, group: 'learn', quick: 'nav.credits' },
  { name: 'privacy', pattern: '/privacy', module: './privacy.view.js', title: 'Privacy', owner: 'legal', optional: true, group: 'learn', quick: 'nav.privacy' },
```

Add to `src/shell/i18n.js` (English dictionary):

```js
  'nav.credits': 'Credits & licences', 'nav.privacy': 'Privacy',
```

Other wiring for main:

- `data/legal/attributions.json` must be in the precache list (credits.view.js fetches it with `ctx.fetch` or `fetch`); run build-precache.
- Regenerate `src/shell/views.generated.js` if the project does that for new views.
- `credits.view.js` exports `hebcalCredit(entries)`; the calendar and festivals screens (not owned by the legal lane) should show that line wherever they display Hebcal-derived dates or parashot.
- The `/credits` view is the single credits list. The About screen now only links to it (`#/credits`) and to `#/privacy`.
- Add `/privacy` to `how.view.js` section 5 as a link if desired; that section is now a shorter version of the same facts.
- Not legal advice.
