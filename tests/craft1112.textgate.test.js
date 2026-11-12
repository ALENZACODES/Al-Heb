// S-01 (12 Nov audit): "hi" showed as "hislang" on the Practical greetings page. The view now separates the register tag,
// and a gate scans every learner-facing English string in data/ for this class of defect (tools/text-gate/learner-text.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { scanLearnerText, RULES } from '../tools/text-gate/learner-text.mjs';
import { shortGloss } from '../tools/pronunciation/build_pages.mjs';
import { newRoot, all, loaded } from './pronunciation.dom-helper.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Each allowed finding: rule, file, the start of the text, and why it is not a learner-facing defect. */
const ALLOWED = [
  ['template', 'data/camera/sign-glossary.json', '{x} Street', 'a street-sign pattern: src/camera/camera-model.js replaces {x} with the street name before it is shown'],
  ['template', 'data/camera/sign-glossary.json', '{x} Boulevard', 'same pattern, replaced by camera-model.js'],
  ['template', 'data/camera/sign-glossary.json', '{x} Square', 'same pattern, replaced by camera-model.js'],
  ['nullish', 'data/corpus/reader/priestly-blessing.json', 'Verse-by-verse reader data.', 'the file-level developer note describing null fields; the reader shows row notes only, never this one'],
  ['nullish', 'data/corpus/reader/shema.json', 'Verse-by-verse reader data.', 'same developer note'],
];

test('S-01: the learner-text gate finds nothing outside the allow-list', () => {
  const found = scanLearnerText(ROOT);
  const left = found.filter((f) => !ALLOWED.some(([r, file, start]) => f.rule === r && f.file === file && f.text.startsWith(start)));
  assert.deepEqual(left.map((f) => `${f.rule} ${f.file} ${f.key}: ${JSON.stringify(f.text).slice(0, 120)}`), []);
  for (const a of ALLOWED) assert.ok(found.some((f) => f.rule === a[0] && f.file === a[1] && f.text.startsWith(a[2])), `allow-list entry no longer needed: ${a.slice(0, 3).join(' ')}`);
});

test('S-01: the gate rules catch the defect class (glued tag, cut bracket, raw key, nullish, doubled space)', () => {
  assert.equal(RULES['glued-register']('hislang'), true);
  assert.equal(RULES['glued-register']('informal'), false);
  assert.equal(RULES['glued-pos']('peacenoun'), true);
  assert.equal(RULES['glued-pos']('pronoun'), false);
  assert.equal(RULES.brackets('plane (an airplane'), true);
  assert.equal(RULES.brackets('plane (an airplane)'), false);
  assert.equal(RULES['raw-key']('nav.section.read'), true);
  assert.equal(RULES.nullish('undefined'), true);
  assert.equal(RULES.nullish('make them null and void'), false);
  assert.equal(RULES['double-space']('good  morning'), true);
  assert.equal(RULES['edge-space'](' price'), true);
  assert.equal(RULES['punct-glue']('hello,goodbye'), true);
});

test('S-01: the pronunciation example gloss is cut at a word with its bracket closed', () => {
  assert.equal(shortGloss('to do (to perform an action, to accomplish a thing)'), 'to do (to perform an action, to…)');
  assert.equal(shortGloss('peace'), 'peace');
});

test('S-01: the greetings page shows "hi" and its register as separate words', async () => {
  const root = newRoot();
  globalThis.document = root.ownerDocument;
  const store = new Map();
  const ctx = { params: { id: 'pu-greetings', page: 'pu-greetings-p01' }, query: {},
    store: { get: async (k) => store.get(k), set: async (k, v) => store.set(k, v) }, settings: {} };
  const V = await import('../src/curriculum/practical.view.js');
  const un = V.mount(root, ctx);
  await loaded(root, () => all(root, (x) => x.getAttribute('data-listen') === 'greetings-02').length > 0);
  const li = all(root, (x) => x.getAttribute('data-listen') === 'greetings-02')[0];
  const text = li.textContent;
  assert.match(text, /hi \(slang\)/);
  assert.doesNotMatch(root.textContent, /hislang/);
  if (typeof un === 'function') un();
});
