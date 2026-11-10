// @ts-check
// #/shop: the streak-freeze shop, streak repair, hearts refill, and the retention switches (hearts, league, reminders).
// Gems are earned in lessons only. Nothing here costs money.
import { h } from './dom.js';
import { retention } from './boot.js';
import { CURRENCY, PRICES, gemsText, whyLabel } from './gems.js';
import { STREAK, buyFreeze, repairOffer, repairStreak, streakLine } from './streak.js';
import { HEARTS, refillByGems, nextHeartInMs } from './hearts.js';
import { setReminders } from './notify.js';
import { showRimon } from './rimon.js';
import { downloadReminder } from './ui.js';

const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function mount(root, ctx) {
  const R = retention(ctx);
  const status = h('p', { role: 'status', 'aria-live': 'polite', class: 'ret-shop-status' });
  const body = h('div', { class: 'stack' });
  let confirmEl = null;
  /** One question before any purchase; no browser dialog (those block the page). */
  const ask = (question, yes, run) => {
    confirmEl?.remove();
    confirmEl = h('div', { class: 'card ret-confirm', role: 'group', 'aria-label': question }, h('p', {}, question),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', 'data-act': 'confirm', onclick: () => { confirmEl?.remove(); confirmEl = null; run(); } }, yes),
        h('button', { type: 'button', class: 'btn secondary', onclick: () => { confirmEl?.remove(); confirmEl = null; } }, 'Cancel')));
    status.after(confirmEl); confirmEl.querySelector('button')?.focus();
  };
  const item = (title, text, price, btn) => h('section', { class: 'card ret-item' }, h('h2', {}, title), h('p', {}, text), h('p', { class: 'ret-price' }, price), btn);
  function draw() {
    const rec = R.get(), st = R.status(), bal = rec.gems.balance, offer = repairOffer(rec), calm = R.calm();
    const freezeBtn = rec.freezes.held >= STREAK.freezeMax ? h('p', { class: 'muted' }, `You hold ${STREAK.freezeMax}, the most allowed.`)
      : h('button', { type: 'button', class: 'btn', 'data-buy': 'freeze', disabled: bal < PRICES.freeze, onclick: () => ask(`Spend ${gemsText(PRICES.freeze)} on a streak freeze?`, 'Yes, buy it', () => {
        const out = buyFreeze(R.get()); if (!out.ok) { status.textContent = out.reason === 'max' ? 'You already hold the most freezes allowed.' : `You need ${gemsText(PRICES.freeze)}.`; return; }
        R.update(() => out.rec); status.textContent = "Freeze ready. Rimon's keeping it cold."; showRimon('freeze_bought');
      }) }, bal < PRICES.freeze ? `Needs ${gemsText(PRICES.freeze)}` : 'Buy a streak freeze');
    const heartsOn = R.heartsShown();
    const sw = (label, on, set) => h('button', { type: 'button', class: 'btn secondary', role: 'switch', 'aria-checked': String(on), onclick: set }, `${label}: ${on ? 'On' : 'Off'}`);
    body.replaceChildren(
      h('p', { class: 'ret-balance' }, h('span', { class: 'ret-ico ret-ico-gem', 'aria-hidden': 'true' }), ` You have ${gemsText(bal)}. `, h('span', { class: 'muted' }, `${CURRENCY.title} are earned in lessons. They are never sold.`)),
      R.streakShown() ? h('p', {}, streakLine(st)) : null,
      offer ? item('Repair Your Streak', `Bring back your ${offer.prev}-day streak. The offer ends in about ${offer.hoursLeft} hour${offer.hoursLeft === 1 ? '' : 's'}.`, gemsText(offer.price),
        h('button', { type: 'button', class: 'btn', 'data-buy': 'repair', disabled: bal < offer.price, onclick: () => ask(`Spend ${gemsText(offer.price)} to repair your streak?`, 'Yes, repair it', () => {
          const out = repairStreak(R.streakRaw(), R.get()); if (!out.ok) { status.textContent = out.reason === 'balance' ? `You need ${gemsText(offer.price)}.` : 'The repair offer has ended.'; return; }
          R.setStreak(out.streak); R.update(() => out.rec); status.textContent = 'Streak repaired. Welcome back to it!'; showRimon('streak_repaired');
        }) }, bal < offer.price ? `Needs ${gemsText(offer.price)}` : 'Repair my streak')) : null,
      item('Streak Freeze', `Covers one missed day automatically. You hold ${rec.freezes.held} of ${STREAK.freezeMax}. Shabbat and holidays never need one.`, gemsText(PRICES.freeze), freezeBtn),
      heartsOn ? item('Refill Hearts', rec.hearts.n >= HEARTS.max ? 'Your hearts are full.' : `You have ${rec.hearts.n} of ${HEARTS.max} hearts. Practising old words also earns them back.${nextHeartInMs(rec) ? ' One returns by itself every 4 hours.' : ''}`, gemsText(PRICES.hearts),
        rec.hearts.n >= HEARTS.max ? null : h('button', { type: 'button', class: 'btn', 'data-buy': 'hearts', disabled: bal < PRICES.hearts, onclick: () => ask(`Spend ${gemsText(PRICES.hearts)} to refill your hearts?`, 'Yes, refill', () => {
          const out = refillByGems(R.get()); if (!out.ok) { status.textContent = out.reason === 'full' ? 'Your hearts are already full.' : `You need ${gemsText(PRICES.hearts)}.`; return; }
          R.update(() => out.rec); status.textContent = 'Hearts full. Off you go!'; showRimon('hearts_refilled');
        }) }, bal < PRICES.hearts ? `Needs ${gemsText(PRICES.hearts)}` : 'Refill all hearts')) : null,
      h('section', { class: 'card' }, h('h2', {}, 'Recent'), rec.gems.ledger.length
        ? h('ul', { class: 'ret-ledger' }, ...rec.gems.ledger.slice(-10).reverse().map((e) => h('li', {}, `${e.d > 0 ? '+' : ''}${e.d} ${whyLabel(e.why)}, ${DAY[new Date(e.at).getDay()]}`)))
        : h('p', { class: 'muted' }, 'Nothing yet. Finish a lesson to earn your first gems.')),
      h('section', { class: 'card ret-switches' }, h('h2', {}, 'Your Choices'),
        calm ? h('p', { class: 'muted' }, 'Calm mode is on, so hearts, the league and reminders are resting.') : null,
        h('div', { class: 'row' },
          sw('Hearts', rec.hearts.enabled !== false, () => R.update((r) => { r.hearts.enabled = r.hearts.enabled === false ? true : false; return r; })),
          sw('Practice league', rec.league.enabled !== false, () => R.update((r) => { r.league.enabled = r.league.enabled === false ? true : false; return r; })),
          sw('Rimon reminders', rec.notify.optedIn, async () => {
            if (rec.notify.optedIn) { R.update((r) => setReminders(r, false)); R.rearm(); return; }
            const p = await R.turnOnReminders(rec.notify.tone); if (p !== 'granted') status.textContent = p === 'unsupported' ? 'This browser cannot show reminders. On iPhone, add ALEF to your Home Screen first.' : 'Reminders are blocked in this browser. You can allow them in the browser settings.';
          }),
          rec.notify.optedIn ? sw('Playful Rimon (for adults)', rec.notify.tone === 'playful', () => { R.update((r) => setReminders(r, true, r.notify.tone === 'playful' ? 'kind' : 'playful')); R.rearm(); }) : null),
        h('p', { class: 'muted' }, 'Reminders only arrive while ALEF is open on this device, or on Android with ALEF installed. Never on Shabbat or holidays. For a reminder that always arrives, add one to your calendar.'),
        h('button', { type: 'button', class: 'btn secondary', 'data-act': 'calendar', onclick: async () => { status.textContent = (await downloadReminder(R)) ? 'Calendar reminder downloaded: Sunday to Thursday, at the time you usually study.' : 'This browser could not make the calendar file.'; } }, 'Add a daily reminder to my calendar')));
  }
  root.replaceChildren(h('div', { class: 'stack ret-shop alef-retention' }, h('h1', { id: 'view-title', tabindex: '-1' }, 'Shop'), status, body));
  const on = () => { try { draw(); } catch { /* keep the last drawing */ } };
  document.addEventListener('alef:retention', on); draw();
  return () => document.removeEventListener('alef:retention', on);
}
