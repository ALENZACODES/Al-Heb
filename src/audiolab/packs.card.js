// @ts-check
// A10: the "Audio Packs" card on Use Aleph offline (#/offline), loaded on demand by src/shell/offline.view.js.
// Choose a book, the prayer lines, or a set of ten lessons; the card lists how many clips that is in your voice and pronunciation
// setting (held clips never), how many are already on this device and their measured size, and saves the rest with a progress bar.
import { el } from '../curriculum/dom.js';
import { clipPaths, bookClipPaths, lessonSets, fmtBytes } from './core.js';
import { packStatus, downloadPack, removePack } from './packs.js';
import { audioReady } from './ui.js';

const lineItems = (registry) => (registry?.entries || []).flatMap((e) => {
  const ls = String(e.he || '').split('\n');
  return ls.map((_, i) => ({ kind: 'line', id: ls.length === 1 ? e.id : `${e.id}-l${i + 1}` }));
});

/**
 * @param {HTMLElement} host @param {any} ctx {audio, settings, fetchFn?} @param {any} [env] {fetch, caches, navigator}
 * @returns {() => void} unmount
 */
export function mountAudioPacks(host, ctx, env = {}) {
  let alive = true, ac = null, busy = false;
  const fetchFn = env.fetch ?? ctx?.fetchFn ?? globalThis.fetch?.bind(globalThis);
  const nav = env.navigator ?? globalThis.navigator;
  const voice = () => { try { return ctx?.settings?.get?.('voice') === 'm' ? 'm' : 'f'; } catch { return 'f'; } };
  const status = el('p', { role: 'status', 'aria-live': 'polite', id: 'of-audio-status' });
  const pick = el('select', { id: 'of-audio-pick', 'aria-label': 'Choose what to save' });
  const info = el('p', { id: 'of-audio-info' }, 'Choose what to save.');
  const actions = el('div', { class: 'of-row', id: 'of-audio-actions' });
  host.replaceChildren(el('div', { class: 'of-card', id: 'of-audio' }, el('h2', {}, 'Audio Packs'),
    el('p', {}, 'Save the voice clips for a book, the prayers or a set of lessons, so they play with no signal. The clips are the ones your voice and pronunciation settings play; clips held for review are never saved. Sizes are measured as the files arrive.'),
    el('label', { for: 'of-audio-pick' }, 'What to save: '), pick, info, actions, status));
  const json = async (u) => { const r = await fetchFn(u); if (!r || !r.ok) throw new Error(u); return r.json(); };

  /** @type {{id:string, label:string, paths:()=>Promise<string[]>}[]} */
  let choices = [];
  let paths = [];
  async function load() {
    pick.replaceChildren(el('option', { value: '' }, 'Loading the list…'));
    try {
      const [books, registry, lessons] = await Promise.all([json('data/books/index.json').catch(() => null), json('data/corpus/registry.json').catch(() => null), json('data/curriculum/lessons.json').catch(() => null)]);
      choices = [];
      if (registry) choices.push({ id: 'prayers', label: 'Prayers and Torah lines (every line)', paths: async () => { await audioReady(ctx); return clipPaths(ctx.audio, lineItems(registry)); } });
      for (const s of lessonSets(lessons?.lessons || [])) choices.push({ id: s.id, label: `${s.label}: the lesson words`, paths: async () => { await audioReady(ctx, { words: true }); return clipPaths(ctx.audio, s.items); } });
      for (const b of books?.books || []) if (b.hasAudio) choices.push({ id: `book-${b.id}`, label: `Book: ${b.titleEn}`, paths: async () => bookClipPaths((await json(`data/books/${b.id}.json`)).pages, voice()) });
    } catch { choices = []; }
    if (!alive) return;
    if (!choices.length) { pick.replaceChildren(el('option', { value: '' }, 'The list did not load')); info.textContent = 'The list of packs did not load. Open this page once while online, then try again.'; return; }
    pick.replaceChildren(el('option', { value: '' }, 'Choose…'), ...choices.map((c) => el('option', { value: c.id }, c.label)));
  }
  async function choose(id) {
    actions.replaceChildren(); status.textContent = '';
    const c = choices.find((x) => x.id === id); if (!c) { info.textContent = 'Choose what to save.'; return; }
    info.textContent = 'Counting the clips…';
    try { paths = await c.paths(); } catch { paths = []; }
    if (!alive) return;
    await paint(c);
  }
  async function paint(c) {
    if (!paths.length) { info.textContent = `${c.label}: no clips to save in your voice and setting yet. Audio coming.`; return; }
    const st = await packStatus(paths, { caches: env.caches });
    if (!alive) return;
    info.textContent = `${c.label}: ${paths.length} clip${paths.length === 1 ? '' : 's'}. ${st.saved} of ${paths.length} on this device${st.bytes ? ` (${fmtBytes(st.bytes)})` : ''}.`;
    const save = el('button', { type: 'button', class: 'btn', id: 'of-audio-save', disabled: st.saved === paths.length || busy ? true : null, onclick: () => run(c) }, st.saved === paths.length ? 'All saved' : `Save ${paths.length - st.saved} clip${paths.length - st.saved === 1 ? '' : 's'}`);
    const drop = el('button', { type: 'button', class: 'btn secondary', id: 'of-audio-remove', disabled: st.inPack ? null : true, onclick: async () => { const n = await removePack(paths, { caches: env.caches }); status.textContent = `Removed ${n} saved clip${n === 1 ? '' : 's'} from this pack.`; await paint(c); } }, 'Remove this pack');
    actions.replaceChildren(save, drop);
  }
  async function run(c) {
    if (busy) return; busy = true;
    ac = typeof AbortController === 'function' ? new AbortController() : null;
    const prog = el('progress', { id: 'of-audio-progress', value: '0', max: '1', 'aria-label': 'Audio pack download progress' });
    const line = el('p', { id: 'of-audio-progress-text' }, 'Starting…');
    actions.replaceChildren(prog, line, el('button', { type: 'button', class: 'btn secondary', id: 'of-audio-cancel', onclick: () => { ac?.abort(); status.textContent = 'Cancelling…'; } }, 'Cancel'));
    const r = await downloadPack(paths, { fetch: fetchFn, caches: env.caches, signal: ac?.signal, online: () => nav?.onLine !== false,
      onProgress: (p) => { prog.setAttribute('value', String(p.done)); prog.setAttribute('max', String(p.total || 1)); line.textContent = `${p.done} of ${p.total} clips, ${fmtBytes(p.bytes) || '0 bytes'} so far`; } });
    busy = false; ac = null;
    if (!alive) return;
    status.textContent = r.offline ? 'You are offline, so nothing could be saved. Try again with a connection.'
      : r.aborted ? `Cancelled. ${r.ok} clips (${fmtBytes(r.bytes)}) were saved and stay saved.`
        : r.failed.length ? `${r.ok} clips saved (${fmtBytes(r.bytes)}), ${r.failed.length} failed. Try again; saved clips are skipped.`
          : r.requested === 0 ? 'Every clip was already on this device.' : `Saved ${r.ok} clips (${fmtBytes(r.bytes)}).`;
    await paint(c);
  }
  pick.addEventListener('change', (e) => { if (!busy) choose(/** @type {any} */ (e.target).value); });
  load();
  return () => { alive = false; ac?.abort(); };
}
