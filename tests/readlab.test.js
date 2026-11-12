// Reading Tools (#/readlab), reading lane 2026-11-12: B1 fade slider and challenge, B2 spotlight, B3 syllable taps, B4 sh'va detective,
// B5 final forms and dagesh, B7 family letters, B8 verb patterns, B9 three versions, B10 progress by text type, G7 stress.
// Pure logic on the real data, and the view on a minimal fake DOM (logic only: not real-browser layout or accessibility).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const json = (rel) => JSON.parse(readFileSync(new URL(rel, root), 'utf8'));
const M = await import('../src/readlab/model.js');
const W = await import('../src/readlab/words.js');
const D = await import('../src/readlab/drills.js');
const { stripPoints } = await import('../src/nikkudfade/model.js');
const { findName } = await import('../src/shell/names.js');
const { SHVA_RULES, classifyShvas } = await import('../src/pronunciation/shva.js');
const { parseWord } = await import('../src/pronunciation/hebrew.js');
const registry = json('data/corpus/registry.json');
const rawName = (s) => findName(String(s)).some((w) => w.kind !== 'abbrev');
const g1 = json('data/games/g1/words.json'), rs = json('data/nikkudfade/reading-set.json');

// ---------- B1 ----------
test('fade levels: marks are only removed; all/none are full/bare; the four-letter name is ה׳ at every level', () => {
  const shema = registry.entries.find((e) => e.id === 'shema-1');
  for (const lv of [0, 1, 2, 3]) {
    const ws = M.fadeLine(shema.he, lv);
    assert.ok(ws.length >= 4);
    for (const w of ws) { assert.equal(stripPoints(w.shown), stripPoints(w.full)); assert.ok(!rawName(w.shown)); }
    assert.ok(ws.some((w) => w.shown.includes('ה׳')));
  }
  const ws0 = M.fadeLine(shema.he, 0), ws3 = M.fadeLine(shema.he, 3), ws1 = M.fadeLine(shema.he, 1), ws2 = M.fadeLine(shema.he, 2);
  assert.ok(ws0.every((w) => w.pointed)); assert.ok(ws3.every((w) => !w.pointed && w.shown === stripPoints(w.full)));
  assert.deepEqual(ws1.map((w) => w.pointed), ws1.map((_, i) => i % 3 !== 2), 'most marks: every third word bare (the Torah course pattern)');
  assert.deepEqual(ws2.map((w) => w.pointed), ws2.map((_, i) => i % 3 === 0), 'few marks: every third word keeps its marks');
});

test('per-section level: each section keeps its own; bad values are clamped; state survives a round trip', () => {
  let s = M.normalizeState(null);
  s = M.setFade(M.setFade(s, 'prayers', 3), 'torah', 1);
  assert.deepEqual(s.fade, { stories: 0, prayers: 3, torah: 1 });
  assert.equal(M.setFade(s, 'nope', 2), s);
  assert.deepEqual(M.normalizeState({ fade: { stories: 9, prayers: 2 } }).fade, { stories: 0, prayers: 2, torah: 0 });
  assert.deepEqual(M.normalizeState(JSON.parse(JSON.stringify(s))), s);
});

test('fade challenge: marks on the first half, none after; the score counts only the unmarked half; short texts refused', () => {
  const words = M.fadeLine('אַחַת שְׁתַּיִם שָׁלוֹשׁ אַרְבַּע חָמֵשׁ שֵׁשׁ שֶׁבַע', 0);
  const cw = M.challengeWords(words);
  assert.deepEqual(cw.map((w) => w.faded), [false, false, false, false, true, true, true]);
  assert.ok(cw.filter((w) => w.faded).every((w) => w.shown === stripPoints(w.full)));
  const { result } = M.challengeResult(words, [1, 5, 99], { textId: 'line:x', section: 'prayers', at: 5 });
  assert.deepEqual(result, { textId: 'line:x', section: 'prayers', at: 5, pointed: 4, faded: 3, stumbledPointed: 1, stumbledFaded: 1 });
  assert.equal(M.challengeScore(result), 67);
  assert.match(M.challengeResult(words.slice(0, 5), [], { textId: 'a' }).error, /at least 6/);
  const s = M.addChallenge(M.normalizeState(null), result);
  assert.equal(M.challengesFor(s, 'line:x').length, 1);
  assert.deepEqual(M.normalizeState(JSON.parse(JSON.stringify(s))).challenges, s.challenges);
});

