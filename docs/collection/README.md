# My Collection And The Learner's Own Pages (Group S)

Ten ideas, five pages, one Save button. Everything is kept on the device; nothing is sent anywhere.

| Idea | Where | What it does |
|---|---|---|
| S1 My Collection | `#/collection` | Everything saved, in folders the learner names. Items can be moved, noted and removed. Removing a folder never removes what was in it. |
| S2 Custom decks | `#/collection`, any folder | "Use this folder as a review deck": every item with Hebrew and a meaning becomes a card, spaced by the same scheduler as every other review (`src/curriculum/srs.js`). The cards live in `collection.cards` and are counted on the scheduler page with the other decks. |
| S3 Favorites | every page | A "Save" button at the bottom of each content page: one tap saves the page as a favorite, a second tap takes it off. The Favorites shelf lists them. |
| S4 Personal dictionary | `#/collection`, My Dictionary | Add words from the app dictionary (Hebrew or English), add your own translation and note, search them, download as a spreadsheet file or plain text. |
| S5 Timeline | `#/timeline` | One entry per day: lessons, checkpoints, little books and review answers from the device's records as far back as they go, pages opened from the day this shipped, and a note per day. |
| S6 My Hebrew | `#/my-hebrew` | One summary counted from local data: level, strongest and weakest areas, words known, books finished, streak, most-opened pages, newest favorites. The rule behind the level line is on the page. |
| S7 Interest paths | `#/paths` | Cooking and Food, Travel in Israel, Prayer, Torah, Music: an ordered walk through pages the app already has. A step is done when ticked or opened. Separate from My Study Plan. |
| S8 Saved searches | `#/collection`, Everything | Save a search; later, results that were not there before are marked new. Runs on the existing search (`src/platform/search-more.js`): lessons, little books, root families, prayers and texts. |
| S9 Collection sharing | `#/collection`, any folder | Download a folder as a file; "Add a folder from a file" takes it in on another device. Notes travel; hearts and review history do not. An import never overwrites what is already there. |
| S10 Reading shelf | `#/shelf` | Every text in progress with "Continue reading". Little books show the page the book reader recorded (`books.v1`); other texts reopen at the place last opened. |

## How it is built

- `src/collection/model.js`: the collection itself (pure functions over one stored record), decks, the folder file, saved searches.
- `src/collection/diary.js`: the visit log, reading shelf, timeline, profile and interest paths (pure).
- `src/collection/heart.js`: the Save button. `src/app.js` loads it after a page has been shown (one line), so it is not part of the first install.
- `src/collection/*.view.js`: the five pages. `src/shell/collection-routes.js` registers them.
- Existing features are the base, not replaced: the Verse Notebook is untouched (one button copies its verses into a folder), the weekly report and study plan are linked, the scheduler and search are reused as they are.

Stored keys (all listed on the Privacy page): `collection.v1`, `collection.cards`, `collection.searches.v1`, `collection.visits.v1`, `paths.v1`.

Safety of saved and imported data: text is trimmed to fixed limits, only links inside the app (`#/...`) are kept, a file must carry the `alef-collection/1` mark and at most 500 items, and spreadsheet cells that start like a formula are defused. The Name is never offered by the word lookup.

## Limits to know

- The Save button saves the page being looked at. Saving one word goes through My Dictionary; saving one verse goes through the Verse Notebook and its copy button. There is no Save button on each single line, prayer or song inside a page yet.
- "Pages opened" in the timeline, the favorite-content list and the non-book part of the reading shelf start from the day this ships; nothing earlier was recorded.
- A text other than a little book returns to the link it was opened with (for example the Torah chapter), not to a scroll position.
- A saved search looks through the same things the Search page's extra groups do. It does not run the full Torah text search.
- The interest paths are a hand-picked order of existing pages. They have not been reviewed by a teacher.
- Tested in a stand-in DOM under Node (`tests/collection.test.js`), not clicked through in a browser.
