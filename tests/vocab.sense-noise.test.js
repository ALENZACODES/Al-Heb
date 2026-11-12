// Sense-noise lane: English glosses applied from data/vocab/corrections.json and
// data/vocab/overrides.json. Not a native-speaker or qualified-reader review.
// proofread stays false. Hebrew, niqqud, ids, ranks and audio bytes stay put.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const words = read('data/vocab/words.json').words;
const vocab = read('data/vocab/vocab5000.json').entries;
const byW = new Map(words.map((w) => [w.id, w]));
const byV = new Map(vocab.map((e) => [e.id, e]));
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const APPLIED = {
  h32c69c06: ['vcae66f69', 'of; belonging to'],
  h6ad3ddd8: ['v3bb3aed6', 'order, arrangement; the Passover seder'],
  hfcd9d9b6: ['v4114852f', 'to sit; to live (somewhere)'],
  h3c9f9b9b: ['v2c5ab4f5', 'tent'],
  hd83852fd: ['v4ac4f0b7', 'to understand'],
  hbab9e498: ['v35d3a7b7', 'to worry'],
  h1694966b: ['vd0415735', 'to fear; to be afraid'],
  hca9b72dd: ['v8c6c5fb3', 'not; except; without'],
  h83e50730: ['v9305ab6d', 'to meet (with someone)'],
  h319721ae: ['vfdf8dca8', '(it) matters; (one) cares'],
  hcd00a615: ['v849e335c', 'ha! (an exclamation of triumph or discovery); behold'],
  hc35a1f96: ['vd6ce87d6', 'material; substance'],
  hebf7495d: ['vbb4d8260', 'amen (so be it)'],
  h7c9d2ffe: ['v279bb5ac', '(marks a definite direct object; not translated)'],
  h8f6da72d: ['va164890d', 'genius; pride (Gaon: title of Babylonian academy heads)'],
  h795e3a35: ['ve23877c7', 'omer (a sheaf; a small biblical dry measure; the Omer count)'],
  hbbe95c0d: ['vba281962', 'audacity; shameless confidence (chutzpah)'],
  h82329da7: ['v051f2189', 'sheikh (an Arab tribal or religious leader)'],
  h5c0abbc6: ['v9d548ac6', 'vowel points (the marks that show vowels in Hebrew text); scoring'],
};

const HEBREW = {
  h32c69c06: 'שֶׁל', h6ad3ddd8: 'סֵדֶר', hfcd9d9b6: 'יָשַׁב', h3c9f9b9b: 'אֹהֶל',
  hd83852fd: 'הֵבִין', hbab9e498: 'דָּאַג', h1694966b: 'פָּחַד', hca9b72dd: 'בִּלְתִּי',
  h83e50730: 'נִפְגַּשׁ', h319721ae: 'אִכְפַּת', hcd00a615: 'הָא', hc35a1f96: 'חֹמֶר',
  hebf7495d: 'אָמֵן', h7c9d2ffe: 'אֵת', h8f6da72d: 'גָּאוֹן', h795e3a35: 'עֹמֶר',
  hbbe95c0d: 'חֻצְפָּה', h82329da7: 'שֵׁיךְ', h5c0abbc6: 'נִקּוּד',
  h085098ab: 'עֲבֻדָּה', h2adc37eb: 'עֻבְדָּה', h5c96df63: 'מָן', hd5bcfcb8: 'נָבַל',
};

test('nineteen English glosses match on words.json and vocab5000; Hebrew and proofread do not move', () => {
  assert.equal(Object.keys(APPLIED).length, 19);
  for (const [wid, [vid, gloss]] of Object.entries(APPLIED)) {
    const w = byW.get(wid);
    const e = byV.get(vid);
    assert.equal(w.he, HEBREW[wid], wid);
    assert.equal(e.pointed, HEBREW[wid], vid);
    assert.equal(w.en, gloss, wid);
    assert.equal(e.gloss, gloss, vid);
    assert.equal(e.proofread, false, vid);
    assert.equal(e.lemma, w.heUnpointed, vid);
  }
  assert.equal(vocab.filter((e) => e.proofread !== false).length, 0);
});

