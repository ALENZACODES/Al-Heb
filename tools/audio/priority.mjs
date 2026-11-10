#!/usr/bin/env node
// NEXT CLIPS PRIORITY: ranks the Israeli man-voice manifest entries that still have no audio, so the next batches sent to the outside
// generator cover the most learner value first. Zero dependencies; reads only files in this repository; changes nothing outside docs/audio/.
//   node tools/audio/priority.mjs                 print a summary (counts per tier, exclusions, first 15 rows)
//   node tools/audio/priority.mjs --write         write docs/audio/NEXT-CLIPS-PRIORITY.csv, NEXT-CLIPS-EXCLUDED.csv and docs/audio/next-batches/batch-NN.csv
//   node tools/audio/priority.mjs --check         exit 1 if those files are stale (run --write)
//   node tools/audio/priority.mjs --ingest-listing <returned-manifest.csv> [--out listing.csv]
//                                                 turn a manifest the generator returned into the ingest listing (file,id,voice,tradition,kind,text)
//   options: --top 500   --batch-size 50   --kinds word[,line]
// The scoring rule is stated in docs/audio/NEXT-CLIPS-PRIORITY.md. It is the builder's judgement, not learner data.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifestFull } from './manifest_io.mjs';
import { HUMAN_ONLY_GROUPS } from './coverage.mjs';
import { CORE_PRAYER_RE } from './recording_needs.mjs';
import { normalizeId } from './hebrew_data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT_CSV = 'docs/audio/NEXT-CLIPS-PRIORITY.csv';
export const OUT_EXCLUDED = 'docs/audio/NEXT-CLIPS-EXCLUDED.csv';
export const BATCH_DIR = 'docs/audio/next-batches';

// ---- the rule, as constants (docs/audio/NEXT-CLIPS-PRIORITY.md states it in words) ----
export const DEFAULT_TOP = 500;
export const DEFAULT_BATCH = 50;
/** Lesson ids that make up the first release (v0) reading path. */
export const V0_LESSONS = ['r01', 'r02', 'r03', 'r04', 'r05', 'r06', 'r07', 'r08', 'r09', 'r10'];
/** Tier base points. The tiers are 100 apart and the bonuses below add at most 98, so a lower tier can never outrank a higher one. */
export const TIERS = [
  { id: 'T1', base: 1000, name: 'first-day word', note: 'a word taught on the first-day route (/firstday: on-ramp, first ten minutes, word ladder)' },
  { id: 'T2', base: 900, name: 'v0 lesson word', note: 'a word of lessons r01 to r10' },
  { id: 'T3', base: 800, name: 'core lesson word', note: 'a word of any other lesson, in lessons.json order' },
  { id: 'T4', base: 700, name: 'core prayer item', note: 'a word or line of a core prayer (CORE_PRAYER_RE) or of a prayer line a lesson lists' },
  { id: 'T5', base: 600, name: 'deck-order word', note: 'one of the first 1000 words of the vocabulary deck order' },
  { id: 'T6', base: 500, name: 'frequency-listed word', note: 'occurs in the project text (data/vocab/frequency.json), not in the deck order' },
  { id: 'T7', base: 400, name: 'other', note: 'everything else that is eligible' },
];
/** Tie-break when several entries share one pointed text and one signal: which one stands for the word. */
export const GROUP_PREFERENCE = ['lesson-word', 'vocab-word', 'phrasebook', 'anchor-word', 'vocab-extra', 'prayer-word'];
export const POS_MAX = 59; // within-tier position bonus: 59 for the first item in the tier order down to 0 for the last
export const FREQ_MAX = 39; // frequency bonus: 39 * (1 - corpusRank / number of ranked words)
/** Ids that must not be synthesised or listed: the held-back clip. */
export const HELD_BACK_IDS = new Set(['hf1da5ea6']);
/** Lane rule: Priestly Blessing items stay human-first (ids starting with these prefixes: lines, whole prayer and every word). */
export const HUMAN_FIRST_PREFIXES = ['bless-priestly'];
/** soundwords flags that are not marked "hard" in the file but still mean the pronunciation is open or the text is not a full utterance. */
export const EXTRA_EXCLUDING_FLAGS = ['words-ipa-colloquial-shva-drop', 'template-ellipsis'];
export const GENERATOR_COLS = ['id', 'he', 'source_file', 'source_text_sha256', 'source_structural', 'recognition', 'consistency', 'overall', 'human_approved', 'status', 'wav_file', 'wav_sha256', 'mp3_file', 'mp3_sha256'];
export const ROW_COLS = ['rank', 'id', 'pointed_hebrew', 'kind', 'group', 'tier', 'score', 'why', 'lesson_route_ref', 'already_have', 'same_text_as', 'batch'];
export const EXCLUDED_COLS = ['id', 'pointed_hebrew', 'kind', 'group', 'reasons'];
export const LISTING_COLS = ['file', 'id', 'voice', 'tradition', 'kind', 'text'];

