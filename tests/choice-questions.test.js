// Quick-check questions (buildChoiceQuestions): no distractor may also be a correct answer, in any of the three traditions.
// Data is read from disk (no network). Covers docs/review/V0-CONTENT-CHECK.md Q1 to Q10.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChoiceQuestions, soundsClash, skeleton, glossesOverlap } from '../src/curriculum/exercises.session.js';
import { loadContent } from '../src/curriculum/content.js';
import { lessons } from '../src/curriculum/lessons.js';

const TRADS = ['israeli', 'sephardi', 'ashkenazi'];
const SEEDS = [1, 2, 3, 7, 11, 23, 42, 99];
const c = await loadContent();
const real = lessons.filter((l) => !/^I-\d{2}$/.test(l.id));
const wordPool = real.flatMap((l) => l.words);
const byHe = new Map([...c.letters.values()].map((L) => [L.he, L]));
const rootOf = (L) => L.finalOf || L.id;

test('letter-sound distractors never share a sound with the answer in the learner tradition (all lessons, seeds, traditions)', () => {
  let checked = 0;
  for (const tr of TRADS) for (const l of real) for (const seed of SEEDS) {
    for (const q of buildChoiceQuestions(l, { ...c, wordPool }, { seed, tradition: tr, lessons: real }).filter((x) => x.kind === 'letter-sound')) {
      const ans = byHe.get(q.options[q.answerIndex].text);
      q.options.forEach((o, i) => {
        if (i === q.answerIndex) return;
        const d = byHe.get(o.text);
        assert.ok(!soundsClash(c.consonants.get(ans.id), c.consonants.get(d.id), tr), `${tr} ${q.id} seed ${seed}: ${d.id} sounds like ${ans.id}`);
        assert.notEqual(rootOf(d), rootOf(ans), `${tr} ${q.id}: ${d.id} is the base/final form of ${ans.id}`);
        checked++;
      });
    }
  }
  assert.ok(checked > 500, `only ${checked} distractors checked`);
});

test('the known clashes are caught: bet/vav, shin/samekh, alef/ayin/he, mem/final mem, tav in Ashkenazi', () => {
  const k = (a, b, t) => soundsClash(c.consonants.get(a), c.consonants.get(b), t);
  for (const t of TRADS) { assert.ok(k('bet', 'vav', t), 'bet/vav ' + t); assert.ok(k('shin', 'samekh', t), 'shin/samekh ' + t); assert.ok(k('mem', 'mem-final', t)); assert.ok(k('alef', 'ayin', t), 'alef/ayin ' + t); assert.ok(k('alef', 'he', t), 'alef/he ' + t); }
  assert.ok(k('tav', 'samekh', 'ashkenazi')); assert.ok(k('tav', 'tet', 'ashkenazi'));
  assert.ok(!k('lamed', 'nun', 'israeli'));
});

test('letter-name questions never offer a letter next to its final form', () => {
  for (const tr of TRADS) for (const l of real.filter((x) => x.letters.some((id) => c.letters.get(id)?.finalOf || [...c.letters.values()].some((y) => y.finalOf === id)))) for (const seed of SEEDS) {
    for (const q of buildChoiceQuestions(l, { ...c, wordPool }, { seed, tradition: tr }).filter((x) => x.kind === 'letter-name')) {
      const names = q.options.map((o) => o.text), roots = names.map((n) => rootOf([...c.letters.values()].find((x) => x.name === n)));
      assert.equal(roots.filter((r) => r === roots[q.answerIndex]).length, 1, `${q.id}: ${names.join(' / ')}`);
    }
  }
});

test('word-meaning distractors: no shared skeleton, no gloss containing or near-duplicating the answer', () => {
  assert.ok(glossesOverlap('peace', 'a peaceful Sabbath (greeting)'));
  assert.ok(glossesOverlap('peace; hello', 'peace'));
  assert.ok(glossesOverlap('peace; hello', 'hello (on the phone)'));
  assert.ok(glossesOverlap('God', 'our God'));
  assert.ok(glossesOverlap('God', 'thank God (common reply)'));
  assert.ok(!glossesOverlap('God', 'house of'));
  assert.ok(!glossesOverlap('he returned', 'he came'));
  assert.equal(skeleton('שָׁלוֹם'), skeleton('שלום'));
  for (const l of real.slice(0, 40)) for (const seed of SEEDS) for (const tr of TRADS) {
    const qs = buildChoiceQuestions(l, { ...c, wordPool }, { seed, tradition: tr }).filter((x) => x.kind === 'word-meaning');
    for (const q of qs) {
      const w = l.words[Number(q.id.split('-').pop()) - 1], ans = q.options[q.answerIndex].text;
      q.options.forEach((o, i) => {
        if (i === q.answerIndex) return;
        assert.ok(!glossesOverlap(ans, o.text), `${q.id}: "${o.text}" overlaps "${ans}"`);
        const src = wordPool.filter((p) => p.en === o.text);
        assert.ok(src.some((p) => skeleton(p.he) !== skeleton(w.he)), `${q.id}: "${o.text}" only comes from a word with the same consonants`);
      });
    }
  }
});

test('word-meaning pool is limited to lessons up to the current one when enough exist, and stays deterministic', () => {
  const at = real.findIndex((l) => l.id === 'r30'), upto = new Set(real.slice(0, at + 1).flatMap((l) => l.words.map((w) => w.en)));
  for (const seed of SEEDS) {
    const a = buildChoiceQuestions(real[at], { ...c, wordPool }, { seed, tradition: 'sephardi' });
    const b = buildChoiceQuestions(real[at], { ...c, wordPool, lessons: real }, { seed, tradition: 'sephardi' });
    assert.deepEqual(a, buildChoiceQuestions(real[at], { ...c, wordPool }, { seed, tradition: 'sephardi' }), 'same seed, same questions');
    for (const set of [a, b]) for (const q of set.filter((x) => x.kind === 'word-meaning')) for (const o of q.options) assert.ok(upto.has(o.text), `${q.id} seed ${seed}: "${o.text}" is from a later lesson`);
  }
});
