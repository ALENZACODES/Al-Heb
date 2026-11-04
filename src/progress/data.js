// @ts-check
// Loads every data file Progress needs (browser fetch or Node fs, via the curriculum loader). Cached by loadJSON.
import { loadJSON } from '../curriculum/data.js';
import { loadCorpus } from '../corpus/corpus.js';

/** Belts whose placeholder "unmeasured" gates are replaced by timed-read gates when data/timedread/gates.json has them. */
export const TIMED_READ_BELTS = ['grey', 'black'];

/**
 * Belt gates with the timed-read gates merged in: for each belt listed in the timed-read file, its gates REPLACE the
 * placeholder gates of belt-gates.json (which only say "unmeasured"). Never mutates either input (loadJSON caches them).
 * @param {any} beltGates data/progress/belt-gates.json @param {any} timed data/timedread/gates.json (or null)
 */
export function mergeTimedReadGates(beltGates, timed) {
  const gates = { ...beltGates.gates };
  const src = timed && timed.gates && typeof timed.gates === 'object' ? timed.gates : {};
  for (const belt of TIMED_READ_BELTS) {
    const list = Array.isArray(src[belt]) ? src[belt].filter((g) => g && g.kind === 'timedRead' && Number.isFinite(g.minWpm)) : [];
    if (list.length) gates[belt] = list;
  }
  return { ...beltGates, gates, timedReadSource: timed ? timed.schema ?? 'data/timedread/gates.json' : null };
}

export async function loadProgressData() {
  const [lessonsFile, belts, milestones, beltGates, timedGates, orders, corpus] = await Promise.all([
    loadJSON('data/curriculum/lessons.json'), loadJSON('data/curriculum/belts.json'),
    loadJSON('data/progress/milestones.json'), loadJSON('data/progress/belt-gates.json'),
    loadJSON('data/timedread/gates.json').catch(() => null), // missing file: grey and black stay "unmeasured"
    loadJSON('data/service/orders.json').catch(() => null), // missing file: no siddur coverage line
    loadCorpus(),
  ]);
  return { lessons: lessonsFile.lessons, belts, milestones, gates: mergeTimedReadGates(beltGates, timedGates), orders, registry: corpus.allTexts(), phrases: corpus.allPhrases() };
}
