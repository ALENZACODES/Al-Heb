#!/usr/bin/env node
// Builds data/audio/manifest.json (core) + data/audio/manifest-kind-word.json (kind=word entries) + the per-tradition
// data/audio/manifest-words-<tradition>.json shards (array of {path, voice, tradition, kind, id, text, ipa?, status, source, equivalentTo?}).
// Reads other lanes' data when present; skips gracefully when absent. Status is "missing" until a file exists under audio/.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseCsv } from '../record-kit/lib.mjs';
import { speechText } from '../../src/shell/names.js';
import { isSyntheticStatus } from '../../src/shell/audio-labels.js';
import { buildPool } from '../../src/listen/model.js';
import { buildScripts } from '../pronunciation/recording_script.mjs';
import {
  TRADITIONS, VOICES, KINDS, LETTERS, FINAL_LETTERS, VARIANT_LETTERS, GRID_MARKS, GRID_VOWELS, GRID_VOWEL_IPA_ISRAELI,
  VOWELS, normalizeId, audioPath,
} from './hebrew_data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const HEB = /[א-ת]/;

function readJson(root, rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return { data: null, note: `${rel}: not present, skipped` };
  try { return { data: JSON.parse(fs.readFileSync(p, 'utf8')), note: `${rel}: read` }; }
  catch (e) { return { data: null, note: `${rel}: unreadable (${e.message}), skipped` }; }
}

function listItems(json) {
  if (Array.isArray(json)) return json;
  if (json && typeof json === 'object') {
    for (const v of Object.values(json)) if (Array.isArray(v) && v.length && typeof v[0] === 'object') return v;
    const vals = Object.entries(json).filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v));
    if (vals.length) return vals.map(([k, v]) => ({ id: k, ...v }));
  }
  return [];
}

function guessKind(item) {
  if (KINDS.includes(item.kind)) return item.kind;
  if (KINDS.includes(item.audioKind)) return item.audioKind;
  const tag = `${item.type || ''} ${item.category || ''} ${item.section || ''} ${item.id || ''}`.toLowerCase();
  if (tag.includes('prayer') || tag.includes('bless')) return 'prayer';
  if (tag.includes('vocab') || tag.includes('word')) return 'word';
  const he = item.he || item.text || '';
  return /\s/.test(he.trim()) ? 'line' : 'word';
}

/** Rows {id, he, ipa:{tradition:ipa}} of the 1,000-word donor scripts, straight from the generator. */
export function scriptWordRows() {
  const { files } = buildScripts();
  const by = new Map();
  for (const t of TRADITIONS) for (const r of parseCsv(files[`recording-script-${t}.csv`])) {
    if (!by.has(r.id)) by.set(r.id, { id: r.id, he: r.pointed_hebrew, ipa: {} });
    by.get(r.id).ipa[t] = r.ipa;
  }
  return [...by.values()];
}

