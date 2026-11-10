import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from '../tools/letters/build_memory_chain.mjs';
import { textHit } from '../tools/meta/text.mjs';

const read = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const chain = read('data/letters/memory-chain.json');
const letters = read('data/letters/letters.json');
const cons = read('data/pronunciation/consonants.json').letters;
const words = new Map(read('data/vocab/words.json').words.map((w) => [w.id, w]));
const TRADS = ['israeli', 'sephardi', 'ashkenazi'];
const base = (h) => [...h].filter((c) => c >= 'א' && c <= 'ת');

test('meta: needsNativeReview, generated date, rules', () => {
  assert.equal(chain.meta.needsNativeReview, true);
  assert.match(chain.meta.generated, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Array.isArray(chain.meta.rules) && chain.meta.rules.length >= 4);
});

test('exactly the 27 letter ids, once each, in letters.json order, with glyph and name', () => {
  assert.deepEqual(chain.letters.map((l) => l.id), letters.map((l) => l.id));
  for (const c of chain.letters) {
    const L = letters.find((l) => l.id === c.id);
    assert.equal(c.hebrew, L.he, c.id);
    assert.equal(c.name, L.name, c.id);
  }
});

test('the data file is exactly what the builder produces (no hand edits, no stale file)', () => {
  const { doc, errors } = build();
  assert.deepEqual(errors, []);
  assert.deepEqual(chain, doc);
});

test('word: exists in words.json, noun, not hidden, rank <= 1500, edge letter matches, text copied from the record', () => {
  for (const c of chain.letters) {
    const w = words.get(c.word.vocabId);
    assert.ok(w, c.id + ' vocabId exists');
    assert.equal(c.word.he, w.he, c.id + ' pointing copied');
    assert.equal(c.word.rank, w.frequencyRank, c.id);
    assert.equal(c.word.translit, w.translit, c.id);
    assert.ok(!(w.flags && w.flags.hidden), c.id + ' not hidden');
    assert.equal(w.pos, 'noun', c.id);
    assert.ok(w.frequencyRank >= 1 && w.frequencyRank <= 1500, `${c.id} rank ${w.frequencyRank}`);
    const bl = base(w.he);
    const final = c.id.endsWith('-final');
    assert.equal(c.word.position, final ? 'final' : 'initial', c.id);
    assert.equal(final ? bl[bl.length - 1] : bl[0], c.hebrew, `${c.id}: word ${w.he} must ${final ? 'end' : 'start'} with the letter`);
    const senses = [w.en, ...(w.alt || [])].join(' | ').toLowerCase();
    assert.ok(senses.includes(c.word.gloss.toLowerCase()), `${c.id} gloss "${c.word.gloss}" comes from the record`);
  }
});

test('mark rules: dotted bet/kaf/pe/tav, shin dot, undotted final kaf', () => {
  const marks = (h, i) => { let n = -1, o = ''; for (const ch of h) { if (ch >= 'א' && ch <= 'ת') n++; else if (n === i) o += ch; } return o; };
  for (const id of ['bet', 'kaf', 'pe', 'tav']) {
    const c = chain.letters.find((l) => l.id === id);
    assert.ok(marks(c.word.he, 0).includes('ּ'), id + ' word starts with a dagesh');
  }
  const shin = chain.letters.find((l) => l.id === 'shin');
  assert.ok(marks(shin.word.he, 0).includes('ׁ'), 'shin word has the right-hand shin dot');
  const kf = chain.letters.find((l) => l.id === 'kaf-final');
  const bl = base(kf.word.he);
  assert.ok(!marks(kf.word.he, bl.length - 1).includes('ּ'), 'final kaf has no dagesh');
});

test('sound: per-tradition claims match consonants.json notes; differences are stated plainly', () => {
  for (const c of chain.letters) {
    assert.deepEqual(Object.keys(c.sound.perTradition).sort(), TRADS.slice().sort(), c.id);
    for (const t of TRADS) {
      const line = cons[c.id].english[t];
      const text = c.sound.perTradition[t];
      assert.ok(text.includes(line), `${c.id} ${t} quotes the consonants.json line`);
      assert.match(text, c.sound.matches[t] ? /^Same / : /^(Differs|Hook is a spelling cue)/, `${c.id} ${t} wording matches its flag`);
    }
  }
  const by = (id) => chain.letters.find((l) => l.id === id).sound.matches;
  assert.deepEqual(by('chet'), { israeli: true, sephardi: false, ashkenazi: true });
  assert.deepEqual(by('ayin'), { israeli: true, sephardi: false, ashkenazi: true });
  assert.deepEqual(by('resh'), { israeli: false, sephardi: false, ashkenazi: false });
  for (const id of ['bet', 'gimel', 'dalet', 'zayin', 'lamed', 'mem', 'nun', 'samekh', 'pe', 'qof', 'shin', 'tav']) {
    assert.ok(TRADS.every((t) => by(id)[t]), id + ' same in all three');
  }
});

test('hook: present, and its sound is where hookPosition says', () => {
  for (const c of chain.letters) {
    assert.ok(c.sound.hook.length > 1 && c.sound.line.length > 5, c.id);
    assert.ok(['initial', 'medial', 'final'].includes(c.sound.hookPosition), c.id);
  }
  const pos = (id) => chain.letters.find((l) => l.id === id).sound.hookPosition;
  assert.equal(pos('tsadi'), 'medial');
  assert.equal(pos('kaf-final'), 'final');
});

test('story: at most 14 words and ties picture, hook, word and gloss together', () => {
  for (const c of chain.letters) {
    const n = c.story.trim().split(/\s+/).length;
    assert.ok(n >= 5 && n <= 14, `${c.id} story has ${n} words`);
    const s = c.story.toLowerCase();
    assert.ok(s.includes(c.sound.hook.toLowerCase()), c.id + ' story has the hook');
    assert.ok(s.includes(c.word.gloss.toLowerCase()), c.id + ' story has the gloss');
    assert.ok(s.includes(c.word.translit.toLowerCase()), c.id + ' story has the word');
  }
});

test('picture, tip and risk fields', () => {
  for (const c of chain.letters) {
    assert.ok(c.picture.idea.length > 20, c.id);
    assert.ok(c.picture.alt.length > 10 && c.picture.alt.length <= 100, c.id + ' alt length');
    assert.equal(c.picture.svg, `assets/letters/morph/${c.id}.svg`);
    assert.ok(c.tip.length > 10 && !c.tip.includes('\n'), c.id);
    assert.ok(Array.isArray(c.risk), c.id);
    assert.ok(!/[֐-׿]/.test(c.picture.idea + c.picture.alt + c.story + c.tip + c.sound.line), c.id + ' no Hebrew typed in prose');
  }
});

test('no tool or vendor names in the chain data or its source', () => {
  for (const f of ['data/letters/memory-chain.json', 'tools/letters/memory-chain.source.json', 'tools/letters/build_memory_chain.mjs']) {
    assert.ok(!readFileSync(new URL('../' + f, import.meta.url), 'utf8').split('\n').some(textHit), f);
  }
});
