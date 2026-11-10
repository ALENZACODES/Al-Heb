#!/usr/bin/env node
// DRAFT. Human-recording needs list + PRIORITY SUBSET, from the audio manifest(s).
//   node tools/audio/recording_needs.mjs              print summary only
//   node tools/audio/recording_needs.mjs --write      write docs/voices/recording/{recordings_needed.csv,recordings_priority.csv,priority_summary.md}
//   node tools/audio/recording_needs.mjs --check      exit 1 if those files are stale
// Reads data/audio/manifest.json + manifest-words-<tradition>.json (required clips only: optional whole-prayer reads and aliases excluded)
// and data/vocab/words.json (frequency rank, transliteration). No network. Nothing here records, sends or recruits anyone.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifestFull } from './manifest_io.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT_DIR = 'docs/voices/recording';
export const CSV_HEADER = ['id', 'tradition', 'voice', 'kind', 'text_he', 'text_niqqud', 'transliteration', 'priority'];
/** ASSUMPTION (from docs/strategy research, not measured here): a trained donor reads 120-180 short lines per hour including retakes. */
export const LINES_PER_HOUR = { low: 120, high: 180 };
export const TOP_WORDS = 500;
export const PRIORITY_LABELS = {
  1: 'P1 letter names (22 letters + 5 final forms)',
  2: 'P2 vowel set + syllable drills',
  3: 'P3 core prayers (Modeh Ani, Shema, core blessings)',
  4: 'P4 top 500 words (by frequency, see note)',
  9: 'long tail (not in the priority subset)',
};
/** Prayer line id patterns for P3. DRAFT choice of "core": Modeh Ani, Shema + V'ahavta, basic blessing formulas, Torah-reading blessings, Kiddush wine, bread, candles, Shehecheyanu. Edit here to change. */
export const CORE_PRAYER_RE = /^(modeh-ani|shema|shema-vahavta-l\d+|vahavta|vahavta-2-l\d+|vahavta-full-l\d+|bless-formula|bless-priestly-\d+|hamotzi|kiddush-wine|kiddush-gen-2-1-3-l\d+|kiddush-shabbat-eve|candle-shabbat|torah-bless-\d+|torah-barchu-l\d+|zimun-opening-l\d+|shehecheyanu|hanukkah-candle|hanukkah-nissim|hanerot-halalu|havdalah-(opening|spices|flame|hamavdil)|mi-chamocha|avot|mah-tovu|oseh-shalom|sim-shalom-l\d+|hagomel-l\d+|num-12)$/;

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
/** Remove niqqud/cantillation and maqaf/sof-pasuq; keeps consonants. */
export const stripNiqqud = (s) => String(s ?? '').replace(/[֑-ׇֽֿׁׂׅׄ]/g, '').replace(/[־׃]/g, '').trim();

export function loadVocab(root = ROOT) {
  const p = path.join(root, 'data/vocab/words.json');
  const map = new Map(); // unpointed -> {rank, translit}
  if (!fs.existsSync(p)) return map;
  for (const w of JSON.parse(fs.readFileSync(p, 'utf8')).words || []) {
    if (w.frequencyRank == null) continue;
    for (const k of new Set([w.heUnpointed, stripNiqqud(w.he)])) {
      if (!k) continue;
      const cur = map.get(k);
      if (!cur || w.frequencyRank < cur.rank) map.set(k, { rank: w.frequencyRank, translit: w.translit || '' });
    }
  }
  return map;
}

const isRequired = (e) => !e.optional && !e.aliasOf;
export const requiredClips = (manifest) => manifest.filter(isRequired);

/** Pick the top-N distinct pointed words for one tradition (voice-independent). Ranked by vocab frequencyRank when matched, then by occurrence count in the manifest. */
export function topWordTexts(manifest, tradition, vocab, n = TOP_WORDS) {
  const occ = new Map();
  const first = new Map();
  for (const e of manifest) {
    if (e.tradition !== tradition || e.kind !== 'word' || !isRequired(e)) continue;
    occ.set(e.text, (occ.get(e.text) || 0) + 1);
    if (!first.has(e.text)) first.set(e.text, e.id);
  }
  const rows = [...occ.keys()].map((t) => ({ t, rank: vocab.get(stripNiqqud(t))?.rank ?? Infinity, occ: occ.get(t) }));
  rows.sort((a, b) => a.rank - b.rank || b.occ - a.occ || (a.t < b.t ? -1 : 1));
  const picked = rows.slice(0, n);
  return { texts: new Set(picked.map((r) => r.t)), distinct: rows.length, inVocabTop500: picked.filter((r) => r.rank <= 500).length, matched: picked.filter((r) => r.rank !== Infinity).length };
}

