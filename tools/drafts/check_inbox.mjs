#!/usr/bin/env node
// Inbox checker for external drafts. Report-only: it never edits, moves or deletes an inbox file.
//   node tools/drafts/check_inbox.mjs [--inbox DIR] [--report FILE | --no-report] [--vocab FILE]
//        [--urls FILE] [--placeholders FILE] [--max-words N] [--strict] [--max-bytes N] [--min-edge N] [--max-edge N]
// Exit 0 = no errors (warnings and unknown words do not fail; --strict also fails on '?? CHECK' flags),
// exit 1 = at least one error, exit 2 = bad usage.
// Passing is NOT proof of correct Hebrew: it checks code points, the app word list, names, links and file shape only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintString, RULES, hasHebrew } from '../hebrew-lint/lint.mjs';
import { pngChunks, PNG_KEEP } from '../meta/lib.mjs';
import { textHit } from '../meta/text.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
export const DEFAULTS = {
  inbox: path.join(root, 'docs/drafts/inbox'),
  report: path.join(root, 'docs/drafts/INBOX-REPORT.md'),
  vocab: path.join(root, 'data/vocab/words.json'),
  urls: path.join(here, 'url-allowlist.json'),
  placeholders: null, // path to a placeholder-columns.json to turn the placeholder rule on; null = off
  maxWords: 8, maxBytes: 6 * 1024 * 1024, minEdge: 256, maxEdge: 4096,
};

// ---------- patterns ----------
const EXTRA_NAMES = /gemini|copilot|stable ?diffusion|firefly|grok|perplexity|llama|mistral|bard\b/i;
const DIVINE_LATIN = /\b(adonai|yhwh|yahweh|jehovah|elohim|adoshem|hashem)\b/i;
const DIVINE_HEB = new Set(['יהוה', 'ידוד', 'אדני', 'אלהים', 'אלוהים', 'שדי', 'אלוה', "ה'", 'ה׳']);
const ATTRIBUTION = /©|\(c\)\s*\d{4}|copyright|\bwritten by\b|\bauthor\s*:|\bcredited? to\b/i;
const LYRIC_MARK = /[♪♫]|\blyrics?\b/i;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s)>\]"'`,;]+/gi;
const CHECK_RE = /\?\?\s*CHECK/i;
const NAME_RE = /^lane([1-6])-(\d+)-([a-z0-9]+(?:-[a-z0-9]+)*)\.(csv|json|md|png)$/;
const SKIP_FILES = new Set(['.gitkeep', 'README.md']);
const HEB_TOKEN = /[\u05d0-\u05ea\u0591-\u05c7\u05f3\u05f4]+/g;
const strip = (w) => w.normalize('NFC').replace(/[\u0591-\u05af\u05bd\u05c0\u05c3]/g, '');
const unpoint = (w) => strip(w).replace(/[\u05b0-\u05c7]/g, '');
export const hebTokens = (s) => (s.match(HEB_TOKEN) || []).filter((t) => /[\u05d0-\u05ea]/.test(t));
// textHit = the exact pattern list `node tools/meta/scan.mjs --text` uses (TEXT_RE + PROVENANCE_RE), so the two cannot drift.
const bannedName = (s) => textHit(s) || EXTRA_NAMES.test(s);
// Windows source paths: a drive letter, a UNC share, or a user/profile folder. Matched on the decoded cell text.
const WIN_PATH_RE = /\b[A-Za-z]:[\\/]|\\\\[\w.-]+\\[\w$.-]+|[\\/](?:Users|Documents and Settings|AppData)[\\/]/i;
// A path segment named Codex is an error. The bare word is only a warning: scan.mjs leaves it out on purpose (Leningrad/Aleppo Codex).
const CODEX_SEG_RE = /[\\/]Codex[\\/]/i;
const CODEX_WORD_RE = /\bcodex\b/i;
const pathHit = (s) => WIN_PATH_RE.test(s) || CODEX_SEG_RE.test(s);
export function loadPlaceholders(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { columns: new Set((j.columns || []).map((c) => String(c).trim().toLowerCase())), tokens: new Set(j.placeholders || ['PENDING-HUMAN', 'UNASSIGNED']) };
}

