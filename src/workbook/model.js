// @ts-check
// Printable workbook per belt (25 Nov 2026 critique, item 7). Pure: every page is built from the app's own data, so the workbook can
// never drift from the lessons: the belt's lessons (data/curriculum/lessons.json) give the letters, vowel signs, words and prayer lines;
// data/letters/letters.json the shapes and stroke paths; data/pronunciation/niqqud.json the vowel shapes; data/corpus/registry.json the
// prayer lines; data/books/*.json the story books. Transliteration is computed for the learner's reading style by the app's own
// transliterator and is marked as a draft. Nothing here invents Hebrew; the divine name is shown as ה׳ and never spelled out.
import { seededOrder } from '../platform/worksheet.js';
import { showName } from '../games/tg-core.js';

/** Belts in course order, with the story-book levels a belt's companion pages default to. */
export const BELTS = Object.freeze([
  { id: 'white', track: 'read', label: 'White belt', books: ['Grade 1'] },
  { id: 'yellow', track: 'read', label: 'Yellow belt', books: ['Beginner 1'] },
  { id: 'orange', track: 'read', label: 'Orange belt', books: ['Beginner 2'] },
  { id: 'green', track: 'read', label: 'Green belt', books: ['Beginner 3'] },
  { id: 'blue', track: 'read', label: 'Blue belt', books: ['Beginner 3'] },
  { id: 'brown', track: 'read', label: 'Brown belt', books: ['Beginner 3', 'Advanced'] },
  { id: 'intermediate', track: 'read', label: 'Intermediate', books: ['Advanced'] },
  { id: 'A1', track: 'israel', label: 'Speak in Israel A1', books: ['Grade 1', 'Beginner 1'] },
  { id: 'A2', track: 'israel', label: 'Speak in Israel A2', books: ['Beginner 2'] },
  { id: 'B1', track: 'israel', label: 'Speak in Israel B1', books: ['Beginner 3'] },
]);

/** Chapters a workbook can hold, in printing order. */
export const CHAPTERS = Object.freeze([
  { id: 'letters', label: 'Letters: stroke order and tracing' },
  { id: 'vowels', label: 'Vowel drills' },
  { id: 'build', label: 'Word building' },
  { id: 'match', label: 'Word meanings' },
  { id: 'prayers', label: 'Prayer practice' },
  { id: 'books', label: 'Story-book companions' },
]);

const HEB = /[\u05D0-\u05EA]/;
const MARKS = /[\u0591-\u05C7]/g;
const SHIN = 'שׁ';
/** Display Hebrew with every spelling of the four-letter name shown as ה׳ (the app's one rule, src/games/tg-core.js). */
export const showDivineName = (he) => showName(he);
/** Letters with no points, for counting and comparing. */
export const bare = (he) => String(he ?? '').replace(MARKS, '').replace(/[^א-ת ]/g, '');
/** Split pointed Hebrew into letter clusters (a letter and the points on it). */
export function clusters(he) {
  const out = [];
  for (const ch of String(he ?? '')) { if (HEB.test(ch)) out.push(ch); else if (out.length && /[֑-ׇ]/.test(ch)) out[out.length - 1] += ch; }
  return out;
}
/** At most this many prayer lines in one workbook (the intermediate belt has 113 across its lessons). */
export const PRAYER_MAX = 30;
const pickN = (list, n, seed) => seededOrder(list.length, seed).slice(0, n).map((i) => list[i]);
const MATCH_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** A match exercise: numbered Hebrew items, lettered meanings in a fixed shuffled order, and the answers. */
export function matchSet(items, seed) {
  const order = seededOrder(items.length, seed);
  const meanings = order.map((wi, k) => ({ key: MATCH_LABELS[k], en: items[wi].en, wi }));
  return {
    items: items.map((w, i) => ({ n: i + 1, he: w.he, sub: w.sub || '' })),
    meanings: meanings.map(({ key, en }) => ({ key, en })),
    answers: items.map((_, wi) => `${wi + 1}-${meanings.find((m) => m.wi === wi)?.key}`),
  };
}

/**
 * Build one belt's workbook.
 * @param {string} beltId
 * @param {{ lessons: any[], letters: any[], niqqud: any[], registry?: any[], books?: {id:string,level:string,titleHe?:string,titleEn?:string}[],
 *   bookData?: Record<string, any>, tradition?: 'israeli'|'sephardi'|'ashkenazi', transliterate?: (he:string, o:object)=>string,
 *   chapters?: string[], bookIds?: string[] | 'belt' | 'all' }} src
 */
