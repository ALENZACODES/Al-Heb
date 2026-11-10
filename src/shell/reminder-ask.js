// The one place ALEF offers reminders unprompted: a small card after the learner's FIRST lesson win (First day finish or
// the first lesson-complete card). Never on first load, never twice: the answer is kept under store key "notify.asked".
// Permission is requested only from the Yes button's click. Fail-safe: no card where notifications are unsupported,
// already decided (granted/denied), or the learner already answered.
import { h } from './ui.js';
export const ASK_KEY = 'notify.asked';

/** Pure: should the card show? */
export function shouldAsk({ asked, prefs, permission, supported }) {
  if (!supported) return false;
  if (asked) return false;
  if (prefs?.enabled) return false;
  return permission === 'default';
}

/** A reminder hour near the time the learner studies now, inside 8:00-20:00 (never in quiet hours). */
export const hourFor = (date) => Math.min(20, Math.max(8, date.getHours()));

/**
 * Returns a card element, or null. Async because it reads the store; mount the returned node where it lands.
 * @param {{store:{get:Function,set:Function}}} ctx
 */
export async function reminderAskCard(ctx, { g = globalThis, now = () => new Date() } = {}) {
  try {
    const N = await import('./notify.js');
    const st = N.status(g);
    const asked = await ctx?.store?.get?.(ASK_KEY);
    const prefs = N.normalizePrefs(await ctx?.store?.get?.(N.NOTIFY_PREFS_KEY));
    if (!shouldAsk({ asked, prefs, permission: st.permission, supported: st.supported })) return null;
    const status = h('p', { class: 'muted small', role: 'status', 'aria-live': 'polite' });
    const mark = (answer) => { try { ctx.store.set(ASK_KEY, { at: now().toISOString(), answer }); } catch { /* best effort */ } };
    const yes = h('button', { type: 'button', class: 'btn', id: 'remind-ask-yes', onclick: async () => {
      yes.disabled = true;
      const p = await N.requestPermission(g);
      mark(p === 'granted' ? 'yes' : p);
      if (p === 'granted') {
        try { await ctx.store.set(N.NOTIFY_PREFS_KEY, N.normalizePrefs({ ...prefs, enabled: true, hour: hourFor(now()), minute: 0 })); } catch { /* best effort */ }
        try { await N.armFromPrefs(ctx); } catch { /* best effort */ }
        status.textContent = `Deal! Rimon will nudge you around ${hourFor(now())}:00, never on Shabbat or festivals. Change it any time in Study reminders.`;
      } else status.textContent = 'No problem. Reminders stay off. You can turn them on later in Study reminders.';
      card.querySelector?.('.remind-ask-row')?.remove?.();
    } }, 'Yes, nudge me');
    const no = h('button', { type: 'button', class: 'btn secondary', id: 'remind-ask-no', onclick: () => { mark('no'); status.textContent = 'Got it. No reminders. Study reminders in More can turn them on later.'; card.querySelector?.('.remind-ask-row')?.remove?.(); } }, 'Not now');
    const card = h('section', { class: 'card remind-ask', 'aria-labelledby': 'remind-ask-h' },
      h('p', { class: 'remind-ask-title', id: 'remind-ask-h' }, '🍎 Want Rimon to nudge you tomorrow?'),
      h('p', { class: 'muted' }, 'One friendly reminder a day at most. Quiet at night, on Shabbat and on festivals. Off with one tap.'),
      h('div', { class: 'row remind-ask-row' }, yes, no),
      status);
    return card;
  } catch { return null; }
}

/** Convenience: append the card into host when it applies. Never throws. */
export function offerReminders(host, ctx, opts) {
  try { reminderAskCard(ctx, opts).then((c) => { if (c && host?.isConnected !== false) host.append(c); }).catch(() => {}); } catch { /* optional */ }
}
