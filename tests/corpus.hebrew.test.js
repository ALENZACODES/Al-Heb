import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cleanLine, stripAccents, wordsOf, clipWords, foldedSkeleton, largeLetters, cleanEnglish } from '../src/corpus/normalize.js';

const root = new URL('../', import.meta.url);
const registry = JSON.parse(fs.readFileSync(new URL('data/corpus/registry.json', root), 'utf8')).entries;
const phrasebook = JSON.parse(fs.readFileSync(new URL('data/corpus/phrasebook.json', root), 'utf8')).entries;
const snapshot = JSON.parse(fs.readFileSync(new URL('data/corpus/source-snapshot.json', root), 'utf8')).items;
const research = JSON.parse(fs.readFileSync(new URL('tests/fixtures/corpus.research-strings.json', root), 'utf8'));
const cp = (s) => [...s].map((c) => c.codePointAt(0));
const inHebrewBlock = (c) => c >= 0x0590 && c <= 0x05ff;

test('code points: registry Hebrew is only U+0590-05FF, space, newline; no accents, no presentation forms', () => {
  for (const e of registry) {
    const strings = [e.he, ...(e.variants?.f ? [e.variants.f.he] : [])];
    for (const s of strings) for (const c of cp(s)) {
      assert.ok(inHebrewBlock(c) || c === 0x20 || c === 0x0a, `${e.id}: stray U+${c.toString(16)}`);
      assert.ok(!(c >= 0x0591 && c <= 0x05af), `${e.id}: cantillation U+${c.toString(16)} left in display text`);
      assert.ok(c !== 0x05ba && c !== 0x05bd && c !== 0x05c0 && c !== 0x05c4 && c !== 0x05c5, `${e.id}: unnormalised mark U+${c.toString(16)}`);
      assert.ok(!(c >= 0xfb1d && c <= 0xfb4f), `${e.id}: presentation form`);
    }
  }
});

test('normalisation rule: every Hebrew string in registry and phrasebook is NFC-stable', () => {
  for (const e of registry) assert.equal(e.he, e.he.normalize('NFC'), e.id);
  for (const p of phrasebook) {
    assert.equal(p.he, p.he.normalize('NFC'), p.id);
    if (p.forms) for (const f of Object.values(p.forms)) assert.equal(f.he, f.he.normalize('NFC'), p.id);
  }
});

test('normalisation rule: canonical mark order (vowel, dagesh, shin/sin dot by combining class) is enforced by NFC', () => {
  // shin + shin-dot + dagesh + qamats typed in "wrong" order must come out in one canonical order
  const a = 'שָּׁ'.normalize('NFC');
  const b = 'שָּׁ'.normalize('NFC');
  assert.equal(a, b);
  assert.deepEqual(cp(a), [0x05e9, 0x05b8, 0x05bc, 0x05c1]);
  // and the cleaner applies it
  assert.equal(cleanLine('שָּׁ'), 'שָּׁ');
});

test('cleanLine: strips cantillation/meteg/paseq, maps holam-haser, rewrites Tetragrammaton, converts punctuation', () => {
  assert.equal(cleanLine('יְהוָ֥ה ׀ אֶחָֽד׃'), 'יְהוָה אֶחָד׃');
  assert.equal(cleanLine('אֱלֺהֵֽינוּ'), 'אֱלֹהֵינוּ');
  assert.equal(cleanLine('<b>בָּרוּךְ</b> אַתָּה יְהֹוָה, אֱלֹהֵֽינוּ:'), 'בָּרוּךְ אַתָּה יְהוָה אֱלֹהֵינוּ׃');
  assert.equal(cleanLine('מַה־ טֹּ֥בוּ'), 'מַה־טֹּבוּ');
  assert.equal(cleanLine('שְׁמַ֖<s t="large">ע</s><x>5</x> יִשְׂרָאֵ֑ל'), 'שְׁמַע יִשְׂרָאֵל');
  assert.deepEqual(largeLetters('שְׁמַ֖<s t="large">ע</s><x>5</x> אֶחָֽ<s t="large">ד׃</s>'), ['ע', 'ד']);
  assert.equal(cleanLine('(<small>x</small>) טוֹב.'), 'טוֹב׃');
  assert.equal(cleanLine('לְעֵֽלָּא (<small>בעשי"ת</small> לְעֵֽלָּא לְעֵֽלָּא מִכָּל) בִּרְכָתָֽא'), 'לְעֵלָּא בִּרְכָתָא');
  assert.equal(cleanEnglish('A <i>b</i>&nbsp;c<sup>1</sup>'), 'A b c');
});

