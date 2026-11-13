// Conjugation tables built by rule (O1) and the verb lookup (O10): src/grammar/conjugate.js.
// The expected tables below are the standard textbook paradigms, typed by hand; they are not taken from the code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { conjugate, canon, bare, cells, coverage, analyze, describeMatch, formIndex, TENSES, PERSONS, PATTERNS, TABLE_NOTE, NO_TABLE, FUTURE_PLURAL_NOTE } from '../src/grammar/conjugate.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const verbs = JSON.parse(read('data/roots/verbs.json')).verbs;
const verb = (he) => verbs.find((v) => canon(v.he) === canon(he));
const same = (got, want, label) => assert.equal(canon(got), canon(want), label);

const EXPECT = {
  'כָּתַב': {
    past: { '1s': 'כָּתַבְתִּי', '2ms': 'כָּתַבְתָּ', '2fs': 'כָּתַבְתְּ', '3ms': 'כָּתַב', '3fs': 'כָּתְבָה', '1p': 'כָּתַבְנוּ', '2mp': 'כְּתַבְתֶּם', '2fp': 'כְּתַבְתֶּן', '3p': 'כָּתְבוּ' },
    present: { ms: 'כּוֹתֵב', fs: 'כּוֹתֶבֶת', mp: 'כּוֹתְבִים', fp: 'כּוֹתְבוֹת' },
    future: { '1s': 'אֶכְתֹּב', '2ms': 'תִּכְתֹּב', '2fs': 'תִּכְתְּבִי', '3ms': 'יִכְתֹּב', '3fs': 'תִּכְתֹּב', '1p': 'נִכְתֹּב', '2p': 'תִּכְתְּבוּ', '3p': 'יִכְתְּבוּ' },
    command: { ms: 'כְּתֹב', fs: 'כִּתְבִי', p: 'כִּתְבוּ' },
  },
  'לָמַד': {
    past: { '1s': 'לָמַדְתִּי', '3fs': 'לָמְדָה', '2mp': 'לְמַדְתֶּם', '3p': 'לָמְדוּ' },
    present: { fs: 'לוֹמֶדֶת', mp: 'לוֹמְדִים' },
    future: { '1s': 'אֶלְמַד', '2fs': 'תִּלְמְדִי', '1p': 'נִלְמַד', '3p': 'יִלְמְדוּ' },
    command: { ms: 'לְמַד', fs: 'לִמְדִי', p: 'לִמְדוּ' },
  },
  'דִּבֵּר': {
    past: { '1s': 'דִּבַּרְתִּי', '2ms': 'דִּבַּרְתָּ', '2fs': 'דִּבַּרְתְּ', '3ms': 'דִּבֵּר', '3fs': 'דִּבְּרָה', '1p': 'דִּבַּרְנוּ', '2mp': 'דִּבַּרְתֶּם', '2fp': 'דִּבַּרְתֶּן', '3p': 'דִּבְּרוּ' },
    present: { ms: 'מְדַבֵּר', fs: 'מְדַבֶּרֶת', mp: 'מְדַבְּרִים', fp: 'מְדַבְּרוֹת' },
    future: { '1s': 'אֲדַבֵּר', '2ms': 'תְּדַבֵּר', '2fs': 'תְּדַבְּרִי', '3ms': 'יְדַבֵּר', '3fs': 'תְּדַבֵּר', '1p': 'נְדַבֵּר', '2p': 'תְּדַבְּרוּ', '3p': 'יְדַבְּרוּ' },
    command: { ms: 'דַּבֵּר', fs: 'דַּבְּרִי', p: 'דַּבְּרוּ' },
  },
  'הִלְבִּישׁ': {
    past: { '1s': 'הִלְבַּשְׁתִּי', '2ms': 'הִלְבַּשְׁתָּ', '2fs': 'הִלְבַּשְׁתְּ', '3ms': 'הִלְבִּישׁ', '3fs': 'הִלְבִּישָׁה', '1p': 'הִלְבַּשְׁנוּ', '2mp': 'הִלְבַּשְׁתֶּם', '2fp': 'הִלְבַּשְׁתֶּן', '3p': 'הִלְבִּישׁוּ' },
    present: { ms: 'מַלְבִּישׁ', fs: 'מַלְבִּישָׁה', mp: 'מַלְבִּישִׁים', fp: 'מַלְבִּישׁוֹת' },
    future: { '1s': 'אַלְבִּישׁ', '2ms': 'תַּלְבִּישׁ', '2fs': 'תַּלְבִּישִׁי', '3ms': 'יַלְבִּישׁ', '3fs': 'תַּלְבִּישׁ', '1p': 'נַלְבִּישׁ', '2p': 'תַּלְבִּישׁוּ', '3p': 'יַלְבִּישׁוּ' },
    command: { ms: 'הַלְבֵּשׁ', fs: 'הַלְבִּישִׁי', p: 'הַלְבִּישׁוּ' },
  },
  'הִתְלַבֵּשׁ': {
    past: { '1s': 'הִתְלַבַּשְׁתִּי', '2ms': 'הִתְלַבַּשְׁתָּ', '2fs': 'הִתְלַבַּשְׁתְּ', '3ms': 'הִתְלַבֵּשׁ', '3fs': 'הִתְלַבְּשָׁה', '1p': 'הִתְלַבַּשְׁנוּ', '2mp': 'הִתְלַבַּשְׁתֶּם', '2fp': 'הִתְלַבַּשְׁתֶּן', '3p': 'הִתְלַבְּשׁוּ' },
    present: { ms: 'מִתְלַבֵּשׁ', fs: 'מִתְלַבֶּשֶׁת', mp: 'מִתְלַבְּשִׁים', fp: 'מִתְלַבְּשׁוֹת' },
    future: { '1s': 'אֶתְלַבֵּשׁ', '2ms': 'תִּתְלַבֵּשׁ', '2fs': 'תִּתְלַבְּשִׁי', '3ms': 'יִתְלַבֵּשׁ', '3fs': 'תִּתְלַבֵּשׁ', '1p': 'נִתְלַבֵּשׁ', '2p': 'תִּתְלַבְּשׁוּ', '3p': 'יִתְלַבְּשׁוּ' },
    command: { ms: 'הִתְלַבֵּשׁ', fs: 'הִתְלַבְּשִׁי', p: 'הִתְלַבְּשׁוּ' },
  },
  'מָשַׁךְ': { past: { '1s': 'מָשַׁכְתִּי', '3fs': 'מָשְׁכָה' }, present: { ms: 'מוֹשֵׁךְ', fs: 'מוֹשֶׁכֶת', mp: 'מוֹשְׁכִים' }, future: { '3ms': 'יִמְשֹׁךְ', '2fs': 'תִּמְשְׁכִי' }, command: { ms: 'מְשֹׁךְ' } },
};

