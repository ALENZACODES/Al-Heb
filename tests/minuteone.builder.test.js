// Word builder (src/firstday/minuteone.model.js) and its word list (data/firstday/buildable-words.json). Pure; no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BUILDER_KEY, ALEF_BET, foldFinals, bareOf, letterFor, writtenForm, makeIndex, evaluate, suggestions, unlockedLetters, finalsShown,
  progressLetters, normalizeBuilder, recordBuilt, tallyLine, keyAction, STARTER_BARE, UNLOCK_STEP, FULL_AT,
} from '../src/firstday/minuteone.model.js';
import { build, pointedKey, CLIP_PATH, OUT_PATH } from '../tools/firstday/build-wordlist.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, OUT_PATH), 'utf8'));
const idx = makeIndex(DATA.words);

// ------------------------------------------------------------------------------------------------ the data file
test('buildable-words.json: at least 200 words, each 2-8 letters only, one entry per spelling, English and transliteration present', () => {
  assert.ok(DATA.count >= 200, `only ${DATA.count} words`);
  assert.equal(DATA.count, DATA.words.length);
  const seen = new Set();
  for (const w of DATA.words) {
    assert.match(w.bare, /^[א-ת]{2,8}$/, `${w.id} ${w.bare}`);
    assert.equal(w.bare, bareOf(w.he), `${w.id}: bare is the pointed form without marks`);
    assert.ok(!seen.has(w.bare), `duplicate spelling ${w.bare}`); seen.add(w.bare);
    assert.ok(w.en && !/UNKNOWN/.test(w.en), `${w.id} gloss`);
    assert.ok(w.translit, `${w.id} translit`);
    assert.ok(w.level >= 1 && w.level <= 5, `${w.id} level`);
    assert.ok(w.clip, `${w.id} clip id`);
  }
});

test('buildable-words.json: every clip file exists on disk for BOTH voices, and the manifest row for it says the same pointed text', () => {
  const manifests = ['data/audio/manifest-words-israeli.json', 'data/audio/manifest-kind-word.json']
    .flatMap((m) => JSON.parse(fs.readFileSync(path.join(ROOT, m), 'utf8')));
  const byKey = new Map(manifests.filter((e) => e.tradition === 'israeli' && e.kind === 'word' && e.status !== 'missing').map((e) => [`${e.voice}|${e.id}`, e]));
  let m = 0, f = 0;
  for (const w of DATA.words) {
    for (const voice of ['m', 'f']) {
      const p = CLIP_PATH(voice, w.clip);
      assert.ok(fs.existsSync(path.join(ROOT, p)), `${w.bare}: ${p} is not on disk`);
      const row = byKey.get(`${voice}|${w.clip}`);
      assert.ok(row, `${w.bare}: no manifest row for ${voice} ${w.clip}`);
      assert.equal(row.path, p);
      assert.equal(pointedKey(row.text), pointedKey(w.he), `${w.bare}: clip ${w.clip} says ${row.text}, the word is ${w.he}`);
      if (voice === 'm') m++; else f++;
    }
  }
  assert.equal(m, DATA.count); assert.equal(f, DATA.count);
});

test('buildable-words.json is what the tool builds from the sources today (regenerate check)', () => {
  const fresh = build();
  assert.equal(fresh.count, DATA.count);
  assert.deepEqual(fresh.words.map((w) => [w.bare, w.clip]), DATA.words.map((w) => [w.bare, w.clip]));
});

test('the starter words are all in the list, 2 to 4 letters, and the first three spell with six letters only', () => {
  for (const b of STARTER_BARE) { const w = idx.byKey.get(foldFinals(b)); assert.ok(w, `starter ${b} missing`); assert.ok(b.length >= 2 && b.length <= 4, b); }
  const first = suggestions(idx, null, 3);
  assert.deepEqual(first.map((w) => w.bare), ['אבא', 'אמא', 'שלום']);
  assert.deepEqual(unlockedLetters(null, idx, first), ['א', 'ב', 'ו', 'ל', 'מ', 'ש']);
});

// ------------------------------------------------------------------------------------------------ letters and finals
test('alef-bet: 22 letters, five with finals; letterFor knows base and final glyphs; folding maps finals to base', () => {
  assert.equal(ALEF_BET.length, 22);
  assert.equal(ALEF_BET.filter((l) => l.final).length, 5);
  assert.equal(letterFor('ם').id, 'mem'); assert.equal(letterFor('מ').id, 'mem'); assert.equal(letterFor('x'), null);
  assert.equal(foldFinals('שלום'), 'שלומ'); assert.equal(foldFinals('ארץ'), 'ארצ');
});

test('writtenForm: the last letter takes its final form, a final placed earlier goes back to base, and the fix is reported', () => {
  assert.deepEqual(writtenForm(['ש', 'ל', 'ו', 'מ']), { text: 'שלום', finalFixed: 'מ' });
  assert.deepEqual(writtenForm(['ש', 'ל', 'ו', 'ם']), { text: 'שלום', finalFixed: null });
  assert.deepEqual(writtenForm(['ם', 'י', 'ם']), { text: 'מים', finalFixed: null });
  assert.deepEqual(writtenForm([]), { text: '', finalFixed: null });
});