test('held rows stay: fact is עֻבְדָּה, עֲבֻדָּה is not retargeted, ranks and unpointed forms stay', () => {
  assert.equal(byW.get('h085098ab').en, 'a staff of servants');
  assert.equal(byV.get('v85969b2f').gloss, 'staff of servants');
  assert.equal(byV.get('v85969b2f').pointed, 'עֲבֻדָּה');
  assert.equal(byW.get('h2adc37eb').en, 'fact');
  assert.equal(byV.get('v8e673872').gloss, 'fact');
  assert.equal(byV.get('v8e673872').pointed, 'עֻבְדָּה');
  assert.equal(byW.get('h5c96df63').frequencyRank, 74);
  assert.equal(byV.get('v02462aac').rank, 74);
  assert.equal(byV.get('v02462aac').gloss, 'manna (food of the Israelites in the desert)');
  assert.equal(byV.get('v02462aac').pointed, 'מָן');
  assert.equal(vocab.filter((e) => e.lemma === 'מן' && e.pos !== 'noun').length, 0);
  assert.equal(byV.get('vab6cd0ee').gloss, 'from, of (prefix)');
  assert.equal(byW.get('hd5bcfcb8').frequencyRank, 853);
  assert.equal(byV.get('v4e8c95be').rank, 876);
  assert.equal(byV.get('v4e8c95be').sourceRank, 853);
  assert.equal(byV.get('v4e8c95be').gloss, 'to wither, wilt, dry out');
  assert.equal(byV.get('vcdfed580').gloss, 'villain, vile person, miscreant, scoundrel');
  assert.equal(byV.get('v2894ffc1').gloss, 'harp');
  for (const id of ['vdf2737fe', 'vba010668', 'v66f62b1a']) {
    assert.equal(byV.get(id).pointed, null, id);
    assert.equal(byV.get(id).needsPointing, true, id);
  }
  assert.equal(byV.get('vba010668').gloss, 'black');
  assert.equal(byV.get('vdf2737fe').gloss, 'Friday');
  assert.equal(byV.get('v0200bfe7').gloss, 'shovel');
  assert.equal(byV.get('vd5de0470').pointed, 'פִּחֵד');
  assert.equal(byV.get('vd5de0470').gloss, 'to fear, to be afraid or scared');
});

test('prior March, garlic, cucumber, sandek, blue, and the 370 earlier corrections remain', () => {
  assert.equal(byV.get('v9e04887c').gloss, 'March (month)');
  assert.equal(byV.get('v505f48c6').gloss, 'garlic');
  assert.equal(byV.get('v505f48c6').topic, 'Food');
  assert.equal(byV.get('v0a0c3d9d').gloss, 'cucumber');
  assert.equal(byV.get('vd5c1fc73').gloss, 'sandek (the person who holds the baby at a circumcision)');
  assert.equal(byV.get('v7ba41398').gloss, 'blue');
  assert.equal(byW.get('h79986a16').en, 'garlic');
  assert.equal(byW.get('hd91e4a26').en, 'cucumber');
  assert.equal(byW.get('h1782f762').en, 'sandek (the person who holds the baby at a circumcision)');
  const corr = read('data/vocab/corrections.json');
  // Later rounds append their own corrections (S-01 learner-text gate, 12 Nov: 8); this lane's 410 stay first and unchanged.
  const later = corr.corrections.filter((c) => String(c.reason).startsWith('learner-text gate'));
  const prior = corr.corrections.filter((c) => !String(c.reason).includes('sense-noise lane') && !later.includes(c));
  assert.equal(prior.length, 373);
  assert.equal(corr.corrections.length - later.length, 410);
  assert.equal(later.length, 8);
});

test('disposition sheet counts 279 rows, 34 applied, 245 held, and matches the built glosses', () => {
  const text = fs.readFileSync(path.join(ROOT, 'docs/vocab/sense-noise-disposition.csv'), 'utf8');
  const lines = text.trim().split('\n');
  assert.equal(lines.length, 280);
  const body = lines.slice(1);
  const applied = body.filter((l) => l.includes(',applied,'));
  const held = body.filter((l) => l.includes(',held,'));
  assert.equal(applied.length, 34);
  assert.equal(held.length, 245);
  for (const [wid, [, gloss]] of Object.entries(APPLIED)) {
    assert.ok(text.includes(gloss), gloss);
    assert.ok(text.includes(wid), wid);
  }
});


