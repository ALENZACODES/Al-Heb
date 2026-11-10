// Pure helpers for Ask the Torah (#/ask). No DOM, no network.

export const DEFAULT_API = '';

export const OFFLINE_COPY =
  'Ask the Torah is not connected on this copy of Aleph yet. When it is, you will be able to type a question and be led to the verses themselves.';

export const INTRO =
  'Ask about a person, a law, a word, or a verse. Answers say whether the topic is in the Torah, quote the verses, and lead you there. This page only answers questions about the Torah, the Tanakh and Jewish texts.';

export const PLACEHOLDER = 'For example: Is the Shema in the Torah?';

/** @param {unknown} env */
export function apiUrl(env = globalThis) {
  const g = env && typeof env === 'object' ? env : {};
  const fromWindow = g.ALEF_ASK_TORAH_URL || (g.__ALEF_ASK_TORAH_URL__);
  if (typeof fromWindow === 'string' && fromWindow.trim()) return fromWindow.trim().replace(/\/$/, '');
  try {
    const meta = g.document && g.document.querySelector && g.document.querySelector('meta[name="alef-ask-torah"]');
    const c = meta && meta.getAttribute('content');
    if (c && c.trim()) return c.trim().replace(/\/$/, '');
  } catch { /* ignore */ }
  return DEFAULT_API;
}

export function configured(env) {
  return Boolean(apiUrl(env));
}

/** @param {string} id e.g. genesis.2.7 */
export function alefHrefFromId(id) {
  const m = /^([a-z_]+)\.(\d+)\.(\d+)$/.exec(String(id || ''));
  if (!m) return null;
  const book = m[1];
  if (!['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy'].includes(book)) return null;
  return `#/torahreader?book=${book}&chapter=${m[2]}&verse=${m[3]}`;
}

export function passageHref(p) {
  if (!p) return null;
  if (p.link_kind === 'alef' && p.href) return p.href;
  const alef = p.id && alefHrefFromId(p.id);
  if (alef) return alef;
  return p.href || null;
}
