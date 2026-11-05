import { pathToFileURL } from 'node:url';
// Rebuild data/speak/ from course data:  node src/speak/build.mjs
// Inputs (read only): data/vocab/words.json, data/vocab/packs.json, data/audio/manifest.json, data/audio/manifest-words-israeli.json.
// Outputs: data/speak/sets.json (index), data/speak/sets/<id>.json (60 "Say it" sets by theme), data/speak/pairs.json (listening drills),
// data/speak/prayers.json (8 short prayer texts, copied line for line from data/corpus/registry.json for read-aloud and shadowing).
// data/speak/minimal-pairs.json belongs to the pronunciation lane and is only read, never written, here.
// Every Hebrew string is copied from the inputs; this script never composes Hebrew. Both inputs are machine-built drafts.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeHe } from './model.js';
import { buildPairs } from './pairs.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rd = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const SET_COUNT = 60, ITEMS_PER_SET = 12;
export const PRAYER_IDS = ['shema-1', 'shema-2', 'hamotzi', 'kiddush-wine-1', 'candle-shabbat', 'modeh-ani-1', 'torah-barchu', 'oseh-shalom', 'shehecheyanu'];

/** The read-aloud prayers: Hebrew lines are the registry's own (split on newline, nothing edited). */
export function buildPrayers(registry, manifest = []) {
  const lineIds = new Set(manifest.filter((m) => m.kind === 'line').map((m) => m.id));
  const byId = new Map(registry.map((e) => [e.id, e]));
  const prayers = PRAYER_IDS.map((id) => {
    const e = byId.get(id);
    if (!e) throw new Error('prayer missing from registry: ' + id);
    const lines = e.he.split('\n').map((l) => l.trim()).filter(Boolean);
    return { id: e.id, title: e.title, ref: e.ref, level: e.level, lines, english: e.english, registryStatus: e.status, proofread: !!e.proofread, license: e.license, attribution: e.attribution, source: e.source,
      lineAudio: lines.length === 1 ? { kind: 'line', id: e.id } : null,
      // multi-line prayers: per-line manifest ids <id>-l<n>, only when every line has one (else null: no clip is guessed)
      lineClips: lines.length > 1 && lines.every((_, i) => lineIds.has(`${e.id}-l${i + 1}`)) ? lines.map((_, i) => ({ kind: 'line', id: `${e.id}-l${i + 1}` })) : null };
  });
  return { schema: 'alef-speak-prayers/1', note: 'Hebrew lines are copied verbatim from data/corpus/registry.json (Sefaria Metsudah siddur text, machine-compared to the source, NOT proofread by a Hebrew educator). The recognizer compares letters only, in modern Israeli pronunciation.', prayers };
}

const NOTE = 'Draft built by src/speak/build.mjs from data/vocab/words.json (machine-built, not native-reviewed). Pointing, transliteration and glosses are unverified.';

export function buildSets({ words, packs, manifestTexts }) {
  const byId = new Map(words.map((w) => [w.id, w]));
  const survival = packs.filter((p) => p.id.startsWith('survival-')).sort((a, b) => a.order - b.order);
  const topical = packs.filter((p) => !p.id.startsWith('survival-') && !p.id.startsWith('read-'));
  // one pack per topic first ("-1"), then "-2", ... so the 60 sets spread across every theme
  const num = (p) => Number(p.id.match(/-(\d+)$/)?.[1] || 0);
  const level = { A1: 0, A2: 1, B1: 2, B2: 3 };
  topical.sort((a, b) => num(a) - num(b) || level[a.level] - level[b.level] || a.id.localeCompare(b.id));
  const sets = [];
  for (const p of [...survival, ...topical]) {
    if (sets.length >= SET_COUNT) break;
    // pointed only (the screen shows vowel points) and never the four-letter divine name, which is not pronounced as written
    const pool = p.wordIds.map((id) => byId.get(id)).filter((w) => w && typeof w.he === 'string' && /[\u05B0-\u05C7]/.test(w.he) && normalizeHe(w.he) && normalizeHe(w.he) !== 'יהוה' && w.translit && w.en);
    const short = pool.filter((w) => normalizeHe(w.he).split(' ').length <= 3);
    short.sort((a, b) => (a.frequencyRank ?? 1e9) - (b.frequencyRank ?? 1e9) || a.he.length - b.he.length);
    const seen = new Set();
    const items = [];
    for (const w of short) {
      const k = normalizeHe(w.he);
      if (seen.has(k)) continue; seen.add(k);
      items.push({ id: w.id, he: w.he, translit: w.translit, en: w.en, kind: w.kind === 'phrase' ? 'phrase' : 'word', audioId: manifestTexts.get(w.he.normalize('NFC')) || null, source: 'data/vocab/words.json' });
      if (items.length >= ITEMS_PER_SET) break;
    }
    if (items.length < 4) continue;
    sets.push({ schema: 'alef-speak-set/1', id: 'speak-' + p.id, title: p.title, theme: p.topic, level: p.level, track: p.track, pack: p.id, note: NOTE, items });
  }
  return sets;
}

export function manifestTextMap(lists) {
  const m = new Map();
  for (const list of lists) for (const e of list) if (e.kind === 'word' && e.text && !m.has(e.text.normalize('NFC'))) m.set(e.text.normalize('NFC'), e.id);
  return m;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const words = rd('data/vocab/words.json').words;
  const packs = rd('data/vocab/packs.json').packs;
  const manifestTexts = manifestTextMap([rd('data/audio/manifest.json'), rd('data/audio/manifest-words-israeli.json')]);
  const sets = buildSets({ words, packs, manifestTexts });
  const dir = join(root, 'data/speak/sets'); mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) if (f.endsWith('.json')) unlinkSync(join(dir, f));
  for (const s of sets) writeFileSync(join(dir, s.id + '.json'), JSON.stringify(s, null, 1) + '\n');
  const index = { schema: 'alef-speak-sets/1', generated: new Date().toISOString().slice(0, 10), note: NOTE, count: sets.length, sets: sets.map((s) => ({ id: s.id, title: s.title, theme: s.theme, level: s.level, track: s.track, pack: s.pack, size: s.items.length, withClip: s.items.filter((i) => i.audioId).length })) };
  writeFileSync(join(root, 'data/speak/sets.json'), JSON.stringify(index, null, 1) + '\n');
  const pairs = buildPairs(words, manifestTexts);
  writeFileSync(join(root, 'data/speak/pairs.json'), JSON.stringify(pairs, null, 1) + '\n');
  const prayers = buildPrayers(rd('data/corpus/registry.json').entries, rd('data/audio/manifest.json'));
  writeFileSync(join(root, 'data/speak/prayers.json'), JSON.stringify(prayers, null, 1) + '\n');
  console.log(`wrote ${sets.length} sets (${sets.reduce((n, s) => n + s.items.length, 0)} items) and ${pairs.items.length} drill items across ${pairs.contrasts.length} contrasts`);
}
