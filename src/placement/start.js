// The part of the placement model that Home needs on first load (kept apart from model.js so Home does not fetch the item builder).
/**
 * The lesson a learner can actually open. `wanted` is the lesson the check recommended; lessons unlock only when every prerequisite
 * is completed and placement never completes anything. So: `wanted` if it is open (or already done: then the next open lesson),
 * otherwise the first open read-track lesson. Returns { id, wanted, locked } where locked = the recommended lesson is not open yet.
 * @param {any[]} lessons @param {Iterable<string>} completedIds @param {string|null} wanted
 */
export function openStart(lessons, completedIds, wanted) {
  const done = new Set(completedIds || []);
  const read = lessons.filter((l) => l.track === 'read');
  const isOpen = (l) => !done.has(l.id) && (l.prerequisites || []).every((p) => done.has(p));
  const w = read.find((l) => l.id === wanted);
  if (w && isOpen(w)) return { id: w.id, wanted: w.id, locked: false };
  const first = read.find(isOpen);
  const id = first ? first.id : (w ? w.id : null);
  return { id, wanted: w ? w.id : null, locked: !!w && !!first && w.id !== first.id && !(done.has(w.id)) };
}

/**
 * Lane 6 (points plan #17): a placement result the learner took as their start ("applied") sticks. The read-track lessons before
 * the placed lesson are skipped over when the next lesson is picked (Home's Today card and the week plan). They are NOT completed:
 * no lesson is marked done, no award or count changes, and every one of them stays open. Returns [] when nothing was applied.
 * @param {any[]} lessons @param {any} placement the placement.v1 record
 */
export function placedOut(lessons, placement) {
  const r = placement?.result;
  if (!r || r.applied !== true || typeof r.start !== 'string') return [];
  const read = (lessons || []).filter((l) => l.track === 'read');
  const at = read.findIndex((l) => l.id === r.start);
  return at > 0 ? read.slice(0, at).map((l) => l.id) : [];
}
