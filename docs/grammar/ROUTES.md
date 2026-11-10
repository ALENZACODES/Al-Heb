# Grammar notes (draft)

Routes to add in `src/shell/router.js` (shell owner):

```js
{ name: 'grammar', pattern: '/grammar', module: '../grammar/grammar.view.js', title: 'Grammar notes', owner: 'grammar', optional: true, group: 'learn', quick: 'nav.grammar' },
{ name: 'grammartopic', pattern: '/grammar/:topic', module: '../grammar/grammar.view.js', title: 'Grammar topic', owner: 'grammar', optional: true, paramQuery: { topic: 'topic' } },
```

String to add in `src/shell/i18n.js`: `'nav.grammar': 'Grammar notes'`.

Also add `grammar/grammar.view.js` to `src/shell/views.generated.js` (VIEW_FILES) by regenerating it. No precache build was run.

- Store key: `grammar.v1` = `{ topics: { [id]: { attempts, best, total, last, done } } }`.
- Topics: `article`, `prefixes`, `construct`, `plurals`, `roots`, `openings`.
- Data read: `data/vocab/words.json`, `data/corpus/registry.json`, `data/grammar/notes.json` (English notes and construct gloss only).