export function buildEntries({ root = ROOT, existsFn, ...opts } = {}) {
  const notes = [];
  const warnings = [];
  const exists = existsFn || ((rel) => fs.existsSync(path.join(root, rel)));
  const base = []; // {kind,id,text,ipa:{trad:ipa}, pairs?}

  // --- letters (names + isolated sounds)
  const lettersJson = readJson(root, 'data/letters/letters.json');
  notes.push(lettersJson.note);
  if (lettersJson.data) {
    const have = new Set(listItems(lettersJson.data).map((l) => l.id));
    for (const [id] of [...LETTERS, ...FINAL_LETTERS]) if (!have.has(id)) warnings.push(`letters.json lacks id ${id}`);
  }
  for (const [id, , name, ipa] of LETTERS) {
    base.push({ kind: 'letter', id, text: name, group: 'letter' });
    base.push({ kind: 'letter', id: `${id}-sound`, text: name[0], ipa: { israeli: ipa }, isolatedSound: true, group: 'letter-sound' });
  }
  for (const [id, , name] of FINAL_LETTERS) base.push({ kind: 'letter', id, text: name, group: 'letter-final' });
  // The 4 two-sound variants (vet, khaf, fe, sin): name said with the variant's sound + isolated sound.
  for (const [id, glyph, name, ipa] of VARIANT_LETTERS) {
    base.push({ kind: 'letter', id, text: name, group: 'letter-variant' });
    base.push({ kind: 'letter', id: `${id}-sound`, text: glyph, ipa: { israeli: ipa }, isolatedSound: true, group: 'letter-variant-sound' });
  }

  // --- vowels
  const nq = readJson(root, 'data/pronunciation/niqqud.json');
  notes.push(nq.note);
  const nqById = new Map(listItems(nq.data).map((r) => [r.id, r]));
  for (const [id, text] of VOWELS) {
    const rec = nqById.get(id);
    const ipa = rec && rec.ipa && typeof rec.ipa === 'object' ? { ...rec.ipa } : undefined;
    base.push({ kind: 'vowel', id, text, ipa, group: 'niqqud' });
  }
  if (nq.data) for (const [id] of VOWELS) if (!nqById.has(id)) warnings.push(`niqqud.json lacks id ${id}`);

  // --- syllable grid: 22 letters x 5 vowel sounds
  for (const [lid, glyph, , cons] of LETTERS) {
    for (const [vs, mark] of GRID_VOWELS) {
      const text = (glyph + (GRID_MARKS[lid] || '') + mark).normalize('NFC');
      base.push({ kind: 'syllable', id: `${lid}-${vs}`, text, ipa: { israeli: cons + GRID_VOWEL_IPA_ISRAELI[vs] }, grid: true, group: 'syllable' });
    }
  }

  // --- corpus + curriculum
  const seen = new Set(base.map((b) => `${b.kind}/${b.id}`));
  const add = (kind, rawId, rawText, src, extra = {}) => {
    // Anything spoken uses the conventional substitute for the bare four-letter name (docs/sensitivity/CONVENTIONS.md);
    // prefixed forms are left as they are, awaiting clergy (docs/sensitivity/OPEN.md).
    const text = typeof rawText === 'string' ? speechText(rawText) : rawText;
    const id = normalizeId(rawId);
    if (!id || !text || !HEB.test(text)) { warnings.push(`${src}: skipped ${JSON.stringify(rawId)} (no id or no Hebrew text)`); return; }
    if (seen.has(`${kind}/${id}`)) {
      const prev = base.find((x) => x.kind === kind && x.id === id);
      if (prev && prev.text !== text && !(extra.aliasOf)) warnings.push(`${src}: id ${kind}/${id} already used with different text (kept the first)`);
      return;
    }
    seen.add(`${kind}/${id}`);
    base.push({ kind, id, text, from: src, ...extra });
  };
  const reg = readJson(root, 'data/corpus/registry.json');
  notes.push(reg.note);
  // Per-line and per-word ids exactly as src/corpus/read.view.js requests them:
  //   line: `<id>` when the record has one line, else `<id>-l<n>` (1-based); word: `<id>-w<n>` (1-based, counted across the record's lines).
  // The Tetragrammaton is rendered with its spoken substitute, as the reader does.
  const spoken = (w) => ([...w].filter((c) => c >= '\u05D0' && c <= '\u05EA').join('') === '\u05D9\u05D4\u05D5\u05D4' ? '\u05D0\u05B2\u05D3\u05B9\u05E0\u05B8\u05D9' : w);
  for (const it of listItems(reg.data)) {
    if (typeof it.he !== 'string' || !it.id) continue;
    const lines = it.he.split('\n');
    let wi = 0;
    const lineTexts = [];
    lines.forEach((line, li) => {
      const words = line.split(/\s+/).filter((w) => HEB.test(w));
      const lt = words.map(spoken).join(' ');
      lineTexts.push(lt);
      add('line', lines.length === 1 ? it.id : `${it.id}-l${li + 1}`, lt, 'corpus(line)', { group: 'prayer-line' });
      for (const w of words) { wi += 1; add('word', `${it.id}-w${wi}`, spoken(w), 'corpus(word)', { group: 'prayer-word' }); }
    });
    // Whole-record read ('prayer' kind). Nothing in the app requests it (the reader plays lines/words), so it is OPTIONAL:
    // for one-line records it is an alias of the line clip (same id); for multi-line records it is a continuous read.
    const kind = ['torah', 'siddur'].includes(it.category) ? 'prayer' : guessKind(it);
    add(kind, it.id, lineTexts.join(' ') || it.he, 'corpus', {
      group: kind === 'prayer' ? 'prayer-whole' : 'corpus-other', optional: true,
      ...(lines.length === 1 && kind === 'prayer' ? { aliasOf: `line/${normalizeId(it.id)}` } : {}),
    });
  }
  const les = readJson(root, 'data/curriculum/lessons.json');
  notes.push(les.note);
  // ONE id mapping: lesson word `<lessonId>-w<n>` <-> vocab id, from data/curriculum/word-vocab-map.json (key `<lessonId>:<n>`, built by
  // tools/curriculum/word_ids.mjs by exact pointed-Hebrew match). Lesson-word entries carry `vocabId`; src/audio/player.js links both ids.
  const wvm = readJson(root, 'data/curriculum/word-vocab-map.json');
  notes.push(wvm.note);
  const vocabOf = (wvm.data && wvm.data.map) || {};
  const vocabLinks = new Map(); // vocab id -> [lesson word ids]
  for (const lesson of listItems(les.data)) {
    for (const [field, kind] of [['words', 'word'], ['prayerLines', 'line']]) {
      for (const w of lesson[field] || []) {
        if (typeof w === 'string') {
          if (HEB.test(w)) add(kind, `${kind[0]}-${crypto.createHash('sha1').update(w).digest('hex').slice(0, 8)}`, w, 'curriculum(hash-id)');
        } else if (w && typeof w === 'object' && w.id) add(kind, w.id, w.he || w.text, 'curriculum');
      }
    }
    // Lesson vocabulary has no ids in lessons.json: the app requests kind 'word', id `<lessonId>-w<n>` (1-based).
    // Words of track 'israel' lessons are conversational Modern Hebrew: israeli-only, like the phrasebook. Track 'read' words keep all traditions.
    if (lesson.id && Array.isArray(lesson.words)) {
      lesson.words.forEach((w, i) => {
        if (!w || typeof w !== 'object' || w.id) return;
        const vid = vocabOf[`${lesson.id}:${i + 1}`];
        const wid = normalizeId(`${lesson.id}-w${i + 1}`);
        if (vid) { if (!vocabLinks.has(vid)) vocabLinks.set(vid, []); vocabLinks.get(vid).push({ wid, israeliOnly: lesson.track === 'israel' }); }
        add('word', wid, w.he, 'curriculum(word)', { group: 'lesson-word', ...(vid ? { vocabId: vid } : {}), ...(lesson.track === 'israel' ? { israeliOnly: true } : {}) });
      });
    }
  }

  // --- survival phrasebook (data/corpus/phrasebook.json). The reader requests kind 'line' when the displayed Hebrew has whitespace
  // else 'word', id `<id>`, or `<id>-m` / `<id>-f` for gendered phrases (the form shown for the learner's chosen gender, independent of
  // the narrator voice). Modern conversational Hebrew: israeli tradition only (see scope below).
  const pb = readJson(root, 'data/corpus/phrasebook.json');
  notes.push(pb.note);
  for (const p of listItems(pb.data)) {
    if (!p || !p.id) continue;
    if (p.gendered && p.forms) {
      for (const g of ['m', 'f']) if (p.forms[g] && p.forms[g].he) add(/\s/.test(p.forms[g].he) ? 'line' : 'word', `${p.id}-${g}`, p.forms[g].he, 'phrasebook', { group: 'phrasebook', israeliOnly: true });
    } else add(/\s/.test(p.he || '') ? 'line' : 'word', p.id, p.he, 'phrasebook', { group: 'phrasebook', israeliOnly: true });
  }

  // --- mnemonic anchor words (data/letters/mnemonics.json): kind 'word', id `anchor-<letterId>`. NOTE: no view requests these yet.
  const mn = readJson(root, 'data/letters/mnemonics.json');
  notes.push(mn.note);
  for (const m of (mn.data && Array.isArray(mn.data.letters) ? mn.data.letters : [])) {
    if (m && m.id && m.word) add('word', `anchor-${m.id}`, m.word, 'mnemonics', { group: 'anchor-word', israeliOnly: true });
  }

  // --- donor recording-script words (docs/voices/recording-script-<tradition>.csv). ONE source of truth: the rows come from
  // tools/pronunciation/recording_script.mjs (buildScripts), so every id a donor is asked to read has a manifest entry
  // (kind 'word', every voice x tradition, status 'missing', group 'vocab-word'; lazy-loaded shard, not core).
  // Existing ids (e.g. a corpus word with the same id) are kept as they are.
  if (opts.scriptWords !== false) {
    const sw = opts.scriptWords || scriptWordRows();
    for (const r of sw) add('word', r.id, r.he, 'recording-script', { group: 'vocab-word', ipaAll: r.ipa });
  }

  // --- vocab-id entries for words Listen / the vocab screens / review can ask for under a vocab id (data/vocab/words.json) that the donor
  // script does not carry: every vocab id in the lesson-word map, plus the Listen drill pool. Same text, voices and traditions as the rest.
  //   group 'vocab-alias': the id is mapped from a lesson word; entry has `aliasOf: word/<lesson word id>` (copyOf semantics: the same
  //     reading; excluded from "required" counts; tools/record-kit/ingest.mjs copies a recording to it when the text is the same).
  //   group 'vocab-extra': a Listen pool word that no lesson word maps to; a real, required recording need (it has no other source).
  if (opts.vocabAliases !== false) {
    const vw = readJson(root, 'data/vocab/words.json');
    notes.push(vw.note);
    const vocabById = new Map(((vw.data && vw.data.words) || []).map((w) => [w.id, w]));
    const lcfg = readJson(root, 'data/listen/config.json');
    const pool = vw.data && lcfg.data ? buildPool(vw.data.words, lcfg.data) : [];
    const wanted = [...new Set([...vocabLinks.keys(), ...pool.map((w) => w.id)])].sort();
    for (const id of wanted) {
      const w = vocabById.get(id);
      if (!w || !w.he) { warnings.push(`word-vocab-map: vocab id ${id} not in words.json, skipped`); continue; }
      const nid = normalizeId(id);
      if (seen.has(`word/${nid}`)) continue;
      const lw = vocabLinks.get(id);
      if (lw) {
        const target = lw.find((x) => !x.israeliOnly) || lw[0];
        add('word', id, w.he, 'word-vocab-map', { group: 'vocab-alias', aliasOf: `word/${target.wid}` });
      } else add('word', id, w.he, 'listen-pool', { group: 'vocab-extra' });
    }
  }

  // --- equivalence rules (human-reviewed only)
  const eq = readJson(root, 'data/audio/equivalence.json');
  notes.push(eq.note);
  const rules = (eq.data && eq.data.rules) || [];

  // --- expand to voice x tradition
  const out = [];
  for (const b of base) for (const voice of VOICES) for (const tradition of (b.israeliOnly ? ['israeli'] : TRADITIONS)) {
    const p = audioPath(voice, tradition, b.kind, b.id);
    const e = { path: p, voice, tradition, kind: b.kind, id: b.id, text: b.text };
    const ipa = (b.ipa && b.ipa[tradition]) || (b.ipaAll && b.ipaAll[tradition]);
    if (ipa) e.ipa = ipa;
    let status = 'missing', source = 'none', synth = null;
    if (exists(p)) {
      status = 'recorded'; source = 'file-present-provenance-unverified';
      const metaRel = `${p}.meta.json`;
      if (exists(metaRel)) {
        try {
          const m = JSON.parse(fs.readFileSync(path.join(root, metaRel), 'utf8'));
          if (m.status === 'recorded' || isSyntheticStatus(m.status)) status = m.status;
          if (m.source) source = String(m.source);
          // How a synthetic clip was made (written by tools/tts/manifest_update.mjs); never for a human clip.
          if (isSyntheticStatus(m.status) && m.synth && typeof m.synth === 'object') synth = m.synth;
        } catch { warnings.push(`${metaRel}: unreadable`); }
      }
    }
    e.status = status; e.source = source;
    e.group = b.group || 'other';
    if (b.israeliOnly) e.scope = 'israeli-only';
    if (b.optional) e.optional = true;
    if (b.aliasOf) e.aliasOf = b.aliasOf;
    if (b.vocabId) e.vocabId = b.vocabId;
    const eqTo = rules.filter((r) => r.to !== tradition && r.from === tradition
      && (!r.kinds || r.kinds.includes(b.kind)) && (!r.ids || r.ids.includes(b.id))).map((r) => r.to);
    if (eqTo.length) e.equivalentTo = [...new Set(eqTo)];
    if (synth) e.synth = synth; // last key, so tools/tts/manifest_update.mjs (which appends it) and a rebuild give the same bytes
    out.push(e);
  }
  return { entries: out, notes, warnings };
}

