// How well does the Camera Translator do on a sign that is NOT in its word list?
// Each listed entry is hidden in turn (together with any longer phrase that contains it) and the line is translated again with
// what is left: the rest of the list, then the app dictionary word for word. The answer is compared with the hidden entry's
// own English. This is the only coverage measure available without real photos; it is a text-level check (perfect reading).
// Usage: node tools/camera-translate/leave-one-out.mjs [--list]
import { readFileSync } from 'node:fs';
import { createGlossary, createDictionary, wordForWord } from '../../src/camera/camera-model.js';
const root = new URL('../../', import.meta.url);
const data = JSON.parse(readFileSync(new URL('data/camera/sign-glossary.json', root), 'utf8'));
const guard = JSON.parse(readFileSync(new URL('data/camera/real-neighbours.json', root), 'utf8')).words;
// Words the repo itself knows to be real (dictionary, its example sentences): a hidden entry's words join the guard list when
// they are among these, exactly as they would if the entry had never been listed.
const known = new Set(); { const idx = JSON.parse(readFileSync(new URL('data/vocab/index.json', root), 'utf8')); const k = idx.fields.indexOf('heUnpointed'); for (const r of idx.rows) if (r[k]) known.add(r[k]);
  for (const w of JSON.parse(readFileSync(new URL('data/vocab/words.json', root), 'utf8')).words) for (const t of String(w.example?.he || '').replace(/[\u0591-\u05c7]/g, '').match(/[\u05d0-\u05ea]{2,}/g) || []) known.add(t); }
const dictionary = createDictionary(JSON.parse(readFileSync(new URL('data/vocab/index.json', root), 'utf8')));
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const loose = (s) => norm(String(s || '').replace(/\b(shop|store)\b/gi, 'shop').replace(/s\b/g, ''));
export function leaveOneOut() {
  const rows = [];
  for (const e of data.entries) {
    if (e.name) continue;                                   // place names cannot be translated from a dictionary
    const rest = { ...data, entries: data.entries.filter((x) => x !== e && !(` ${x.he} `.includes(` ${e.he} `))), realNeighbours: [...guard, ...e.he.split(' ').filter((t) => known.has(t))] };
    const g = createGlossary(rest);
    const viaList = g.translate(e.he);
    const out = viaList.en ? { en: viaList.en, how: viaList.status === 'near' ? 'closest match' : 'rest of the list' } : (() => { const w = wordForWord(e.he, g, dictionary); return w ? { en: w.en, how: 'word for word' } : { en: null, how: 'nothing' }; })();
    const accepted = [e.en, ...(e.alt || [])];
    const verdict = !out.en ? 'none' : accepted.some((a) => norm(a) === norm(out.en)) ? 'same' : accepted.some((a) => loose(a) === loose(out.en)) ? 'close' : 'different';
    rows.push({ he: e.he, expected: e.en, got: out.en, how: out.how, verdict, words: e.he.split(' ').length });
  }
  const count = (f) => rows.filter(f).length;
  const by = {}; for (const r of rows) { const b = (by[r.how] ||= { lines: 0, same: 0, close: 0, different: 0 }); b.lines++; if (r.verdict !== 'none') b[r.verdict]++; }
  return { rows, byTier: by, total: rows.length, same: count((r) => r.verdict === 'same'), close: count((r) => r.verdict === 'close'), different: count((r) => r.verdict === 'different'), none: count((r) => r.verdict === 'none') };
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const r = leaveOneOut();
  console.log(JSON.stringify({ total: r.total, same: r.same, close: r.close, different: r.different, none: r.none, byTier: r.byTier }));
  if (process.argv.includes('--list')) for (const x of r.rows) if (x.verdict !== 'none') console.log(`${x.verdict.padEnd(9)} ${x.he} | expected ${x.expected} | got ${x.got} (${x.how})`);
}