// ---- small helpers ----
const NIQQUD = /[ְ-ׇּׁׂ]/; // vowel points, dagesh, shin/sin dots
const TAAMIM = /[֑-֯]/g;
export const nfc = (s) => String(s ?? '').normalize('NFC');
export const stripMarks = (s) => String(s ?? '').normalize('NFC').replace(/[֑-ׇ]/g, '');
const formKey = (s) => nfc(s).replace(TAAMIM, '').replace(/[־׃׀]/g, ''); // exact pointed form, ignoring taamim, maqaf and sof pasuq
const hasHebrew = (s) => /[א-ת]/.test(s || '');
export const hasPoints = (s) => NIQQUD.test(s || '');
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
const csvLine = (cols, row) => cols.map((c) => q(row[c])).join(',');
const toCsv = (cols, rows) => [cols.join(','), ...rows.map((r) => csvLine(cols, r))].join('\n') + '\n';

export function parseCsvText(text) {
  const rows = []; let row = [], cell = '', inq = false;
  const s = String(text).replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inq) { if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else inq = false; } else cell += c; }
    else if (c === '"') inq = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const rd = (root, rel) => { const p = path.join(root, rel); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };

/** Everything the ranking reads, loaded once. `data` can also be hand-made in tests (same shape). */
export function loadData(root = ROOT) {
  const first10 = rd(root, 'data/firstday/first10.json');
  const onramp = rd(root, 'data/firstday/onramp.json');
  const ladder = rd(root, 'data/firstday/ladder.json');
  const firstday = [];
  for (const s of (onramp && onramp.steps) || []) if (s.kind === 'word' && s.he) firstday.push({ he: s.he, ref: `onramp step ${s.id}` });
  (first10 && first10.words || []).forEach((w, i) => w.he && firstday.push({ he: w.he, ref: `first-ten-minutes word ${i + 1}` }));
  ((ladder && ladder.steps) || []).forEach((s) => s.word && firstday.push({ he: s.word, ref: `word ladder step ${s.n}` }));
  const les = rd(root, 'data/curriculum/lessons.json');
  const deck = rd(root, 'data/vocab/deck-order.json');
  const freq = rd(root, 'data/vocab/frequency.json');
  const words = rd(root, 'data/vocab/words.json');
  const sw = rd(root, 'data/tts/soundwords.israeli.json');
  const exc = rd(root, 'data/pronunciation/exceptions.json');
  return {
    manifest: loadManifestFull(root),
    firstday,
    lessons: (les && les.lessons) || [],
    deck: (deck && deck.entries) || [],
    freq: (freq && freq.entries) || [],
    vocab: (words && words.words) || [],
    soundwords: sw || { flagLegend: {}, items: [] },
    exceptions: exc || {},
  };
}

/** Pointed forms the pronunciation exceptions file marks as open (status needs-native-review or an unapplied candidate). */
export function openExceptionForms(exc) {
  const out = new Set();
  for (const k of ['kamatzKatanForms', 'ruleNotes', 'candidates']) for (const e of (exc && exc[k]) || []) {
    if (e && e.he && (e.status === 'needs-native-review' || e.applied === false)) out.add(formKey(e.he));
  }
  return out;
}

