import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TROPE_TABLE, POETIC_TABLE, tokenise, parseWord, parseVerse, PASSAGES, ALIYOT, READING_UNITS, buildPassage, buildTable, buildReader } from '../tools/corpus/trope.mjs';
import { wordsOf } from '../src/corpus/normalize.js';

const root = new URL('../', import.meta.url);
const read = (p) => JSON.parse(fs.readFileSync(new URL(p, root), 'utf8'));
const snapshot = read('data/corpus/source-snapshot.json').items;
const registry = read('data/corpus/registry.json').entries;

test('table: every prose cantillation code point U+0591-U+05AE has a row except the poetic-only ones, plus meteg/siluk, paseq/legarmeh, sof pasuq', () => {
  const have = new Set(TROPE_TABLE.map((t) => t.cp));
  const poeticOnly = new Set([0x05a2, 0x05ab, 0x05ac, 0x05ad, 0x05ae]); // U+05A2 ATNAH HAFUKH is a poetic variant too
  for (let cp = 0x0591; cp <= 0x05ae; cp++) if (!poeticOnly.has(cp)) assert.ok(have.has(cp), 'missing U+' + cp.toString(16));
  for (const cp of [0x05bd, 0x05c0, 0x05c3]) assert.ok(have.has(cp));
  const ids = TROPE_TABLE.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, 'ids unique');
  for (const t of TROPE_TABLE) {
    assert.ok(['disjunctive', 'conjunctive', 'separator', 'secondary-stress', 'verse-end'].includes(t.cls), t.id);
    if (t.cls === 'disjunctive') assert.ok([1, 2, 3, 4].includes(t.level), t.id + ' level');
    else assert.equal(t.level, null, t.id);
    for (const k of ['ashkenazi', 'ashkenaziHe', 'sephardi', 'sephardiHe', 'unicode', 'placement']) assert.ok(t[k], `${t.id}.${k}`);
    assert.match(t.ashkenaziHe, /^[א-ת ]+$/, t.id + ' Hebrew name unpointed');
    assert.match(t.sephardiHe, /^[א-ת ]+$/, t.id);
  }
  assert.equal(POETIC_TABLE.length, 5);
});

test('tokenise: UXLC markup is stripped and a lone paseq is glued to the previous word', () => {
  const raw = snapshot['shema-1'].rawLines[0];
  const t = tokenise(raw);
  assert.equal(t.length, 6);
  assert.ok(!t.some((w) => /</.test(w)));
  assert.ok(t[4].endsWith(' ׀'));
});

test('parseWord: meteg vs siluk, doubled pashta, paseq classes', () => {
  const w = parseWord('וִֽיחֻנֶּֽךָּ׃', true);
  assert.deepEqual(w.marks.map((m) => m.id), ['meteg', 'siluk', 'sof-pasuk']);
  assert.equal(w.marks[0].letter, 'ו');
  assert.equal(w.marks[1].letter, 'נ');
  assert.equal(w.trope, 'siluk');
  assert.equal(w.disjunctiveLevel, 1);
  assert.equal(w.stressLetterIndex, 3);
  // same code points on a non-final word: all meteg
  const m = parseWord('וִֽיחֻנֶּֽךָּ', false);
  assert.deepEqual(m.marks.map((x) => x.id), ['meteg', 'meteg']);
  assert.equal(m.trope, null);

  const p = parseWord('בְּבֵיתֶ֙ךָ֙', false);
  assert.deepEqual(p.marks.map((x) => [x.id, x.role, x.letterIndex]), [['pashta', 'stress', 3], ['pashta', 'mark', 4]]);
  assert.equal(p.stressLetterIndex, 3);

  const d = parseWord('יְהוָ֧ה ׀', false);
  assert.deepEqual(d.marks.map((x) => x.id), ['darga', 'pasek']);
  assert.equal(d.tropeClass, 'conjunctive');
  assert.equal(d.pasek, true);
  const l = parseWord('וַיֹּ֣אמֶר ׀', false);
  assert.deepEqual(l.marks.map((x) => x.id), ['munach', 'legarmeh']);
  assert.equal(l.trope, 'legarmeh');
  assert.equal(l.disjunctiveLevel, 4);

  assert.throws(() => parseWord('א֢', false), /unknown cantillation/);
});

