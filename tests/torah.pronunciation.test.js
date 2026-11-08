import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { transliterate } from '../src/pronunciation/transliterate.js';
import { speechText } from '../src/shell/names.js';
const root = new URL('../data/corpus/torah/', import.meta.url);
const index = JSON.parse(fs.readFileSync(new URL('index.json', root), 'utf8'));
const builtChapters = index.books.flatMap(b => Array.from({length:b.chapters}, (_,i) => JSON.parse(fs.readFileSync(new URL(`${b.id}/${String(i+1).padStart(2,'0')}.json`, root), 'utf8'))));
test('attached divine-name prefixes use the same substitute as Hebrew audio', () => {
  for (const source of ['לַיהוָה', 'בַּיהוָה', 'וַיהוָה', 'מֵיְהוָה', 'אֶת־יְהוָה']) {
    for (const tradition of ['israeli', 'sephardi', 'ashkenazi']) {
      const guide = transliterate(source, { tradition });
      assert.equal(guide, transliterate(speechText(source), { tradition }));
      assert.match(guide, tradition === 'ashkenazi' ? /adonoy/ : /adonai/);
      assert.doesNotMatch(guide, /ivah|yevah/);
    }
  }
});
test('all five books have Hebrew, English, and a nonempty Latin reading aid for every verse', () => {
  let count = 0;
  for (const chapter of builtChapters) for (const verse of chapter.verses) {
    const ref = `${chapter.ref}:${verse.n}`;
    assert.match(verse.he, /[א-ת]/, ref);
    assert.match(verse.en, /[A-Za-z]/, ref);
    for (const tradition of ['israeli', 'sephardi', 'ashkenazi']) {
      const guide = transliterate(verse.he, { scheme: 'siddur', tradition });
      assert.match(guide, /[a-z]/i, `${ref} ${tradition}`);
      assert.doesNotMatch(guide, /[א-ת]|undefined|NaN/, `${ref} ${tradition}`);
    }
    count++;
  }
  assert.equal(count, 5846);
});


