// Stage 1 (lint + review sheets), Stage 2 (corpus frequency) and Stage 4 (gender/plural rules).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const { ROOT, loadSentencePool, countOccurrences, rankEntries, surfaceForms, tokenize, plain, stripClitics, POOL_FILES, buildFrequency } = await import('../tools/vocab/frequency.mjs');
const { buildReviewPack, lintGloss, lintNiqqud, lintTranslit, lintWords, ruleGender, rulePlural, unfinal, completionRows, groupSheets, reviewRows, toCsv, COLUMNS, COMPLETION_COLUMNS, MAX_ROWS, REVIEW_DIR } = await import('../tools/vocab/review_pack.mjs');

const WORDS_PATH = path.join(ROOT, 'data/vocab/words.json');
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf8')).words;
const NIQ = /[ְ-ׇּׁׂ]/;

const mk = (o) => ({ id: 'x', kind: 'word', he: 'שָׁלוֹם', heUnpointed: 'שלום', translit: 'shalom', en: 'peace', pos: 'noun', gender: 'm', number: null, forms: null, source: { dictionary: 'wiktionary' }, flags: { needsReview: false }, topic: 't', frequencyRank: 1, ...o });

test('gloss lint: dictionary-ese is flagged, "made by" is kept', () => {
  assert.equal(lintGloss('to eat'), null);
  assert.equal(lintGloss('bread'), null);
  assert.equal(lintGloss('a sweet spread made by boiling fruit with sugar'), null, 'made by is exempt');
  assert.equal(lintGloss('used to introduce a semantically definite direct object'), 'gloss-machine');
  assert.equal(lintGloss('[[in order that|in order]] that'), 'gloss-machine');
  assert.equal(lintGloss('alternative spelling of X'), 'gloss-machine');
  assert.equal(lintGloss('to be calculated'), 'gloss-machine');
  assert.equal(lintGloss(''), 'gloss-empty');
  assert.equal(lintGloss(null), 'gloss-empty');
});

test('niqqud lint: missing, partial and skeleton mismatch', () => {
  assert.deepEqual(lintNiqqud(mk({})), []);
  assert.deepEqual(lintNiqqud(mk({ he: 'שלום' })), ['no-niqqud']);
  assert.ok(lintNiqqud(mk({ he: 'שָׁלום', heUnpointed: 'שלום' })).length === 0, 'vav/final mem unmarked is normal');
  assert.ok(lintNiqqud(mk({ he: 'מִשפט', heUnpointed: 'משפט' })).includes('partial-niqqud'));
  assert.ok(lintNiqqud(mk({ he: 'שָׁלוֹם', heUnpointed: 'שלמה' })).includes('skeleton-mismatch'));
});

test('transliteration lint: siddur scheme, mismatch, missing', () => {
  assert.deepEqual(lintTranslit(mk({})), []);
  assert.deepEqual(lintTranslit(mk({ translit: null })), ['translit-missing']);
  assert.ok(lintTranslit(mk({ translit: 'šalom' })).includes('translit-scheme'));
  assert.ok(lintTranslit(mk({ translit: 'salom' })).includes('translit-mismatch'));
  assert.deepEqual(lintTranslit(mk({ he: 'לְ־', heUnpointed: 'ל', translit: 'le' })), [], 'trailing clitic hyphen is not a mismatch');
});

test('lintWords: duplicates, homographs, gender/plural, licence and pack copies', () => {
  const a = mk({ id: 'a', he: 'דָּבָר', heUnpointed: 'דבר', translit: 'davar', en: 'thing', forms: { plural: 'דְּבָרִים' } });
  const b = mk({ id: 'b', he: 'דָּבָר', heUnpointed: 'דבר', translit: 'davar', en: 'thing', forms: { plural: 'דְּבָרִים' } });
  const c = mk({ id: 'c', he: 'דִּבֵּר', heUnpointed: 'דבר', translit: 'diber', en: 'to speak', pos: 'verb', gender: null, binyan: "pi'el" });
  const d = mk({ id: 'd', he: 'דֶּבֶר', heUnpointed: 'דבר', translit: 'dever', en: 'plague', gender: null, forms: null });
  const e = mk({ id: 'e', he: 'סֵפֶר', heUnpointed: 'ספר', translit: 'sefer', en: 'book', license: 'CC BY-SA 4.0', forms: { plural: 'סְפָרִים' } });
  const f = lintWords([a, b, c, d, e], [{ pack: 'p', words: [a, b, c, { ...d, en: 'changed' }] }]);
  assert.ok(f.get('a').includes('duplicate') && f.get('b').includes('duplicate'));
  assert.ok(!f.get('c').includes('duplicate') && !f.get('c').includes('dup-spelling'), 'verb of another binyan is not a duplicate');
  assert.ok(f.get('d').includes('dup-spelling') && f.get('d').includes('homograph'));
  assert.ok(f.get('d').includes('gender-missing') && f.get('d').includes('plural-missing'));
  assert.ok(f.get('a').includes('licence-missing'));
  assert.ok(!f.get('e').includes('licence-missing'), 'a record with CC BY-SA is not flagged');
  assert.ok(f.get('d').includes('pack-mismatch') && f.get('e').includes('pack-mismatch'), 'changed or missing pack copy');
  assert.ok(!f.get('a').includes('pack-mismatch'));
});