// ---------- B9 ----------
test('three versions: version 2 opens only after version 1 is read without help; locked versions record nothing', () => {
  let s = M.normalizeState(null);
  assert.equal(M.versionOpen(s, 'book:book1', 0), true); assert.equal(M.versionOpen(s, 'book:book1', 1), false);
  let r = M.recordVersion(s, 'book:book1', 2, true, 1); assert.equal(r.state, s); assert.equal(r.opened, null);
  r = M.recordVersion(s, 'book:book1', 0, false, 2); s = r.state; assert.equal(M.versionOpen(s, 'book:book1', 1), false, 'a read with help opens nothing');
  r = M.recordVersion(s, 'book:book1', 0, true, 3); s = r.state; assert.equal(r.opened, 1); assert.equal(M.versionOpen(s, 'book:book1', 1), true);
  r = M.recordVersion(s, 'book:book1', 1, true, 4); s = r.state; assert.equal(r.opened, 2);
  r = M.recordVersion(s, 'book:book1', 2, true, 5); s = r.state; assert.equal(r.opened, null); assert.equal(M.versionDone(s, 'book:book1', 2), true);
  assert.deepEqual(s.texts['book:book1'].versions.map((v) => v.tries), [2, 1, 1]);
  assert.deepEqual(M.normalizeState(JSON.parse(JSON.stringify(s))), s);
  assert.deepEqual(M.VERSIONS.map((v) => M.FADE_LEVELS[v.level].id), ['all', 'most', 'none']);
});

// ---------- B10 ----------
test('progress by type: four rows counted only from stored records, each with its own total', async () => {
  const { modernShelf } = await import('../src/bridge/model.js');
  const { BOOKS } = await import('../src/lib/counts.js');
  const shelf = json('data/books/index.json');
  const modern = modernShelf({ signs: json('data/camera/sign-glossary.json'), scenarios: json('data/israel/scenarios.json') });
  const data = { entries: registry.entries, books: shelf.books, modern };
  const empty = M.progressByType(data, {});
  assert.deepEqual(empty.map((r) => r.id), ['prayers', 'torah', 'stories', 'everyday']);
  assert.ok(empty.every((r) => r.practised === 0 && r.second === 0));
  assert.equal(empty[0].total, registry.entries.filter((e) => e.category === 'siddur').length);
  assert.equal(empty[1].total, registry.entries.filter((e) => e.category === 'torah').length);
  assert.equal(empty[2].total, BOOKS, 'the stories total is the counts module figure');
  const sid = registry.entries.find((e) => e.category === 'siddur').id, tor = registry.entries.find((e) => e.category === 'torah').id;
  const rec = {
    'srs.cards': { [`line:${sid}`]: {} }, 'timedread.v1': { reads: [{ textId: `${tor}#1` }] }, 'bridge.v1': { texts: { [`line:${tor}`]: { tries: 2, done: true } }, modern: { [modern[0].id]: { seen: 2, firstTry: 1 }, [modern[1].id]: { seen: 1, firstTry: 0 } } },
    'books.v1': { book1: { lastPage: 2 }, book2: { lastPage: 11, finishedAt: 9 } }, 'books.finished.v1': { book3: 7 },
  };
  const rows = M.progressByType(data, rec);
  assert.deepEqual(rows.map((r) => [r.practised, r.second]), [[1, 0], [1, 1], [2, 2], [2, 1]]);
  assert.equal(rows[0].why.fade, 1); assert.equal(rows[1].why.timed, 1); assert.equal(rows[1].why.bridge, 1);
});

