// Trope melody (idea M2): the pattern file, the pure schedule, the synth wiring and the page. No sound is made in tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { waitFor } from './helpers/waitfor.js';
import { install, newRoot, all, sel, El } from './wordtrace.fakedom.js';
import * as M from '../src/chant/melody.js';
import { play, canPlay } from '../src/chant/synth.js';

const doc = install();
const txt = (s) => doc.createTextNode(s);
El.prototype.append = function (...n) { for (const c of n.flat()) if (c != null && c !== false) this.appendChild(c && c.nodeType ? c : txt(c)); };
El.prototype.replaceChildren = function (...n) { for (const c of [...this.childNodes]) this.removeChild(c); this.append(...n); };

const rd = (rel) => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const table = rd('data/corpus/trope/table.json'), melody = rd(M.MELODY_FILE), index = rd('data/corpus/torah/index.json');
const gen1 = rd('data/corpus/torah/genesis/01.json');
const load = async (rel) => rd(rel);

test('pattern file: valid, one Ashkenazi tradition, a pattern for every mark in the trope table', () => {
  assert.deepEqual(M.validateMelody(melody, table), []);
  assert.equal(melody.tradition, 'ashkenazi');
  const ids = table.prose.filter((r) => r.cls === 'disjunctive' || r.cls === 'conjunctive').map((r) => r.id);
  for (const id of ids) assert.ok(melody.patterns[id], id);
  for (const id of Object.keys(melody.patterns)) assert.ok(ids.includes(id), `${id} is not a mark in the table`);
});

test('honesty: every pattern names its source and is unchecked, so the draft label is what a screen shows', () => {
  for (const [id, p] of Object.entries(melody.patterns)) {
    assert.ok(p.source.length > 40, id);
    assert.equal(p.checked, false, `${id}: only a cantor's review may set checked`);
    assert.doesNotMatch(p.source + ' ' + (p.note || ''), /verified|authentic|approved by/i, id);
  }
  assert.equal(melody.checked, false); assert.equal(melody.checkedBy, null);
  assert.equal(M.draftLabel(melody), 'Draft melody, waiting for a cantor’s check');
  assert.equal(M.DRAFT_LABEL, melody.label);
  // one checked pattern is not enough, nor is a file flag without every pattern or without a name
  const some = structuredClone(melody); some.patterns.tipcha.checked = true; some.checked = true; some.checkedBy = 'Cantor A';
  assert.equal(M.draftLabel(some), M.DRAFT_LABEL);
  const every = structuredClone(melody); for (const p of Object.values(every.patterns)) p.checked = true; every.checked = true;
  assert.equal(M.draftLabel(every), M.DRAFT_LABEL, 'no name, still a draft');
  every.checkedBy = 'Cantor A';
  assert.equal(M.draftLabel(every), 'Melody checked by Cantor A');
});

test('validateMelody: reports a missing source, bad notes and an uncovered mark', () => {
  const bad = structuredClone(melody);
  bad.patterns.tipcha.source = ''; bad.patterns.revia.notes = [[0, 0]]; delete bad.patterns.pazer;
  const errs = M.validateMelody(bad, table).join(' | ');
  assert.match(errs, /tipcha does not say where it came from/); assert.match(errs, /revia has no usable notes/); assert.match(errs, /No pattern for pazer/);
  assert.deepEqual(M.validateMelody(null), ['The melody file is missing.']);
});

test('schedule: Genesis 1:1 gives one span per word, in order, with notes that never overlap', () => {
  const s = M.scheduleVerse(gen1.verses[0].heTrope, table, melody);
  assert.equal(s.tokens.length, 7); assert.equal(s.words.length, 7);
  assert.deepEqual(s.tokens.map((t) => t.marks[0]), ['tipcha', 'munach', 'etnachta', 'mercha', 'tipcha', 'mercha', 'siluk']);
  for (let i = 1; i < s.notes.length; i++) assert.ok(s.notes[i].start >= s.notes[i - 1].start + s.notes[i - 1].dur - 1e-9);
  for (let i = 1; i < s.words.length; i++) assert.ok(s.words[i].start >= s.words[i - 1].end);
  assert.ok(Math.abs(s.total - s.words[6].end) < 1e-9);
  // the verse ends on a long home note
  const last = s.notes[s.notes.length - 1];
  assert.equal(last.semis, 0); assert.ok(Math.abs(last.hz - melody.homeHz) < 1e-9); assert.ok(last.dur >= 1.5 * melody.beatSec);
  assert.equal(M.wordAt(s, s.words[2].start + 0.01), 2); assert.equal(M.wordAt(s, s.total + 1), -1);
});

test('schedule: a joining mark changes with the stop it leads into; tempo scales time; an unknown mark is skipped, not guessed', () => {
  assert.deepEqual(M.motif(melody, 'munach', 'etnachta'), melody.patterns.munach.notes);
  assert.deepEqual(M.motif(melody, 'munach', 'zakef-katan'), melody.patterns.munach.before['zakef-katan']);
  assert.equal(M.motif(melody, 'no-such-mark'), null);
  const a = M.scheduleVerse(gen1.verses[0].heTrope, table, melody, { tempo: 1 }), b = M.scheduleVerse(gen1.verses[0].heTrope, table, melody, { tempo: 2 });
  assert.ok(Math.abs(a.total - 2 * b.total) < 1e-9);
  const s = M.scheduleTokens([{ text: 'x', marks: ['no-such-mark'] }, { text: 'y', marks: [] }], melody);
  assert.equal(s.notes.length, 2 * melody.unmarked.notes.length); assert.ok(s.notes.every((n) => n.mark === null));
  assert.equal(M.hzOf(220, 12), 440);
  assert.equal(M.scheduleTokens([], melody).total, 0);
});