test('every words.json record is flagged licence-missing today (no per-record CC BY-SA field exists)', () => {
  const f = lintWords(words.slice(0, 50));
  for (const [, flags] of f) assert.ok(flags.includes('licence-missing'));
});

test('review sheets: grouped by theme, <= 250 rows, exact column set, every id once', () => {
  const flagMap = lintWords(words);
  const rows = reviewRows(words, flagMap);
  const sheets = groupSheets(rows, words);
  const seen = new Set();
  for (const s of sheets) {
    assert.ok(s.rows.length >= 1 && s.rows.length <= MAX_ROWS, `${s.file}: ${s.rows.length} rows`);
    assert.match(s.file, /^[a-z-]+-\d\d\.csv$/);
    for (const r of s.rows) {
      assert.deepEqual(Object.keys(r), COLUMNS);
      assert.ok(!seen.has(r.id)); seen.add(r.id);
      assert.equal(words.find((w) => w.id === r.id).topic, s.theme);
      assert.equal(r.reviewer_ok, ''); assert.equal(r.reviewer_note, '');
    }
  }
  assert.equal(seen.size, words.length);
  const csv = toCsv(COLUMNS, sheets[0].rows.slice(0, 2));
  assert.ok(csv.startsWith('﻿' + COLUMNS.join(',') + '\n'));
  assert.equal(csv.trim().split('\n').length, 3);
});

test('committed review CSVs match the generator and keep the reviewer columns empty', () => {
  const dir = path.join(ROOT, REVIEW_DIR);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.csv') && !f.startsWith('_'));
  assert.ok(files.length >= 30, 'review sheets exist');
  for (const f of files) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    const lines = text.replace(/^﻿/, '').split('\n').filter(Boolean);
    assert.ok(lines.length - 1 <= MAX_ROWS, `${f} has ${lines.length - 1} rows`);
    const header = lines[0];
    assert.ok(header === COLUMNS.join(',') || header === COMPLETION_COLUMNS.join(','), `${f} header`);
    for (const l of lines.slice(1)) assert.match(l, /,,$/, `${f}: reviewer columns must be empty in the generated sheet`);
  }
  const { summary } = buildReviewPack(ROOT, { write: false });
  const index = fs.readFileSync(path.join(dir, '_index.csv'), 'utf8').replace(/^﻿/, '').trim().split('\n').length - 1;
  assert.equal(index, summary.sheets + summary.completionSheets, 'index lists every sheet; rerun tools/vocab/review_pack.mjs');
});

test('running the review pack and frequency builders never changes words.json', () => {
  const before = sha(WORDS_PATH);
  buildReviewPack(ROOT, { write: false });
  buildFrequency(ROOT);
  assert.equal(sha(WORDS_PATH), before);
});

// ---- Stage 2 ---------------------------------------------------------------------------------

test('tokeniser strips points, cantillation, maqaf and punctuation', () => {
  assert.equal(plain('בְּרֵאשִׁ֖ית בָּרָ֣א'), 'בראשית ברא');
  assert.deepEqual(tokenize('עַל־לְבָבֶךָ׃ "שָׁלוֹם!"'), ['על', 'לבבך', 'שלום']);
  assert.deepEqual(stripClitics('לך'), [], 'two-letter remainders are never produced');
  assert.deepEqual(stripClitics('הבית'), ['בית']);
  assert.deepEqual(stripClitics('ובבית'), ['בבית', 'בית']);
});

