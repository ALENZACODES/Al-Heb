// Brain Lab games added 2026-11-10 (Sound Twins, Vowel Rain, Middle Letter, Taxi Turns, Café Order, Prayer Chain).
// Data: built from the app's own dictionary and sound tables, never typed. Logic: every round has exactly one right answer,
// and the Identity Test from GAMES-START-HERE.md holds: tapping at random, or always the same button, scores at chance.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GAMES, GLYPHS, seeded, sameSound, twinsNext, twinsBack, rainPool, rainKeys, rainFallMs, middleTrial, taxiTrial, cafeOrder, cafeSize,
  chainTrial, lineWords, bare, hasDivineName, normTradition, starsFor, uniqueMet, isNewGame, recordSession, emptyState, MAX_LEVEL,
} from '../src/lab/lab.core.js';
import { build, firstSound, vowelOf, CAFE_IDS } from '../tools/lab/build-lab-words.mjs';
import { NEW_DRILLS } from '../src/lab/lab.games2.js';

const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
const W = json('data/lab/words.json');
const card = (he) => W.cards.find((c) => c.he === he);
const NEW = GAMES.filter((g) => g.added);

test('six new games: each has code, a token letter, a Hebrew title, a one-line "what it teaches", and counts as New until played', () => {
  assert.deepEqual(NEW.map((g) => g.id), ['twins', 'rain', 'middle', 'taxi', 'cafe', 'chain']);
  for (const g of GAMES) assert.ok(GLYPHS[g.id], `token letter for ${g.id}`);
  for (const g of NEW) {
    assert.equal(typeof NEW_DRILLS[g.id].load, 'function'); assert.equal(typeof NEW_DRILLS[g.id].trial, 'function');
    assert.match(g.titleHe, /[א-ת]/); assert.ok(g.teaches && g.teaches.length < 80, g.id);
    assert.ok(isNewGame(g, emptyState()));
    assert.ok(!isNewGame(g, recordSession(emptyState(), g.id, { score: 10, accuracy: 50, maxLevel: 1, avgMs: 900 }, '2026-11-10')));
  }
  assert.ok(!isNewGame(GAMES.find((g) => g.id === 'hunt'), emptyState()), 'the first ten never show New');
});

test('data/lab/words.json is exactly what tools/lab/build-lab-words.mjs builds from the dictionary and sound tables', () => {
  assert.deepEqual(W, JSON.parse(JSON.stringify(build())));
});

test('café and direction words match the dictionary, and every linked recording says exactly that Hebrew in both voices', () => {
  const dict = new Map(json('data/vocab/words.json').words.map((w) => [w.id, w]));
  const man = [...json('data/audio/manifest.json'), ...json('data/audio/manifest-kind-word.json'), ...json('data/audio/manifest-words-israeli.json')];
  for (const it of [...W.cafe, ...W.directions]) {
    const w = dict.get(it.id); assert.ok(w, it.id);
    assert.equal(it.he, w.he); assert.equal(it.tr, w.translit); assert.ok(w.en.startsWith(it.en), `${it.en} is the start of "${w.en}"`);
    if (!it.clip) continue;
    for (const v of ['m', 'f']) assert.ok(man.some((r) => r.kind === it.clip.kind && r.id === it.clip.id && r.voice === v && r.tradition === 'israeli' && r.status !== 'missing' && r.text === it.he), `${it.he} ${v}`);
  }
  assert.ok(W.cafe.filter((x) => x.clip).length >= 18 && W.directions.every((d) => d.clip), 'most café words and every direction can be heard');
  assert.equal(W.cafe.length, CAFE_IDS[1].length + CAFE_IDS[2].length);
  assert.deepEqual(new Set(W.directions.map((d) => d.dir)), new Set(['left', 'right', 'straight']));
});

test('IPA reading: first sound of a cell, and the vowel letter it reads as', () => {
  assert.equal(firstSound('[k] with dagesh, [χ] without'), 'k'); assert.equal(firstSound('∅ (silent)'), '∅'); assert.equal(firstSound('[e̞]'), 'e');
  assert.equal(firstSound('[a(ː)]'), 'a'); assert.equal(firstSound('alveolar or uvular'), null);
  assert.equal(vowelOf('[ɔ]'), 'o'); assert.equal(vowelOf('[ej]'), null); assert.equal(vowelOf('[e̞] or ∅ (no vowel)'), 'e'); assert.equal(vowelOf('[u]'), 'u');
});

