// @ts-check
// Shared tiny UI helpers for the round-4 pronunciation views (lane 3). No dependencies.
// Provides: element builder, Hebrew span (always dir=rtl lang=he), draft notice, tradition radios bound to
// ctx.settings.congregation, an honest audio button, a status live region, JSON loading, and a miss recorder.

import { TRADITIONS, TRADITION_LABELS, normalizeTradition } from './sounds.model.js';

export const DRAFT_NOTICE = 'Draft, unreviewed: the pointing, sounds, respellings, stress marks and hints on this screen were written by an AI agent from published sources and have NOT been checked by a native speaker or a Hebrew teacher. There is no recorded audio for this screen yet.';

export const CSS = `
.alef-r4{font:16px/1.5 system-ui,sans-serif;max-width:60rem;margin:0 auto;padding:1rem}
.alef-r4 h2,.alef-r4 h3{margin:1.1em 0 .4em}
.alef-r4 .draft-flag{background:var(--warn-bg,#fff3cd);color:var(--warn-fg,#4d3b00);padding:.5rem .75rem;border-radius:8px;border-inline-start:4px solid var(--focus,#1a5fb4);font-weight:600}
.alef-r4 .he{font-size:2.2rem;line-height:1.3;unicode-bidi:isolate}
.alef-r4 .he-small{font-size:1.3rem;unicode-bidi:isolate}
.alef-r4 .ipa{font-family:"Noto Sans","DejaVu Sans",sans-serif}
.alef-r4,.alef-r4 *{box-sizing:border-box}
.alef-r4 fieldset{min-width:0;border:1px solid var(--border,#888);border-radius:8px;padding:.5rem 1rem;margin:.6rem 0}
.alef-r4 fieldset label{margin-inline-end:1.2rem}
.alef-r4 button{font:inherit;cursor:pointer;border:1px solid var(--border,#666);border-radius:6px;background:var(--card,#f4f4f4);color:inherit;padding:.3rem .7rem;min-height:2.5rem}
.alef-r4 button[aria-pressed=true],.alef-r4 button[aria-checked=true]{background:var(--accent,#1a5fb4);color:var(--accent-fg,#fff);border-color:var(--accent,#1a5fb4)}
.alef-r4 button:focus-visible,.alef-r4 input:focus-visible{outline:3px solid var(--focus,#1a5fb4);outline-offset:2px}
.alef-r4 .badge{font-size:.8rem;border:1px solid currentColor;border-radius:4px;padding:0 .3rem;margin-inline-start:.4rem}
.alef-r4 .muted{opacity:.8}
.alef-r4 .cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(9rem,100%),1fr));gap:.6rem}
.alef-r4 .card{border:1px solid var(--border,#888);border-radius:8px;padding:.6rem}
.alef-r4 [role=status]{min-height:1.5em;font-weight:600}
@media (prefers-reduced-motion:no-preference){.alef-r4 .anim{transition:opacity .25s}}
`;

/** Fetch JSON files from data/pronunciation/ (or take them from ctx.pronunciationData). */
export async function loadData(ctx, names) {
  const out = {};
  const missing = [];
  for (const n of names) { if (ctx?.pronunciationData?.[n]) out[n] = ctx.pronunciationData[n]; else missing.push(n); }
  await Promise.all(missing.map(async (f) => {
    const res = await globalThis.fetch(new URL(`../../data/pronunciation/${f}.json`, import.meta.url));
    if (!res.ok) throw new Error(`could not load ${f}.json (${res.status})`);
    out[f] = await res.json();
  }));
  return out;
}

/**
 * Create the shared view scaffold.
 * @param {HTMLElement} root
 * @param {any} ctx
 * @param {{cls:string, titleId:string, title:string, titleKey:string}} o
 */
