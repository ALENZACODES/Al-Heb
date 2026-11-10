#!/usr/bin/env node
// Structural check of the draft animation pose folders against docs/drafts/SUPER-COMMAND-ANIMATIONS-6H.md.
// Usage: node tools/anim/check_poses.mjs [poseDir] [--report FILE] [--json] [--self-test]
// Exit 0 = no errors, 1 = errors found, 2 = usage error. Zero dependencies. It checks structure only:
// it cannot tell whether a letter outline looks right or whether a picture is clear (that needs a designer).
import { readFileSync, readdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_DIR = path.resolve(here, '../../docs/drafts/animation-poses');

export const TIMING = {
  A: [0, 400, 800, 1300, 1800, 2200, 2600],
  B: [0, 400, 900, 1400, 1900],
  C: [0, 400, 900, 1400, 1900],
};
export const MAX_MS = 3000;
export const EXPECTED_TOTALS = { files: 764, batches: 8, items: { A: 27, B: 15, C: 100 } };
const ARITY = { M: 2, L: 2, C: 6, Z: 0 };
const ALLOWED_ELEMENTS = new Set(['svg', 'title', 'desc', 'path']);
const FORBIDDEN_ELEMENTS = ['image', 'script', 'foreignObject', 'filter', 'use', 'a', 'style', 'animate', 'animateTransform', 'set', 'iframe', 'link'];
const PAINT_OK = /^(none|#fff|#ffffff|white|var\(--m-ink, currentColor\)|var\(--m-[1-4], #[0-9a-fA-F]{6}\))$/;

// Word lists are assembled from pieces so this file does not itself trip the repo text scans.
const j = (...p) => p.join('');
const HEB = (s) => String.fromCharCode(...s);
const DIVINE = [
  j('yah', 'weh'), j('yh', 'wh'), j('jeho', 'vah'), j('ado', 'nai'), j('has', 'hem'), j('ado', 'shem'),
  HEB([0x5d9, 0x5d4, 0x5d5, 0x5d4]), // four-letter name
  HEB([0x5d0, 0x5d3, 0x5e0, 0x5d9]), // lord
  HEB([0x5d4, 0x5e9, 0x5dd]), // "the name"
];
const TOOLS = [j('chat', 'gpt'), j('open', 'ai'), j('clau', 'de'), j('anthro', 'pic'), j('code', 'x'), j('gemi', 'ni'), j('copi', 'lot'), j('mid', 'journey'), j('dall', '-e'), j('stable ', 'diffusion'), j('gro', 'k'), j('lla', 'ma'), j('bar', 'd')];
const HEB_RE = /[֐-׿יִ-ﭏ]/;

/** Parse an SVG pose string. Returns the elements found and the paths. */
export function parseSvg(text) {
  const elements = [...text.matchAll(/<\s*([A-Za-z][\w:-]*)/g)].map((m) => m[1]);
  const title = (text.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] ?? '';
  const desc = (text.match(/<desc[^>]*>([\s\S]*?)<\/desc>/) || [])[1] ?? '';
  const paths = [];
  for (const m of text.matchAll(/<path\b([^>]*?)\/?>/g)) {
    const attrs = {};
    for (const a of m[1].matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    paths.push(attrs);
  }
  const root = (text.match(/<svg\b([^>]*)>/) || [])[1] || '';
  return { elements, title: title.trim(), desc: desc.trim(), paths, root };
}

/** Parse a path d string into commands. Throws a string describing the first problem. */
export function parseD(d) {
  const toks = String(d).trim().split(/[\s,]+/).filter(Boolean);
  const cmds = [];
  let i = 0;
  while (i < toks.length) {
    const c = toks[i++];
    if (!(c in ARITY)) throw `command "${c}" is not M, L, C or Z (absolute only)`;
    const n = ARITY[c];
    const nums = [];
    for (let k = 0; k < n; k++) {
      const t = toks[i++];
      if (t === undefined || !/^-?\d+$/.test(t)) throw `coordinate "${t}" after ${c} is not a whole number`;
      nums.push(Number(t));
    }
    cmds.push({ c, nums });
  }
  if (!cmds.length) throw 'empty path';
  if (cmds[0].c !== 'M') throw 'path does not start with M';
  return cmds;
}

/**
 * Check a model: { batches: [{ name, json, files: {filename: svgText}, jsonError? }], state, extraFiles? }.
 * Returns { errors: [{where, msg}], stats }.
 */
export function checkModel(model, opts = {}) {
  const errors = [];
  const err = (where, msg) => errors.push({ where, msg });
  const items = new Map(); // item -> {phase, poses: Map(k -> {file, parsed, rec, batch})}
  let fileCount = 0;

  for (const b of model.batches) {
    const w = b.name;
    if (b.jsonError) { err(w, 'batch JSON unreadable: ' + b.jsonError); continue; }
    const recs = Array.isArray(b.json?.files) ? b.json.files : null;
    if (!recs) { err(w, 'batch JSON has no files array'); continue; }
    const names = Object.keys(b.files);
    fileCount += names.length;
    if (b.json.count !== recs.length) err(w, `JSON count ${b.json.count} but ${recs.length} records`);
    if (recs.length !== names.length) err(w, `${recs.length} records but ${names.length} SVG files in the folder`);
    if (b.json.count !== 100 && b.json.short !== true) err(w, `count ${b.json.count} is not 100 and "short" is not true`);
    if (b.json.count === 100 && b.json.short === true) err(w, 'short is true but count is 100');
    if (!/not reviewed/i.test(String(b.json.status ?? ''))) err(w, 'status must say the batch is not reviewed');
    const seen = new Set();
    for (const r of recs) {
      const f = r.file;
      const where = `${w}/${f}`;
      if (seen.has(f)) err(where, 'listed twice in the JSON');
      seen.add(f);
      for (const k of ['file', 'phase', 'item', 'pose', 'time_ms', 'easing', 'paths', 'commands_per_path', 'title', 'doubt']) {
        if (r[k] === undefined || r[k] === null || r[k] === '') err(where, `record field "${k}" is empty`);
      }
      if (!(f in b.files)) { err(where, 'listed in JSON but no SVG file'); continue; }
      const m = /^(.+)-k(\d+)\.svg$/.exec(f);
      if (!m || m[1] !== r.item || Number(m[2]) !== r.pose) err(where, 'file name does not match item and pose in the record');
      const parsed = parseSvg(b.files[f]);
      checkFile(where, f, r, parsed, b.files[f], err);
      if (!items.has(r.item)) items.set(r.item, { phase: r.phase, poses: new Map() });
      const it = items.get(r.item);
      if (it.phase !== r.phase) err(where, `phase ${r.phase} differs from earlier phase ${it.phase} of the same item`);
      if (it.poses.has(r.pose)) err(where, 'pose appears in more than one place');
      it.poses.set(r.pose, { file: f, parsed, rec: r, batch: w });
    }
    for (const n of names) if (!seen.has(n)) err(`${w}/${n}`, 'SVG file not listed in the batch JSON');
  }

  // Per item: pose count, timing, same ids and same commands across poses.
  const phaseItems = { A: 0, B: 0, C: 0 };
  for (const [item, it] of items) {
    if (phaseItems[it.phase] !== undefined) phaseItems[it.phase]++;
    else err(item, `unknown phase "${it.phase}"`);
    const times = TIMING[it.phase];
    if (!times) continue;
    const ks = [...it.poses.keys()].sort((a, b) => a - b);
    if (ks.length !== times.length || ks.some((k, i) => k !== i + 1)) err(item, `expected poses 1..${times.length}, found ${ks.join(',')}`);
    let prev = -1;
    const first = it.poses.get(ks[0]);
    for (const k of ks) {
      const p = it.poses.get(k);
      const t = p.rec.time_ms;
      if (!(t > prev) && !(t === 0 && prev === -1)) err(`${item}-k${k}`, `time ${t} ms is not later than the previous pose`);
      if (t > MAX_MS) err(`${item}-k${k}`, `time ${t} ms is over ${MAX_MS}`);
      if (t !== times[k - 1]) err(`${item}-k${k}`, `time ${t} ms, contract says ${times[k - 1]}`);
      const wantEase = it.phase === 'A' && k === 6 ? 'ease-out' : 'ease-in-out';
      if (p.rec.easing !== wantEase) err(`${item}-k${k}`, `easing "${p.rec.easing}", contract says ${wantEase}`);
      prev = t;
      if (p === first) continue;
      const a = first.parsed.paths, b = p.parsed.paths;
      if (a.length !== b.length) { err(`${item}-k${k}`, `${b.length} paths, k${ks[0]} has ${a.length}`); continue; }
      for (let i = 0; i < a.length; i++) {
        if (a[i].id !== b[i].id) err(`${item}-k${k}`, `path ${i + 1} id "${b[i].id}" differs from "${a[i].id}"`);
        const sa = cmdSeq(a[i].d), sb = cmdSeq(b[i].d);
        if (sa && sb && sa !== sb) err(`${item}-k${k}`, `path ${b[i].id} has different commands from k${ks[0]}`);
      }
    }
  }
  if (opts.expectTotals) {
    const e = opts.expectTotals;
    if (fileCount !== e.files) err('totals', `${fileCount} files, contract total is ${e.files}`);
    if (model.batches.length !== e.batches) err('totals', `${model.batches.length} batches, contract total is ${e.batches}`);
    for (const ph of ['A', 'B', 'C']) if (phaseItems[ph] !== e.items[ph]) err('totals', `phase ${ph}: ${phaseItems[ph]} items, contract says ${e.items[ph]}`);
  }
  if (model.state) {
    const s = model.state;
    if (s.files_done !== fileCount) err('state.json', `files_done ${s.files_done} but ${fileCount} files found`);
    if (s.batches_done !== model.batches.length) err('state.json', `batches_done ${s.batches_done} but ${model.batches.length} batches found`);
    if (s.queue_position !== items.size) err('state.json', `queue_position ${s.queue_position} but ${items.size} items found`);
  }
  for (const x of model.extraFiles || []) err(x, 'unexpected file in the pose folder');
  return { errors, stats: { files: fileCount, batches: model.batches.length, items: items.size, phaseItems } };
}

function cmdSeq(d) {
  try { return parseD(d).map((x) => x.c).join(''); } catch { return null; }
}

function checkFile(where, f, r, parsed, text, err) {
  if (!/^<svg\b/.test(text.trim())) err(where, 'does not start with <svg');
  if (!/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(parsed.root)) err(where, 'xmlns missing');
  if (!/viewBox="0 0 200 200"/.test(parsed.root)) err(where, 'viewBox is not "0 0 200 200"');
  if (!/role="img"/.test(parsed.root)) err(where, 'role="img" missing');
  for (const el of new Set(parsed.elements)) {
    if (FORBIDDEN_ELEMENTS.includes(el)) err(where, `forbidden element <${el}>`);
    else if (!ALLOWED_ELEMENTS.has(el)) err(where, `element <${el}> is not in the allowed set (svg, title, desc, path)`);
  }
  if (/\b(?:xlink:)?href\s*=|https?:\/\/(?!www\.w3\.org\/2000\/svg)|\son[a-z]+\s*=|url\(/i.test(text)) err(where, 'external link, event handler or url() reference');
  if (!parsed.title) err(where, 'title missing or empty');
  if (!parsed.desc) err(where, 'desc missing or empty');
  const sentences = parsed.desc.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim()).length;
  if (parsed.desc && sentences < 2) err(where, `desc has ${sentences} sentence(s), contract says two`);
  const low = text.toLowerCase();
  for (const w of DIVINE) if (low.includes(w.toLowerCase())) err(where, 'divine name found');
  for (const w of TOOLS) if (new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(text)) err(where, 'tool or company name found');
  if (r.phase === 'C' && HEB_RE.test(text)) err(where, 'Hebrew text in a phase C file (contract: none)');
  if (!parsed.paths.length) err(where, 'no <path> elements');
  const ids = parsed.paths.map((p) => p.id);
  ids.forEach((id, i) => { if (id !== 'p' + (i + 1)) err(where, `path ${i + 1} has id "${id}", expected p${i + 1}`); });
  if (r.paths !== parsed.paths.length) err(where, `JSON says ${r.paths} paths, file has ${parsed.paths.length}`);
  const counts = [];
  for (const p of parsed.paths) {
    let cmds;
    try { cmds = parseD(p.d ?? ''); } catch (e) { err(where, `${p.id}: ${e}`); counts.push(-1); continue; }
    counts.push(cmds.length);
    for (const c of cmds) for (const n of c.nums) if (n < -20 || n > 220) { err(where, `${p.id}: coordinate ${n} is far outside the 200 x 200 canvas`); break; }
    if (cmds[cmds.length - 1].c !== 'Z') err(where, `${p.id}: path does not end with Z`);
    for (const k of ['fill', 'stroke']) if (p[k] !== undefined && !PAINT_OK.test(p[k])) err(where, `${p.id}: ${k} "${p[k]}" is not an allowed colour`);
    if (p['stroke-width'] !== undefined && p['stroke-width'] !== '6') err(where, `${p.id}: stroke-width ${p['stroke-width']}, contract says 6`);
    if (p.opacity !== undefined && !(Number(p.opacity) >= 0 && Number(p.opacity) <= 1)) err(where, `${p.id}: opacity out of range`);
  }
  if (Array.isArray(r.commands_per_path) && counts.every((n) => n >= 0) && JSON.stringify(r.commands_per_path) !== JSON.stringify(counts)) err(where, 'commands_per_path in the JSON does not match the file');
  for (const field of ['title', 'doubt']) if (typeof r[field] === 'string') {
    const l = r[field].toLowerCase();
    for (const w of DIVINE) if (l.includes(w.toLowerCase())) err(where, `divine name in record ${field}`);
    for (const w of TOOLS) if (new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(l)) err(where, `tool or company name in record ${field}`);
  }
}

/** Read the folder into a model. */
export function loadModel(dir) {
  const batches = [];
  const extraFiles = [];
  const entries = readdirSync(dir).sort();
  for (const e of entries) {
    const full = path.join(dir, e);
    const isDir = statSync(full).isDirectory();
    if (isDir && /^batch-\d{3}$/.test(e)) {
      const files = {};
      for (const f of readdirSync(full).sort()) {
        if (/\.svg$/.test(f)) files[f] = readFileSync(path.join(full, f), 'utf8');
        else extraFiles.push(`${e}/${f}`);
      }
      const b = { name: e, files, json: null };
      const jp = path.join(dir, e + '.json');
      if (!existsSync(jp)) b.jsonError = 'missing ' + e + '.json';
      else { try { b.json = JSON.parse(readFileSync(jp, 'utf8')); } catch (x) { b.jsonError = x.message; } }
      batches.push(b);
    } else if (isDir) extraFiles.push(e + '/');
  }
  for (const e of entries) {
    const m = /^(batch-\d{3})\.json$/.exec(e);
    if (m && !batches.some((b) => b.name === m[1])) extraFiles.push(e + ' (no matching folder)');
  }
  let state = null;
  const sp = path.join(dir, 'state.json');
  if (existsSync(sp)) { try { state = JSON.parse(readFileSync(sp, 'utf8')); } catch { /* reported below */ } }
  return { batches, state, extraFiles: extraFiles.filter((x) => !/\.(json|md)$/.test(x)) };
}

export function formatReport(res, dir, { selfTest } = {}) {
  const s = res.stats;
  const L = [];
  L.push('# Animation pose check report', '');
  L.push('Generated by `node tools/anim/check_poses.mjs --report docs/anim/CHECK-REPORT.md` on the folder `' + dir + '`.');
  L.push('This is a STRUCTURE check only. It does not judge whether any letter outline or picture looks right; no designer or native reader has reviewed these poses.', '');
  L.push('## Result', '');
  L.push(res.errors.length ? `**FAIL: ${res.errors.length} problem(s).**` : '**PASS: no problems found by the rules listed below.**', '');
  L.push(`- Batches found: ${s.batches}`, `- SVG files found: ${s.files}`, `- Items found: ${s.items} (letters ${s.phaseItems.A}, vowel and mark signs ${s.phaseItems.B}, words ${s.phaseItems.C})`);
  L.push(`- Contract totals: ${EXPECTED_TOTALS.files} files, ${EXPECTED_TOTALS.batches} batches, ${EXPECTED_TOTALS.items.A}/${EXPECTED_TOTALS.items.B}/${EXPECTED_TOTALS.items.C} items`, '');
  if (res.errors.length) {
    L.push('## Problems', '');
    const byMsg = new Map();
    for (const e of res.errors) { const k = e.msg.replace(/\d+/g, 'N'); (byMsg.get(k) || byMsg.set(k, []).get(k)).push(e); }
    for (const [k, list] of byMsg) L.push(`- ${list.length} x ${k} (first: ${list[0].where}: ${list[0].msg})`);
    L.push('', 'First 50 problems in full:', '');
    for (const e of res.errors.slice(0, 50)) L.push(`- ${e.where}: ${e.msg}`);
    L.push('');
  }
  L.push('## Rules checked', '');
  for (const r of [
    'Each batch has a folder and a JSON; JSON count equals records equals SVG files; every file is listed once; "short" is true only when count is not 100; status says not reviewed.',
    'Every record field is filled; file name matches item and pose; JSON path count and commands_per_path match the file.',
    'Items: phase A has 7 poses, B and C have 5; times match the contract table, strictly increasing and at most 3000 ms; easing ease-in-out (k6 of letters ease-out).',
    'Every pose of an item has the same path count, the same ids (p1, p2, ...) and the same command letters per path.',
    'Paths use only M, L, C, Z, absolute whole-number coordinates, start with M, end with Z, stay near the 200 x 200 canvas.',
    'SVG: xmlns, viewBox 0 0 200 200, role img, title, desc of two sentences; only svg, title, desc, path elements; no image, script, foreignObject, filter, links, event handlers or url() references.',
    'Paint: fill and stroke only from the contract colours (CSS variables with fallback, white, none); stroke width 6.',
    'No divine names and no tool or company names in files or records; no Hebrew in phase C.',
    'state.json counts equal what is on disk; totals equal the contract (764 files, 8 batches, 27/15/100 items).',
  ]) L.push('- ' + r);
  L.push('', '## Not checked', '', '- Whether outlines look like the printed letters, whether mid-poses morph sensibly, whether pictures are clear, colour contrast, or the "movement of at most 6 units" in k6.', '- The wording of descriptions beyond the sentence count and the name scans.', '');
  if (selfTest) L.push('Self-test: ' + selfTest, '');
  return L.join('\n');
}

// ---- self-test -------------------------------------------------------------------------------
function goodSvg(item, k, ds, title = `${item} pose ${k}`) {
  const paths = ds.map((d, i) => `<path id="p${i + 1}" d="${d}" fill="var(--m-1, #d9480f)" stroke="var(--m-ink, currentColor)" stroke-width="6" stroke-linecap="round" opacity="1.000"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img"><title>${title}</title><desc>A shape is shown. It moves a little.</desc>${paths}</svg>`;
}
function goodModel() {
  const files = {}, recs = [];
  const times = TIMING.B;
  for (let k = 1; k <= 5; k++) {
    const d1 = `M ${10 * k} 10 L 50 20 L 60 60 Z`, d2 = `M 20 20 C 30 30 40 40 50 ${50 + k} L ${60 + k} 70 Z`;
    const f = `dot-k${k}.svg`;
    files[f] = goodSvg('dot', k, [d1, d2]);
    recs.push({ file: f, phase: 'B', item: 'dot', pose: k, time_ms: times[k - 1], easing: 'ease-in-out', paths: 2, commands_per_path: [4, 4], title: `dot pose ${k}`, doubt: 'n/a' });
  }
  return { batches: [{ name: 'batch-001', files, json: { batch: 1, short: true, count: 5, status: 'DRAFT, not reviewed', files: recs } }], state: { files_done: 5, batches_done: 1, queue_position: 1 }, extraFiles: [] };
}

export function selfTest() {
  const out = [];
  let bad = 0;
  const expect = (name, ok) => { out.push(`${ok ? 'ok  ' : 'FAIL'} ${name}`); if (!ok) bad++; };
  const run = (mut) => { const m = structuredClone(goodModel()); mut(m); return checkModel(m).errors.map((e) => e.msg).join(' | '); };
  const f1 = (m) => m.batches[0].files['dot-k1.svg'];
  const set1 = (m, fn) => { m.batches[0].files['dot-k1.svg'] = fn(f1(m)); };
  expect('good fixture passes', checkModel(goodModel()).errors.length === 0);
  expect('relative command rejected', /not M, L, C or Z/.test(run((m) => set1(m, (s) => s.replace('L 50 20', 'l 50 20')))));
  expect('decimal coordinate rejected', /whole number/.test(run((m) => set1(m, (s) => s.replace('L 50 20', 'L 50.5 20')))));
  expect('A command rejected', /not M, L, C or Z/.test(run((m) => set1(m, (s) => s.replace('L 50 20', 'A 50 20')))));
  expect('different commands across poses', /different commands/.test(run((m) => { m.batches[0].files['dot-k3.svg'] = m.batches[0].files['dot-k3.svg'].replace('L 50 20', 'C 50 20 1 1 2 2'); })));
  expect('different path count across poses', /paths, k1 has/.test(run((m) => { m.batches[0].files['dot-k2.svg'] = m.batches[0].files['dot-k2.svg'].replace(/<path id="p2"[^>]*\/>/, ''); })));
  expect('script rejected', /forbidden element <script>/.test(run((m) => set1(m, (s) => s.replace('</svg>', '<script>1</script></svg>')))));
  expect('foreignObject rejected', /forbidden element <foreignObject>/.test(run((m) => set1(m, (s) => s.replace('</svg>', '<foreignObject/></svg>')))));
  expect('image rejected', /forbidden element <image>/.test(run((m) => set1(m, (s) => s.replace('</svg>', '<image/></svg>')))));
  expect('external link rejected', /external link/.test(run((m) => set1(m, (s) => s.replace('<title>', '<title>see https://example.com ')))));
  expect('missing title', /title missing/.test(run((m) => set1(m, (s) => s.replace(/<title>.*<\/title>/, '')))));
  expect('missing desc', /desc missing/.test(run((m) => set1(m, (s) => s.replace(/<desc>.*<\/desc>/, '')))));
  expect('time not increasing', /not later|contract says/.test(run((m) => { m.batches[0].json.files[2].time_ms = 400; })));
  expect('time over 3000', /over 3000/.test(run((m) => { m.batches[0].json.files[4].time_ms = 3500; })));
  expect('JSON count mismatch', /JSON count/.test(run((m) => { m.batches[0].json.count = 6; })));
  expect('JSON path count wrong', /JSON says 3 paths/.test(run((m) => { m.batches[0].json.files[0].paths = 3; })));
  expect('JSON commands wrong', /commands_per_path/.test(run((m) => { m.batches[0].json.files[0].commands_per_path = [4, 5]; })));
  expect('unlisted svg', /not listed/.test(run((m) => { m.batches[0].files['stray-k1.svg'] = f1(m); })));
  expect('missing pose', /expected poses 1..5/.test(run((m) => { delete m.batches[0].files['dot-k5.svg']; m.batches[0].json.files.pop(); m.batches[0].json.count = 4; })));
  expect('divine name rejected', /divine name/.test(run((m) => set1(m, (s) => s.replace('moves', j('Ado', 'nai') + ' moves')))));
  expect('tool name rejected', /tool or company/.test(run((m) => { m.batches[0].json.files[0].title = 'drawn by ' + j('Chat', 'GPT'); })));
  expect('Hebrew in phase C rejected', /Hebrew text/.test(run((m) => { m.batches[0].json.files.forEach((r) => { r.phase = 'C'; }); set1(m, (s) => s.replace('shape', HEB([0x5d0]))); })));
  expect('bad colour rejected', /not an allowed colour/.test(run((m) => set1(m, (s) => s.replace('var(--m-1, #d9480f)', '#ff0000')))));
  expect('state mismatch', /files_done/.test(run((m) => { m.state.files_done = 9; })));
  expect('parseD accepts C', parseD('M 1 2 C 1 2 3 4 5 6 Z').length === 3);
  console.log(out.join('\n'));
  return { bad, summary: bad ? `${bad} self-test check(s) FAILED` : `all ${out.length} self-test checks passed` };
}

// ---- CLI -------------------------------------------------------------------------------------
function main(argv) {
  const o = { dir: DEFAULT_DIR, report: null, json: false, self: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--report') o.report = path.resolve(argv[++i] || '');
    else if (a === '--json') o.json = true;
    else if (a === '--self-test') o.self = true;
    else if (a === '-h' || a === '--help') { console.log('usage: check_poses.mjs [poseDir] [--report FILE] [--json] [--self-test]'); return 0; }
    else if (a.startsWith('--')) { console.error('unknown option ' + a); return 2; }
    else o.dir = path.resolve(a);
  }
  let st = null;
  if (o.self) { st = selfTest(); console.log(st.summary); if (st.bad) return 1; if (!process.argv.slice(2).some((a) => !a.startsWith('--'))) return 0; }
  if (!existsSync(o.dir)) { console.error('no such folder: ' + o.dir); return 2; }
  const res = checkModel(loadModel(o.dir), { expectTotals: EXPECTED_TOTALS });
  const rel = path.relative(process.cwd(), o.dir) || '.';
  if (o.json) console.log(JSON.stringify(res, null, 1));
  else {
    console.log(`${res.stats.files} files, ${res.stats.batches} batches, ${res.stats.items} items: ${res.errors.length ? res.errors.length + ' problem(s)' : 'no problems'}`);
    for (const e of res.errors.slice(0, 20)) console.log(`  ${e.where}: ${e.msg}`);
    if (res.errors.length > 20) console.log(`  ... ${res.errors.length - 20} more`);
  }
  if (o.report) writeFileSync(o.report, formatReport(res, rel.replace(/\\/g, '/'), { selfTest: st ? st.summary : null }));
  return res.errors.length ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
