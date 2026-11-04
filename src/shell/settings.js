// @ts-check
// Settings: validated, persisted in the store under key "settings".
// Defaults and rationale:
//  - voice 'f' (Noa): arbitrary starting point; the learner picks and it persists. Both voices are first-class.
//  - congregation 'sephardi': "Sephardi values" is the common pronunciation in American synagogues (contract).
//  - israelTrack false: Torah/prayer reading track is the default; toggle adds the everyday-Israeli track.
//  - script 'print', theme 'auto', lat/lon null (candle-lighting location is opt-in).
export const DEFAULTS = Object.freeze({
  voice: 'f',
  congregation: 'sephardi',
  israelTrack: false,
  script: 'print',
  theme: 'auto',
  lat: null,
  lon: null,
  goal: 'read',        // read (synagogue) | israel | both; chosen at onboarding, drives the default Learn track
  onboarded: false,    // true once the first-run screen was completed or skipped
  browserVoiceAnyway: true, // let the browser voice (Israeli pronunciation) speak even when another tradition is selected; the UI flags it
});
export const ENUMS = Object.freeze({
  voice: ['m', 'f'],
  congregation: ['israeli', 'sephardi', 'ashkenazi'],
  script: ['print', 'cursive'],
  theme: ['auto', 'light', 'dark'],
  goal: ['read', 'israel', 'both'],
});

/** @param {string} key @param {any} v @returns {{ok:boolean,value?:any}} */
export function validate(key, v) {
  if (!(key in DEFAULTS)) return { ok: false };
  if (key in ENUMS) return ENUMS[/** @type {keyof typeof ENUMS} */ (key)].includes(v) ? { ok: true, value: v } : { ok: false };
  if (key === 'israelTrack' || key === 'onboarded' || key === 'browserVoiceAnyway') return typeof v === 'boolean' ? { ok: true, value: v } : { ok: false };
  if (key === 'lat') return v === null || (typeof v === 'number' && v >= -90 && v <= 90) ? { ok: true, value: v } : { ok: false };
  if (key === 'lon') return v === null || (typeof v === 'number' && v >= -180 && v <= 180) ? { ok: true, value: v } : { ok: false };
  return { ok: false };
}

/** @param {{get:Function,set:Function}} store */
export function createSettings(store) {
  /** @type {Record<string,any>} */
  let values = { ...DEFAULTS };
  const saved = store.get('settings', {});
  if (saved && typeof saved === 'object') for (const [k, v] of Object.entries(saved)) { const r = validate(k, v); if (r.ok) values[k] = r.value; }
  /** @type {Set<(all:Record<string,any>, changed:string[])=>void>} */
  const subs = new Set();
  const api = {
    /** @param {string} k */ get: (k) => values[k],
    all: () => ({ ...values }),
    /** @param {Record<string,any>} patch @returns {string[]} rejected keys */
    set(patch) {
      const rejected = []; const changed = [];
      for (const [k, v] of Object.entries(patch)) {
        const r = validate(k, v);
        if (!r.ok) { rejected.push(k); continue; }
        if (values[k] !== r.value) { values[k] = r.value; changed.push(k); }
      }
      if (changed.length) { store.set('settings', values); for (const s of subs) { try { s({ ...values }, changed); } catch {} } }
      return rejected;
    },
    reset() { api.set({ ...DEFAULTS }); },
    /** @param {(all:Record<string,any>, changed:string[])=>void} fn */
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    /** Re-read from store (after backup import). */
    reload() { const s = store.get('settings', {}); values = { ...DEFAULTS }; for (const [k, v] of Object.entries(s || {})) { const r = validate(k, v); if (r.ok) values[k] = r.value; } for (const x of subs) { try { x({ ...values }, Object.keys(values)); } catch {} } },
  };
  // convenience plain getters: settings.voice, settings.congregation, ...
  for (const k of Object.keys(DEFAULTS)) Object.defineProperty(api, k, { get: () => values[k], enumerable: true });
  return api;
}