test('clipWords: by folded skeleton and by count', () => {
  const s = 'אֲנִי רָצִיתִי לֶחֶם מְאֹד׃';
  assert.equal(clipWords(s, { endAfter: 'לחם' }), 'אֲנִי רָצִיתִי לֶחֶם׃');
  assert.equal(clipWords(s, { first: 2, noStop: true }), 'אֲנִי רָצִיתִי');
  assert.equal(clipWords(s, { last: 1 }), 'מְאֹד׃');
  assert.equal(foldedSkeleton('מֶלֶךְ'), 'מלכ');
  assert.throws(() => clipWords(s, { endAfter: 'ששש' }));
});

test('every non-clipped registry text equals the normalisation of its fetched source string', () => {
  const clipped = new Set(['bless-formula-1', 'num-12-13', 'avot-1', 'birkat-hamazon-1', 'modeh-ani-1']);
  let checked = 0;
  for (const e of registry) {
    const src = snapshot[e.snapshotId];
    assert.ok(src, e.id);
    const clean = src.rawLines.map((l) => cleanLine(l, { dropSmall: e.id === 'avot-1' }));
    if (!clipped.has(e.id)) { assert.equal(e.he, clean.join('\n'), `${e.id}: differs from its source`); checked++; }
    else {
      // clipped: must be a contiguous word run of the cleaned source
      const strip = (w) => w.replace(/׃/g, '');
      const sw = clean.join(' ').split(/\s+/).map(strip);
      const hw = e.he.split(/\s+/).map(strip);
      const idx = sw.findIndex((_, i) => hw.every((w, j) => sw[i + j] === w));
      assert.ok(idx >= 0, `${e.id}: not a contiguous run of the source`);
      checked++;
    }
  }
  assert.equal(checked, registry.length);
});

test('texts agree with the researcher\'s independent transcription in count.py (accents/punctuation ignored)', () => {
  const by = Object.fromEntries(registry.map((e) => [e.id, e]));
  const norm = (s) => stripAccents(s).normalize('NFC').replace(/[׃׀]/g, '').replace(/־/g, ' ').replace(/\s+/g, ' ').trim();
  const pairs = {
    'Priestly Blessing (Num 6:24-26)': ['bless-priestly-1', 'bless-priestly-2', 'bless-priestly-3'].map((i) => by[i].he).join(' '),
    'Shema (Deut 6:4)': by['shema-1'].he,
    "Shema + V'ahavta (Deut 6:4-5)": by['shema-1'].he + ' ' + by['vahavta-1'].he,
    'El na refa na lah (Num 12:13b)': by['num-12-13'].he,
    'Mah Tovu (Num 24:5)': by['mah-tovu-1'].he,
    'Mi Chamocha (Ex 15:11)': by['mi-chamocha-1'].he,
  };
  for (const [k, mine] of Object.entries(pairs)) {
    assert.ok(research[k], 'fixture lacks ' + k);
    assert.equal(norm(mine), norm(research[k]), k);
  }
});

test('pointed text: every Hebrew word in the registry carries at least one vowel point (shuruk counts)', () => {
  const bad = [];
  for (const e of registry) for (const w of wordsOf(e.he)) if (!new RegExp('[' + String.fromCodePoint(0x5B0) + '-' + String.fromCodePoint(0x5BC) + String.fromCodePoint(0x5C7) + ']').test(w)) bad.push(e.id + ':' + w);
  assert.deepEqual(bad, []);
});

test('Tetragrammaton form is uniform (yod-sheva, he, vav-qamats, he) and never holam-pointed', () => {
  const std = 'יְהוָה';
  const holam = 'יְהֹוָה';
  for (const e of registry) {
    assert.ok(!e.he.includes(holam), e.id);
    for (const w of wordsOf(e.he)) if (foldedSkeleton(w) === 'יהוה') assert.equal(w.replace(/[׃]/g, ''), std, e.id);
  }
});
