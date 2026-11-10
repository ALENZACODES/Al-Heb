# Aleph — site craft and quality pass

**Owner attribution:** John Khan  
**Date:** 7 November 2026  
**Branch:** `site-quality-john-khan-2026-11-07` (feature branch)  
**Scope:** first-load shell, visual entry points, route discovery, beginner learning, audio truth, provenance, mobile and accessibility. No changes to the three character faces or production voice assets. No merge or live publish.

## Changes actually made

1. **First paint.** Home and Welcome render without awaiting optional image-approval data. Deep-linked lessons keep their existing resolver path. The resolver fills in the shared context after the first home paint.
2. **Prayer on first pixels.** The supplied Modeh Ani Hebrew/English fallback is present directly in `index.html`, so the opening is not a blank veil before the asynchronous 80-prayer bank arrives. The existing bank selection, no-repeat storage and short dismiss timer remain intact. With JavaScript off, the veil is hidden so the no-script warning is readable.
3. **Ancient olive-harvest artwork.** Preserve the approved cinematic 1600/900 px WebPs and their still/reduced-motion behaviour. Four live home navigation links now pair two dedicated clean artifact pictures (carved clay for Word Finder, shofar and pomegranates for Games) with two responsive harvest-image crops for Books and Prayers, without an icon library or additional remote requests. No UI text is embedded in image pixels. The words and links remain available when images do not load.
4. **Beginner route.** Integrate the 240-word Day-0 Word Finder and its 25-listed-game/9-level catalogue into one release candidate. The first 24 word choices were selected from entries with existing female/male Israeli synthetic audio slots, although actual playback may still fail if media are unavailable or settings disable sound.
5. **Truth in labels.** Remove the unsubstantiated “19,466 voice clips” homepage claim. Use the grounded counts: 25 listed games across nine levels, 240 first words, five story books, three traditions. These are catalogue quantities, not a claim that a learner has heard a native recording or that all content is reviewed.
6. **Progress accuracy.** Count a Word Finder round only when five words are completed; retain credit for each correct headword if a learner leaves early.
7. **Progressive discovery.** Four large, tactile entryways lead to words, stories, games and prayers. The complete destination index is still present and keyboard reachable behind a disclosure on the first-run welcome screen; returning Home shows the index expanded.

## Priorities still unresolved

- **CI:** recent GitHub Actions runs have failed before publishing usable step logs, so `node tools/test/run.mjs unit` and full browser/screen-reader tiers **have not been run here**. No green release claim is authorised.
- **Offline generation:** `precache-manifest.js` and `src/shell/views.generated.js` are generated artifacts. The new Word Finder view should be included in the next run of `node tools/build-precache.mjs`; neither file has been hand-edited. First-install offline access to the new route is therefore not verified.
- **Visual QA:** two dedicated cultural-object photographs now distinguish Words and Games; Books and Prayers still reuse the harvest panoramic photograph. Real Android/iOS responsive, contrast, landscape, 200%-zoom, and 60 fps checks remain required.
- **Content:** 240 word records are sourced from the existing lexicon; simplified English classroom cues are editorial and **not native-teacher reviewed**. A word in the dictionary is not proof that every requested audio file plays.
- **Human voice:** current project summaries show synthetic assets but no human-teacher recordings. The interface must continue to distinguish device voices, synthetic files and unavailable speech.
- **Publication:** the repository README states that hosting has not been deployed. A GitHub branch does not mean that the public homepage is live.

## Attribution and metadata

The site footer remains exactly: “Made by John Khan · © 2026 John Khan. All rights reserved.” The additional graphical entrances reuse existing local harvest assets; no new EXIF, XMP, image tracking or hidden watermarks were introduced. Repository source-credit obligations, including CC BY-SA attribution for derived dictionary records, must **not** be stripped: those are legal acknowledgements, not personal image metadata. GitHub commit identity and timestamps are recorded by GitHub and cannot honestly be represented as absent. This branch does not insert a third-party name into page credit.

## Independent checks

- `tests/site.quality.test.js` — first-load fallbacks, navigation, visual assets, privacy-sensitive page credit, voice index selection
- `tests/games.wordfinder.test.js` — 240-item source data and learner interactions
- `tests/home.hero.test.js`, `tests/home.harvest.assets.test.js` — scene and responsive local WebPs
- `node tools/build-precache.mjs` followed by `git diff --exit-code precache-manifest.js src/shell/views.generated.js`
- `node tools/test/run.mjs unit` and `node tools/test/run.mjs browser`
- Direct phone acceptance: first-visit/return-visit prayer, tap-to-skip, Word Finder five-word cycle, all four doorways, Enter/Space keyboard controls, photo crop at 320 px, no auto-spoken material, offline state, reduced motion

Until those gates run successfully, this work remains **a feature-branch release candidate**.


## Isolated checks performed on 7 November 2026

A source-level JavaScript harness (not a full-browser test) returned **24 passes / 0 failures** for script syntax, the immediate prayer fallback, 80 unique prayers and no-repeat selection, 240 unique words, 24 male/female Israeli lookup entries, four homepage navigation doorways, and progress through the full 240-word bank. After the main-branch truth corrections were reconciled, another **20 passes / 0 failures** covered module syntax, CSS brace balance, six route aliases, honest game labels, and removal of the unavailable Echo Chamber from the advertised catalogue.

