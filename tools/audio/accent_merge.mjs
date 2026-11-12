#!/usr/bin/env node
// Bring one accent-fill run's results into the working tree: for every result branch john/accent-fill-r<run>-<n> (pushed by
// .github/workflows/accent-fill.yml), copy the review log and each clip the review passed (decision "pass": at most one of the three
// reviewers heard a word off) with its sidecar, then admit those rows (accent.mjs markAccentRows, source tts-respelled-israeli-voice).
// Held clips were never pushed, so their rows keep playing the Israeli clip. Fetch the branches first:
//   git fetch origin 'refs/heads/john/accent-fill-r3-*:refs/remotes/origin/john/accent-fill-r3-*'
//   node tools/audio/accent_merge.mjs --run 3 [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { markAccentRows, ACCENT_SOURCES } from './accent.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, maxBuffer: 1 << 28 });
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };

export function mergeRun(run, { dry = false } = {}) {
  const branches = git('branch', '-r', '--list', `origin/john/accent-fill-r${run}-*`).toString().split('\n').map((s) => s.trim()).filter(Boolean);
  const marks = new Map(); let reviewed = 0;
  for (const b of branches) {
    const n = b.split('-').pop();
    const log = `docs/audio/fill/accent-r${run}-${n}.jsonl`;
    let text;
    try { text = git('show', `${b}:${log}`).toString('utf8'); } catch { continue; }
    if (!dry) { fs.mkdirSync(path.join(ROOT, path.dirname(log)), { recursive: true }); fs.writeFileSync(path.join(ROOT, log), text); }
    for (const line of text.split('\n').filter(Boolean)) {
      const r = JSON.parse(line); reviewed++;
      if (r.decision !== 'pass') continue;
      for (const f of [r.path, `${r.path}.meta.json`]) {
        const buf = git('show', `${b}:${f}`);
        if (!dry) { fs.mkdirSync(path.join(ROOT, path.dirname(f)), { recursive: true }); fs.writeFileSync(path.join(ROOT, f), buf); }
      }
      marks.set(r.path, { source: ACCENT_SOURCES.israeliVoice });
    }
  }
  const res = markAccentRows(ROOT, marks, { dry });
  return { branches: branches.length, reviewed, passed: marks.size, marked: res.marked.length, skipped: res.skipped.length, notFound: res.notFound };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(mergeRun(arg('--run'), { dry: process.argv.includes('--dry') })));
}
