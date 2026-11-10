// 3D Studio Brain Lab games (2026-11-10). Lumosity-style timed trainers with CSS 3D depth.
// All Hebrew comes from Aleph's verified lists (letters, syllables, number words, word families).
// Nothing is typed in by hand. The four-letter divine name and its prefixed forms are never used as targets.
import { randInt, shuffle, sample, choices, consonants, hasPattern } from './lab.core.js';
import { hebrewNumeral } from '../curriculum/calendar.js';
import { isNameWord, findName } from '../shell/names.js';

const url = (p) => new URL(`../../${p}`, import.meta.url);
async function getJSON(env, p) {
  const f = env.ctx?.fetchFn || env.ctx?.fetch || globalThis.fetch;
  const res = await f(url(p));
  if (!res.ok) throw new Error(`could not load ${p}`);
  return res.json();
}
const cache = new Map();
const once = (key, fn) => { if (!cache.has(key)) cache.set(key, fn().catch((e) => { cache.delete(key); throw e; })); return cache.get(key); };

/** True when a Hebrew string should stay held (the four-letter name, a prefix form, or the two-yod abbreviation). */
export function holdsDivineName(he) {
  const s = String(he || '');
  if (!s) return false;
  if (isNameWord(s)) return true;
  return findName(s).some((w) => w.kind === 'exact' || w.kind === 'prefixed' || w.kind === 'abbrev');
}

const loadLetters = (env) => once('letters', async () => {
  const raw = await getJSON(env, 'data/letters/letters.json');
  return (Array.isArray(raw) ? raw : raw.letters || []).map((l) => ({
    id: l.id, he: l.he, name: l.name, nameHe: l.nameHe, gematria: l.gematria,
    confusableWith: l.confusableWith || [], isFinal: /-final$/.test(l.id),
  }));
});
const loadSyllables = (env) => once('syllables', async () => (await getJSON(env, 'data/lab/syllables.json')).syllables);
const loadNumbers = (env) => once('numbers', async () => (await getJSON(env, 'data/lab/numbers.json')).numbers);
const loadFamilies = (env) => once('families', async () => {
  const raw = await getJSON(env, 'data/roots/families.json');
  const fams = [];
  const allWords = [];
  for (const f of raw.families || []) {
    const root = consonants(f.root);
    const words = (f.words || []).filter((w) => w.he && w.en && !holdsDivineName(w.he)).map((w) => ({
      id: w.id, he: w.he, en: shortEnglish(w.en), unpointed: w.unpointed || consonants(w.he),
      level: w.level, translit: w.translit, root, rootHe: f.root,
    }));
    allWords.push(...words);
    const withRoot = root.length === 3 ? words.filter((w) => hasPattern(w.he, root)) : words;
    if (withRoot.length >= 1) fams.push({ root, rootHe: f.root, words: withRoot, easy: withRoot.filter((w) => w.level === 'A1' || w.level === 'A2') });
  }
  return { fams, allWords };
});

const big = (env, he, cls = 'lab-glyph') => env.heSpan(he, `he ${cls}`);
const mark = (b, ok) => { b.classList.add(ok ? 'is-right' : 'is-wrong'); };
const reduced = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
function burst(el) {
  if (!el || reduced()) { el?.classList.add('is-burst'); return; }
  el.classList.add('is-burst');
  for (let i = 0; i < 10; i++) {
    const p = el.ownerDocument.createElement('i');
    p.className = 'lab-spark-bit';
    p.style.setProperty('--a', `${(i / 10) * 360}deg`);
    p.style.setProperty('--d', `${12 + (i % 4) * 6}px`);
    el.append(p);
  }
}
function grid(env, n, cols, render, onTap, label, cellClass = 'lab-cell lab-tile3d') {
  const cells = [];
  const el = env.h('div', { class: 'lab-grid lab-stage', role: 'group', 'aria-label': label, style: `--cols:${cols}` });
  for (let i = 0; i < n; i++) {
    const b = env.h('button', { type: 'button', class: cellClass, onclick: () => onTap(i, b) });
    render(i, b); cells.push(b); el.append(b);
  }
  return { el, cells };
}

const VOWEL_SAY = Object.freeze({
  a: { en: 'the “a” sound', he: 'פַּתָּח / קָמַץ' },
  e: { en: 'the “e” sound', he: 'סֶגּוֹל / צֵירֵי' },
  i: { en: 'the “i” sound', he: 'חִירִיק' },
  o: { en: 'the “o” sound', he: 'חוֹלָם' },
  u: { en: 'the “u” sound', he: 'שֻׁרוּק / קֻבּוּץ' },
});

const uniqueBy = (arr, key) => {
  const seen = new Set(), out = [];
  for (const x of arr) { const k = key(x); if (seen.has(k)) continue; seen.add(k); out.push(x); }
  return out;
};

/** Cap a dictionary gloss at about three words or 22 characters, cutting only at a word boundary. Never invents wording. */
export function shortEnglish(en, maxChars = 22, maxWords = 3) {
  const s = String(en || '').split(/[;,]/)[0].trim();
  if (!s) return '';
  const words = s.split(/\s+/).slice(0, maxWords);
  const joined = words.join(' ');
  if (joined.length <= maxChars) return joined;
  let out = '';
  for (const w of words) {
    const next = out ? `${out} ${w}` : w;
    if (out && next.length > maxChars) break;
    out = next;
  }
  return out || words[0];
}


// ---------- Pure puzzle builders (tested) ----------

