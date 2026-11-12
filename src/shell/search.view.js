// /search: one box for page names, Hebrew letters and vocabulary. Pages are searched immediately; letters and words load lazily.
// Preview pages (router.js tier) are still found but carry a "Preview" label (span.menu-tag[data-tier=preview]).
import { t, tHe } from './i18n.js';
import { h, heSpan } from './ui.js';
import { uiEnglish } from './names.js';
import './nav.strings.js';
import { ROUTES } from './router.js';
import { VIEW_FILES } from './views.generated.js';
import { availableRoutes } from './router.js';
import { buildPageIndex, searchPages, searchLetters, searchWords, isTranslitHit, loadLetters, loadWordTiers } from './search.js';
import { translitFor, TRAD } from '../vocab/model.js';

export function mount(root, ctx) {
  const avail = availableRoutes(VIEW_FILES);
  const index = buildPageIndex(ROUTES, avail, t, tHe, (id) => t('nav.section.' + id));
  let letters = null, words = [], error = false, loadedWords = 0, stopped = false;
  // M-02: transliteration as the Dictionary spells it (Ashkenazi also tries Sephardi), cached.
  const trad = () => { const c = ctx?.settings?.get?.('congregation'); return TRAD[c] ? c : 'sephardi'; };
  const tlCache = new Map();
  const translitOf = (e) => {
    const tr = trad(), key = tr + '|' + (e.pointed || '');
    if (!e.pointed) return '';
    if (!tlCache.has(key)) tlCache.set(key, [...new Set([translitFor(e, tr), tr === 'ashkenazi' ? translitFor(e, 'sephardi') : ''])].filter(Boolean));
    return tlCache.get(key);
  };
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
    const ls = (letters ? searchLetters(letters, q) : []).map((l) => h('li', {}, h('a', { href: '#/letters/' + l.id }, heSpan(l.he, 'he search-he'), ' ', h('span', { class: 'menu-label' }, l.name), l.nameHe ? heSpan(' ' + l.nameHe, 'he nav-he') : null, h('span', { class: 'menu-desc' }, uiEnglish(ctx, l.sound?.en || '')))));
    const ws = searchWords(words, q, 15, translitOf).map((e) => h('li', {}, h('a', { href: '#/vocab?q=' + encodeURIComponent(q) }, heSpan(e.pointed || e.lemma, 'he search-he'), ' ', h('span', { class: 'menu-label' }, uiEnglish(ctx, e.gloss || '')),
      isTranslitHit(e, q, translitOf) ? h('span', { class: 'menu-desc search-tl' }, 'Sounds like: ' + translitOf(e)[0] + ' (transliteration match)') : null,
      h('span', { class: 'menu-desc' }, [e.pos, e.topic].filter(Boolean).join(', ')))));
    // J9 (lane platform): lessons, books, root families, prayers, Torah references and, on request, Torah verse text (src/platform/search-more.js)
    const row = (x) => h('li', {}, h('a', { href: x.href }, h('span', { class: 'menu-label' }, x.label), x.he ? ' ' : null, x.he ? heSpan(x.he, 'he search-he') : null, x.desc ? h('span', { class: 'menu-desc' }, x.desc) : null));
    const extra = more ? more.m.searchAll(more.ix, q).map(([title, rows]) => group(title, rows.map(row))) : [];
    if (more && torahHits.q === q && torahHits.rows.length) extra.push(group('Torah Verses', torahHits.rows.map(row)));
    const total = pages.length + ls.length + ws.length + extra.reduce((a, g) => a + g.querySelectorAll('li').length, 0);
    out.append(...[group(t('search.pages'), pages), group(t('search.letters'), ls), group(t('search.words'), ws), ...extra].filter(Boolean));
    if (more && q.length >= 2) out.append(h('p', {}, h('button', { type: 'button', class: 'btn secondary', onclick: () => torahText(q) }, `Search every Torah verse for “${q}”`), torahHits.q === q && torahHits.note ? h('span', { class: 'menu-desc' }, ' ' + torahHits.note) : null));
    if (!total && loadedWords >= 4) out.append(h('p', {}, t('search.none')));
    status.textContent = error ? t('search.error') : (loadedWords < 4 ? t('search.loading') + ' ' + (total === 1 ? '1 result' : t('search.count', { n: total })) : (total === 1 ? '1 result' : t('search.count', { n: total })));
    try { const u = '#/search' + (q ? '?q=' + encodeURIComponent(q) : ''); if (location.hash !== u) history.replaceState(null, '', u); } catch { /* ignore */ }
  }
  let more = null, torahHits = { q: '', rows: [], note: '' }, torahRun = 0;
  function torahText(q) {
    const run = ++torahRun;
    torahHits = { q, rows: [], note: 'Searching…' }; render();
    more.m.searchTorahText(q, more.ix.torah, { onProgress: (d, n) => { if (run === torahRun && !stopped) status.textContent = `Searching the Torah: chapter ${d} of ${n}…`; }, cancelled: () => run !== torahRun || stopped })
      .then((r) => { if (run !== torahRun || stopped) return; torahHits = { q, rows: r.hits, note: r.hits.length ? (r.complete ? `${r.hits.length} verses.` : `The first ${r.hits.length} verses.`) : 'No verse has these words.' }; render(); })
      .catch(() => { if (run === torahRun) { torahHits = { q, rows: [], note: 'The Torah text did not load. Try again while online.' }; render(); } });
  }
  import('../platform/search-more.js').then((m) => m.loadIndexes().then((ix) => { if (!stopped) { more = { m, ix }; render(); } })).catch(() => { /* the other groups still work */ });
  let timer = 0;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(render, 120); });
  render();
  loadLetters().then((l) => { letters = l; render(); }).catch(() => { error = true; render(); });
  loadWordTiers((tier, entries, err) => { if (stopped) return; loadedWords++; if (entries) words = words.concat(entries); else error = true; if (loadedWords === 4) status.dataset.done = '1'; render(); }).catch(() => { error = true; render(); });
  return () => { stopped = true; torahRun++; clearTimeout(timer); };
}
