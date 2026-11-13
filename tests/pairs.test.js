// Look-Alike Words (confusing pairs): the rule-built pair list, the drill model, and the view (fake DOM).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { N, tick, btn, memStore } from './torahread.fakedom.js';
import * as M from '../src/pairs/model.js';
import { build, letters, sounds, oneApart, soundApart, eligible, MAX_PER_KIND, MAX_PER_WORD, OUT } from '../tools/vocab/build_confusables.mjs';

const rd = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const words = JSON.parse(rd('data/vocab/words.json')).words;
const DATA = JSON.parse(rd(OUT));
const byId = new Map(words.map((w) => [w.id, w]));

test('the pair list is current: rebuild with node tools/vocab/build_confusables.mjs', () => {
  assert.equal(JSON.stringify(build(words)) + '\n', rd(OUT));
});

test('spelling and sound helpers', () => {
  assert.equal(letters('מֶלֶךְ'), 'מלכ'); assert.equal(letters('שָׁלוֹם!'), 'שלומ');
  assert.deepEqual(oneApart('עבד', 'עבר'), { type: 'letter', at: 2, a: 'ד', b: 'ר' });
  assert.deepEqual(oneApart('שמר', 'שרמ'), { type: 'swap', at: 1, a: 'מר', b: 'רמ' });
  assert.equal(oneApart('עבד', 'עבד'), null); assert.equal(oneApart('עבד', 'שמר'), null); assert.equal(oneApart('אב', 'אבא'), null);
  assert.equal(sounds('kol'), sounds('Kol')); assert.equal(sounds('akh'), sounds('ach')); assert.equal(sounds("sha'ar"), 'Sar');
  assert.equal(soundApart('kar', 'kar'), 0); assert.equal(soundApart('boten', 'moten'), 1); assert.equal(soundApart('kar', 'kara'), 1); assert.equal(soundApart('kar', 'tov'), null);
});

test('every pair holds two different, visible, single words copied from the word list, and its kind is true of them', () => {
  assert.equal(DATA.counts.pairs, DATA.pairs.length);
  assert.ok(DATA.pairs.length >= 600, 'enough pairs to drill');
  const ids = new Set();
  for (const p of DATA.pairs) {
    assert.ok(!ids.has(p.id), `pair id ${p.id} repeats`); ids.add(p.id);
    assert.match(p.id, /^[lsv]\d{3}$/);
    const a = byId.get(p.a), b = byId.get(p.b);
    assert.ok(a && b && a.id !== b.id, p.id);
    assert.ok(eligible(a) && eligible(b), p.id);
    for (const w of [a, b]) assert.deepEqual(DATA.words[w.id], { he: w.he, translit: w.translit, en: w.en, pos: w.pos, rank: w.frequencyRank }, w.id);
    assert.notEqual(a.he, b.he, p.id);
    assert.notEqual(a.en.toLowerCase(), b.en.toLowerCase(), `${p.id}: the two words mean the same`);
    const la = letters(a.heUnpointed), lb = letters(b.heUnpointed);
    if (p.kind === 'same') assert.equal(la, lb, p.id);
    if (p.kind === 'look') { const d = oneApart(la, lb); assert.ok(d, p.id); assert.deepEqual(p.differs, [d.a, d.b]); assert.equal(!!p.swap, d.type === 'swap'); }
    if (p.kind === 'sound') { assert.notEqual(la, lb, p.id); assert.ok(soundApart(sounds(a.translit), sounds(b.translit)) !== null, p.id); assert.equal(!!p.sameSound, sounds(a.translit) === sounds(b.translit)); }
  }
  assert.deepEqual(Object.keys(DATA.words).sort(), [...new Set(DATA.pairs.flatMap((p) => [p.a, p.b]))].sort(), 'no word is carried that no pair uses');
});

