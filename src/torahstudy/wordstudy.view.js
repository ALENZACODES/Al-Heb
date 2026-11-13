// @ts-check
// Word by Word (#/word-study, #/word-study/<portion>?aliyah=n; idea M1): a word-by-word study page for every one of the 54
// portions, generated from the Torah text and the app's own word list, root lists and word clips. Tap a word for what the lists
// hold: its meaning, its root, a recording, and where else it appears. The verse's translation is always shown, because the word
// list is a modern one and holds only part of the Torah's vocabulary (LEXICON_NOTE). The Name is shown as ה׳ and never played.
import { h, heSpan } from '../shell/ui.js';
import { showName } from '../games/tg-core.js';
import { uiEnglish } from '../shell/names.js';
import { STUDY_KEY, LEXICON_NOTE, PREFIX_NOTE, buildLexicon, lookup, verseWords, portionsByBook, portionById, units, rangeVerses, chaptersOf, coverage, coverageText, letterKey, normaliseStudy, markOpened } from './wordstudy.js';
import { rangeText } from './week.js';
import { clipControls } from './wordclip.js';

const loadWith = (ctx) => async (rel) => { const r = await (ctx?.fetchFn ?? fetch)(new URL('../../' + rel, import.meta.url)); if (!r || r.ok === false) throw new Error(rel); return r.json(); };
const chapterFile = (book, n) => `data/corpus/torah/${book}/${String(n).padStart(2, '0')}.json`;
const CSS = `
.word-study .ws-verse{margin-block:1rem;padding-block-end:.75rem;border-block-end:1px solid var(--border,#999)}
.word-study .ws-words{display:flex;flex-wrap:wrap;gap:.35rem;direction:rtl;margin-block:.4rem}
.word-study .ws-w{font-family:var(--font-he,serif);font-size:1.7rem;line-height:1.6;min-block-size:var(--tap,48px);min-inline-size:44px;padding:.1rem .5rem;border:1px solid var(--border,#999);border-radius:10px;background:var(--card,transparent);color:inherit}
.word-study .ws-w[aria-pressed="true"]{border-color:#b8962e;outline:2px solid #b8962e}
.word-study .ws-detail{border:2px solid #b8962e;border-radius:12px;padding:.6rem .8rem;margin-block:.5rem}
.word-study .ws-big{font-size:2.2rem;line-height:1.5}
.word-study .ws-units{display:flex;flex-wrap:wrap;gap:.4rem}
.word-study .ws-units .btn{min-block-size:var(--tap,48px)}
.word-study ul.ws-list{columns:14rem;padding-inline-start:1.1rem}
`;

