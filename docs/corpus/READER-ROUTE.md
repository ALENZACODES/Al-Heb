# Torah reader: route, nav string and wiring

The view is `src/torahreader/torahreader.view.js` (`export function mount(root, ctx)`, returns an unmount function with a `.ready` promise, like `src/sprint/`). It is not wired into the shell yet: the files that do that belong to other lanes. Add exactly these lines.

## 1. Route (`src/shell/router.js`, next to the `torahread` rows)

```js
{ name: 'torahreader', pattern: '/torahreader', module: '../torahreader/torahreader.view.js', title: 'Torah reader', owner: 'torahreader', optional: true, group: 'learn', quick: 'nav.torahreader' },
```

URL: `#/torahreader`. There is no sub-route: the passage and the legend are switched inside the view and remembered in the store.

## 2. Nav string (`src/shell/i18n.js`, in the `nav.*` list)

```js
'nav.torahreader': 'Torah reader',
```

## 3. Other generated or shared lists

- `src/shell/views.generated.js` is written by `node tools/build-precache.mjs` (it lists every `src/**/*.view.js`); run that, do not edit by hand. Until it is run, the optional route is hidden from nav and quick links.
- `src/shell/offline.js` `GROUPS`, group `reading`: its path pattern lists `src/torahread/` but not `src/torahreader/`; add `src\/torahreader\/` to the alternation or the new files show up under "other". The data it reads is already in the `reading` group (`data/corpus/`).

## 4. What the view reads and writes

| | |
|---|---|
| Data (fetched lazily) | `data/corpus/reader/priestly-blessing.json`, `data/corpus/reader/shema.json`, `data/corpus/trope/table.json`, `data/corpus/trope/priestly-blessing.json`, `data/corpus/trope/shema.json` (built by `node tools/corpus/trope.mjs`) |
| Store key | `torahreader.v1` = `{ v: 1, passage: 'priestly-blessing' \| 'shema', view: 'reader' \| 'legend', showTrope, showNiqqud, speed: 'slow' \| 'medium' \| 'fast' }`. Unknown values fall back to the defaults. The highlighted word and the selected word are not stored. |
| Settings | `congregation` (`israeli`, `sephardi`, `ashkenazi`; default `sephardi`): picks the transliteration tradition (`src/pronunciation/transliterate.js`, scheme `siddur`) and the trope naming system (Ashkenazi list for `ashkenazi`, Sephardi list otherwise). |
| Audio | `ctx.audio.play('word', id, {text})` and `play('line', id, {text})`. Registry-backed verses use the manifest ids the corpus reader uses (`bless-priestly-<1..3>-w<k>`, `bless-priestly-<1..3>`, `shema-vahavta-w<k>`, `shema-vahavta-l<k>`). Numbers 6:22-23 and 6:27 have no registry record, so they use `torahreader-priestly-blessing-<verse>` / `-<verse>-<token>` with the text only; the player answers `unknown-item` unless it falls back to the browser voice, and the view says which happened. The divine name is sent as אֲדֹנָי, as in the manifest. |
| ctx extras (tests) | `ctx.clock {setInterval, clearInterval}`, `ctx.loadJson(rel)` |

## 5. What it shows, and what it does not claim

- Numbers 6:22-27 (the Priestly Blessing proper is 6:24-26; 6:22-23 and 6:27 are narrative and are labelled so) and Deuteronomy 6:4-9, word by word (maqaf groups are one button), with a toggle each for cantillation marks and vowel points.
- Tap or press a word: pointed form with its mark, transliteration, the mark's name in the learner's naming system and class, a literal gloss where the corpus has one (Numbers 6:24-26 and Deuteronomy 6:4 only), and "Hear it".
- Read with me: a highlight that steps through the words at Slow (2.4 s), Medium (1.5 s) or Fast (0.9 s) per word, with Previous/Next word. It is a pacing aid; the screen says it is not synchronised with any audio. It pauses when the page is hidden, when the learner leaves the reader, or on unmount.
- Keyboard: every control is a native `button`; words use a roving tab stop; ArrowLeft goes to the next word and ArrowRight to the previous one (Hebrew reads right to left); Home and End jump to the first and last word.
- Trope legend: a table of every prose-system mark (Unicode point, Ashkenazi and Sephardi names, class, level, placement, how many times it occurs in the two passages) with a filter for the marks that occur here. It is marked as a reference, not a chanting teacher: no melodies, no recordings, no cantor review.
- Not done: no speech recognition, no syllable-level highlighting, no audio-aligned timing (`timing` fields in the reader data stay `null`), no clergy or cantor review.

## 6. Tests

`tests/torahreader.model.test.js` (state, display switches, audio ids checked against the audio manifest, legend data) and `tests/torahreader.view.test.js` (fake DOM from `tests/torahread.fakedom.js`: this checks view logic, not browser rendering). Real-browser rendering, screen-reader behaviour and the RTL arrow-key order have not been tried in a browser.
