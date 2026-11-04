// ALEF teacher share (DRAFT). Two pages on one view: learner "Share my progress" and teacher "Class summary".
// Everything is local: nothing is sent anywhere, there is no fetch/XHR/beacon. All text goes in via textContent (h() text nodes).
import { h } from '../shell/ui.js';
import { loadProgressData } from '../progress/data.js';
import { loadClassTrack } from '../classtrack/model.js';
import { buildSummary, toCode, toJson, describe, parseMany, DRAFT_NOTE, MAX_TOTAL_BYTES, MAX_LEARNERS } from './summary.js';
import { aggregate } from './aggregate.js';

const CSS = `
.tc { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--gap, 1rem); }
.tc > *, .tc-consent > * { min-inline-size: 0; max-inline-size: 100%; overflow-wrap: anywhere; }
.tc-scroll { overflow-x: auto; }
.tc-scroll table { min-inline-size: 36rem; }
.tc textarea { inline-size: 100%; min-block-size: 7rem; font: inherit; box-sizing: border-box; }
.tc .btn { min-block-size: var(--tap, 48px); }
.tc-row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.tc-consent { border: 2px solid var(--focus, currentColor); padding: .75rem; border-radius: 8px; }
.tc table { border-collapse: collapse; inline-size: 100%; }
.tc th, .tc td { border: 1px solid var(--border, #888); padding: .3rem .5rem; text-align: start; vertical-align: top; }
.tc-code { word-break: break-all; font-family: monospace; font-size: .8rem; }
@media print {
  @page { size: letter landscape; margin: 12mm; }
  body * { visibility: hidden !important; }
  .tc-sheet, .tc-sheet * { visibility: visible !important; }
  .tc-sheet { position: absolute; inset-block-start: 0; inset-inline-start: 0; inline-size: 100%; background: #fff !important; color: #000 !important; font-size: 9.5pt; }
  .tc-noprint { display: none !important; }
}
`;
const T = (x) => String(x);

function download(name, text, type) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch { /* download unavailable: the copyable code is still there */ }
}