/** Word Burst: a grid with one target word hidden among other verified words. */
export function wordBurstPuzzle(words, level, rnd = Math.random) {
  const pool = uniqueBy(words.filter((w) => w.he && w.en && !holdsDivineName(w.he)), (w) => consonants(w.he));
  const side = level <= 2 ? 3 : level <= 5 ? 4 : level <= 8 ? 5 : 6;
  const n = side * side;
  const targets = Math.min(1 + Math.floor(level / 4), 3, n - 2);
  const easy = pool.filter((w) => w.level === 'A1' || w.level === 'A2');
  const src = (level <= 4 && easy.length >= n ? easy : pool);
  const target = src[randInt(rnd, src.length)];
  const others = sample(src.filter((w) => consonants(w.he) !== consonants(target.he)), n - targets, rnd);
  const board = shuffle([...Array(targets).fill(target), ...others], rnd);
  const showEn = level <= 3;
  const targetShort = { ...target, en: shortEnglish(target.en) };
  return { target: targetShort, board: board.map((w) => (w === target ? targetShort : { ...w, en: shortEnglish(w.en) })), cols: side, targets, showEn };
}

/** Migration Birds: a flock with a unique highest value, labelled as a Hebrew numeral or a number word. */
export function migrationPuzzle(numbers, level, rnd = Math.random) {
  const pool = numbers.filter((x) => Number.isInteger(x.value) && x.value > 0);
  const n = level <= 2 ? 4 : level <= 5 ? 6 : level <= 8 ? 8 : 10;
  let birds, guard = 0;
  do {
    const set = sample(pool, Math.min(n, pool.length), rnd);
    const max = Math.max(...set.map((x) => x.value));
    const winners = set.filter((x) => x.value === max);
    if (winners.length === 1) {
      birds = set.map((x, i) => {
        // 1000 has no standard 1..999 numeral form in this app; that bird always shows the number word.
        const asNumeral = x.value <= 999 && (level >= 4 ? true : rnd() < 0.5);
        const label = asNumeral ? hebrewNumeral(x.value) : x.he;
        return { i, value: x.value, he: x.he, tr: x.tr, label, asNumeral, kind: asNumeral ? 'numeral' : 'word' };
      });
      break;
    }
    guard++;
  } while (guard < 40);
  if (!birds) {
    const sorted = shuffle(pool, rnd).slice(0, Math.min(n, pool.length));
    const high = Math.max(...sorted.map((x) => x.value));
    const unique = sorted.filter((x) => x.value !== high).concat([pool.find((x) => x.value === high) || sorted[0]]);
    birds = unique.slice(0, n).map((x, i) => ({ i, value: x.value, he: x.he, tr: x.tr, label: x.value <= 999 && level >= 4 ? hebrewNumeral(x.value) : x.he, asNumeral: x.value <= 999 && level >= 4, kind: x.value <= 999 && level >= 4 ? 'numeral' : 'word' }));
  }
  const answerValue = Math.max(...birds.map((b) => b.value));
  const speedMs = Math.max(2600, 8800 - level * 480);
  return { birds, answerValue, answerIndex: birds.findIndex((b) => b.value === answerValue), speedMs };
}

const STAR_SHAPES = Object.freeze(['four', 'five', 'six']);

/** Star Search: one odd item out, by letter, vowel or star shape. */
export function starSearchPuzzle(letters, syllables, level, rnd = Math.random) {
  const n = level <= 2 ? 6 : level <= 5 ? 8 : level <= 8 ? 12 : 16;
  const kinds = level <= 2 ? ['letter'] : level <= 5 ? ['letter', 'shape'] : ['letter', 'shape', 'vowel'];
  const kind = kinds[randInt(rnd, kinds.length)];
  const cols = n <= 6 ? 3 : n <= 8 ? 4 : n <= 12 ? 4 : 4;
  if (kind === 'vowel') {
    const vows = ['a', 'e', 'i', 'o', 'u'];
    const major = vows[randInt(rnd, vows.length)];
    let oddV = vows.filter((v) => v !== major)[randInt(rnd, 4)];
    const majors = syllables.filter((s) => s.vowel === major);
    const odds = syllables.filter((s) => s.vowel === oddV);
    const oddIndex = randInt(rnd, n);
    const items = Array.from({ length: n }, (_, i) => {
      const s = i === oddIndex ? odds[randInt(rnd, odds.length)] : majors[randInt(rnd, majors.length)];
      return { i, he: s.he, tr: s.tr, id: s.id, vowel: s.vowel, letter: s.letter, shape: 'five', odd: i === oddIndex };
    });
    return { kind, items, oddIndex, cols, prompt: { en: `the star whose vowel is not ${VOWEL_SAY[major].en.replace('the ', '')}`, he: VOWEL_SAY[oddV].he } };
  }
  if (kind === 'shape') {
    const base = letters.filter((l) => !l.isFinal);
    const letter = base[randInt(rnd, base.length)];
    const majorShape = STAR_SHAPES[randInt(rnd, STAR_SHAPES.length)];
    const oddShape = STAR_SHAPES.filter((s) => s !== majorShape)[randInt(rnd, 2)];
    const oddIndex = randInt(rnd, n);
    const items = Array.from({ length: n }, (_, i) => ({
      i, he: letter.he, tr: letter.name, id: `${letter.id}-${i}`, vowel: null, letter: letter.id,
      shape: i === oddIndex ? oddShape : majorShape, odd: i === oddIndex,
    }));
    return { kind, items, oddIndex, cols, prompt: { en: 'the star with a different shape', he: letter.he } };
  }
  const base = letters.filter((l) => !l.isFinal);
  const major = level >= 4 && base.some((l) => l.confusableWith.length)
    ? (base.filter((l) => l.confusableWith.length)[randInt(rnd, base.filter((l) => l.confusableWith.length).length)])
    : base[randInt(rnd, base.length)];
  const twinIds = major.confusableWith || [];
  const twins = base.filter((l) => twinIds.includes(l.id));
  const oddLetter = twins.length && level >= 4 ? twins[randInt(rnd, twins.length)] : base.filter((l) => l.id !== major.id)[randInt(rnd, base.length - 1)];
  const oddIndex = randInt(rnd, n);
  const items = Array.from({ length: n }, (_, i) => {
    const l = i === oddIndex ? oddLetter : major;
    return { i, he: l.he, tr: l.name, id: `${l.id}-${i}`, vowel: null, letter: l.id, shape: 'five', odd: i === oddIndex };
  });
  return { kind, items, oddIndex, cols, prompt: { en: 'the star with a different letter', he: oddLetter.he } };
}

