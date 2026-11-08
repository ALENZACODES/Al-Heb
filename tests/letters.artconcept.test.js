// The art concept map (data/letters/art-concept-map.json, read copy docs/letters/ART-CONCEPT-MAP.md) must agree with the memory chain,
// the files on disk and the text the app, book and workbook print from data/letters/mnemonics.json. DRAFT content: this checks consistency, not correctness.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const R = new URL('../', import.meta.url);
const rd = (p) => JSON.parse(fs.readFileSync(new URL(p, R), 'utf8'));
const has = (p) => fs.existsSync(new URL(p, R));
const MAP = rd('data/letters/art-concept-map.json');
const CHAIN = rd('data/letters/memory-chain.json');
const MN = rd('data/letters/mnemonics.json');
const rx = (s) => new RegExp(s, 'i');
const FIELDS = MAP.meta.displayedFields;
const records = [...MN.letters, ...MN.variants];

test('map covers the same 27 letters as the memory chain and mnemonics, in the same order', () => {
  const ids = CHAIN.letters.map((l) => l.id);
  assert.deepEqual(MAP.letters.map((l) => l.id), ids);
  assert.deepEqual(MN.letters.map((l) => l.id), ids);
  assert.equal(ids.length, 27);
  assert.deepEqual(MAP.variants.map((v) => v.id), MN.variants.map((v) => v.id));
});

test('map is marked DRAFT and every status is one of keep / retire / needs decision', () => {
  assert.equal(MAP.meta.status, 'DRAFT');
  assert.equal(MAP.meta.nothingDeleted ?? MAP.meta.definitions.nothingDeleted, true);
  for (const l of MAP.letters) {
    assert.ok(['keep', 'retire', 'needs decision'].includes(l.status), `${l.id} status ${l.status}`);
    assert.ok(l.note && l.note.length >= 10, `${l.id} has a note`);
    assert.ok(['same', 'partial', 'differs'].includes(l.olderArt.agreement), `${l.id} art agreement`);
    assert.ok(['same', 'partial', 'changed here'].includes(l.olderMnemonic.textAgreement), `${l.id} text agreement`);
  }
  assert.ok(MAP.letters.some((l) => l.status === 'needs decision'), 'at least one open decision is recorded');
});

test('the approved concept in the map is the live memory-chain concept, and its picture is on disk', () => {
  for (const c of CHAIN.letters) {
    const l = MAP.letters.find((x) => x.id === c.id);
    assert.equal(l.approved.idea, c.picture.idea, `${c.id} idea`);
    assert.equal(l.approved.hook, c.sound.hook, `${c.id} hook`);
    assert.equal(l.approved.morphSvg, c.picture.svg, `${c.id} svg`);
    assert.ok(has(c.picture.svg), `${c.id} svg exists`);
    assert.ok(l.files.morphSvg.exists === true, `${c.id} map says the svg exists`);
  }
});

test('every morph SVG on disk (28) is accounted for: 27 letters plus sin', () => {
  const onDisk = fs.readdirSync(new URL('assets/letters/morph/', R)).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)).sort();
  const mapped = [...MAP.letters.map((l) => l.id), ...MAP.variants.filter((v) => v.morphSvg).map((v) => v.id)].sort();
  assert.deepEqual(onDisk, mapped);
  assert.equal(onDisk.length, 28);
});

test('files named in the map exist on disk (older art is kept, never deleted)', () => {
  for (const l of MAP.letters) {
    assert.ok(l.files.genPrintStems.includes('print_mnemonic'), `${l.id} keeps its older print mnemonic picture`);
    const stem = `L${l.order}_${l.id.replace('-', '_')}_print_mnemonic.800.webp`;
    assert.ok(has('assets/img/gen/' + stem), stem);
    assert.ok(l.files.placeholderSvgs > 0, `${l.id} placeholders`);
  }
});

test('map describes per-image approval without claiming all older art is hidden', () => {
  assert.match(MAP.meta.olderArtHidden, /per image/);
  for (const letter of MAP.letters) assert.match(letter.appShows.olderArt, /image id is approved/);
  const a = rd('data/images/approvals.json').approvals;
  for (const [id, record] of Object.entries(a)) assert.ok(['approved', 'hold', 'rejected', 'pending'].includes(record.status), id);
});

test('no displayed field contradicts the map: retired concepts are gone, the caption names the approved object', () => {
  const global = MAP.meta.globalRetiredPatterns.map(rx);
  for (const r of records) {
    const m = MAP.letters.find((x) => x.id === r.id) || MAP.variants.find((x) => x.id === r.id);
    assert.ok(m, `${r.id} is in the map`);
    for (const f of FIELDS) {
      const text = r[f] || '';
      for (const p of [...global, ...(m.retiredPatterns || []).map(rx)]) assert.ok(!p.test(text), `${r.id}.${f} matches retired pattern ${p}: ${text}`);
    }
    assert.ok(rx(m.captionMustMatch).test(r.caption), `${r.id} caption must mention the approved object (${m.captionMustMatch}): ${r.caption}`);
    if (MAP.letters.includes(m)) assert.ok(rx(m.captionMustMatch).test(m.approved.idea), `${r.id} caption term is part of the approved idea`);
  }
});

