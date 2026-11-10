// @ts-check
// Class track: pure helpers over data/curriculum/class-track.json (Aleph original 10-week plan, DRAFT).
// No DOM. Progress is derived from the same store key src/progress reads ('curriculum.progress' -> completed map).
import { loadJSON } from '../curriculum/data.js';
import { loadCorpus } from '../corpus/corpus.js';
import { knownSet, gradeLines } from '../progress/decode.js';

export const DRAFT = 'Draft: ALEF\'s own plan, not reviewed by a clergy member or Hebrew educator, not copied from any book. Hebrew pointing is a draft and awaits native-speaker review.';

export async function loadClassTrack() {
  const [track, lf, soundgap, hints, corpus, gates] = await Promise.all([
    loadJSON('data/curriculum/class-track.json'), loadJSON('data/curriculum/lessons.json'), loadJSON('data/pronunciation/soundgap.json'),
    loadJSON('data/curriculum/hints.json'), loadCorpus(), loadJSON('data/progress/belt-gates.json'),
  ]);
  return { track, lessons: lf.lessons, soundgap: soundgap.gaps, hints: hints.kinds, registry: corpus.allTexts(), nameLesson: gates.nameLesson };
}

/** Completed-lesson map from a store (sync or async get). @param {{get:Function}|undefined} store */
export async function readCompleted(store) {
  try { const v = await store.get('curriculum.progress', {}); const c = v && typeof v === 'object' ? v.completed : null; return c && typeof c === 'object' && !Array.isArray(c) ? c : {}; } catch { return {}; }
}

/** @param {any} week @param {Record<string,any>} completed */
export function weekStatus(week, completed) {
  const done = week.lessons.filter((id) => completed[id]).length;
  const stretchDone = (week.stretch || []).filter((id) => completed[id]).length;
  return { done, total: week.lessons.length, stretchDone, stretchTotal: (week.stretch || []).length, complete: done === week.lessons.length };
}

/** Index of the week to do next (first not complete), or -1 when all ten are complete. */
export function currentWeekIndex(weeks, completed) { return weeks.findIndex((w) => !weekStatus(w, completed).complete); }

/** Letters and signs taught by core lessons of weeks 1..idx+1, and whether the Name lesson is included. */
export function knownThrough(d, idx) {
  const letters = new Set(), signs = new Set(), ids = new Set();
  for (const w of d.track.weeks.slice(0, idx + 1)) for (const id of w.lessons) {
    ids.add(id); const l = d.lessons.find((x) => x.id === id);
    if (l) { l.letters.forEach((x) => letters.add(x)); l.vowels.forEach((x) => signs.add(x)); }
  }
  return { letters, signs, nameKnown: d.nameLesson ? ids.has(d.nameLesson) : false };
}

/** Letters and signs first taught in week idx. */
export function newInWeek(d, idx) {
  const before = idx > 0 ? knownThrough(d, idx - 1) : { letters: new Set(), signs: new Set() };
  const now = knownThrough(d, idx);
  return { letters: [...now.letters].filter((x) => !before.letters.has(x)), signs: [...now.signs].filter((x) => !before.signs.has(x)) };
}

/** Registry texts for a week's read-aloud list (with optional single line). */
export function readAloudTexts(d, week) {
  const by = new Map(d.registry.map((e) => [e.id, e]));
  return week.readAloud.ids.map((r) => {
    const e = by.get(r.id); if (!e) return null;
    const lines = String(e.he).split('\n').map((x) => x.trim()).filter(Boolean);
    return { id: e.id, title: e.title, lines: r.line ? [lines[r.line - 1]].filter(Boolean) : lines, line: r.line || null };
  }).filter(Boolean);
}

/** Mistake data for teacher mode: sound-gap traps for this week's letters (sound-gap lab) and interference hints by error kind. */
export function commonErrors(d, week) {
  const gaps = (week.soundGaps || []).map((id) => d.soundgap.find((g) => g.id === id)).filter(Boolean)
    .map((g) => ({ id: g.id, title: g.title, trap: g.englishTrap }));
  const kinds = (week.errorKinds || []).map((k) => d.hints.find((x) => x.errorKind === k)).filter(Boolean)
    .map((k) => ({ kind: k.errorKind, hint: k.hint, example: k.example }));
  return { gaps, kinds };
}

/** Consistency problems (empty = fine). Used by the view and the tests. @param {Awaited<ReturnType<typeof loadClassTrack>>} d @param {{validRoute?:(r:string)=>boolean}} [opt] */
export function validate(d, opt = {}) {
  const p = [];
  const ws = d.track.weeks;
  if (ws.length !== 10) p.push('expected 10 weeks');
  const seen = new Set();
  ws.forEach((w, i) => {
    if (w.week !== i + 1) p.push(`${w.id}: week number`);
    for (const id of [...w.lessons, ...(w.stretch || [])]) {
      if (!d.lessons.some((l) => l.id === id)) p.push(`${w.id}: unknown lesson ${id}`);
    }
    for (const id of w.lessons) { if (seen.has(id)) p.push(`${w.id}: lesson ${id} repeated`); seen.add(id); }
    for (const r of w.readAloud.ids) if (!d.registry.some((e) => e.id === r.id)) p.push(`${w.id}: unknown text ${r.id}`);
    for (const g of w.soundGaps || []) if (!d.soundgap.some((x) => x.id === g)) p.push(`${w.id}: unknown soundgap ${g}`);
    for (const k of w.errorKinds || []) if (!d.hints.some((x) => x.errorKind === k)) p.push(`${w.id}: unknown error kind ${k}`);
    if (opt.validRoute) for (const h of w.homework) if (!opt.validRoute(h.route)) p.push(`${w.id}: bad route ${h.route}`);
    if (w.readAloud.mode === 'read') {
      const k = knownThrough(d, i);
      const lines = readAloudTexts(d, w).flatMap((t) => t.lines.map((he) => ({ id: t.id, he })));
      const g = gradeLines(lines.map((l, n) => ({ id: l.id + '~' + n, title: l.id, he: l.he })), knownSet([...k.letters], [...k.signs], k.nameKnown));
      for (const x of g) if (x.status !== 'full') p.push(`${w.id}: ${x.title} not decodable yet (${x.missing.join(',')})`);
    }
    if (w.warmUp.steps.reduce((a, s) => a + s.min, 0) !== w.warmUp.minutes) p.push(`${w.id}: warm-up minutes do not add up`);
  });
  if (d.track.teacherPlan.reduce((a, s) => a + s.min, 0) !== d.track.sessionMinutes) p.push('teacher plan minutes do not add up');
  return p;
}
