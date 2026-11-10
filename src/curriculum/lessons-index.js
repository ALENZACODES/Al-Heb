/**
 * Slim lesson list for the #/learn map (first paint). Full records stay in lessons.js
 * and are fetched only when a lesson, review, or completion needs them.
 */
import { loadJSON } from "./data.js";
const [data, beltsFile] = await Promise.all([
  loadJSON("data/curriculum/lessons-index.json"),
  loadJSON("data/curriculum/belts.json"),
]);
/** @type {Array<{id:string, track:string, level?:string, title:string, estMinutes?:number, prerequisites:string[], onramp?:any, teaser?:string}>} */
export const lessonSummaries = data.lessons;
export const belts = beltsFile;
export const summaryById = Object.fromEntries(lessonSummaries.map((l) => [l.id, l]));
