// Course map (pure, no DOM): the syllabus and the time budget are both derived from data/curriculum/lessons.json, so they cannot drift
// from the lessons. Nothing here is written by hand except the labels. Lesson goals are shown VERBATIM from the data (they are the
// authors' draft goals; no Hebrew teacher has reviewed them). `estMinutes` is the authors' estimate and has never been measured on a learner.

import { resolveRanks } from '../curriculum/ranks.js';

export const TRACK_LABEL = { read: 'Reading and prayer track', israel: 'Israel and everyday Hebrew track' };
const LABEL = { A1: 'Stage 1', A2: 'Stage 2', B1: 'Stage 3', intermediate: 'Intermediate' };
export const levelName = (l) => LABEL[l] || (l ? `${String(l)[0].toUpperCase()}${String(l).slice(1)} belt` : 'Other');
const isI = (id) => /^I-\d+$/.test(String(id));

/** The planning range of hours (low, high) is a PARAMETER: the repo does not source it. */
export const DEFAULT_RANGE = Object.freeze({ low: 400, high: 600 });

const minutes = (l) => (Number.isFinite(l.estMinutes) && l.estMinutes > 0 ? l.estMinutes : 0);

const row = (l) => ({ id: l.id, title: l.title, minutes: minutes(l), goals: Array.isArray(l.goals) ? l.goals.slice() : [], draft: l.status === 'draft' || l.needsNativeReview === true || l.proofread === false });
const group = (level, label, ls, extra = {}) => ({ level, label, ...extra, minutes: ls.reduce((a, l) => a + minutes(l), 0), lessons: ls.map(row) });

/** How the 50 I- (Intermediate) lessons are split between the two tracks, from the data. */
export function intermediateSplit(lessons) {
  const all = lessons.filter((l) => isI(l.id));
  return { total: all.length, read: all.filter((l) => l.track === 'read').length, israel: all.filter((l) => l.track === 'israel').length };
}

/**
 * Lessons grouped track -> level, in COURSE ORDER (the order of data/curriculum/lessons.json within a track).
 * With `beltsFile` (data/curriculum/belts.json), the ranked track is grouped by Krav Maga style rank (White belt · P0 ..
 * Black belt · E5), each a contiguous run of lessons; without it, by level in first-seen order. Other tracks: by level.
 * Each track carries a `note` that says what it holds, including its share of the I- lessons.
 */
export function syllabus(lessons, beltsFile = null) {
  const tracks = new Map();
  for (const l of lessons) (tracks.get(l.track) || tracks.set(l.track, []).get(l.track)).push(l);
  const ranks = beltsFile && Array.isArray(beltsFile.ranks) ? resolveRanks(beltsFile, lessons) : [];
  const split = intermediateSplit(lessons);
  return [...tracks].map(([track, ls]) => {
    const levels = [];
    const ranked = ranks.length && ranks[0].track === track;
    if (ranked) {
      const byId = new Map(ls.map((l) => [l.id, l])), placed = new Set();
      for (const r of ranks) {
        const rl = r.lessons.map((id) => byId.get(id)).filter(Boolean); rl.forEach((l) => placed.add(l.id));
        levels.push(group(r.belt, r.label, rl, { rank: r.id, range: r.range, gate: r.gate, intermediate: rl.length > 0 && rl.every((l) => isI(l.id)) }));
      }
      const rest = ls.filter((l) => !placed.has(l.id));
      if (rest.length) levels.push(group('unranked', 'Not yet in a rank', rest));
    } else {
      const by = new Map();
      for (const l of ls) (by.get(l.level) || by.set(l.level, []).get(l.level)).push(l);
      for (const [level, g] of by) {
        const ids = g.filter((l) => isI(l.id)).length;
        levels.push(group(level, levelName(level), g, ids ? { intermediateCount: ids } : {}));
      }
    }
    const nI = ls.filter((l) => isI(l.id)).length;
    const other = track === 'read' ? 'Israel' : 'Reading';
    const shareNote = nI ? ` It holds ${nI} of the ${split.total} I- (Intermediate) lessons; the other ${split.total - nI} are on the ${other} track.` : '';
    const note = (ranked
      ? `${ls.length} lessons in course order, with Krav Maga style belts and rank patches (P Practitioner, G Graduate, E Expert). Each rank is the next run of lessons; finish them to earn it.`
      : `${ls.length} lessons in course order, in stages. This track has no belts.`) + shareNote;
    return { track, label: TRACK_LABEL[track] || track, note, levels };
  });
}

