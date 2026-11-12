// @ts-check
// Audio lane (12 Nov): shared listening controls. Each is a plain DOM builder taking the view's ctx ({audio, settings}).
//   readinessNote   "48 of 50 lines have audio. 2 have audio coming." (A7), from the player's own plan
//   traditionCompare  one control, three buttons: Israeli / Sephardi / Ashkenazi, each labelled with what really plays (A5)
//   mountQueue      Play all with a progress list the learner can tap into (A6)
//   speedChooser    1× / 0.8× / 0.7× / 0.6× (A2), the shared clipRate setting, pitch kept
// Play buttons use the shared playing state (src/shell/audio-access.js playWithState, src/shell/play-state.js), so each shows a live
// "playing" state while it sounds (I3).
import { el, heText } from '../curriculum/dom.js';
import { playWithState } from '../shell/audio-access.js';
import { displayHebrew } from '../shell/names.js';
import { readiness, readinessLine, compareState, TRADITION_NAMES, RATE_CHOICES, rateOf } from './core.js';

const CSS = `
.al-tools{display:grid;gap:.6rem}
.al-row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}
.al-ready{margin:.25rem 0;font-size:.92rem}
.al-cmp{border:1px solid var(--border,#bbb);border-radius:12px;padding:.6rem .8rem}
.al-cmp h3,.al-queue h3{margin:.1rem 0 .4rem;font-size:1rem}
.al-cmp-list{list-style:none;margin:0;padding:0;display:grid;gap:.4rem}
.al-cmp-list li{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}
.al-cmp-list .al-state{font-size:.88rem}
.al-cmp-list li[data-state="israeli"] .al-state,.al-cmp-list li[data-state="none"] .al-state,.al-cmp-list li[data-state="held"] .al-state{font-style:italic}
.al-queue{border:1px solid var(--border,#bbb);border-radius:12px;padding:.6rem .8rem}
.al-queue ol{margin:.4rem 0 0;padding-inline-start:1.6rem;display:grid;gap:.25rem;max-block-size:22rem;overflow:auto}
.al-queue li button{background:none;border:0;padding:.25rem .3rem;min-block-size:44px;text-align:start;cursor:pointer;color:inherit;font:inherit;inline-size:100%}
.al-queue li[aria-current="true"] button{outline:3px solid var(--accent,#d4a647);border-radius:8px;font-weight:600}
.al-queue li[data-done="1"] button{opacity:.75}
.al-queue li[data-none="1"] .al-q-note{font-style:italic}
.al-q-note{font-size:.85rem;margin-inline-start:.4rem}
.al-speed button[aria-pressed="true"]{outline:3px solid var(--accent,#d4a647)}
.al-word[data-on="1"]{background:var(--accent-soft,#f6e3a8);color:#111;border-radius:6px;box-shadow:0 0 0 2px var(--accent,#d4a647)}
.al-est{font-size:.85rem}
.al-kb{display:grid;gap:.3rem;direction:rtl}
.al-kb-row{display:flex;gap:.3rem;justify-content:center;flex-wrap:wrap}
.al-kb button{min-inline-size:44px;min-block-size:44px;font-size:1.3rem}
.al-opts{display:grid;gap:.5rem;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr))}
.al-opts button{min-block-size:52px;font-size:1.35rem}
.al-gapline{font-size:1.6rem;line-height:2.4rem}
.al-gap{display:inline-block;min-inline-size:4ch;border-block-end:3px solid currentColor;margin-inline:.2em}
`;
/** Add the shared stylesheet once. */
export function ensureStyle(doc = globalThis.document) {
  try { if (!doc?.head || doc.getElementById?.('al-style')) return; const s = doc.createElement('style'); s.id = 'al-style'; s.textContent = CSS; doc.head.append(s); } catch { /* optional */ }
}

/** Wait (at most `ms`) for the clip list and, when word clips are asked about, the word shard. Never throws. */
export async function audioReady(ctx, { words = false, ms = 8000 } = {}) {
  const a = ctx?.audio;
  if (!a) return false;
  const timeout = new Promise((r) => setTimeout(() => r(false), ms));
  const work = (async () => {
    try { if (typeof a.ensureManifest === 'function') await a.ensureManifest(); } catch { /* offline */ }
    if (words) {
      try { a.status?.('word', '__probe__'); } catch { /* asks for the shard */ }
      try { const s = globalThis.alefShards; if (s && typeof s.load === 'function') await s.load(); } catch { /* fallback list */ }
    }
    return true;
  })();
  return Promise.race([work, timeout]);
}

/**
 * A7: one readiness line for a list of items; re-counted once the clip list has loaded.
 * @param {any} ctx @param {{kind:string,id:string,text?:string}[]} items @param {string} noun plural noun
 */
export function readinessNote(ctx, items, noun = 'items', { words = false } = {}) {
  const p = el('p', { class: 'al-ready muted', 'data-audio-ready': '' });
  const draw = () => { const r = readiness(ctx?.audio, items); p.textContent = readinessLine(r, noun); p.dataset.clip = String(r.clip); p.dataset.total = String(r.total); return r; };
  draw();
  audioReady(ctx, { words }).then(draw).catch(() => {});
  return p;
}

/**
 * A5: the same item in Israeli, Sephardi and Ashkenazi, one tap each, each labelled with what the app really plays for it.
 * @param {any} ctx @param {{kind:string, id:string, text?:string, title?:string}} o
 */
