#!/usr/bin/env node
// OCR benchmark runner + scorer (dev tooling, NOT app code). Works on any dataset dir that has ground-truth.json in the
// schema written by gen.py (synthetic) or make-template.mjs (your own real photos).
//
//   node tools/ocr-bench/bench.mjs data/photo/_benchmark                 # synthetic set
//   node tools/ocr-bench/bench.mjs data/photo/real --engines tess-cli-best,tess-browser
//   options: --engines a,b,c   --best-dir DIR --fast-dir DIR (folders holding heb.traineddata)   --out file.json
//
// Engines: tess-cli-fast (system tesseract + its tessdata), tess-cli-best (tessdata_best heb), tess-browser / tess-browser-nopre (the
// shipped src/photo/engines/tesseract-browser.js running tesseract.js 7 WASM inside headless Chromium, with / without preprocessing).
// (tesseract.js under plain Node crashed here with a missing-SIMD-symbol error, so it is not benchmarked in Node.) The tessdata folders default to /tmp/tessdata-fast and /tmp/tessdata-best; fetch them from
// raw.githubusercontent.com/tesseract-ocr/tessdata_{fast,best}/main/heb.traineddata.
// Every number printed is measured on THE DATASET YOU POINT IT AT. For the synthetic set that is rendered text, not photos.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { consonantSkeleton, stripMarks } from '../../src/photo/hebrew.js';
import { orderLines } from '../../src/photo/order-lines.js';
import { matchPrayer } from '../../src/photo/match-prayer.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const datasetDir = resolve(args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1]?.startsWith('--') !== true) || join(root, 'data/photo/_benchmark'));
const FAST = opt('fast-dir', '/tmp/tessdata-fast'); const BEST = opt('best-dir', '/tmp/tessdata-best');
const wanted = (opt('engines', 'tess-cli-fast,tess-cli-best,tess-browser,tess-browser-nopre')).split(',');
const gt = JSON.parse(readFileSync(join(datasetDir, 'ground-truth.json'), 'utf8'));
const items = gt.items;
const empty = items.filter((i) => !i.lines?.length || i.lines.every((l) => !String(l).trim()));
if (empty.length) { console.error(`ground-truth.json: ${empty.length} item(s) have empty "lines" (e.g. ${empty[0].id}). Fill them in first.`); process.exit(1); }
const registry = JSON.parse(readFileSync(join(root, 'data/corpus/registry.json'), 'utf8'));

