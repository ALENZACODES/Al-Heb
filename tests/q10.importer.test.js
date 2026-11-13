// Q10, Read Your Own Text: the model on the app's real dictionary, and the view on a minimal fake DOM (logic only).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const M = await import('../src/importer/model.js');
const index = JSON.parse(readFileSync(new URL('../data/vocab/index.json', import.meta.url), 'utf8'));
const lookup = M.createLookup(index);

test('the dictionary is found by letters, with or without vowel marks', () => {
  assert.ok(lookup.size > 4000);
  const a = lookup.find('שָׁלוֹם'), b = lookup.find('שלום');
  assert.equal(a.how, 'dictionary'); assert.deepEqual(a.senses.map((s) => s.id), b.senses.map((s) => s.id));
  assert.match(a.senses[0].en, /peace|hello/i);
  assert.ok(a.senses.every((s) => s.id && s.he && typeof s.lesson === 'string'));
  assert.ok(a.senses.length <= 3);
});

test('a word behind a prefix letter or an ending is offered as a possibility, and says so; a word that is not there is not guessed', () => {
  const p = lookup.find('והבית');
  assert.equal(p.how, 'prefix'); assert.equal(p.prefix.letter, 'וה'); assert.equal(p.prefix.meaning, 'and + the');
  assert.match(M.howLine({ ...p }), /^Possibly ו \+ ה \(and \+ the\) in front of this word\.$/);
  const pl = lookup.find('ספרים');
  assert.ok(['ending', 'dictionary'].includes(pl.how));
  if (pl.how === 'ending') assert.match(M.howLine(pl), /^Possibly a plural of this word\.$/);
  const none = lookup.find('קקקקק');
  assert.deepEqual([none.how, none.senses.length], ['unknown', 0]);
  assert.equal(M.howLine(none), 'Not in the dictionary.');
  assert.equal(M.howLine(lookup.find('שלום')), '');
});

test('reading keeps everything that was pasted, in order, and counts each different spelling once', () => {
  const text = 'שָׁלוֹם, שלום!  Hello 12\nבּוֹקֶר טוֹב';
  const r = M.readText(text, lookup);
  assert.equal(r.lines.length, 2);
  assert.equal(r.lines.map((l) => l.parts.map((p) => p.text).join('')).join('\n'), text.normalize('NFC'));
  assert.equal(r.hebrewWords, 4);
  assert.deepEqual(r.words.map((w) => [w.key, w.count]), [['שלום', 2], ['בוקר', 1], ['טוב', 1]]);
  assert.equal(r.lines[0].parts.filter((p) => p.t === 'word').length, 2);
  assert.equal(M.readText('no Hebrew here', lookup).hebrewWords, 0);
  assert.match(M.summaryLine(M.readText('abc', lookup), M.vocabulary([])), /no Hebrew/);
});

test('the Name is shown as ה׳, is not a word in any list, and has no dictionary entry attached', () => {
  const r = M.readText('בָּרוּךְ יְהוָה לְעוֹלָם וַיהוָה', lookup);
  const names = r.lines[0].parts.filter((p) => p.t === 'name');
  assert.equal(names.length, 2);
  assert.ok(names.every((p) => p.shown === 'ה׳' && p.i === undefined));
  assert.equal(r.hebrewWords, 2);
  assert.ok(r.words.every((w) => !/יהוה/.test(w.key)));
  assert.ok(!r.lines[0].parts.filter((p) => p.t !== 'name').some((p) => /יהוה/.test(p.shown.replace(/[֑-ׇ]/g, ''))));
});

