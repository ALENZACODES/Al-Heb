// @ts-check
// Writing (#/write). mount(root, ctx) => unmount. Three parts on one page:
//   Journal            one prompt a day from the prompt bank, the learner's own words saved on this device, a run of days, a history
//   Type The Answer    an English line, typed in Hebrew from memory, graded with spelling differences allowed
//   Rewrite            a Hebrew sentence to rewrite: as a woman says it, said to a woman, about more than one, or its opposite
// Nothing leaves the device. Store key: writing.v1. Tests inject ctx.writingData {prompts, pack}, ctx.clock {now}, ctx.rng.
import { el, heText, storeGet, storeSet } from '../curriculum/dom.js';
import { loadJSON } from '../curriculum/data.js';
import { WRITING_KEY, normalizeState, promptFor, saveEntry, journalStreak, exportText, dayKey, showName, gradeHebrew, freeTextItems, rewriteItems, pickRound, recordAnswer, REWRITE_ASK } from './writing.js';

export const ROUND = 8;
export const COPY = Object.freeze({
  title: 'Writing',
  lead: 'Write a few lines each day, and practise typing Hebrew from memory. What you write stays on this device.',
  journal: 'Journal', answer: 'Type The Answer', rewrite: 'Rewrite',
  journalHint: 'Write in any language. A line or two is enough.',
  saved: 'Saved on this device.', removed: 'Today’s entry was removed.',
  none: 'No entries yet. Today’s will be the first.',
  keyboard: 'No Hebrew keyboard? Typing practice has one on the screen and shows how to add Hebrew to your device.',
  empty: 'Type your answer in Hebrew first.', latin: 'That is in English letters. Type it in Hebrew letters.',
  exact: 'Right.', spelling: 'Right. The usual spelling is shown below.', close: 'One letter off. Compare with the answer below.', wrong: 'Not this time. The answer is below.',
});
export const CSS = `
.alef-write{max-inline-size:40rem;margin-inline:auto;overflow-wrap:anywhere}
.alef-write *{box-sizing:border-box;max-inline-size:100%}
.alef-write .wr-tabs{display:flex;gap:.5rem;flex-wrap:wrap;margin-block:.75rem}
.alef-write .wr-tabs button{flex:1 1 8rem}
.alef-write .wr-card{border:1px solid var(--border,#999);border-radius:12px;padding:1rem;background:var(--card,#fff);margin-block:1rem}
.alef-write .wr-he{font-size:1.6rem;line-height:1.6;display:block;margin-block:.25rem}
.alef-write textarea,.alef-write input[type=text]{inline-size:100%;min-block-size:var(--tap,48px);font:inherit;font-size:1.25rem;padding:.5rem .6rem;border:2px solid var(--border,#999);border-radius:8px;background:var(--card,#fff);color:inherit}
.alef-write textarea{min-block-size:8rem}
.alef-write .wr-row{display:flex;gap:.5rem;flex-wrap:wrap;margin-block:.5rem}
.alef-write .btn{min-block-size:var(--tap,48px)}
.alef-write .wr-entry{border-block-start:1px solid var(--border,#999);padding-block:.5rem}
.alef-write .wr-entry p{white-space:pre-wrap;margin:.25rem 0}
`;

