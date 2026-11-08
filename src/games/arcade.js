import { reactRimon } from '../shell/rimon-events.js';
// Arcade: the shared DOM layer for the arcade games. One contract for all of them:
//   const A = await createArcade(root, ctx, spec); A.onRound(setupFn); A.begin();
// It gives every game the same five levels, HUD, timer, score saver with badges, daily
// challenge, keyboard and tap controls, recorded-audio hooks and the results card that
// hands the learner to the next game. Games stay small and only write their mechanic.
import { h, heSpan } from '../shell/ui.js';
import { sfx } from '../audio/sfx.js';
import { isAudioFree } from '../shell/audiofree.js';
import { quietNow } from '../shell/comfort.js';
import { uiEnglish } from '../shell/names.js';
import { playRecordedClip, hasRecordedClip } from './engine.js';
import { ARCADE_KEY, LEVELS, BADGES, applyResult, applyArcade, emptyRecord, seededRandom, seedFrom, dayKey, bestLine, starsFor } from './arcade.model.js';
import { ARCADE_GAMES } from './arcade.catalog.js';

const WORDS_URL = new URL('../../data/games/firstwords.json', import.meta.url);
const LETTERS_URL = new URL('../../data/letters/letters.json', import.meta.url);
const ART_BASE = 'assets/games/arcade';
const LINES_BASE = 'audio';

let wordsCache = null, lettersCache = null;
export async function loadWords(ctx) {
  if (wordsCache) return wordsCache;
  const f = ctx?.fetchFn || ctx?.fetch || globalThis.fetch;
  const res = await f(WORDS_URL);
  if (!res.ok) throw new Error(`could not load data/games/firstwords.json: HTTP ${res.status}`);
  const raw = await res.json();
  wordsCache = Array.isArray(raw?.words) ? raw.words : [];
  return wordsCache;
}
export async function loadLetters(ctx) {
  if (lettersCache) return lettersCache;
  const f = ctx?.fetchFn || ctx?.fetch || globalThis.fetch;
  const res = await f(LETTERS_URL);
  if (!res.ok) throw new Error(`could not load data/letters/letters.json: HTTP ${res.status}`);
  const raw = await res.json();
  lettersCache = Array.isArray(raw) ? raw.map((l) => ({ id: l.id, he: l.he, name: l.name, nameHe: l.nameHe, sound: l.sound?.en || '', confusableWith: l.confusableWith || [], isFinal: /-final$/.test(l.id) })) : [];
  return lettersCache;
}

/** Optional picture under assets/games/arcade/<game>/<name>.png; removes itself when the file is not there. */
export function art(game, name, alt = '', cls = 'arc-art') {
  const img = h('img', { class: cls, alt, src: `${ART_BASE}/${game}/${name}.png`, loading: 'lazy', decoding: 'async' });
  img.addEventListener('error', () => img.remove());
  return img;
}
/** Shared cast art under assets/games/arcade/cast/<name>.png (rimon-*, ari-*, noa-*); removes itself when absent. */
export function castArt(name, alt = '', cls = 'arc-cast') { return art('cast', name, alt, cls); }
/** Optional letter sprite assets/games/arcade/letters/<letterId>.png, else the glyph as text. */
export function letterTile(letter, cls = 'arc-glyph') {
  const wrap = h('span', { class: cls, lang: 'he', dir: 'rtl' }, letter.he);
  const img = h('img', { class: 'arc-sprite', alt: '', src: `${ART_BASE}/letters/${letter.id}.png`, loading: 'lazy' });
  img.addEventListener('error', () => img.remove());
  img.addEventListener('load', () => { wrap.classList.add('has-sprite'); });
  wrap.append(img);
  return wrap;
}

/**
 * @param {HTMLElement} root
 * @param {any} ctx
 * @param {{id:string,title:string,titleHe:string,blurb:string,howTo:string[],levels:{name:string,[k:string]:any}[],par:(level:number,cfg:any)=>number,seconds?:(level:number,cfg:any)=>number,controls?:'arrows'|'tap'|'none',timed?:boolean,needsWords?:boolean,needsLetters?:boolean}} spec
 */
