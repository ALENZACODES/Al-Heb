// Traditions lane: model tests (pure functions). They prove the logic of detection, alignment, audio planning
// and drill construction against fake audio objects. They do not prove any audio exists (none does).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  clusters, textLines, wordsOf, respellLines, compareWords, soundsIn, switchesIn, ipaFor, clipPlan,
  textDrillItems, makeTextQuestion, audioDrillPool, makeAudioQuestion, loadTraditionsData, TRADITIONS, shuffle,
} from '../src/traditions/model.js';

const load = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const registry = load('data/corpus/registry.json');
const prayerwords = load('data/pronunciation/prayerwords.json');
const consonants = load('data/pronunciation/consonants.json');
const niqqud = load('data/pronunciation/niqqud.json');
const sounds = load('data/traditions/sounds.json');
const entry = (id) => registry.entries.find((e) => e.id === id);
const rngSeq = (...vals) => { let i = 0; return () => vals[i++ % vals.length]; };

test('clusters and text helpers', () => {
  const cs = clusters('שַׁבָּת');
  assert.deepEqual(cs.map((c) => c.ch), ['ש', 'ב', 'ת']);
  assert.ok(cs[2].marks === '' && cs[1].marks.includes('ּ'));
  assert.deepEqual(textLines('א\n\nב\r\nג'), ['א', 'ב', 'ג']);
  assert.deepEqual(wordsOf('שְׁמַע  יִשְׂרָאֵל ׀ ה׳'), ['שְׁמַע', 'יִשְׂרָאֵל', 'ה׳']);
});

test('detectors: tav without dagesh, with dagesh, kamatz, cholam, ayin, chet, qof, resh', () => {
  assert.ok(soundsIn('שַׁבָּת').includes('tav-no-dagesh'));
  assert.ok(!soundsIn('תּוֹרָה').includes('tav-no-dagesh'), 'tav with dagesh is t everywhere');
  assert.ok(soundsIn('תּוֹרָה').includes('cholam') && soundsIn('תּוֹרָה').includes('kamatz'));
  assert.ok(soundsIn('עוֹלָם').includes('ayin'));
  assert.ok(soundsIn('חַלָּה').includes('chet'));
  assert.ok(soundsIn('בָּרוּךְ').includes('chet'), 'khaf without dagesh counts with chet');
  assert.ok(!soundsIn('כֹּל').includes('chet'));
  assert.ok(soundsIn('קָדוֹשׁ').includes('qof') && soundsIn('רְאוּבֵן').includes('resh'));
  assert.ok(soundsIn('אַתָּה').includes('patach-kamatz'));
  assert.deepEqual(switchesIn('מֶלֶךְ'), ['stress']);
  assert.deepEqual(soundsIn(''), []);
});

test('every sound id returned by detectors has a row in sounds.json', () => {
  const ids = new Set(sounds.sounds.map((s) => s.id));
  for (const e of registry.entries) for (const id of soundsIn(e.he)) assert.ok(ids.has(id), id);
});

test('respellLines: three settings; israeli and sephardi identical; ashkenazi differs on the Priestly Blessing', () => {
  const e = entry('bless-priestly-1');
  const [i, s, a] = TRADITIONS.map((t) => respellLines(e.he, t));
  assert.deepEqual(i, s);
  assert.notDeepEqual(i, a);
  assert.match(a[0], /adonoy/);
  assert.throws(() => respellLines(e.he, 'yemenite'), RangeError);
});

test('compareWords aligns word-for-word with the Hebrew for all 70 registry texts (no fallback needed)', () => {
  for (const e of registry.entries) {
    const rows = compareWords(e.he);
    const heWords = textLines(e.he).flatMap(wordsOf);
    assert.equal(rows.length, heWords.length, e.id);
    for (const r of rows) assert.ok(r.israeli && r.sephardi && r.ashkenazi, `${e.id} ${r.he}`);
  }
  const rows = compareWords(entry('hamotzi').he);
  const b = rows.find((r) => r.israeli === 'barukh');
  assert.equal(b.ashkenazi, 'borukh');
  assert.equal(b.differs, true);
  assert.equal(rows.find((r) => r.israeli === 'lechem').differs, false);
});

test('ipaFor: Israeli and Ashkenazi from the pronunciation data; American synagogue gets none; variant lookup works', () => {
  const tav = sounds.sounds.find((s) => s.id === 'tav-no-dagesh');
  const pron = { consonants, niqqud };
  assert.equal(ipaFor(tav, 'ashkenazi', pron), '[s]');
  assert.equal(ipaFor(tav, 'israeli', pron), '[t]');
  assert.equal(ipaFor(tav, 'sephardi', pron), '');
  assert.equal(ipaFor(sounds.sounds.find((s) => s.id === 'stress'), 'israeli', pron), '');
  assert.equal(ipaFor(sounds.sounds.find((s) => s.id === 'kamatz'), 'ashkenazi', pron), '[ɔ]');
});

// ---- audio planning against fake players ----
const fakeAudio = (table) => ({
  has: (k, id, o = {}) => table[`${o.tradition}|${k}|${id}`] === 'file',
  status: (k, id, o = {}) => {
    const v = table[`${o.tradition}|${k}|${id}`];
    if (v === 'file') return { source: 'file', via: 'exact' };
    if (v === 'equiv') return { source: 'file', via: 'equivalent', fileTradition: 'israeli' };
    return { source: 'none' };
  },
});

