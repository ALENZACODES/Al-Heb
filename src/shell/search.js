// Pure search logic (no DOM) so it can be tested in Node: page index over routes, Hebrew letter lookup, vocabulary lookup.
// Data comes from the existing files only: data/letters/letters.json and the vocab tier packs (lazy, via src/vocab/loader.js).
import { searchablePages, labelKey, description, ROUTE_SECTION, tierOf } from './nav-model.js';

const NIQQUD = /[֑-ׇ]/g;
const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
export const hasHebrew = (s) => /[א-ת]/.test(s);
/** Lowercase, drop Latin accents, Hebrew points and cantillation, fold final letters to their regular forms, collapse punctuation. */
export function norm(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(NIQQUD, '').replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .toLowerCase().replace(/[^a-z0-9א-ת]+/g, ' ').trim();
}
const tokens = (q) => norm(q).split(' ').filter(Boolean);

/** Words a beginner types for a feature, beyond its label (usability review
 *  U-22): "camera", "prayers" or "dictionary" must find the page that does
 *  it, not only the page that happens to be named it. */
const FEATURE_WORDS = {
  scan: 'camera photo picture photograph menu sign ocr printed page',
  camera: 'camera translate translator translation photo picture sign menu street shop english',
  read: 'prayers prayer siddur blessings bless synagogue service',
  speak: 'say pronounce pronunciation microphone aloud practice speaking',
  phrases: 'sayings sentences everyday expressions',
  games: 'play playing game',
  vocab: 'dictionary words word meanings translate translation',
  calendar: 'dates shabbat holidays festivals portion week',
  letters: 'alphabet aleph alef bet letters tracing',
  books: 'stories story book reading',
  help: 'help questions answers guide stuck',
  settings: 'voice style preferences options',
  progress: 'streak done finished plan tomorrow',
  morning: 'prayer morning modeh ani god verse',
  festivals: 'holidays jewish year festival',
  listen: 'hear hearing cantor music songs',
  synagogues: 'synagogue synagogues temple shul congregation congregations canada canadian reform toronto montreal vancouver ottawa calgary edmonton winnipeg victoria hamilton directory',
};

/** @returns {{name:string, section:string, tier:'v0'|'preview', label:string, desc:string, href:string, hay:string, labelN:string}[]} */
export function buildPageIndex(routes, available, t, tHe = () => '', sectionLabel = (id) => id) {
  return searchablePages(routes, available).map((r) => {
    const label = t(labelKey(r)), he = tHe(labelKey(r)), desc = description(r, label), section = ROUTE_SECTION[r.name] || 'more';
    return { name: r.name, section, tier: tierOf(r), label, desc, he, href: '#' + r.pattern, labelN: norm(label), hay: norm([label, r.title, he, sectionLabel(section), r.name, FEATURE_WORDS[r.name] || ''].join(' ')) };
  });
}

function rank(hayWords, hay, labelN, tok) {
  if (labelN === tok) return 0;
  if (labelN.startsWith(tok)) return 1;
  if (hayWords.some((w) => w.startsWith(tok))) return 2;
  return hay.includes(tok) ? 3 : -1;
}
export function searchPages(index, q, limit = 12) {
  const tk = tokens(q); if (!tk.length) return [];
  const out = [];
  for (const e of index) {
    const words = e.hay.split(' '); let score = 0, ok = true;
    for (const k of tk) { const r = rank(words, e.hay, e.labelN, k); if (r < 0) { ok = false; break; } score += r; }
    if (ok) out.push({ e, score });
  }
  return out.sort((a, b) => a.score - b.score || a.e.label.localeCompare(b.e.label)).slice(0, limit).map((x) => x.e);
}

/** Letter lookup by id/name ("bet"), Hebrew letter or pointed name, or sound text. */
export function searchLetters(letters, q, limit = 6) {
  const n = norm(q); if (!n) return [];
  const heQ = hasHebrew(q);
  const out = [];
  for (const l of letters || []) {
    const id = norm(l.id.replace(/-final$/, ' final')), name = norm(l.name), he = norm(l.he), nameHe = norm(l.nameHe);
    let s = -1;
    if (heQ) { if (he === n) s = 0; else if (nameHe === n) s = 0; else if (n.length > 1 && nameHe.includes(n)) s = 2; else if (n.length === 1 && n === he) s = 0; }
    else if (n.length >= 1) { if (name === n || id === n) s = 0; else if (name.startsWith(n) || id.startsWith(n)) s = 1; else if (n.length >= 3 && norm(l.sound?.en).split(' ').includes(n)) s = 3; }
    if (s >= 0) out.push({ l, s });
  }
  return out.sort((a, b) => a.s - b.s).slice(0, limit).map((x) => x.l);
}

/** Word lookup over vocabulary entries (lemma/pointed for Hebrew queries, gloss for English). Lower rank = better match. */
export function searchWords(entries, q, limit = 15) {
  const n = norm(q); if (n.length < 1) return [];
  const heQ = hasHebrew(q); const out = [];
  for (const e of entries || []) {
    let s = -1;
    if (heQ) { const lem = norm(e.lemma), pt = norm(e.pointed); if (lem === n || pt === n) s = 0; else if (lem.startsWith(n) || pt.startsWith(n)) s = 1; else if (n.length > 1 && (lem.includes(n) || pt.includes(n))) s = 3; }
    else { const g = norm(e.gloss); const gw = g.split(' '); if (g === n) s = 0; else if (gw[0] === n) s = 1; else if (n.length >= 2 && gw.includes(n)) s = 2; else if (n.length >= 3 && gw.some((w) => w.startsWith(n))) s = 3; }
    if (s >= 0) out.push({ e, s, r: e.rank ?? 1e9 });
  }
  return out.sort((a, b) => a.s - b.s || a.r - b.r).slice(0, limit).map((x) => x.e);
}

const cache = {};
/** Lazy: letters.json (browser fetch or Node file read). */
export function loadLetters() {
  if (cache.letters) return cache.letters;
  const url = new URL('../../data/letters/letters.json', import.meta.url);
  cache.letters = (async () => {
    if (url.protocol === 'file:') { const [{ readFile }, { fileURLToPath }] = await Promise.all([import('node:fs/promises'), import('node:url')]); return JSON.parse(await readFile(fileURLToPath(url), 'utf8')); }
    const r = await fetch(url); if (!r.ok) throw new Error('letters HTTP ' + r.status); return r.json();
  })();
  cache.letters.catch(() => { delete cache.letters; });
  return cache.letters;
}
/** Lazy: vocabulary tiers, smallest first, via the existing loader. */
export async function loadWordTiers(onTier) {
  const { loadTier, TIER_BANDS } = await import('../vocab/loader.js');
  for (const t of TIER_BANDS) { try { onTier(t, await loadTier(t)); } catch (e) { onTier(t, null, e); } }
}
