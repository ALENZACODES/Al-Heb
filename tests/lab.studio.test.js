import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STUDIO_GAMES, SKILLS, MAX_LEVEL, seeded, consonants, hasPattern } from '../src/lab/lab.core.js';
import { DRILLS } from '../src/lab/lab.games.js';
import { hebrewNumeral } from '../src/curriculum/calendar.js';
import {
  holdsDivineName, wordBurstPuzzle, migrationPuzzle, starSearchPuzzle, rootForgePuzzle, rootForgeNextOk,
  letterSequencePuzzle, speedMatchPuzzle, letterSpanPuzzle, letterSpanOk, vowelRainPuzzle, tileTurnPuzzle,
  pathWordPuzzle, pathWordFollows, pathWordReads, echoHuntPuzzle, resolveWordClip, shortEnglish,
} from '../src/lab/lab.studio.js';

const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
const letters = (Array.isArray(json('data/letters/letters.json')) ? json('data/letters/letters.json') : json('data/letters/letters.json').letters)
  .map((l) => ({ id: l.id, he: l.he, name: l.name, nameHe: l.nameHe, gematria: l.gematria, confusableWith: l.confusableWith || [], isFinal: /-final$/.test(l.id) }));
const syllables = json('data/lab/syllables.json').syllables;
const numbers = json('data/lab/numbers.json').numbers;
const famRaw = json('data/roots/families.json');
const allWords = [];
const fams = [];
for (const f of famRaw.families || []) {
  const root = consonants(f.root);
  const words = (f.words || []).filter((w) => w.he && w.en && !holdsDivineName(w.he)).map((w) => ({
    id: w.id, he: w.he, en: String(w.en).split(/[;,]/)[0].trim(), unpointed: w.unpointed || consonants(w.he),
    level: w.level, translit: w.translit, root, rootHe: f.root,
  }));
  allWords.push(...words);
  const withRoot = root.length === 3 ? words.filter((w) => hasPattern(w.he, root)) : words;
  if (withRoot.length) fams.push({ root, rootHe: f.root, words: withRoot, easy: withRoot.filter((w) => w.level === 'A1' || w.level === 'A2') });
}

test('studio games: eleven Lumosity-style trainers, every skill, unique ids, drills registered', () => {
  assert.equal(STUDIO_GAMES.length, 11);
  const ids = STUDIO_GAMES.map((g) => g.id);
  assert.deepEqual(ids, ['wordburst', 'migration', 'starsearch', 'rootforge', 'letterseq', 'speedmatch', 'letterspan', 'vowelrain', 'tileturn', 'pathword', 'echo']);
  assert.equal(new Set(ids).size, 11);
  assert.equal(STUDIO_GAMES.find((g) => g.id === 'vowelrain').title, 'Vowel Storm');
  assert.equal(STUDIO_GAMES.find((g) => g.id === 'echo').listening, true);
  for (const s of SKILLS) assert.ok(STUDIO_GAMES.some((g) => g.skill === s.id), s.id);
  assert.ok(STUDIO_GAMES.filter((g) => g.skill === 'problem').length >= 2);
  for (const g of STUDIO_GAMES) {
    assert.equal(g.pack, 'studio');
    assert.equal(g.seconds, 75);
    assert.ok(g.title && g.titleHe && g.blurb);
    assert.match(g.blurb, /[A-Za-z]/);
    assert.doesNotMatch(g.blurb, /\b(AI|Grok|\u0043laude|\u0043hatGPT|model)\b/i);
    assert.doesNotMatch(g.blurb, /\b(he|she|him|her|his|hers)\b/i);
    assert.equal(typeof DRILLS[g.id].trial, 'function');
    assert.equal(typeof DRILLS[g.id].load, 'function');
  }
});

test('divine-name helper holds the four-letter name and prefix forms, and never lets them into the word pool used here', () => {
  assert.equal(holdsDivineName('יהוה'), true);
  assert.equal(holdsDivineName('ויהוה'), true);
  assert.equal(holdsDivineName('שָׁלוֹם'), false);
  assert.equal(holdsDivineName('כֵּן'), false);
  assert.ok(allWords.length > 100);
  for (const w of allWords) assert.equal(holdsDivineName(w.he), false, w.he);
});

test('Word Burst: every tile is a verified word, the target appears the promised number of times, no invented strings', () => {
  const known = new Set(allWords.map((w) => consonants(w.he)));
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    const pz = wordBurstPuzzle(allWords, lv, seeded(1000 + lv));
    assert.ok(known.has(consonants(pz.target.he)));
    assert.equal(pz.board.filter((w) => consonants(w.he) === consonants(pz.target.he)).length, pz.targets);
    assert.equal(pz.board.length, pz.cols * pz.cols);
    for (const w of pz.board) {
      assert.ok(known.has(consonants(w.he)), w.he);
      assert.equal(holdsDivineName(w.he), false);
    }
  }
});

