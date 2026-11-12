// @ts-check
// Little books, lane games-books (12 Nov). Pure helpers first, then the shelf and page decorations the two book views call.
//   E1  difficulty labels: running words, different words, and the share of running words the learner already knows, counted
//       from the learner's own review cards (a card counts as known when its last answer was Hard, Good or Easy).
//   E2  new-word marks on the page: words not known are underlined; a tap shows the dictionary's English and plays the word's
//       clip when one exists (the dictionary is an unreviewed draft, and a word it does not match says so).
//   E7  English per line: each page's English can be hidden, one page at a time or on every page.
//   E8  a link to the completion card once a book is finished (src/books/card.view.js).
//   E10 series: the book data has no series field, so books are grouped by their existing level (the shelf's groups);
//       the page shows the next book in the same level and how many of that level are finished. The screens say so.
// Data: data/books/words.json (tools/books/build-book-words.mjs). Counts: src/lib/counts.js (booksFinishedOf, percentOf).
import { strip, tokens, matchWord } from '../knownwords/validate.js';
import { booksFinishedOf, percentOf } from '../lib/counts.js';
import { shelfOrder } from './order.js';

export const WORDS_URL = 'data/books/words.json';
export const KNOWN_RULE = 'Known words are the words on your review cards whose last answer was Hard, Good or Easy.';
export const SERIES_NOTE = 'The books have no series of their own, so a level is used as the series.';
export const MARKS_KEY = 'books.marks.v1';
/** Pointed form for the gloss lookup: cantillation, maqaf and punctuation removed, vowel points kept (the same key as
 *  src/sprint/model.js pointedKey, which tools/books/build-book-words.mjs uses; kept here so the book page does not load Word Sprint). */
