// @ts-check
// #/certificate: the learner's own Certificate of Lessons Completed, and #/certificate?r=<code> to read one from a link.
// Lane 4 (12 Nov). Wording lives in certificate.js COPY; nothing here claims a review, an assessment or a signature.
import { h } from '../shell/ui.js';
import { summaryById } from '../curriculum/lessons-index.js';
import { CHECKS_KEY } from '../curriculum/passmark.js';
import { buildRecord, evaluate, dateText, recordCode, recordFromCode, recordLink, cleanName, COPY } from './certificate.js';

const CSS = `
.lc{max-inline-size:46rem;margin-inline:auto;overflow-wrap:anywhere}
.lc .lc-sheet{border:1px solid var(--border,#999);border-radius:12px;padding:1rem 1.25rem;background:var(--card,#fff)}
.lc table{inline-size:100%;border-collapse:collapse;font-size:.95rem}
.lc th,.lc td{text-align:start;padding:.35rem .4rem;border-block-end:1px solid var(--border,#ccc);vertical-align:top}
.lc .lc-row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-block:.75rem}
.lc .btn{min-block-size:var(--tap,48px)}
.lc .lc-limits{border-inline-start:6px solid currentColor;padding-inline-start:.6rem}
.lc .lc-flag{font-weight:700}
.lc input[type=text]{min-block-size:44px;inline-size:min(100%,22rem)}
@media print{
  @page{size:A4;margin:14mm}
  body *{visibility:hidden!important}
  .lc-sheet,.lc-sheet *{visibility:visible!important}
  .lc-sheet{position:absolute;inset-block-start:0;inset-inline-start:0;inline-size:100%;border:0!important;background:#fff!important;color:#000!important;font-size:10.5pt}
  .lc-noprint{display:none!important}
  .lc tr{break-inside:avoid}
}`;
function style() { try { if (document.getElementById('lc-style')) return; const s = document.createElement('style'); s.id = 'lc-style'; s.textContent = CSS; document.head.append(s); } catch { /* optional */ } }

const STATUS = {
  meets: 'Meets the pass rule',
  unscored: 'Score not kept',
  below: 'Below the pass rule: not counted',
  impossible: 'Score is not possible (more right than asked): not counted',
  'unknown-lesson': 'Not a lesson in this copy of Aleph: not counted',
};

/** The printable sheet for one record. */
export function sheet(rec, ev, { checking = false } = {}) {
  const n = rec.name || 'The learner';
  return h('div', { class: 'lc-sheet', id: 'lc-sheet' },
    h('h2', { id: 'lc-name' }, rec.name ? `${rec.name}` : 'Name not given'),
    h('p', { id: 'lc-what' }, COPY.what(rec.name)),
    h('p', { id: 'lc-summary' }, h('strong', {}, `${ev.meets} lesson${ev.meets === 1 ? '' : 's'} meet the pass rule`),
      ev.firstTryPct != null ? `, with ${ev.right} of ${ev.of} quick-check questions right on the first try across those lessons (${ev.firstTryPct}%).` : '.',
      ev.unscored ? ` ${ev.unscored} more completed lesson${ev.unscored === 1 ? ' has' : 's have'} no score kept and ${ev.unscored === 1 ? 'is' : 'are'} not counted.` : '',
      ev.problems ? ` ${ev.problems} row${ev.problems === 1 ? '' : 's'} could not be counted (see the table).` : ''),
    ev.ruleChanged ? h('p', { class: 'lc-flag', role: 'note' }, 'The record was made with a different pass rule from this copy of Aleph; every row below uses this copy’s rule.') : null,
    h('table', { id: 'lc-table' },
      h('caption', { class: 'visually-hidden' }, `Lessons ${n} completed`),
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Lesson'), h('th', { scope: 'col' }, 'Completed'), h('th', { scope: 'col' }, 'First-try score'), h('th', { scope: 'col' }, 'Result'))),
      h('tbody', {}, ...ev.rows.map((r) => h('tr', { 'data-status': r.status, 'data-lesson': r.id },
        h('td', {}, r.title, r.title !== r.id ? h('span', { class: 'muted' }, ` (${r.id})`) : null),
        h('td', {}, dateText(r.completedAt)),
        h('td', {}, r.right != null && r.of ? `${r.right} of ${r.of} (${r.pct}%; pass mark ${r.need})` : 'Not kept'),
        h('td', { class: r.status === 'meets' ? '' : 'lc-flag' }, STATUS[r.status]))))),
    ev.rows.length ? null : h('p', { id: 'lc-empty' }, 'No completed lessons yet.'),
    ev.unscored ? h('p', { class: 'muted' }, COPY.unscored) : null,
    h('p', { class: 'lc-limits', id: 'lc-limits' }, COPY.limits),
    h('p', { class: 'muted', id: 'lc-issued' }, `${checking ? 'Record made' : 'Made'} ${dateText(rec.issuedAt)} from the learner’s own records. Aleph, a free Hebrew course; no account, no server.`));
}