test('Migration Birds: unique highest value; labels are a number word or a legal Hebrew numeral', () => {
  const byVal = new Map(numbers.map((n) => [n.value, n]));
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    for (let i = 0; i < 20; i++) {
      const pz = migrationPuzzle(numbers, lv, seeded(lv * 50 + i));
      const vals = pz.birds.map((b) => b.value);
      assert.equal(vals.filter((v) => v === pz.answerValue).length, 1);
      assert.equal(pz.birds[pz.answerIndex].value, pz.answerValue);
      assert.ok(pz.speedMs >= 2600);
      for (const b of pz.birds) {
        const src = byVal.get(b.value);
        assert.ok(src, b.value);
        if (b.asNumeral) {
          assert.ok(b.value <= 999);
          assert.equal(b.label, hebrewNumeral(b.value));
        } else {
          assert.equal(b.label, src.he);
        }
      }
    }
  }
});

test('Star Search: exactly one odd star; letter, shape and vowel kinds stay consistent for the rest', () => {
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    for (let i = 0; i < 15; i++) {
      const pz = starSearchPuzzle(letters, syllables, lv, seeded(2000 + lv * 20 + i));
      assert.equal(pz.items.filter((x) => x.odd).length, 1);
      assert.equal(pz.items[pz.oddIndex].odd, true);
      const rest = pz.items.filter((x) => !x.odd);
      if (pz.kind === 'letter') assert.ok(rest.every((x) => x.letter === rest[0].letter && x.letter !== pz.items[pz.oddIndex].letter));
      if (pz.kind === 'shape') assert.ok(rest.every((x) => x.shape === rest[0].shape && x.shape !== pz.items[pz.oddIndex].shape));
      if (pz.kind === 'vowel') assert.ok(rest.every((x) => x.vowel === rest[0].vowel && x.vowel !== pz.items[pz.oddIndex].vowel));
    }
  }
});

test('Root Forge: spelling is the real unpointed word; correct next letters accept, a wrong letter fails', () => {
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    const pz = rootForgePuzzle(fams, lv, seeded(3000 + lv));
    assert.ok(pz.target.he);
    assert.equal(holdsDivineName(pz.target.he), false);
    assert.ok(hasPattern(pz.target.he, pz.root) || consonants(pz.target.he).includes(consonants(pz.rootHe)[0]));
    assert.equal(pz.spelling.join(''), pz.target.unpointed || consonants(pz.target.he));
    const bag = pz.tiles.map((t) => t.ch).sort().join('');
    for (const ch of pz.spelling) {
      // every spelling letter is present in the bag
      assert.ok(pz.tiles.some((t) => t.ch === ch), ch);
    }
    let soFar = [];
    for (const ch of pz.spelling) {
      assert.equal(rootForgeNextOk(pz.spelling, soFar, ch), true);
      assert.equal(rootForgeNextOk(pz.spelling, soFar, '־'), false);
      soFar = [...soFar, ch];
    }
    void bag;
  }
});

test('Letter Sequence: the answer really is the next letter in the stated alef-bet pattern', () => {
  const alef = letters.filter((l) => !l.isFinal).slice().sort((a, b) => a.gematria - b.gematria);
  const indexOf = (id) => alef.findIndex((l) => l.id === id);
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    for (let i = 0; i < 20; i++) {
      const pz = letterSequencePuzzle(letters, lv, seeded(4000 + lv * 20 + i));
      assert.equal(pz.choices.filter((c) => c.id === pz.answer.id).length, 1);
      const idx = pz.shown.map((l) => indexOf(l.id));
      const step = idx.length > 1 ? idx[1] - idx[0] : 1;
      for (let k = 1; k < idx.length; k++) assert.equal(idx[k] - idx[k - 1], step);
      assert.equal(indexOf(pz.answer.id), idx.at(-1) + step);
    }
  }
});

test('Speed Match: first card has no yes/no; later cards answer against the previous item', () => {
  const first = speedMatchPuzzle(null, syllables, 3, seeded(5));
  assert.equal(first.first, true);
  assert.equal(first.answer, null);
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    let prev = first.item;
    for (let i = 0; i < 12; i++) {
      const pz = speedMatchPuzzle(prev, syllables, lv, seeded(5000 + lv * 20 + i));
      assert.equal(pz.first, false);
      if (pz.rule === 'same') assert.equal(pz.answer, pz.item.id === pz.prev.id);
      if (pz.rule === 'sameLetter') assert.equal(pz.answer, pz.item.letter === pz.prev.letter);
      if (pz.rule === 'sameVowel') assert.equal(pz.answer, pz.item.vowel === pz.prev.vowel);
      prev = pz.item;
    }
  }
});