/** Time totals; `completed` is the progress store's { [lessonId]: ms }. Unknown ids in `completed` are ignored. */
export function timeTotals(lessons, completed = {}) {
  const done = new Set(Object.keys(completed || {}));
  let total = 0, doneMin = 0, doneN = 0;
  for (const l of lessons) { total += minutes(l); if (done.has(l.id)) { doneMin += minutes(l); doneN++; } }
  return { lessons: lessons.length, doneLessons: doneN, totalMinutes: total, doneMinutes: doneMin, remainingMinutes: total - doneMin };
}
const hours = (m) => Math.round((m / 60) * 10) / 10;
/**
 * Compare lesson time with a planning range. Says how much of the low end the written lessons cover; it does not say a learner will
 * reach a level in that time. `hoursPerWeek` (optional) turns the remaining range into weeks.
 */
export function budget(totals, range = DEFAULT_RANGE, hoursPerWeek = 0) {
  if (!(range.low > 0 && range.high >= range.low)) throw new RangeError('range must satisfy 0 < low <= high');
  const lessonHours = hours(totals.totalMinutes), doneHours = hours(totals.doneMinutes);
  const out = {
    lessonHours, doneHours, range,
    lessonShareOfLow: Math.round((lessonHours / range.low) * 100), lessonShareOfHigh: Math.round((lessonHours / range.high) * 100),
    doneShareOfLow: Math.round((doneHours / range.low) * 100), doneShareOfHigh: Math.round((doneHours / range.high) * 100),
    gapHoursLow: Math.max(0, Math.round((range.low - lessonHours) * 10) / 10), gapHoursHigh: Math.max(0, Math.round((range.high - lessonHours) * 10) / 10),
  };
  if (hoursPerWeek > 0) { out.weeksLow = Math.ceil(Math.max(0, range.low - doneHours) / hoursPerWeek); out.weeksHigh = Math.ceil(Math.max(0, range.high - doneHours) / hoursPerWeek); }
  return out;
}

/** Markdown of the whole syllabus for docs/curriculum/SYLLABUS.md (deterministic, so tools/syllabus/build.mjs --check can compare). */
export function toMarkdown(lessons, beltsFile = null) {
  const t = timeTotals(lessons), sp = intermediateSplit(lessons), out = [
    '# Aleph syllabus (generated)', '',
    'Generated by `node tools/syllabus/build.mjs` from `data/curriculum/lessons.json` and `data/curriculum/belts.json`. Do not edit by hand; change the data and re-run.',
    'Goals are copied word for word from the data. They are draft goals: no Hebrew teacher has reviewed them. Minutes are the authors\' estimates, never measured on a learner.', '',
    `${t.lessons} lessons, ${t.totalMinutes} estimated minutes (${hours(t.totalMinutes)} hours) of lesson time in total.`, '',
    `Belts: Krav Maga style (IKMF-style layout). White, Yellow, Orange, Green, Blue, Brown and Black belts, with rank patches P (Practitioner), G (Graduate) and E (Expert); the stripes on a patch give the rank number. They run on the Reading and prayer track only, in course order, and a rank is earned only by finishing its lessons. They are Aleph's own ranks, not a Krav Maga grade.`, '',
    `The ${sp.total} I- (Intermediate) lessons are split: ${sp.read} on the Reading and prayer track (Black belt, E ranks) and ${sp.israel} on the Israel track (Stage 3).`, ''];
  for (const tr of syllabus(lessons, beltsFile)) {
    out.push(`## ${tr.label}`, '', tr.note, '');
    for (const lv of tr.levels) {
      const range = lv.range ? `: ${lv.range}` : '', inter = lv.intermediate ? ', Intermediate reading' : lv.intermediateCount ? `, includes ${lv.intermediateCount} I- lessons` : '';
      out.push(`### ${lv.label} (${lv.lessons.length} lesson${lv.lessons.length === 1 ? '' : 's'}${range}${inter}, ${lv.minutes} min)`, '');
      if (lv.gate) out.push(`Goal of the rank: ${lv.gate}`, '');
      for (const l of lv.lessons) { out.push(`- **${l.id}** ${l.title} (${l.minutes} min)`); for (const g of l.goals) out.push(`  - ${g}`); }
      out.push('');
    }
  }
  return out.join('\n');
}