export async function createArcade(root, ctx, spec) {
  const leaveSfx = sfx.enter(ctx);
  const storeKey = `games.${spec.id}.v1`;
  const get = (k) => { try { return ctx?.store?.get?.(k); } catch { return undefined; } };
  const set = (k, v) => { try { ctx?.store?.set?.(k, v); return true; } catch { return false; } };
  const setting = (k) => { try { return ctx?.settings?.get?.(k); } catch { return undefined; } };
  const quiet = quietNow(ctx?.settings);
  const untimed = setting('untimed') === true || setting('calmMode') === true || spec.timed === false;
  const showStreak = setting('showStreak') !== false && setting('calmMode') !== true;
  let record = { ...emptyRecord(), ...(get(storeKey) || {}) };
  let level = Math.min(record.unlocked || 1, Math.max(1, Number(ctx?.route?.query?.level) || record.unlocked || 1));
  let daily = false, rnd = Math.random, roundSetup = null, alive = true;
  let score = 0, misses = 0, lives = 0, startedAt = 0, timeLeft = 0, timerId = 0, loopId = 0, loops = [];
  const keyHandlers = new Set();

  // Shell
  const titleEl = h('h1', { id: 'view-title', tabindex: '-1' }, spec.title + ' ', heSpan(spec.titleHe));
  const levelBar = h('div', { class: 'arc-levels', role: 'group', 'aria-label': 'Level' });
  const hudScore = h('span', { class: 'arc-hud-item' }, 'Score 0');
  const hudBest = h('span', { class: 'arc-hud-item muted' });
  const hudLives = h('span', { class: 'arc-hud-item' });
  const hudTime = h('span', { class: 'arc-hud-item', role: 'timer', 'aria-live': 'off' });
  const hud = h('div', { class: 'arc-hud' }, hudScore, hudBest, hudLives, hudTime);
  const status = h('p', { class: 'arc-status', role: 'status', 'aria-live': 'polite' }, 'Loading…');
  const board = h('div', { class: 'arc-board', id: `arc-${spec.id}-board` });
  const controls = h('div', { class: 'arc-controls' });
  const results = h('div', { class: 'arc-results' });
  const dailyBtn = h('button', { type: 'button', class: 'btn secondary arc-daily', 'aria-pressed': false, onclick: () => toggleDaily() }, 'Daily challenge');
  const howTo = h('details', { class: 'arc-howto' }, h('summary', {}, 'How to play'), h('ol', {}, ...spec.howTo.map((s) => h('li', {}, uiEnglish(ctx, s)))));
  const streakEl = h('p', { class: 'arc-streak muted' });
  root.replaceChildren(h('article', { class: 'card game-card arcade', 'data-game': spec.id },
    h('div', { class: 'arc-eyebrow' }, `ARCADE · ${spec.levels.length} LEVELS`),
    titleEl,
    art(spec.id, 'env', '', 'game-env arc-env'),
    h('p', { class: 'arc-blurb' }, uiEnglish(ctx, spec.blurb)),
    howTo, levelBar, h('div', { class: 'row arc-row' }, dailyBtn), hud, status, board, controls, results, streakEl,
    h('p', { class: 'muted arc-foot' }, 'Scores and badges are saved on this device.')));

  // Data
  const words = spec.needsWords === false ? [] : await loadWords(ctx).catch(() => []);
  const letters = spec.needsLetters === false ? [] : await loadLetters(ctx).catch(() => []);
  if (!alive) return null;

  function renderLevels() {
    levelBar.replaceChildren(...LEVELS.map((l) => {
      const locked = l > (record.unlocked || 1);
      const lv = record.levels?.[l];
      const stars = lv ? '★'.repeat(lv.stars) + '☆'.repeat(3 - lv.stars) : '☆☆☆';
      return h('button', {
        type: 'button', class: 'arc-level' + (l === level ? ' is-current' : ''), 'aria-pressed': l === level, disabled: locked || undefined,
        'aria-label': `Level ${l}, ${spec.levels[l - 1]?.name || ''}${locked ? ', locked' : `, ${lv?.stars || 0} of 3 stars`}`,
        onclick: () => { if (!locked) { level = l; renderLevels(); restart(); } },
      }, h('span', { class: 'arc-level-n' }, locked ? '🔒' : String(l)), h('span', { class: 'arc-level-name' }, spec.levels[l - 1]?.name || ''), h('span', { class: 'arc-level-stars', 'aria-hidden': 'true' }, stars));
    }));
    const best = record.levels?.[level]?.best || 0;
    hudBest.textContent = best ? `Best L${level}: ${best}` : 'No best yet';
  }
  function renderStreak() {
    const a = get(ARCADE_KEY);
    if (!showStreak || !a?.streak) { streakEl.textContent = ''; return; }
    streakEl.textContent = `Arcade streak: ${a.streak} day${a.streak === 1 ? '' : 's'} in a row · ${a.totalBadges || 0} badges across all games.`;
  }
  function toggleDaily() {
    daily = !daily;
    dailyBtn.setAttribute('aria-pressed', String(daily));
    dailyBtn.textContent = daily ? `Daily challenge · ${dayKey()}` : 'Daily challenge';
    restart();
  }

  function clearLoops() {
    for (const id of loops) cancelAnimationFrame(id);
    loops = [];
    if (timerId) { clearInterval(timerId); timerId = 0; }
  }
  function tickTimer() {
    if (untimed) { hudTime.textContent = ''; return; }
    hudTime.textContent = `⏱ ${timeLeft}s`;
    if (timeLeft === 10) reactRimon('nervous');
    if (timeLeft <= 0) { A.finish({ reason: 'time' }); return; }
    timeLeft -= 1;
  }

  const A = {
    h, heSpan, ctx, words, letters, quiet, untimed, board, status, controls, spec, storeKey,
    get level() { return level; },
    get cfg() { return spec.levels[level - 1]; },
    get score() { return score; },
    get misses() { return misses; },
    get lives() { return lives; },
    get daily() { return daily; },
    get rnd() { return rnd; },
    get record() { return record; },
    cast: castArt,
    announce(text) { status.textContent = text; },
    addScore(n) { if(n > 0) reactRimon('bounce'); score = Math.max(0, score + n); hudScore.textContent = `Score ${score}`; },
    setLives(n) { lives = n; hudLives.textContent = n > 0 ? '♥'.repeat(Math.min(n, 5)) + (n > 5 ? `+${n - 5}` : '') : ''; },
    miss() { reactRimon('sad'); misses += 1; if (lives > 0) { A.setLives(lives - 1); if (lives === 0) { A.finish({ reason: 'lives' }); return true; } } return false; },
    sfx(name) { try { if (!quiet) sfx.play(name); } catch { /* sound is optional */ } },
    /** Recorded Hebrew word clip when present (never a non-Hebrew voice); the text always stays on screen. */
    async sayWord(word) {
      if (!word?.id || isAudioFree(ctx)) return false;
      return playRecordedClip(ctx, 'word', word.id, { text: word.he });
    },
    hasWordClip(word) { return !!word?.id && !isAudioFree(ctx) && hasRecordedClip(ctx, 'word', word.id); },
    async sayLetter(letter) {
      if (!letter?.id || isAudioFree(ctx)) return false;
      return playRecordedClip(ctx, 'letter', letter.id.replace(/-final$/, ''), { text: letter.nameHe });
    },
    /** A game voice line, if its file was pushed to audio/<voice>/israeli/games/<game>-<n>.mp3. Silent otherwise. */
    sayLine(n) { A.sayFile(`${spec.id}-${String(n).padStart(2, '0')}`); },
    /** Any pushed game clip under audio/<voice>/israeli/games/<name>.mp3 (for example laws/noah-01). Silent when absent. */
    sayFile(name) {
      if (isAudioFree(ctx) || typeof Audio !== 'function') return;
      const voice = setting('voice') === 'f' ? 'f' : 'm';
      try { const a = new Audio(`${LINES_BASE}/${voice}/israeli/games/${name}.mp3`); a.play().catch(() => {}); } catch { /* optional */ }
    },
    art: (name, alt = '', cls) => art(spec.id, name, alt, cls),
    letterTile,
    /** Keyboard: handler(key, event) for arrows (as 'up','down','left','right'), 'enter', 'space', or the raw key. */
    keys(handler) { keyHandlers.add(handler); return () => keyHandlers.delete(handler); },
    /** Direction pad buttons plus tap zones on the board (release events only). */
    dpad(onDir) {
      const btn = (dir, label) => h('button', { type: 'button', class: `btn arc-dpad-${dir}`, 'aria-label': label, onclick: () => onDir(dir) }, { up: '▲', down: '▼', left: '◀', right: '▶' }[dir]);
      controls.replaceChildren(h('div', { class: 'arc-dpad', role: 'group', 'aria-label': 'Move' }, btn('up', 'Move up'), h('div', { class: 'arc-dpad-mid' }, btn('left', 'Move left'), btn('right', 'Move right')), btn('down', 'Move down')));
      board.addEventListener('click', (e) => {
        if (e.target !== board && e.target?.closest?.('button')) return;
        const r = board.getBoundingClientRect(); if (!r.width) return;
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        onDir(Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up'));
      });
      A.keys((k) => { if (['up', 'down', 'left', 'right'].includes(k)) onDir(k); });
    },
    /** Step loop at intervalMs; paused while the page is hidden; stops at finish. */
    loop(step, intervalMs) {
      let last = 0;
      const frame = (t) => {
        if (!alive || !startedAt) return;
        if (!document.hidden && t - last >= intervalMs) { last = t; try { step(); } catch (e) { console.warn(spec.id, e); } }
        loops.push(requestAnimationFrame(frame));
      };
      loops.push(requestAnimationFrame(frame));
    },
    onRound(fn) { roundSetup = fn; },
    /** Start (or restart) a round for the current level. */
    begin() { restart(); },
    /** End the round: save, badges, results card, next-game hand-off. */
    finish({ reason = 'done', won = false } = {}) {
      if (!startedAt) return;
      const timeMs = Date.now() - startedAt;
      startedAt = 0; clearLoops();
      const par = spec.par(level, A.cfg);
      const previousBest = record.best;
      const out = applyResult(record, { level, score, par, misses, timeMs, daily, day: dayKey() });
      record = out.record; set(storeKey, record);
      const arc = applyArcade(get(ARCADE_KEY), { gameId: spec.id, day: dayKey(), badgesEarned: out.newBadges.length });
      const streakNew = arc.streakBadges.filter((b) => !record.earned.includes(b));
      for (const b of streakNew) record.earned.push(b);
      if (streakNew.length) set(storeKey, record);
      set(ARCADE_KEY, arc.arcade);
      const stars = out.stars;
      A.sfx(stars >= 2 ? 'success' : stars === 1 ? 'confirm' : 'miss');
      A.sayLine(stars >= 2 ? 3 : 4);
      const why = reason === 'time' ? 'Time is up.' : reason === 'lives' ? 'Out of lives.' : won ? 'Round complete!' : 'Round over.';
      const next = nextGame(spec.id);
      results.replaceChildren(h('section', { class: 'card game-results arc-results-card', 'aria-labelledby': 'game-results-h' },
        h('h2', { id: 'game-results-h' }, `${why} Level ${level}: ${score} points`),
        h('p', { class: 'game-stars', 'aria-label': `${stars} of 3 stars` }, '★'.repeat(stars) + '☆'.repeat(3 - stars)),
        h('p', {}, bestLine(score, previousBest)),
        misses ? h('p', { class: 'muted' }, `${misses} miss${misses === 1 ? '' : 'es'} · par for three stars is ${par}`) : h('p', { class: 'muted' }, `No misses · par for three stars is ${par}`),
        out.unlockedNow ? h('p', { class: 'arc-unlock' }, `Level ${out.unlockedNow} unlocked: ${spec.levels[out.unlockedNow - 1]?.name || ''}.`) : null,
        [...out.newBadges, ...streakNew].length ? h('p', { class: 'arc-badges' }, 'New badge' + ([...out.newBadges, ...streakNew].length > 1 ? 's' : '') + ': ', ...[...out.newBadges, ...streakNew].map((b) => h('span', { class: 'arc-badge' }, BADGES[b] || b))) : null,
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn', onclick: () => restart() }, stars === 3 && level < 5 ? 'Play again' : 'One more go'),
          stars >= 1 && level < 5 ? h('button', { type: 'button', class: 'btn', onclick: () => { level = Math.min(5, level + 1); renderLevels(); restart(); } }, `Level ${level + 1} →`) : null,
          next ? h('a', { class: 'btn secondary', href: `#/${next.id}` }, `Next: ${next.title}`) : null,
          h('a', { class: 'btn secondary', href: '#/games' }, 'All games'))));
      reactRimon(streakNew.length ? 'stretch' : stars >= 2 ? 'highfive' : stars ? 'laugh' : 'sad');
      renderLevels(); renderStreak();
      status.textContent = `${why} ${score} points, ${stars} of 3 stars.`;
      try { results.querySelector('h2')?.focus?.(); } catch { /* no focus in small DOM */ }
    },
    destroy() {
      alive = false; startedAt = 0; clearLoops();
      window.removeEventListener('keydown', onKey);
      try { ctx?.audio?.stop?.(); } catch { /* already gone */ }
      leaveSfx();
    },
  };

  function restart() {
    if (!alive) return;
    clearLoops();
    results.replaceChildren();
    score = 0; misses = 0; lives = 0;
    hudScore.textContent = 'Score 0'; hudLives.textContent = '';
    rnd = daily ? seededRandom(seedFrom(`${spec.id}|${dayKey()}|${level}`)) : Math.random;
    renderLevels();
    startedAt = Date.now();
    timeLeft = untimed ? 0 : Math.max(20, Math.round(spec.seconds ? spec.seconds(level, A.cfg) : 90));
    hudTime.textContent = untimed ? '' : `⏱ ${timeLeft}s`;
    if (!untimed) timerId = setInterval(tickTimer, 1000);
    status.textContent = `Level ${level}: ${A.cfg?.name || ''}. ${daily ? 'Daily challenge board.' : ''}`.trim();
    try { roundSetup?.(A); } catch (e) { console.warn(spec.id, e); status.textContent = 'This round could not be set up. Try another level.'; }
    A.sayLine(2);
  }
  function onKey(e) {
    if (!alive || !startedAt) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', ' ': 'space', Enter: 'enter' };
    const k = map[e.key] || e.key;
    let used = false;
    for (const fn of keyHandlers) { try { if (fn(k, e) !== false) used = true; } catch { /* handler error must not kill the page */ } }
    if (used && (k in map || map[e.key])) e.preventDefault();
  }
  window.addEventListener('keydown', onKey);
  renderLevels(); renderStreak();
  status.textContent = 'Pick a level and press Start, or play the daily challenge.';
  results.replaceChildren(h('button', { type: 'button', class: 'btn arc-start', onclick: () => restart() }, `Start level ${level}`));
  return A;
}

