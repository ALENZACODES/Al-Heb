// @ts-check
// Torah Search (#/torah-search, E5): find verses by a Hebrew word or by a root; each result opens the reader at that verse and can
// be saved to the verse notebook (E6). The index (data/torahstudy/search.json, letters only) loads when this page opens.
import { h, heSpan } from '../shell/ui.js';
import { search, queryWords, rootForms, readerHref, refLabel, MAX_SHOWN } from './search.js';
import * as NB from './notebook.js';

export const ROOT_NOTE = 'Root search looks for the word forms that Aleph\'s root lists hold for that root (they come from its dictionary and are not reviewed). The Torah has many forms those lists do not hold, so this finds some verses with the root, not all of them.';
const load = async (ctx, rel) => { const r = await (ctx?.fetchFn ?? fetch)(new URL('../../' + rel, import.meta.url)); if (!r || r.ok === false) throw new Error(rel); return r.json(); };

export function mount(root, ctx) {
  let alive = true, index = null, roots = null, mode = 'word', withPrefix = true, loose = false;
  const q0 = String(ctx?.query?.q || ctx?.route?.query?.q || '');
  const input = h('input', { type: 'search', id: 'ts-q', lang: 'he', dir: 'rtl', value: q0, autocomplete: 'off', style: 'min-height:44px;inline-size:100%' });
  const status = h('p', { role: 'status', 'aria-live': 'polite' }, 'Loading the Torah text…');
  const results = h('ol', { class: 'ts-results' });
  const modeBar = h('div', { class: 'row', role: 'group', 'aria-label': 'Search by' });
  const opts = h('div', { class: 'row' });
  const note = h('p', { class: 'muted' });
  const paintBars = () => {
    modeBar.replaceChildren(...[['word', 'A word'], ['root', 'A root']].map(([k, label]) => h('button', { type: 'button', class: 'btn secondary', 'aria-pressed': mode === k, onclick: () => { mode = k; paintBars(); run(); } }, label)));
    opts.replaceChildren(
      h('label', {}, h('input', { type: 'checkbox', checked: withPrefix || undefined, onchange: (e) => { withPrefix = !!e.target.checked; run(); } }), ' Also with ו ה ב כ ל מ ש in front'),
      h('label', {}, h('input', { type: 'checkbox', checked: loose || undefined, onchange: (e) => { loose = !!e.target.checked; run(); } }), ' Also spellings without ו and י (finds more, and some other words)'));
    note.textContent = mode === 'root' ? ROOT_NOTE : 'Type a Hebrew word, with or without vowel points. Two or more words find verses that have all of them.';
  };
  async function run() {
    if (!index) return;
    const q = String(input.value ?? input.getAttribute?.('value') ?? '').trim();
    if (!q) { results.replaceChildren(); status.textContent = 'Type a Hebrew word or root.'; return; }
    let found = [];
    if (mode === 'root') {
      if (!roots) { status.textContent = 'Loading the root lists…'; try { const [f, v] = await Promise.all([load(ctx, 'data/roots/families.json'), load(ctx, 'data/roots/verbs.json')]); roots = { f, v }; } catch { status.textContent = 'The root lists did not load.'; return; } }
      const forms = rootForms(q, roots.f, roots.v);
      if (!forms.length) { results.replaceChildren(); status.textContent = 'Aleph\'s root lists have no root with those letters.'; return; }
      found = search(index, { anyOf: forms, withPrefix, loose });
      status.textContent = `${found.length} ${found.length === 1 ? 'verse has' : 'verses have'} one of the ${forms.length} listed forms: ${forms.join(', ')}.`;
    } else {
      const words = queryWords(q);
      if (!words.length) { status.textContent = 'Type the word in Hebrew letters.'; results.replaceChildren(); return; }
      found = search(index, { words, withPrefix, loose });
      status.textContent = `${found.length} ${found.length === 1 ? 'verse' : 'verses'} found.`;
    }
    if (found.length > MAX_SHOWN) status.textContent += ` Showing the first ${MAX_SHOWN}.`;
    const nb = NB.read(ctx);
    results.replaceChildren(...found.slice(0, MAX_SHOWN).map((r) => {
      const toks = r.text.split(' ');
      const line = h('span', { lang: 'he', dir: 'rtl', class: 'ts-verse' }, ...toks.flatMap((t, i) => [i ? ' ' : '', r.hits.includes(i) ? h('mark', {}, t) : t]));
      const saved = NB.has(nb, r);
      const saveBtn = h('button', { type: 'button', class: 'btn secondary', disabled: saved || undefined, onclick: () => {
        if (NB.write(ctx, NB.save(NB.read(ctx), r))) { saveBtn.setAttribute('disabled', ''); saveBtn.textContent = 'Saved'; status.textContent = `${refLabel(r)} saved to your verse notebook.`; }
        else status.textContent = 'The notebook could not be saved on this device.';
      } }, saved ? 'Saved' : 'Save to notebook');
      return h('li', { class: 'ts-hit' }, h('a', { href: readerHref(r) }, refLabel(r)), ' ', line, ' ', saveBtn);
    }));
  }
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } });
  root.replaceChildren(h('article', { class: 'card torah-search' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Torah Search'),
    h('p', {}, 'Search all five books of the Torah. Each result opens the Torah reader at that verse.'),
    modeBar, h('label', { for: 'ts-q' }, 'Hebrew word or root'), input,
    h('p', {}, h('button', { type: 'button', class: 'btn', onclick: run }, 'Search'), ' ', h('a', { href: '#/verse-notebook' }, 'Your verse notebook')),
    opts, note, status, results));
  paintBars();
  (async () => {
    try { index = await load(ctx, 'data/torahstudy/search.json'); } catch { if (alive) status.textContent = 'The Torah text did not load. Check the connection and open this page again.'; return; }
    if (!alive) return;
    status.textContent = 'Ready. Type a Hebrew word or root.';
    if (q0) run();
  })();
  return () => { alive = false; };
}
