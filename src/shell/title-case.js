// @ts-check
// Headings and menu labels in Title Case across the app ("Reform Synagogues in Canada").
// Only ever raises a first letter: words already holding a capital (ALEF, iPhone), words with digits and Hebrew are left alone.
// Opt out on any element with data-case="keep".

const SMALL = new Set(["a", "an", "the", "and", "but", "or", "nor", "for", "so", "yet", "as", "at", "by", "in", "of", "on", "to", "up", "vs", "via", "per", "off"]);

/** @param {string} s */
export function titleCase(s) {
  let first = true;
  return String(s).replace(/([A-Za-z][A-Za-z'’]*)|([:—–!?.]\s*)|(\S)/g, (m, word, stop) => {
    if (stop) { first = true; return m; }
    if (!word) { first = false; return m; }
    const out = (first || !SMALL.has(word.toLowerCase())) && /^[a-z]/.test(word) && !/[A-Z]/.test(word) ? word[0].toUpperCase() + word.slice(1) : word;
    first = false;
    return out;
  });
}

const SEL = "h1, h2, h3, nav a, .menu a, .menu button";
const skip = (el) => !!el.closest?.('[data-case="keep"], [lang="he"], .he, input, textarea, [contenteditable="true"]');

/** Title-case the Latin text inside one heading or label, word boundaries kept across child text nodes. @param {Element} el */
function fix(el) {
  if (skip(el)) return;
  const walker = el.ownerDocument.createTreeWalker(el, 4 /* NodeFilter.SHOW_TEXT */);
  let atStart = true;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const p = n.parentElement;
    if (p && p !== el && skip(p)) { atStart = false; continue; }
    const v = n.nodeValue || "";
    if (!/[a-z]/.test(v)) { if (v.trim()) atStart = false; continue; }
    let next = titleCase(v);
    // A text node that continues a heading mid-sentence must not capitalise its leading small word.
    if (!atStart) { const m = /^(\s*)([a-z]+)/.exec(v); if (m && SMALL.has(m[2])) next = m[1] + m[2] + next.slice(m[0].length); }
    if (next !== v) n.nodeValue = next;
    if (v.trim()) atStart = /[:—–]\s*$/.test(v);
  }
}

/** @param {ParentNode} root */
export function applyTitleCase(root) {
  try {
    if (root instanceof Element && root.matches(SEL)) fix(root);
    root.querySelectorAll?.(SEL).forEach(fix);
  } catch { /* casing is cosmetic */ }
}

let observer = null;
/** Keep headings in Title Case as views render and update. @param {Element} [root] */
export function watchTitleCase(root = document.body) {
  if (observer || typeof MutationObserver !== "function") return;
  applyTitleCase(root);
  let queued = new Set();
  let pending = false;
  const flush = () => { pending = false; const q = queued; queued = new Set(); q.forEach((el) => applyTitleCase(el)); };
  observer = new MutationObserver((list) => {
    for (const m of list) {
      const t = m.target.nodeType === 3 ? m.target.parentElement : /** @type {Element} */ (m.target);
      if (!t) continue;
      const host = t.closest?.(SEL);
      queued.add(host || t);
    }
    if (!pending) { pending = true; queueMicrotask(flush); }
  });
  observer.observe(root, { subtree: true, childList: true, characterData: true });
}
