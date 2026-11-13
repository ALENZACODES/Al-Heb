// @ts-check
// Talk: sentences of the lessons with an English line each, ready before the learner asks (data/talk/tm/, built ahead of time by
// alef-tools packages/translate/scripts/build-tm.py). Nothing is fetched until a Hebrew line is looked up: then a small index,
// and one unit file only when the index says the line is in it. All of it comes from the site itself.
import { translateUrl } from './tools.js';
const { createMemory } = await import(translateUrl('tm.js'));

export const TM_BASE = new URL('../../../data/talk/tm/', import.meta.url).href;
/** @type {any} */
let shared = null;
/** The one memory of this page. */
export function sharedMemory() { if (!shared) shared = createMemory({ base: TM_BASE }); return shared; }
export { createMemory };
