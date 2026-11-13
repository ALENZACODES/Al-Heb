// Word notes (lane hf-morph): the pinned per-lesson notes, the card, the tap helper, the lesson section, and the rule
// that nothing here downloads or reads a language pack unless it is offered and already on the device.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { morph, wordsReader, ORT_BASE } from '../src/words/morph.js';
import { cardModel, NOT_FOUND, PACK_HINT, PACK_NOTE, UNIT_NOTE } from '../src/words/card.js';
import { wordAt } from '../src/words/tap.js';
import { notesFor, HINT, MAX_NOTES } from '../src/words/lesson-notes.js';
import { armIfPackReady } from '../src/words/anywhere.js';
import { ALEF_TOOLS } from '../src/settings/tools.js';

const text = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const read = (p) => JSON.parse(text(p));
const m = await morph();
const NAME = 'יהוה';
const HEB = /[א-ת]/;
function strings(x, acc = []) {
  if (typeof x === 'string') { if (HEB.test(x)) acc.push(x); } else if (Array.isArray(x)) x.forEach((y) => strings(y, acc)); else if (x && typeof x === 'object') Object.values(x).forEach((y) => strings(y, acc));
  return acc;
}
/** A fetch that serves the app's own pack catalog from disk and counts every other request. */
function catalogFetch(edit = (c) => c) {
  const calls = [];
  const fn = async (url) => {
    const u = String(url);
    if (u.endsWith('/data/packs/catalog.json')) return new Response(JSON.stringify(edit(read('data/packs/catalog.json'))), { status: 200 });
    calls.push(u);
    return new Response('', { status: 404 });
  };
  fn.calls = calls;
  return fn;
}

test('the word-notes package is the pinned tools build, reached through src/settings/tools.js', () => {
  const lock = read('data/alef-tools.lock.json');
  assert.match(lock.ref, /^[0-9a-f]{40}$/);
  assert.equal(ALEF_TOOLS.commit, lock.ref);
  assert.equal(lock.packages.morph.version, m.version);
  assert.equal(m.id, 'morph');
  assert.deepEqual([...m.packs], ['words']);
  for (const f of readdirSync(new URL('../src/words/', import.meta.url))) assert.doesNotMatch(text(`src/words/${f}`), /_alef-tools\/[a-z-]+@\d/, `${f} must not name a tools version`);
});

test('every Hebrew word of every lesson, practical unit and dialogue has notes with no pack (the Name and single letters have none)', async () => {
  const units = new Map();
  for (const l of read('data/curriculum/lessons.json').lessons) {
    const all = strings(l);
    const body = `data/curriculum/lessons-intermediate/${l.id}.json`;
    if (existsSync(new URL(`../${body}`, import.meta.url))) strings(read(body), all);
    units.set(l.id, all);
  }
  for (const f of readdirSync(new URL('../data/curriculum/practical/', import.meta.url)).filter((n) => /^pu-.*\.json$/.test(n))) { const u = read(`data/curriculum/practical/${f}`); units.set(u.id || f.replace(/\.json$/, ''), strings(u)); }
  for (const d of read('data/curriculum/dialogues.json').dialogues) units.set(d.id, strings(d));
  assert.ok(units.size >= 170);
  let seen = 0, found = 0, none = 0; const missing = [];
  for (const [id, list] of units) {
    const unit = await m.loadUnit(id);
    assert.ok(unit, `no notes for ${id}`);
    for (const s of list) for (const w of m.words(s)) {
      seen++;
      const card = cardModel(m, { word: w.word, around: s, unit });
      if (m.isNameWord(w.word) || !m.isWord(w.word)) { none++; assert.equal(card, null, w.word); continue; }
      if (card.found) { found++; assert.ok(card.lines.length >= 1, `${id} ${w.word}`); } else if (missing.length < 8) missing.push(`${id}: ${w.word}`);
    }
  }
  assert.ok(seen > 6000, `only ${seen} words walked`);
  assert.equal(found + none, seen, `words without notes, e.g. ${missing.join(' | ')}`);
});