export function buildWorkbook(beltId, src) {
  const belt = BELTS.find((b) => b.id === beltId) || BELTS[0];
  const tradition = src.tradition || 'sephardi';
  const tl = (he) => { try { return src.transliterate ? src.transliterate(he, { tradition }) : ''; } catch { return ''; } };
  const want = new Set(src.chapters && src.chapters.length ? src.chapters : CHAPTERS.map((c) => c.id));
  const lessons = (src.lessons || []).filter((l) => l.level === belt.id && (l.track || 'read') === belt.track);
  const uniq = (a) => [...new Set(a)];
  const letterById = Object.fromEntries((src.letters || []).map((l) => [l.id, l]));
  const vowelById = Object.fromEntries((src.niqqud || []).filter((n) => n.kind === 'vowel').map((n) => [n.id, n]));

  const letterIds = uniq(lessons.flatMap((l) => l.letters || [])).filter((id) => letterById[id]);
  const vowelIds = uniq(lessons.flatMap((l) => l.vowels || [])).filter((id) => vowelById[id]);
  const words = [];
  const seenW = new Set();
  for (const l of lessons) for (const w of l.words || []) { if (!w?.he || !w?.en || seenW.has(w.he)) continue; seenW.add(w.he); words.push({ he: showDivineName(w.he), en: w.en, raw: w.he, lesson: l.id }); }
  const prayerIds = uniq(lessons.flatMap((l) => l.prayerLines || []));
  const regById = Object.fromEntries((src.registry || []).map((r) => [r.id, r]));

  const chapters = [];
  const key = []; // answer key sections

  // 1. Letters: stroke order, a large outline to trace, a row to trace, a row to write.
  if (want.has('letters') && letterIds.length) {
    chapters.push({ id: 'letters', title: 'Letters: stroke order and tracing', intro: 'Follow the numbered strokes, trace the grey letters, then write your own in the empty boxes.',
      letters: letterIds.map((id) => { const l = letterById[id]; return { id, he: id === 'shin' ? SHIN : l.he, name: l.name, sound: l.sound?.en || '', strokes: (l.print?.strokes || []).map((s) => ({ path: s.path, start: s.median?.[0] || null, next: s.median?.[Math.min(3, (s.median?.length || 1) - 1)] || null })) }; }) });
  }

  // 2. Vowel drills: each vowel sign on each of the belt's letters (or the first letters of the alphabet when the belt has none).
  if (want.has('vowels') && vowelIds.length) {
    const base = (letterIds.length ? letterIds : ['alef', 'bet', 'dalet', 'lamed', 'mem', 'shin']).filter((id) => !id.endsWith('-final') && letterById[id]);
    const rows = vowelIds.map((vid) => {
      const v = vowelById[vid];
      const cells = base.slice(0, 8).map((id) => { const glyph = id === 'shin' ? SHIN : letterById[id].he; const he = String(v.shape).replace(v.base || 'ב', glyph); return { he, sound: tl(he) }; });
      return { id: vid, name: v.name, shape: v.shape, hint: (v.english && (v.english[tradition] || v.english.israeli)) || '', cells };
    });
    chapters.push({ id: 'vowels', title: 'Vowel drills', intro: 'Read each row aloud. Then write how each one sounds on the line under it. The answers are at the back.', rows });
    key.push({ title: 'Vowel drills', lines: rows.map((r) => `${r.name}: ${r.cells.map((c) => c.sound).join(', ')}`) });
  }

  // 3. Word building: the letters of each word, shuffled, to put back in order.
  if (want.has('build') && words.length) {
    const pick = words.filter((w) => clusters(w.raw).length >= 2 && clusters(w.raw).length <= 7 && !/\s/.test(w.raw)).slice(0, 12);
    const items = pick.map((w, i) => { const cl = clusters(w.he); const order = seededOrder(cl.length, w.raw + i); let tiles = order.map((k) => cl[k]); if (tiles.join('') === cl.join('') && cl.length > 1) tiles = tiles.slice(1).concat(tiles[0]); return { en: w.en, count: cl.length, tiles, answer: w.he }; });
    if (items.length) {
      chapters.push({ id: 'build', title: 'Word building', intro: 'The letters of each word are mixed up. Write them in the right order, from right to left, one letter in each box.', items });
      key.push({ title: 'Word building', lines: items.map((x, i) => [`${i + 1}. `, { he: x.answer }, ` (${x.en})`]) });
    }
  }

  // 4. Word meanings: match each word to its meaning, then copy it.
  if (want.has('match') && words.length > 1) {
    const sets = [];
    for (let i = 0; i < Math.min(words.length, 36); i += 12) sets.push(matchSet(words.slice(i, i + 12).map((w) => ({ he: w.he, en: w.en })), belt.id + i));
    chapters.push({ id: 'match', title: 'Word meanings', intro: 'Write the letter of the meaning next to each word. Then copy the word on its line.', sets });
    key.push({ title: 'Word meanings', lines: sets.map((s, i) => `Set ${i + 1}: ${s.answers.join(', ')}`) });
  }

  // 5. Prayer practice: read with the transliteration for your reading style, copy, then read again without help.
  if (want.has('prayers') && prayerIds.length) {
    const lines = prayerIds.map((id) => regById[id]).filter((r) => r && r.he).slice(0, PRAYER_MAX).map((r) => ({ id: r.id, title: r.title || r.id, ref: r.ref || '', he: showDivineName(r.he), translit: tl(r.he), en: r.english || '' }));
    if (lines.length) chapters.push({ id: 'prayers', title: 'Prayer practice', more: Math.max(0, prayerIds.length - lines.length), intro: `Read each line with the help of the ${tradition === 'ashkenazi' ? 'Ashkenazi' : tradition === 'israeli' ? 'Israeli' : 'Sephardi'} transliteration. Copy it. Then cover the transliteration and read it again.`, lines });
  }

  // 6. Story-book companions.
  if (want.has('books')) {
    const shelf = src.books || [];
    const ids = src.bookIds === 'all' ? shelf.map((b) => b.id) : Array.isArray(src.bookIds) ? src.bookIds : shelf.filter((b) => belt.books.includes(b.level)).map((b) => b.id);
    const companions = ids.map((id) => bookCompanion(src.bookData?.[id], id)).filter(Boolean);
    if (companions.length) {
      chapters.push({ id: 'books', title: 'Story-book companions', intro: 'Read the book in the app first. Then answer the questions from memory, and look back at the book to check.', books: companions });
      key.push({ title: 'Story-book companions', lines: companions.map((b) => [`${b.titleEn}: 1. ${b.match.answers.join(', ')}; 3. ${b.where.map((w) => `${w.n}: page ${w.page}`).join(', ')}`, ...(b.hunt ? ['; 4. ', { he: b.hunt.he }, ` ${b.hunt.count} times`] : [])]) });
    }
  }

  return {
    belt: { id: belt.id, label: belt.label, track: belt.track }, tradition,
    lessons: lessons.map((l) => ({ id: l.id, title: l.title })),
    counts: { letters: letterIds.length, vowels: vowelIds.length, words: words.length, prayers: prayerIds.length },
    chapters, key,
  };
}

