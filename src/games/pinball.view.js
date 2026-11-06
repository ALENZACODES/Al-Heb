// Game 6. DOM physics only; scoring requires an explicitly aimed flipper shot.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, imgOf, speak, resultsCard } from './engine.js';
import { loadJson } from '../grammar/loader.js';

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
  let alive = true, raf = 0, last = 0, deck = [], R = null, choices = [], expected, aim = 1, rounds = 0, session, running = false;
  const ball = { x: 50, y: 90, vx: 0, vy: 0, armed: false };
  const status = h('p', { role: 'status', 'aria-live': 'polite' }, 'Loading letter records…');
  const board = h('div', { class: 'game-board' });
  const table = h('div', { class: 'pinball-table', 'aria-label': 'Pinball table' });
  const marble = h('div', { class: 'pinball-ball', 'aria-hidden': 'true' });
  const targets = h('div', { class: 'pinball-targets' });
  const controls = h('div', { class: 'row' });
  function flip() {
    if (!alive || !running) return;
    if (launchBall(ball, choices[aim].x)) status.textContent = `Shot launched · Find ${expected.name}`;
  }
  for (const side of ['Left flipper', 'Right flipper']) controls.append(h('button', { type: 'button', class: 'btn', onclick: flip }, side));
  root.replaceChildren(h('article', { class: 'card game-card' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'The Hebrew Pinball Bouncer'),
    h('p', {}, 'Find the named Hebrew letter. Tap its bumper to aim, then press a flipper. Only matching shots score. Keyboard: arrows aim; Space launches.'), status, board));
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
  function start() {
    session = createSession({ par: 6 }); rounds = 0; last = 0; resetBall(); running = true;
    table.replaceChildren(targets, marble);
    const image = imgOf(R, 'id', 'GAME_pinball_table');
    if (image) table.style.backgroundImage = `url("${image.src}")`;
    board.replaceChildren(table, controls); newRound();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  }
  function tick(now) {
    if (!alive || !running || !table.isConnected) return;
    const hit = stepBall(ball, last ? (now - last) / 1000 : 0, choices, expected.id);
    last = now;
    marble.style.left = `${ball.x}%`; marble.style.top = `${ball.y}%`;
    if (hit) {
      session.answer(hit.correct);
      const letter = choices.find(c => c.id === hit.id);
      if (letter) void speak(ctx, letter.he);
      resetBall();
      if (hit.correct) rounds++;
      if (rounds >= 8) {
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
    if (!alive || !running || /INPUT|TEXTAREA|SELECT|BUTTON|A/.test(e.target?.tagName || '')) return;
    if (!['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) return;
    e.preventDefault();
    if (e.key === ' ') flip();
    else { aim = (aim + (e.key === 'ArrowLeft' ? 2 : 1)) % 3; paintAim(); }
  }
  window.addEventListener('keydown', key);
  Promise.all([loadJson('data/letters/letters.json'), loadGameImages(ctx)]).then(([letters, images]) => {
    if (!alive) return;
    deck = buildPinballDeck(letters); R = images;
    if (deck.length < 3) { status.textContent = 'At least three complete letter records are required.'; return; }
    start();
  }).catch(() => { if (alive) status.textContent = 'Letter data unavailable. Try again when online.'; });
  return () => { alive = false; running = false; cancelAnimationFrame(raf); window.removeEventListener('keydown', key); };
}
