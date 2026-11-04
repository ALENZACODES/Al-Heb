// @ts-check
// "Aliyah rehearsal": what happens when you are called to the Torah, step by step, with the registry's blessings.
import { el, heEl, playHook, hasDivineName } from './ui.js';
import { recordedLine } from './ladder.view.js';

const CERT = {
  common: ['Common practice', 'Done this way in many congregations. Still ask.'],
  varies: ['Customs vary', 'Congregations differ. Ask the gabbai.'],
  unknown: ['Unknown here', 'This app does not record this. Ask the gabbai.'],
};

export function renderAliyah(host, env) {
  const { ctx, course, translit, progress, save, announce } = env;
  const A = course.aliyah;
  const st = { rehearse: false, shown: new Set(), cur: 0 };
  const root = el('div', { class: 'trd-aliyah' });
  host.append(root);
  const done = () => progress.aliyah.done || (progress.aliyah.done = {});
  render();

  function prayerBlock(step) {
    const rec = course.corpus.getText(step.prayerId);
    if (!rec) return el('p', { class: 'trd-muted' }, `Text ${step.prayerId} is not in the registry.`);
    const hidden = st.rehearse && !st.shown.has(step.id);
    const box = el('div', { class: 'trd-card', role: 'group', 'aria-label': `Words for this step: ${rec.title}` });
    box.append(el('p', {}, el('strong', {}, rec.title), el('span', { class: 'trd-badge' }, rec.ref)));
    if (hidden) {
      box.append(el('p', { class: 'trd-muted' }, 'Rehearsal mode: say it from memory first.'),
        el('button', { type: 'button', class: 'trd-btn', onclick: () => { st.shown.add(step.id); render(); focusStep(step.id); } }, 'Show the words'));
      return box;
    }
    const lines = rec.he.split('\n'), en = String(rec.english).split('\n');
    lines.forEach((l, i) => {
      box.append(heEl('p', l, 'trd-he'));
      const tr = translit(l); if (tr) box.append(el('p', { class: 'trd-tr' }, tr));
      if (en.length === lines.length && en[i]) box.append(el('p', { class: 'trd-en' }, en[i]));
    });
    if (en.length !== lines.length) box.append(el('p', { class: 'trd-en' }, rec.english));
    if (lines.some(hasDivineName)) box.append(el('p', { class: 'trd-muted' }, 'Say Adonai where the four-letter name is written.'));
    const status = el('p', { class: 'trd-status', role: 'status', 'aria-live': 'polite' });
    box.append(el('div', { class: 'trd-row' }, el('button', { type: 'button', class: 'trd-btn', onclick: () => playHook(ctx, status, 'prayer', rec.id, rec.he, rec.title) }, 'Hear it')),
      status, el('p', { class: 'trd-muted' }, recordedLine(ctx, { kind: 'prayer', id: rec.id })),
      el('details', {}, el('summary', {}, 'Source and licence'), el('p', {}, rec.attribution), el('p', { class: 'trd-muted' }, `Hebrew licence label: ${rec.license}. Proofread by a person: ${rec.proofread ? 'yes' : 'no'}.`)));
    return box;
  }

  function render() {
    root.replaceChildren();
    root.append(el('h2', { id: 'trd-sec-h', tabindex: '-1' }, 'Aliyah rehearsal'), el('p', {}, A.intro), el('p', { role: 'note', class: 'trd-draft' }, 'Draft. Written from general knowledge of common practice; no rabbi, cantor or gabbai has reviewed it. Where this page is not sure, it says so.'));
    root.append(el('div', { class: 'trd-row' }, el('button', { type: 'button', class: 'trd-btn', 'aria-pressed': st.rehearse ? 'true' : 'false', onclick: () => { st.rehearse = !st.rehearse; st.shown.clear(); render(); } }, st.rehearse ? 'Rehearsal mode: on (words hidden)' : 'Rehearsal mode: off')));
    const n = A.steps.filter((s) => done()[s.id]).length;
    root.append(el('p', { class: 'trd-muted', role: 'status' }, `${n} of ${A.steps.length} steps marked as rehearsed.`));
    const ol = el('ol', { class: 'trd-steps', 'aria-label': 'Steps of an aliyah' });
    A.steps.forEach((s, i) => {
      const [certLabel, certHelp] = CERT[s.certainty] || CERT.unknown;
      const li = el('li', { id: `trd-step-${s.id}`, class: 'trd-card', 'data-step': s.id });
      li.append(...[el('h3', {}, `${s.title}`, el('span', { class: 'trd-badge', title: certHelp }, certLabel)),
        el('p', {}, s.what),
        s.you?.length ? el('ul', {}, ...s.you.map((y) => el('li', {}, y))) : null,
        s.ask?.length ? el('p', { class: 'trd-muted' }, 'Ask: ', s.ask.join(' / ')) : null,
        s.prayerId ? prayerBlock(s) : null,
        el('label', { class: 'trd-row' }, el('input', { type: 'checkbox', checked: done()[s.id] ? '' : null, onchange: (e) => { if (e.target.checked) done()[s.id] = true; else delete done()[s.id]; save(); announce(`${s.title}: ${e.target.checked ? 'marked as rehearsed' : 'unmarked'}.`); render(); focusStep(s.id, 'input'); } }), ' I have rehearsed this step')].filter(Boolean));
      ol.append(li);
    });
    root.append(ol);

    // differences
    const D = A.differences;
    root.append(el('h2', {}, 'How movements differ'), el('p', {}, D.intro));
    for (const row of D.rows) {
      root.append(el('div', { class: 'trd-card' }, el('h3', {}, row.topic),
        el('ul', {}, ...D.movements.map((m, i) => el('li', { class: row.values[i] === 'unknown' ? 'trd-unk' : '' }, el('strong', {}, `${m}: `), row.values[i] === 'unknown' ? 'unknown (not recorded here)' : row.values[i]))),
        el('p', { class: 'trd-muted' }, row.basis)));
    }
  }
  function focusStep(id, sel = 'h3') { const li = root.querySelector(`#trd-step-${id}`); const t = li && li.querySelector(sel === 'input' ? 'input' : 'h3'); if (t) { if (sel !== 'input') t.setAttribute('tabindex', '-1'); t.focus(); } }
  return () => {};
}
