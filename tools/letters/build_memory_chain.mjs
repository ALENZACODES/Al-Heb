#!/usr/bin/env node
// Builds data/letters/memory-chain.json (SEE -> SAY -> SEAL for each of the 27 letter forms) from the hand-written
// tools/letters/memory-chain.source.json plus lookups in data/vocab/words.json, data/letters/letters.json and
// data/pronunciation/consonants.json. Hebrew is never typed here: the word, its pointing, rank and gloss are
// copied from words.json by vocabId, and every claim is checked against the data before anything is written.
// Usage: node tools/letters/build_memory_chain.mjs [--check] [--out FILE]
//   (no flag) verify and write data/letters/memory-chain.json
//   --check   verify and compare with the file on disk; exit 1 on any error or if the file is stale. Writes nothing.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { respell } from '../../src/pronunciation/forTradition.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
export const OUT = 'data/letters/memory-chain.json';
export const MAX_RANK = 1500, MAX_STORY_WORDS = 14, MAX_ALT = 100;
const TRADS = ['israeli', 'sephardi', 'ashkenazi'];
const MARKS = { dagesh: 'ּ', 'shin-dot': 'ׁ' };
// The story names the word; each tradition shows its own rule respelling of that word (aba/abo, bayit/bayis), so the story never contradicts the word line.
const escRx = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function storyFor(story, translit, he, tradition) {
  const rs = respell(he, tradition);
  return story.replace(new RegExp(`\\b${escRx(translit)}\\b`, 'gi'), (m) => (m[0] === m[0].toUpperCase() ? rs[0].toUpperCase() + rs.slice(1) : rs));
}
const baseLetters = (h) => [...h].filter((c) => c >= 'א' && c <= 'ת');
const gaps = (h, i) => { // marks after the i-th base letter
  let n = -1, out = '';
  for (const c of h) { if (c >= 'א' && c <= 'ת') n++; else if (n === i) out += c; }
  return out;
};

