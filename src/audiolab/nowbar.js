// @ts-check
// A1: one playback bar for every route. While a Hebrew clip or the device voice sounds, a bar pinned above the bottom navigation shows
// what is playing, a progress line (clip files only; the device voice reports no length), Pause / Resume, the speed (1×, 0.8×, 0.7×,
// 0.6×, pitch kept) and Stop. It hides when the sound ends. Sources: the shell audio's play() (ctx.audio, every Listen and Play button)
// and <audio> elements in the page (the little books). Music, interface sounds and game voice lines never show.
// Loaded after boot by src/app.js; runtime-cached (src/audiolab/ is on demand in tools/build-precache.mjs).
import { RATE_CHOICES, rateOf, progressOf, QUIET_SRC } from './core.js';

const CSS = `
.alef-nowbar{position:fixed;z-index:56;inset-inline:0;margin-inline:auto;inline-size:min(40rem,calc(100vw - 1rem));inset-block-end:calc(5.2rem + env(safe-area-inset-bottom));
 display:grid;gap:.3rem;padding:.45rem .7rem;border-radius:14px;background:#16301c;color:#fbf3d9;border:1px solid #d4a647;box-shadow:0 4px 14px rgba(0,0,0,.25);font-size:.92rem}
.alef-nowbar[hidden]{display:none}
.alef-nowbar .nb-top{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}
.alef-nowbar .nb-what{flex:1 1 10rem;min-inline-size:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.alef-nowbar button{min-block-size:40px;min-inline-size:40px;border-radius:10px;border:1px solid #d4a647;background:#21402a;color:#fbf3d9;font:inherit;padding:0 .55rem;cursor:pointer}
.alef-nowbar button[aria-pressed="true"]{background:#d4a647;color:#16301c;font-weight:700}
.alef-nowbar button:focus-visible{outline:3px solid #fbf3d9;outline-offset:2px}
.alef-nowbar .nb-prog{display:flex;gap:.5rem;align-items:center}
.alef-nowbar progress{flex:1;block-size:.5rem;accent-color:#d4a647}
.alef-nowbar .nb-time{font-variant-numeric:tabular-nums;font-size:.85rem}
body.alef-nowbar-on .alef-now-playing{position:fixed!important;inline-size:1px!important;block-size:1px!important;overflow:hidden!important;clip-path:inset(50%)!important;padding:0!important;border:0!important}
@media (prefers-reduced-motion:reduce){.alef-nowbar{transition:none}}
`;

/** Pure: the bar's label for a phase. */
export function barLine(phase, what = '') {
  const w = String(what || '').trim();
  if (phase === 'loading') return w ? `Loading: ${w}` : 'Loading the sound…';
  if (phase === 'paused') return w ? `Paused: ${w}` : 'Paused';
  return w ? `Playing: ${w}` : 'Playing';
}

/**
 * @param {{audio?:any, settings?:any, doc?:Document, win?:any, tickMs?:number}} o
 * @returns {null | {bar:HTMLElement, state:()=>any, hide:()=>void}}
 */
