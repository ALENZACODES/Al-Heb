// @ts-check
// Weekly PRACTICE league: 10 tiers, 29 pretend players and the learner. ALEF has no accounts and no server, so there is
// nobody real to rank against; the pretend players are generated on this device from a seeded random number generator
// and paced to the learner's own past weeks. The screen says so every time. Pure functions.
import { clone, CAPS } from './state.js';
import { weekIdOf, leagueEnd, nextWeekStart, localAt, addDaysISO, inShabbatWindow, LEAGUE_END_MIN } from './clock.js';
import { earn, EARN } from './gems.js';
import { LEAGUE_NAMES } from './league.names.js';

/** Tier table. promote = top N move up; demote = bottom N move down. Hebrew names await native review. */
export const TIERS = Object.freeze([
  { n: 1, en: 'Seed', he: 'גַּרְעִין', promote: 10, demote: 0 },
  { n: 2, en: 'Sprout', he: 'נֶבֶט', promote: 7, demote: 5 },
  { n: 3, en: 'Root', he: 'שֹׁרֶשׁ', promote: 7, demote: 5 },
  { n: 4, en: 'Branch', he: 'עָנָף', promote: 7, demote: 5 },
  { n: 5, en: 'Leaf', he: 'עָלֶה', promote: 7, demote: 5 },
  { n: 6, en: 'Blossom', he: 'פֶּרַח', promote: 7, demote: 5 },
  { n: 7, en: 'Fruit', he: 'פְּרִי', promote: 7, demote: 5 },
  { n: 8, en: 'Orchard', he: 'פַּרְדֵּס', promote: 7, demote: 5 },
  { n: 9, en: 'Crown', he: 'כֶּתֶר', promote: 5, demote: 5 },
  { n: 10, en: 'Golden Pomegranate', he: 'רִמּוֹן זָהָב', promote: 0, demote: 5 },
]);
export const LEAGUE = Object.freeze({ players: 29, defaultBaseline: 120, unlockLessons: 5, dayStartMin: 8 * 60, dayEndMin: 21 * 60 });
export const HONESTY_LINE = "Practice league. The other players are pretend, paced to your own weeks so the race is fair. Real leagues need accounts, which ALEF doesn't have yet.";
export const tierOf = (n) => TIERS[Math.min(Math.max(n, 1), 10) - 1];