export function createView(root, ctx, o) {
  const doc = root.ownerDocument;
  let alive = true;
  /** @type {Array<() => void>} */ const cleanups = [];
  /** @type {Array<() => void>} */ const tradListeners = [];
  let tradition = normalizeTradition(ctx.settings?.congregation);

  const tr = (key, fallback) => {
    const v = typeof ctx.t === 'function' ? ctx.t(key) : undefined;
    return v && v !== key ? v : fallback;
  };
  const h = (tag, attrs = {}, ...kids) => {
    const el = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (typeof v === 'boolean' && k.startsWith('aria-')) { el.setAttribute(k, String(v)); continue; }
      if (v === false || v == null) continue;
      el.setAttribute(k, v === true ? '' : String(v));
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(typeof kid === 'string' ? doc.createTextNode(kid) : kid);
    }
    return el;
  };
  const he = (text, cls = 'he') => h('span', { class: cls, dir: 'rtl', lang: 'he' }, text);
  const ipaEl = (text) => h('span', { class: 'ipa', dir: 'ltr', lang: 'und-fonipa' }, text);
  /** append that skips null/false (plain append would print "null"). */
  const put = (el, ...kids) => { el.append(...kids.flat().filter((k) => k != null && k !== false)); return el; };
  /** addEventListener with automatic cleanup */
  const on = (el, type, fn) => { el.addEventListener(type, fn); cleanups.push(() => el.removeEventListener(type, fn)); };

  const wrap = h('section', { class: `alef-r4 ${o.cls}`, 'aria-labelledby': o.titleId });
  root.replaceChildren();
  root.append(h('style', {}, CSS), wrap);

  const setTradition = (t, fromSettings = false) => {
    const next = normalizeTradition(t);
    if (next === tradition && !fromSettings) return;
    tradition = next;
    if (!fromSettings && ctx.settings) {
      try {
        if (typeof ctx.settings.set === 'function') ctx.settings.set('congregation', next);
        else ctx.settings.congregation = next;
      } catch { /* settings unavailable: keep local state */ }
    }
    for (const fn of tradListeners) fn();
  };
  const s = ctx.settings;
  if (s) {
    const cb = () => { if (alive && normalizeTradition(s.congregation) !== tradition) setTradition(s.congregation, true); };
    if (typeof s.subscribe === 'function') { const u = s.subscribe(cb); if (typeof u === 'function') cleanups.push(u); }
    else if (typeof s.onChange === 'function') { const u = s.onChange(cb); if (typeof u === 'function') cleanups.push(u); }
    else if (typeof s.addEventListener === 'function') { s.addEventListener('change', cb); cleanups.push(() => s.removeEventListener?.('change', cb)); }
  }

  const draftNotice = () => h('p', { class: 'draft-flag', role: 'note' }, tr('r4.draft', DRAFT_NOTICE));

  /** Radio group bound to the congregation setting. */
  const traditionSwitch = (name) => {
    const fs = h('fieldset', {}, h('legend', {}, tr('sounds.tradition', 'Reading tradition')));
    /** @type {any[]} */ const inputs = [];
    for (const t of TRADITIONS) {
      const input = h('input', { type: 'radio', name, value: t, id: `${name}-${t}` });
      input.checked = t === tradition;
      on(input, 'change', () => { if (input.checked) setTradition(t); });
      inputs.push(input);
      fs.append(h('label', { for: `${name}-${t}` }, input, ' ', TRADITION_LABELS[t] ?? t));
    }
    tradListeners.push(() => { for (const i of inputs) i.checked = i.getAttribute('value') === tradition; });
    return fs;
  };

  /** Play button only when a real file exists; otherwise an honest note. */
  const audioButton = (kind, id, label) => {
    let can = false;
    try { can = !!ctx.audio?.has?.(kind, id); } catch { can = false; }
    if (!can) return h('small', { class: 'muted' }, ` ${tr('r4.noAudio', '(no audio yet)')}`);
    const btn = h('button', { type: 'button', 'aria-label': `${tr('r4.play', 'Play')} ${label}` }, tr('r4.play', 'Play'));
    on(btn, 'click', () => { try { ctx.audio.play(kind, id); } catch { /* best effort */ } });
    return btn;
  };

  /** Tap-to-hear hook: calls ctx.audio.play only when a file exists; returns whether it played. */
  const tryPlay = (kind, id) => {
    try { if (ctx.audio?.has?.(kind, id)) { ctx.audio.play(kind, id); return true; } } catch { /* ignore */ }
    return false;
  };

  /** Record a miss for later SRS pickup (key pron.misses). Best effort. */
  const recordMiss = (screen, tag) => {
    try {
      if (!ctx.store?.get || !ctx.store?.set) return;
      const list = ctx.store.get('pron.misses', []) ?? [];
      list.push({ screen, tag, ts: Date.now() });
      ctx.store.set('pron.misses', list.slice(-200));
    } catch { /* ignore */ }
  };

  /** @type {Map<any, Array<() => void>>} */ const scopes = new Map();
  /** Re-render `container`: runs the listeners registered by its previous render, then build() fills it. */
  const renderInto = (container, build) => {
    for (const c of scopes.get(container) ?? []) { try { c(); } catch { /* ignore */ } }
    const start = cleanups.length;
    container.replaceChildren();
    build();
    scopes.set(container, cleanups.splice(start));
  };

  const title = h('h2', { id: o.titleId }, tr(o.titleKey, o.title));
  const status = h('p', { role: 'status', 'aria-live': 'polite' });
  const unmount = () => {
    alive = false;
    for (const c of cleanups.splice(0)) { try { c(); } catch { /* ignore */ } }
    for (const list of scopes.values()) for (const c of list) { try { c(); } catch { /* ignore */ } }
    scopes.clear();
    root.replaceChildren();
  };
  return {
    doc, wrap, put, h, he, ipaEl, on, tr, title, status, draftNotice, traditionSwitch, renderInto, audioButton, tryPlay, recordMiss,
    get tradition() { return tradition; }, setTradition, tradListeners, cleanups, unmount, get alive() { return alive; },
  };
}
