// @ts-check
// Loads every data file Progress needs (browser fetch or Node fs, via the curriculum loader). Cached by loadJSON.
import { loadJSON } from '../curriculum/data.js';
import { loadCorpus } from '../corpus/corpus.js';

export async function loadProgressData() {
  const [lessonsFile, belts, milestones, gates, corpus] = await Promise.all([
    loadJSON('data/curriculum/lessons.json'), loadJSON('data/curriculum/belts.json'),
    loadJSON('data/progress/milestones.json'), loadJSON('data/progress/belt-gates.json'), loadCorpus(),
  ]);
  return { lessons: lessonsFile.lessons, belts, milestones, gates, registry: corpus.allTexts(), phrases: corpus.allPhrases() };
}
