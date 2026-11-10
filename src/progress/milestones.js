// @ts-check
// Personal milestones (certificate-free): first 100 words, first prayer read, siddur coverage 25 / 50 / 75%.
// Definitions are data (data/progress/personal-milestones.json). Dates achieved are kept under 'progress.milestones.v1' as
// { v:1, achieved: { [id]: { at, day, basis } } }. Once achieved a milestone stays achieved (a later dip never removes it),
// and its first date is kept. basis 'dated' = a stored timestamp shows when (the earliest timed read); basis 'noticed' = the app
// only saw it on the Progress screen that day, so the date is the first day it was seen, not necessarily the day it happened.
// Nothing here says the learner is fluent: words are "started", reads are self-reported, coverage is "taught", not "read well".
import { dayKey, siddurCoverageAll } from './model.js';
import { cleanState as cleanTimedReads } from '../timedread/model.js';

export const MILESTONE_V = 1;

/** Read any stored value as a clean record. Never throws. @param {any} raw */
export function cleanMilestones(raw) {
  const a = raw && typeof raw === 'object' && raw.achieved && typeof raw.achieved === 'object' && !Array.isArray(raw.achieved) ? raw.achieved : {};
  /** @type {Record<string,{at:number,day:string,basis:'dated'|'noticed'}>} */ const achieved = {};
  for (const [id, e] of Object.entries(a)) {
    if (!e || typeof e !== 'object' || !Number.isFinite(e.at) || e.at <= 0 || typeof e.day !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(e.day)) continue;
    achieved[id] = { at: e.at, day: e.day, basis: e.basis === 'dated' ? 'dated' : 'noticed' };
  }
  return { v: MILESTONE_V, achieved };
}

/**
 * Where each milestone stands now. `datedAt` is a timestamp that proves when (or null).
 * @param {any} s Snapshot @param {{registry:any[], personal?:any}} d @param {{read:any}} c makeContext result
 * @returns {Array<{id:string, label:string, href:string, kind:string, done:boolean, have:number, need:number, datedAt:number|null}>}
 */
export function evaluateMilestones(s, d, c) {
  const defs = d.personal && Array.isArray(d.personal.milestones) ? d.personal.milestones : [];
  const started = [...Object.values(s.vocab), ...Object.entries(s.cards).filter(([id]) => /^word:/.test(id)).map(([, v]) => v)].filter((x) => x && x.reps > 0).length;
  const cat = new Map((d.registry || []).map((e) => [e.id, e.category]));
  const prayerReads = cleanTimedReads(s.timedRead).reads.filter((r) => cat.get(String(r.textId).split('#')[0]) === 'siddur');
  const firstPrayer = prayerReads.length ? Math.min(...prayerReads.map((r) => r.at)) : null;
  const bestCoverage = Math.max(0, ...siddurCoverageAll(s, d, c).map((x) => x.pct));
  return defs.map((m) => {
    const base = { id: m.id, label: m.label, href: m.href, kind: m.kind, datedAt: null };
    if (m.kind === 'words') return { ...base, done: started >= m.count, have: Math.min(started, m.count), need: m.count };
    if (m.kind === 'prayerRead') return { ...base, done: prayerReads.length > 0, have: Math.min(prayerReads.length, 1), need: 1, datedAt: firstPrayer };
    if (m.kind === 'coverage') return { ...base, done: bestCoverage >= m.pct, have: Math.min(bestCoverage, m.pct), need: m.pct };
    return { ...base, done: false, have: 0, need: 1 };
  });
}

/**
 * Fold the current evaluation into the stored record. Pure. Never removes or re-dates an achieved milestone.
 * @param {any} prev raw stored value @param {ReturnType<typeof evaluateMilestones>} evals @param {number} now
 * @returns {{state: ReturnType<typeof cleanMilestones>, newly: string[]}}
 */
export function updateMilestones(prev, evals, now) {
  const state = cleanMilestones(prev);
  const newly = [];
  for (const e of evals) {
    if (!e.done || state.achieved[e.id]) continue;
    const at = Number.isFinite(e.datedAt) && /** @type {number} */ (e.datedAt) > 0 && /** @type {number} */ (e.datedAt) <= now ? /** @type {number} */ (e.datedAt) : now;
    state.achieved[e.id] = { at, day: dayKey(at), basis: at === e.datedAt ? 'dated' : 'noticed' };
    newly.push(e.id);
  }
  return { state, newly };
}

/** Rows for the screen: every milestone with its date text. @param {ReturnType<typeof evaluateMilestones>} evals @param {any} stored */
export function milestoneRows(evals, stored) {
  const rec = cleanMilestones(stored).achieved;
  return evals.map((e) => {
    const a = rec[e.id];
    const achieved = !!a;
    return { ...e, achieved, day: a ? a.day : null, basis: a ? a.basis : null, dateText: a ? (a.basis === 'dated' ? a.day : `first noticed ${a.day}`) : null };
  });
}
