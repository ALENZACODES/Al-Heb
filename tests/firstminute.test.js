// First-minute pass (2026-11-10): the header stat bar, Rimon in the page, the streak flame on the first lesson's finish,
// the light Rimon sheets, the tab icons and the design tokens. Pure logic and file checks; the look is checked by screenshots
// (docs/strategy/FIRST-MINUTE-AUDIT-2026-11-10.md), not here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { N } from './torahread.fakedom.js';
import { statModel, statbarWanted } from '../src/shell/statbar.js';
import { framePos, sheetUrl, rimonInline, rimonSays } from '../src/shell/rimon-inline.js';
import { ACTIONS } from '../src/shell/rimon.js';
import { flameState } from '../src/firstday/firstday.view.js';
import { dayKey } from '../src/curriculum/streak.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const NOW = new Date('2026-11-10T15:00:00').getTime();
const today = dayKey(NOW);
const v2 = (o) => ({ v: 2, count: 0, best: 0, last: null, todayDate: today, todaySeconds: 0, frozenDates: [], ...o });

test('stat bar: no streak yet, minutes against the daily goal from setup', () => {
  const m = statModel({ streak: null, dailyGoal: 10, now: NOW });
  assert.equal(m.count, 0); assert.equal(m.lit, false); assert.equal(m.goalMin, 10); assert.equal(m.todayMin, 0); assert.equal(m.pct, 0);
  assert.match(m.streakLabel, /^0-day streak/); assert.match(m.goalLabel, /^0\/10 minutes today/, 'the spoken name starts with the visible text');
});
test('stat bar: a lit day, minutes rounded down, goal met at the goal', () => {
  const m = statModel({ streak: v2({ count: 3, best: 3, last: today, todaySeconds: 10 * 60 + 59 }), dailyGoal: 10, now: NOW });
  assert.equal(m.count, 3); assert.equal(m.lit, true); assert.equal(m.todayMin, 10); assert.equal(m.met, true); assert.equal(m.pct, 100);
  assert.match(m.streakLabel, /3-day streak, today counts/);
});
test('stat bar: an unknown daily goal falls back to 5 minutes; the bar hides before setup and in calm mode', () => {
  assert.equal(statModel({ dailyGoal: 7, now: NOW }).goalMin, 5);
  const s = (o) => ({ get: (k) => o[k] });
  assert.equal(statbarWanted(s({ onboarded: false })), false);
  assert.equal(statbarWanted(s({ onboarded: true })), true);
  assert.equal(statbarWanted(s({ onboarded: true, calmMode: true })), false);
  assert.equal(statbarWanted(s({ onboarded: true, showStreak: false })), false);
});

test('finish-screen flame: fills toward 5 minutes, then lights with the day count', () => {
  const half = flameState(v2({ todaySeconds: 150 }), NOW);
  assert.equal(half.lit, false); assert.equal(half.fill, 50); assert.match(half.sub, /3 more minutes .* lights day 1/);
  const lit = flameState(v2({ count: 1, best: 1, last: today, todaySeconds: 300 }), NOW);
  assert.equal(lit.lit, true); assert.equal(lit.title, 'Day 1 of your streak!');
  const keep = flameState(v2({ count: 4, best: 4, last: dayKey(NOW - 86400000), todaySeconds: 240 }), NOW);
  assert.equal(keep.lit, false); assert.match(keep.sub, /1 more minute of study today keeps your 4-day streak/);
});

