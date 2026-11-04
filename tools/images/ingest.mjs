#!/usr/bin/env node
// Ingest pipeline for the ~800 images the author generates by hand in an image generator (see docs/images/README.md).
//
//   node tools/images/ingest.mjs ingest <dir|zip|file> [more inputs...] [--dry-run] [--assign FILE.csv] [--replace] [--no-ocr]
//                                  [--allow-aspect] [--jobs 4] [--tool "..."] [--model "..."] [--root DIR] [--originals DIR]
//   node tools/images/ingest.mjs approve <id|glob...> [--file ids.txt] [--force] [--note "..."]
//   node tools/images/ingest.mjs reject  <id|glob...> [--file ids.txt] [--note "..."]
//   node tools/images/ingest.mjs reset   <id|glob...>               back to the default (unapproved)
//   node tools/images/ingest.mjs apply-decisions decisions.json     {"approve":[ids],"reject":[ids]} exported from a contact sheet
//   node tools/images/ingest.mjs sheets [--block B]                  contact-sheet HTML grids in data/images/sheets/
//   node tools/images/ingest.mjs status | list <missing|unapproved|approved|rejected|flagged> [--block X] [--csv]
//   node tools/images/ingest.mjs manifest                            rebuild data/images/generated-manifest.json from approvals
//
// Nothing is ever matched by guess: a file is ingested only when its name equals a manifest stem (or carries a plain browser
// duplicate suffix like " (1)"), or when YOU assign it in the CSV this tool writes. Everything else is listed, never used.

import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, lstatSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BLOCKING_FLAGS, BLOCKS, TOOL_DEFAULT, buildGeneratedManifest, checkAspect, classifyName, globToRe, isImageName, loadApprovals,
  loadManifest, loadProvenance, makePaths, parseCsv, pool, py, sha256, suggestStems, toCsv, webCap, writeJsonAtomic, writeTextAtomic,
} from './ingest_lib.mjs';
import { writeSheets } from './ingest_sheets.mjs';

const OK_FORMATS = new Set(['PNG', 'JPEG', 'WEBP']);
const EXT_OF = { PNG: 'png', JPEG: 'jpg', WEBP: 'webp' };

function walk(dir, out = [], skipped = [], depth = 0) {
  if (depth > 8) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.name.startsWith('.') || e.name === '__MACOSX') { skipped.push({ name: p, reason: 'hidden/junk' }); continue; }
    if (e.isSymbolicLink()) { skipped.push({ name: p, reason: 'symlink' }); continue; }
    if (e.isDirectory()) walk(p, out, skipped, depth + 1);
    else if (e.isFile()) {
      if (isImageName(e.name)) out.push({ path: p, name: e.name, rel: p, date: statSync(p).mtime.toISOString() });
      else skipped.push({ name: p, reason: 'not an image extension' });
    }
    if (out.length > 6000) throw new Error('more than 6000 files under input: refusing');
  }
  return out;
}

async function collect(inputs, tmpRoots, skipped) {
  const cands = [];
  for (const input of inputs) {
    const p = resolve(input);
    if (!existsSync(p)) throw new Error(`input not found: ${input}`);
    const st = lstatSync(p);
    if (st.isSymbolicLink()) throw new Error(`input is a symlink: ${input}`);
    if (st.isDirectory()) cands.push(...walk(p, [], skipped));
    else if (/\.zip$/i.test(p)) {
      const td = mkdtempSync(join(tmpdir(), 'alef-ingest-')); tmpRoots.push(td);
      const r = await py(['extract', p, td]);
      if (!r.ok) throw new Error(`${input}: ${r.error}`);
      for (const f of r.files) cands.push({ path: f.path, name: f.name, rel: `${basename(p)}!${f.zipPath}`, date: f.zipDate });
      for (const s of r.skipped) skipped.push({ name: `${basename(p)}!${s.name}`, reason: s.reason });
    } else if (isImageName(p)) cands.push({ path: p, name: basename(p), rel: p, date: st.mtime.toISOString() });
    else throw new Error(`unsupported input (want dir, .zip or image): ${input}`);
  }
  return cands;
}

