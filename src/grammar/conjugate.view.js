// @ts-check
// The screen pieces for conjugation tables (O1) and "what is this verb?" (O10). Loaded lazily by the Roots page's verb view.
import { audioButton } from '../shell/audio-access.js';
import { heText } from '../curriculum/dom.js';
import { conjugate, analyze, describeMatch, TENSES, PERSONS, TABLE_NOTE, NO_TABLE, FUTURE_PLURAL_NOTE } from './conjugate.js';

export const SHOW_ALL = 'Show Every Form';
export const FINDER_TITLE = 'What Is This Verb?';
export const FINDER_NONE = 'Aleph does not find these letters among the verb forms it has. Many verbs do not have a full table yet, so a real form can be missing.';

/**
 * Every form of a regular verb: one table a tense, one row a person, each with a Listen button.
 * For a verb the rules do not cover, one plain line saying why.
 * @param {any} el the app's element builder @param {any} ctx @param {any} verb a row of data/roots/verbs.json
 */
export function fullTable(el, ctx, verb) {
  const r = conjugate(verb);
  if (!r.ok) return el('p', { class: 'muted', 'data-conj': 'none' }, NO_TABLE[r.why]);
  const tables = TENSES.map((t) => el('table', { 'data-conj': t.key },
    el('caption', {}, `${t.title}: ${verb.translit}, ${verb.en}`),
    el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Who'), el('th', { scope: 'col' }, 'Hebrew'), el('th', { scope: 'col' }, 'Sound'))),
    el('tbody', {}, ...t.order.map((p) => {
      const he = r.table[t.key][p];
      const who = PERSONS[p];
      return el('tr', { 'data-person': p },
        el('th', { scope: 'row' }, who.en, ' ', el('span', { class: 'muted' }, heText(who.he))),
        el('td', {}, heText(he)),
        el('td', {}, audioButton(el, ctx, { kind: 'word', id: `conj-${verb.id}-${t.key}-${p}`, text: he, label: 'Listen', name: `${t.title.toLowerCase()}, ${who.en}, ${verb.translit}` })));
    }))));
  return el('div', { class: 'conj-full', 'data-conj': 'full' },
    el('p', { class: 'muted' }, TABLE_NOTE),
    ...tables,
    el('p', { class: 'muted' }, FUTURE_PLURAL_NOTE),
    el('p', { class: 'muted' }, `Root letters: ${r.root}. The rules were checked against the ${r.checked.length} forms the word list holds for this verb.`));
}

/**
 * Typed Hebrew letters -> the verbs they can be a form of, each with a button that opens its table.
 * @param {any} el @param {(label:string, onclick:()=>void, extra?:any)=>any} btn @param {any[]} verbs @param {string} text @param {(id:string)=>void} open
 */
export function finder(el, btn, verbs, text, open) {
  const hits = analyze(text, verbs).slice(0, 8);
  if (!hits.length) return el('div', { 'data-finder': 'none' }, el('h3', {}, FINDER_TITLE), el('p', { class: 'muted' }, FINDER_NONE));
  return el('div', { 'data-finder': String(hits.length) }, el('h3', {}, FINDER_TITLE),
    el('ul', {}, ...hits.map((h) => el('li', {},
      heText(h.matches[0].he), ` is ${h.matches.map(describeMatch).join(', or ')} of `, heText(h.verb.he), ` (${h.verb.translit}: ${h.verb.en}). `,
      btn('Open Its Forms', () => open(h.verb.id), { 'aria-label': `Open the forms of ${h.verb.translit}, ${h.verb.en}` })))));
}