/** @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx) {
  style();
  const wrap = h('section', { class: 'lc', 'aria-labelledby': 'view-title' });
  const h1 = h('h1', { id: 'view-title', tabindex: '-1' }, COPY.title);
  const status = h('p', { role: 'status', 'aria-live': 'polite', id: 'lc-status' });
  const body = h('div', {});
  wrap.append(h1, body, status); root.append(wrap);
  let alive = true;
  const store = ctx?.store;
  const base = () => { try { return globalThis.location.href; } catch { return 'https://alef-review.onrender.com/'; } };

  async function showLink(code) {
    let rec = null;
    try { rec = await recordFromCode(code); } catch (e) { rec = null; }
    if (!alive) return;
    if (!rec) { body.replaceChildren(h('p', { role: 'alert', id: 'lc-bad' }, 'This link does not hold a readable record. It may have been cut short when it was copied.'), h('p', {}, h('a', { href: '#/certificate' }, 'Make your own record'))); return; }
    const ev = evaluate(rec, summaryById);
    body.replaceChildren(h('p', { id: 'lc-checking' }, COPY.checking), sheet(rec, ev, { checking: true }),
      h('div', { class: 'lc-row lc-noprint' }, h('button', { type: 'button', class: 'btn secondary', onclick: () => globalThis.print?.() }, 'Print')));
  }

  function showMine() {
    let progress, checks, name = '';
    try { progress = store?.get?.('curriculum.progress'); checks = store?.get?.(CHECKS_KEY); name = store?.get?.('awards.v1')?.displayName || ''; } catch { /* empty record */ }
    const input = h('input', { type: 'text', id: 'lc-name-input', maxlength: '80', value: cleanName(name), autocomplete: 'name' });
    const out = h('div', {});
    const linkBox = h('p', { class: 'lc-noprint', id: 'lc-link' });
    let current = null;
    const paint = () => { current = buildRecord({ progress, checks, name: input.value, now: Date.now() }); out.replaceChildren(sheet(current, evaluate(current, summaryById))); linkBox.replaceChildren(); };
    input.addEventListener('input', paint);
    const copyBtn = h('button', { type: 'button', class: 'btn', id: 'lc-copy', onclick: async () => {
      const link = recordLink(base(), await recordCode(current));
      linkBox.replaceChildren(h('a', { href: link, id: 'lc-link-a' }, 'Link to check this record'), ' ', h('span', { class: 'muted' }, `(${link.length.toLocaleString('en')} characters)`));
      try { await navigator.clipboard.writeText(link); status.textContent = 'Link copied. Anyone who opens it sees this record.'; } catch { status.textContent = 'Copying is not available here. Press and hold the link to copy it.'; }
    } }, 'Copy a link to this record');
    paint();
    body.replaceChildren(
      h('div', { class: 'lc-row lc-noprint' }, h('label', { for: 'lc-name-input' }, 'Name on the record (optional) '), input),
      out,
      h('p', { class: 'lc-noprint' }, COPY.link),
      h('div', { class: 'lc-row lc-noprint' }, copyBtn, h('button', { type: 'button', class: 'btn secondary', id: 'lc-print', onclick: () => globalThis.print?.() }, 'Print')),
      linkBox);
  }

  if (ctx?.query?.r) showLink(String(ctx.query.r)); else showMine();
  return () => { alive = false; };
}