/**
 * Companion pages for one book: match lines to their meaning, copy two lines, say which page says something, count a word, draw a page.
 * @param {any} book data/books/<id>.json  @param {string} id
 */
export function bookCompanion(book, id) {
  const pages = (book?.pages || []).filter((p) => p && p.he && p.en);
  if (pages.length < 3) return null;
  const short = pages.filter((p) => bare(p.he).length <= 60);
  const pool = short.length >= 4 ? short : pages;
  const matchPages = pickN(pool, Math.min(6, pool.length), id + ':m').sort((a, b) => a.n - b.n);
  const copyPages = pickN(pool.filter((p) => !matchPages.includes(p)).length >= 2 ? pool.filter((p) => !matchPages.includes(p)) : pool, 2, id + ':c').sort((a, b) => a.n - b.n);
  const rest = pages.filter((p) => !matchPages.includes(p) && !copyPages.includes(p)); // "which page" never asks about a line printed elsewhere in the companion
  const where = pickN(rest.length >= 3 ? rest : pages, Math.min(3, (rest.length >= 3 ? rest : pages).length), id + ':w').sort((a, b) => a.n - b.n).map((p, i) => ({ n: i + 1, en: p.en, page: p.n }));
  // Word hunt: the longest word (3+ letters) that appears on at least two pages, counted across the whole book.
  const count = new Map(), onPages = new Map();
  for (const p of pages) for (const w of bare(p.he).split(/\s+/).filter((x) => x.length >= 3)) { count.set(w, (count.get(w) || 0) + 1); (onPages.get(w) || onPages.set(w, new Set()).get(w)).add(p.n); }
  const huntWord = [...count.keys()].filter((w) => onPages.get(w).size >= 2).sort((a, b) => b.length - a.length || count.get(b) - count.get(a) || (a < b ? -1 : 1))[0];
  const drawPage = pickN(pages, 1, id + ':d')[0];
  return {
    id, titleHe: book.titleHe || '', titleEn: book.titleEn || id, level: book.level || '', pageCount: pages.length,
    match: matchSet(matchPages.map((p) => ({ he: p.he, en: p.en })), id),
    copy: copyPages.map((p) => ({ n: p.n, he: p.he, en: p.en })),
    where,
    hunt: huntWord ? { he: huntWord, count: count.get(huntWord) } : null,
    draw: drawPage ? { n: drawPage.n, he: drawPage.he, en: drawPage.en } : null,
  };
}

/** Summary line for the picker: what this belt's workbook will hold. */
export function describe(wb) {
  const parts = [];
  for (const c of wb.chapters) {
    if (c.id === 'letters') parts.push(`${c.letters.length} letters`);
    if (c.id === 'vowels') parts.push(`${c.rows.length} vowel drills`);
    if (c.id === 'build') parts.push(`${c.items.length} words to build`);
    if (c.id === 'match') parts.push(`${c.sets.reduce((n, s) => n + s.items.length, 0)} words to match`);
    if (c.id === 'prayers') parts.push(`${c.lines.length} prayer lines`);
    if (c.id === 'books') parts.push(`${c.books.length} book companions`);
  }
  return parts.length ? parts.join(', ') : 'nothing for this belt with the chapters chosen';
}
