import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { englishSpeechText } from '../tools/torah/chirp-english/speech-text.mjs';

test('English speech substitutes LORD while preserving the Exodus 6:3 source', () => {
  const source = 'but by My name יהוה I made Me not known to them.';
  assert.equal(englishSpeechText(source), 'but by My name LORD I made Me not known to them.');
  assert.equal(englishSpeechText('יְהוָה'), 'LORD');
  assert.match(source, /יהוה/);
  assert.throws(() => englishSpeechText('שלום'), /untranslated Hebrew/);
});

test('the entire English Torah is unchanged for speech except its one written divine name', () => {
  let changed = 0, verses = 0;
  for (const book of ['genesis','exodus','leviticus','numbers','deuteronomy']) {
    const dir = new URL(`../data/corpus/torah/${book}/`, import.meta.url);
    for (const name of fs.readdirSync(dir).filter(n => n.endsWith('.json'))) {
      const ch = JSON.parse(fs.readFileSync(new URL(name,dir),'utf8'));
      for (const v of ch.verses) {
        verses++;
        const spoken = englishSpeechText(v.en);
        assert.doesNotMatch(spoken, /[א-ת]/);
        if (spoken !== v.en) { changed++; assert.equal(book,'exodus'); assert.equal(ch.chapter,6); assert.equal(v.n,3); }
      }
    }
  }
  assert.equal(verses,5846); assert.equal(changed,1);
});