/** Root Forge: letter tiles that spell one verified family word of the shown root. */
export function rootForgePuzzle(fams, level, rnd = Math.random) {
  const easy = fams.filter((f) => (f.easy || f.words).some((w) => (w.unpointed || consonants(w.he)).length >= 2 && (w.unpointed || consonants(w.he)).length <= (level <= 4 ? 4 : 6)));
  const pool = easy.length ? easy : fams;
  const fam = pool[randInt(rnd, pool.length)];
  const candidates = (level <= 4 ? (fam.easy || fam.words) : fam.words).filter((w) => {
    const u = w.unpointed || consonants(w.he);
    return u.length >= 2 && u.length <= (level <= 3 ? 4 : 6);
  });
  const target = (candidates.length ? candidates : fam.words)[randInt(rnd, (candidates.length ? candidates : fam.words).length)];
  const spelling = [...(target.unpointed || consonants(target.he))];
  const alef = 'אבגדהוזחטיכלמנסעפצקרשת';
  const extraN = Math.min(2 + Math.floor(level / 3), 6);
  const extras = [];
  while (extras.length < extraN) {
    const ch = alef[randInt(rnd, alef.length)];
    extras.push(ch);
  }
  const tiles = shuffle(spelling.map((ch, i) => ({ ch, need: i })) .concat(extras.map((ch) => ({ ch, need: -1}))), rnd)
    .map((t, i) => ({ ...t, i }));
  // Re-stamp need indexes after shuffle: we need a bag of letters, not positional need.
  // Rebuild as a bag: each spelling letter must be used once, in order.
  const bag = shuffle([...spelling, ...extras], rnd).map((ch, i) => ({ i, ch }));
  return { rootHe: fam.rootHe, root: fam.root, target, spelling, tiles: bag, showEn: true };
}
export function rootForgeNextOk(spelling, soFar, ch) {
  return spelling[soFar.length] === ch;
}

/** Letter Sequence: the next letter in a real alef-bet pattern (forward, backward, or skip). */
export function letterSequencePuzzle(letters, level, rnd = Math.random) {
  const alef = letters.filter((l) => !l.isFinal).slice().sort((a, b) => a.gematria - b.gematria);
  // 22-letter order by gematria (1,2,3...10,20,...) matches alef-bet order.
  const kinds = level <= 2 ? ['next'] : level <= 5 ? ['next', 'skip2'] : level <= 8 ? ['next', 'skip2', 'back'] : ['next', 'skip2', 'skip3', 'back'];
  const kind = kinds[randInt(rnd, kinds.length)];
  const stepN = kind === 'back' ? -1 : kind === 'skip2' ? 2 : kind === 'skip3' ? 3 : 1;
  const shownN = level <= 3 ? 3 : 4;
  const minI = stepN < 0 ? shownN * Math.abs(stepN) : 0;
  const maxI = stepN < 0 ? alef.length - 1 : alef.length - 1 - shownN * stepN;
  const start = minI + randInt(rnd, Math.max(1, maxI - minI + 1));
  const idx = [];
  for (let k = 0; k <= shownN; k++) idx.push(start + k * stepN);
  if (idx.some((i) => i < 0 || i >= alef.length)) {
    // fall back to a simple next-letter puzzle
    const s = randInt(rnd, alef.length - shownN - 1);
    const shown = alef.slice(s, s + shownN);
    const answer = alef[s + shownN];
    const opts = choices(answer, alef.filter((l) => l.id !== answer.id).concat([answer]), 4, rnd, (a, b) => a.id === b.id);
    return { kind: 'next', shown, answer, choices: opts, step: 1, hint: 'the next letter of the alef-bet' };
  }
  const shown = idx.slice(0, shownN).map((i) => alef[i]);
  const answer = alef[idx[shownN]];
  const opts = choices(answer, alef, 4, rnd, (a, b) => a.id === b.id);
  const hint = kind === 'back' ? 'the previous letter of the alef-bet'
    : kind === 'skip2' ? 'every second letter of the alef-bet'
    : kind === 'skip3' ? 'every third letter of the alef-bet'
    : 'the next letter of the alef-bet';
  return { kind, shown, answer, choices: opts, step: stepN, hint: level <= 6 ? hint : 'the same pattern' };
}