test('the three lists: met (a finished lesson or marked known), to learn, and not in the dictionary', () => {
  const r = M.readText('שלום בוקר טוב קקקקק שלום', lookup);
  const shalom = r.words.find((w) => w.key === 'שלום'), boker = r.words.find((w) => w.key === 'בוקר');
  let v = M.vocabulary(r.words, {});
  assert.deepEqual([v.met.length, v.fresh.length, v.unlisted.length, v.coverage], [0, 3, 1, 0]);
  assert.equal(v.fresh[0], shalom, 'the word used most in this text comes first');
  v = M.vocabulary(r.words, { completed: { [shalom.senses[0].lesson]: 1 } });
  assert.ok(v.met.includes(shalom));
  v = M.vocabulary(r.words, { known: { [boker.senses[0].id]: 1 } });
  assert.deepEqual([v.met.includes(boker), v.fresh.includes(boker)], [true, false]);
  assert.equal(v.coverage, 1 / 5);
  assert.match(M.summaryLine(r, v), /^5 Hebrew words, 4 different\. You have met 1 of them \(20% of the text\)\. 2 to learn, 1 not in the dictionary\.$/);
});

test('a very long text is cut at a line end and says so; saved state keeps only the marked words', () => {
  const long = Array.from({ length: 3000 }, () => 'שלום עולם').join('\n');
  const c = M.clip(long);
  assert.equal(c.cut, true); assert.ok(c.text.length <= M.MAX_CHARS); assert.ok(c.text.endsWith('עולם'));
  assert.equal(M.clip('שלום').cut, false);
  let st = M.normalizeState({ known: { a: 1, b: 0 }, text: 'never kept' });
  assert.deepEqual(st, { v: 1, known: { a: 1 } });
  st = M.markKnown(st, 'c'); st = M.markKnown(st, 'a', false);
  assert.deepEqual(st.known, { c: 1 });
});

// ---- the screen ---------------------------------------------------------------------------------------------------
class N {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.className = ''; this.value = ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { this.children.push(...c.flat().filter((x) => x != null).map((x) => (typeof x === 'object' ? x : { nodeType: 3, data: String(x) }))); }
  replaceChildren(...c) { this.children = []; this.append(...c); }
  remove() {}
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v) }]; }
  get textContent() { return this.text; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(''); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  click() { for (const f of this.listeners.click || []) f({}); if (this.onclick) this.onclick({}); }
}
globalThis.document = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }) };
const flush = () => new Promise((r) => setTimeout(r, 0));
const waitFor = async (f) => { for (let i = 0; i < 300; i++) { const v = f(); if (v) return v; await flush(); } throw new Error('timed out'); };
const by = (root, id) => root.find((n) => n.attrs.id === id)[0];

function fakeCtx(extra = {}) {
  const data = new Map(); const played = [];
  return { played, data, store: { get: async (k) => data.get(k) ?? null, set: async (k, v) => { data.set(k, v); } }, settings: { get: (k) => ({ voice: 'm', congregation: 'israeli' })[k] },
    audio: { status: (kind, id, o) => ({ kind, id, voice: o.voice, tradition: o.tradition, source: 'file', path: 'audio/m/israeli/word/x.mp3' }), play: async (kind, id, o) => { played.push({ kind, id, o }); return { source: 'file' }; }, stop() {} },
    importer: { index, clips: { clips: {} }, ...extra } };
}

