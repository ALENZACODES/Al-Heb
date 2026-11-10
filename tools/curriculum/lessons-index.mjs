// Writes data/curriculum/lessons.index.json: the few fields the first-run plan needs (id, track, level, title, minutes, prerequisites),
// so the very first screen does not download the full lesson file (about 460 KB) before a learner has answered one question.
// Run after changing data/curriculum/lessons.json: `node tools/curriculum/lessons-index.mjs`. tests/firstminute.test.js fails if it is stale.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export const INDEX_FIELDS = Object.freeze(['id', 'track', 'level', 'title', 'estMinutes', 'prerequisites']);
export function lessonsIndex(full) {
  return { version: full.version, note: 'Generated from data/curriculum/lessons.json by tools/curriculum/lessons-index.mjs; do not edit by hand.',
    lessons: full.lessons.map((l) => Object.fromEntries(INDEX_FIELDS.filter((k) => k in l).map((k) => [k, l[k]]))) };
}
export const serialize = (o) => JSON.stringify(o) + '\n';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = new URL('../../', import.meta.url);
  const full = JSON.parse(readFileSync(new URL('data/curriculum/lessons.json', root), 'utf8'));
  const out = serialize(lessonsIndex(full));
  writeFileSync(new URL('data/curriculum/lessons.index.json', root), out);
  console.log(`data/curriculum/lessons.index.json: ${full.lessons.length} lessons, ${(out.length / 1024).toFixed(1)} KB`);
}
