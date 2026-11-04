// Minimal fake DOM for view tests (no DOM library is available). Shared by the round-4 pronunciation tests.
import fs from 'node:fs';
class Node_ { constructor() { this.children = []; this.parent = null; } }
class Text_ extends Node_ { constructor(d) { super(); this.nodeType = 3; this.data = d; } get textContent() { return this.data; } }
export class El extends Node_ {
  constructor(tag, doc) { super(); this.nodeType = 1; this.tagName = tag.toUpperCase(); this.attrs = {}; this.listeners = {}; this.ownerDocument = doc; this.checked = false; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  append(...kids) { for (const k of kids) { if (typeof k === 'string') this.children.push(new Text_(k)); else { k.parent = this; this.children.push(k); } } }
  replaceChildren(...kids) { this.children = []; this.append(...kids); }
  addEventListener(t, f) { (this.listeners[t] ??= new Set()).add(f); }
  removeEventListener(t, f) { this.listeners[t]?.delete(f); }
  dispatch(t) { for (const f of [...(this.listeners[t] ?? [])]) f({ target: this }); }
  focus() { this.focused = true; }
  get textContent() { return this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { this.children = [new Text_(String(v))]; }
}
class Doc { createElement(t) { return new El(t, this); } createTextNode(s) { return new Text_(s); } }
export const newRoot = () => new El('div', new Doc());
export const walk = (n, f) => { f(n); for (const c of n.children ?? []) walk(c, f); };
export const all = (n, pred) => { const r = []; walk(n, (x) => { if (x.nodeType === 1 && pred(x)) r.push(x); }); return r; };
export const buttons = (n) => all(n, (x) => x.tagName === 'BUTTON');
export const byText = (n, re) => buttons(n).find((b) => re.test(b.textContent));
export const click = (el) => el.dispatch('click');
export const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
export const load = (f) => JSON.parse(fs.readFileSync(new URL(`../data/pronunciation/${f}.json`, import.meta.url), 'utf8'));
export const letters = JSON.parse(fs.readFileSync(new URL('../data/letters/letters.json', import.meta.url), 'utf8'));
export const dataBundle = () => Object.fromEntries(['niqqud', 'consonants', 'dial-words', 'prayerwords', 'stress', 'plene', 'dot-pairs'].map((f) => [f, load(f)]));
export function makeCtx(over = {}) {
  const played = [], misses = [];
  const mem = { 'pron.misses': [] };
  const ctx = {
    settings: { congregation: 'israeli' },
    audio: { has: () => false, play: (k, id) => played.push([k, id]) },
    store: { get: (k, d) => mem[k] ?? d, set: (k, v) => { mem[k] = v; } },
    t: (k) => k, pronunciationData: dataBundle(), letters, random: (() => { let i = 0; return () => ((i = (i * 7 + 3) % 97) / 97); })(),
    ...over,
  };
  return { ctx, played, mem, misses };
}
