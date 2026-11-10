// One memory hook line, the same wording and the same place on every letter card and example-word card.
// The text comes from data/letters/memory-chain.json (the chain: SEE the picture, SAY the hook word, SEAL with the example word).
// A card with no chain entry shows nothing: no hook is ever made up here. Pure functions, no DOM.

export const HOOK_LABEL = 'Memory hook';
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const skel = (he) => String(he ?? '').normalize('NFC').replace(/[֑-ׇ]/g, '');

/** The chain story for a pronunciation style, falling back to the general story. @param {any} entry @param {string} [tradition] */
export function storyFor(entry, tradition) {
  return str(entry?.storyByTradition?.[tradition || '']) || str(entry?.story);
}
/**
 * Hook text for a letter card, or for an example-word card (the word the chain uses to seal that letter).
 * @param {Map<string,any>|null|undefined} chain  letterId -> chain entry (see indexChain in memory.core.js)
 * @param {string} tradition
 * @param {{letterId?:string, he?:string}} q  a letter id, or a Hebrew word (pointed or not)
 * @returns {{label:string, text:string, letterId:string}|null}
 */
export function hookLine(chain, tradition, q = {}) {
  if (!chain || typeof chain.get !== 'function') return null;
  let entry = q.letterId ? chain.get(q.letterId) : null;
  if (!entry && q.he) { const k = skel(q.he); if (k) for (const e of chain.values()) if (skel(e?.word?.he) === k) { entry = e; break; } }
  const text = storyFor(entry, tradition);
  return text ? { label: HOOK_LABEL, text, letterId: entry.id } : null;
}

/** The hook as a paragraph, built with the caller's element factory (el(tag, attrs, ...kids)). Null when there is no hook. */
export function hookNode(el, hk) {
  return hk ? el('p', { class: 'alef-hook-line', 'data-hook': hk.letterId }, el('strong', {}, hk.label + ': '), hk.text) : null;
}
