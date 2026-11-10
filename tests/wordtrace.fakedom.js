// Minimal fake DOM for the word-tracing view tests (no DOM library is available). Checks view LOGIC, not browser rendering.
class TextNode { constructor(d) { this.nodeType = 3; this.data = d; this.parentNode = null; } get textContent() { return this.data; } }
export class El {
  constructor(tag, doc, ns) {
    this.nodeType = 1; this.tagName = ns ? tag : tag.toUpperCase(); this.namespaceURI = ns || 'http://www.w3.org/1999/xhtml';
    this.attrs = {}; this.listeners = {}; this.ownerDocument = doc; this.childNodes = []; this.parentNode = null; this.style = {}; this.className = ''; this.checked = false; this.focused = false;
  }
  get children() { return this.childNodes.filter(c => c.nodeType === 1); }
  get firstChild() { return this.childNodes[0] || null; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k === 'class' ? (this.className || null) : (k in this.attrs ? this.attrs[k] : null); }
  hasAttribute(k) { return this.getAttribute(k) !== null; }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.childNodes.push(c); return c; }
  insertBefore(c, ref) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; const i = ref ? this.childNodes.indexOf(ref) : -1; if (i < 0) this.childNodes.push(c); else this.childNodes.splice(i, 0, c); return c; }
  removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) { this.childNodes.splice(i, 1); c.parentNode = null; } return c; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  removeEventListener(t, f) { const a = this.listeners[t]; if (a) { const i = a.indexOf(f); if (i >= 0) a.splice(i, 1); } }
  dispatch(t, ev = {}) { const e = Object.assign({ type: t, target: this, preventDefault() {} }, ev); for (const f of [...(this.listeners[t] || [])]) f(e); }
  click() { this.dispatch('click'); }
  focus() { this.focused = true; if (this.ownerDocument) this.ownerDocument.activeElement = this; }
  setPointerCapture() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 1000 }; }
  get textContent() { return this.childNodes.map(c => c.textContent).join(''); }
  set textContent(v) { for (const c of this.childNodes) c.parentNode = null; this.childNodes = v === '' || v == null ? [] : [Object.assign(new TextNode(String(v)), { parentNode: this })]; }
  matches(sel) { return matchCompound(this, sel); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  querySelectorAll(sel) { const out = []; const walk = (n) => { for (const c of n.children) { if (matchCompound(c, sel)) out.push(c); walk(c); } }; walk(this); return out; }
}
function matchCompound(el, sel) {
  const re = /(#[\w-]+)|(\.[\w-]+)|(\[[^\]]+\])|([a-zA-Z][\w-]*)/g; let m; let any = false;
  while ((m = re.exec(sel))) {
    any = true;
    if (m[1]) { if (el.getAttribute('id') !== m[1].slice(1)) return false; }
    else if (m[2]) { if (!(el.className || '').split(/\s+/).includes(m[2].slice(1))) return false; }
    else if (m[3]) { const mm = /^\[([\w-]+)(?:=("?)(.*?)\2)?\]$/.exec(m[3]); if (!mm) return false; const v = el.getAttribute(mm[1]); if (v === null) return false; if (mm[3] !== undefined && v !== mm[3]) return false; }
    else if (m[4]) { if (el.tagName.toLowerCase() !== m[4].toLowerCase()) return false; }
  }
  return any;
}
export class Doc {
  constructor() { this.activeElement = null; }
  createElement(t) { return new El(t, this); }
  createElementNS(ns, t) { return new El(t, this, ns); }
  createTextNode(s) { return new TextNode(String(s)); }
}
export function install() { const d = new Doc(); globalThis.document = d; return d; }
export const newRoot = (d) => d.createElement('div');
export const all = (n, pred) => { const r = []; const w = (x) => { for (const c of x.children) { if (pred(c)) r.push(c); w(c); } }; w(n); return r; };
export const sel = (n, s) => n.querySelector(s);
export const tick = (ms = 15) => new Promise(r => setTimeout(r, ms));
/** drive a real pointer stroke through the tracer's own listeners (box coordinates 0..1000 map 1:1 in this fake) */
export function drag(svg, pts) {
  const ev = (p) => ({ pointerId: 1, button: 0, clientX: p[0], clientY: p[1] });
  svg.dispatch('pointerdown', ev(pts[0]));
  for (const p of pts.slice(1)) svg.dispatch('pointermove', ev(p));
  svg.dispatch('pointerup', ev(pts[pts.length - 1]));
}
