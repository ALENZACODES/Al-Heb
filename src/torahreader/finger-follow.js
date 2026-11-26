import { el } from '../curriculum/dom.js';
// Word timing is loaded on first use (keeps it out of the first-install precache, which has little headroom).
let T = null;
/** Loads word-timing.js once; the follower waits for it before its first move. */
export const preloadTiming = () => (T ? Promise.resolve(T) : import('./word-timing.js').then((m) => (T = m)));

export const FINGER_CSS = `
.alef-trd .trd-finger-panel{background:var(--card,#fff);border:2px solid var(--border,#767676);border-radius:10px;padding:.5rem;margin-block:.7rem}
.alef-trd .trd-finger-panel p{margin:.25rem 0}
.alef-trd .trd-finger-word{border-radius:.2em}
.alef-trd .trd-finger-on{touch-action:pinch-zoom;user-select:none;-webkit-user-select:none}
.alef-trd .trd-finger-on .trd-finger-word{position:relative;cursor:pointer;display:inline-block;min-block-size:44px;padding:.08em .08em .65em;scroll-margin-block:5rem}
.alef-trd .trd-finger-word[aria-current="true"]{background:var(--hl,#ffe9a8);color:var(--hl-ink,#000);outline:3px solid currentColor;outline-offset:2px}
.alef-trd .trd-finger-word[aria-current="true"]::after{content:'☝';position:absolute;inset-block-end:0;left:50%;transform:translateX(-50%);font-size:.6em;line-height:1;pointer-events:none}
.alef-trd .trd-finger-word:focus-visible{outline:3px dashed currentColor}
.alef-trd .trd-finger-follow[aria-pressed="true"]{font-weight:700}
`;

/**
 * A visual word guide: preserves whitespace and Hebrew combining marks. The learner moves it with a finger, the keys or the
 * pacing timer. When "Follow the recording" is on, a playing verse clip moves it word by word: from the device voice's own
 * word boundaries when it reports them, otherwise from the clip's playback position and estimated word times
 * (word-timing.js; real per-word times are used instead when a caller supplies them).
 */
