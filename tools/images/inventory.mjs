#!/usr/bin/env node
// Asset usage, size and variant inventory (read-only). Walks tracked image files (git ls-files) and writes
//   docs/qa/ASSET-INVENTORY.md   measured tables
//   docs/qa/asset-inventory.csv  one row per tracked image file
// It never deletes, moves or edits an asset, never runs tools/build-precache.mjs, and does not import it: the offline lists are
// read from the committed precache-manifest.js (so they are only as fresh as that file; the report says so).
//
// Usage: node tools/images/inventory.mjs [--out-md FILE] [--out-csv FILE] [--self-test] [--stdout]
//   --self-test  run the placeholder-detector tests (samples + every tracked svg) and exit 0/1; writes nothing
//   --stdout     print the markdown instead of writing files
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const IMG_RE = /\.(png|jpe?g|webp|svg|gif|avif|ico)$/i;
const TEXT_RE = /\.(js|mjs|cjs|json|csv|md|html|css|webmanifest|txt|py|yml|yaml)$/i;
const MAX_TEXT = 6 * 1024 * 1024;

// ---------------------------------------------------------------------------------------------------- placeholder detector
/**
 * A placeholder SVG is the stand-in written by tools/images/make_placeholders.mjs: a flat card with a dashed border and the word
 * PLACEHOLDER under the file stem. Definition (content based, so it also catches a copy outside assets/img/placeholders/):
 *   S1 aria-label starts with "placeholder for "      S2 a text node that is exactly PLACEHOLDER
 *   S3 a dashed outline (stroke-dasharray)             S4 at most 4 drawing elements (rect/text/path/circle/image/g/use/polygon/line/ellipse)
 *   S5 under 2 KB
 * Placeholder = S2 and S4 and S5 and (S1 or S3). A real picture or icon fails S2/S4/S5 (see --self-test).
 */