/** Speed Match: is the new item the same as the last one, or (at higher levels) the same letter / same vowel? */
export function speedMatchPuzzle(prev, pool, level, rnd = Math.random) {
  const rules = level <= 3 ? ['same'] : level <= 7 ? ['same', 'sameLetter'] : ['same', 'sameLetter', 'sameVowel'];
  const rule = rules[randInt(rnd, rules.length)];
  const wantYes = rnd() < 0.5;
  let item;
  if (!prev) {
    item = pool[randInt(rnd, pool.length)];
    return { item, prev: null, answer: null, rule: 'same', first: true };
  }
  if (rule === 'same') {
    item = wantYes ? prev : pool.filter((x) => x.id !== prev.id)[randInt(rnd, Math.max(1, pool.length - 1))];
    if (!item) item = prev;
    return { item, prev, answer: item.id === prev.id, rule, first: false, question: 'Same as the last one?' };
  }
  if (rule === 'sameLetter') {
    const same = pool.filter((x) => x.letter === prev.letter);
    const diff = pool.filter((x) => x.letter !== prev.letter);
    item = wantYes && same.length ? same[randInt(rnd, same.length)] : (diff[randInt(rnd, diff.length)] || pool[0]);
    return { item, prev, answer: item.letter === prev.letter, rule, first: false, question: 'Same letter as the last one?' };
  }
  const same = pool.filter((x) => x.vowel === prev.vowel);
  const diff = pool.filter((x) => x.vowel !== prev.vowel);
  item = wantYes && same.length ? same[randInt(rnd, same.length)] : (diff[randInt(rnd, diff.length)] || pool[0]);
  return { item, prev, answer: item.vowel === prev.vowel, rule, first: false, question: 'Same vowel sound as the last one?' };
}

/** Letter Span: a short sequence to recall in order. */
export function letterSpanPuzzle(letters, level, rnd = Math.random) {
  const base = letters.filter((l) => !l.isFinal);
  const len = Math.min(2 + Math.floor((level - 1) / 2), 7);
  const seq = sample(base, len, rnd);
  const pad = Math.min(base.length, Math.max(6, len + 3 + Math.floor(level / 3)));
  const keyboard = shuffle([...seq, ...sample(base.filter((l) => !seq.includes(l)), pad - len, rnd)], rnd);
  const showMs = Math.max(420, 1100 - level * 40) * len;
  const perMs = Math.max(420, 1100 - level * 40);
  return { seq, keyboard, showMs, perMs };
}
export function letterSpanOk(seq, taps) {
  if (taps.length !== seq.length) return false;
  return taps.every((t, i) => t.id === seq[i].id);
}

/** Vowel Rain: falling syllables; only some match the target vowel. */
export function vowelRainPuzzle(syllables, level, rnd = Math.random) {
  const vows = ['a', 'e', 'i', 'o', 'u'];
  const targetVowel = vows[randInt(rnd, vows.length)];
  const n = level <= 2 ? 4 : level <= 5 ? 5 : level <= 8 ? 6 : 7;
  const matchesWanted = Math.min(1 + Math.floor(level / 4), n - 1);
  const hit = sample(syllables.filter((s) => s.vowel === targetVowel), matchesWanted, rnd);
  const miss = sample(syllables.filter((s) => s.vowel !== targetVowel), n - matchesWanted, rnd);
  const falling = shuffle([...hit.map((s) => ({ ...s, match: true })), ...miss.map((s) => ({ ...s, match: false }))], rnd)
    .map((s, i) => ({ ...s, i, x: 3 + Math.round((i / Math.max(1, n - 1)) * 72) }));
  const fallMs = Math.max(2400, 7200 - level * 360);
  return { targetVowel, label: VOWEL_SAY[targetVowel], falling, matchCount: hit.length, fallMs };
}

/** Tile Turn: a letter rotated in space; pick the matching upright letter. */
export function tileTurnPuzzle(letters, level, rnd = Math.random) {
  const base = letters.filter((l) => !l.isFinal);
  const letter = base[randInt(rnd, base.length)];
  const rots = level <= 2 ? [90, 270] : [90, 180, 270];
  const rot = rots[randInt(rnd, rots.length)];
  const twins = letter.confusableWith.map((id) => base.find((l) => l.id === id)).filter(Boolean);
  const pool = level >= 4 && twins.length ? uniqueBy([...twins, ...base], (l) => l.id) : base;
  const opts = choices(letter, pool, level <= 3 ? 3 : 4, rnd, (a, b) => a.id === b.id);
  return { letter, rot, choices: opts, showName: level <= 2 };
}

const DIRS = Object.freeze([[1, 0], [-1, 0], [0, 1], [0, -1]]);

function embedPath(side, length, rnd) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const start = [randInt(rnd, side), randInt(rnd, side)];
    const path = [start];
    const used = new Set([start.join(',')]);
    let ok = true;
    for (let i = 1; i < length; i++) {
      const [x, y] = path[i - 1];
      const opts = DIRS.map(([dx, dy]) => [x + dx, y + dy]).filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < side && ny < side && !used.has(`${nx},${ny}`));
      if (!opts.length) { ok = false; break; }
      const next = opts[randInt(rnd, opts.length)];
      path.push(next); used.add(next.join(','));
    }
    if (ok) return path;
  }
  // straight row fallback
  const y = 0, path = [];
  for (let x = 0; x < length; x++) path.push([x, y]);
  return path;
}

/** Path Word: a verified word is embedded as a connected path on a letter grid. */
export function pathWordPuzzle(words, level, rnd = Math.random) {
  const pool = uniqueBy(words.filter((w) => {
    const u = w.unpointed || consonants(w.he);
    return u.length >= 3 && u.length <= (level <= 3 ? 4 : 5) && !holdsDivineName(w.he) && (level > 4 || w.level === 'A1' || w.level === 'A2');
  }), (w) => w.unpointed || consonants(w.he));
  const src = pool.length ? pool : uniqueBy(words.filter((w) => (w.unpointed || consonants(w.he)).length >= 3 && !holdsDivineName(w.he)), (w) => w.unpointed || consonants(w.he));
  const word = src[randInt(rnd, src.length)];
  const spelling = [...(word.unpointed || consonants(word.he))];
  const side = Math.max(spelling.length, level <= 3 ? 3 : 4);
  const path = embedPath(side, spelling.length, rnd);
  const alef = 'אבגדהוזחטיכלמנסעפצקרשת';
  const grid = Array.from({ length: side }, () => Array(side).fill(null));
  path.forEach(([x, y], i) => { grid[y][x] = spelling[i]; });
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    if (!grid[y][x]) grid[y][x] = alef[randInt(rnd, alef.length)];
  }
  return { word, spelling, grid, path, side, showHe: level <= 3, showEn: true };
}
export function pathWordFollows(path) {
  if (!path.length) return false;
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1], [bx, by] = path[i];
    if (Math.abs(ax - bx) + Math.abs(ay - by) !== 1) return false;
    for (let j = 0; j < i; j++) if (path[j][0] === bx && path[j][1] === by) return false;
  }
  return true;
}
export function pathWordReads(grid, path) {
  return path.map(([x, y]) => grid[y][x]).join('');
}