export function createFingerGuide({ clock, calm = () => false, announce = () => {}, redraw = () => {} }) {
  let enabled = false, words = [], selected = -1, timer = null, interval = 900, key = '', activePointer = null;
  let label = null, run = null, slower = null, faster = null;
  let followOn = true, follow = null, followBtn = null, wordText = [];
  /** verse -> { first, count }: where each verse's words sit in `words`. */
  const verseRange = new Map();
  const stopFollow = () => { if (follow?.timer != null) clock.clearInterval(follow.timer); follow = null; };
  const refresh = () => {
    if (label) label.textContent = !words.length ? 'Choose a word to begin.'
      : follow ? `Word ${Math.max(0, selected) + 1} of ${words.length} · following the recording${follow.estimated ? ' (estimated word timing)' : ''}`
        : `Word ${Math.max(0, selected) + 1} of ${words.length} · ${Math.round(60000 / interval)} words/minute`;
    if (followBtn) { followBtn.textContent = followOn ? 'Follow the recording: on' : 'Follow the recording: off'; followBtn.setAttribute('aria-pressed', String(followOn)); }
    if (run) { run.textContent = timer == null ? 'Move guide for me' : 'Pause guide'; run.setAttribute('aria-pressed', String(timer != null)); }
    if (slower) slower.disabled = interval >= 2100;
    if (faster) faster.disabled = interval <= 300;
  };
  const pause = () => { if (timer != null) clock.clearInterval(timer); timer = null; stopFollow(); refresh(); };
  function select(n, scroll = false) {
    if (!words.length) return;
    const next = Math.max(0, Math.min(words.length - 1, n));
    if (words[selected]) { words[selected].setAttribute('aria-current', 'false'); words[selected].setAttribute('tabindex', '-1'); }
    selected = next;
    words[selected].setAttribute('aria-current', 'true'); words[selected].setAttribute('tabindex', '0');
    if (scroll) words[selected].scrollIntoView?.({ block: 'nearest', behavior: 'auto' });
    refresh();
  }
  function start() {
    pause();
    if (!enabled || calm() || !words.length) return;
    if (selected < 0 || selected >= words.length - 1) select(0, true);
    timer = clock.setInterval(() => { if (selected >= words.length - 1) pause(); else select(selected + 1, true); }, interval);
    refresh();
  }
  function pace(delta) { const running = timer != null; interval = Math.max(300, Math.min(2100, interval + delta)); if (running) start(); refresh(); }
  function hit(ev) {
    let node = typeof document.elementFromPoint === 'function' && Number.isFinite(ev.clientX) ? document.elementFromPoint(ev.clientX, ev.clientY) : ev.target;
    while (node) { const i = words.indexOf(node); if (i >= 0) return i; node = node.parentElement || node.parent; }
    return -1;
  }
  function decorate(text, verse) {
    const children = String(text).split(/(\s+)/u).map((part) => {
      // Standalone paseq/sof-pasuq marks stay in the text but are not reading words.
      if (!/[א-ת]/u.test(part)) return part;
      const n = words.length;
      const key = String(verse); const r = verseRange.get(key);
      if (r) r.count++; else verseRange.set(key, { first: n, count: 1 });
      wordText.push(part);
      const word = el('span', { class: 'trd-finger-word', 'data-finger-word': String(n), role: 'button', tabindex: n === selected || (selected < 0 && n === 0) ? '0' : '-1',
        'aria-label': `Verse ${verse}, word ${n + 1}: ${part}`, 'aria-current': n === selected ? 'true' : 'false',
        onclick: () => { pause(); select(n); },
        onkeydown: (ev) => {
          const move = { ArrowLeft: 1, ArrowRight: -1, ArrowDown: 1, ArrowUp: -1 }[ev.key];
          if (move) { ev.preventDefault(); pause(); select(n + move, true); words[selected]?.focus?.(); }
          else if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pause(); select(n); }
        } }, part);
      words.push(word); return word;
    });
    return children;
  }
  return {
    enabled: () => enabled,
    begin(chapterKey) { pause(); activePointer = null; words = []; wordText = []; verseRange.clear(); if (key !== chapterKey) selected = -1; key = chapterKey; },
    /**
     * An onMedia listener for ctx.audio.play of one verse clip. It does nothing unless the guide and "Follow the recording" are on
     * (and calm mode is off). opts.aligned: real per-word [startMs, endMs] for this verse, when known.
     */
    followVerse(verse, opts = {}) {
      if (enabled && followOn) preloadTiming().catch(() => {});
      const handler = (ev) => {
        if (!ev || !enabled || !followOn || calm()) return;
        if (!T) { if (ev.type === 'playing' || ev.type === 'boundary') preloadTiming().then(() => handler(ev), () => {}); return; }
        const { verseTimes, wordAt, wordAtChar } = T;
        const r = verseRange.get(String(verse)); if (!r) return;
        if (ev.type === 'playing') {
          pause();
          const list = wordText.slice(r.first, r.first + r.count);
          const f = { verse: String(verse), timer: null, times: null, estimated: !opts.aligned };
          follow = f;
          select(r.first, true);
          if (typeof ev.clock === 'function') {
            f.timer = clock.setInterval(() => {
              if (follow !== f) return;
              const c = ev.clock();
              if (!f.times) { if (!c?.durMs) return; const vt = verseTimes(list, c.durMs, opts.aligned); f.times = vt.times; f.estimated = vt.estimated; }
              const i = wordAt(f.times, c.ms);
              if (i >= 0 && r.first + i !== selected) select(r.first + i, true);
            }, 100);
          }
          refresh();
        } else if (ev.type === 'boundary') {
          if (!follow || follow.verse !== String(verse)) return;
          follow.estimated = false;
          const i = Math.min(r.count - 1, wordAtChar(ev.spoken, ev.charIndex));
          if (r.first + i !== selected) select(r.first + i, true);
        } else if (ev.type === 'ended' || ev.type === 'stopped' || ev.type === 'error') {
          if (follow && follow.verse === String(verse)) { stopFollow(); refresh(); }
        }
      };
      return handler;
    },
    text(text, verse) { return enabled ? decorate(text, verse) : [text]; },
    bind(container) {
      if (!enabled) return;
      container.addEventListener('pointerdown', (ev) => {
        if (ev.isPrimary === false || (activePointer != null && activePointer !== ev.pointerId)) { activePointer = null; return; }
        if (ev.button != null && ev.button !== 0) return;
        const n = hit(ev); if (n < 0) return;
        pause(); activePointer = ev.pointerId; select(n); ev.preventDefault();
        try { container.setPointerCapture?.(ev.pointerId); } catch { /* optional */ }
      });
      container.addEventListener('pointermove', (ev) => { if (activePointer == null || ev.pointerId !== activePointer) return; const n = hit(ev); if (n >= 0) { select(n); ev.preventDefault(); } });
      const release = (ev) => { if (ev.pointerId !== activePointer) return; activePointer = null; try { container.releasePointerCapture?.(ev.pointerId); } catch { /* optional */ } };
      container.addEventListener('pointerup', release); container.addEventListener('pointercancel', release); container.addEventListener('lostpointercapture', release);
      if (words.length) select(Math.max(0, selected));
    },
    controls() {
      const toggle = el('button', { type: 'button', class: 'trd-finger-toggle', 'aria-pressed': String(enabled), onclick: () => { pause(); enabled = !enabled; redraw(); announce(enabled ? 'Finger guide on. Drag across the Hebrew words at your own pace. Scroll beside the text.' : 'Finger guide off.'); } }, enabled ? 'Finger guide on' : 'Follow with my finger');
      if (!enabled) return el('div', { class: 'trd-bar' }, toggle);
      label = el('p', { class: 'trd-finger-position', 'aria-live': 'off' });
      followBtn = el('button', { type: 'button', class: 'trd-finger-follow', 'aria-pressed': String(followOn), onclick: () => { followOn = !followOn; if (!followOn) stopFollow(); refresh(); announce(followOn ? 'The guide will follow the Hebrew recording when a verse plays.' : 'The guide will not follow the recording.'); } }, '');
      run = el('button', { type: 'button', class: 'trd-finger-run', onclick: () => timer == null ? start() : pause() }, 'Move guide for me');
      slower = el('button', { type: 'button', class: 'trd-finger-slower', onclick: () => pace(300) }, 'Slower guide');
      faster = el('button', { type: 'button', class: 'trd-finger-faster', onclick: () => pace(-300) }, 'Faster guide');
      const step = (d) => { pause(); select(Math.max(0, selected) + d, true); announce(`Guide at word ${selected + 1} of ${words.length}.`); };
      refresh();
      return el('section', { class: 'trd-finger-panel', 'aria-label': 'Finger reading guide' },
        el('div', { class: 'trd-bar' }, toggle, el('button', { type: 'button', class: 'trd-finger-prev', onclick: () => step(-1) }, 'Previous word'), el('button', { type: 'button', class: 'trd-finger-next', onclick: () => step(1) }, 'Next word')),
        el('p', {}, 'Drag across Hebrew words: the guide follows your finger as slowly or quickly as you move. Scroll beside the Hebrew text; pinch to zoom.'),
        calm() ? el('p', {}, 'Calm mode: move the guide with your finger or the word buttons.') : el('div', { class: 'trd-bar' }, run, slower, faster, followBtn), label,
        el('p', {}, 'Press Hear or Play chapter and the guide follows the Hebrew recording word by word. Word timing is estimated from each word’s vowels (no clip has word timestamps yet), so it can run a little ahead or behind. Touch the text to take over.'));
    },
    pause,
    dispose() { pause(); activePointer = null; words = []; wordText = []; verseRange.clear(); },
  };
}
