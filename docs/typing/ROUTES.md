# Typing practice (draft, unreviewed)

Route line for the shell owner to add:

```js
{ name: 'typing', pattern: '/typing', module: '../typing/typing.view.js', title: 'Typing practice', owner: 'typing', optional: true, group: 'learn', quick: 'nav.typing' }
```

String to add: `nav.typing` = "Typing practice".

- Module: `src/typing/typing.view.js` exports `mount(root, ctx)` and returns an unmount function. Store key: `typing.v1`.
- Data: `data/typing/drills.json` (built by `src/typing/build.mjs` from `data/vocab` and the `data/corpus` registry); layout read from `data/letters/keyboard-si1452.json` (read-only here).
- Drills: single letters, final forms, first 200 words of `data/vocab/deck-order.json`, unpointed prayer lines.
- Input: device Hebrew keyboard, on-screen keyboard, or an optional Israeli key-position mapping for English keyboards (physical key codes mapped from the SI-1452 layout).
- Stats are plain counts from the learner's own practice (right answers, characters per minute on right answers); no fluency claims.
- Niqqud entry guide (`src/typing/guide.js`) is labelled "general knowledge, not tested here".
- Not done: browser-tested layout; real-device checks of the guide steps.
