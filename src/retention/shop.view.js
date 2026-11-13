// @ts-check
// #/shop: the streak-freeze shop, streak repair, hearts refill, and the retention switches (hearts, league, reminders).
// Gems are earned in lessons only. Nothing here costs money.
import { h, setKids } from './dom.js';
import { retention } from './boot.js';
import { CURRENCY, PRICES, gemsText, whyLabel, SHOP_THEMES, SHOP_PROGRESS_THEMES, SHOP_OUTFITS, SHOP_AUDIO, SHOP_EARNED_OUTFITS, ALL_OUTFITS, SHOP_LIMITS, shopState, buyShield, buyUnlock, chooseUnlock, buyGameLevel, applyShopLook, themeNeedLine, themeGateOpen, themePrice, earnedNeedLine } from './gems.js';
import { STREAK, buyFreeze, repairOffer, repairStreak, streakLine } from './streak.js';
import { HEARTS, refillByGems, nextHeartInMs } from './hearts.js';
import { setReminders, usualTimeText, pickMessage } from './notify.js';
import { isRestQuiet } from './quiet.js';
import { showRimon } from './rimon.js';
import { downloadReminder } from './ui.js';
import { read as readCounts, lessonsFinished, repairOffer as liveRepair, daysText, streakText, count } from '../lib/counts.js';
import { streakShort, heartsShort } from '../coursemap/rules.js'; // H8/I8: the one rule text, shared with the Daily page and #/app-rules