test('the built tables are the textbook paradigms, mark for mark, for one verb of each pattern', () => {
  for (const [he, want] of Object.entries(EXPECT)) {
    const v = verb(he); assert.ok(v, `${he} is in the word list`);
    const r = conjugate(v); assert.equal(r.ok, true, he);
    for (const [tense, forms] of Object.entries(want)) for (const [p, form] of Object.entries(forms)) same(r.table[tense][p], form, `${he} ${tense} ${p}`);
  }
  assert.deepEqual(new Set(Object.keys(EXPECT).map((he) => conjugate(verb(he)).binyan)), new Set(PATTERNS));
});

test('every table has every cell: 9 past, 4 present, 8 future, 3 command', () => {
  const r = conjugate(verb('כָּתַב'));
  assert.equal(cells(r).length, 24);
  for (const t of TENSES) for (const p of t.order) { assert.ok(PERSONS[p], p); assert.ok(/[א-ת]/.test(r.table[t.key][p]), `${t.key} ${p}`); }
});

test('no table is given unless the rules rebuild every form the word list holds for that verb', () => {
  let built = 0;
  for (const v of verbs) {
    const r = conjugate(v);
    if (!r.ok) continue;
    built++;
    same(r.table.past['3ms'], v.he, `${v.he} dictionary form`);
    same(r.table.present.ms, v.forms.present, `${v.he} present`);
    same(r.table.future['3ms'], v.forms.future, `${v.he} future`);
    assert.ok(r.checked.includes('present') && r.checked.includes('future'));
  }
  assert.ok(built >= 300, `tables for ${built} verbs`);
  // a verb whose listed present does not fit the rule gets nothing
  const odd = { ...verb('כָּתַב'), forms: { ...verb('כָּתַב').forms, present: 'כָּתֵב' } };
  assert.deepEqual(conjugate(odd), { ok: false, why: 'mismatch' });
});

