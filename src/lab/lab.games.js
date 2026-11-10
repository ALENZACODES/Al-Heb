// Brain Lab drills. Each drill has load(env) (fetch its data once) and trial(env, level) which draws one round on env.board
// and resolves {ok, ms, par}. The runner in lab.view.js owns the clock, the difficulty staircase and the score.
// All Hebrew here comes from Aleph's own data files: letters, syllable recordings, the prayer corpus, the number words in
// the dictionary, the holiday table and the word families. Nothing is typed in by hand.
import { randInt, shuffle, sample, choices, gematriaPuzzle, hasPattern, consonants, lineWords, hasDivineName, NOT_A_GAME } from './lab.core.js';
import { STUDIO_DRILLS } from './lab.studio.js';
import { HOLIDAY_DEFS, HEBREW_MONTH_NAMES, hebrewNumeral } from '../curriculum/calendar.js';

const url = (p) => new URL(`../../${p}`, import.meta.url);
async function getJSON(env, p) {
  const f = env.ctx?.fetchFn || env.ctx?.fetch || globalThis.fetch;
  const res = await f(url(p));
  if (!res.ok) throw new Error(`could not load ${p}`);
  return res.json();
}
const cache = new Map();
const once = (key, fn) => { if (!cache.has(key)) cache.set(key, fn().catch((e) => { cache.delete(key); throw e; })); return cache.get(key); };

const loadLetters = (env) => once('letters', async () => {
  const raw = await getJSON(env, 'data/letters/letters.json');
  return (Array.isArray(raw) ? raw : raw.letters || []).map((l) => ({ id: l.id, he: l.he, name: l.name, nameHe: l.nameHe, gematria: l.gematria, confusableWith: l.confusableWith || [], isFinal: /-final$/.test(l.id) }));
});

/** A grid of square buttons. onTap(i, button). */
function grid(env, n, cols, render, onTap, label) {
  const { h } = env;
  const cells = [];
  const el = h('div', { class: 'lab-grid', role: 'group', 'aria-label': label, style: `--cols:${cols}` });
  for (let i = 0; i < n; i++) {
    const b = h('button', { type: 'button', class: 'lab-cell', onclick: () => onTap(i, b) });
    render(i, b); cells.push(b); el.append(b);
  }
  return { el, cells };
}
const big = (env, he, cls = 'lab-big') => env.heSpan(he, `he ${cls}`);
/** Wrong-answer flash, then settle. */
const mark = (b, ok) => { b.classList.add(ok ? 'is-right' : 'is-wrong'); };

// ---------------------------------------------------------------- Letter Hunt (attention)
const hunt = {
  load: loadLetters,
  trial(env, level) {
    const letters = env.data.filter((l) => level >= 7 || !l.isFinal);
    const side = level <= 2 ? 3 : level <= 5 ? 4 : level <= 8 ? 5 : 6;
    const n = side * side, targets = Math.min(2 + Math.floor(level / 3), 5);
    const withTwins = letters.filter((l) => l.confusableWith.length);
    const target = level >= 3 && withTwins.length ? withTwins[randInt(env.rnd, withTwins.length)] : letters[randInt(env.rnd, letters.length)];
    const twins = target.confusableWith.map((id) => letters.find((l) => l.id === id)).filter(Boolean);
    const others = letters.filter((l) => l.id !== target.id);
    const fill = Array.from({ length: n - targets }, () => (level >= 3 && twins.length && env.rnd() < 0.5 ? twins[randInt(env.rnd, twins.length)] : others[randInt(env.rnd, others.length)]));
    const board = shuffle([...Array(targets).fill(target), ...fill], env.rnd);
    let found = 0;
    env.met?.({ he: target.he, en: target.name });
    return new Promise((resolve) => {
      const t0 = env.now();
      env.prompt(env.h('span', {}, 'Find every ', big(env, target.he, 'lab-inline'), ` ${target.name}`));
      const g = grid(env, n, side, (i, b) => { b.append(big(env, board[i].he, 'lab-glyph')); b.setAttribute('aria-label', board[i].name); }, (i, b) => {
        if (b.disabled) return;
        if (board[i].id === target.id) { b.disabled = true; mark(b, true); found++; if (found === targets) resolve({ ok: true, ms: env.now() - t0, par: 900 * targets + 800 }); }
        else { mark(b, false); env.say(`That is ${board[i].name}.`); resolve({ ok: false, ms: env.now() - t0 }); }
      }, 'Letter grid');
      env.board.replaceChildren(g.el);
    });
  },
};

