// Lane J Phase 1 proving tests for the full-Torah dataset (data/corpus/torah/).
// The grid is the standard Hebrew versification; the English is JPS 1917 ONLY (public domain).
// The fetch tool (tools/torah/fetch_torah.mjs) pins that version by title and asserts its licence
// on every chapter response; these tests are the tripwire that fails if any other English source,
// or a misaligned Hebrew grid, ever reaches the shipped data.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cleanLine } from '../src/corpus/normalize.js';
import { JPS_1917_TITLE } from '../tools/torah/fetch_torah.mjs';
import { isOnDemand } from '../tools/build-precache.mjs';

const root = new URL('../', import.meta.url);
const J = (p) => JSON.parse(fs.readFileSync(new URL(p, root), 'utf8'));
const index = J('data/corpus/torah/index.json');
const report = J('docs/torah/fetch-report.json');
const parshaNames = J('data/calendar/parsha.json').names;
const builtBooks = index.books.filter((b) => b.chaptersAvailable > 0);
const chapterOf = (book, n) => J(`data/corpus/torah/${book}/${String(n).padStart(2, '0')}.json`);
const builtChapters = builtBooks.flatMap((b) => Array.from({ length: b.chaptersAvailable }, (_, i) => chapterOf(b.id, i + 1)));

const TAAMIM_RE = /[֑-֯]/; // U+0591–U+05AF cantillation
const STRIPPED_RE = /[ֽ׀]/; // meteg U+05BD, paseq U+05C0 also never survive into `he`

test('T1.1 grid completeness: 5 books, 187 chapters in the grid; built books are complete and gapless', () => {
  assert.equal(index.books.length, 5);
  assert.deepEqual(index.books.map((b) => b.chapters), [50, 40, 27, 36, 34]);
  assert.equal(index.counts.books, 5);
  assert.equal(index.counts.chapters, 187);
  assert.equal(index.counts.verses, index.books.reduce((s, b) => s + b.verses, 0));
  for (const b of index.books) assert.equal(b.verses, b.chapterVerses.reduce((s, n) => s + n, 0), b.id);
  // All five books are built (Genesis 2026-11-07, Exodus to Deuteronomy 2026-11-08).
  assert.deepEqual(builtBooks.map((b) => b.id), ['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy']);
  for (const b of builtBooks) {
    assert.equal(b.chaptersAvailable, b.chapters);
    const dir = fs.readdirSync(new URL(`data/corpus/torah/${b.id}/`, root)).filter((f) => f.endsWith('.json'));
    assert.equal(dir.length, b.chapters, `${b.id}: one file per chapter`);
    let total = 0;
    for (let c = 1; c <= b.chapters; c++) {
      const ch = chapterOf(b.id, c);
      assert.equal(ch.book, b.id); assert.equal(ch.chapter, c);
      assert.equal(ch.verses.length, b.chapterVerses[c - 1], `${b.id} ${c}`);
      assert.deepEqual(ch.verses.map((v) => v.n), ch.verses.map((_, i) => i + 1), `${b.id} ${c}: verses numbered 1..N without gaps`);
      total += ch.verses.length;
    }
    assert.equal(total, b.verses, `${b.id}: file counts equal the index`);
  }
  assert.equal(index.books[0].verses, 1533, 'Genesis has 1,533 verses on the standard grid');
});

test('T1.2 alignment: every built chapter was proven against its guide, and re-segmented chapters are named', () => {
  assert.equal(report.chapters.length, builtChapters.length);
  for (const c of report.chapters) {
    assert.equal(c.skeletonMatch, true, `${c.book} ${c.chapter}`);
    assert.equal(c.sefariaHeSegs, c.standardVerses, `${c.book} ${c.chapter}: Hebrew guide segments == shipped verses`);
    assert.equal(c.sefariaEnSegs, c.standardVerses, `${c.book} ${c.chapter}: English segments == shipped verses`);
  }
  // The only chapters in the whole Torah whose verse boundaries moved (fetch-report.json is the record).
  assert.deepEqual(report.realignments.map((r) => `${r.book} ${r.chapter}`), ['exodus 20', 'numbers 26', 'deuteronomy 5']);
  const moved = new Set(['exodus 20', 'numbers 26', 'deuteronomy 5']);
  for (const c of report.chapters) {
    if (moved.has(`${c.book} ${c.chapter}`)) assert.match(String(c.mapping), /re-segmented/, `${c.book} ${c.chapter}`);
    else assert.equal(c.mapping, null, `${c.book} ${c.chapter}: no re-segmentation`);
  }
});