// ---------- vocab ----------
export function loadVocab(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const pointed = new Set(); const byBare = new Map();
  for (const w of j.words || []) for (const t of hebTokens(w.he || '')) {
    const p = strip(t); pointed.add(p);
    const b = unpoint(t); if (!byBare.has(b)) byBare.set(b, new Set()); byBare.get(b).add(p);
  }
  return { pointed, byBare, count: (j.words || []).length };
}

// ---------- parsing ----------
export function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false, line = 1, start = 1, any = false;
  const t = text.replace(/^\uFEFF/, '');
  const push = () => { row.push(cell); cell = ''; };
  const end = () => { push(); if (row.length > 1 || row[0] !== '') rows.push({ line: start, cells: row }); row = []; any = false; };
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else { if (c === '\n') line++; cell += c; } continue; }
    if (c === '"' && cell === '') { q = true; any = true; }
    else if (c === ',') push();
    else if (c === '\r') { /* ignore */ }
    else if (c === '\n') { end(); line++; start = line; }
    else cell += c;
  }
  if (cell !== '' || row.length || any) end();
  return { rows, unterminated: q };
}

// yields {loc, text, col, empty}
function unitsOf(file, ext, text, issue) {
  const out = []; const idLists = [];
  if (ext === 'csv') {
    const { rows, unterminated } = parseCsv(text);
    if (unterminated) issue('error', 'bad-format', 'csv', 'a double quote was opened and never closed, so the rest of the file is read as one cell');
    if (!rows.length) { issue('error', 'bad-format', 'csv', 'the file is empty'); return { out, idLists }; }
    const head = rows[0].cells.map((h) => h.trim());
    head.forEach((h, i) => { if (!h) issue('error', 'empty-cell', `row ${rows[0].line}, column ${i + 1}`, 'the header row has an empty column name'); });
    const idCol = head.findIndex((h) => h.toLowerCase() === 'id');
    const ids = [];
    rows.slice(1).forEach((r) => {
      const rid = idCol >= 0 && (r.cells[idCol] || '').trim() ? ` (id ${r.cells[idCol].trim().slice(0, 30)})` : '';
      if (r.cells.length !== head.length) issue('error', 'bad-format', `row ${r.line}${rid}`, `this row has ${r.cells.length} cells but the header row has ${head.length}; a comma inside a cell needs the cell wrapped in double quotes`);
      r.cells.forEach((c, i) => {
        const loc = `row ${r.line}${rid}, column ${head[i] || i + 1}`;
        const col = (head[i] || '').toLowerCase();
        if (c.trim() === '') out.push({ loc, text: '', empty: true, col }); else out.push({ loc, text: c, col, csv: true });
        if (i === idCol && c.trim()) ids.push({ id: c.trim(), loc: `row ${r.line}` });
      });
    });
    if (idCol >= 0) idLists.push(ids);
  } else if (ext === 'json') {
    let j; try { j = JSON.parse(text.replace(/^\uFEFF/, '')); } catch (e) { issue('error', 'bad-format', 'json', 'this is not valid JSON (' + e.message.slice(0, 80) + ')'); return { out, idLists }; }
    const walk = (v, p) => {
      if (typeof v === 'string') out.push(v.trim() === '' ? { loc: p, text: '', empty: true } : { loc: p, text: v });
      else if (v === null) out.push({ loc: p, text: '', empty: true });
      else if (Array.isArray(v)) {
        const ids = v.filter((x) => x && typeof x === 'object' && !Array.isArray(x) && 'id' in x).map((x, i) => ({ id: String(x.id), loc: `${p}[${v.indexOf(x)}].id` }));
        if (ids.length) idLists.push(ids);
        v.forEach((x, i) => walk(x, `${p}[${i}]`));
      } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, p ? `${p}.${k}` : k);
    };
    walk(j, '');
  } else {
    text.split('\n').forEach((ln, i) => { if (ln.trim()) out.push({ loc: `line ${i + 1}`, text: ln.replace(/\r$/, '') }); });
  }
  return { out, idLists };
}