// ---- deterministic randomness ----
export function fnv1a(text) { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
export function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/**
 * Pace multiplier for pretend player i (0 slowest .. 28 fastest). The middle player matches the learner's usual week;
 * the top of the table needs about a quarter more than usual to pass. Higher tiers stretch the top end.
 */
export function paceOf(i, tier) {
  const x = i / (LEAGUE.players - 1);
  if (x <= 0.5) return 0.35 + 0.65 * (x / 0.5);
  return 1 + 0.9 * ((x - 0.5) / 0.5) ** 3 * (1 + 0.04 * (tier - 1));
}

/** Median weekly XP of the learner's last 4 joined weeks; 120 with fewer than 2 weeks of history. */
export function baselineOf(rec) {
  const xs = rec.league.history.slice(-4).map((h) => h.xp).filter((x) => x > 0).sort((a, b) => a - b);
  if (xs.length < 2) return LEAGUE.defaultBaseline;
  const m = xs.length >> 1; return Math.max(20, xs.length % 2 ? xs[m] : Math.round((xs[m - 1] + xs[m]) / 2));
}

/**
 * The week's 29 pretend players. Same installId + weekId + tier + baseline => the same cohort on every call.
 * @returns {Array<{name:string, target:number, steps:number[]}>} steps = share of the target earned on each day Sun..Fri (sums to 1)
 */
export function cohort(installId, weekId, tier, baseline = LEAGUE.defaultBaseline) {
  const rand = mulberry32(fnv1a(`${installId}|${weekId}|${tier}`));
  const pool = [...LEAGUE_NAMES], out = [];
  for (let i = 0; i < LEAGUE.players; i++) {
    const name = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    const target = Math.max(5, Math.round(baseline * paceOf(i, tier) * (0.9 + 0.2 * rand())));
    const raw = Array.from({ length: 6 }, () => 0.2 + rand()), sum = raw.reduce((a, b) => a + b, 0);
    out.push({ name, target, steps: raw.map((v) => v / sum) });
  }
  return out;
}

/** Share of the week a pretend player has finished at `now`: whole past days plus today's hours between 08:00 and 21:00 (Friday ends at 14:00). */
function shareDone(steps, weekId, now) {
  if (now >= leagueEnd(weekId)) return 1;
  let done = 0;
  for (let d = 0; d < 6; d++) {
    const iso = addDaysISO(weekId, d), a = localAt(iso, LEAGUE.dayStartMin), b = localAt(iso, d === 5 ? LEAGUE_END_MIN : LEAGUE.dayEndMin);
    done += steps[d] * Math.min(1, Math.max(0, (now - a) / (b - a)));
  }
  return Math.min(1, done);
}

/**
 * The table at `now`, best first. The learner wins ties.
 * @returns {Array<{name:string, xp:number, you:boolean, rank:number}>}
 */
export function standings(players, learnerXp, now, weekId) {
  const rows = players.map((p) => ({ name: p.name, xp: Math.round(p.target * shareDone(p.steps, weekId, now)), you: false }));
  rows.push({ name: 'You', xp: learnerXp, you: true });
  rows.sort((a, b) => b.xp - a.xp || (a.you ? -1 : b.you ? 1 : 0));
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}
/** 'up' | 'stay' | 'down' for a final rank in a tier. */
export function resultFor(tier, rank) {
  const t = tierOf(tier), total = LEAGUE.players + 1;
  if (t.promote && rank <= t.promote) return 'up';
  if (t.demote && rank > total - t.demote) return 'down';
  return 'stay';
}

/** Is the league in force? After 5 finished lessons, never in calm mode, and the learner can switch it off. */
export function leagueOn(rec, { calm = false } = {}) {
  if (calm || rec.league.enabled === false) return false;
  return rec.league.enabled === true || rec.lessonsFinished >= LEAGUE.unlockLessons;
}

/** Count XP toward the league: inside the week it adds to weekXp; from Friday 14:00 to Saturday night it is carried to next week. */
export function addLeagueXp(rec, amount, now = Date.now()) {
  if (!(amount > 0) || !leagueOn(rec)) return rec; // XP earned before the league opens (5 lessons) or while it is switched off is not ranked
  const r = clone(rec), wk = weekIdOf(now);
  if (!r.league.weekId) { r.league.weekId = wk; r.league.weekXp = 0; r.league.joined = false; }
  if (r.league.weekId === wk && now < leagueEnd(wk) && r.league.settled !== wk) { r.league.weekXp += amount; r.league.joined = true; }
  else r.league.carry += amount;
  return r;
}

/**
 * Close a finished week and open the next. Runs at app open; idempotent. Never settles or resets between Friday 18:00
 * and Saturday 21:00. A week with no XP has no result and leaves the tier alone.
 * @returns {{rec:object, result:null|{week:string, tier:number, rank:number, xp:number, result:'up'|'stay'|'down', gems:number}}}
 */
export function settle(rec, now = Date.now()) {
  if (inShabbatWindow(now)) return { rec, result: null };
  let r = clone(rec), result = null; const L = r.league, wk = weekIdOf(now);
  if (!L.weekId) { L.weekId = wk; return { rec: r, result }; }
  if (L.settled !== L.weekId && now >= leagueEnd(L.weekId)) {
    if (L.joined && L.weekXp > 0) {
      const table = standings(cohort(r.installId, L.weekId, L.tier, baselineOf(r)), L.weekXp, leagueEnd(L.weekId), L.weekId);
      const rank = table.find((x) => x.you).rank, res = resultFor(L.tier, rank), tier = L.tier;
      const gems = rank === 1 ? EARN.rank1 : res === 'up' ? EARN.promote : tier === 10 && rank <= 3 ? EARN.top3 : 0;
      L.history = [...L.history, { week: L.weekId, tier, rank, xp: L.weekXp, result: res }].slice(-CAPS.history);
      L.tier = Math.min(10, Math.max(1, tier + (res === 'up' ? 1 : res === 'down' ? -1 : 0)));
      L.resultUnseen = L.weekId;
      if (gems) r = earn(r, gems, rank === 1 ? 'rank1' : res === 'up' ? 'promote' : 'top3', now);
      result = { week: L.weekId, tier, rank, xp: L.weekXp, result: res, gems };
    }
    r.league.settled = r.league.weekId;
  }
  if (r.league.weekId !== wk && now >= nextWeekStart(r.league.weekId)) {
    r.league.weekId = wk; r.league.weekXp = r.league.carry; r.league.carry = 0; r.league.joined = r.league.weekXp > 0; r.league.settled = null;
  }
  return { rec: r, result };
}

/** Everything the league screen draws. */
export function leagueView(rec, now = Date.now()) {
  const L = rec.league, weekId = L.weekId || weekIdOf(now), tier = tierOf(L.tier), end = leagueEnd(weekId);
  const closed = now >= end || L.settled === weekId;
  const table = standings(cohort(rec.installId, weekId, L.tier, baselineOf(rec)), L.weekXp, Math.min(now, end), weekId);
  const you = table.find((x) => x.you), total = table.length;
  const promoteXp = tier.promote ? table[tier.promote - 1].xp : null;
  return { weekId, tier, table, you, closed, endsAt: end, msLeft: Math.max(0, end - now), promoteLine: tier.promote, demoteLine: tier.demote ? total - tier.demote : null,
    toPromote: tier.promote && you.rank > tier.promote ? Math.max(1, promoteXp - you.xp + 1) : 0, last: L.history[L.history.length - 1] || null, resultUnseen: L.resultUnseen };
}
/** "2 days 5 hours left" (no ticking seconds). */
export function timeLeftText(ms) {
  if (ms <= 0) return 'This week is finished';
  const h = Math.floor(ms / 3600000), d = Math.floor(h / 24), hh = h % 24;
  if (d) return `${d} day${d === 1 ? '' : 's'}${hh ? ` ${hh} hour${hh === 1 ? '' : 's'}` : ''} left`;
  if (h) return `${h} hour${h === 1 ? '' : 's'} left`;
  return `${Math.max(1, Math.floor(ms / 60000))} minutes left`;
}
