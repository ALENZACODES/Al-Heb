// @ts-check
// Settings: validated, persisted in the store under key "settings".
// Defaults and rationale:
//  - voice 'f' (Noa): arbitrary starting point; the learner picks and it persists. Both voices are first-class.
//  - congregation 'sephardi': "Sephardi values" is the common pronunciation in American synagogues (contract).
//  - israelTrack false: Torah/prayer reading track is the default; toggle adds the everyday-Israeli track.
//  - gender null: the learner's own grammatical gender for first-person Hebrew forms ('m', 'f' or 'both' = show both forms). Unset by
//    default and never guessed: nothing may fall back to a masculine form. One shared value, read by the gender drill, the Israel view
//    and the pair cards; adopted once from the old per-feature keys (see adoptLegacyGender).
//  - script 'print', theme 'dark' (the dark green and gold look, owner's order 2026-11-08: one look throughout the app; 'auto' still
//    follows the device for anyone who picks it), lat/lon null (candle-lighting location is opt-in).
export const DEFAULTS = Object.freeze({
  voice: 'f',
  congregation: 'sephardi',
  israelTrack: false,
  showUnapprovedImages: false,
  script: 'print',
  theme: 'dark',
  lat: null,
  lon: null,
  gender: null,        // null (not chosen) | 'm' | 'f' | 'both'; see the comment above
  goal: 'read',        // read (synagogue) | israel | both; chosen at onboarding, drives the default Learn track
  onboarded: false,    // true once the first-run screen was completed or skipped
  browserVoiceAnyway: true, // let the browser voice (Israeli pronunciation) speak even when another tradition is selected; the UI flags it
  writeGodAsGd: false, // write the English divine name as "G-d" in UI and translation text (names.englishGod); a personal custom, off by default
  haptics: false,      // vibration on exercise feedback (exercises.session.js hapticsOn); opt-in, never under reduced motion
  soundEffects: true,  // sound on exercise feedback and in games (exercises.session.js soundOn); ON by default (owner decision, Nov 7 2026: silent games read as broken); calm mode and audio-free still force silence; needs ctx.sfx from the shell
  // Calm and reading comfort (src/shell/comfort.js). All off or normal by default; none asks anything about the person.
  calmMode: false,     // no animation, no sound effects, no vibration, no streak or timer pressure; one thing at a time
  shortSession: false, // lessons are shown in small parts (about 2 to 3 minutes each) and your place is saved after every part
  showStreak: true,    // false hides every streak line; progress is never affected
  readFont: 'default', // 'default' (Heebo) | 'clear' (a system font stack; no download)
  lineSpacing: 'normal', // 'normal' | 'relaxed' | 'wide'
  letterSpacing: 'normal', // 'normal' | 'wide' | 'wider' (not applied to Hebrew)
  textSize: 'normal',  // 'normal' | 'large' | 'larger' | 'largest' (steps of the root font size)
  lineLength: 'normal', // 'normal' | 'narrow'
  audioFree: false,    // true = this learner does not use audio: Listen buttons are hidden and listening-only questions are replaced by reading ones (src/shell/audiofree.js)
  veilOptOut: false,   // true = the opening prayer veil never shows; set by the veil's own "Don't show again" button, reversible here in Settings (owner ruling, Nov 7 2026: the veil otherwise stays every-visit)
  // Touch and movement (src/shell/motor.js). Lane: motor and physical.
  targetSize: 'normal', // 'normal' | 'large': bigger buttons, links and fields (CSS variable --tap)
  bottomActions: false, // true = the main buttons of a screen stay at the bottom, within thumb reach
  untimed: false,       // true = no time limit anywhere (Word Sprint has no clock; Record and compare does not stop by itself)
  confirmAnswers: false, // true = choosing an answer only marks it; a "Check answer" button submits it
  keyShortcuts: true,   // false = the single-key shortcuts (1 to 4, S) are off
  clipRate: 'normal',  // 'normal' (1×) or 'slow' (0.7×) for the shared play control. Not a voice change.
  echoMode: false,     // true = after a letter, vowel, syllable or word plays, it plays again slowly and then leaves a silent turn for you to say it (src/audio/player.js echo)
  // Optional game music bar (src/audio/music.js via src/app.js). Before these keys existed set() rejected every music field, so a
  // learner's on/off, mute, volume and track were never saved. Off by default; the track is an id from GAME_TRACKS ('' = first).
  gameMusic: false, gameMusicMuted: false, gameMusicVolume: 0.22, gameMusicTrack: '', gameMusicPicked: false,
});
export const ENUMS = Object.freeze({
  voice: ['m', 'f'],
  congregation: ['israeli', 'sephardi', 'ashkenazi'],
  script: ['print', 'cursive'],
  theme: ['auto', 'light', 'dark', 'contrast', 'contrast-dark'], // 'contrast' = black on white, 'contrast-dark' = white on black (high-contrast options)
  goal: ['read', 'israel', 'both'],
  readFont: ['default', 'clear'],
  lineSpacing: ['normal', 'relaxed', 'wide'],
  letterSpacing: ['normal', 'wide', 'wider'],
  textSize: ['normal', 'large', 'larger', 'largest'],
  lineLength: ['normal', 'narrow'],
  targetSize: ['normal', 'large'],
  clipRate: ['normal', 'slow'],
});
export const GENDER_VALUES = Object.freeze(['m', 'f', 'both']);