// ---------------------------------------------------------------- Letter Matrix (memory)
const matrix = {
  load: loadLetters,
  trial(env, level) {
    const letters = env.data.filter((l) => !l.isFinal);
    const side = level <= 3 ? 3 : level <= 7 ? 4 : 5;
    const n = side * side;
    const shown = Math.min(n - 1, 3 + Math.floor(level / 2));
    const targets = Math.min(1 + Math.floor(level / 4), 3, shown);
    const showMs = Math.max(900, 2600 - level * 140);
    const target = letters[randInt(env.rnd, letters.length)];
    const twins = target.confusableWith.map((id) => letters.find((l) => l.id === id)).filter(Boolean);
    const others = letters.filter((l) => l.id !== target.id);
    const spots = sample([...Array(n).keys()], shown, env.rnd);
    const at = new Map(spots.map((s, k) => [s, k < targets ? target : (level >= 5 && twins.length && env.rnd() < 0.5 ? twins[randInt(env.rnd, twins.length)] : others[randInt(env.rnd, others.length)])]));
    let found = 0, open = false, t0 = 0;
    env.met?.({ he: target.he, en: target.name });
    return new Promise((resolve) => {
      env.prompt('Remember the letters…'); env.rimon?.('thinking');
      const g = grid(env, n, side, (i, b) => { const l = at.get(i); if (l) b.append(big(env, l.he, 'lab-glyph')); b.setAttribute('aria-label', l ? l.name : 'empty'); b.disabled = true; }, (i, b) => {
        if (!open || b.disabled) return;
        const l = at.get(i);
        if (l && l.id === target.id) { b.disabled = true; b.replaceChildren(big(env, l.he, 'lab-glyph')); mark(b, true); found++; if (found === targets) resolve({ ok: true, ms: env.now() - t0, par: 1400 * targets }); }
        else { mark(b, false); for (const [k, v] of at) if (v.id === target.id) { g.cells[k].replaceChildren(big(env, v.he, 'lab-glyph')); g.cells[k].classList.add('is-reveal'); } resolve({ ok: false, ms: env.now() - t0 }); }
      }, 'Memory grid');
      const back = env.artSrc?.('LAB_v2_matrix_play', 200); // the ordered tile back, once approved
      if (back) g.el.style.setProperty('--lab-back', `url("${back}")`);
      env.board.replaceChildren(g.el);
      env.later(() => {
        for (const c of g.cells) { c.replaceChildren(); c.disabled = false; c.setAttribute('aria-label', 'hidden'); c.classList.add('is-hidden'); }
        open = true; t0 = env.now();
        env.prompt(env.h('span', {}, targets > 1 ? `Tap all ${targets} places where ` : 'Where was ', big(env, target.he, 'lab-inline'), ` ${target.name}?`));
      }, showMs);
    });
  },
};