/** Why an entry may not be listed. [] means eligible. Reasons are short fixed strings (the excluded CSV shows them). */
export function exclusionReasons(e, ctx) {
  const r = [];
  if (HELD_BACK_IDS.has(e.id)) r.push('held back (not yet listened to)');
  if (HUMAN_ONLY_GROUPS.has(e.group)) r.push(`human-only group ${e.group}`);
  if (HUMAN_FIRST_PREFIXES.some((p) => e.id === p || e.id.startsWith(`${p}-`))) r.push('Priestly Blessing: human-first');
  if (!hasHebrew(e.text)) r.push('no Hebrew text');
  else if (!hasPoints(e.text)) r.push('unpointed text');
  const sw = ctx.soundwords.get(`${e.kind}|${e.id}`);
  if (sw) {
    if (sw.confidence === 'unvoiced') r.push('pronunciation data: unvoiced');
    for (const f of sw.flags || []) {
      const leg = ctx.flagLegend[f];
      if ((leg && leg.hard) || EXTRA_EXCLUDING_FLAGS.includes(f)) r.push(`pronunciation flag: ${f}`);
    }
  }
  const vid = ctx.vocabById.has(e.id) ? e.id : e.vocabId;
  const v = vid ? ctx.vocabById.get(vid) : null;
  if (v) {
    const f = v.flags || {};
    if (f.hidden) r.push('vocab record hidden');
    for (const reason of f.reasons || []) if (/native-reviewed|needs-native-review/.test(reason)) { r.push('vocab pointing flagged not native-reviewed'); break; }
    if (/the meaning of this term is uncertain/.test(v.en || '')) r.push('vocab gloss: term uncertain');
  }
  const forms = String(e.text).split(/[\s־]+/).map(formKey);
  if (forms.some((f) => ctx.openForms.has(f))) r.push('pronunciation exceptions: open reading');
  return r;
}

/** Natural order inside a tier: lower sorts first. Arrays compare element by element. */
function cmpKey(a, b) { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] ?? 1e12) - (b[i] ?? 1e12); if (d) return d; } return 0; }

/**
 * Rank the missing Israeli man-voice entries. Returns { rows (all eligible, ranked), excluded, tiers, counts }.
 * kinds: which manifest kinds to rank, in stage order (all of the first kind come before any of the next).
 */