/** @param {HTMLElement} root @param {any} [ctx] */
export async function mount(root, ctx = {}) {
  let alive = true;
  const now = () => (ctx.clock && typeof ctx.clock.now === 'function' ? ctx.clock.now() : Date.now());
  const data = ctx.writingData || {};
  const [prompts, pack] = await Promise.all([data.prompts || loadJSON('data/curriculum/prompts.json').catch(() => null), data.pack || loadJSON('data/talk/pack.json').catch(() => null)]);
  let state = normalizeState(await storeGet(ctx, WRITING_KEY, null));
  if (!alive) return () => {};
  const promptById = new Map([...(prompts?.morning || []), ...(prompts?.evening || []), ...(prompts?.shabbatEve || []), ...Object.values(prompts?.holidays || {}).flat()].map((p) => [p.id, p]));
  const keep = async (next) => { state = next; await storeSet(ctx, WRITING_KEY, state); };

  const wrap = el('section', { class: 'alef-write', 'aria-labelledby': 'wr-title' }, el('style', {}, CSS), el('h1', { id: 'wr-title' }, COPY.title), el('p', {}, COPY.lead));
  const panel = el('div', { id: 'wr-panel' });
  const tabs = {};
  const show = (name) => { for (const [k, b] of Object.entries(tabs)) b.setAttribute('aria-pressed', String(k === name)); panel.replaceChildren(views[name]()); };
  const bar = el('div', { class: 'wr-tabs', role: 'group', 'aria-label': 'Parts of Writing' });
  for (const name of ['journal', 'answer', 'rewrite']) { tabs[name] = el('button', { type: 'button', class: 'btn secondary', 'data-tab': name, 'aria-pressed': 'false', onclick: () => show(name) }, COPY[name]); bar.append(tabs[name]); }
  wrap.append(bar, panel);

  function journal() {
    const prompt = prompts ? promptFor(prompts, now()) : null;
    const today = state.entries.find((e) => e.day === dayKey(now()));
    const box = el('textarea', { id: 'wr-entry', dir: 'auto', 'aria-describedby': 'wr-hint', maxlength: '4000' }); box.value = today ? today.text : '';
    const note = el('p', { class: 'muted', role: 'status', 'aria-live': 'polite' });
    const run = el('p', { id: 'wr-streak' });
    const list = el('div', { id: 'wr-history' });
    const paint = () => {
      const n = journalStreak(state.entries, now());
      run.textContent = n ? `${n} ${n === 1 ? 'day' : 'days'} in a row. ${state.entries.length} ${state.entries.length === 1 ? 'entry' : 'entries'} in all.` : COPY.none;
      list.replaceChildren(...state.entries.map((e) => { const p = promptById.get(e.promptId); return el('div', { class: 'wr-entry' }, el('strong', {}, e.day), p ? el('span', { class: 'muted' }, ' ', heText(showName(p.he))) : null, el('p', { dir: 'auto' }, e.text)); }));
      out.hidden = !state.entries.length;
    };
    const save = async () => { await keep(saveEntry(state, { ms: now(), prompt, text: box.value })); if (!alive) return; note.textContent = box.value.trim() ? COPY.saved : COPY.removed; paint(); };
    const out = el('button', { type: 'button', class: 'btn secondary', id: 'wr-export', onclick: () => {
      const text = exportText(state, (id) => promptById.get(id));
      try { const a = el('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })), download: 'aleph-journal.txt' }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); note.textContent = 'Your journal was saved as a text file.'; } catch { note.textContent = 'This browser could not save a file.'; }
    } }, 'Save My Journal As A File');
    const card = el('div', { class: 'wr-card' }, el('h2', {}, 'Today’s Prompt'));
    if (prompt) card.append(...[heText(prompt.he, 'alef-he wr-he'), el('p', {}, prompt.en), prompt.reflect ? el('p', {}, el('strong', {}, prompt.reflect)) : null, prompt.source ? el('p', { class: 'muted' }, prompt.source) : null].filter(Boolean));
    else card.append(el('p', {}, 'Write about your day.'));
    card.append(el('label', { for: 'wr-entry' }, 'Your Entry'), box, el('p', { id: 'wr-hint', class: 'muted' }, COPY.journalHint), el('div', { class: 'wr-row' }, el('button', { type: 'button', class: 'btn', id: 'wr-save', onclick: save }, 'Save Today’s Entry'), out), note);
    paint();
    return el('div', {}, card, el('div', { class: 'wr-card' }, el('h2', {}, 'Your Entries'), run, list));
  }

  /** One typed-answer drill. `items` carry {id, he, accept}; `face` draws the question. */
  function drill(name, items, face) {
    if (!items.length) return el('p', {}, 'This part could not load its lines. Check your connection and open the page again.');
    const seen = new Set(state.answers.filter((a) => a.drill === name).map((a) => a.ask));
    const round = pickRound(items, ROUND, ctx.rng || Math.random, seen);
    let at = 0, right = 0, checked = false;
    const host = el('div', { class: 'wr-card' });
    const step = () => {
      if (at >= round.length) { host.replaceChildren(el('h2', {}, 'Round Done'), el('p', { id: 'wr-score', role: 'status' }, `${right} of ${round.length} right.`), el('button', { type: 'button', class: 'btn', onclick: () => show(name) }, 'Another Round')); return; }
      const item = round[at]; checked = false;
      const input = /** @type {HTMLInputElement} */ (el('input', { type: 'text', id: 'wr-answer', lang: 'he', dir: 'rtl', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-describedby': 'wr-feedback' }));
      const feedback = el('div', { id: 'wr-feedback', role: 'status', 'aria-live': 'polite' });
      const go = el('button', { type: 'button', class: 'btn', id: 'wr-check' }, 'Check');
      const check = async () => {
        if (checked) { at++; step(); return; }
        const g = gradeHebrew(input.value, item);
        if (g.kind === 'empty' || g.kind === 'latin') { feedback.replaceChildren(el('p', {}, COPY[g.kind])); return; }
        checked = true; if (g.ok) right++;
        input.readOnly = true; go.textContent = at + 1 < round.length ? 'Next' : 'See My Score';
        feedback.replaceChildren(...[el('p', {}, el('strong', {}, COPY[g.kind])), el('p', {}, 'Answer: ', heText(item.he, 'alef-he wr-he')), item.answerEn ? el('p', { class: 'muted' }, item.answerEn) : null].filter(Boolean));
        await keep(recordAnswer(state, { at: now(), drill: name, ask: item.id, typed: input.value, ok: g.ok }));
        go.focus();
      };
      go.addEventListener('click', check);
      input.addEventListener('keydown', (e) => { if (/** @type {KeyboardEvent} */ (e).key === 'Enter') { e.preventDefault(); check(); } });
      host.replaceChildren(el('p', { class: 'muted' }, `${at + 1} of ${round.length}`), ...face(item), el('label', { for: 'wr-answer' }, 'Your Answer In Hebrew'), input, el('div', { class: 'wr-row' }, go), feedback,
        el('p', { class: 'muted' }, COPY.keyboard, ' ', el('a', { href: '#/typing' }, 'Open Typing Practice')));
    };
    step();
    return host;
  }

  const views = {
    journal,
    answer: () => drill('answer', freeTextItems(pack), (item) => [el('h2', {}, 'Say It In Hebrew'), el('p', { class: 'wr-he', lang: 'en' }, item.en)]),
    rewrite: () => drill('rewrite', rewriteItems(pack), (item) => [el('h2', {}, REWRITE_ASK[item.kind]), heText(item.from, 'alef-he wr-he'), el('p', { class: 'muted' }, item.en)]),
  };
  root.replaceChildren(wrap);
  show(ctx.query && views[ctx.query.part] ? ctx.query.part : 'journal');
  return () => { alive = false; };
}
