// @ts-check
// Trope melody model (idea M2). Pure: no DOM, no audio, no network.
// Turns a verse's cantillation marks into a list of timed notes, using the pattern file data/trope-trainer/melody-ashkenazi.json.
// One tradition only: Ashkenazi Torah reading. Every pattern in that file is a DRAFT with its own "source" line; nothing here
// claims a cantor has checked it, and draftLabel() keeps the draft wording on screen until every pattern is marked checked.
// The output is tones only. No word is ever sung or spoken, so the four-letter Name is never voiced.
import { verseTokens, codeMap, rowsById } from '../trope/families.js';

export const MELODY_FILE = 'data/trope-trainer/melody-ashkenazi.json';
export const DRAFT_LABEL = 'Draft melody, waiting for a cantor’s check';
export const TONES_NOTE = 'These are plain tones made on this device from the marks in the text. They are not a recording and not a cantor. No words are sung.';
export const ONE_TRADITION_NOTE = 'One tradition only: the Ashkenazi tune for the regular Torah reading. Other communities chant the same marks differently; follow your own cantor or teacher.';

/** Frequency of a note `semis` semitones above the home note. */
export const hzOf = (homeHz, semis) => homeHz * 2 ** (semis / 12);

const okNotes = (n) => Array.isArray(n) && n.length > 0 && n.every((x) => Array.isArray(x) && x.length === 2 && Number.isFinite(x[0]) && Number.isFinite(x[1]) && x[1] > 0 && Math.abs(x[0]) <= 24);

/** Problems with a melody file, as plain sentences. Empty means usable. `table` (the trope table) adds the coverage check. */
export function validateMelody(melody, table = null) {
  const errs = [];
  if (!melody || typeof melody !== 'object') return ['The melody file is missing.'];
  if (melody.schema !== 'alef-trope-melody/1') errs.push('Unknown melody schema.');
  if (!(melody.homeHz >= 80 && melody.homeHz <= 880)) errs.push('homeHz must be between 80 and 880.');
  if (!(melody.beatSec >= 0.1 && melody.beatSec <= 2)) errs.push('beatSec must be between 0.1 and 2.');
  if (!okNotes(melody.unmarked?.notes)) errs.push('The pattern for a word with no mark is missing.');
  for (const [id, p] of Object.entries(melody.patterns || {})) {
    if (!okNotes(p?.notes)) errs.push(`Pattern ${id} has no usable notes.`);
    if (typeof p?.source !== 'string' || p.source.trim().length < 20) errs.push(`Pattern ${id} does not say where it came from.`);
    if (typeof p?.checked !== 'boolean') errs.push(`Pattern ${id} does not say whether a cantor checked it.`);
    for (const [next, n] of Object.entries(p?.before || {})) if (!okNotes(n)) errs.push(`Pattern ${id} before ${next} has no usable notes.`);
  }
  if (table) for (const r of table.prose || []) {
    if ((r.cls === 'disjunctive' || r.cls === 'conjunctive') && !melody.patterns?.[r.id]) errs.push(`No pattern for ${r.id}.`);
  }
  return errs;
}

/** How many patterns a cantor has checked: { total, checked, allChecked }. */
export function checkedCount(melody) {
  const ps = Object.values(melody?.patterns || {});
  const checked = ps.filter((p) => p.checked === true).length;
  return { total: ps.length, checked, allChecked: ps.length > 0 && checked === ps.length && melody?.checked === true };
}

/** The label a screen must show beside any melody control. Stays the draft wording until every pattern and the file are checked. */
export function draftLabel(melody) {
  const c = checkedCount(melody);
  if (c.allChecked && typeof melody.checkedBy === 'string' && melody.checkedBy.trim()) return `Melody checked by ${melody.checkedBy.trim()}`;
  return DRAFT_LABEL;
}

/** The notes for one mark, given the mark that follows it in the verse (some joining marks change with what they lead into). */
export function motif(melody, id, nextId = null) {
  const p = melody?.patterns?.[id];
  if (!p) return null;
  return (nextId && p.before?.[nextId]) || p.notes;
}

/**
 * A verse as timed notes.
 * tokens: output of verseTokens() ([{ text, marks: [id] }]).
 * Returns { notes: [{ word, mark, semis, hz, start, dur }], words: [{ word, start, end, marks }], total } with times in seconds.
 * A mark with no pattern is skipped (never guessed); a word left with no notes is held on the file's "unmarked" note.
 */
export function scheduleTokens(tokens, melody, { tempo = 1, homeHz = melody?.homeHz, gapBeats = 0.25 } = {}) {
  const beat = (melody?.beatSec || 0.34) / (tempo > 0 ? tempo : 1);
  const notes = [], words = [];
  let t = 0;
  const firstMark = (tk) => (tk?.marks || []).find((id) => melody?.patterns?.[id]) || null;
  (tokens || []).forEach((tk, wi) => {
    const start = t;
    const ids = (tk.marks || []).filter((id) => melody?.patterns?.[id]);
    const nextId = firstMark(tokens[wi + 1]);
    const runs = ids.length ? ids.map((id, k) => ({ id, ns: motif(melody, id, k === ids.length - 1 ? nextId : ids[k + 1]) })) : [{ id: null, ns: melody?.unmarked?.notes || [[0, 1]] }];
    for (const run of runs) for (const [semis, beats] of run.ns) {
      const dur = beats * beat;
      notes.push({ word: wi, mark: run.id, semis, hz: hzOf(homeHz, semis), start: t, dur });
      t += dur;
    }
    words.push({ word: wi, start, end: t, marks: ids });
    t += gapBeats * beat;
  });
  return { notes, words, total: Math.max(0, t - (tokens?.length ? gapBeats * beat : 0)) };
}

/** A verse's cantillated text (heTrope) as timed notes. */
export function scheduleVerse(heTrope, table, melody, opts = {}) {
  const tokens = verseTokens(heTrope, table, codeMap(table), rowsById(table));
  return { tokens, ...scheduleTokens(tokens, melody, opts) };
}

/** One mark on its own, for the "hear this mark" buttons. */
export function scheduleMark(melody, id, opts = {}) {
  return scheduleTokens([{ text: '', marks: [id] }], melody, opts);
}

/** Which word is sounding at time `sec` (index into words), or -1 between words and after the end. */
export function wordAt(schedule, sec) {
  for (const w of schedule?.words || []) if (sec >= w.start && sec < w.end) return w.word;
  return -1;
}

/** The marks that have a pattern, in table order, for a legend: [{ id, row, pattern }]. */
export function legendRows(table, melody) {
  return (table?.prose || []).filter((r) => (r.cls === 'disjunctive' || r.cls === 'conjunctive') && melody?.patterns?.[r.id])
    .filter((r, i, a) => a.findIndex((x) => x.id === r.id) === i)
    .map((r) => ({ id: r.id, row: r, pattern: melody.patterns[r.id] }));
}

export const TEMPOS = Object.freeze([{ id: 'slow', label: 'Slow', tempo: 0.7 }, { id: 'steady', label: 'Steady', tempo: 1 }, { id: 'quick', label: 'Quick', tempo: 1.3 }]);
