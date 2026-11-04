// Torah reader model: pure functions, no DOM, no I/O. See docs/corpus/READER-ROUTE.md.
//   state       what is persisted under the store key torahreader.v1
//   flatten     the reading tokens of a reader passage as one list (what "read with me" steps through)
//   display     the text of a token for the current show/hide switches
//   audioFor    the ctx.audio ids for a token or a verse, when the audio manifest has them
//   legend      rows for the trope reference page
// Data comes from data/corpus/reader/*.json, data/corpus/trope/*.json (tools/corpus/trope.mjs).

export const STORE_KEY = 'torahreader.v1';
export const PASSAGE_IDS = ['priestly-blessing', 'shema'];
export const VIEWS = ['reader', 'legend'];
/** Milliseconds per word for "read with me". A pacing aid only; nothing here is synchronised with any recording. */
export const SPEEDS = [
  { id: 'slow', ms: 2400, label: 'Slow' },
  { id: 'medium', ms: 1500, label: 'Medium' },
  { id: 'fast', ms: 900, label: 'Fast' },
];
export const DEFAULT_STATE = { v: 1, passage: 'priestly-blessing', view: 'reader', showTrope: true, showNiqqud: true, speed: 'medium' };

/** Anything unknown or malformed in a stored value falls back to the default. */
export function normaliseState(raw) {
  const s = { ...DEFAULT_STATE };
  if (!raw || typeof raw !== 'object') return s;
  if (PASSAGE_IDS.includes(raw.passage)) s.passage = raw.passage;
  if (VIEWS.includes(raw.view)) s.view = raw.view;
  if (typeof raw.showTrope === 'boolean') s.showTrope = raw.showTrope;
  if (typeof raw.showNiqqud === 'boolean') s.showNiqqud = raw.showNiqqud;
  if (SPEEDS.some((x) => x.id === raw.speed)) s.speed = raw.speed;
  return s;
}
export const speedMs = (id) => (SPEEDS.find((x) => x.id === id) || SPEEDS[1]).ms;

// Vowel points, dagesh, shin and sin dots, qamats qatan. Cantillation (U+0591-05AF), meteg U+05BD and paseq U+05C0 stay.
const NIQQUD_RE = /[ְ-ׇֻּׁׂ]/g;
export const stripNiqqud = (s) => s.replace(NIQQUD_RE, '');
export const TETRAGRAMMATON = 'יְהוָה';
/** The spoken form of the divine name, as the audio manifest writes it. */
export const SPOKEN_NAME = 'אֲדֹנָי';
export const spokenText = (he) => he.split(TETRAGRAMMATON).join(SPOKEN_NAME);

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
export function display(item, { showTrope, showNiqqud }) {
  let t = item.words.map((w) => (showTrope ? w.heTrope.replace(/׃/g, '') : w.he)).join('');
  if (!showNiqqud) t = stripNiqqud(t);
  return t;
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

/** Next index when stepping; null when the end is reached. */
export const stepIndex = (n, total, dir = 1) => {
  const next = (n == null ? (dir > 0 ? -1 : total) : n) + dir;
  return next < 0 || next >= total ? null : next;
};
