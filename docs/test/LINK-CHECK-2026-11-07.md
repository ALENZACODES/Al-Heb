# Checks lane, 2026-11-07: candle lighting, letter tracing, routes, links, live site

Branch `lane/checks-2026-11-07`, worktree only; nothing pushed from the lane. Every number below was produced by the
commands shown, on this date, in headless Chromium (Playwright, `/usr/bin/google-chrome`) or Node 22.

## 1. Candle-lighting minutes (owner report, Richmond Hill / Toronto)

**The solar math was never wrong.** `sunset()` / `sunTime()` in `src/curriculum/calendar.js` (NOAA equations, zenith
90.833, one refinement pass) agree to the second with an implementation written from scratch for this check
(`tools/check/noaa-reference.mjs`, verified on Greenwich 2000-06-21: sunset 20:20:53 UTC) and to the minute with Hebcal's
live `/shabbat` API (fetched 2026-11-08 02:23 UTC, `geo=pos`, `b=18`, `M=on`) and with the repo's Hebcal snapshot of
2026-11-04 (`data/calendar/hebcal-fixtures.json`, 10 cities, already pinned to 1 minute by `tests/calendar.dates.test.js`).

| Place (lat, lon) | Friday | Sunset (repo) | Candles repo | Candles Hebcal | Havdalah 8.5 deg repo | Hebcal |
|---|---|---|---|---|---|---|
| Toronto 43.65, -79.38 | 2026-11-06 | 17:01:46 EST | 16:43 | 4:43pm | 17:45 (Sat 11-07) | 5:45pm |
| Toronto | 2026-11-13 | 16:54:01 | 16:36 | 4:36pm | 17:38 (Sat 11-14) | 5:38pm |
| Richmond Hill 43.87, -79.44 | 2026-11-06 | 17:01:31 | 16:43 | 4:43pm | 17:45 | 5:45pm |
| Richmond Hill | 2026-11-13 | 16:53:42 | 16:35 | 4:35pm | 17:38 | 5:38pm |

Independent NOAA values (UTC): candles 21:43:46 / 21:36:01 (Toronto), 21:43:31 / 21:35:42 (Richmond Hill); havdalah
22:45:15 / 22:38:30 and 22:45:10 / 22:38:21. The task brief's "about 16:58 EST" for the 2026-11-06 Toronto sunset does not
match either reference; 17:01 does. Preset `toronto` carries 18 minutes and `America/Toronto`; the 20-minute Israeli default
cannot leak (`suggestCandleMinutes` only returns it for points within 0.15 degrees of an Israeli preset); `floorToMinute` and
`formatTime` behave as documented; the device time zone is used only for custom coordinates without a `tz`, which is correct
on the owner's device.

**Root cause of what the owner saw.** On a Saturday the Today card computed candles with `candleLighting(g)` =
`fridayOnOrAfter(g)`, i.e. NEXT Friday, while its heading, Torah portion and havdalah line referred to the Shabbat of
`saturdayOnOrAfter(g)` = today. Rendered in Chromium on Saturday 2026-11-07 with the Toronto preset, before the fix:

    2026-11-13: 16:36 America/Toronto (candle lighting in Toronto, ON; sunset 16:54, 18 min before ...)
    2026-11-07: 17:45 America/Toronto (havdalah, 8.5 degrees below the horizon)

Every community listing for that Shabbat says 4:43, so the card looked 7 minutes wrong. After the fix (`shabbatFridayOf(g)`
in `calendar.js`, used by `timesBlock` in `calendar.view.js`):

    2026-11-06: 16:43 America/Toronto (candle lighting in Toronto, ON; sunset 17:01, 18 min before ...)
    2026-11-07: 17:45 America/Toronto (havdalah, 8.5 degrees below the horizon)