An independent fake-DOM five-word interaction run found five correct words, granted **no** progress on an incorrect choice, sent the Hebrew playback request through the unchanged `word` audio interface, and saved **one** completed round rather than five. Those results are useful **partial evidence**, not proof of real-device playback, cross-browser rendering, full unit-suite success or sacred-text correctness.

The draft PR is <https://github.com/ALENZACODES/Al-Heb/pull/30>. The branch has been reconciled with the 7 November main truth pass (laser/sonar titles, route aliases, OCR copy, game unlisting) and is Git-mergeable, but it must remain a draft. The latest connected CI run is <https://github.com/ALENZACODES/Al-Heb/actions/runs/42349174248>, which reported failure before providing useful execution steps. Do not label it green.

**Next gates in order:** repair the GitHub Actions runner; regenerate the two offline artifacts with the project generator; run the full unit and browser tiers; manually validate 320/390 px phones and screen readers; check the 24 starter words with real clip playback; only then seek John Khan's explicit merge/publish approval.


## Manual integration and regression addendum — 7 November 2026

These changes were made directly on the review branch, without relying on the scheduled review.

### Integration
- Brought the current main audio-only changes into the review branch by a two-parent merge commit, preserving all upstream additions without overwriting the site changes. At the time of reconciliation, the branch was 0 commits behind main and draft PR #30 was mergeable.
- Manually regenerated `src/shell/views.generated.js` from the actual repository's `src` Git tree, using the same sorted `*.view.js` selection and output format as `tools/build-precache.mjs`. The inventory changed from 111 to 112 views, adding only `games/wordfinder.view.js`. No other route disappeared.
- Added a regression gate comparing every local `ROUTES` module with the generated view inventory. Route audit: **126 routes, 112 generated views, 0 missing local modules, 0 duplicate names/patterns**.

### Interaction and accessibility corrections
- When Word Finder redraws a wrong answer, a usable answer button now receives focus; after `Show me a hint`, the highlighted answer receives focus; after success, the next action receives focus. A new regression exercises the focus and credit boundaries.
- An explicit prayer-audio request can outlast the ordinary 2.2-second/0.8-second loading-veil deadline, but now has an **18-second maximum hold**. If the media element never emits `ended`, the veil is removed and playback is stopped. Without a Listen tap, the original short deadlines remain unchanged.
- The supplied Modeh Ani fallback and 80-entry prayer-bank selection are unchanged.

### Manual evidence (targeted, not full-browser)
- **11/11** manually executed Word Finder interaction checks passed in a source-level JavaScript DOM harness: original-word display, recorded-audio interface call, three choices, wrong-answer boundary, focus restoration, hint restoration, correct-answer save, five-word completion, and one-round accounting.
- **7/7** manually executed prayer-veil checks passed with a simulated indefinitely pending audio playback: bank readiness, available Listen control, initial 2.2-second deadline, playback start, 18-second fail-safe, veil removal and audio shutdown.
- **11/11** route and homepage checks passed: all 126 routes present and unique, generated view inventory, four working home portal destinations, live first-word builder, responsive picture node, and absence of the old unsupported clip-count claim.
- **720** model-generated three-choice rounds checked across the 240-word bank with no duplicate Hebrew choices; 80 prior-prayer candidates each checked at three random selection points without an immediate repeat.
- Both local harvest WebPs were opened: **1600 × 900 / 278,040 bytes** and **900 × 507 / 100,068 bytes**. Neither carried EXIF or XMP chunks.

### Remaining release gates
- GitHub Actions job records still show failures with no executable steps or usable job logs; those are *not* equivalent to unit or browser test failures. The underlying runner failure cannot be identified from the available job-step data.
- `precache-manifest.js` still requires the **actual** `node tools/build-precache.mjs` run on a complete checkout to include the new first-word module, its model, and data; it was not edited by hand. First-install offline Word Finder remains unverified.
- Full Node unit tier, full Chromium accessibility/browser tier, physical-phone rendering/60-fps performance, actual audio playback, and native-Hebrew instructional review remain open.
- PR #30 remains a review candidate. The site is not certified as production-ready and no production merge or deployment was made.

**Site credit remains John Khan.** Source-licence acknowledgements and GitHub's recorded commit authors/timestamps are separate from the app's public attribution and are not falsely removed or renamed.

### Dedicated portal image follow-up

The four doorway links remain ordinary accessible DOM anchors. The Word Finder and Games doorway backgrounds now use distinct, text-free local WebP files rather than enlarging different areas of the same panorama:

- `assets/img/gen/PORTAL_words_clay.webp`: 600 × 450, 43,470 bytes, an olive-tree and fired-clay harvest composition with carved stone.
- `assets/img/gen/PORTAL_games_shofar.webp`: 600 × 450, 50,590 bytes, a resting shofar and pomegranates beneath the ancient roots.

Both assets were visually inspected, checked for RIFF/WEBP structure and stripped of EXIF/XMP metadata. The site keeps the original landmark/tree artwork for the Books and Prayers doorways and reduced-motion compatibility. No character artwork or audio was altered.
