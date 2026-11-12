/**
 * C5 checkpoint tests (pure). Every 10 lessons of a path, in course order, is a block (a tail under 5 lessons joins the block before) with a checkpoint: one question from each
 * lesson of the block (the lesson's own first quick-check question), the same pass rule as a lesson (src/curriculum/passmark.js).
 * A pass raises the learner's checkpoint level on that path, opens the next block's lessons early (unlock.js: opened, NOT done),
 * and, on the reading path, can move the starting lesson forward (placement.v1, only when the learner chooses it). Nothing here
 * marks a lesson as done.
 */
import { buildChoiceQuestions } from '../curriculum/exercises.session.js';
import { passMark, passPercent, passed, withCheck } from '../curriculum/passmark.js';

export const BLOCK = 10;
export const STORE_KEY = 'checkpoints.v1';
const A_ID = /^I-\d{2}$/;

/** Blocks per track: { id: 'read-1', track, n, lessons: [ids], first, last }. */
export function blocks(lessons) {
  const out = [];
  for (const track of [...new Set(lessons.map((l) => l.track))]) {
    const ids = lessons.filter((l) => l.track === track).map((l) => l.id);
    // a tail shorter than half a block joins the block before it, so no checkpoint has only one or two questions
    const parts = [];
    for (let i = 0; i < ids.length; i += BLOCK) parts.push(ids.slice(i, i + BLOCK));
    if (parts.length > 1 && parts.at(-1).length < BLOCK / 2) parts.splice(-2, 2, [...parts.at(-2), ...parts.at(-1)]);
    parts.forEach((part, i) => out.push({ id: `${track}-${i + 1}`, track, n: i + 1, of: parts.length, lessons: part, first: part[0], last: part.at(-1) }));
  }
  return out;
}

/** One question per lesson of the block (lessons with no question are skipped). */
export function checkpointQuestions(block, lessons, content, { tradition = 'sephardi' } = {}) {
  const wordPool = lessons.filter((l) => !A_ID.test(l.id)).flatMap((l) => l.words || []);
  const out = [];
  for (const id of block.lessons) {
    const l = lessons.find((x) => x.id === id); if (!l) continue;
    const qs = buildChoiceQuestions(l, { ...content, wordPool }, { seed: 7 + lessons.indexOf(l), tradition });
    if (qs[0]) out.push({ ...qs[0], from: l.id });
  }
  return out;
}

/** Where the learner stands on each path: level = the highest block passed (0 = none); done = blocks whose lessons are all done. */
export function standing(allBlocks, saved = {}, completed = {}) {
  const tracks = {};
  for (const b of allBlocks) {
    const t = (tracks[b.track] ||= { track: b.track, level: 0, of: b.of, blocks: [] });
    const rec = saved?.[b.id] || null, lessonsDone = b.lessons.filter((id) => completed?.[id]).length;
    const row = { ...b, passed: !!rec?.pass, tries: rec?.tries?.length || 0, lastTry: rec?.tries?.at(-1) || null, lessonsDone };
    if (row.passed) t.level = Math.max(t.level, b.n);
    t.blocks.push(row);
  }
  return tracks;
}

/** Grade a finished checkpoint: { right, of, need, pct, passed }. */
export function grade(questions, results) {
  const of = questions.length, right = questions.filter((q) => results?.[q.id] === true).length;
  return { right, of, need: passMark(of), pct: passPercent(of), passed: passed(right, of) };
}
/** The store value after a try (same shape as lesson.checks.v1: earliest pass, newest 10 tries). */
export const withTry = (saved, blockId, g, at, ms) => withCheck(saved, blockId, g.right, g.of, at, ms);

/** The block after `b` on the same path, or null. */
export const nextBlock = (allBlocks, b) => allBlocks.find((x) => x.track === b.track && x.n === b.n + 1) || null;

/**
 * Should a pass offer to move the starting lesson? Only on the reading path, only forward: when the next block's first lesson is
 * later in course order than the current applied start (placement.v1 result.start), or there is no applied start.
 */
export function replaceOffer(allBlocks, b, placement, lessons) {
  if (b.track !== 'read') return null;
  const nb = nextBlock(allBlocks, b); if (!nb) return null;
  const order = lessons.filter((l) => l.track === 'read').map((l) => l.id);
  const cur = placement?.result?.applied === true ? placement.result.start : null;
  if (cur && order.indexOf(cur) >= order.indexOf(nb.first)) return null;
  return { start: nb.first, from: cur };
}
/** The placement.v1 record a chosen re-placement writes (the shape src/placement writes; placedOut reads result.applied/start). */
export const replacementRecord = (b, start, at) => ({ v: 1, draft: true, at, source: 'checkpoint', checkpoint: b.id, answers: [], result: { lesson: start, start, applied: true, reason: `checkpoint ${b.id} passed`, draft: true } });
