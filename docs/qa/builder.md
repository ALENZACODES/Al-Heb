# Front-page builder — Task 1

Tested November 7, 2026 (America/Toronto). Implementation and automated
checks are complete. The user said the sample “sounds fine,” conditional on
its correctness. Pronunciation still requires independent listening review.

## Changes

- `data/builder_words.json`: 162 words; 76 have exactly three letters.
  Every entry has nikud, three phonetic fields, meaning, letters, level,
  and both audio paths. Vocabulary attribution is in `data/builder-LICENSE.md`.
- `data/builder_symbols.json`: 27 letter forms and 15 vowel/dot marks,
  with pointed names, phonetics, meaning, and two name recordings each.
- `src/home/builder.js`, `builder-model.js`, `src/shell/showcase.js`,
  `assets/css/builder.css`, and `index.html`: front-page builder with five
  levels, the selected voice, normal replay, separate 0.6x replay, optional
  vowel placement, hover/long-press name audio, and one completion autoplay.
- `src/awards/observe.js`: connects finished builder attempts to the
  existing first-attempt badge. The existing game scoring awards 10 points
  for each newly built word; repeats do not inflate the total.
- `tools/audio/voices.json`: shared Ari/Noa configuration for this batch.
  Ari is he-IL-Chirp3-HD-Charon; Noa is he-IL-Chirp3-HD-Kore.
- `audio/builder/`: 324 word clips and 84 symbol-name clips.
- 40 existing Israeli shalom paths were replaced with the same new pair;
  `tools/audio/builder-shalom-replacements.json` lists each destination.
- Generation, regeneration, checksum, and encoding scripts are in
  `tools/audio/`; browser checks are in `tools/qa/`.
- The offline manifest and focused tests were updated. The award test's
  file-URL handling was corrected for Windows.

## Verified counts and behavior

- 162 words built through the browser UI; 1620 points persisted.
- 162 completion events each requested exactly one normal-speed playback.
- 324/324 word clips and 84/84 symbol clips exist, load without 404, and
  reach the browser's playback-ended event at normal speed.
- 40/40 replaced shalom paths also reach playback-ended without errors.
- 408 new files pass full decoding and checksum checks; audio bitrate is
  48 kbps. The 40 replacements are byte-identical to the verified pair.
- Level 1 defaults to eight letter forms and 13 two/three-letter words.
  Level 2 offers 43 words, Level 3 offers 143, Level 4 offers 159, and
  Level 5 offers all 162. All 27 letter forms are available from Level 3.
- Every offered word can be built with that level's tray; every mark in
  the word list has a matching vowel/dot control.
- Voice preference persists. Changing phonetic style leaves the audio
  path unchanged. Slow plays at 0.6x; subsequent normal replay uses 1x.
- Desktop width 1280 and phone width 375: no horizontal overflow,
  no page/console errors, no missing requests during the main browser pass.
- Phone taps complete a word under the browser's default autoplay policy;
  long-press reveals/plays a letter name without placing the letter.
- 51 focused builder, home, and awards tests pass.

`builder-results.json` records browser counts. Screenshots are
`builder-phone.png`, `builder-desktop.png`, and `builder-full-alphabet.png`.

## Listening check

The user said the sample “sounds fine,” then clarified “if its correct.”
This is conditional feedback, not confirmation of pronunciation correctness.
The sample contains these clips, in order:

1. shalom — Ari
2. shalom — Noa
3. aba — Ari
4. ima — Noa
5. mayim — Ari
6. lechem — Noa
7. sefer — Ari
8. shemesh — Noa
9. bayit — Ari
10. ruach — Noa

The inherited phonetic data has not received a new native-educator review.
No other game, Torah-reader, or mascot task has been started. Existing
audio outside this builder and the listed shalom replacements was not
regenerated or certified by this task.

## Reproduce

Run `node tools/audio/build-builder-data.mjs` and
`node tools/audio/build-builder-symbols.mjs` to rebuild the data.
`node tools/audio/render-builder.mjs` estimates missing clips without
network calls. Set `GOOGLE_TTS_API_KEY` and `FFMPEG` locally, then add
`--execute` to render. Add `--redo` to regenerate existing clips.
Run `node tools/audio/refresh-builder-shalom.mjs` afterward to update aliases.
No credentials belong in the repository.

The initial 2,558-character batch estimate was US$0.07674 at US$30 per
million characters, before any free allowance. Pricing source:
https://cloud.google.com/text-to-speech/pricing

Run `node tools/audio/verify-builder.mjs --decode` with `FFMPEG` set.
Run `node --test tests/home.builder.test.js tests/home.hero.test.js
tests/home.harvest.assets.test.js tests/site.quality.test.js
tests/awards.model.test.js tests/awards.view.test.js` for the focused tests.

Start the app with `node tools/serve.mjs 8080`. With Playwright available
as a local module (or its module URL in `PLAYWRIGHT_MODULE`), run
`node tools/qa/qa-builder.mjs` followed by
`node tools/qa/qa-builder-mobile.mjs`. Optional settings are
`BROWSER_EXECUTABLE` and `BUILDER_URL`. All checks run locally.
