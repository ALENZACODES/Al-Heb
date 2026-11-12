// @ts-check
// Hearts: 5 at most. A wrong FIRST answer in a lesson costs one; practising old material (the spaced-review queue,
// #/learn?review=1) wins one back; one also returns every 4 hours. Hearts never stop a lesson that is already running.
import { clone, CAPS } from './state.js';
import { spend, PRICES } from './gems.js';

export const HEARTS = Object.freeze({ max: 5, refillMs: 4 * 3600 * 1000, roundCards: 5, roundRightForXp: 4, unlockLessons: 3 });
/** The practice route a learner is sent to when out of hearts: due cards from src/curriculum/srs.js, oldest first. */
export const REFILL_ROUTE = '#/learn?review=1&refill=1';
/** Routes where hearts never apply (reading, prayer, Torah, songs, games, first day, placement). */
const EXEMPT = [/^\/torahread/, /^\/torah/, /^\/read(\/|$)/, /^\/pray/, /^\/siddur/, /^\/service/, /^\/morning/, /^\/listen/, /^\/songs/, /^\/games/, /^\/lab/, /^\/firstday/, /^\/firstwin/, /^\/placement/, /^\/welcome/];
const pathOf = (hash) => String(hash || '').replace(/^#/, '').split('?')[0];
/** True on a lesson route that is not a review: #/learn?lesson=... (whole, short parts, Test out) and #/intermediate/<id> (I8: every
 *  lesson type takes hearts the same way; the rules page, src/coursemap/rules.js, lists the same kinds). */
export const isLessonHash = (hash) => (/^#\/learn\?/.test(String(hash || '')) && /[?&]lesson=/.test(hash) && !/[?&]review=1/.test(hash)) || /^#\/intermediate\/[^/?]+/.test(String(hash || ''));

/** Are hearts in force? Off in calm mode, when switched off, before the 3rd finished lesson, and on exempt routes. */
export function heartsOn(rec, { calm = false, hash = '' } = {}) {
  if (calm || rec.hearts.enabled === false) return false;
  if (rec.hearts.enabled === null && rec.lessonsFinished < HEARTS.unlockLessons) return false;
  const p = pathOf(hash); return !EXEMPT.some((re) => re.test(p));
}
/** Apply the timed refill (lazy: computed when read). Returns a new record when something changed. */
export function refillByTime(rec, now = Date.now()) {
  const h = rec.hearts;
  if (h.n >= HEARTS.max || !h.lastRefillAt || now <= h.lastRefillAt) return rec;
  const gained = Math.floor((now - h.lastRefillAt) / HEARTS.refillMs);
  if (gained <= 0) return rec;
  const r = clone(rec); r.hearts.n = Math.min(HEARTS.max, h.n + gained);
  r.hearts.lastRefillAt = r.hearts.n >= HEARTS.max ? 0 : h.lastRefillAt + gained * HEARTS.refillMs;
  return r;
}
export const heartCount = (rec, now = Date.now()) => refillByTime(rec, now).hearts.n;
/** ms until the next timed heart, or 0 when full. */
export function nextHeartInMs(rec, now = Date.now()) { const r = refillByTime(rec, now); return r.hearts.n >= HEARTS.max || !r.hearts.lastRefillAt ? 0 : Math.max(0, r.hearts.lastRefillAt + HEARTS.refillMs - now); }

/**
 * A wrong answer. Costs a heart only on the first wrong answer to `questionId`; a wrong retry is free.
 * @returns {{rec:object, lost:boolean, left:number}}
 */
export function loseHeart(rec, questionId, now = Date.now()) {
  let r = refillByTime(rec, now);
  const id = String(questionId ?? '');
  if (id && r.hearts.lost.includes(id)) return { rec: r, lost: false, left: r.hearts.n };
  r = clone(r);
  if (id) r.hearts.lost = [...r.hearts.lost, id].slice(-CAPS.lost);
  if (r.hearts.n <= 0) return { rec: r, lost: false, left: 0 };
  if (r.hearts.n >= HEARTS.max) r.hearts.lastRefillAt = now; // the 4-hour clock starts when the first heart goes
  r.hearts.n -= 1;
  return { rec: r, lost: true, left: r.hearts.n };
}
/** A new lesson began: forget which questions were already missed. */
export function startLesson(rec) { if (!rec.hearts.lost.length) return rec; const r = clone(rec); r.hearts.lost = []; return r; }

/**
 * One review card rated during practice. Every 5 cards is a round: +1 heart whatever the score (the reward is for
 * practising); `xpEarned` is true when at least 4 of the 5 were right.
 * @returns {{rec:object, roundDone:boolean, heartBack:boolean, xpEarned:boolean}}
 */
export function practiceCard(rec, right, now = Date.now()) {
  let r = clone(refillByTime(rec, now));
  r.hearts.refillProgress += 1; if (right) r.hearts.refillRight += 1;
  if (r.hearts.refillProgress < HEARTS.roundCards) return { rec: r, roundDone: false, heartBack: false, xpEarned: false };
  const xpEarned = r.hearts.refillRight >= HEARTS.roundRightForXp, heartBack = r.hearts.n < HEARTS.max;
  r.hearts.refillProgress = 0; r.hearts.refillRight = 0;
  if (heartBack) { r.hearts.n += 1; if (r.hearts.n >= HEARTS.max) r.hearts.lastRefillAt = 0; }
  return { rec: r, roundDone: true, heartBack, xpEarned };
}
/** Refill every heart with gems. @returns {{ok:boolean, reason?:'full'|'balance', rec:object}} */
export function refillByGems(rec, now = Date.now()) {
  const cur = refillByTime(rec, now);
  if (cur.hearts.n >= HEARTS.max) return { ok: false, reason: 'full', rec: cur };
  const s = spend(cur, PRICES.hearts, 'buy-hearts', now);
  if (!s.ok) return { ok: false, reason: 'balance', rec: cur };
  s.rec.hearts.n = HEARTS.max; s.rec.hearts.lastRefillAt = 0;
  return { ok: true, rec: s.rec };
}
/** May a NEW lesson start? (Review and every exempt route are always open.) */
export const canStartLesson = (rec, opt = {}, now = Date.now()) => !heartsOn(rec, opt) || heartCount(rec, now) > 0;
