// Badges: earned recognition you can look at. Not currency: nothing is spent, bought, lost or ranked.
// Pure: no DOM, no clock (callers pass `today`), no storage, no network. The catalogue is data (badges.catalog.json), passed in.
//
// A badge has three levels (First, Steady, Deep). A level is earned when a counted fact reaches its threshold, and once earned
// it stays earned: evaluate() only ever adds, a lower count later changes nothing, and running it twice gives the same record.
// The overall tier is chosen from lifetime points (the same points as points.js) and also only goes up.
import { addDaysISO } from '../../src/curriculum/streak.js';
import { BASE_LETTER_IDS, FINAL_LETTER_IDS } from '../../src/corpus/normalize.js';
import { coerceState } from '../../src/speak/model.js';
import { cleanState as cleanTimedReads } from '../../src/timedread/model.js';
import { cleanDay, cleanBadges } from './store.js';
import { dayPoints, PRACTICE_POINTS } from './points.js';

export const LEVELS = Object.freeze([1, 2, 3]);
export const SHEMA_TEXT_ID = 'shema-vahavta';
export const LONG_DAY_MINUTES = 15;
export const COMEBACK_GAP_DAYS = 7;
export const TRADITION_IDS = Object.freeze(['israeli', 'sephardi', 'ashkenazi']);
/** Days older than this are folded into one running total so lifetime points survive the record's day limit. */
export const FOLD_AFTER_DAYS = 30;

const known = (c) => !!c && c.state === 'review' && (c.reps || 0) >= 2;
const num = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };

/** Lifetime points: the folded base plus every day after it. Never lower than the folded base. */
export function lifetimePoints(days, base) {
  const b = (base && base.total) || 0, through = (base && base.through) || '';
  return b + Object.keys(days || {}).filter((k) => k > through).reduce((a, k) => a + dayPoints(days[k]), 0);
}
/** Fold days older than FOLD_AFTER_DAYS into the base. Idempotent. Returns a new base. */
export function foldBase(days, base, today) {
  const cut = addDaysISO(today, -FOLD_AFTER_DAYS);
  let total = (base && base.total) || 0, through = (base && base.through) || '';
  for (const k of Object.keys(days || {}).sort()) if (k > through && k <= cut) { total += dayPoints(days[k]); through = k; }
  return { through, total };
}

/**
 * Counted facts, all derived from records other screens already write. Reviews and minutes are lower bounds, as on the page.
 * @param {{snap:any, rec:any, rhythm?:{best:number,count:number}, practice?:Iterable<string>}} o
 */
export function factsFrom({ snap, rec, rhythm, practice }) {
  const s = snap || {}, days = (rec && rec.days) || {}, b = cleanBadges(rec && rec.badges);
  const cards = [...Object.entries(s.cards || {}), ...Object.entries(s.vocab || {})].filter(([, c]) => c && typeof c === 'object');
  const letterId = (id) => { const m = /^letter:([a-z-]+)$/.exec(id); return m ? m[1] : null; };
  const lettersBase = cards.filter(([id, c]) => BASE_LETTER_IDS.includes(letterId(id)) && known(c)).length;
  const lettersFinal = cards.filter(([id, c]) => FINAL_LETTER_IDS.includes(letterId(id)) && known(c)).length;
  const words = cards.filter(([id, c]) => (/^(word:|vocab:)/.test(id) || c.kind === 'word') && known(c)).length;
  const reps = cards.reduce((a, [, c]) => a + (c.reps || 0), 0);
  const reads = (() => { try { return cleanTimedReads(s.timedRead).reads; } catch { return []; } })();
  const attempts = (() => { try { return coerceState(s.speak).attempts; } catch { return []; } })();
  const dayList = Object.keys(days).sort().map((k) => [k, cleanDay(days[k])]);
  const sumKey = (k) => dayList.reduce((a, [, d]) => a + d[k], 0);
  const trads = new Set(attempts.map((a) => a.tradition).filter((t) => TRADITION_IDS.includes(t)));
  const P = [...(practice || dayList.filter(([k]) => dayPoints(days[k]) >= PRACTICE_POINTS).map(([k]) => k))].sort();
  let comebacks = 0;
  for (let i = 1; i < P.length; i++) if (num(P[i]) - num(P[i - 1]) - 1 >= COMEBACK_GAP_DAYS) comebacks++;
  return {
    rhythmBest: Math.max(0, (rhythm && rhythm.best) || 0, (rhythm && rhythm.count) || 0),
    lettersBase, lettersFinal, words,
    timedReads: reads.length,
    readTexts: new Set(reads.map((r) => String(r.textId))).size,
    shemaReads: reads.filter((r) => String(r.textId) === SHEMA_TEXT_ID).length,
    listenTries: Math.max(attempts.filter((a) => a.kind === 'pair').length, 0),
    speakTries: Math.max(attempts.filter((a) => a.kind !== 'pair').length, 0),
    traditions: trads.size,
    reviews: Math.max(reps, sumKey('r')),
    minutes: sumKey('m'),
    offlineDays: b.offlineDays.length,
    comebacks,
    goalDays: dayList.filter(([k]) => dayPoints(days[k]) >= 20).length,
    longDays: dayList.filter(([, d]) => d.m >= LONG_DAY_MINUTES).length,
  };
}

