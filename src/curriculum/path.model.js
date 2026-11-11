/**
 * Curriculum path model (no DOM, no fetch): what is done, what comes next, stage by stage.
 * `path` is data/curriculum/path.json (built by tools/curriculum/build_path.mjs).
 * `lessonsDone` is a Set of lesson ids; `pagesDone` is a Set of "unitId|pageId" keys (the Practical progress keys).
 */
const SMALL = new Set(['a', 'an', 'and', 'the', 'of', 'in', 'on', 'to', 'at', 'for']);

/** "Shabbat and the year" -> "Shabbat and the Year" (headings are Title Case; small joining words stay lower inside). */
export function titleCase(s) {
  return String(s || '').split(' ').map((w, i) => (i > 0 && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
}

export const pageKey = (unitId, pageId) => `${unitId}|${pageId}`;

/** Lesson link: intermediate lessons open in their own player when the app has it. */
export function lessonHref(lesson, hasIntermediate = true) {
  const id = encodeURIComponent(lesson.id);
  return lesson.intermediate && hasIntermediate ? `#/intermediate/${id}` : `#/learn?lesson=${id}`;
}

export function stageProgress(stage, lessonsDone, pagesDone) {
  const lessons = [...stage.read, ...stage.speak];
  const pages = stage.units.flatMap((u) => u.pages.map((p) => pageKey(u.id, p.id)));
  const lessonsN = lessons.filter((l) => lessonsDone.has(l.id)).length;
  const pagesN = pages.filter((k) => pagesDone.has(k)).length;
  return { lessons: lessons.length, lessonsDone: lessonsN, pages: pages.length, pagesDone: pagesN,
    readDone: stage.read.filter((l) => lessonsDone.has(l.id)).length, speakDone: stage.speak.filter((l) => lessonsDone.has(l.id)).length,
    complete: lessonsN === lessons.length && pagesN === pages.length };
}

/**
 * The whole path: totals, the stage the learner is in (the first one with anything left), and the next thing to do in each
 * strand. Each "next" is the first item not done, in course order, so a learner who skipped ahead is led back to the gap.
 */
export function pathProgress(path, lessonsDone = new Set(), pagesDone = new Set()) {
  const stages = (path?.stages || []).map((s) => ({ stage: s, ...stageProgress(s, lessonsDone, pagesDone) }));
  const current = Math.max(0, stages.findIndex((s) => !s.complete));
  const firstOpen = (pick) => {
    for (const s of path?.stages || []) for (const l of pick(s)) if (!lessonsDone.has(l.id)) return { lesson: l, stage: s };
    return null;
  };
  let nextPage = null;
  outer: for (const s of path?.stages || []) for (const u of s.units) for (let i = 0; i < u.pages.length; i++) {
    if (!pagesDone.has(pageKey(u.id, u.pages[i].id))) { nextPage = { unit: u, page: u.pages[i], number: i + 1, stage: s }; break outer; }
  }
  const sum = (k) => stages.reduce((n, s) => n + s[k], 0);
  return { stages, current, allDone: stages.length > 0 && stages.every((s) => s.complete),
    nextRead: firstOpen((s) => s.read), nextSpeak: firstOpen((s) => s.speak), nextPage,
    lessons: sum('lessons'), lessonsDone: sum('lessonsDone'), pages: sum('pages'), pagesDone: sum('pagesDone') };
}
