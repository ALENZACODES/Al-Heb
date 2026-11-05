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
