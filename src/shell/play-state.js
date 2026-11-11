// Shared playing / finished / failed state for every Listen and Play control (M-04).
// The Letters page told the learner "Playing: Aleph."; most other controls showed nothing, so a learner who heard nothing
// could not tell a missing clip from a dead tap. This module gives every control the same three states, in one place:
//  - the control that started the sound carries data-play-state="playing" (then "finished" or "failed") and .is-playing,
//    which the stylesheet draws as a small badge on the button;
//  - one status line (role=status) near the bottom of the screen says "Playing: …", "Finished." or "No sound: <why>".
// Sources: the shell audio's play() (every ctx.audio.play in the app, recorded files and the device voice alike) and, for
// views that play an <audio> element themselves (books, the word builder), HTMLMediaElement.play. Music and UI sound effects
// are never reported.
const QUIET_SRC = /(^|\/)audio\/(music|sfx)\/|\/stings\/|\/israeli\/games\//; // music, UI sounds, and game voice lines (silent when absent by design)
const CONTROL = 'button, [role="button"], a.btn, .btn';
const CLICK_WINDOW_MS = 2500; // a sound that starts this long after a tap on a control belongs to that control

/** Pure: the status line for a phase. @param {'loading'|'playing'|'finished'|'failed'|'stopped'} phase @param {string} [what] @param {string} [why] */
export function playLine(phase, what = '', why = '') {
  const w = String(what || '').trim();
  if (phase === 'loading') return w ? `Loading: ${w}…` : 'Loading the sound…';
  if (phase === 'playing') return w ? `Playing: ${w}` : 'Playing…';
  if (phase === 'finished') return 'Finished. Tap again to hear it again.';
  if (phase === 'stopped') return 'Sound stopped.';
  const r = String(why || '').trim().replace(/\.$/, '');
  return r ? `No sound: ${r}.` : 'No sound: this clip did not play. Check your volume, or read the English-letter spelling.';
}

/** Pure: a short name for what a control plays ("Listen: shalom (Noa)" -> "shalom (Noa)"; "▶ Listen (Ari)" -> "Listen (Ari)"). */
export function controlName(el) {
  if (!el) return '';
  const aria = el.getAttribute?.('aria-label') || '';
  const raw = (aria || el.textContent || '').replace(/[▶■►⏵⏹♪🔊]/gu, '').replace(/\s+/g, ' ').trim();
  const m = /^(?:listen|play|hear|replay)(?: again)?\s*[:–-]\s*(.+)$/i.exec(raw);
  const out = (m ? m[1] : raw)
    .replace(/\s*\((?:checking audio|[^)]*not recorded yet)\)$/i, '')
    .replace(/,?\s*(?:play|hear|listen)(?: (?:sound|it|again))?$/i, '') // "Kamatz, play sound" -> "Kamatz"
    .replace(/([\u0590-\u05FF])(?=[A-Za-z])|([A-Za-z])(?=[\u0590-\u05FF])/g, '$1$2 ') // a Hebrew sign and its English name run together
    .trim();
  return out.length > 60 ? `${out.slice(0, 57)}…` : out;
}

/**
 * Install once. @param {{audio?: any, doc?: Document, win?: any, hideAfterMs?: number}} o
 * @returns {{begin:(o?:{what?:string, control?:Element})=>number, end:(id:number, phase:string, why?:string)=>void, line:HTMLElement}|null}
 */