// ---------------------------------------------------------------- Sound Match (speed, listening)
const soundmatch = {
  load: (env) => once('syllables', async () => (await getJSON(env, 'data/lab/syllables.json')).syllables),
  trial(env, level) {
    const all = env.data;
    const target = all[randInt(env.rnd, all.length)];
    const n = level <= 1 ? 2 : level <= 3 ? 3 : level <= 6 ? 4 : 6;
    const near = all.filter((s) => s.tr !== target.tr && (s.letter === target.letter || s.vowel === target.vowel));
    const pool = level >= 4 && near.length >= n - 1 ? near : all.filter((s) => s.tr !== target.tr);
    // no two choices that sound the same (Aleph and Ayin, Kaf and Qof, Tet and Tav read alike in Israeli Hebrew)
    const uniq = []; for (const s of shuffle(pool, env.rnd)) if (!uniq.some((u) => u.tr === s.tr)) uniq.push(s);
    const opts = shuffle([target, ...uniq.slice(0, n - 1)], env.rnd);
    const limit = Math.max(1800, 6500 - level * 380);
    env.met?.({ he: target.he, en: `"${target.tr}"`, clip: { kind: 'syllable', id: target.id } });
    return new Promise((resolve) => {
      let t0 = env.now(), done = false;
      const finish = (r) => { if (!done) { done = true; resolve(r); } };
      const again = env.h('button', { type: 'button', class: 'btn secondary lab-hear', onclick: () => env.playClip('syllable', target.id, target.he) }, '▶ Hear it again');
      const readIt = () => env.prompt(env.h('span', {}, 'Tap the syllable that says ', env.h('b', { class: 'lab-say' }, `"${target.tr}"`)));
      if (env.hasClip('syllable', target.id)) { env.prompt(env.h('span', {}, env.img?.('id', 'LAB_v2_soundmatch_play', 'lab-side-pic', 200), 'Tap the syllable you heard. ', again)); env.playClip('syllable', target.id, target.he).then((ok) => { if (!ok) readIt(); }); }
      else readIt();
      const g = grid(env, opts.length, opts.length <= 4 ? 2 : 3, (i, b) => { b.append(big(env, opts[i].he, 'lab-glyph')); b.setAttribute('aria-label', opts[i].tr); }, (i, b) => {
        const ok = opts[i].id === target.id; mark(b, ok);
        if (!ok) { const k = opts.indexOf(target); g.cells[k].classList.add('is-reveal'); }
        finish({ ok, ms: env.now() - t0, par: 1500 });
      }, 'Syllables');
      env.board.replaceChildren(g.el);
      env.timeLimit(limit, () => finish({ ok: false, ms: limit }));
    });
  },
};

// ---------------------------------------------------------------- Siddur Flash (speed, reading)
const siddurflash = {
  load: (env) => once('siddurlines', async () => {
    const reg = await getJSON(env, 'data/corpus/registry.json');
    return reg.entries.filter((e) => (e.category === 'siddur' || e.category === 'torah') && e.he && !NOT_A_GAME.has(e.id)).map((e) => ({ id: e.id, title: e.title, words: lineWords(e.he) })).filter((e) => e.words.length >= 3);
  }),
  trial(env, level) {
    const lines = env.data;
    const first = lines[randInt(env.rnd, lines.length)];
    let words = first.words.slice(0, Math.min(first.words.length, 4 + level));
    if (level >= 6) { const second = lines[randInt(env.rnd, lines.length)]; words = words.concat(second.words.slice(0, 3 + Math.floor(level / 3))); }
    const counts = new Map(); for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);
    // The divine name is never the word to catch: it is read, not raced (src/shell/names.js convention).
    const unique = words.map((w, i) => [w, i]).filter(([w, i]) => counts.get(w) === 1 && i >= 1 && !hasDivineName(w));
    const fallback = words.map((w, i) => [w, i]).filter(([w, i]) => i >= 1 && !hasDivineName(w));
    const [targetWord, targetIndex] = unique.length ? unique[randInt(env.rnd, unique.length)] : fallback.length ? fallback.at(-1) : [words.at(-1), words.length - 1];
    const step = Math.max(330, 1150 - level * 70);
    env.met?.({ he: targetWord, en: `from ${String(first.title).replace(/\s*\(.*\)\s*$/, '')}` });
    return new Promise((resolve) => {
      let shownAt = null, hiddenAt = null, done = false, idx = -1;
      const finish = (r) => { if (!done) { done = true; resolve(r); } };
      const word = env.h('div', { class: 'lab-flash', 'aria-live': 'off' });
      env.backdrop?.(word, 'LAB_v2_siddurflash_play', 700);
      const now = env.h('button', { type: 'button', class: 'btn lab-now', onclick: () => {
        const t = env.now();
        if (idx === targetIndex) finish({ ok: true, ms: t - shownAt, par: step });
        else if (hiddenAt && idx === targetIndex + 1 && t - hiddenAt < 250) finish({ ok: true, ms: t - shownAt, par: step });
        else { word.classList.add('is-wrong'); finish({ ok: false, ms: step }); }
      } }, 'Now!');
      env.prompt(env.h('span', {}, 'Watch for ', big(env, targetWord, 'lab-inline'), ' and tap Now! when it appears.'));
      env.board.replaceChildren(word, now);
      word.replaceChildren(big(env, targetWord, 'lab-word lab-preview'));
      const next = () => {
        if (done) return;
        if (idx === targetIndex) hiddenAt = env.now();
        idx++;
        if (idx >= words.length) { env.later(() => finish({ ok: false, ms: step }), 260); word.replaceChildren(); return; }
        if (idx === targetIndex) shownAt = env.now();
        word.replaceChildren(big(env, words[idx], 'lab-word'));
        env.later(next, step);
      };
      env.later(() => { word.replaceChildren(); env.later(next, 350); }, 1400);
    });
  },
};

