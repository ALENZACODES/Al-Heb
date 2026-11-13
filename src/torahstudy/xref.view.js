// @ts-check
// Cross-References (#/cross-references?book=&chapter=&verse=[&k=letters]; idea M4): for one verse, tap any word to see everywhere it
// appears in the Torah and jump there; below that, the verse's rare words with the other verses that share them, and on request the
// verses that share a root with one of its words (from Aleph's root lists). Everything is computed on this device from the Torah
// Search index; nothing new is downloaded beyond that index and the verse's own chapter. The Name is shown as ה׳.
import { h, heSpan } from '../shell/ui.js';
import { showName, hasName } from '../games/tg-core.js';
import { uiEnglish } from '../shell/names.js';
import { verseWords, letterKey } from './wordstudy.js';
import { RARE_MAX, MAX_LIST, LETTERS_NOTE, ROOT_NOTE, buildWordIndex, occurrences, rareLinks, relatedVerses, rootOf, rootVerses, refFromQuery, refLabel, xrefHref, readerHref, verseCount, stemKey } from './xref.js';

const loadWith = (ctx) => async (rel) => { const r = await (ctx?.fetchFn ?? fetch)(new URL('../../' + rel, import.meta.url)); if (!r || r.ok === false) throw new Error(rel); return r.json(); };
const chapterFile = (book, n) => `data/corpus/torah/${book}/${String(n).padStart(2, '0')}.json`;
const CSS = `
.xref .xr-words{display:flex;flex-wrap:wrap;gap:.35rem;direction:rtl;margin-block:.4rem}
.xref .xr-w{font-family:var(--font-he,serif);font-size:1.7rem;line-height:1.6;min-block-size:var(--tap,48px);min-inline-size:44px;padding:.1rem .5rem;border:1px solid var(--border,#999);border-radius:10px;background:var(--card,transparent);color:inherit}
.xref .xr-w[aria-pressed="true"]{border-color:#b8962e;outline:2px solid #b8962e}
.xref ol.xr-list{padding-inline-start:1.2rem}
.xref ol.xr-list li{margin-block:.35rem}
.xref mark{background:#b8962e;color:#16301c;border-radius:4px;padding:0 .15em}
`;

