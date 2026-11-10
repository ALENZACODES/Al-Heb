// Shared helpers for the audio listening packet (build_audio_packet.mjs) and the returned-answers importer
// (import_audio_review.mjs). Zero dependencies. Nothing here writes to data/ or audio/.
//
// The Hebrew and the English gloss shown to a listener are READ from the repo data, never typed here:
//   Hebrew : the `text` of the audio manifest entry (data/audio/manifest*.json), the exact text the clip was matched against.
//   gloss  : lesson word `en`, phrasebook `en`, donor recording script `gloss`, vocab `en` (first one found, in that order).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { loadManifestFull } from '../audio/manifest_io.mjs';
import { normalizeId } from '../audio/hebrew_data.mjs';
import { parseCsv } from './lib/csv.mjs';

export const REVIEWABLE_STATUS = 'synthetic-unreviewed';

/** The four verdicts a listener may give. `value` is what the page and the sheet carry. */
export const VERDICTS = Object.freeze([
  { value: 'approve', label: 'Approve', hint: 'The word is correct Hebrew as pointed and the clip is clear.' },
  { value: 'approve-with-note', label: 'Approve with note', hint: 'Acceptable, but something small is worth fixing or recording. Write it in the note.' },
  { value: 'reject', label: 'Reject', hint: 'Wrong word, wrong vowels, wrong stress, unclear or an unsuitable voice. Tick what was wrong.' },
  { value: 'cannot-tell', label: 'Cannot tell', hint: 'You could not judge this one (too short, too noisy, not your area).' },
]);
export const VERDICT_VALUES = VERDICTS.map((v) => v.value);

export const ISSUES = Object.freeze([
  { value: 'wrong-word', label: 'Wrong word' },
  { value: 'wrong-vowels', label: 'Wrong vowels' },
  { value: 'wrong-stress', label: 'Wrong stress' },
  { value: 'unclear', label: 'Unclear or noisy' },
  { value: 'voice-unsuitable', label: 'Voice unsuitable' },
]);
export const ISSUE_VALUES = ISSUES.map((i) => i.value);

export const ACCENTS = Object.freeze([
  { value: '', label: 'Not sure / not stated' },
  { value: 'israeli', label: 'Israeli' },
  { value: 'sephardi', label: 'Sephardi' },
  { value: 'ashkenazi', label: 'Ashkenazi' },
  { value: 'other', label: 'Something else (say in the note)' },
]);
export const ACCENT_VALUES = ACCENTS.map((a) => a.value).filter(Boolean);

/** Columns of the sheet. The first block is filled by the builder, the second is for the listener. */
export const CLIP_COLUMNS = ['id', 'hebrew', 'gloss', 'tradition', 'file', 'clip_sha256'];
export const REVIEWER_COLUMNS = ['verdict', 'issues', 'accent_heard', 'note', 'reviewer_name', 'reviewer_role', 'review_date'];
export const SHEET_COLUMNS = [...CLIP_COLUMNS, ...REVIEWER_COLUMNS];

const BIDI = /[‎‏‪-‮⁦-⁩﻿]/g;
export const norm = (s) => String(s ?? '').normalize('NFC').replace(BIDI, '').replace(/\s+/g, ' ').trim();
export const sha256File = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export const TRADITION_LABEL = Object.freeze({ israeli: 'Israeli', sephardi: 'Sephardi', ashkenazi: 'Ashkenazi' });

const readJson = (root, rel) => {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
};
const listOf = (j, key) => (Array.isArray(j) ? j : (j && (j[key] || (j.data && j.data[key]))) || []);