function readAssign(path, stems) {
  const rows = parseCsv(readFileSync(path, 'utf8'));
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const fi = head.indexOf('file'), ai = head.indexOf('assign_id');
  if (fi < 0 || ai < 0) throw new Error(`${path}: needs columns file and assign_id`);
  const map = new Map(); const errors = [];
  for (const r of rows.slice(1)) {
    const id = (r[ai] || '').trim().replace(/\.png$/i, '');
    if (!id) continue;
    if (!stems.has(id)) { errors.push(`assign_id ${JSON.stringify(id)} for ${r[fi]} is not a manifest id`); continue; }
    map.set(r[fi], id);
  }
  return { map, errors };
}

/** Core run. Returns a report object; throws only for unusable input. */
export async function ingest(opts) {
  const paths = opts.paths ?? makePaths(opts.root, { originals: opts.originals });
  const now = opts.now ?? new Date().toISOString();
  const rows = loadManifest(paths.manifest);
  const byStem = new Map(rows.map((r) => [r.stem, r]));
  const stems = new Set(byStem.keys());
  const tmpRoots = []; const skipped = [];
  const report = { at: now, dryRun: !!opts.dryRun, inputs: opts.inputs, counts: {}, ingested: [], unchanged: [], replaced: [], conflicts: [], rejectedFiles: [], unmatched: [], alternates: [], contentDuplicates: [], notes: [], skipped };
  try {
    const cands = await collect(opts.inputs, tmpRoots, skipped);
    const assign = opts.assign ? readAssign(opts.assign, stems) : { map: new Map(), errors: [] };
    report.notes.push(...assign.errors);
    // hash everything once (also used for duplicate detection)
    for (const c of cands) c.sha = sha256(readFileSync(c.path));

    const buckets = new Map(); const none = [];
    const bucket = (s) => { if (!buckets.has(s)) buckets.set(s, { primary: [], variants: [] }); return buckets.get(s); };
    for (const c of cands) {
      const a = assign.map.get(c.rel) ?? assign.map.get(c.name);
      if (a) { bucket(a).primary.push({ ...c, matchedBy: 'assignment-csv' }); continue; }
      const k = classifyName(c.name, stems);
      if (k.kind === 'exact') bucket(k.stem).primary.push({ ...c, matchedBy: 'exact-name' });
      else if (k.kind === 'case') bucket(k.stem).primary.push({ ...c, matchedBy: 'name-ignoring-case' });
      else if (k.kind === 'variant') bucket(k.stem).variants.push({ ...c, matchedBy: 'renamed-duplicate' });
      else none.push({ ...c, reason: 'file name matches no manifest id' });
    }

    const chosen = [];
    const distinct = (list) => [...new Map(list.map((c) => [c.sha, c])).values()];
    for (const [stem, b] of buckets) {
      const prim = distinct(b.primary);
      const varis = distinct(b.variants);
      if (prim.length > 1) { for (const c of [...b.primary, ...b.variants]) none.push({ ...c, reason: `ambiguous: ${prim.length} different files claim ${stem}` }); continue; }
      if (prim.length === 1) {
        chosen.push({ ...prim[0], stem });
        for (const v of b.variants) {
          if (v.sha === prim[0].sha) report.contentDuplicates.push({ file: v.rel, sameAs: prim[0].rel });
          else { report.alternates.push({ file: v.rel, forId: stem, usedInstead: prim[0].rel }); none.push({ ...v, reason: `alternate version of ${stem} (the exact-named file was used)` }); }
        }
        continue;
      }
      if (varis.length === 1) { chosen.push({ ...varis[0], stem }); continue; }
      for (const c of b.variants) none.push({ ...c, reason: `ambiguous: ${varis.length} differently-suffixed files for ${stem}` });
    }

    // identical bytes under two ids = probably a copy/paste mistake
    const bySha = new Map();
    for (const c of chosen) { if (!bySha.has(c.sha)) bySha.set(c.sha, []); bySha.get(c.sha).push(c.stem); }
    for (const [sha, ids] of bySha) if (ids.length > 1) report.contentDuplicates.push({ sha256: sha.slice(0, 12), ids, note: 'identical image bytes assigned to several ids; check' });

    const prov = loadProvenance(paths); const approvals = loadApprovals(paths);
    const jobs = opts.jobs ?? 4;
    const tool = opts.tool ?? TOOL_DEFAULT;

    // unmatched: probe for dims so the CSV is useful
    const probedNone = await pool(none, jobs, async (c) => ({ c, p: await py(['probe', c.path]) }));
    for (const { c, p } of probedNone) {
      report.unmatched.push({
        file: c.rel, name: c.name, reason: c.reason, sha256: c.sha.slice(0, 12), format: p.ok ? p.format : null, width: p.ok ? p.width : null, height: p.ok ? p.height : null,
        suggested: suggestStems(c.name, stems), unreadable: p.ok ? undefined : p.error,
      });
    }

    const results = await pool(chosen, jobs, async (c) => {
      const row = byStem.get(c.stem);
      const p = await py(['probe', c.path]);
      if (!p.ok) return { c, row, reject: `unreadable image: ${p.error}` };
      if (!OK_FORMATS.has(p.format)) return { c, row, reject: `format ${p.format} not accepted (PNG, JPEG, WEBP)` };
      const asp = checkAspect(p.width, p.height, row.width, row.height);
      if (!asp.ok && !opts.allowAspect) return { c, row, p, reject: `aspect mismatch: ${asp.note}` };
      const existing = prov.images[c.stem];
      if (existing && existing.originalSha256 === p.sha256) return { c, row, p, same: true };
      if (existing && !opts.replace) return { c, row, p, conflict: `already ingested from a different file (${existing.sourceFile}); re-run with --replace to replace it (this resets its approval)` };
      if (opts.dryRun) return { c, row, p, asp, dry: true, replacing: !!existing };
      const orig = join(paths.originals, `${c.stem}.${EXT_OF[p.format]}`);
      mkdirSync(paths.originals, { recursive: true });
      if (existing && existsSync(orig)) copyFileSync(orig, join(paths.originals, `${c.stem}.${existing.originalSha256.slice(0, 8)}.${existing.originalFormat === 'JPEG' ? 'jpg' : existing.originalFormat.toLowerCase()}`));
      copyFileSync(c.path, orig); // byte copy: embedded metadata (incl. any C2PA manifest) is preserved in the original only
      for (const v of existing?.variants ?? []) { try { unlinkSync(join(paths.genDir, v.file)); } catch { /* already gone */ } }
      const proc = await py(['process', JSON.stringify({ src: c.path, outdir: paths.genDir, stem: c.stem, sizes: [800, 1600], maxEdgeCap: webCap(row), ocr: opts.ocr !== false })]);
      if (!proc.ok) return { c, row, p, reject: `processing failed: ${proc.error}` };
      return { c, row, p, asp, proc, orig, replacing: !!existing };
    });

    for (const r of results) {
      const { c, row } = r;
      if (r.reject) { report.rejectedFiles.push({ file: c.rel, id: c.stem, reason: r.reject }); continue; }
      if (r.same) { report.unchanged.push(c.stem); continue; }
      if (r.conflict) { report.conflicts.push({ id: c.stem, file: c.rel, reason: r.conflict }); continue; }
      const flags = [];
      if (r.asp.level === 'substituted') flags.push('aspect_substituted');
      if (r.asp.level === 'mismatch') flags.push('aspect_mismatch_allowed');
      const expectAlpha = /^ICON_/.test(c.stem) || /transparent background/i.test(row.prompt);
      if (expectAlpha && !(r.p.hasAlpha && r.p.transparentFraction >= 0.05)) flags.push('not_transparent');
      if (!expectAlpha && r.p.hasAlpha && r.p.transparentFraction > 0.001) flags.push('unexpected_transparency');
      if (Math.max(r.p.width, r.p.height) < Math.min(Math.max(row.width, row.height), 1024) * 0.5) flags.push('low_resolution');
      if (r.dry) { report.ingested.push({ id: c.stem, matchedBy: c.matchedBy, flags, dry: true, replacing: r.replacing }); continue; }
      const ocr = r.proc.ocr;
      if (!ocr.ran) flags.push('ocr_not_run');
      else if (ocr.containsText) flags.push('contains_text');
      else if (ocr.possibleText) flags.push('possible_text');
      const rec = {
        id: c.stem, file: row.file, command: row.command, set: row.set, block: row.block,
        prompt: row.prompt, promptSha256: sha256(row.prompt),
        tool, model: opts.model ?? null, ingestedAt: now, sourceFile: c.name, sourceFileDate: c.date, matchedBy: c.matchedBy,
        originalSha256: r.p.sha256, originalFormat: r.p.format, originalBytes: r.p.bytes, originalFile: basename(r.orig),
        width: r.p.width, height: r.p.height, expected: { w: row.width, h: row.height }, aspect: r.asp.level, aspectNote: r.asp.note || undefined,
        hasAlpha: r.proc.hasAlpha, c2paMarker: r.p.c2paMarker, metadataStripped: true, iccConvertedToSrgb: r.proc.iccConvertedToSrgb,
        variants: r.proc.variants,
        ocr: ocr.ran ? { ran: true, langs: ocr.langs, blobCount: ocr.blobCount, blobs: ocr.blobs.map((b) => ({ t: b.t, conf: b.conf, lang: b.lang })), possibleLetters: ocr.possibleLetters.map((b) => b.t) } : { ran: false, reason: ocr.reason },
        flags, humanApproved: false,
      };
      if (r.replacing) { delete approvals.approvals[c.stem]; report.replaced.push(c.stem); }
      prov.images[c.stem] = rec;
      report.ingested.push({ id: c.stem, matchedBy: c.matchedBy, flags });
    }

    const nameClash = report.ingested.filter((x) => x.matchedBy !== 'exact-name');
    if (nameClash.length) report.notes.push(`${nameClash.length} file(s) matched by something other than an exact name (see ingested[].matchedBy): check them.`);
    report.counts = {
      candidates: cands.length, matched: chosen.length, ingested: report.ingested.length, unchanged: report.unchanged.length, replaced: report.replaced.length,
      conflicts: report.conflicts.length, rejectedFiles: report.rejectedFiles.length, unmatched: report.unmatched.length, skipped: skipped.length,
      flaggedText: report.ingested.filter((x) => x.flags.includes('contains_text')).length,
    };
    if (!opts.dryRun) {
      writeJsonAtomic(paths.approvals, approvals);
      syncApprovalMirror(prov, approvals);
      writeJsonAtomic(paths.provenance, prov);
      writeJsonAtomic(paths.generated, buildGeneratedManifest(prov, approvals));
    }
    writeJsonAtomic(paths.report, report);
    if (report.unmatched.length) writeTextAtomic(paths.assignCsv, assignmentCsv(report.unmatched));
    else if (existsSync(paths.assignCsv)) unlinkSync(paths.assignCsv);
    return report;
  } finally {
    for (const t of tmpRoots) rmSync(t, { recursive: true, force: true });
  }
}