test('Letter Span: sequence length grows with level; check accepts only the same order', () => {
  const a = letterSpanPuzzle(letters, 1, seeded(1));
  const b = letterSpanPuzzle(letters, 12, seeded(2));
  assert.ok(a.seq.length >= 2);
  assert.ok(b.seq.length > a.seq.length);
  assert.equal(letterSpanOk(a.seq, a.seq), true);
  assert.equal(letterSpanOk(a.seq, a.seq.slice().reverse()), false);
  assert.ok(a.seq.every((l) => a.keyboard.some((k) => k.id === l.id)));
});

test('Vowel Rain: at least one falling syllable matches the target vowel, and a miss does not', () => {
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    const pz = vowelRainPuzzle(syllables, lv, seeded(6000 + lv));
    assert.equal(pz.falling.filter((s) => s.match).length, pz.matchCount);
    assert.ok(pz.matchCount >= 1);
    assert.ok(pz.falling.every((s) => (s.vowel === pz.targetVowel) === s.match));
    assert.ok(syllables.some((s) => s.id === pz.falling[0].id));
  }
});

test('Tile Turn: rotation is 90, 180 or 270; the upright choices include the real letter once', () => {
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    const pz = tileTurnPuzzle(letters, lv, seeded(7000 + lv));
    assert.ok([90, 180, 270].includes(pz.rot));
    assert.equal(pz.choices.filter((c) => c.id === pz.letter.id).length, 1);
  }
});

test('Path Word: the embedded path is connected, spells a verified word, and never uses a held name', () => {
  const known = new Set(allWords.map((w) => w.unpointed || consonants(w.he)));
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    for (let i = 0; i < 10; i++) {
      const pz = pathWordPuzzle(allWords, lv, seeded(8000 + lv * 10 + i));
      assert.equal(holdsDivineName(pz.word.he), false);
      assert.ok(known.has(pz.spelling.join('')));
      assert.equal(pathWordFollows(pz.path), true);
      assert.equal(pathWordReads(pz.grid, pz.path), pz.spelling.join(''));
      assert.equal(pathWordFollows([[0, 0], [2, 2]]), false);
    }
  }
});

test('Word Burst English meanings stay short (about three words or 22 characters)', () => {
  assert.equal(shortEnglish('water'), 'water');
  assert.equal(shortEnglish('to write a long official letter; correspondence'), 'to write a');
  assert.ok(shortEnglish('a very long dictionary gloss that keeps going and going').length <= 22
    || shortEnglish('a very long dictionary gloss that keeps going and going').split(/\s+/).length <= 3);
  for (let lv = 1; lv <= 3; lv++) {
    const pz = wordBurstPuzzle(allWords, lv, seeded(4400 + lv));
    assert.ok(pz.target.en.length <= 22 || pz.target.en.split(/\s+/).length <= 3, pz.target.en);
    assert.doesNotMatch(pz.target.en, /;/);
  }
});

test('Echo Hunt: a unique target from the verified lists, no divine name, choices include the target once', () => {
  const cafe = json('data/lab/words.json').cafe.map((w) => ({ ...w, en: w.en, tr: w.tr, clip: w.clip }));
  const dirs = json('data/lab/words.json').directions.map((w) => ({ ...w, en: w.en, tr: w.tr, clip: w.clip }));
  const words = [...cafe, ...dirs].filter((w) => w.he && !holdsDivineName(w.he));
  assert.ok(words.length >= 20);
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    const pz = echoHuntPuzzle(words, lv, seeded(8800 + lv));
    assert.equal(holdsDivineName(pz.target.he), false);
    assert.ok(pz.choices.some((c) => c.he === pz.target.he));
    assert.equal(pz.choices.filter((c) => c.he === pz.target.he).length, 1);
    assert.equal(new Set(pz.choices.map((c) => c.he)).size, pz.choices.length);
    assert.ok(pz.choices.length >= 3);
  }
});

test('resolveWordClip prefers a vocab-id word recording when the player has it, else the listed clip', () => {
  const cake = { id: 'ha664d093', he: 'עוּגָה', clip: { kind: 'word', id: 'ha664d093' } };
  const water = { id: 'p7f7d7b8f', he: 'מַיִם', clip: { kind: 'word', id: 'cafe-09' } };
  const has = (kind, id) => kind === 'word' && (id === 'ha664d093' || id === 'cafe-09');
  assert.deepEqual(resolveWordClip(cake, has), { kind: 'word', id: 'ha664d093' });
  assert.deepEqual(resolveWordClip(water, has), { kind: 'word', id: 'cafe-09' }, 'water has no vocab-id file in this fake player, so the phrasebook clip stays');
  const hasVocab = (kind, id) => kind === 'word' && id === 'p7f7d7b8f';
  assert.deepEqual(resolveWordClip(water, hasVocab), { kind: 'word', id: 'p7f7d7b8f' });
  assert.equal(resolveWordClip({ he: 'x' }, has), null);
});