test('the Name is in no vendored notes file, and a tap on it opens nothing', async () => {
  const dir = new URL(`../assets/vendor/_alef-tools/morph@${m.version}/data/morph/`, import.meta.url);
  let files = 0;
  for (const n of readdirSync(dir)) { assert.equal(readFileSync(new URL(n, dir), 'utf8').includes(NAME), false, n); files++; }
  assert.ok(files >= 170);
  const unit = await m.loadUnit('r05');
  for (const w of [NAME, 'יְ' + 'הוָה', 'ל' + NAME, 'ה׳']) assert.equal(cardModel(m, { word: w, unit }), null);
});

test('card: a lesson word shows its dictionary form and kind in plain English; a single letter gets no card', async () => {
  const unit = await m.loadUnit('pu-cafe');
  const c = cardModel(m, { word: 'קָפֶה', unit });
  assert.equal(c.source, 'lesson');
  assert.equal(c.note, UNIT_NOTE);
  const form = c.lines.find((l) => l.id === 'form');
  assert.equal(form.he, 'קָפֶה');
  assert.match(form.text, /coffee/);
  assert.match(c.lines.find((l) => l.id === 'kind').text, /^Noun \(a thing, person or idea\): masculine/);
  for (const l of c.lines) if (l.id !== 'form') assert.deepEqual(m.lint(l.text), [], l.text);
  assert.equal(cardModel(m, { word: 'שׁ', unit: await m.loadUnit('r01') }), null);
});

test('card: a word outside the notes says so; the pack is mentioned only when it is offered; a pack reading is labelled', async () => {
  const unit = await m.loadUnit('pu-cafe');
  const plain = cardModel(m, { word: 'אנציקלופדיה', unit });
  assert.deepEqual([plain.found, plain.note, plain.packLink], [false, NOT_FOUND, false]);
  const offered = cardModel(m, { word: 'אנציקלופדיה', unit, packOffered: true });
  assert.deepEqual([offered.note, offered.packLink], [`${NOT_FOUND} ${PACK_HINT}`, true]);
  const joint = { token: 'ובבית', start: 0, end: 5, lemma: 'בית', prefix: 'וב', base: 'בית', pos: 'NOUN', feats: { Gender: 'Masc', Number: 'Sing' }, prefixPos: ['CCONJ', 'ADP', 'DET'], suffix: null, suffixFeats: null, ner: 'O' };
  const c = cardModel(m, { word: 'ובבית', unit: null, joint, roots: await m.loadRoots() });
  assert.equal(c.source, 'pack');
  assert.equal(c.note, PACK_NOTE);
  assert.deepEqual(c.lines.map((l) => l.id).slice(0, 4), ['form', 'prefix', 'the', 'kind']);
  assert.match(c.lines[0].text, /It may be wrong/);
});

test('copy: nothing a learner reads says how the notes were made, and each line is short', () => {
  for (const s of [NOT_FOUND, PACK_HINT, PACK_NOTE, UNIT_NOTE, HINT]) {
    assert.doesNotMatch(s, /\b(AI|model|machine|neural|algorithm|BERT|generated)\b/i, s);
    assert.ok(s.split(/\s+/).length <= 30, s);
  }
});

test('tap: the word under the tap, the only word of a one-word element, nothing for a tap that is not on a word', () => {
  const t = 'אֲנִי רוֹצָה קָפֶה';
  const at = (s, o) => wordAt(m.words(s), o);
  assert.equal(at(t, 1), 'אֲנִי');
  assert.equal(at(t, t.indexOf('רוֹצָה') + 2), 'רוֹצָה');
  assert.equal(at(t, t.length), 'קָפֶה');
  assert.equal(at('שָׁלוֹם', -1), 'שָׁלוֹם');
  assert.equal(at(t, -1), null);
  assert.equal(at('hello', 2), null);
  assert.equal(at('עַל־לְבָבֶךָ', 1), 'עַל');
});