Tests: `tests/calendar.dates.test.js` (pinned Toronto and Richmond Hill, both dates, within 2 minutes of the independent
calculation, plus Hebcal's published minutes; `shabbatFridayOf` one day before `saturdayOnOrAfter` for 14 consecutive days),
`tests/calendar.view.test.js` (Saturday card shows `2026-11-06: 16:43`, never `2026-11-13: 16:36`; fails on the old code).

Also observed, not changed (product judgement): custom coordinates typed with a positive longitude (79.44) give
`06:00 America/Toronto` with no warning; a device in another zone with custom coordinates and no `tz` shows the city's times
in the device zone, labelled (correct, but easy to misread).

    node /tmp/candle-probe.mjs          # repo values (script body in the lane log; same as the test table)
    node tools/check/noaa-reference.mjs  # independent NOAA implementation
    curl "https://www.hebcal.com/shabbat?cfg=json&geo=pos&latitude=43.65&longitude=-79.38&tzid=America/Toronto&b=18&M=on&gy=2026&gm=11&gd=6"

## 2. Letter tracing: "drawings get stuck sometimes when you make a mistake"

Reproduction harness: `node tools/check/trace-repro.mjs [letterId]` drives `#/letters/alef` with real mouse and CDP touch input
and, after each scenario, checks that the stroke the surface is waiting for still advances `data-progress`. Scenarios: off-path
stroke; pointer leaves the canvas and is released outside; `pointercancel` mid-stroke with and without a following `pointerup`;
a second finger during a stroke; wrong stroke order; a stroke during Animate; a tap; three mistakes (hint animating);
drawing on a finished letter; Start over.

With Playwright's well-behaved mouse (every `pointerdown` gets its `pointerup`) none of the scenarios hard-locked the surface,
before or after. The defects were found by driving the controller's own listeners with the fake DOM
(`tests/letters.trace.pointer.test.js`, 10 tests, all failing on the old `src/letters/trace.js`):

| Path | Before | After |
|---|---|---|
| `pointerup` never delivered (capture refused, finger lifted off-screen) | `drawing` stays set: unpressed `pointermove` keeps extending the old line and the next press merges into it | `buttons === 0` on a move finishes the stroke; a new press of the same pointer drops the stale stroke; document-level `pointerup`/`pointercancel` fallback |
| second finger / palm during a stroke | replaces the stroke in progress; its lift scores a "Draw a longer line" mistake (Chromium: progress 0, feedback "Draw a longer line.") | first pointer keeps the surface; other pointers ignored (Chromium: progress 1, "Good!") |
| `pointercancel` / `lostpointercapture` from another pointer | wipes the active stroke | only the active pointer's cancel discards it |
| stroke during Animate | `animate()` promise never settles (`cancelAnimation` cleared its timers) | settles; view gets "Your turn." |
| drawing on a finished letter | silently ignored (feedback stays "Perfect! Alef") | `onInputWhileDone`: "This letter is finished. Press Start over to trace it again."; completion text now ends with the same hint |
| `reset()` mid-stroke | the straddling stroke was scored after reset | discarded |

"Start over" already existed in `trace.view.js`; it now has `data-act="reset"`. `src/wordtrace/wordtrace.view.js` reuses
`createTracer` unchanged and inherits the fix. Chromium result after the fix: `ALL OK` for alef, bet, shin.

## 3. Routes

    node tools/check/routes.mjs --json docs/test/routes-2026-11-07.json

158 routes in `src/shell/router.js`, each loaded in a fresh boot (reload per route), sample params for the 16 parameterised
patterns (`SAMPLE_PARAMS` in the script). Result: 158 rendered an `h1`/`#view-title` with children in `#main`, 0 uncaught
exceptions, 0 failed requests other than the 30 arcade backdrops `assets/games/arcade/<game>/env.png` (404; `src/games/arcade.js`
`art()` removes the `<img>` on error; `docs/games/ARCADE-COMMANDS.md` lists them as art still to be produced). Those 30 are
reported as "optional art missing", not failures. Nothing needed fixing.

## 4. Links and assets

    node tools/check/links.mjs --external --json docs/test/links-2026-11-07.json

1521 files (index.html, offline.html, sw.js, manifest, precache, `src/**`, `preview/**`, `data/**/*.json`, `docs/**/*.md`),
32,552 internal references resolved against the tree. Planted-breakage check: 8 deliberately wrong references in temporary
files were all reported (import, `new URL`, path literal, JSON `img`/`path`/`url`, Markdown link and image), then removed.

Broken: **1**. `data/curriculum/resource-concepts-gratis.json:152` points at `research_notes/resources/words/top625-user-supplied.csv`,
a path outside the repo (a source note, not loaded by the app). Left as is; the data owner should decide whether to keep the pointer.

Declared absences, listed not failed (6,219): 5,664 audio-manifest entries with `status: "missing"` (the clip is wanted but not
recorded; the player never plays them), 552 book pages in `data/books/book17..62.json` whose index row says `hasImages: false`
(the books list shows "Pictures coming" and draws no `<img>`), and the three image-pipeline inventories in `data/images/`
(`provenance.json`, `prompt-groups.json`, `next1000-groups.json`), whose own notes say the PNG originals are not in git.

External: 339 distinct URLs probed from the shell (HEAD, then GET with a browser user agent on 403/404/405/406/5xx; the shell
could reach the network, so WebFetch was not needed). 300 reachable. The 39 not reachable:

| Group | URLs | Reading |
|---|---|---|
| deliberate placeholders in `docs/qa/SVG-SANITISER-REVIEW.md` | `https://`, `https://...&quot`, 5 x `https://evil/...` | test strings, not links |
| expected 404 in `docs/deploy/GO-LIVE-CHECKLIST.md` | `alef-review.onrender.com/nope.js` | the checklist probes for a 404 |
| private repo (unauthenticated 404) | 3 x `github.com/ALENZACODES/Al-Heb/...` | fine |
| API endpoints that need a body or key | `vision.googleapis.com/...:annotate` (404), `texttospeech.googleapis.com/v1/voices` (403), `nakdan-u2-1a...dicta.org.il/api` (500) | fine |
| bot protection (Cloudflare "Just a moment" / "Access denied" with a browser UA too) | opensiddur.org x5, nli.org.il x2, openai.com x2, adobe.com, helpx.adobe.com, docs.midjourney.com, help.sefaria.org, tandfonline.com, urj.org | could not verify from this network |
| timeouts | azure.microsoft.com pricing x3 | could not verify from this network |
| dead or moved, in research/strategy docs | `clozemaster.com/blog/?p=7597`, `?p=7907` (404), `hebcal.com/home/about/terms` (404; the doc row itself records it as a 404 finding), `prod.sefaria.org.il/sheets/228381` and `red.ks32.dev/...` and `www.hebrewwithben.com` (DNS), `web.ma.utexas.edu/.../DuoHebrew.pdf` (503) | citations in docs; not changed |

Six Wikimedia Commons source links in `src/listen/catalog.js` contain parentheses; a first version of the checker cut them
there and reported 404s. With balanced parentheses allowed, all six resolve (200).

## 5. Live site (https://alef-review.onrender.com/, Render deploys main)

Fetched 2026-11-08 ~03:40 UTC with curl from the shell:

| Item | Result |
|---|---|
| `precache-manifest.js` | 200, `ALEF_VERSION = "f938eb9f19d0"`, 363 entries |
| committed `precache-manifest.js` at origin/main `9b65ef28` (22:31 -0500) | `b693405e0bd5` |
| committed at origin/main `8955df3e` (22:21 -0500, the previous main) | `f938eb9f19d0` = live |
| deep assets | `index.html` 200 (4,911 B), `sw.js` 200, `src/app.js` 200, `src/games/letterchomp.view.js` 200, `src/letters/trace.js` 200 (27,803 B), `data/letters/letters.json` 200, `assets/books/book1/BOOK1_p01.jpg` 200 image/jpeg 97 kB, `audio/m/sephardi/line/bless-priestly-3.mp3` 200 audio/mpeg 94 kB, `assets/games/arcade/cast/ari-host.png` 200, `assets/img/gen/BADGE_01.512.webp` 200 |
| `assets/games/arcade/letterchomp/env.png` | 404 (same as locally; optional art) |
| `manifest.webmanifest` | 200 but served as `binary/octet-stream` (should be `application/manifest+json`; browsers accept it, Lighthouse may warn) |

So the live site was serving the main of one commit earlier (`8955df3e`) at check time; the `9b65ef28` deploy had been pushed ten
minutes before and may still have been building.

## 6. Test runs

    npm test                           # on origin/main 9b65ef28 + this commit: 3180 tests, 3123 pass, 46 fail, 11 skipped
                                       # (on b616ac68 before and after the calendar/tracing fixes: the same 58 failed; the 46 are a subset of those)
    node tools/meta/scan.mjs --text    # FAIL: 65 findings, all pre-existing on main (asset/doc paths named after an image tool;
                                       #       precache-manifest.js, docs/qa, docs/images, data/images/approvals.json, ...); none in files touched here

The failing unit tests are data/doc currency checks (audio summary, image index, generated docs, deploy test) and fail
identically on main without this lane's changes (`/tmp/fail-before.txt` vs `/tmp/fail-after.txt` differed only by the 10 new
pointer tests, which fail on the old tracer and pass on the new one).

## Open items

- Arcade backdrops: 30 `env.png` files are requested and 404 on every game load (local and live). Either produce them or have
  `arcade.js` consult a manifest before creating the `<img>` (games lane).
- `manifest.webmanifest` content type on Render (`_headers` / Render static config).
- Calendar custom coordinates: no guard for a positive (eastern) longitude typed for a western city.
- `data/curriculum/resource-concepts-gratis.json` points at a path outside the repo.
- Meta scan is red on main (65 findings) independent of this lane.
