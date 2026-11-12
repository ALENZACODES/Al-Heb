// I10 + J10: the short "what changed" list on About and the What's New page (#/whats-new). Entries come from
// data/platform/changelog.json, generated from the git history by tools/release/changelog.mjs (never hand-written).
// The learner's marker (store key whatsnew.seen) is the hash of the newest entry they have seen.
export const SEEN_KEY = 'whatsnew.seen';
export const DATA_URL = new URL('../../data/platform/changelog.json', import.meta.url);

/** Entries newer than the seen marker. No marker = first look (nothing is called new); marker not in the list = all are new. */
export function newSince(entries, seen) {
  const list = Array.isArray(entries) ? entries : [];
  if (!seen) return [];
  const i = list.findIndex((e) => e.hash === seen);
  return i < 0 ? list.slice() : list.slice(0, i);
}

export async function loadChangelog(fetchFn = globalThis.fetch) {
  if (DATA_URL.protocol === 'file:') { const { readFile } = await import('node:fs/promises'); return JSON.parse(await readFile(DATA_URL, 'utf8')).entries || []; }
  const r = await fetchFn(DATA_URL); if (!r.ok) throw new Error('changelog HTTP ' + r.status);
  return (await r.json()).entries || [];
}

/** A list of entries as <ul> (h = the shell's element helper); new ones carry "New since your last visit". */
export function entryList(h, entries, fresh = []) {
  const isNew = new Set(fresh.map((e) => e.hash));
  return h('ul', { class: 'wn-list' }, ...entries.map((e) => h('li', {}, h('strong', {}, e.date), ' ', e.text, isNew.has(e.hash) ? h('span', { class: 'menu-tag' }, ' (new since your last visit)') : null, ' ', h('span', { class: 'muted mono' }, e.hash))));
}

/** About's section body: the newest `n` entries and a link to the full page. Never marks anything seen. */
export async function fillAbout(sec, h, { fetchFn, store, n = 6 } = {}) {
  try {
    const entries = await loadChangelog(fetchFn);
    const seen = (() => { try { return store?.get?.(SEEN_KEY, null) ?? null; } catch { return null; } })();
    const fresh = newSince(entries, seen);
    sec.replaceChildren(sec.firstChild,
      h('p', {}, fresh.length ? `${fresh.length === 1 ? '1 change' : `${fresh.length} changes`} since your last visit to What's New.` : 'The latest changes, taken from the project history:'),
      entryList(h, entries.slice(0, n), fresh), h('p', {}, h('a', { class: 'btn secondary', href: '#/whats-new' }, "All recent changes")));
  } catch { sec.replaceChildren(sec.firstChild, h('p', {}, 'The list of changes did not load. Open About again while online to see it.')); }
}