export function assignmentCsv(unmatched) {
  return toCsv(['file', 'assign_id', 'suggested_ids', 'reason', 'width', 'height', 'sha256_prefix'],
    unmatched.map((u) => [u.file, '', u.suggested.join(' '), u.reason, u.width ?? '', u.height ?? '', u.sha256]));
}

/** provenance.humanApproved mirrors approvals.json (which is the source of truth). */
export function syncApprovalMirror(prov, approvals) {
  for (const [stem, rec] of Object.entries(prov.images)) rec.humanApproved = approvals.approvals[stem]?.status === 'approved';
}

/** approve / reject / reset. patterns: ids or globs over INGESTED ids. */
export function decide(opts) {
  const paths = opts.paths ?? makePaths(opts.root);
  const now = opts.now ?? new Date().toISOString();
  const prov = loadProvenance(paths); const approvals = loadApprovals(paths);
  const known = new Set(Object.keys(prov.images));
  const manifestStems = new Set(loadManifest(paths.manifest).map((r) => r.stem));
  const res = { applied: [], skipped: [], errors: [] };
  const ids = [];
  for (const raw of opts.ids) {
    const p = raw.replace(/\.(png|webp|jpg)$/i, '');
    if (/[*?]/.test(p)) {
      const re = globToRe(p); const hit = [...known].filter((s) => re.test(s));
      if (!hit.length) res.errors.push(`pattern ${p} matches no ingested image`);
      ids.push(...hit);
    } else if (known.has(p)) ids.push(p);
    else res.errors.push(manifestStems.has(p) ? `${p}: in the manifest but not ingested yet` : `${p}: not a manifest id`);
  }
  for (const id of [...new Set(ids)]) {
    if (opts.status === 'reset') { delete approvals.approvals[id]; res.applied.push(id); continue; }
    const flags = prov.images[id].flags;
    const blocking = flags.filter((f) => BLOCKING_FLAGS.includes(f));
    if (opts.status === 'approved' && blocking.length && !opts.force) { res.skipped.push({ id, reason: `flagged ${blocking.join(', ')}: look at it; --force only if the detection is wrong` }); continue; }
    approvals.approvals[id] = { status: opts.status, at: now, ...(opts.note ? { note: opts.note } : {}), ...(opts.status === 'approved' && blocking.length ? { forcedDespite: blocking } : {}) };
    res.applied.push(id);
  }
  if (opts.write !== false) {
    syncApprovalMirror(prov, approvals);
    writeJsonAtomic(paths.approvals, approvals);
    writeJsonAtomic(paths.provenance, prov);
    writeJsonAtomic(paths.generated, buildGeneratedManifest(prov, approvals));
  }
  return res;
}

