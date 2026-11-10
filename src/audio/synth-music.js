// Game music made live in the browser (Web Audio). No files, no loop point: each style is composed bar by bar
// from its own scale, chord progression, rhythm and instruments, with the melody and arrangement varying every
// few bars, so it never repeats on a hard seam. File tracks (the Kenney loops) also play here, looped sample-exact
// from a decoded buffer instead of an <audio> element, which is what made the old loop sound broken.
// Both kinds expose the small <audio>-like surface the music controller already drives: play(), pause(),
// volume, loop, addEventListener('playing' | 'pause' | 'error').

/* ---------------------------------------------------------------- styles */
// scale: semitone steps from the root. prog: scale degrees (0-based), one chord per bar. root: MIDI note.
// drums: 16-step strings per voice (x = hit, o = soft hit, . = rest). lead/arp/pad/bass: instrument names below.
const FREYGISH = [0, 1, 4, 5, 7, 8, 10];   // the "Ahava Rabbah" / Hijaz colour of klezmer and Mizrahi music
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const MIXO = [0, 2, 4, 5, 7, 9, 10];
const PENTA = [0, 2, 4, 7, 9];

export const SYNTH_STYLES = [
  { id: 'syn_galilee', level: 0.45, title: 'Galilee Breeze', role: 'Calm lo-fi', bpm: 78, root: 50, scale: MAJOR, prog: [0, 5, 3, 4], seventh: true,
    pad: 'warm', bass: 'round', lead: 'keys', arp: null, swing: 0.12,
    drums: { kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'o.o.o.o.o.o.o.oo' } },
  { id: 'syn_shuk', level: 1.6, title: 'Shuk Groove', role: 'Market rhythm', bpm: 100, root: 52, scale: FREYGISH, prog: [0, 0, 6, 0, 3, 3, 6, 0],
    pad: 'reed', bass: 'pluck', lead: 'oud', arp: null, swing: 0.05,
    drums: { doum: 'x.....x...x.....', tek: '..x.x...x.x.x.x.', hat: '' } },
  { id: 'syn_pixel', level: 1.1, title: 'Pixel ALEF', role: 'Chiptune', bpm: 132, root: 57, scale: MAJOR, prog: [0, 4, 5, 3],
    pad: null, bass: 'chipbass', lead: 'square', arp: 'chiparp', swing: 0,
    drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' } },
  { id: 'syn_jerusalem', level: 1, title: 'Jerusalem Dawn', role: 'Ambient', bpm: 64, root: 50, scale: PENTA, prog: [0, 3, 4, 2],
    pad: 'glass', bass: 'sub', lead: 'bell', arp: 'slowbell', swing: 0, sparse: true,
    drums: { kick: '', snare: '', hat: '' } },
  { id: 'syn_telaviv', level: 1.6, title: 'Tel Aviv Nights', role: 'Synthwave', bpm: 104, root: 45, scale: MINOR, prog: [0, 5, 2, 6],
    pad: 'saw', bass: 'octave', lead: 'synthlead', arp: 'sixteenth', swing: 0,
    drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.' } },
  { id: 'syn_hora', level: 1.4, title: 'Hora Hop', role: 'Lively dance', bpm: 136, root: 55, scale: FREYGISH, prog: [0, 0, 3, 3, 6, 6, 0, 0],
    pad: null, bass: 'pluck', lead: 'clarinet', arp: 'oompah', swing: 0,
    drums: { kick: 'x...x...x...x...', snare: '..x...x...x...x.', hat: '' } },
  { id: 'syn_rimon', level: 1.2, title: "Rimon's Puzzle", role: 'Gentle thinking', bpm: 92, root: 60, scale: MAJOR, prog: [0, 3, 1, 4], seventh: true,
    pad: 'warm', bass: 'round', lead: null, arp: 'marimba', swing: 0.08,
    drums: { kick: 'x.......x.......', snare: '', hat: '....o.......o...' } },
  { id: 'syn_caravan', level: 0.75, title: 'Desert Caravan', role: 'Slow journey', bpm: 84, root: 48, scale: FREYGISH, prog: [0, 0, 1, 0],
    pad: 'drone', bass: 'sub', lead: 'ney', arp: 'oudpluck', swing: 0.1,
    drums: { doum: 'x.......x..x....', tek: '....x.......x.x.', hat: '' } },
  { id: 'syn_pomegranate', level: 0.9, title: 'Pomegranate Pop', role: 'Bright and happy', bpm: 116, root: 60, scale: MAJOR, prog: [0, 4, 5, 3],
    pad: 'saw', bass: 'octave', lead: 'keys', arp: 'eighth', swing: 0,
    drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', clap: '....x.......x...' } },
  { id: 'syn_kinneret', level: 1.4, title: 'Kinneret Waves', role: 'Floating', bpm: 70, root: 55, scale: MIXO, prog: [0, 6, 3, 0], seventh: true,
    pad: 'glass', bass: 'round', lead: null, arp: 'ripple', swing: 0, sparse: true,
    drums: { kick: '', snare: '', hat: '' } },
  { id: 'syn_study', level: 0.5, title: 'Study Hall Lo-fi', role: 'Focus', bpm: 82, root: 53, scale: DORIAN, prog: [0, 3, 0, 4], seventh: true,
    pad: 'warm', bass: 'round', lead: 'keys', arp: null, swing: 0.15,
    drums: { kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'o.oxo.oxo.oxo.ox' } },
  { id: 'syn_sprint', level: 2.5, title: 'Arcade Sprint', role: 'Fast action', bpm: 156, root: 52, scale: MINOR, prog: [0, 5, 3, 4],
    pad: null, bass: 'chipbass', lead: 'square', arp: 'chiparp', swing: 0,
    drums: { kick: 'x.x.x.x.x.x.x.x.', snare: '....x.......x...', hat: '.x.x.x.x.x.x.x.x' } },
];

/* ------------------------------------------------------------ utilities */
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
function noteOf(style, degree, octave = 0) {
  const n = style.scale.length;
  const d = ((degree % n) + n) % n;
  const o = Math.floor(degree / n) + octave;
  return style.root + style.scale[d] + 12 * o;
}
function chordOf(style, degree) {
  const tones = [0, 2, 4].concat(style.seventh ? [6] : []);
  return tones.map((t) => noteOf(style, degree + t));
}

let sharedCtx = null;
function audioCtx() {
  if (sharedCtx) return sharedCtx;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (typeof AC !== 'function') return null;
  sharedCtx = new AC();
  return sharedCtx;
}
let noiseBuf = null;
function noise(ctx) {
  if (noiseBuf) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
function makeReverb(ctx) {
  const len = Math.floor(ctx.sampleRate * 2.4);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
  const cv = ctx.createConvolver(); cv.buffer = buf; return cv;
}

/* ---------------------------------------------------------- instruments */
function env(g, t, a, peak, hold, rel) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setValueAtTime(peak, t + a + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  return t + a + hold + rel + 0.05;
}
function osc(ctx, type, f, t, end, dest, detune = 0) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
  o.connect(dest); o.start(t); o.stop(end); return o;
}
function voice(ctx, out, kind, midi, t, dur, vel = 1) {
  const f = mtof(midi);
  const g = ctx.createGain(); g.connect(out.dry);
  const send = ctx.createGain(); send.gain.value = 0.35; g.connect(send); send.connect(out.wet);
  const lp = (hz, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = hz; b.Q.value = q; b.connect(g); return b; };
  let end;
  switch (kind) {
    case 'warm': { const f1 = lp(1400); end = env(g, t, 0.6, 0.05 * vel, dur, 1.2); osc(ctx, 'sawtooth', f, t, end, f1, -7); osc(ctx, 'sawtooth', f, t, end, f1, 7); osc(ctx, 'sine', f / 2, t, end, f1); break; }
    case 'saw': { const f1 = lp(2200, 1.5); end = env(g, t, 0.15, 0.04 * vel, dur, 0.6); osc(ctx, 'sawtooth', f, t, end, f1, -10); osc(ctx, 'sawtooth', f, t, end, f1, 10); break; }
    case 'glass': { const f1 = lp(3000); end = env(g, t, 1.2, 0.045 * vel, dur, 2); osc(ctx, 'sine', f, t, end, f1); osc(ctx, 'triangle', f * 2, t, end, f1, 4); send.gain.value = 0.7; break; }
    case 'reed': { const f1 = lp(1100, 2); end = env(g, t, 0.3, 0.035 * vel, dur, 0.8); osc(ctx, 'square', f, t, end, f1, -5); osc(ctx, 'sawtooth', f, t, end, f1, 5); break; }
    case 'drone': { const f1 = lp(700); end = env(g, t, 1.5, 0.05 * vel, dur, 1.5); osc(ctx, 'sawtooth', f / 2, t, end, f1); osc(ctx, 'sawtooth', f * 0.75, t, end, f1, 3); break; }
    case 'round': { const f1 = lp(600); end = env(g, t, 0.02, 0.22 * vel, dur * 0.8, 0.25); osc(ctx, 'sine', f, t, end, f1); osc(ctx, 'triangle', f, t, end, f1); send.gain.value = 0.05; break; }
    case 'sub': { end = env(g, t, 0.3, 0.2 * vel, dur, 0.8); osc(ctx, 'sine', f, t, end, g); send.gain.value = 0; break; }
    case 'pluck': { const f1 = lp(900, 3); f1.frequency.setValueAtTime(2500, t); f1.frequency.exponentialRampToValueAtTime(300, t + 0.25); end = env(g, t, 0.005, 0.25 * vel, 0.02, 0.3); osc(ctx, 'sawtooth', f, t, end, f1); send.gain.value = 0.1; break; }
    case 'octave': { const f1 = lp(800, 2); end = env(g, t, 0.005, 0.18 * vel, dur * 0.4, 0.15); osc(ctx, 'sawtooth', f, t, end, f1); send.gain.value = 0.05; break; }
    case 'chipbass': { end = env(g, t, 0.005, 0.07 * vel, dur * 0.7, 0.05); osc(ctx, 'triangle', f, t, end, g); osc(ctx, 'square', f, t, end, lp(500)); send.gain.value = 0; break; }
    case 'keys': { const f1 = lp(2600); end = env(g, t, 0.01, 0.09 * vel, 0.05, Math.min(1.6, dur + 0.6)); osc(ctx, 'triangle', f, t, end, f1); osc(ctx, 'sine', f * 2, t, end, f1, 3); break; }
    case 'bell': { end = env(g, t, 0.005, 0.07 * vel, 0, 2.2); osc(ctx, 'sine', f, t, end, g); osc(ctx, 'sine', f * 2.76, t, end, g); osc(ctx, 'sine', f * 5.4, t, Math.min(end, t + 0.4), g); send.gain.value = 0.8; break; }
    case 'marimba': { end = env(g, t, 0.003, 0.14 * vel, 0, 0.5); osc(ctx, 'sine', f, t, end, g); const g2 = ctx.createGain(); g2.connect(g); env(g2, t, 0.002, 0.5, 0, 0.08); osc(ctx, 'sine', f * 4, t, t + 0.15, g2); break; }
    case 'square': { const f1 = lp(3500); end = env(g, t, 0.005, 0.05 * vel, dur * 0.8, 0.08); osc(ctx, 'square', f, t, end, f1); send.gain.value = 0.15; break; }
    case 'synthlead': { const f1 = lp(3000, 2); end = env(g, t, 0.03, 0.05 * vel, dur, 0.4); const o = osc(ctx, 'sawtooth', f, t, end, f1); vib(ctx, o, t, 5, 6); osc(ctx, 'square', f, t, end, f1, 8); break; }
    case 'clarinet': { const f1 = lp(1800, 1); end = env(g, t, 0.04, 0.07 * vel, dur * 0.9, 0.15); const o = osc(ctx, 'square', f, t, end, f1); vib(ctx, o, t + 0.15, 5.5, 8); break; }
    case 'oud': case 'oudpluck': { const f1 = lp(1600, 4); f1.frequency.setValueAtTime(3200, t); f1.frequency.exponentialRampToValueAtTime(700, t + 0.3); end = env(g, t, 0.003, (kind === 'oud' ? 0.13 : 0.08) * vel, 0.03, 0.55); osc(ctx, 'sawtooth', f, t, end, f1); osc(ctx, 'triangle', f * 2, t, end, f1, 6); break; }
    case 'ney': { const f1 = lp(1500); end = env(g, t, 0.18, 0.08 * vel, dur * 0.8, 0.4); const o = osc(ctx, 'sine', f, t, end, f1); vib(ctx, o, t + 0.25, 4.5, 12); const n = ctx.createBufferSource(); n.buffer = noise(ctx); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 8; const ng = ctx.createGain(); ng.gain.value = 0.12; n.connect(bp); bp.connect(ng); ng.connect(f1); n.start(t); n.stop(end); send.gain.value = 0.6; break; }
    default: { end = env(g, t, 0.01, 0.06 * vel, dur, 0.3); osc(ctx, 'triangle', f, t, end, g); }
  }
  setTimeout(() => { try { g.disconnect(); send.disconnect(); } catch { /* gone */ } }, Math.max(0, (end - ctx.currentTime) * 1000 + 200));
}
function vib(ctx, o, t, rate, depth) {
  const l = ctx.createOscillator(); l.frequency.value = rate; const lg = ctx.createGain(); lg.gain.value = depth;
  l.connect(lg); lg.connect(o.detune); l.start(t); l.stop(t + 8);
}
function drum(ctx, out, kind, t, vel = 1) {
  const g = ctx.createGain(); g.connect(out.dry);
  if (kind === 'kick' || kind === 'doum') {
    const o = ctx.createOscillator(); o.type = 'sine';
    const hi = kind === 'doum' ? 180 : 140, lo = kind === 'doum' ? 70 : 45;
    o.frequency.setValueAtTime(hi, t); o.frequency.exponentialRampToValueAtTime(lo, t + 0.12);
    env(g, t, 0.002, (kind === 'doum' ? 0.35 : 0.5) * vel, 0.02, kind === 'doum' ? 0.35 : 0.25);
    o.connect(g); o.start(t); o.stop(t + 0.5); return;
  }
  const n = ctx.createBufferSource(); n.buffer = noise(ctx);
  const f = ctx.createBiquadFilter();
  if (kind === 'hat') { f.type = 'highpass'; f.frequency.value = 7000; env(g, t, 0.001, 0.06 * vel, 0, 0.05); }
  else if (kind === 'tek') { f.type = 'bandpass'; f.frequency.value = 3500; f.Q.value = 2; env(g, t, 0.001, 0.22 * vel, 0, 0.06); const c = ctx.createOscillator(); c.frequency.value = 900; const cg = ctx.createGain(); env(cg, t, 0.001, 0.1 * vel, 0, 0.04); c.connect(cg); cg.connect(out.dry); c.start(t); c.stop(t + 0.08); }
  else if (kind === 'clap') { f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 1; env(g, t, 0.003, 0.15 * vel, 0.01, 0.12); }
  else { f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8; env(g, t, 0.002, 0.16 * vel, 0.01, 0.14); }
  n.connect(f); f.connect(g); n.start(t); n.stop(t + 0.3);
}

/* ------------------------------------------------------------- composer */
// A phrase is 8 bars. The melody motif is made fresh for each phrase but repeats inside it (A A' B A'), and the
// arrangement moves through intro / groove / full / breakdown over 32 bars, so the music keeps changing gently.
function makeMotif(style, r) {
  const steps = []; let deg = pick(r, [0, 2, 4, 7]);
  const density = style.sparse ? 0.25 : 0.55;
  for (let i = 0; i < 16; i++) {
    if (i % 2 === 1 && r() > 0.3) { steps.push(null); continue; }
    if (r() > density && i !== 0) { steps.push(null); continue; }
    deg += pick(r, [-2, -1, -1, 0, 1, 1, 2, 3, -3]);
    deg = Math.max(-2, Math.min(9, deg));
    steps.push(deg);
  }
  return steps;
}
function sectionFor(bar) {
  const b = bar % 32;
  if (b < 4) return { pad: 1, bass: 1, drums: 0, lead: 0, arp: 1 };
  if (b < 12) return { pad: 1, bass: 1, drums: 1, lead: 0, arp: 1 };
  if (b < 24) return { pad: 1, bass: 1, drums: 1, lead: 1, arp: 1 };
  if (b < 28) return { pad: 1, bass: 0, drums: 0, lead: 1, arp: 0 };
  return { pad: 1, bass: 1, drums: 1, lead: 0, arp: 1 };
}

function scheduleBar(ctx, out, style, bar, t0, r, motifs) {
  const beat = 60 / style.bpm, step = beat / 4, barLen = beat * 4;
  const deg = style.prog[bar % style.prog.length];
  const chord = chordOf(style, deg);
  const sec = sectionFor(bar);
  const swingAt = (i) => t0 + i * step + (i % 2 === 1 ? step * (style.swing || 0) : 0);
  if (style.pad && sec.pad) chord.forEach((m) => voice(ctx, out, style.pad, m, t0, barLen * 0.9, 0.9));
  if (style.bass && sec.bass) {
    const root = noteOf(style, deg, -2);
    const pattern = style.bass === 'octave' ? [0, 2, 4, 6, 8, 10, 12, 14] : style.bass === 'chipbass' ? [0, 4, 8, 12] : style.bass === 'pluck' ? [0, 6, 8, 12] : [0, 8, 10];
    pattern.forEach((i, k) => voice(ctx, out, style.bass, style.bass === 'octave' && k % 2 ? root + 12 : (style.bass === 'pluck' && k === 3 ? root + 7 : root), swingAt(i), step * 3, 0.9));
  }
  if (sec.drums && style.drums) {
    for (const [kind, pat] of Object.entries(style.drums)) {
      if (!pat) continue;
      for (let i = 0; i < 16; i++) { const c = pat[i]; if (c === 'x' || c === 'o') drum(ctx, out, kind, swingAt(i), c === 'x' ? 1 : 0.5 * (0.8 + r() * 0.4)); }
    }
  }
  if (style.arp && sec.arp) {
    const tones = chord.concat(chord.map((m) => m + 12));
    const kind = style.arp;
    const inst = kind === 'chiparp' ? 'square' : kind === 'marimba' ? 'marimba' : kind === 'slowbell' ? 'bell' : kind === 'oudpluck' ? 'oudpluck' : kind === 'ripple' ? 'marimba' : 'keys';
    const hits = kind === 'sixteenth' || kind === 'chiparp' ? 16 : kind === 'eighth' || kind === 'marimba' ? 8 : kind === 'oompah' ? 8 : kind === 'ripple' ? 6 : 4;
    for (let k = 0; k < hits; k++) {
      const i = Math.floor((k * 16) / hits);
      if (kind === 'oompah') { if (k % 2) chord.slice(0, 3).forEach((m) => voice(ctx, out, 'keys', m, swingAt(i), step * 2, 0.6)); continue; }
      const m = tones[(k + (kind === 'ripple' ? Math.floor(r() * 2) : 0)) % tones.length] + (inst === 'square' ? 12 : 0);
      voice(ctx, out, inst, m, swingAt(i), step * (16 / hits) * 0.9, kind === 'chiparp' ? 0.6 : 0.8);
    }
  }
  if (style.lead && sec.lead) {
    const phraseBar = bar % 8;
    const motif = phraseBar >= 4 && phraseBar < 6 ? motifs.b : motifs.a;
    const lift = phraseBar % 2 === 1 ? 1 : 0;
    motif.forEach((d, i) => {
      if (d == null) return;
      let len = 1; while (i + len < 16 && motif[i + len] == null && len < 4) len++;
      voice(ctx, out, style.lead, noteOf(style, d + lift, 1), swingAt(i), step * len * 0.95, 0.8 + r() * 0.2);
    });
  }
}

/* -------------------------------------------------------- player nodes */
function eventHub() {
  const ls = {};
  return { on(type, fn) { (ls[type] ||= []).push(fn); }, fire(type) { for (const fn of ls[type] || []) { try { fn(); } catch { /* ignore */ } } } };
}
function busOf(ctx) {
  const master = ctx.createGain(); master.gain.value = 0;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
  master.connect(comp); comp.connect(ctx.destination);
  const dry = ctx.createGain(); dry.connect(master);
  const wet = ctx.createGain(); wet.gain.value = 0.6; const rev = makeReverb(ctx); wet.connect(rev); rev.connect(master);
  return { master, comp, dry, wet };
}
function baseNode(hub) {
  return {
    loop: true, preload: 'none', duration: Infinity, currentTime: 0, paused: true,
    addEventListener(type, fn) { hub.on(type, fn); },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {}, remove() {}, load() {},
  };
}

/** A composed-live track for one style. */
export function createSynthTrack(style) {
  const hub = eventHub();
  let ctx = null, bus = null, timer = null, nextBar = 0, nextTime = 0, vol = 0.22, seed = (Date.now() & 0xffff) + 7;
  let r = rng(seed), motifs = null;
  const node = baseNode(hub);
  Object.defineProperty(node, 'volume', { get: () => vol, set: (v) => { vol = v; if (bus && ctx) bus.master.gain.setTargetAtTime(node.paused ? 0 : vol, ctx.currentTime, 0.08); } });
  function tick() {
    const ahead = ctx.currentTime + 0.6;
    while (nextTime < ahead) {
      if (nextBar % 8 === 0) motifs = { a: makeMotif(style, r), b: makeMotif(style, r) };
      scheduleBar(ctx, bus, style, nextBar, nextTime, r, motifs);
      nextTime += (60 / style.bpm) * 4; nextBar += 1;
    }
  }
  node.play = () => {
    ctx = ctx || audioCtx();
    if (!ctx) { hub.fire('error'); return Promise.reject(new Error('no Web Audio')); }
    if (!bus) { bus = busOf(ctx); const lv = style.level || 1; bus.dry.gain.value = lv; bus.wet.gain.value = 0.6 * lv; }
    const go = () => {
      if (!node.paused) return;
      node.paused = false;
      nextTime = ctx.currentTime + 0.08; nextBar = 0; r = rng(++seed);
      bus.master.gain.cancelScheduledValues(ctx.currentTime);
      bus.master.gain.setValueAtTime(0, ctx.currentTime);
      bus.master.gain.linearRampToValueAtTime(vol, ctx.currentTime + 1.5);
      tick(); timer = setInterval(tick, 120);
      hub.fire('playing');
    };
    const p = ctx.state === 'suspended' && typeof ctx.resume === 'function' ? ctx.resume() : Promise.resolve();
    return Promise.resolve(p).then(go);
  };
  node.pause = () => {
    if (node.paused) return;
    node.paused = true;
    clearInterval(timer); timer = null;
    if (bus && ctx) {
      const old = bus; bus = null;
      old.master.gain.cancelScheduledValues(ctx.currentTime);
      old.master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      setTimeout(() => { try { old.master.disconnect(); } catch { /* gone */ } }, 1500);
    }
    hub.fire('pause');
  };
  return node;
}

/** Skip digital silence left at the ends by an MP3 decoder so loopStart/loopEnd sit on audio, not padding.
 *  Cap the trim at 80 ms so a quiet pickup or ring-out in a carefully cut loop is not eaten. */
function paddingBounds(buf, thresh = 1e-4, capS = 0.08) {
  const n = buf.length, ch = buf.numberOfChannels, sr = buf.sampleRate;
  const cap = Math.max(0, Math.min(n, Math.round(capS * sr)));
  const peak = (i) => { let m = 0; for (let c = 0; c < ch; c++) { const v = Math.abs(buf.getChannelData(c)[i]); if (v > m) m = v; } return m; };
  let a = 0, b = n - 1;
  while (a < b && a < cap && peak(a) < thresh) a += 1;
  while (b > a && (n - 1 - b) < cap && peak(b) < thresh) b -= 1;
  return { loopStart: a / sr, loopEnd: (b + 1) / sr, dur: (b + 1 - a) / sr };
}

/** A file loop played sample-exact from a decoded buffer; falls back to an <audio> element if decoding fails. */
export function createGaplessTrack(url, makeElement = (u) => new globalThis.Audio(u)) {
  const hub = eventHub();
  let ctx = null, gain = null, buf = null, src = null, startedAt = 0, offset = 0, vol = 0.22, fallback = null, loading = null;
  let loopStart = 0, loopDur = 0;
  const node = baseNode(hub);
  Object.defineProperty(node, 'volume', { get: () => vol, set: (v) => { vol = v; if (fallback) fallback.volume = v; if (gain && ctx) gain.gain.setTargetAtTime(node.paused ? 0 : vol, ctx.currentTime, 0.08); } });
  async function load() {
    const res = await fetch(url); if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.arrayBuffer();
    buf = await new Promise((ok, no) => { const p = ctx.decodeAudioData(data, ok, no); if (p && p.then) p.then(ok, no); });
    const pad = paddingBounds(buf);
    loopStart = pad.loopStart;
    loopDur = pad.dur || buf.duration;
  }
  function useFallback() {
    fallback = makeElement(url); fallback.loop = true; fallback.volume = vol;
    fallback.addEventListener?.('playing', () => hub.fire('playing'));
    fallback.addEventListener?.('error', () => hub.fire('error'));
    return fallback.play();
  }
  node.play = async () => {
    if (fallback) { node.paused = false; return fallback.play(); }
    ctx = ctx || audioCtx();
    if (!ctx) { node.paused = false; return useFallback(); }
    if (ctx.state === 'suspended') await ctx.resume?.();
    if (!buf) { try { loading = loading || load(); await loading; } catch { node.paused = false; return useFallback(); } }
    if (!node.paused) return undefined;
    node.paused = false;
    gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
    src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    src.loopStart = loopStart; src.loopEnd = loopStart + loopDur;
    src.connect(gain);
    const pos = loopStart + (loopDur ? (offset % loopDur) : 0);
    src.start(0, pos); startedAt = ctx.currentTime - offset;
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.6);
    hub.fire('playing');
    return undefined;
  };
  node.pause = () => {
    if (fallback) { try { fallback.pause(); } catch { /* ignore */ } node.paused = true; hub.fire('pause'); return; }
    if (node.paused) return;
    node.paused = true;
    if (ctx && src && buf) {
      offset = loopDur ? (ctx.currentTime - startedAt) % loopDur : 0;
      const s = src, g = gain; src = null; gain = null;
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      setTimeout(() => { try { s.stop(); s.disconnect(); g.disconnect(); } catch { /* gone */ } }, 500);
    }
    hub.fire('pause');
  };
  return node;
}