test('T1.3 licence tripwires: JPS 1917 only, pinned in the tool, attributed in every chapter', () => {
  assert.equal(JPS_1917_TITLE, 'The Holy Scriptures: A New Translation (JPS 1917)');
  const tool = fs.readFileSync(new URL('tools/torah/fetch_torah.mjs', root), 'utf8');
  assert.ok(tool.includes('versionTitle !== JPS_1917_TITLE'), 'the fetch asserts the pinned version title on every response');
  assert.ok(tool.includes("enVer.license !== 'Public Domain'"), 'the fetch asserts the English licence on every response');
  assert.ok(tool.includes('english|'), 'the English version is requested by pin, never by default');
  for (const ch of builtChapters) {
    assert.equal(ch.englishSource, JPS_1917_TITLE, ch.ref);
    assert.equal(ch.englishLicense, 'Public Domain', ch.ref);
    assert.ok(ch.attribution.includes('Not the WLC'), ch.ref);
    assert.ok(ch.attribution.includes('UXLC'), ch.ref);
    for (const v of ch.verses) {
      assert.ok(!v.en.includes('When God began to create'), `${ch.ref}:${v.n} — that rendering is the modern RJPS, which is non-commercial`);
    }
  }
  assert.equal(chapterOf('genesis', 1).verses[0].en, 'In the beginning God created the heaven and the earth.');
});

test('T1.4 normalisation invariants: he is pointed and accent-free, heTrope keeps the marks, both are NFC', () => {
  let tropeVerses = 0;
  for (const ch of builtChapters) {
    for (const v of ch.verses) {
      assert.ok(!TAAMIM_RE.test(v.he), `${ch.ref}:${v.n} he carries cantillation`);
      assert.ok(!STRIPPED_RE.test(v.he), `${ch.ref}:${v.n} he carries meteg/paseq`);
      assert.equal(v.he, v.he.normalize('NFC'));
      assert.equal(v.heTrope, v.heTrope.normalize('NFC'));
      assert.ok(!v.he.includes('(פ)') && !v.he.includes('(ס)') && !v.heTrope.includes('(פ)') && !v.heTrope.includes('(ס)'), `${ch.ref}:${v.n} section markers stay structural`);
      assert.equal(cleanLine(v.heTrope), v.he, `${ch.ref}:${v.n} he is exactly the house normalisation of heTrope`);
      assert.deepEqual(v.durMs, { m: null, f: null });
      assert.deepEqual(v.durMsEn, { m: null, f: null });
      if (TAAMIM_RE.test(v.heTrope)) tropeVerses++;
    }
  }
  assert.ok(tropeVerses > 1000, 'heTrope really carries cantillation (not a copy of he)');
  assert.match(chapterOf('genesis', 1).verses[0].heTrope, TAAMIM_RE);
});

