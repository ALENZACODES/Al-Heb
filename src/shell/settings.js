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
  showUnapprovedImages: false,
  script: 'print',
  theme: 'auto',
  lat: null,
  lon: null,
  goal: 'read',        // read (synagogue) | israel | both; chosen at onboarding, drives the default Learn track
  onboarded: false,    // true once the first-run screen was completed or skipped
  browserVoiceAnyway: true, // let the browser voice (Israeli pronunciation) speak even when another tradition is selected; the UI flags it
  writeGodAsGd: false, // write the English divine name as "G-d" in UI and translation text (names.englishGod); a personal custom, off by default
  haptics: false,      // vibration on exercise feedback (exercises.session.js hapticsOn); opt-in, never under reduced motion
  soundEffects: false, // sound on exercise feedback (exercises.session.js soundOn); opt-in; needs ctx.sfx from the shell
});
export const ENUMS = Object.freeze({
  voice: ['m', 'f'],
  congregation: ['israeli', 'sephardi', 'ashkenazi'],
  script: ['print', 'cursive'],
  theme: ['auto', 'light', 'dark'],
  goal: ['read', 'israel', 'both'],
});

const BOOL_KEYS = new Set(['israelTrack', 'onboarded', 'browserVoiceAnyway', 'showUnapprovedImages', 'writeGodAsGd', 'haptics', 'soundEffects']);

/** @param {string} key @param {any} v @returns {{ok:boolean,value?:any}} */
export function validate(key, v) {
  if (!(key in DEFAULTS)) return { ok: false };
  if (key in ENUMS) return ENUMS[/** @type {keyof typeof ENUMS} */ (key)].includes(v) ? { ok: true, value: v } : { ok: false };
  if (BOOL_KEYS.has(key)) return typeof v === 'boolean' ? { ok: true, value: v } : { ok: false };
  if (key === 'lat') return v === null || (typeof v === 'number' && v >= -90 && v <= 90) ? { ok: true, value: v } : { ok: false };
  if (key === 'lon') return v === null || (typeof v === 'number' && v >= -180 && v <= 180) ? { ok: true, value: v } : { ok: false };
  return { ok: false };
}

/** @param {{get:Function,set:Function}} store */
export function createSettings(store) {
  /** @type {Record<string,any>} */
  let values = { ...DEFAULTS };
  /** stored settings, only valid fields (unknown keys and bad values dropped; old or hand-edited shapes cannot break the app) */
  const readStored = () => {
    const out = {}; let saved = {};
    try { saved = store.get('settings', {}); } catch { saved = {}; }
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) for (const [k, v] of Object.entries(saved)) { const r = validate(k, v); if (r.ok) out[k] = r.value; }
    return out;
  };
  Object.assign(values, readStored());
  /** @type {Set<(all:Record<string,any>, changed:string[])=>void>} */
  const subs = new Set();
  const api = {
    /** @param {string} k */ get: (k) => values[k],
    all: () => ({ ...values }),
    /** @param {Record<string,any>} patch @returns {string[]} rejected keys */
    set(patch) {
      // Multi-tab: start from what is stored NOW (another tab may have written since this tab last looked), so only the fields
      // in this patch change and an unrelated field written by another tab is kept. Same field in two tabs: last write wins.
      values = { ...DEFAULTS, ...readStored() };
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
    reload() { values = { ...DEFAULTS, ...readStored() }; for (const x of subs) { try { x({ ...values }, Object.keys(values)); } catch {} } },
  };
  // another tab changed settings (storage event) or storage was cleared/restored: re-read, never write back
  try { store.subscribe?.((k, _v, info) => { if ((k === 'settings' && info?.external) || k === '*') api.reload(); }); } catch { /* store without subscribe */ }
  // convenience plain getters: settings.voice, settings.congregation, ...
  for (const k of Object.keys(DEFAULTS)) Object.defineProperty(api, k, { get: () => values[k], enumerable: true });
  return api;
}