const ROUND_2026_11_10 = {
  h0a69f537: 'to perish, to be lost',
  hc7778ee0: 'to be healed, to be cured',
  h54170135: 'tzaraat, a biblical affliction of skin, clothes or a house (often compared to leprosy)',
  h2761f10d: 'to volunteer',
  hf6cc5993: 'standing; the Amidah (the standing prayer)',
  h80a9b98b: 'inflammation',
  h6dbe0be6: 'to be made fit or approved; to be kashered',
  hce2879fb: 'the debir, the Holy of Holies (the innermost room of the Temple)',
  h33e8c3ac: 'a meter or gauge; the numerator of a fraction; one who counts',
  hc83a9175: 'a snail or sea-snail; in Jewish law, the creature from which tekhelet dye is taken',
  he6cb9a45: 'go (the board game)',
  hc79f8a66: 'tank (an armored fighting vehicle)',
  hf466322e: 'salmon (the fish)',
  hf19f0a88: 'bank (a financial institution)',
  h3a9e580d: 'pin (a peg or fastener)',
};
const ROUND_2026_11_10_V5 = {
  he6cb9a45: ['v1d519995', 'go (the board game)'],
  hc79f8a66: ['v92bbb2f2', 'tank (an armored fighting vehicle)'],
  hf466322e: ['v35787d85', 'salmon (the fish)'],
  hf19f0a88: ['v390aa9b9', 'bank (a financial institution)'],
  h3a9e580d: ['vdee4ee61', 'pin (a peg or fastener)'],
};

test('fifteen 2026-11-10 sense-noise glosses match words.json; the five loanwords also match vocab5000', () => {
  for (const [wid, gloss] of Object.entries(ROUND_2026_11_10)) {
    assert.equal(byW.get(wid).en, gloss, wid);
  }
  for (const [wid, [vid, gloss]] of Object.entries(ROUND_2026_11_10_V5)) {
    assert.equal(byV.get(vid).gloss, gloss, vid);
    assert.equal(byV.get(vid).proofread, false, vid);
  }
});

test('audio bytes for the fact and manna clips are unchanged', { skip: !fs.existsSync(path.join(ROOT, 'audio/f/ashkenazi/word/h2adc37eb.mp3')) && 'audio files are not in this worktree' }, () => {
  const expect = {
    'audio/f/ashkenazi/word/h2adc37eb.mp3': '8c20ec9fa0031f1acebcbfe2815a1c81684dc30a994fa3ef66b222afb3ac8d68',
    'audio/f/israeli/word/h2adc37eb.mp3': '3ec9db5648515f518e709de65c06309e788744d59b0b759e7511f16e8d9c21d6',
    'audio/f/sephardi/word/h2adc37eb.mp3': '6d19ae621f5a799188dfaad6807a5b28f68ddd198325b0f7e2804441f65486ac',
    'audio/m/israeli/word/h2adc37eb.mp3': '7d3d0cc6e4008fc8a58fe89156a73a0b124cb9766620da3082579e0d931e2c33',
    'audio/f/ashkenazi/word/h5c96df63.mp3': '523d42c6d23fe5f15270193aedda99f3d2de5a8f2a68a2bfd42348531ff382a4',
    'audio/f/israeli/word/h5c96df63.mp3': '2b5fb32022f56fad355cf2e8146f0e03e470e44c60dcd1042ac4d111a2d1f4f0',
    'audio/f/sephardi/word/h5c96df63.mp3': '5f9a9765470955cc9264a3377f59b5e6c03a64fd0b927781561516c96cd44a00',
    'audio/m/israeli/word/h5c96df63.mp3': '72c0fd2713181601aa9c8f2cc8989c2e292e0e0e985e85d432af588f4e1fdc2b',
  };
  for (const [rel, digest] of Object.entries(expect)) {
    assert.equal(sha(fs.readFileSync(path.join(ROOT, rel))), digest, rel);
  }
});

test('a second apply of the correction chain is a no-op', async () => {
  const { applyCorrections } = await import('../tools/vocab/apply_corrections.mjs');
  const report = applyCorrections(ROOT, { dry: true });
  assert.equal(report.conflicts.length, 0);
  assert.equal(report.applied.length, 0);
  assert.equal(report.already.length, 418); // 410 + the 8 learner-text gate corrections (S-01, 12 Nov)
});
