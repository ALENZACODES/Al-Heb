// records the check lines and the answers of the graphics-card graphs (run on the processor) into each pack.json
import { readFileSync, writeFileSync } from 'node:fs';
import { loadDirection } from './node-runtime.mjs';
const LINES = { 'he-en': ['שלום, מה שלומך היום?', 'אנחנו רוצים לאכול ארוחת ערב במסעדה טובה.'], 'en-he': ['Hello, how are you today?', 'We want to eat dinner at a good restaurant.'] };
for (const d of ['he-en', 'en-he']) {
  const f = await loadDirection(d, 'float'); const q = await loadDirection(d, 'wasm'); const probe = [];
  for (const text of LINES[d]) { const expect = await f.translate(text, { beams: 2 }); probe.push({ text, expect }); console.log(d, text, '=>', expect, '| 8-bit:', await q.translate(text, { beams: 2 })); }
  const file = new URL(`../../../assets/vendor/_nmt/${d}/pack.json`, import.meta.url); const p = JSON.parse(readFileSync(file, 'utf8')); p.probe = probe; writeFileSync(file, JSON.stringify(p, null, 1) + '\n');
}