const loadLabWords = (env) => once('lab-words', async () => {
  const raw = await getJSON(env, 'data/lab/words.json');
  const nums = await loadNumbers(env);
  const out = [];
  for (const row of [...(raw.cafe || []), ...(raw.directions || [])]) {
    if (!row?.he || holdsDivineName(row.he)) continue;
    const clip = row.clip && row.clip.kind && row.clip.id ? row.clip : null;
    out.push({ id: row.id, he: row.he, en: shortEnglish(row.en), tr: row.tr || '', clip, level: row.tier === 1 ? 'A1' : 'A2' });
  }
  for (const n of nums) {
    if (!n?.he || holdsDivineName(n.he)) continue;
    // Number clips in numbers.json are a bare id (the word recording). Kind is always "word".
    const clip = n.clip ? (typeof n.clip === 'string' ? { kind: 'word', id: n.clip } : n.clip) : null;
    out.push({ id: n.id, he: n.he, en: shortEnglish(n.en || ''), tr: n.tr || '', clip, level: 'A1' });
  }
  return uniqueBy(out, (w) => consonants(w.he));
});

/** Echo Hunt: one recorded (or written) target word among other verified words from the same lists. */
/** Prefer a vocab-id word recording when the player has it, else the listed clip (phrasebook or lesson id). */
export function resolveWordClip(word, hasClip) {
  if (word?.id && hasClip?.('word', word.id)) return { kind: 'word', id: word.id };
  if (word?.clip?.kind && word.clip.id && (!hasClip || hasClip(word.clip.kind, word.clip.id))) return word.clip;
  return word?.clip?.kind && word.clip.id ? word.clip : null;
}

export function echoHuntPuzzle(words, level, rnd = Math.random) {
  const pool = uniqueBy(words.filter((w) => w.he && !holdsDivineName(w.he) && (w.tr || w.en)), (w) => consonants(w.he));
  const n = level <= 3 ? 3 : level <= 6 ? 4 : 5;
  const withClip = pool.filter((w) => w.clip && w.clip.kind && w.clip.id);
  const src = withClip.length >= n ? withClip : pool;
  const target = src[randInt(rnd, src.length)];
  const others = sample(src.filter((w) => consonants(w.he) !== consonants(target.he)), Math.min(n - 1, src.length - 1), rnd);
  const choices = shuffle([target, ...others], rnd);
  return { target, choices, cols: choices.length, hasClip: !!(target.clip && target.clip.kind && target.clip.id) };
}

// ---------- Drills ----------

const wordburst = {
  load: async (env) => (await loadFamilies(env)).allWords,
  trial(env, level) {
    const pz = wordBurstPuzzle(env.data, level, env.rnd);
    return new Promise((resolve) => {
      const t0 = env.now(); let found = 0;
      env.prompt(env.h('span', {}, 'Find every ', big(env, pz.target.he, 'lab-inline'), pz.showEn ? `  ${pz.target.en}` : ''));
      const g = grid(env, pz.board.length, pz.cols, (i, b) => {
        // Tiles show Hebrew only, so the search is a reading task; the English meaning stays in the prompt on easy levels.
        b.append(big(env, pz.board[i].he, 'lab-word'));
        b.setAttribute('aria-label', pz.board[i].he);
      }, (i, b) => {
        if (b.disabled) return;
        const hit = consonants(pz.board[i].he) === consonants(pz.target.he);
        if (hit) {
          b.disabled = true; mark(b, true); burst(b); found++;
          if (found === pz.targets) resolve({ ok: true, ms: env.now() - t0, par: 900 * pz.targets + 900 });
        } else { mark(b, false); env.say(`That is ${pz.board[i].en}.`); resolve({ ok: false, ms: env.now() - t0 }); }
      }, 'Word field', 'lab-cell lab-tile3d lab-wordcell');
      env.board.replaceChildren(g.el);
      env.keys((k) => {
        const n = Number(k);
        if (n >= 1 && n <= g.cells.length) g.cells[n - 1].click();
      });
    });
  },
};

