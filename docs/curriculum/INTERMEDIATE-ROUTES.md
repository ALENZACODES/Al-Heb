# Routes for the intermediate lesson player

The player is `src/curriculum/intermediate.view.js`. It exports `mount(root, ctx)`; `ctx.query.id` selects a lesson, otherwise the list is shown. Main adds these two lines to `ROUTES` in `src/shell/router.js` (not done by this lane):

```js
{ name: 'intermediate',       pattern: '/intermediate',     module: '../curriculum/intermediate.view.js', title: 'Intermediate lessons', owner: 'intermediate', optional: true, group: 'learn', quick: 'nav.intermediate' },
{ name: 'intermediatelesson', pattern: '/intermediate/:id', module: '../curriculum/intermediate.view.js', title: 'Intermediate lesson',  owner: 'intermediate', optional: true, paramQuery: { id: 'id' } },
```

Also needed by main:

- A `nav.intermediate` string (for example "Intermediate lessons") wherever `nav.*` strings live; the view falls back to English for its own heading.
- `node tools/build-precache.mjs`, so `src/shell/views.generated.js` lists the new view and the precache includes `intermediate.view.js` and `intermediate-adapter.js` (not run by this lane).
- `tools/qa/walk.mjs`: `SAMPLE` needs `id: 'I-01'` (today `id: null`, so the sample path for `/intermediate/:id` would be `/intermediate/x`, which shows the "Lesson not found" page). The routes that already use `:id` (`dialogue`, `fadeline`, `letter`) are special-cased by name in `sampleFor`, so the change does not affect them.

## Behaviour

- List: 50 lessons grouped by unit, with "n of m answered" or "done, score", a "needs native review" tag and a locked note when a prerequisite is not complete (lessons can still be opened).
- Lesson: draft notice, native-review flag, goals, words with one pronunciation line each (the learner's `congregation` setting for synagogue lessons, Israeli for Israel lessons) and a Listen button per word (`ctx.audio.play("word", "<lessonId>-w<n>", { voice, tradition })`), then the exercises one at a time. All ten types are rendered: recall, produce, match, order, respond, gender, dialogue, fade, spot, register. Self-rated types use ratings 1 to 4 (3 and 4 count as known).
- Keyboard: every control is a button or link; number keys 1 to 9 pick the matching option on choice exercises; focus moves to the exercise heading.
- Storage: key `intermediate.v1` = `{ lessons: { [id]: { results: { [exerciseId]: boolean }, done, score, total } } }`. On finishing a lesson the view also calls `completeLesson` (writes `curriculum.progress`, so prerequisites unlock) and applies word and fade-line outcomes to `srs.cards` through `applyOutcomesToCards`: a miss creates and lapses the word card.
- Tests: `tests/curriculum.intermediate-view.test.js` (fake DOM, every exercise type, right and wrong), `tests/curriculum.intermediate-adapter.test.js`.
