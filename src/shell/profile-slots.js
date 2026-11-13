// @ts-check
// Household profiles (R2) and guest mode (R3): slots on this device, no accounts, no sync.
// The learner in use always lives under the app's normal "alef:" keys, so every screen works unchanged. Everyone else is
// parked under "alefp:<id>:". Switching moves keys one at a time (no second copy, so no extra space is needed), with a note
// of where it got to, so a switch that is cut short is finished the next time the app opens.
// This file is part of the first install and stays small; the Profiles page (src/together/) is loaded on demand.
export const REG_KEY = 'alef-profiles';
export const LIVE = 'alef:';
export const GUEST = 'guest';
export const GUEST_HOURS = 12;
/** Keys that describe this device, not a learner: they stay where they are. */
const DEVICE = new Set(['__meta', 'install.v1', 'alef.storage-notice.v1', 'notify.asked']);
export const parked = (id) => `alefp:${id}:`;
const ls = () => { try { return globalThis.localStorage || null; } catch { return null; } };

/** The household list. Before anyone adds a profile there is one learner and nothing is stored. */
export function readReg(s = ls()) {
  try { const r = JSON.parse(s?.getItem(REG_KEY) || 'null'); if (r && r.v === 1 && Array.isArray(r.list) && r.list.length && typeof r.active === 'string') return r; } catch { /* unreadable: start again */ }
  return { v: 1, active: 'p1', list: [{ id: 'p1', name: 'Learner 1', at: 0 }] };
}
export const writeReg = (reg, s = ls()) => { s.setItem(REG_KEY, JSON.stringify(reg)); };

const names = (s, prefix) => { const out = []; for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k && k.startsWith(prefix)) out.push(k); } return out; };
const mine = (s) => names(s, LIVE).filter((k) => !DEVICE.has(k.slice(LIVE.length)));
function move(s, from, to) { const v = s.getItem(from); if (v != null) s.setItem(to, v); s.removeItem(from); }
/** Live keys of the learner in use, moved into the slot `id`. */
export function park(s, id) { for (const k of mine(s)) move(s, k, parked(id) + k.slice(LIVE.length)); }
/** The slot `id`, moved into the live keys. */
export function unpark(s, id) { const p = parked(id); for (const k of names(s, p)) move(s, k, LIVE + k.slice(p.length)); }
/** Deletes the live keys of the learner in use. */
export function dropLive(s) { for (const k of mine(s)) s.removeItem(k); }
/** Deletes a parked slot. */
export function dropSlot(s, id) { for (const k of names(s, parked(id))) s.removeItem(k); }

/** Makes `to` the learner in use. The caller reloads the page afterwards. */
export function switchTo(to, s = ls()) {
  const reg = readReg(s);
  if (to === reg.active) return reg;
  reg.pending = { from: reg.active, to, phase: 'park' }; writeReg(reg, s);
  return finish(reg, s);
}
function finish(reg, s) {
  const p = reg.pending;
  if (p.phase === 'park') { park(s, p.from); p.phase = 'unpark'; writeReg(reg, s); }
  unpark(s, p.to);
  reg.active = p.to; delete reg.pending; writeReg(reg, s);
  return reg;
}

/** Ends a guest session. Nothing the guest did is kept; the learner who was in use before comes back. */
export function endGuest(s = ls()) {
  const reg = readReg(s);
  if (reg.active !== GUEST) return reg;
  dropLive(s); dropSlot(s, GUEST);
  const prev = reg.guest?.prev || reg.list[0].id;
  delete reg.guest; reg.active = GUEST; // so the switch below has a "from" with nothing left to park
  writeReg(reg, s);
  return switchTo(prev, s);
}

/**
 * Runs once when the app starts, before anything reads saved data: finishes a switch that was cut short, ends a guest
 * session left open for more than 12 hours, shows a small "Guest session" marker, and reloads this tab when another tab
 * switches learner (otherwise this tab would keep writing one learner's progress into another's).
 */
export function bootProfiles(s = ls(), g = /** @type {any} */ (globalThis)) {
  if (!s) return;
  try {
    if (!s.getItem(REG_KEY)) return; // one learner, never switched: nothing to do
    let reg = readReg(s);
    if (reg.pending) reg = finish(reg, s);
    if (reg.active === GUEST && Date.now() - (reg.guest?.at || 0) > GUEST_HOURS * 3600000) reg = endGuest(s);
    g.addEventListener?.('storage', (e) => { if (e.key === REG_KEY) g.location?.reload?.(); });
    const d = g.document;
    if (reg.active === GUEST && d?.body) {
      const a = d.createElement('a');
      a.href = '#/profiles'; a.id = 'alef-guest-chip'; a.textContent = 'Guest session. Tap to end or keep.';
      a.setAttribute('style', 'position:fixed;inset-block-start:.25rem;inset-inline-start:50%;transform:translateX(-50%);z-index:9999;background:#1b1b1b;color:#fff;padding:.3rem .8rem;border-radius:1rem;font-size:.9rem;text-decoration:underline');
      d.body.append(a);
    }
  } catch { /* storage blocked or full: the app opens as one learner */ }
}