const migration = {
  load: loadNumbers,
  trial(env, level) {
    const pz = migrationPuzzle(env.data, level, env.rnd);
    return new Promise((resolve) => {
      const t0 = env.now(); let done = false;
      const finish = (r) => { if (!done) { done = true; resolve(r); } };
      env.prompt('Tap the bird with the highest number.');
      const sky = env.h('div', { class: `lab-sky lab-stage${reduced() ? ' is-still' : ''}`, role: 'group', 'aria-label': 'Flock of birds' });
      const buttons = pz.birds.map((b, i) => {
        const btn = env.h('button', {
          type: 'button',
          class: 'lab-bird lab-tile3d',
          // Each bird gets its own lane and a staggered start, so the flock is spread across the sky from the first frame.
          style: `--ms:${pz.speedMs}ms;--top:${4 + ((i * 37) % 80)}%;--delay:${-Math.round((i / pz.birds.length) * pz.speedMs * 0.45)}ms`,
          'aria-label': `${b.tr}, ${b.value}${b.asNumeral ? ', Hebrew numeral' : ''}`,
          onclick: () => {
            const ok = b.value === pz.answerValue;
            mark(btn, ok);
            if (!ok) {
              env.say(`The highest was ${pz.birds[pz.answerIndex].label}, ${pz.answerValue}.`);
              buttons[pz.answerIndex].classList.add('is-reveal');
            } else burst(btn);
            finish({ ok, ms: env.now() - t0, par: Math.min(2200, pz.speedMs * 0.35) });
          },
        }, env.h('span', { class: 'lab-bird-body', 'aria-hidden': 'true' }, '✦'), big(env, b.label, 'lab-word lab-bird-he'));
        sky.append(btn);
        return btn;
      });
      env.board.replaceChildren(sky);
      env.keys((k) => {
        const n = Number(k);
        if (n >= 1 && n <= buttons.length) buttons[n - 1].click();
      });
      env.timeLimit(pz.speedMs, () => finish({ ok: false, ms: pz.speedMs }));
    });
  },
};

const starsearch = {
  load: async (env) => ({ letters: await loadLetters(env), syllables: await loadSyllables(env) }),
  trial(env, level) {
    const pz = starSearchPuzzle(env.data.letters, env.data.syllables, level, env.rnd);
    return new Promise((resolve) => {
      const t0 = env.now();
      env.prompt(env.h('span', {}, 'Tap ', env.h('b', {}, pz.prompt.en), '.'));
      const g = grid(env, pz.items.length, pz.cols, (i, b) => {
        const it = pz.items[i];
        b.classList.add('lab-star', `is-${it.shape}`);
        b.append(big(env, it.he, 'lab-glyph'));
        b.setAttribute('aria-label', `${it.tr}, ${it.shape}-point star`);
      }, (i, b) => {
        const ok = pz.items[i].odd;
        mark(b, ok);
        if (!ok) { g.cells[pz.oddIndex].classList.add('is-reveal'); env.say('That was not the odd one out.'); }
        else burst(b);
        resolve({ ok, ms: env.now() - t0, par: 1600 + pz.items.length * 80 });
      }, 'Stars', 'lab-cell lab-tile3d lab-star');
      env.board.replaceChildren(g.el);
      env.keys((k) => {
        const n = Number(k);
        if (n >= 1 && n <= g.cells.length) g.cells[n - 1].click();
      });
    });
  },
};

const rootforge = {
  load: async (env) => (await loadFamilies(env)).fams,
  trial(env, level) {
    const pz = rootForgePuzzle(env.data, level, env.rnd);
    return new Promise((resolve) => {
      const t0 = env.now(); const soFar = [];
      const built = env.h('p', { class: 'lab-sum lab-built', 'aria-live': 'polite' }, '…');
      env.prompt(env.h('span', {}, 'Build the word for ', env.h('b', {}, `“${pz.target.en}”`), ' from the root ', big(env, pz.rootHe, 'lab-inline')));
      const g = grid(env, pz.tiles.length, Math.min(6, pz.tiles.length), (i, b) => {
        b.append(big(env, pz.tiles[i].ch, 'lab-glyph'));
        b.setAttribute('aria-label', pz.tiles[i].ch);
      }, (i, b) => {
        if (b.disabled) return;
        const ch = pz.tiles[i].ch;
        if (rootForgeNextOk(pz.spelling, soFar, ch)) {
          b.disabled = true; mark(b, true); soFar.push(ch);
          built.textContent = soFar.join('');
          if (soFar.length === pz.spelling.length) { burst(b); resolve({ ok: true, ms: env.now() - t0, par: 1400 * pz.spelling.length }); }
        } else {
          mark(b, false);
          env.say(`The word is ${pz.target.he}, ${pz.target.en}.`);
          resolve({ ok: false, ms: env.now() - t0 });
        }
      }, 'Letter tiles');
      env.board.replaceChildren(g.el, built);
    });
  },
};

const letterseq = {
  load: loadLetters,
  trial(env, level) {
    const pz = letterSequencePuzzle(env.data, level, env.rnd);
    return new Promise((resolve) => {
      const t0 = env.now();
      env.prompt(env.h('span', {}, 'What comes next? ', env.h('span', { class: 'lab-val' }, pz.hint)));
      const row = env.h('div', { class: 'lab-seq lab-stage', 'aria-label': 'Letter pattern' },
        ...pz.shown.map((l) => env.h('span', { class: 'lab-cell lab-tile3d is-static' }, big(env, l.he, 'lab-glyph'))),
        env.h('span', { class: 'lab-cell lab-tile3d is-ask', 'aria-hidden': 'true' }, '?'));
      const g = grid(env, pz.choices.length, pz.choices.length, (i, b) => {
        b.append(big(env, pz.choices[i].he, 'lab-glyph'));
        b.setAttribute('aria-label', pz.choices[i].name);
      }, (i, b) => {
        const ok = pz.choices[i].id === pz.answer.id;
        mark(b, ok);
        if (!ok) env.say(`It was ${pz.answer.name}, ${pz.answer.he}.`);
        else burst(b);
        resolve({ ok, ms: env.now() - t0, par: 2000 });
      }, 'Next letter');
      env.board.replaceChildren(row, g.el);
      env.keys((k) => {
        const n = Number(k);
        if (n >= 1 && n <= g.cells.length) g.cells[n - 1].click();
      });
    });
  },
};

