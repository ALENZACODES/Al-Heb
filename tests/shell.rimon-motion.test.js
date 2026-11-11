// Rimon's body movement (src/shell/rimon-motion.js) on a fake DOM: when Rimon moves, and when Rimon keeps still.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDocument, ev, flush } from './rimon.fakedom.js';
import { mountRimonMotion, pickFidget, isShabbatQuiet, FIDGETS, MOVES, OWN_MOVES, OWN_MOVE_EVERY } from '../src/shell/rimon-motion.js';

const WEEKDAY = () => new Date(2026, 10, 11, 10, 0); // a Wednesday morning
const mounted = [];
test.afterEach(() => { for (const m of mounted.splice(0)) m.destroy(); });
function setup({ reduce = false, date = WEEKDAY, random = () => 0 } = {}) {
  const doc = createDocument();
  const host = doc.createElement('aside'); host.className = 'rimon-companion rimon-corner'; host.dataset.action = 'idle';
  const sprite = doc.createElement('span'); sprite.className = 'rimon-sprite';
  const still = doc.createElement('img'); still.className = 'rimon-still'; still.hidden = true;
  host.append(sprite, still); doc.body.append(host);
  const played = [];
  const companion = { element: host, play: (name) => { played.push(name); } };
  let clock = 1000;
  const win = { matchMedia: () => ({ matches: reduce }) };
  const m = mountRimonMotion({ companion, doc, win, random, now: () => clock, date, tickMs: 100000 });
  mounted.push(m);
  return { doc, host, still, played, m, tick: (ms = 0) => { clock += ms; m._test.tick(); }, at: () => clock };
}
const fxOn = (host) => host.className.split(/\s+/).filter((c) => c.startsWith('rimon-fx-'));

test('mounting marks the companion lively; destroy takes every mark away', () => {
  const { host, m } = setup();
  assert.ok(host.classList.contains('rimon-lively'));
  m.fx('hop'); assert.deepEqual(fxOn(host), ['rimon-fx-hop']);
  m.destroy();
  assert.ok(!host.classList.contains('rimon-lively')); assert.deepEqual(fxOn(host), []);
  assert.equal(mountRimonMotion({ companion: null }), null, 'no companion: nothing to move');
});

test('a movement class lasts for its length and one movement replaces another', async () => {
  const { host, m } = setup();
  assert.equal(m.fx('nosuch'), false);
  assert.equal(m.fx('wiggle'), true); assert.equal(m.fx('boing'), true);
  assert.deepEqual(fxOn(host), ['rimon-fx-boing']);
  await flush(MOVES.boing + 60);
  assert.deepEqual(fxOn(host), [], 'the class is removed when the movement ends');
  m.destroy();
});

test('while waiting, Rimon fidgets, and every few beats plays a drawn move', () => {
  const { played, m } = setup();
  const seen = [];
  for (let i = 1; i <= OWN_MOVE_EVERY * 2; i++) {
    seen.push(m.beat());
    m.stop(); // end the movement by hand: the test does not wait for its timer
  }
  assert.equal(played.length, 2, 'every third beat is a drawn move');
  assert.ok(played.every((p) => OWN_MOVES.includes(p)));
  assert.equal(seen.filter((r) => r in FIDGETS).length, OWN_MOVE_EVERY * 2 - 2, 'the other beats are fidgets');
});

test('the idle timer waits its turn, then fires a beat and plans the next one', () => {
  const { host, m, tick, at } = setup();
  tick(1000); assert.deepEqual(fxOn(host), [], 'too soon');
  tick(20000);
  assert.equal(fxOn(host).length, 1, 'a fidget after the wait');
  assert.ok(m._test.nextAt > at(), 'the next one is planned');
  m.destroy();
});

test('Rimon keeps still: reduced motion, calm mode, hidden, ducked on phones, a quiet screen, a reaction in progress', () => {
  let s = setup({ reduce: true }); assert.equal(s.m.fx('hop'), false); assert.equal(s.m.beat(), false); s.m.destroy();
  s = setup(); s.doc.documentElement.setAttribute('data-calm', ''); assert.equal(s.m.fx('hop'), false); s.m.destroy();
  s = setup(); s.host.hidden = true; assert.equal(s.m.fx('hop'), false); s.m.destroy();
  s = setup(); s.host.classList.add('rimon-peek'); assert.equal(s.m.fx('hop'), false); s.m.destroy();
  s = setup(); s.host.classList.add('rimon-static'); assert.equal(s.m.fx('hop'), false); s.m.destroy();
  s = setup(); s.doc.body.dataset.rimonQuiet = 'route'; assert.equal(s.m.fx('hop'), false); s.m.destroy();
  s = setup(); s.host.dataset.action = 'bounce'; assert.equal(s.m.beat(), false, 'no fidget over a reaction'); assert.equal(s.played.length, 0); s.m.destroy();
});