export function installPlayState({ audio, doc = globalThis.document, win = globalThis, hideAfterMs = 4000 } = {}) {
  if (!doc || !doc.body || win.__alefPlayState) return win?.__alefPlayState || null;
  let lastControl = null, lastAt = 0, seq = 0, active = null, hideTimer = 0;
  doc.addEventListener('click', (e) => {
    const c = e.target instanceof win.Element ? e.target.closest(CONTROL) : null;
    if (!c || c.closest('.music-bar, .alef-music-bar, .sound-bar, .alef-now-playing')) return;
    lastControl = c; lastAt = Date.now();
    if (c.dataset.playState === 'failed' || c.dataset.playState === 'finished') delete c.dataset.playState;
  }, true);
  const line = doc.createElement('p');
  line.className = 'alef-now-playing'; line.setAttribute('role', 'status'); line.setAttribute('aria-live', 'polite'); line.hidden = true;
  doc.body.append(line);
  const show = (text, phase) => {
    clearTimeout(hideTimer);
    line.textContent = text; line.dataset.phase = phase; line.hidden = false;
    if (phase !== 'playing' && phase !== 'loading') hideTimer = setTimeout(() => { line.hidden = true; }, phase === 'failed' ? hideAfterMs * 2 : hideAfterMs);
  };
  const mark = (c, phase) => {
    if (!c || !c.dataset) return;
    c.classList.toggle('is-playing', phase === 'playing' || phase === 'loading');
    if (phase === 'stopped') { delete c.dataset.playState; return; }
    c.dataset.playState = phase;
    if (phase === 'finished') setTimeout(() => { if (c.dataset.playState === 'finished') delete c.dataset.playState; }, hideAfterMs);
  };
  function begin({ what = '', control } = {}) {
    const c = control || (Date.now() - lastAt < CLICK_WINDOW_MS ? lastControl : null);
    if (active && active.control && active.control !== c) mark(active.control, 'stopped');
    // a sound nobody tapped for (a game reading the next word by itself) marks nothing and only speaks up if it fails
    active = { id: ++seq, control: c, what: what || controlName(c), auto: !c };
    mark(c, 'loading'); if (!active.auto) show(playLine('loading', active.what), 'loading');
    return active.id;
  }
  function end(id, phase, why = '') {
    if (!active || active.id !== id) return;
    mark(active.control, phase);
    if (!active.auto || phase === 'failed') show(playLine(phase, active.what, why), phase);
    if (phase !== 'playing') active = null;
  }
  const api = { begin, end, line, get active() { return active; } };
  win.__alefPlayState = api;

  // 1) everything that goes through the shell audio (ctx.audio.play)
  let shellBusy = 0;
  if (audio && typeof audio.onPlay === 'function') {
    const ids = new Map();
    audio.onPlay((ev) => {
      if (ev.phase === 'start') { shellBusy++; ids.set(ev.token, begin({ what: ev.what })); return; }
      const id = ids.get(ev.token);
      if (ev.phase === 'playing') { end(id, 'playing'); return; }
      shellBusy = Math.max(0, shellBusy - 1); ids.delete(ev.token);
      end(id, ev.phase, ev.why);
    });
  }
  // 2) views that play their own <audio> (books, the word builder, game voice lines)
  const MP = win.HTMLMediaElement?.prototype;
  if (MP && typeof MP.play === 'function' && !MP.__alefPlayState) {
    const orig = MP.play;
    MP.play = function (...args) {
      const src = String(this.currentSrc || this.src || '');
      const tapped = Date.now() - lastAt < CLICK_WINDOW_MS;
      if (shellBusy > 0 || this.muted || !src || QUIET_SRC.test(src) || this.dataset?.playState === 'quiet' || !tapped) return orig.apply(this, args);
      const id = begin();
      const el = this;
      const off = () => { el.removeEventListener('playing', onPlaying); el.removeEventListener('ended', onEnded); el.removeEventListener('error', onError); el.removeEventListener('pause', onPause); };
      const onPlaying = () => end(id, 'playing');
      const onEnded = () => { off(); end(id, 'finished'); };
      const onError = () => { off(); end(id, 'failed', 'this recording did not load'); };
      const onPause = () => { if (!el.ended) { off(); end(id, 'stopped'); } };
      el.addEventListener('playing', onPlaying); el.addEventListener('ended', onEnded); el.addEventListener('error', onError); el.addEventListener('pause', onPause);
      let p;
      try { p = orig.apply(this, args); } catch (e) { off(); end(id, 'failed', 'this browser could not play it'); throw e; }
      if (p && typeof p.catch === 'function') p.catch(() => { off(); end(id, 'failed', 'this recording did not load'); });
      return p;
    };
    MP.__alefPlayState = true;
  }
  return api;
}
