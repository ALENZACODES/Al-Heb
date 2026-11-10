# Reform synagogues in Canada (directory screen, preview)

A directory of the Reform congregations of Canada: 25 current members of the Reform movement and 2 legacy entries, grouped
by province from west to east. Each one opens to a page with its pictures (where any are held), a story of two to five
paragraphs, contact facts, the points still to confirm, and the sources the story rests on.

| Piece | Where |
|---|---|
| Routes | `#/synagogues` (directory) and `#/synagogues/<id>` (one congregation); `src/shell/router.js`, section `read`, tier preview |
| View | `src/synagogues/synagogues.view.js` |
| Data | `data/synagogues/canada.json`: 27 entries, 51 pictures, about 7,000 words of story |
| Pictures | `assets/synagogues/<id>/<file>.jpg` (full, at most 1,400 px wide) and `assets/synagogues/<id>/thumb/<file>.jpg` (480 px) |
| Tests | `tests/synagogues.test.js` (data shape, picture files, routes, both screens in a fake DOM) |
| Offline | on demand, group `od-synagogues` (`src/shell/offline.js`); nothing is installed up front (`tools/build-precache.mjs`) |

## Data fields

`id`, `name`, `city`, `province` (code from the `provinces` list), `address` (+ `addressNote`), `website` (+ `websiteNote`),
`phone` (+ `phoneNote`), `email` (+ `emailNote`), `founded` (display text), `foundedYear` (number or null, + `foundedNote`),
`status` (`current` or `legacy`, + `statusNote`), `summary` (one line), `story` (2 to 5 paragraphs), `images`
(`file`, `alt`), `imageNote`, `sources` (`label`, `url`), `checks` (open questions shown under "To confirm").

An empty string means "not found"; the matching `...Note` says what is known instead. The view never invents a value.

## Where the facts come from

The starting point was a spreadsheet of the 27 congregations (name, address, website, telephone, email, year founded, a
three-sentence history, its source URL and list membership). Each story was then widened from the congregation's own
history page, the Ontario Jewish Archives, the Canadian Jewish News, the Jewish Independent, the Detroit Jewish News
archive, Wikipedia and community directories; every page used is listed under that congregation's Sources. Where sources
disagree (Kolot Mayim's founding year, Am Shalom's 2003 or 2004) the entry says so. Nothing here has been checked with
the congregations themselves; the `checks` lists and the preview tier say as much.

## Standalone page

`synagogues/index.html` is a plain, script-free page listing every congregation with its picture and a link into its story in the
app. It is generated: `node tools/synagogues/build-page.mjs` rewrites it from the data file, and a test fails if it is stale.
Re-run the command after any change to `canada.json`.

## Pictures

51 JPEGs for 27 congregations. They are illustrative views built from reference photographs and street-level references,
not documentary photographs, and the screen says so. Two need their own caveats, carried in `imageNote`: the Vancouver
set shows a colour reconstruction of the historic West 10th Avenue building, not the current Oak Street synagogue; the
Ajax set shows the shared venue (St. Paul's United Church) without the church's signage. Three of the later pictures are not of a synagogue exterior and say so in `imageNote`: Or Hadash (the shared plaza at 130 Davis Drive), Har Zion (the sanctuary interior) and Neshamah (the North Thornhill Community Centre, a shared meeting place). All files were re-encoded
without embedded metadata; `node tools/meta/scan.mjs assets/synagogues` passes with zero findings.

## Still to do

- Ask each congregation to check its entry (facts, pictures, wording) before the route leaves preview.
- Hebrew names of the congregations, with audio, once a native speaker can review them.
