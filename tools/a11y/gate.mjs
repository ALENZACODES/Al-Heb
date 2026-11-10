#!/usr/bin/env node
// Accessibility gate: runs the existing a11y tools and fails on a regression against tools/a11y/gate-baseline.json.
//   keyboard.mjs  - keyboard-only walk. Any FAIL fails the gate; a "known gap" fails only if it is not in the baseline.
//   newviews.mjs  - axe + focus/name/reflow/Hebrew checks. Any finding (route + kind) not in the baseline fails the gate.
//   contrast.mjs  - colour-pair ratios from the CSS tokens (only if the file exists). Any failing pair not in the baseline fails the gate.
// Usage: node tools/a11y/gate.mjs [--only keyboard,newviews,contrast] [--json] [--update-baseline]
// Exit 0 = no regression, 1 = regression, 2 = a step could not run (no Playwright / axe-core), which is never reported as a pass.
// Every tool measures numbers in desktop Chromium. A clean gate is not proof that anyone can use the app: no screen reader, switch,
// real phone or person is involved. Output goes to a temporary folder outside the repo, removed at the end.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, '..', '..');
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const only = arg('--only') ? arg('--only').split(',') : ['keyboard', 'newviews', 'contrast'];
const baselineFile = join(here, 'gate-baseline.json');
const baseline = existsSync(baselineFile) ? JSON.parse(readFileSync(baselineFile, 'utf8')) : { keyboardGaps: [], newviews: [], contrastKnown: [] };
const tmp = mkdtempSync(join(tmpdir(), 'alef-a11y-gate-'));
const run = (file, args) => spawnSync(process.execPath, [join(here, file), ...args], { cwd: root, encoding: 'utf8', timeout: 900000, maxBuffer: 64 * 1024 * 1024 });
const tail = (r) => ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-6).join('\n');
const steps = [];
const newBaseline = { keyboardGaps: [], newviews: [], contrastKnown: [] };

/** @type {Record<string, () => {status:'pass'|'fail'|'cannot-run', detail:string, regressions:string[]}>} */
const STEPS = {
  keyboard() {
    const out = join(tmp, 'keyboard.json');
    const r = run('keyboard.mjs', ['--out', out]);
    if (r.status === 2 || !existsSync(out)) return { status: r.status === 2 ? 'cannot-run' : 'fail', detail: tail(r), regressions: ['keyboard walk did not produce results'] };
    const { results } = JSON.parse(readFileSync(out, 'utf8'));
    const fails = results.filter((x) => !x.ok && !x.gap).map((x) => `FAIL [${x.flow}] ${x.name}`);
    const gaps = results.filter((x) => x.gap).map((x) => `[${x.flow}] ${x.name}`);
    newBaseline.keyboardGaps = gaps;
    const fresh = gaps.filter((g) => !baseline.keyboardGaps.includes(g)).map((g) => `new known-gap ${g}`);
    const stale = baseline.keyboardGaps.filter((g) => !gaps.includes(g));
    return { status: fails.length || fresh.length ? 'fail' : 'pass', detail: `${results.filter((x) => x.ok).length} ok, ${fails.length} FAIL, ${gaps.length} gaps (baseline ${baseline.keyboardGaps.length})${stale.length ? `; ${stale.length} baseline gap(s) now fixed, run --update-baseline` : ''}`, regressions: [...fails, ...fresh] };
  },
  newviews() {
    if (!existsSync(join(here, 'node_modules/axe-core/axe.min.js'))) return { status: 'cannot-run', detail: 'axe-core missing: cd tools/a11y && npm install', regressions: ['axe-core not installed'] };
    const out = join(tmp, 'newviews.json');
    const r = run('newviews.mjs', ['--out', out, '--json']);
    if (r.status === 2 || !existsSync(out)) return { status: r.status === 2 ? 'cannot-run' : 'fail', detail: tail(r), regressions: ['newviews did not produce results'] };
    const res = JSON.parse(readFileSync(out, 'utf8'));
    const key = (f) => `${f.route} ${f.kind}`;
    const keys = [...new Set(res.findings.map(key))];
    newBaseline.newviews = keys;
    const fresh = res.findings.filter((f) => !baseline.newviews.includes(key(f))).map((f) => `${f.route} [${f.theme}] ${f.kind}: ${f.detail}`.slice(0, 220));
    const stale = baseline.newviews.filter((k) => !keys.includes(k));
    return { status: fresh.length ? 'fail' : 'pass', detail: `${res.summary.routes} routes, ${res.findings.length} findings (${keys.length} distinct; baseline ${baseline.newviews.length})${stale.length ? `; ${stale.length} baseline entr(ies) now fixed, run --update-baseline` : ''}`, regressions: fresh };
  },
  contrast() {
    if (!existsSync(join(here, 'contrast.mjs'))) return { status: 'pass', detail: 'tools/a11y/contrast.mjs does not exist in this checkout; step skipped', regressions: [] };
    // contrast.mjs prints one "FAIL  ratio (need N)  fg on bg  label" line per failing pair; a pair listed in the baseline is a documented exception.
    const r = run('contrast.mjs', []);
    if (r.status !== 0) return { status: 'fail', detail: tail(r), regressions: ['contrast.mjs exited ' + r.status] };
    const fails = (r.stdout || '').split('\n').filter((l) => /^FAIL/.test(l)).map((l) => l.trim());
    const known = baseline.contrastKnown || [];
    newBaseline.contrastKnown = fails.map((l) => l.replace(/^FAIL\s+[\d.]+ \(need [\d.]+\)\s+#\w+ on #\w+\s+/, ''));
    const fresh = fails.filter((l) => !known.some((k) => l.endsWith(k)));
    const total = ((r.stdout || '').match(/(\d+) pairs checked/) || [])[1];
    return { status: fresh.length ? 'fail' : 'pass', detail: `${total} pairs, ${fails.length} below target (${known.length} documented exception(s) in the baseline)`, regressions: fresh };
  },
};

let code = 0;
try {
  for (const name of only) {
    if (!STEPS[name]) { console.error('unknown step ' + name); code = 2; continue; }
    const t0 = Date.now();
    const s = STEPS[name]();
    steps.push({ name, ...s, seconds: Math.round((Date.now() - t0) / 1000) });
    console.log(`${s.status === 'pass' ? 'ok  ' : s.status === 'fail' ? 'FAIL' : 'SKIP'} ${name}: ${s.detail}`);
    for (const x of s.regressions) console.log('     ' + x);
    if (s.status === 'fail') code = code || 1;
    if (s.status === 'cannot-run') code = code === 1 ? 1 : 2;
  }
  if (argv.includes('--update-baseline')) {
    const merged = { ...baseline };
    if (only.includes('keyboard')) merged.keyboardGaps = newBaseline.keyboardGaps;
    if (only.includes('newviews')) merged.newviews = newBaseline.newviews;
    if (only.includes('contrast')) merged.contrastKnown = newBaseline.contrastKnown;
    writeFileSync(baselineFile, JSON.stringify(merged, null, 1) + '\n');
    console.log('baseline written: ' + baselineFile);
  }
  if (argv.includes('--json')) console.log(JSON.stringify({ steps }, null, 1));
  console.log(code === 0 ? 'a11y gate: no regression against the baseline' : code === 1 ? 'a11y gate: REGRESSION' : 'a11y gate: could not run every step (not a pass)');
} finally { rmSync(tmp, { recursive: true, force: true }); }
process.exit(code);
