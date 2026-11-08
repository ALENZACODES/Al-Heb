/**
 * Read it my way (#/read-my-way): paste pointed Hebrew (one or more lines), get every word in the learner's chosen tradition with its
 * respelling and IPA (stress underlined), unknown words flagged, and a printable sheet.
 * Only words in the lookup table (course vocabulary, phrasebook, prayer texts) can be converted; others are listed, never guessed.
 * Tradition: ctx.settings.congregation (israeli | sephardi | ashkenazi), changed here through settings.set when available.
 * Store key "pron.readmyway.v1": {text, tradition}. Print: the "Print this sheet" button calls window.print(); the inline @media print
 * rules show only the sheet. Rule-generated, unverified by a native speaker.
 * ctx extras for tests: ctx.compareData {index, shards, reasons}, ctx.print (replaces window.print).
 */
import { TRADITIONS, TRADITION_LABELS, NOTICE, tokenize, variantsOf, syllablesOf, describeDifferences } from './compare.model.js';
import { createLoader } from './lookup.js';
import { normalizeTradition } from './sounds.model.js';
import { setCongregation } from './forTradition.js';

export const READ_KEY = 'pron.readmyway.v1';
const CSS = `
.alef-rmw{max-inline-size:56rem;margin-inline:auto;overflow-wrap:anywhere}
.alef-rmw *{box-sizing:border-box;max-inline-size:100%}
.alef-rmw textarea,.alef-rmw select{inline-size:100%;font:inherit;padding:.4rem .6rem;border:2px solid var(--border,#999);border-radius:8px;background:var(--card,#fff);color:inherit}
.alef-rmw textarea{min-block-size:7rem;font-size:1.4rem}
.alef-rmw select{min-block-size:var(--tap,48px)}
.alef-rmw label{display:block;font-weight:600;margin-block:.75rem .25rem}
.alef-rmw label:has(input[type=checkbox]){display:flex;align-items:center;gap:.5rem;min-block-size:var(--tap,48px);font-weight:400}
.alef-rmw input[type=checkbox]{inline-size:1.5rem;block-size:1.5rem;flex:none}
.alef-rmw button{min-block-size:var(--tap,48px);min-inline-size:var(--tap,48px);font:inherit;padding:.4rem .9rem;margin-block:.4rem;margin-inline-end:.4rem}
.alef-rmw :focus-visible{outline:3px solid currentColor;outline-offset:2px}
.alef-rmw .rmw-flag{border-inline-start:6px solid currentColor;padding-inline-start:.5rem}
.alef-rmw .rmw-sheet table{border-collapse:collapse;inline-size:100%}
.alef-rmw .rmw-sheet th,.alef-rmw .rmw-sheet td{border:1px solid currentColor;padding:.35rem .5rem;text-align:start;vertical-align:top}
.alef-rmw .rmw-he{font-size:1.6rem}
.alef-rmw .rmw-ipa strong{text-decoration:underline;text-underline-offset:.2em}
@media print{
  body *{visibility:hidden}
  .alef-rmw .rmw-sheet,.alef-rmw .rmw-sheet *{visibility:visible}
  .alef-rmw .rmw-sheet{position:absolute;inset-block-start:0;inset-inline-start:0;inline-size:100%;color:#000;background:#fff}
  .alef-rmw .rmw-noprint{display:none}
  .alef-rmw .rmw-sheet th,.alef-rmw .rmw-sheet td{border-color:#000}
  .alef-rmw .rmw-he{font-size:18pt}
}
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
  let alive = true, tradition = normalizeTradition(ctx?.settings?.congregation), reasons = null, lastRows = null;

  const title = h('h1', { id: 'view-title', tabindex: '-1' }, 'Read it my way');
  const area = h('textarea', { id: 'rmw-text', dir: 'rtl', lang: 'he', rows: '5', spellcheck: 'false', 'aria-describedby': 'rmw-help' });
  const help = h('p', { id: 'rmw-help' }, 'Paste Hebrew with vowel points, one or more lines. Words not in the table are listed and left out; nothing is guessed.');
  const sel = h('select', { id: 'rmw-trad' }, TRADITIONS.map((t) => h('option', { value: t }, TRADITION_LABELS[t])));
  sel.value = tradition;
  const all3 = h('input', { type: 'checkbox', id: 'rmw-all' });
  const go = h('button', { type: 'submit' }, 'Convert');
  const printBtn = h('button', { type: 'button', 'data-act': 'print', disabled: true }, 'Print this sheet');
  const form = h('form', { 'aria-label': 'Read it my way' },
    h('label', { for: 'rmw-text' }, 'Pointed Hebrew'), area, help,
    h('label', { for: 'rmw-trad' }, 'Read it in this tradition'), sel,
    h('label', { for: 'rmw-all' }, all3, ' Also show the other two traditions'), go, printBtn);
  form.className = 'rmw-noprint';
  const status = h('div', { role: 'status', 'aria-live': 'polite', class: 'rmw-noprint' });
  const out = h('div', {});
  const style = h('style', {}, CSS);
  const wrap = h('section', { class: 'alef-rmw', 'aria-labelledby': 'view-title' }, h('div', { class: 'rmw-noprint' }, title, h('p', { class: 'rmw-flag', role: 'note' }, NOTICE)), form, status, out);
  root.append(style, wrap);
  const say = (t) => status.replaceChildren(doc.createTextNode(t));

  const stressed = (ipa) => {
    const parts = [];
    syllablesOf(ipa).syllables.forEach((s, i) => { if (i) parts.push('.'); parts.push(s.stressed ? h('strong', {}, s.text) : s.text); });
    return parts;
  };

  async function convert() {
    const text = String(area.value ?? '');
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) { out.replaceChildren(); printBtn.setAttribute('disabled', ''); lastRows = null; say('Paste some pointed Hebrew first.'); return; }
    const rows = []; const unknown = []; const known = []; let seen = 0;
    for (const line of lines) {
      const tokens = await loader.lookup(tokenize(line)); seen += tokens.length;
      for (const t of tokens) { if (t.entry) { rows.push(t); known.push({ entry: t.entry }); } else unknown.push(t); }
    }
    if (!alive) return;
    if (!seen) { out.replaceChildren(); printBtn.setAttribute('disabled', ''); lastRows = null; say('Paste some pointed Hebrew first.'); return; }
    lastRows = rows;
    const cols = all3.checked ? TRADITIONS : [tradition];
    const head = h('tr', {}, h('th', { scope: 'col' }, 'Hebrew'), ...cols.flatMap((t) => [h('th', { scope: 'col' }, `${TRADITION_LABELS[t]} respelling`), h('th', { scope: 'col' }, `${TRADITION_LABELS[t]} IPA`)]));
    const body = rows.map((r) => {
      const v = variantsOf(r.entry);
      return h('tr', {}, h('td', { class: 'rmw-he', dir: 'rtl', lang: 'he' }, r.he), ...cols.flatMap((t) => [h('td', { dir: 'ltr' }, v[t].simple), h('td', { class: 'rmw-ipa', dir: 'ltr', lang: 'und-fonipa' }, stressed(v[t].ipa))]));
    });
    const diff = reasons && known.length ? describeDifferences(known, reasons) : { sentences: [] };
    const sheet = h('section', { class: 'rmw-sheet', 'aria-label': `Reading sheet, ${cols.map((c) => TRADITION_LABELS[c]).join(', ')}` },
      h('h2', {}, `Reading sheet: ${cols.map((c) => TRADITION_LABELS[c]).join(', ')}`),
      rows.length ? h('table', {}, h('caption', {}, 'The underlined syllable is stressed.'), h('thead', {}, head), h('tbody', {}, body)) : h('p', {}, 'None of these words are in the table.'),
      unknown.length ? h('p', { class: 'rmw-flag', role: 'alert' }, `Not in the table, left out: ${unknown.map((t) => t.he).join(', ')}.${unknown.some((t) => !t.pointed) ? ' Words need vowel points.' : ''}`) : null,
      h('p', {}, NOTICE));
    const why = diff.sentences.length ? h('section', { class: 'rmw-noprint', 'aria-labelledby': 'rmw-why' }, h('h2', { id: 'rmw-why' }, 'What differs between traditions here'), h('ul', {}, diff.sentences.map((s) => h('li', {}, s)))) : null;
    out.replaceChildren(...[sheet, why].filter(Boolean));
    if (rows.length) printBtn.removeAttribute?.('disabled'); else printBtn.setAttribute('disabled', '');
    say(`${rows.length} ${rows.length === 1 ? 'word' : 'words'} converted${unknown.length ? `, ${unknown.length} not in the table` : ''}.`);
    try { if (ctx?.store?.set) await ctx.store.set(READ_KEY, { text, tradition }); } catch { /* best effort */ }
  }

  form.addEventListener('submit', (e) => { e?.preventDefault?.(); convert(); });
  sel.addEventListener('change', () => {
    tradition = normalizeTradition(sel.value);
    try { if (ctx?.settings) setCongregation(ctx.settings, tradition); } catch { /* keep local */ }
    if (lastRows) convert();
  });
  all3.addEventListener('change', () => { if (lastRows) convert(); });
  printBtn.addEventListener('click', () => { try { (ctx?.print || globalThis.print)?.(); } catch { say('Printing is not available here.'); } });

  (async () => {
    try { reasons = await loader.json('reasons.json'); } catch { if (alive) say('The comparison table could not be loaded. Check your connection and reload; nothing was lost.'); return; }
    const s = ctx?.store?.get ? await ctx.store.get(READ_KEY) : null;
    if (alive && s && typeof s === 'object' && typeof s.text === 'string' && s.text) { area.value = s.text; if (!ctx?.settings?.congregation && s.tradition) { tradition = normalizeTradition(s.tradition); sel.value = tradition; } await convert(); }
    else if (alive) say('Paste pointed Hebrew and choose your tradition.');
  })();

  return () => { alive = false; wrap.remove?.(); style.remove?.(); };
}
