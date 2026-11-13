// @ts-check
// Gems: Aleph's earned-only currency. They are never sold for money and there are no ads. Pure functions.
import { clone, CAPS } from './state.js';

/** What the learner sees. Change the three words here to rename the currency everywhere (for example to "Seeds"). */
export const CURRENCY = Object.freeze({ one: 'gem', many: 'gems', title: 'Gems' });
// A streak restore is free everywhere (M-14): the Daily page and the shop offer the same restore at the same price, nothing.
export const PRICES = Object.freeze({ freeze: 200, hearts: 350, repairPerDay: 0, shield: 250, theme: 80, progressTheme: 100, outfit: 120, audio: 150, gameLevel: 180 });
export const EARN = Object.freeze({ goal: 10, accuracy: 2, first: 50, promote: 50, rank1: 100, top3: 100 });
export const WHY = Object.freeze({
  goal: 'Daily goal', accuracy: 'Sharp lesson', first: 'First lesson', promote: 'Moved up a league', rank1: 'First place', top3: 'Top three',
  quest: 'Daily quest', chest: 'All three quests', month: 'Month challenge', expedition: 'Expedition finished', mystery: 'Mystery unlocked', login7: '7 days opened this month', login14: '14 days opened this month', 'login-month': 'Every day opened this month',
  'buy-freeze': 'Streak freeze', 'buy-hearts': 'Hearts refill', 'buy-repair': 'Streak repair',
  'buy-shield': 'Streak shield', 'buy-theme': 'Shop theme', 'buy-outfit': 'Rimon outfit',
  'buy-audio': 'Audio pack', 'buy-game-level': 'Bonus arcade level',
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

/** Cosmetic shop themes. These are a reward look, not the accessibility contrast themes in Settings. */
export const SHOP_THEMES = Object.freeze([
  { id: 'sepia', title: 'Warm paper', text: 'A soft paper look for long reading. High-contrast Settings still win when you need them.' },
  { id: 'dusk', title: 'Dusk gold', text: 'A deeper gold evening look. High-contrast Settings still win when you need them.' },
]);
/** Looks unlocked by progress, then bought with gems. Still a reward look, not the accessibility contrast in Settings. */
export const SHOP_PROGRESS_THEMES = Object.freeze([
  { id: 'ink', title: 'Night ink', text: 'A dark reading look for evening study. High-contrast Settings still win when you need them.', need: { lessons: 10 } },
  { id: 'olive', title: 'Olive grove', text: 'A calm green look. High-contrast Settings still win when you need them.', need: { streak: 7 } },
  { id: 'type', title: 'Clear type', text: 'A little more space between letters for long reading. This is a look you choose, not the high-contrast setting in Settings.', need: { lessons: 15 } },
]);
export const ALL_THEMES = Object.freeze([...SHOP_THEMES, ...SHOP_PROGRESS_THEMES]);
export const themeNeedLine = (item) => item.need?.lessons ? `Unlocks after ${item.need.lessons} finished lessons.` : item.need?.streak ? `Unlocks after a ${item.need.streak}-day streak.` : 'Unlocks as you learn.';
export function themeGateOpen(item, progress = {}, rec = null) {
  if (!item?.need) return true;
  const lessonN = Number.isFinite(progress.lessons) ? progress.lessons : rec?.lessonsFinished || 0;
  const streakN = Number.isFinite(progress.streak) ? progress.streak : 0;
  if (item.need.lessons) return lessonN >= item.need.lessons;
  if (item.need.streak) return streakN >= item.need.streak;
  return true;
}
export const themePrice = (item) => item?.need ? PRICES.progressTheme : PRICES.theme;
/** Gender-neutral Rimon outfits. CSS only; no new pictures, and nothing that marks Rimon as male or female. */
export const SHOP_OUTFITS = Object.freeze([
  { id: 'scarf', title: 'Travel scarf', text: 'A simple scarf on Rimon. Rimon stays Rimon — no he or she.' },
  { id: 'ribbon', title: 'Shabbat ribbon', text: 'A small ribbon on Rimon for a festive day.' },
  { id: 'glasses', title: 'Study glasses', text: 'Round glasses on Rimon while you study.' },
]);
/** Accessories Rimon earns with the learner. CSS only; never bought; never gendered. */
export const SHOP_EARNED_OUTFITS = Object.freeze([
  { id: 'pin', title: 'Lesson pin', text: 'A small pin Rimon earns with you after five finished lessons.', need: { lessons: 5 } },
  { id: 'badge', title: 'Week badge', text: 'A badge Rimon earns with you after a 7-day streak.', need: { streak: 7 } },
]);
export const ALL_OUTFITS = Object.freeze([...SHOP_OUTFITS, ...SHOP_EARNED_OUTFITS]);
export const earnedNeedLine = (item) => item.need?.lessons ? `Earned after ${item.need.lessons} finished lessons.` : item.need?.streak ? `Earned after a ${item.need.streak}-day streak.` : 'Earned by learning.';

export const SHOP_AUDIO = Object.freeze([
  { id: 'blessings', title: 'Blessings practice', text: 'Marks the blessings audio you already have on this device as a pack you chose. Nothing new is downloaded until you open Listen or Speak.' },
]);
export const SHOP_LIMITS = Object.freeze({ shieldMax: 2, gameLevelMax: 2 });

export const shopState = (rec) => rec.shop || { themes: [], themeActive: null, outfits: [], outfitActive: null, earnedOutfits: [], audio: [], gameLevels: 0, shields: { held: 0, used: [] } };
export const hasUnlock = (rec, kind, id) => (shopState(rec)[kind] || []).includes(id);

function withShop(rec, fn) {
  const next = clone(rec);
  const cur = shopState(next);
  next.shop = { ...cur, themes: [...cur.themes], outfits: [...cur.outfits], earnedOutfits: [...(cur.earnedOutfits || [])], audio: [...cur.audio], shields: { ...cur.shields, used: [...(cur.shields.used || [])] } };
  fn(next.shop);
  return next;
}

/** Buy a streak shield (covers a missed weekday after freezes, all or nothing with them). */
export function buyShield(rec, now = Date.now()) {
  const held = shopState(rec).shields.held || 0;
  if (held >= SHOP_LIMITS.shieldMax) return { ok: false, reason: 'max', rec };
  const s = spend(rec, PRICES.shield, 'buy-shield', now);
  if (!s.ok) return { ok: false, reason: 'balance', rec };
  return { ok: true, rec: withShop(s.rec, (shop) => { shop.shields.held = held + 1; }) };
}

/** Unlock a catalog item (theme, outfit, or audio pack) and, for looks, make it the active one. */
export function buyUnlock(rec, kind, id, now = Date.now(), progress = {}) {
  const lists = { theme: ALL_THEMES, outfit: SHOP_OUTFITS, audio: SHOP_AUDIO };
  const prices = { theme: PRICES.theme, outfit: PRICES.outfit, audio: PRICES.audio };
  const keys = { theme: 'themes', outfit: 'outfits', audio: 'audio' };
  const why = { theme: 'buy-theme', outfit: 'buy-outfit', audio: 'buy-audio' };
  const list = lists[kind];
  const item = list && list.find((x) => x.id === id);
  if (!item) return { ok: false, reason: 'unknown', rec };
  if (hasUnlock(rec, keys[kind], id)) return { ok: false, reason: 'owned', rec };
  if (kind === 'theme' && item.need && !themeGateOpen(item, progress, rec)) return { ok: false, reason: 'locked', rec };
  const price = kind === 'theme' ? themePrice(item) : prices[kind];
  const s = spend(rec, price, why[kind], now);
  if (!s.ok) return { ok: false, reason: 'balance', rec };
  const active = { theme: 'themeActive', outfit: 'outfitActive' };
  return { ok: true, rec: withShop(s.rec, (shop) => {
    shop[keys[kind]] = [...shop[keys[kind]], id];
    if (active[kind]) shop[active[kind]] = id;
  }) };
}

export function chooseUnlock(rec, kind, id) {
  const keys = { theme: 'themes', outfit: 'outfits' };
  const active = { theme: 'themeActive', outfit: 'outfitActive' };
  if (!keys[kind] || (id && !hasUnlock(rec, keys[kind], id))) return rec;
  return withShop(rec, (shop) => { shop[active[kind]] = id || null; });
}

/** Spend gems to raise the arcade level cap by one (on top of levels earned in play). */
export function buyGameLevel(rec, now = Date.now()) {
  const n = shopState(rec).gameLevels || 0;
  if (n >= SHOP_LIMITS.gameLevelMax) return { ok: false, reason: 'max', rec };
  const s = spend(rec, PRICES.gameLevel, 'buy-game-level', now);
  if (!s.ok) return { ok: false, reason: 'balance', rec };
  return { ok: true, rec: withShop(s.rec, (shop) => { shop.gameLevels = n + 1; }) };
}

export const arcadeBoost = (rec) => Math.min(SHOP_LIMITS.gameLevelMax, Math.max(0, shopState(rec).gameLevels || 0));

/** Grant outfits the learner has earned. Does not take off an outfit already in use. */
export function grantEarnedOutfits(rec, { lessons, streak } = {}) {
  const shop = shopState(rec);
  const have = new Set(shop.outfits);
  const add = [];
  const lessonN = Number.isFinite(lessons) ? lessons : rec.lessonsFinished || 0;
  const streakN = Number.isFinite(streak) ? streak : 0;
  for (const item of SHOP_EARNED_OUTFITS) {
    if (have.has(item.id)) continue;
    if (item.need?.lessons && lessonN >= item.need.lessons) add.push(item.id);
    else if (item.need?.streak && streakN >= item.need.streak) add.push(item.id);
  }
  if (!add.length) return rec;
  return withShop(rec, (s) => {
    s.outfits = [...s.outfits, ...add];
    s.earnedOutfits = [...new Set([...(s.earnedOutfits || []), ...add])];
    if (!s.outfitActive) s.outfitActive = add[0];
  });
}

const SHOP_CSS = `/* Shop looks: injected on demand, not part of the first install. High-contrast Settings keep priority. */
:root[data-shop-theme="sepia"]:not([data-theme^="contrast"]){--bg:#f4ecd8;--fg:#3b2a1a;--card:#efe4c9;--muted:#6b542e;}
:root[data-shop-theme="dusk"]:not([data-theme^="contrast"]){--bg:#1b2430;--fg:#f3e6c4;--card:#243044;--muted:#cbb889;}
:root[data-shop-theme="ink"]:not([data-theme^="contrast"]){--bg:#12161c;--fg:#e8edf3;--card:#1c232c;--muted:#a8b3c2;}
:root[data-shop-theme="olive"]:not([data-theme^="contrast"]){--bg:#f3f0e4;--fg:#2a3a28;--card:#e7ead4;--muted:#5a6b4a;}
:root[data-shop-theme="type"]:not([data-theme^="contrast"]){letter-spacing:0.03em;--bg:#f7f4ee;--fg:#1a1a1a;--card:#ffffff;--muted:#4a4a4a;}
html[data-rimon-outfit="scarf"] .alef-rimon{box-shadow:inset 0 -0.55rem 0 0 #c45c4a;}
html[data-rimon-outfit="ribbon"] .alef-rimon{box-shadow:inset 0.35rem 0 0 0 #d4a017;}
html[data-rimon-outfit="glasses"] .alef-rimon{outline:2px solid #2a2a2a;outline-offset:-0.55rem;border-radius:50%;}
html[data-rimon-outfit="pin"] .alef-rimon{box-shadow:inset -0.45rem 0.35rem 0 0 #e8c547;}
html[data-rimon-outfit="badge"] .alef-rimon{box-shadow:inset 0 0 0 0.28rem #3d6b4f;}
`;

/** Paint unlocked shop looks. Contrast themes in Settings are left alone. */
export function applyShopLook(rec, doc = globalThis.document) {
  if (!doc?.documentElement) return;
  if (!doc.getElementById('alef-shop-look')) {
    const el = doc.createElement('style');
    el.id = 'alef-shop-look';
    el.textContent = SHOP_CSS;
    (doc.head || doc.documentElement).appendChild(el);
  }
  const shop = shopState(rec);
  const root = doc.documentElement;
  if (shop.themeActive) root.setAttribute('data-shop-theme', shop.themeActive);
  else root.removeAttribute('data-shop-theme');
  if (shop.outfitActive) root.setAttribute('data-rimon-outfit', shop.outfitActive);
  else root.removeAttribute('data-rimon-outfit');
}