/** id -> English gloss, from the repo data files that carry one. Missing files are skipped. */
export function glossIndex(root) {
  const g = new Map();
  const put = (id, en) => { if (id && typeof en === 'string' && en.trim() && !g.has(id)) g.set(id, en.trim()); };
  const les = readJson(root, 'data/curriculum/lessons.json');
  for (const lesson of listOf(les, 'lessons')) {
    if (!lesson || !lesson.id || !Array.isArray(lesson.words)) continue;
    lesson.words.forEach((w, i) => { if (w && typeof w === 'object' && !w.id) put(normalizeId(`${lesson.id}-w${i + 1}`), w.en); });
  }
  const pb = readJson(root, 'data/corpus/phrasebook.json');
  for (const p of listOf(pb, 'entries')) {
    if (!p || !p.id) continue;
    if (p.gendered && p.forms) for (const k of ['m', 'f']) put(normalizeId(`${p.id}-${k}`), (p.forms[k] && p.forms[k].en) || p.en);
    else put(normalizeId(p.id), p.en);
  }
  const csvRel = 'docs/voices/recording-script-israeli.csv';
  if (fs.existsSync(path.join(root, csvRel))) {
    const rows = parseCsv(fs.readFileSync(path.join(root, csvRel), 'utf8'));
    const h = (rows[0] || []).map((x) => x.trim());
    const ii = h.indexOf('id'), gi = h.indexOf('gloss');
    if (ii >= 0 && gi >= 0) for (const r of rows.slice(1)) put(r[ii], r[gi]);
  }
  const vw = readJson(root, 'data/vocab/words.json');
  for (const w of listOf(vw, 'words')) if (w) put(w.id, w.en);
  return g;
}

/**
 * The clips a listener is asked about: every manifest entry whose status is synthetic-unreviewed and whose file is in `audioDir`.
 * `audioDir` is the folder that holds m/ and f/ (the repo's audio/ folder by default). Entries whose file is absent are returned
 * in `missing` and are not in the packet.
 */
export function collectClips(root, audioDir = path.join(root, 'audio'), filter = {}) {
  // filter {tradition, voice}: one packet per tradition x voice slice, so a set of clips that repeats ids across traditions or voices (the respelled Sephardi and Ashkenazi
  // clips, man and woman) can still be listened to; the packet keys on id, so each slice must have unique ids.
  const entries = loadManifestFull(root).filter((e) => e.status === REVIEWABLE_STATUS && (!filter.tradition || e.tradition === filter.tradition) && (!filter.voice || e.voice === filter.voice));
  const gl = glossIndex(root);
  const clips = [], missing = [];
  for (const e of entries) {
    const rel = e.path.replace(/^audio\//, '');
    const abs = path.join(audioDir, ...rel.split('/'));
    if (!fs.existsSync(abs)) { missing.push(e.id); continue; }
    clips.push({
      id: e.id, hebrew: e.text, gloss: gl.get(e.id) || '', tradition: TRADITION_LABEL[e.tradition] || e.tradition,
      traditionKey: e.tradition, voice: e.voice, kind: e.kind, group: e.group || '',
      file: e.path, rel, sha256: sha256File(abs), bytes: fs.statSync(abs).size,
    });
  }
  const dup = clips.map((c) => c.id).filter((id, i, a) => a.indexOf(id) !== i);
  if (dup.length) throw new Error(`the packet keys on clip id, but these ids exist for more than one voice or tradition: ${[...new Set(dup)].join(', ')}`);
  clips.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { clips, missing, glossMissing: clips.filter((c) => !c.gloss).map((c) => c.id) };
}

/** Parse a returned CSV (page export or the filled sheet) into row objects keyed by header name. */
export function readAnswerCsv(text) {
  const rows = parseCsv(text);
  if (!rows.length) return { header: [], records: [] };
  const header = rows[0].map((x) => x.trim().toLowerCase().replace(/\s+/g, '_'));
  const records = rows.slice(1).filter((r) => r.some((c) => c.trim() !== '')).map((r, i) => {
    const o = { _line: i + 2 };
    header.forEach((h, k) => { o[h] = r[k] ?? ''; });
    return o;
  });
  return { header, records };
}

/** Normalise the verdict cell: case, spaces and underscores forgiven; anything else is unknown (null). No synonyms: "ok" or "yes" is not an approval. */
export function normVerdict(v) {
  const s = String(v ?? '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  if (s === '') return '';
  return VERDICT_VALUES.includes(s) ? s : null;
}
