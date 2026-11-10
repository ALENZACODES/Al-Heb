// Star of David light: feature detection, Shabbat gating, pulse cap, and stencil assets.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  hexagramPath, magenDavidTriangles, isPointUp,
  isLocalTorchQuiet, isTorchQuiet, clampStrobePeriod,
  torchConstraint, trackSupportsTorch, canRequestCamera, isLikelyTorchless,
  allowPulse, createWakeLock,
  MIN_STROBE_PERIOD_MS, DEFAULT_PULSE_PERIOD_MS, STENCIL_SIZES_MM,
  STENCIL_PDF, STENCIL_SVG,
} from '../src/light/light.js';
import { isShabbat } from '../src/shell/notify.js';
import { ROUTES } from '../src/shell/router.js';
import { ROUTE_SECTION } from '../src/shell/nav-model.js';
import { isOnDemand } from '../tools/build-precache.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const at = (iso) => new Date(iso);

test('route #/light is registered in the more section and lazy-loads its view', () => {
  const r = ROUTES.find((x) => x.name === 'light');
  assert.ok(r, 'light route missing');
  assert.equal(r.pattern, '/light');
  assert.equal(r.module, '../light/light.view.js');
  assert.equal(ROUTE_SECTION.light, 'more');
});

test('the light view and stylesheet are on-demand, not first-install', () => {
  assert.equal(isOnDemand('src/light/light.view.js'), true);
  assert.equal(isOnDemand('src/light/light.js'), true);
  assert.equal(isOnDemand('assets/css/light.css'), true);
  assert.equal(isOnDemand('assets/light/star-stencil.svg'), true);
  // PDFs are skipped entirely from both lists (downloaded when opened)
  assert.equal(isOnDemand('src/app.js'), false);
});

test('the hexagram is point-up and made of two overlapping triangles, not a mirrored P', () => {
  const { pts, d } = hexagramPath(100, 100, 50);
  assert.equal(pts.length, 12);
  assert.ok(isPointUp(pts));
  const top = pts[0];
  assert.ok(Math.abs(top[0] - 100) < 1e-6, 'first vertex is centred on x');
  assert.ok(top[1] < 100, 'first vertex is above the centre (screen y grows down)');
  const { up, down } = magenDavidTriangles(100, 100, 50);
  assert.ok(isPointUp(up));
  const downTop = down.reduce((a, p) => (p[1] < a[1] ? p : a), down[0]);
  // The downward triangle's highest vertices are a left-right pair, not a single top point on centre
  assert.ok(down[0][1] > up[0][1], 'down-triangle tip is below the up-triangle tip');
  assert.match(d, /^M/);
  assert.match(d, /Z$/);
});

test('local torch quiet is Friday 18:00 through Saturday 21:00 in the date\'s local zone', () => {
  // Construct local dates (the box and the owner are America/Toronto).
  const local = (y, m, d, h, min = 0) => new Date(y, m - 1, d, h, min, 0, 0);
  // Friday 7 Nov 2026 (weekday 5)
  assert.equal(local(2026, 11, 6, 12).getDay(), 5, '6 Nov 2026 is a Friday');
  assert.equal(isLocalTorchQuiet(local(2026, 11, 6, 17, 59)), false);
  assert.equal(isLocalTorchQuiet(local(2026, 11, 6, 18, 0)), true);
  assert.equal(isLocalTorchQuiet(local(2026, 11, 6, 23, 0)), true);
  assert.equal(isLocalTorchQuiet(local(2026, 11, 7, 0, 0)), true);
  assert.equal(isLocalTorchQuiet(local(2026, 11, 7, 20, 59)), true);
  assert.equal(isLocalTorchQuiet(local(2026, 11, 7, 21, 0)), false);
  assert.equal(isLocalTorchQuiet(local(2026, 11, 8, 10, 0)), false);
  assert.equal(isLocalTorchQuiet(local(2026, 11, 5, 19, 0)), false); // Thursday
});

test('with a city, torch quiet reuses the calendar Shabbat window (candle lighting to havdalah)', () => {
  const toronto = { lat: 43.65, lon: -79.38, tz: 'America/Toronto', candleMinutes: 18, havdalah: { mode: 'tzeit', degrees: 8.5 } };
  const during = at('2026-11-07T15:00:00Z'); // Sat 10:00 Toronto
  const before = at('2026-11-06T21:30:00Z'); // Fri 16:30 Toronto, before candles
  const after = at('2026-11-07T22:46:00Z'); // Sat 17:46 Toronto, after havdalah
  assert.equal(isShabbat(during, toronto), true);
  assert.equal(isTorchQuiet(during, toronto), true);
  assert.equal(isTorchQuiet(before, toronto), false);
  assert.equal(isTorchQuiet(after, toronto), false);
  // No city: do not use isShabbat (which is false), use the 18:00–21:00 local window instead
  assert.equal(isShabbat(during, null), false);
  assert.equal(isTorchQuiet(during, null), isLocalTorchQuiet(during));
});

test('strobe period is clamped so a full cycle is never faster than 3 Hz', () => {
  assert.equal(MIN_STROBE_PERIOD_MS, 334);
  assert.ok(DEFAULT_PULSE_PERIOD_MS >= MIN_STROBE_PERIOD_MS);
  assert.equal(clampStrobePeriod(100), MIN_STROBE_PERIOD_MS);
  assert.equal(clampStrobePeriod(0), MIN_STROBE_PERIOD_MS);
  assert.equal(clampStrobePeriod(NaN), DEFAULT_PULSE_PERIOD_MS);
  assert.equal(clampStrobePeriod(2400), 2400);
  assert.ok(1000 / MIN_STROBE_PERIOD_MS <= 3 + 1e-9);
});