export function compute(data, { kinds = ['word'] } = {}) {
  const ctx = {
    soundwords: new Map((data.soundwords.items || []).map((i) => [`${i.kind}|${i.id}`, i])),
    flagLegend: data.soundwords.flagLegend || {},
    vocabById: new Map(data.vocab.map((v) => [v.id, v])),
    openForms: openExceptionForms(data.exceptions),
  };
  // text-level signals (an id inherits the best signal of its pointed text, so the lesson id and the vocabulary id of one word rank together)
  const fd = new Map(); // text -> {n, ref}
  data.firstday.forEach((f, i) => { const k = nfc(f.he); if (!fd.has(k)) fd.set(k, { n: i + 1, ref: f.ref }); });
  const lessonPos = new Map(); data.lessons.forEach((l, i) => lessonPos.set(normalizeId(l.id), i + 1));
  const v0 = new Set(V0_LESSONS.map(normalizeId));
  const lessonText = new Map(); // text -> {lesson, pos, w}
  const idLesson = new Map(); // manifest id -> {lesson, pos, w}
  const prayerLineLesson = new Map(); // prayer record id -> first lesson (by order) that lists it
  for (const l of data.lessons) {
    const lid = normalizeId(l.id); const pos = lessonPos.get(lid);
    (l.words || []).forEach((w, i) => {
      if (!w || !w.he) return;
      const hit = { lesson: l.id, lid, pos, w: i + 1 };
      const k = nfc(w.he);
      const old = lessonText.get(k); if (!old || cmpKey([hit.pos, hit.w], [old.pos, old.w]) < 0) lessonText.set(k, hit);
      idLesson.set(normalizeId(`${l.id}-w${i + 1}`), hit);
    });
    for (const pl of l.prayerLines || []) if (typeof pl === 'string' && !prayerLineLesson.has(pl)) prayerLineLesson.set(pl, { lesson: l.id, lid, pos, w: 0 });
  }
  // A vocabulary id is the same word as the lesson word that links to it (vocabId in the manifest), so it shares that lesson context.
  const vocabLesson = new Map();
  for (const e of data.manifest) {
    if (e.tradition !== 'israeli' || e.voice !== 'm' || !e.vocabId) continue;
    const hit = idLesson.get(e.id); if (!hit) continue;
    const old = vocabLesson.get(e.vocabId); if (!old || cmpKey([hit.pos, hit.w], [old.pos, old.w]) < 0) vocabLesson.set(e.vocabId, hit);
  }
  const unp = (s) => stripMarks(s).replace(/[־\s]+/g, '');
  const deckById = new Map(), deckByText = new Map();
  for (const d of data.deck) { if (d.id && !deckById.has(d.id)) deckById.set(d.id, d.pos); const k = unp(d.he); if (k && (!deckByText.has(k) || d.pos < deckByText.get(k))) deckByText.set(k, d.pos); }
  const freqByText = new Map(); let nRanked = 0;
  for (const f of data.freq) { if (f.total > 0) { nRanked++; const k = unp(f.he); if (k && (!freqByText.has(k) || f.corpusRank < freqByText.get(k))) freqByText.set(k, f.corpusRank); } }
  const freqDenom = Math.max(1, data.freq.length);

  const wanted = new Set(kinds);
  const have = data.manifest.filter((e) => e.tradition === 'israeli' && e.voice === 'm' && e.status !== 'missing');
  const haveByText = new Map(); for (const e of have) { const k = nfc(e.text); if (!haveByText.has(k)) haveByText.set(k, e); }
  const cand = data.manifest.filter((e) => e.tradition === 'israeli' && e.voice === 'm' && e.status === 'missing' && wanted.has(e.kind) && !e.optional && !e.aliasOf);
  const excluded = []; const items = [];
  for (const e of cand) {
    const reasons = exclusionReasons(e, ctx);
    if (reasons.length) { excluded.push({ id: e.id, pointed_hebrew: e.text, kind: e.kind, group: e.group || '', reasons: [...new Set(reasons)].join('; ') }); continue; }
    items.push({ e, text: nfc(e.text) });
  }
  // The signals of one entry. useText=true: the best signal of its pointed text (lesson word, first-day word, deck order of the same spelling).
  // useText=false: only the entry's own context (its own lesson-word id or the lesson word linked to it, its own prayer, its own vocabulary id).
  const evaluate = (e, text, useText) => {
    const why = []; const refs = [];
    const ownLesson = idLesson.get(e.id) || vocabLesson.get(e.id);
    const lessonHit = ownLesson || (useText ? lessonText.get(text) : null);
    // First-day signal is by pointed text, but an id that belongs to a lesson outside v0 keeps its own (later) lesson position.
    const fdHit = useText && !(ownLesson && !v0.has(ownLesson.lid)) ? fd.get(text) : null;
    const lineId = e.id.replace(/-w\d+$/, '');
    const prayerLesson = e.group === 'prayer-word' ? prayerLineLesson.get(lineId) : (e.group === 'prayer-line' ? prayerLineLesson.get(e.id) : null);
    const corePrayer = (e.group === 'prayer-line' && CORE_PRAYER_RE.test(e.id)) || (e.group === 'prayer-word' && CORE_PRAYER_RE.test(lineId)) || !!prayerLesson;
    const vid = ctx.vocabById.has(e.id) ? e.id : e.vocabId;
    const dpos = Math.min(deckById.has(e.id) ? deckById.get(e.id) : 1e9, vid && deckById.has(vid) ? deckById.get(vid) : 1e9, useText ? (deckByText.get(unp(text)) ?? 1e9) : 1e9);
    const frank = freqByText.get(unp(text));
    let tier, key;
    if (fdHit) { tier = 'T1'; key = [fdHit.n]; }
    else if (lessonHit && v0.has(lessonHit.lid)) { tier = 'T2'; key = [lessonHit.pos, lessonHit.w]; }
    else if (lessonHit) { tier = 'T3'; key = [lessonHit.pos, lessonHit.w]; }
    else if (corePrayer) { tier = 'T4'; key = [prayerLesson ? prayerLesson.pos : 1e6, frank ?? 1e9]; }
    else if (dpos < 1e9) { tier = 'T5'; key = [dpos]; }
    else if (frank != null) { tier = 'T6'; key = [frank]; }
    else { tier = 'T7'; key = []; }
    if (fdHit) { why.push(`first-day word (${fdHit.ref})`); refs.push(`/firstday ${fdHit.ref}`); }
    if (lessonHit) { why.push(`${v0.has(lessonHit.lid) ? 'v0 ' : ''}lesson ${lessonHit.lesson} word ${lessonHit.w} (lesson ${lessonHit.pos} of ${data.lessons.length})`); refs.push(`${lessonHit.lesson} word ${lessonHit.w}`); }
    if (corePrayer) { why.push(`core prayer${prayerLesson ? ` (lesson ${prayerLesson.lesson})` : ''}`); refs.push(prayerLesson ? `${prayerLesson.lesson} prayer ${lineId}` : `prayer ${lineId}`); }
    if (dpos < 1e9) why.push(`deck order ${dpos}`);
    if (frank != null) why.push(`corpus frequency rank ${frank}`);
    if (!why.length) why.push('no lesson, prayer, deck or frequency signal');
    const freqBonus = frank != null ? Math.round(FREQ_MAX * (1 - frank / freqDenom)) : 0;
    return { tier, key, freqBonus, why: why.join('; '), ref: refs.join('; ') };
  };
  const tierIdx = Object.fromEntries(TIERS.map((t, n) => [t.id, n]));
  for (const i of items) Object.assign(i, evaluate(i.e, i.text, true));
  // One representative per pointed text (the entry whose text-level signal is best) keeps that signal; every other entry with the same text is
  // scored by its own context only. Reason: one spoken word serves all of them, so the word is ranked once on its best use and the copies on their own.
  const gpref = (i) => { const n = GROUP_PREFERENCE.indexOf(i.e.group); return n < 0 ? GROUP_PREFERENCE.length : n; };
  const better = (x, y) => tierIdx[x.tier] - tierIdx[y.tier] || cmpKey(x.key, y.key) || gpref(x) - gpref(y) || cmp(x.e.id, y.e.id); // < 0: x is the better representative
  const best = new Map();
  for (const i of items) { const o = best.get(i.text); if (!o || better(i, o) < 0) best.set(i.text, i); }
  for (const i of items) if (best.get(i.text) !== i) Object.assign(i, evaluate(i.e, i.text, false));
  // position bonus: dense order of the distinct natural keys inside each tier, spread linearly over POS_MAX..0
  const base = Object.fromEntries(TIERS.map((t) => [t.id, t.base]));
  for (const t of TIERS) {
    const mine = items.filter((i) => i.tier === t.id);
    const keys = []; for (const i of mine.sort((a, b) => cmpKey(a.key, b.key))) if (!keys.length || cmpKey(keys[keys.length - 1], i.key)) keys.push(i.key);
    const idx = new Map(keys.map((k, n) => [k.join('|'), n]));
    for (const i of mine) { const n = idx.get(i.key.join('|')); i.posBonus = keys.length > 1 ? Math.round(POS_MAX * (1 - n / (keys.length - 1))) : (i.key.length ? POS_MAX : 0); }
  }
  for (const i of items) i.score = base[i.tier] + i.posBonus + i.freqBonus;
  const stage = (k) => kinds.indexOf(k);
  items.sort((a, b) => stage(a.e.kind) - stage(b.e.kind) || b.score - a.score || cmp(a.text, b.text) || cmp(a.e.id, b.e.id));
  const firstOf = new Map();
  const rows = items.map((i, n) => {
    const t = i.text; if (!firstOf.has(t)) firstOf.set(t, i.e.id);
    const h = haveByText.get(t);
    return {
      rank: n + 1, id: i.e.id, pointed_hebrew: i.e.text, kind: i.e.kind, group: i.e.group || '', tier: i.tier, score: i.score, why: i.why, lesson_route_ref: i.ref,
      already_have: h ? `no (same text has a clip under ${h.id})` : 'no', same_text_as: firstOf.get(t) === i.e.id ? '' : firstOf.get(t), batch: '',
    };
  });
  excluded.sort((a, b) => cmp(a.id, b.id));
  const counts = { candidates: cand.length, eligible: rows.length, excluded: excluded.length, alreadyHave: have.length };
  return { rows, excluded, counts };
}

