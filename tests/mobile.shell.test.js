// Mobile shell behaviour (docs/mobile/FINDINGS.md items 2-5): scroll restore on Back, iOS audio unlock, persistence after the
// first progress save, the update/storage banner without a service worker, and the maskable icon safe zone. No browser needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { createScrollRestore, normalizePath, KEY } from '../src/shell/scroll-restore.js';
import { createAudioUnlock } from '../src/shell/audio.js';
import { createStubAudio } from '../src/shell/audio-stub.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const app = read('src/app.js');

// ---------- scroll restore ----------
const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };
function harness(storage = memStorage()) {
  let y = 0; const scrolls = [];
  const r = createScrollRestore({ storage, scrollTo: (_x, yy) => { scrolls.push(yy); y = yy; }, scrollY: () => y, raf: (f) => f() });
  return { r, scrolls, setY: (v) => { y = v; }, storage };
}

test('normalizePath: hash or path, keeps the query', () => {
  assert.equal(normalizePath('#/learn?review=1'), '/learn?review=1');
  assert.equal(normalizePath('/learn'), '/learn');
  assert.equal(normalizePath(''), '/');
});

test('Back restores the saved position; a forward link click scrolls to the top', () => {
  const { r, scrolls, setY } = harness();
  r.arrive('#/'); assert.deepEqual(scrolls, [0]);
  setY(840); r.leave('#/');                      // learner scrolled the home list, then tapped a link
  r.markForward(); r.arrive('#/learn');
  assert.equal(scrolls.at(-1), 0, 'forward navigation starts at the top');
  setY(120); r.leave('#/learn');
  const back = r.arrive('#/');                   // unmarked hashchange = Back
  assert.deepEqual(back, { restored: true, y: 840 });
  assert.equal(scrolls.at(-1), 840);
  assert.equal(r.pendingForward, false);
});

test('forward to a path that has a saved position still goes to the top; the mark is consumed by one navigation', () => {
  const { r, scrolls, setY } = harness();
  setY(500); r.leave('#/learn');
  r.markForward(); const a = r.arrive('#/learn'); assert.deepEqual(a, { restored: false, y: 0 });
  setY(0); const b = r.arrive('#/learn'); assert.equal(b.restored, true, 'the next unmarked arrival restores');
  assert.equal(scrolls.filter((v) => v === 500).length >= 1, true);
});

test('positions are per tab in sessionStorage under one key and survive a new keeper instance', () => {
  const st = memStorage();
  const a = harness(st); a.setY(300); a.r.leave('#/vocab');
  assert.ok(st.m.has(KEY));
  const b = harness(st); assert.equal(b.r.saved('/vocab'), 300);
  assert.equal(b.r.arrive('#/vocab').y, 300);
});

test('no storage, broken storage, corrupt data: never throws, falls back to scrolling to the top', () => {
  const none = createScrollRestore({ storage: null, scrollTo() {}, scrollY: () => 10, raf() {} });
  none.leave('#/x'); assert.deepEqual(none.arrive('#/x'), { restored: false, y: 0 });
  const broken = createScrollRestore({ storage: { getItem() { throw new Error('private'); }, setItem() { throw new Error('quota'); } }, scrollTo() {}, scrollY: () => 10, raf() {} });
  broken.leave('#/x'); assert.equal(broken.arrive('#/x').restored, false);
  const st = memStorage(); st.setItem(KEY, '[1,2');
  const corrupt = createScrollRestore({ storage: st, scrollTo() {}, scrollY: () => 7, raf() {} });
  corrupt.leave('#/y'); assert.equal(corrupt.saved('/y'), 7);
});

test('app.js wiring: leave before unmount, arrive instead of scrollTo(0,0), links and ctx.route mark forward', () => {
  assert.match(app, /scrollKeeper\?\.leave\(lastHashShown\)/);
  assert.match(app, /scrollKeeper\.arrive\(location\.hash\)/);
  assert.match(app, /else window\.scrollTo\(0, 0\)/, 'still scrolls to the top until the module has loaded');
  assert.match(app, /closest\('a\[href\^="#"\]'\)[\s\S]*?markForward/);
  assert.match(app, /route: \(p\) => \{ scrollKeeper\?\.markForward\(\); router\.go\(p\); \}/);
  assert.doesNotMatch(app, /popstate/, 'popstate also fires on location.hash writes, so it is not the signal');
});

// ---------- iOS audio unlock ----------
test('createAudioUnlock: primes AudioContext, Audio and speech once; later calls are no-ops', () => {
  const log = [];
  class AC { constructor() { this.state = 'suspended'; log.push('ctx'); } resume() { log.push('resume'); return Promise.resolve(); } }
  class Audio { constructor() { this.muted = false; } play() { log.push('play muted=' + this.muted); return Promise.reject(new Error('NotAllowedError')); } }
  class Utt { constructor(t) { this.text = t; this.volume = 1; } }
  const g = { AudioContext: AC, Audio, SpeechSynthesisUtterance: Utt, speechSynthesis: { speak: (u) => log.push('speak "' + u.text + '" vol=' + u.volume) } };
  const unlock = createAudioUnlock(g);
  assert.deepEqual(unlock(), { done: true, context: true, audio: true, speech: true });
  assert.deepEqual(log, ['ctx', 'resume', 'play muted=true', 'speak "" vol=0']);
  assert.deepEqual(unlock(), { done: true, context: false, audio: false, speech: false });
  assert.equal(log.length, 4, 'nothing runs twice');
});

