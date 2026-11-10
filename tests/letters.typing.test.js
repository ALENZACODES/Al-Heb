import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { keyForLetter, keyForNiqqud, checkInput, createTrainer, makeRng, keyboardRows, XKB_TO_DOM, letterIdForChar } from '../src/letters/typing.js';

const kb = JSON.parse(readFileSync(new URL('../data/letters/keyboard-si1452.json', import.meta.url), 'utf8'));
const letters = JSON.parse(readFileSync(new URL('../data/letters/letters.json', import.meta.url), 'utf8'));

test('all 27 letters map to a base-layer key and the glyph matches letters.json', () => {
  assert.equal(Object.keys(kb.letters).length, 27);
  for (const l of letters) {
    const k = keyForLetter(kb, l.id);
    assert.ok(k, l.id);
    assert.equal(k.char, l.he, l.id);
    assert.ok(XKB_TO_DOM[k.code], l.id + ' has a DOM code');
  }
  assert.equal(new Set(Object.values(kb.letters).map(k => k.code)).size, 27, 'no two letters share a key');
});

test('known SI-1452 positions (QWERTY legends)', () => {
  const q = id => keyForLetter(kb, id).qwerty;
  assert.equal(q('alef'), 't'); assert.equal(q('shin'), 'a'); assert.equal(q('qof'), 'e'); assert.equal(q('resh'), 'r');
  assert.equal(q('mem-final'), 'o'); assert.equal(q('nun-final'), 'i'); assert.equal(q('kaf-final'), 'l'); assert.equal(q('pe-final'), ';');
  assert.equal(q('tav'), ','); assert.equal(q('tsadi-final'), '.'); assert.equal(q('vav'), 'u'); assert.equal(q('bet'), 'c');
});

test('AltGr niqqud layer matches the research list (Wikipedia: kamatz on ק, patach on פ, shva on ש, dagesh on ד, hiriq on ח, segol on ס, tsere on צ, holam on ו, qubutz on \\)', () => {
  const expect = { kamatz: ['ק', 'U+05B8'], patach: ['פ', 'U+05B7'], shva: ['ש', 'U+05B0'], dagesh: ['ד', 'U+05BC'], chirik: ['ח', 'U+05B4'],
    segol: ['ס', 'U+05B6'], tzere: ['צ', 'U+05B5'], cholam: ['ו', 'U+05B9'], kubutz: ['\\', 'U+05BB'] };
  for (const [id, [cap, cp]] of Object.entries(expect)) {
    const k = keyForNiqqud(kb, id);
    assert.ok(k, id);
    assert.equal(k.keycapBase, cap, id); assert.equal(k.codepoint, cp, id); assert.equal(k.modifier, 'AltGr');
  }
  // sin dot / shin dot on the Q / W keys, chataf vowels present
  assert.equal(keyForNiqqud(kb, 'sin-dot').qwerty, 'q'); assert.equal(keyForNiqqud(kb, 'shin-dot').qwerty, 'w');
  for (const id of ['chataf-patach', 'chataf-segol', 'chataf-kamatz']) assert.ok(keyForNiqqud(kb, id), id);
  assert.equal(keyForNiqqud(kb, 'shuruk'), null);
  assert.ok(kb.gaps.some(g => /shuruk/.test(g)));
});

test('niqqud code points are in the Hebrew block', () => {
  for (const k of Object.values(kb.niqqud)) assert.match(k.char, /^[֐-׿]$/);
});

test('checkInput: physical code, produced character, AltGr handling', () => {
  const t = { kind: 'letter', id: 'dalet' };                       // S key
  assert.equal(checkInput(kb, t, { code: 'KeyS' }).ok, true);
  assert.equal(checkInput(kb, t, { key: 'ד', code: 'KeyZ' }).ok, true);   // OS layout produced the letter
  assert.equal(checkInput(kb, t, { code: 'KeyD' }).ok, false);
  const n = { kind: 'niqqud', id: 'kamatz' };                      // AltGr + E
  assert.equal(checkInput(kb, n, { code: 'KeyE', altGraph: true }).ok, true);
  const noAlt = checkInput(kb, n, { code: 'KeyE', altGraph: false });
  assert.equal(noAlt.ok, false); assert.equal(noAlt.reason, 'needs-altgr');
  assert.equal(checkInput(kb, n, { code: 'KeyR', altGraph: true }).reason, 'wrong-key');
  assert.equal(checkInput(kb, { kind: 'niqqud', id: 'shuruk' }, { code: 'KeyU' }).reason, 'no-key');
});

test('trainer: asks for targets, tracks accuracy, repeats misses more, never repeats immediately', () => {
  const tr = createTrainer(kb, { rng: makeRng(7) });
  let prev = null, correct = 0;
  for (let i = 0; i < 60; i++) {
    const tg = tr.target(); assert.notEqual(tg.id, prev);
    const exp = tr.expected();
    const res = tr.answer({ code: XKB_TO_DOM[exp.code] });
    assert.equal(res.ok, true); correct++; prev = tg.id;
  }
  assert.equal(tr.stats().accuracy, 1); assert.equal(tr.stats().correct, correct);
  const tg = tr.target();
  const wrong = tr.answer({ code: 'F13' });
  assert.equal(wrong.ok, false); assert.equal(tr.target().id, tg.id, 'target stays until answered');
  assert.equal(tr.stats().missed[tg.id], 1);
  assert.ok(tr.stats().accuracy < 1);
});

test('trainer: niqqud mode and pool filter; empty pool throws', () => {
  const tr = createTrainer(kb, { kind: 'niqqud', pool: ['kamatz', 'patach'], rng: makeRng(1) });
  assert.ok(['kamatz', 'patach'].includes(tr.target().id));
  assert.throws(() => createTrainer(kb, { pool: ['nonsense'], rng: makeRng(1) }).target());
});

test('keyboardRows gives four rows incl. finals; letterIdForChar reverse lookup', () => {
  const rows = keyboardRows(kb);
  assert.equal(rows.length, 4);
  const flat = rows.flat().map(k => k.base);
  for (const f of ['ך', 'ם', 'ן', 'ף', 'ץ']) assert.ok(flat.includes(f), f);
  assert.equal(letterIdForChar(kb, 'ץ'), 'tsadi-final');
});