test('screen: paste, read, tap a word for its meaning, mark it known, and the lists follow', async () => {
  const V = await import('../src/importer/importer.view.js');
  const ctx = fakeCtx();
  const root = new N('div');
  const off = V.mount(root, ctx);
  assert.match(root.text, /Your text stays on this device\. It is read in the page, sent nowhere/);
  const input = by(root, 'imp-text');
  by(root, 'imp-read').click();
  await waitFor(() => /Paste or type some Hebrew first/.test(root.text));
  input.value = 'בָּרוּךְ יְהוָה. שלום שלום קקקקק';
  by(root, 'imp-read').click();
  await waitFor(() => by(root, 'imp-summary'));
  assert.match(by(root, 'imp-summary').text, /4 Hebrew words, 3 different/);
  const words = root.find((n) => n.attrs['data-i'] !== undefined);
  assert.equal(words.length, 4);
  assert.deepEqual(words.map((w) => w.attrs['data-kind']), ['new', 'new', 'new', 'unlisted']);
  const name = root.find((n) => n.attrs['data-name'] !== undefined);
  assert.equal(name.length, 1); assert.equal(name[0].text, 'ה׳'); assert.equal(name[0].tag, 'span', 'the Name is not a button: it cannot be tapped, looked up or played');
  assert.match(by(root, 'imp-new').text, /Words You Don't Know Yet \(2\)/);
  assert.match(by(root, 'imp-unlisted').text, /Not In The Dictionary \(1\)/);
  words[1].click();
  await waitFor(() => /In this text 2 times\./.test(root.text));
  assert.match(by(root, 'imp-panel').text, /peace|hello/i);
  by(root, 'imp-know').click();
  await waitFor(() => /Marked as a word you know/.test(root.text));
  assert.match(by(root, 'imp-met').text, /Words You Have Met \(1\)/);
  assert.equal(Object.keys(ctx.data.get('importer.v1').known).length, 1);
  assert.equal(JSON.stringify([...ctx.data.entries()]).includes('קקקקק'), false, 'the pasted text is never saved');
  // the unknown word says so plainly
  root.find((n) => n.attrs['data-kind'] === 'unlisted')[0].click();
  await waitFor(() => /not in Aleph's dictionary/.test(root.text));
  by(root, 'imp-clear').click();
  assert.equal(by(root, 'imp-out').children.length, 0);
  off();
});

test('screen: Hear it plays only that word\'s own recording, and says so plainly when there is none', async () => {
  const V = await import('../src/importer/importer.view.js');
  const sense = lookup.find('שלום').senses[0];
  const { clipKey } = await import('../src/vocab/clips.js');
  const clip = { kind: 'word', id: 'shalom', voice: 'm', tradition: 'israeli', status: 'tts', source: 'paid-cloud' };
  const ctx = fakeCtx({ clips: { clips: { [clipKey(sense.he)]: { 'm|israeli': clip } } }, text: 'שלום בוקר' });
  const root = new N('div');
  V.mount(root, ctx);
  await waitFor(() => by(root, 'imp-summary'));
  root.find((n) => n.attrs['data-i'] === '0')[0].click();
  await waitFor(() => root.find((n) => n.attrs['data-hear']).length);
  root.find((n) => n.attrs['data-hear'] === sense.id)[0].click();
  await waitFor(() => ctx.played.length === 1);
  assert.deepEqual([ctx.played[0].kind, ctx.played[0].id, ctx.played[0].o.allowMismatchedTts, 'text' in ctx.played[0].o], ['word', 'shalom', false, false]);
  root.find((n) => n.attrs['data-i'] === '1')[0].click();
  await waitFor(() => root.find((n) => n.attrs['data-hear']).length && !root.find((n) => n.attrs['data-hear'] === sense.id).length);
  root.find((n) => n.attrs['data-hear'])[0].click();
  await waitFor(() => /There is no recording of this word yet\./.test(root.text));
  assert.equal(ctx.played.length, 1);
});

test('the route is registered, loads on demand, and its copy is plain', async () => {
  const router = readFileSync(new URL('../src/shell/router.js', import.meta.url), 'utf8');
  assert.match(router, /name: 'import', pattern: '\/import', module: '\.\.\/importer\/importer\.view\.js', title: 'Read Your Own Text'/);
  const scope = {}; new Function('self', readFileSync(new URL('../precache-manifest.js', import.meta.url), 'utf8'))(scope);
  assert.ok(scope.ALEF_ON_DEMAND.includes('src/importer/importer.view.js')); assert.ok(!scope.ALEF_PRECACHE.includes('src/importer/importer.view.js'));
  const src = readFileSync(new URL('../src/importer/importer.view.js', import.meta.url), 'utf8') + readFileSync(new URL('../src/importer/model.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src.replace(/^\s*(\/\/|\*|\/\*).*$/gm, ''), /\bfetch\(|XMLHttpRequest|sendBeacon|speechSynthesis|\b(AI|neural|algorithm)\b/);
  for (const t of [M.PRIVACY_NOTE, M.LIMITS_NOTE]) assert.doesNotMatch(t, /\b(AI|model|algorithm)\b/i);
});