/** The next game in the catalogue after this one (wraps), for the results hand-off. */
export function nextGame(id) {
  const i = ARCADE_GAMES.findIndex((g) => g.id === id);
  if (i < 0) return ARCADE_GAMES[0] || null;
  return ARCADE_GAMES[(i + 1) % ARCADE_GAMES.length] || null;
}

/** Standard mount wrapper so every game view is two lines. */
export function mountArcade(spec, setup) {
  return async function mount(root, ctx) {
    const A = await createArcade(root, ctx, spec);
    if (!A) return () => {};
    A.onRound(setup);
    return () => A.destroy();
  };
}

/** A grid of cells (buttons when onCell is given). Returns { el, cells } with cells[r][c]. Hebrew order: direction rtl. */
export function makeGrid(rows, cols, { onCell = null, label = 'Board', cellClass = '' } = {}) {
  const cells = [];
  const el = h('div', { class: 'arc-grid', role: onCell ? 'grid' : 'img', 'aria-label': label, style: `grid-template-columns: repeat(${cols}, var(--arc-cell))` });
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const cell = onCell
        ? h('button', { type: 'button', class: `arc-cell ${cellClass}`.trim(), 'data-r': r, 'data-c': c, lang: 'he', dir: 'rtl', onclick: () => onCell(r, c, cell) })
        : h('span', { class: `arc-cell ${cellClass}`.trim(), 'data-r': r, 'data-c': c, lang: 'he', dir: 'rtl' });
      row.push(cell); el.append(cell);
    }
    cells.push(row);
  }
  return { el, cells };
}

/** Multiple-choice row. onPick(option, button) returns true when right; buttons colour and lock. */
export function choiceRow(options, render, onPick, { label = 'Choices' } = {}) {
  const row = h('div', { class: 'arc-choices', role: 'group', 'aria-label': label });
  for (const opt of options) {
    const b = h('button', { type: 'button', class: 'arc-choice', lang: 'he', dir: 'rtl' }, render(opt));
    b.addEventListener('click', () => {
      if (b.disabled) return;
      const ok = onPick(opt, b);
      b.classList.add(ok ? 'is-good' : 'is-bad');
      if (ok) for (const x of row.querySelectorAll('button')) x.disabled = true; else b.disabled = true;
    });
    row.append(b);
  }
  return row;
}

/** Random integer in [0, n). */
export const randInt = (rnd, n) => Math.floor(rnd() * n);

export { starsFor, BADGES, ARCADE_KEY };