test('limits hold: at most MAX_PER_KIND pairs of a kind, and a word joins at most MAX_PER_WORD pairs of a kind', () => {
  for (const kind of M.KIND_IDS) {
    const ps = DATA.pairs.filter((p) => p.kind === kind);
    assert.ok(ps.length > 0 && ps.length <= MAX_PER_KIND, kind);
    const n = new Map(); for (const p of ps) for (const id of [p.a, p.b]) n.set(id, (n.get(id) || 0) + 1);
    assert.ok(Math.max(...n.values()) <= MAX_PER_WORD, kind);
  }
  assert.ok(rd(OUT).length < 300 * 1024, 'the list stays small enough to fetch on one tap');
});

test('the divine Name is never in a pair', () => {
  for (const w of Object.values(DATA.words)) assert.ok(!['יהוה'].includes(letters(w.he)), w.he);
});

test('well-known mix-ups are found by the rules (none was added by hand)', () => {
  const has = (kind, x, y) => DATA.pairs.some((p) => p.kind === kind && [DATA.words[p.a].he, DATA.words[p.b].he].sort().join() === [x, y].sort().join());
  assert.ok(has('sound', 'אִם', 'עִם'), 'if / with');
  assert.ok(has('sound', 'כָּל', 'קוֹל'), 'all / voice');
  assert.ok(has('look', 'עָבַד', 'עָבַר'), 'to work / to pass');
  assert.ok(has('same', 'דָּבָר', 'דִּבֵּר'), 'thing / to speak');
});

test('a round: two options that are the two words of the pair, no word twice, missed pairs first', () => {
  const fresh = M.normalizeProgress(null);
  for (const kind of [null, ...M.KIND_IDS]) for (let seed = 1; seed <= 20; seed++) {
    const round = M.buildRound(DATA, fresh, { kind, seed, count: 8 });
    assert.equal(round.length, 8);
    const seen = new Set();
    for (const q of round) {
      if (kind) assert.equal(q.pair.kind, kind);
      assert.deepEqual(q.options.map((o) => o.id).sort(), [q.pair.a, q.pair.b].sort());
      assert.ok([q.pair.a, q.pair.b].includes(q.answer)); assert.equal(q.answer, q.target);
      for (const id of [q.pair.a, q.pair.b]) { assert.ok(!seen.has(id)); seen.add(id); }
      if (q.type === 'meaning') assert.ok(q.prompt.includes(DATA.words[q.target].en)); else assert.equal(q.prompt, 'What does this word mean?');
      if (q.pair.sameSound) assert.equal(q.type, 'meaning');
      assert.equal(M.grade(q, q.answer).correct, true); assert.equal(M.grade(q, q.other).correct, false);
    }
  }
  const missed = DATA.pairs.filter((p) => p.kind === 'look')[300];
  const p2 = M.record(fresh, missed.id, false);
  assert.equal(M.standing(p2, missed.id), 'shaky');
  assert.equal(M.buildRound(DATA, p2, { kind: 'look', seed: 3 })[0].pair.id, missed.id, 'a missed pair opens the next round');
  const p3 = M.record(M.record(p2, missed.id, true), missed.id, true);
  assert.equal(M.standing(p3, missed.id), 'steady'); assert.equal(p3.asked, 3); assert.equal(p3.right, 2);
  assert.deepEqual(M.tally(DATA, p3, 'look'), { total: 400, new: 399, shaky: 0, steady: 1 });
});

test('progress is cleaned on the way in', () => {
  const p = M.normalizeProgress({ asked: 5, right: 9, round: -1, pairs: { l001: [2, 1], bogus: [1, 1], s002: 'x', v003: [NaN, 4] } });
  assert.deepEqual(p, { v: 1, asked: 5, right: 5, round: 0, pairs: { l001: [2, 1], v003: [0, 4] } });
  assert.deepEqual(M.normalizeProgress('junk'), M.emptyProgress());
});