test('the older text of each retired concept was really replaced (the "was" note differs from what is shown)', () => {
  for (const r of [...MAP.letters.map((l) => ({ id: l.id, was: l.olderMnemonic.beforeThisPass })), ...MAP.variants.map((v) => ({ id: v.id, was: v.beforeThisPass }))]) {
    if (!r.was) continue;
    const shown = records.find((x) => x.id === r.id);
    assert.notEqual(shown.imageIdea.toLowerCase(), r.was.toLowerCase(), r.id);
    assert.ok(!shown.imageIdea.toLowerCase().includes(r.was.toLowerCase()), r.id);
  }
  assert.equal(MAP.letters.filter((l) => l.olderMnemonic.textAgreement === 'changed here').length, MAP.letters.filter((l) => l.olderMnemonic.beforeThisPass).length);
});

test('ayin: every sound claim names its reading, from data/pronunciation/consonants.json', () => {
  const c = rd('data/pronunciation/consonants.json').letters.ayin;
  assert.match(c.ipa.israeli, /ʔ|∅/);
  assert.match(c.ipa.sephardi, /ʕ/);
  assert.match(c.ipa.ashkenazi, /∅/);
  const m = MN.letters.find((x) => x.id === 'ayin');
  for (const f of ['sound', 'soundAnchor', 'story', 'altStory', 'caption', 'lookalike']) {
    const t = m[f];
    if (/silen|says nothing|no sound|never hear/i.test(t)) assert.match(t, /sephardi/i, `ayin.${f} says silent without naming the Sephardi reading: ${t}`);
  }
  assert.match(m.sound, /israeli/i); assert.match(m.sound, /ashkenazi/i); assert.match(m.sound, /sephardi/i);
  // the alef lookalike must not call ayin plainly "silent"
  assert.ok(!/other silent letter/i.test(MN.letters.find((x) => x.id === 'alef').lookalike));
  const ch = CHAIN.letters.find((x) => x.id === 'ayin');
  assert.ok(!/silen/i.test(ch.story), 'chain story is shared by all readings, so it must not say silent');
  for (const t of Object.values(ch.storyByTradition)) assert.ok(!/silen/i.test(t));
  assert.match(ch.sound.line, /israel/i);
  assert.equal(ch.sound.matches.sephardi, false);
  assert.match(ch.sound.perTradition.sephardi, /ʕ|pharyngeal|throat/i);
  const spec = fs.readFileSync(new URL('tools/images/spec.mjs', R), 'utf8');
  assert.ok(!/Tel Aviv, throaty|Mizrahi speech/.test(spec), 'ayin sound in the art spec (printed in the book) states readings the data does not name');
  assert.ok(MAP.ayin.notDecidedByData.length >= 2, 'open points are listed for the reviewer');
});

test('garden anchor: the nun-final word has the pointing of the word list, everywhere the app builds it', () => {
  const strip = (s) => s.replace(/[֑-ׇ]/g, '');
  const GAN = String.fromCodePoint(0x5d2, 0x5df);
  const gardens = rd('data/vocab/words.json').words.filter((w) => strip(w.he) === GAN && w.pos === 'noun' && /garden/i.test(w.en));
  assert.equal(gardens.length, 1, 'exactly one garden noun in the word list');
  const he = gardens[0].he;
  assert.equal(gardens[0].id, MAP.garden.wordList.id);
  assert.equal(MN.letters.find((x) => x.id === 'nun-final').word, he);
  const am = [...rd('data/audio/manifest.json'), ...rd('data/audio/manifest-kind-word.json')];
  const anchors = (Array.isArray(am) ? am : am.entries || am.items || Object.values(am).find(Array.isArray)).filter((e) => e.id === 'anchor-nun-final');
  assert.ok(anchors.length >= 1);
  for (const e of anchors) assert.equal(e.text, he);
  const tts = rd('data/tts/soundwords.israeli.json').items.filter((e) => e.id === 'anchor-nun-final');
  assert.equal(tts.length, 1);
  assert.equal(tts[0].he, he);
  const walk = (o, f) => { if (Array.isArray(o)) o.forEach((x) => walk(x, f)); else if (o && typeof o === 'object') { f(o); Object.values(o).forEach((x) => walk(x, f)); } };
  for (const file of ['data/curriculum/lessons.json', 'data/curriculum/lessons-intermediate/I-42.json']) {
    let n = 0;
    walk(rd(file), (o) => { if (typeof o.he === 'string' && strip(o.he) === GAN && /garden/i.test(o.en || '')) { n++; assert.equal(o.he, he, file); } });
    assert.ok(n >= 1, file + ' has a garden entry');
  }
  assert.match(MAP.garden.reviewer, /qualified Hebrew reader/);
});

test('the reading copy lists every letter with the same status as the data', () => {
  const md = fs.readFileSync(new URL('docs/letters/ART-CONCEPT-MAP.md', R), 'utf8');
  assert.match(md, /DRAFT/);
  for (const l of MAP.letters) assert.match(md, new RegExp(`\\| ${l.order} \\| ${l.id} \\|.*\\*\\*${l.status}\\*\\* \\|`), `${l.id} row`);
});