test('T1.5 parasha tiling: the 54 portions and their aliyot tile the grid; names match the calendar table', () => {
  assert.equal(index.parshiyot.length, 54);
  const pos = (book, chapter, verse) => {
    let p = 0;
    for (const b of index.books) for (let c = 1; c <= b.chapterVerses.length; c++) {
      if (b.id === book && c === chapter) return p + verse;
      p += b.chapterVerses[c - 1];
    }
    throw new Error(`outside grid: ${book} ${chapter}:${verse}`);
  };
  let expect = 1;
  for (const p of index.parshiyot) {
    if (p.num <= 53) {
      assert.equal(p.en, parshaNames[String(p.num)].en, `portion ${p.num} name`);
      assert.equal(p.he, parshaNames[String(p.num)].he, `portion ${p.num} Hebrew name`);
    } else {
      assert.equal(p.en, 'Vezot Haberakhah', 'portion 54 is named from the leyning data (the calendar table serves the Shabbat cycle only)');
    }
    assert.equal(pos(p.from.book, p.from.chapter, p.from.verse), expect, `${p.en} starts where the previous portion ended`);
    let aExpect = expect;
    assert.equal(p.aliyot.length, 7, p.en);
    for (const a of p.aliyot) {
      assert.equal(pos(a.from.book, a.from.chapter, a.from.verse), aExpect, `${p.en} aliyah ${a.n}`);
      aExpect = pos(a.to.book, a.to.chapter, a.to.verse) + 1;
    }
    expect = pos(p.to.book, p.to.chapter, p.to.verse) + 1;
    assert.equal(aExpect, expect, `${p.en}: aliyot end at the portion end`);
  }
  assert.equal(expect, index.counts.verses + 1, 'the portions cover Genesis 1:1 to Deuteronomy 34:12 exactly');
});

test('precache: Torah text and the Torah manifest are on-demand, never installed', () => {
  const text = fs.readFileSync(new URL('precache-manifest.js', root), 'utf8');
  const grab = (name) => JSON.parse(text.match(new RegExp(`self\\.${name} = (\\[[\\s\\S]*?\\]);`))[1]);
  const pre = grab('ALEF_PRECACHE'), od = grab('ALEF_ON_DEMAND');
  assert.ok(pre.every((f) => !f.startsWith('data/corpus/torah/')), 'no Torah chapter may enter the install precache');
  assert.ok(!pre.includes('data/audio/manifest-torah.json'));
  assert.ok(od.includes('data/corpus/torah/index.json'));
  assert.ok(od.includes('data/corpus/torah/genesis/01.json'));
  assert.ok(od.includes('data/corpus/torah/genesis/50.json'));
  assert.ok(od.includes('data/audio/manifest-torah.json'));
  assert.ok(isOnDemand('data/corpus/torah/genesis/01.json'));
  assert.ok(isOnDemand('data/audio/manifest-torah.json'));
  const recordings = J('data/audio/manifest-torah.json');
  assert.ok(Array.isArray(recordings));
  for (const recording of recordings) {
    assert.ok(['m', 'f'].includes(recording.voice), recording.id);
    assert.ok(recording.path && fs.existsSync(new URL(recording.path, root)), recording.id + ': published clip exists');
  }
});

test('Hebrew Torah verse recordings: the small index expands to clips that exist, and stays far under the precache cap', async () => {
  const { expandTorahHebrew, expandRanges } = await import('../src/shell/torah-he-index.js');
  assert.deepEqual(expandRanges('1-3,5,7-8'), [1, 2, 3, 5, 7, 8]);
  assert.deepEqual(expandTorahHebrew(null), []);
  const raw = fs.readFileSync(new URL('data/audio/manifest-torah-he.json', root), 'utf8');
  assert.ok(raw.length < 200 * 1024, 'the index stays small');
  const entries = expandTorahHebrew(JSON.parse(raw));
  for (const e of entries) {
    assert.ok(['m', 'f'].includes(e.voice) && e.kind === 'line' && /^torah-[a-z]+-\d+-\d+$/.test(e.id), e.id);
    assert.ok(fs.existsSync(new URL(e.path, root)), e.path + ' exists');
  }
  const big = J('data/audio/manifest-torah.json');
  assert.ok(!big.some((e) => entries.some((x) => x.id === e.id && x.voice === e.voice && x.kind === e.kind)), 'no verse is listed twice');
  const text = fs.readFileSync(new URL('precache-manifest.js', root), 'utf8');
  assert.ok(text.includes('"data/audio/manifest-torah-he.json"'), 'the index is fetched on demand');
});
