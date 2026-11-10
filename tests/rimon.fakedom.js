// Minimal fake DOM for the Rimon companion and stage tests (no DOM library is available). Checks LOGIC, not rendering.
// Supports: elements with attributes, dataset (backed by data-* attributes), classList, hidden, src/alt/id; tree
// operations; events; querySelector(All) for tag, #id, .class, [attr] and [attr=value] compounds (no combinators).
const kebab = (k) => k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const camel = (k) => k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

class Node0 {
  constructor(doc) { this.ownerDocument = doc; this.parentNode = null; this.childNodes = []; this.listeners = {}; }
  get children() { return this.childNodes.filter((c) => c.nodeType === 1); }
  get firstChild() { return this.childNodes[0] || null; }
  get nextSibling() { const p = this.parentNode; if (!p) return null; return p.childNodes[p.childNodes.indexOf(this) + 1] || null; }
  get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === this.ownerDocument; }
  _adopt(c) { if (typeof c === 'string') c = new Text(this.ownerDocument, c); if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; return c; }
  append(...cs) { for (const c of cs) this.childNodes.push(this._adopt(c)); }
  appendChild(c) { this.append(c); return c; }
  prepend(...cs) { this.childNodes.unshift(...cs.map((c) => this._adopt(c))); }
  insertBefore(c, ref) { const n = this._adopt(c); const i = ref ? this.childNodes.indexOf(ref) : -1; if (i < 0) this.childNodes.push(n); else this.childNodes.splice(i, 0, n); return n; }
  removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) { this.childNodes.splice(i, 1); c.parentNode = null; } return c; }
  replaceChildren(...cs) { for (const c of this.childNodes) c.parentNode = null; this.childNodes = []; this.append(...cs); }
  remove() { this.parentNode?.removeChild(this); }
  after(...cs) { const p = this.parentNode; let ref = this.nextSibling; for (const c of cs) p.insertBefore(c, ref); }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  removeEventListener(t, f) { const a = this.listeners[t]; if (a) { const i = a.indexOf(f); if (i >= 0) a.splice(i, 1); } }
  dispatchEvent(e) { for (const f of [...(this.listeners[e.type] || [])]) f(e); return true; }
  get textContent() { return this.childNodes.map((c) => c.textContent).join(''); }
  set textContent(v) { this.replaceChildren(...(v === '' || v == null ? [] : [String(v)])); }
  querySelectorAll(sel) { const out = []; const walk = (n) => { for (const c of n.children) { if (sel.split(',').some((s) => matches(c, s.trim()))) out.push(c); walk(c); } }; walk(this); return out; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}
class Text extends Node0 { constructor(doc, d) { super(doc); this.nodeType = 3; this.data = d; } get textContent() { return this.data; } }

