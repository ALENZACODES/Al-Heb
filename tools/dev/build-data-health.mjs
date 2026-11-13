#!/usr/bin/env node
// Build the Data health inventory (data/dev/health.json): every file under data/, its size and record
// count, plus any data path the app code names that is not in the repo (a 404 waiting to happen).
//
//   node tools/dev/build-data-health.mjs            rewrite data/dev/health.json
//   node tools/dev/build-data-health.mjs --check    exit 1 when the file is stale
//
// The Data health page (#/about/data) loads this file on first open. It is not part of the first install.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT = 'data/dev/health.json';

const KNOWN_MISSING = {
  'data/curriculum/practical/gcloud-results.json': 'Named by the Practical page. The file is not kept in the repo; a committed hide list stands in for it. Asking for it only logs a 404.',
};

const RECORD_KEYS = ['words', 'entries', 'lessons', 'items', 'rows', 'packs', 'books', 'cards', 'prayers', 'verses', 'units', 'games', 'files'];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const abs = path.join(dir, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

function recordsOf(data) {
  if (Array.isArray(data)) return { kind: 'array', records: data.length };
  if (!data || typeof data !== 'object') return { kind: typeof data, records: null };
  if (typeof data.count === 'number') {
    const key = RECORD_KEYS.find((k) => Array.isArray(data[k]));
    return { kind: key ? `object.${key}` : 'object.count', records: data.count };
  }
  const key = RECORD_KEYS.find((k) => Array.isArray(data[k]));
  if (key) return { kind: `object.${key}`, records: data[key].length };
  return { kind: 'object', records: null };
}

function describeFile(root, rel) {
  const abs = path.join(root, rel);
  const bytes = fs.statSync(abs).size;
  const row = { path: rel, bytes, status: 'ok', records: null, kind: null };
  if (rel.endsWith('.json')) {
    try {
      const rec = recordsOf(JSON.parse(fs.readFileSync(abs, 'utf8')));
      row.kind = rec.kind;
      row.records = rec.records;
    } catch (err) {
      row.status = 'unreadable';
      row.error = err.message;
    }
  } else {
    row.kind = path.extname(rel).slice(1) || 'file';
  }
  return row;
}

function dataRefs(root) {
  const refs = new Map(); // path -> [from]
  const add = (from, p) => {
    let rel = p.replace(/^\.\//, '').replace(/^\/+/, '');
    if (rel.startsWith('../')) return;
    if (!rel.startsWith('data/')) {
      // new URL('../../data/...', import.meta.url) already normalized if we only take data/ strings
      return;
    }
    rel = rel.split('?')[0].split('#')[0];
    if (!/\.[a-z0-9]+$/i.test(rel)) return; // skip directory prefixes and templates
    if (rel.includes('${') || rel.includes('*')) return;
    const list = refs.get(rel) || [];
    if (!list.includes(from)) list.push(from);
    refs.set(rel, list);
  };
  const scanDir = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      const abs = path.join(dir, name);
      const st = fs.statSync(abs);
      if (st.isDirectory()) { scanDir(abs); continue; }
      if (!/\.(js|mjs|html|css)$/.test(name)) continue;
      const rel = path.relative(root, abs).split(path.sep).join('/');
      const text = fs.readFileSync(abs, 'utf8');
      const re = /(?:['"`])(data\/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+)(?:['"`])/g;
      let m;
      while ((m = re.exec(text))) add(rel, m[1]);
    }
  };
  scanDir(path.join(root, 'src'));
  if (fs.existsSync(path.join(root, 'index.html'))) {
    const text = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const re = /(?:['"`])(data\/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+)(?:['"`])/g;
    let m;
    while ((m = re.exec(text))) add('index.html', m[1]);
  }
  return refs;
}

function dictionaryBreakdown(root) {
  const wordsPath = path.join(root, 'data/vocab/words.json');
  const catalog = fs.existsSync(wordsPath) ? (JSON.parse(fs.readFileSync(wordsPath, 'utf8')).words || []) : [];
  const tiers = [500, 1000, 2000, 5000];
  const listed = [];
  for (const t of tiers) {
    const p = path.join(root, `data/vocab/packs/vocab5k-tier-${t}.json`);
    if (fs.existsSync(p)) listed.push(...(JSON.parse(fs.readFileSync(p, 'utf8')).entries || []));
  }
  const isHidden = (r) => {
    const f = r && r.flags;
    return Array.isArray(f) ? f.includes('hidden') : !!(f && typeof f === 'object' && f.hidden === true);
  };
  const visible = listed.filter((r) => !isHidden(r));
  const wordRows = visible.filter((e) => !e.isForm);
  const hasTag = (e, t) => Array.isArray(e?.tags) && e.tags.includes(t);
  const rareSense = wordRows.filter((e) => hasTag(e, 'rare-sense')).length;
  return {
    sourceEntries: catalog.length,
    listed: listed.length,
    hidden: listed.length - visible.length,
    entries: visible.length,
    forms: visible.length - wordRows.length,
    words: wordRows.length,
    rareSense,
    addable: wordRows.length - rareSense,
    beyondList: Math.max(0, catalog.length - listed.length),
    beyondRank: catalog.filter((e) => e && e.frequencyRank != null && e.frequencyRank > 5000).length,
    unranked: catalog.filter((e) => e && e.frequencyRank == null).length,
  };
}

export function buildHealth(root = ROOT) {
  const files = walk(path.join(root, 'data'))
    .map((abs) => path.relative(root, abs).split(path.sep).join('/'))
    .filter((rel) => rel !== OUT)
    .sort()
    .map((rel) => describeFile(root, rel));
  const refs = dataRefs(root);
  const onDisk = new Set(files.map((f) => f.path));
  onDisk.add(OUT); // the inventory file itself is written by this tool and is not listed among the data files
  const missing = [];
  for (const [p, from] of [...refs.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (!onDisk.has(p)) {
      missing.push({ path: p, status: 'missing', referencedFrom: from, note: KNOWN_MISSING[p] || null });
    }
  }
  const referenced = {};
  for (const [p, from] of refs) referenced[p] = from;
  for (const f of files) f.referenced = Array.isArray(referenced[f.path]) ? referenced[f.path].length : 0;
  const ok = files.filter((f) => f.status === 'ok').length;
  const unreadable = files.filter((f) => f.status === 'unreadable').length;
  return {
    schema: 'alef-data-health/1',
    generated: new Date().toISOString().slice(0, 10),
    dictionary: dictionaryBreakdown(root),
    counts: { files: files.length, ok, unreadable, missing: missing.length, referenced: refs.size },
    missing,
    files,
  };
}

export function writeHealth(root = ROOT) {
  const doc = buildHealth(root);
  const dest = path.join(root, OUT);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(doc) + '\n');
  return doc;
}

export function checkHealth(root = ROOT) {
  const fresh = buildHealth(root);
  const dest = path.join(root, OUT);
  if (!fs.existsSync(dest)) return false;
  const prev = JSON.parse(fs.readFileSync(dest, 'utf8'));
  const strip = (d) => { const { generated, ...rest } = d; return rest; };
  return JSON.stringify(strip(prev)) === JSON.stringify(strip(fresh));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    if (!checkHealth()) { console.error(`${OUT} is stale; run: node tools/dev/build-data-health.mjs`); process.exit(1); }
    console.log(`${OUT} is current`);
  } else {
    const doc = writeHealth();
    console.log(`${OUT}: ${doc.counts.files} files, ${doc.counts.missing} missing, dictionary ${doc.dictionary.sourceEntries}/${doc.dictionary.listed}/${doc.dictionary.words}`);
  }
}
