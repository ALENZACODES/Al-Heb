// Buildable words for the first-day word builder (src/firstday/minuteone.*) -> data/firstday/buildable-words.json
//
//   node tools/firstday/build-wordlist.mjs          writes the file
//   node tools/firstday/build-wordlist.mjs --dry    prints the summary only
//   node tools/firstday/build-wordlist.mjs --check  exits 1 when the committed file differs from a fresh build
//
// THE RULE (also written into the output file):
//  1. Candidates are dictionary headwords, in this order of preference: data/games/firstwords.json (the 240 gentle first
//     words), then data/vocab/words.json levels A1 and A2 by frequencyRank (B1 and up are left out: this is a first-day
//     screen). Prayer-word fragments (prefixed forms such as "and-for-praise") are never candidates; they may only supply
//     a clip when their pointed text is the same word.
//  2. A candidate must be one word: no space, no maqaf, no hyphen, no geresh; its letters (vowel points removed) must all be
//     Hebrew letters, 2 to 8 of them. Its English gloss must exist and not be UNKNOWN.
//  3. A candidate is buildable only when an Israeli clip of the SAME pointed text exists for BOTH voices (m and f) and both
//     files are on disk under audio/{m,f}/israeli/word/. Pointed text is compared after removing cantillation and meteg
//     and ordering the marks on each letter, so two spellings of the same points match. Nothing is matched across
//     traditions and no clip is borrowed from a different word.
//  4. One entry per unpointed spelling (the tray has no vowel marks, so the builder matches letters only). The first
//     candidate in preference order keeps the spelling; the others are dropped.
//  5. Level 1 to 5: letters 2-3 -> 1, 4 -> 2, 5 -> 3, 6 -> 4, 7+ -> 5; A2 words move one level deeper, capped at 5.
//  6. `clip` is one manifest id that exists for both voices; its files are audio/m/israeli/word/<clip>.mp3 and
//     audio/f/israeli/word/<clip>.mp3 (the tool checks the manifest paths are exactly these).
// Nothing under data/audio, data/vocab or data/games is written.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT_PATH = 'data/firstday/buildable-words.json';
const MANIFESTS = ['data/audio/manifest-words-israeli.json', 'data/audio/manifest-kind-word.json'];
const LEVEL_SHIFT = { A1: 0, A2: 1 };
export const CLIP_PATH = (voice, clip) => `audio/${voice}/israeli/word/${clip}.mp3`;
export const MIN_LEN = 2, MAX_LEN = 8;

const readJSON = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const exists = (rel) => { try { return fs.statSync(path.join(ROOT, rel)).isFile(); } catch { return false; } };