export function build() {
  const src = rd('tools/letters/memory-chain.source.json');
  const letters = rd('data/letters/letters.json');
  const cons = rd('data/pronunciation/consonants.json').letters;
  const mn = rd('data/letters/mnemonics.json').letters.map((l) => l.id);
  const words = new Map(rd('data/vocab/words.json').words.map((w) => [w.id, w]));
  const errors = [];
  const err = (id, m) => errors.push(`${id}: ${m}`);
  const out = [];
  const ids = letters.map((l) => l.id);
  if (JSON.stringify(src.letters.map((l) => l.id)) !== JSON.stringify(ids)) err('*', `source ids must equal letters.json ids in order (${ids.join(',')})`);
  if (JSON.stringify(mn) !== JSON.stringify(ids)) err('*', 'mnemonics.json ids differ from letters.json ids');

  for (const s of src.letters) {
    const L = letters.find((l) => l.id === s.id);
    const C = cons[s.id];
    if (!L || !C) { err(s.id, 'not in letters.json / consonants.json'); continue; }
    const isFinal = s.id.endsWith('-final');
    const position = s.position || (isFinal ? 'final' : 'initial');
    if (position !== (isFinal ? 'final' : 'initial')) err(s.id, 'finals must use position final, other letters initial');

    // ---- SEAL: the word, all from words.json
    const w = words.get(s.vocabId);
    if (!w) { err(s.id, `vocabId ${s.vocabId} not in words.json`); continue; }
    const bl = baseLetters(w.he);
    const edge = position === 'final' ? bl[bl.length - 1] : bl[0];
    if (edge !== L.he) err(s.id, `word ${w.he} ${position === 'final' ? 'ends' : 'starts'} with ${edge}, not ${L.he}`);
    if (w.flags && w.flags.hidden) err(s.id, 'word is hidden');
    if (w.kind !== 'word' || w.pos !== 'noun') err(s.id, `word must be a noun record (kind=${w.kind} pos=${w.pos})`);
    if (!(w.frequencyRank >= 1 && w.frequencyRank <= MAX_RANK)) err(s.id, `rank ${w.frequencyRank} outside 1..${MAX_RANK}`);
    const senses = [w.en, ...(w.alt || [])];
    const glossFrom = s.glossFrom || 'en';
    const gloss = s.gloss;
    if (!gloss) err(s.id, 'gloss missing');
    else if (glossFrom === 'en' ? !w.en.toLowerCase().includes(gloss.toLowerCase())
      : !(w.alt || []).some((a) => a.toLowerCase().includes(gloss.toLowerCase()))) err(s.id, `gloss "${gloss}" not found in ${glossFrom} of ${s.vocabId} (${senses.join(' | ')})`);
    // mark requirements for the sound claim
    const idx = position === 'final' ? bl.length - 1 : 0;
    if (s.needsMark && !gaps(w.he, idx).includes(MARKS[s.needsMark])) err(s.id, `word's ${position} letter lacks ${s.needsMark}`);
    if (isFinal && s.soundClass === 'kh' && gaps(w.he, idx).includes(MARKS.dagesh)) err(s.id, 'final kaf in the word has a dagesh (would be k)');

    // ---- SAY: hook and per-tradition claims, proven against consonants.json
    const rx = src.soundChecks[s.soundClass];
    if (!rx) err(s.id, `soundClass ${s.soundClass} has no check`);
    const hook = s.hook;
    const hl = hook.toLowerCase();
    if (s.hookHas) {
      const ok = s.hookPosition === 'initial' ? hl.startsWith(s.hookHas.toLowerCase()) : hl.includes(s.hookHas.toLowerCase());
      if (!ok) err(s.id, `hook "${hook}" does not ${s.hookPosition === 'initial' ? 'start with' : 'contain'} "${s.hookHas}"`);
    }
    const perTradition = {}, matches = {};
    for (const t of TRADS) {
      const status = s.trad[t];
      const line = C.english[t];
      const re = rx && new RegExp(rx, 'i');
      const hit = re ? re.test(line) : false;
      if (status === 'same' || status === 'same-with-dot') {
        if (!hit) err(s.id, `${t}: claimed same but consonants.json says "${line}"`);
        if (status === 'same-with-dot' && !(s.diff && s.diff[t])) err(s.id, `${t}: same-with-dot needs a diff note`);
        perTradition[t] = (status === 'same' ? 'Same sound: ' : 'Same for this word: ') + line + (s.diff && s.diff[t] ? '. ' + s.diff[t] : '');
        matches[t] = true;
      } else if (status === 'differs') {
        if (hit) err(s.id, `${t}: claimed differs but consonants.json line matches the hook sound: "${line}"`);
        if (!(s.diff && s.diff[t])) err(s.id, `${t}: differs needs a diff note`);
        perTradition[t] = 'Differs: ' + line + '. ' + s.diff[t];
        matches[t] = false;
      } else if (status === 'cue-only') {
        if (!hit) err(s.id, `${t}: cue-only check expects consonants.json to mention r: "${line}"`);
        perTradition[t] = 'Hook is a spelling cue only. Real sound: ' + line;
        matches[t] = false;
      } else err(s.id, `${t}: unknown status ${status}`);
    }
    if (s.soundClass === 'silent' && !/silent|glottal/i.test(C.english.israeli)) err(s.id, 'silent claim not in consonants.json');

    // ---- story rules
    const story = s.story;
    const n = story.trim().split(/\s+/).length;
    if (n > MAX_STORY_WORDS) err(s.id, `story has ${n} words (max ${MAX_STORY_WORDS})`);
    const sl = story.toLowerCase();
    if (!sl.includes(hl)) err(s.id, `story lacks the hook "${hook}"`);
    if (!sl.includes(gloss.toLowerCase())) err(s.id, `story lacks the gloss "${gloss}"`);
    if (!sl.includes(w.translit.toLowerCase())) err(s.id, `story lacks the word's translit "${w.translit}"`);
    if (s.picture.alt.length > MAX_ALT) err(s.id, `alt is ${s.picture.alt.length} chars (max ${MAX_ALT})`);
    if (!s.tip || /\n/.test(s.tip)) err(s.id, 'tip must be one line');

    const risk = [...(s.risk || [])];
    if (w.flags && w.flags.needsReview) risk.push(`Vocabulary record ${s.vocabId} is flagged needsReview in words.json.`);
    out.push({
      id: s.id, hebrew: L.he, name: L.name,
      picture: { idea: s.picture.idea, alt: s.picture.alt, svg: `assets/letters/morph/${s.id}.svg` },
      sound: { hook, hookPosition: s.hookPosition, line: s.line, perTradition, matches },
      word: { he: w.he, vocabId: w.id, rank: w.frequencyRank, gloss, translit: w.translit, position },
      story, storyByTradition: Object.fromEntries(TRADS.map((t) => [t, storyFor(story, w.translit, w.he, t)])), tip: s.tip, risk,
    });
  }
  const doc = {
    meta: {
      generated: src.generated,
      builtBy: 'tools/letters/build_memory_chain.mjs from tools/letters/memory-chain.source.json',
      needsNativeReview: true,
      rules: [
        'Three beats per letter, same order every time: SEE (the letter shape becomes one picture), SAY (one English hook word), SEAL (one Hebrew example word from data/vocab/words.json that the same picture can show).',
        `Word: a noun record in words.json, not hidden, frequencyRank <= ${MAX_RANK}, pointing and gloss copied from the record, first letter (last letter for the five final forms) is the letter.`,
        'Sound claims are machine-checked per tradition against data/pronunciation/consonants.json; where a tradition differs or the hook is only a spelling cue, the perTradition line says so.',
        `Story: at most ${MAX_STORY_WORDS} words, contains the hook, the word's transliteration and its gloss.`,
        'Picture concepts come from data/letters/mnemonics.json; changes are listed in risk.',
        'No Hebrew is typed in the source table; nothing here is proofread by a native speaker.',
      ],
      maxRank: MAX_RANK, maxStoryWords: MAX_STORY_WORDS,
    },
    letters: out,
  };
  return { doc, errors };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const a = process.argv.slice(2);
  const check = a.includes('--check');
  const oi = a.indexOf('--out');
  const target = path.join(ROOT, oi >= 0 ? a[oi + 1] : OUT);
  const { doc, errors } = build();
  if (errors.length) { console.error(errors.map((e) => 'ERROR ' + e).join('\n')); console.error(`FAIL: ${errors.length} error(s)`); process.exit(1); }
  const text = JSON.stringify(doc, null, 1) + '\n';
  if (check) {
    const cur = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
    if (cur !== text) { console.error(`FAIL: ${path.relative(ROOT, target)} is stale or missing; run node tools/letters/build_memory_chain.mjs`); process.exit(1); }
    console.log(`PASS: ${doc.letters.length} chains verified and ${path.relative(ROOT, target)} is up to date`);
  } else {
    fs.writeFileSync(target, text);
    console.log(`wrote ${path.relative(ROOT, target)} (${doc.letters.length} chains)`);
  }
}
