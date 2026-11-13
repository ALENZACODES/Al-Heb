// "Your stage" on any reading screen: one short line with the learner's place on the reading ladder and a link to it.
// Loaded on demand by the reading screens (little books, the text reader, the Torah reader, Reading Tools, vowel fade, the Read hub).
// It reads the bridge's own saved record and writes nothing. If anything fails the screen simply has no line.
import { el, storeGet } from '../curriculum/dom.js';
import { STORE_KEY, normalizeState } from './model.js';
import { chipText } from './progress.js';

/** The line as an element (a paragraph with a link to #/bridge). @param {any} state */
export function chipNode(state) {
  return el('p', { class: 'muted br-chip', 'data-ladder-chip': '', role: 'note' }, chipText(normalizeState(state)), ' ', el('a', { href: '#/bridge' }, 'Reading ladder'));
}

/**
 * Adds the line to the end of a reading screen. Safe to call on every mount; never throws.
 * @param {any} root the element the screen was mounted in @param {any} ctx
 * @returns {Promise<any>} the line, or null when it could not be added
 */
export async function attachChip(root, ctx) {
  try {
    const state = await storeGet(ctx, STORE_KEY, null);
    if (!root || typeof root.append !== 'function') return null;
    const node = chipNode(state);
    root.append(node);
    return node;
  } catch { return null; }
}