/** The files to write, as { relPath: text }. */
export function build(data, { top = DEFAULT_TOP, batchSize = DEFAULT_BATCH, kinds = ['word'] } = {}) {
  const { rows, excluded, counts } = compute(data, { kinds });
  const sel = rows.slice(0, top);
  sel.forEach((r, i) => { r.batch = Math.floor(i / batchSize) + 1; });
  const files = {};
  files[OUT_CSV] = toCsv(ROW_COLS, sel);
  files[OUT_EXCLUDED] = toCsv(EXCLUDED_COLS, excluded);
  const nb = Math.ceil(sel.length / batchSize);
  for (let b = 1; b <= nb; b++) {
    const part = sel.filter((r) => r.batch === b).map((r) => ({ id: r.id, he: r.pointed_hebrew }));
    files[`${BATCH_DIR}/batch-${String(b).padStart(2, '0')}.csv`] = toCsv(GENERATOR_COLS, part);
  }
  return { files, rows, sel, excluded, counts, batches: nb };
}

/** Returned generator manifest (GENERATOR_COLS) -> ingest listing rows. Rows without a wav_file or id are skipped and reported. */
export function listingFromReturned(csvText) {
  const rows = parseCsvText(csvText); const out = []; const skipped = [];
  for (const r of rows) {
    if (!r.id || !r.wav_file) { skipped.push(r.id || '(no id)'); continue; }
    out.push({ file: r.wav_file, id: r.id, voice: 'm', tradition: 'israeli', kind: 'word', text: r.he });
  }
  return { csv: toCsv(LISTING_COLS, out), count: out.length, skipped };
}

