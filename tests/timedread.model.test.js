import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRead, accuracy, wpm, cleanWpm, rangeFor, addRead, cleanState, describeRange, trickyWords, speechSupport, countWords, KEY } from '../src/timedread/model.js';
import { timedReadGate } from '../src/timedread/gate.js';
import { loadState, saveRead, clearReads } from '../src/timedread/store.js';
import { evaluate } from '../src/progress/model.js';
import { readFileSync } from 'node:fs';

const mk = (o = {}) => makeRead({ textId: 't1', words: 10, ms: 12000, stumbled: [], at: 1, ...o }).read;

test('wpm, clean wpm and accuracy follow the definitions', () => {
  const r = mk({ stumbled: [1, 3] });
  assert.equal(r.stumbled, 2);
  assert.equal(wpm(r), 50); // 10 words in 12 s
  assert.equal(cleanWpm(r), 40);
  assert.equal(accuracy(r), 0.8);
});
test('word count comes from the line; duplicates and out-of-range marks are dropped', () => {
  assert.equal(countWords('בְּרֵאשִׁית בָּרָא אֱלֹהִים׃'), 3);
  const r = makeRead({ textId: 'x', he: 'בְּרֵאשִׁית בָּרָא אֱלֹהִים׃', ms: 5000, stumbled: [0, 0, 7, -1, 1.5], at: 2 }).read;
  assert.deepEqual(r.stumbledIdx, [0]); assert.equal(r.words, 3);
});
test('implausible or empty reads are refused, not saved', () => {
  assert.ok(makeRead({ textId: 't', words: 10, ms: 300, at: 1 }).error);
  assert.ok(makeRead({ textId: 't', words: 100, ms: 2000, at: 1 }).error); // 3000 wpm
  assert.ok(makeRead({ textId: '', words: 5, ms: 5000, at: 1 }).error);
  assert.ok(makeRead({ textId: 't', words: 0, ms: 5000, at: 1 }).error);
});
test('ranges cover the last 5 reads of ONE text and never mix texts', () => {
  let s = null;
  for (const ms of [20000, 15000, 12000, 10000, 8000, 6000]) s = addRead(s, mk({ ms }));
  s = addRead(s, mk({ textId: 't2', ms: 60000 }));
  const r = rangeFor(s, 't1');
  assert.equal(r.count, 5); assert.equal(r.wpm.min, 40); assert.equal(r.wpm.max, 100); assert.equal(rangeFor(s, 't2').count, 1);
  assert.equal(rangeFor(s, 'none'), null);
  assert.match(describeRange(r), /40 to 100 words a minute.*Self-reported/);
  assert.ok(!('score' in r));
});
test('tricky words rank by how often they were marked', () => {
  let s = null; s = addRead(s, mk({ stumbled: [2, 4] })); s = addRead(s, mk({ stumbled: [4] }));
  assert.deepEqual(trickyWords(s, 't1'), [{ idx: 4, count: 2 }, { idx: 2, count: 1 }]);
});
test('corrupt stored state is cleaned, not thrown on', () => {
  assert.deepEqual(cleanState(null), { v: 1, reads: [] });
  assert.equal(cleanState({ reads: [null, { textId: 1 }, { textId: 'a', words: 3, ms: 9, stumbled: 5, at: 1 }, mk()] }).reads.length, 1);
});
test('store: own key, save, load, clear', () => {
  const m = {}; const store = { get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); } };
  saveRead(store, mk()); assert.equal(Object.keys(m).join(), KEY); assert.equal(loadState(store).reads.length, 1);
  clearReads(store); assert.equal(loadState(store).reads.length, 0);
  assert.deepEqual(loadState({ get() { throw new Error('x'); } }), { v: 1, reads: [] });
});
test('speech detection only detects, with he-IL and an honest note', () => {
  assert.equal(speechSupport({}).available, false);
  const s = speechSupport({ webkitSpeechRecognition: function () {} });
  assert.equal(s.available, true); assert.equal(s.lang, 'he-IL'); assert.match(s.note, /does not use it/);
});

const gate = { kind: 'timedRead', minWpm: 40, minWords: 8, minReads: 3, minAccuracy: 0.9 };
test('gate: not enough reads, too slow, too many stumbles, passes, and mixed texts do not combine', () => {
  const R = (o) => mk({ words: 10, ms: 10000, ...o }); // 60 wpm
  let s = null;
  s = addRead(s, R()); s = addRead(s, R());
  let g = timedReadGate(gate, s); assert.equal(g.done, false); assert.equal(g.have, 2); assert.equal(g.need, 3); assert.equal(g.measurable, true);
  s = addRead(s, R({ textId: 'other' }));
  assert.equal(timedReadGate(gate, s).done, false); // 2 + 1, texts not mixed
  s = addRead(s, R()); assert.equal(timedReadGate(gate, s).done, true);
  assert.equal(timedReadGate({ ...gate, minWpm: 70 }, s).done, false);
  let t = null; for (let i = 0; i < 3; i++) t = addRead(t, R({ stumbled: [0, 1] }));
  assert.equal(timedReadGate(gate, t).done, false); // 80% clean < 90%
  let u = null; for (let i = 0; i < 3; i++) u = addRead(u, mk({ words: 5, ms: 5000 }));
  assert.equal(timedReadGate(gate, u).done, false); // below minWords
  assert.equal(timedReadGate(gate, undefined).done, false);
});
test('gate result has the shape progress evaluate() returns and notes say self-reported', () => {
  let s = null; for (let i = 0; i < 3; i++) s = addRead(s, mk({ ms: 10000 }));
  const g = timedReadGate(gate, s);
  assert.deepEqual(Object.keys(g).sort(), ['done', 'have', 'measurable', 'need', 'note']);
  assert.match(g.note, /self-reported/);
});
test('gates.json: every gate has the fields the evaluator needs and ties to belts.json targets', () => {
  const j = JSON.parse(readFileSync(new URL('../data/timedread/gates.json', import.meta.url)));
  const belts = JSON.parse(readFileSync(new URL('../data/curriculum/belts.json', import.meta.url))).belts;
  for (const [belt, gs] of Object.entries(j.gates)) for (const g of gs) {
    assert.equal(g.kind, 'timedRead'); assert.equal(g.minWpm, belts.find((b) => b.id === belt).wpmTarget); assert.match(g.label, /self-reported/);
    assert.equal(typeof timedReadGate(g, null).done, 'boolean');
  }
  assert.equal(evaluate({ kind: 'unmeasured' }, {}).measurable, false); // progress today: still unmeasured until the parent wires gate.js
});