// ---------------------------------------------------------------- Rule Switch (flexibility)
const SWITCH_ITEMS = Object.freeze([
  { he: 'בּ', name: 'Bet', dot: true, fin: false }, { he: 'ב', name: 'Vet', dot: false, fin: false },
  { he: 'כּ', name: 'Kaf', dot: true, fin: false }, { he: 'כ', name: 'Khaf', dot: false, fin: false },
  { he: 'פּ', name: 'Pe', dot: true, fin: false }, { he: 'פ', name: 'Fe', dot: false, fin: false },
  { he: 'ך', name: 'final Khaf', dot: false, fin: true }, { he: 'ם', name: 'final Mem', dot: false, fin: true },
  { he: 'ן', name: 'final Nun', dot: false, fin: true }, { he: 'ף', name: 'final Fe', dot: false, fin: true },
  { he: 'ץ', name: 'final Tsadi', dot: false, fin: true }, { he: 'מ', name: 'Mem', dot: false, fin: false },
  { he: 'נ', name: 'Nun', dot: false, fin: false }, { he: 'צ', name: 'Tsadi', dot: false, fin: false },
]);
const RULES = Object.freeze({ dot: { q: 'Does it have a dot inside?', cls: 'rule-dot', key: 'dot' }, fin: { q: 'Is it an end-of-word letter?', cls: 'rule-fin', key: 'fin' } });
const ruleswitch = {
  load: async () => SWITCH_ITEMS,
  trial(env, level) {
    const pSwitch = Math.min(0.6, 0.15 + level * 0.04);
    const rule = env.memo.rule && env.rnd() > pSwitch ? env.memo.rule : (env.rnd() < 0.5 ? 'dot' : 'fin');
    env.memo.rule = rule;
    const item = env.data[randInt(env.rnd, env.data.length)];
    const answer = item[RULES[rule].key];
    const limit = Math.max(900, 3600 - level * 230);
    env.met?.({ he: item.he, en: item.name });
    return new Promise((resolve) => {
      const t0 = env.now(); let done = false;
      const finish = (r) => { if (!done) { done = true; resolve(r); } };
      const pick = (yes, b) => { const ok = yes === answer; mark(b, ok); if (!ok) env.say(`${item.name}: ${answer ? 'yes' : 'no'}.`); finish({ ok, ms: env.now() - t0, par: 1100 }); };
      env.prompt(env.h('span', { class: `lab-rule ${RULES[rule].cls}` }, RULES[rule].q));
      const card = env.h('div', { class: `lab-card ${RULES[rule].cls}` }, big(env, item.he, 'lab-glyph lab-huge'));
      env.backdrop?.(card, 'LAB_v2_switch_play', 500);
      const no = env.h('button', { type: 'button', class: 'btn secondary lab-yn', onclick: () => pick(false, no) }, 'No');
      const yes = env.h('button', { type: 'button', class: 'btn lab-yn', onclick: () => pick(true, yes) }, 'Yes');
      env.board.replaceChildren(card, env.h('div', { class: 'lab-row' }, no, yes));
      env.keys((k) => { if (k === 'ArrowLeft') pick(false, no); else if (k === 'ArrowRight') pick(true, yes); });
      env.timeLimit(limit, () => finish({ ok: false, ms: limit }));
    });
  },
};