const BOOL_KEYS = new Set(['israelTrack', 'onboarded', 'browserVoiceAnyway', 'showUnapprovedImages', 'writeGodAsGd', 'haptics', 'soundEffects', 'calmMode', 'shortSession', 'showStreak', 'audioFree', 'veilOptOut', 'bottomActions', 'untimed', 'confirmAnswers', 'keyShortcuts', 'echoMode', 'gameMusic', 'gameMusicMuted', 'gameMusicPicked']);

/** @param {string} key @param {any} v @returns {{ok:boolean,value?:any}} */
export function validate(key, v) {
  if (!(key in DEFAULTS)) return { ok: false };
  if (key in ENUMS) return ENUMS[/** @type {keyof typeof ENUMS} */ (key)].includes(v) ? { ok: true, value: v } : { ok: false };
  if (BOOL_KEYS.has(key)) return typeof v === 'boolean' ? { ok: true, value: v } : { ok: false };
  if (key === 'gender') return v === null || GENDER_VALUES.includes(v) ? { ok: true, value: v } : { ok: false };
  if (key === 'gameMusicVolume') return typeof v === 'number' && v >= 0 && v <= 1 ? { ok: true, value: v } : { ok: false };
  if (key === 'gameMusicTrack') return typeof v === 'string' && v.length <= 64 && /^[\w:-]*$/.test(v) ? { ok: true, value: v } : { ok: false };
  if (key === 'lat') return v === null || (typeof v === 'number' && v >= -90 && v <= 90) ? { ok: true, value: v } : { ok: false };
  if (key === 'lon') return v === null || (typeof v === 'number' && v >= -180 && v <= 180) ? { ok: true, value: v } : { ok: false };
  return { ok: false };
}

/**
 * One-time adoption of the learner's gender from the older per-feature keys, in this order of trust:
 *  1. gender.v1 .speaker (gender drill; may be 'both')   2. curriculum.gender .iAm (pair cards; explicit tap)
 *  3. israel.prefs .iAm, only when it is 'f' (the Israel view saved 'm' as an untouched default, so an 'm' there is not a choice).
 * Returns 'm' | 'f' | 'both' | null. Reads only; the old keys are left as they are.
 * @param {{get:Function}} store
 */
export function adoptLegacyGender(store) {
  const read = (k) => { try { return store.get(k, null); } catch { return null; } };
  const a = read('gender.v1'); if (a && typeof a === 'object' && GENDER_VALUES.includes(a.speaker)) return a.speaker;
  const b = read('curriculum.gender'); if (b && typeof b === 'object' && (b.iAm === 'm' || b.iAm === 'f')) return b.iAm;
  const c = read('israel.prefs'); if (c && typeof c === 'object' && c.iAm === 'f') return 'f';
  return null;
}
/** The shared learner gender from a view ctx: 'm' | 'f' | 'both' | null (not chosen, or no settings object). @param {any} ctx */
export function learnerGender(ctx) {
  const v = typeof ctx?.settings?.get === 'function' ? ctx.settings.get('gender') : null;
  return GENDER_VALUES.includes(v) ? v : null;
}
/** Save the shared learner gender. Returns false when the ctx has no settings object (callers may then keep a local copy). @param {any} ctx @param {'m'|'f'|'both'|null} v */
export function setLearnerGenderSetting(ctx, v) {
  if (typeof ctx?.settings?.set !== 'function') return false;
  return ctx.settings.set({ gender: v }).length === 0;
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
    // learner gender: when the stored settings have no 'gender' key at all (first run of this version, or an older backup just restored),
    // adopt it from the old keys. An explicit null (the learner reset it) is a stored choice and is not overridden.
    if (!('gender' in out) && !(saved && typeof saved === 'object' && 'gender' in saved)) { const g = adoptLegacyGender(store); if (g) { out.gender = g; adopted = true; } }
    return out;
  };
  let adopted = false;
  const persistAdopted = () => { if (adopted) { adopted = false; try { store.set('settings', { ...values }); } catch { /* best effort */ } } };
  Object.assign(values, readStored());
  persistAdopted();
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
    reload() { values = { ...DEFAULTS, ...readStored() }; persistAdopted(); for (const x of subs) { try { x({ ...values }, Object.keys(values)); } catch {} } },
  };
  // another tab changed settings (storage event) or storage was cleared/restored: re-read, never write back
  try { store.subscribe?.((k, _v, info) => { if ((k === 'settings' && info?.external) || k === '*') api.reload(); }); } catch { /* store without subscribe */ }
  // convenience plain getters: settings.voice, settings.congregation, ...
  for (const k of Object.keys(DEFAULTS)) Object.defineProperty(api, k, { get: () => values[k], enumerable: true });
  return api;
}
