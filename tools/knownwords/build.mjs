// Builds data/knownwords/index.json from data/vocab/words.json so the known-word checker does not load the whole 7 MB vocabulary file.
// Deterministic; no Hebrew is written by hand. The index holds exactly the strings knownSet() would add (unpointed spelling and stored forms of
// every visible row with a level A1 to B2), grouped by the lesson that unlocks the row ("" = no lesson), with the level and the position (seq)
// at which knownSet() would first add each string, so the set (and its iteration order, which `similar` depends on) is identical.
// Usage: node tools/knownwords/build.mjs [--check]   (--check exits 1 if the file on disk is stale)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LEVELS, strip } from '../../src/knownwords/validate.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const FILE = 'data/knownwords/index.json';

/** @returns {{schema:number, source:string, note:string, levels:string[], count:number, lessons:Record<string, [number, number, string][]>}} entries are [seq, levelIndex, spelling] */
export function buildIndex(rows) {
  const lessons = {}; let seq = 0, count = 0;
  for (const r of rows) {
    if (r.flags && !Array.isArray(r.flags) && r.flags.hidden === true) continue;
    const li = LEVELS.indexOf(r.level); if (li < 0) continue;
    const key = r.unlockLesson || '', m = (lessons[key] ??= new Map());
    const add = (s) => { s = strip(s); if (!s) return; const k = li + ':' + s; if (!m.has(k)) { m.set(k, [seq, li, s]); count++; } seq++; };
    add(r.heUnpointed || r.he);
    for (const v of Object.values(r.forms || {})) if (typeof v === 'string') add(v);
  }
  const out = {};
  for (const k of Object.keys(lessons).sort()) out[k] = [...lessons[k].values()];
  return { schema: 1, source: 'data/vocab/words.json', note: 'Unpointed spellings (and stored forms) of the vocabulary list, by unlock lesson and level. Derived; unreviewed. Rebuild with node tools/knownwords/build.mjs.', levels: LEVELS, count, lessons: out };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const text = JSON.stringify(buildIndex(JSON.parse(readFileSync(root + 'data/vocab/words.json', 'utf8')).words)) + '\n';
  if (process.argv.includes('--check')) {
    let cur = ''; try { cur = readFileSync(root + FILE, 'utf8'); } catch {}
    if (cur !== text) { console.error(FILE + ' is stale: run node tools/knownwords/build.mjs'); process.exit(1); }
    console.log(FILE + ' is current');
  } else { writeFileSync(root + FILE, text); console.log('wrote', FILE, text.length, 'bytes'); }
}
