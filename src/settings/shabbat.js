// @ts-check
// Shabbat-safe mode: one check for every language pack and every lane (alef-tools docs/CONTRACT.md, section 6).
// It reuses the app's existing logic and adds nothing of its own: src/retention/quiet.js isRestQuiet, which is the fixed
// Friday 18:00 to Saturday 21:00 rule, the same hours around every Yom Tov day, and candle lighting to havdalah when the
// learner has set a city. While it is on: nothing downloads by itself, no notification is shown, the torch stays off.
// What the learner starts by hand still works.
import { loader } from './alef-tools.generated.js';
import { isRestQuiet } from '../retention/quiet.js';
import { resolveQuietLocation } from '../shell/notify.js';
import { normalizeRecord } from '../curriculum/streak.js';

/** The learner's city (when set) and observance, as the reminders use them. */
const opt = { loc: /** @type {any} */ (null), mode: 'reform' };

// Registered as soon as this module loads. Until a screen calls armShabbatCheck there is no city: the fixed hours apply.
loader.setShabbatCheck((now) => isRestQuiet(now, opt));

/**
 * Reads the learner's city and observance once a screen has the store. Safe to call on every mount.
 * @param {{store?:{get:Function}, settings?:{get:Function}}} [ctx]
 */
export async function armShabbatCheck(ctx) {
  try { const rec = ctx?.store?.get ? await ctx.store.get('streak') : null; opt.mode = normalizeRecord(rec).mode || 'reform'; } catch { /* keep the default */ }
  try { opt.loc = await resolveQuietLocation(ctx || {}); } catch { opt.loc = null; }
  return { ...opt };
}

/** True on Shabbat or Yom Tov. @param {number} [now] */
export const isShabbatSafeMode = (now = Date.now()) => loader.isShabbatSafeMode(now);

/** May this start now? Downloads only when the learner started them; notifications and the torch never, while the mode is on. */
export const allowed = (/** @type {'download'|'notify'|'torch'} */ action, opts = {}) => loader.allowed(action, opts);