export function mount(root, ctx) {
  let alive = true;
  const load = loadWith(ctx);
  const style = h('style', {}); style.textContent = CSS;
  const title = h('h1', { id: 'view-title', tabindex: '-1' }, 'Cross-References');
  const status = h('p', { role: 'status', 'aria-live': 'polite', class: 'muted' }, 'Loading the Torah text…');
  const body = h('div', {});
  root.replaceChildren(style, h('article', { class: 'card xref' }, title, status, body));

  (async () => {
    let index;
    try { index = await load('data/torahstudy/search.json'); } catch { if (alive) status.textContent = 'The Torah text did not load. Check the connection and open this page again.'; return; }
    if (!alive) return;
    const ref = refFromQuery(index, ctx?.query || {});
    const wi = buildWordIndex(index);
    let verse = null;
    try { verse = ((await load(chapterFile(ref.book, ref.chapter))).verses || []).find((v) => v.n === ref.verse) || null; } catch { verse = null; }
    if (!alive) return;
    const words = verse ? verseWords(verse.he) : [];
    const whereBox = h('section', { 'aria-live': 'polite', 'aria-labelledby': 'xr-h-where' });
    const rootBox = h('div', {});
    let pressed = null, roots = null;

    function hitLine(r) {
      const toks = r.text.split(' ');
      return h('span', { lang: 'he', dir: 'rtl' }, ...toks.flatMap((t, i) => [i ? ' ' : '', r.hits.includes(i) ? h('mark', {}, showName(t)) : showName(t)]));
    }
    function showWord(text, key) {
      const shown = showName(text || key);
      if (text && hasName(text)) { whereBox.replaceChildren(h('h2', { id: 'xr-h-where' }, 'Everywhere This Word Appears'), h('p', {}, 'This is the four-letter Name, written ה׳ in Aleph. It appears throughout the Torah and is not listed verse by verse.')); return; }
      const occ = occurrences(index, key);
      whereBox.replaceChildren(
        h('h2', { id: 'xr-h-where', tabindex: '-1' }, 'Everywhere ', heSpan(shown), ' Appears'),
        h('p', { id: 'xr-count' }, `${occ.total} ${occ.total === 1 ? 'verse' : 'verses'} in the Torah${occ.total > MAX_LIST ? `; the first ${MAX_LIST} are shown` : ''}. This counts the word with or without a prefix letter in front.`),
        h('ol', { class: 'xr-list' }, ...occ.refs.map((r) => h('li', {}, h('a', { href: xrefHref(r) }, refLabel(r)), ' ', hitLine(r), ' ', h('a', { class: 'muted', href: readerHref(r) }, 'Reader')))),
        h('p', { class: 'muted' }, LETTERS_NOTE));
      status.textContent = `${occ.total} ${occ.total === 1 ? 'verse has' : 'verses have'} this word.`;
    }
    const buttons = words.map((w) => {
      const b = h('button', { type: 'button', class: 'xr-w', lang: 'he', dir: 'rtl', 'aria-pressed': false, 'data-k': letterKey(w.text), onclick: () => {
        if (pressed) pressed.setAttribute('aria-pressed', 'false');
        pressed = b; b.setAttribute('aria-pressed', 'true');
        showWord(w.text, letterKey(w.text));
      } }, showName(w.text));
      return b;
    });

    const links = rareLinks(wi, index, ref);
    const related = relatedVerses(links);
    const rareSection = h('section', { 'aria-labelledby': 'xr-h-rare' },
      h('h2', { id: 'xr-h-rare' }, 'Rare Words in This Verse'),
      links.length
        ? h('ul', {}, ...links.map((l) => h('li', { 'data-rare': l.key }, heSpan(l.word), l.refs.length
          ? [` appears in ${l.total} verses. Also in: `, ...l.refs.flatMap((r, i) => [i ? ', ' : '', h('a', { href: xrefHref(r) }, refLabel(r))])]
          : ' appears only here in the Torah.')))
        : h('p', {}, `No word of this verse is rare. A word counts as rare when at most ${RARE_MAX} verses of the Torah have it.`),
      related.length ? h('div', {}, h('h3', {}, 'Verses Sharing the Most Rare Words'),
        h('ol', { class: 'xr-list' }, ...related.map((x) => h('li', {}, h('a', { href: xrefHref(x.ref) }, refLabel(x.ref)), ' shares ', ...x.shared.flatMap((k, i) => [i ? ', ' : '', heSpan(k)]))))) : null);

    async function showRoots() {
      rootBox.replaceChildren(h('p', { class: 'muted' }, 'Loading the root lists…'));
      if (!roots) { try { const [f, v] = await Promise.all([load('data/roots/families.json'), load('data/roots/verbs.json')]); roots = { f, v }; } catch { rootBox.replaceChildren(h('p', { role: 'alert' }, 'The root lists did not load.')); return; } }
      if (!alive) return;
      const seen = new Set(), found = [];
      for (const w of words) {
        if (hasName(w.text)) continue;
        const r = rootOf(w.text, roots.f, roots.v);
        if (!r || seen.has(r.root)) continue;
        seen.add(r.root);
        found.push({ w, r, vs: rootVerses(index, r.forms, ref, 40) });
      }
      rootBox.replaceChildren(
        found.length
          ? h('ul', {}, ...found.map((x) => h('li', { 'data-root': x.r.root }, heSpan(showName(x.w.text)), ' is listed under the root ', heSpan(x.r.root), `. ${x.vs.total} other ${x.vs.total === 1 ? 'verse has' : 'verses have'} a listed form${x.vs.total > x.vs.refs.length ? ` (first ${x.vs.refs.length} shown)` : ''}: `,
            ...x.vs.refs.flatMap((r, i) => [i ? ', ' : '', h('a', { href: xrefHref(r) }, refLabel(r))]))))
          : h('p', {}, 'Aleph’s root lists do not hold any word of this verse.'),
        h('p', { class: 'muted' }, ROOT_NOTE));
    }

    const prevNext = (d) => { const b = index.books.find((x) => x.id === ref.book), n = b.chapters[ref.chapter - 1].length; const v = ref.verse + d; return v >= 1 && v <= n ? { ...ref, verse: v } : null; };
    const prev = prevNext(-1), next = prevNext(1);
    title.textContent = `Cross-References: ${refLabel(ref)}`;
    status.textContent = 'Tap a word to see everywhere it appears.';
    body.replaceChildren(
      verse ? h('div', { class: 'xr-words' }, ...buttons) : h('p', { role: 'alert' }, 'This verse did not load, so its words cannot be tapped. The lists below still work.'),
      verse?.en ? h('p', {}, uiEnglish(ctx, verse.en)) : null,
      h('p', { class: 'muted' }, prev ? h('a', { href: xrefHref(prev) }, '← Previous Verse') : null, prev && next ? ' · ' : null, next ? h('a', { href: xrefHref(next) }, 'Next Verse →') : null, ' · ', h('a', { href: readerHref(ref) }, 'Open in the Reader'), ' · ', h('a', { href: '#/torah-search' }, 'Torah Search')),
      whereBox, rareSection,
      h('section', { 'aria-labelledby': 'xr-h-root' }, h('h2', { id: 'xr-h-root' }, 'Verses Sharing a Root'),
        h('p', {}, h('button', { type: 'button', class: 'btn secondary', id: 'xr-roots', onclick: showRoots }, 'Find Shared Roots')), rootBox));
    const k = String(ctx?.query?.k || '');
    if (k) {
      const want = stemKey(k), b = buttons.find((x) => stemKey(x.getAttribute('data-k')) === want);
      if (b) b.click(); else if (verseCount(wi, k)) showWord('', want);
    }
  })();
  return () => { alive = false; };
}
