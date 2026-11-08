// Torah reader model: pure functions, no DOM, no I/O. See docs/corpus/READER-ROUTE.md.
//   state       what is persisted under the store key torahreader.v1
//   flatten     the reading tokens of a reader passage as one list (what "read with me" steps through)
//   display     the text of a token for the current show/hide switches
//   audioFor    the ctx.audio ids for a token or a verse, when the audio manifest has them
//   legend      rows for the trope reference page
// Data comes from data/corpus/reader/*.json, data/corpus/trope/*.json (tools/corpus/trope.mjs).

import { speechText, SPOKEN_NAME } from '../shell/names.js';
export const STORE_KEY = 'torahreader.v1';
export const PASSAGE_IDS = ['priestly-blessing', 'shema'];
export const VIEWS = ['reader', 'legend'];
/** The full-Torah screens that share this route with the two-passage study view. */
export const SCREENS = ['home', 'chapter', 'study', 'legend'];
/** The five books, in canonical order. Chapter counts are the standard Hebrew grid. */
export const TORAH_BOOKS = [
  { id: 'genesis', en: 'Genesis', he: 'בְּרֵאשִׁית', chapters: 50 },
  { id: 'exodus', en: 'Exodus', he: 'שְׁמוֹת', chapters: 40 },
  { id: 'leviticus', en: 'Leviticus', he: 'וַיִּקְרָא', chapters: 27 },
  { id: 'numbers', en: 'Numbers', he: 'בְּמִדְבַּר', chapters: 36 },
  { id: 'deuteronomy', en: 'Deuteronomy', he: 'דְּבָרִים', chapters: 34 },
];
export const AUDIO_LANGS = ['he', 'en'];
export const torahBook = (id) => TORAH_BOOKS.find((b) => b.id === id) || null;
/** Milliseconds per word for "read with me". A pacing aid only; nothing here is synchronised with any recording. */
export const SPEEDS = [
  { id: 'slow', ms: 2400, label: 'Slow' },
  { id: 'medium', ms: 1500, label: 'Medium' },
  { id: 'fast', ms: 900, label: 'Fast' },
];
/** Hebrew text size steps. `scale` multiplies the 2rem verse size (and the word detail and legend marks), so the small trope marks get bigger too. */
export const SIZES = [
  { id: 'normal', scale: 1, label: 'Normal' },
  { id: 'large', scale: 1.35, label: 'Large' },
  { id: 'largest', scale: 1.7, label: 'Largest' },
];
export const sizeScale = (id) => (SIZES.find((x) => x.id === id) || SIZES[0]).scale;
export const DEFAULT_STATE = {
  v: 1, passage: 'priestly-blessing', view: 'reader', screen: 'study',
  book: 'genesis', chapter: 1, portionId: null,
  showTrope: true, showNiqqud: true, showEnglish: true, audioLang: 'he',
  speed: 'medium', size: 'normal',
};

/** Anything unknown or malformed in a stored value falls back to the default. */
export function normaliseState(raw) {
  const s = { ...DEFAULT_STATE };
  if (!raw || typeof raw !== 'object') return s;
  if (PASSAGE_IDS.includes(raw.passage)) s.passage = raw.passage;
  if (VIEWS.includes(raw.view)) s.view = raw.view;
  // Full-Torah screen: an explicit screen wins; a legacy stored view maps back to the screen the
  // learner was on (legend stays legend, a study passage in progress reopens as study).
  if (SCREENS.includes(raw.screen)) s.screen = raw.screen;
  else if (raw.view === 'legend') s.screen = 'legend';
  else if (raw.view === 'reader' && PASSAGE_IDS.includes(raw.passage)) s.screen = 'study';
  s.view = s.screen === 'legend' ? 'legend' : 'reader';
  const book = torahBook(raw.book);
  if (book) {
    s.book = book.id;
    if (Number.isInteger(raw.chapter) && raw.chapter >= 1 && raw.chapter <= book.chapters) s.chapter = raw.chapter;
  }
  if (typeof raw.portionId === 'string' && raw.portionId) s.portionId = raw.portionId;
  if (typeof raw.showTrope === 'boolean') s.showTrope = raw.showTrope;
  if (typeof raw.showNiqqud === 'boolean') s.showNiqqud = raw.showNiqqud;
  if (typeof raw.showEnglish === 'boolean') s.showEnglish = raw.showEnglish;
  if (AUDIO_LANGS.includes(raw.audioLang)) s.audioLang = raw.audioLang;
  if (SPEEDS.some((x) => x.id === raw.speed)) s.speed = raw.speed;
  if (SIZES.some((x) => x.id === raw.size)) s.size = raw.size;
  return s;
}
export const speedMs = (id) => (SPEEDS.find((x) => x.id === id) || SPEEDS[1]).ms;