test('sentence pool reads only the declared files and takes strings verbatim', () => {
  const pool = loadSentencePool(ROOT);
  const declared = new Set(Object.values(POOL_FILES).flat());
  const raw = new Set();
  for (const rel of declared) {
    const walk = (x) => { if (typeof x === 'string') x.split('\n').forEach((l) => raw.add(l.trim())); else if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') Object.values(x).forEach(walk); };
    walk(JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')));
  }
  assert.ok(pool.length > 500);
  for (const u of pool) {
    assert.ok(declared.has(u.file), u.file);
    assert.ok(['corpus', 'service', 'curriculum'].includes(u.channel));
    assert.ok(raw.has(u.he), `pool line not found verbatim in the data files: ${u.he}`);
  }
});

test('occurrence counts and ranking are deterministic and honest about zeros', () => {
  const pool = loadSentencePool(ROOT);
  const counts = countOccurrences(words, pool);
  const ranked = rankEntries(words, counts);
  assert.equal(ranked.length, words.length);
  ranked.forEach((r, i) => assert.equal(r.corpusRank, i + 1));
  for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i - 1].total >= ranked[i].total);
  const shalom = ranked.find((r) => r.heUnpointed === 'שלום' && r.pos === 'noun');
  assert.ok(shalom && shalom.total > 0, 'shalom occurs in the phrasebook');
  const zero = ranked.filter((r) => r.total === 0);
  assert.ok(zero.length > 0, 'most of a 6k vocabulary is not in a small corpus; zeros must be reported, not hidden');
  const fj = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/vocab/frequency.json'), 'utf8'));
  assert.equal(fj.schema, 'alef-vocab-frequency/1');
  assert.equal(fj.entries.length, words.length);
  assert.equal(fj.counts.attested + fj.counts.unattested, words.length);
  assert.deepEqual(fj.entries.slice(0, 20).map((e) => [e.id, e.total]), ranked.slice(0, 20).map((r) => [r.id, r.total]), 'frequency.json is stale; rerun tools/vocab/frequency.mjs');
  assert.ok(surfaceForms(words.find((w) => w.heUnpointed === 'יצא' && w.pos === 'verb')).includes('לצאת'), 'listed forms count');
});

// ---- Stage 4 ---------------------------------------------------------------------------------

test('gender and plural rules are unpointed, flagged, and never written to words.json', () => {
  assert.equal(ruleGender(mk({ he: 'יַלְדָּה', heUnpointed: 'ילדה' })).gender, 'f');
  assert.equal(ruleGender(mk({ he: 'מְכוֹנִית', heUnpointed: 'מכונית' })).gender, 'f');
  assert.equal(ruleGender(mk({ he: 'סֵפֶר', heUnpointed: 'ספר' })).gender, 'm');
  assert.equal(ruleGender(mk({ he: 'בֵּית סֵפֶר', heUnpointed: 'בית ספר' })).gender, null);
  assert.equal(rulePlural(mk({ heUnpointed: 'ילדה' }), 'f').plural, 'ילדות');
  assert.equal(rulePlural(mk({ heUnpointed: 'מכונית' }), 'f').plural, 'מכוניות');
  assert.equal(rulePlural(mk({ heUnpointed: 'ספר' }), 'm').plural, 'ספרים');
  assert.equal(rulePlural(mk({ heUnpointed: 'מן' }), 'm').plural, 'מנים', 'final letters become medial');
  assert.equal(unfinal('שולחן'), 'שולחנ');
  const rows = completionRows(words);
  assert.ok(rows.length > 0);
  for (const r of rows) {
    assert.deepEqual(Object.keys(r), COMPLETION_COLUMNS);
    assert.ok(r.flag.length > 0, 'every generated row carries a flag');
    if (r.gender_rule) assert.ok(/gender:rule/.test(r.flag));
    if (r.plural_rule) { assert.ok(/plural:rule-unpointed/.test(r.flag)); assert.ok(!NIQ.test(r.plural_rule), 'rule plurals carry no invented vowels'); }
    assert.equal(r.reviewer_ok, '');
  }
  const w = words.find((x) => x.pos === 'noun' && x.kind === 'word' && !(x.forms && x.forms.plural));
  assert.ok(w && !(w.forms && w.forms.plural), 'words.json still lacks the plural the sheet proposes');
});