export const pointedKey = (s) => String(s ?? '').normalize('NFC').replace(/[\u0591-\u05AF\u05BE\u05C0\u05C3\u05C6]/g, '').replace(/[:.,;!?"'()\s]/g, '');
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const cardList = (v) => (Array.isArray(v) ? v : Object.values(obj(v))).filter((c) => c && typeof c.id === 'string');

/** Spellings the learner knows: every spelling data/books/words.json lists for a review card whose state is 'review'. */
export function knownKeys(cardsMap, ...cardStores) {
  const set = new Set();
  for (const c of cardStores.flatMap(cardList)) if (c.state === 'review') for (const k of obj(cardsMap)[c.id] || []) set.add(k);
  return set;
}
/** True when the learner has any graded review card at all (so "0% known" is a measurement, not an empty store). */
export const hasGraded = (...cardStores) => cardStores.flatMap(cardList).some((c) => (c.reps || 0) > 0);

/** One book's label numbers: running words, different words, running words known (exact or after a prefix letter). */
export function bookKnown(stat, known) {
  const s = obj(stat), counts = obj(s.counts);
  let knownWords = 0;
  for (const [k, n] of Object.entries(counts)) if (matchWord(k, known)) knownWords += Number(n) || 0;
  const words = Number(s.words) || 0;
  return { words, unique: Number(s.unique) || 0, knownWords, pct: percentOf(knownWords, words) };
}

/** The label line: '55 words, 20 different · you know 40% of them' (or no tracked words yet). */
export function difficultyLine(k, graded) {
  if (!k.words) return '';
  return `${k.words} words, ${k.unique} different · ${graded ? `you know ${k.pct}% of them` : 'known words: none tracked yet'}`;
}

/** Books of the same level, in shelf order (E10: the level is the series). */
export function levelSeries(id, books) {
  const me = (books || []).find((b) => b.id === id);
  return me ? shelfOrder(books).filter((b) => b.level === me.level) : [];
}
/** The next book in the same level after `id`, or null. */
export function nextInSeries(id, books) {
  const s = levelSeries(id, books), i = s.findIndex((b) => b.id === id);
  return i >= 0 ? s[i + 1] || null : null;
}
/** '3 of 19 Beginner 1 books finished' */
export function seriesLine(level, ids, places) {
  return `${booksFinishedOf(places, ids)} of ${ids.length} ${level} books finished`;
}

/** Words of a Hebrew line in order, each with its letters key and its pointed key (for the gloss). */
export function lineWords(he) {
  return tokens(he).map((t) => ({ text: t, key: strip(t), pk: pointedKey(t) }));
}

const readStore = async (ctx, k) => { try { return (await ctx?.store?.get?.(k)) ?? null; } catch { return null; } };
const fetchJson = async (ctx, url) => { const r = await (ctx?.fetchFn ?? fetch)(url); return r && r.ok !== false ? r.json() : null; };
let wordsPromise = null;
export const loadBookWords = (ctx) => (wordsPromise ??= fetchJson(ctx, WORDS_URL).catch(() => { wordsPromise = null; return null; }));
export const resetBookWords = () => { wordsPromise = null; };

/** The learner's known spellings and whether any card has been graded, from one read of both card stores. */
export async function learnerKnown(ctx, data) {
  const [cards, vocab] = await Promise.all([readStore(ctx, 'srs.cards'), readStore(ctx, 'srs.vocab')]);
  return { known: knownKeys(data?.cards, cards, vocab), graded: hasGraded(cards, vocab) };
}

/**
 * Shelf (books.view.js): a difficulty line on each card (E1), a finished count on each level heading (E10), and a link to the
 * reading challenges (E9). h: the shell's element helper; wrap: the shelf; books: index.json books; places: books.v1.
 */
export async function decorateShelf(h, wrap, books, ctx, places) {
  const data = await loadBookWords(ctx);
  const { known, graded } = data ? await learnerKnown(ctx, data) : { known: new Set(), graded: false };
  for (const a of wrap.querySelectorAll?.('a.book-card') || []) {
    const id = String(a.getAttribute('href') || '').replace('#/book/', '');
    const stat = data?.books?.[id]; if (!stat) continue;
    const meta = a.querySelector?.('.book-meta') || a;
    meta.append(h('span', { class: 'muted book-difficulty' }, difficultyLine(bookKnown(stat, known), graded)));
  }
  for (const t of wrap.querySelectorAll?.('h2.book-group-title') || []) {
    const level = String(t.textContent || '').replace(/^Start here: /, '');
    const ids = (books || []).filter((b) => b.level === level).map((b) => b.id);
    if (ids.length) t.append(h('span', { class: 'muted book-series-count' }, ` · ${seriesLine(level, ids, places)}`));
  }
  return { known, graded };
}

/**
 * Book page (book.view.js). Returns the pieces the reader places: a header (difficulty, marks and English toggles), the Hebrew
 * line (with new-word marks when on), the English line (hideable), and the extras for a finished book.
 * onChange: redraw the page when the data arrives or a toggle changes.
 */
const CSS = `.book-new-word{background:none;border:0;padding:0 .1em;font:inherit;color:inherit;text-decoration:underline dotted 2px;text-underline-offset:.3em;cursor:pointer;min-block-size:44px}
.book-new-word:focus-visible{outline:3px solid currentColor;outline-offset:2px}.book-word-card{display:block;margin-block:.4rem;padding:.4rem .6rem;border:1px solid var(--line,#8886);border-radius:8px}
.book-en-row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}.book-difficulty{display:block}`;
function injectStyles() { try { const d = globalThis.document; if (!d?.head || d.getElementById?.('book-extras-css')) return; const st = d.createElement('style'); st.id = 'book-extras-css'; st.textContent = CSS; d.head.append(st); } catch { /* optional */ } }

export function bookPage(h, heSpan, ctx, { id, book, shelfBooks, onChange }) {
  injectStyles();
  let data = null, known = new Set(), graded = false, marks = false, allEnglishHidden = false, tapped = null, places = {};
  const hiddenEn = new Set();
  const fire = () => { try { onChange?.(); } catch { /* the page is not drawn yet; it draws with the data */ } };
  const say = h('p', { class: 'muted book-word-note', role: 'status', 'aria-live': 'polite' }, '');
  const diff = h('span', { class: 'muted book-difficulty' }, '');
  const marksBtn = h('button', { type: 'button', class: 'btn secondary book-marks', 'aria-pressed': 'false', onclick: async () => {
    marks = !marks; marksBtn.setAttribute('aria-pressed', String(marks));
    try { await ctx?.store?.set?.(MARKS_KEY, { on: marks }); } catch { /* the choice is for this visit only then */ }
    say.textContent = marks ? `New words are underlined: tap one for its meaning. ${KNOWN_RULE}` : 'New-word marks are off.';
    fire();
  } }, 'Mark new words');
  const enAll = h('button', { type: 'button', class: 'btn secondary book-en-all', 'aria-pressed': 'false', onclick: () => {
    allEnglishHidden = !allEnglishHidden; enAll.setAttribute('aria-pressed', String(allEnglishHidden)); hiddenEn.clear(); fire();
  } }, 'Hide English on every page');
  (async () => {
    try { const m = await ctx?.store?.get?.(MARKS_KEY); if (m?.on) { marks = true; marksBtn.setAttribute('aria-pressed', 'true'); } } catch { /* default off */ }
    places = obj(await readStore(ctx, 'books.v1'));
    data = await loadBookWords(ctx);
    if (data) { ({ known, graded } = await learnerKnown(ctx, data)); const st = data.books?.[id]; if (st) diff.textContent = difficultyLine(bookKnown(st, known), graded) + '. '; }
    if (marks && data) fire(); // the page only changes when the marks are on; otherwise the label above updates in place
  })();

  const card = (w) => {
    const g = data?.gloss?.[w.pk];
    const voice = (() => { try { return ctx?.settings?.get?.('voice') === 'm' ? 'm' : 'f'; } catch { return 'f'; } })();
    const clipId = g?.clip?.[voice] || g?.clip?.f || g?.clip?.m || '';
    return h('span', { class: 'book-word-card', role: 'note' }, heSpan(w.text), ' — ',
      g ? `${g.en} (dictionary: ${g.he})` : 'not in Aleph\'s word list yet',
      clipId ? h('button', { type: 'button', class: 'btn secondary book-word-hear', onclick: async () => {
        try { const r = await ctx?.audio?.play?.('word', clipId, { voice: g.clip[voice] ? voice : (g.clip.f ? 'f' : 'm'), tradition: 'israeli' }); say.textContent = r?.source === 'file' ? 'Playing the word (Israeli voice).' : 'This word\'s clip did not play.'; }
        catch { say.textContent = 'This word\'s clip did not play.'; }
      } }, '▶ Hear') : null);
  };
  return {
    header: () => h('div', { class: 'book-extras' }, h('p', {}, diff, h('a', { href: '#/reading-challenge' }, 'Reading challenges')), h('div', { class: 'row' }, marksBtn, enAll), say),
    /** The page's Hebrew line: plain, or with new words as buttons when marks are on and the data has loaded. */
    line(p) {
      if (!marks || !data) return heSpan(p.he, 'book-line');
      const parts = [], ws = lineWords(p.he);
      for (const [i, w] of ws.entries()) {
        if (i) parts.push(' ');
        const isNew = !matchWord(w.key, known);
        parts.push(isNew ? h('button', { type: 'button', class: 'book-new-word', 'aria-expanded': String(tapped === w.pk), onclick: () => { tapped = tapped === w.pk ? null : w.pk; fire(); } }, heSpan(w.text)) : heSpan(w.text));
      }
      const line = h('span', { class: 'book-line book-line-marked', lang: 'he', dir: 'rtl' }, ...parts);
      const open = ws.find((w) => w.pk === tapped);
      return open ? h('div', {}, line, card(open)) : line;
    },
    /** The page's English line, hideable for this page or for every page (E7). */
    en(p, page) {
      const hidden = allEnglishHidden ? !hiddenEn.has(page) : hiddenEn.has(page);
      const btn = h('button', { type: 'button', class: 'btn secondary book-en-toggle', 'aria-pressed': String(hidden), onclick: () => { if (hiddenEn.has(page)) hiddenEn.delete(page); else hiddenEn.add(page); fire(); } }, hidden ? 'Show English' : 'Hide English');
      return h('div', { class: 'book-en-row' }, hidden ? null : h('p', { class: 'muted book-en' }, p.en), btn);
    },
    /** After the book is finished: the completion card link (E8) and the next book in the same level (E10). */
    finished() {
      const done = { ...places, [id]: { ...obj(places[id]), finishedAt: obj(places[id]).finishedAt || Date.now() } };
      const series = levelSeries(id, shelfBooks), next = nextInSeries(id, shelfBooks);
      return h('div', { class: 'book-series' },
        h('p', {}, h('a', { class: 'btn', href: `#/book-card/${id}` }, 'Your completion card')),
        series.length ? h('p', { class: 'muted' }, `${seriesLine(book.level, series.map((b) => b.id), done)}. ${SERIES_NOTE}`) : null,
        next ? h('p', {}, h('a', { class: 'btn secondary', href: `#/book/${next.id}` }, `Next in ${book.level}: ${next.titleTranslit} — ${next.titleEn}`)) : null);
    },
  };
}
