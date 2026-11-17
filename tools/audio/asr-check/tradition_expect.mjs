// Writes tools/audio/asr-check/tradition-expect.json: for every Sephardi and Ashkenazi letter, vowel and syllable row of
// data/audio/manifest.json that has its own file, the reading the app shows for that tradition (src/pronunciation/forTradition.js
// respell), so scan_traditions.py can check each clip against the reading of its own tradition.
import { readFileSync, writeFileSync } from 'node:fs';
import { respell } from '../../../src/pronunciation/forTradition.js';
const man = JSON.parse(readFileSync(new URL('../../../data/audio/manifest.json', import.meta.url)));
const out = {};
for (const r of man) {
  if (!['sephardi', 'ashkenazi', 'israeli'].includes(r.tradition) || !['letter', 'vowel', 'syllable'].includes(r.kind)) continue;
  if (r.status === 'missing' || r.status === 'plays-israeli') continue;
  let meta = {};
  try { meta = JSON.parse(readFileSync(new URL('../../../' + r.path + '.meta.json', import.meta.url))); } catch { /* no sidecar */ }
  const text = /[ְ-ׇ]/.test(meta.inputText || '') ? meta.inputText : r.text;
  let say = '';
  try { say = respell(text, r.tradition); } catch { say = ''; }
  out[r.path] = { tradition: r.tradition, kind: r.kind, group: r.group || '', id: r.id, voice: r.voice, text, say };
}
writeFileSync(new URL('./tradition-expect.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(Object.keys(out).length, 'rows');
