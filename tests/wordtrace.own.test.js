// "Trace Your Own Word": the checks on a typed word, and the view path on a fake DOM (logic, not rendering).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { install, newRoot, sel, tick } from './wordtrace.fakedom.js';
import { waitFor } from './helpers/waitfor.js';
import { tidyOwn, ownWord, bankMatch, plainOf } from '../src/wordtrace/bank.js';

const doc = install();
const { mount } = await import('../src/wordtrace/wordtrace.view.js');
const rd = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const bank = rd('data/wordtrace/words.json');
const letters = rd('data/letters/letters.json');
const NAME = 'יהוה';
const GADOL = 'גָּדוֹל', GADOL_BARE = 'גדול';

test('tidyOwn: one Hebrew word only; a last letter takes its final form; cantillation is dropped', () => {
  assert.equal(tidyOwn('  ' + GADOL_BARE + ' '), GADOL_BARE);
  assert.equal(tidyOwn('שלומ'), 'שלום');
  assert.equal(tidyOwn('אב אם'), '');
  assert.equal(tidyOwn('abc'), ''); assert.equal(tidyOwn(''), '');
  assert.equal(tidyOwn('אָ֣ב'), 'אָב');
});

test('ownWord: needs marks, 2 to 8 letters, right final letters, and never the Name', () => {
  const ok = ownWord(GADOL, { source: 'device' });
  assert.ok(ok.ok); assert.equal(ok.word.src, 'own'); assert.equal(ok.word.pointing, 'on-device'); assert.equal(ok.word.n, 4);
  assert.equal(ownWord(GADOL).word.pointing, 'typed');
  assert.deepEqual(ownWord(GADOL_BARE), { ok: false, why: 'bare' });
  assert.deepEqual(ownWord('א'), { ok: false, why: 'shape' });
  assert.deepEqual(ownWord('אבגדהוזחט'), { ok: false, why: 'shape' });
  assert.deepEqual(ownWord(NAME), { ok: false, why: 'name' });
  assert.deepEqual(ownWord('יְהוָה'), { ok: false, why: 'name' });
  assert.deepEqual(ownWord('וַ' + NAME), { ok: false, why: 'name' });
  assert.deepEqual(ownWord('שָלוֹמ'), { ok: false, why: 'final' });
});

test('bankMatch: the same marked form, or the one list word with those letters; a different marking is not swapped', () => {
  const w = bank.words[0];
  assert.equal(bankMatch(bank, w.he), w);
  const single = bank.words.find((x) => bank.words.filter((y) => y.plain === x.plain).length === 1);
  assert.equal(bankMatch(bank, single.plain), single);
  assert.equal(bankMatch(bank, GADOL_BARE + 'אא'), null);
  const other = single.he + '\u05b8';
  assert.equal(bankMatch(bank, other), null, 'a marked form the list does not have is not swapped for the list word');
});

function mkStore(init = {}) { const m = { ...init }; return { m, get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = v; } }; }
async function open(marks) {
  const root = newRoot(doc); const store = mkStore(); const asked = []; const played = [];
  const ctx = { store, t: (k) => k, letters, wordtrace: bank, query: { any: '1' }, settings: { script: 'print' }, audio: { has: () => false, play: (...a) => { played.push(a); } },
    wordtraceMarks: marks === undefined ? undefined : async (text) => { asked.push(text); return typeof marks === 'function' ? marks(text) : marks; } };
  const unmount = mount(root, ctx);
  await waitFor(() => root.children.length > 0 && !/Loading words/.test(root.textContent), { message: 'word trace loaded' });
  return { root, store, unmount, asked, played };
}
const type = async (v, text) => { sel(v.root, '[data-act=own-input]').value = text; sel(v.root, '[data-act=own-go]').click(); await tick(30); };
const note = (v) => sel(v.root, '[data-role=own-note]').textContent;
const UNLISTED = 'מקרר'; // fridge, bare; not a list word
const UNLISTED_MARKED = 'מְקָרֵר';

test('view: the box is on the pick screen; bad input and the Name get plain messages and nothing is asked of the pack', async () => {
  assert.ok(!bank.words.some((w) => w.plain === UNLISTED));
  const v = await open(null);
  assert.match(v.root.textContent, /Trace Your Own Word/);
  await type(v, 'hello'); assert.match(note(v), /one Hebrew word/);
  await type(v, NAME); assert.match(note(v), /does not offer the Name/);
  assert.equal(v.asked.length, 0);
  assert.equal(sel(v.root, '[data-role=target]'), null);
  v.unmount();
});

test('view: a list word typed bare starts the list word, with no pack and no unchecked note', async () => {
  const single = bank.words.find((x) => x.n >= 2 && bank.words.filter((y) => y.plain === x.plain).length === 1);
  const v = await open(null);
  await type(v, single.plain);
  assert.equal(sel(v.root, '[data-role=target]').textContent, single.he);
  assert.equal(sel(v.root, '[data-role=own-source]'), null);
  assert.equal(v.asked.length, 0);
  v.unmount();
});

test('view: a bare word outside the list with no pack on the device points to Settings and starts nothing', async () => {
  const v = await open(null);
  await type(v, UNLISTED);
  assert.deepEqual(v.asked, [UNLISTED]);
  assert.match(note(v), /pack is not on this device/);
  assert.equal(sel(v.root, '[data-role=own-more]').querySelector('a').getAttribute('href'), '#/settings');
  assert.equal(sel(v.root, '[data-role=target]'), null);
  v.unmount();
});

test('view: with the pack, the word is traced with a not-checked note; a pack answer that is the Name or bare is refused', async () => {
  const v = await open({ text: UNLISTED_MARKED, name: false, marked: true });
  await type(v, UNLISTED);
  assert.equal(sel(v.root, '[data-role=target]').textContent, UNLISTED_MARKED);
  assert.match(sel(v.root, '[data-role=own-source]').textContent, /not been checked by a person/);
  assert.match(sel(v.root, '[data-role=own-source]').textContent, /not saved/);
  assert.equal(plainOf(sel(v.root, '[data-role=target]').textContent), UNLISTED);
  v.unmount();
  const n = await open({ text: 'ה׳', name: true, marked: false });
  await type(n, UNLISTED); assert.match(note(n), /does not offer the Name/); assert.equal(sel(n.root, '[data-role=target]'), null); n.unmount();
  const b = await open({ text: UNLISTED, name: false, marked: false });
  await type(b, UNLISTED); assert.match(note(b), /No vowel marks came back/); b.unmount();
  const f = await open(() => { throw new Error('x'); });
  await type(f, UNLISTED); assert.match(note(f), /could not be added/); f.unmount();
});

test('view: a word typed with its own marks is traced as typed, says so, and never asks the pack', async () => {
  const v = await open({ text: 'x', name: false, marked: true });
  await type(v, UNLISTED_MARKED);
  assert.equal(sel(v.root, '[data-role=target]').textContent, UNLISTED_MARKED);
  assert.match(sel(v.root, '[data-role=own-source]').textContent, /marks you typed/);
  assert.equal(v.asked.length, 0);
  v.unmount();
});