export function buildRows(manifest, vocab) {
  const req = requiredClips(manifest);
  const tops = {};
  const used = new Set(); // tradition|text already assigned P4 (record each distinct word once)
  const rows = [];
  for (const e of req) {
    const tr = e.tradition;
    tops[tr] ||= topWordTexts(manifest, tr, vocab);
    let p = 9;
    if (e.group === 'letter' || e.group === 'letter-final') p = 1;
    else if (e.group === 'niqqud' || e.group === 'syllable') p = 2;
    else if (e.group === 'prayer-line' && CORE_PRAYER_RE.test(e.id)) p = 3;
    else if (e.kind === 'word' && tops[tr].texts.has(e.text)) {
      const key = `${e.voice}|${tr}|${e.text}`;
      if (!used.has(key)) { used.add(key); p = 4; }
    }
    const v = e.kind === 'word' ? vocab.get(stripNiqqud(e.text)) : null; // never for letters: e.g. the letter alef would match the word elef
    rows.push({
      id: e.id, tradition: tr, voice: e.voice, kind: e.group || e.kind,
      text_he: stripNiqqud(e.text), text_niqqud: e.text,
      transliteration: v?.translit || (e.kind === 'letter' && !e.id.endsWith('-sound') ? e.id.replace(/-/g, ' ') : e.ipa ? String(e.ipa) : ''),
      priority: p,
    });
  }
  return { rows, tops };
}

const ORDER_T = { israeli: 0, ashkenazi: 1, sephardi: 2 };
export function sortRows(rows) {
  return [...rows].sort((a, b) => (ORDER_T[a.tradition] ?? 9) - (ORDER_T[b.tradition] ?? 9) || (a.voice < b.voice ? -1 : a.voice > b.voice ? 1 : 0) || a.priority - b.priority);
}
export function toCsv(rows) {
  return [CSV_HEADER.join(','), ...rows.map((r) => CSV_HEADER.map((h) => csvCell(r[h])).join(','))].join('\n') + '\n';
}
export const hours = (n) => ({ low: n / LINES_PER_HOUR.high, high: n / LINES_PER_HOUR.low });
const fmtH = (n) => { const h = hours(n); return `${h.low.toFixed(1)} to ${h.high.toFixed(1)}`; };

export function summarize(rows) {
  const out = [];
  const keys = [...new Set(rows.map((r) => `${r.tradition}|${r.voice}`))];
  for (const k of keys) {
    const [tradition, voice] = k.split('|');
    const mine = rows.filter((r) => r.tradition === tradition && r.voice === voice);
    const byP = {}; for (const r of mine) byP[r.priority] = (byP[r.priority] || 0) + 1;
    const prio = mine.filter((r) => r.priority < 9).length;
    out.push({ tradition, voice, total: mine.length, byP, priority: prio });
  }
  return out.sort((a, b) => (ORDER_T[a.tradition] ?? 9) - (ORDER_T[b.tradition] ?? 9) || (a.voice < b.voice ? -1 : 1));
}

