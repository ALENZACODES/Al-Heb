#!/usr/bin/env node
// Reads returned listening answers (the CSV exported by listen.html, or the filled listen-sheet.csv) and produces a REPORT and
// a PROPOSED-APPROVALS patch. It APPLIES NOTHING: it never edits audio/, data/audio/ or any sidecar, and refuses to write its
// own output into those folders.
//
//   node tools/review/import_audio_review.mjs returned.csv [more.csv ...] [--root DIR] [--audio DIR]
//                                             [--min-approvals N] [--patch FILE.json] [--report FILE.md]
//
// Without --patch / --report the report goes to the screen. Exit code 0 when every non-blank row was usable, 1 when some rows
// were refused (the rest of the report is still printed), 2 on a usage error.
//
// How a clip actually becomes approved is NOT done here. It is the existing manual step (docs/audio/INGEST-REPORT-83.md, "Before any of
// these can be called approved"; src/shell/audio-labels.js): a person edits the clip's sidecar `.mp3.meta.json` to status
// `synthetic-reviewed`, then runs `node tools/audio/build_manifest.mjs`. The patch lists exactly which sidecars that would be.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadManifestFull } from '../audio/manifest_io.mjs';
import {
  REVIEWABLE_STATUS, VERDICT_VALUES, ISSUE_VALUES, ACCENT_VALUES, SHEET_COLUMNS,
  norm, sha256File, readAnswerCsv, normVerdict,
} from './audio_packet_lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, '../..');
export const PATCH_SCHEMA = 'alef-audio-approval-patch/1';
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (d) => { if (!ISO.test(d)) return false; const t = Date.parse(`${d}T00:00:00Z`); return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === d; };

/**
 * @param {{root:string, audioDir?:string, files:{name:string,text:string}[], minApprovals?:number}} o
 * @returns structured result; nothing is written
 */
