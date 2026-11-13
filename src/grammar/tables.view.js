// @ts-check
// Grammar tables and drills on the Grammar notes page (ideas O2 to O9). Loaded on the learner's press.
import { audioButton } from '../shell/audio-access.js';
import { heText } from '../curriculum/dom.js';
import { TABS, DRAFT_NOTE, tablesFor, drill } from './tables.js';

export const TITLE = 'Tables And Drills';
export const PRACTICE = 'Practice This';

/**
 * @param {any} el the app's element builder @param {any} ctx @param {any} data data/grammar/tables.json
 * @param {{say?:(t:string)=>void, tab?:string}} [o]
 */
export function tablesSection(el, ctx, data, o = {}) {
  let tab = TABS.some(([id]) => id === o.tab) ? o.tab : TABS[0][0];
  let round = 0;
  const tabs = el('div', { class: 'gr-tabs', role: 'group', 'aria-label': 'Which tables' });
  const body = el('div', { class: 'gr-tables' });
  const wrap = el('section', { class: 'gr-lab', 'aria-label': TITLE }, el('h2', {}, TITLE), el('p', { class: 'muted' }, DRAFT_NOTE), tabs, body);
  const say = (t) => o.say?.(t);
  const btn = (label, onclick, extra = {}) => el('button', { class: 'btn secondary', type: 'button', style: 'min-height:44px', onclick, ...extra }, label);
  const cell = (c) => el('td', {}, c.he ? heText(c.he) : null, c.he && c.text ? el('div', { class: 'muted' }, c.text) : (c.text || null));

  function paintTabs() {
    tabs.replaceChildren(...TABS.map(([id, label]) => btn(label, () => { tab = id; paintTabs(); showTables(); say(`${label} opened.`); }, { 'aria-pressed': String(tab === id), 'data-tab': id })));
  }
  function showTables() {
    const label = TABS.find(([id]) => id === tab)[1];
    body.replaceChildren(btn(PRACTICE, () => startDrill(), { class: 'btn', 'aria-label': `Practice: ${label}` }),
      ...tablesFor(data, tab).map((t, k) => el('div', { class: 'gr-table' },
        t.note ? el('p', {}, t.note) : null,
        el('table', { 'data-table': `${tab}-${k}` },
          el('caption', {}, t.titleHe ? heText(t.titleHe) : null, t.titleHe ? ` ${t.title.replace(t.titleHe, '').trim()}` : t.title),
          el('thead', {}, el('tr', {}, ...t.head.map((x) => el('th', { scope: 'col' }, x)), el('th', { scope: 'col' }, 'Sound'))),
          el('tbody', {}, ...t.rows.map((row, i) => el('tr', {}, ...row.cells.map(cell),
            el('td', {}, row.say ? audioButton(el, ctx, { kind: 'word', id: `gr-${tab}-${k}-${i}`, text: row.say, label: 'Listen', name: row.cells.map((c) => c.text).filter(Boolean)[0] || label }) : null))))))));
  }
  function startDrill() {
    const qs = drill(data, tab, ++round + Math.floor(Math.random() * 1000), 8);
    let i = 0, right = 0;
    const next = () => {
      if (i >= qs.length) {
        body.replaceChildren(el('h3', {}, `You Got ${right} Of ${qs.length}`), el('p', {}, 'Wrong answers cost nothing. Look at the tables again and try a fresh set.'), btn('Another Set', () => startDrill()), ' ', btn('Back To The Tables', () => showTables()));
        say(`You got ${right} of ${qs.length}.`); return;
      }
      const q = qs[i];
      const note = el('p', { role: 'status', 'aria-live': 'polite' });
      const opts = q.options.map((op, k) => btn(op.he ? heText(op.he) : op.text, () => {
        if (opts.some((b) => b.disabled)) return;
        const ok = k === q.answer; if (ok) right++;
        opts.forEach((b, j) => { b.disabled = true; if (j === q.answer) b.setAttribute('data-right', '1'); });
        note.textContent = ok ? 'Right.' : 'Not this one. The right answer is marked.';
        const go = btn(i + 1 < qs.length ? 'Next' : 'See Your Score', () => { i++; next(); }, { class: 'btn' });
        note.after(go); go.focus?.();
      }, op.he ? { lang: 'he', dir: 'rtl' } : {}));
      body.replaceChildren(el('p', { class: 'muted' }, `Question ${i + 1} of ${qs.length}`), el('p', {}, q.prompt), q.show ? el('p', { class: 'gr-show' }, heText(q.show)) : null,
        el('div', { class: 'gr-options', role: 'group', 'aria-label': 'Answers' }, ...opts), note);
    };
    next();
  }
  paintTabs(); showTables();
  return wrap;
}