// Size budget: the eagerly loaded data/audio/manifest.json must stay under 2 MiB. Reader word clips (group 'prayer-word', one per word of
// every corpus record, x2 voices x3 traditions) are ~70% of all entries, so they live in lazily loaded per-tradition shards
// data/audio/manifest-words-<tradition>.json. The core manifest's own kind=word entries (lesson/phrasebook/anchor words, ~3,800 rows)
// live in data/audio/manifest-kind-word.json, fetched with the core after first paint (see src/shell/audio-manifest.js).
// Everything else (letters, vowels, syllables, lines, prayers) is core.
export const SHARD_GROUPS = ['prayer-word', 'vocab-word', 'vocab-alias', 'vocab-extra'];
export const SHARD_GROUP = 'prayer-word';
export const WORD_SHARD_FILE = 'data/audio/manifest-kind-word.json';
export function splitEntries(entries) {
  const core = entries.filter((e) => !SHARD_GROUPS.includes(e.group) && e.kind !== 'word');
  const wordShard = entries.filter((e) => !SHARD_GROUPS.includes(e.group) && e.kind === 'word');
  const shards = {};
  for (const t of TRADITIONS) shards[t] = entries.filter((e) => SHARD_GROUPS.includes(e.group) && e.tradition === t);
  return { core, wordShard, shards };
}
// Tiny precached summary (a few bytes) so the shell can still say "no recordings exist" when the big core manifest is not available offline.
export const SUMMARY_FILE = 'data/audio/summary.json';
export const summaryOf = (entries) => ({ total: entries.length, recorded: entries.filter((e) => e.status === 'recorded').length, tts: entries.filter((e) => isSyntheticStatus(e.status)).length });
export const shardFile = (t) => `data/audio/manifest-words-${t}.json`;