test('Sound Twins: which letters share a sound follows each tradition (from data/pronunciation/consonants.json)', () => {
  const same = (a, b, t) => sameSound(card(a), card(b), t);
  for (const t of ['israeli', 'sephardi', 'ashkenazi']) {
    assert.ok(same('ט', 'תּ', t), `Tet and Tav with dagesh: ${t}`);
    assert.ok(same('כּ', 'ק', t), `Kaf and Qof: ${t}`);
    assert.ok(same('ס', 'שׂ', t), `Samekh and Sin: ${t}`);
    assert.ok(same('ב', 'ו', t), `Vet and Vav: ${t}`);
    assert.ok(same('מ', 'ם', t) && same('נ', 'ן', t) && same('צ', 'ץ', t), `finals sound like their letters: ${t}`);
    assert.ok(!same('בּ', 'ב', t) && !same('שׁ', 'שׂ', t) && !same('פּ', 'פ', t), `the dot changes the sound: ${t}`);
  }
  assert.ok(same('ח', 'כ', 'israeli') && same('ח', 'כ', 'ashkenazi') && !same('ח', 'כ', 'sephardi'), 'Chet and Khaf merge, except in Sephardi');
  assert.ok(same('א', 'ע', 'israeli') && same('א', 'ע', 'ashkenazi') && !same('א', 'ע', 'sephardi'), 'Aleph and Ayin merge, except in Sephardi');
  assert.ok(same('ת', 'ס', 'ashkenazi') && !same('ת', 'ס', 'israeli'), 'Tav without its dot says s only in Ashkenazi');
  assert.equal(normTradition('ashkenazi'), 'ashkenazi'); assert.equal(normTradition(undefined), 'israeli'); assert.equal(normTradition('x'), 'israeli');
});

test('Sound Twins: "same" is true exactly when the sounds match; about half the rounds are "same"; twins appear from level 3', () => {
  for (const t of ['israeli', 'sephardi', 'ashkenazi']) for (const level of [1, 3, 5, 7, 10]) {
    const rnd = seeded(`tw${t}${level}`); const hist = [];
    let sames = 0, twinsSeen = 0, n = 0;
    for (let i = 0; i < 600; i++) {
      const { card: c, same } = twinsNext(hist, W.cards, level, t, rnd);
      if (same !== null) {
        const ref = hist[hist.length - twinsBack(level)];
        assert.equal(same, sameSound(c, ref, t)); n++; if (same) { sames++; if (c.id !== ref.id) twinsSeen++; }
        if (level < 5) assert.ok(!/-final/.test(c.letter), 'no finals before level 5');
      }
      hist.push(c); if (hist.length > 4) hist.shift();
    }
    const p = sames / n; assert.ok(p > 0.42 && p < 0.58, `${t} L${level}: ${p.toFixed(2)} of rounds are "same" (always pressing Same scores at chance)`);
    if (level >= 3) assert.ok(twinsSeen / sames > 0.4, `${t} L${level}: most "same" rounds are a twin, not the identical card`);
  }
  assert.equal(twinsBack(6), 1); assert.equal(twinsBack(7), 2);
});

test('Vowel Rain: each drop has one sound per tradition, new signs arrive by level, glides are left out, the fall speeds up', () => {
  const pal = (t) => W.vowels.filter((v) => v.sign === 'patach').every((v) => v.sound[t] === 'a');
  assert.ok(pal('israeli') && pal('sephardi') && pal('ashkenazi'));
  const kam = W.vowels.find((v) => v.sign === 'kamatz'); assert.deepEqual(kam.sound, { israeli: 'a', sephardi: 'a', ashkenazi: 'o' });
  const tz = W.vowels.find((v) => v.sign === 'tzere'); assert.equal(tz.sound.ashkenazi, null, 'tzere reads as a glide in Ashkenazi');
  assert.ok(rainPool(W.vowels, 12, 'ashkenazi').every((v) => v.sign !== 'tzere'));
  assert.deepEqual([...new Set(rainPool(W.vowels, 1, 'israeli').map((v) => v.sign))].sort(), ['chirik', 'cholam', 'kubutz', 'patach', 'segol']);
  assert.ok(rainPool(W.vowels, 4, 'israeli').some((v) => v.sign === 'kamatz') && !rainPool(W.vowels, 3, 'israeli').some((v) => v.sign === 'kamatz'));
  assert.deepEqual(rainKeys(W.vowels, 'israeli'), ['a', 'e', 'i', 'o', 'u']);
  assert.ok(rainFallMs(1) > 4000 && rainFallMs(12) === 1600 && rainFallMs(6) < rainFallMs(5));
  // a drop with a recording names a syllable whose Hebrew is exactly the drop's
  const syl = new Map(json('data/lab/syllables.json').syllables.map((s) => [s.id, s]));
  for (const v of W.vowels.filter((x) => x.syllable)) assert.equal(syl.get(v.syllable).he.normalize('NFC'), v.he, v.syllable);
  assert.ok(W.vowels.filter((x) => x.syllable).length >= 100);
  // Identity: a random tap is right about one time in five
  const rnd = seeded('rain'); let hits = 0; const N = 4000;
  for (let i = 0; i < N; i++) { const pool = rainPool(W.vowels, 1 + (i % 12), 'israeli'); const d = pool[Math.floor(rnd() * pool.length)]; const keys = rainKeys(W.vowels, 'israeli'); if (keys[Math.floor(rnd() * keys.length)] === d.sound.israeli) hits++; }
  assert.ok(hits / N < 0.25, `random tapping: ${(hits / N).toFixed(2)}`);
});