export function mount(root, ctx) {
  let alive = true;
  const load = loadWith(ctx);
  const id = String(ctx?.query?.id || '');
  const style = h('style', {}); style.textContent = CSS;
  const title = h('h1', { id: 'view-title', tabindex: '-1' }, 'Word by Word');
  const status = h('p', { role: 'status', 'aria-live': 'polite', class: 'muted' }, 'Loading the Torah index…');
  const body = h('div', {});
  root.replaceChildren(style, h('article', { class: 'card word-study' }, title, status, body));
  const get = () => { try { return normaliseStudy(ctx?.store?.get?.(STUDY_KEY)); } catch { return normaliseStudy(null); } };
  const put = (v) => { try { ctx?.store?.set?.(STUDY_KEY, v); } catch { /* the page still works */ } };

  function list(index) {
    const study = get(), last = study.last && portionById(index, study.last);
    status.textContent = '';
    body.replaceChildren(
      h('p', {}, 'Pick a portion. Each one opens aliyah by aliyah, with every word ready to tap for its meaning, its root and a recording where Aleph has them.'),
      last ? h('p', {}, h('a', { class: 'btn', href: `#/word-study/${last.id}?aliyah=${study.seen[last.id] || 1}` }, `Continue ${last.en}`)) : null,
      ...portionsByBook(index).map((g) => h('section', { 'aria-labelledby': `ws-h-${g.book}` },
        h('h2', { id: `ws-h-${g.book}` }, g.en, ' ', heSpan(g.he)),
        h('ul', { class: 'ws-list' }, ...g.portions.map((p) => h('li', {}, h('a', { href: `#/word-study/${p.id}` }, p.en), ' ', heSpan(p.he), study.seen[p.id] ? h('span', { class: 'muted' }, ' · opened') : null))))),
      h('p', { class: 'muted' }, LEXICON_NOTE),
      h('p', {}, h('a', { href: '#/parashah' }, 'This Week’s Parashah'), ' · ', h('a', { href: '#/torahreader' }, 'Torah reader'), ' · ', h('a', { href: '#/torah-search' }, 'Torah Search')));
  }

  async function portion(index, p) {
    const us = units(p), want = Number(ctx?.query?.aliyah) || get().seen[p.id] || 1;
    const u = us.find((x) => x.n === want) || us[0];
    title.textContent = `${p.en}: Word by Word`;
    const bookName = (b) => index.books.find((x) => x.id === b)?.en || b;
    const verses = rangeVerses(index, u.from, u.to);
    status.textContent = 'Loading the verses and the word list…';
    let chapters, lex;
    try {
      const [chs, vocab, fam, verbs] = await Promise.all([
        Promise.all(chaptersOf(verses).map((c) => load(chapterFile(c.book, c.chapter)).then((d) => [`${c.book}:${c.chapter}`, d]))),
        load('data/vocab/index.json'), load('data/roots/families.json').catch(() => null), load('data/roots/verbs.json').catch(() => null)]);
      chapters = new Map(chs); lex = buildLexicon(vocab, fam, verbs);
    } catch { if (alive) status.textContent = 'The verses did not load. Check the connection and open this page again.'; return; }
    if (!alive) return;
    put(markOpened(get(), p.id, u.n));
    const rows = verses.map((v) => ({ ...v, en: bookName(v.book), data: (chapters.get(`${v.book}:${v.chapter}`)?.verses || []).find((x) => x.n === v.verse) })).filter((r) => r.data);
    const listen = clipControls(ctx, load);
    let open = null;
    const verseNode = (r) => {
      const ref = `${r.en} ${r.chapter}:${r.verse}`;
      const detail = h('div', { class: 'ws-detail', role: 'region', 'aria-live': 'polite', 'aria-label': `Word from ${ref}`, hidden: true });
      const buttons = verseWords(r.data.he).map((w) => {
        const shown = showName(w.text);
        const b = h('button', { type: 'button', class: 'ws-w', lang: 'he', dir: 'rtl', 'aria-pressed': false, 'data-w': String(w.i), onclick: () => {
          if (open && open.b !== b) { open.b.setAttribute('aria-pressed', 'false'); open.detail.setAttribute('hidden', ''); }
          open = { b, detail };
          b.setAttribute('aria-pressed', 'true'); detail.removeAttribute?.('hidden'); detail.hidden = false;
          detail.replaceChildren(...wordDetail(r, w, shown));
        } }, shown);
        return b;
      });
      const q = `book=${r.book}&chapter=${r.chapter}&verse=${r.verse}`;
      return h('li', { class: 'ws-verse', 'data-ref': `${r.book}:${r.chapter}:${r.verse}` },
        h('strong', {}, ref),
        h('div', { class: 'ws-words' }, ...buttons),
        h('p', {}, uiEnglish(ctx, r.data.en || '')),
        detail,
        h('p', { class: 'muted' }, h('a', { href: `#/cross-references?${q}` }, 'Cross-References'), ' · ', h('a', { href: `#/trope/melody?${q}` }, 'Draft Melody'), ' · ', h('a', { href: `#/torahreader?${q}` }, 'Open in the Reader')));
    };
    function wordDetail(r, w, shown) {
      const res = lookup(lex, w.text), out = [h('p', { class: 'ws-big' }, heSpan(shown))];
      if (res.kind === 'name') {
        out.push(h('p', {}, 'This is the four-letter Name. Aleph writes it ה׳ and never plays it. In prayer and Torah reading it is read as Adonai.'));
        return out;
      }
      if (res.entries.length) {
        if (res.kind === 'prefix') out.push(h('p', {}, 'Prefix ', heSpan(res.prefix), ` (${res.prefixSense}) + `, heSpan(res.entries[0].he), '. ', h('span', { class: 'muted' }, PREFIX_NOTE)));
        out.push(h('ul', {}, ...res.entries.map((e) => h('li', { 'data-entry': e.id }, heSpan(e.he), e.translit ? ` ${e.translit}` : '', `: ${e.en}`))));
        const cell = listen(res.entries[0].he, res.entries[0].translit || 'this word');
        if (cell) out.push(h('p', {}, res.kind === 'prefix' ? 'The word without its prefix: ' : null, cell));
      } else out.push(h('p', { 'data-none': '1' }, 'Aleph’s word list has no entry for this spelling yet. The verse’s translation above gives its sense here.'));
      out.push(h('p', {}, res.root ? ['Root: ', heSpan(res.root), ' ', h('a', { href: '#/roots' }, 'Roots')] : h('span', { class: 'muted' }, 'Root: not in Aleph’s root lists.')));
      out.push(h('p', {}, h('a', { class: 'btn secondary', href: `#/cross-references?book=${r.book}&chapter=${r.chapter}&verse=${r.verse}&k=${encodeURIComponent(letterKey(w.text))}` }, 'Everywhere This Word Appears')));
      return out;
    }
    status.textContent = `${u.label}: ${rangeText(u, bookName)}. ${rows.length} verses.`;
    body.replaceChildren(
      h('p', {}, h('a', { href: '#/word-study' }, '← All Portions')),
      h('h2', {}, p.en, ' ', heSpan(p.he)),
      us.length > 1 ? h('div', { class: 'ws-units', role: 'group', 'aria-label': 'Aliyah' }, ...us.map((x) => h('a', { class: 'btn secondary', href: `#/word-study/${p.id}?aliyah=${x.n}`, 'aria-current': x.n === u.n ? 'true' : undefined }, x.label))) : null,
      h('p', { id: 'ws-coverage' }, coverageText(coverage(lex, rows.map((r) => ({ he: r.data.he }))))),
      h('p', { class: 'muted' }, LEXICON_NOTE),
      h('ol', { style: 'list-style:none;padding:0;margin:0' }, ...rows.map(verseNode)),
      us.length > 1 && u.n < us.length ? h('p', {}, h('a', { class: 'btn', href: `#/word-study/${p.id}?aliyah=${u.n + 1}` }, `Next: Aliyah ${u.n + 1}`)) : null);
  }

  (async () => {
    let index;
    try { index = await load('data/corpus/torah/index.json'); } catch { if (alive) status.textContent = 'The Torah index did not load. Check the connection and open this page again.'; return; }
    if (!alive) return;
    if (!id) { list(index); return; }
    const p = portionById(index, id);
    if (!p) { status.textContent = ''; body.replaceChildren(h('p', { role: 'alert' }, 'There is no portion with that name.'), h('p', {}, h('a', { class: 'btn', href: '#/word-study' }, 'All Portions'))); return; }
    await portion(index, p);
  })();
  return () => { alive = false; };
}