// ---------- B7, B8 ----------
test('word keys and family-letter matching: spelling match only, final forms match their base letter, no match -> null', () => {
  assert.equal(W.wordKey('בְּרֵאשִׁ֖ית׃'), W.wordKey('בְּרֵאשִׁית'));
  assert.deepEqual(W.familyMatch('מְכוֹנִית', 'כ־ו־ן'), [1, 2, 3]);
  assert.deepEqual(W.familyMatch('כֵּן', 'כ־ו־ן'), null, 'a dropped letter means nothing is highlighted');
  assert.deepEqual(W.familyMatch('מֶלֶךְ', 'מ־ל־ך'), [0, 1, 2]);
  const pieces = W.letterPieces('מְכוֹנִית', [1, 2, 3]);
  assert.equal(pieces.map((p) => p.text).join(''), 'מְכוֹנִית');
  assert.deepEqual(pieces.map((p) => p.hit), [false, true, true, true, false, false]);
  assert.deepEqual(W.lineWords('אָב־בַּיִת  שָׁלוֹם, ').map((w) => w.text), ['אָב־בַּיִת', 'שָׁלוֹם,']);
});

test('word-tags.json is current, copies family letters and patterns from the roots data, and never holds the four-letter name', async () => {
  const B = await import('../tools/readlab/build-data.mjs');
  const out = B.outputs();
  for (const [rel, body] of Object.entries(out)) assert.equal(readFileSync(new URL(rel, root), 'utf8'), body, `${rel} is stale: run node tools/readlab/build-data.mjs`);
  const tags = json('data/readlab/word-tags.json');
  const verbs = json('data/roots/verbs.json').verbs, fams = json('data/roots/families.json').families;
  const v = verbs.find((x) => x.binyan && x.forms?.future);
  assert.equal(tags.tags[W.wordKey(v.forms.future)]?.b, v.binyan);
  const famWord = fams[0].words[0];
  assert.equal(tags.tags[W.wordKey(famWord.he)]?.f, fams[0].root);
  const binyanim = new Set(verbs.map((x) => x.binyan));
  for (const [k, t] of Object.entries(tags.tags)) {
    assert.ok(t.f || t.b, k); if (t.b) assert.ok(binyanim.has(t.b)); assert.ok(!rawName(k));
  }
  assert.ok(W.PATTERN_KEY.every((p) => binyanim.has(p.b)) && new Set(W.PATTERN_KEY.map((p) => p.tag)).size === 7);
});

// ---------- G7 ----------
test('stress words: stress from the IPA mark, placed only when the syllable count matches; computed fallback is labelled', async () => {
  const B = await import('../tools/readlab/build-data.mjs');
  assert.deepEqual(B.ipaStress('/(ʔ)aˈni/'), { nuclei: 2, index: 1 });
  assert.deepEqual(B.ipaStress('/ˈba.jit/ [ˈbɐ.(j)it]'), { nuclei: 2, index: 0 });
  assert.equal(B.ipaStress('/ʃaˈlom ˈx/'), null, 'two stress marks: not used');
  assert.equal(B.ipaStress('/shalom/'), null);
  const file = json('data/readlab/stress-words.json');
  const words = new Map(json('data/vocab/words.json').words.map((w) => [w.id, w]));
  assert.ok(file.count >= 100);
  for (const w of file.words) {
    const src = words.get(w.id);
    assert.equal(src.he, w.he); assert.equal(src.ipa, w.ipa);
    assert.equal(w.syllables.join(''), w.he);
    const s = B.ipaStress(w.ipa); assert.equal(s.nuclei, w.syllables.length); assert.equal(s.index, w.stress);
  }
  const items = D.stressItems(file, { pool: D.wordPool(g1), computed: true });
  assert.ok(items.some((i) => i.source === 'ipa') && items.some((i) => i.source === 'computed'));
  assert.ok(D.stressSet(items, { size: 10, seed: 3 }).every((i) => i.source === 'ipa'), 'the default set is dictionary stress only');
  assert.match(D.STRESS_SOURCE_TEXT.computed, /^Computed/);
});