test('createAudioUnlock: no AudioContext (or nothing at all) is a no-op that never throws; webkit prefix accepted', () => {
  assert.deepEqual(createAudioUnlock({})(), { done: true, context: false, audio: false, speech: false });
  assert.deepEqual(createAudioUnlock(undefined)(), { done: true, context: false, audio: false, speech: false });
  class Boom { constructor() { throw new Error('no'); } }
  assert.equal(createAudioUnlock({ AudioContext: Boom, Audio: Boom })().context, false);
  let made = 0; class W { constructor() { made++; this.state = 'running'; } }
  assert.equal(createAudioUnlock({ webkitAudioContext: W })().context, true); assert.equal(made, 1);
});

test('stub audio has unlock too; app.js calls audio.unlock on the first gesture, capture phase, then removes the listeners', () => {
  const stub = createStubAudio({ settings: { get: () => undefined } });
  assert.equal(typeof stub.unlock, 'function'); assert.doesNotThrow(() => stub.unlock());
  assert.match(app, /audio\.unlock\?\.\(\)/);
  assert.match(app, /for \(const t of \['pointerdown', 'keydown', 'touchend'\]\) document\.addEventListener\(t, unlockOnce, true\)/);
  assert.match(app, /document\.removeEventListener\(t, unlockOnce, true\)/);
});

// ---------- persistence after the first progress save; banners without a service worker ----------
test('app.js asks for persistent storage once, on the first non-settings write, not for other tabs\' writes', () => {
  assert.match(app, /store\.subscribe\(\(key, _value, info\) => \{\s*if \(persistAsked \|\| info\?\.external \|\| !isRealProgressWrite\(key, _value\)\) return;\s*persistAsked = true;/);
  assert.match(app, /requestPersistence\(\)/);
  assert.equal((app.match(/console\.info\(`storage persistence/g) || []).length, 1, 'logged once');
});

test('app.js mounts the update banner and storage notice outside the serviceWorker guard', () => {
  const i = app.indexOf("if ('serviceWorker' in navigator");
  const block = app.slice(i, app.indexOf('\n  }\n', i));
  assert.doesNotMatch(block, /startUpdateBanner/);
  assert.match(app.slice(app.indexOf('\n  }\n', i)), /startUpdateBanner\(\)/);
});

// ---------- maskable icon safe zone ----------
/** Minimal PNG decoder for 8-bit RGB/RGBA, non-interlaced (enough for our icons). Returns {w,h,ch,px}. */
function decodePng(buf) {
  assert.equal(buf.readUInt32BE(0), 0x89504e47);
  let pos = 8, w = 0, h = 0, ch = 0; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos); const type = buf.toString('ascii', pos + 4, pos + 8); const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); assert.equal(data[8], 8, '8-bit'); ch = { 2: 3, 6: 4 }[data[9]]; assert.ok(ch, 'RGB or RGBA'); assert.equal(data[12], 0, 'not interlaced'); }
    else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)); const stride = w * ch; const px = Buffer.alloc(w * h * ch);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]; const src = y * (stride + 1) + 1, dst = y * stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? px[dst + i - ch] : 0, b = y > 0 ? px[dst - stride + i] : 0, c = y > 0 && i >= ch ? px[dst - stride + i - ch] : 0;
      let v = raw[src + i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[dst + i] = v & 255;
    }
  }
  return { w, h, ch, px };
}

test('maskable icon: every non-background pixel sits inside the central 80% circle (safe zone)', () => {
  const man = JSON.parse(read('manifest.webmanifest'));
  const m = man.icons.find((i) => i.purpose === 'maskable'); assert.ok(m, 'a maskable icon is declared');
  const { w, h, ch, px } = decodePng(readFileSync(new URL('../' + m.src, import.meta.url)));
  assert.equal(w, h);
  const bg = [px[0], px[1], px[2]]; const cx = w / 2, cy = h / 2, r = 0.4 * w;
  let content = 0, outside = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * ch; const d = Math.abs(px[o] - bg[0]) + Math.abs(px[o + 1] - bg[1]) + Math.abs(px[o + 2] - bg[2]);
    if (d > 60 || (ch === 4 && px[o + 3] < 250)) { content++; if (Math.hypot(x - cx, y - cy) > r) outside++; }
  }
  assert.ok(content > 1000, 'the icon has visible content');
  assert.equal(outside, 0, `${outside} content pixels outside the safe zone`);
});
