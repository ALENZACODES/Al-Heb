#!/usr/bin/env node
// Lesson word -> vocab id map, by EXACT pointed-Hebrew match (NFC) against data/vocab/words.json.
// No fuzzy matching: a lesson word is mapped only when exactly one vocab entry has the same pointed form.
// Lesson words that match nothing stay unmapped; words whose pointed form matches several vocab entries
// are left out too (listed under "ambiguous") because the Hebrew alone does not decide which one is meant.
// Output: data/curriculum/word-vocab-map.json  { schema, map: { "<lessonId>:<n>": "<vocabId>" }, counts, unmatched, ambiguous }
// The file has no timestamp, so re-running on the same inputs produces an identical file.
// Usage: node tools/curriculum/word_ids.mjs [--check]   (--check: exit 1 if the committed file differs from a fresh build)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const OUT = "data/curriculum/word-vocab-map.json";
const nfc = (s) => String(s).normalize("NFC");

/** Pure builder (also used by tests). lessons: lessons.json "lessons" array; words: words.json "words" array. */
export function buildWordVocabMap(lessons, words) {
  const byHe = new Map();
  for (const w of words) { const k = nfc(w.he); if (!byHe.has(k)) byHe.set(k, []); byHe.get(k).push(w.id); }
  const map = {}, unmatched = [], ambiguous = [];
  let total = 0;
  for (const L of lessons) {
    (L.words || []).forEach((w, i) => {
      total++;
      const key = `${L.id}:${i + 1}`, ids = byHe.get(nfc(w.he));
      if (!ids) unmatched.push(key);
      else if (ids.length > 1) ambiguous.push({ key, ids: [...ids].sort() });
      else map[key] = ids[0];
    });
  }
  return { schema: "alef.word-vocab-map/1", rule: "exact pointed-Hebrew (NFC) match, unique vocab entry only; no fuzzy matching",
    counts: { lessonWords: total, mapped: Object.keys(map).length, unmatched: unmatched.length, ambiguous: ambiguous.length }, map, unmatched, ambiguous };
}

export function buildFromRepo() {
  const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
  return buildWordVocabMap(rd("data/curriculum/lessons.json").lessons, rd("data/vocab/words.json").words);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = buildFromRepo();
  const text = JSON.stringify(out, null, 2) + "\n";
  const file = path.join(ROOT, OUT);
  if (process.argv.includes("--check")) {
    const cur = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
    if (cur !== text) { console.error(`${OUT} is stale; run node tools/curriculum/word_ids.mjs`); process.exit(1); }
    console.log(`${OUT} is current`);
  } else {
    fs.writeFileSync(file, text);
    console.log(`wrote ${OUT}`);
  }
  const c = out.counts;
  console.log(`lesson words ${c.lessonWords}: mapped ${c.mapped}, unmatched ${c.unmatched}, ambiguous ${c.ambiguous} (left unmapped)`);
}
