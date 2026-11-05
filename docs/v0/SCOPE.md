# v0 scope: the baby-steps first release

The app has many pages. v0 ships a small set of them as the product; everything else is still reachable but marked **Preview**
(unreviewed, work in progress). The single source of truth is the `tier` field on each entry of `ROUTES` in
`src/shell/router.js` (`'v0'` or `'preview'`; entries without the field default to `'preview'`). `tests/v0.test.js` checks that
the v0 list below matches the code, so edit both together.

## v0 routes

One line per route; the backtick name is the route `name` in `ROUTES` (the test parses these lines).

- `welcome` (/welcome) - first-run onboarding: pick tradition and script, then land on Home.
- `home` (/) - Home with the Today card; the only landing page.
- `firstday` (/firstday) - the on-ramp: "your first 10 minutes" before lesson 1.
- `learn` (/learn) - the lesson path r01 to r10 and, with `?review=1`, the spaced review of due cards (review has no separate route).
- `letters` (/letters) - letter tracing.
- `letter` (/letters/:id) - one letter's trace page (reached from /letters and the atlas).
- `atlas` (/letters/atlas) - the letter atlas.
- `progress` (/progress) - what you have done and what is due.
- `settings` (/settings) - preferences plus backup, restore and delete of local data.
- `about` (/about) - what ALEF is.
- `credits` (/credits) - credits and licences.
- `privacy` (/privacy) - privacy notes (local-only data).
- `install` (/install) - how to install the app on a phone.
- `offline` (/offline) - using the app offline.
- `search` (/search) - page, letter and word search (finds preview pages too, labelled "Preview").

Why these: they are the shortest path a new learner takes (welcome, first day, lessons, letters, review, progress), plus the pages a
first release cannot ship without (settings with backup/restore/delete, about, credits, privacy, install, offline, search).

## What a preview route gets

- Not in the bottom bar. The bar shows only sections that contain a v0 page (Learn, Progress) plus More.
- Listed in the More sheet only inside the collapsed group "Preview (unreviewed, work in progress)", grouped by section with a
  one-line note per section (`nav.preview.note.*` in `src/shell/nav.strings.js`).
- A small banner at the top of the page, "Preview: unreviewed, may change" (`src/shell/preview-banner.js`, mounted from
  `show()` in `src/app.js`).
- Still searchable; search results carry a "(Preview)" label.
- One exception: `accessibility` (/accessibility, the accessibility settings and statement) is a preview route that also has a quick row under Settings in the More sheet, and is linked from Settings and the first-run screen, because help with using the app should not sit inside a collapsed "unreviewed" group. It still carries the Preview banner and is not a v0 route.
- Still opens by direct link; nothing is removed or gated.

## Exit criteria: promoting a preview route to v0

Set `tier: 'v0'` on the route in `src/shell/router.js` and add it to the list above only when all of these are done and recorded
(a line in the route's own docs folder saying who did what, and when):

1. Native review done: the Hebrew text, transliteration and any audio on the page were checked by a native or fluent speaker and the
   corrections were applied (not only requested).
2. Tests: the page's unit tests pass, and `tests/v0.test.js` passes with the route moved to v0 (bar still at most 5 controls, the
   docs list and the code agree, no banner on the page).
3. Real-device check: the page was opened on at least one real phone (not only a desktop browser at 390 px), with the keyboard,
   scrolling and tap targets checked; anything found was fixed or written down as a known issue.
4. Meta scan: `node tools/meta/scan.mjs` still reports PASS after the change.

Until a route meets all four it stays preview, however finished it looks.

## Home card note (on-ramp lane)

`home.view.js` and `src/home/today.js` are owned by the on-ramp lane and were not edited here. Any link on the Today card that
points at a preview route should carry the same honesty; the suggested change is to pass `tierOf(route)` from `nav-model.js` and
append the "(Preview)" label to such links. No such patch has been applied.