// ---------------------------------------------------------------- Gematria (problem solving)
const gematria = {
  load: loadLetters,
  trial(env, level) {
    const pz = gematriaPuzzle(env.data, level, env.rnd);
    const showValues = level <= 3;
    for (const l of pz.solution) env.met?.({ he: l.he, en: `${l.name} = ${l.gematria}` });
    return new Promise((resolve) => {
      const t0 = env.now(); let sum = 0; const chosen = new Set();
      const total = env.h('p', { class: 'lab-sum', 'aria-live': 'polite' }, 'Your total: 0');
      env.prompt(env.h('span', {}, 'Make ', env.h('b', { class: 'lab-target' }, String(pz.target)), ' with letter values'));
      const g = grid(env, pz.tiles.length, pz.tiles.length <= 6 ? 3 : 4, (i, b) => {
        b.append(big(env, pz.tiles[i].he, 'lab-glyph'));
        if (showValues) b.append(env.h('span', { class: 'lab-val' }, String(pz.tiles[i].gematria)));
        b.setAttribute('aria-label', `${pz.tiles[i].name}${showValues ? `, ${pz.tiles[i].gematria}` : ''}`);
      }, (i, b) => {
        if (chosen.has(i)) { chosen.delete(i); sum -= pz.tiles[i].gematria; b.classList.remove('is-picked'); }
        else { chosen.add(i); sum += pz.tiles[i].gematria; b.classList.add('is-picked'); }
        total.textContent = `Your total: ${sum}`;
        if (sum === pz.target) { for (const k of chosen) mark(g.cells[k], true); resolve({ ok: true, ms: env.now() - t0, par: 3500 + pz.solution.length * 1500 }); }
        else if (sum > pz.target) {
          for (const k of chosen) mark(g.cells[k], false);
          env.say(`Too much. One way: ${pz.solution.map((l) => `${l.name} ${l.gematria}`).join(' + ')}.`);
          resolve({ ok: false, ms: env.now() - t0 });
        }
      }, 'Letter tiles');
      env.board.replaceChildren(g.el, env.h('div', { class: 'lab-row' }, env.img?.('id', 'LAB_v2_gematria_play', 'lab-side-pic', 220), total));
    });
  },
};

// ---------------------------------------------------------------- Count Up (speed, numbers)
const loadNumbers = (env) => once('numbers', async () => (await getJSON(env, 'data/lab/numbers.json')).numbers);
const countup = {
  load: loadNumbers,
  trial(env, level) {
    const pool = env.data.filter((x) => (level <= 3 ? x.value <= 10 : level <= 7 ? x.value <= 90 : true));
    const n = Math.min(pool.length, level <= 2 ? 3 : level <= 4 ? 4 : level <= 7 ? 5 : 6);
    const set = sample(pool, n, env.rnd), order = set.slice().sort((a, b) => a.value - b.value);
    const showTr = level <= 3;
    for (const x of order) env.met?.({ he: x.he, en: `${x.value}, ${x.tr}`, clip: x.clip ? { kind: 'word', id: x.clip } : null });
    return new Promise((resolve) => {
      const t0 = env.now(); let k = 0;
      env.prompt('Tap the numbers from smallest to largest.');
      const g = grid(env, n, n <= 4 ? 2 : 3, (i, b) => {
        b.append(big(env, set[i].he, 'lab-word'));
        if (showTr) b.append(env.h('span', { class: 'lab-val' }, set[i].tr));
        b.setAttribute('aria-label', set[i].tr);
      }, (i, b) => {
        if (b.disabled) return;
        if (set[i] === order[k]) { b.disabled = true; mark(b, true); b.append(env.h('span', { class: 'lab-badge' }, String(set[i].value))); k++; env.sayWord(set[i]); if (k === n) resolve({ ok: true, ms: env.now() - t0, par: 1300 * n }); }
        else { mark(b, false); env.say(`${set[i].tr} is ${set[i].value}. The next one was ${order[k].tr}, ${order[k].value}.`); resolve({ ok: false, ms: env.now() - t0 }); }
      }, 'Number words');
      env.board.replaceChildren(g.el);
    });
  },
};