const speedmatch = {
  load: loadSyllables,
  trial(env, level) {
    const limit = Math.max(900, 3400 - level * 180);
    const playCompare = (resolve, prev) => {
      const pz = speedMatchPuzzle(prev, env.data, level, env.rnd);
      env.memo.smPrev = pz.item;
      const t0 = env.now(); let done = false;
      const finish = (r) => { if (!done) { done = true; resolve(r); } };
      const pick = (yes, b) => {
        const ok = yes === pz.answer;
        mark(b, ok);
        if (!ok) env.say(pz.answer ? 'Yes, it matched.' : 'No, it was different.');
        finish({ ok, ms: env.now() - t0, par: 1100 });
      };
      env.prompt(pz.question);
      const card = env.h('div', { class: 'lab-card lab-tile3d lab-flip' }, big(env, pz.item.he, 'lab-glyph lab-huge'));
      const no = env.h('button', { type: 'button', class: 'btn secondary lab-yn', onclick: () => pick(false, no) }, 'No');
      const yes = env.h('button', { type: 'button', class: 'btn lab-yn', onclick: () => pick(true, yes) }, 'Yes');
      env.board.replaceChildren(card, env.h('div', { class: 'lab-row' }, no, yes));
      env.keys((k) => { if (k === 'ArrowLeft') pick(false, no); else if (k === 'ArrowRight') pick(true, yes); });
      env.timeLimit(limit, () => finish({ ok: false, ms: limit }));
    };
    return new Promise((resolve) => {
      if (env.memo.smPrev) { playCompare(resolve, env.memo.smPrev); return; }
      const first = speedMatchPuzzle(null, env.data, level, env.rnd);
      env.memo.smPrev = first.item;
      env.prompt('Remember this one…');
      env.board.replaceChildren(env.h('div', { class: 'lab-card lab-tile3d lab-flip' }, big(env, first.item.he, 'lab-glyph lab-huge')));
      env.later(() => playCompare(resolve, first.item), reduced() ? 200 : 800);
    });
  },
};

const letterspan = {
  load: loadLetters,
  trial(env, level) {
    const pz = letterSpanPuzzle(env.data, level, env.rnd);
    return new Promise((resolve) => {
      let open = false, t0 = 0;
      const taps = [];
      env.prompt('Remember the letters…');
      const seqRow = env.h('div', { class: 'lab-seq lab-stage', 'aria-label': 'Letters to remember' },
        ...pz.seq.map((l) => env.h('span', { class: 'lab-cell lab-tile3d is-static' }, big(env, l.he, 'lab-glyph'))));
      env.board.replaceChildren(seqRow);
      env.later(() => {
        seqRow.replaceChildren();
        open = true; t0 = env.now();
        env.prompt('Tap those letters in the same order.');
        const g = grid(env, pz.keyboard.length, Math.min(6, pz.keyboard.length), (i, b) => {
          b.append(big(env, pz.keyboard[i].he, 'lab-glyph'));
          b.setAttribute('aria-label', pz.keyboard[i].name);
        }, (i, b) => {
          if (!open) return;
          taps.push(pz.keyboard[i]);
          b.classList.add('is-picked');
          if (taps.length === pz.seq.length) {
            const ok = letterSpanOk(pz.seq, taps);
            if (ok) { mark(b, true); burst(b); } else { mark(b, false); env.say(`It was ${pz.seq.map((l) => l.name).join(', ')}.`); }
            resolve({ ok, ms: env.now() - t0, par: 900 * pz.seq.length + 800 });
          }
        }, 'Letter choices');
        env.board.replaceChildren(g.el);
      }, pz.showMs);
    });
  },
};

const vowelrain = {
  load: loadSyllables,
  trial(env, level) {
    const pz = vowelRainPuzzle(env.data, level, env.rnd);
    return new Promise((resolve) => {
      const t0 = env.now(); let done = false, found = 0;
      const finish = (r) => { if (!done) { done = true; resolve(r); } };
      env.prompt(env.h('span', {}, 'Tap every syllable with ', env.h('b', {}, pz.label.en), ' ', env.heSpan(pz.label.he, 'he lab-inline-sm')));
      const sky = env.h('div', { class: `lab-rain lab-stage${reduced() ? ' is-still' : ''}`, role: 'group', 'aria-label': 'Falling syllables' });
      const buttons = pz.falling.map((s) => {
        const b = env.h('button', {
          type: 'button',
          class: 'lab-drop lab-tile3d',
          style: `--x:${s.x}%;--ms:${pz.fallMs}ms;--delay:${s.i * 90}ms`,
          'aria-label': s.tr,
          onclick: () => {
            if (b.disabled || done) return;
            if (s.match) { b.disabled = true; mark(b, true); burst(b); found++; if (found === pz.matchCount) finish({ ok: true, ms: env.now() - t0, par: pz.fallMs * 0.5 }); }
            else { mark(b, false); env.say(`That one has the “${s.vowel}” sound.`); finish({ ok: false, ms: env.now() - t0 }); }
          },
        }, big(env, s.he, 'lab-glyph'));
        sky.append(b);
        return b;
      });
      env.board.replaceChildren(sky);
      env.keys((k) => {
        const n = Number(k);
        if (n >= 1 && n <= buttons.length) buttons[n - 1].click();
      });
      env.timeLimit(pz.fallMs, () => {
        if (found === pz.matchCount) finish({ ok: true, ms: env.now() - t0, par: pz.fallMs * 0.5 });
        else { env.say('A matching syllable got past.'); finish({ ok: false, ms: pz.fallMs }); }
      });
    });
  },
};

