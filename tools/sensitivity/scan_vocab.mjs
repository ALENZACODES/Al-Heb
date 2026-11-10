#!/usr/bin/env node
// Conservative keyword scan of the beginner vocabulary for profane, sexual, violent or sectarian senses.
// Usage: node tools/sensitivity/scan_vocab.mjs [--max-rank 1500] [--json]
// Reads data/vocab/words.json (frequencyRank <= max) and data/vocab/vocab5000.json (rank <= max) and lists CANDIDATES
// (gloss, alt senses, example English). It decides nothing: hiding is a reviewed correction (data/vocab/corrections.json,
// data/vocab/overrides.json), and a keyword hit is usually a harmless sense ("kill time", "shot of a camera").
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const CATEGORIES = {
  profane: ['fuck', 'shit', 'damn', 'hell', 'bitch', 'bastard', 'crap', 'ass', 'asshole', 'piss', 'curse', 'screw', 'slut', 'whore', 'prick', 'dick', 'cock'],
  sexual: ['sex', 'sexy', 'orgasm', 'cum', 'ejaculat', 'genital', 'penis', 'vagina', 'breast', 'tits', 'nude', 'naked', 'erotic', 'porn', 'prostitut', 'intercourse', 'masturbat', 'fornicat', 'rape', 'lust', 'adulter', 'lewd', 'copulat'],
  violent: ['kill', 'murder', 'massacre', 'slaughter', 'terror', 'bomb', 'weapon', 'stab', 'rape', 'torture', 'execute', 'suicide'],
  sectarian: ['goy', 'gentile', 'infidel', 'heathen', 'pagan', 'heretic', 'nazi', 'jehovah', 'yahweh', 'slur', 'pejorative', 'derogatory', 'offensive', 'racist', 'negro', 'gypsy', 'midget', 'retard', 'faggot'],
};
// Stems match as prefixes; every other keyword must be a whole word (optionally with s, es, ed, ing, y), so "hello", "assess"
// and "assemble" do not hit "hell" or "ass".
const STEMS = new Set(['ejaculat', 'prostitut', 'masturbat', 'fornicat', 'copulat', 'genital', 'retard', 'orgasm', 'porn', 'adulter', 'intercourse', 'erotic']);
const rx = Object.fromEntries(Object.entries(CATEGORIES).map(([c, ws]) => [c, new RegExp('\\b(?:' + ws.map((w) => (STEMS.has(w) ? w : w + '(?:s|es|ed|ing|y)?\\b')).join('|') + ')', 'i')]));

function hits(text) {
  const out = [];
  for (const [c, r] of Object.entries(rx)) { const m = typeof text === 'string' && text.match(r); if (m) out.push(c + ':' + m[0].toLowerCase()); }
  return out;
}

export function scan(maxRank = 1500, root = ROOT) {
  const rows = [];
  const w = JSON.parse(fs.readFileSync(path.join(root, 'data/vocab/words.json'), 'utf8'));
  for (const r of w.words) {
    if (!(r.frequencyRank <= maxRank)) continue;
    const parts = [['en', r.en], ...(r.alt || []).map((a) => ['alt', a]), ['example', r.example && r.example.en]];
    for (const [where, t] of parts) { const h = hits(t); if (h.length) rows.push({ src: 'words', rank: r.frequencyRank, id: r.id, he: r.he, where, text: t, hits: h, hidden: !!(r.flags && r.flags.hidden) }); }
  }
  const v = JSON.parse(fs.readFileSync(path.join(root, 'data/vocab/vocab5000.json'), 'utf8'));
  const walk = (o) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') {
      if (typeof o.gloss === 'string' && typeof o.rank === 'number') {
        if (o.rank <= maxRank) { const h = hits(o.gloss); if (h.length) rows.push({ src: 'vocab5000', rank: o.rank, id: o.id, he: o.pointed || o.lemma, where: 'gloss', text: o.gloss, hits: h, hidden: !!(o.flags && o.flags.hidden) }); }
      } else Object.values(o).forEach(walk);
    }
  };
  walk(v);
  return rows.sort((a, b) => a.src.localeCompare(b.src) || a.rank - b.rank);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const max = a.includes('--max-rank') ? Number(a[a.indexOf('--max-rank') + 1]) : 1500;
  const rows = scan(max);
  if (a.includes('--json')) console.log(JSON.stringify(rows, null, 1));
  else for (const r of rows) console.log(`${r.src}\t${r.rank}\t${r.id}\t${r.he}\t${r.where}\t${r.hits.join(',')}\t${r.hidden ? 'HIDDEN' : ''}\t${r.text}`);
  console.error(`${rows.length} candidates (ranks 1-${max}); keyword hits only, not decisions`);
}