// ---------- B4 ----------
test('sh\'va detective: verdicts are the app\'s level-2 rules, stress-guess verdicts left out, 20 items, rule text shown', () => {
  const pool = D.wordPool(g1, rs);
  const items = D.shvaItems(pool);
  assert.ok(items.length >= 40);
  for (const it of items) {
    const v = classifyShvas(parseWord(it.he), { level: 2 }).get(it.at);
    assert.equal(it.answer, v.na ? 'na' : 'nach'); assert.equal(v.heuristic, false); assert.notEqual(it.rule, 'L3');
    assert.equal(it.ruleText, SHVA_RULES.find((r) => r.id === it.rule).text);
    assert.ok(!rawName(it.he));
  }
  const set = D.shvaSet(items, { seed: 5 });
  assert.equal(set.length, 20); assert.equal(new Set(set.map((i) => i.he)).size, 20);
  assert.ok(new Set(set.map((i) => i.rule)).size >= 3, 'rules mixed');
  assert.ok(D.SHVA_DRILL_RULES.every((r) => r.status === 'implemented')); assert.ok(D.SHVA_NOT_COVERED.some((r) => r.id === 'L3'));
  assert.equal(D.shvaDisplay(set[0]).filter((c) => c.mark).length, 1);
});

// ---------- B5 ----------
test('final forms and dagesh: five pairs and three dot letters from letters.json; every answer is the word\'s own spelling', () => {
  const letters = json('data/letters/letters.json');
  const cards = D.formCards(letters);
  assert.deepEqual(cards.finals.map((c) => c.final.finalOf), ['kaf', 'mem', 'nun', 'pe', 'tsadi']);
  assert.deepEqual(cards.dagesh.map((c) => c.id), ['bet', 'kaf', 'pe']);
  assert.equal(D.formTiles(cards).length, 10);
  const items = D.formItems(D.wordPool(g1, rs), cards);
  const fin = D.formSet(items, 'final', { seed: 2 }), dag = D.formSet(items, 'dagesh', { seed: 2 });
  assert.equal(fin.length, 20); assert.equal(dag.length, 20);
  for (const it of fin) { const cl = [...it.he].filter((c) => /[א-ת]/.test(c)); assert.equal(cl[it.at], it.answer); assert.equal(it.where === 'end', it.at === cl.length - 1); }
  for (const it of dag) { const b = D.blanked(it); assert.equal(b.filter((x) => x.gap).length, 1); }
  assert.ok(new Set(dag.map((i) => i.answer)).size === 2, 'both dot and no-dot asked');
});

test('syllable clips: only exact clip spellings map to a clip id', () => {
  assert.equal(D.syllableClipId('בַּ'), 'bet-a'); assert.equal(D.syllableClipId('שַׁ'), 'shin-a'); assert.equal(D.syllableClipId('לִ'), 'lamed-i');
  assert.equal(D.syllableClipId('בַ'), null); assert.equal(D.syllableClipId('נִי'), null); assert.equal(D.syllableClipId('לוֹ'), null);
  const man = json('data/audio/manifest.json').filter((e) => e.kind === 'syllable');
  const ids = new Set(man.map((e) => e.id));
  for (const e of man) { const id = D.syllableClipId(e.text); if (id) assert.ok(ids.has(id)); }
  assert.ok(man.filter((e) => D.syllableClipId(e.text) === e.id).length >= 50, 'the five-sign clips are recognised');
});

// ---------- B2, B3 ----------
test('spotlight model: letters and marks named from the app data, syllables join back to the word, the name is never split', async () => {
  const S = await import('../src/readlab/spotlight.js');
  const data = { letters: json('data/letters/letters.json'), niqqud: json('data/pronunciation/niqqud.json'), tags: json('data/readlab/word-tags.json') };
  const m = S.spotlightModel('שָׁלוֹם', data);
  assert.equal(m.clusters.length, 4); assert.match(m.clusters[0].marks.join(' '), /Kamatz/); assert.match(m.clusters[0].marks.join(' '), /[Ss]hin/);
  assert.equal(m.syllables.map((s) => s.he).join(''), 'שָׁלוֹם');
  const n = S.spotlightModel(registry.entries.find((e) => e.id === 'shema-1').he.split(/\s+/).find(rawName), data);
  assert.equal(n.name, true); assert.equal(n.shown, 'ה׳');
});

