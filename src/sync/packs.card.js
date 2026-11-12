// @ts-check
// The "Offline packs" card on Use Aleph offline (lane 4, 12 Nov). Loaded on demand by src/shell/offline.view.js.
// Each pack downloads with the same warmCache the page's "Download everything" uses (the service worker stores what is
// fetched), then the card re-reads the caches, so "saved" always means the files are really in this browser's cache.
import { el } from '../curriculum/dom.js';
import { PACKS_URL, packFiles, sizeLine } from './packs.js';

const IDS = ['core-lessons', 'core-prayers', 'due-review'];

/**
 * @param {HTMLElement} host @param {any} ctx @param {any} O the offline.js surface (warmCache, cacheReport) @param {any} env {fetch, caches, navigator}
 */
export function mountPacks(host, ctx, O, env = {}) {
  let packs = null, busy = '', alive = true;
  const reports = new Map();
  const status = el('p', { role: 'status', 'aria-live': 'polite', id: 'of-packs-status' });
  const list = el('ul', { id: 'of-packs-list' });
  host.replaceChildren(el('div', { class: 'of-card' }, el('h2', {}, 'Offline Packs'),
    el('p', {}, 'Save just what you need for a place with no signal, such as a synagogue. Sizes are measured from the files themselves.'),
    list,
    el('p', { class: 'muted' }, 'Voice clips are not in these packs: save them with Audio Packs below. A clip also plays offline after it has played once on this device while online.'),
    status));
  const fetchFn = env.fetch ?? globalThis.fetch?.bind(globalThis);
  const nav = env.navigator ?? globalThis.navigator;

  async function load() {
    try { const r = await fetchFn(PACKS_URL); if (!r.ok) throw new Error(`HTTP ${r.status}`); packs = await r.json(); }
    catch { packs = null; status.textContent = 'The pack list did not load. Open this page once while online, then try again.'; paint(); return; }
    await measure(); paint();
  }
  async function measure() {
    for (const id of IDS) {
      const p = packFiles(packs, id, { store: ctx?.store, now: Date.now() }); if (!p) continue;
      const rep = await O.cacheReport(p.urls, { caches: env.caches, measure: false });
      reports.set(id, { p, missing: rep.missing, supported: rep.supported });
    }
  }
  function paint() {
    if (!alive) return;
    if (!packs) { list.replaceChildren(); return; }
    list.replaceChildren(...IDS.map((id) => {
      const r = reports.get(id); if (!r) return null;
      const sizes = new Map((packs.packs.find((x) => x.id === id)?.files || []).map(([u, n]) => [u, n]));
      for (const [u, n] of Object.values(packs.letterPictures || {})) sizes.set(u, n);
      const done = r.missing.length === 0;
      const why = !r.supported ? 'This browser cannot keep files for offline use.' : nav?.onLine === false && !done ? 'You are offline. Connect to download this pack.' : '';
      return el('li', { 'data-pack': id, style: 'margin-block:.6rem' },
        el('strong', {}, r.p.label), el('p', { class: 'muted' }, r.p.blurb),
        id === 'due-review' ? el('p', {}, r.p.due ? `${r.p.due} card${r.p.due === 1 ? ' is' : 's are'} due on this device now.` : 'No cards are due right now; the pack still saves the review screen.') : null,
        el('p', { 'data-size': String(r.p.bytes) }, sizeLine(r.p, r.missing, sizes)),
        done ? el('p', {}, 'Ready offline.') : el('button', { type: 'button', class: 'btn secondary', 'data-pack-go': id, disabled: busy || why ? true : null, onclick: () => go(id) }, busy === id ? 'Downloading...' : `Download ${r.p.label}`),
        why ? el('p', { class: 'muted', 'data-why': id }, why) : null);
    }).filter(Boolean));
  }
  async function go(id) {
    const r = reports.get(id); if (!r || busy) return;
    busy = id; paint(); status.textContent = `Downloading ${r.p.label}. Keep this screen open.`;
    const out = await O.warmCache(r.missing, { fetch: env.fetch, online: () => nav?.onLine !== false });
    busy = '';
    await measure();
    status.textContent = out.offline ? 'You are offline, so nothing was downloaded.' : out.failed.length ? `${out.ok} files saved, ${out.failed.length} failed. Try again; saved files are skipped.` : `${r.p.label} saved: ${out.ok} files.`;
    paint();
  }
  load();
  return () => { alive = false; };
}