// ------------------------------------------------------------------------------------------------ matching and hints
test('evaluate: letters-only match, finals ignored; a word that another word extends is reported as extendable', () => {
  const r = evaluate(idx, ['ש', 'ל', 'ו', 'ם']);
  assert.equal(r.match.bare, 'שלום'); assert.equal(r.match.translit, 'shalom'); assert.equal(r.extendable, false);
  assert.equal(evaluate(idx, ['ש', 'ל', 'ו', 'מ']).match.bare, 'שלום', 'mem at the end still spells shalom');
  assert.equal(evaluate(idx, ['א', 'ב', 'א']).match.en, 'dad');
  const ab = evaluate(idx, ['א', 'ב']);
  assert.equal(ab.match?.bare ?? null, idx.byKey.has('אב') ? 'אב' : null);
  assert.equal(ab.extendable, true, 'אבא continues אב');
  assert.equal(ab.hint.bare, 'אבא', 'the hint for a live prefix is the best word that continues it');
});

test('evaluate: a dead end names the nearest real word that starts with the same letters, and how many letters it shares', () => {
  const r = evaluate(idx, ['ש', 'ל', 'ב']);
  assert.equal(r.match, null); assert.equal(r.deadEnd, true); assert.equal(r.stem, 2);
  assert.ok(r.hint && r.hint.bare.startsWith('של'), r.hint?.bare);
  const none = evaluate(idx, ['ז', 'ז', 'ז']);
  assert.equal(none.deadEnd, true);
  assert.deepEqual(evaluate(idx, []), { key: '', match: null, extendable: false, deadEnd: false, hint: null, stem: 0 });
});

// ------------------------------------------------------------------------------------------------ progression
test('progression: six letters first, more per word built, the whole alef-bet and the finals from FULL_AT words on; "all letters" overrides', () => {
  let rec = normalizeBuilder(null);
  assert.equal(finalsShown(rec), false);
  assert.equal(finalsShown(rec, true), true);
  assert.equal(unlockedLetters(rec, idx, [], true).length, 22);
  const sizes = [];
  for (let i = 0; i < FULL_AT + 1; i++) {
    const sug = suggestions(idx, rec, 3);
    assert.equal(sug.length, 3);
    for (const w of sug) assert.ok(!rec.words.includes(w.id), 'suggestions are unbuilt words');
    const open = unlockedLetters(rec, idx, sug);
    for (const w of sug) for (const c of foldFinals(w.bare)) assert.ok(open.includes(c), `suggested ${w.bare} can be spelled with the open letters`);
    sizes.push(open.length);
    rec = recordBuilt(rec, sug[0], `2026-11-07T10:0${i}:00.000Z`);
  }
  for (let i = 1; i < sizes.length; i++) assert.ok(sizes[i] >= sizes[i - 1], `letters only open: ${sizes}`);
  assert.equal(sizes[0], 6);
  assert.equal(sizes[FULL_AT], 22);
  assert.equal(finalsShown(rec), true);
  assert.ok(progressLetters(1, []).size === UNLOCK_STEP);
});

test('suggestions deepen with the tally: level stays 1 for the first five words, then level 2 words may appear', () => {
  const many = { v: 1, words: DATA.words.filter((w) => w.level === 1).map((w) => w.id), builds: 500 };
  const s = suggestions(idx, many, 3);
  assert.equal(s.length, 3);
  assert.ok(s.every((w) => w.level >= 2), 'every level-1 word is built, so the next ones are deeper');
});

// ------------------------------------------------------------------------------------------------ tally
test('tally: distinct words, every build counted, last time kept; the store key is the one the privacy page lists', () => {
  assert.equal(BUILDER_KEY, 'firstday.builder.v1');
  let rec = normalizeBuilder(undefined);
  assert.equal(tallyLine(rec), 'No words built yet.');
  const shalom = idx.byKey.get('שלומ'), aba = idx.byKey.get('אבא');
  rec = recordBuilt(rec, aba, '2026-11-07T10:00:00.000Z');
  assert.equal(tallyLine(rec), '1 word built.');
  rec = recordBuilt(rec, shalom, '2026-11-07T10:01:00.000Z');
  rec = recordBuilt(rec, shalom, '2026-11-07T10:02:00.000Z');
  assert.equal(rec.count, 2); assert.equal(rec.builds, 3); assert.equal(rec.lastAt, '2026-11-07T10:02:00.000Z');
  assert.equal(tallyLine(rec), '2 words built.');
  assert.deepEqual(normalizeBuilder({ words: ['a', 'a', 3, 'b'] }).words, ['a', 'b']);
});

test('keyboard: Hebrew letter keys place (finals folded), Backspace removes, Enter checks, Escape clears, other keys do nothing', () => {
  assert.deepEqual(keyAction('ש'), { type: 'place', he: 'ש' });
  assert.deepEqual(keyAction('ם'), { type: 'place', he: 'מ' });
  assert.deepEqual(keyAction('Backspace'), { type: 'remove' });
  assert.deepEqual(keyAction('Enter'), { type: 'check' });
  assert.deepEqual(keyAction('Escape'), { type: 'clear' });
  assert.equal(keyAction('a'), null); assert.equal(keyAction('Shift'), null); assert.equal(keyAction('ַ'), null);
});
