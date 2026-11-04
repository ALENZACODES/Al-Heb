// /search: one box for page names, Hebrew letters and vocabulary. Pages are searched immediately; letters and words load lazily.
// Preview pages (router.js tier) are still found but carry a "Preview" label (span.menu-tag[data-tier=preview]).
import { t, tHe } from './i18n.js';
import { h, heSpan } from './ui.js';
import './nav.strings.js';
import { ROUTES } from './router.js';
import { VIEW_FILES } from './views.generated.js';
import { availableRoutes } from './router.js';
import { buildPageIndex, searchPages, searchLetters, searchWords, loadLetters, loadWordTiers } from './search.js';

export function mount(root, ctx) {
  const avail = availableRoutes(VIEW_FILES);
  const index = buildPageIndex(ROUTES, avail, t, tHe, (id) => t('nav.section.' + id));
  let letters = null, words = [], error = false, loadedWords = 0, stopped = false;
  const input = h('input', { id: 'search-q', type: 'search', name: 'q', autocomplete: 'off', enterkeyhint: 'search', value: ctx?.query?.q || '', 'aria-describedby': 'search-hint' });
  const status = h('p', { class: 'muted', id: 'search-status', role: 'status', 'aria-live': 'polite' });
  const out = h('div', { id: 'search-results' });
  root.append(h('section', { class: 'card search-view' },
    h('h1', { id: 'view-title', tabindex: '-1' }, t('search.title')),
    h('form', { role: 'search', class: 'search-form', onsubmit: (e) => { e.preventDefault(); render(); } }, h('label', { for: 'search-q' }, t('search.label')), input),
    h('p', { class: 'muted', id: 'search-hint' }, t('search.hint')), status, out));

  const group = (title, rows) => rows.length ? h('section', { class: 'search-group', 'aria-label': title }, h('h2', {}, title), h('ul', { class: 'search-list' }, ...rows)) : null;
  function render() {
    if (stopped) return;
    const q = input.value.trim();
    out.replaceChildren();
    if (!q) { status.textContent = loadedWords < 4 && !error ? t('search.loading') : ''; return; }
    const pages = searchPages(index, q).map((e) => h('li', {}, h('a', { href: e.href }, h('span', { class: 'menu-label' }, e.label, e.he ? ' ' : null, e.he ? heSpan(e.he, 'he nav-he') : null,
        e.tier === 'preview' ? ' ' : null, e.tier === 'preview' ? h('span', { class: 'menu-tag menu-desc', 'data-tier': 'preview' }, '(' + t('search.preview') + ')') : null),
      e.desc ? h('span', { class: 'menu-desc' }, e.desc) : null,
      h('span', { class: 'menu-desc' }, t('nav.section.' + e.section)))));
    const ls = (letters ? searchLetters(letters, q) : []).map((l) => h('li', {}, h('a', { href: '#/letters/' + l.id }, heSpan(l.he, 'he search-he'), ' ', h('span', { class: 'menu-label' }, l.name), l.nameHe ? heSpan(' ' + l.nameHe, 'he nav-he') : null, h('span', { class: 'menu-desc' }, l.sound?.en || ''))));
    const ws = searchWords(words, q).map((e) => h('li', {}, h('a', { href: '#/vocab' }, heSpan(e.pointed || e.lemma, 'he search-he'), ' ', h('span', { class: 'menu-label' }, e.gloss || ''), h('span', { class: 'menu-desc' }, [e.pos, e.topic].filter(Boolean).join(', ')))));
    const total = pages.length + ls.length + ws.length;
    out.append(...[group(t('search.pages'), pages), group(t('search.letters'), ls), group(t('search.words'), ws)].filter(Boolean));
    if (!total && loadedWords >= 4) out.append(h('p', {}, t('search.none')));
    status.textContent = error ? t('search.error') : (loadedWords < 4 ? t('search.loading') + ' ' + t('search.count', { n: total }) : t('search.count', { n: total }));
    try { const u = '#/search' + (q ? '?q=' + encodeURIComponent(q) : ''); if (location.hash !== u) history.replaceState(null, '', u); } catch { /* ignore */ }
  }
  let timer = 0;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(render, 120); });
  render();
  loadLetters().then((l) => { letters = l; render(); }).catch(() => { error = true; render(); });
  loadWordTiers((tier, entries, err) => { if (stopped) return; loadedWords++; if (entries) words = words.concat(entries); else error = true; if (loadedWords === 4) status.dataset.done = '1'; render(); }).catch(() => { error = true; render(); });
  return () => { stopped = true; clearTimeout(timer); };
}
