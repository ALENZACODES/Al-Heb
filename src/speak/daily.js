// Daily "Say it" card: five words or phrases that rotate by date and lean toward the learner's weakest sounds.
// For the home screen's Today card (the home owner calls loadDailyCardFromStore or buildDailyCard) and for the "Today's five"
// choice on the Say it screen. buildDailyCard is pure (no clock, no DOM, no store): the caller passes the date key.
// Items come only from data/speak/sets/*.json (copied from data/vocab/words.json, a machine-built draft). "Weak" comes from
// soundReport() in model.js, which counts a browser recognizer's output that ALEF has not verified for Hebrew; the card says so.
import { STORE_KEY, coerceState, normalizeHe, soundClass, soundLabel, soundReport } from './model.js';
import { loadSetsIndex, loadSet } from './loader.js';

export const DAILY_SIZE = 5;
export const DAILY_SETS_PER_DAY = 3;
export const DAILY_PREFIX = 'daily:';
export const DAILY_NOTE = 'Draft: words and vowel points were built by a program and are not teacher-checked. "Weak sounds" are counted from a browser recognizer that ALEF has not verified for Hebrew.';

/** Local calendar day as YYYY-MM-DD from epoch milliseconds. */
export function dayKeyLocal(ms) {
  const d = new Date(ms), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
/** Whole days since 1970-01-01 for a YYYY-MM-DD key (NaN-safe: bad keys give 0). */
export function dayNumber(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date));
  return m ? Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) : 0;
}
/** Small deterministic string hash in [0,1). */
export function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return (h >>> 0) / 4294967296;
}
/** Indexes of the sets that feed a day's pool: DAILY_SETS_PER_DAY consecutive sets, moving on each day. */
export function setsForDay(date, total, per = DAILY_SETS_PER_DAY) {
  if (!total) return [];
  const start = (dayNumber(date) * per) % total;
  return Array.from({ length: Math.min(per, total) }, (_, k) => (start + k) % total);
}

/** The letter classes in an item's Hebrew (distinct). */
export const itemClasses = (he) => [...new Set([...normalizeHe(he).replace(/ /g, '')].map(soundClass))];

/**
 * @param {{date:string, pool:Array<{id:string,he:string,translit?:string,en?:string,kind?:string,audioId?:string|null,set:string}>, attempts?:any[], n?:number}} o
 * @returns {{kind:'speak-daily', id:string, date:string, title:string, items:any[], weakSounds:string[], progress:{done:number,total:number}, complete:boolean, href:string, note:string}}
 * Only attempts from days before `date` are used for the choice (stable through the day); progress counts today's.
 * Score = how many weak letter classes the item contains (weighted by miss rate, classes with >= 3 tries) + a bonus for an item
 * whose last attempt was "not yet"/miss - a penalty for items attempted in the last two days + a tiny date-seeded jitter, so with no
 * history the choice simply rotates by date.
 */
export function buildDailyCard({ date, pool, attempts = [], n = DAILY_SIZE }) {
  const today = dayNumber(date);
  const dayOf = (ms) => { const d = new Date(ms); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); };
  // The choice uses only attempts from BEFORE the date, so the card does not change while the learner works through it.
  const prior = attempts.filter((a) => dayOf(a.at) < today);
  const rep = soundReport(prior, { min: 3 });
  const weak = new Map(rep.ranked.filter((r) => r.rate > 0).map((r) => [r.id, r.rate]));
  const lastBy = new Map();
  for (const a of prior) if ((a.kind === 'say' || a.kind === 'read') && a.itemId != null) { const k = String(a.itemId); if (!lastBy.has(k) || a.at >= lastBy.get(k).at) lastBy.set(k, a); }
  const seen = new Set(), scored = [];
  for (const it of pool || []) {
    const key = normalizeHe(it.he);
    if (!key || key === 'יהוה' || seen.has(key)) continue;
    seen.add(key);
    const classes = itemClasses(it.he);
    const hits = classes.filter((c) => weak.has(c)).sort((x, y) => weak.get(y) - weak.get(x));
    let score = hits.reduce((s, c) => s + weak.get(c), 0);
    const last = lastBy.get(String(it.id));
    let reason = hits.length ? `works on ${soundLabel(hits[0])}` : 'new for today';
    if (last && (last.outcome === 'notyet' || last.outcome === 'miss' || last.outcome === 'close')) { score += 0.5; reason = 'try again'; }
    if (last && today - dayOf(last.at) <= 1 && last.outcome !== 'notyet' && last.outcome !== 'miss') score -= 1;
    score += hash01(`${date}|${it.id}`) * 0.05;
    scored.push({ it, score, reason });
  }
  scored.sort((a, b) => b.score - a.score || String(a.it.id).localeCompare(String(b.it.id)));
  const items = scored.slice(0, n).map(({ it, reason }) => ({ id: it.id, he: it.he, translit: it.translit || '', en: it.en || '', kind: it.kind || 'word', audioId: it.audioId || null, set: it.set, reason }));
  const dailyId = DAILY_PREFIX + date;
  const doneIds = new Set(attempts.filter((a) => a.kind === 'say' && a.set === dailyId && a.outcome !== 'skip').map((a) => String(a.itemId)));
  const done = items.filter((i) => doneIds.has(String(i.id))).length;
  const weakSounds = [...new Set(items.flatMap((i) => itemClasses(i.he)).filter((c) => weak.has(c)))].sort((x, y) => weak.get(y) - weak.get(x)).map(soundLabel);
  return {
    kind: 'speak-daily', id: dailyId, date, title: "Say it: today's five", items, weakSounds,
    progress: { done, total: items.length }, complete: items.length > 0 && done >= items.length,
    href: '#/speak?daily=1', note: DAILY_NOTE,
  };
}

/** Load the pool for a day (a few sets, rotating) and build the card. `data` may carry {sets, setItems} for tests. Null on failure. */
export async function loadDailyCard({ date, state, data = null, n = DAILY_SIZE }) {
  try {
    const index = data?.sets || await loadSetsIndex();
    const pool = [];
    for (const i of setsForDay(date, index.length)) {
      const meta = index[i];
      const set = data?.setItems?.[meta.id] || await loadSet(meta.id);
      for (const it of set.items || []) pool.push({ ...it, set: meta.id });
    }
    return buildDailyCard({ date, pool, attempts: coerceState(state).attempts, n });
  } catch { return null; }
}

/** For the home screen: reads speak.v1 from ctx.store and returns the card for `now` (epoch ms), or null if the data cannot load. */
export async function loadDailyCardFromStore(ctx, now = Date.now(), data = null) {
  let raw = null;
  try { raw = ctx?.store?.get ? await ctx.store.get(STORE_KEY) : null; } catch { raw = null; }
  return loadDailyCard({ date: dayKeyLocal(now), state: raw, data });
}