export function status(opts) {
  const paths = opts.paths ?? makePaths(opts.root);
  const rows = loadManifest(paths.manifest); const prov = loadProvenance(paths); const ap = loadApprovals(paths);
  const per = {};
  for (const b of BLOCKS) per[b] = { rows: 0, ingested: 0, approved: 0, rejected: 0, flagged: 0, missing: 0 };
  const lists = { missing: [], unapproved: [], approved: [], rejected: [], flagged: [] };
  for (const r of rows) {
    const t = (per[r.block] ??= { rows: 0, ingested: 0, approved: 0, rejected: 0, flagged: 0, missing: 0 }); t.rows++;
    const rec = prov.images[r.stem];
    if (!rec) { t.missing++; lists.missing.push(r); continue; }
    t.ingested++;
    const st = ap.approvals[r.stem]?.status;
    if (st === 'approved') { t.approved++; lists.approved.push(r); } else if (st === 'rejected') { t.rejected++; lists.rejected.push(r); } else lists.unapproved.push(r);
    if (rec.flags.some((f) => BLOCKING_FLAGS.includes(f) || f === 'possible_text' || f === 'aspect_mismatch_allowed' || f === 'low_resolution')) { t.flagged++; lists.flagged.push(r); }
  }
  return { per, lists, total: rows.length };
}