export function mount(root, ctx = {}) {
  let alive = true;
  const mode = ctx.query?.mode === 'class' ? 'class' : 'share';
  const style = h('style', {}); style.textContent = CSS;
  const main = h('div', { class: 'tc' });
  const title = mode === 'class' ? 'Class summary' : 'Share my progress with my teacher';
  root.replaceChildren(style, h('h1', { id: 'view-title', tabindex: '-1' }, title), main);
  const draft = h('p', { class: 'draft-flag', role: 'note' }, DRAFT_NOTE);

  if (mode === 'share') renderShare(); else renderClass();

  function renderShare() {
    const name = h('input', { type: 'text', id: 'tc-name', maxlength: '60', autocomplete: 'off', placeholder: 'Leave empty to stay anonymous' });
    const out = h('div', { 'aria-live': 'polite' });
    const status = h('p', { role: 'status', class: 'small muted' }, '');
    async function make() {
      status.textContent = 'Building the summary on this device...';
      let sum;
      try {
        const [p, ct] = await Promise.all([loadProgressData(), loadClassTrack()]);
        sum = buildSummary(ctx.store, { lessons: p.lessons, weeks: ct.track.weeks }, { now: Date.now(), name: name.value });
      } catch { status.textContent = 'The summary could not be built. Nothing was sent.'; return; }
      if (!alive) return;
      const code = toCode(sum), json = toJson(sum);
      status.textContent = 'Summary ready. It has not been sent anywhere.';
      const ta = h('textarea', { readonly: '', 'aria-label': 'Summary code to copy', rows: '4' }); ta.value = code;
      out.replaceChildren(
        h('h2', {}, 'You are sharing'),
        h('ul', {}, ...describe(sum).map((x) => h('li', {}, x))),
        ta,
        h('div', { class: 'tc-row' },
          h('button', { type: 'button', class: 'btn', onclick: async () => { try { await navigator.clipboard.writeText(code); status.textContent = 'Code copied.'; } catch { ta.focus?.(); ta.select?.(); status.textContent = 'Select the code and copy it yourself.'; } } }, 'Copy code'),
          h('button', { type: 'button', class: 'btn secondary', onclick: () => download('alef-progress.json', json, 'application/json') }, 'Download file (.json)'),
          h('button', { type: 'button', class: 'btn secondary', onclick: () => download('alef-progress.txt', code + '\n', 'text/plain') }, 'Download file (.txt)')),
        h('details', {}, h('summary', {}, 'Show the exact file contents'), h('pre', { class: 'tc-code', tabindex: '0' }, json)));
    }
    main.replaceChildren(draft,
      h('section', { class: 'card tc-consent', 'aria-labelledby': 'tc-h-consent', role: 'note' },
        h('h2', { id: 'tc-h-consent' }, 'Before you share'),
        h('p', {}, 'You are sharing a short summary: lessons you finished, letters and vowel signs you know, the look-alike pairs and signs you miss most, your class-track week, any timed read results, and today\'s date. It has no email, no account and no recordings.'),
        h('p', {}, 'Nothing leaves your device until you send it yourself, by pasting the code into a message or attaching the file. ALEF never uploads it.')),
      h('div', {}, h('label', { for: 'tc-name' }, 'Your name for your teacher (optional)'), name),
      h('button', { type: 'button', class: 'btn', onclick: make }, 'Export my summary'),
      status, out,
      h('p', { class: 'small' }, h('a', { href: '#/progress' }, 'Back to Progress')));
  }

  function renderClass() {
    const ta = h('textarea', { id: 'tc-paste', 'aria-label': 'Paste learner codes, one per line', rows: '6', spellcheck: 'false' });
    const file = h('input', { type: 'file', id: 'tc-file', accept: '.json,.txt,application/json,text/plain', multiple: '' });
    const status = h('p', { role: 'status', class: 'small' }, '');
    const result = h('div', {});
    let fileTexts = [];
    function run() {
      const { summaries, errors } = parseMany([ta.value, ...fileTexts]);
      status.textContent = `${summaries.length} learner summar${summaries.length === 1 ? 'y' : 'ies'} read${errors.length ? `, ${errors.length} problem${errors.length === 1 ? '' : 's'}` : ''}. Processed in this browser only.`;
      const errList = errors.length ? h('ul', { role: 'alert' }, ...errors.slice(0, 10).map((e) => h('li', {}, e))) : null;
      if (!summaries.length) { result.replaceChildren(errList); return; }
      const a = aggregate(summaries);
      const top = (title, arr, empty) => h('section', { 'aria-label': title },
        h('h3', {}, title),
        arr.length ? h('ol', {}, ...arr.map((e) => h('li', {}, `${e.label}: ${e.learners} of ${a.learners} learner${a.learners === 1 ? '' : 's'}, ${e.total} miss${e.total === 1 ? '' : 'es'} in total`))) : h('p', { class: 'small muted' }, empty));
      const rows = [...a.rows].sort((x, y) => Number(y.needsHelp) - Number(x.needsHelp) || x.week - y.week || x.index - y.index);
      result.replaceChildren(errList,
        h('section', { class: 'tc-sheet', 'aria-labelledby': 'tc-h-sheet' },
          h('h2', { id: 'tc-h-sheet' }, `Class summary: ${a.learners} learner${a.learners === 1 ? '' : 's'}, median class-track week ${a.medianWeek}`),
          h('p', { class: 'small' }, DRAFT_NOTE),
          top('Most-missed look-alike pairs', a.confusions, 'No pair mix-ups recorded.'),
          top('Vowel signs and sign practice', a.signs, 'No sign misses recorded.'),
          a.letters.length ? top('Single letters that slip in review', a.letters, '') : null,
          h('h3', {}, 'Who needs help on what'),
          h('div', { class: 'tc-scroll', role: 'region', tabindex: '0', 'aria-label': 'Learner table (scrolls sideways)' }, h('table', {},
            h('caption', { class: 'small' }, 'Sorted with those needing help first. Counts are from each learner\'s own device.'),
            h('thead', {}, h('tr', {}, ...['Learner', 'Week', 'Lessons', 'Letters', 'Signs', 'Needs help on', 'Timed read', 'Date'].map((c) => h('th', { scope: 'col' }, c)))),
            h('tbody', {}, ...rows.map((r) => h('tr', {},
              h('th', { scope: 'row' }, r.name),
              h('td', {}, T(r.weekDone ? 'done' : r.week) + (r.behind ? ' (behind)' : '')),
              h('td', {}, T(r.lessons)), h('td', {}, T(r.letters)), h('td', {}, T(r.signs)),
              h('td', {}, r.helpOn.length ? r.helpOn.join('; ') : (r.behind ? 'Pace' : 'None recorded')),
              h('td', {}, r.avgWpm ? `${r.avgWpm} wpm` : 'Not measured'),
              h('td', {}, r.date))))))),
        h('div', { class: 'tc-row tc-noprint' }, h('button', { type: 'button', class: 'btn', onclick: () => { if (typeof window !== 'undefined' && window.print) window.print(); } }, 'Print this table')));
    }
    file.addEventListener('change', async () => {
      const files = [...(file.files || [])].slice(0, MAX_LEARNERS);
      const texts = [];
      for (const f of files) { if (f.size > MAX_TOTAL_BYTES) { texts.push('x'.repeat(MAX_TOTAL_BYTES + 1)); continue; } try { texts.push(await f.text()); } catch { /* skip unreadable file */ } }
      fileTexts = texts; run();
    });
    main.replaceChildren(draft,
      h('section', { class: 'card tc-consent', role: 'note' },
        h('p', {}, 'Learners send you their summary themselves. Paste their codes (one per line) or load their files below. Everything is read in this browser tab; nothing is uploaded, stored or sent anywhere, and HTML or oversize input is rejected.')),
      h('div', {}, h('label', { for: 'tc-paste' }, 'Paste learner codes or JSON'), ta),
      h('div', {}, h('label', { for: 'tc-file' }, 'Or load files (.json or .txt)'), file),
      h('div', { class: 'tc-row' }, h('button', { type: 'button', class: 'btn', onclick: run }, 'Show class summary')),
      status, result);
  }
  return () => { alive = false; };
}
