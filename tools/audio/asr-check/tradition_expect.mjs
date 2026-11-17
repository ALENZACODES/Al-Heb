// Writes tools/audio/asr-check/tradition-expect.json: for every Sephardi and Ashkenazi letter, vowel and syllable row of
// data/audio/manifest.json that has its own file, the reading the app shows for that tradition (src/pronunciation/forTradition.js
// respell), so scan_traditions.py can check each clip against the reading of its own tradition.
import { readFileSync, writeFileSync } from 'node:fs';
import { respell } from '../../../src/pronunciation/forTradition.js';
import { ashkenaziScript } from '../ashkenazi_script.mjs';
const man = JSON.parse(readFileSync(new URL('../../../data/audio/manifest.json', import.meta.url)));
const out = {};
// The Israeli row of the same voice, card and id (following aliasOf), for the sound a bare-letter card is meant to make.
const isr = {};
for (const r of man) if (r.tradition === 'israeli') isr[`${r.voice}/${r.kind}/${r.id}`] = r;
const twinOf = (r) => { let t = isr[`${r.voice}/${r.kind}/${r.id}`]; if (t?.aliasOf) t = isr[`${r.voice}/${t.aliasOf.split('/')[0]}/${t.aliasOf.split('/')[1]}`]; return t; };
const POINTS = /[\u05B0-\u05BC\u05C1\u05C2\u05C7]/;
for (const r of man) {
  if (!['sephardi', 'ashkenazi', 'israeli'].includes(r.tradition) || !['letter', 'vowel', 'syllable'].includes(r.kind)) continue;
  if (r.status === 'missing' || r.status === 'plays-israeli') continue;
  let meta = {};
  try { meta = JSON.parse(readFileSync(new URL('../../../' + r.path + '.meta.json', import.meta.url))); } catch { /* no sidecar */ }
  // What the card shows (the manifest text), not what the recording was read from: a take may have been read from a longer
  // text and cut ("vav va" -> "va"), or with a trick ("כֻּ."), and the card still means its own sound.
  let text = r.text;
  const bare = [...text].length === 1 && !POINTS.test(text);
  if (bare) {                                    // a bare-letter sound card: the dagesh decides b/v, k/kh, p/f
    const ipa = (twinOf(r)?.ipa || r.ipa || '').replace(/[\[\]\u031E]/g, '');
    if (/^[bkpt]$/.test(ipa) && /[בכפת]/.test(text)) text += '\u05BC';
  }
  let say = '';
  try { say = respell(text, r.tradition); } catch { say = ''; }
  let israeliSay = '';
  try { israeliSay = respell(text, 'israeli'); } catch { israeliSay = ''; }
  // script: pointed Hebrew for the Israeli voice to read this tradition's reading (Ashkenazi rules; Sephardi reads as written);
  // a lone consonant gets a patach so the voice says it ("ba"), the check allows the one vowel after a bare consonant
  let script = r.tradition === 'ashkenazi' ? ashkenaziScript(text) : text;
  if (!/[\u05B0-\u05BB\u05C7]/.test(script) && say) script += '\u05B7';
  const taken = /[\u05B0-\u05C7]/.test(meta.inputText || '') ? meta.inputText : '';
  out[r.path] = { tradition: r.tradition, kind: r.kind, group: r.group || '', id: r.id, voice: r.voice, text, say, israeliSay, script, taken };
}
writeFileSync(new URL('./tradition-expect.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(Object.keys(out).length, 'rows');
