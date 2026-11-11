// Proposed beginner checklist, derived from the shipped lesson graph of the first two Krav Maga style ranks
// (White belt · P0 and Yellow belt · P1, lessons r01-r09 in data/curriculum/belts.json).
// Status is awaiting review. Nothing in this file is a confirmed passing standard,
// and nothing here reads a learner's saved progress.
import { loadJSON } from '../curriculum/data.js';
import { resolveRanks } from '../curriculum/ranks.js';

export const RUBRIC_ID = 'beginner-white-v1';
/** Shipped review state. There is no setter. A later review would change this constant in source. */
export const REVIEW_STATUS = 'awaiting-review';
export const CRITERIA_REVIEWED = false;

const SOURCES = Object.freeze({
  belts: 'data/curriculum/belts.json',
  lessons: 'data/curriculum/lessons.json',
  rankIds: ['P0', 'P1'],
});
/** The ranks the beginner checklist covers, in order (White belt · P0, Yellow belt · P1). */
export const BEGINNER_RANKS = SOURCES.rankIds;

/** "r01-r09" -> ["r01", ... "r09"]. Empty when the belt string is not a same-prefix range. */
export function lessonRange(spec) {
  const m = /^([a-z]+)(\d+)-([a-z]+)(\d+)$/.exec(String(spec || ''));
  if (!m || m[1] !== m[3]) return [];
  const width = m[2].length;
  const out = [];
  for (let n = Number(m[2]); n <= Number(m[4]); n++) out.push(m[1] + String(n).padStart(width, '0'));
  return out;
}

function item(fields) {
  return {
    status: 'proposed',
    evidenceExpected: 'assessment.item with this itemId, trust "objective", source "assessment-engine", correct true',
    ...fields,
  };
}

/**
 * Build the proposed checklist from lesson and belt objects (the JSON files, not a learner record).
 * @param {{lessons?: any[]}} lessonsFile
 * @param {{belts?: any[], ranks?: any[]}} beltsFile
 */
export function deriveBeginnerRubric(lessonsFile, beltsFile) {
  const problems = [];
  const lessonList = Array.isArray(lessonsFile?.lessons) ? lessonsFile.lessons : [];
  let ranks = [];
  try { ranks = resolveRanks(beltsFile, lessonList).filter((r) => BEGINNER_RANKS.includes(r.id)); } catch { problems.push('rank-range-unreadable'); }
  const white = ranks.length === BEGINNER_RANKS.length ? ranks[0] : null;
  const ids = white ? ranks.flatMap((r) => r.lessons) : [];
  if (!white) problems.push('beginner-ranks-missing');
  else if (!ids.length) problems.push('beginner-ranks-range-unreadable');
  const byId = new Map((Array.isArray(lessonsFile?.lessons) ? lessonsFile.lessons : []).map((l) => [l && l.id, l]));
  const lessons = [];
  for (const id of ids) {
    const lesson = byId.get(id);
    if (!lesson) { problems.push('missing-lesson:' + id); continue; }
    lessons.push(lesson);
  }

  /** @type {any[]} */
  const items = [];
  const letterSeen = new Map();
  const vowelSeen = new Map();
  const wordSeen = new Map();
  const lineSeen = new Map();

  for (const lesson of lessons) {
    for (const id of lesson.letters || []) {
      if (letterSeen.has(id)) letterSeen.get(id).lessonIds.push(lesson.id);
      else {
        const row = item({
          id: 'letter:' + id,
          kind: 'letter',
          lessonIds: [lesson.id],
          label: 'Letter ' + id,
          requirement: `A checked question on the name or sound of ${id}, scored by the assessment. Marking lesson ${lesson.id} complete does not count, including when answers were wrong.`,
        });
        letterSeen.set(id, row);
        items.push(row);
      }
    }
    for (const id of lesson.vowels || []) {
      if (vowelSeen.has(id)) vowelSeen.get(id).lessonIds.push(lesson.id);
      else {
        const row = item({
          id: 'vowel:' + id,
          kind: 'vowel',
          lessonIds: [lesson.id],
          label: 'Vowel sign ' + id,
          requirement: `A checked question on the sound of the vowel sign ${id}, scored by the assessment. Saying you heard it, or tracing a letter, does not count.`,
        });
        vowelSeen.set(id, row);
        items.push(row);
      }
    }
    (lesson.words || []).forEach((word, index) => {
      const he = word && word.he;
      if (!he) return;
      if (wordSeen.has(he)) wordSeen.get(he).lessonIds.push(lesson.id);
      else {
        const row = item({
          id: `word:${lesson.id}:${index + 1}`,
          kind: 'word',
          lessonIds: [lesson.id],
          label: 'Word',
          he,
          gloss: word.en || '',
          requirement: `A checked reading or matching question for this word, scored by the assessment. A lesson-complete flag does not count.`,
        });
        wordSeen.set(he, row);
        items.push(row);
      }
    });
    for (const id of lesson.prayerLines || []) {
      if (lineSeen.has(id)) lineSeen.get(id).lessonIds.push(lesson.id);
      else {
        const row = item({
          id: 'line:' + id,
          kind: 'line',
          lessonIds: [lesson.id],
          label: 'Line ' + id,
          requirement: `A checked recognition question for line ${id}. The Yellow belt · P1 lesson (r05) asks the learner to listen and spot letters already met. Tapping that you heard it does not count. Full decoding of these lines is a later lesson, so this item is recognition only, and it is still only proposed.`,
        });
        lineSeen.set(id, row);
        items.push(row);
      }
    }
  }

  return {
    id: RUBRIC_ID,
    ok: problems.length === 0 && items.length > 0,
    reviewStatus: REVIEW_STATUS,
    criteriaReviewed: CRITERIA_REVIEWED,
    confirmed: false,
    issuable: false,
    sources: SOURCES,
    belt: white ? { id: white.id, ranks: ranks.map((r) => r.id), name: ranks.map((r) => r.label).join(' and '), gate: white.gate, lessons: `${ids[0]}-${ids[ids.length - 1]}` } : null,
    lessonIds: lessons.map((l) => l.id),
    problems,
    items,
    graphNote: 'The White belt · P0 sentence in data/curriculum/belts.json is a short summary. This checklist follows every letter, vowel, word and prayer-line id on the shipped lessons of White belt · P0 and Yellow belt · P1 (r01-r09). It is a proposal awaiting review, not a confirmed score.',
  };
}

let cached = null;
/** Load the two shipped JSON files and derive the proposal. Cached for the page session. */
export function loadBeginnerRubric() {
  if (!cached) {
    cached = Promise.all([
      loadJSON('data/curriculum/lessons.json'),
      loadJSON('data/curriculum/belts.json'),
    ]).then(([lessons, belts]) => deriveBeginnerRubric(lessons, belts));
  }
  return cached;
}