export function main(argv = process.argv.slice(2)) {
  const check = argv.includes('--check');
  const { entries, notes, warnings } = buildEntries();
  const { core, wordShard, shards } = splitEntries(entries);
  const files = [['data/audio/manifest.json', JSON.stringify(core, null, 1) + '\n'], [WORD_SHARD_FILE, JSON.stringify(wordShard, null, 1) + '\n'], ...TRADITIONS.map((t) => [shardFile(t), JSON.stringify(shards[t], null, 1) + '\n']),
    [SUMMARY_FILE, JSON.stringify(summaryOf(entries)) + '\n']];
  if (check) {
    for (const [rel, text] of files) {
      const t = path.join(ROOT, rel);
      const cur = fs.existsSync(t) ? fs.readFileSync(t, 'utf8') : '';
      if (cur !== text) { console.error(`${rel} is stale; run: node tools/audio/build_manifest.mjs`); process.exit(1); }
    }
    console.log('manifest files are current'); return;
  }
  fs.mkdirSync(path.join(ROOT, 'data/audio'), { recursive: true });
  for (const [rel, text] of files) { fs.writeFileSync(path.join(ROOT, rel), text); console.log(`${rel}: ${(Buffer.byteLength(text) / 1048576).toFixed(2)} MiB`); }
  const counts = {};
  for (const e of entries) counts[`${e.kind}/${e.status}`] = (counts[`${e.kind}/${e.status}`] || 0) + 1;
  console.log(`wrote ${entries.length} entries (${core.length} core + ${wordShard.length} kind-word + ${entries.length - core.length - wordShard.length} in tradition shards)`);
  console.log(notes.join('\n')); console.log(JSON.stringify(counts));
  for (const w of warnings) console.warn('warning:', w);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
