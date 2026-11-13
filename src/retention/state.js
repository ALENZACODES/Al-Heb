// @ts-check
// Retention state: ONE versioned record under the store key "retention.v1" (localStorage "alef:retention.v1", the app's
// store prefix). Streak days themselves stay in the existing "streak" record (src/curriculum/streak.js); nothing here
// duplicates them. Reads never throw; unknown fields are kept; a record written by a newer app is read but never written.
import { dayKey } from './clock.js';

export const RETENTION_KEY = 'retention.v1';
export const RETENTION_V = 1;
export const CAPS = Object.freeze({ xpDays: 120, recentIds: 300, ledger: 100, used: 60, travel: 30, history: 26, sessions: 60, sent: 30, lost: 40 });
export const GOAL_CHOICES = Object.freeze([10, 20, 30, 50]);

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const nat = (v, d = 0) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.floor(Number(v)) : d);
const ISO = /^\d{4}-\d\d-\d\d$/;
const iso = (v) => (typeof v === 'string' && ISO.test(v) ? v : null);
const arr = (v, cap, ok = () => true) => (Array.isArray(v) ? v.filter(ok).slice(-cap) : []);
const tri = (v) => (v === true || v === false ? v : null);
const SHOP_THEME_IDS = new Set(['sepia', 'dusk']);
const SHOP_OUTFIT_IDS = new Set(['scarf', 'ribbon', 'glasses']);
const SHOP_AUDIO_IDS = new Set(['blessings']);
const shopIds = (v, allow) => arr(v, 12, (s) => typeof s === 'string' && allow.has(s));
const pickShop = (v, allow, owned) => (typeof v === 'string' && allow.has(v) && owned.includes(v) ? v : null);


export function newInstallId(g = globalThis) {
  try { if (g.crypto?.randomUUID) return g.crypto.randomUUID(); } catch { /* fall through */ }
  try { const b = new Uint8Array(8); g.crypto.getRandomValues(b); return [...b].map((x) => x.toString(16).padStart(2, '0')).join(''); } catch { /* fall through */ }
  return 'i' + Math.floor(Math.random() * 1e15).toString(16);
}

/** A fresh record. */
export function defaults(now = Date.now(), installId = newInstallId()) {
  return {
    v: RETENTION_V, installId, createdAt: dayKey(now), lessonsFinished: 0, perfectLessons: 0, goal: 20,
    xp: { total: 0, days: {}, recentIds: [], capDay: null, capReview: 0, capGame: 0 },
    gems: { balance: 0, ledger: [], paidMilestones: [], goalPaidDay: null },
    freezes: { held: 0, used: [], evaluatedThrough: null, unseen: false },
    repair: null, travelCovered: [],
    hearts: { enabled: null, n: 5, lastRefillAt: 0, lost: [], refillProgress: 0, refillRight: 0 },
    league: { enabled: null, tier: 1, weekId: null, weekXp: 0, carry: 0, joined: false, settled: null, history: [], resultUnseen: null },
    sessions: [], lastTz: null, lastBootDay: null,
    notify: { optedIn: false, tone: 'kind', asks: 0, lastAskAtLesson: 0, denied: false, sent: [], stopped: false, periodicSync: false },
    shop: { themes: [], themeActive: null, outfits: [], outfitActive: null, audio: [], gameLevels: 0, shields: { held: 0, used: [] } },
    mysteries: { opened: [] },
  };
}

/** Upgrade an older record shape to the current one. v1 has no predecessors; later versions add cases here. */
export function migrate(raw) {
  const r = { ...raw };
  switch (r.v) {
    case undefined: case null: case 0: r.v = 1; // a record saved without a version: treat as v1 and let normalize repair it
    // falls through
    default: return r;
  }
}

