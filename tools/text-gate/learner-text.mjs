// Learner-text gate (S-01, 12 Nov audit, lane 1). Scans every learner-facing English string in data/ for the defect
// class that let "hi" + "slang" read as "hislang": words glued to a register or part-of-speech tag, a copied gloss that
// no longer matches the record it was copied from, raw keys and template slots, null/undefined/NaN, doubled or edge
// spaces, and unbalanced brackets (usually a cut-off string). tests/craft1112.textgate.test.js runs it; findings are
// fixed in the data or allow-listed there with a reason.
// Usage: node tools/text-gate/learner-text.mjs [repo root]   (prints every finding)
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Keys whose string values a learner reads (English glosses, titles, prompts, notes). */
export const LEARNER_KEYS = new Set(['en', 'english', 'gloss', 'alt', 'enNote', 'explanation', 'prompt', 'title', 'label', 'cue', 'hint', 'meaning', 'grammarNote', 'simple', 'question', 'answer', 'feedback', 'situation', 'notes', 'note', 'caption', 'text']);
const REGISTERS = 'slang|formal|casual|neutral';
/** Rules: each returns true when the string has the defect. */
export const RULES = {
  'glued-register': (s) => new RegExp(`\\b(?!informal\\b)[a-z]+(${REGISTERS})\\b`, 'i').test(s),
  'glued-pos': (s) => /\b(?!(?:pro|ad)noun\b|adverb\b|proverb\b)[a-z]{2,}(noun|verb)\b/.test(s),
  'punct-glue': (s) => /[a-z]{2}[,;!?][A-Za-z]/.test(s),
  nullish: (s) => /\b(undefined|NaN)\b/.test(s) || /(^|[^a-z ])\s*null\b|\bnull\s*($|[^a-z ])/i.test(s) || s === 'null',
  'double-space': (s) => /\S {2,}\S/.test(s),
  'edge-space': (s) => s !== s.trim(),
  template: (s) => /\$\{|\{\{|\{[a-z_]+\}/.test(s),
  'raw-key': (s) => /(^|\s)[a-z]+(\.[a-z][a-zA-Z0-9]*){2,}(\s|$)/.test(s) && !/https?:|www\.|\.(com|org|net|json|js|mp3|webp|png)\b/.test(s),
  brackets: (s) => [['(', ')'], ['[', ']'], ['{', '}']].some(([o, c]) => s.split(o).length !== s.split(c).length),
};
// Free-text keys (notes, text) hold long prose, often Hebrew with English; only the strict rules apply to them.
const PROSE_KEYS = new Set(['notes', 'note', 'text', 'caption', 'situation', 'answer', 'feedback', 'question']);
const PROSE_RULES = new Set(['nullish', 'template', 'raw-key', 'glued-register']);

function* files(dir) {
  for (const n of readdirSync(dir).sort()) { const p = join(dir, n); if (statSync(p).isDirectory()) yield* files(p); else if (n.endsWith('.json')) yield p; }
}
/** @returns {{rule:string, file:string, key:string, text:string}[]} */
export function scanLearnerText(root) {
  const found = [];
  const cache = new Map();
  const load = (rel) => { if (!cache.has(rel)) { try { cache.set(rel, JSON.parse(readFileSync(join(root, rel), 'utf8'))); } catch { cache.set(rel, null); } } return cache.get(rel); };
  const ids = new Map();
  const byId = (rel) => {
    if (!ids.has(rel)) { const m = new Map(); const v = (x) => { if (Array.isArray(x)) x.forEach(v); else if (x && typeof x === 'object') { if (typeof x.id === 'string' && !m.has(x.id)) m.set(x.id, x); Object.values(x).forEach(v); } }; v(load(rel)); ids.set(rel, m); }
    return ids.get(rel);
  };
  const norm = (s) => String(s ?? '').normalize('NFC').trim();
  const visit = (x, file, key) => {
    if (Array.isArray(x)) { for (const y of x) visit(y, file, key); return; }
    if (x && typeof x === 'object') {
      // Column tables ({fields: [...], rows: [[...], ...]}, e.g. data/vocab/index.json) are checked as records.
      if (Array.isArray(x.fields) && Array.isArray(x.rows) && x.fields.every((f) => typeof f === 'string')) {
        for (const r of x.rows) if (Array.isArray(r)) visit(Object.fromEntries(x.fields.map((f, i) => [f, r[i]])), file, key);
      }
      // A record copied from another data file ({id, source: "data/....json"}) must show the source's English and Hebrew.
      if (typeof x.id === 'string' && typeof x.source === 'string' && /^data\/.*\.json$/.test(x.source) && existsSync(join(root, x.source))) {
        const src = byId(x.source).get(x.id);
        if (src) for (const k of ['en', 'he']) if (typeof x[k] === 'string' && typeof src[k] === 'string' && norm(x[k]) !== norm(src[k])) found.push({ rule: 'gloss-mismatch', file, key: `${x.id}.${k}`, text: `${x[k]} | source: ${src[k]}` });
      }
      for (const [k, v] of Object.entries(x)) visit(v, file, k);
      return;
    }
    if (typeof x !== 'string' || !LEARNER_KEYS.has(key) || !/[a-z]/i.test(x)) return;
    for (const [rule, test] of Object.entries(RULES)) {
      if (PROSE_KEYS.has(key) && !PROSE_RULES.has(rule)) continue;
      if (test(x)) found.push({ rule, file, key, text: x });
    }
  };
  for (const p of files(join(root, 'data'))) { const rel = relative(root, p); const j = load(rel); if (j != null) visit(j, rel, ''); }
  return found;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*\//, ''))) {
  const root = process.argv[2] || process.cwd();
  const f = scanLearnerText(root);
  for (const x of f) console.log(`${x.rule}\t${x.file}\t${x.key}\t${JSON.stringify(x.text).slice(0, 300)}`);
  console.log(`${f.length} findings`);
}
