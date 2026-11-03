/**
 * Lesson graph (Lane 1). Data lives in data/curriculum/lessons.json; this module re-exports it with helpers.
 * Uses JSON import attributes (`with { type: "json" }`): Node >= 22, Chromium >= 123, Safari >= 17.2, Firefox >= 138.
 * Older browsers would need a fetch-based loader (not built).
 */
import data from "../../data/curriculum/lessons.json" with { type: "json" };
import belts from "../../data/curriculum/belts.json" with { type: "json" };

/** @type {Array<{id:string, track:"read"|"israel", level:string, title:string, letters:string[], vowels:string[], words:{he:string,en:string,translit:string|null,note?:string}[], prayerLines:string[], goals:string[], estMinutes:number, prerequisites:string[]}>} */
export const lessons = data.lessons;
export { belts };
export const byId = Object.fromEntries(lessons.map((l) => [l.id, l]));
export const tracks = { read: lessons.filter((l) => l.track === "read"), israel: lessons.filter((l) => l.track === "israel") };

/** Every prayer-line id the curriculum references (lane 5 must define these in data/corpus/registry.json). */
export function prayerLineIds() {
  return [...new Set(lessons.flatMap((l) => l.prayerLines))].sort();
}

/** Lessons whose prerequisites are all in `completed` (Set or array of ids) and which are not completed themselves. */
export function available(completed, track) {
  const done = new Set(completed);
  return lessons.filter((l) => (!track || l.track === track) && !done.has(l.id) && l.prerequisites.every((p) => done.has(p)));
}

/** Topological order (stable, by array order among ready lessons). Throws on a cycle. */
export function topoOrder() {
  const done = new Set(), order = [];
  while (order.length < lessons.length) {
    const next = lessons.find((l) => !done.has(l.id) && l.prerequisites.every((p) => done.has(p)));
    if (!next) throw new Error("cycle or missing prerequisite in lesson graph");
    done.add(next.id); order.push(next.id);
  }
  return order;
}