// ---------------------------------------------------------------- Number Ear (attention, listening)
const numberear = {
  load: loadNumbers,
  trial(env, level) {
    const pool = env.data.filter((x) => (level <= 3 ? x.value <= 10 : level <= 6 ? x.value <= 90 : true));
    const target = pool[randInt(env.rnd, pool.length)];
    const n = level <= 3 ? 3 : level <= 6 ? 4 : 6;
    const opts = choices(target, env.data, n, env.rnd, (a, b) => a.value === b.value).sort((a, b) => a.value - b.value);
    const limit = Math.max(2000, 6500 - level * 330);
    env.met?.({ he: target.he, en: `${target.value}, ${target.tr}`, clip: target.clip ? { kind: 'word', id: target.clip } : null });
    return new Promise((resolve) => {
      let done = false; const t0 = env.now();
      const finish = (r) => { if (!done) { done = true; resolve(r); } };
      const readIt = () => env.prompt(env.h('span', {}, 'Which number is ', big(env, target.he, 'lab-inline'), '?'));
      if (env.hasClip('word', target.clip || target.id)) { env.prompt(env.h('span', {}, env.img?.('id', 'LAB_v2_numberear_play', 'lab-side-pic', 200), 'Tap the number you heard. ', env.h('button', { type: 'button', class: 'btn secondary lab-hear', onclick: () => env.sayWord(target) }, '▶ Again'))); env.sayWord(target).then((ok) => { if (!ok) readIt(); }); }
      else readIt();
      const g = grid(env, opts.length, opts.length <= 4 ? 2 : 3, (i, b) => { b.append(env.h('span', { class: 'lab-digit' }, String(opts[i].value))); }, (i, b) => {
        const ok = opts[i].value === target.value; mark(b, ok);
        if (!ok) env.say(`${target.he}, ${target.tr}, is ${target.value}.`);
        finish({ ok, ms: env.now() - t0, par: 1600 });
      }, 'Numbers');
      env.board.replaceChildren(g.el);
      env.timeLimit(limit, () => finish({ ok: false, ms: limit }));
    });
  },
};

// ---------------------------------------------------------------- Calendar Puzzle (memory, Jewish time)
const monthOf = (d) => HEBREW_MONTH_NAMES[String(d.month).toLowerCase()] || HEBREW_MONTH_NAMES.adar;
const shortName = (d) => d.en.replace(/\s*\(.*\)$/, '');
const dateEn = (d) => `${d.day} ${monthOf(d).en}`;
const dateHe = (d) => `${hebrewNumeral(d.day)} ${monthOf(d).he}`;
const calendar = {
  // The holy days, with the recorded name of each one that has a recording (data/lab/words.json holyDays).
  load: (env) => once('calendardays', async () => {
    let clips = {};
    try { clips = Object.fromEntries(((await getJSON(env, 'data/lab/words.json')).holyDays || []).map((d) => [d.id, d.clip])); } catch { /* names stay silent */ }
    return HOLIDAY_DEFS.map((d) => ({ ...d, clip: clips[d.id] || null }));
  }),
  trial(env, level) {
    const days = env.data;
    const d = days[randInt(env.rnd, days.length)];
    const n = level <= 2 ? 3 : 4;
    const kind = level <= 2 ? 'which' : level <= 5 ? (env.rnd() < 0.5 ? 'which' : 'when') : (env.rnd() < 0.5 ? 'when' : 'whenHe');
    const opts = choices(d, days, n, env.rnd, (a, b) => a.id === b.id || (a.month === b.month && a.day === b.day));
    const limit = Math.max(3200, 9500 - level * 480);
    env.met?.({ he: d.he, en: `${shortName(d)}: ${dateEn(d)}`, ...(d.clip ? { clip: d.clip } : {}) });
    return new Promise((resolve) => {
      let done = false; const t0 = env.now();
      const finish = (r) => { if (!done) { done = true; resolve(r); } };
      if (kind === 'which') env.prompt(env.h('span', {}, 'Which day falls on ', env.h('b', {}, dateEn(d)), ' ', env.heSpan(monthOf(d).he, 'he lab-inline-sm'), '?'));
      else env.prompt(env.h('span', {}, 'When is ', env.h('b', {}, shortName(d)), ' ', env.heSpan(d.he, 'he lab-inline-sm'), '?'));
      const label = (x) => (kind === 'which' ? shortName(x) : kind === 'when' ? dateEn(x) : dateHe(x));
      const g = grid(env, opts.length, 2, (i, b) => {
        b.classList.add('lab-wide');
        b.append(kind === 'whenHe' ? big(env, label(opts[i]), 'lab-word') : env.h('span', { class: 'lab-text' }, label(opts[i])));
        b.setAttribute('aria-label', kind === 'whenHe' ? dateEn(opts[i]) : label(opts[i]));
      }, (i, b) => {
        const ok = opts[i].id === d.id; mark(b, ok);
        env.say(`${shortName(d)}: ${dateEn(d)}.`);
        if (d.clip && env.hasClip(d.clip.kind, d.clip.id)) env.playClip(d.clip.kind, d.clip.id, d.he); // hear the day's Hebrew name
        finish({ ok, ms: env.now() - t0, par: 2500 });
      }, 'Answers');
      env.board.replaceChildren(g.el);
      env.timeLimit(limit, () => finish({ ok: false, ms: limit }));
    });
  },
};