test('Middle Letter: the target is always in the middle, options hold it once, tricky rows use look-alikes, answers are spread', () => {
  const raw = json('data/letters/letters.json');
  const letters = (Array.isArray(raw) ? raw : raw.letters).map((l) => ({ id: l.id, he: l.he, name: l.name, confusableWith: l.confusableWith || [], isFinal: /-final$/.test(l.id) }));
  for (let level = 1; level <= MAX_LEVEL; level++) {
    const rnd = seeded(`mid${level}`); let tricky = 0, firstPos = 0; const N = 300;
    for (let i = 0; i < N; i++) {
      const t = middleTrial(letters, level, rnd);
      assert.equal(t.row.length, level <= 5 ? 5 : 7); assert.equal(t.row[t.mid], t.target);
      assert.equal(t.options.filter((o) => o.id === t.target.id).length, 1);
      assert.equal(new Set(t.options.map((o) => o.id)).size, t.options.length);
      assert.equal(t.options.length, level <= 2 ? 2 : level <= 6 ? 3 : 4);
      if (t.tricky) { tricky++; assert.ok(t.target.confusableWith.includes(t.row[0].id), 'neighbours are a look-alike'); }
      if (level < 6) assert.ok(!t.row.some((l) => l.isFinal));
      if (t.options[0].id === t.target.id) firstPos++;
    }
    if (level === 1) assert.equal(tricky, 0); else assert.ok(tricky / N > 0.25, `L${level} tricky ${tricky}`);
    assert.ok(firstPos / N < 0.65, `L${level}: the answer is not always the first button`);
  }
});

test('Taxi Turns: the answer follows the rule; word rule only until level 4; straight from 3; phrases from 7; left and right balanced', () => {
  for (let level = 1; level <= MAX_LEVEL; level++) {
    const rnd = seeded(`taxi${level}`); const memo = {}; const ans = { left: 0, right: 0, straight: 0 }; let conflict = 0, sideRule = 0; const N = 400;
    for (let i = 0; i < N; i++) {
      const t = taxiTrial(W.directions, level, rnd, memo);
      assert.equal(t.answer, t.rule === 'word' ? t.word.dir : t.side);
      assert.ok(t.keys.includes(t.answer)); ans[t.answer]++;
      if (t.side !== t.word.dir) conflict++;
      if (t.rule === 'side') sideRule++;
      if (level < 3) { assert.ok(t.word.dir !== 'straight' && t.side !== 'straight'); assert.deepEqual(t.keys, ['left', 'right']); }
      if (level < 7) assert.ok(t.word.tier < 3, 'no "turn right" phrases before level 7');
    }
    if (level < 4) assert.equal(sideRule, 0); else assert.ok(sideRule / N > 0.25 && sideRule / N < 0.75, `L${level} side rule ${sideRule}`);
    assert.ok(conflict / N > 0.4, 'the sign is often on the other side from what the word says, so reading matters');
    assert.ok(Math.abs(ans.left - ans.right) / N < 0.15, `L${level}: left ${ans.left} right ${ans.right}`);
  }
  assert.ok(W.directions.some((d) => d.tier === 3));
});

test('Café Order: order size grows with level, every ordered thing is on the menu once, look-alike coffees from level 6', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 9, 12].map(cafeSize), [2, 2, 3, 3, 4, 6, 6]);
  let nearSeen = 0;
  for (let level = 1; level <= MAX_LEVEL; level++) for (let i = 0; i < 80; i++) {
    const { order, menu } = cafeOrder(W.cafe, level, seeded(`cafe${level}:${i}`));
    assert.equal(order.length, cafeSize(level)); assert.equal(new Set(order).size, order.length);
    for (const o of order) assert.equal(menu.filter((m) => m === o).length, 1);
    assert.ok(menu.length > order.length && menu.length <= 9);
    if (level < 5) assert.ok([...order, ...menu].every((x) => x.tier === 1), 'tier 1 words until level 5');
    if (level >= 6) { const fw = (x) => x.he.split(' ')[0]; if (menu.some((m) => !order.includes(m) && order.some((o) => fw(o) === fw(m)))) nearSeen++; }
  }
  assert.ok(nearSeen > 50, 'look-alike orders show up on the menu at higher levels');
  // Identity: tapping the menu at random brings a whole order of two about one time in thirteen at level 1, and almost never higher up
  const rnd = seeded('cafe-rand'); let wins = 0; const N = 3000;
  for (let i = 0; i < N; i++) { const { order, menu } = cafeOrder(W.cafe, 1, rnd); const pick = [...menu].sort(() => rnd() - 0.5).slice(0, order.length); if (pick.every((p, k) => p === order[k])) wins++; }
  assert.ok(wins / N < 0.1, `random tapping wins ${(wins / N).toFixed(3)}`);
});

