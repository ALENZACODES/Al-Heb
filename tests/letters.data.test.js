import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL('../data/letters/' + p, import.meta.url), 'utf8'));
const letters = read('letters.json');
const IDS = ['alef','bet','gimel','dalet','he','vav','zayin','chet','tet','yod','kaf','lamed','mem','nun','samekh','ayin','pe','tsadi','qof','resh','shin','tav',
  'kaf-final','mem-final','nun-final','pe-final','tsadi-final'];
const FINALS = { 'kaf-final': 'kaf', 'mem-final': 'mem', 'nun-final': 'nun', 'pe-final': 'pe', 'tsadi-final': 'tsadi' };

test('letters.json has exactly the 27 contract ids, once each', () => {
  assert.equal(Array.isArray(letters), true);
  assert.equal(letters.length, 27);
  assert.deepEqual(letters.map(l => l.id).sort(), IDS.slice().sort());
});

test('each record has name, nameHe, glyph, gematria, sound, confusableWith', () => {
  for (const l of letters) {
    assert.equal(typeof l.name, 'string', l.id);
    assert.match(l.nameHe, /^[֐-׿ ]+$/, l.id + ' nameHe');
    assert.match(l.he, /^[א-ת]$/, l.id + ' glyph is one Hebrew letter');
    assert.ok(Number.isInteger(l.gematria) && l.gematria > 0, l.id);
    assert.equal(typeof l.sound.ipa, 'string', l.id);
    assert.equal(typeof l.sound.en, 'string', l.id);
    assert.ok(Array.isArray(l.confusableWith), l.id);
    for (const c of l.confusableWith) assert.ok(IDS.includes(c) && c !== l.id, l.id + ' -> ' + c);
  }
});

test('finals present, point at their base letter, gematria 500-900 flagged as convention', () => {
  const by = Object.fromEntries(letters.map(l => [l.id, l]));
  const vals = { 'kaf-final': 500, 'mem-final': 600, 'nun-final': 700, 'pe-final': 800, 'tsadi-final': 900 };
  for (const [fid, base] of Object.entries(FINALS)) {
    assert.equal(by[fid].finalOf, base);
    assert.equal(by[fid].gematria, vals[fid]);
    assert.equal(by[fid].gematriaIsConvention, true);
    assert.equal(by[base].finalOf, undefined);
  }
  assert.deepEqual(letters.slice(0, 22).map(l => l.gematria), [1,2,3,4,5,6,7,8,9,10,20,30,40,50,60,70,80,90,100,200,300,400]);
});

test('confusableWith is symmetric', () => {
  const by = Object.fromEntries(letters.map(l => [l.id, l]));
  for (const l of letters) for (const c of l.confusableWith) assert.ok(by[c].confusableWith.includes(l.id), `${l.id} <-> ${c}`);
});

for (const script of ['print', 'cursive']) {
  test(`${script} stroke data: every letter has strokes, >=2 median points in 0..1000, valid path, draft flags`, () => {
    for (const l of letters) {
      const b = l[script];
      assert.ok(b && Array.isArray(b.strokes) && b.strokes.length >= 1 && b.strokes.length <= 6, `${l.id} ${script} strokes`);
      assert.equal(b.validated, false, `${l.id} ${script} must not claim validation`);
      assert.equal(b.needsNativeReview, true, l.id);
      assert.equal(b.quality, 'draft', l.id);
      for (const [i, s] of b.strokes.entries()) {
        assert.match(s.path, /^M[\d. -]+(?:[CLQ][\d. -]+)*$/, `${l.id} ${script} stroke ${i} path`);
        assert.ok(Array.isArray(s.median) && s.median.length >= 2, `${l.id} ${script} stroke ${i} median length`);
        for (const p of s.median) {
          assert.equal(p.length, 2);
          for (const v of p) assert.ok(Number.isFinite(v) && v >= 0 && v <= 1000, `${l.id} ${script} stroke ${i} point ${p} inside box`);
        }
        // path numbers also inside the box
        for (const n of s.path.match(/-?\d+(?:\.\d+)?/g)) assert.ok(Number(n) >= -50 && Number(n) <= 1050, `${l.id} path coord ${n}`);
      }
    }
  });
}

test('print records carry the font outline; stroke counts agree with research-confirmed counts', () => {
  const confirmed = { vav: 1, kaf: 1, resh: 1, bet: 2, dalet: 2, zayin: 2, samekh: 2, ayin: 2, tsadi: 2, 'mem-final': 2 };
  for (const l of letters) {
    assert.match(l.print.outline, /^M/, l.id);
    if (confirmed[l.id]) { assert.equal(l.print.strokes.length, confirmed[l.id], l.id + ' print stroke count'); assert.equal(l.print.strokeCountConfirmedByResearch, true); }
  }
  const by = Object.fromEntries(letters.map(l => [l.id, l]));
  assert.equal(by.alef.cursive.strokes.length, 2);
  // cursive mem is DERIVED from the font as one N-shaped stroke; research text says 3 strokes: recorded as a doubt, not forced.
  assert.equal(by.mem.cursive.strokeCountConfirmedByResearch, false);
});

test('sources file records the font and licence', () => {
  const src = readFileSync(new URL('../data/letters/SOURCES.md', import.meta.url), 'utf8');
  assert.match(src, /DejaVu Sans/);
  assert.match(src, /Bitstream Vera/);
  assert.match(src, /NOT derived from any copyrighted stroke diagram/);
  assert.match(src, /Gveret Levin/);
  assert.match(src, /SIL Open Font License/);
  assert.match(src, /derivative/i);
});

test('confusables.json: nine research sets referencing known ids', () => {
  const c = read('confusables.json');
  assert.equal(c.sets.length, 9);
  for (const s of c.sets.concat(c.cursiveExtra)) for (const id of s.letters) assert.ok(IDS.includes(id), s.id + ':' + id);
});

test('cursive strokes are derived from Gveret Levin: outline + provenance + draft flags, stroke width and scale recorded', () => {
  for (const l of letters) {
    const c = l.cursive;
    assert.match(c.outline, /^M/, l.id);
    assert.match(c.outlineSource, /Gveret Levin/);
    assert.match(c.strokeBasis, /skeletonised/);
    assert.ok(c.fontScale > 0.5 && c.fontScale <= 1, l.id);
    assert.ok(c.strokes.length <= 2, l.id + ' cursive strokes <= 2 after derivation');
    for (const s of c.strokes) assert.ok(s.median.length >= 5, l.id + " median points");
  }
});

test('REVIEW-LIST.md exists and lists every letter id for native teachers to tick', () => {
  const r = readFileSync(new URL('../docs/letters/REVIEW-LIST.md', import.meta.url), 'utf8');
  for (const id of IDS) assert.ok(r.includes('`' + id + '`'), id);
  assert.match(r, /- \[ \]/);
  assert.match(r, /NOT native-validated|not native-validated/i);
});