test('parseVerse: Numbers 6:24 and Deuteronomy 6:4', () => {
  const v = parseVerse(snapshot['bless-priestly-1'].rawLines[0], 'Numbers 6:24');
  assert.deepEqual(v.words.map((w) => w.trope), ['mercha', 'tipcha', 'siluk']);
  assert.deepEqual(v.halves, [[0, 2]]);
  assert.equal(v.he, registry.find((e) => e.id === 'bless-priestly-1').he);
  const s = parseVerse(snapshot['shema-1'].rawLines[0], 'Deuteronomy 6:4');
  assert.deepEqual(s.words.map((w) => w.trope), ['tipcha', 'etnachta', 'mercha', 'tipcha', 'mercha', 'siluk']);
  assert.deepEqual(s.halves, [[0, 1], [2, 5]]);
  assert.deepEqual(s.largeLetters, ['ע', 'ד']);
  assert.ok(!/[<>]/.test(s.raw));
});

test('data/corpus/trope/*.json are the current output of the builder', () => {
  assert.deepEqual(read('data/corpus/trope/table.json'), buildTable());
  for (const p of PASSAGES) {
    const built = buildPassage(p, snapshot);
    const file = read(`data/corpus/trope/${p.id}.json`);
    assert.deepEqual(file, built, `run: node tools/corpus/trope.mjs (${p.id})`);
  }
});

