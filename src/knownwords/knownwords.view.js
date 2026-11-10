/**
 * Known-word checker (#/known-words), PREVIEW. Paste Hebrew text, pick a vocabulary level, and see which words are NOT in Aleph's word list
 * up to that level. Nothing is stored or sent anywhere; the check runs on this device. It does not judge grammar or meaning, and a word
 * missing from the list may still be correct Hebrew: the list is incomplete and unreviewed.
 * The word list comes from the small derived file data/knownwords/index.json (tools/knownwords/build.mjs), not the 7 MB vocabulary file.
 * ctx extras for tests: ctx.knownWordsIndex = parsed index; ctx.knownWordsData = { words: [...] } (rows shaped like data/vocab/words.json).
 */
import { el, heText } from '../curriculum/dom.js';
import { loadJSON } from '../curriculum/data.js';
import { LEVELS, knownSet, knownSetFromIndex, validate, similar } from './validate.js';

export const NOTE = 'Preview. This checks spelling against Aleph\'s own word list (which no Hebrew teacher has reviewed). A word that is not found may still be fine Hebrew, and a word that is found may still be used wrongly. Nothing you paste is saved or sent anywhere.';
const LEVEL_NOTE = { A1: 'A1 words', A2: 'A1 and A2 words', B1: 'A1 to B1 words', B2: 'all listed words (A1 to B2)' };

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  const wrap = el('section', { class: 'alef-knownwords', 'aria-labelledby': 'kw-title' });
  const h1 = el('h1', { id: 'kw-title', tabindex: '-1' }, 'Known-word checker');
  const lv = el('div', { role: 'group', 'aria-labelledby': 'kw-lv-label' });
  const area = el('textarea', { id: 'kw-text', rows: '5', lang: 'he', dir: 'rtl', style: 'min-height:44px;width:100%' });
  const out = el('div', { class: 'kw-out' });
  const status = el('p', { role: 'status', 'aria-live': 'polite', class: 'kw-status' });
  const btn = (label, onclick, extra = {}) => el('button', { class: 'btn', type: 'button', style: 'min-height:44px;min-width:44px', onclick, ...extra }, label);
  let alive = true, level = 'A1', rows = ctx?.knownWordsData?.words || null, index = ctx?.knownWordsIndex || null; const sets = {};
  const say = (t) => { status.textContent = t; };
  function renderLevels() {
    lv.replaceChildren(...LEVELS.map((l) => btn(l, () => { level = l; renderLevels(); say(`Level ${l} chosen: ${LEVEL_NOTE[l]}.`); }, { class: 'btn secondary', 'aria-pressed': String(level === l) })));
  }
  async function check() {
    if (!area.value.trim()) { say('Paste some Hebrew text first.'); return; }
    try { if (!rows && !index) { say('Loading the word list…'); index = await loadJSON('data/knownwords/index.json'); } } catch { out.replaceChildren(el('p', { role: 'alert' }, 'The word list could not be loaded. Reload and try again.')); return; }
    if (!alive) return;
    const known = (sets[level] ??= rows ? knownSet(rows, { maxLevel: level }) : knownSetFromIndex(index, { maxLevel: level })), r = validate(area.value, known);
    const pct = (x) => `${(x * 100).toFixed(0)}%`;
    const nodes = [el('p', {}, `${r.total} Hebrew word${r.total === 1 ? '' : 's'} found. Listed exactly: ${r.exact}. Listed after taking off a one- or two-letter prefix (a spelling rule that can be wrong): ${r.prefix}. Not listed: ${r.total - r.exact - r.prefix}. Coverage against ${LEVEL_NOTE[level]}: ${pct(r.coverage)} (${pct(r.exactCoverage)} counting exact matches only).`)];
    if (r.unknown.length) {
      nodes.push(el('h2', { id: 'kw-un' }, 'Words not in the list'),
        el('ul', { 'aria-labelledby': 'kw-un' }, ...r.unknown.map((u) => { const s = similar(u.word, known); return el('li', {}, heText(u.word), ` x${u.count}`, s.length ? [' similar spellings in the list (may be unrelated): ', ...s.flatMap((w, i) => [i ? ', ' : '', heText(w)])] : ''); })));
    } else if (r.total) nodes.push(el('p', {}, 'Every word was found in the list.'));
    out.replaceChildren(...nodes); say(`Checked: ${r.total - r.exact - r.prefix} word${r.total - r.exact - r.prefix === 1 ? '' : 's'} not listed.`);
  }
  wrap.append(h1, el('p', { class: 'kw-draft' }, NOTE), el('p', { id: 'kw-lv-label' }, 'Vocabulary level to check against'), lv,
    el('label', { for: 'kw-text' }, 'Hebrew text to check'), area, btn('Check the words', check), out, status);
  root.append(wrap); renderLevels();
  return () => { alive = false; wrap.children = []; if (typeof wrap.remove === 'function') wrap.remove(); else root.replaceChildren?.(); };
}