// ---------- the check ----------
export function checkInbox(opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const vocab = loadVocab(o.vocab);
  const allowHosts = new Set((JSON.parse(fs.readFileSync(o.urls, 'utf8')).hosts || []).map((h) => h.toLowerCase()));
  const ph = o.placeholders ? loadPlaceholders(o.placeholders) : null;
  let placeholders = 0;
  const findings = []; const files = []; const unknown = new Map(); const allIds = new Map();
  const rel = (f) => path.relative(o.inbox, f).split(path.sep).join('/');

  const list = [];
  const walkDir = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const f = path.join(d, e.name); if (e.isDirectory()) walkDir(f); else list.push(f); } };
  if (fs.existsSync(o.inbox)) walkDir(o.inbox);

  for (const f of list) {
    const r = rel(f); const base = path.basename(f);
    if (SKIP_FILES.has(base)) continue;
    const rec = { file: r, kind: '', units: 0, errors: 0, warnings: 0, hebrew: 0 };
    files.push(rec);
    const issue = (sev, rule, loc, detail = '', sample = '') => { findings.push({ sev, rule, file: r, loc, detail, sample }); if (sev === 'error') rec.errors++; else if (sev === 'warn') rec.warnings++; };

    // name rule
    const m = NAME_RE.exec(base); const dirLane = /^lane([1-6])(?:\/|$)/.exec(r);
    if (!dirLane) issue('error', 'misplaced', r, 'the file is not inside a folder named lane1 to lane6');
    if (!m) issue('error', 'file-name', base, 'the file name must look like lane2-18-greetings.csv: lane number, item number, short name, all lower case with hyphens');
    else if (dirLane && dirLane[1] !== m[1]) issue('error', 'file-name', base, `the name says lane ${m[1]} but the file is in the lane${dirLane[1]} folder; move it to the right folder`);
    if (pathHit(base)) issue('error', 'windows-path', base, 'the file name contains a Windows path or a Codex path segment; rename it');
    if (bannedName(base)) issue('error', 'banned-name', base, 'the file name contains a tool, company or provenance word; rename it');
    const ext = path.extname(base).slice(1).toLowerCase();
    rec.kind = ext;

    if (ext === 'png') { checkPng(f, o, issue); continue; }
    if (!['csv', 'json', 'md'].includes(ext)) { issue('error', 'unsupported-type', base, 'only csv, json, md and png files are accepted'); continue; }
    const text = fs.readFileSync(f, 'utf8');
    if (!text.trim()) { issue('error', 'bad-format', base, 'the file is empty'); continue; }

    const { out: units, idLists } = unitsOf(f, ext, text, issue);
    rec.units = units.length;
    for (const list of idLists) {
      const seen = new Map();
      for (const { id, loc } of list) {
        if (seen.has(id)) issue('error', 'duplicate-id', loc, `the id "${id.slice(0, 40)}" is already used at ${seen.get(id)}; every id must be different`);
        else seen.set(id, loc);
        const key = id; if (!allIds.has(key)) allIds.set(key, []); allIds.get(key).push({ file: r, loc });
      }
    }

    for (const u of units) {
      if (u.empty) { if (ext !== 'md') issue('error', 'empty-cell', u.loc, 'this cell is empty'); continue; }
      const s = u.text; const toks = hasHebrew(s) ? hebTokens(s) : [];
      if (ph && u.csv && ph.tokens.has(s.trim())) {
        if (ph.columns.has(u.col)) { placeholders++; rec.placeholders = (rec.placeholders || 0) + 1; continue; }
        issue('error', 'placeholder-column', u.loc, `${s.trim()} is only accepted in the columns listed in the placeholder allowlist; this column is not listed`); continue;
      }
      let hot = false; // unit carries banned content: never echo it in the report
      const bad = (rule, detail) => { hot = true; issue('error', rule, u.loc, detail, ''); };
      if (bannedName(s)) bad('banned-name', 'wording that names a tool, company or says who made it');
      if (pathHit(s)) bad('windows-path', 'a Windows source path (drive letter, user folder or Codex folder); remove the path');
      else if (CODEX_WORD_RE.test(s) && !textHit(s)) issue('warn', 'codex-word', u.loc, 'the word Codex appears; fine for a manuscript name, wrong for a tool name', '');
      if (DIVINE_LATIN.test(s) || toks.some((t) => DIVINE_HEB.has(unpoint(t))) || /(^|\s)ה[׳'](?=\s|$|[.,;:!?)])/.test(s)) bad('divine-name', 'a divine name or its abbreviation');
      if (ATTRIBUTION.test(s)) bad('attribution-marker', 'an author, copyright or credit line');
      if (LYRIC_MARK.test(s)) bad('lyrics-marker', 'a music note or the word lyrics');
      for (const url of s.match(URL_RE) || []) {
        let host = ''; try { host = new URL(/^www\./i.test(url) ? 'https://' + url : url).hostname.toLowerCase(); } catch { /* bad url */ }
        if (!host || !allowHosts.has(host)) bad('url-not-allowed', `link to ${host || '(unreadable address)'}; only sites on tools/drafts/url-allowlist.json are allowed`);
      }
      if (CHECK_RE.test(s)) issue('flag', 'check-flag', u.loc, 'the drafter was unsure; a native speaker must check this', hot ? '' : s.slice(0, 70));
      if (!toks.length) continue;
      rec.hebrew++;
      if (toks.length > o.maxWords) bad('lyric-like', `${toks.length} Hebrew words in one line or cell (limit ${o.maxWords}); this looks like copied text, not a short phrase`);
      for (const lf of lintString(s)) {
        const cls = RULES[lf.rule]?.cls;
        issue(cls === 'definite' ? 'error' : 'warn', 'hebrew-' + lf.rule, u.loc, lf.detail || RULES[lf.rule]?.reason.slice(0, 80) || '', hot ? '' : s.slice(Math.max(0, lf.index - 8), lf.index + 12));
      }
      for (const t of toks) {
        const p = strip(t);
        if (vocab.pointed.has(p)) continue;
        const bare = unpoint(t); const same = vocab.byBare.get(bare);
        const why = same ? 'same letters as an app word, different pointing; the app has ' + [...same].slice(0, 2).join(' / ') : (p === bare && bare.length > 1 ? 'unpointed and not in the word list' : 'not in the word list');
        const k = p; if (!unknown.has(k)) unknown.set(k, { word: hot ? '' : p, why, count: 0, first: `${r} ${u.loc}` });
        unknown.get(k).count++;
      }
    }
  }
  // same id used in several files: a hint only
  for (const [id, uses] of allIds) {
    const fl = [...new Set(uses.map((x) => x.file))];
    if (fl.length > 1) findings.push({ sev: 'warn', rule: 'id-in-several-files', file: fl[0], loc: uses[0].loc, detail: `id "${id.slice(0, 40)}" also in ${fl.slice(1).join(', ')}`, sample: '' });
  }
  const errors = findings.filter((x) => x.sev === 'error').length;
  const warnings = findings.filter((x) => x.sev === 'warn').length;
  const flags = findings.filter((x) => x.sev === 'flag').length;
  const unk = [...unknown.values()].sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
  return { files, findings, placeholders, unknown: unk, errors, warnings, flags, vocabCount: vocab.count, exit: errors || (o.strict && flags) ? 1 : 0 };
}

function checkPng(f, o, issue) {
  const buf = fs.readFileSync(f); const name = path.basename(f);
  if (buf.length > o.maxBytes) issue('error', 'png-size', name, `the picture is ${buf.length} bytes; the limit is ${o.maxBytes}`);
  if (buf.length === 0) { issue('error', 'png-bad', name, 'the file is empty'); return; }
  const ch = pngChunks(buf);
  if (!ch) { issue('error', 'png-bad', name, 'this is not a real PNG picture (wrong file start); export it again as PNG'); return; }
  const ihdr = ch[0];
  if (!ihdr || ihdr.type !== 'IHDR' || ihdr.data.length < 13) { issue('error', 'png-bad', name, 'the PNG header is missing or damaged'); return; }
  const w = ihdr.data.readUInt32BE(0), h = ihdr.data.readUInt32BE(4);
  if (Math.min(w, h) < o.minEdge || Math.max(w, h) > o.maxEdge) issue('error', 'png-dimensions', name, `the picture is ${w} by ${h} pixels; each side must be between ${o.minEdge} and ${o.maxEdge}`);
  const last = ch[ch.length - 1];
  if (last.type !== 'IEND' || ch.some((c) => c.truncated)) issue('error', 'png-bad', name, 'the PNG is cut off (a partial download?); get the file again');
  if (!ch.some((c) => c.type === 'IDAT')) issue('error', 'png-bad', name, 'the PNG has no picture data');
  const meta = [...new Set(ch.filter((c) => !PNG_KEEP.has(c.type)).map((c) => c.type))];
  if (meta.length) issue('error', 'png-metadata', name, `the picture carries hidden information (${meta.join(', ')})`);
}

// ---------- report ----------
// Plain-language next step per rule, for a reader who is not a programmer.
export function fixFor(rule) {
  if (rule.startsWith('hebrew-')) return 'Ask the drafter to redo this Hebrew; do not repair it by hand';
  return ({
    'duplicate-id': 'Ask for a redo with unique ids (or give one of the two a new id if you are sure which is right)',
    'empty-cell': 'Ask the drafter to fill it in, or write "n/a" if nothing belongs there',
    'url-not-allowed': 'Remove the link, or ask for a source from the allowed list',
    'banned-name': 'Ask for a redo without that wording',
    'windows-path': 'Ask for a redo with no file paths (give a repo-relative name or n/a)',
    'placeholder-column': 'Put a real value here, or n/a, or ask for this column to be added to the placeholder allowlist',
    'codex-word': 'Check it is a manuscript name, not a tool name',
    'divine-name': 'Ask for a redo without it',
    'attribution-marker': 'Ask for a redo without it',
    'lyrics-marker': 'Ask for a redo; no songs or lyrics',
    'lyric-like': 'Ask for a redo with short original phrases',
    'png-metadata': 'Run node tools/meta/strip.mjs on a copy, then re-check',
    'png-dimensions': 'Ask for the picture again at 1024 by 1024',
    'png-size': 'Ask for a smaller export',
    'png-bad': 'Ask for the picture again',
    'file-name': 'Rename the file (and put it in the matching lane folder)',
    misplaced: 'Move the file into inbox/lane1 to lane6',
    'unsupported-type': 'Ask for csv, json, md or png',
    'bad-format': 'Ask for the file again; it is not shaped as expected',
    'check-flag': 'Send to a native speaker; do not use it until they answer',
  })[rule] || '';
}

const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
export function renderReport(r, o = {}) {
  const L = ['# Inbox report', ''];
  L.push('Generated by `node tools/drafts/check_inbox.mjs`. It only reads the inbox; it changes nothing.', '');
  L.push('**Passing is NOT proof of correct Hebrew or safe content.** It checks code points, the app word list, names, links and file shape. Every draft still needs human review, and `?? CHECK` items need a native speaker.', '');
  L.push(`Result: **${r.exit ? 'FAIL' : 'PASS'}** (${r.errors} error(s), ${r.warnings} warning(s), ${r.flags} '?? CHECK' flag(s), ${r.unknown.length} distinct unknown word(s)${r.placeholders ? `, ${r.placeholders} accepted placeholder cell(s)` : ''}). Files checked: ${r.files.length}. App word list: ${r.vocabCount} entries.`, '');
  if (!r.files.length) L.push('The inbox holds no files.', '');
  const flagged = new Set(r.findings.filter((x) => x.sev === 'flag').map((x) => x.file));
  const verdict = (f) => (f.errors ? 'FIX FIRST' : flagged.has(f.file) ? 'needs native check' : f.warnings ? 'read warnings' : 'nothing mechanical found');
  L.push('## Files', '', '| File | Type | Cells/lines | Hebrew units | Errors | Warnings | Status |', '|---|---|---:|---:|---:|---:|---|');
  for (const f of r.files) L.push(`| ${esc(f.file)} | ${f.kind} | ${f.units} | ${f.hebrew} | ${f.errors} | ${f.warnings} | ${verdict(f)} |`);
  L.push('');
  const sect = (title, sev) => {
    const xs = r.findings.filter((x) => x.sev === sev).sort((a, b) => a.file.localeCompare(b.file) || a.rule.localeCompare(b.rule));
    L.push(`## ${title} (${xs.length})`, '');
    if (!xs.length) { L.push('None.', ''); return; }
    L.push('| File | Where | Rule | What is wrong | What to do | Sample |', '|---|---|---|---|---|---|');
    for (const x of xs.slice(0, 300)) L.push(`| ${esc(x.file)} | ${esc(x.loc)} | ${x.rule} | ${esc(x.detail)} | ${esc(fixFor(x.rule))} | ${esc(x.sample)} |`);
    if (xs.length > 300) L.push('', `... ${xs.length - 300} more not shown.`);
    L.push('');
  };
  sect('Errors', 'error'); sect('Warnings', 'warn'); sect("'?? CHECK' lines", 'flag');
  L.push(`## Unknown words (${r.unknown.length})`, '', 'Hebrew words that are not in the app word list with the same pointing. This is information, not an error: a new word may be fine, but it needs a person to confirm spelling and pointing before it is promoted.', '');
  if (r.unknown.length) {
    L.push('| Word | Why | Uses | First seen |', '|---|---|---:|---|');
    for (const u of r.unknown.slice(0, 200)) L.push(`| ${esc(u.word || '(withheld)')} | ${u.why} | ${u.count} | ${esc(u.first)} |`);
    if (r.unknown.length > 200) L.push('', `... ${r.unknown.length - 200} more not shown.`);
  } else L.push('None.');
  L.push('');
  return L.join('\n');
}

function main(argv) {
  const o = { ...DEFAULTS }; let write = true;
  const val = (i) => { if (i + 1 >= argv.length) { console.error('missing value for ' + argv[i]); process.exit(2); } return argv[i + 1]; };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--inbox') o.inbox = path.resolve(val(i++));
    else if (a === '--report') o.report = path.resolve(val(i++));
    else if (a === '--no-report') write = false;
    else if (a === '--vocab') o.vocab = path.resolve(val(i++));
    else if (a === '--urls') o.urls = path.resolve(val(i++));
    else if (a === '--placeholders') o.placeholders = path.resolve(val(i++));
    else if (a === '--max-words') o.maxWords = +val(i++);
    else if (a === '--max-bytes') o.maxBytes = +val(i++);
    else if (a === '--min-edge') o.minEdge = +val(i++);
    else if (a === '--max-edge') o.maxEdge = +val(i++);
    else if (a === '--strict') o.strict = true;
    else { console.error('unknown option ' + a); process.exit(2); }
  }
  const r = checkInbox(o);
  if (write) { fs.mkdirSync(path.dirname(o.report), { recursive: true }); fs.writeFileSync(o.report, renderReport(r, o)); }
  for (const x of r.findings.filter((x) => x.sev === 'error')) console.log(`ERROR ${x.file}, ${x.loc}: ${x.detail}. ${fixFor(x.rule)}.`);
  console.log(`${r.files.length} file(s), ${r.errors} error(s), ${r.warnings} warning(s), ${r.flags} flag(s), ${r.unknown.length} unknown word(s)${r.placeholders ? ', ' + r.placeholders + ' placeholder cell(s)' : ''}${write ? '; report ' + path.relative(process.cwd(), o.report) : ''}`);
  process.exitCode = r.exit;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
