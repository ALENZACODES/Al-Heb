# Browser tier triage, 2026-11-14

Run: `npm run test:browser` on `main` at `4876094b`, Chromium 153, one file at a time. 111 tests: 75 pass, 36 fail, 0 skipped. Every failing file was run again alone on a quiet machine; the failures below reproduced unless marked.

The browser tier is advisory in CI, so these failures did not block merges and have built up since about 2026-11-10. The commonest cause is the opening prayer (2026-11-10): while it shows, the rest of the page is inert, and tests written before it cannot focus or press anything unless they set `veilOptOut`.

| File | Test | First error | Status |
|---|---|---|---|
| `a11y.browser.test.js` | axe (quick subset, 4 configs): no critical issue and no colour-contrast failure on the shell and the core view | "ENOENT: no such file or directory, open '/tmp/rep/alef-axe-quick.json'" | Open |
| `a11y.browser.test.js` | keyboard-only walk: onboarding, trace, atlas quiz, vocab review, reader, calendar + More sheet (no result may  | focus mark | Open |
| `a11y.gate.test.js` | tools/a11y/gate.mjs: no regression against the baseline | FAIL keyboard: 143 ok, 9 FAIL, 0 gaps (baseline 0) | Open |
| `a11y.newviews.test.js` | new views: axe, focus, names, live regions, reduced motion, reflow, Hebrew lang/dir (only documented findings  | Expected values to be strictly deep-equal: | Fixed in the accessibility PR (/roots label in name) |
| `boot.noapis.browser.test.js` | late audio manifest: refresh waits while a field has focus, then re-renders on blur; an edited field is never  | focused field must not be replaced while it has focus | Fixed in the accessibility PR (test opened under the opening prayer) |
| `daily.a11y.browser.test.js` | browser /daily: the ring and the badge pictures are not read twice, and the heatmap table has every week the p | The input did not match the regular expression /of 50 points today/. Input: | Fixed here (goal carry-over bug; wording is XP now) |
| `daily.a11y.browser.test.js` | browser /daily: empty, corrupt and storage-blocked states render without errors; axe finds nothing at 360 px i | The input did not match the regular expression /of \d+ points today/. Input: | Fixed here (goal carry-over bug; wording is XP now) |
| `focus.quietrefresh.browser.test.js` | a quiet refresh after the delayed audio manifest keeps focus on #view-title | heading has focus before the refresh | Fixed in the accessibility PR (test opened under the opening prayer) |
| `focus.quietrefresh.browser.test.js` | a quiet refresh after the delayed word shard keeps focus on #view-title | Expected values to be strictly equal: | Fixed in the accessibility PR (test opened under the opening prayer) |
| `focus.quietrefresh.browser.test.js` | two overlapping quiet refreshes (manifest and shard released together) still leave focus on #view-title | Expected values to be strictly equal: | Fixed in the accessibility PR (test opened under the opening prayer) |
| `journey-clips.browser.test.js` | browser: first run, pronunciation step: "Start without sound" and its description are on separate lines at 360 | page.waitForSelector: Timeout 30000ms exceeded. | Open |
| `journey.test.js` | journey --quick: persona A, day 1, finishes under 90 s and records onboarding, the Today card and the tools | "Cannot read properties of undefined (reading 'letters')" | Open |
| `lab.browser.test.js` | browser: the Brain Lab page lists every game in its pack, with a token or cover for each and New on the added  | a round token beside every classic and synagogue-and-Israel game | Open |
| `lab.browser.test.js` | browser: keyboard play keeps its place every round, says right or wrong in words, and ends on a link that says | page.waitForSelector: Timeout 20000ms exceeded. | Open |
| `motor.browser.test.js` | browser: no tap target on the key screens is smaller than 44x44 CSS px at 375x667 | locator.scrollIntoViewIfNeeded: Element is not attached to the DOM | Passes on a quiet rerun |
| `motor.browser.test.js` | browser: "Large" button size makes buttons, setting rows and the letter strip at least 60px | '/learn: smallest button is 44px tall' | Fixed in the accessibility PR (Test out and Locked stayed 44px) |
| `motor.browser.test.js` | browser: Ask me to confirm each answer marks first, can be changed, and grades only on Check answer | locator.scrollIntoViewIfNeeded: Element is not attached to the DOM | Open |
| `motor.browser.test.js` | browser: letter strip is one Tab stop with arrow keys; Enter works on the Typing tab buttons; the on-screen ke | 'Animate reached after 16 Tab presses (was 40 before the letter strip became one stop)' | Open |
| `motor.browser.test.js` | browser: Reset settings asks first | Expected "actual" to be strictly unequal to: | Open |
| `nav.browser.test.js` | nav at 320 and 390 px: <=5 controls (v0 only), current marked, More menu by section + collapsed Preview, no pr | bottom bar shows only v0 destinations | Open |
| `offline.packs.browser.test.js` | offline: after saving the Core lessons and Core prayers packs, a core lesson and a prayer page render with the | #/service: shows the not-available card: Follow the Service: Needs a Connection the First Time | Open |
| `perf.test.js` | perf --quick: first-load JS bytes of / are under the budget | 'first-load JS 637805 B exceeds budget 532480 B' | Open |
| `phoneqa.browser.test.js` | browser: the sound bar message stays readable (not squeezed to a few letters) at the largest text size | 'page.waitForFunction: Timeout 30000ms exceeded.' | Open |
| `phoneqa.browser.test.js` | browser: Welcome answers each sit on their own row at 768px | answers share a row: 0,0,0 | Open |
| `pwa.browser.test.js` | pwa-check --quick: SW controls the page, Chromium reports no installability errors, offline reload works, upda | rsion installs a new SW and it waits (no takeover without consent) ["alef-shell-821215c9a227","alef-runtime-v1 | Open |
| `pwa.update-data.browser.test.js` | after a version bump, changed on-demand data, audio manifest, word shard, cache-first image and app file are s | Command failed: /opt/node22/bin/node /tmp/alef-swupd-abkLxx/tools/build-precache.mjs | Open |
| `qa.walk.test.js` | qa walk: derives its route list from ROUTES and has a sample for every path parameter | 'walk.mjs has no sample for :game' | Fixed here (samples for :game and :tool) |
| `retention/journey.browser.test.js` | ten days: first lesson, a freeze saves a missed day, a milestone, Shabbat rest, a recap, a break and a repair | three days at 150 gems each bring the 3-day streak back | Open |
| `retention/retention.browser.test.js` | top bar, daily-goal ring, shop purchase and league table at 320, 360 and 390 px | Expected values to be strictly deep-equal: | Open |
| `retention/retention.browser.test.js` | Home after a week away shows the welcome card; on Monday it shows last week | The input did not match the regular expression /Welcome Back.*Warm up with old words/s. Input: | Open |
| `retention/retention.browser.test.js` | by hand until now: the goal picker keeps focus and stays open by keyboard; a finished lesson stays open at zer | Expected values to be strictly deep-equal: | Open |
| `sweep.test.js` | sweep: derives routes from ROUTES and names every path parameter | 'sweep.mjs has no sample for :game' | Fixed here (sample for :game) |
| `talk.nmt.browser.test.js` | e2e #/talk: nothing of the pack is fetched until asked; download with progress; a new line is translated; a re | 'page.waitForFunction: Timeout 60000ms exceeded.' | Open |
| `talk.nmt.browser.test.js` | e2e #/talk with a (software) graphics adapter: the larger runtime and the two small graphs are fetched, the pr | 'page.waitForFunction: Timeout 60000ms exceeded.' | Open |
| `talk.nmt.browser.test.js` | e2e #/talk on a copy of the site built without the packs: they are pulled from the pack host, kept, and found  | 'page.waitForFunction: Timeout 60000ms exceeded.' | Open |
| `vocab.search.browser.test.js` | browser: #/vocab search for Hi leads with the shalom greeting, then the she transliteration | 'page.waitForFunction: Timeout 30000ms exceeded.' | Open |

## How to re-run one file

```sh
npm install --no-save --no-package-lock playwright@1.63.0 && npx playwright install chromium
npm ci --prefix tools/a11y && node tools/deploy/build_site.mjs
node --test tests/<file>.test.js
```
