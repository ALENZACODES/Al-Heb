// @ts-check
// Vowel marks and a sound line for any Hebrew text, on this device. No DOM here.
// The work is done by the vendored alef-tools nikud package and the shared pack loader (assets/vendor/_alef-tools/, pinned in
// nikud.lock.json). The two language packs are large and optional: nothing is fetched until the learner presses a button,
// every part is checked against its SHA-256, each pack has its own cache, and both can be removed.
// This file joins that package to the app: where packs are looked for, the app's own runtime files and its tradition rules.
import { loader, nikud, NIKUD_FOLDER } from './vendor.js';
import { respell } from '../pronunciation/forTradition.js';

/** Where a pack is looked for, in order: this site (only when a deploy carries it), then the project's static pack host. */
export const PACK_BASES = Object.freeze([new URL('../../assets/vendor/_packs/', import.meta.url).href, 'https://alenzacodes.github.io/alef-packs/']);
export const ORT_BASE = new URL('../../assets/vendor/_ort/', import.meta.url).href;
export const PACK_NAMES = Object.freeze(/** @type {('nikud'|'phonemes')[]} */ ([...nikud.packs]));
/** Both packs want a computer or a recent phone: the loader refuses a device that reports less memory than this. */
const DEVICE = Object.freeze({ webgpu: false, minRamGB: 4 });
const env = (o = {}) => ({ bases: [...PACK_BASES], gpu: false, ...o });

/** True when this browser can keep and run a pack at all. */
export const canRunPacks = (g = globalThis) => typeof g.Worker === 'function' && typeof g.caches !== 'undefined' && typeof g.WebAssembly === 'object';

/**
 * What is on this device for one pack: {ready, have, total, missing} in bytes. Rejects (code `no-pack-list`) when the pack
 * is not published anywhere this copy of the app can reach.
 * @param {'nikud'|'phonemes'} name @param {any} [o]
 */
export const packInfo = (name, o) => loader.packState(name, env(o));

/**
 * Downloads a pack. Only ever called from a button the learner pressed, and says so to the loader, which still refuses on a
 * mobile connection (unless the learner allowed it), a full disk or a device with too little memory.
 * @param {'nikud'|'phonemes'} name @param {{onProgress?:(have:number,total:number)=>void, signal?:AbortSignal}} [o]
 */
export const getPack = (name, o = {}) => loader.downloadPack(name, env({ ...o, userStarted: true, device: DEVICE }));

/** Removes one pack from this device. @param {'nikud'|'phonemes'} name @param {any} [o] */
export async function dropPack(name, o) { await nikud.unload(); return loader.removePack(name, o); }

/** True when the pack is wholly on this device. Looks only at this device's storage: no network request. */
export const hasPack = (name, o = {}) => nikud.onDevice({ loader, pack: name, ...o });

/** Text worth offering vowel marks for: it has Hebrew letters and at least one word without points. */
export function wantsMarks(text) {
  const t = String(text ?? '');
  if (!nikud.hasHebrew(t)) return false;
  return (t.match(/[\u05d0-\u05ea][\u05d0-\u05ea\u0591-\u05c7]*/g) || []).some((w) => !nikud.hasPoints(w));
}

/** The working API of one pack, or null when it is not on the device or cannot start here. */
async function use(pack, o = {}) {
  try { return await nikud.load({ loader, pack, ortBase: ORT_BASE, ...o }); } catch { return null; }
}

/**
 * Vowel marks, and when the sound pack is on the device a sound line too, for one text.
 * The divine Name is written as he + geresh and such a text never gets a sound line.
 * @param {string} text @param {{tradition?:string, load?:any}} [o] load: extra options for the package's load (tests)
 * @returns {Promise<{text:string, name:boolean, phonemes:string|null, soundsLike:string|null, marked:boolean}>}
 *   phonemes: everyday Israeli sounds with the stress sign; soundsLike: the line written the way the chosen tradition says it.
 */
export async function addMarks(text, o = {}) {
  const g = nikud.guardName(text);
  let out = { text: g.text, name: g.found, phonemes: /** @type {string|null} */ (null), soundsLike: /** @type {string|null} */ (null), marked: false };
  const marks = await use('nikud', o.load);
  if (marks) {
    const r = await marks.point(text);
    out = { ...out, text: r.text, name: r.name || g.found, marked: r.changed || nikud.hasPoints(r.text) };
  }
  if (!out.name) {
    const sounds = await use('phonemes', o.load);
    const s = sounds ? await sounds.sounds(out.marked ? out.text : text) : null;
    if (s && s.phonemes) {
      out.phonemes = s.phonemes;
      if (!out.marked) { out.text = s.text; out.marked = nikud.hasPoints(s.text); }
      try { out.soundsLike = respell(s.text, o.tradition || 'israeli') || null; } catch { out.soundsLike = null; }
    }
  }
  return out;
}

/** Build-time vowel marks for the app's own lines (one small file per unit, fetched when first asked for). */
let units = null;
export function builtUnits() { return (units ||= nikud.createUnits(new URL('nikud/', NIKUD_FOLDER).href)); }
export const SOURCE_NOTE = nikud.SOURCE_NOTE;
export const megabytes = loader.megabytes;
export const errorCode = loader.codeOf;
