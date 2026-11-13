// Small helpers the four diary pages share (timeline, My Hebrew, interest paths, reading shelf).
export async function loadJSON(rel) {
  const url = new URL(rel, import.meta.url);
  if (url.protocol === 'file:') { const { readFile } = await import('node:fs/promises'); return JSON.parse(await readFile(url, 'utf8')); }
  const r = await fetch(url); if (!r.ok) throw new Error(`${rel} HTTP ${r.status}`); return r.json();
}
export const tryJSON = async (rel, load = loadJSON) => { try { return await load(rel); } catch { return null; } };
/** "Thursday, 12 November 2026" from a day key, in the device's own language settings. */
export function dayLabel(day) {
  const [y, m, d] = String(day).split('-').map(Number); const date = new Date(y, (m || 1) - 1, d || 1);
  try { return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); } catch { return String(day); }
}
export const ago = (at, now) => { const n = Math.floor((now - at) / 86400000); return !at ? '' : n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`; };
export const LINKS = [['#/collection', 'My Collection'], ['#/shelf', 'Reading Shelf'], ['#/timeline', 'My Timeline'], ['#/my-hebrew', 'My Hebrew'], ['#/paths', 'Interest Paths']];
