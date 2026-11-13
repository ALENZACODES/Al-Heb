// @ts-check
// Tap a Hebrew word, get its notes. Lazy. One listener on a container; it answers taps on plain Hebrew text only and
// leaves buttons, links, form fields and anything else that already does something alone.
import { morph } from './morph.js';
import { cardModel, renderCard } from './card.js';

const BUSY = 'a, button, input, select, textarea, label, summary, [role="button"], [role="option"], [role="radio"], [contenteditable], .alef-wordcard';
function addStyles(doc) {
  if (doc.querySelector('link[data-alef-words]')) return;
  const link = doc.createElement('link');
  link.rel = 'stylesheet'; link.href = new URL('../../assets/css/words.css', import.meta.url).href; link.setAttribute('data-alef-words', '');
  doc.head.append(link);
}

/**
 * The Hebrew word at a position in a text, or the only word when there is just one.
 * @param {{word:string, start:number, end:number}[]} list  the text's words (the word-notes module's words(text))
 * @param {number} offset @returns {string|null}
 */
export function wordAt(list, offset) {
  if (!list.length) return null;
  if (list.length === 1) return list[0].word;
  if (typeof offset !== 'number' || offset < 0) return null;
  const inside = list.find((w) => offset >= w.start && offset <= w.end);
  if (inside) return inside.word;
  // a tap on the space or mark between two words goes to the nearer one
  let best = null, gap = Infinity;
  for (const w of list) { const d = Math.min(Math.abs(offset - w.start), Math.abs(offset - w.end)); if (d < gap) { gap = d; best = w.word; } }
  return gap <= 1 ? best : null;
}

/** Where in its text a tap landed: {text, offset} for the Hebrew element. */
function hit(ev, el) {
  const doc = el.ownerDocument;
  let node = null, offset = -1;
  try {
    if (typeof doc.caretPositionFromPoint === 'function') { const p = doc.caretPositionFromPoint(ev.clientX, ev.clientY); if (p) { node = p.offsetNode; offset = p.offset; } }
    else if (typeof doc.caretRangeFromPoint === 'function') { const r = doc.caretRangeFromPoint(ev.clientX, ev.clientY); if (r) { node = r.startContainer; offset = r.startOffset; } }
  } catch { /* fall through to the single-word case */ }
  const text = el.textContent || '';
  if (!node || node.nodeType !== 3 || !el.contains(node)) return { text, offset: -1 };
  // offset inside the element's whole text: add the lengths of the text nodes before this one
  let before = 0;
  const walker = doc.createTreeWalker(el, 4 /* text nodes */);
  for (let n = walker.nextNode(); n && n !== node; n = walker.nextNode()) before += (n.textContent || '').length;
  return { text, offset: before + offset };
}

/**
 * @param {HTMLElement} root  the container to listen on
 * @param {{h:(tag:string, attrs?:any, ...kids:any[]) => HTMLElement, unit?:string|null, reader?:() => Promise<null|{analyse:(text:string) => Promise<any[]>}>, packOffered?:boolean}} o
 *   unit: the lesson, practical unit or dialogue whose notes apply (null where only the pack can answer)
 *   reader: gives the pack reader when the pack is on this device (src/words/morph.js wordsReader)
 * @returns {{off:() => void, open:(word:string, around:string, anchor:HTMLElement) => Promise<boolean>}}
 */
export function armWordTaps(root, o) {
  const doc = root.ownerDocument;
  addStyles(doc);
  /** @type {HTMLElement|null} */ let card = null;
  /** @type {HTMLElement|null} */ let back = null;
  let seq = 0;
  const close = (refocus = true) => { if (card) { card.remove(); card = null; } if (refocus && back && back.isConnected) { try { back.focus({ preventScroll: true }); } catch { /* not focusable */ } } back = null; };

  async function open(word, around, anchor) {
    const mine = ++seq;
    const m = await morph();
    const unit = o.unit ? await m.loadUnit(o.unit) : null;
    let model = cardModel(m, { word, around, unit, packOffered: !!o.packOffered });
    if (model && !model.found && o.reader) {
      // not in the lesson notes: the pack reads it, when it is on this device
      const reader = await o.reader().catch(() => null);
      if (reader) {
        const [read, roots] = await Promise.all([reader.analyse(around || word).catch(() => []), m.loadRoots()]);
        const key = m.wordKey(word);
        const mineWord = read.find((w) => w.shownKey === key) || (read.length === 1 ? read[0] : null);
        if (mineWord) model = cardModel(m, { word, around, unit, joint: mineWord, roots });
      }
    }
    if (mine !== seq) return false; // a newer tap won
    close(false);
    if (!model) return false; // the divine Name, or a single letter: no card
    back = anchor;
    card = renderCard(o.h, model, { onClose: () => close(true) });
    const host = anchor.closest('li, p, .alef-item, .card') || anchor;
    host.after(card);
    try { card.focus({ preventScroll: false }); } catch { /* ignore */ }
    return true;
  }

  const onClick = async (ev) => {
    const target = /** @type {HTMLElement} */ (ev.target);
    if (!target || typeof target.closest !== 'function' || target.closest(BUSY)) return;
    const el = /** @type {HTMLElement|null} */ (target.closest('[lang="he"]'));
    if (!el || !root.contains(el)) return;
    const sel = doc.getSelection?.();
    if (sel && !sel.isCollapsed) return; // the learner is selecting text, not tapping a word
    const at = hit(ev, el);
    try { const m = await morph(); const word = wordAt(m.words(at.text), at.offset); if (word) await open(word, at.text, el); } catch { /* the notes code could not be fetched (offline, first use): nothing opens */ }
  };
  root.addEventListener('click', onClick);
  return { off: () => { root.removeEventListener('click', onClick); close(false); }, open };
}