test('Prayer Chain: real prayer words in order; the divine name is filled in, never a choice; a distractor never reads as the answer', () => {
  const lines = json('data/corpus/registry.json').entries.filter((e) => e.category === 'siddur' && e.he).map((e) => ({ id: e.id, title: e.title, en: e.english, words: lineWords(e.he) })).filter((e) => e.words.length >= 5);
  assert.ok(lines.length >= 30);
  let fixedSeen = 0;
  for (let level = 1; level <= MAX_LEVEL; level++) for (let i = 0; i < 60; i++) {
    const t = chainTrial(lines, level, seeded(`chain${level}:${i}`));
    const seq = [...t.given, ...t.steps.map((s) => s.word)];
    const at = t.line.words.join(' ').indexOf(seq.join(' ')); assert.ok(at >= 0, 'the stretch is the prayer itself, in order');
    if (level <= 4) assert.deepEqual(t.given, t.line.words.slice(0, t.given.length), 'early levels start at the opening words');
    for (const s of t.steps) {
      if (hasDivineName(s.word)) { assert.ok(s.fixed && s.options.length === 0, 'the name is never a choice'); fixedSeen++; continue; }
      assert.ok(!s.fixed); assert.equal(s.options.filter((o) => o === s.word).length, 1);
      assert.equal(new Set(s.options.map(bare)).size, s.options.length, 'no two choices read the same');
      assert.ok(s.options.every((o) => !hasDivineName(o)), 'the name is never offered as a distractor');
      assert.equal(s.options.length, level <= 2 ? 2 : level <= 5 ? 3 : 4);
    }
  }
  assert.ok(fixedSeen > 20, 'blessings that hold the name are played, with the name filled in');
  assert.ok(hasDivineName('לַיהוָה') && hasDivineName('כְּבוֹד־יְהוָה') && !hasDivineName('אֱלֹהֵינוּ'));
});

test('results: stars, and the "Hebrew you met" list keeps the newest distinct words', () => {
  assert.equal(starsFor({ correct: 0, accuracy: 0, maxLevel: 1 }), 0);
  assert.equal(starsFor({ correct: 3, accuracy: 60, maxLevel: 2 }), 1);
  assert.equal(starsFor({ correct: 8, accuracy: 80, maxLevel: 3 }), 2);
  assert.equal(starsFor({ correct: 12, accuracy: 92, maxLevel: 5 }), 3);
  assert.equal(starsFor({ correct: 12, accuracy: 92, maxLevel: 3 }), 2, 'three stars need level 4');
  const m = uniqueMet([{ he: 'א', en: '1' }, { he: 'ב', en: '2' }, { he: 'א', en: '1b' }, { en: 'no hebrew' }], 8);
  assert.deepEqual(m.map((x) => x.en), ['2', '1b']);
  assert.equal(uniqueMet(Array.from({ length: 20 }, (_, i) => ({ he: String(i) })), 8).length, 8);
});

test('the Brain Lab page wires the new games: No time limits stops the clock, Rimon reacts, pictures appear only once approved', () => {
  const v = readFileSync('src/lab/lab.view.js', 'utf8');
  assert.match(v, /untimedOn\(ctx\)/, 'Settings > No time limits works in Brain Lab, as it does in Word Sprint');
  assert.match(v, /signalRimon\(/);
  assert.match(v, /LAB_v2_\$\{id\}_cover/); assert.match(v, /LAB_v2_\$\{id\}_win/); assert.match(v, /LAB_v2_\$\{g\.id\}/); assert.match(v, /'LAB_v2_hero'/);
  assert.match(v, /ctx\.img\?\.\(h, \{ kind: 'id'/, 'art goes through the shared image resolver (approved pictures only)');
  assert.match(v, /shortcutsOn\(ctx\)/, 'letter keys respect the single-key shortcut setting');
  const g2 = readFileSync('src/lab/lab.games2.js', 'utf8');
  assert.match(g2, /if \(!env\.calm\)/, 'the vowel drop does not move in calm mode or with reduced motion');
});
