#!/usr/bin/env node
// Back test of Talk on sentence pairs written by people: the dictionary's example sentences (data/vocab/words.json, from
// Tatoeba, CC BY 2.0 FR; credits in data/vocab/attribution.json). Each pair is asked both ways, so a run of 5,000 lines is
// 2,500 sentences (about 4,700 pairs are short enough to use). Runs the shipped code and the shipped language pack; no network.
//
//   node tools/talk/nmt/backtest.mjs [--n 5000] [--seed 20261111] [--mode hybrid|model|phrases] [--beams 2]
//                                    [--out results.json] [--rows rows.jsonl] [--short] [--skip 3000]
//
// hybrid: what the screen does with the pack on the device (stored lines first, the pack for the rest).
// model:  every line through the pack.   phrases: stored lines only (the screen without the pack).
// --short: only pairs of one to three English words (the "two simple words" case).
//
// Numbers reported, each way and by how the line was answered:
//   answered   lines that got any translation
//   exact      the same words as the person's translation, after case, vowel points and punctuation are set aside
//   words      the house score: 1 minus the word error rate against the person's translation
//   letters    chrF (character n-grams 1 to 6, recall weighted twice): a standard machine-translation measure that
//              gives part marks for a different but close wording
// Read them with two cautions. A sentence has many right translations and each pair holds one, so a right answer in other
// words scores below 1. And the pack's model was trained on public sentence collections that include Tatoeba, so it may
// have seen some of these pairs: treat the scores as an upper bound, and use the run to find mistakes, not to brag.
import { readFileSync, writeFileSync } from 'node:fs';
import { loadEngine } from '../../../src/talk/data.js';
import { translateLine } from '../../../src/talk/hybrid.js';
import { finishLine } from '../../../src/talk/nmt/postedit.js';
import { translationMatchScore, normalizeForCompare } from '../../../src/talk/talk.model.js';
import { loadDirection } from './node-runtime.mjs';
import { openContractions } from './scoring.mjs';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const has = (n) => { const i = args.indexOf(n); if (i < 0) return false; args.splice(i, 1); return true; };
const N = Number(flag('--n', '5000')); const seed = Number(flag('--seed', '20261111')); const mode = flag('--mode', 'hybrid');
const beams = Number(flag('--beams', '2')); const outFile = flag('--out', ''); const rowsFile = flag('--rows', ''); const short = has('--short');
const skip = Number(flag('--skip', '0')); // start this many sentences into the list: a slice kept apart for trying changes

