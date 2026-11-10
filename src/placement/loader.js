// DRAFT. Loads the existing data files the placement check draws from (same Node/browser JSON pattern as src/sprint/loader.js).
import { loadJson } from '../sprint/loader.js';
export async function loadPlacementData() {
  const [config, letters, niqqud, lessons, words, registry] = await Promise.all([
    loadJson('data/placement/config.json'), loadJson('data/letters/letters.json'), loadJson('data/pronunciation/niqqud.json'),
    loadJson('data/curriculum/lessons.json'), loadJson('data/vocab/words.json'), loadJson('data/corpus/registry.json'),
  ]);
  return { config, data: { letters, niqqud: niqqud.records, lessons: lessons.lessons, words: words.words, registry: registry.entries } };
}