const listFilesOnDisk = (root) => {
  const dir = path.join(root, BATCH_DIR);
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^batch-\d+\.csv$/.test(f)).map((f) => `${BATCH_DIR}/${f}`) : [];
};

export function main(argv = process.argv.slice(2)) {
  const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
  if (argv.includes('--ingest-listing')) {
    const src = arg('ingest-listing');
    const r = listingFromReturned(fs.readFileSync(path.resolve(src), 'utf8'));
    const out = arg('out');
    if (out) fs.writeFileSync(path.resolve(out), r.csv); else process.stdout.write(r.csv);
    console.error(`listing rows: ${r.count}${r.skipped.length ? `; skipped (no id or no wav_file): ${r.skipped.join(', ')}` : ''}`);
    return;
  }
  const top = Number(arg('top', DEFAULT_TOP)); const batchSize = Number(arg('batch-size', DEFAULT_BATCH));
  const kinds = String(arg('kinds', 'word')).split(',').map((s) => s.trim()).filter(Boolean);
  const b = build(loadData(ROOT), { top, batchSize, kinds });
  if (argv.includes('--write')) {
    for (const old of listFilesOnDisk(ROOT)) if (!(old in b.files)) fs.rmSync(path.join(ROOT, old));
    for (const [rel, body] of Object.entries(b.files)) { fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true }); fs.writeFileSync(path.join(ROOT, rel), body); }
    console.log(`wrote ${OUT_CSV} (${b.sel.length} rows), ${OUT_EXCLUDED} (${b.excluded.length} rows) and ${b.batches} batch files in ${BATCH_DIR}`);
  } else if (argv.includes('--check')) {
    const stale = Object.entries(b.files).filter(([rel, body]) => !fs.existsSync(path.join(ROOT, rel)) || fs.readFileSync(path.join(ROOT, rel), 'utf8') !== body).map(([rel]) => rel);
    const extra = listFilesOnDisk(ROOT).filter((f) => !(f in b.files));
    if (stale.length || extra.length) { console.error(`stale: ${[...stale, ...extra].join(', ')} (run node tools/audio/priority.mjs --write)`); process.exit(1); }
    console.log('next-clips priority files are current');
  } else {
    const tierCount = {}; for (const r of b.rows) tierCount[r.tier] = (tierCount[r.tier] || 0) + 1;
    console.log(`candidates ${b.counts.candidates}; eligible ${b.counts.eligible}; excluded ${b.counts.excluded}; already have a clip (man voice) ${b.counts.alreadyHave}`);
    console.log(`eligible by tier: ${JSON.stringify(tierCount)}`);
    for (const r of b.rows.slice(0, 15)) console.log(`${r.rank}\t${r.id}\t${r.pointed_hebrew}\t${r.tier}\t${r.score}\t${r.why}`);
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { try { main(); } catch (e) { console.error(e.message); process.exit(1); } }