/** Read anything (missing, old, corrupt) as a well-formed record. Never throws. Unknown fields survive. */
export function normalize(raw, now = Date.now()) {
  const d = defaults(now, isObj(raw) && typeof raw.installId === 'string' && raw.installId ? raw.installId : undefined);
  if (!isObj(raw)) return d;
  const r = migrate(raw);
  const x = isObj(r.xp) ? r.xp : {}, g = isObj(r.gems) ? r.gems : {}, f = isObj(r.freezes) ? r.freezes : {}, h = isObj(r.hearts) ? r.hearts : {}, l = isObj(r.league) ? r.league : {}, n = isObj(r.notify) ? r.notify : {};
  const days = {}; if (isObj(x.days)) for (const k of Object.keys(x.days).filter((k) => ISO.test(k)).sort().slice(-CAPS.xpDays)) days[k] = nat(x.days[k]);
  const rep = isObj(r.repair) && Array.isArray(r.repair.days) && r.repair.days.every(iso) && r.repair.days.length ? { days: r.repair.days.slice(0, 7), prev: nat(r.repair.prev), last: iso(r.repair.last), until: nat(r.repair.until) } : null;
  return {
    ...r, v: typeof r.v === 'number' && r.v > RETENTION_V ? r.v : RETENTION_V, installId: d.installId, createdAt: iso(r.createdAt) || d.createdAt,
    lessonsFinished: nat(r.lessonsFinished), perfectLessons: nat(r.perfectLessons), goal: GOAL_CHOICES.includes(r.goal) ? r.goal : 20,
    xp: { ...x, total: nat(x.total), days, recentIds: arr(x.recentIds, CAPS.recentIds, (s) => typeof s === 'string'), capDay: iso(x.capDay), capReview: nat(x.capReview), capGame: nat(x.capGame) },
    gems: { ...g, balance: nat(g.balance), ledger: arr(g.ledger, CAPS.ledger, (e) => isObj(e) && Number.isFinite(e.d)), paidMilestones: arr(g.paidMilestones, 20, Number.isInteger), goalPaidDay: iso(g.goalPaidDay) },
    freezes: { ...f, held: Math.min(nat(f.held), 2), used: arr(f.used, CAPS.used, iso), evaluatedThrough: iso(f.evaluatedThrough), unseen: f.unseen === true },
    repair: rep, travelCovered: arr(r.travelCovered, CAPS.travel, iso),
    hearts: { ...h, enabled: tri(h.enabled), n: Math.min(h.n === undefined ? 5 : nat(h.n, 5), 5), lastRefillAt: nat(h.lastRefillAt), lost: arr(h.lost, CAPS.lost, (s) => typeof s === 'string'), refillProgress: nat(h.refillProgress), refillRight: nat(h.refillRight) },
    league: { ...l, enabled: tri(l.enabled), tier: Math.min(Math.max(nat(l.tier, 1), 1), 10), weekId: iso(l.weekId), weekXp: nat(l.weekXp), carry: nat(l.carry), joined: l.joined === true, settled: iso(l.settled),
      history: arr(l.history, CAPS.history, (e) => isObj(e) && iso(e.week)), resultUnseen: iso(l.resultUnseen) },
    sessions: arr(r.sessions, CAPS.sessions, (s) => isObj(s) && Number.isFinite(s.s) && Number.isFinite(s.e)),
    lastTz: typeof r.lastTz === 'string' ? r.lastTz : null, lastBootDay: iso(r.lastBootDay),
    notify: { ...n, optedIn: n.optedIn === true, tone: n.tone === 'playful' ? 'playful' : 'kind', asks: nat(n.asks), lastAskAtLesson: nat(n.lastAskAtLesson), denied: n.denied === true,
      sent: arr(n.sent, CAPS.sent, (e) => isObj(e) && typeof e.id === 'string'), stopped: n.stopped === true, periodicSync: n.periodicSync === true },
    shop: normalizeShop(r.shop),
    mysteries: { opened: arr((isObj(r.mysteries) ? r.mysteries.opened : r.mysteries), 12, (s) => s === 'meltdown' || s === 'songs') },
  };
}

function normalizeShop(raw) {
  const s = isObj(raw) ? raw : {};
  const sh = isObj(s.shields) ? s.shields : {};
  const themes = shopIds(s.themes, SHOP_THEME_IDS);
  const outfits = shopIds(s.outfits, SHOP_OUTFIT_IDS);
  const audio = shopIds(s.audio, SHOP_AUDIO_IDS);
  return {
    themes, themeActive: pickShop(s.themeActive, SHOP_THEME_IDS, themes),
    outfits, outfitActive: pickShop(s.outfitActive, SHOP_OUTFIT_IDS, outfits),
    audio,
    gameLevels: Math.min(nat(s.gameLevels), 2),
    shields: { held: Math.min(nat(sh.held), 2), used: arr(sh.used, CAPS.used, iso) },
  };
}

/** Deep copy for the pure modules (each returns a new record and leaves its input alone). */
export const clone = (rec) => JSON.parse(JSON.stringify(rec));

let warnedNewer = false;
/** Load the record from the app store. A corrupt value is copied once to "<key>.corrupt" before defaults replace it. */
export function load(store, now = Date.now()) {
  let raw; try { raw = store.get(RETENTION_KEY); } catch { raw = undefined; }
  if (raw != null && !isObj(raw)) { try { if (store.get(RETENTION_KEY + '.corrupt') == null) store.set(RETENTION_KEY + '.corrupt', raw); } catch { /* keep going */ } }
  return normalize(raw, now);
}
/** Read-modify-write. `fn(rec)` returns the new record (or undefined to leave it). Never writes over a newer app's record. */
export function save(store, fn, now = Date.now()) {
  const cur = load(store, now);
  if (cur.v > RETENTION_V) { if (!warnedNewer) { warnedNewer = true; try { console.info('retention: record written by a newer app; left untouched'); } catch { /* ignore */ } } return cur; }
  const next = fn(cur);
  if (!next) return cur;
  const out = normalize(next, now);
  try { if (typeof store.update === 'function') store.update(RETENTION_KEY, () => out); else store.set(RETENTION_KEY, out); } catch { /* storage full or blocked: state stays in memory for this call */ }
  return out;
}
