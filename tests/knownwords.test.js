// Known-word validator: pure functions, the CLI on repo data, and the preview view.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { strip, tokens, knownSet, matchWord, validate, passes, similar, dialogueText, LEVELS } from '../src/knownwords/validate.js';
import { N, tick, btn } from './torahread.fakedom.js';

const rd = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const ROWS = JSON.parse(rd('data/vocab/words.json')).words;
const row = (he, level, extra = {}) => ({ he, heUnpointed: strip(he), level, frequencyRank: 1, ...extra });

test('strip removes points, cantillation, maqaf, geresh and quotes but keeps letters (and the final forms)', () => {
  assert.equal(strip('שָׁלוֹם'), 'שלום'); assert.equal(strip('אֶת־הַ'), 'אתה'); assert.equal(strip('צה״ל'), 'צהל'); assert.equal(strip('ך'), 'ך');
});
test('tokens: Hebrew words only, maqaf splits, Latin and digits ignored', () => {
  assert.deepEqual(tokens('hello שָׁלוֹם, עולם 123 אֶת־הַבַּיִת').map(strip), ['שלום', 'עולם', 'את', 'הבית']);
  assert.deepEqual(tokens(''), []); assert.deepEqual(tokens(null), []);
});
test('knownSet: level cut-off, stored forms included, bad level throws', () => {
  const rows = [row('בַּיִת', 'A1', { forms: { plural: 'בָּתִּים' } }), row('שֻׁלְחָן', 'A2'), row('מִסְפָּרָה', 'B1')];
  assert.deepEqual([...knownSet(rows, { maxLevel: 'A1' })].sort(), ['בית', 'בתים']);
  assert.ok(knownSet(rows, { maxLevel: 'A2' }).has('שלחן')); assert.ok(!knownSet(rows, { maxLevel: 'A2' }).has('מספרה'));
  assert.ok(knownSet(rows, { maxLevel: 'B1' }).has('מספרה'));
  assert.ok(knownSet(rows, { maxLevel: 'A1', maxRank: 0 }).size === 0);
  assert.ok(!knownSet([row('סוֹד', 'A1', { flags: { hidden: true } })], { maxLevel: 'A1' }).has('סוד'), 'hidden records are not counted as known');
  assert.throws(() => knownSet(rows, { maxLevel: 'C1' }));
});
test('matchWord: exact, one or two prefix letters, never strips down to a single letter, never strips non-prefix letters', () => {
  const k = new Set(['בית', 'ספר']);
  assert.equal(matchWord('בית', k).how, 'exact'); assert.equal(matchWord('הבית', k).how, 'prefix'); assert.equal(matchWord('והבית', k).how, 'prefix');
  assert.equal(matchWord('הבית', k, false), null); assert.equal(matchWord('דבית', k), null); assert.equal(matchWord('הוהבית', k), null);
  assert.equal(matchWord('הב', new Set(['ב'])), null);
});
test('validate: counts occurrences, separates exact from prefix, lists unknown with counts, allow-list works', () => {
  const k = new Set(['בית', 'גדול']);
  const r = validate('הבית גדול בית ארמון ארמון ו', k);
  assert.equal(r.total, 6); assert.equal(r.exact, 2); assert.equal(r.prefix, 1);
  assert.deepEqual(r.unknown, [{ word: 'ארמון', count: 2 }, { word: 'ו', count: 1 }]);
  assert.equal(r.coverage, 3 / 6); assert.equal(r.exactCoverage, 2 / 6);
  assert.equal(validate('ארמון', k, { allow: ['אַרְמוֹן'] }).coverage, 1);
  assert.equal(validate('', k).coverage, 1); assert.ok(passes(validate('בית', k))); assert.ok(!passes(validate('בית ארמון', k), 0.9));
});
test('validate does not change with the pointing of the input', () => {
  const k = knownSet(ROWS, { maxLevel: 'B2' });
  const pointed = 'אֲנִי רוֹצָה', plain = 'אני רוצה';
  assert.deepEqual(validate(pointed, k), validate(plain, k));
});
test('similar: needs 4+ letters, only listed spellings one edit away', () => {
  const k = new Set(['לוקח', 'לקחת', 'שלום']);
  assert.deepEqual(similar('לוקחת', k), ['לוקח', 'לקחת']); assert.deepEqual(similar('פה', new Set(['קפה'])), []);
});
test('repo data: dialogues are validated against their own level, results are stable counts (A1 set contains the first-lesson pronoun)', () => {
  const dl = JSON.parse(rd('data/curriculum/dialogues.json')).dialogues; assert.ok(dl.length >= 5);
  const sets = {}; for (const l of LEVELS) sets[l] = knownSet(ROWS, { maxLevel: l });
  assert.ok(sets.A1.has('אני'));
  for (const d of dl) {
    const r = validate(dialogueText(d), sets[d.level]);
    assert.ok(r.total > 0 && r.coverage >= 0 && r.coverage <= 1, d.id);
    assert.equal(r.exact + r.prefix + r.unknown.reduce((a, u) => a + u.count, 0), r.total, `${d.id}: counts add up`);
  }
  // a higher level never lowers coverage
  const d = dl[0], t = dialogueText(d);
  let prev = -1; for (const l of LEVELS) { const c = validate(t, sets[l]).coverage; assert.ok(c >= prev); prev = c; }
});
test('CLI: --dialogues prints one line per dialogue and exits 0 without a gate; a gate of 1 fails; bad level exits 2', () => {
  const run = (...a) => spawnSync('node', ['tools/knownwords/check.mjs', ...a], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' });
  const ok = run('--dialogues'); assert.equal(ok.status, 0); assert.match(ok.stdout, /d-cafe \[A1\] words \d+, listed \d+, by prefix \d+, not listed \d+, coverage [\d.]+%/);
  assert.match(ok.stdout, /\d+ text\(s\) checked, 0 below the gate/);
  const gate = run('--dialogues', '--min', '1'); assert.equal(gate.status, 1); assert.match(gate.stdout, /BELOW/);
  assert.equal(run('--dialogues', '--level', 'C9').status, 2); assert.equal(run().status, 2);
});
test('module has no imports and no DOM or network use', () => {
  const src = rd('src/knownwords/validate.js'); assert.doesNotMatch(src, /^\s*import /m); assert.doesNotMatch(src, /document\.|fetch\(|localStorage/);
});

test('view: text is checked on the chosen level, unknown words listed with lang=he, nothing stored', async () => {
  const V = await import('../src/knownwords/knownwords.view.js');
  const words = [row('בַּיִת', 'A1'), row('גָּדוֹל', 'A2')]; const stored = [];
  const root = new N('main'), un = V.mount(root, { knownWordsData: { words }, store: { get() {}, set(k, v) { stored.push(k); } } }); await tick();
  const area = root.queryAll('textarea')[0]; assert.equal(area.attrs.lang, 'he'); assert.equal(area.attrs.dir, 'rtl');
  assert.ok(root.queryAll('label').some((l) => l.attrs.for === area.attrs.id));
  area.value = 'הבית גדול ארמון'; await btn(root, /^Check the words/).click(); await tick();
  assert.match(root.textContent, /3 Hebrew words found\. Listed exactly: 0\. .*after taking off.*: 1\. Not listed: 2\./);
  await btn(root, /^A2$/).click(); await btn(root, /^Check the words/).click(); await tick();
  assert.match(root.textContent, /Listed exactly: 1\..*: 1\. Not listed: 1\./);
  const items = root.queryAll('li'); assert.equal(items.length, 1);
  assert.ok(root.all((n) => n.attrs.lang === 'he' && n.tag === 'span' && /ארמון/.test(n.textContent)).length === 1);
  assert.deepEqual(stored, []);
  area.value = ''; await btn(root, /^Check the words/).click(); assert.match(root.queryAll('[role="status"]')[0].textContent, /Paste some Hebrew/);
  un();
});

test('derived index: current, small, and gives the same set (members and order) as the whole vocabulary file at every level', async () => {
  const { buildIndex } = await import('../tools/knownwords/build.mjs');
  const { knownSetFromIndex } = await import('../src/knownwords/validate.js');
  const text = rd('data/knownwords/index.json'), index = JSON.parse(text);
  assert.equal(JSON.stringify(buildIndex(ROWS)) + '\n', text, 'stale: run node tools/knownwords/build.mjs');
  assert.ok(Buffer.byteLength(text) < 400000, 'index must stay small');
  assert.ok(Object.keys(index.lessons).length > 5 && 'r01' in index.lessons, 'keyed by lesson');
  for (const lv of LEVELS) assert.deepEqual([...knownSetFromIndex(index, { maxLevel: lv })], [...knownSet(ROWS, { maxLevel: lv })], lv);
  assert.throws(() => knownSetFromIndex(index, { maxLevel: 'C1' }));
  const r = spawnSync(process.execPath, ['tools/knownwords/build.mjs', '--check'], { cwd: new URL('../', import.meta.url).pathname }); assert.equal(r.status, 0);
});
test('view: loads the small index, never data/vocab/words.json, and reports the same as the word-row path', async () => {
  const V = await import('../src/knownwords/knownwords.view.js'), D = await import('../src/curriculum/data.js');
  const asked = []; const real = globalThis.fetch;
  const index = JSON.parse(rd('data/knownwords/index.json'));
  const text = 'הבית גדול ארמון שלום';
  const run = async (ctx) => { const root = new N('main'), un = V.mount(root, ctx); await tick(); root.queryAll('textarea')[0].value = text; await btn(root, /^B2$/).click(); await btn(root, /^Check the words/).click(); await tick(); const t = root.textContent; un(); return t; };
  const a = await run({ knownWordsIndex: index }), b = await run({ knownWordsData: { words: ROWS } });
  assert.equal(a, b); assert.equal(typeof D.loadJSON, 'function'); assert.deepEqual(asked, []); globalThis.fetch = real;
  assert.ok(!/data\/vocab\/words\.json/.test(rd('src/knownwords/knownwords.view.js').replace(/\/\*\*[\s\S]*?\*\//, '')), 'view no longer names the whole vocabulary file in code');
});
