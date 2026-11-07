# ALEF — site craft and quality pass

**Owner attribution:** John Khan  
**Date:** 7 November 2026  
**Branch:** `chatgpt/site-quality-john-khan-2026-11-07`  
**Scope:** first-load shell, visual entry points, route discovery, beginner learning, audio truth, provenance, mobile and accessibility. No changes to the three character faces or production voice assets. No merge or live publish.

## Changes actually made

1. **First paint.** Home and Welcome render without awaiting optional image-approval data. Deep-linked lessons keep their existing resolver path. The resolver fills in the shared context after the first home paint.
2. **Prayer on first pixels.** The supplied Modeh Ani Hebrew/English fallback is present directly in `index.html`, so the opening is not a blank veil before the asynchronous 80-prayer bank arrives. The existing bank selection, no-repeat storage and short dismiss timer remain intact. With JavaScript off, the veil is hidden so the no-script warning is readable.
3. **Ancient olive-harvest artwork.** Preserve the approved cinematic 1600/900 px WebPs and their still/reduced-motion behaviour. Four live home navigation links reuse *different crops of that same local image*, with no extra icon library or download. No UI text is embedded in image pixels. The words and links remain available when images do not load.
4. **Beginner route.** Integrate the 240-word Day-0 Word Finder and its 26-game/9-level catalogue into one release candidate. The first 24 word choices were selected from entries with existing female/male Israeli synthetic audio slots, although actual playback may still fail if media are unavailable or settings disable sound.
5. **Truth in labels.** Remove the unsubstantiated “19,466 voice clips” homepage claim. Use the grounded counts: 26 games, 240 first words, five story books, three traditions. These are catalogue quantities, not a claim that a learner has heard a native recording or that all content is reviewed.
6. **Progress accuracy.** Count a Word Finder round only when five words are completed; retain credit for each correct headword if a learner leaves early.
7. **Progressive discovery.** Four large, tactile entryways lead to words, stories, games and prayers. The complete destination index is still present and keyboard reachable behind a disclosure on the first-run welcome screen; returning Home shows the index expanded.

## Priorities still unresolved

- **CI:** recent GitHub Actions runs have failed before publishing usable step logs, so `node tools/test/run.mjs unit` and full browser/screen-reader tiers **have not been run here**. No green release claim is authorised.
- **Offline generation:** `precache-manifest.js` and `src/shell/views.generated.js` are generated artifacts. The new Word Finder view should be included in the next run of `node tools/build-precache.mjs`; neither file has been hand-edited. First-install offline access to the new route is therefore not verified.
- **Visual QA:** different crops reuse one panoramic photograph, not four individually commissioned object photographs. Real Android/iOS responsive, contrast, landscape, 200%-zoom, and 60 fps checks remain required.
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
