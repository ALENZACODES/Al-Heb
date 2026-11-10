// Loops record: the one small local record behind the daily goal, rhythm and stats (store key "loops.v1").
// Pure functions over a plain object plus two thin store helpers. No DOM, no clock (callers pass day keys), no network.
// Everything here is kept on the device only; it is in the whole-app backup and in the progress-only backup file.
//
// Shape: { v:1, goal:20, quests:true, days:{ "YYYY-MM-DD": { lessons:[ids], r, t, s, m } }, repairs:["YYYY-MM-DD"] }
//   Badges (see badges.js) live under "badges": { earned:{id:{1:"YYYY-MM-DD",2:..,3:..}}, announced:["id:1"], base:{through,total}, offlineDays:[..], tier:0 }.
//   A record written before badges existed simply has no "badges" and reads as empty. Earned entries are never removed.
//   lessons = ids of lessons finished that day, r = review cards rated, t = timed reads, s = speaking tries, m = minutes engaged.
// Counts only ever go up inside one day (a merge keeps the larger value), so syncing twice never double counts.
export const LOOPS_KEY = 'loops.v1';
export const GOALS = Object.freeze([10, 20, 30, 50]);
export const DEFAULT_GOAL = 20;
export const KEEP_DAYS = 400;
const ISO = /^\d{4}-\d\d-\d\d$/;
export const isISO = (s) => typeof s === 'string' && ISO.test(s);
const nat = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.min(Math.floor(Number(v)), 100000) : 0);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

/** One day's counts from any stored value. Never throws. */
export function cleanDay(raw) {
  const d = obj(raw);
  const lessons = Array.isArray(d.lessons) ? [...new Set(d.lessons.filter((x) => typeof x === 'string' && x.length <= 40))].slice(0, 50) : [];
  return { lessons, r: nat(d.r), t: nat(d.t), s: nat(d.s), m: Math.min(nat(d.m), 1440) };
}

const BID = /^[a-z0-9-]{1,40}$/;
/** Badge state from any stored value. Earned dates are only ever kept, never dropped, even for ids a newer catalogue no longer lists. */
export function cleanBadges(raw) {
  const b = obj(raw), earned = {};
  for (const [id, lv] of Object.entries(obj(b.earned)).slice(0, 200)) {
    if (!BID.test(id)) continue;
    const e = {}; for (const n of [1, 2, 3]) if (isISO(obj(lv)[n])) e[n] = obj(lv)[n];
    if (Object.keys(e).length) earned[id] = e;
  }
  const base = obj(b.base);
  return {
    earned,
    announced: Array.isArray(b.announced) ? [...new Set(b.announced.filter((x) => typeof x === 'string' && /^[a-z0-9-]{1,40}:[123]$/.test(x)))].slice(-600) : [],
    base: { through: isISO(base.through) ? base.through : '', total: Math.min(nat(base.total), 100000000) },
    offlineDays: Array.isArray(b.offlineDays) ? [...new Set(b.offlineDays.filter(isISO))].sort().slice(-400) : [],
    tier: Math.min(nat(b.tier), 9),
  };
}

/** Any stored value (missing, old, corrupt) as a well-formed record. Never throws. */
export function clean(raw) {
  const r = obj(raw), days = {};
  const keys = Object.keys(obj(r.days)).filter(isISO).sort().slice(-KEEP_DAYS);
  for (const k of keys) days[k] = cleanDay(r.days[k]);
  return {
    v: 1,
    goal: GOALS.includes(r.goal) ? r.goal : DEFAULT_GOAL,
    quests: r.quests !== false,
    days,
    repairs: Array.isArray(r.repairs) ? [...new Set(r.repairs.filter(isISO))].sort().slice(-KEEP_DAYS) : [],
    badges: cleanBadges(r.badges),
  };
}

/** Merge counts for one day: the larger value wins, lesson ids are unioned. Returns a new record. */
export function mergeDay(rec, iso, counts) {
  if (!isISO(iso)) return rec;
  const base = clean(rec), have = base.days[iso] || cleanDay({}), add = cleanDay(counts);
  const day = { lessons: [...new Set([...have.lessons, ...add.lessons])], r: Math.max(have.r, add.r), t: Math.max(have.t, add.t), s: Math.max(have.s, add.s), m: Math.max(have.m, add.m) };
  return clean({ ...base, days: { ...base.days, [iso]: day } });
}
/** True when merging `counts` would change the day (so callers can skip a write). */
export const wouldChange = (rec, iso, counts) => JSON.stringify(mergeDay(rec, iso, counts).days[iso]) !== JSON.stringify(clean(rec).days[iso] || null);

export const withGoal = (rec, goal) => clean({ ...clean(rec), goal: GOALS.includes(goal) ? goal : DEFAULT_GOAL });
export const withQuests = (rec, on) => clean({ ...clean(rec), quests: on !== false });
export const withBadges = (rec, badges) => clean({ ...clean(rec), badges });
export const withRepairs = (rec, isos) => { const b = clean(rec); return clean({ ...b, repairs: [...b.repairs, ...isos] }); };

/** Thin store helpers: the store may be missing, throwing or full; the loops then simply do nothing. */
export function load(store) { try { return clean(store && store.get(LOOPS_KEY, null)); } catch { return clean(null); } }
export function save(store, rec) { try { store.set(LOOPS_KEY, clean(rec)); return true; } catch { return false; } }