export function placeholderSignals(svg) {
  const text = String(svg);
  const els = (text.match(/<(rect|text|path|circle|image|g|use|polygon|polyline|line|ellipse)\b/g) || []).length;
  return {
    s1: /aria-label="placeholder for /i.test(text),
    s2: />\s*PLACEHOLDER\s*</.test(text),
    s3: /stroke-dasharray=/.test(text),
    s4: els <= 4,
    s5: Buffer.byteLength(text) < 2048,
    els,
  };
}
export function isPlaceholderSvg(svg) {
  const s = placeholderSignals(svg);
  return /<svg\b/i.test(svg) && s.s2 && s.s4 && s.s5 && (s.s1 || s.s3);
}
const SAMPLES = [
  ['template output', true, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300" role="img" aria-label="placeholder for L01_alef_print_mnemonic">\n<rect width="400" height="300" fill="#F6F1E7"/>\n<rect x="15" y="15" width="370" height="270" rx="14" fill="none" stroke="#1F3A5F" stroke-width="3" stroke-dasharray="10 8"/>\n<text x="200" y="146" text-anchor="middle" font-size="18" fill="#2B2B2B">L01_alef_print_mnemonic</text>\n<text x="200" y="170" text-anchor="middle" font-size="16" letter-spacing="3" fill="#1F3A5F">PLACEHOLDER</text>\n</svg>\n'],
  ['copy without aria-label but dashed', true, '<svg viewBox="0 0 10 10"><rect width="10" height="10"/><rect stroke-dasharray="2 2" fill="none"/><text>x</text><text>PLACEHOLDER</text></svg>'],
  ['aria-label only, no PLACEHOLDER text', false, '<svg viewBox="0 0 10 10" aria-label="placeholder for x"><rect width="10" height="10"/></svg>'],
  ['the word in a title of a real drawing', false, '<svg viewBox="0 0 10 10"><title>not a PLACEHOLDER</title><rect width="10" height="10"/></svg>'],
  ['text node PLACEHOLDER but a busy drawing', false, '<svg viewBox="0 0 10 10" aria-label="placeholder for y">' + '<path d="M0 0L1 1"/>'.repeat(9) + '<text>PLACEHOLDER</text></svg>'],
  ['small icon', false, '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>'],
  ['not an svg', false, 'PLACEHOLDER'],
];
export function selfTest(tracked) {
  const out = [];
  let bad = 0;
  for (const [name, want, svg] of SAMPLES) { const got = isPlaceholderSvg(svg); if (got !== want) bad++; out.push(`${got === want ? 'ok  ' : 'FAIL'} sample: ${name} (expected ${want}, got ${got})`); }
  let inFolder = 0, inFolderYes = 0, elsewhere = 0, elsewhereYes = 0; const misses = [];
  for (const f of tracked.filter((p) => /\.svg$/i.test(p))) {
    const yes = isPlaceholderSvg(readFileSync(join(ROOT, f), 'utf8')), inDir = f.startsWith('assets/img/placeholders/');
    if (inDir) { inFolder++; if (yes) inFolderYes++; else misses.push(f); } else { elsewhere++; if (yes) { elsewhereYes++; misses.push(f); } }
  }
  out.push(`tracked svg in assets/img/placeholders/: ${inFolderYes}/${inFolder} detected as placeholder`);
  out.push(`tracked svg elsewhere: ${elsewhereYes}/${elsewhere} detected as placeholder`);
  if (misses.length) { bad += misses.length; out.push('mismatches: ' + misses.slice(0, 10).join(', ')); }
  return { lines: out, bad };
}

// ---------------------------------------------------------------------------------------------------- helpers
const git = (...a) => execFileSync('git', a, { cwd: ROOT, maxBuffer: 1 << 28 }).toString();
const fmtMB = (b) => (b / 1048576).toFixed(2);
const fmtKB = (b) => (b / 1024).toFixed(1);
const readJson = (rel, dflt = null) => { try { return JSON.parse(readFileSync(join(ROOT, rel), 'utf8')); } catch { return dflt; } };
const csvCell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const mdCell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
function table(head, rows) { return ['| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|', ...rows.map((r) => '| ' + r.map(mdCell).join(' | ') + ' |')].join('\n'); }

/** Category by path (first match). */
function categoryOf(p) {
  if (p.startsWith('assets/img/gen/')) return 'generated art (webp)';
  if (p.startsWith('assets/img/placeholders/')) return 'placeholder svg';
  if (p.startsWith('assets/img/refs/')) return 'reference images (cursive/print letter refs)';
  if (p.startsWith('assets/letters/morph/')) return 'letter memory pictures (svg)';
  if (p.startsWith('assets/icons/')) return 'app icons';
  if (p.startsWith('assets/screens/') || p.startsWith('assets/screenshots/')) return 'store/install screenshots';
  if (p.startsWith('assets/')) return 'other assets';
  if (p.startsWith('data/photo/')) return 'photo-route fixtures and benchmark images';
  if (p.startsWith('docs/qa/')) return 'QA screenshots (docs/qa)';
  if (p.startsWith('docs/')) return 'other docs images';
  if (p.startsWith('book/')) return 'book images';
  if (p.startsWith('tools/') || p.startsWith('tests/')) return 'tool/test images';
  return 'other';
}
const edgeOf = (p) => { const m = /\.(\d+)\.webp$/i.exec(p); return m ? +m[1] : null; };
const stemOfPath = (p) => posix.basename(p).replace(IMG_RE, '').replace(/\.\d+$/, '');
const refGroupOf = (p) => {
  if (p === 'data/img/index.json') return 'index';
  if (p.startsWith('data/images/')) return 'provenance';
  if (p.startsWith('src/') || ['index.html', 'offline.html', 'manifest.webmanifest', 'sw.js'].includes(p)) return 'app';
  if (p.startsWith('data/')) return 'data';
  if (p.startsWith('book/')) return 'book';
  if (p.startsWith('docs/') || p.endsWith('.md')) return 'docs';
  if (p.startsWith('tools/') || p.startsWith('tests/') || p === 'package.json') return 'tools';
  return 'other';
};
/** Mirrors the image-relevant part of tools/build-static.mjs: SHIP_DIRS src/assets/data/audio, EXCLUDE (tools, node_modules, _x, non-json data, data/images). */
function deployedPath(p) {
  const parts = p.split('/');
  if (!['src', 'assets', 'data', 'audio'].includes(parts[0])) return false;
  if (parts.some((x) => x === 'tools' || x === 'node_modules' || x.startsWith('_') || x === '__pycache__')) return false;
  if (parts[0] === 'data' || parts[0] === 'audio') return false;   // images under data/ are not json and audio/ ships only audio files
  return true;
}

// ---------------------------------------------------------------------------------------------------- main
export function run() {
  const tracked = git('ls-files', '-z').split('\0').filter(Boolean);
  const trackedSet = new Set(tracked);
  const images = tracked.filter((p) => IMG_RE.test(p));

  // --- per-file facts
  const recs = images.map((p) => {
    const buf = readFileSync(join(ROOT, p));
    const ext = posix.extname(p).slice(1).toLowerCase();
    const r = { path: p, ext, bytes: buf.length, cat: categoryOf(p), top: p.split('/').slice(0, 2).join('/'), stem: stemOfPath(p), edge: edgeOf(p), sha: createHash('sha256').update(buf).digest('hex'), placeholder: false };
    if (ext === 'svg') r.placeholder = isPlaceholderSvg(buf.toString('utf8'));
    r.deployed = deployedPath(p);
    r.refs = { app: 0, data: 0, index: 0, book: 0, docs: 0, tools: 0, provenance: 0, precache: 0, weak: 0 };
    r.refFiles = [];
    return r;
  });
  const byPath = new Map(recs.map((r) => [r.path, r]));

  // --- data/img index (what src/img/resolve.js can show) and approvals
  const index = readJson('data/img/index.json', { p: [], a: [], g: {}, w: {} });
  const approvals = (readJson('data/images/approvals.json', {}).approvals) || {};
  const approvedIds = new Set(Object.entries(approvals).filter(([, v]) => (v && v.status) === 'approved').map(([k]) => k));
  const genManifest = readJson('data/images/generated-manifest.json', {});
  const idInfo = new Map();                      // image id -> {key, edges, alt}
  const expected = [];                           // [file, id]
  const addRow = (key, idPrefix, row) => {
    const id = idPrefix + row[0], big = row[4];
    const edges = big == null ? [] : Array.isArray(big) ? big : big === 800 ? [800] : [800, big];
    idInfo.set(id, { key, edges, alt: row[3] });
    for (const e of edges) expected.push([`assets/img/gen/${id}.${e}.webp`, id]);
  };
  for (const [key, [pre, rows]] of Object.entries(index.g || {})) for (const r of rows) addRow(key, pre, r);
  for (const [key, r] of Object.entries(index.w || {})) addRow('word:' + key, '', r);
  const indexedFiles = new Set(expected.map((e) => e[0]));
  const indexMissingFiles = expected.filter(([f]) => !trackedSet.has(f));

  // --- offline lists from the committed precache-manifest.js (read, never rebuilt)
  const pre = { files: [], onDemand: [], version: null };
  try { const sandbox = { self: {} }; vm.runInNewContext(readFileSync(join(ROOT, 'precache-manifest.js'), 'utf8'), sandbox); pre.files = sandbox.self.ALEF_PRECACHE || []; pre.onDemand = sandbox.self.ALEF_ON_DEMAND || []; pre.version = sandbox.self.ALEF_VERSION; } catch { /* leave empty */ }
  const preSet = new Set(pre.files), onSet = new Set(pre.onDemand);

  // --- text corpus: reference scan
  const textFiles = tracked.filter((p) => TEXT_RE.test(p) && !IMG_RE.test(p));
  const stemMap = new Map();   // stem -> records (assets/img/** only: ids are used without a path)
  for (const r of recs) if (r.path.startsWith('assets/img/')) { if (!stemMap.has(r.stem)) stemMap.set(r.stem, []); stemMap.get(r.stem).push(r); }
  const baseMap = new Map();   // basename -> records
  for (const r of recs) { const b = posix.basename(r.path); if (!baseMap.has(b)) baseMap.set(b, []); baseMap.get(b).push(r); }
  const EXT_RE = /\.(?:png|jpe?g|webp|svg|gif|avif|ico)\b/gi;
  const PATH_CH = /[A-Za-z0-9_\-./@%~]/;
  const DYN_RE = /[`'"]([^`'"\n]*\$\{[^`'"\n]*\.(?:png|jpe?g|webp|svg|gif|avif|ico))[`'"]/g;
  const CONCAT_RE = /['"`]([A-Za-z0-9_\-./]+\/)['"`]\s*\+[^;\n]{0,80}?\+\s*['"`]\.(png|jpe?g|webp|svg|gif|avif|ico)['"`]/g;
  const brokenRefs = [];       // {file, line, ref, resolved}
  const dynamic = [];          // {file, pattern, matches}
  const dynSeen = new Set();
  const lineOf = (text, idx) => { let n = 1; for (let i = 0; i < idx; i++) if (text.charCodeAt(i) === 10) n++; return n; };
  const note = (r, group, file) => { r.refs[group]++; if (r.refFiles.length < 6 && !r.refFiles.includes(file)) r.refFiles.push(file); };
  const SCAN_BROKEN = (f) => f.startsWith('src/') || (f.startsWith('data/') && !f.startsWith('data/images/') && f !== 'data/img/index.json') || ['index.html', 'offline.html', 'manifest.webmanifest', 'sw.js'].includes(f);
  const norm = (x) => posix.normalize(x).replace(/^\.\//, '');

  for (const f of textFiles) {
    let sz = 0; try { sz = statSync(join(ROOT, f)).size; } catch { continue; }
    if (sz > MAX_TEXT || f === 'precache-manifest.js') continue;
    if (f === 'docs/qa/ASSET-INVENTORY.md') continue;        // never count our own output
    const g = refGroupOf(f);
    const text = readFileSync(join(ROOT, f), 'utf8');
    const hit = new Set();
    // explicit paths
    EXT_RE.lastIndex = 0; let m;
    while ((m = EXT_RE.exec(text))) {
      let st = m.index; while (st > 0 && PATH_CH.test(text[st - 1])) st--;       // linear backward scan (no regex backtracking)
      const ref = text.slice(st, m.index + m[0].length), prev = text[st - 1] || '';
      if (prev === '}' || prev === '$') continue;   // tail of a template or concatenation: handled below
      if (/^\/(?!\/)/.test(ref) && (prev === '}' || prev === '`')) continue;
      if (ref === m[0]) continue;                                                    // just ".png" with no name
      const cands = [norm(ref.replace(/^\/+/, ''))];
      if (ref.includes('/') || /^\.{1,2}\//.test(ref)) cands.push(norm(posix.join(posix.dirname(f), ref)));
      const found = cands.find((c) => trackedSet.has(c));
      if (found) { const r = byPath.get(found); if (r && !hit.has(found)) { hit.add(found); note(r, g, f); } }
      else if (!ref.includes('/')) {            // bare file name: weak match only
        for (const r of baseMap.get(ref) || []) if (!hit.has('w' + r.path)) { hit.add('w' + r.path); r.refs.weak++; }
      } else if (SCAN_BROKEN(f) && !ref.startsWith('/') && (/^(?:\.{1,2}\/)*(assets|data|docs|src|book|audio)\//.test(ref) || /^\.{1,2}\//.test(ref))) {
        brokenRefs.push({ file: f, line: lineOf(text, m.index), ref, resolved: cands[cands.length - 1] });
      }
    }
    // dynamic path templates -> regex over tracked images
    const patterns = [];
    DYN_RE.lastIndex = 0; while ((m = DYN_RE.exec(text))) patterns.push(m[1]);
    CONCAT_RE.lastIndex = 0; while ((m = CONCAT_RE.exec(text))) patterns.push(m[1] + '${x}.' + m[2]);
    for (const pat of patterns) {
      const parts = pat.split(/\$\{[^}]*\}/);
      if (!parts[0].includes('/')) continue;                              // no directory literal: too vague to match
      const rx = new RegExp('^' + parts.map((s) => s.replace(/^\.{1,2}\//, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]+') + '$');
      const key = f + '|' + pat; if (dynSeen.has(key)) continue; dynSeen.add(key);
      const matches = recs.filter((r) => rx.test(r.path));
      if (matches.length) { dynamic.push({ file: f, pattern: pat, matches: matches.length }); for (const r of matches) if (!hit.has(r.path)) { hit.add(r.path); note(r, g, f + ' (template)'); } }
    }
    // stems used as ids (assets/img only)
    const toks = new Set(text.match(/[A-Za-z0-9][A-Za-z0-9_\-]{5,}/g) || []);
    for (const t of toks) { const rs = stemMap.get(t); if (rs) for (const r of rs) if (!hit.has(r.path)) { hit.add(r.path); note(r, g, f + ' (stem)'); } }
  }
  // index-based reference (the resolver reads expanded ids, so ids are not literal in data/img/index.json)
  for (const [file] of expected) { const r = byPath.get(file); if (r) note(r, 'index', 'data/img/index.json (expanded)'); }
  // precache lists
  for (const r of recs) { if (preSet.has(r.path)) r.refs.precache = 1; if (onSet.has(r.path)) r.refs.precache = 2; }

  // --- duplicates
  const byHash = new Map(); for (const r of recs) { if (!byHash.has(r.sha)) byHash.set(r.sha, []); byHash.get(r.sha).push(r); }
  const dupGroups = [...byHash.values()].filter((g) => g.length > 1);
  dupGroups.forEach((g, i) => g.forEach((r) => { r.dup = 'H' + String(i + 1).padStart(3, '0'); }));
  const byStem = new Map();
  for (const r of recs) { if (!byStem.has(r.stem)) byStem.set(r.stem, []); byStem.get(r.stem).push(r); }
  const stemVariantGroups = [...byStem.entries()].filter(([, g]) => new Set(g.map((x) => x.ext)).size > 1 && g.some((x) => x.path.startsWith('assets/img/'))).map(([stem, g]) => ({ stem, files: g }));
  const byBase = new Map(); for (const r of recs) { const b = posix.basename(r.path); if (!byBase.has(b)) byBase.set(b, []); byBase.get(b).push(r); }
  const nameCollisions = [...byBase.entries()].filter(([, g]) => g.length > 1 && new Set(g.map((x) => x.sha)).size > 1 && !g.every((x) => x.path.startsWith('docs/qa/')));

  // --- retired art concepts. Baseline = data/letters/mnemonics.json as committed at HEAD (the text the existing generated art was
  // briefed from; the working tree copy may already be rewritten), compared with data/letters/memory-chain.json (the current picture).
  let mnHead = null;
  try { mnHead = JSON.parse(git('show', 'HEAD:data/letters/mnemonics.json')); } catch { /* not a git checkout with HEAD */ }
  const mnWork = readJson('data/letters/mnemonics.json', { letters: [], variants: [] });
  const mn = mnHead || mnWork;
  const chain = readJson('data/letters/memory-chain.json', { letters: [] });
  const STOP = new Set('a an the of on in at to with and or for from by is are its it his her their one two three very into onto off out up down over under beside next while that this has have being been sticking like each other single letter hebrew shape memory picture echoes echo outline drawn points point mnemonic ari noa'.split(' '));
  const DECOR = new Set('cartoon cozy small large tiny big grumpy round tall long short smooth little wooden striped silent open closed red'.split(' '));
  const stem = (w) => w.replace(/(ies)$/, 'y').replace(/(ing|ed)$/, '').replace(/s$/, '');
  const words = (s) => new Set((String(s).toLowerCase().match(/[a-z]{3,}/g) || []).filter((w) => !STOP.has(w)).map(stem));
  const subject = (s) => { const clause = String(s).toLowerCase().split(/ with |,|;|\.| beside | on | in | being | sticking | from | by /)[0]; return new Set([...words(clause)].filter((w) => !DECOR.has(w))); };
  const chainById = new Map(chain.letters.map((l) => [l.id, l]));
  const workIdea = new Map(mnWork.letters.map((l) => [l.id, l.imageIdea]));
  const concepts = [];
  for (const l of mn.letters) {
    const c = chainById.get(l.id);
    const oldW = words(l.imageIdea), newW = c ? words(c.picture.idea) : new Set();
    const overlap = oldW.size ? [...oldW].filter((w) => newW.has(w)).length / oldW.size : 1;
    const subj = subject(l.imageIdea), subjKept = [...subj].some((w) => newW.has(w));
    concepts.push({ id: l.id, inChain: !!c, oldIdea: l.imageIdea, newIdea: c ? c.picture.idea : '', overlap, onlyOld: [...oldW].filter((w) => !newW.has(w)), subject: [...subj].join(' '), subjectChanged: !!c && subj.size > 0 && !subjKept, replaced: !!c && subj.size > 0 && !subjKept, detailsChanged: !!c && !(subj.size > 0 && !subjKept) && overlap < 0.6, workingTreeDiffers: workIdea.get(l.id) !== l.imageIdea, newW });
  }
  const conceptById = new Map(concepts.map((c) => [c.id, c]));
  const letterKeyOf = (id) => { const k = idInfo.get(id)?.key || ''; const m = /^letter:([a-z-]+):/.exec(k); return m ? m[1] : null; };
  const GENERIC_ALT = /\(letter \d+ |\(quirky mnemonics\)/;
  for (const r of recs) {
    r.oldConcept = '';
    if (!r.path.startsWith('assets/img/gen/')) continue;
    const id = r.stem, lid = letterKeyOf(id); if (!lid) continue;
    r.letterKey = lid + ':' + (idInfo.get(id).key.split(':')[2] || '');
    const c = conceptById.get(lid); if (!c || !c.inChain) continue;
    const alt = idInfo.get(id).alt || '';
    if (GENERIC_ALT.test(alt)) { r.oldConcept = 'unclassified(alt text is a file-name label)'; continue; }
    const altW = words(alt), hits = c.onlyOld.filter((w) => altW.has(w));
    const sharesCurrent = [...altW].some((w) => c.newW.has(w));
    if (hits.length) r.oldConcept = 'alt-names-retired-word:' + hits.join('+');
    else if (!sharesCurrent) r.oldConcept = 'weak:alt-shares-no-word-with-current-picture';
  }
  const mnemonicReaders = [];
  for (const f of tracked.filter((p) => p.startsWith('src/') && p.endsWith('.js'))) {
    const lines = readFileSync(join(ROOT, f), 'utf8').split('\n');
    if (!lines.some((l) => /mnemonics/.test(l))) continue;
    lines.forEach((line, i) => { if (/\b(m|mn|M)\.(story|altStory|word|wordSound|wordMeaning|shape|reason|caption|imageIdea)\b/.test(line)) mnemonicReaders.push(`${f}:${i + 1}`); });
  }

  // --- learner / offline status
  for (const r of recs) {
    const genFile = r.path.startsWith('assets/img/gen/'), id = r.stem;
    r.indexed = genFile ? indexedFiles.has(r.path) : null;
    r.approved = genFile ? approvedIds.has(id) : null;
    const appRef = r.refs.app + r.refs.data;     // src/, html, manifest, data/ (non-provenance)
    if (!r.deployed) r.learner = 'not deployed (repo only)';
    else if (genFile) r.learner = !r.indexed ? 'deployed, not in resolver index (unreachable)' : r.approved ? 'shown to learners (approved)' : 'deployed, hidden (unapproved)';
    else if (r.path.startsWith('assets/img/placeholders/')) r.learner = appRef ? 'referenced by app' : 'deployed, not used by app (book fallback only)';
    else r.learner = appRef ? 'referenced by app' : 'deployed, no app reference found';
    r.offline = r.refs.precache === 1 ? 'precached at install' : r.refs.precache === 2 ? 'on-demand list' : !r.deployed ? 'no' : 'runtime-cache only if fetched';
  }

  return { tracked, recs, index, approvedIds, genManifest, idInfo, expected, indexMissingFiles, pre, brokenRefs, dynamic, dupGroups, stemVariantGroups, nameCollisions, concepts, mnemonicReaders, textFiles, mn, mnHeadUsed: !!mnHead };
}

// ---------------------------------------------------------------------------------------------------- report
function agg(recs, keyFn) {
  const m = new Map();
  for (const r of recs) { const k = keyFn(r); const a = m.get(k) || { n: 0, b: 0 }; a.n++; a.b += r.bytes; m.set(k, a); }
  return [...m.entries()].sort((a, b) => b[1].b - a[1].b);
}

export function report(R) {
  const { recs } = R, L = [];
  const total = recs.reduce((n, r) => n + r.bytes, 0);
  const gen = recs.filter((r) => r.path.startsWith('assets/img/gen/'));
  const genStems = new Set(gen.map((r) => r.stem));
  const ph = recs.filter((r) => r.placeholder);
  const phFolder = recs.filter((r) => r.path.startsWith('assets/img/placeholders/'));
  L.push('# Asset inventory: usage, size and variants');
  L.push('');
  L.push('Generated by `node tools/images/inventory.mjs` (read-only; it never deletes or moves anything and does not run `tools/build-precache.mjs`). Every number below was computed from the tracked files of this checkout (`git ls-files`). No screen was opened, so "shown to learners" is derived from the resolver rules and the data files, not from a walk through the app. Re-run the tool to refresh this file and `docs/qa/asset-inventory.csv`.');
  L.push('');
  L.push('## 1. Headline counts');
  L.push('');
  const ext = agg(recs, (r) => r.ext);
  L.push(`Tracked image files: **${recs.length}** (${fmtMB(total)} MB). These are file counts, not unique finished illustrations: each generated picture is stored at two sizes.`);
  L.push('');
  L.push(table(['Extension', 'Files', 'MB'], ext.map(([k, v]) => [k, v.n, fmtMB(v.b)])));
  L.push('');
  L.push(`- Generated WebP files in \`assets/img/gen/\`: **${gen.length}** files covering **${genStems.size}** distinct image ids (long-edge variants: ${[...new Set(gen.map((r) => r.edge))].sort((a, b) => a - b).join(', ')} px).`);
  L.push(`- Placeholder SVGs by the detector: **${ph.length}**; files in \`assets/img/placeholders/\`: **${phFolder.length}**; in-folder files the detector rejects: **${phFolder.filter((r) => !r.placeholder).length}**; detector hits outside that folder: **${ph.filter((r) => !r.path.startsWith('assets/img/placeholders/')).length}**.`);
  L.push(`- Approved generated images (\`data/images/approvals.json\`): **${R.approvedIds.size}**. Entries in \`data/images/generated-manifest.json\` (the book's approved list): **${Object.keys(R.genManifest.images || {}).length}**.`);
  L.push('');
  L.push('## 2. Size by category');
  L.push('');
  L.push(table(['Category', 'Files', 'MB', 'Share of MB'], agg(recs, (r) => r.cat).map(([k, v]) => [k, v.n, fmtMB(v.b), (100 * v.b / total).toFixed(1) + '%'])));
  L.push('');
  L.push('By top folder and extension:');
  L.push('');
  L.push(table(['Folder', 'Ext', 'Files', 'MB'], agg(recs, (r) => r.top + '|' + r.ext).map(([k, v]) => [...k.split('|'), v.n, fmtMB(v.b)])));
  L.push('');
  L.push('Generated art by variant edge:');
  L.push('');
  L.push(table(['Edge px', 'Files', 'MB', 'Avg KB'], agg(gen, (r) => r.edge).map(([k, v]) => [k, v.n, fmtMB(v.b), fmtKB(v.b / v.n)])));
  L.push('');

  L.push('## 3. What ships and what is cached offline');
  L.push('');
  L.push('Rules read from the code (not executed):');
  L.push('');
  L.push('- Deployed (`tools/build-static.mjs`): copies `src/`, `assets/`, `data/`, `audio/`; excludes `tools`, `node_modules`, `_*` folders, non-json files under `data/` and everything under `data/images/`. So every image under `assets/` is deployed, and images under `data/photo/`, `docs/`, `book/` are not.');
  L.push('- Precache (`tools/build-precache.mjs`): skips `assets/img/`, `assets/images/`, `assets/vendor/`, `assets/workbook/`, `data/images/`; the first-day letter pictures stay in the install; `assets/screens/`, `assets/screenshots/` and the other `assets/letters/morph/` pictures are on-demand. The lists below are read from the committed `precache-manifest.js` (version `' + R.pre.version + '`), so they are only as fresh as that file.');
  L.push('- Learner visibility of generated art (`src/img/resolve.js`): an image is returned only if it is in `data/img/index.json`, its file exists, and it is approved in `data/images/approvals.json` (unless the learner turns on "show unapproved images"). Otherwise nothing is drawn.');
  L.push('');
  L.push(table(['Learner status', 'Files', 'MB'], agg(recs, (r) => r.learner).map(([k, v]) => [k, v.n, fmtMB(v.b)])));
  L.push('');
  L.push(table(['Offline status', 'Files', 'MB'], agg(recs, (r) => r.offline).map(([k, v]) => [k, v.n, fmtMB(v.b)])));
  L.push('');
  const cross = new Map();
  for (const r of recs) { const k = r.cat + '|' + r.learner + '|' + r.offline; const a = cross.get(k) || { n: 0, b: 0 }; a.n++; a.b += r.bytes; cross.set(k, a); }
  L.push('Category by status:');
  L.push('');
  L.push(table(['Category', 'Learner status', 'Offline', 'Files', 'MB'], [...cross.entries()].sort((a, b) => b[1].b - a[1].b).map(([k, v]) => [...k.split('|'), v.n, fmtMB(v.b)])));
  L.push('');
  const dep = recs.filter((r) => r.deployed), repoOnly = recs.filter((r) => !r.deployed);
  const pc = recs.filter((r) => r.refs.precache === 1), od = recs.filter((r) => r.refs.precache === 2);
  const sum = (a) => fmtMB(a.reduce((n, r) => n + r.bytes, 0));
  L.push(`Totals: deployed **${dep.length}** files / ${sum(dep)} MB; repo only (docs, book, fixtures) **${repoOnly.length}** files / ${sum(repoOnly)} MB; precached at install **${pc.length}** files / ${sum(pc)} MB; on-demand list **${od.length}** files / ${sum(od)} MB.`);
  L.push('');
  const shown = recs.filter((r) => r.learner === 'shown to learners (approved)');
  L.push(`Generated pictures a learner can see today with default settings: **${shown.length}** files. ${gen.filter((r) => r.learner === 'deployed, hidden (unapproved)').length} indexed generated files are deployed but hidden until approved; ${gen.filter((r) => r.learner.startsWith('deployed, not in')).length} generated files are not in the resolver index at all.`);
  L.push('');
  L.push('Precached or on-demand images:');
  L.push('');
  L.push(table(['File', 'Bytes', 'Offline', 'Referenced from'], [...pc, ...od].map((r) => [r.path, r.bytes, r.refs.precache === 1 ? 'install' : 'on demand', r.refFiles.slice(0, 3).join('; ') || '(list only)'])));
  L.push('');

  L.push('## 4. Where each file is referenced');
  L.push('');
  L.push('Reference evidence: full path in text (relative paths resolved against the referencing file), `${...}` or `+` path templates expanded against tracked files, image-id stems (assets/img only), and the id expansion of `data/img/index.json`. A bare file name that matches only by name is counted as weak and not as a reference.');
  L.push('');
  const refRows = [];
  for (const [cat] of agg(recs, (r) => r.cat)) {
    const g = recs.filter((r) => r.cat === cat), c = (k) => g.filter((r) => r.refs[k] > 0).length;
    const none = g.filter((r) => !['app', 'data', 'index', 'book', 'docs', 'tools', 'provenance', 'precache'].some((k) => r.refs[k]));
    const notLive = g.filter((r) => !r.refs.app && !r.refs.data && !r.refs.index && !r.refs.precache);
    refRows.push([cat, g.length, c('app'), c('data'), c('index'), c('book'), c('tools'), c('provenance'), c('docs'), none.length, notLive.length]);
  }
  L.push(table(['Category', 'Files', 'src/html/manifest', 'data/', 'resolver index', 'book/', 'tools/tests', 'data/images provenance', 'docs/', 'no reference anywhere', 'no app/data/index/precache reference'], refRows));
  L.push('');
  L.push('Template patterns in src/data/book that matched tracked images:');
  L.push('');
  L.push(table(['File', 'Pattern', 'Files matched'], R.dynamic.filter((d) => !d.file.startsWith('tools/')).map((d) => [d.file, d.pattern, d.matches])));
  L.push('');

  L.push('## 5. Placeholder SVGs');
  L.push('');
  L.push('Detector (`isPlaceholderSvg` in the tool): an SVG is a placeholder when it has a text node that is exactly `PLACEHOLDER`, at most 4 drawing elements, under 2 KB, and either `aria-label="placeholder for ..."` or a dashed outline. `--self-test` runs it on 7 samples (positive, negative, edge) and on every tracked SVG: all files in `assets/img/placeholders/` must be detected and no SVG elsewhere may be. Output of that run:');
  L.push('');
  const st = selfTest(R.tracked);
  L.push('```');
  st.lines.forEach((x) => L.push(x));
  L.push('```');
  L.push('');
  const phStems = new Set(phFolder.map((r) => r.stem));
  const withGen = [...phStems].filter((s) => genStems.has(s));
  L.push(`${phFolder.length} placeholders total ${sum(phFolder)} MB (avg ${fmtKB(phFolder.reduce((n, r) => n + r.bytes, 0) / Math.max(1, phFolder.length))} KB). Placeholders whose stem also has a generated image: **${withGen.length}**; with no generated image: **${phStems.size - withGen.length}**. Placeholders referenced from \`src/\`, html, manifest or non-provenance \`data/\`: **${phFolder.filter((r) => r.refs.app || r.refs.data).length}**; referenced from \`book/\`: **${phFolder.filter((r) => r.refs.book).length}**. The app resolver (\`src/img/resolve.js\`) draws nothing when there is no approved image, so it never draws a placeholder; the book resolver (\`book/img.js\`) uses them as the fallback.`);
  L.push('');

  L.push('## 6. Duplicates and variants');
  L.push('');
  const dupExtra = R.dupGroups.reduce((n, g) => n + g.slice(1).reduce((m, r) => m + r.bytes, 0), 0);
  L.push('### 6a. Identical content (sha256)');
  L.push('');
  L.push(`**${R.dupGroups.length}** groups, **${R.dupGroups.reduce((n, g) => n + g.length, 0)}** files; bytes held by the extra copies: **${fmtMB(dupExtra)} MB**.`);
  L.push('');
  const dupRows = R.dupGroups.map((g) => ({ g, extra: g.slice(1).reduce((m, r) => m + r.bytes, 0) })).sort((a, b) => b.extra - a.extra);
  L.push(table(['Group', 'Copies', 'Bytes each', 'Extra KB', 'Files (first 4)'], dupRows.slice(0, 40).map(({ g, extra }) => [g[0].dup, g.length, g[0].bytes, fmtKB(extra), g.slice(0, 4).map((r) => r.path).join('; ') + (g.length > 4 ? ' ...' : '')])));
  if (dupRows.length > 40) L.push(`\n(${dupRows.length - 40} smaller groups are in the CSV, column dup_group.)`);
  L.push('');
  L.push('Duplicate groups by the categories they span (extra copies only):');
  L.push('');
  const pairs = new Map();
  for (const g of R.dupGroups) { const k = [...new Set(g.map((r) => r.cat))].sort().join(' + '); const a = pairs.get(k) || { n: 0, b: 0 }; a.n++; a.b += g.slice(1).reduce((m, r) => m + r.bytes, 0); pairs.set(k, a); }
  L.push(table(['Categories in group', 'Groups', 'Extra MB'], [...pairs.entries()].sort((a, b) => b[1].b - a[1].b).map(([k, v]) => [k, v.n, fmtMB(v.b)])));
  L.push('');
  L.push('### 6b. Same stem in more than one format (assets/img)');
  L.push('');
  const kinds = new Map();
  for (const v of R.stemVariantGroups) {
    const k = [...new Set(v.files.map((r) => (r.path.startsWith('assets/img/placeholders/') ? 'placeholder.svg' : r.path.startsWith('assets/img/gen/') ? 'gen.webp' : r.path.startsWith('assets/img/refs/') ? 'refs.png' : r.ext + ' (' + r.top + ')')))].sort().join(' + ');
    const a = kinds.get(k) || { n: 0, f: 0, b: 0 }; a.n++; a.f += v.files.length; a.b += v.files.reduce((m, r) => m + r.bytes, 0); kinds.set(k, a);
  }
  L.push(table(['Combination of formats for one stem', 'Stems', 'Files', 'MB'], [...kinds.entries()].sort((a, b) => b[1].n - a[1].n).map(([k, v]) => [k, v.n, v.f, fmtMB(v.b)])));
  L.push('');
  const edgeCount = new Map(); for (const r of gen) edgeCount.set(r.stem, (edgeCount.get(r.stem) || 0) + 1);
  const dist = new Map(); for (const c of edgeCount.values()) dist.set(c, (dist.get(c) || 0) + 1);
  const pairBigger = [...edgeCount.keys()].map((s) => { const a = gen.find((r) => r.stem === s && r.edge === 800), b = gen.find((r) => r.stem === s && r.edge !== 800); return a && b ? [a, b] : null; }).filter(Boolean);
  L.push(`Edge variants: each generated id is stored at 800 px and at a larger edge, as the resolver expects; those pairs are intended variants, not duplicates. Files per id: ${[...dist.entries()].map(([k, v]) => `${k} files: ${v} ids`).join('; ')}. Ids whose larger variant is not larger in bytes than the 800 px file: **${pairBigger.filter(([a, b]) => b.bytes <= a.bytes).length}** of ${pairBigger.length}.`);
  L.push('');
  L.push('### 6c. Same file name, different content');
  L.push('');
  L.push(`${R.nameCollisions.length} base names occur in more than one place with different content (groups entirely inside docs/qa excluded). First 15:`);
  L.push('');
  L.push(table(['Name', 'Copies', 'Locations'], R.nameCollisions.slice(0, 15).map(([n, g]) => [n, g.length, g.slice(0, 3).map((r) => r.path).join('; ')])));
  L.push('');

  L.push('## 7. Broken references');
  L.push('');
  L.push('Paths with an image extension named in `src/`, `data/` (excluding `data/images/` provenance tables and the id index), `index.html`, `offline.html`, `manifest.webmanifest` and `sw.js` that do not resolve to a tracked file (tried from the repo root and from the referencing file). Paths built at run time (`${...}`, `+`) are expanded in section 4 instead.');
  L.push('');
  if (R.brokenRefs.length) L.push(table(['File', 'Line', 'Reference', 'Tried'], R.brokenRefs.slice(0, 80).map((b) => [b.file, b.line, b.ref, b.resolved])));
  else L.push('None found.');
  L.push('');
  L.push(`Resolver index (\`data/img/index.json\`): its rows name ${R.expected.length} image files; **${R.indexMissingFiles.length}** of them are not tracked in \`assets/img/gen/\`. ${recs.filter((r) => r.path.startsWith('assets/img/gen/') && !r.indexed).length} tracked generated files are not named by any index row.`);
  if (R.indexMissingFiles.length) { L.push(''); L.push(table(['Missing file', 'Image id'], R.indexMissingFiles.slice(0, 40).map(([f, id]) => [f, id]))); }
  const orphanApprovals = [...R.approvedIds].filter((id) => !R.idInfo.has(id));
  L.push('');
  L.push(`Approval ids that are not in the index: ${orphanApprovals.length}.`);
  L.push('');

  L.push('## 8. Retired art concepts');
  L.push('');
  L.push(`Baseline: \`data/letters/mnemonics.json\` ${R.mnHeadUsed ? 'as committed at HEAD (the text the existing generated art was briefed from; the working copy may already be rewritten, see the last column)' : 'from the working tree'} against the current picture in \`data/letters/memory-chain.json\` (drawn in \`assets/letters/morph/<id>.svg\`). Two word-overlap tests, both heuristics: the subject of the old idea (words before the first "with", comma, "beside", "on", "in"; decorative adjectives dropped) is kept if any of its words occurs in the current idea; the whole-idea overlap is the share of old content words found in the current idea. Read the two ideas side by side before acting on a row.`);
  L.push('');
  const subjCh = R.concepts.filter((c) => c.subjectChanged), detCh = R.concepts.filter((c) => c.detailsChanged), same = R.concepts.filter((c) => c.inChain && !c.subjectChanged && !c.detailsChanged);
  L.push(`Letters in mnemonics.json: ${R.concepts.length}; in the memory chain: ${R.concepts.filter((c) => c.inChain).length}. Subject changed: **${subjCh.length}**; subject kept but details changed (overlap under 0.6): **${detCh.length}**; essentially unchanged: ${same.length}. Letters whose working-copy imageIdea already differs from HEAD: ${R.concepts.filter((c) => c.workingTreeDiffers).length}.`);
  L.push('');
  const lettersOf = (id) => recs.filter((r) => r.letterKey && r.letterKey.split(':')[0] === id);
  const rowFor = (c) => { const f = lettersOf(c.id); return [c.id, c.subjectChanged ? 'subject changed' : 'details changed', c.overlap.toFixed(2), c.oldIdea, c.newIdea, c.onlyOld.join(' '), f.length, f.filter((r) => r.oldConcept.startsWith('alt-names')).length, f.filter((r) => r.oldConcept.startsWith('weak:alt-shares')).length, f.filter((r) => r.oldConcept.startsWith('unclassified')).length, c.workingTreeDiffers ? 'yes' : 'no']; };
  L.push(table(['Letter', 'Change', 'Overlap', 'Old idea (HEAD mnemonics)', 'Current idea (memory chain)', 'Old-only words', 'Letter-keyed gen files', 'Alt names old-only word', 'Alt shares no word with current', 'Alt is a file-name label', 'Working copy differs from HEAD'], [...subjCh, ...detCh].map(rowFor)));
  L.push('');
  const oc = recs.filter((r) => r.oldConcept);
  const allLetterFiles = recs.filter((r) => r.letterKey);
  L.push(`Letter-keyed generated files (index key \`letter:<id>:<variant>\`): **${allLetterFiles.length}** (${sum(allLetterFiles)} MB). With the CSV column \`old_concept\` set: **${oc.length}** (${sum(oc)} MB): ${oc.filter((r) => r.oldConcept.startsWith('alt-names')).length} whose index alt text names a word found only in the old idea, ${oc.filter((r) => r.oldConcept.startsWith('weak:alt-shares')).length} whose alt text shares no word with the current picture idea (a weak signal: alt text often describes a scene or a character rather than the picture idea), ${oc.filter((r) => r.oldConcept.startsWith('unclassified')).length} whose alt text is only a file-name label (the tool cannot tell what they show; the picture itself was not inspected).`);
  L.push('');
  L.push(table(['Status of flagged files', 'Files', 'MB'], agg(oc, (r) => r.learner).map(([k, v]) => [k, v.n, fmtMB(v.b)])));
  L.push('');
  const byKind = new Map();
  for (const r of allLetterFiles) { const v = r.letterKey.split(':')[1] || '(none)'; const a = byKind.get(v) || { n: 0, b: 0, o: 0 }; a.n++; a.b += r.bytes; if (r.oldConcept) a.o++; byKind.set(v, a); }
  L.push(table(['Letter-keyed variant', 'Files', 'MB', 'Flagged'], [...byKind.entries()].sort((a, b) => b[1].b - a[1].b).map(([k, v]) => [k, v.n, fmtMB(v.b), v.o])));
  L.push('');
  L.push('Unchanged by the tests: ' + same.map((c) => c.id + ' (' + c.overlap.toFixed(2) + ')').join(', ') + '.');
  L.push('');
  L.push('What still ships of the old text (mnemonics.json is fetched by the app; the memory chain hides story, word and altStory only where a view checks for it):');
  L.push('');
  L.push(`- Variants not in the chain: ${(R.mn.variants || []).map((v) => v.id + (v.parent ? ' (parent ' + v.parent + ')' : '')).join(', ')}.`);
  L.push('- Source lines in files that load mnemonics.json and read `story`, `word`, `shape`, `altStory`, `reason` or `caption` (check each for a chain gate; the atlas and trace views test `chained`): ' + (R.mnemonicReaders.length ? R.mnemonicReaders.map((x) => '`' + x + '`').join(', ') : 'none') + '.');
  L.push('');

  L.push('## 9. Top 20 largest files');
  L.push('');
  L.push(table(['#', 'File', 'KB', 'Category', 'Learner status', 'Offline', 'Duplicate group'], [...recs].sort((a, b) => b.bytes - a.bytes).slice(0, 20).map((r, i) => [i + 1, r.path, fmtKB(r.bytes), r.cat, r.learner, r.offline, r.dup || ''])));
  L.push('');
  L.push('Largest 10 among deployed files:');
  L.push('');
  L.push(table(['#', 'File', 'KB', 'Learner status'], [...dep].sort((a, b) => b.bytes - a.bytes).slice(0, 10).map((r, i) => [i + 1, r.path, fmtKB(r.bytes), r.learner])));
  L.push('');

  L.push('## 10. Safe actions');
  L.push('');
  L.push('Nothing in this task deletes or moves an asset. These are candidates for a later, reviewed change; each keeps references and provenance intact and none removes a whole category.');
  L.push('');
  L.push('1. Use the status table (section 3) as the map of what is live. `assets/img/gen/` is deployed but hidden until images are approved; do not prune it by size before the approval pass decides which ids stay. When ids are rejected, move their files to an underscore-prefixed folder (skipped by the build) only in the same change that updates `data/img/index.json` and the `data/images/*.csv` rows, and keep the CSV row and the `data/images/provenance.json` entry.');
  L.push('2. Byte-identical duplicates (6a): keep one canonical file per group and repoint references first (the CSV `ref_files` column lists where each is named). Start with groups inside one category; do not touch a group that spans a deployed and a repo-only copy until the deployed path is confirmed unused.');
  L.push('3. Retired-concept art (section 8): do not delete. Mark the affected ids rejected in the approvals/review notes so they cannot be approved by accident, keep the files and prompts for provenance, and regenerate from the current chain idea. Separately, gate the app text that still prints the old story (the source lines listed in section 8).');
  L.push('4. Placeholders: they are rebuilt from `data/images/prompt-groups.json` by `tools/images/make_placeholders.mjs`. Where a placeholder has a generated image of the same stem and no book or app reference, it is a candidate to stop shipping in `assets/` (in the build, not out of git). Keep the folder for stems with no generated image.');
  L.push('5. Repo-only images (QA screenshots, fixtures, reference images) cost no learner bytes; shrinking them is optional hygiene. Before touching a `docs/qa/` shot, search the `.md` files for its name.');
  L.push('6. Fix every row in section 7 first: a broken path costs a learner a failed request, whereas an unused file costs nothing at runtime.');
  L.push('7. Before any removal: run the unit tests and `node tools/meta/scan.mjs --text`, re-run this tool, and check that the CSV diff shows only the intended rows. Regenerate `precache-manifest.js` only through its build tool, never by hand.');
  L.push('');
  L.push('## 11. Method and limits');
  L.push('');
  L.push('- Scope: tracked files only (`git ls-files`); untracked or ignored files (for example `dist/`, `data/images/sheets/`) are not counted.');
  L.push('- Image dimensions were not measured (no image decoder is used); sizes are bytes on disk.');
  L.push(`- Text scanned for references: ${R.textFiles.length} tracked text files, each up to ${MAX_TEXT / 1048576} MB. Reference by stem (assets/img ids) is a token match and can over-count where an id appears in prose; name-only matches are in the CSV (\`ref_weak_name\`) and not used in the tables.`);
  L.push('- "Shown to learners" follows the resolver rules and the approvals file; a screen that bypasses the resolver would not be seen by this tool.');
  L.push('- Duplicate detection is exact (sha256); visually similar pictures are not detected.');
  L.push('');
  return L.join('\n');
}

export function csv(R) {
  const head = ['path', 'category', 'ext', 'bytes', 'sha256_12', 'stem', 'edge_px', 'placeholder', 'deployed', 'learner_status', 'offline', 'indexed', 'approved', 'ref_app', 'ref_data', 'ref_index', 'ref_book', 'ref_docs', 'ref_tools', 'ref_provenance', 'ref_weak_name', 'dup_group', 'old_concept', 'ref_files'];
  const rows = R.recs.map((r) => [r.path, r.cat, r.ext, r.bytes, r.sha.slice(0, 12), r.stem, r.edge ?? '', r.placeholder ? 1 : 0, r.deployed ? 1 : 0, r.learner, r.offline, r.indexed ?? '', r.approved ?? '', r.refs.app, r.refs.data, r.refs.index, r.refs.book, r.refs.docs, r.refs.tools, r.refs.provenance, r.refs.weak, r.dup || '', r.oldConcept, r.refFiles.join('; ')]);
  return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  if (a.includes('--self-test')) {
    const tracked = git('ls-files', '-z').split('\0').filter(Boolean);
    const { lines, bad } = selfTest(tracked); console.log(lines.join('\n')); console.log(bad ? `FAIL: ${bad}` : 'PASS'); process.exit(bad ? 1 : 0);
  }
  const R = run();
  const md = report(R);
  if (a.includes('--stdout')) console.log(md);
  else {
    writeFileSync(join(ROOT, opt('--out-md', 'docs/qa/ASSET-INVENTORY.md')), md);
    writeFileSync(join(ROOT, opt('--out-csv', 'docs/qa/asset-inventory.csv')), csv(R));
    console.log(`wrote ${R.recs.length} rows`);
  }
}
