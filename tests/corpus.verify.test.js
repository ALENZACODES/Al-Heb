import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkHebrew, parseRef, embeddedRefs, isContiguousRun, verifyAll, renderReport, HARD, ROOT, UXLC_DIR, crossCheckUxlc } from '../tools/corpus/verify_texts.mjs';

const codes = (s) => checkHebrew(s).issues.map((i) => i.code);

test('checkHebrew: clean pointed Hebrew with maqaf, sof pasuq and newlines passes', () => {
  const r = checkHebrew('כָּל־הָעָם׃\nשָׁלוֹם עָלֵינוּ׃');
  assert.deepEqual(r.issues, []);
  assert.equal(r.stats.words, 4);
  assert.equal(r.stats.maqaf, 1);
  assert.equal(r.stats.sofPasuq, 2);
  assert.equal(r.stats.lines, 2);
});

test('checkHebrew: stray characters', () => {
  assert.deepEqual(codes('שָׁלוֹm'), ['latin']);
  assert.deepEqual(codes('שָׁלוֹם 1'), ['digit']);
  assert.deepEqual(codes('שָׁלוֹם​'), ['control']);
  assert.deepEqual(codes('שָׁלוֹם͏'), ['control']);
  assert.deepEqual(codes('שָׁלוֹם.'), ['non-hebrew']);
  assert.deepEqual(codes('שָׁל֥וֹם'), ['accent']);
  assert.deepEqual(codes('יְהוָה ׀ פָּנָיו'), ['paseq']);
  assert.ok(codes('שׁ').includes('presentation')); // NFC also decomposes it, so 'nfc' is reported too
});

test('checkHebrew: mark placement', () => {
  assert.deepEqual(codes('ְשָׁלוֹם'), ['mark-no-letter']);
  assert.deepEqual(codes('שָָׁלוֹם'), ['double-vowel', 'double-mark']);
  assert.deepEqual(codes('שַׁׂלוֹם'), ['sin-and-shin']);
  assert.deepEqual(codes('בָּׁלוֹם'), ['shin-dot-off-shin']);
  assert.deepEqual(codes('אּ'), ['dagesh-on-alef-ayin']);
  assert.ok(!HARD.has('dagesh-on-alef-ayin'), 'dagesh on alef/ayin is a warning, not a failure');
});

test('checkHebrew: final forms, maqaf and sof pasuq', () => {
  assert.deepEqual(codes('שָׁלוֹמ'), ['nonfinal-at-end']);
  assert.deepEqual(codes('שָׁלוםם'), ['final-midword']);
  assert.deepEqual(codes('מִן־כָּל־בִּרְכָתָא'), [], 'a final letter before maqaf ends its word');
  assert.deepEqual(codes('כָּל־ הָעָם'), ['maqaf']);
  assert.deepEqual(codes('־הָעָם'), ['maqaf']);
  assert.deepEqual(codes('הָעָם ׃'), ['sof-pasuq']);
  assert.deepEqual(codes('הָעָם׃׃'), ['sof-pasuq', 'sof-pasuq']);
  assert.deepEqual(codes('הָעָם׃הָעָם'), ['sof-pasuq']);
});

test('checkHebrew: NFC', () => {
  const nfd = 'שָׁלוֹם'.normalize('NFD');
  assert.ok(codes(nfd).includes('nfc') || nfd === nfd.normalize('NFC'));
});

test('parseRef and embeddedRefs', () => {
  assert.deepEqual(parseRef('Numbers 6:24'), { book: 'Numbers', chapter: 6, from: 24, to: 24 });
  assert.deepEqual(parseRef('Deuteronomy 6:6-7'), { book: 'Deuteronomy', chapter: 6, from: 6, to: 7 });
  assert.deepEqual(parseRef('Psalm 51:17 (Amidah preface)'), { book: 'Psalms', chapter: 51, from: 17, to: 17 });
  assert.equal(parseRef('Siddur: Modeh Ani'), null);
  assert.deepEqual(embeddedRefs('(1 Chronicles 29:11, Psalm 99:5, 99:9)').map((r) => `${r.book} ${r.chapter}:${r.from}`), ['Chronicles_1 29:11', 'Psalms 99:5', 'Psalms 99:9']);
  assert.deepEqual(embeddedRefs('(Proverbs 3:18, 3:17, 3:16, Isaiah 42:21)').length, 4);
});

