// I9 Helpful 404: "Did you mean ...?" for an unknown address, from the route table only (no network, no guessing of content).
// A route matches when its address is a close spelling of what was typed (edit distance), when one starts with the other
// ("/vocabulary" -> "/vocab"), or when the typed word is a word of the page's title ("/torah" -> "Torah reader").

/** Levenshtein distance. */
export function lev(a, b) {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
/** Common words for a page that its address does not contain. */
export const ALIASES = { lessons: 'learn', lesson: 'learn', course: 'learn', prayers: 'service', prayer: 'service', siddur: 'service', dictionary: 'vocab', words: 'vocab',
  alphabet: 'letters', alefbet: 'letters', stories: 'books', story: 'books', reviews: 'scheduler', srs: 'scheduler', torah: 'torahreader', export: 'settings', backup: 'settings' };
const words = (s) => String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3);

/**
 * @param {string} path the unknown path, e.g. "/vocabulary" @param {{name:string, pattern:string, title:string}[]} routes
 * @param {{available?: Set<string>, limit?: number}} [o] @returns {{href:string, title:string}[]} best first, at most `limit`
 */
export function suggestRoutes(path, routes, { available, limit = 3 } = {}) {
  const segs = String(path || '').toLowerCase().split(/[/?#]/).filter(Boolean);
  const first = (segs[0] || '').replace(/[^a-z0-9-]/g, '');
  if (!first) return [];
  const seen = new Map();
  for (const r of routes) {
    if (available && !available.has(r.name)) continue;
    const stat = r.pattern.split('/').filter(Boolean).filter((p) => !p.startsWith(':'));
    if (!stat.length || stat.length !== r.pattern.split('/').filter(Boolean).length) continue; // pages with a parameter need it; list their parent instead
    const key = stat[0].toLowerCase();
    let score = lev(first, key) / Math.max(first.length, key.length);
    if (first.length >= 3 && (key.startsWith(first) || first.startsWith(key)) && key.length >= 3) score = Math.min(score, 0.1);
    if (first.length >= 4 && words(r.title).some((w) => w === first || (w.length >= 4 && (w.startsWith(first) || first.startsWith(w))))) score = Math.min(score, 0.2);
    if (ALIASES[first] === r.name) score = 0;
    if (stat.length > 1) score += 0.05; // prefer a section's main page
    if (score > 0.34) continue;
    const href = '#' + r.pattern;
    if (!seen.has(href) || seen.get(href).score > score) seen.set(href, { href, title: r.title, score });
  }
  return [...seen.values()].sort((a, b) => a.score - b.score || a.href.length - b.href.length).slice(0, limit).map(({ href, title }) => ({ href, title }));
}