function parseArgs(argv) {
  const o = { _: [] };
  const withVal = new Set(['assign', 'jobs', 'tool', 'model', 'root', 'originals', 'file', 'note', 'block']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); if (withVal.has(k)) o[k] = argv[++i]; else o[k] = true; } else o._.push(a);
  }
  return o;
}

export async function main(argv) {
  const a = parseArgs(argv);
  const [cmd, ...rest] = a._;
  const root = a.root ? resolve(a.root) : undefined;
  const paths = makePaths(root, { originals: a.originals ? resolve(a.originals) : undefined });
  const say = (s = '') => console.log(s);
  switch (cmd) {
    case 'ingest': {
      if (!rest.length) { say('usage: ingest.mjs ingest <dir|zip|file>...'); return 2; }
      const rep = await ingest({ paths, inputs: rest, dryRun: !!a['dry-run'], assign: a.assign && resolve(a.assign), replace: !!a.replace, ocr: !a['no-ocr'], allowAspect: !!a['allow-aspect'], jobs: a.jobs ? Number(a.jobs) : 4, tool: a.tool, model: a.model });
      const c = rep.counts;
      say(`${rep.dryRun ? '[dry run] ' : ''}candidates ${c.candidates} | matched ${c.matched} | ingested ${c.ingested} | unchanged ${c.unchanged} | replaced ${c.replaced} | name conflicts ${c.conflicts} | rejected files ${c.rejectedFiles} | UNMATCHED ${c.unmatched} | skipped non-images ${c.skipped}`);
      for (const n of rep.notes) say(`note: ${n}`);
      const flagged = rep.ingested.filter((x) => x.flags.length);
      if (flagged.length) { say(`\nflags on ${flagged.length} ingested image(s):`); for (const f of flagged) say(`  ${f.id}: ${f.flags.join(', ')}`); }
      for (const r of rep.rejectedFiles) say(`REJECTED ${r.file} (${r.id}): ${r.reason}`);
      for (const r of rep.conflicts) say(`CONFLICT ${r.id} <- ${r.file}: ${r.reason}`);
      for (const r of rep.contentDuplicates) say(`duplicate bytes: ${JSON.stringify(r)}`);
      if (rep.unmatched.length) {
        say(`\n${rep.unmatched.length} file(s) were NOT used (no guess made):`);
        for (const u of rep.unmatched.slice(0, 15)) say(`  ${u.file}  [${u.reason}]${u.suggested.length ? `  maybe: ${u.suggested.join(', ')}` : ''}`);
        if (rep.unmatched.length > 15) say(`  ... and ${rep.unmatched.length - 15} more`);
        say(`Fill the assign_id column in ${paths.assignCsv} and re-run with --assign ${paths.assignCsv}`);
      }
      say(`\nreport: ${paths.report}`);
      if (!rep.dryRun) say('Next: node tools/images/ingest.mjs sheets   (then review and approve; nothing is approved yet)');
      return rep.rejectedFiles.length || rep.conflicts.length ? 1 : 0;
    }
    case 'approve': case 'reject': case 'reset': {
      const ids = [...rest];
      if (a.file) ids.push(...readFileSync(a.file, 'utf8').split(/[\s,]+/).filter(Boolean));
      if (!ids.length) { say(`usage: ingest.mjs ${cmd} <id|glob...> [--file ids.txt]`); return 2; }
      const r = decide({ paths, ids, status: cmd === 'approve' ? 'approved' : cmd === 'reject' ? 'rejected' : 'reset', force: !!a.force, note: a.note });
      say(`${cmd}: ${r.applied.length} image(s)`);
      for (const s of r.skipped) say(`SKIPPED ${s.id}: ${s.reason}`);
      for (const e of r.errors) say(`ERROR ${e}`);
      return r.errors.length || r.skipped.length ? 1 : 0;
    }
    case 'apply-decisions': {
      if (!rest[0]) { say('usage: ingest.mjs apply-decisions decisions.json'); return 2; }
      const d = JSON.parse(readFileSync(rest[0], 'utf8'));
      let bad = 0;
      for (const [key, status] of [['approve', 'approved'], ['reject', 'rejected'], ['reset', 'reset']]) {
        if (!Array.isArray(d[key]) || !d[key].length) continue;
        const r = decide({ paths, ids: d[key].map(String), status, force: !!a.force });
        say(`${key}: ${r.applied.length} applied`);
        for (const s of r.skipped) say(`SKIPPED ${s.id}: ${s.reason}`);
        for (const e of r.errors) say(`ERROR ${e}`);
        bad += r.skipped.length + r.errors.length;
      }
      return bad ? 1 : 0;
    }
    case 'manifest': {
      const prov = loadProvenance(paths); const ap = loadApprovals(paths);
      syncApprovalMirror(prov, ap); writeJsonAtomic(paths.provenance, prov);
      const m = buildGeneratedManifest(prov, ap); writeJsonAtomic(paths.generated, m);
      say(`generated-manifest.json: ${m.count} approved image(s)`); return 0;
    }
    case 'sheets': {
      const r = writeSheets({ paths, blocks: a.block ? [a.block.toUpperCase()] : undefined });
      say(`wrote ${r.files.length} file(s) in ${paths.sheets}\nopen ${join(paths.sheets, 'index.html')} in a browser`); return 0;
    }
    case 'status': {
      const s = status({ paths });
      say('block rows ingested approved rejected flagged missing');
      for (const [b, t] of Object.entries(s.per)) if (t.rows) say(`${b.padEnd(5)} ${String(t.rows).padStart(4)} ${String(t.ingested).padStart(8)} ${String(t.approved).padStart(8)} ${String(t.rejected).padStart(8)} ${String(t.flagged).padStart(7)} ${String(t.missing).padStart(7)}`);
      const sum = (k) => Object.values(s.per).reduce((x, t) => x + t[k], 0);
      say(`ALL   ${String(s.total).padStart(4)} ${String(sum('ingested')).padStart(8)} ${String(sum('approved')).padStart(8)} ${String(sum('rejected')).padStart(8)} ${String(sum('flagged')).padStart(7)} ${String(sum('missing')).padStart(7)}`);
      return 0;
    }
    case 'list': {
      const s = status({ paths }); const which = rest[0];
      if (!s.lists[which]) { say('usage: ingest.mjs list <missing|unapproved|approved|rejected|flagged> [--block X] [--csv]'); return 2; }
      const L = s.lists[which].filter((r) => !a.block || r.block === a.block.toUpperCase());
      if (a.csv) say(toCsv(['file', 'block', 'command', 'prompt'], L.map((r) => [r.file, r.block, r.command, r.prompt])).trimEnd());
      else for (const r of L) say(r.stem);
      return 0;
    }
    default:
      say(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 14).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
      return cmd ? 2 : 0;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => { console.error(`error: ${e.message}`); process.exitCode = 1; });
}