export function summaryMd(rows, tops) {
  const s = summarize(rows);
  const L = [];
  L.push('# Recordings needed: priority subset (DRAFT)', '');
  L.push('Generated by `node tools/audio/recording_needs.mjs --write`. Do not edit by hand. **DRAFT: nobody has been contacted or recruited, nothing has been recorded.**', '');
  L.push(`**Assumption (not measured):** a trained donor reads ${LINES_PER_HOUR.low} to ${LINES_PER_HOUR.high} short lines per hour including retakes (figure from the project research notes). Estimated donor hours = clips / 180 (low) to clips / 120 (high). Replace with a timed pilot.`, '');
  L.push('Counts are required clips only (optional whole-prayer reads and aliases excluded), one row per clip per voice. Full list: `recordings_needed.csv`; priority rows only: `recordings_priority.csv`.', '');
  L.push('## Per tradition x voice', '');
  L.push('| tradition | voice | P1 letters+finals | P2 vowels+syllables | P3 core prayers | P4 words | priority total | est. donor hours (priority) | all required clips | est. donor hours (all) |', '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const r of s) L.push(`| ${r.tradition} | ${r.voice} | ${r.byP[1] || 0} | ${r.byP[2] || 0} | ${r.byP[3] || 0} | ${r.byP[4] || 0} | ${r.priority} | ${fmtH(r.priority)} | ${r.total} | ${fmtH(r.total)} |`);
  const totP = s.reduce((a, r) => a + r.priority, 0), totA = s.reduce((a, r) => a + r.total, 0);
  L.push(`| **all** | | | | | | **${totP}** | **${fmtH(totP)}** | **${totA}** | **${fmtH(totA)}** |`, '');
  L.push('## Notes and honest caveats', '');
  L.push('- P1: letter-name clips (group `letter`, 22) and final-form names (group `letter-final`, 5). Isolated letter sounds and variant names (vet, khaf, fe, sin) are NOT in the priority subset; they are long tail here although the sound drills are probably wanted early. Decide with the director.');
  L.push('- P2: all niqqud clips plus every syllable drill in the manifest. The manifest has 110 syllables per voice, not ~120, so the count is 110.');
  L.push(`- P3: prayer LINES whose id matches the core list in \`CORE_PRAYER_RE\` (Modeh Ani, Shema and V'ahavta lines, blessing formula, Torah-reading blessings, Kiddush wine, bread, candles, Shehecheyanu and a few others). This is a draft choice by the tool author, not a rabbinic or product decision; the research target was about 60 lines.`);
  L.push('- P4: the manifest does not contain 500 of the 500 most frequent Hebrew words. Words are ranked by frequency rank in data/vocab/words.json where the spelling matches, then by how often the word occurs in the manifest; the top 500 distinct pointed words are taken (each recorded once per voice and tradition). How many of those are inside the true frequency top 500:');
  for (const [tr, t] of Object.entries(tops)) L.push(`  - ${tr}: ${t.distinct} distinct pointed words in the manifest; picked ${Math.min(TOP_WORDS, t.distinct)}; ${t.matched} of them match the vocabulary list; ${t.inVocabTop500} are inside the frequency top 500.`);
  L.push('- Words in P4 appear once; other manifest ids with the same pointed text are left as long tail (an equivalence rule or a re-slice could reuse the recording; not decided).');
  L.push('- Sephardi: listed for completeness, but no Sephardi kit exists until someone with authority decides which Israeli clips may stand in (see docs/voices/kit/README.md). Do not schedule Sephardi donors yet.');
  L.push('- Transliteration comes from data/vocab/words.json for matched words (modern Israeli style, even in the Ashkenazi list), from the clip id for letter names (e.g. `kaf final`), and from the manifest IPA for vowels and syllables; empty otherwise. It is a prompt for the director, not a pronunciation authority.');
  L.push('- Ashkenazi and Israeli pronunciation differ for some of the same pointed text; each tradition is its own list.', '');
  return L.join('\n');
}

export function generate(root = ROOT) {
  const manifest = loadManifestFull(root);
  const vocab = loadVocab(root);
  const { rows, tops } = buildRows(manifest, vocab);
  const sorted = sortRows(rows);
  const files = {
    'recordings_needed.csv': toCsv(sorted),
    'recordings_priority.csv': toCsv(sorted.filter((r) => r.priority < 9)),
    'priority_summary.md': summaryMd(sorted, tops),
  };
  return { rows: sorted, tops, files };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const g = generate();
  const args = process.argv.slice(2);
  if (args.includes('--write')) {
    fs.mkdirSync(path.join(ROOT, OUT_DIR), { recursive: true });
    for (const [f, c] of Object.entries(g.files)) fs.writeFileSync(path.join(ROOT, OUT_DIR, f), c);
  }
  if (args.includes('--check')) {
    const stale = Object.entries(g.files).filter(([f, c]) => !fs.existsSync(path.join(ROOT, OUT_DIR, f)) || fs.readFileSync(path.join(ROOT, OUT_DIR, f), 'utf8') !== c).map(([f]) => f);
    if (stale.length) { console.error('stale: ' + stale.join(', ')); process.exit(1); }
  }
  for (const r of summarize(g.rows)) console.log(`${r.tradition}-${r.voice}: total ${r.total}, priority ${r.priority} (P1 ${r.byP[1] || 0}, P2 ${r.byP[2] || 0}, P3 ${r.byP[3] || 0}, P4 ${r.byP[4] || 0}), ~${fmtH(r.priority)} donor hours`);
}
