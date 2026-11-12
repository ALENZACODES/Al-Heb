// Shared fake-DOM environment for the games-books lane tests (built on tests/wordtrace.fakedom.js, the same extras the game
// tests add: append, replaceChildren, classList, isConnected). Logic and wiring only, not browser rendering.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Doc, El } from './wordtrace.fakedom.js';

export function environment() {
  const doc = new Doc(); globalThis.document = doc;
  El.prototype.append = function (...nodes) { for (const n of nodes) if (n != null) this.appendChild(typeof n === 'object' ? n : doc.createTextNode(String(n))); };
  El.prototype.prepend = function (...nodes) { for (const n of nodes.reverse()) if (n != null) this.insertBefore(typeof n === 'object' ? n : doc.createTextNode(String(n)), this.childNodes[0] || null); };
  El.prototype.replaceChildren = function (...nodes) { this.textContent = ''; this.append(...nodes); };
  El.prototype.remove = function () { this.parentNode?.removeChild(this); };
  El.prototype.closest = function () { return null; };
  Object.defineProperty(El.prototype, 'lastChild', { configurable: true, get() { return this.childNodes[this.childNodes.length - 1] || null; } });
  Object.defineProperty(El.prototype, 'classList', { configurable: true, get() {
    const el = this; const list = () => (el.className || '').split(/\s+/).filter(Boolean);
    return { add: (...c) => { el.className = [...new Set([...list(), ...c])].join(' '); }, remove: (...c) => { el.className = list().filter((x) => !c.includes(x)).join(' '); }, contains: (c) => list().includes(c), toggle: (c, on) => { const has = list().includes(c); const want = on === undefined ? !has : !!on; el.className = want ? [...new Set([...list(), c])].join(' ') : list().filter((x) => x !== c).join(' '); } };
  } });
  Object.defineProperty(El.prototype, 'isConnected', { configurable: true, get: () => true });
  const listeners = new Map();
  globalThis.window = { addEventListener: (k, f) => listeners.set(k, f), removeEventListener: (k, f) => { if (listeners.get(k) === f) listeners.delete(k); } };
  globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {};
  return { doc, root: doc.createElement('main'), listeners };
}
export const fetchFn = async (url) => { const p = String(url).startsWith('file:') ? fileURLToPath(url) : String(url); return { ok: existsSync(p), status: existsSync(p) ? 200 : 404, json: async () => JSON.parse(readFileSync(p, 'utf8')) }; };
export const calm = { get: (k) => (k === 'calmMode' ? true : k === 'soundEffects' ? false : undefined) };
export const memStore = (init = {}) => { const mem = new Map(Object.entries(init)); return { mem, store: { get: (k) => mem.get(k), set: (k, v) => mem.set(k, v) } }; };
export const wait = async (f, n = 400) => { for (let i = 0; i < n && !f(); i++) await new Promise((r) => setTimeout(r, 5)); if (!f()) throw new Error('condition not reached'); };
export const buttons = (el) => el.querySelectorAll('button').filter((b) => !b.disabled && b.getAttribute('disabled') === null);
export const byText = (el, re) => buttons(el).find((b) => re.test(b.textContent));
export const json = (rel) => JSON.parse(readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
export const src = (rel) => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