test('lesson notes: at most three, each different, each passing the copy check', async () => {
  let lessonsWithNotes = 0;
  for (const l of read('data/curriculum/lessons.json').lessons) {
    const notes = notesFor(m, l.words, await m.loadUnit(l.id));
    assert.ok(notes.length <= MAX_NOTES);
    assert.equal(new Set(notes.map((n) => n.id)).size, notes.length);
    for (const n of notes) assert.deepEqual(m.lint(n.text), [], `${l.id}: ${n.text}`);
    if (notes.length) lessonsWithNotes++;
  }
  assert.ok(lessonsWithNotes >= 10, `only ${lessonsWithNotes} lessons got a note`);
});

test('the pack: not offered yet, so no reader, no request beyond the app\'s own list, and Talk and Camera arm nothing', async () => {
  const catalog = read('data/packs/catalog.json');
  const words = catalog.packs.find((p) => p.name === 'words');
  assert.ok(words, 'the Word helper pack is in the catalog');
  assert.equal(words.published, false);
  assert.ok(words.budgetBytes <= 50 * 1048576);
  assert.ok(words.credits.some((c) => /Dicta/.test(c) && /CC BY 4\.0/.test(c)));
  const fetch = catalogFetch();
  assert.equal(await wordsReader({ fetch }), null);
  assert.deepEqual(fetch.calls, []);
  let listened = 0;
  const root = { ownerDocument: { querySelector: () => ({}) }, addEventListener: () => { listened++; }, removeEventListener: () => {} };
  (await armIfPackReady(root, () => ({}), { fetch }))();
  assert.equal(listened, 0);
});

test('the pack, once offered but not downloaded: still no reader, no worker, and nothing is downloaded', async () => {
  const fetch = catalogFetch((c) => { c.packs.find((p) => p.name === 'words').published = true; return c; });
  let workers = 0;
  const stores = new Map();
  const caches = { open: async (n) => { if (!stores.has(n)) stores.set(n, new Map()); const s = stores.get(n); return { match: async (k) => s.get(String(k.url || k)), put: async (k, r) => { s.set(String(k.url || k), r); }, keys: async () => [], delete: async () => false }; }, delete: async () => true, keys: async () => [] };
  assert.equal(await wordsReader({ fetch, caches, WorkerCtor: class { constructor() { workers++; } } }), null);
  assert.equal(workers, 0);
  assert.ok(fetch.calls.length >= 1 && fetch.calls.every((u) => u.endsWith('/words/pack.json')), `only the pack's small list may be asked for: ${fetch.calls.join(', ')}`);
  assert.match(ORT_BASE, /\/assets\/vendor\/_ort\/$/);
});

test('install size: word-notes code and data are on demand, never in the first install; the views load them lazily', () => {
  const pre = text('precache-manifest.js');
  const first = JSON.parse(/self\.ALEF_PRECACHE\s*=\s*(\[[\s\S]*?\])\s*;/.exec(pre)[1]);
  const later = JSON.parse(/self\.ALEF_ON_DEMAND\s*=\s*(\[[\s\S]*?\])\s*;/.exec(pre)[1]);
  assert.equal(first.some((f) => f.startsWith('src/words/') || f.includes('_alef-tools') || f === 'assets/css/words.css'), false);
  for (const f of ['src/words/tap.js', 'src/words/card.js', 'src/words/lesson-notes.js', 'src/words/morph.js', 'assets/css/words.css', `assets/vendor/_alef-tools/morph@${m.version}/data/morph/r01.js`, `assets/vendor/_alef-tools/morph@${m.version}/index.js`])
    assert.ok(later.includes(f), `${f} should be listed as on-demand`);
  for (const [file, re] of [['src/curriculum/lesson.view.js', /import\("\.\.\/words\/lesson-notes\.js"\)/], ['src/talk/talk.view.js', /import\('\.\.\/words\/anywhere\.js'\)/], ['src/camera/camera.view.js', /import\('\.\.\/words\/anywhere\.js'\)/]]) {
    assert.match(text(file), re, file);
    assert.doesNotMatch(text(file), /^import .*words\//m, file);
  }
});