/** Letters only: every Hebrew point, accent and the meteg removed. */
export const bareOf = (s) => String(s || '').normalize('NFC').replace(/[֑-ׇ]/g, '');
/** Final letters folded to their base form, so a learner who places mem at the end still spells the word. */
export const FINALS = Object.freeze({ 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' });
export const foldFinals = (s) => String(s || '').replace(/[ךםןףץ]/g, (c) => FINALS[c]);
const LETTERS_ONLY = /^[א-ת]+$/;

/** Pointed text as a comparison key: cantillation and meteg dropped, sof pasuq dropped, marks on each letter sorted. */
export function pointedKey(s) {
  const t = String(s || '').normalize('NFC').replace(/[֑-ֽ֯׃]/g, '').trim();
  let out = '', marks = [];
  const flush = () => { out += marks.sort().join(''); marks = []; };
  for (const ch of t) {
    if (/[ְ-ׇ]/.test(ch)) marks.push(ch);
    else { flush(); out += ch; }
  }
  flush();
  return out;
}

const oneWord = (he) => !/[\s־׳״'"-]/.test(he);
const shortGloss = (en) => String(en || '').split(/[;(]/)[0].trim().replace(/,\s*$/, '') || String(en || '').trim();

/** Clip index: pointed key -> { m: [entries], f: [entries] } for Israeli word clips whose file is on disk. */
export function indexClips(entries, has = exists) {
  const idx = new Map();
  for (const e of entries) {
    if (!e || e.tradition !== 'israeli' || e.kind !== 'word' || e.status === 'missing') continue;
    if (!e.text || !has(e.path)) continue;
    const k = pointedKey(e.text);
    if (!idx.has(k)) idx.set(k, { m: [], f: [] });
    const slot = idx.get(k)[e.voice];
    if (slot) slot.push(e);
  }
  return idx;
}

/** Prefer a clip id that exists for both voices; among those, dictionary clips, then anchor words, then lesson or phrasebook clips, then prayer words. */
function pickClips(bucket) {
  if (!bucket) return null;
  const rank = (e) => (/^vocab/.test(e.group || '') ? 0 : e.group === 'anchor-word' ? 1 : e.group === 'lesson-word' || e.group === 'phrasebook' ? 2 : 3);
  const mById = new Map(bucket.m.map((e) => [e.id, e]));
  const both = bucket.f.filter((f) => mById.has(f.id)).sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
  if (!both.length) return null;
  const f = both.find((x) => x.path === CLIP_PATH('f', x.id) && mById.get(x.id).path === CLIP_PATH('m', x.id));
  return f ? f.id : null;
}

export function levelOf(bareLen, shift) {
  const base = bareLen <= 3 ? 1 : bareLen === 4 ? 2 : bareLen === 5 ? 3 : bareLen === 6 ? 4 : 5;
  return Math.min(5, base + (shift || 0));
}

/** @returns {{words:any[], letters:Record<string,number>, dropped:Record<string,number>}} */
export function buildList({ firstwords, vocab, clips }) {
  const dropped = { notOneWord: 0, badLetters: 0, noGloss: 0, noClipBothVoices: 0, duplicateSpelling: 0 };
  const seen = new Set();
  const words = [];
  const consider = (c) => {
    const he = String(c.he || '').normalize('NFC');
    if (!oneWord(he)) { dropped.notOneWord++; return; }
    const bare = bareOf(he);
    if (!LETTERS_ONLY.test(bare) || bare.length < MIN_LEN || bare.length > MAX_LEN) { dropped.badLetters++; return; }
    const en = shortGloss(c.en);
    if (!en || /UNKNOWN/i.test(en)) { dropped.noGloss++; return; }
    const picked = pickClips(clips.get(pointedKey(he)));
    if (!picked) { dropped.noClipBothVoices++; return; }
    if (seen.has(bare)) { dropped.duplicateSpelling++; return; }
    seen.add(bare);
    words.push({ id: c.id, he, bare, translit: c.translit || '', en, level: levelOf(bare.length, c.shift), source: c.source, rank: Number.isFinite(c.rank) ? c.rank : null, clip: picked });
  };
  for (const w of firstwords) consider({ id: w.id, he: w.he, en: w.en, translit: w.translit, theme: w.theme, source: 'firstwords', shift: 0, rank: null });
  const ordered = vocab.filter((w) => w.kind === 'word' && w.he && w.en && w.level in LEVEL_SHIFT)
    .map((w) => ({ w, shift: LEVEL_SHIFT[w.level], rank: Number.isFinite(w.frequencyRank) ? w.frequencyRank : 1e9 }))
    .sort((a, b) => a.shift - b.shift || a.rank - b.rank || String(a.w.id).localeCompare(String(b.w.id)));
  for (const { w, shift, rank } of ordered) consider({ id: w.id, he: w.he, en: w.en, translit: w.translit, theme: w.topic, pos: w.pos, source: `vocab-${w.level || 'other'}`, shift, rank });
  words.sort((a, b) => a.level - b.level || (a.source === 'firstwords' ? 0 : 1) - (b.source === 'firstwords' ? 0 : 1) || (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.bare.localeCompare(b.bare));
  const letters = {};
  for (const w of words) for (const ch of w.bare) letters[ch] = (letters[ch] || 0) + 1;
  return { words, letters, dropped };
}

export function build() {
  const firstwords = readJSON('data/games/firstwords.json').words || [];
  const vocab = readJSON('data/vocab/words.json').words || [];
  const clips = indexClips(MANIFESTS.flatMap((m) => readJSON(m)));
  const { words, letters, dropped } = buildList({ firstwords, vocab, clips });
  const byLevel = {};
  for (const w of words) byLevel[w.level] = (byLevel[w.level] || 0) + 1;
  return {
    schema: 'alef-firstday-buildable-words/1',
    rule: 'See the header of tools/firstday/build-wordlist.mjs: dictionary headwords (firstwords, then vocab A1 and A2 by frequency), one word each, 2-8 letters, English gloss present, an Israeli clip of the same pointed text on disk for both voices (audio/{m,f}/israeli/word/<clip>.mp3); one entry per unpointed spelling; level 1-5 by letter count and vocabulary level. The builder folds final letters to their base letter when matching.',
    sources: ['data/games/firstwords.json', 'data/vocab/words.json', ...MANIFESTS],
    tradition: 'israeli', voices: ['m', 'f'],
    count: words.length, byLevel, letters, dropped,
    words,
  };
}

/** One word per line, so diffs stay readable and the file stays small. */
function stable(obj) {
  const { words, ...head } = obj;
  const headText = JSON.stringify(head, null, 1).replace(/\n\}$/, ',\n "words": [\n');
  return headText + words.map((w) => '  ' + JSON.stringify(w)).join(',\n') + '\n ]\n}\n';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = build();
  const dry = process.argv.includes('--dry'), check = process.argv.includes('--check');
  const text = stable(out);
  const summary = `${out.count} buildable words (both Israeli voices on disk); by level ${JSON.stringify(out.byLevel)}; letters used ${Object.keys(out.letters).length}; dropped ${JSON.stringify(out.dropped)}`;
  if (check) {
    const cur = fs.existsSync(path.join(ROOT, OUT_PATH)) ? fs.readFileSync(path.join(ROOT, OUT_PATH), 'utf8') : '';
    if (cur !== text) { console.error(`${OUT_PATH} is out of date: rerun node tools/firstday/build-wordlist.mjs`); process.exit(1); }
    console.log(`${OUT_PATH} is current. ${summary}`);
  } else if (dry) console.log(summary);
  else { fs.writeFileSync(path.join(ROOT, OUT_PATH), text); console.log(`wrote ${OUT_PATH}: ${summary}`); }
}
