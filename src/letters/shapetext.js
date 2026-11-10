// Text equivalents for Hebrew items in exercises, for a screen reader. Pure functions, no DOM.
// A lone letter or a pointed word is often read wrongly or not at all by a screen reader without a Hebrew voice. In an exercise the item is the
// question, so its text equivalent must not give the answer away: a letter gets the description of its SHAPE (from data/letters/mnemonics.json,
// with the letter's own name masked); a word gets its respelling. Nothing here is spoken for a sighted user.
// @ts-check
import { respell } from '../pronunciation/forTradition.js';

/** Hide the letter's own name (and a trailing "final" form name) inside a shape sentence. */
export function maskName(text, name) {
  let out = String(text || '');
  const base = String(name || '').replace(/^final\s+/i, '').trim();
  for (const n of new Set([name, base].filter(Boolean))) out = out.replace(new RegExp('\\b' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'), 'this letter');
  return out;
}

/** "Hebrew letter. Shape: ..." for a letter, or '' when there is no shape text. @param {{name?:string}|null} letter @param {{shape?:string}|null} mn */
export function shapeLabel(letter, mn) {
  const shape = mn && typeof mn.shape === 'string' ? mn.shape.trim() : '';
  if (!shape) return '';
  const s = maskName(shape, letter && letter.name);
  return 'Hebrew letter. Shape: ' + (/[.!?]$/.test(s) ? s : s + '.');
}

/** "Hebrew word. Sounds like: shav." or '' when no respelling can be made. */
export function wordLabel(he, tradition) {
  let r = ''; try { r = respell(he, tradition) || ''; } catch { r = ''; }
  return r ? 'Hebrew word. Sounds like: ' + r + '.' : '';
}
