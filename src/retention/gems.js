// @ts-check
// Gems: ALEF's earned-only currency. They are never sold for money and there are no ads. Pure functions.
import { clone, CAPS } from './state.js';

/** What the learner sees. Change the three words here to rename the currency everywhere (for example to "Seeds"). */
export const CURRENCY = Object.freeze({ one: 'gem', many: 'gems', title: 'Gems' });
export const PRICES = Object.freeze({ freeze: 200, hearts: 350, repairPerDay: 150 });
export const EARN = Object.freeze({ goal: 10, accuracy: 2, first: 50, promote: 50, rank1: 100, top3: 100 });
export const WHY = Object.freeze({
  goal: 'Daily goal', accuracy: 'Sharp lesson', first: 'First lesson', promote: 'Moved up a league', rank1: 'First place', top3: 'Top three',
  'buy-freeze': 'Streak freeze', 'buy-hearts': 'Hearts refill', 'buy-repair': 'Streak repair',
});
export const whyLabel = (why) => WHY[why] || (/^streak(\d+)$/.test(why) ? `${why.slice(6)}-day streak` : 'Reward');
export const gemsText = (n) => `${n} ${n === 1 ? CURRENCY.one : CURRENCY.many}`;

function entry(rec, d, why, now) { rec.gems.balance = Math.max(0, rec.gems.balance + d); rec.gems.ledger = [...rec.gems.ledger, { at: now, d, why }].slice(-CAPS.ledger); return rec; }
/** Add gems. Returns a new record. */
export function earn(rec, amount, why, now = Date.now()) { return amount > 0 ? entry(clone(rec), Math.floor(amount), why, now) : rec; }
/** Spend gems. @returns {{ok:boolean, reason?:'balance', rec:object}} */
export function spend(rec, amount, why, now = Date.now()) {
  if (rec.gems.balance < amount) return { ok: false, reason: 'balance', rec };
  return { ok: true, rec: entry(clone(rec), -Math.floor(amount), why, now) };
}
export const balance = (rec) => rec.gems.balance;
