// /credits: every source in data/legal/attributions.json, grouped, with its licence, a link and an honest status flag.
// This is the ONE place credits live: the About screen links here. Not legal advice (the file says so and the page repeats it).
import { h } from './ui.js';
import { ATTRIBUTION as VOCAB_ATTRIBUTION } from '../vocab/vocab.view.js';

export const GROUPS = [
  ['vocabulary', 'Vocabulary'], ['scripture', 'Scripture text'], ['liturgy', 'Prayer text'], ['calendar', 'Calendar data'],
  ['traditions', 'Pronunciation traditions'], ['fonts', 'Fonts'], ['software', 'Software and data files'], ['services', 'Online services'],
  ['images', 'Images'], ['audio', 'Audio'], ['project', 'Written for this project'],
];
const STATUS_TEXT = {
  'verified-primary': 'status: verified (licence statement read on the source\'s own page)',
  'partly-verified': 'status: partly verified (a third-party label was re-read; the underlying right was not confirmed)',
  unverified: 'status: unverified (nothing was checked from a primary source)',
  'project-owned': 'status: written for this project (not a licence statement by anyone else)',
  'not-present': 'status: nothing from this source is in the app today',
};
const COMMERCIAL_TEXT = { yes: 'yes', 'yes-with-conditions': 'yes, with conditions', unknown: 'not known', 'not-applicable': 'not applicable' };
const isHttp = (u) => typeof u === 'string' && /^https:\/\//.test(u);

/** The Hebcal credit line, for any screen that shows Hebcal-derived dates (calendar, festivals). Text comes from attributions.json when given. */
export function hebcalCredit(entries) {
  const e = (entries || []).find((x) => x.id === 'hebcal-fixtures');
  return e ? e.attributionText : 'Calendar data derived from Hebcal (hebcal.com), CC BY 4.0.';
}

export function renderEntry(e) {
  return h('li', { class: 'credit', id: `credit-${e.id}`, 'data-credit-id': e.id, 'data-status': e.status },
    h('strong', {}, e.name),
    h('span', { class: 'block' }, h('span', { class: 'muted' }, 'Used for: '), e.usedFor),
    h('span', { class: 'block' }, h('span', { class: 'muted' }, 'Licence as stated: '), e.licence, ' ',
      isHttp(e.licenceUrl) ? h('a', { href: e.licenceUrl, rel: 'noopener' }, 'Source page') : null),
    h('span', { class: 'block' }, h('span', { class: 'muted' }, 'Commercial use: '), COMMERCIAL_TEXT[e.commercialUse] || e.commercialUse,
      e.shareAlike ? '; share-alike applies' : ''),
    e.attributionText ? h('span', { class: 'block' }, h('span', { class: 'muted' }, 'Credit line: '), e.attributionText) : null,
    h('span', { class: `block credit-status${e.status === 'unverified' ? ' draft-flag' : ''}`, role: e.status === 'unverified' ? 'note' : null }, STATUS_TEXT[e.status] || `status: ${e.status}`));
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
  root.replaceChildren(h('article', { class: 'stack' }, h('h1', { id: 'view-title', tabindex: '-1' }, t('nav.credits', 'Credits & licences')), h('p', { role: 'status' }, 'Loading credits...')));
  let data;
  try { data = await load(ctx); } catch (err) {
    root.replaceChildren(h('article', { class: 'stack' }, h('h1', { id: 'view-title', tabindex: '-1' }, t('nav.credits', 'Credits & licences')),
      h('p', { role: 'alert' }, 'The credits list did not load. Please reload the app, or try again when you are online.')));
    return () => {};
  }
  const entries = data.entries || [];
  const known = new Set(GROUPS.map((g) => g[0]));
  const groups = GROUPS.concat([...new Set(entries.map((e) => e.group))].filter((g) => !known.has(g)).map((g) => [g, g]));
  const counts = entries.reduce((a, e) => { a[e.status] = (a[e.status] || 0) + 1; return a; }, {});
  const sections = groups.map(([g, label]) => {
    const rows = entries.filter((e) => e.group === g);
    if (!rows.length) return null;
    return h('section', { class: 'card', 'aria-labelledby': `cg-${g}` }, h('h2', { id: `cg-${g}` }, label), h('ul', { class: 'credits', 'aria-label': label }, ...rows.map(renderEntry)));
  });
  root.replaceChildren(h('article', { class: 'stack', id: 'credits' },
    h('section', { class: 'card' },
      h('h1', { id: 'view-title', tabindex: '-1' }, t('nav.credits', 'Credits & licences')),
      h('p', { class: 'draft-flag', role: 'note' }, 'This is not legal advice, and no lawyer has reviewed it. Licence labels are what each source says about itself. If a row says "unverified" or "partly verified", nobody has confirmed the right with the original owner. No native speaker, rabbi or teacher has reviewed the Hebrew, the vowel marks, the English spelling of Hebrew words, or the translations. The Follow the Service screen uses no prayer book\'s text, layout or page numbers; published siddurim such as Mishkan T\'filah are copyrighted.'),
      h('p', {}, `${entries.length} sources listed: ${counts['verified-primary'] || 0} verified, ${counts['partly-verified'] || 0} partly verified, ${counts.unverified || 0} unverified, ${(counts['project-owned'] || 0) + (counts['not-present'] || 0)} project-written or not present.`),
      data.notLegalAdvice ? h('details', {}, h('summary', {}, 'What the status values mean'), h('p', {}, data.notLegalAdvice)) : null,
      h('p', {}, 'Aleph has no software licence for its own code and original text yet. Until one is added, all rights are reserved.')),
    h('section', { class: 'card', 'aria-labelledby': 'cg-vocab-line' }, h('h2', { id: 'cg-vocab-line' }, 'Word meanings and example sentences'),
      h('p', {}, VOCAB_ATTRIBUTION),
      h('p', {}, 'Word meanings: Wiktionary contributors (CC BY-SA 4.0). Example sentences: Tatoeba contributors (CC BY 2.0 FR). Speech recognition and the fallback voice come from your browser.'),
      h('p', {}, h('a', { href: 'https://creativecommons.org/licenses/by-sa/4.0/', rel: 'license noopener' }, 'CC BY-SA 4.0'), ' · ',
        h('a', { href: 'https://github.com/hermitdave/FrequencyWords', rel: 'noopener' }, 'FrequencyWords'), ' · ',
        h('a', { href: 'https://www.wiktionary.org/', rel: 'noopener' }, 'Wiktionary'), ' · ',
        h('a', { href: 'https://kaikki.org/', rel: 'noopener' }, 'kaikki.org'))),
    ...sections,
    h('p', {}, h('a', { class: 'btn secondary', href: '#/terms' }, 'Terms'), ' ', h('a', { class: 'btn secondary', href: '#/privacy' }, 'Privacy'), ' ', h('a', { class: 'btn secondary', href: '#/about' }, 'About'), ' ', h('a', { class: 'btn secondary', href: '#/how' }, 'How this works'))));
  return () => {};
}