// Vowel points, dagesh, shin and sin dots, qamats qatan. Cantillation (U+0591-05AF), meteg U+05BD and paseq U+05C0 stay.
const NIQQUD_RE = /[ְ-ׇֻּׁׂ]/g;
export const stripNiqqud = (s) => s.replace(NIQQUD_RE, '');
export const TETRAGRAMMATON = 'יְהוָה';
/** The spoken form of the divine name, as the audio manifest writes it. */
export { SPOKEN_NAME };
/** Speech text: the single shared rule in src/shell/names.js (bare, maqaf-compound and prefixed forms all become the spoken name). */
export const spokenText = (he) => speechText(he);

/** Flat list of reading tokens: { n (0-based, whole passage), verseIndex, tokenIndex, verse, token, words[], last (last token of verse) }. */
export function flatten(passage) {
  const out = [];
  passage.verses.forEach((verse, vi) => {
    verse.tokens.forEach((token, ti) => {
      out.push({ n: out.length, verseIndex: vi, tokenIndex: ti, verse, token, words: token.words.map((i) => verse.words[i]), last: ti === verse.tokens.length - 1 });
    });
  });
  return out;
}

/**
 * Text of one token for the switches. With cantillation on, the UXLC form (trope marks, meteg, paseq) is used and the sof pasuq
 * is left off (the view prints it once at the end of the verse); with it off, the plain registry form is used.
 */
/** The source writes a paseq with a space before it; the per-word forms carry it attached, so the space is put back. Nothing else changes. */
export const spacePaseq = (t) => t.replace(/([^\s])\u05C0/g, '$1 \u05C0');
export function display(item, { showTrope, showNiqqud }) {
  let t = item.words.map((w) => (showTrope ? spacePaseq(w.heTrope.replace(/׃/g, '')) : w.he)).join('');
  if (!showNiqqud) t = stripNiqqud(t);
  return t;
}
const isLetter = (c) => c >= '\u05D0' && c <= '\u05EA';
const isMark = (c) => (c >= '\u0591' && c <= '\u05BD') || c === '\u05BF' || c === '\u05C1' || c === '\u05C2' || (c >= '\u05C4' && c <= '\u05C7');
/**
 * Where the letters written large sit in a list of word strings: [{ wi (index into words), ln (0-based count of Hebrew letters in that word) }].
 * `letters` lists the base letters in reading order; each is matched to its next occurrence, scanning forward.
 */
export function largePositionsIn(words, letters = []) {
  const out = []; let wi = 0, ln = 0;
  for (const ch of letters || []) {
    let found = false;
    while (!found && wi < words.length) {
      const ls = [...words[wi]].filter(isLetter);
      for (; ln < ls.length; ln++) if (ls[ln] === ch) { out.push({ wi, ln }); found = true; ln++; break; }
      if (!found) { wi++; ln = 0; }
    }
  }
  return out;
}
/** Same for a reader verse (verse.words[].he, verse.largeLetters). */
export const largePositions = (verse) => largePositionsIn(verse.words.map((w) => w.he), verse.largeLetters);
/** One word's text as [{ t, big }] pieces; `want` is a Set of 0-based letter numbers drawn large (the letter plus its points and marks). */
export function bigParts(t, want) {
  if (!want || !want.size) return [{ t, big: false }];
  const parts = []; let n = -1, cur = '', big = false;
  const flush = () => { if (cur) parts.push({ t: cur, big }); cur = ''; };
  for (const c of t) {
    if (isLetter(c)) { flush(); n++; big = want.has(n); cur = c; }
    else if (isMark(c)) cur += c;
    else { flush(); big = false; cur = c; flush(); }
  }
  flush();
  return parts;
}
const mergeParts = (parts) => parts.reduce((a, p) => { const l = a[a.length - 1]; if (l && l.big === p.big) l.t += p.t; else a.push({ ...p }); return a; }, []);
/** Pieces for a list of word strings with large positions from largePositionsIn (for /read and /torahread). */
export function wordPartsLarge(words, letters) {
  const pos = largePositionsIn(words, letters);
  return words.map((w, i) => mergeParts(bigParts(w, new Set(pos.filter((p) => p.wi === i).map((p) => p.ln)))));
}
/** Like display(), but as [{ t, big }] pieces so the view can draw the large letters (letter plus its points and marks) bigger. */
export function displayParts(item, opts, large = []) {
  const parts = [];
  for (const w of item.words) {
    let t = opts.showTrope ? spacePaseq(w.heTrope.replace(/׃/g, '')) : w.he;
    if (!opts.showNiqqud) t = stripNiqqud(t);
    parts.push(...bigParts(t, new Set(large.filter((l) => l.wi === w.i).map((l) => l.ln))));
  }
  return mergeParts(parts);
}
/** Pointed text without cantillation, joined, for transliteration and audio. */
export const plainOf = (item) => item.token.he;