test('torch constraint and track feature detection', () => {
  assert.deepEqual(torchConstraint(true), { advanced: [{ torch: true }] });
  assert.deepEqual(torchConstraint(0), { advanced: [{ torch: false }] });
  assert.equal(trackSupportsTorch({ getCapabilities: () => ({ torch: true }) }), true);
  assert.equal(trackSupportsTorch({ getCapabilities: () => ({}) }), false);
  assert.equal(trackSupportsTorch({ getCapabilities: () => { throw new Error('nope'); } }), false);
  assert.equal(trackSupportsTorch(null), false);
  assert.equal(trackSupportsTorch({}), false);
  assert.equal(canRequestCamera({ navigator: { mediaDevices: { getUserMedia: async () => {} } } }), true);
  assert.equal(canRequestCamera({ navigator: {} }), false);
  assert.equal(isLikelyTorchless({ navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' } }), true);
  assert.equal(isLikelyTorchless({ navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' } }), false);
});

test('pulse is off under reduced motion or calm mode; flash is also off when Shabbat-quiet', () => {
  assert.equal(allowPulse({ kind: 'glow' }), true);
  assert.equal(allowPulse({ kind: 'glow', reducedMotion: true }), false);
  assert.equal(allowPulse({ kind: 'glow', calm: true }), false);
  assert.equal(allowPulse({ kind: 'glow', torchQuiet: true }), true, 'the on-screen glow may stay on during Shabbat');
  assert.equal(allowPulse({ kind: 'flash', torchQuiet: true }), false);
  assert.equal(allowPulse({ kind: 'flash', reducedMotion: true }), false);
  assert.equal(allowPulse({ kind: 'flash' }), true);
});

test('wake lock requests the screen lock and releases it; missing API is a no-op', async () => {
  let released = false;
  const sentinel = { released: false, async release() { released = true; this.released = true; } };
  let requested = 0;
  const lock = createWakeLock({ wakeLock: { async request(type) { requested += 1; assert.equal(type, 'screen'); return sentinel; } } });
  assert.equal(lock.active, false);
  assert.equal(await lock.request(), true);
  assert.equal(lock.active, true);
  assert.equal(requested, 1);
  await lock.release();
  assert.equal(released, true);
  assert.equal(lock.active, false);
  const missing = createWakeLock({});
  assert.equal(await missing.request(), false);
  await missing.release();
  const rejects = createWakeLock({ wakeLock: { async request() { throw new Error('denied'); } } });
  assert.equal(await rejects.request(), false);
});

test('printable stencil exists, lists 8/10/12 mm openings, and carries no PDF metadata', () => {
  assert.deepEqual([...STENCIL_SIZES_MM], [8, 10, 12]);
  const pdfPath = join(root, STENCIL_PDF);
  const svgPath = join(root, STENCIL_SVG);
  assert.ok(existsSync(pdfPath), pdfPath);
  assert.ok(existsSync(svgPath), svgPath);
  const svg = readFileSync(svgPath, 'utf8');
  for (const n of STENCIL_SIZES_MM) assert.match(svg, new RegExp(String(n) + ' mm opening'));
  assert.match(svg, /Print at 100%/);
  assert.match(svg, /Star of David/);
  assert.doesNotMatch(svg, /<metadata/i);
  assert.doesNotMatch(svg, /rdf:RDF|dc:creator|photoshop:|xmp:/i);
  const pdf = readFileSync(pdfPath);
  const text = pdf.toString('latin1');
  assert.match(text, /%PDF-1\./);
  assert.doesNotMatch(text, /\/Info\s+\d+\s+\d+\s+R/);
  assert.doesNotMatch(text, /\/Metadata\s+\d+\s+\d+\s+R/);
  assert.doesNotMatch(text, /\/Producer|\/Creator|\/ModDate|\/CreationDate/);
  assert.match(text, /8 mm opening/);
  assert.match(text, /10 mm opening/);
  assert.match(text, /12 mm opening/);
});

test('the view asks for the camera only on a tap and never strobes faster than 3 Hz', () => {
  const src = readFileSync(join(root, 'src/light/light.view.js'), 'utf8');
  assert.match(src, /getUserMedia/);
  assert.match(src, /id: 'light-sparkle'/);
  assert.match(src, /startSparkle/);
  assert.match(src, /clampStrobePeriod/);
  assert.match(src, /isTorchQuiet/);
  assert.match(src, /createWakeLock/);
  assert.match(src, /prefers-reduced-motion/);
  assert.match(src, /STENCIL_PDF/);
  assert.match(src, /sensitive to flashing lights/);
  // No inline handlers in the source (CSP script-src 'self')
  assert.doesNotMatch(src, /\son(?:click|input|change|load)\s*=/);
  // Permission is requested from startSparkle, which is bound to the sparkle button
  const ask = src.indexOf('getUserMedia');
  const start = src.indexOf('async function startSparkle');
  const bind = src.indexOf("on('light-sparkle'");
  assert.ok(ask > start && start > 0, 'getUserMedia lives inside startSparkle');
  assert.ok(bind > 0);
});
