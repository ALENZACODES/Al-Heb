#!/usr/bin/env node
// Promote one checked draft out of the inbox:  node tools/drafts/promote.mjs <file> <destination dir> [--inbox DIR] [--log FILE] [--strict] [--force-flags]
// Refuses a file that has any error. MOVES the file (it is gone from the inbox afterwards) and logs one line to docs/drafts/PROMOTED.md.
// '?? CHECK' lines do not block (they are the reviewer's job) unless --strict; the log records how many there were.
// Exit 0 = moved, 1 = refused, 2 = bad usage.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkInbox, DEFAULTS } from './check_inbox.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
export const DEFAULT_LOG = path.join(root, 'docs/drafts/PROMOTED.md');

export function promote(file, destDir, opts = {}) {
  const inbox = path.resolve(opts.inbox || DEFAULTS.inbox);
  const log = path.resolve(opts.log || DEFAULT_LOG);
  const src = path.resolve(file);
  const rel = path.relative(inbox, src);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return { ok: false, msg: `Refused: ${file} is not inside the inbox (${inbox}).` };
  if (!fs.existsSync(src) || !fs.statSync(src).isFile()) return { ok: false, msg: `Refused: no such file ${file}.` };
  if (!destDir) return { ok: false, msg: 'Refused: give a destination folder.' };
  const dest = path.resolve(destDir);
  const inInbox = path.relative(inbox, dest);
  if (!inInbox.startsWith('..') && !path.isAbsolute(inInbox)) return { ok: false, msg: 'Refused: the destination is inside the inbox. Pick a data or docs folder.' };
  if (fs.existsSync(dest) && !fs.statSync(dest).isDirectory()) return { ok: false, msg: `Refused: ${destDir} is a file, not a folder.` };
  const target = path.join(dest, path.basename(src));
  if (fs.existsSync(target)) return { ok: false, msg: `Refused: ${path.basename(src)} already exists in ${destDir}. Nothing was changed.` };

  // check the whole inbox, then look only at this file's findings
  const r = checkInbox({ ...opts.check, inbox });
  const relPosix = rel.split(path.sep).join('/');
  const mine = r.findings.filter((x) => x.file === relPosix);
  const errs = mine.filter((x) => x.sev === 'error');
  const flags = mine.filter((x) => x.sev === 'flag');
  if (errs.length) {
    const lines = errs.slice(0, 10).map((x) => `  - ${x.loc}: ${x.detail}`);
    return { ok: false, msg: `Refused: ${errs.length} error(s) in ${path.basename(src)}. Nothing was moved.\n${lines.join('\n')}${errs.length > 10 ? `\n  ... ${errs.length - 10} more (see the report)` : ''}\nFix at the source or ask the drafter for a redo, then run the check again.` };
  }
  if (flags.length && opts.strict) return { ok: false, msg: `Refused (--strict): ${flags.length} line(s) marked ?? CHECK. Get a native speaker to answer them first.` };

  fs.mkdirSync(dest, { recursive: true });
  try { fs.renameSync(src, target); } catch (e) {
    if (e.code !== 'EXDEV') throw e;
    fs.copyFileSync(src, target, fs.constants.COPYFILE_EXCL); fs.unlinkSync(src); // different disk: copy then remove, still a move
  }
  const warns = mine.filter((x) => x.sev === 'warn').length;
  const unk = r.unknown.filter((u) => u.first.startsWith(relPosix + ' ')).length;
  const d = new Date().toISOString().slice(0, 10);
  const dRel = path.relative(root, target).split(path.sep).join('/');
  const line = `| ${d} | ${relPosix} | ${dRel.startsWith('..') ? target : dRel} | ${warns} | ${flags.length} | ${unk} |`;
  fs.mkdirSync(path.dirname(log), { recursive: true });
  if (!fs.existsSync(log)) fs.writeFileSync(log, '# Promoted drafts\n\nOne line per file moved out of the inbox by `node tools/drafts/promote.mjs`. Nothing is checked as correct Hebrew; the last three columns say how much a person still has to look at.\n\n| Date | From inbox | Moved to | Warnings | ?? CHECK lines | Unknown words (first seen here) |\n|---|---|---|---:|---:|---:|\n');
  fs.appendFileSync(log, line + '\n');
  return { ok: true, msg: `Moved ${relPosix} to ${destDir}. Logged in ${path.relative(root, log)}.${flags.length ? ` It still has ${flags.length} ?? CHECK line(s): a native speaker must answer them.` : ''}${unk ? ` ${unk} unknown word(s) need a person to confirm.` : ''}`, target };
}

function main(argv) {
  const pos = []; const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--inbox') o.inbox = argv[++i];
    else if (a === '--log') o.log = argv[++i];
    else if (a === '--strict') o.strict = true;
    else if (a.startsWith('--')) { console.error('unknown option ' + a); process.exit(2); }
    else pos.push(a);
  }
  if (pos.length !== 2) { console.error('usage: node tools/drafts/promote.mjs <file in inbox> <destination folder> [--strict]'); process.exit(2); }
  const r = promote(pos[0], pos[1], o);
  (r.ok ? console.log : console.error)(r.msg);
  process.exitCode = r.ok ? 0 : 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
