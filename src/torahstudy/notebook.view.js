// @ts-check
// Verse Notebook (#/verse-notebook, E6): the verses saved from Torah Search and the Torah reader, each with a note the learner
// writes. Kept on this device; exported as a text file or a JSON file made here (nothing is uploaded).
import { h, heSpan } from '../shell/ui.js';
import * as NB from './notebook.js';
import { readerHref } from './search.js';

/** Download a file made on this device. Returns false when the browser cannot. */
export function download(name, text, type) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = globalThis.document.createElement('a'); a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch { return false; }
}

export function mount(root, ctx) {
  const status = h('p', { role: 'status', 'aria-live': 'polite', class: 'muted' }, '');
  const list = h('ol', { class: 'nb-list' });
  function paint() {
    const all = NB.items(NB.read(ctx));
    if (!all.length) { list.replaceChildren(h('li', { class: 'muted' }, 'No verses saved yet. Save one from Torah Search or the Torah reader.')); return; }
    list.replaceChildren(...all.map((x) => {
      const id = `nb-${x.book}-${x.chapter}-${x.verse}`;
      const area = h('textarea', { id, rows: '3', style: 'inline-size:100%', maxlength: String(NB.MAX_NOTE) });
      area.value = x.note || '';
      return h('li', { class: 'card nb-item' },
        h('h2', {}, h('a', { href: readerHref(x) }, `${x.en} ${x.chapter}:${x.verse}`)),
        x.he ? h('p', {}, heSpan(x.he)) : null, x.english ? h('p', { class: 'muted' }, x.english) : null,
        h('label', { for: id }, 'Your note'), area,
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn secondary', onclick: () => { status.textContent = NB.write(ctx, NB.setNote(NB.read(ctx), x, area.value)) ? 'Note saved on this device.' : 'The note could not be saved.'; } }, 'Save the note'),
          h('button', { type: 'button', class: 'btn secondary', onclick: () => { if (globalThis.confirm && !globalThis.confirm(`Remove ${x.en} ${x.chapter}:${x.verse} and its note?`)) return; NB.write(ctx, NB.remove(NB.read(ctx), x)); status.textContent = 'Removed.'; paint(); } }, 'Remove')));
    }));
  }
  root.replaceChildren(h('article', { class: 'verse-notebook' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Verse Notebook'),
    h('p', {}, 'Verses you saved, with your own notes. They stay on this device. Export them to keep a copy.'),
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'btn', onclick: () => { status.textContent = download('verse-notebook.txt', NB.toText(NB.read(ctx)), 'text/plain') ? 'Text file saved to your downloads.' : 'This browser cannot save files.'; } }, 'Export as text'),
      h('button', { type: 'button', class: 'btn secondary', onclick: () => { status.textContent = download('verse-notebook.json', NB.toJson(NB.read(ctx)), 'application/json') ? 'JSON file saved to your downloads.' : 'This browser cannot save files.'; } }, 'Export as JSON'),
      h('a', { class: 'btn secondary', href: '#/torah-search' }, 'Torah Search')),
    status, list));
  paint();
  return () => {};
}