/**
 * ctx.audio ids. Registry-backed verses use the manifest ids the corpus reader uses: word `<recordId>-w<k>`, line `<recordId>` or
 * `<recordId>-l<k>`. Verses with no registry record (Numbers 6:22-23 and 6:27) have none; the view then passes the text only.
 */
export function audioIndex(passage) {
  const idx = { words: new Map(), lines: new Map() };
  const regVerses = passage.registryVerses || [];
  if (passage.registryIds.length === 1) {
    const rid = passage.registryIds[0];
    let k = 0;
    passage.verses.forEach((v) => {
      if (!regVerses.includes(v.verse)) return;
      v.tokens.forEach((t) => { k++; idx.words.set(`${v.verse}:${t.t}`, `${rid}-w${k}`); });
      idx.lines.set(v.verse, `${rid}-l${regVerses.indexOf(v.verse) + 1}`);
    });
  } else {
    passage.registryIds.forEach((rid, j) => {
      const v = passage.verses.find((x) => x.verse === regVerses[j]);
      if (!v) return;
      v.tokens.forEach((t) => idx.words.set(`${v.verse}:${t.t}`, `${rid}-w${t.t + 1}`));
      idx.lines.set(v.verse, rid);
    });
  }
  return idx;
}

/** Trope table by id, from data/corpus/trope/table.json. */
export function tropeById(table) {
  const m = new Map();
  for (const r of table.prose) m.set(r.id, r);
  return m;
}
/** Name of a trope in the learner's tradition: ashkenazi gets the Ashkenazi list, israeli and sephardi the Sephardi list. */
export const tropeName = (row, tradition) => (!row ? '' : tradition === 'ashkenazi' ? row.ashkenazi : row.sephardi);

/** Legend rows grouped by class; `occurs` counts come from the two trope passage files. */
export function legend(table, tropePassages = []) {
  const counts = {};
  for (const p of tropePassages) for (const [id, n] of Object.entries(p.markCounts || {})) counts[id] = (counts[id] || 0) + n;
  const rows = table.prose.map((r) => ({ ...r, occurs: counts[r.id] || 0 }));
  const groups = [
    { id: 'disjunctive', title: 'Disjunctive marks (pause: they end a phrase)', rows: rows.filter((r) => r.cls === 'disjunctive') },
    { id: 'conjunctive', title: 'Conjunctive marks (join a word to the next)', rows: rows.filter((r) => r.cls === 'conjunctive') },
    { id: 'other', title: 'Other signs (stress mark, separator, verse end)', rows: rows.filter((r) => !['disjunctive', 'conjunctive'].includes(r.cls)) },
  ];
  return { groups, counts };
}
/** The mark drawn on a dotted circle so a combining mark is visible on its own. */
export const markGlyph = (row) => '◌' + row.char;

// ---------- full-Torah grid (data/corpus/torah/index.json) ----------

/** Manifest ids/kinds for the Torah audio tracks (Lane J/J-2 layout). */
export const torahVerseId = (book, chapter, verse) => `torah-${book}-${chapter}-${verse}`;
export const torahChapterId = (book, chapter, lang = 'he') => (lang === 'en' ? `torah-en-${book}-${chapter}` : `torah-${book}-${chapter}`);
export const torahChapterKind = (lang = 'he') => (lang === 'en' ? 'torah-chapter-en' : 'torah-chapter');

/** Chapters that can actually be opened: books whose chapter files have been built, in order. */
export function availableChapters(index) {
  if (!index || !Array.isArray(index.books)) return [];
  const out = [];
  for (const b of index.books) {
    const n = Math.min(b.chaptersAvailable || 0, (b.chapterVerses || []).length);
    for (let c = 1; c <= n; c++) out.push({ book: b.id, chapter: c });
  }
  return out;
}

