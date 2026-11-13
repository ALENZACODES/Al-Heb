// @ts-check
// Word taps on screens that have no lesson notes (Talk, Camera Translator): armed only when the Word helper language
// pack is already on this device. Without the pack these screens behave exactly as before. Lazy.
import { wordsReader } from './morph.js';
import { armWordTaps } from './tap.js';

/**
 * @param {HTMLElement} root @param {(tag:string, attrs?:any, ...kids:any[]) => HTMLElement} h @param {{fetch?:any, caches?:any, WorkerCtor?:any}} [env]
 * @returns {Promise<() => void>} turns the taps off again (a no-op when the pack is not here)
 */
export async function armIfPackReady(root, h, env = {}) {
  const reader = await wordsReader(env);
  if (!reader) return () => {};
  return armWordTaps(root, { h, unit: null, reader: async () => reader }).off;
}