test('the difference line is plain and says what differs', () => {
  const W = DATA.words, of = (kind, f = () => true) => DATA.pairs.find((p) => p.kind === kind && f(p));
  assert.match(M.difference(of('look', (p) => !p.swap), W), /^One letter differs: . and .\.$/);
  assert.match(M.difference(of('same'), W), /^Same letters, different vowel marks: /);
  assert.match(M.difference(of('sound', (p) => p.sameSound), W), /^Both are said ".+"\. The letters differ\.$/);
  assert.match(M.difference(of('sound', (p) => !p.sameSound), W), /^Nearly the same sound: /);
  for (const p of DATA.pairs) assert.doesNotMatch(M.difference(p, W), /undefined|null/);
});

test('browse search matches Hebrew letters without marks, English and sounds-like', () => {
  assert.ok(M.listPairs(DATA, { q: 'voice' }).some((p) => DATA.words[p.b].he === 'קוֹל' || DATA.words[p.a].he === 'קוֹל'));
  assert.ok(M.listPairs(DATA, { kind: 'sound', q: 'קול' }).length >= 1);
  assert.ok(M.listPairs(DATA, { kind: 'look', q: 'avad' }).length >= 1);
  assert.equal(M.listPairs(DATA, { q: 'zzzzqq' }).length, 0);
  assert.equal(M.listPairs(DATA, { kind: 'same' }).length, 40);
});

test('view: a round is answered, the two words are shown apart, counts are stored; browse lists pairs', async () => {
  const V = await import('../src/pairs/pairs.view.js');
  const root = new N('div'), store = memStore();
  const un = V.mount(root, { store, pairsData: DATA, query: { kind: 'sound' } }); await tick();
  assert.match(root.textContent, /Look-Alike Words/); assert.match(root.textContent, /Draft and unreviewed/); assert.match(root.textContent, /Question 1 of 8/);
  assert.equal(btn(root, /^Sound alike \(400\)$/).attrs['aria-pressed'], 'true'); assert.equal(btn(root, /^Look alike/).attrs['aria-pressed'], 'false');
  for (let i = 0; i < 8; i++) {
    const opts = root.queryAll('[aria-label="Answers"] button'); assert.equal(opts.length, 2);
    assert.equal(root.queryAll('[data-pair]').length, 0, 'the answer is not shown before choosing');
    await opts[0].click(); await tick();
    assert.equal(root.queryAll('[aria-label="Answers"] button').filter((b) => b.attrs.disabled !== undefined).length, 2, 'options lock after answering');
    assert.match(root.textContent, /Right\.|Not this one\./);
    assert.equal(root.queryAll('[data-pair]').length, 1);
    await btn(root, /Next pair|Finish round/).click(); await tick();
  }
  assert.match(root.textContent, /Round Done/); assert.match(root.textContent, /right of 8 this round/);
  assert.equal(store.m[M.STORE_KEY].asked, 8); assert.equal(Object.keys(store.m[M.STORE_KEY].pairs).length, 8);
  await btn(root, /Another round/).click(); await tick();
  assert.equal(store.m[M.STORE_KEY].round, 1); assert.match(root.textContent, /Question 1 of 8/);
  await btn(root, /Browse the pairs/).click(); await tick();
  assert.equal(root.queryAll('[data-pair]').length, 40);
  assert.match(root.textContent, /In practice: (not asked yet|missed before|steady)\./);
  assert.doesNotMatch(root.textContent, /undefined|\bAI\b|model/i);
  un();
});

test('view: the route is a preview page in Learn, and its store key is on the privacy list', () => {
  assert.match(rd('src/shell/router.js'), /\{ name: 'pairs', pattern: '\/pairs', module: '\.\.\/pairs\/pairs\.view\.js', tier: 'preview', title: 'Look-Alike Words'/);
  assert.match(rd('src/shell/privacy.view.js'), /\['pairs\.v1', /);
  assert.match(rd('src/shell/nav.strings.js'), /'nav\.route\.pairs': 'Look-Alike Words'/);
});
