// Writes spoken.json: every Torah verse with the divine name replaced by its spoken form (src/shell/names.js),
// chanting marks kept (the grapheme joiner U+034F that only orders marks is removed first) so the stressed syllable of each word can be read from them.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = path.resolve(process.argv[2] || '.');
const { speechText } = await import(pathToFileURL(path.join(root, 'src/shell/names.js')));
const out = [];
for (const book of ['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy']) {
  const dir = path.join(root, 'data/corpus/torah', book);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const ch = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const v of ch.verses) out.push({ book, chapter: ch.chapter, verse: Number(v.n), he: v.he, heTrope: v.heTrope, spoken: speechText(v.heTrope.replace(/\u034f/g, '')) });
  }
}
fs.writeFileSync(new URL('spoken.json', import.meta.url), JSON.stringify(out));
console.log(`${out.length} verses`);