test('schedule: every verse of Genesis 1 and Numbers 35 (the two once-only marks) schedules without a gap in coverage', () => {
  for (const ch of [gen1, rd('data/corpus/torah/numbers/35.json')]) for (const v of ch.verses) {
    const s = M.scheduleVerse(v.heTrope, table, melody);
    assert.ok(s.total > 0 && s.words.length === s.tokens.length, `${ch.ref}:${v.n}`);
    assert.ok(s.notes.every((n) => Number.isFinite(n.hz) && n.hz > 50 && n.hz < 2000 && n.dur > 0));
  }
  const n35 = rd('data/corpus/torah/numbers/35.json').verses.find((v) => v.n === 5);
  const marks = M.scheduleVerse(n35.heTrope, table, melody).tokens.flatMap((t) => t.marks);
  assert.ok(marks.includes('karnei-parah') && marks.includes('yerach-ben-yomo'));
});

test('synth: schedules one oscillator per note, reports each word, and stop() ends early and closes the context', async () => {
  const made = []; let closed = 0;
  class AC {
    constructor() { this.currentTime = 0; this.destination = {}; }
    createGain() { return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {} }; }
    createOscillator() { const o = { type: '', frequency: { value: 0 }, connect() {}, start(t) { o.at = t; }, stop() { o.stopped = true; } }; made.push(o); return o; }
    close() { closed++; }
  }
  assert.equal(canPlay(AC), true); assert.equal(canPlay(undefined), false);
  const s = M.scheduleVerse(gen1.verses[0].heTrope, table, melody, { tempo: 40 });
  const seen = [];
  const p = play(s, { AudioContextClass: AC, onWord: (i) => seen.push(i) });
  assert.equal(await p.done, 'ended');
  assert.equal(made.length, s.notes.length); assert.ok(made.every((o) => o.type === 'triangle' && o.frequency.value > 0));
  assert.deepEqual(seen, [0, 1, 2, 3, 4, 5, 6, -1]); assert.equal(closed, 1);
  const p2 = play(M.scheduleVerse(gen1.verses[0].heTrope, table, melody), { AudioContextClass: AC });
  p2.stop(); assert.equal(await p2.done, 'stopped'); assert.equal(closed, 2);
  assert.equal(await play(s, { AudioContextClass: undefined }).done, 'stopped');
});

const { mount } = await import('../src/chant/melody.view.js');
const fakePlay = (log) => (schedule, opts) => { log.push({ schedule, opts }); let res; const done = new Promise((r) => { res = r; }); return { stop: () => res('stopped'), done, finish: () => res('ended') }; };

test('page: shows the draft label, the tones-only note, a button for every mark and the verse with the Name as ה׳', async () => {
  const root = newRoot(doc), log = [];
  const un = mount(root, { chantLoad: load, chantPlay: fakePlay(log), query: { book: 'genesis', chapter: '2', verse: '4' }, settings: { get: () => false } });
  await waitFor(() => sel(root, '#ch-play'), { message: 'melody page' });
  assert.equal(sel(root, '#ch-draft').textContent, 'Draft melody, waiting for a cantor’s check');
  assert.ok(root.textContent.includes(M.TONES_NOTE) && root.textContent.includes(M.ONE_TRADITION_NOTE));
  assert.equal(all(root, (n) => n.getAttribute?.('data-hear')).length, Object.keys(melody.patterns).length);
  // Genesis 2:4 has the four-letter Name: it is shown as ה׳ and the letters never appear
  const verseText = sel(root, '.ch-verse').textContent;
  assert.ok(verseText.includes('ה׳')); assert.ok(!verseText.replace(/[֑-ׇ]/g, '').includes('יהוה'));
  assert.doesNotMatch(root.textContent, /\bAI\b|artificial|machine learning|language model/i);
  sel(root, '#ch-play').click();
  assert.equal(log.length, 1); assert.ok(log[0].schedule.notes.length > 10);
  assert.match(sel(root, '[role=status]').textContent, /Playing the draft melody for Genesis 2:4/);
  log[0].opts.onWord(1);
  assert.equal(all(root, (n) => n.getAttribute?.('data-on') === '1').length, 1);
  all(root, (n) => n.getAttribute?.('data-hear') === 'tipcha')[0].click();
  assert.equal(log.length, 2); assert.equal(log[1].schedule.notes.length, melody.patterns.tipcha.notes.length);
  un();
});

test('page: "I do not use audio" removes every play button and says why; a load failure shows a kind alert', async () => {
  const root = newRoot(doc);
  mount(root, { chantLoad: load, chantPlay: fakePlay([]), settings: { get: (k) => k === 'audioFree' } });
  await waitFor(() => sel(root, '#ch-h-marks'), { message: 'melody page (audio free)' });
  assert.equal(sel(root, '#ch-play'), null); assert.equal(all(root, (n) => n.getAttribute?.('data-hear')).length, 0);
  assert.match(root.textContent, /I do not use audio/);
  const r2 = newRoot(doc);
  mount(r2, { chantLoad: async () => { throw new Error('x'); } });
  await waitFor(() => sel(r2, '[role=alert]'), { message: 'alert' });
  assert.equal(index.books.length, 5);
});