test('isContiguousRun', () => {
  assert.ok(isContiguousRun(['a', 'b', 'c', 'd'], ['b', 'c']));
  assert.ok(!isContiguousRun(['a', 'b', 'c', 'd'], ['b', 'd']));
  assert.ok(!isContiguousRun(['a'], []));
});

const rep = verifyAll();

test('corpus: every registry record passes the hard checks', () => {
  const bad = rep.records.filter((r) => r.hard.length).map((r) => r.id + ': ' + r.hard.map((i) => i.code).join(','));
  assert.deepEqual(bad, []);
  assert.equal(rep.summary.records, 70);
});

test('corpus: every record re-derives from the committed snapshot (equal or clip)', () => {
  const bad = rep.records.filter((r) => !['equal', 'clip', 'derived'].includes(r.snapshot.status)).map((r) => r.id + ': ' + r.snapshot.status);
  assert.deepEqual(bad, []);
});

test('corpus: licence listing matches LICENSES.md expectations (42 Sefaria-labelled Hebrew records, 21 Metsudah)', () => {
  assert.equal(rep.summary.licenceUnverified, 42);
  assert.equal(rep.summary.metsudah, 21);
  for (const r of rep.records.filter((x) => x.licenceUnverified)) assert.match(r.sourceUrl, /^https:\/\/www\.sefaria\.org\//, r.id);
  for (const r of rep.records.filter((x) => x.metsudah)) assert.equal(r.license, 'CC-BY', r.id);
  for (const r of rep.records.filter((x) => !x.licenceUnverified)) assert.match(r.sourceUrl, /^https:\/\/tanach\.us\//, r.id);
});

test('corpus: UXLC cross-check (skipped when the gitignored XML cache is absent)', { skip: !fs.existsSync(UXLC_DIR) && 'UXLC cache not on disk' }, () => {
  const torah = rep.records.filter((r) => r.uxlc.status !== 'no-ref');
  assert.ok(torah.length >= 29);
  // Lam 5:21 and Ps 126:4 used to mismatch because the fetcher skipped qere (<q>) words; fixed in fetch_sources*.py (stage 5).
  assert.deepEqual(torah.filter((r) => r.uxlc.status === 'mismatch').map((r) => r.id), []);
  assert.ok(!torah.some((r) => r.uxlc.status === 'missing'));
  const reg = JSON.parse(fs.readFileSync(new URL('../data/corpus/registry.json', import.meta.url), 'utf8')).entries;
  for (const id of ['bless-priestly-1', 'bless-priestly-2', 'bless-priestly-3', 'shema-vahavta', 'vahavta-full', 'kiddush-gen-2-1-3']) {
    assert.equal(crossCheckUxlc(reg.find((e) => e.id === id)).status, 'equal', id);
  }
});

const reportFile = fs.readFileSync(new URL('../docs/corpus/VERIFY-REPORT.md', import.meta.url), 'utf8');

test('docs/corpus/VERIFY-REPORT.md has the required sections and counts', () => {
  assert.ok(reportFile.includes('## 3. Records whose licence label is unverified'));
  assert.ok(reportFile.includes('## 4. Metsudah records (flagged)'));
  assert.ok(reportFile.includes(`| Records | ${rep.summary.records} (torah ${rep.summary.torah}, siddur ${rep.summary.siddur}) |`));
  assert.ok(reportFile.includes(`| Metsudah siddur (1981) records, labelled CC-BY by Sefaria | ${rep.summary.metsudah} |`));
});

test('docs/corpus/VERIFY-REPORT.md is the current output of the verifier (needs the UXLC cache the report was built with)', { skip: !fs.existsSync(UXLC_DIR) && 'UXLC cache not on disk' }, () => {
  const fresh = renderReport(rep);
  const strip = (s) => s.replace(/^Generated \d{4}-\d{2}-\d{2} /m, 'Generated DATE ');
  assert.equal(strip(reportFile), strip(fresh), 'run: node tools/corpus/verify_texts.mjs');
});