const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function mount(root, ctx) {
  const R = retention(ctx);
  const status = h('p', { role: 'status', 'aria-live': 'polite', class: 'ret-shop-status', tabindex: '-1' });
  const body = h('div', { class: 'stack' });
  let confirmEl = null;
  /** One question before any purchase; no browser dialog (those block the page). */
  const ask = (question, yes, run) => {
    confirmEl?.remove();
    const opener = document.activeElement?.getAttribute?.('data-k') || null;
    const back = () => { confirmEl?.remove(); confirmEl = null; const btn = opener ? body.querySelector(`[data-k="${opener}"]`) : null; (btn && !btn.disabled ? btn : status).focus({ preventScroll: true }); };
    confirmEl = h('div', { class: 'card ret-confirm', role: 'group', 'aria-label': question }, h('p', {}, question),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', 'data-act': 'confirm', onclick: () => { run(); back(); } }, yes),
        h('button', { type: 'button', class: 'btn secondary', onclick: back }, 'Cancel')));
    status.after(confirmEl); confirmEl.querySelector('button')?.focus();
  };
  const item = (title, text, price, btn) => h('section', { class: 'card ret-item' }, h('h2', {}, title), h('p', {}, text), h('p', { class: 'ret-price' }, price), btn);
  let sig = '';
  function draw() {
    // The restore is free and shown only while the streak is broken (src/lib/counts.js repairOffer); the same rule as the Daily page.
    const rec = R.get(), st = R.status(), bal = rec.gems.balance, offer = liveRepair(rec, R.streakRaw()) ? repairOffer(rec) : null, calm = R.calm();
    const done = lessonsFinished(readCounts(ctx.store).completed);
    const next = JSON.stringify([rec.xp.total, done, st.best, st.state, st.count, rec.gems, rec.freezes.held, rec.hearts.n, rec.hearts.enabled, rec.league.enabled, rec.notify.optedIn, rec.notify.tone, rec.shop, !!offer, calm]);
    if (next === sig) return; // unchanged: leave the page (and the focus) alone
    sig = next;
    const focusKey = body.contains(document.activeElement) ? document.activeElement.getAttribute('data-k') : null;
    const freezeBtn = rec.freezes.held >= STREAK.freezeMax ? h('p', { class: 'muted' }, `You hold ${STREAK.freezeMax}, the most allowed.`)
      : h('button', { type: 'button', class: 'btn', 'data-buy': 'freeze', 'data-k': 'freeze', disabled: bal < PRICES.freeze, onclick: () => ask(`Spend ${gemsText(PRICES.freeze)} on a streak freeze?`, 'Yes, buy it', () => {
        const out = buyFreeze(R.get()); if (!out.ok) { status.textContent = out.reason === 'max' ? 'You already hold the most freezes allowed.' : `You need ${gemsText(PRICES.freeze)}.`; return; }
        R.update(() => out.rec); status.textContent = "Freeze ready. Rimon's keeping it cold."; showRimon('freeze_bought');
      }) }, bal < PRICES.freeze ? `Needs ${gemsText(PRICES.freeze)}` : 'Buy a streak freeze');
    const heartsOn = R.heartsShown();
    const sw = (label, on, set) => h('button', { type: 'button', class: 'btn secondary', role: 'switch', 'data-k': label, 'aria-checked': String(on), onclick: set }, `${label}: ${on ? 'On' : 'Off'}`);
    setKids(body,
      h('p', { class: 'ret-balance' }, h('span', { class: 'ret-ico ret-ico-gem', 'aria-hidden': 'true' }), ` You have ${gemsText(bal)}. `, h('span', { class: 'muted' }, `${CURRENCY.title} are earned in lessons. They are never sold.`)),
      R.streakShown() ? h('p', {}, streakLine(st)) : null,
      offer ? item('Bring Back Your Streak', `Your ${streakText(offer.prev)} broke. You can bring it back for free for about ${count(offer.hoursLeft, 'hour')} more.`, 'Free',
        h('button', { type: 'button', class: 'btn', 'data-buy': 'repair', 'data-k': 'repair', onclick: () => ask(`Bring back your ${streakText(offer.prev)}? It is free.`, 'Yes, bring it back', () => {
          const out = repairStreak(R.streakRaw(), R.get()); if (!out.ok) { status.textContent = out.reason === 'balance' ? `You need ${gemsText(offer.price)}.` : 'The repair offer has ended.'; return; }
          R.setStreak(out.streak); R.update(() => out.rec); status.textContent = STREAK.repairCountsToday ? 'Your streak is back, and today is counted.' : 'Your streak is back. One lesson today keeps it going.'; showRimon('streak_repaired');
        }) }, 'Bring back my streak (free)')) : null,
      item('Streak Freeze', `Covers one missed day automatically. You hold ${rec.freezes.held} of ${STREAK.freezeMax}. Shabbat and holidays never need one.`, gemsText(PRICES.freeze), freezeBtn),
      heartsOn ? item('Refill Hearts', rec.hearts.n >= HEARTS.max ? 'Your hearts are full.' : `You have ${rec.hearts.n} of ${HEARTS.max} hearts. Practicing old words also earns them back.${nextHeartInMs(rec) ? ' One returns by itself every 4 hours.' : ''}`, gemsText(PRICES.hearts),
        rec.hearts.n >= HEARTS.max ? null : h('button', { type: 'button', class: 'btn', 'data-buy': 'hearts', 'data-k': 'hearts', disabled: bal < PRICES.hearts, onclick: () => ask(`Spend ${gemsText(PRICES.hearts)} to refill your hearts?`, 'Yes, refill', () => {
          const out = refillByGems(R.get()); if (!out.ok) { status.textContent = out.reason === 'full' ? 'Your hearts are already full.' : `You need ${gemsText(PRICES.hearts)}.`; return; }
          R.update(() => out.rec); status.textContent = 'Hearts full. Off you go!'; showRimon('hearts_refilled');
        }) }, bal < PRICES.hearts ? `Needs ${gemsText(PRICES.hearts)}` : 'Refill all hearts')) : null,
      ...(function shopExtras() {
        const shop = shopState(rec);
        const buyOrUse = (kind, row, price, buyWhy) => {
          const owned = kind === 'audio' ? shop.audio.includes(row.id) : (kind === 'theme' ? shop.themes.includes(row.id) : shop.outfits.includes(row.id));
          const activeKey = kind === 'theme' ? 'themeActive' : kind === 'outfit' ? 'outfitActive' : null;
          const active = activeKey && shop[activeKey] === row.id;
          if (owned && kind === 'audio') return h('p', { class: 'muted' }, 'Ready on this device.');
          if (owned && active) return h('p', { class: 'muted' }, 'This is the one in use.');
          if (owned) return h('button', { type: 'button', class: 'btn secondary', 'data-k': kind + '-' + row.id, onclick: () => { R.update((r) => chooseUnlock(r, kind, row.id)); applyShopLook(R.get()); status.textContent = row.title + ' is on.'; } }, 'Use this one');
          return h('button', { type: 'button', class: 'btn', 'data-k': kind + '-' + row.id, disabled: bal < price, onclick: () => ask(`Spend ${gemsText(price)} on ${row.title}?`, 'Yes, buy it', () => {
            const out = buyUnlock(R.get(), kind, row.id); if (!out.ok) { status.textContent = out.reason === 'owned' ? 'You already have this.' : `You need ${gemsText(price)}.`; return; }
            R.update(() => out.rec); applyShopLook(out.rec); status.textContent = row.title + ' is yours.'; showRimon(kind === 'outfit' ? 'freeze_bought' : 'hearts_refilled');
          }) }, bal < price ? `Needs ${gemsText(price)}` : 'Buy');
        };
        const catalogBlock = (heading, rows, kind, price) => h('section', { class: 'card ret-item' }, h('h2', {}, heading),
          ...rows.map((row) => h('div', { class: 'ret-shop-row', 'data-shop': kind + '-' + row.id }, h('h3', {}, row.title), h('p', {}, row.text), h('p', { class: 'ret-price' }, gemsText(price)), buyOrUse(kind, row, price))));
        const shHeld = shop.shields.held || 0;
        const shieldBtn = shHeld >= SHOP_LIMITS.shieldMax ? h('p', { class: 'muted' }, `You hold ${SHOP_LIMITS.shieldMax}, the most allowed.`)
          : h('button', { type: 'button', class: 'btn', 'data-buy': 'shield', 'data-k': 'shield', disabled: bal < PRICES.shield, onclick: () => ask(`Spend ${gemsText(PRICES.shield)} on a streak shield?`, 'Yes, buy it', () => {
            const out = buyShield(R.get()); if (!out.ok) { status.textContent = out.reason === 'max' ? 'You already hold the most shields allowed.' : `You need ${gemsText(PRICES.shield)}.`; return; }
            R.update(() => out.rec); status.textContent = 'Shield ready. It covers a missed weekday after your freezes.'; showRimon('freeze_bought');
          }) }, bal < PRICES.shield ? `Needs ${gemsText(PRICES.shield)}` : 'Buy a streak shield');
        const lv = shop.gameLevels || 0;
        const gameBtn = lv >= SHOP_LIMITS.gameLevelMax ? h('p', { class: 'muted' }, 'You already hold two bonus arcade levels.')
          : h('button', { type: 'button', class: 'btn', 'data-buy': 'game-level', 'data-k': 'game-level', disabled: bal < PRICES.gameLevel, onclick: () => ask(`Spend ${gemsText(PRICES.gameLevel)} to open one more arcade level?`, 'Yes, buy it', () => {
            const out = buyGameLevel(R.get()); if (!out.ok) { status.textContent = out.reason === 'max' ? 'You already hold two bonus arcade levels.' : `You need ${gemsText(PRICES.gameLevel)}.`; return; }
            R.update(() => out.rec); status.textContent = `Bonus arcade levels: ${out.rec.shop.gameLevels}. They add to levels you earn by playing.`; showRimon('hearts_refilled');
          }) }, bal < PRICES.gameLevel ? `Needs ${gemsText(PRICES.gameLevel)}` : 'Unlock one more arcade level');
        return [
          item('Streak Shield', `Covers one missed weekday automatically, after your streak freezes. You hold ${shHeld} of ${SHOP_LIMITS.shieldMax}. Shabbat and holidays never need one.`, gemsText(PRICES.shield), shieldBtn),
          catalogBlock('Looks', SHOP_THEMES, 'theme', PRICES.theme),
          (function unlockLooks() {
            const progress = { lessons: rec.lessonsFinished, streak: st.count };
            const rows = SHOP_PROGRESS_THEMES.map((row) => {
              const owned = shop.themes.includes(row.id);
              const open = themeGateOpen(row, progress, rec);
              const price = themePrice(row);
              const active = shop.themeActive === row.id;
              let action;
              if (!owned && !open) action = h('p', { class: 'muted' }, themeNeedLine(row));
              else if (!owned) action = h('button', { type: 'button', class: 'btn', 'data-k': 'theme-' + row.id, disabled: bal < price, onclick: () => ask(`Spend ${gemsText(price)} on ${row.title}?`, 'Yes, buy it', () => {
                const out = buyUnlock(R.get(), 'theme', row.id, Date.now(), progress);
                if (!out.ok) { status.textContent = out.reason === 'locked' ? themeNeedLine(row) : out.reason === 'owned' ? 'You already have this.' : `You need ${gemsText(price)}.`; return; }
                R.update(() => out.rec); applyShopLook(out.rec); status.textContent = row.title + ' is yours.'; showRimon('hearts_refilled');
              }) }, bal < price ? `Needs ${gemsText(price)}` : 'Buy');
              else if (active) action = h('p', { class: 'muted' }, 'This is the one in use.');
              else action = h('button', { type: 'button', class: 'btn secondary', 'data-k': 'theme-' + row.id, onclick: () => { R.update((r) => chooseUnlock(r, 'theme', row.id)); applyShopLook(R.get()); status.textContent = row.title + ' is on.'; } }, 'Use this one');
              return h('div', { class: 'ret-shop-row', 'data-shop': 'theme-' + row.id }, h('h3', {}, row.title), h('p', {}, row.text), !owned && open ? h('p', { class: 'ret-price' }, gemsText(price)) : null, action);
            });
            const none = shop.themeActive
              ? h('button', { type: 'button', class: 'btn secondary', 'data-k': 'theme-none', onclick: () => { R.update((r) => chooseUnlock(r, 'theme', null)); applyShopLook(R.get()); status.textContent = 'Back to the usual look.'; } }, 'Use the usual look')
              : h('p', { class: 'muted' }, 'The usual look is on. High-contrast Settings still win when you need them.');
            return h('section', { class: 'card ret-item', 'data-shop': 'unlock-looks' }, h('h2', {}, 'Looks you unlock'),
              h('p', {}, 'These looks open as you learn, then you can buy them with gems. They are a choice, not the high-contrast setting in Settings, which always comes first when it is on.'),
              ...rows, none);
          })(),
          (function closet() {
            const rows = ALL_OUTFITS.map((row) => {
              const owned = shop.outfits.includes(row.id);
              const earned = (shop.earnedOutfits || []).includes(row.id);
              const bought = SHOP_OUTFITS.some((x) => x.id === row.id);
              const active = shop.outfitActive === row.id;
              let action;
              if (!owned && !bought) action = h('p', { class: 'muted' }, earnedNeedLine(row));
              else if (!owned) action = buyOrUse('outfit', row, PRICES.outfit);
              else if (active) action = h('p', { class: 'muted' }, 'Rimon is wearing this.');
              else action = h('button', { type: 'button', class: 'btn secondary', 'data-k': 'wear-' + row.id, onclick: () => { R.update((r) => chooseUnlock(r, 'outfit', row.id)); applyShopLook(R.get()); status.textContent = row.title + ' is on.'; } }, 'Wear this');
              const how = owned ? (earned ? 'Earned by learning.' : 'Bought with gems.') : '';
              return h('div', { class: 'ret-shop-row', 'data-shop': 'outfit-' + row.id }, h('h3', {}, row.title), h('p', {}, row.text, how ? ' ' + how : ''), bought && !owned ? h('p', { class: 'ret-price' }, gemsText(PRICES.outfit)) : null, action);
            });
            const none = shop.outfitActive
              ? h('button', { type: 'button', class: 'btn secondary', 'data-k': 'wear-none', onclick: () => { R.update((r) => chooseUnlock(r, 'outfit', null)); applyShopLook(R.get()); status.textContent = 'Rimon has no extra outfit on.'; } }, 'Wear none')
              : h('p', { class: 'muted' }, 'Rimon has no extra outfit on.');
            return h('section', { class: 'card ret-item', 'data-shop': 'rimon-closet' }, h('h2', {}, "Rimon's things"),
              h('p', {}, 'Outfits and accessories Rimon can wear everywhere in the app. Rimon stays Rimon — no he or she. Nothing here draws Hebrew, and nothing new is added to the first install.'),
              ...rows, none);
          })(),
          catalogBlock('Audio packs', SHOP_AUDIO, 'audio', PRICES.audio),
          item('Bonus arcade level', `Opens the next level in arcade games, on top of levels you earn by playing. You hold ${lv} of ${SHOP_LIMITS.gameLevelMax}.`, gemsText(PRICES.gameLevel), gameBtn),
        ];
      })(),
      h('section', { class: 'card' }, h('h2', {}, 'Recent'), rec.gems.ledger.length
        ? h('ul', { class: 'ret-ledger' }, ...rec.gems.ledger.slice(-10).reverse().map((e) => h('li', {}, `${e.d > 0 ? '+' : ''}${e.d} ${whyLabel(e.why)}, ${DAY[new Date(e.at).getDay()]}`)))
        : h('p', { class: 'muted' }, 'Nothing yet. Finish a lesson to earn your first gems.')),
      h('section', { class: 'card ret-numbers' }, h('h2', {}, 'Your Numbers'),
        h('dl', {}, ...[['Total XP', rec.xp.total], ['Lessons finished', done], ['Best streak', daysText(st.best)], ['Streak freezes used', rec.freezes.used.length]]
          .flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, String(v))]))),
      h('details', { class: 'card ret-how' }, h('summary', {}, 'How It All Works'),
        h('ul', {},
          h('li', {}, 'XP: 10 for a lesson, a little more for a sharp one or a run of right answers, 1 for each old card you review. XP is never taken away.'),
          ...streakShort().map((t) => h('li', { 'data-rule': 'streak' }, 'Streak: ' + t)),
          h('li', { 'data-rule': 'hearts' }, 'Hearts: ' + heartsShort()),
          h('li', {}, h('a', { href: '#/app-rules' }, 'Every rule for hearts, streaks, minutes and passing')),
          h('li', {}, 'Gems: earned by learning. They cannot be bought, and there are no ads.'),
          h('li', {}, 'The shop also sells a streak shield, looks, outfits for Rimon, a blessings pack mark, and an extra arcade level. Rimon can also earn a lesson pin and a week badge. Nothing here costs money.'),
          h('li', {}, 'Practice league: the other players are pretend, paced to your own weeks. It is a race against your usual self.'),
          h('li', {}, 'Reminders: one short line from Rimon, only if you say yes, never on Shabbat or holidays, never at night.'),
          h('li', {}, 'Everything stays on this device. Calm mode switches all of it off.'))),
      h('section', { class: 'card ret-switches' }, h('h2', {}, 'Your Choices'),
        calm ? h('p', { class: 'muted' }, 'Calm mode is on, so hearts, the league and reminders are resting.') : null,
        h('div', { class: 'row' },
          sw('Hearts', rec.hearts.enabled !== false, () => R.update((r) => { r.hearts.enabled = r.hearts.enabled === false ? true : false; return r; })),
          sw('Practice league', rec.league.enabled !== false, () => R.update((r) => { r.league.enabled = r.league.enabled === false ? true : false; return r; })),
          sw('Rimon reminders', rec.notify.optedIn, async () => {
            if (rec.notify.optedIn) { R.update((r) => setReminders(r, false)); R.rearm(); return; }
            const p = await R.turnOnReminders(rec.notify.tone); if (p !== 'granted') status.textContent = p === 'unsupported' ? 'This browser cannot show reminders. On iPhone, add Aleph to your Home Screen first.' : 'Reminders are blocked in this browser. You can allow them in the browser settings.';
          }),
          rec.notify.optedIn ? sw('Playful Rimon (for adults)', rec.notify.tone === 'playful', () => { R.update((r) => setReminders(r, true, r.notify.tone === 'playful' ? 'kind' : 'playful')); R.rearm(); }) : null),
        h('p', { class: 'muted' }, 'Reminders only arrive while Aleph is open on this device, or on Android with Aleph installed. Never on Shabbat or holidays. For a reminder that always arrives, add one to your calendar.'),
        rec.notify.optedIn ? h('p', {}, `Rimon usually nudges around ${usualTimeText(rec)}, the time you tend to study.`) : null,
        rec.notify.optedIn ? h('button', { type: 'button', class: 'btn secondary', 'data-k': 'test', onclick: async () => {
          if (isRestQuiet(Date.now(), R.quietOpt())) { status.textContent = 'Reminders rest on Shabbat and holidays. Try again afterwards.'; return; }
          const N = await import('../shell/notify.js'), m = pickMessage({ tier: 'E', sent: R.get().notify.sent, installId: rec.installId, n: st.count });
          const res = await N.showNow('Rimon', m.body, { tag: 'alef-rimon-test', route: '#/shop' });
          status.textContent = res.ok ? 'Test reminder sent. Look for it in your notifications.' : 'This browser did not show the reminder. Check that notifications are allowed for Aleph.';
        } }, 'Send a test reminder') : null,
        h('button', { type: 'button', class: 'btn secondary', 'data-act': 'calendar', 'data-k': 'calendar', onclick: async () => { status.textContent = (await downloadReminder(R)) ? 'Calendar reminder downloaded: Sunday to Thursday, at the time you usually study.' : 'This browser could not make the calendar file.'; } }, 'Add a daily reminder to my calendar')));
    if (focusKey) body.querySelector(`[data-k="${focusKey}"]`)?.focus({ preventScroll: true });
  }
  root.replaceChildren(h('div', { class: 'stack ret-shop alef-retention' }, h('h1', { id: 'view-title', tabindex: '-1' }, 'Shop'), status, body));
  const on = () => { try { draw(); } catch { /* keep the last drawing */ } };
  document.addEventListener('alef:retention', on); applyShopLook(R.get()); draw();
  return () => document.removeEventListener('alef:retention', on);
}
