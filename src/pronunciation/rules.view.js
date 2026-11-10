/**
 * Pronunciation rules (#/rules and #/rules/:rule): one short static page per rule (kamatz, tav, holam, het, ayin, resh, stress), each with
 * a plain-language summary, what each tradition says, six examples from the lookup data and a "who says it this way" line labelled
 * rule-generated. Data: data/pronunciation/runtime/rules.json (tools/pronunciation/build_pages.mjs). No store, no audio.
 * ctx extras for tests: ctx.compareData.rules, ctx.params.rule.
 */
import { TRADITIONS, TRADITION_LABELS, NOTICE, syllablesOf } from './compare.model.js';
import { createLoader } from './lookup.js';

const CSS = `
.alef-rules{max-inline-size:44rem;margin-inline:auto;overflow-wrap:anywhere}
.alef-rules *{box-sizing:border-box;max-inline-size:100%}
.alef-rules table{border-collapse:collapse;inline-size:100%;margin-block:.5rem}
.alef-rules th,.alef-rules td{border:1px solid currentColor;padding:.35rem .5rem;text-align:start;vertical-align:top}
.alef-rules .ru-scroll{overflow-x:auto;max-inline-size:100%}
.alef-rules .ru-scroll table{max-inline-size:none;min-inline-size:30rem}
.alef-rules .ru-he{font-size:1.5rem}
.alef-rules .ru-flag{border-inline-start:6px solid currentColor;padding-inline-start:.5rem}
.alef-rules a{display:inline-block;min-block-size:var(--tap,48px);min-inline-size:var(--tap,48px);text-align:center;padding-block:.6rem}
.alef-rules :focus-visible{outline:3px solid currentColor;outline-offset:2px}
.alef-rules strong{text-decoration:underline;text-underline-offset:.2em}
`;

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} */
export function mount(root, ctx) {
  const doc = root.ownerDocument || globalThis.document;
  const h = (tag, attrs = {}, ...kids) => {
    const n = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; n.setAttribute(k, v === true ? '' : String(v)); }
    for (const kid of kids.flat(Infinity)) { if (kid == null || kid === false) continue; n.append(typeof kid === 'string' ? doc.createTextNode(kid) : kid); }
    return n;
  };
  const loader = createLoader(ctx);
  let alive = true;
  const title = h('h1', { id: 'view-title', tabindex: '-1' }, 'Pronunciation rules');
  const body = h('div', {});
  const status = h('div', { role: 'status', 'aria-live': 'polite' });
  const style = h('style', {}, CSS);
  const wrap = h('section', { class: 'alef-rules', 'aria-labelledby': 'view-title' }, title, h('p', { class: 'ru-flag', role: 'note' }, NOTICE), body, status);
  root.append(style, wrap);

  // wide tables scroll inside a labelled, keyboard-focusable region instead of widening the page
  const scroller = (label, table) => h('div', { class: 'ru-scroll', role: 'region', tabindex: '0', 'aria-label': label + ' (scrolls sideways)' }, table);
  const stressed = (ipa) => { const o = []; syllablesOf(ipa).syllables.forEach((s, i) => { if (i) o.push('.'); o.push(s.stressed ? h('strong', {}, s.text) : s.text); }); return o; };

  function index(pages) {
    title.replaceChildren(doc.createTextNode('Pronunciation rules'));
    body.replaceChildren(
      h('p', {}, 'Seven rules that explain most of the differences between the Israeli, Sephardi and Ashkenazi readings. Each page has six examples.'),
      h('ul', {}, pages.map((p) => h('li', {}, h('a', { href: `#/rules/${p.id}` }, p.nav), ' - ', p.title))),
      h('p', {}, h('a', { href: '#/compare' }, 'Compare any word side by side')));
  }
  function page(pages, i) {
    const p = pages[i];
    title.replaceChildren(doc.createTextNode(p.title));
    body.replaceChildren(...[
      h('p', {}, p.summary),
      scroller('What each tradition says (rule-generated)', h('table', {}, h('caption', {}, 'What each tradition says (rule-generated)'), h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Tradition'), h('th', { scope: 'col' }, 'Sound'), h('th', { scope: 'col' }, 'Example'))),
        h('tbody', {}, p.rows.map((r) => h('tr', {}, h('th', { scope: 'row' }, TRADITION_LABELS[r[0]]), h('td', {}, r[1]), h('td', { dir: 'ltr' }, r[2])))))),
      p.why ? h('p', {}, p.why) : null,
      h('p', { class: 'ru-flag' }, h('strong', {}, 'Who says it this way? '), p.who),
      h('p', {}, h('strong', {}, 'Limits. '), p.limits),
      h('h2', {}, 'Six examples'),
      scroller('Examples from the word list', h('table', {}, h('caption', {}, 'Examples from the word list; underlined = stressed'), h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Word'), h('th', { scope: 'col' }, 'Meaning'), ...TRADITIONS.map((t) => h('th', { scope: 'col' }, TRADITION_LABELS[t])))),
        h('tbody', {}, p.examples.map((e) => h('tr', {}, h('td', { class: 'ru-he', dir: 'rtl', lang: 'he' }, e.he), h('td', {}, e.gloss), ...TRADITIONS.map((t, k) => h('td', { dir: 'ltr', lang: 'und-fonipa' }, stressed(e.ipa[k]), ' ', h('span', { lang: 'en' }, `(${e.simple[t === 'ashkenazi' ? 1 : 0]})`)))))))),
      h('p', {}, 'Sources: ', p.sources.map((s, k) => [k ? '; ' : '', h('a', { href: s.url }, s.label)])),
      h('nav', { 'aria-label': 'Rule pages' },
        i > 0 ? h('a', { href: `#/rules/${pages[i - 1].id}` }, `Previous: ${pages[i - 1].nav}`) : null, ' ',
        h('a', { href: '#/rules' }, 'All rules'), ' ',
        i < pages.length - 1 ? h('a', { href: `#/rules/${pages[i + 1].id}` }, `Next: ${pages[i + 1].nav}`) : null)].filter(Boolean));
  }

  (async () => {
    let data;
    try { data = await loader.json('rules.json'); } catch { if (alive) body.replaceChildren(h('p', { role: 'alert' }, 'The rule pages could not be loaded. Check your connection and reload; nothing was lost.')); return; }
    if (!alive) return;
    const id = ctx?.params?.rule;
    const i = id ? data.pages.findIndex((p) => p.id === id) : -1;
    if (id && i < 0) { index(data.pages); status.replaceChildren(doc.createTextNode(`There is no rule page called "${id}"; here are all of them.`)); return; }
    if (i >= 0) page(data.pages, i); else index(data.pages);
  })();

  return () => { alive = false; wrap.remove?.(); style.remove?.(); };
}
