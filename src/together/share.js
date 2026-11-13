// @ts-check
// Shared by the "together without accounts" pages (R1 to R10): small pieces of text carried between devices by link, QR code
// or file. No server. Everything that arrives is treated as untrusted text: checked, cut to length and shown as plain text.
import { toBase64Url, fromBase64Url } from '../sync/transfer.js';
import { maskName } from '../talk/nmt/postedit.js';

export const NAME_MAX = 20, NOTE_MAX = 200;
/** One line of plain text, cut to length. The divine Name is shown as ה׳, as everywhere in Aleph. */
export function cleanText(raw, max = NAME_MAX) {
  // eslint-disable-next-line no-control-regex
  const s = String(raw ?? '').replace(/[\u0000-\u001f\u007f‎‏‪-‮⁦-⁩]/g, ' ').replace(/\s+/g, ' ').trim();
  return maskName([...s].slice(0, max).join('')).trim();
}
export const nat = (v, max = 9_999_999) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0; };

/** A small object as a link-safe code. */
export const packObject = (o) => toBase64Url(new TextEncoder().encode(JSON.stringify(o)));
/** The object in a code, or null. Refuses anything that is not a small JSON object of the expected kind. */
export function unpackObject(code, kind, maxChars = 6000) {
  try {
    const text = String(code || '').trim();
    if (!text || text.length > maxChars || !/^[A-Za-z0-9_-]+$/.test(text)) return null;
    const o = JSON.parse(new TextDecoder().decode(fromBase64Url(text)));
    return o && typeof o === 'object' && !Array.isArray(o) && o.k === kind && o.v === 1 ? o : null;
  } catch { return null; }
}
/** The app's own address without the route, for links that open on another device. */
export const appBase = (loc = globalThis.location) => { try { return String(loc.href).split('#')[0]; } catch { return ''; } };
/** The value of one query name in pasted text that may be a whole link, or the text itself. */
export function fromPasted(text, name) {
  const s = String(text || '').trim();
  const m = new RegExp(`[?&]${name}=([^&#\\s]+)`).exec(s);
  return m ? decodeURIComponent(m[1]) : s;
}
/** Local time of the Sunday that starts the week of `now`. */
export function weekStart(now = Date.now()) { const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return d.getTime(); }
export const toMs = (v) => (typeof v === 'number' ? v : typeof v === 'string' ? Date.parse(v) : NaN);