export class El extends Node0 {
  constructor(doc, tag) {
    super(doc); this.nodeType = 1; this.tagName = tag.toUpperCase(); this.attrs = {}; this.style = { setProperty() {} };
    const self = this;
    this.dataset = new Proxy({}, {
      get: (_, k) => self.attrs['data-' + kebab(String(k))],
      set: (_, k, v) => { self.attrs['data-' + kebab(String(k))] = String(v); return true; },
      deleteProperty: (_, k) => { delete self.attrs['data-' + kebab(String(k))]; return true; },
      has: (_, k) => ('data-' + kebab(String(k))) in self.attrs,
      ownKeys: () => Object.keys(self.attrs).filter((a) => a.startsWith('data-')).map((a) => camel(a.slice(5))),
      getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
    });
    this.classList = {
      add: (...c) => { const s = new Set(this.className.split(/\s+/).filter(Boolean)); c.forEach((x) => s.add(x)); this.className = [...s].join(' '); },
      remove: (...c) => { this.className = this.className.split(/\s+/).filter((x) => x && !c.includes(x)).join(' '); },
      toggle: (c, on) => { const has = this.classList.contains(c); const want = on === undefined ? !has : !!on; if (want && !has) this.classList.add(c); if (!want && has) this.classList.remove(c); return want; },
      contains: (c) => this.className.split(/\s+/).includes(c),
    };
  }
  get className() { return this.attrs.class || ''; }
  set className(v) { this.attrs.class = String(v); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  hasAttribute(k) { return k in this.attrs; }
  removeAttribute(k) { delete this.attrs[k]; }
  get id() { return this.attrs.id || ''; } set id(v) { this.attrs.id = String(v); }
  get src() { return this.attrs.src || ''; } set src(v) { this.attrs.src = String(v); }
  get alt() { return this.attrs.alt ?? ''; } set alt(v) { this.attrs.alt = String(v); }
  get href() { return this.attrs.href || ''; } set href(v) { this.attrs.href = String(v); }
  get hidden() { return 'hidden' in this.attrs; } set hidden(v) { if (v) this.attrs.hidden = ''; else delete this.attrs.hidden; }
  get offsetWidth() { return 0; } get offsetHeight() { return 0; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
  focus() { this.ownerDocument.activeElement = this; }
  matches(sel) { return matches(this, sel); }
  closest(sel) { let n = this; while (n && n.nodeType === 1) { if (matches(n, sel)) return n; n = n.parentNode; } return null; }
}

function matches(el, sel) {
  if (el.nodeType !== 1) return false;
  const re = /(#[\w-]+)|(\.[\w-]+)|\[([\w-]+)(?:=["']?([^\]"']*)["']?)?\]|([a-zA-Z][\w-]*)/g;
  let m, any = false;
  while ((m = re.exec(sel))) {
    any = true;
    if (m[1] && el.id !== m[1].slice(1)) return false;
    if (m[2] && !el.classList.contains(m[2].slice(1))) return false;
    if (m[3] && (!el.hasAttribute(m[3]) || (m[4] !== undefined && el.getAttribute(m[3]) !== m[4]))) return false;
    if (m[5] && el.tagName !== m[5].toUpperCase()) return false;
  }
  return any;
}

export function createDocument() {
  const doc = new Node0(null);
  doc.ownerDocument = doc; doc.nodeType = 9; doc.hidden = false; doc.activeElement = null;
  doc.createElement = (tag) => new El(doc, tag);
  doc.createTextNode = (d) => new Text(doc, d);
  doc.body = new El(doc, 'body'); doc.append(doc.body);
  doc.getElementById = (id) => doc.querySelector('#' + id);
  return doc;
}

/** A fake window: events, Image that loads unless the src contains "missing", MutationObserver that never fires. */
export function createWindow() {
  const win = { listeners: {}, location: { hash: '#/' }, navigator: { onLine: true } };
  win.addEventListener = (t, f) => { (win.listeners[t] ||= []).push(f); };
  win.removeEventListener = (t, f) => { const a = win.listeners[t]; if (a) { const i = a.indexOf(f); if (i >= 0) a.splice(i, 1); } };
  win.dispatch = (t) => { for (const f of [...(win.listeners[t] || [])]) f({ type: t }); };
  win.Image = class { set src(v) { this._src = v; queueMicrotask(() => (/missing/.test(v) ? this.onerror?.() : this.onload?.())); } get src() { return this._src; } };
  win.MutationObserver = class { observe() {} disconnect() {} };
  return win;
}

/** A store with the app's get/set/subscribe shape, in memory. */
export function createStore(init = {}) {
  const data = new Map(Object.entries(init)), subs = new Set();
  return {
    get: (k, d = null) => (data.has(k) ? structuredClone(data.get(k)) : d),
    set: (k, v) => { data.set(k, structuredClone(v)); for (const f of subs) f(k, v, {}); },
    subscribe: (f) => { subs.add(f); return () => subs.delete(f); },
    data,
  };
}

export const ev = (type, detail) => ({ type, detail });
export const flush = (ms = 0) => new Promise((r) => setTimeout(r, ms));
