// @ts-check
// Plays a note schedule from melody.js with the Web Audio API (idea M2). Tones only: one soft oscillator, no samples, no
// recordings, nothing downloaded. The audio context is made on the learner's tap (browsers require a gesture) and closed on stop.
// Tests pass their own `AudioContextClass` and `timers`.

/** Can this browser make tones? */
export function canPlay(AudioContextClass = /** @type {any} */ (globalThis).AudioContext || /** @type {any} */ (globalThis).webkitAudioContext) {
  return typeof AudioContextClass === 'function';
}

/**
 * Play a schedule. Returns { stop(), done: Promise<'ended'|'stopped'> }.
 * onWord(index) is called as each word starts (-1 at the end) so a screen can highlight it.
 * @param {{notes:{hz:number,start:number,dur:number}[], words:{word:number,start:number,end:number}[], total:number}} schedule
 */
export function play(schedule, { onWord = null, volume = 0.18, AudioContextClass = /** @type {any} */ (globalThis).AudioContext || /** @type {any} */ (globalThis).webkitAudioContext, timers = globalThis } = {}) {
  if (!canPlay(AudioContextClass)) return { stop() {}, done: Promise.resolve(/** @type {'stopped'} */ ('stopped')) };
  const ac = new AudioContextClass();
  try { ac.resume?.(); } catch { /* already running */ }
  const t0 = (ac.currentTime || 0) + 0.06;
  const master = ac.createGain();
  master.gain.value = Math.max(0, Math.min(0.5, volume));
  master.connect(ac.destination);
  const oscs = [];
  for (const n of schedule.notes || []) {
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.value = n.hz;
    const a = t0 + n.start, b = a + n.dur;
    // Short fade in and out on every note so there are no clicks; notes of one word run into each other.
    g.gain.setValueAtTime(0, a);
    g.gain.linearRampToValueAtTime(1, a + Math.min(0.02, n.dur / 4));
    g.gain.setValueAtTime(1, Math.max(a, b - Math.min(0.04, n.dur / 3)));
    g.gain.linearRampToValueAtTime(0, b);
    osc.connect(g); g.connect(master);
    osc.start(a); osc.stop(b + 0.01);
    oscs.push(osc);
  }
  const ids = [];
  let finished = false, finish = /** @type {(v: 'ended'|'stopped') => void} */ (() => {});
  const done = new Promise((res) => { finish = res; });
  const end = (how) => {
    if (finished) return; finished = true;
    for (const id of ids) timers.clearTimeout(id);
    for (const o of oscs) { try { o.stop(); } catch { /* not started or already stopped */ } }
    try { ac.close?.(); } catch { /* ignore */ }
    try { onWord?.(-1); } catch { /* the screen is gone */ }
    finish(how);
  };
  for (const w of schedule.words || []) ids.push(timers.setTimeout(() => { if (!finished) { try { onWord?.(w.word); } catch { /* ignore */ } } }, Math.round((w.start + 0.06) * 1000)));
  ids.push(timers.setTimeout(() => end('ended'), Math.round(((schedule.total || 0) + 0.15) * 1000)));
  return { stop: () => end('stopped'), done };
}