// ---------- B6 ----------
test('fluency chart rows: one text, last 12 reads, words a minute from the stored time', async () => {
  const F = await import('../src/readlab/fluency.js');
  const reads = Array.from({ length: 15 }, (_, i) => ({ textId: 'a', words: 6, ms: 6000 + i * 100, stumbled: i % 2, at: 1e12 + i }));
  const rows = F.fluencyRows(reads);
  assert.equal(rows.length, 12); assert.equal(rows[0].n, 1); assert.equal(rows[0].wpm, Math.round(6 / (6300 / 60000)));
  assert.equal(rows[0].cleanWpm, Math.round(5 / (6300 / 60000)));
  assert.match(F.changeLine(rows), /From read 1 to read 12/); assert.match(F.changeLine(rows.slice(0, 1)), /One read/);
});

// ---------- routes ----------
test('routes: lazy view, sitemap lists every tool, code and data are on demand', async () => {
  const src = readFileSync(new URL('src/shell/router.js', root), 'utf8');
  assert.match(src, /name: 'readlab', pattern: '\/readlab', module: '\.\.\/readlab\/readlab\.view\.js'/);
  assert.match(src, /pattern: '\/readlab\/:tool'.*paramQuery: \{ tool: 'tool' \}/);
  const { ENUMERATE } = await import('../tools/seo/build-sitemap.mjs');
  const { TOOLS } = await import('../src/readlab/readlab.view.js');
  assert.deepEqual(await ENUMERATE['/readlab/:tool'](), TOOLS.map((t) => t.id));
  const { isOnDemand } = await import('../tools/build-precache.mjs');
  for (const f of ['src/readlab/readlab.view.js', 'src/readlab/model.js', 'src/readlab/fluency.js', 'data/readlab/word-tags.json', 'data/readlab/stress-words.json']) assert.ok(isOnDemand(f), f);
});

// ---------- view on a minimal fake DOM ----------
class N {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.className = ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); } removeAttribute(k) { delete this.attrs[k]; } getAttribute(k) { return this.attrs[k] ?? null; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { this.children.push(...c); }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v) }]; }
  get textContent() { return this.text; }
  remove() {} focus() {}
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(''); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  async click() { for (const f of this.listeners.click || []) await f({ target: this }); }
}
globalThis.document = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }) };
const flush = () => new Promise((r) => setTimeout(r, 0));
const waitFor = async (f) => { for (let i = 0; i < 400; i++) { const v = f(); if (v) return v; await flush(); } throw new Error('timeout'); };
const find = (r, pred) => r.find(pred)[0];
const byText = (r, t) => find(r, (n) => n.tag === 'button' && n.text === t);
const byId = (r, id) => find(r, (n) => n.attrs.id === id);
const mkCtx = (query, m = {}, extra = {}) => ({ query, store: { get: (k) => m[k], set: (k, v) => { m[k] = v; } }, readlabLoad: async (rel) => json(rel), settings: { get: () => null }, ...extra });
const { mount } = await import('../src/readlab/readlab.view.js');