test('Friday evening to Saturday night only the sway stays: no fidgets, no moves of its own', () => {
  assert.equal(isShabbatQuiet(new Date(2026, 10, 13, 19, 0)), true);  // Friday 19:00
  assert.equal(isShabbatQuiet(new Date(2026, 10, 14, 12, 0)), true);  // Saturday noon
  assert.equal(isShabbatQuiet(new Date(2026, 10, 14, 21, 30)), false); // Saturday night
  assert.equal(isShabbatQuiet(WEEKDAY()), false);
  const s = setup({ date: () => new Date(2026, 10, 14, 12, 0) });
  for (let i = 0; i < 6; i++) assert.equal(s.m.beat(), false);
  assert.deepEqual(fxOn(s.host), []); assert.equal(s.played.length, 0);
  s.m.destroy();
});

test('a new screen brings a hop in; a new still pops; a tap gets a happy reaction', async () => {
  const s = setup();
  s.doc.dispatchEvent(ev('alef:ready'));
  await flush(90);
  assert.deepEqual(fxOn(s.host), ['rimon-fx-enter']);
  s.still.hidden = false; s.still.src = 'data/images/rimon/rimon-135.webp'; s.tick(10);
  assert.deepEqual(fxOn(s.host), ['rimon-fx-pop'], 'dressed for the screen: a pop');
  s.tick(10); s.host.classList.remove('rimon-fx-pop'); s.tick(10);
  assert.deepEqual(fxOn(s.host), [], 'the same still does not pop again');
  s.tick(2000);
  s.host.dispatchEvent({ type: 'click', target: s.host.querySelector('.rimon-sprite') });
  assert.deepEqual(fxOn(s.host), ['rimon-fx-boing']);
  assert.equal(s.played.length, 1, 'a tap plays one happy move');
  s.m.destroy();
});

test('a reaction clears a fidget so the reaction is seen; pickFidget never repeats itself', () => {
  const s = setup();
  s.m.fx('lean'); s.doc.dispatchEvent(ev('alef:rimon', { action: 'correct' }));
  assert.deepEqual(fxOn(s.host), []);
  s.m.destroy();
  for (const name of Object.keys(FIDGETS)) for (const r of [0, 0.3, 0.6, 0.99]) assert.notEqual(pickFidget(() => r, name), name);
});

test('the stylesheet has a movement for every fidget, move and reaction, and reduced motion is still covered', () => {
  const css = readFileSync(new URL('../assets/css/rimon-motion.css', import.meta.url), 'utf8');
  const base = readFileSync(new URL('../assets/css/rimon.css', import.meta.url), 'utf8');
  for (const name of [...Object.keys(FIDGETS), ...Object.keys(MOVES)]) assert.ok(css.includes(`.rimon-fx-${name} `), `a rule for rimon-fx-${name}`);
  for (const a of ['bounce', 'laugh', 'wave', 'wink', 'highfive', 'nervous', 'sad', 'thinking', 'point', 'stretch', 'yawn']) assert.ok(css.includes(`.rimon-lively[data-action=${a}] .rimon-sprite`), `a body movement for ${a}`);
  const used = [...css.matchAll(/animation:([^;}]+)/g)].flatMap((m) => m[1].replace(/\([^)]*\)/g, '').split(',')).map((p) => p.trim().split(/\s+/)[0]).filter((n) => n && !n.startsWith('none'));
  assert.ok(used.length > 20);
  for (const k of new Set(used)) assert.ok(new RegExp(`@keyframes ${k}\\{`).test(css), `keyframes ${k} are defined`);
  // the companion's own stylesheet still stops every Rimon animation for reduced motion and the static mode
  assert.match(base, /prefers-reduced-motion:reduce\)\{\.rimon-sprite\{animation:none!important/);
  assert.match(base, /\.rimon-static \.rimon-sprite\{animation:none!important/);
  assert.match(css, /prefers-reduced-motion:reduce\)\{\.rimon-hero img,/);
});