test('trope passages: counts, classes and positions are consistent', () => {
  const pb = read('data/corpus/trope/priestly-blessing.json');
  const sh = read('data/corpus/trope/shema.json');
  assert.equal(pb.ref, 'Numbers 6:22-27');
  assert.equal(pb.verses.length, 6);
  assert.deepEqual(pb.verses.map((v) => v.words.length), [5, 13, 3, 5, 7, 8]);
  assert.equal(pb.words, 41);
  assert.deepEqual(pb.registryVerses, [24, 25, 26]);
  assert.equal(sh.verses.length, 6);
  assert.equal(sh.words, 48);
  assert.equal(sh.markCounts.etnachta, 4);
  for (const p of [pb, sh]) {
    assert.equal(p.system, 'prose (21 books)');
    assert.match(p.sourceUrl, /^https:\/\/tanach\.us\//);
    for (const v of p.verses) {
      const last = v.words[v.words.length - 1];
      assert.ok(last.sofPasuk && last.trope === 'siluk', v.ref + ' ends with siluk + sof pasuq');
      assert.equal(v.words.filter((w) => w.marks.some((m) => m.id === 'siluk')).length, 1, v.ref + ' one siluk');
      assert.ok(v.words.filter((w) => w.marks.some((m) => m.id === 'etnachta')).length <= 1, v.ref);
      for (const w of v.words) {
        const cps = [...w.text];
        for (const m of w.marks) {
          assert.equal(cps[m.at], m.char, `${v.ref} ${w.plain}: mark at offset`);
          assert.match(m.unicode, /^U\+05[9ABC][0-9A-F]$/);
          assert.ok(m.letterIndex >= 0 && m.letterIndex < w.letters, `${v.ref} ${w.plain}: letterIndex`);
          assert.ok(['disjunctive', 'conjunctive', 'separator', 'secondary-stress', 'verse-end'].includes(m.cls));
        }
        if (/־$/.test(w.plain)) assert.equal(w.trope, null, 'proclitic has no trope: ' + w.plain);
        const sameAfter = w.marks.filter((m) => m.cls === 'disjunctive').length;
        assert.ok(sameAfter <= 2, 'at most a doubled disjunctive per word');
      }
    }
  }
});

test('reader: files are the current output and agree with the registry text', () => {
  for (const p of PASSAGES) {
    const built = buildReader(p, buildPassage(p, snapshot), registry, snapshot);
    const file = read(`data/corpus/reader/${p.id}.json`);
    assert.deepEqual(file, built, `run: node tools/corpus/trope.mjs (${p.id})`);
    // verse text equals the registry lines, both at word and token level
    // only the verses a registry record covers (Num 6:22-23 and 6:27 are snapshot-only framing verses)
    const covered = file.verses.filter((v) => p.registryVerses.includes(v.verse));
    assert.equal(covered.length, p.registryVerses.length);
    const regHe = p.registryIds.map((id) => registry.find((e) => e.id === id).he).join('\n');
    assert.equal(covered.map((v) => v.he).join('\n'), regHe);
    assert.equal(covered.map((v) => v.tokens.map((t) => t.he).join(' ') + '׃').join('\n'), regHe);
    for (const v of file.verses) assert.deepEqual(v.tokens.map((t) => t.he), wordsOf(v.he).map((w) => w.replace(/׃$/, '')));
  }
});

test('reader: aliyah context, reading units, word index and timing placeholders', () => {
  const pb = read('data/corpus/reader/priestly-blessing.json');
  const sh = read('data/corpus/reader/shema.json');
  assert.equal(pb.aliyah.parashah.en, 'Nasso');
  assert.equal(pb.aliyah.passageAliyah, 4);
  assert.deepEqual(pb.verses.map((v) => v.unit), ['intro', 'intro', 'line-1', 'line-2', 'line-3', 'closing']);
  assert.equal(pb.aliyah.aliyot[3], 'Numbers 5:11-6:27');
  assert.equal(pb.aliyah.startsAliyah, false);
  assert.equal(sh.aliyah.parashah.en, 'Vaetchanan');
  assert.equal(sh.aliyah.passageAliyah, 6);
  assert.equal(sh.aliyah.aliyot[5], 'Deuteronomy 6:4-6:25');
  assert.equal(sh.aliyah.startsAliyah, true);
  for (const p of [pb, sh]) {
    assert.equal(p.aliyah.aliyot.length, 7);
    assert.ok(p.aliyah.maftir);
    // parashah numbers match data/calendar/parsha.json
    const names = read('data/calendar/parsha.json').names;
    assert.equal(names[String(p.aliyah.parashah.number)].en, p.aliyah.parashah.en);
    // every verse belongs to one reading unit
    const unitVerses = READING_UNITS[p.id].flatMap((u) => u.verses);
    assert.deepEqual(unitVerses, p.verses.map((v) => v.verse));
    for (const v of p.verses) assert.ok(READING_UNITS[p.id].some((u) => u.id === v.unit), v.ref);
    // timing placeholders everywhere, null
    for (const v of p.verses) {
      assert.deepEqual(v.timing, { start: null, end: null });
      for (const w of v.words) assert.deepEqual(w.timing, { start: null, end: null });
      for (const t of v.tokens) assert.deepEqual(t.timing, { start: null, end: null });
      assert.ok(typeof v.english === 'string' && v.english.length > 0, v.ref + ' english');
    }
    // word index covers every word and only those words
    const all = p.verses.flatMap((v) => v.words.map((w) => [w.he, v.verse, w.i]));
    assert.equal(Object.values(p.wordIndex).flat().length, all.length);
    for (const [he, verse, i] of all) assert.ok(p.wordIndex[he].some(([v, j]) => v === verse && j === i), he);
    assert.equal(p.wordCount, all.length);
    // global word numbering is contiguous
    assert.deepEqual(p.verses.flatMap((v) => v.words.map((w) => w.g)), all.map((_, k) => k));
  }
  // glosses exist exactly where the registry has wordGlosses
  assert.ok(pb.verses.filter((v) => [24, 25, 26].includes(v.verse)).every((v) => v.tokens.every((t) => typeof t.gloss === 'string')));
  assert.ok(pb.verses.filter((v) => ![24, 25, 26].includes(v.verse)).every((v) => v.tokens.every((t) => t.gloss === null)));
  assert.ok(sh.verses[0].tokens.every((t) => typeof t.gloss === 'string'));
  assert.ok(sh.verses.slice(1).every((v) => v.tokens.every((t) => t.gloss === null)));
  assert.equal(Object.keys(ALIYOT).length, PASSAGES.length);
});

test('no cantillation leaked into registry display text; trope data is the only place it lives', () => {
  for (const e of registry) assert.ok(!/[֑-֮]/.test(e.he), e.id);
  const sh = read('data/corpus/trope/shema.json');
  assert.ok(sh.verses.every((v) => /[֑-֮]/.test(v.raw)));
  assert.ok(sh.verses.every((v) => !/[֑-ֽ֮׀]/.test(v.he)));
});
