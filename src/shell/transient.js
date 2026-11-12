// I1 toast hygiene contract. Transient text (answer feedback for screen readers, spoken status lines, toasts) never outlives
// its moment: it is emptied a few seconds after it is written, and everything transient is cleared at the start of every
// navigation (src/app.js show()). Fixes the session-long "Not this time" that #media-twin (src/audio/sfx.js) kept in the
// page text after a wrong lesson answer. Mark any new live region with data-transient to join the contract.
export const TRANSIENT_TEXT = '#media-twin, .ret-live, [data-transient]';
export const TRANSIENT_NODES = '.stat-toast, .rimon-toast';
export const TRANSIENT_MS = 4000;

/** Write `text` into a live region and empty it after `ms` unless something newer was written. */
export function sayBriefly(node, text, { ms = TRANSIENT_MS, win = globalThis } = {}) {
  if (!node) return;
  const n = /** @type {any} */ (node);
  try { if (n.__alefT) win.clearTimeout?.(n.__alefT); } catch { /* ignore */ }
  node.textContent = text || '';
  n.__alefT = text ? (win.setTimeout?.(() => { n.__alefT = 0; if (node.textContent === text) node.textContent = ''; }, ms) || 0) : 0;
}

/** Route-change half of the contract: empty every transient live region and remove every toast. Returns how many were touched. */
export function clearTransient(doc = globalThis.document) {
  let n = 0;
  try {
    for (const el of doc.querySelectorAll(TRANSIENT_TEXT)) if (el.textContent) { el.textContent = ''; n++; }
    for (const el of doc.querySelectorAll(TRANSIENT_NODES)) { el.remove(); n++; }
  } catch { /* no document */ }
  return n;
}