// ---------------------------------------------------------------- Letter Pattern (problem solving)
const pattern = {
  load: (env) => once('families', async () => {
    const raw = await getJSON(env, 'data/roots/families.json');
    const fams = [];
    for (const f of raw.families || []) {
      const root = consonants(f.root);
      if (root.length !== 3) continue;
      const words = (f.words || []).filter((w) => w.he && hasPattern(w.he, root)).map((w) => ({ he: w.he, en: w.en, level: w.level }));
      if (words.length >= 2) fams.push({ root, rootHe: f.root, words, easy: words.filter((w) => w.level === 'A1' || w.level === 'A2').length });
    }
    const allWords = (raw.families || []).flatMap((f) => (f.words || []).map((w) => ({ he: w.he, en: w.en, level: w.level }))).filter((w) => w.he);
    return { fams, allWords };
  }),
  trial(env, level) {
    const { fams, allWords } = env.data;
    const pool = level <= 4 ? fams.filter((f) => f.easy >= 2) : fams;
    const fam = (pool.length ? pool : fams)[randInt(env.rnd, (pool.length ? pool : fams).length)];
    const tiles = level <= 2 ? 4 : level <= 5 ? 6 : level <= 8 ? 8 : 9;
    const k = Math.min(fam.words.length, 1 + Math.floor(level / 3), 3, tiles - 1);
    const targets = sample(level <= 4 ? fam.words.filter((w) => w.level === 'A1' || w.level === 'A2').concat(fam.words).filter((w, i, a) => a.indexOf(w) === i) : fam.words, k, env.rnd);
    const seen = new Set(targets.map((t) => consonants(t.he)));
    const others = [];
    for (const w of shuffle(level <= 4 ? allWords.filter((x) => x.level === 'A1' || x.level === 'A2') : allWords, env.rnd)) { if (others.length >= tiles - k) break; const c = consonants(w.he); if (!hasPattern(w.he, fam.root) && !seen.has(c)) { seen.add(c); others.push(w); } }
    const board = shuffle([...targets.map((w) => ({ ...w, hit: true })), ...others.map((w) => ({ ...w, hit: false }))], env.rnd);
    const showEn = level <= 4;
    for (const w of targets) env.met?.({ he: w.he, en: String(w.en).split(/[;,]/)[0] });
    return new Promise((resolve) => {
      const t0 = env.now(); let found = 0;
      env.prompt(env.h('span', {}, 'Tap every word with ', big(env, fam.rootHe, 'lab-inline'), ' in this order'));
      const g = grid(env, board.length, 3, (i, b) => {
        b.classList.add('lab-wordcell');
        b.append(big(env, board[i].he, 'lab-word'));
        if (showEn) b.append(env.h('span', { class: 'lab-val' }, String(board[i].en).split(/[;,]/)[0]));
        b.setAttribute('aria-label', String(board[i].en));
      }, (i, b) => {
        if (b.disabled) return;
        if (board[i].hit) { b.disabled = true; mark(b, true); found++; if (found === targets.length) resolve({ ok: true, ms: env.now() - t0, par: 2200 * targets.length + 1000 }); }
        else { mark(b, false); board.forEach((x, j) => { if (x.hit) g.cells[j].classList.add('is-reveal'); }); resolve({ ok: false, ms: env.now() - t0 }); }
      }, 'Words');
      env.board.replaceChildren(g.el);
    });
  },
};

// Studio drills sit in DRILLS too; Claude's six (lab.games2.js) are NEW_DRILLS and the view merges both.
export const DRILLS = Object.freeze({ hunt, matrix, soundmatch, siddurflash, switch: ruleswitch, gematria, countup, numberear, calendar, pattern, ...STUDIO_DRILLS });
/** Shared pieces for the games in lab.games2.js. */
export const kit = Object.freeze({ getJSON, once, grid, big, mark, loadLetters });
export const _test = { SWITCH_ITEMS, dateEn, dateHe, shortName };