/** Previous/next openable chapter, skipping books whose files are not built yet; null at the ends. */
export function adjacentChapter(index, book, chapter, dir = 1) {
  const seq = availableChapters(index);
  const i = seq.findIndex((x) => x.book === book && x.chapter === chapter);
  if (i < 0) return null;
  return seq[i + dir] || null;
}

/** 1-based position of a verse in the whole-Torah grid, from the index's chapter verse counts. */
export function gridPosition(index, book, chapter, verse) {
  let pos = 0;
  for (const b of index.books) {
    for (let c = 1; c <= b.chapterVerses.length; c++) {
      if (b.id === book && c === chapter) return pos + verse;
      pos += b.chapterVerses[c - 1];
    }
  }
  return null;
}

/** The index portions named by the calendar's portion numbers (parshaOnShabbat ids), in order. */
export function portionsForCalendarIds(index, ids) {
  if (!index || !Array.isArray(index.parshiyot)) return [];
  return (ids || []).map((n) => index.parshiyot.find((p) => p.num === n)).filter(Boolean);
}

/**
 * One chapter of a portion, clipped to the portion's range:
 * { book, chapter, fromVerse, toVerse, aliyot: [{n, verse}] } — aliyot lists the aliyah starts
 * that fall inside this chapter's clipped range. Null when the chapter is outside the portion.
 */
export function portionChapter(index, portion, book, chapter) {
  if (!index || !portion) return null;
  const bookRow = index.books.find((b) => b.id === book);
  if (!bookRow || chapter < 1 || chapter > bookRow.chapterVerses.length) return null;
  const total = bookRow.chapterVerses[chapter - 1];
  const c0 = gridPosition(index, book, chapter, 1), c1 = gridPosition(index, book, chapter, total);
  const f = gridPosition(index, portion.from.book, portion.from.chapter, portion.from.verse);
  const t = gridPosition(index, portion.to.book, portion.to.chapter, portion.to.verse);
  if (f == null || t == null || t < c0 || f > c1) return null;
  const fromVerse = f <= c0 ? 1 : portion.from.chapter === chapter && portion.from.book === book ? portion.from.verse : 1;
  const toVerse = t >= c1 ? total : portion.to.verse;
  const aliyot = [];
  for (const a of portion.aliyot || []) {
    if (a.from.book === book && a.from.chapter === chapter && a.from.verse >= fromVerse && a.from.verse <= toVerse) aliyot.push({ n: a.n, verse: a.from.verse });
  }
  return { book, chapter, fromVerse, toVerse, aliyot };
}

/** The openable chapters of a portion, each clipped (portionChapter), in reading order. */
export function portionChapters(index, portion) {
  if (!index || !portion) return [];
  return availableChapters(index).map(({ book, chapter }) => portionChapter(index, portion, book, chapter)).filter(Boolean);
}

/**
 * Where chapter playback has reached, from the measured per-verse durations.
 * Returns null until every verse has a real duration for the chosen language and voice
 * (the chapter bar stays hidden then — the page is fully usable text-only).
 * Otherwise { index, verse, totalMs, ended } for the verse playing at elapsedMs.
 */
export function chapterPosition(verses, lang, voice, elapsedMs) {
  const field = lang === 'en' ? 'durMsEn' : 'durMs';
  if (!Array.isArray(verses) || !verses.length) return null;
  let total = 0;
  for (const v of verses) {
    const d = v[field] && v[field][voice];
    if (typeof d !== 'number' || !Number.isFinite(d) || d <= 0) return null;
    total += d;
  }
  const t = Math.max(0, Number(elapsedMs) || 0);
  if (t >= total) return { index: verses.length - 1, verse: verses[verses.length - 1].n, totalMs: total, ended: true };
  let acc = 0;
  for (let i = 0; i < verses.length; i++) {
    acc += verses[i][field][voice];
    if (t < acc) return { index: i, verse: verses[i].n, totalMs: total, ended: false };
  }
  return { index: verses.length - 1, verse: verses[verses.length - 1].n, totalMs: total, ended: true };
}

/** Next index when stepping; null when the end is reached. */
export const stepIndex = (n, total, dir = 1) => {
  const next = (n == null ? (dir > 0 ? -1 : total) : n) + dir;
  return next < 0 || next >= total ? null : next;
};