// ---------- engines: each returns {boxes:[{text,x,y,w,h}], ms} ----------
function parseTsv(tsv) {
  const out = [];
  for (const row of tsv.split('\n').slice(1)) {
    const c = row.split('\t'); if (c.length < 12 || c[0] !== '5') continue;
    const text = c.slice(11).join('\t').trim(); if (!text) continue;
    out.push({ text, x: +c[6], y: +c[7], w: +c[8], h: +c[9], conf: +c[10] });
  }
  return out;
}
const cli = (tessdir, psmFor) => async (file, item) => {
  const env = { ...process.env, ...(tessdir ? { TESSDATA_PREFIX: tessdir } : {}) };
  const t0 = performance.now();
  const r = spawnSync('tesseract', [file, 'stdout', '-l', 'heb', '--psm', String(psmFor(item)), '-c', 'tessedit_create_tsv=1'], { encoding: 'utf8', env, maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`tesseract failed: ${r.stderr}`);
  return { boxes: parseTsv(r.stdout), ms: performance.now() - t0 };
};
// --psm 6 (default): one uniform block for every image, which is what the app does (it cannot know the line count).
// --psm oracle: psm 7 for single-line items, 6 otherwise (uses ground truth, so optimistic; shown for reference only).
const PSM_MODE = opt('psm', '6');
const psmFor = (item) => (PSM_MODE === 'oracle' && item.lines.length === 1 ? 7 : 6);
// The exact module the app ships (src/photo/engines/tesseract-browser.js) run inside headless Chromium via Playwright.
const browserState = {};
const browser = (name, preprocess) => async (file) => {
  if (!browserState.page) {
    const { createAppServer } = await import('../serve.mjs');
    const req = createRequire(import.meta.url);
    let chromium; try { ({ chromium } = req('playwright')); } catch { ({ chromium } = req('/usr/lib/node_modules/playwright')); }
    browserState.server = createAppServer(); await new Promise((r) => browserState.server.listen(0, r));
    browserState.browser = await chromium.launch();
    browserState.page = await browserState.browser.newPage();
    await browserState.page.goto(`http://localhost:${browserState.server.address().port}/offline.html`);
    await browserState.page.evaluate(async () => { window.__mod = await import('/src/photo/engines/tesseract-browser.js'); window.__eng = {}; });
  }
  const page = browserState.page;
  const b64 = readFileSync(file).toString('base64');
  const t0 = performance.now();
  const boxes = await page.evaluate(async ({ b64, name, preprocess }) => {
    const eng = (window.__eng[name] ||= window.__mod.createBrowserTesseract({ preprocess, psm: 6 }));
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return eng.ocr(new Blob([bin]));
  }, { b64, name, preprocess });
  return { boxes, ms: performance.now() - t0 };
};
const ENGINES = {
  'tess-browser': { desc: 'APP ENGINE: vendored tesseract.js 7 WASM in headless Chromium, tessdata_fast heb, psm 6, with src/photo/preprocess.js contrast normalisation', run: browser('pre', true) },
  'tess-browser-nopre': { desc: 'same, preprocessing OFF', run: browser('nopre', false) },
  'tess-cli-fast': { desc: 'tesseract 5.3.4 CLI, tessdata_fast heb (the system package copy), psm 7 single-line / 6 multi-line', run: cli(FAST, psmFor) },
  'tess-cli-best': { desc: 'tesseract 5.3.4 CLI, tessdata_best heb (3.7 MB), same psm', run: cli(BEST, psmFor) },
};

// ---------- metrics ----------
function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
function lcs(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length];
}
const POINT_RE = /[ְ-ׇ]/g; // points and taamim region incl. maqaf/paseq/sof pasuq: we filter below
const isPoint = (ch) => { const c = ch.codePointAt(0); return (c >= 0x5b0 && c <= 0x5bd) || c === 0x5bf || c === 0x5c1 || c === 0x5c2 || c === 0x5c4 || c === 0x5c5 || c === 0x5c7; };
const pointBag = (s) => { const m = new Map(); for (const ch of String(s).normalize('NFD')) if (isPoint(ch)) m.set(ch, (m.get(ch) || 0) + 1); return m; };
function niqqudSurvival(gtText, ocrText) {
  const g = pointBag(gtText), o = pointBag(ocrText); let tot = 0, kept = 0, extra = 0;
  for (const [k, v] of g) { tot += v; kept += Math.min(v, o.get(k) || 0); }
  for (const v of o.values()) extra += v;
  return { total: tot, kept, ocrPoints: extra };
}
const wordsOf = (s) => String(s).normalize('NFKD').replace(/[֑-ׇ]/g, '').replace(/[־׃]/g, ' ').replace(/[ךםןףץ]/g, (c) => ({ 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' }[c])).replace(/[^א-ת ]/g, ' ').split(/\s+/).filter(Boolean);

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const pct = (x) => (x == null ? null : Math.round(x * 1000) / 10);
const pctile = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };

function expectedPrayerIds(item) {
  const m = /^registry:(.+)$/.exec(item.source || ''); return m ? m[1].split('+') : null;
}
const registryByIdSkel = new Map((registry.entries || []).map((e) => [e.id, consonantSkeleton(e.he)]));

async function evalEngine(name) {
  const eng = ENGINES[name]; const per = [];
  for (const it of items) {
    const file = join(datasetDir, it.file);
    let res; try { res = await eng.run(file, it); } catch (e) { per.push({ id: it.id, error: String(e.message || e) }); continue; }
    const lines = orderLines(res.boxes);
    const text = lines.map((l) => l.text).join('\n');
    const refSkel = it.lines.map((l) => consonantSkeleton(l)).join('');
    const hypSkel = consonantSkeleton(text);
    const ed = lev(refSkel, hypSkel);
    const refW = wordsOf(it.lines.join(' ')); const hypW = wordsOf(text);
    const row = { id: it.id, kind: it.kind, variant: it.variant, ms: Math.round(res.ms), refLen: refSkel.length, charEdits: ed, cer: refSkel.length ? ed / refSkel.length : null,
      refWords: refW.length, wordsMatched: lcs(refW, hypW), ocrText: text };
    if (it.kind.startsWith('siddur')) row.niqqud = niqqudSurvival(it.lines.join(' '), text);
    // prayer matching at several thresholds
    const exp = expectedPrayerIds(it);
    if (it.kind.startsWith('siddur') || it.kind === 'sign') {
      row.match = {};
      for (const th of [0.6, 0.75, 0.9]) {
        const outs = lines.map((l) => matchPrayer(l.text, registry, { threshold: th }));
        if (it.kind === 'sign') row.match[th] = { falseAccept: outs.some((m) => m?.matched) };
        else if (exp) {
          let ok = 0; const n = it.lines.length;
          for (let i = 0; i < n; i++) { const m = outs[i]; if (m?.matched && (m.id === exp[i] || (registryByIdSkel.get(m.id) && consonantSkeleton(it.lines[i]) === consonantSkeleton(m.pointed)))) ok++; }
          row.match[th] = { correct: ok, of: n, accepted: outs.filter((m) => m?.matched).length };
        }
      }
    }
    per.push(row);
  }
  return per;
}

function aggregate(rows) {
  const ok = rows.filter((r) => !r.error);
  const agg = (sel) => {
    const rs = ok.filter(sel); if (!rs.length) return null;
    const chars = rs.reduce((s, r) => s + r.refLen, 0), edits = rs.reduce((s, r) => s + r.charEdits, 0);
    const w = rs.reduce((s, r) => s + r.refWords, 0), wm = rs.reduce((s, r) => s + r.wordsMatched, 0);
    const nq = rs.filter((r) => r.niqqud);
    const nqt = nq.reduce((s, r) => s + r.niqqud.total, 0), nqk = nq.reduce((s, r) => s + r.niqqud.kept, 0);
    return { n: rs.length, charAccuracyPct: pct(Math.max(0, 1 - edits / chars)), cerPct: pct(edits / chars), wordRecallPct: pct(wm / w),
      exactLinePct: pct(rs.filter((r) => r.charEdits === 0).length / rs.length), niqqudKeptPct: nqt ? pct(nqk / nqt) : null, msMedian: pctile(rs.map((r) => r.ms), 0.5), msP95: pctile(rs.map((r) => r.ms), 0.95) };
  };
  const out = { all: agg(() => true), byKind: {}, byVariant: {}, errors: rows.length - ok.length };
  for (const k of new Set(ok.map((r) => r.kind))) out.byKind[k] = agg((r) => r.kind === k);
  for (const v of new Set(ok.map((r) => r.variant))) out.byVariant[v] = agg((r) => r.variant === v);
  out.byKindVariant = {};
  for (const k of new Set(ok.map((r) => r.kind))) for (const v of new Set(ok.map((r) => r.variant))) { const a = agg((r) => r.kind === k && r.variant === v); if (a) out.byKindVariant[`${k}/${v}`] = a; }
  out.prayerMatch = {};
  for (const th of [0.6, 0.75, 0.9]) {
    const sid = ok.filter((r) => r.kind.startsWith('siddur') && r.match?.[th]);
    const c = sid.reduce((s, r) => s + r.match[th].correct, 0), n = sid.reduce((s, r) => s + r.match[th].of, 0);
    const wrongAccept = sid.reduce((s, r) => s + (r.match[th].accepted - r.match[th].correct), 0);
    const sg = ok.filter((r) => r.kind === 'sign' && r.match?.[th]);
    out.prayerMatch[th] = { lineTop1Pct: n ? pct(c / n) : null, lines: n, wrongAcceptedLines: wrongAccept, signFalseAcceptPct: sg.length ? pct(sg.filter((r) => r.match[th].falseAccept).length / sg.length) : null, signs: sg.length };
  }
  return out;
}

const results = { dataset: datasetDir, synthetic: !!gt.synthetic, count: items.length, date: new Date().toISOString(), engines: {} };
for (const name of wanted) {
  if (!ENGINES[name]) { console.error('unknown engine', name); continue; }
  const dirOk = name.startsWith('tess-browser') ? existsSync(join(root, 'assets/vendor/_tesseract/heb.traineddata')) : name.endsWith('best') ? existsSync(join(BEST, 'heb.traineddata')) : existsSync(join(FAST, 'heb.traineddata'));
  if (!dirOk) { console.error(`skip ${name}: heb.traineddata not found`); continue; }
  console.error(`running ${name} on ${items.length} images ...`);
  const rows = await evalEngine(name);
  results.engines[name] = { desc: ENGINES[name].desc, summary: aggregate(rows), perImage: rows };
}
if (browserState.browser) { await browserState.browser.close(); browserState.server.close(); }
const outFile = opt('out', join(datasetDir, 'results.json'));
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(results, null, 1));
console.log(`${results.synthetic ? 'SYNTHETIC (rendered text, not photos)' : 'dataset'} ${datasetDir}  n=${items.length}`);
for (const [n, e] of Object.entries(results.engines)) {
  const a = e.summary.all;
  console.log(`${n.padEnd(14)} charAcc ${a.charAccuracyPct}%  wordRecall ${a.wordRecallPct}%  exactLine ${a.exactLinePct}%  niqqudKept ${a.niqqudKeptPct}%  ms p50 ${a.msMedian} p95 ${a.msP95}  errors ${e.summary.errors}`);
}
console.log('wrote', outFile);
