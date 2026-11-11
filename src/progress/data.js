// @ts-check
// Loads every data file Progress needs (browser fetch or Node fs, via the curriculum loader). Cached by loadJSON.
import { loadJSON } from '../curriculum/data.js';
import { loadCorpus } from '../corpus/corpus.js';

/** Ranks (Brown belt G5, Black belt E5) whose placeholder "unmeasured" skill checks are replaced by timed-read checks when data/timedread/gates.json has them. */
export const TIMED_READ_BELTS = ['G5', 'E5'];

/**
 * Rank skill checks with the timed-read checks merged in: for each rank listed in the timed-read file, its checks REPLACE the
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
    loadJSON('data/timedread/gates.json').catch(() => null), // missing file: G5 and E5 checks stay "unmeasured"
    loadJSON('data/service/orders.json').catch(() => null), // missing file: no siddur coverage line
    loadCorpus(),
  ]);
  const ladder = await loadJSON('data/firstday/ladder.json').catch(() => null); // missing file: no first-day ladder row
  const personal = await loadJSON('data/progress/personal-milestones.json').catch(() => null); // missing file: no Milestones list
  return { lessons: lessonsFile.lessons, belts, milestones, gates: mergeTimedReadGates(beltGates, timedGates), orders, ladder, personal, registry: corpus.allTexts(), phrases: corpus.allPhrases() };
}
