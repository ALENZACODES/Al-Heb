// @ts-check
// Packing progress for "Move to another device" (lane 4, 12 Nov). No server is involved: the package is a file, or a link
// whose progress part sits after "#", which browsers never send to a web server, or a QR code holding that link.
//
// Package bytes, before base64url:  byte 0 = format (1) | byte 1 = flags (bit 0 compressed, bit 1 passphrase-locked)
//   locked:   16-byte salt, 12-byte IV, then AES-GCM ciphertext (key = PBKDF2-SHA-256 of the passphrase, 250,000 rounds)
//   unlocked: the body
// The body is UTF-8 JSON (deflate-raw compressed when the browser has CompressionStream). The JSON is a normal Aleph
// backup object ({app:'alef', schema, data, ...}), so a package and a Settings backup file are read the same way.
// A passphrase protects the package from someone who sees the link; without one, anyone with the link can read it.

export const FORMAT = 1;
export const PBKDF2_ROUNDS = 250_000;
const F_DEFLATE = 1, F_LOCKED = 2;
const te = new TextEncoder(), td = new TextDecoder();

/** @param {Uint8Array} bytes */
export function toBase64Url(bytes) {
  let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/** @param {string} text */
export function fromBase64Url(text) {
  const t = String(text || '').trim().replace(/-/g, '+').replace(/_/g, '/');
  if (!/^[A-Za-z0-9+/]*$/.test(t)) throw new Error('The code has characters that do not belong in it.');
  const bin = atob(t + '='.repeat((4 - (t.length % 4)) % 4));
  const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function through(bytes, stream) {
  const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}
const canDeflate = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';
export const canLock = () => !!globalThis.crypto?.subtle;

async function keyFrom(passphrase, salt) {
  const base = await crypto.subtle.importKey('raw', te.encode(String(passphrase).normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: PBKDF2_ROUNDS, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/**
 * Pack a backup object.
 * @param {object} backup @param {{passphrase?:string}} [o]
 * @returns {Promise<{code:string, bytes:number, jsonBytes:number, compressed:boolean, locked:boolean}>}
 */
export async function pack(backup, o = {}) {
  const json = te.encode(JSON.stringify(backup));
  let body = json, flags = 0;
  if (canDeflate()) { const z = await through(json, new CompressionStream('deflate-raw')); if (z.length < json.length) { body = z; flags |= F_DEFLATE; } }
  let payload = body;
  if (o.passphrase) {
    if (!canLock()) throw new Error('This browser cannot lock a package with a passphrase.');
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFrom(o.passphrase, salt), body));
    payload = new Uint8Array(28 + ct.length); payload.set(salt, 0); payload.set(iv, 16); payload.set(ct, 28);
    flags |= F_LOCKED;
  }
  const all = new Uint8Array(2 + payload.length); all[0] = FORMAT; all[1] = flags; all.set(payload, 2);
  return { code: toBase64Url(all), bytes: all.length, jsonBytes: json.length, compressed: !!(flags & F_DEFLATE), locked: !!(flags & F_LOCKED) };
}

/** Is this code locked with a passphrase? Throws on a code that is not an Aleph package. @param {string} code */
export function isLocked(code) {
  const b = fromBase64Url(code);
  if (b.length < 3 || b[0] !== FORMAT) throw new Error('This is not an Aleph progress code.');
  return !!(b[1] & F_LOCKED);
}

/**
 * Unpack a code. Throws with a plain message on a wrong passphrase or a damaged code.
 * @param {string} code @param {{passphrase?:string}} [o] @returns {Promise<any>} the backup object
 */
export async function unpack(code, o = {}) {
  const b = fromBase64Url(code);
  if (b.length < 3 || b[0] !== FORMAT) throw new Error('This is not an Aleph progress code.');
  const flags = b[1]; let body = b.subarray(2);
  if (flags & F_LOCKED) {
    if (!o.passphrase) throw new Error('This code is locked. Type the passphrase that was set on the other device.');
    if (body.length < 29) throw new Error('This code is cut short.');
    try { body = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: body.subarray(16, 28) }, await keyFrom(o.passphrase, body.subarray(0, 16)), body.subarray(28))); }
    catch { throw new Error('That passphrase does not open this code, or the code was changed or cut short.'); }
  }
  if (flags & F_DEFLATE) {
    if (!canDeflate()) throw new Error('This browser cannot unpack a compressed code. Use the file instead.');
    try { body = await through(body, new DecompressionStream('deflate-raw')); } catch { throw new Error('This code is damaged or cut short.'); }
  }
  try { return JSON.parse(td.decode(body)); } catch { throw new Error('This code is damaged or cut short.'); }
}

/** The link that carries a code. The code is after "#", so it is never sent to a web server. @param {string} base page address without its hash */
export function moveLink(base, code) { return `${String(base).split('#')[0]}#/move?p=${code}`; }
/** Read a code out of a pasted link or a bare code. @param {string} text */
export function codeFromText(text) {
  const t = String(text || '').trim();
  const m = /[?&]p=([A-Za-z0-9_-]+)/.exec(t);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]+$/.test(t) ? t : '';
}
