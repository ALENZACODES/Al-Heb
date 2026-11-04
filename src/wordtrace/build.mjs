import { pathToFileURL } from "node:url";
// Rebuild data/wordtrace/words.json from course data:  node src/wordtrace/build.mjs
// Inputs: data/curriculum/lessons.json, data/vocab/words.json, data/pronunciation/prayerwords.json, data/corpus/registry.json (siddur entries).
import { readFileSync, writeFileSync } from 'node:fs';
import { buildBank } from './bank.js';

const rd = (p) => JSON.parse(readFileSync(new URL('../../' + p, import.meta.url), 'utf8'));
export function loadSources() {
  return {
    lessons: rd('data/curriculum/lessons.json').lessons,
    vocab: rd('data/vocab/words.json').words,
    prayerWords: rd('data/pronunciation/prayerwords.json').words,
    siddurText: rd('data/corpus/registry.json').entries.filter(e => e.category === 'siddur').map(e => e.he).join(' ')
  };
}
export function build() { return buildBank(loadSources()); }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const bank = build();
  writeFileSync(new URL('../../data/wordtrace/words.json', import.meta.url), JSON.stringify(bank, null, 1) + '\n');
  const c = {}; for (const w of bank.words) c[w.level] = (c[w.level] || 0) + 1;
  console.log('wrote data/wordtrace/words.json', c);
}