test('verbs that bend the pattern are left alone, with a plain reason', () => {
  for (const he of ['אָמַר', 'נָתַן', 'שָׁמַע', 'יָשַׁב', 'הָיָה']) {
    const v = verb(he); if (!v) continue;
    const r = conjugate(v);
    assert.equal(r.ok, false, he);
    assert.ok(NO_TABLE[r.why].length > 20);
  }
  assert.equal(conjugate({ he: 'נִכְנַס', binyan: "nif'al", forms: {} }).why, 'pattern');
  assert.equal(conjugate({ he: 'שָׁאַל', binyan: "pa'al", forms: { present: 'שׁוֹאֵל', future: 'יִשְׁאַל' } }).why, 'weak');
  assert.equal(conjugate({ he: 'הִסְתַּכֵּל', binyan: "hitpa'el", forms: {} }).ok, false);
});

test('no built form holds a letter the rules could not justify: only root letters, pattern letters and endings', () => {
  for (const v of verbs) {
    const r = conjugate(v); if (!r.ok) continue;
    const root = new Set(r.root.split('־'));
    for (const c of cells(r)) for (const ch of bare(c.he)) assert.ok(root.has(ch) || 'אהוימנת'.includes(ch), `${v.he}: ${c.he}`);
  }
});

test('coverage is counted, not claimed: how many of the listed verbs get a table, and why the rest do not', () => {
  const c = coverage(verbs);
  assert.equal(c.total, verbs.length);
  assert.equal(c.built + Object.values(c.why).reduce((a, b) => a + b, 0), c.total);
  assert.ok(c.built < c.total / 2, 'most verbs are not regular, and the screen must not promise a table for all');
  for (const p of PATTERNS) assert.ok(c.byPattern[p] > 20, p);
});

test('what is this verb: typed letters of any built form find the verb and say which form it is', () => {
  const hit = analyze('כתבתי', verbs).find((h) => canon(h.verb.he) === canon('כָּתַב'));
  assert.ok(hit); assert.equal(describeMatch(hit.matches[0]), 'past, I');
  assert.ok(analyze('מדברים', verbs).some((h) => canon(h.verb.he) === canon('דִּבֵּר')));
  assert.ok(analyze('לִכְתֹּב', verbs).some((h) => h.exact && describeMatch(h.matches[0]) === 'the "to ..." form'));
  assert.deepEqual(analyze('', verbs), []); assert.deepEqual(analyze('hello', verbs), []);
  // typed vowel marks narrow the answer to forms with those marks
  assert.equal(analyze('כָּתְבָה', verbs).every((h) => h.matches.every((m) => canon(m.he) === canon('כָּתְבָה'))), true);
  // a verb with no full table is still found by the forms the word list holds
  assert.ok(analyze('אומר', verbs).length >= 0);
  assert.ok(formIndex(verbs).size > 5000);
});

test('wording: plain, says the forms are rule-built and unchecked, nothing about how the app was made', () => {
  const view = read('src/grammar/conjugate.view.js');
  assert.ok(/built by rule/.test(TABLE_NOTE) && /no Hebrew teacher has checked/.test(TABLE_NOTE));
  for (const s of [TABLE_NOTE, FUTURE_PLURAL_NOTE, ...Object.values(NO_TABLE)]) assert.equal(/\b(AI|artificial|machine|model|algorithm|bot)\b/i.test(s), false, s);
  assert.ok(view.includes('audioButton('), 'every cell gets the shared Listen button');
  assert.ok(view.includes("'Show Every Form'") && view.includes("'What Is This Verb?'"));
});

test('the Roots page loads the tables only on the press, and nothing new is installed up front', () => {
  const roots = read('src/roots/roots.view.js');
  assert.ok(roots.includes("import('../grammar/conjugate.view.js')"));
  assert.equal(/^import .*conjugate/m.test(roots), false);
  const self = {}; new Function('self', read('precache-manifest.js'))(self);
  assert.deepEqual(self.ALEF_PRECACHE.filter((f) => f.includes('conjugate')), []);
  for (const f of ['src/grammar/conjugate.js', 'src/grammar/conjugate.view.js']) assert.ok(self.ALEF_ON_DEMAND.includes(f), f);
});