export function installNowBar({ audio, settings, doc = globalThis.document, win = globalThis, tickMs = 250 } = {}) {
  if (!doc || !doc.body || win.__alefNowBar) return win?.__alefNowBar || null;
  try { if (!doc.getElementById('alef-nowbar-style')) { const s = doc.createElement('style'); s.id = 'alef-nowbar-style'; s.textContent = CSS; doc.head.append(s); } } catch { /* optional */ }
  const mk = (tag, attrs = {}, text = '') => { const n = doc.createElement(tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); if (text) n.textContent = text; return n; };
  const bar = mk('div', { class: 'alef-nowbar', role: 'region', 'aria-label': 'Playback' }); bar.hidden = true;
  const top = mk('div', { class: 'nb-top' });
  const what = mk('span', { class: 'nb-what' });
  const pauseBtn = mk('button', { type: 'button', class: 'nb-pause', 'aria-label': 'Pause' }, '❚❚');
  const stopBtn = mk('button', { type: 'button', class: 'nb-stop', 'aria-label': 'Stop' }, '■');
  const speed = mk('div', { class: 'nb-speed', role: 'group', 'aria-label': 'Speed' });
  const speedBtns = [];
  for (const c of RATE_CHOICES) {
    const rateBtn = mk('button', { type: 'button', 'data-rate': c.value, 'aria-label': `Speed ${c.label}`, 'aria-pressed': 'false' }, c.label);
    rateBtn.addEventListener('click', () => pickRate(c.value));   // each button wired itself, so the dead-button gate can read it
    speedBtns.push(rateBtn); speed.append(rateBtn);
  }
  top.append(what, pauseBtn, stopBtn);
  const prog = mk('div', { class: 'nb-prog' });
  const meter = mk('progress', { max: '1', value: '0', 'aria-label': 'How far the sound has played' });
  const time = mk('span', { class: 'nb-time' });
  prog.append(meter, time);
  bar.append(top, prog, speed);
  doc.body.append(bar);

  /** @type {{type:'shell'|'dom', token?:number, el?:any, what:string, phase:string} | null} */
  let cur = null, timer = 0, hideTimer = 0;
  const rateNow = () => { try { return settings?.get?.('clipRate') || 'normal'; } catch { return 'normal'; } };
  const syncSpeed = () => { for (const b of speed.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.getAttribute('data-rate') === rateNow())); };
  const mediaNow = () => {
    if (!cur) return null;
    if (cur.type === 'dom') return cur.el ? { kind: 'file', media: cur.el } : null;
    try { return audio?.nowPlaying?.() || null; } catch { return null; }
  };
  const nameNow = () => cur?.what || win.__alefPlayState?.active?.what || '';
  function draw() {
    if (!cur) return;
    what.textContent = barLine(cur.phase, nameNow());
    const m = mediaNow();
    const p = m?.kind === 'file' ? progressOf(m.media) : null;
    prog.hidden = !p;
    if (p) { meter.setAttribute('value', String(p.fraction)); meter.value = p.fraction; time.textContent = p.text; }
    const paused = cur.phase === 'paused';
    pauseBtn.textContent = paused ? '▶' : '❚❚';
    pauseBtn.setAttribute('aria-label', paused ? 'Resume' : 'Pause');
    pauseBtn.disabled = !m;
  }
  function show(next) {
    clearTimeout(hideTimer);
    cur = next; bar.hidden = false; doc.body.classList.add('alef-nowbar-on'); syncSpeed(); draw();
    if (!timer) timer = win.setInterval ? win.setInterval(draw, tickMs) : setInterval(draw, tickMs);
  }
  function hide() {
    cur = null; bar.hidden = true; doc.body.classList.remove('alef-nowbar-on');
    if (timer) { (win.clearInterval || clearInterval)(timer); timer = 0; }
  }
  const hideSoon = () => { clearTimeout(hideTimer); hideTimer = setTimeout(() => { if (!cur || cur.phase !== 'playing') hide(); }, 600); };

  pauseBtn.addEventListener('click', () => {
    const m = mediaNow(); if (!cur || !m) return;
    if (m.kind === 'file') {
      try { if (m.media.paused) { const r = m.media.play(); if (r && r.catch) r.catch(() => {}); cur.phase = 'playing'; } else { m.media.pause(); cur.phase = 'paused'; } } catch { /* ignore */ }
    } else {
      const sp = win.speechSynthesis;
      try { if (cur.phase === 'paused') { sp?.resume?.(); cur.phase = 'playing'; } else { sp?.pause?.(); cur.phase = 'paused'; } } catch { /* ignore */ }
    }
    draw();
  });
  stopBtn.addEventListener('click', () => {
    if (cur?.type === 'dom') { try { cur.el.pause(); } catch { /* ignore */ } }
    else { try { audio?.stop?.(); } catch { /* ignore */ } try { win.speechSynthesis?.cancel?.(); } catch { /* ignore */ } }
    hide();
  });
  function pickRate(v) {
    try { settings?.set?.({ clipRate: v }); } catch { /* storage blocked */ }
    const m = mediaNow();
    if (cur?.type === 'shell') { try { audio?.setClipRate?.(v); } catch { /* ignore */ } }
    else if (m?.kind === 'file') { try { m.media.playbackRate = rateOf(v); m.media.preservesPitch = true; } catch { /* ignore */ } }
    syncSpeed(); draw();
  }

  // 1) the shell audio (every ctx.audio.play)
  if (audio && typeof audio.onPlay === 'function') {
    audio.onPlay((ev) => {
      if (ev.phase === 'start') { show({ type: 'shell', token: ev.token, what: ev.what || '', phase: 'loading' }); return; }
      if (!cur || cur.type !== 'shell' || cur.token !== ev.token) return;
      if (ev.phase === 'playing') { cur.phase = 'playing'; draw(); return; }
      cur.phase = ev.phase; hideSoon();
    });
  }
  // 2) <audio> elements in the page (media events do not bubble, so listen in the capture phase)
  const quiet = (t) => { const src = String(t?.currentSrc || t?.src || ''); return !src || t?.muted || QUIET_SRC.test(src) || t?.dataset?.playState === 'quiet'; };
  const isMedia = (t) => !!t && typeof t.pause === 'function' && 'currentTime' in t;
  doc.addEventListener('playing', (e) => {
    const t = /** @type {any} */ (e.target); if (!isMedia(t) || quiet(t)) return;
    if (cur?.type === 'dom' && cur.el === t) { cur.phase = 'playing'; draw(); return; }
    show({ type: 'dom', el: t, what: t.getAttribute?.('aria-label') || t.dataset?.label || '', phase: 'playing' });
  }, true);
  for (const type of ['pause', 'ended', 'error', 'emptied']) {
    doc.addEventListener(type, (e) => {
      const t = e.target; if (!cur || cur.type !== 'dom' || cur.el !== t) return;
      if (type === 'pause' && !(/** @type {any} */ (t)).ended) { cur.phase = 'paused'; draw(); return; }
      cur.phase = 'finished'; hideSoon();
    }, true);
  }
  const api = { bar, state: () => (cur ? { ...cur } : null), hide };
  win.__alefNowBar = api;
  return api;
}
