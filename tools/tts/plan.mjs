#!/usr/bin/env node
// Build the TTS render plan from the audio manifest.
//   node tools/tts/plan.mjs [--root <repo>] [--out tools/tts/plan.json] [--donor-dir tools/tts/donor-export] [--limit N] [--voice m|f] [--include-optional]
// Only the Israeli tradition, and only content groups the project allows TTS for, is routed to 'tts'.
// Everything else (Sephardi, Ashkenazi, and Israeli letters/vowels/syllables, see HUMAN_ONLY_GROUPS in tools/audio/coverage.mjs) is
// 'human-only' and is exported in the donor-sheet CSV format of docs/voices/recording/recordings_needed.csv.
// Entries that already have a file (status recorded or tts) are never planned: nothing here can overwrite a human recording.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifestFull } from '../audio/manifest_io.mjs';
import { HUMAN_ONLY_GROUPS } from '../audio/coverage.mjs';
import { generate, CORE_PRAYER_RE, CSV_HEADER } from '../audio/recording_needs.mjs';
import { REPO_ROOT, TTS_DIR, stripNiqqud, csvCell, parseArgs } from './lib.mjs';

export const TIERS = { 1: 'core prayer line', 2: 'deck-order word (first 1000)', 3: 'frequency-listed word or line', 4: 'other' };

/** unpointed text -> best (lowest) rank from data/vocab/deck-order.json (position 1..N) and data/vocab/frequency.json (corpusRank). */
export function loadRanks(root) {
  const deck = new Map(), freq = new Map();
  const rd = (rel) => { const p = path.join(root, rel); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
  const d = rd('data/vocab/deck-order.json');
  for (const e of (d && d.entries) || []) { const k = stripNiqqud(e.he); if (k && (!deck.has(k) || e.pos < deck.get(k))) deck.set(k, e.pos); }
  const f = rd('data/vocab/frequency.json');
  for (const e of (f && f.entries) || []) { const k = stripNiqqud(e.he); if (k && e.total > 0 && (!freq.has(k) || e.corpusRank < freq.get(k))) freq.set(k, e.corpusRank); }
  return { deck, freq };
}

export function route(e) {
  if (e.tradition !== 'israeli') return { route: 'human-only', why: `${e.tradition} pronunciation: no TTS offers it` };
  if (HUMAN_ONLY_GROUPS.has(e.group)) return { route: 'human-only', why: `group ${e.group}: isolated letters, vowels and syllables need a human` };
  return { route: 'tts', why: '' };
}

export function priorityOf(e, ranks) {
  const u = stripNiqqud(e.text);
  if (e.group === 'prayer-line' && CORE_PRAYER_RE.test(e.id)) return { tier: 1, rank: 0 };
  if (ranks.deck.has(u)) return { tier: 2, rank: ranks.deck.get(u) };
  if (ranks.freq.has(u)) return { tier: 3, rank: ranks.freq.get(u) };
  return { tier: 4, rank: 1e9 };
}

export function buildPlan(root = REPO_ROOT, { includeOptional = false, voice, limit } = {}) {
  const manifest = loadManifestFull(root);
  const ranks = loadRanks(root);
  const items = [], human = [], skipped = { alreadyHave: 0, alias: 0, optional: 0 };
  for (const e of manifest) {
    if (e.aliasOf) { skipped.alias++; continue; }
    if (e.optional && !includeOptional) { skipped.optional++; continue; }
    const r = route(e);
    if (r.route === 'human-only') { human.push({ ...e, why: r.why }); continue; }
    if (e.status !== 'missing') { skipped.alreadyHave++; continue; }
    if (voice && e.voice !== voice) continue;
    const p = priorityOf(e, ranks);
    items.push({ voice: e.voice, tradition: e.tradition, kind: e.kind, id: e.id, group: e.group || 'other', path: e.path, text: e.text, text_unpointed: stripNiqqud(e.text), route: 'tts', tier: p.tier, rank: p.rank === 1e9 ? null : p.rank });
  }
  items.sort((a, b) => a.tier - b.tier || (a.rank ?? 1e9) - (b.rank ?? 1e9) || (a.voice < b.voice ? -1 : a.voice > b.voice ? 1 : 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const out = limit ? items.slice(0, Number(limit)) : items;
  out.forEach((it, i) => { it.order = i + 1; });
  const byTier = {}; for (const it of out) byTier[it.tier] = (byTier[it.tier] || 0) + 1;
  const humanByTradition = {}; for (const h of human) humanByTradition[h.tradition] = (humanByTradition[h.tradition] || 0) + 1;
  return {
    schema: 'alef-tts-plan/1',
    note: 'Israeli tradition only. status of every written clip is "tts" (synthetic), never "recorded". Sephardi/Ashkenazi and Israeli letters/vowels/syllables are human-only and are NOT in items.',
    tiers: TIERS,
    counts: { items: out.length, byTier, humanOnly: human.length, humanOnlyByTradition: humanByTradition, skipped },
    items: out,
  };
}

/** Donor-sheet CSV rows (same columns as docs/voices/recording/recordings_needed.csv) for everything TTS must not do. */
export function donorExport(root = REPO_ROOT) {
  const g = generate(root);
  const mine = g.rows.filter((r) => {
    const m = r; // rows carry kind=group; re-derive route from tradition + group
    return m.tradition !== 'israeli' || HUMAN_ONLY_GROUPS.has(m.kind);
  });
  const by = {};
  for (const r of mine) (by[`${r.tradition}-${r.voice}`] ||= []).push(r);
  const files = {};
  for (const [k, rows] of Object.entries(by)) files[`human-only-${k}.csv`] = [CSV_HEADER.join(','), ...rows.map((r) => CSV_HEADER.map((h) => csvCell(r[h])).join(','))].join('\n') + '\n';
  return files;
}

export function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv, ['include-optional']);
  const root = a.root ? path.resolve(a.root) : REPO_ROOT;
  const plan = buildPlan(root, { includeOptional: !!a['include-optional'], voice: a.voice, limit: a.limit });
  const out = path.resolve(a.out || path.join(TTS_DIR, 'plan.json'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(plan, null, 1) + '\n');
  const dd = path.resolve(a['donor-dir'] || path.join(TTS_DIR, 'donor-export'));
  const files = donorExport(root);
  fs.mkdirSync(dd, { recursive: true });
  for (const [f, c] of Object.entries(files)) fs.writeFileSync(path.join(dd, f), c);
  console.log(`plan: ${plan.counts.items} TTS clips -> ${out}`);
  console.log(`tiers: ${JSON.stringify(plan.counts.byTier)}; human-only entries: ${plan.counts.humanOnly} ${JSON.stringify(plan.counts.humanOnlyByTradition)}`);
  console.log(`donor export: ${Object.keys(files).length} CSV files in ${dd}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
