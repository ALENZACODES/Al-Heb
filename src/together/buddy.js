// @ts-check
// Buddy pairing (R4): two learners on two devices keep each other going. Each sends a short progress summary by link,
// QR code or file whenever they like; the other device keeps the latest one. It carries a name, a streak, lesson counts and
// milestones, nothing else: no lesson answers, no settings, no recordings. No server and no accounts. No DOM.
import { cleanText, nat, packObject, unpackObject, appBase } from './share.js';
import { LESSON_MILESTONES, STREAK_MILESTONES } from './hall.js';

export const BUDDIES_KEY = 'buddies.v1';
export const BUDDY_KIND = 'alef-buddy';
const MAX_BUDDIES = 12, KEEP = 8;
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
export const emptyBuddies = () => ({ v: 1, me: '', list: {} });
const norm = (state) => { const s = { ...emptyBuddies(), ...obj(state) }; s.list = { ...obj(s.list) }; return s; };

/** This learner's own id for pairing: random, made once, means nothing outside these summaries. */
export function withMyId(state, rnd = Math.random) {
  const s = norm(state);
  if (!/^[a-z0-9]{10}$/.test(s.me)) s.me = Array.from({ length: 10 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(rnd() * 36)]).join('');
  return s;
}
/** The summary to send. @param {{lessons:number, lessonsWeek:number, xpWeek:number, streak:number}} sum */
export function mySummary(state, name, sum, now = Date.now()) {
  return { k: BUDDY_KIND, v: 1, id: norm(state).me, n: cleanText(name) || 'Your buddy', t: now, s: nat(sum.streak, 9999), l: nat(sum.lessons, 9999), w: nat(sum.lessonsWeek, 999), x: nat(sum.xpWeek, 99999) };
}
export const buddyCode = (summary) => packObject(summary);
export const buddyLink = (summary, base = appBase()) => `${base}#/buddy?b=${buddyCode(summary)}`;

/**
 * Takes in a buddy's summary (a code, or the parsed contents of a buddy file).
 * @returns {{ok:true, state:any, buddy:any, isNew:boolean, news:string[]}|{ok:false, error:string}}
 */
export function receive(state, input, now = Date.now()) {
  const o = typeof input === 'string' ? unpackObject(input, BUDDY_KIND) : (input && input.k === BUDDY_KIND && input.v === 1 ? input : null);
  if (!o || !/^[a-z0-9]{10}$/.test(String(o.id))) return { ok: false, error: 'That is not a buddy update from Aleph. Ask your buddy to send it again.' };
  const s = norm(state);
  if (o.id === s.me) return { ok: false, error: 'That is your own update. Send it to your buddy, and open theirs here.' };
  const prev = s.list[o.id];
  if (!prev && Object.keys(s.list).length >= MAX_BUDDIES) return { ok: false, error: `This device keeps up to ${MAX_BUDDIES} buddies. Remove one first.` };
  const latest = { at: Math.min(nat(o.t, 9e15), now + 86400000), streak: nat(o.s, 9999), lessons: nat(o.l, 9999), lessonsWeek: nat(o.w, 999), xpWeek: nat(o.x, 99999) };
  if (prev && prev.latest.at >= latest.at) return { ok: true, state: s, buddy: prev, isNew: false, news: [] };
  const buddy = { id: o.id, name: cleanText(o.n) || 'Your buddy', latest, seenAt: now, history: [...(prev?.history || []), latest].slice(-KEEP) };
  s.list[o.id] = buddy;
  return { ok: true, state: s, buddy, isNew: !prev, news: milestones(prev?.latest || null, latest, buddy.name) };
}
export function removeBuddy(state, id) { const s = norm(state); delete s.list[id]; return s; }
export const buddies = (state) => Object.values(norm(state).list).sort((a, b) => b.latest.at - a.latest.at);

/** What is worth cheering since the last update. */
export function milestones(before, after, name) {
  const out = [];
  const passed = (list, a, b) => list.filter((m) => b >= m && a < m).pop();
  const l = passed(LESSON_MILESTONES, before?.lessons ?? after.lessons, after.lessons), st = passed(STREAK_MILESTONES, before?.streak ?? after.streak, after.streak);
  if (l) out.push(`${name} has finished ${l} ${l === 1 ? 'lesson' : 'lessons'}.`);
  if (st) out.push(`${name} is on a ${st}-day streak.`);
  return out;
}