const tileturn = {
  load: loadLetters,
  trial(env, level) {
    const pz = tileTurnPuzzle(env.data, level, env.rnd);
    return new Promise((resolve) => {
      const t0 = env.now();
      env.prompt('Which letter is on the turned tile?');
      const tile = env.h('div', {
        class: 'lab-card lab-tile3d lab-turned',
        style: `--rot:${pz.rot}deg`,
        'aria-label': 'A turned Hebrew letter',
      }, big(env, pz.letter.he, 'lab-glyph lab-huge'));
      const g = grid(env, pz.choices.length, pz.choices.length, (i, b) => {
        b.append(big(env, pz.choices[i].he, 'lab-glyph'));
        if (pz.showName) b.append(env.h('span', { class: 'lab-val' }, pz.choices[i].name));
        b.setAttribute('aria-label', pz.choices[i].name);
      }, (i, b) => {
        const ok = pz.choices[i].id === pz.letter.id;
        mark(b, ok);
        if (!ok) env.say(`It was ${pz.letter.name}.`);
        else burst(b);
        resolve({ ok, ms: env.now() - t0, par: 1800 });
      }, 'Letter choices');
      env.board.replaceChildren(tile, g.el);
      env.keys((k) => {
        const n = Number(k);
        if (n >= 1 && n <= g.cells.length) g.cells[n - 1].click();
      });
    });
  },
};

const pathword = {
  load: async (env) => (await loadFamilies(env)).allWords,
  trial(env, level) {
    const pz = pathWordPuzzle(env.data, level, env.rnd);
    return new Promise((resolve) => {
      const t0 = env.now();
      const path = [];
      const hint = pz.showHe
        ? env.h('span', {}, 'Trace ', big(env, pz.word.he, 'lab-inline'), `  ${pz.word.en}`)
        : env.h('span', {}, 'Trace the word for ', env.h('b', {}, pz.word.en));
      env.prompt(hint);
      const cells = [];
      const el = env.h('div', { class: 'lab-grid lab-stage', role: 'group', 'aria-label': 'Letter path', style: `--cols:${pz.side}` });
      for (let y = 0; y < pz.side; y++) for (let x = 0; x < pz.side; x++) {
        const ch = pz.grid[y][x];
        const b = env.h('button', { type: 'button', class: 'lab-cell lab-tile3d', 'aria-label': ch });
        b.append(big(env, ch, 'lab-glyph'));
        const at = [x, y];
        b.addEventListener('click', () => {
          if (b.classList.contains('is-picked')) {
            // allow undo of the last cell only
            const last = path[path.length - 1];
            if (last && last[0] === x && last[1] === y) { path.pop(); b.classList.remove('is-picked'); }
            return;
          }
          const next = [...path, at];
          if (!pathWordFollows(next)) return;
          path.push(at); b.classList.add('is-picked');
          if (path.length === pz.spelling.length) {
            const ok = pathWordReads(pz.grid, path) === pz.spelling.join('');
            if (ok) { mark(b, true); burst(b); resolve({ ok: true, ms: env.now() - t0, par: 1600 * pz.spelling.length }); }
            else { mark(b, false); env.say(`The word is ${pz.word.he}, ${pz.word.en}.`); resolve({ ok: false, ms: env.now() - t0 }); }
          }
        });
        el.append(b); cells.push(b);
      }
      env.board.replaceChildren(el);
    });
  },
};


const echo = {
  load: loadLabWords,
  async trial(env, level) {
    const pz = echoHuntPuzzle(env.data, level, env.rnd);
    const t0 = env.now();
    const clip = resolveWordClip(pz.target, env.hasClip);
    let heard = false;
    if (clip && env.hasClip?.(clip.kind, clip.id)) {
      heard = !!(await env.playClip(clip.kind, clip.id, pz.target.he));
    }
    // Sound off, a missing file, or a failed play: the written sound of the same word is shown instead. Never invented.
    const sound = pz.target.tr || pz.target.en;
    env.prompt(heard
      ? env.h('span', {}, 'Tap the word you heard.')
      : env.h('span', {}, 'Sound is off or this clip is missing. Tap the word that sounds like ', env.h('b', {}, sound), '.'));
    const replay = (clip && env.hasClip?.(clip.kind, clip.id))
      ? env.h('button', { type: 'button', class: 'btn secondary', 'aria-label': 'Hear the word again', onclick: () => env.playClip(clip.kind, clip.id, pz.target.he) }, 'Hear again')
      : null;
    return new Promise((resolve) => {
      const g = grid(env, pz.choices.length, pz.cols, (i, b) => {
        b.append(big(env, pz.choices[i].he, 'lab-word'));
        b.setAttribute('aria-label', pz.choices[i].he);
      }, (i, b) => {
        const ok = consonants(pz.choices[i].he) === consonants(pz.target.he);
        mark(b, ok);
        if (ok) burst(b);
        else env.say(`It was ${pz.target.he}${pz.target.en ? `, ${pz.target.en}` : ''}.`);
        resolve({ ok, ms: env.now() - t0, par: 2200 });
      }, 'Heard word', 'lab-cell lab-tile3d lab-wordcell');
      env.board.replaceChildren(...[replay, g.el].filter(Boolean));
      env.keys((k) => {
        const n = Number(k);
        if (n >= 1 && n <= g.cells.length) g.cells[n - 1].click();
      });
    });
  },
};

export const STUDIO_DRILLS = Object.freeze({
  wordburst, migration, starsearch, rootforge, letterseq, speedmatch, letterspan, vowelrain, tileturn, pathword, echo,
});

export const _studioTest = {
  holdsDivineName, VOWEL_SAY, wordBurstPuzzle, migrationPuzzle, starSearchPuzzle, rootForgePuzzle, rootForgeNextOk,
  letterSequencePuzzle, speedMatchPuzzle, letterSpanPuzzle, letterSpanOk, vowelRainPuzzle, tileTurnPuzzle,
  pathWordPuzzle, pathWordFollows, pathWordReads, echoHuntPuzzle, resolveWordClip, shortEnglish,
};
