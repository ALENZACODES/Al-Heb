# Routes and nav strings for the main wiring (not edited here)

## `src/shell/router.js` (next to the `compare` line)
```js
{ name: 'tradition-quiz', pattern: '/tradition-quiz', module: '../pronunciation/quiz.view.js', title: 'Which tradition is this?', owner: 'pronunciation', optional: true, group: 'learn', quick: 'nav.traditionquiz' },
{ name: 'read-my-way', pattern: '/read-my-way', module: '../pronunciation/convert.view.js', title: 'Read it my way', owner: 'pronunciation', optional: true, group: 'learn', quick: 'nav.readmyway' },
{ name: 'rules', pattern: '/rules', module: '../pronunciation/rules.view.js', title: 'Pronunciation rules', owner: 'pronunciation', optional: true, group: 'learn', quick: 'nav.rules' },
{ name: 'rules-page', pattern: '/rules/:rule', module: '../pronunciation/rules.view.js', title: 'Pronunciation rules', owner: 'pronunciation', optional: true, group: 'learn' },
```
The rule pages read `ctx.params.rule` (kamatz, tav, holam, het, ayin, resh, stress); an unknown id falls back to the index with a message.

## `src/shell/i18n.js` (en table)
```js
'nav.traditionquiz': 'Which tradition is this?', 'nav.readmyway': 'Read it my way', 'nav.rules': 'Pronunciation rules',
```

## Contract
- All three: `mount(root, ctx)` returns unmount. Data in `data/pronunciation/runtime/` (`quiz-pool.json`, `rules.json`, lookup shards), built by `build_runtime.mjs` then `build_pages.mjs`.
- Quiz store key `pron.quiz.v1`; converter key `pron.readmyway.v1` (tradition from `settings.congregation`). Rule pages store nothing.
- Quiz is text-only: no recordings and no browser voice for Sephardi or Ashkenazi, so it shows the IPA or respelling, not audio.
- Everything is rule-generated and unverified by a native speaker; each view says so on screen.
- Build order after a change to `data/vocab/words.json`: build_variants, build_derived, build_runtime, build_pages, build_minimal_pairs, recording_script. Then `node tools/build-precache.mjs` (main, not run here).