export function traditionCompare(ctx, o) {
  const list = el('ul', { class: 'al-cmp-list' });
  const box = el('section', { class: 'al-cmp', 'aria-label': 'Compare the three traditions' },
    el('h3', {}, o.title || 'Hear It In Each Tradition'), list,
    el('p', { class: 'muted al-est' }, 'Each button plays that setting\'s file for this item. Where a tradition has no clip of its own yet, the button says so and what plays instead. Your saved setting does not change.'));
  const draw = () => {
    list.replaceChildren();
    for (const t of ['israeli', 'sephardi', 'ashkenazi']) {
      let plan = null; try { plan = ctx?.audio?.status?.(o.kind, o.id, { tradition: t, ...(o.text ? { text: o.text } : {}) }); } catch { plan = null; }
      const st = compareState(t, plan);
      const state = el('span', { class: 'al-state muted' }, st.label);
      const playable = st.state === 'own' || st.state === 'same' || st.state === 'israeli' || st.state === 'device';
      const btn = el('button', { type: 'button', class: 'btn secondary al-cmp-play', 'data-tradition': t, disabled: playable ? null : true,
        'aria-label': `Play ${TRADITION_NAMES[t]}: ${st.label}`,
        onclick: async () => { const r = await playWithState(ctx, btn, o.kind, o.id, { tradition: t, ...(o.text ? { text: o.text } : {}), label: `${TRADITION_NAMES[t]}` }); if (r && r.source === 'none') state.textContent = 'Audio coming'; } },
      el('span', { 'aria-hidden': 'true', 'data-glyph': '' }, '▶'), ` ${TRADITION_NAMES[t]}`);
      list.append(el('li', { 'data-state': st.state }, btn, state));
    }
  };
  draw();
  audioReady(ctx, { words: o.kind === 'word' }).then(draw).catch(() => {});
  return box;
}

/** A2: speed buttons bound to the shared clipRate setting (applies to the sound playing now, too). */
export function speedChooser(ctx, { onChange } = {}) {
  const group = el('div', { class: 'al-row al-speed', role: 'group', 'aria-label': 'Speed' }, el('span', { class: 'muted' }, 'Speed:'));
  const cur = () => { try { return ctx?.settings?.get?.('clipRate') || 'normal'; } catch { return 'normal'; } };
  const sync = () => { for (const b of group.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.getAttribute('data-rate') === cur())); };
  for (const c of RATE_CHOICES) {
    group.append(el('button', { type: 'button', class: 'btn secondary', 'data-rate': c.value, 'aria-pressed': String(c.value === cur()), 'aria-label': `Speed ${c.label}`,
      onclick: () => { try { ctx?.settings?.set?.({ clipRate: c.value }); } catch { /* storage blocked */ } try { ctx?.audio?.setClipRate?.(c.value); } catch { /* nothing playing */ } sync(); onChange?.(rateOf(c.value)); } }, c.label));
  }
  return group;
}

/**
 * A6: Play all, with a progress list the learner can tap into.
 * @param {any} ctx @param {{kind:string,id:string,label:string,he?:string,text?:string}[]} items
 * @param {{title?:string, noun?:string, gapMs?:number, onItem?:(i:number)=>void}} [o]
 * @returns {{node:HTMLElement, stop:()=>void, playFrom:(i:number)=>Promise<void>}}
 */
export function mountQueue(ctx, items, o = {}) {
  const noun = o.noun || 'items';
  const status = el('p', { class: 'muted', role: 'status', 'aria-live': 'polite' }, '');
  const list = el('ol', { 'aria-label': `${o.title || 'Play all'}: ${items.length} ${noun}` });
  let gen = 0, at = -1;
  const rows = items.map((it, i) => {
    const note = el('span', { class: 'al-q-note muted' }, '');
    const b = el('button', { type: 'button', onclick: () => playFrom(i) }, it.he ? heText(displayHebrew(it.he, 'abbrev')) : '', it.he ? ' ' : '', it.label || '', note);
    const li = el('li', {}, b);
    return { li, note };
  });
  list.append(...rows.map((r) => r.li));
  const mark = (i) => { rows.forEach((r, k) => r.li.setAttribute('aria-current', String(k === i))); };
  const playBtn = el('button', { type: 'button', class: 'btn al-q-play', onclick: () => playFrom(at >= 0 && at < items.length - 1 ? at : 0) }, `▶ Play all ${items.length} ${noun}`);
  const stopBtn = el('button', { type: 'button', class: 'btn secondary al-q-stop', onclick: () => stop() }, '■ Stop');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function playFrom(start) {
    const mine = ++gen;
    try { ctx?.audio?.stop?.(); } catch { /* nothing playing */ }
    for (let i = start; i < items.length; i++) {
      if (mine !== gen) return;
      at = i; mark(i); o.onItem?.(i);
      status.textContent = `Playing ${i + 1} of ${items.length}.`;
      const it = items[i];
      let r = null;
      try { r = await ctx.audio.play(it.kind, it.id, { ...(it.text ? { text: it.text } : {}), label: it.label || '' }); } catch { r = null; }
      if (mine !== gen) return;
      rows[i].li.dataset.done = '1';
      if (!r || r.source === 'none') { rows[i].li.dataset.none = '1'; rows[i].note.textContent = r?.held ? '(held for review)' : '(audio coming)'; }
      else if (r.source === 'tts-fallback') rows[i].note.textContent = "(this device's voice)";
      if (i < items.length - 1) await wait(o.gapMs ?? 400);
    }
    if (mine === gen) { status.textContent = `Finished all ${items.length} ${noun}.`; at = -1; mark(-1); }
  }
  function stop() { gen++; try { ctx?.audio?.stop?.(); } catch { /* ignore */ } status.textContent = at >= 0 ? `Stopped at ${at + 1} of ${items.length}. Tap a row to go on from there.` : ''; }
  const node = el('section', { class: 'al-queue', 'aria-label': o.title || 'Play all' },
    el('h3', {}, o.title || 'Play All'), el('div', { class: 'al-row' }, playBtn, stopBtn), status, list);
  return { node, stop, playFrom };
}
