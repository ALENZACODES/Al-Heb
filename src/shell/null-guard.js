// Learner-text guard (M-02): the DOM turns a null or undefined child into the text "null" / "undefined"
// (append(null), replaceChildren(a, cond ? b : null)). This drops such children everywhere, once, at boot, so a missing
// optional value is simply left out instead of printed. textContent assignments of a bare "null"/"undefined" are blanked too.
const BAD = new Set(['null', 'undefined', 'NaN', '[object Object]']);

/** The arguments a DOM insertion method should really receive: no null/undefined, no bare "null"/"undefined" strings. */
export function cleanKids(kids) {
  let dirty = false;
  for (const k of kids) if (k == null || k === false || Array.isArray(k) || (typeof k === 'string' && BAD.has(k.trim()))) { dirty = true; break; }
  if (!dirty) return kids;
  // an array child would print as "a,b" or "[object HTMLSpanElement]": its items are inserted instead
  return kids.flat(Infinity).filter((k) => !(k == null || k === false || (typeof k === 'string' && BAD.has(k.trim()))));
}

/** Install on Element, DocumentFragment and Document. Idempotent. @param {any} [win] */
export function installNullGuard(win = globalThis) {
  if (!win || win.__alefNullGuard) return false;
  const protos = ['Element', 'DocumentFragment', 'Document', 'CharacterData'].map((n) => win[n]?.prototype).filter(Boolean);
  for (const proto of protos) {
    for (const m of ['append', 'prepend', 'replaceChildren', 'before', 'after', 'replaceWith']) {
      const orig = Object.prototype.hasOwnProperty.call(proto, m) ? proto[m] : null;
      if (typeof orig !== 'function') continue;
      Object.defineProperty(proto, m, { configurable: true, writable: true, value: function (...kids) { return orig.apply(this, cleanKids(kids)); } });
    }
  }
  const nodeProto = win.Node?.prototype;
  const desc = nodeProto && Object.getOwnPropertyDescriptor(nodeProto, 'textContent');
  if (desc?.set && desc.get) {
    Object.defineProperty(nodeProto, 'textContent', { configurable: true, enumerable: desc.enumerable, get: desc.get,
      set(v) { desc.set.call(this, v == null || (typeof v === 'string' && BAD.has(v.trim())) ? '' : v); } });
  }
  win.__alefNullGuard = true;
  return true;
}

/** Text nodes in `root` that read as a bare "null"/"undefined" (for checks and tests). @param {Node} root */
export function findNullText(root) {
  const out = [];
  const walk = (n) => {
    if (!n) return;
    if (n.nodeType === 3) { const t = String(n.data ?? n.textContent ?? '').trim(); if (BAD.has(t) || /(^|[\s(:])(null|undefined)([\s.,:;)]|$)/.test(t)) out.push(t); return; }
    for (const c of n.childNodes || n.children || []) walk(c);
  };
  walk(root);
  return out;
}

installNullGuard();
