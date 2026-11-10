# Navigation model (information architecture lane)

Five sections; every route in `src/shell/router.js` ROUTES belongs to exactly one (the lists live in `src/shell/nav-model.js` SECTION_ROUTES, keyed by route name, so no `section` field was added to router.js; `tests/nav.model.test.js` enforces one-and-only-one).

| Section | Holds |
|---|---|
| Learn | home, lessons, letters, sounds, vocabulary, grammar, typing, dialogues, Israel, class track, drills |
| Read | read, Torah reading, service, trope, timed read, morning verse, scan |
| Speak & Listen | speak, listen, compare, tradition quiz, read-my-way, traditions |
| Progress | progress, placement, calendar, festivals, reminders, share, class summary |
| More | search, settings, workbook, install, offline, about, how, credits, privacy, welcome |

There is no `review` route in ROUTES yet (review lives inside /learn?review=1), so it has no separate entry.

Files: `nav-model.js` (pure model), `nav.js` (four section tabs; with the existing More button that is 5 controls), `menu.js` (More sheet: every available page grouped by section, one-line description = the route's existing title when it differs from the label), `nav.strings.js` (new English strings merged into `en`), `search.js` + `search.view.js` (route /search).

Rules: only available routes are listed (VIEW_FILES via availableRoutes). Parameterised routes (/letters/:id etc.) are reached from their static parent (PARENT map). `welcome` is searchable but not in the menu. Tab target = first available primary route of the section. Current page: `aria-current="page"` on the tab whose own page it is, `aria-current="true"` on the tab of the section the page belongs to; a page under More sets `data-current` on the More button; home marks nothing.

Edits outside the lane files: `src/app.js` (renderNav now delegates to shell/nav.js; setMore/wireChrome unchanged), `src/shell/router.js` (one added route line: `search`), `assets/css/app.css` (appended block at the end). No Hebrew was written: Hebrew labels shown are the ones already in i18n.js `he`.

Search: page titles and nav labels immediately; letters (data/letters/letters.json) and vocabulary (tier packs via src/vocab/loader.js, 500 to 5000, lazy) load on first visit to /search. Word results link to /vocab (that view has no query parameter).

Not done here: `views.generated.js` / precache were not regenerated, so `shell/search.view.js` is not yet in the precache list until `build-precache` runs. `speak` currently counts as unavailable (its module is `speak/speak.js`, not a `*.view.js`, so availableRoutes hides it); Speak & Listen falls back to listen.