/** Highest level whose threshold the value reaches (0 if none). */
export const levelFor = (levels, value) => levels.reduce((n, t, i) => (value >= t ? i + 1 : n), 0);

/**
 * Add whatever is newly earned. Pure and idempotent; nothing is ever removed or re-dated.
 * @returns {{badges:object, newly:Array<{id:string,level:number}>, tierUp:object|null}} `badges` is the new badge state
 */
export function evaluate({ catalog, facts, rec, today }) {
  const cur = cleanBadges(rec && rec.badges), earned = {};
  for (const [id, lv] of Object.entries(cur.earned)) earned[id] = { ...lv };
  const newly = [];
  for (const bd of (catalog && catalog.badges) || []) {
    const have = levelFor(bd.levels, Number(facts[bd.signal]) || 0);
    for (let n = 1; n <= have; n++) {
      earned[bd.id] ||= {};
      if (!earned[bd.id][n]) { earned[bd.id][n] = today; newly.push({ id: bd.id, level: n }); }
    }
  }
  const base = foldBase((rec && rec.days) || {}, cur.base, today);
  const life = lifetimePoints((rec && rec.days) || {}, base);
  const t = tierFor(catalog, life), tier = Math.max(cur.tier, t.index);
  return { badges: { ...cur, earned, base, tier }, newly, tierUp: tier > cur.tier ? tierAt(catalog, tier) : null };
}

export const tierAt = (catalog, i) => { const t = ((catalog && catalog.tiers) || [])[i]; return t ? { ...t, index: i } : null; };
/** The tier for a points total, and how far to the next one. */
export function tierFor(catalog, points) {
  const ts = (catalog && catalog.tiers) || [];
  let index = 0; ts.forEach((t, i) => { if (points >= t.min) index = i; });
  const next = ts[index + 1] || null;
  return { index, tier: ts[index] || null, next, points, toNext: next ? next.min - points : 0 };
}
/** Tier shown to the learner: never lower than the best one reached, even if the points were trimmed. */
export function shownTier(catalog, points, bestIndex) {
  const t = tierFor(catalog, points);
  return t.index >= bestIndex ? t : { ...tierFor(catalog, (((catalog && catalog.tiers) || [])[bestIndex] || { min: 0 }).min), points };
}

/** Rows for the shelf: per badge, the levels earned, and the next level described gently. */
export function shelf(catalog, badges, facts) {
  const b = cleanBadges(badges), names = (catalog && catalog.levelNames) || ['First', 'Steady', 'Deep'];
  return ((catalog && catalog.badges) || []).map((bd) => {
    const lv = b.earned[bd.id] || {}, level = LEVELS.filter((n) => lv[n]).length ? Math.max(...LEVELS.filter((n) => lv[n])) : 0;
    const have = Number(facts && facts[bd.signal]) || 0, nextN = level < 3 ? bd.levels[level] : null;
    return { id: bd.id, family: bd.family, name: bd.name, glyph: bd.glyph, hidden: !!bd.hidden, level, levelName: level ? names[level - 1] : null, threshold: level ? bd.levels[level - 1] : null,
      since: level ? lv[level] : null, earnText: level ? bd.earn[level - 1] : null, earnedLevels: LEVELS.filter((n) => lv[n]),
      next: nextN == null ? null : { level: level + 1, levelName: names[level], threshold: nextN, have: Math.min(have, nextN),
        text: `Next: ${names[level]} at ${nextN} ${bd.unit}. You are at ${Math.min(have, nextN)}.` } };
  });
}

/** Plain-text summary the learner can copy. Local only: nothing is uploaded. Hidden badges appear only once earned. */
export function shelfText(catalog, badges, points) {
  const b = cleanBadges(badges), rows = shelf(catalog, b, {}).filter((r) => r.level > 0);
  const shown = shownTier(catalog, points || 0, b.tier);
  const lines = [`My Hebrew course badges`, `Tier: ${shown.tier ? shown.tier.name : 'Newcomer'}`];
  for (const r of rows) lines.push(`- ${r.name}: ${r.levelName} (${r.threshold})`);
  if (!rows.length) lines.push('No badges yet. They are earned by practising, at any pace.');
  return lines.join('\n');
}

/** What the new-badge card says and does. quiet = calm mode or reduced motion. No sound unless the sound setting is on. */
export function badgePlan({ newly, catalog, quiet, soundOn = false, tierUp = null }) {
  const names = (catalog && catalog.levelNames) || ['First', 'Steady', 'Deep'];
  const byId = new Map(((catalog && catalog.badges) || []).map((x) => [x.id, x]));
  const items = newly.map((n) => ({ ...n, bd: byId.get(n.id) })).filter((n) => n.bd).map((n) => ({ id: n.id, level: n.level, glyph: n.bd.glyph, name: n.bd.name, levelName: names[n.level - 1], threshold: n.bd.levels[n.level - 1], text: n.bd.earn[n.level - 1] }));
  const tierLine = tierUp ? `Your tier is now ${tierUp.name}. ${tierUp.line}` : null;
  return {
    items, tierLine, motion: quiet ? 'none' : 'fade', sound: !quiet && soundOn === true && (items.length || tierUp) ? 'done' : null,
    announce: [...items.map((i) => `New badge: ${i.name}, ${i.levelName}. ${i.text}`), tierLine].filter(Boolean).join(' '),
  };
}