test('view: hub lists the five tools', async () => {
  const r = new N('div'); const un = mount(r, mkCtx({}));
  await waitFor(() => /Sh'va Detective/.test(r.text));
  for (const t of ['texts', 'shva', 'forms', 'stress', 'progress']) assert.ok(find(r, (n) => n.attrs.href === `#/readlab/${t}`), t);
  assert.match(r.text, /Draft/); un();
});

test('view: the slider sets the level for one section only; tapping a word opens the spotlight', async () => {
  const m = {};
  const r = new N('div'); const un = mount(r, mkCtx({ tool: 'texts', sec: 'torah', id: 'shema-1' }, m));
  const slider = await waitFor(() => byId(r, 'rl-fade'));
  for (const f of slider.listeners.input) f({ target: { value: '3' } });
  await flush();
  assert.equal(m['readlab.v1'].fade.torah, 3); assert.equal(m['readlab.v1'].fade.stories, 0); assert.equal(m['readlab.v1'].fade.prayers, 0);
  const shema = registry.entries.find((e) => e.id === 'shema-1');
  const firstBare = stripPoints(shema.he.split(/\s+/)[0]);
  assert.ok(r.text.includes(firstBare)); assert.ok(!rawName(r.text));
  await find(r, (n) => (n.className || '').startsWith('rl-w') && n.attrs['data-word'] === '0').click();
  await waitFor(() => /Letters and Vowel Marks/.test(r.text));
  assert.match(r.text, /Syllables/);
  un();
});

test('view: family letters and verb patterns mark only words the word list gives them, with a key', async () => {
  const r = new N('div'); const un = mount(r, mkCtx({ tool: 'texts', sec: 'stories', id: 'book1' }));
  await waitFor(() => byText(r, 'Family letters: off'));
  await byText(r, 'Verb patterns: off').click(); await waitFor(() => /Verb pattern key/.test(r.text));
  await byText(r, 'Family letters: off').click(); await waitFor(() => byText(r, 'Family letters: on'));
  assert.match(r.text, /Found in the word list by exact spelling: \d+ of \d+ words have family letters; \d+ of \d+ words are verb forms/);
  const tags = json('data/readlab/word-tags.json').tags;
  const coloured = r.find((n) => n.tag === 'button' && /rl-pat/.test(n.className || ''));
  assert.ok(coloured.length >= 1, 'book1 has verb forms the word list lists');
  assert.ok(r.find((n) => n.tag === 'mark').length >= 1, 'family letters marked');
  for (const b of coloured) {
    const word = b.children.filter((c) => c.nodeType === 3 || c.tag === 'mark').map((c) => (c.nodeType === 3 ? c.data : c.text)).join('');
    assert.ok(tags[W.wordKey(word)]?.b, word);
  }
  un();
});

test('view: fade challenge saves a self-reported score for the unmarked half', async () => {
  const m = {};
  const r = new N('div'); const un = mount(r, mkCtx({ tool: 'texts', sec: 'stories', id: 'book1' }, m));
  await waitFor(() => byText(r, 'Fade Challenge'));
  await byText(r, 'Fade Challenge').click();
  await byId(r, 'rl-ch-start').click(); await byId(r, 'rl-ch-done').click();
  const words = r.find((n) => n.tag === 'button' && n.attrs['data-word'] != null);
  await words[words.length - 1].click();
  await byId(r, 'rl-ch-save').click(); await waitFor(() => byId(r, 'rl-ch-result'));
  const c = m['readlab.v1'].challenges[0];
  assert.equal(c.textId, 'book:book1'); assert.equal(c.stumbledFaded, 1); assert.equal(c.stumbledPointed, 0);
  assert.match(r.text, /Self-reported/); un();
});

test('view: three versions open in order; showing marks on a word makes the read a read with help', async () => {
  const m = {};
  const r = new N('div'); const un = mount(r, mkCtx({ tool: 'texts', sec: 'stories', id: 'book1' }, m));
  await waitFor(() => byText(r, 'Three Versions'));
  await byText(r, 'Three Versions').click();
  assert.match(r.text, /Version 2: Some Marks \(locked\)/);
  await byId(r, 'rl-v-read').click(); await flush();
  assert.equal(m['readlab.v1'].texts['book:book1'].versions[0].done, true);
  assert.match(r.text, /Version 2: Some Marks is now open/);
  await byText(r, 'Version 2: Some Marks').click();
  await find(r, (n) => n.tag === 'button' && n.attrs['data-word'] === '0').click();
  await waitFor(() => /Letters and Vowel Marks/.test(r.text)); // a word that still has its marks opens the spotlight, not help
  await find(r, (n) => n.tag === 'button' && n.attrs['data-word'] === '2').click();
  assert.match(r.text, /counts as read with help|Vowel marks shown/);
  await byId(r, 'rl-v-read').click(); await flush();
  assert.equal(m['readlab.v1'].texts['book:book1'].versions[1].done, false, 'help shown');
  assert.match(r.text, /Version 3: No Marks \(locked\)/); un();
});

test('view: sh\'va detective states the rules once, then runs a set of 20 and saves it', async () => {
  const m = {};
  const r = new N('div'); const un = mount(r, mkCtx({ tool: 'shva' }, m));
  await waitFor(() => byId(r, 'rl-start'));
  assert.match(r.text, /B1\. Shva under the first letter/); assert.match(r.text, /does not cover/);
  await byId(r, 'rl-start').click();
  for (let i = 0; i < 20; i++) { await find(r, (n) => n.attrs['data-answer'] === 'na').click(); assert.match(byId(r, 'rl-why').text, /Rule [A-Z]\d/); await byId(r, 'rl-next').click(); }
  await waitFor(() => byId(r, 'rl-score'));
  assert.equal(m['readlab.v1'].drills.shva.seen, 20); un();
});

test('view: final forms set: 10 pick items then 10 type items with all ten letter tiles', async () => {
  const m = {};
  const r = new N('div'); const un = mount(r, mkCtx({ tool: 'forms' }, m));
  await waitFor(() => byId(r, 'rl-start'));
  assert.match(r.text, /Final Kaf/);
  await byId(r, 'rl-start').click();
  for (let i = 0; i < 20; i++) {
    const tiles = r.find((n) => n.attrs['data-tile'] != null);
    assert.equal(tiles.length, i < 10 ? 2 : 10);
    await tiles[0].click(); await byId(r, 'rl-next').click();
  }
  await waitFor(() => byId(r, 'rl-score'));
  assert.deepEqual(Object.keys(m['readlab.v1'].drills['forms-final'].by).sort(), ['pick', 'type']); un();
});

test('view: stress drill reveals the source after the tap; the default set is dictionary stress', async () => {
  const r = new N('div'); const un = mount(r, mkCtx({ tool: 'stress' }));
  await waitFor(() => byId(r, 'rl-start'));
  await byId(r, 'rl-start').click();
  await find(r, (n) => n.attrs['data-syl'] === '0').click();
  assert.equal(find(r, (n) => n.attrs['data-source'] != null).attrs['data-source'], 'ipa');
  assert.match(r.text, /Now Hear It/); un();
});

test('view: reading by text type shows four rows', async () => {
  const r = new N('div'); const un = mount(r, mkCtx({ tool: 'progress' }, { 'books.v1': { book1: { lastPage: 1 } } }));
  await waitFor(() => find(r, (n) => n.attrs['data-type'] === 'everyday'));
  assert.deepEqual(r.find((n) => n.attrs['data-type']).map((n) => n.attrs['data-type']), ['prayers', 'torah', 'stories', 'everyday']);
  assert.match(find(r, (n) => n.attrs['data-type'] === 'stories').text, /^Stories1 /); un();
});

test('timed read-aloud shows the fluency chart for the chosen line', async () => {
  const { mount: mountTdr } = await import('../src/timedread/timedread.view.js');
  const { fluencyChart } = await import('../src/readlab/fluency.js');
  const chart = fluencyChart([{ textId: 'a', words: 6, ms: 6000, stumbled: 1, at: 1 }, { textId: 'a', words: 6, ms: 5000, stumbled: 0, at: 2 }]);
  assert.match(chart.text, /Words a Minute, Read by Read/); assert.match(chart.text, /60 to 72/);
  assert.equal(fluencyChart([]), null);
  assert.equal(typeof mountTdr, 'function');
  assert.match(readFileSync(new URL('src/timedread/timedread.view.js', root), 'utf8'), /fluencyChart\(readsFor\(st, item\.id\)\)/);
});
