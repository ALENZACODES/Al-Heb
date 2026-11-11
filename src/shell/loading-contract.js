// Loading contract (M-05): the main region is never painted blank while a page assembles itself.
//  - A content-shaped placeholder (heading bar, text lines, a row of cards) stands in while a view module loads and while a
//    mounted view is still waiting for its data. It is removed the moment the view adds real content.
//  - A page seen earlier in this session is painted from an inert snapshot of its last render, so a repeat visit shows the
//    page at once; the live view replaces it as soon as it renders. Snapshots are kept in memory only (never stored).
//  - If a view clears the region and then waits (root.replaceChildren() followed by a fetch), the placeholder comes back.
import { h } from './ui.js';

const SNAP_MAX = 12; // pages remembered this session
const SNAP_MAX_CHARS = 120000; // a very large page is not snapshotted
const snaps = new Map(); // path -> DocumentFragment

const PLACEHOLDER = 'alef-skeleton';
const isPlaceholder = (n) => n.nodeType === 1 && (n.classList.contains(PLACEHOLDER) || n.classList.contains('alef-skeleton-note') || n.classList.contains('alef-snapshot'));
const isBlankText = (n) => n.nodeType === 3 && !n.textContent.trim();

/** A content-shaped placeholder: a heading bar, three text lines and a row of three card shapes. */
export function placeholder(title) {
  const cards = h('div', { class: 'skel-cards' }, h('div', { class: 'skel-card' }), h('div', { class: 'skel-card' }), h('div', { class: 'skel-card' }));
  return [
    h('div', { class: PLACEHOLDER, 'aria-hidden': 'true' },
      h('div', { class: 'skel-bar skel-title' }), h('div', { class: 'skel-bar' }), h('div', { class: 'skel-bar' }), h('div', { class: 'skel-bar short' }), cards),
    h('p', { class: 'muted alef-skeleton-note', role: 'status' }, `Loading ${title || 'this page'}…`),
  ];
}

const VISIBLE = 'img, svg, canvas, video, picture, button, input, select, textarea, a[href], iframe';
/** An element shows something: some text, or a picture or control. An empty <section> waiting for its data does not. */
const shows = (el) => !!(el.textContent && el.textContent.trim()) || el.matches?.(VISIBLE) || !!el.querySelector?.(VISIBLE);

/** True when the region shows nothing a learner can see apart from placeholders and a kept heading. */
export function isBlank(root, keep = () => false) {
  for (const n of root.childNodes) {
    if (isBlankText(n) || keep(n)) continue;
    if (n.nodeType === 1 && (isPlaceholder(n) || n.tagName === 'STYLE' || n.tagName === 'SCRIPT')) continue;
    if (n.nodeType === 3 || shows(n)) return false;
  }
  return true;
}

function snapshotFor(path) {
  const frag = snaps.get(path);
  if (!frag) return null;
  const box = h('div', { class: 'alef-snapshot', 'aria-hidden': 'true', inert: '' });
  box.append(frag.cloneNode(true));
  return box;
}

/** Remember what a page looked like, for an instant paint on the next visit. ids, focus and live regions are stripped. */
export function rememberPage(root, path) {
  try {
    if (!path || !root || root.querySelector('.alef-unavailable')) return;
    if (root.innerHTML.length > SNAP_MAX_CHARS) return;
    const frag = document.createDocumentFragment();
    for (const n of root.childNodes) if (!(n.nodeType === 1 && isPlaceholder(n))) frag.append(n.cloneNode(true));
    for (const el of frag.querySelectorAll('[id], [aria-live], [role="status"], [role="alert"], [tabindex], audio, video, script, iframe')) {
      if (/^(AUDIO|VIDEO|SCRIPT|IFRAME)$/.test(el.tagName)) { el.remove(); continue; }
      el.removeAttribute('id'); el.removeAttribute('aria-live'); el.removeAttribute('tabindex');
      if (el.getAttribute('role') === 'status' || el.getAttribute('role') === 'alert') el.removeAttribute('role');
    }
    snaps.delete(path); snaps.set(path, frag);
    while (snaps.size > SNAP_MAX) snaps.delete(snaps.keys().next().value);
  } catch { /* a snapshot is an optimisation only */ }
}

/**
 * Paint a placeholder (or the page's snapshot) into `root` and keep the contract until `release()` is called:
 * the placeholder goes as soon as the view adds content, and comes back if the view empties the region and waits.
 * @param {HTMLElement} root @param {{title?: string, path?: string, keep?: (n: Node) => boolean}} opt
 */
export function holdMain(root, { title, path, keep = () => false } = {}) {
  const paint = () => {
    const snap = path ? snapshotFor(path) : null;
    root.append(...(snap ? [snap, h('p', { class: 'visually-hidden alef-skeleton-note', role: 'status' }, `Loading ${title || 'this page'}…`)] : placeholder(title)));
  };
  const drop = () => { for (const n of [...root.childNodes]) if (n.nodeType === 1 && isPlaceholder(n)) n.remove(); };
  if (!root.querySelector(`.${PLACEHOLDER}, .alef-snapshot`)) paint();
  let busy = false, mounted = false, mo = null;
  const check = () => {
    if (busy) return; busy = true;
    try {
      const hasPh = [...root.children].some(isPlaceholder);
      const blank = isBlank(root, keep);
      if (blank) { if (!hasPh) paint(); }
      else { if (hasPh) drop(); if (mounted) mo?.disconnect(); } // the page has content and the view is mounted: the contract is met
    } finally { mo?.takeRecords?.(); busy = false; }
  };
  mo = typeof MutationObserver === 'function' ? new MutationObserver(check) : null;
  mo?.observe(root, { childList: true, subtree: true, characterData: true });
  return {
    /** The view's mount() has returned (it may still be loading data): drop the placeholder only if the page shows content. */
    viewMounted() { mounted = true; check(); },
    /** Stop watching (next navigation). */
    release() { mo?.disconnect(); },
  };
}

/**
 * The shell adds a hidden level-one heading when a view has none at the end of mount(). Views that draw after an async
 * load (Library, Loanwords, the Checkpoint, Traditions) then add their own: the hidden one leaves the moment another h1
 * appears, handing focus to the real heading if it had it, so a page never has two level-one headings.
 * @param {HTMLElement} root @param {HTMLElement} fallback
 */
export function watchFallbackHeading(root, fallback) {
  if (typeof MutationObserver !== 'function') return () => {};
  const settle = () => {
    if (!fallback.isConnected || !root.contains(fallback)) { mo.disconnect(); return; }
    const real = [...root.querySelectorAll('h1')].find((x) => x !== fallback && !x.closest('.alef-snapshot, [aria-hidden="true"]'));
    if (!real) return;
    const hadFocus = globalThis.document?.activeElement === fallback;
    fallback.remove(); mo.disconnect();
    if (!real.id) real.id = 'view-title';
    if (hadFocus) { if (!real.hasAttribute('tabindex')) real.setAttribute('tabindex', '-1'); try { real.focus({ preventScroll: true }); } catch { /* focus is best effort */ } }
  };
  const mo = new MutationObserver(settle);
  mo.observe(root, { childList: true, subtree: true });
  settle();
  return () => mo.disconnect();
}
