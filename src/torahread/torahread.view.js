// @ts-check
// Torah reading mini-course (route /torahread). export mount(root, ctx) -> unmount
// ctx: {settings, store, audio, params?, query?}. Everything but `root` is optional.
// Sections: ladder (reading without vowels), aliyah (rehearsal), words (30 frequent words), trope (explainer), sources.
import { loadTorahRead } from './data.js';
import { el, CSS, DRAFT_NOTICE, loadTranslit, loadProgress, saveProgress } from './ui.js';
import { renderLadder } from './ladder.view.js';
import { renderAliyah } from './aliyah.view.js';
import { renderWords } from './words.view.js';
import { renderTrope } from './trope.view.js';
import { SOURCES, NOT_USED } from './sources.js';

export const SECTIONS = [
  { id: 'ladder', label: 'Reading without vowels' },
  { id: 'aliyah', label: 'Aliyah rehearsal' },
  { id: 'words', label: '30 Torah words' },
  { id: 'trope', label: 'Trope: not taught' },
  { id: 'sources', label: 'Sources' },
];

export async function mount(root, ctx = /** @type {any} */ ({})) {
  const style = el('style', { id: 'trd-style' }); style.textContent = CSS;
  const wrap = el('section', { class: 'trd', 'aria-labelledby': 'view-title' });
  root.replaceChildren(style, wrap);
  wrap.append(el('h1', { id: 'view-title', tabindex: '-1' }, 'Torah reading'), el('p', { role: 'status' }, 'Loading...'));

  let course;
  try { course = await loadTorahRead(); }
  catch (err) {
    wrap.replaceChildren(el('h1', { id: 'view-title', tabindex: '-1' }, 'Torah reading'), el('p', { class: 'trd-draft', role: 'alert' }, `The course data could not be loaded (${err?.message || err}).`));
    return () => {};
  }
  const translit = await loadTranslit(ctx.settings);
  const progress = loadProgress(ctx);
  const save = () => saveProgress(ctx, progress);
  const requested = ctx.params?.section || ctx.query?.section;
  const state = { section: SECTIONS.some((s) => s.id === requested) ? requested : 'ladder' };
  const unsubs = [];
  let cleanup = () => {};
  const live = el('div', { class: 'trd-sr', role: 'status', 'aria-live': 'polite' });
  const announce = (m) => { live.textContent = ''; setTimeout(() => { live.textContent = m; }, 20); };
  if (ctx.settings && typeof ctx.settings.subscribe === 'function') unsubs.push(ctx.settings.subscribe((_a, changed) => { if (Array.isArray(changed) && changed.includes('congregation')) render(); }));

  const body = el('div', { id: 'trd-body' });
  function render() {
    cleanup(); body.replaceChildren();
    wrap.replaceChildren(el('h1', { id: 'view-title', tabindex: '-1' }, 'Torah reading'),
      el('p', { class: 'trd-draft', role: 'note' }, DRAFT_NOTICE),
      el('p', { class: 'trd-muted' }, 'Goal: read Torah and prayers aloud with a congregation. A Torah scroll has no vowel points and no cantillation marks; siddurim are pointed.'),
      nav(), body, live,
      el('p', { class: 'trd-foot' }, 'Hebrew from the registry and from tanach.us (public domain / copy without restriction); see Sources. No audio recordings exist yet for this course.'));
    const env = { ctx, course, translit, progress, save, announce, params: { item: ctx.query?.item } };
    const fn = { ladder: renderLadder, aliyah: renderAliyah, words: renderWords, trope: renderTrope, sources: renderSources }[state.section];
    const r = fn(body, env); cleanup = typeof r === 'function' ? r : () => {};
  }
  function nav() {
    const n = el('div', { class: 'trd-tabs', role: 'group', 'aria-label': 'Torah reading sections' });
    for (const s of SECTIONS) n.append(el('button', { type: 'button', class: 'trd-tab', 'data-section': s.id, 'aria-pressed': s.id === state.section ? 'true' : 'false',
      onclick: () => { state.section = s.id; render(); const h = wrap.querySelector('#trd-sec-h'); if (h) h.focus(); } }, s.label));
    return n;
  }
  render();
  return () => { cleanup(); for (const u of unsubs) { try { if (typeof u === 'function') u(); } catch { /* ignore */ } } };
}

function renderSources(host) {
  host.append(el('h2', { id: 'trd-sec-h', tabindex: '-1' }, 'Sources and licences'),
    el('p', {}, 'Each entry says what the source said about itself on 2026-11-03. This is not legal advice, and the Sefaria labels were not independently verified.'));
  for (const s of SOURCES) host.append(el('div', { class: 'trd-card' }, el('h3', {}, s.name), el('p', {}, el('strong', {}, 'Used for: '), s.used), el('p', {}, el('strong', {}, 'Licence: '), s.licence), el('p', { class: 'trd-muted' }, s.how)));
  host.append(el('p', { class: 'trd-muted' }, NOT_USED), el('p', { class: 'trd-muted' }, 'Scroll style: the "no points" step removes vowel points, dagesh, shin/sin dots and the verse-end mark and turns a hyphen into a space. It does not imitate a scribe\'s hand or a scroll\'s layout, and a scroll\'s spelling may differ from this edition in rare places.'));
  return () => {};
}
