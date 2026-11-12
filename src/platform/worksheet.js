// J4 Printable worksheets from the learner's lessons. Pure: builds the sheet's content from the lesson data (letters, words and
// their English meanings as data/curriculum/lessons.json holds them); nothing is invented. The divine name is shown as ה׳.
import { showName } from '../games/tg-core.js';

/** The learner's current lesson: the first lesson in course order that is not completed (the last one when all are). */
export function currentLesson(lessons, completed = {}) {
  return lessons.find((l) => !completed[l.id]) || lessons[lessons.length - 1] || null;
}
/** Deterministic shuffle (so a reprint matches its answer key). */
export function seededOrder(n, seed) {
  let x = 0; for (const c of String(seed)) x = (x * 31 + c.charCodeAt(0)) >>> 0;
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { x = (x * 1103515245 + 12345) >>> 0; const j = x % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx;
}
const LETTERS = 'ABCDEFGHIJKLMNOP';

/**
 * @param {{id:string,title:string,letters?:string[],words?:{he:string,en:string}[]}} lesson @param {{id:string,he:string,name:string}[]} letterData
 * @returns {{title:string, id:string, letters:{he:string,name:string}[], copy:{he:string,en:string}[], match:{words:{n:number,he:string}[], meanings:{key:string,en:string}[], answers:string[]}}}
 */
export function buildSheet(lesson, letterData = []) {
  const byId = Object.fromEntries(letterData.map((l) => [l.id, l]));
  const letters = (lesson.letters || []).map((id) => byId[id]).filter(Boolean).map((l) => ({ he: l.he, name: l.name }));
  const words = (lesson.words || []).filter((w) => w && w.he && w.en).slice(0, 12).map((w) => ({ he: showName(w.he), en: w.en }));
  const order = seededOrder(words.length, lesson.id);
  const meanings = order.map((wi, k) => ({ key: LETTERS[k], en: words[wi].en, wi }));
  const answers = words.map((_, wi) => `${wi + 1} ${meanings.find((m) => m.wi === wi).key}`);
  return { title: lesson.title, id: lesson.id, letters, copy: words, match: { words: words.map((w, i) => ({ n: i + 1, he: w.he })), meanings: meanings.map(({ key, en }) => ({ key, en })), answers } };
}