test('Rimon in the page: frame positions walk the 4 x 3 sheet in reading order', () => {
  assert.equal(framePos(0), '0% 0%');
  assert.equal(framePos(3), '100% 0%');
  assert.equal(framePos(4), '0% 50%');
  assert.equal(framePos(11), '100% 100%');
  assert.equal(framePos(12), '0% 0%');
  assert.match(sheetUrl('highfive'), /assets\/img\/rimon\/web\/highfive\.webp$/);
  assert.match(sheetUrl('no-such-move'), /blink\.webp$/);
});
test('Rimon in the page: a still frame outside a browser, and a speech bubble with his line', () => {
  const r = rimonInline({ action: 'wave', size: 90 });
  assert.equal(r.el.attrs['data-action'], 'wave'); assert.equal(r.el.attrs['data-frame'], '0');
  assert.match(r.el.attrs.style, /--rimon-size:90px/);
  const s = rimonSays('Shalom!', { ariaHidden: true });
  assert.equal(s.bubble.textContent, 'Shalom!'); assert.equal(s.bubble.attrs['aria-hidden'], 'true');
  assert.ok(s.el instanceof N);
});
test('every Rimon action has a light WebP sheet in the same 4:3 grid', () => {
  for (const name of Object.keys(ACTIONS)) {
    const p = new URL(`../assets/img/rimon/web/${name}.webp`, import.meta.url);
    assert.ok(existsSync(p), name);
    const b = readFileSync(p);
    assert.equal(b.toString('ascii', 0, 4), 'RIFF'); assert.equal(b.toString('ascii', 8, 12), 'WEBP');
    assert.ok(b.length < 200 * 1024, `${name} stays light (${b.length} bytes)`);
    const chunk = b.toString('ascii', 12, 16);
    let w, h;
    if (chunk === 'VP8X') { w = 1 + b.readUIntLE(24, 3); h = 1 + b.readUIntLE(27, 3); }
    else if (chunk === 'VP8L') { const bits = b.readUInt32LE(21); w = (bits & 0x3fff) + 1; h = ((bits >> 14) & 0x3fff) + 1; }
    else { w = b.readUInt16LE(26) & 0x3fff; h = b.readUInt16LE(28) & 0x3fff; }
    assert.equal(w / 4, h / 3, `${name}: square frames (${w}x${h})`);
  }
  assert.match(read('src/shell/rimon.js'), /assets\/img\/rimon\/web\//, 'the corner Rimon uses the light sheets too');
});

test('tokens load before the app styles and the polish layer loads last', () => {
  const html = read('index.html');
  const links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(links.indexOf('assets/css/tokens.css') < links.indexOf('assets/css/app.css'));
  assert.equal(links.at(-1), 'assets/css/polish.css');
  const tokens = read('assets/css/tokens.css');
  for (const v of ['--s-4', '--fs-xl', '--r-md', '--lip', '--dur-2', '--ease-spring', '--gold-500', '--green-900']) assert.ok(tokens.includes(v + ':'), v);
  const polish = read('assets/css/polish.css');
  for (const sel of ['body.ob-player', '.statbar', '.nav-ico-learn', '.rimon-say-bubble', '.fd-flame', '.fd-hero-glyph']) assert.ok(polish.includes(sel), sel);
  assert.match(polish, /prefers-reduced-motion: reduce/);
});
test('tabs carry an icon and the Progress tab has its Hebrew label like Learn', async () => {
  assert.match(read('src/shell/nav.js'), /nav-ico nav-ico-\$\{section\.id\}/);
  assert.match(read('index.html'), /class="nav-ico nav-ico-more"/);
  const { SECTIONS } = await import('../src/shell/nav-model.js');
  assert.equal(SECTIONS.find((s) => s.id === 'progress').heKey, 'nav.progress');
});
test('the dark green and gold look is the default theme; the teachers band takes its colours from the theme', async () => {
  const { DEFAULTS } = await import('../src/shell/settings.js');
  assert.equal(DEFAULTS.theme, 'dark');
  assert.doesNotMatch(read('src/shell/companions.js'), /style\.background\s*=/);
});

// ---------- round 2 ----------
test('every lesson summary has Rimon in the page and the streak flame from the shared record', async () => {
  const UI = await import('../src/curriculum/exercises.ui.js');
  const store = { get: (k) => (k === 'streak' ? v2({ todaySeconds: 120 }) : null), subscribe: () => () => {} };
  const node = UI.summaryNode({ store, stats: { accuracy: 0.9, missed: [], skipped: [] }, ms: 60000, countText: 'x', goodLabels: [], missedLabels: [], skippedN: 0, cardsUpdated: 1 });
  const find = (n, pred) => (pred(n) ? n : (n.children || []).reduce((a, c) => a || (c.nodeType === 1 ? find(c, pred) : null), null));
  assert.ok(find(node, (n) => (n.className || '').includes('rimon-inline')), 'Rimon sprite, not a still image');
  const flame = find(node, (n) => n.attrs?.['data-flame'] === '1');
  assert.ok(flame); assert.match(flame.textContent, /2 of 5 minutes today/);
  const quiet = UI.summaryNode({ store, showStreak: false, stats: { accuracy: 0.5, missed: [], skipped: [] }, ms: 1, countText: 'x', goodLabels: [], missedLabels: [], skippedN: 0, cardsUpdated: 0 });
  assert.equal(find(quiet, (n) => n.attrs?.['data-flame'] === '1'), null, 'no flame when streaks are hidden or in calm mode');
});
test('the flame card lights live when the record changes and calls back once', async () => {
  const { flameCard } = await import('../src/shell/flame.js');
  const { el } = await import('../src/curriculum/dom.js');
  let listener = null, lit = 0;
  const store = { get: () => v2({ todaySeconds: 200 }), subscribe: (f) => { listener = f; return () => {}; } };
  const card = flameCard({ make: el, store, now: () => NOW, onLit: () => { lit++; } });
  assert.equal(card.el.attrs.class, 'fd-flame');
  listener('streak', v2({ count: 1, best: 1, last: today, todaySeconds: 300 }));
  assert.equal(card.el.attrs.class, 'fd-flame is-lit'); assert.equal(lit, 1);
  listener('streak', v2({ count: 1, best: 1, last: today, todaySeconds: 320 }));
  assert.equal(lit, 1, 'only the moment it lights');
});

// ---------- round 3 ----------
test('path: only the next lesson is a card; finished, next and locked stops have their own marks; no dead Start button on locked stops', () => {
  const css = read('assets/css/polish.css');
  assert.match(css, /\.alef-lesson:not\(\.alef-lesson-available\) \{ background: transparent;/);
  assert.match(css, /\.alef-lesson-locked \.alef-btn\[disabled\] \{ display: none; \}/);
  for (const k of ['alef-lesson-done::before', 'alef-lesson-available::before', 'alef-lesson-locked::before']) assert.ok(css.includes(k), k);
});
test('Rimon in the page falls back to the single picture when a sheet cannot load', () => {
  const saved = globalThis.Image;
  let probe = null;
  globalThis.Image = function () { probe = this; };
  try {
    const r = rimonInline({ action: 'wave', size: 80 });
    assert.ok(probe && /wave\.webp$/.test(probe.src));
    probe.onerror();
    assert.equal(r.el.attrs['data-fallback'], '1');
    assert.match(r.el.attrs.style, /MASCOT_rimon\.800\.webp/);
  } finally { globalThis.Image = saved; }
});

// ---------- round 5 ----------
test('Progress opens with the header numbers (streak, minutes against the setup goal) and calls its card goal the review goal', () => {
  const src = read('src/progress/progress.view.js');
  assert.match(src, /statModel\(\{ streak: store\.get\('streak'\), dailyGoal: store\.get\(DAILY_GOAL_KEY\)/);
  assert.match(src, /'Review goal '/); assert.doesNotMatch(src, /'Daily goal '\), sel/);
});
test('a tapped locked stop names the lesson that opens it; a new badge gets a toast with its name', () => {
  assert.match(read('src/curriculum/learn.view.js'), /alef-locked-note[\s\S]*Opens after you finish/);
  const sb = read('src/shell/statbar.js');
  assert.match(sb, /key === 'awards\.v1'/); assert.match(sb, /New badge: \$\{name\}/);
});
