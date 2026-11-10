// Mechanical audit sweep over data/vocab/vocab5000.json (and the matching words.json records), reproducing the
// full-set checks of the 2026-11-04 audit (docs/vocab/AUDIT-RESPONSE.md) so that new hits fail a test.
//
//   node tools/vocab/audit_checks.mjs                   print the counts and every hit
//   node tools/vocab/audit_checks.mjs --check           exit 1 when a hit is not in data/vocab/audit-baseline.json
//   node tools/vocab/audit_checks.mjs --write-baseline  rewrite data/vocab/audit-baseline.json from the current data
//
// Checks (each hit has a stable key, so ranks may move without the baseline changing):
//   null-pointed             pointed is null / needsPointing                        key: entry id
//   hebrew-in-gloss          the English gloss contains Hebrew letters or points   key: entry id
//   verb-gloss-form          pos verb and the gloss does not start with "to "      key: entry id
//   duplicate-lemma-pointed  several entries share (lemma, pointed)                key: lemma|pointed
//   circular-gloss           the gloss is only the transliteration of the word     key: entry id
//   furtive-patach-translit  words.json translit ends "-cha" for a word ending in  key: words.json id
//                            chet + patach (furtive patach, which is read "-ach")
// The baseline records the hits that are known and documented; the test fails on a hit outside the baseline and
// when the baseline is stale (a hit that no longer exists), so fixing one means rewriting the baseline.
// Nothing here edits any data file.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from './frequency.mjs';

export const BASELINE_PATH = 'data/vocab/audit-baseline.json';
export const CHECKS = ['null-pointed', 'hebrew-in-gloss', 'verb-gloss-form', 'duplicate-lemma-pointed', 'circular-gloss', 'furtive-patach-translit'];

const HEBREW = /[֐-׿]/;
const rd = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const normTranslit = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

/** Run every check. Returns { counts, hits: { check: [{ key, rank, lemma, pointed, detail }] } }. */
export function runChecks(root = ROOT) {
  const entries = rd(root, 'data/vocab/vocab5000.json').entries;
  const words = rd(root, 'data/vocab/words.json').words;
  const byPointedPos = new Map();
  const byLemmaPos = new Map();
  for (const w of words) {
    const k1 = w.he.normalize('NFC') + '|' + w.pos;
    if (!byPointedPos.has(k1)) byPointedPos.set(k1, w);
    const k2 = (w.heUnpointed || '') + '|' + w.pos;
    if (!byLemmaPos.has(k2)) byLemmaPos.set(k2, w);
  }
  const match = (e) => (e.pointed && byPointedPos.get(e.pointed.normalize('NFC') + '|' + e.pos)) || byLemmaPos.get(e.lemma + '|' + e.pos) || null;
  const hits = Object.fromEntries(CHECKS.map((c) => [c, []]));
  const hit = (check, key, e, detail) => hits[check].push({ key, rank: e.rank, lemma: e.lemma, pointed: e.pointed ?? null, detail });

  const groups = new Map();
  for (const e of entries) {
    if (e.pointed == null || e.needsPointing) hit('null-pointed', e.id, e, e.gloss);
    if (HEBREW.test(e.gloss)) hit('hebrew-in-gloss', e.id, e, e.gloss);
    if (e.pos === 'verb' && !/^to\b/.test(e.gloss)) hit('verb-gloss-form', e.id, e, e.gloss);
    const w = match(e);
    if (w && w.translit && normTranslit(e.gloss) === normTranslit(w.translit)) hit('circular-gloss', e.id, e, `${e.gloss} = ${w.translit}`);
    if (e.pointed) {
      const k = e.lemma + '|' + e.pointed.normalize('NFC');
      (groups.get(k) || groups.set(k, []).get(k)).push(e);
    }
  }
  for (const [k, g] of groups) if (g.length > 1) hit('duplicate-lemma-pointed', k, g[0], g.map((x) => `${x.rank}:${x.pos}:${x.gloss}`).join(' / '));
  for (const w of words) {
    if (/חַ$/.test(w.he.normalize('NFC')) && /cha$/.test(w.translit || '')) hits['furtive-patach-translit'].push({ key: w.id, rank: w.frequencyRank ?? null, lemma: w.heUnpointed, pointed: w.he, detail: w.translit });
  }
  for (const c of CHECKS) hits[c].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || (a.key < b.key ? -1 : 1));
  const counts = Object.fromEntries(CHECKS.map((c) => [c, hits[c].length]));
  return { counts, hits };
}

export function readBaseline(root = ROOT) {
  const p = path.join(root, BASELINE_PATH);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}

/** Compare a run against the baseline: { fresh: {check: [hit]}, stale: {check: [key]} }. */
export function diffBaseline(run, baseline) {
  const fresh = {}, stale = {};
  for (const c of CHECKS) {
    const known = new Set((baseline?.hits?.[c] || []).map((h) => h.key));
    const now = new Set(run.hits[c].map((h) => h.key));
    fresh[c] = run.hits[c].filter((h) => !known.has(h.key));
    stale[c] = [...known].filter((k) => !now.has(k));
  }
  return { fresh, stale };
}

export function baselineDoc(run) {
  return {
    schema: 'alef-vocab-audit-baseline/1',
    note: 'Known hits of tools/vocab/audit_checks.mjs on data/vocab/vocab5000.json and words.json. Every key here is listed and explained in docs/vocab/AUDIT-RESPONSE.md; tests/vocab.audit.test.js fails on any hit outside this list and on a stale entry. Rewrite with --write-baseline after fixing data.',
    counts: run.counts,
    hits: Object.fromEntries(CHECKS.map((c) => [c, run.hits[c].map((h) => ({ key: h.key, lemma: h.lemma, pointed: h.pointed, detail: h.detail }))])),
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = new Set(process.argv.slice(2));
  const run = runChecks();
  if (args.has('--write-baseline')) {
    fs.writeFileSync(path.join(ROOT, BASELINE_PATH), JSON.stringify(baselineDoc(run), null, 1) + '\n');
    console.log(`wrote ${BASELINE_PATH}: ${JSON.stringify(run.counts)}`);
  } else if (args.has('--check')) {
    const d = diffBaseline(run, readBaseline());
    let bad = 0;
    for (const c of CHECKS) {
      for (const h of d.fresh[c]) { bad++; console.log(`NEW ${c} ${h.key} rank ${h.rank} ${h.lemma} ${h.pointed ?? ''} :: ${h.detail}`); }
      for (const k of d.stale[c]) { bad++; console.log(`STALE ${c} ${k} (no longer a hit; rewrite the baseline)`); }
    }
    console.log(bad ? `FAIL: ${bad} difference(s) from the baseline` : `PASS: ${JSON.stringify(run.counts)} all in the baseline`);
    process.exit(bad ? 1 : 0);
  } else {
    console.log(JSON.stringify(run.counts));
    for (const c of CHECKS) for (const h of run.hits[c]) console.log(`${c}\t${h.key}\t${h.rank ?? ''}\t${h.lemma}\t${h.pointed ?? ''}\t${h.detail}`);
  }
}
