#!/usr/bin/env node
// Divine-name audit. Walks data/**/*.json (and the built book text) and classifies every place the four-letter name
// (Hebrew or a Latin spelling) appears. Usage: node tools/sensitivity/audit.mjs [--json] [--root DIR]
// Classes:
//   audio-target     Hebrew name inside a string that is sent to audio/TTS/SSML (data/audio/manifest*.json "text", pronunciation ssml)
//   vocab-item       Hebrew name as the "he" of a vocabulary / speak-set item (something a learner could be asked to say)
//   latin-spelling   a Latin spelling of the four-letter name (Yahweh, Jehovah, YHWH, Yehovah ...) in any string
//   example-sentence Hebrew name inside a vocab/speak example sentence (a quotation from a source text)
//   source-hebrew    Hebrew name in source text (corpus, lessons, prayers, verses): shown as in the source
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findName, hasLatinName } from '../../src/shell/names.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ROOT = path.resolve(here, '../..');
const SKIP = [/data\/photo\/_benchmark\//];

function* jsonFiles(dir, root) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* jsonFiles(p, root);
    else if (e.name.endsWith('.json')) { const rel = path.relative(root, p).split(path.sep).join('/'); if (!SKIP.some((r) => r.test(rel))) yield rel; }
  }
}

function classify(file, key, parent) {
  if (/^data\/audio\/manifest[^/]*\.json$/.test(file) && key === 'text') return 'audio-target';
  if (/^data\/pronunciation\/derived\/_ssml/.test(file)) return 'audio-target';
  if (/^data\/(vocab\/(words|packs|themes)|speak\/sets)\b/.test(file) && (key === 'he' || key === 'heUnpointed')) return /^examples?$/.test(parent) ? 'example-sentence' : 'vocab-item';
  return 'source-hebrew';
}

/** @returns {Array<{file:string,key:string,cls:string,kind:string,id:string,sample:string}>} */
export function audit(root = DEFAULT_ROOT) {
  const out = [];
  const dataDir = path.join(root, 'data');
  for (const file of jsonFiles(dataDir, root)) {
    let j;
    try { j = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); } catch { continue; }
    const walk = (o, key, id, parent = '') => {
      if (typeof o === 'string') {
        const sample = o.length > 60 ? o.slice(0, 60) + '...' : o;
        for (const f of findName(o)) out.push({ file, key, cls: classify(file, key, parent), kind: f.kind, id, sample });
        if (hasLatinName(o)) out.push({ file, key, cls: 'latin-spelling', kind: 'latin', id, sample });
      } else if (Array.isArray(o)) o.forEach((v) => walk(v, key, id, parent));
      else if (o && typeof o === 'object') {
        const here = typeof o.id === 'string' ? o.id : (typeof o.i === 'string' ? o.i : id);
        for (const [k, v] of Object.entries(o)) walk(v, k, here, key);
      }
    };
    walk(j, '', '');
  }
  out.push(...respellAudit(root));
  return out;
}

const SPOKEN_OK = /adon(?:ai|oy|ay)|donai/i;
/**
 * Learner-facing respellings (data/pronunciation/variants records, runtime lookup tables). A word that is the name (exact) must be
 * respelled with the conventional substitute; a prefixed form respelled without it (e.g. "laivah") is flagged as pronounced-as-written.
 */
export function respellAudit(root = DEFAULT_ROOT) {
  const out = [];
  const dir = path.join(root, 'data/pronunciation');
  if (!fs.existsSync(dir)) return out;
  for (const file of jsonFiles(dir, root)) {
    let j;
    try { j = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); } catch { continue; }
    if (file.includes('/variants/') && Array.isArray(j.records)) {
      for (const r of j.records) {
        if (typeof r.he !== 'string' || !r.variants) continue;
        const hits = findName(r.he);
        if (!hits.length) continue;
        for (const [trad, v] of Object.entries(r.variants)) {
          const simple = String((v && v.simple) || '');
          const exactOnly = hits.every((h) => h.kind === 'exact');
          if (exactOnly ? false : !SPOKEN_OK.test(simple)) out.push({ file, key: 'simple:' + trad, cls: 'respell-as-written', kind: 'prefixed', id: r.id || '', sample: simple.slice(0, 60) });
        }
      }
    } else if (file.includes('/runtime/') && j && typeof j === 'object') {
      const tbl = j.w || j.words || j.table || j.entries || j;
      for (const [he, arr] of Object.entries(tbl)) {
        const f = findName(he)[0];
        if (!f || !Array.isArray(arr)) continue;
        const simple = String(arr[3] || '') + ' ' + String(arr[4] || '');
        if (!SPOKEN_OK.test(simple)) out.push({ file, key: 'lookup', cls: 'respell-as-written', kind: f.kind, id: he, sample: simple.trim() });
      }
    }
  }
  return out;
}

/** Group findings: "file|key|cls|kind" -> count. */
export function summarize(findings) {
  const m = new Map();
  for (const f of findings) { const k = `${f.file}|${f.key}|${f.cls}|${f.kind}`; m.set(k, (m.get(k) || 0) + 1); }
  return m;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const ri = args.indexOf('--root');
  const root = ri >= 0 ? path.resolve(args[ri + 1]) : DEFAULT_ROOT;
  const f = audit(root);
  if (args.includes('--json')) console.log(JSON.stringify([...summarize(f)].map(([k, n]) => { const [file, key, cls, kind] = k.split('|'); return { file, key, cls, kind, count: n }; }), null, 1));
  else {
    const byCls = {};
    for (const x of f) byCls[x.cls] = (byCls[x.cls] || 0) + 1;
    console.log('findings by class:', JSON.stringify(byCls));
    for (const [k, n] of [...summarize(f)].filter(([k]) => !k.includes('|source-hebrew|')).sort()) console.log(String(n).padStart(5), k.replace(/\|/g, '  '));
  }
}