export function analyse(o) {
  const root = path.resolve(o.root || DEFAULT_ROOT);
  const audioDir = o.audioDir ? path.resolve(o.audioDir) : path.join(root, 'audio');
  const minApprovals = Math.max(1, o.minApprovals || 1);
  const all = loadManifestFull(root);
  const byPath = new Map(all.map((e) => [e.path, e]));
  const byId = new Map();
  for (const e of all) { if (!byId.has(e.id)) byId.set(e.id, []); byId.get(e.id).push(e); }
  // the row's `file` column pins the entry; without it the id must name exactly one reviewable clip
  const lookup = (r, id) => {
    const f = (r.file || '').trim();
    if (f) { const e = byPath.get(f); return e && e.id === id ? { e } : { err: 'the file column is not the manifest path of this id' }; }
    const c = byId.get(id) || [], rev = c.filter((x) => x.status === REVIEWABLE_STATUS);
    if (rev.length > 1) return { err: 'this id exists for several voices or traditions and the row has no file column' };
    return { e: rev[0] || c[0] };
  };

  const res = { minApprovals, counts: { rows: 0, blank: 0, usable: 0, refused: 0 }, refused: [], warnings: [], clips: [], proposals: [], notProposed: [], files: o.files.map((f) => f.name) };
  const refuse = (r, why) => { res.counts.refused++; res.refused.push({ id: r.id || '', file: r._file, line: r._line, why }); };
  const warn = (r, why) => res.warnings.push({ id: r.id || '', file: r._file, line: r._line, why });

  const rows = [];
  for (const f of o.files) {
    const { header, records } = readAnswerCsv(f.text);
    for (const need of ['id', 'verdict']) if (!header.includes(need)) throw new Error(`${f.name}: missing required column "${need}" (expected the columns of listen-sheet.csv: ${SHEET_COLUMNS.join(', ')})`);
    for (const r of records) rows.push({ ...r, _file: f.name });
  }
  res.counts.rows = rows.length;

  // same reviewer twice for one clip: ambiguous, so neither counts
  const key = (r) => `${(r.id || '').trim()}|${(r.file || '').trim()}|${norm(r.reviewer_name).toLowerCase()}`;
  const seen = new Map();
  for (const r of rows) seen.set(key(r), (seen.get(key(r)) || 0) + 1);

  const good = []; // { id, entry, verdict, issues[], accent, note, name, role, date, named }
  for (const r of rows) {
    const id = (r.id || '').trim();
    if (!id) { refuse(r, 'row has no id'); continue; }
    const v = normVerdict(r.verdict);
    if (v === '') { res.counts.blank++; continue; }
    if (v === null) { refuse(r, `unknown verdict "${r.verdict}" (use ${VERDICT_VALUES.join(' / ')})`); continue; }
    if (seen.get(key(r)) > 1) { refuse(r, 'the same reviewer name answered this clip more than once; all copies skipped'); continue; }
    const found = lookup(r, id);
    if (found.err) { refuse(r, found.err); continue; }
    const e = found.e;
    if (!e) { refuse(r, 'id is not in the audio manifest'); continue; }
    if (e.status !== REVIEWABLE_STATUS) { refuse(r, `clip status is "${e.status}", not ${REVIEWABLE_STATUS}: nothing to review (already reviewed, recorded or missing)`); continue; }
    if (norm(r.hebrew) !== norm(e.text)) { refuse(r, `the Hebrew cell differs from the manifest text (stale sheet, or the cell was edited). Sheet: "${norm(r.hebrew).slice(0, 30)}" manifest: "${norm(e.text).slice(0, 30)}"`); continue; }
    const file = path.join(audioDir, ...e.path.replace(/^audio\//, '').split('/'));
    if (!fs.existsSync(file)) { refuse(r, `the clip file is not under ${audioDir}`); continue; }
    const want = (r.clip_sha256 || '').trim().toLowerCase();
    if (!want) warn(r, 'no clip_sha256 in the row: could not confirm the reviewer heard the file that is in the repo now');
    else if (want !== sha256File(file)) { refuse(r, 'the clip file has changed since the packet was built (sha256 differs): the answer is about a different recording'); continue; }
    const issues = (r.issues || '').split(/[;,]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    const badIssue = issues.filter((x) => !ISSUE_VALUES.includes(x));
    if (badIssue.length) warn(r, `unknown issue value(s) ignored: ${badIssue.join(', ')}`);
    const accent = (r.accent_heard || '').trim().toLowerCase();
    if (accent && !ACCENT_VALUES.includes(accent)) warn(r, `unknown accent value "${accent}"`);
    const name = norm(r.reviewer_name), date = (r.review_date || '').trim();
    const named = !!name && validDate(date);
    if (!named) warn(r, 'reviewer name or a valid YYYY-MM-DD date is missing: this answer is listed but can never support an approval');
    if (v === 'reject' && !issues.length && !norm(r.note)) warn(r, 'reject with no issue ticked and no note');
    good.push({ id, entry: e, verdict: v, issues: issues.filter((x) => ISSUE_VALUES.includes(x)), accent: ACCENT_VALUES.includes(accent) ? accent : '', note: norm(r.note), name, role: norm(r.reviewer_role), date, named });
    res.counts.usable++;
  }

  const ids = [...new Set(good.map((g) => g.entry.path))].sort();
  for (const id of ids) {
    const as = good.filter((g) => g.entry.path === id), e = as[0].entry;
    const named = as.filter((a) => a.named);
    const approvers = named.filter((a) => a.verdict === 'approve' && !a.issues.length);
    let decision, why;
    if (as.some((a) => a.verdict === 'reject')) { decision = as.some((a) => a.verdict === 'approve' || a.verdict === 'approve-with-note') ? 'conflict' : 'rejected'; why = decision === 'conflict' ? 'one reviewer rejected, another approved' : 'a reviewer rejected it'; }
    else if (as.some((a) => a.verdict === 'cannot-tell')) { decision = 'unresolved'; why = 'a reviewer could not tell'; }
    else if (as.some((a) => a.verdict === 'approve-with-note' || (a.verdict === 'approve' && a.issues.length))) { decision = 'owner-decision'; why = 'approved with a note or with an issue ticked; the owner decides what the note means'; }
    else if (approvers.length < as.length) { decision = 'unnamed'; why = 'an approval has no reviewer name or valid date'; }
    else if (approvers.length < minApprovals) { decision = 'needs-more'; why = `${approvers.length} named approval(s), ${minApprovals} wanted`; }
    else { decision = 'proposed'; why = `${approvers.length} named approval(s), no objection`; }
    const summary = { id: e.id, path: e.path, hebrew: e.text, decision, why, answers: as.map((a) => ({ reviewer: a.name, role: a.role, date: a.date, verdict: a.verdict, issues: a.issues, accent: a.accent, note: a.note })) };
    res.clips.push(summary);
    if (decision === 'proposed') {
      res.proposals.push({
        id: e.id, path: e.path, sidecar: `${e.path}.meta.json`, currentStatus: e.status, proposedStatus: 'synthetic-reviewed',
        reviewers: approvers.map((a) => ({ name: a.name, role: a.role, date: a.date })),
        accentHeard: [...new Set(approvers.map((a) => a.accent).filter(Boolean))], notes: approvers.map((a) => a.note).filter(Boolean),
      });
    } else res.notProposed.push({ id: e.id, decision, why });
  }
  return res;
}

export function patchOf(res) {
  return {
    schema: PATCH_SCHEMA,
    note: 'PROPOSAL ONLY. Nothing here has been applied and nothing is approved by this file. Each entry names a sidecar a person could set to status "synthetic-reviewed" by hand (the existing manual step), then run node tools/audio/build_manifest.mjs. The owner decides.',
    source: res.files, minApprovals: res.minApprovals,
    proposals: res.proposals, notProposed: res.notProposed,
  };
}

export function reportMd(res) {
  const by = (d) => res.clips.filter((c) => c.decision === d);
  const L = ['# Returned listening answers: report (nothing applied)', '',
    'This report was made by `tools/review/import_audio_review.mjs`. It changed no manifest, no sidecar and no clip. No clip is approved by this report or by the answers it describes: a person has to record each approval by hand (see the last section).', '',
    `Input: ${res.files.join(', ') || '(none)'}`, '',
    '| | rows |', '|---|---:|',
    `| rows read | ${res.counts.rows} |`, `| blank verdict (not reviewed) | ${res.counts.blank} |`, `| usable answers | ${res.counts.usable} |`, `| refused | ${res.counts.refused} |`, '',
    '| outcome per clip | clips |', '|---|---:|',
    `| proposed for approval (named approvals >= ${res.minApprovals}, no objection) | ${by('proposed').length} |`,
    `| approved with a note, owner decides | ${by('owner-decision').length} |`,
    `| approval without a name or valid date | ${by('unnamed').length} |`,
    `| needs more reviewers | ${by('needs-more').length} |`,
    `| rejected | ${by('rejected').length} |`, `| conflict (reject and approve) | ${by('conflict').length} |`, `| could not tell | ${by('unresolved').length} |`, ''];
  const list = (title, arr, fmt) => { if (arr.length) { L.push(`## ${title}`, ''); for (const c of arr) L.push(fmt(c)); L.push(''); } };
  const ans = (c) => c.answers.map((a) => `${a.reviewer || '(no name)'}${a.role ? ` (${a.role})` : ''} ${a.date || '(no date)'}: ${a.verdict}${a.issues.length ? ` [${a.issues.join(', ')}]` : ''}${a.accent ? ` accent ${a.accent}` : ''}${a.note ? ` - "${a.note}"` : ''}`).join('; ');
  list('Proposed for approval', by('proposed'), (c) => `- \`${c.id}\` ${c.hebrew}: ${ans(c)}`);
  list('Approved with a note or an issue: the owner decides', by('owner-decision'), (c) => `- \`${c.id}\` ${c.hebrew}: ${ans(c)}`);
  list('Rejected or in conflict', [...by('rejected'), ...by('conflict')], (c) => `- \`${c.id}\` ${c.hebrew} (${c.decision}): ${ans(c)}`);
  list('Could not tell', by('unresolved'), (c) => `- \`${c.id}\` ${c.hebrew}: ${ans(c)}`);
  list('Approvals that cannot count yet', [...by('unnamed'), ...by('needs-more')], (c) => `- \`${c.id}\` ${c.hebrew} (${c.why}): ${ans(c)}`);
  if (res.refused.length) { L.push('## Refused rows', ''); for (const r of res.refused) L.push(`- ${r.file} line ${r.line}${r.id ? ` \`${r.id}\`` : ''}: ${r.why}`); L.push(''); }
  if (res.warnings.length) { L.push('## Warnings', ''); for (const r of res.warnings) L.push(`- ${r.file} line ${r.line}${r.id ? ` \`${r.id}\`` : ''}: ${r.why}`); L.push(''); }
  L.push('## How an approval is actually recorded (not done by this tool)', '',
    'The repo has no approval command. The existing flow is manual, per clip (docs/audio/INGEST-REPORT-83.md, "Before any of these can be called approved"; the status table in src/shell/audio-labels.js says `synthetic-reviewed` is "edit by hand"):', '',
    '1. A person who has the reviewers\' answers sets `status` to `synthetic-reviewed` in the clip\'s sidecar (`audio/<voice>/<tradition>/<kind>/<id>.mp3.meta.json`; the patch file lists them). The ingest tool never touches a clip already at that status.',
    '2. `node tools/audio/build_manifest.mjs` rebuilds the manifest from the sidecars; then `node tools/audio/coverage.mjs`.',
    '3. Tests that assert "every clip is synthetic-unreviewed" (for example `tests/audio.manifest.test.js`) will fail for those clips until the owner updates them on purpose; do not weaken them silently.',
    '4. Licence and redistribution are separate from listening: they stay "not cleared" (`synth.redistributionCleared`) until the supplier terms are known.', '',
    'Listening answers say whether the word and sound are acceptable. They do not clear the licence and are not a Sephardi or Ashkenazi accent check unless the reviewer said so in a note.', '');
  return L.join('\n');
}

const within = (p, dir) => { const rel = path.relative(dir, path.resolve(p)); return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel)); };

export function main(argv = process.argv.slice(2)) {
  const opt = { root: DEFAULT_ROOT, audio: null, files: [], min: 1, patch: null, report: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => { if (i + 1 >= argv.length) throw new Error(`${a} needs a value`); return argv[++i]; };
    if (a === '--root') opt.root = path.resolve(next());
    else if (a === '--audio') opt.audio = path.resolve(next());
    else if (a === '--min-approvals') opt.min = Number(next());
    else if (a === '--patch') opt.patch = path.resolve(next());
    else if (a === '--report') opt.report = path.resolve(next());
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else opt.files.push(a);
  }
  if (!opt.files.length) throw new Error('usage: import_audio_review.mjs returned.csv [more.csv ...] [--patch FILE.json] [--report FILE.md]');
  if (!Number.isInteger(opt.min) || opt.min < 1) throw new Error('--min-approvals must be a whole number >= 1');
  for (const out of [opt.patch, opt.report].filter(Boolean)) {
    for (const dir of [path.join(opt.root, 'audio'), path.join(opt.root, 'data')]) if (within(out, dir)) throw new Error(`refusing to write ${out}: this tool never writes inside ${dir}`);
  }
  const res = analyse({ root: opt.root, audioDir: opt.audio, minApprovals: opt.min, files: opt.files.map((f) => ({ name: path.basename(f), text: fs.readFileSync(f, 'utf8') })) });
  const md = reportMd(res);
  if (opt.report) fs.writeFileSync(opt.report, md); else console.log(md);
  if (opt.patch) fs.writeFileSync(opt.patch, JSON.stringify(patchOf(res), null, 1) + '\n');
  if (opt.report || opt.patch) console.log(`${res.proposals.length} approval(s) proposed, ${res.counts.refused} row(s) refused. Nothing was applied.${opt.report ? ` Report: ${opt.report}.` : ''}${opt.patch ? ` Patch: ${opt.patch}.` : ''}`);
  return res.counts.refused ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exitCode = main(); } catch (e) { console.error(e.message); process.exitCode = 2; }
}