/** Small seeded generator, so the same seed always picks the same sentences. */
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** The person-written pairs, each once, in a fixed shuffled order. */
export function pairs({ seed: s = 20261111, short: onlyShort = false } = {}) {
  const words = JSON.parse(readFileSync(new URL('../../../data/vocab/words.json', import.meta.url), 'utf8')).words;
  const seen = new Set(); const out = [];
  for (const w of words) {
    const e = w.example;
    if (!e || !e.he || !e.en || e.source?.type !== 'tatoeba') continue;
    const he = String(e.he).trim(), en = String(e.en).trim();
    const key = he + '\u0001' + en;
    if (seen.has(key)) continue; seen.add(key);
    const enWords = en.split(/\s+/).length, heWords = he.split(/\s+/).length;
    if (/[a-zA-Z]/.test(he) || /[֐-׿]/.test(en)) continue; // mixed-script lines are not a translation test
    if (enWords > 14 || heWords > 14) continue;                          // Talk is for short lines
    if (onlyShort && enWords > 3) continue;
    out.push({ he, en, id: `t${e.source.heId}-${e.source.enId}` });
  }
  const rnd = mulberry32(s);
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/** chrF with character n-grams 1..6 and beta 2, spaces left out (the usual settings). Both sides normalized the same way. */
export function chrF(hyp, ref, maxN = 6, beta = 2) {
  const clean = (x) => normalizeForCompare(x).replace(/\s+/g, '');
  const h = clean(hyp), r = clean(ref);
  if (!h || !r) return h === r ? 1 : 0;
  let pSum = 0, rSum = 0, used = 0;
  for (let n = 1; n <= maxN; n++) {
    if (h.length < n && r.length < n) continue;
    const grams = (s) => { const m = new Map(); for (let i = 0; i + n <= s.length; i++) { const g = s.slice(i, i + n); m.set(g, (m.get(g) || 0) + 1); } return m; };
    const H = grams(h), R = grams(r);
    let match = 0, hTot = 0, rTot = 0;
    for (const [g, c] of H) { hTot += c; match += Math.min(c, R.get(g) || 0); }
    for (const c of R.values()) rTot += c;
    pSum += hTot ? match / hTot : 0; rSum += rTot ? match / rTot : 0; used++;
  }
  if (!used) return 0;
  const p = pSum / used, rc = rSum / used;
  return p + rc === 0 ? 0 : ((1 + beta * beta) * p * rc) / (beta * beta * p + rc);
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const all = pairs({ seed, short });
  // Each pair is asked both ways (English to Hebrew, then Hebrew to English), so --n 5000 is 2,500 sentences and 5,000 lines.
  const take = all.slice(skip, skip + Math.ceil(N / 2));
  const samples = take.flatMap((p) => [{ id: p.id + '-enhe', direction: 'en-he', source: p.en, reference: p.he }, { id: p.id + '-heen', direction: 'he-en', source: p.he, reference: p.en }]).slice(0, N);
  const engine = await loadEngine(); await engine.loadDictionary();
  let terms = null; try { terms = JSON.parse(readFileSync(new URL('../../../data/talk/terms.json', import.meta.url), 'utf8')); } catch { /* optional */ }
  const loaded = {};
  const pack = mode === 'phrases' ? null : { ready: () => true, translate: async (d, t) => (loaded[d] ||= await loadDirection(d)).translate(t, { beams }) };
  const rows = []; const t0 = Date.now();
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    let r;
    try {
      if (mode === 'model') r = { ok: true, direction: s.direction, method: 'model', translation: finishLine(await pack.translate(s.direction, s.source), s.source, s.direction, terms) };
      else r = await translateLine(engine, pack, s.source, { direction: s.direction, terms });
    } catch (e) { r = { ok: false, method: 'error', translation: '', error: String(e?.message || e).slice(0, 120) }; }
    const hyp = r.ok ? String(r.translation || '') : '';
    const en = s.direction === 'he-en';
    const fix = (x) => (en ? openContractions(x) : x);
    rows.push({ id: s.id, direction: s.direction, source: s.source, reference: s.reference, hyp, method: r.ok ? r.method : (r.method === 'error' ? 'error' : 'none'),
      words: hyp ? translationMatchScore(fix(hyp), fix(s.reference)) : 0, letters: hyp ? chrF(fix(hyp), fix(s.reference)) : 0 });
    if ((i + 1) % 500 === 0) console.error(`${i + 1}/${samples.length} lines, ${Math.round((Date.now() - t0) / 1000)}s`);
  }
  const pct = (xs) => (xs.length ? Number(((100 * xs.reduce((a, b) => a + b, 0)) / xs.length).toFixed(1)) : null);
  const of = (sel) => { const r = rows.filter(sel); return { lines: r.length, answered: r.filter((x) => x.hyp).length, exact: r.filter((x) => x.words === 1).length, words: pct(r.map((x) => x.words)), letters: pct(r.map((x) => x.letters)) }; };
  const methods = [...new Set(rows.map((r) => r.method))].sort();
  const summary = { pairsAvailable: all.length, lines: rows.length, seed, skip, mode, beams, short, seconds: Math.round((Date.now() - t0) / 1000),
    all: of(() => true), 'en-he': of((x) => x.direction === 'en-he'), 'he-en': of((x) => x.direction === 'he-en'),
    byMethod: Object.fromEntries(methods.map((m) => [m, of((x) => x.method === m)])) };
  console.log(JSON.stringify(summary, null, 1));
  if (outFile) writeFileSync(outFile, JSON.stringify({ schema: 'alef.talk.backtest.v1', summary }, null, 1) + '\n');
  if (rowsFile) writeFileSync(rowsFile, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
}
