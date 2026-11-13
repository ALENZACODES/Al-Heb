// @ts-check
// Household profiles (R2), guest mode (R3) and what each learner on this device has done (for the family board, R5, and
// the Study Hall, R9). No DOM. Slots are moved by src/shell/profile-slots.js; this file is the rules around them.
import { readReg, writeReg, switchTo, endGuest, dropSlot, parked, LIVE, GUEST, REG_KEY } from '../shell/profile-slots.js';
import { read, lessonsFinished, streakNow } from '../lib/counts.js';
import { cleanText, weekStart, toMs, nat, NAME_MAX } from './share.js';

export { GUEST, REG_KEY, NAME_MAX };
export const MAX_PROFILES = 6;
const ls = () => { try { return globalThis.localStorage || null; } catch { return null; } };
const newId = (reg) => { let n = reg.list.length + 1; while (reg.list.some((p) => p.id === `p${n}`)) n++; return `p${n}`; };
const taken = (reg, name, except) => reg.list.some((p) => p.id !== except && p.name.toLowerCase() === name.toLowerCase());

/** Why a name cannot be used, or ''. */
export function nameProblem(reg, raw, except = '') {
  const name = cleanText(raw);
  if (!name) return 'Type a name.';
  if (taken(reg, name, except)) return 'Someone on this device already has that name.';
  return '';
}

/** The household as the page shows it. */
export function household(s = ls()) {
  const reg = readReg(s);
  return { reg, guest: reg.active === GUEST, active: reg.active, list: reg.list.map((p) => ({ ...p, active: p.id === reg.active })), full: reg.list.length >= MAX_PROFILES };
}

/** Adds an empty profile. It is not switched to. */
export function addProfile(raw, s = ls(), now = Date.now()) {
  const reg = readReg(s);
  if (reg.list.length >= MAX_PROFILES) return { ok: false, error: `This device holds up to ${MAX_PROFILES} profiles.` };
  const error = nameProblem(reg, raw);
  if (error) return { ok: false, error };
  const id = newId(reg);
  reg.list.push({ id, name: cleanText(raw), at: now });
  writeReg(reg, s);
  return { ok: true, id, reg };
}
export function renameProfile(id, raw, s = ls()) {
  const reg = readReg(s);
  const p = reg.list.find((x) => x.id === id);
  if (!p) return { ok: false, error: 'That profile is not on this device.' };
  const error = nameProblem(reg, raw, id);
  if (error) return { ok: false, error };
  p.name = cleanText(raw); writeReg(reg, s);
  return { ok: true, reg };
}
/** Deletes a profile that is not in use, with everything it saved. */
export function removeProfile(id, s = ls()) {
  const reg = readReg(s);
  if (id === reg.active) return { ok: false, error: 'Switch to another profile first. The profile in use cannot be deleted here.' };
  if (!reg.list.some((p) => p.id === id)) return { ok: false, error: 'That profile is not on this device.' };
  if (reg.guest?.prev === id) return { ok: false, error: 'End the guest session first.' };
  dropSlot(s, id);
  reg.list = reg.list.filter((p) => p.id !== id); writeReg(reg, s);
  return { ok: true, reg };
}
/** Makes a profile the one in use. The page reloads afterwards. */
export function useProfile(id, s = ls()) {
  const reg = readReg(s);
  if (reg.active === GUEST) return { ok: false, error: 'End the guest session first.' };
  if (!reg.list.some((p) => p.id === id)) return { ok: false, error: 'That profile is not on this device.' };
  return { ok: true, reg: switchTo(id, s) };
}
/** Starts a guest session: an empty learner. The profile in use is set aside untouched. */
export function startGuest(s = ls(), now = Date.now()) {
  const reg = readReg(s);
  if (reg.active === GUEST) return { ok: false, error: 'A guest session is already open.' };
  reg.guest = { prev: reg.active, at: now }; writeReg(reg, s);
  return { ok: true, reg: switchTo(GUEST, s) };
}
/** Ends the guest session. With `keepAs`, what the guest did becomes a new profile; without it, nothing is kept. */
export function finishGuest(s = ls(), { keepAs = '' } = {}, now = Date.now()) {
  const reg = readReg(s);
  if (reg.active !== GUEST) return { ok: false, error: 'No guest session is open.' };
  if (!keepAs) return { ok: true, kept: false, reg: endGuest(s) };
  if (reg.list.length >= MAX_PROFILES) return { ok: false, error: `This device holds up to ${MAX_PROFILES} profiles. Delete one first, or end the session without keeping it.` };
  const error = nameProblem(reg, keepAs);
  if (error) return { ok: false, error };
  const id = newId(reg);
  reg.list.push({ id, name: cleanText(keepAs), at: now });
  reg.active = id; delete reg.guest; writeReg(reg, s);
  return { ok: true, kept: true, id, reg };
}

/** Read-only view of one learner's saved data: the live keys for the learner in use, the slot for anyone else. */
export function slotStore(id, s = ls()) {
  const prefix = id === readReg(s).active ? LIVE : parked(id);
  return { get: (key, fallback) => { try { const raw = s.getItem(prefix + key); return raw == null ? fallback : JSON.parse(raw); } catch { return fallback; } } };
}

/** The name to show friends: the profile in use. '' for a guest or a household that never named anyone. */
export function myName(s = ls()) {
  try { if (!s?.getItem(REG_KEY)) return ''; const reg = readReg(s); return reg.list.find((p) => p.id === reg.active)?.name || ''; } catch { return ''; }
}

/**
 * What one learner has done, from their own saved data. Nothing is estimated: a learner with no data shows zeros.
 * @returns {{lessons:number, lessonsWeek:number, xpWeek:number, streak:number, awards:number, lastLesson:{id:string, at:number}|null, recent:{id:string, at:number}[]}}
 */
export function summaryOf(storeLike, now = Date.now()) {
  const c = read(storeLike);
  const from = weekStart(now);
  const done = Object.entries(c.completed).map(([id, v]) => ({ id, at: toMs(v && typeof v === 'object' ? v.at ?? v.completedAt : v) })).filter((x) => Number.isFinite(x.at)).sort((a, b) => b.at - a.at);
  const days = (c.retention && typeof c.retention === 'object' && c.retention.xp && c.retention.xp.days) || {};
  let xpWeek = 0;
  for (const [day, xp] of Object.entries(days)) { const t = new Date(`${day}T12:00:00`).getTime(); if (t >= from && t < from + 7 * 86400000) xpWeek += nat(xp); }
  const streak = nat(streakNow(c.streak, now, c.rest).count);
  let awards = 0; try { awards = Object.keys(storeLike.get('awards.v1', {})?.awards || {}).length; } catch { awards = 0; }
  return { lessons: lessonsFinished(c.completed), lessonsWeek: done.filter((x) => x.at >= from).length, xpWeek, streak, awards, lastLesson: done[0] || null, recent: done.slice(0, 3) };
}

/** Every profile on this device with its summary. A guest is never listed. */
export function summaries(s = ls(), now = Date.now()) {
  const h = household(s);
  return h.list.map((p) => ({ id: p.id, name: p.name, active: p.active, ...summaryOf(slotStore(p.id, s), now) }));
}
