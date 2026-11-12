import { count } from '../shell/plural.js';
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
import { ARCADE_KEY, LEVELS, BADGES, applyResult, applyArcade, emptyRecord, seededRandom, seedFrom, dayKey, bestLine, starsFor, mistakesLine } from './arcade.model.js';
import { ARCADE_GAMES, HANUKKAH_GAMES } from './arcade.catalog.js';
import { roundMode, afterRound, tournamentRandom } from './round-extras.js'; // daily challenge, tournament runs, last-score ledger

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
  const mode = roundMode(ctx, spec.id); // ?daily=1 opens on the daily board; ?tournament=1 plays the open tournament run at level 1
  if (mode.level) level = mode.level;
  let daily = mode.daily, rnd = Math.random, roundSetup = null, alive = true;
  let score = 0, misses = 0, slips = 0, lives = 0, startedAt = 0, timeLeft = 0, timerId = 0, loopId = 0, loops = [];
  // readyAt: nothing moves and the clock does not run until the get-ready countdown ends. paused: same, on demand.
  let readyAt = 0, paused = false, countdownIds = [];
  const COUNTDOWN_S = 3;
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
  const pauseBtn = h('button', { type: 'button', class: 'btn secondary arc-pause', 'aria-pressed': false, hidden: true, onclick: () => setPaused(!paused) }, 'Pause');
  const dailyBtn = h('button', { type: 'button', class: 'btn secondary arc-daily', 'aria-pressed': daily, onclick: () => toggleDaily() }, daily ? `Daily challenge · ${dayKey()}` : 'Daily challenge');
  // Open until the learner has finished one round of this game; after that it folds away but stays one tap off.
  const howTo = h('details', { class: 'arc-howto', open: (record.plays || 0) === 0 ? true : undefined }, h('summary', {}, 'How to play'), h('ol', {}, ...spec.howTo.map((s) => h('li', {}, uiEnglish(ctx, s)))));
  const streakEl = h('p', { class: 'arc-streak muted' });
  // M-13: the Start button is on screen from the first paint. A tap that lands while the letters and words are still loading
  // is kept and starts the round the moment they arrive, instead of hitting a page that has no button yet (a dead first click).
  let dataReady = false, pendingStart = false;
  const startBtn = h('button', { type: 'button', class: 'btn arc-start', onclick: () => {
    if (dataReady) { restart(); return; }
    pendingStart = true; startBtn.textContent = 'Starting…'; status.textContent = 'Getting the letters ready…';
  } }, `Start level ${level}`);
  results.replaceChildren(startBtn);
  root.replaceChildren(h('article', { class: 'card game-card arcade', 'data-game': spec.id },
    h('div', { class: 'arc-eyebrow' }, `ARCADE · ${spec.levels.length} LEVELS`),
    titleEl,
    art(spec.id, 'env', '', 'game-env arc-env'),
    h('p', { class: 'arc-blurb' }, uiEnglish(ctx, spec.blurb)),
    howTo, levelBar, h('div', { class: 'row arc-row' }, dailyBtn, pauseBtn), hud, status, board, controls, results, streakEl,
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
        onclick: () => { if (!locked) { level = l; renderLevels(); restart(); } },
      }, h('span', { class: 'arc-level-n' }, locked ? h('span', { 'aria-hidden': 'true' }, '🔒') : String(l)), ' ', h('span', { class: 'arc-level-name' }, spec.levels[l - 1]?.name || ''),
        // the spoken name is the words on the button plus this hidden line (no aria-label, so the two can never disagree)
        h('span', { class: 'visually-hidden' }, `, level ${l}${locked ? ', locked' : `, ${lv?.stars || 0} of 3 stars`}`), h('span', { class: 'arc-level-stars', 'aria-hidden': 'true' }, stars));
    }));
    const best = record.levels?.[level]?.best || 0;
    hudBest.textContent = best ? `Best L${level}: ${best}` : 'No best yet';
  }
  function renderStreak() {
    const a = get(ARCADE_KEY);
    if (!showStreak || !a?.streak) { streakEl.textContent = ''; return; }
    streakEl.textContent = `Arcade streak: ${count(a.streak, 'day')} in a row · ${count(a.totalBadges || 0, 'badge')} across all games.`;
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
    for (const id of countdownIds) clearTimeout(id);
    countdownIds = [];
    if (timerId) { clearInterval(timerId); timerId = 0; }
  }
  function setPaused(on) {
    if (!startedAt && on) return;
    paused = !!on;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    pauseBtn.setAttribute('aria-pressed', String(paused));
    board.classList.toggle('is-paused', paused);
    status.textContent = paused ? 'Paused. Press Resume (or Esc) when you are ready.' : 'Playing.';
  }
  /** 3, 2, 1, Go: the board is visible (and the instructions readable) before anything moves or the clock runs. */
  function countdown(lead) {
    for (let n = COUNTDOWN_S; n >= 0; n--) {
      countdownIds.push(setTimeout(() => {
        if (!alive || !startedAt) return;
        status.textContent = n > 0 ? `${lead} Get ready: ${n}` : `${lead} Go!`;
        board.classList.toggle('is-ready', n > 0);
      }, (COUNTDOWN_S - n) * 1000));
    }
  }
  function tickTimer() {
    if (untimed) { hudTime.textContent = ''; return; }
    if (paused || Date.now() < readyAt) { hudTime.textContent = `⏱ ${timeLeft}s`; return; }
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
    get slips() { return slips; },
    get lives() { return lives; },
    get daily() { return daily; },
    get rnd() { return rnd; },
    get record() { return record; },
    /** Wall-clock time the round really starts (after the countdown). Use it, not Date.now(), as a round's t0. */
    get readyAt() { return readyAt; },
    get paused() { return paused; },
    cast: castArt,
    announce(text) { status.textContent = text; },
    addScore(n) { if(n > 0) reactRimon('bounce'); score = Math.max(0, score + n); hudScore.textContent = `Score ${score}`; },
    setLives(n) { lives = n; hudLives.textContent = n > 0 ? '♥'.repeat(Math.min(n, 5)) + (n > 5 ? `+${n - 5}` : '') : ''; },
    /** M-03: a wrong answer or guess that does not fail the item (no life lost). It still rules out the Perfect badge. */
    slip() { slips += 1; },
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
    /**
     * Step loop at intervalMs. Holds still during the get-ready countdown, while paused and while the page is
     * hidden; stops at finish. Steps are counted against real time, so a level's speed is the same on a 60 Hz
     * phone and a 120 Hz laptop (the old frame-rounding made several levels run at the same pace).
     */
    loop(step, intervalMs) {
      let last = 0;
      const frame = (t) => {
        if (!alive || !startedAt) return;
        if (document.hidden || paused || Date.now() < readyAt) last = 0;
        else if (!last) last = t;
        else {
          let n = 0;
          while (startedAt && t - last >= intervalMs && n < 3) { last += intervalMs; n++; try { step(); } catch (e) { console.warn(spec.id, e); } }
          if (t - last >= intervalMs) last = t; // after a long stall, do not race to catch up
        }
        if (!alive || !startedAt) return;
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
      startedAt = 0; clearLoops(); setPaused(false); pauseBtn.hidden = true; board.classList.remove('is-ready');
      const par = spec.par(level, A.cfg);
      const previousBest = record.best;
      const out = applyResult(record, { level, score, par, misses, slips, timeMs, daily, day: dayKey() });
      record = out.record; set(storeKey, record);
      const arc = applyArcade(get(ARCADE_KEY), { gameId: spec.id, day: dayKey(), badgesEarned: out.newBadges.length });
      const streakNew = arc.streakBadges.filter((b) => !record.earned.includes(b));
      for (const b of streakNew) record.earned.push(b);
      if (streakNew.length) set(storeKey, record);
      set(ARCADE_KEY, arc.arcade);
      const stars = out.stars;
      const extra = afterRound(h, ctx, { id: spec.id, level, score, stars, daily, tournament: mode.tournament, week: mode.week });
      A.sfx(stars >= 2 ? 'success' : stars === 1 ? 'confirm' : 'miss');
      A.sayLine(stars >= 2 ? 3 : 4);
      const why = reason === 'time' ? 'Time is up.' : reason === 'lives' ? 'Out of lives.' : won ? 'Round complete!' : 'Round over.';
      const next = nextGame(spec.id);
      results.replaceChildren(h('section', { class: 'card game-results arc-results-card', 'aria-labelledby': 'game-results-h' },
        h('h2', { id: 'game-results-h' }, `${why} Level ${level}: ${score} points`),
        h('p', { class: 'game-stars', 'aria-label': `${stars} of 3 stars` }, '★'.repeat(stars) + '☆'.repeat(3 - stars)),
        h('p', {}, bestLine(score, previousBest)),
        h('p', { class: 'muted' }, mistakesLine({ misses, slips }, par)),
        out.unlockedNow ? h('p', { class: 'arc-unlock' }, `Level ${out.unlockedNow} unlocked: ${spec.levels[out.unlockedNow - 1]?.name || ''}.`) : null,
        ...extra,
        [...out.newBadges, ...streakNew].length ? h('p', { class: 'arc-badges' }, 'New badge' + ([...out.newBadges, ...streakNew].length > 1 ? 's' : '') + ': ', ...[...out.newBadges, ...streakNew].map((b) => h('span', { class: 'arc-badge' }, BADGES[b] || b))) : null,
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn', onclick: () => restart() }, stars === 3 && level < 5 ? 'Play again' : 'One more go'),
          stars >= 1 && level < 5 ? h('button', { type: 'button', class: 'btn', onclick: () => { level = Math.min(5, level + 1); renderLevels(); restart(); } }, `Level ${level + 1} →`) : null,
          next ? h('a', { class: 'btn secondary', href: `#/${next.id}` }, `Next: ${next.title}`) : null,
          h('a', { class: 'btn secondary', href: '#/games' }, 'All games'))));
      reactRimon(streakNew.length ? 'stretch' : stars >= 2 ? 'highfive' : stars ? 'laugh' : 'sad');
      try { globalThis.document?.dispatchEvent?.(new CustomEvent('alef:game-finished', { detail: { stars } })); } catch { /* optional: XP listens for this (src/retention/) */ }
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
    score = 0; misses = 0; slips = 0; lives = 0; paused = false;
    pauseBtn.hidden = false; pauseBtn.textContent = 'Pause'; pauseBtn.setAttribute('aria-pressed', 'false'); board.classList.remove('is-paused');
    // Calm mode with no clock has nothing to get ready for; every other round counts in.
    const lead = untimed && quiet ? 0 : COUNTDOWN_S;
    readyAt = Date.now() + lead * 1000;
    hudScore.textContent = 'Score 0'; hudLives.textContent = '';
    rnd = daily ? seededRandom(seedFrom(`${spec.id}|${dayKey()}|${level}`)) : mode.tournament ? tournamentRandom(spec.id, mode.week) : Math.random;
    renderLevels();
    startedAt = Date.now();
    timeLeft = untimed ? 0 : Math.max(20, Math.round(spec.seconds ? spec.seconds(level, A.cfg) : 90));
    hudTime.textContent = untimed ? '' : `⏱ ${timeLeft}s`;
    if (!untimed) timerId = setInterval(tickTimer, 1000);
    const levelLine = `Level ${level}: ${A.cfg?.name || ''}.${daily ? ' Daily challenge board.' : ''}`;
    status.textContent = levelLine;
    try { roundSetup?.(A); } catch (e) { console.warn(spec.id, e); status.textContent = 'This round could not be set up. Try another level.'; }
    if (lead) countdown(levelLine);
    A.sayLine(2);
  }
  function onKey(e) {
    if (!alive || !startedAt) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', ' ': 'space', Enter: 'enter' };
    if (e.key === 'Escape') { setPaused(!paused); e.preventDefault(); return; }
    const k = map[e.key] || e.key;
    let used = false;
    for (const fn of keyHandlers) { try { if (fn(k, e) !== false) used = true; } catch { /* handler error must not kill the page */ } }
    if (used && (k in map || map[e.key])) e.preventDefault();
  }
  window.addEventListener('keydown', onKey);
  renderLevels(); renderStreak();
  status.textContent = 'Pick a level and press Start, or play the daily challenge.';
  startBtn.textContent = `Start level ${level}`;
  results.replaceChildren(startBtn);
  dataReady = true;
  // the round setup is registered by mountArcade right after this returns; a queued tap starts once it is
  if (pendingStart) setTimeout(() => { if (alive && !startedAt) restart(); }, 0);
  return A;
}

/** The next game in the catalogue after this one (wraps), for the results hand-off. */
export function nextGame(id) {
  const hk = HANUKKAH_GAMES.findIndex((g) => g.id === id); // a Hanukkah game hands on to the next Hanukkah game
  if (hk >= 0) return HANUKKAH_GAMES[(hk + 1) % HANUKKAH_GAMES.length] || null;
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