test('clipPlan: none by default (no audio exists), file, stand-in, multi-line via line ids', () => {
  const one = entry('shema-1');
  assert.equal(clipPlan({}, one, 'israeli').status, 'none');
  assert.equal(clipPlan({ audio: fakeAudio({}) }, one, 'israeli').status, 'none');
  const withFile = clipPlan({ audio: fakeAudio({ 'ashkenazi|line|shema-1': 'file' }) }, one, 'ashkenazi');
  assert.equal(withFile.status, 'file');
  assert.deepEqual(withFile.items, [{ kind: 'line', id: 'shema-1', tradition: 'ashkenazi' }]);
  assert.equal(clipPlan({ audio: fakeAudio({ 'sephardi|line|shema-1': 'equiv' }) }, one, 'sephardi').status, 'stand-in');
  const multi = entry('kaddish-1');
  const n = textLines(multi.he).length;
  assert.ok(n > 1);
  const table = {};
  for (let i = 1; i <= n; i++) table[`israeli|line|kaddish-1-l${i}`] = 'file';
  const plan = clipPlan({ audio: fakeAudio(table) }, multi, 'israeli');
  assert.equal(plan.status, 'file');
  assert.equal(plan.items.length, n);
  delete table['israeli|line|kaddish-1-l2'];
  assert.equal(clipPlan({ audio: fakeAudio(table) }, multi, 'israeli').status, 'none', 'one missing line means no clip');
  assert.equal(clipPlan({ audio: fakeAudio({ 'israeli|prayer|kaddish-1': 'file' }) }, multi, 'israeli').status, 'file');
});

test('clipPlan falls back to has() when the player has no status()', () => {
  const audio = { has: (k, id, o) => o.tradition === 'israeli' && id === 'shema-1' };
  assert.equal(clipPlan({ audio }, entry('shema-1'), 'israeli').status, 'file');
  assert.equal(clipPlan({ audio }, entry('shema-1'), 'ashkenazi').status, 'none');
  assert.equal(clipPlan({ audio: { has: () => { throw new Error('x'); } } }, entry('shema-1'), 'israeli').status, 'none');
});

test('audio drill pool: empty with no audio; stand-ins never count as a second setting', () => {
  assert.equal(audioDrillPool({ audio: fakeAudio({}) }, registry).length, 0);
  const onlyStandIn = fakeAudio({ 'israeli|line|shema-1': 'file', 'sephardi|line|shema-1': 'equiv' });
  assert.equal(audioDrillPool({ audio: onlyStandIn }, registry).length, 0);
  const two = fakeAudio({ 'israeli|line|shema-1': 'file', 'ashkenazi|line|shema-1': 'file', 'sephardi|line|shema-1': 'equiv' });
  const pool = audioDrillPool({ audio: two }, registry);
  assert.equal(pool.length, 1);
  assert.deepEqual(pool[0].traditions.sort(), ['ashkenazi', 'israeli']);
  const q = makeAudioQuestion(pool[0], rngSeq(0.1, 0.9, 0.2, 0.3));
  assert.equal(q.clips.length, 2);
  assert.ok(['A', 'B'].includes(q.answer));
  assert.equal(q.clips.find((c) => c.label === q.answer).tradition, q.ask);
  assert.notEqual(q.clips[0].tradition, q.clips[1].tradition);
});

test('text drill items: only real differences, israeli differs from ashkenazi, question marks the Ashkenazi option', () => {
  const items = textDrillItems(prayerwords, registry);
  assert.ok(items.length >= 20);
  assert.ok(!items.some((i) => i.id === 'word:eloheinu'), 'spelling-style-only difference excluded');
  assert.ok(!items.some((i) => i.id === 'word:melekh'));
  for (const it of items) {
    assert.notEqual(it.israeli, it.ashkenazi, it.id);
    for (const w of it.why) assert.ok(sounds.sounds.some((s) => s.id === w), `${it.id} why ${w}`);
  }
  for (const rng of [() => 0.1, () => 0.9]) {
    const q = makeTextQuestion(items[0], rng);
    assert.equal(q.options.length, 2);
    assert.equal(q.options.find((o) => o.label === q.answer).tradition, 'ashkenazi');
    assert.equal(q.options.find((o) => o.label === q.answer).text, items[0].ashkenazi);
  }
});

test('shuffle keeps all items', () => {
  assert.deepEqual(shuffle([1, 2, 3, 4], rngSeq(0.3, 0.6, 0.1)).sort(), [1, 2, 3, 4]);
});

test('loadTraditionsData takes injected files and fails loudly when fetch fails', async () => {
  const injected = { sounds, sources: load('data/traditions/sources.json'), guide: load('data/traditions/guide.json'), registry, prayerwords, consonants, niqqud };
  const d = await loadTraditionsData({ traditionsData: injected }, async () => { throw new Error('should not fetch'); });
  assert.equal(d.sounds, sounds);
  await assert.rejects(loadTraditionsData({}, async () => ({ ok: false, status: 404 })), /could not load/);
});
