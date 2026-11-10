// Game 6. DOM physics only; scoring requires an explicitly aimed flipper shot.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, imgOf, speak, resultsCard } from './engine.js';
import { loadJson } from '../grammar/loader.js';
import { sfx } from '../audio/sfx.js';

export const STORE_KEY = 'games.pinball.v1';
export function buildPinballDeck(letters) {
  return (Array.isArray(letters) ? letters : []).filter(r => r?.id && r.he && r.name)
    .map(r => ({ id: r.id, he: r.he, name: r.name }));
}
export function launchBall(ball, aimX) {
  if (ball.y < 75 || ball.armed) return false;
  ball.vx = (aimX - ball.x) / .65;
  ball.vy = (20 - ball.y - 30 * .65 ** 2) / .65;
  ball.armed = true;
  return true;
}
// Collisions consume the shot. Idle bounces and repeated contacts cannot score.
/** Keyboard aim/launch still works when focus is on a game button. Space on a button stays the button's own click. */
export function pinballKeyCommand(key, tagName = '') {
  const tag = String(tagName || '');
  if (/INPUT|TEXTAREA|SELECT/.test(tag)) return null;
  if (!['ArrowLeft', 'ArrowRight', ' '].includes(key)) return null;
  if (key === ' ' && tag === 'BUTTON') return null;
  if (key === ' ') return 'launch';
  return key === 'ArrowLeft' ? 'aim-left' : 'aim-right';
}
export function stepBall(ball, dt, targets, expectedId) {
  const t = Math.max(0, Math.min(.03, dt));
  ball.vy += 60 * t; ball.x += ball.vx * t; ball.y += ball.vy * t;
  if (ball.x < 3 || ball.x > 97) { ball.x = Math.max(3, Math.min(97, ball.x)); ball.vx *= -.8; }
  if (ball.y < 3) { ball.y = 3; ball.vy = Math.abs(ball.vy); }
  for (const target of targets) {
    if (Math.hypot(ball.x - target.x, ball.y - 20) > 8) continue;
    ball.vy = Math.abs(ball.vy);
    if (!ball.armed) return null;
    ball.armed = false;
    return { id: target.id, correct: target.id === expectedId };
  }
  if (ball.y > 96) Object.assign(ball, { x: 50, y: 90, vx: 0, vy: 0, armed: false });
  return null;
}
export function mount(root, ctx) {
  const leaveSfx = sfx.enter(ctx);
  let alive = true, raf = 0, last = 0, deck = [], R = null, choices = [], expected, aim = 1, rounds = 0, session, running = false, paused = false, barObserver = null;
  const ball = { x: 50, y: 90, vx: 0, vy: 0, armed: false };
  const status = h('p', { role: 'status', 'aria-live': 'polite' }, 'Loading letter records…');
  const speechNote = h('p', { class: 'muted', 'data-speech': 'pinball' });
  const board = h('div', { class: 'game-board' });
  const table = h('div', { class: 'pinball-table', 'aria-label': 'Pinball table' });
  const marble = h('div', { class: 'pinball-ball', 'aria-hidden': 'true' });
  const targets = h('div', { class: 'pinball-targets' });
  const controls = h('div', { class: 'row' });
  function flip() {
    if (!alive || !running || paused) return;
    sfx.play('flipper');
    if (launchBall(ball, choices[aim].x)) {
      sfx.play('whoosh');
      status.textContent = `Shot launched · Find ${expected.name}`;
    }
  }
  const pauseBtn = h('button', { type: 'button', class: 'btn secondary', 'aria-pressed': 'false', onclick: () => {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    pauseBtn.setAttribute('aria-pressed', String(paused));
    if (!paused && alive && running) { last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
  } }, 'Pause');
  for (const side of ['Left flipper', 'Right flipper']) controls.append(h('button', { type: 'button', class: 'btn', onclick: flip }, side));
  controls.append(pauseBtn);
  root.replaceChildren(h('article', { class: 'card game-card' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'The Hebrew Pinball Bouncer'),
    h('p', {}, 'Find the named Hebrew letter. Tap its bumper to aim, then press a flipper. Only matching shots score. Keyboard: arrows aim; Space launches.'), status, speechNote, board));
  function newRound() {
    expected = shuffled(deck)[0];
    choices = shuffled([expected, ...shuffled(deck.filter(r => r.id !== expected.id)).slice(0, 2)])
      .map((r, i) => ({ ...r, x: 20 + i * 30 }));
    aim = 1;
    targets.replaceChildren(...choices.map((c, i) => h('button', { type: 'button', class: 'pinball-bumper',
      'aria-pressed': i === aim, onclick: () => { aim = i; paintAim(); } }, heSpan(c.he, 'he game-he-sm'))));
    status.textContent = `Hit ${expected.name} · Match ${rounds + 1} of 8 · Score ${session.score}`;
  }
  function paintAim() {
    [...targets.children].forEach((e, i) => e.setAttribute('aria-pressed', String(i === aim)));
  }
  function resetBall() { Object.assign(ball, { x: 50, y: 90, vx: 0, vy: 0, armed: false }); }
  // The phone tab bar is fixed. A notice above the table can leave only a strip of it on screen, under that bar.
  // Scroll the whole table up so the flippers and bumpers clear the bar. The bar stays, and the artwork size stays.
  function revealTable() {
    try {
      if (!alive || !table.isConnected || typeof table.getBoundingClientRect !== 'function' || typeof table.scrollIntoView !== 'function') return;
      const nav = document.querySelector?.('.site-nav');
      if (!nav || typeof nav.getBoundingClientRect !== 'function' || typeof getComputedStyle !== 'function') return;
      const pos = getComputedStyle(nav).position;
      if (pos !== 'fixed' && pos !== 'sticky') return;
      if (table.getBoundingClientRect().bottom > nav.getBoundingClientRect().top - 4) table.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } catch { /* tests have no page layout */ }
  }
  function watchSoundBar() {
    if (barObserver || typeof ResizeObserver !== 'function') return;
    const bar = document.querySelector?.('.sound-bar');
    if (!bar) return;
    barObserver = new ResizeObserver(() => revealTable());
    try { barObserver.observe(bar); } catch { barObserver = null; }
  }
  function start() {
    session = createSession({ store: ctx?.store, storeKey: STORE_KEY, par: 6 }); rounds = 0; last = 0; resetBall(); running = true;
    table.replaceChildren(targets, marble);
    const image = imgOf(R, 'id', 'GAME_pinball_table');
    if (image) table.style.backgroundImage = `url("${image.src}")`;
    board.replaceChildren(controls, table); newRound();
    revealTable();
    watchSoundBar();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  }
  function tick(now) {
    if (!alive || !running || paused || !table.isConnected) return;
    const hit = stepBall(ball, last ? (now - last) / 1000 : 0, choices, expected.id);
    last = now;
    marble.style.left = `${ball.x}%`; marble.style.top = `${ball.y}%`;
    if (hit) {
      session.answer(hit.correct);
      sfx.play(hit.correct ? 'collect' : 'miss');
      const letter = choices.find(c => c.id === hit.id);
      if (letter) void speak(ctx, letter.he, { kind: 'letter', id: letter.id, onStatus: (m) => { speechNote.textContent = m; } });
      resetBall();
      if (hit.correct) rounds++;
      if (rounds >= 8) {
        sfx.play('streak');
        running = false;
        board.replaceChildren(resultsCard(h, heSpan, session, { title: 'Eight matching shots!', onAgain: start }));
        status.textContent = 'Table complete.'; return;
      }
      newRound();
      if (!hit.correct) status.prepend('Different letter. ');
    }
    raf = requestAnimationFrame(tick);
  }
  function key(e) {
    const command = pinballKeyCommand(e.key, e.target?.tagName);
    if (!alive || !running || paused || !command) return;
    e.preventDefault();
    if (command === 'launch') flip();
    else { aim = (aim + (command === 'aim-left' ? 2 : 1)) % 3; paintAim(); }
  }
  window.addEventListener('keydown', key);
  Promise.all([loadJson('data/letters/letters.json'), loadGameImages(ctx)]).then(([letters, images]) => {
    if (!alive) return;
    deck = buildPinballDeck(letters); R = images;
    if (deck.length < 3) { status.textContent = 'At least three complete letter records are required.'; return; }
    start();
  }).catch(() => { if (alive) status.textContent = 'Letter data unavailable. Try again when online.'; });
  return () => { alive = false; running = false; cancelAnimationFrame(raf); try { barObserver?.disconnect(); } catch { /* already gone */ } window.removeEventListener('keydown', key); try { ctx?.audio?.stop?.(); } catch { /* already gone */ } leaveSfx(); };
}
