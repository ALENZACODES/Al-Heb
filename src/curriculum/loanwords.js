/** "Words you can already read": loanword on-ramp groups (data/curriculum/loanwords.json). Draft, not proofread. */
import { loadJSON } from "./data.js";
import { lessons } from "./lessons.js";
import { lettersOf, marksOf } from "./hebrew.js";

const data = await loadJSON("data/curriculum/loanwords.json");
export const loanwordMeta = { status: data.status, proofread: data.proofread, needsNativeReview: data.needsNativeReview, note: data.note };
export const loanwordGroups = data.groups;

/** Letters and marks taught up to and including `lessonId` (read track, array order). */
export function taughtThrough(lessonId) {
  const L = new Set(), V = new Set();
  for (const l of lessons.filter((x) => x.track === "read")) {
    l.letters.forEach((x) => L.add(x)); l.vowels.forEach((x) => V.add(x));
    if (l.id === lessonId) break;
  }
  return { letters: L, vowels: V };
}
/** Is the group unlocked, given a Set/array of completed lesson ids? */
export const groupUnlocked = (g, completed) => new Set(completed).has(g.unlockAfter);
/** Words whose letters and marks are all taught by `lessonId`. */
export function decodableWords(words, lessonId) {
  const t = taughtThrough(lessonId);
  return words.filter((w) => lettersOf(w.he).every((x) => t.letters.has(x)) && marksOf(w.he).every((x) => t.vowels.has(x)));
}
