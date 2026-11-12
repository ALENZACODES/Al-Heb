// J5 Focus Mode (#/focus?src=book:book1 | text:shema-1 | torah:genesis:1): the app's header, menus, companions and sound bar
// hidden, the text large, one passage at a time. Arrow keys or the buttons move; Escape or "Leave focus mode" goes back.
import { h, heSpan } from '../shell/ui.js';
import { loadPassages, parseSource, SIZES, FOCUS_CSS } from './focus.js';

async function loadJSON(rel) {
  const url = new URL(rel, import.meta.url);
  if (url.protocol === 'file:') { const { readFile } = await import('node:fs/promises'); return JSON.parse(await readFile(url, 'utf8')); }
  const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
}

export function mount(root, ctx) {
  const doc = globalThis.document, html = doc?.documentElement;
  let style = null;
  try { style = doc.createElement('style'); style.id = 'fx-style'; style.textContent = FOCUS_CSS; doc.head.append(style); html.setAttribute('data-focus-mode', ''); } catch { /* minimal DOM */ }
  const status = h('p', { role: 'status', class: 'muted' }, 'Loading…');
  const body = h('div', {});
  const leave = () => { try { if (globalThis.history?.length > 1) globalThis.history.back(); else globalThis.location.hash = '#/'; } catch { /* ignore */ } };
  root.append(h('section', { 'aria-labelledby': 'view-title' }, h('h1', { id: 'view-title', tabindex: '-1' }, 'Focus Mode'), status, body));
  let alive = true, at = 0, size = 1, showEn = false, data = null;
  const src = ctx?.query?.src;
  function render() {
    if (!data) return;
    const p = data.passages[at];
    body.replaceChildren(...[
      h('p', { class: 'muted' }, `${data.title}. ${p.label ? p.label + ', ' : ''}${at + 1} of ${data.passages.length}.`),
      h('div', { class: 'fx-passage', style: `font-size:${SIZES[size][1]}rem` }, heSpan(p.he, 'he')),
      showEn && p.en ? h('p', { class: 'fx-en', style: 'font-size:1.25rem' }, p.en) : null,
      h('p', { class: 'row' },
        h('button', { type: 'button', class: 'btn', disabled: at === 0 ? '' : null, onclick: () => go(-1) }, 'Previous'), ' ',
        h('button', { type: 'button', class: 'btn', disabled: at >= data.passages.length - 1 ? '' : null, onclick: () => go(1) }, 'Next'), ' ',
        h('button', { type: 'button', class: 'btn secondary', 'aria-pressed': String(showEn), onclick: () => { showEn = !showEn; render(); } }, 'English'), ' ',
        ...SIZES.map(([label], i) => h('button', { type: 'button', class: 'btn secondary', 'aria-pressed': String(size === i), 'aria-label': `Text size ${label}`, onclick: () => { size = i; render(); } }, label)), ' ',
        h('button', { type: 'button', class: 'btn secondary', onclick: leave }, 'Leave focus mode'))].filter(Boolean));
  }
  function go(d) { if (!data) return; const n = Math.min(data.passages.length - 1, Math.max(0, at + d)); if (n !== at) { at = n; render(); status.textContent = `${at + 1} of ${data.passages.length}.`; } }
  const onKey = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault?.(); go(1); } // the same keys as Follow the service
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault?.(); go(-1); }
    else if (e.key === 'Escape') leave();
  };
  doc?.addEventListener?.('keydown', onKey);
  if (parseSource(src)) {
    loadPassages(src, ctx?.readinessFetch).then((d) => { if (!alive) return; data = d; status.textContent = d.passages.length ? 'Right Arrow or Page Down: next. Left Arrow or Page Up: previous. Escape: leave.' : 'This text has no passages.'; if (d.passages.length) render(); })
      .catch(() => { if (alive) status.textContent = 'That text could not be opened. Pick one below.'; picker(); });
  } else picker();
  function picker() {
    Promise.all([loadJSON('../../data/books/index.json'), loadJSON('../../data/corpus/registry.json'), loadJSON('../../data/corpus/torah/index.json')]).then(([b, r, t]) => {
      if (!alive) return;
      status.textContent = 'Choose something to read in focus mode.';
      const link = (s, label) => h('li', {}, h('a', { href: `#/focus?src=${s}` }, label));
      body.replaceChildren(
        h('h2', {}, 'Little Books'), h('ul', {}, ...(b.books || []).map((x) => link(`book:${x.id}`, x.titleEn))),
        h('h2', {}, 'Prayers and Texts'), h('ul', {}, ...(r.entries || []).map((x) => link(`text:${x.id}`, x.title))),
        h('h2', {}, 'Torah'), h('ul', {}, ...(t.books || []).map((x) => h('li', {}, `${x.en}: `, ...Array.from({ length: Number(x.chapters) }, (_, i) => [h('a', { href: `#/focus?src=torah:${x.id}:${i + 1}` }, String(i + 1)), ' ']).flat()))));
    }).catch(() => { if (alive) status.textContent = 'The list of texts did not load. Open this page again while online.'; });
  }
  return () => { alive = false; doc?.removeEventListener?.('keydown', onKey); try { html?.removeAttribute('data-focus-mode'); style?.remove(); } catch { /* gone */ } };
}
