import { el } from '../curriculum/dom.js';

export const FINGER_CSS = `
.alef-trd .trd-finger-panel{background:var(--card,#fff);border:2px solid var(--border,#767676);border-radius:10px;padding:.5rem;margin-block:.7rem}
.alef-trd .trd-finger-panel p{margin:.25rem 0}
.alef-trd .trd-finger-word{border-radius:.2em}
.alef-trd .trd-finger-on{touch-action:pinch-zoom;user-select:none;-webkit-user-select:none}
.alef-trd .trd-finger-on .trd-finger-word{position:relative;cursor:pointer;display:inline-block;min-block-size:44px;padding:.08em .08em .65em;scroll-margin-block:5rem}
.alef-trd .trd-finger-word[aria-current="true"]{background:var(--hl,#ffe9a8);color:var(--hl-ink,#000);outline:3px solid currentColor;outline-offset:2px}
.alef-trd .trd-finger-word[aria-current="true"]::after{content:'☝';position:absolute;inset-block-end:0;left:50%;transform:translateX(-50%);font-size:.6em;line-height:1;pointer-events:none}
.alef-trd .trd-finger-word:focus-visible{outline:3px dashed currentColor}
`;

/** A visual word guide, independent of audio: preserves whitespace and Hebrew combining marks. */
export function createFingerGuide({ clock, calm = () => false, announce = () => {}, redraw = () => {} }) {
  let enabled = false, words = [], selected = -1, timer = null, interval = 900, key = '', activePointer = null;
  let label = null, run = null, slower = null, faster = null;
  const refresh = () => {
    if (label) label.textContent = words.length ? `Word ${Math.max(0, selected) + 1} of ${words.length} · ${Math.round(60000 / interval)} words/minute` : 'Choose a word to begin.';
    if (run) { run.textContent = timer == null ? 'Move guide for me' : 'Pause guide'; run.setAttribute('aria-pressed', String(timer != null)); }
    if (slower) slower.disabled = interval >= 2100;
    if (faster) faster.disabled = interval <= 300;
  };
  const pause = () => { if (timer != null) clock.clearInterval(timer); timer = null; refresh(); };
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
      if (!part || /^\s+$/u.test(part)) return part;
      const n = words.length;
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
    begin(chapterKey) { pause(); activePointer = null; words = []; if (key !== chapterKey) selected = -1; key = chapterKey; },
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
      run = el('button', { type: 'button', class: 'trd-finger-run', onclick: () => timer == null ? start() : pause() }, 'Move guide for me');
      slower = el('button', { type: 'button', class: 'trd-finger-slower', onclick: () => pace(300) }, 'Slower guide');
      faster = el('button', { type: 'button', class: 'trd-finger-faster', onclick: () => pace(-300) }, 'Faster guide');
      const step = (d) => { pause(); select(Math.max(0, selected) + d, true); announce(`Guide at word ${selected + 1} of ${words.length}.`); };
      refresh();
      return el('section', { class: 'trd-finger-panel', 'aria-label': 'Finger reading guide' },
        el('div', { class: 'trd-bar' }, toggle, el('button', { type: 'button', class: 'trd-finger-prev', onclick: () => step(-1) }, 'Previous word'), el('button', { type: 'button', class: 'trd-finger-next', onclick: () => step(1) }, 'Next word')),
        el('p', {}, 'Drag across Hebrew words: the guide follows your finger as slowly or quickly as you move. Scroll beside the Hebrew text; pinch to zoom.'),
        calm() ? el('p', {}, 'Calm mode: move the guide with your finger or the word buttons.') : el('div', { class: 'trd-bar' }, run, slower, faster), label,
        el('p', {}, 'Visual reading guide only. It does not follow or change the recording’s timing.'));
    },
    pause,
    dispose() { pause(); activePointer = null; words = []; },
  };
}
