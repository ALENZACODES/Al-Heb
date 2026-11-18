// /credits: every source in data/legal/attributions.json, grouped, with its licence and a link.
// This is the ONE place credits live: the About screen links here. Not legal advice (the file says so and the page repeats it).
import { h } from './ui.js';
import { ATTRIBUTION as VOCAB_ATTRIBUTION } from '../vocab/vocab.view.js';

export const GROUPS = [
  ['vocabulary', 'Vocabulary'], ['scripture', 'Scripture text'], ['liturgy', 'Prayer text'], ['calendar', 'Calendar data'],
  ['traditions', 'Pronunciation traditions'], ['fonts', 'Fonts'], ['software', 'Software and data files'], ['services', 'Online services'],
  ['images', 'Images'], ['audio', 'Audio'], ['project', 'Written for this project'],
];
const isHttp = (u) => typeof u === 'string' && /^https:\/\//.test(u);

/** The Hebcal credit line, for any screen that shows Hebcal-derived dates (calendar, festivals). Text comes from attributions.json when given. */
export function hebcalCredit(entries) {
  const e = (entries || []).find((x) => x.id === 'hebcal-fixtures');
  return e ? e.attributionText : 'Calendar data derived from Hebcal (hebcal.com), CC BY 4.0.';
}

export function renderEntry(e) {
  const licence = publicLicence(e);
  return h('li', { class: 'credit', id: `credit-${e.id}`, 'data-credit-id': e.id, 'data-status': e.status },
    h('strong', {}, publicName(e)),
    e.attributionText ? h('span', { class: 'block' }, e.attributionText) : null,
    licence || isHttp(e.licenceUrl) ? h('span', { class: 'block' }, licence ? [h('span', { class: 'muted' }, 'Licence: '), licence, ' '] : null,
      isHttp(e.licenceUrl) ? h('a', { href: e.licenceUrl, rel: 'noopener' }, 'Source page') : null) : null);
  // "Used for" and the licence check status stay in data/legal/attributions.json and the audit; they are not learner copy.
}

/** Third-party sources are credited on the page; Aleph's own work and its working notes are covered by the copyright line. */
export const isPublicCredit = (e) => !!e && !['project', 'images', 'audio'].includes(e.group) && e.status !== 'not-present';

/** The licence as a learner reads it: the audit's working notes in brackets are left out. */
export function publicLicence(e) {
  const l = String(e?.licence || '');
  if (/not read|not re-read|not stated/i.test(l) && !/^(CC|MIT|Apache|SIL|Public)/i.test(l)) return '';
  const clean = l.replace(/\s*\([^()]*(label|states|stated|recorded|read|vendored|README|notes)[^()]*\)/gi, '').trim();
  return clean.length > 120 ? clean.split(/(?<=\.)\s/)[0] : clean;
}

/** A source's name without the file paths the audit adds in brackets. */
export function publicName(e) {
  return String(e?.name || '').replace(/\s*\([^()]*\/[^()]*\)/g, '').trim();
}

async function load(ctx) {
  if (ctx && ctx.attributions) return ctx.attributions;
  const f = (ctx && ctx.fetch) || globalThis.fetch;
  const res = await f(new URL('../../data/legal/attributions.json', import.meta.url));
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

export async function mount(root, ctx) {
  const t = (k, fb) => { const v = ctx && typeof ctx.t === 'function' ? ctx.t(k) : null; return v && v !== k ? v : fb; };
  root.replaceChildren(h('article', { class: 'stack' }, h('h1', { id: 'view-title', tabindex: '-1' }, t('nav.credits', 'Credits and licences')), h('p', { role: 'status' }, 'Loading credits...')));
  let data;
  try { data = await load(ctx); } catch (err) {
    root.replaceChildren(h('article', { class: 'stack' }, h('h1', { id: 'view-title', tabindex: '-1' }, t('nav.credits', 'Credits and licences')),
      h('p', { role: 'alert' }, 'The credits list did not load. Please reload the app, or try again when you are online.')));
    return () => {};
  }
  const entries = data.entries || [];
  // Language packs whose licence asks for a credit line (CC BY): read from the pack list, for the packs a learner can download.
  let packCredits = [];
  try { const r = await ((ctx && ctx.fetch) || globalThis.fetch)(new URL('../../data/packs/catalog.json', import.meta.url)); if (r.ok) packCredits = [...new Set(((await r.json()).packs || []).filter((p) => p.published).flatMap((p) => p.credits || []))]; } catch { /* no list on this device yet: nothing to add */ }
  const known = new Set(GROUPS.map((g) => g[0]));
  const groups = GROUPS.concat([...new Set(entries.map((e) => e.group))].filter((g) => !known.has(g)).map((g) => [g, g]));
  const sections = groups.map(([g, label]) => {
    const rows = entries.filter((e) => e.group === g && isPublicCredit(e));
    if (!rows.length) return null;
    return h('section', { class: 'card', 'aria-labelledby': `cg-${g}` }, h('h2', { id: `cg-${g}` }, label), h('ul', { class: 'credits', 'aria-label': label }, ...rows.map(renderEntry)));
  });
  root.replaceChildren(h('article', { class: 'stack', id: 'credits' },
    h('section', { class: 'card' },
      h('h1', { id: 'view-title', tabindex: '-1' }, t('nav.credits', 'Credits and licences')),
      h('p', {}, 'Aleph stands on the work of many people and projects. Each source is listed below with its licence.'),
      h('p', {}, 'Aleph\'s own code, lessons, text and artwork are \u00a9 2026 John Khan. All rights reserved.'),
      h('p', { class: 'muted small' }, 'This list is a summary, not legal advice.')),
    h('section', { class: 'card', 'aria-labelledby': 'cg-vocab-line' }, h('h2', { id: 'cg-vocab-line' }, 'Word meanings and example sentences'),
      h('p', {}, VOCAB_ATTRIBUTION),
      h('p', {}, 'Word meanings: Wiktionary contributors (CC BY-SA 4.0). Example sentences: Tatoeba contributors (CC BY 2.0 FR). Speech recognition and the fallback voice come from your browser.'),
      h('p', {}, h('a', { href: 'https://creativecommons.org/licenses/by-sa/4.0/', rel: 'license noopener' }, 'CC BY-SA 4.0'), ' · ',
        h('a', { href: 'https://github.com/hermitdave/FrequencyWords', rel: 'noopener' }, 'FrequencyWords'), ' · ',
        h('a', { href: 'https://www.wiktionary.org/', rel: 'noopener' }, 'Wiktionary'), ' · ',
        h('a', { href: 'https://kaikki.org/', rel: 'noopener' }, 'kaikki.org'))),
    ...sections,
    packCredits.length ? h('section', { class: 'card', 'aria-labelledby': 'cg-packs' }, h('h2', { id: 'cg-packs' }, 'Language packs'), h('ul', { class: 'credits', 'aria-label': 'Language packs' }, ...packCredits.map((c) => h('li', {}, c)))) : null,
    h('p', {}, h('a', { class: 'btn secondary', href: '#/terms' }, 'Terms'), ' ', h('a', { class: 'btn secondary', href: '#/privacy' }, 'Privacy'), ' ', h('a', { class: 'btn secondary', href: '#/about' }, 'About'), ' ', h('a', { class: 'btn secondary', href: '#/how' }, 'How Aleph works'))));
  return () => {};
}
