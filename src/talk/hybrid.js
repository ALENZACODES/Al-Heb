// @ts-check
// Talk: stored lines first, the translation pack for everything else. No DOM, no storage.
//   1. A line that holds the four-letter Name is held, as before.
//   2. A stored line or a sentence pattern answers at once (checked wording, right gender and number forms).
//   3. Any other line goes to the translation pack when it is on the device.
//   4. Without the pack the stored-line answer stands (a close line, a single word, a word-by-word gist or a refusal),
//      and the result says which pack would answer it, so the screen can offer the download.
import { finishLine } from './nmt/postedit.js';

/** Methods of the phrase engine that are trusted over the model. */
export const FAST_PATH = new Set(['phrase', 'pattern']);
export const MODEL_NOTE_HE = 'Translated on this device by the language pack, not from a checked line. Hebrew “I” and “you” forms come out as said by and to a man unless the line says otherwise.';
export const MODEL_NOTE_EN = 'Translated on this device by the language pack, not from a checked line.';

/**
 * @param {any} engine the phrase engine (src/talk/engine.js)
 * @param {{ready:(direction:string)=>boolean, translate:(direction:string, text:string)=>Promise<string>}|null} pack
 * @param {string} text
 * @param {{direction?:string, speaker?:string, terms?:any}} [opts]
 */
export async function translateLine(engine, pack, text, opts = {}) {
  const r = engine.translate(text, opts);
  if (r.held || (r.ok && (FAST_PATH.has(r.method) || r.method === 'word'))) return r;
  const direction = r.direction;
  if (!pack || !pack.ready(direction)) return { ...r, needsPack: direction };
  let out = '';
  try { out = finishLine(await pack.translate(direction, r.source), r.source, direction, opts.terms); } catch { return { ...r, packFailed: true }; }
  if (!out) return r;
  return { ok: true, direction, source: r.source, translation: out, method: 'model', confidence: 'medium', note: direction === 'en-he' ? MODEL_NOTE_HE : MODEL_NOTE_EN, suggestions: [] };
}
