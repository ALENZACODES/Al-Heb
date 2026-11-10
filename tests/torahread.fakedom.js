// Minimal fake DOM for the torahread view tests (no DOM library exists here). Checks view logic, NOT browser rendering.
export class N {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.className = ''; this.parent = null; this.focused = false; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...kids) { for (const k of kids) { const n = typeof k === 'string' ? { nodeType: 3, data: k } : k; if (n && n.nodeType === 1) n.parent = this; this.children.push(n); } }
  replaceChildren(...kids) { this.children = []; this.append(...kids); }
  prepend(...kids) { this.children.unshift(...kids); }
  focus() { this.focused = true; globalThis.__focus = this; }
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v) }]; }
  get textContent() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.textContent)).join(''); }
  get isButton() { return this.tag === 'button'; }
  all(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.all(pred, out); return out; }
  matches(compound) {
    const re = /(^[a-z0-9]+)|#([\w-]+)|\.([\w-]+)|\[([\w-]+)(?:="([^"]*)")?\]/g; let m;
    while ((m = re.exec(compound))) {
      if (m[1] && this.tag !== m[1]) return false;
      if (m[2] && this.attrs.id !== m[2]) return false;
      if (m[3] && !(` ${this.className} `).includes(` ${m[3]} `)) return false;
      if (m[4] && (m[5] === undefined ? !(m[4] in this.attrs) : this.attrs[m[4]] !== m[5])) return false;
    }
    return true;
  }
  queryAll(sel) {
    const parts = sel.trim().split(/\s+/);
    let cur = [this];
    for (const p of parts) { const next = []; for (const c of cur) for (const k of c.children) if (k.nodeType === 1) k.all((n) => n.matches(p), next); cur = [...new Set(next)]; }
    return cur;
  }
  querySelector(sel) { return this.queryAll(sel)[0] || null; }
  async fire(type, ev = {}) { for (const f of this.listeners[type] || []) await f({ target: this, preventDefault() {}, ...ev }); }
  click() { return this.fire('click'); }
}
globalThis.document = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }) };
globalThis.window = { scrollY: 0, scrollTo() {} };
export const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));
export const btn = (root, re) => root.all((n) => n.tag === 'button' && re.test(n.textContent))[0];
export const memStore = () => { const m = {}; return { m, get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); } }; };
