#!/usr/bin/env node
// Rebuild learner labels on word and line clips: pointed Hebrew stays, English meaning is filled when it was
// missing, and the phonetic is regenerated per tradition (Ashkenazi siddur; Sephardi Moroccan-adjacent).
// Also writes an English-sounds reading (`say`) and refreshes audio/INDEX.csv. Does not touch audio files,
// status, paths, or voice locks.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clipPhonetic, englishSay } from '../../src/shell/clip-labels.js';
import { stripTaamim } from '../../src/pronunciation/hebrew.js';
import { parseCsv } from '../record-kit/lib.mjs';
import { normalizeId } from './hebrew_data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILES = [
  'data/audio/manifest.json',
  'data/audio/manifest-words-israeli.json',
  'data/audio/manifest-words-sephardi.json',
  'data/audio/manifest-words-ashkenazi.json',
];
const MiB = 1048576;

const tidy = (en) => String(en || '').replace(/(?<=[a-z])-(?=[a-z])/g, ' ').replace(/\s+/g, ' ').trim();
const normHe = (s) => stripTaamim(String(s || '')).replace(/[\s\u05BE\u05C3.,;:!?'"()[\]־]/g, '');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

function loadGloss() {
  const byId = new Map();
  const byHe = new Map();
  const put = (id, en) => {
    const t = tidy(en);
    const key = normalizeId(id);
    if (key && t && t !== 'UNKNOWN' && !byId.has(key)) byId.set(key, t);
  };
  const putHe = (he, en) => {
    const t = tidy(en);
    const k = normHe(he);
    if (k && t && t !== 'UNKNOWN' && !byHe.has(k)) byHe.set(k, t);
  };
  const lessons = read('data/curriculum/lessons.json');
  for (const lesson of lessons.lessons || []) {
    (lesson.words || []).forEach((w, i) => {
      if (!w || typeof w !== 'object') return;
      put(`${lesson.id}-w${i + 1}`, w.en);
      putHe(w.he, w.en);
    });
  }
  const pb = read('data/corpus/phrasebook.json');
  for (const e of pb.entries || []) {
    put(e.id, e.en);
    putHe(e.he, e.en);
    if (e.gendered && e.forms) {
      for (const g of ['m', 'f']) {
        const form = e.forms[g];
        if (!form) continue;
        const fem = g === 'f' && ['numbers-05', 'numbers-06', 'numbers-07', 'numbers-08', 'numbers-10'].includes(e.id);
        const en = fem ? `${e.en} (feminine)` : e.en;
        put(`${e.id}-${g}`, en);
        putHe(form.he, en);
      }
    }
  }
  const mn = read('data/letters/mnemonics.json');
  for (const m of mn.letters || []) {
    put(`anchor-${m.id}`, m.wordMeaning);
    putHe(m.word, m.wordMeaning);
  }
  const vocab = read('data/vocab/words.json');
  for (const w of vocab.words || []) {
    put(w.id, w.en);
    putHe(w.he, w.en);
  }
  const reg = read('data/corpus/registry.json');
  for (const e of reg.entries || []) {
    const lines = String(e.he || '').split('\n');
    const enLines = String(e.english || '').split('\n');
    lines.forEach((_, li) => {
      const id = lines.length === 1 ? e.id : `${e.id}-l${li + 1}`;
      const en = enLines.length === lines.length ? enLines[li] : (li === 0 ? e.english : '');
      put(id, en);
    });
    let wi = 0;
    const glosses = e.wordGlosses || [];
    for (const line of lines) {
      for (const w of line.split(/\s+/)) {
        if (!/[\u05D0-\u05EA]/.test(w)) continue;
        wi += 1;
        if (glosses[wi - 1]) put(`${e.id}-w${wi}`, glosses[wi - 1]);
      }
    }
  }
  return { byId, byHe };
}

function englishFor(e, g) {
  const cur = tidy(e.english);
  if (cur && cur !== 'UNKNOWN') return cur;
  return g.byId.get(e.id) || g.byHe.get(normHe(e.text)) || '';
}

const gloss = loadGloss();
const loaded = FILES.map((rel) => [rel, read(rel)]);
let labelled = 0;
let emptyEn = 0;
for (const [, rows] of loaded) {
  for (const e of rows) {
    if (e.kind !== 'word' && e.kind !== 'line') continue;
    const ph = clipPhonetic(e.text, e.tradition);
    if (ph) e.phonetic = ph;
    const say = englishSay(e.phonetic || '');
    if (say) e.say = say;
    const en = englishFor(e, gloss);
    e.english = en;
    labelled += 1;
    if (!en) emptyEn += 1;
  }
}

for (const [rel, rows] of loaded) {
  let text = JSON.stringify(rows, null, 1) + '\n';
  if (rel.startsWith('data/audio/manifest-words-') && Buffer.byteLength(text) >= 2 * MiB) {
    for (const e of rows) delete e.say;
    text = JSON.stringify(rows, null, 1) + '\n';
    console.log(`${rel}: dropped stored say to stay under 2 MiB (${(Buffer.byteLength(text) / MiB).toFixed(2)} MiB). The app derives say from phonetic.`);
  } else {
    console.log(`${rel}: ${(Buffer.byteLength(text) / MiB).toFixed(2)} MiB`);
  }
  fs.writeFileSync(path.join(ROOT, rel), text);
}

const byPath = new Map();
for (const [, rows] of loaded) for (const e of rows) byPath.set(e.path, e);
const indexPath = path.join(ROOT, 'audio/INDEX.csv');
const indexRaw = fs.readFileSync(indexPath, 'utf8');
const headerLine = indexRaw.split(/\r?\n/, 1)[0];
const header = headerLine.split(',').map((s) => s.replace(/^"|"$/g, ''));
if (!header.includes('say')) header.push('say');
const indexRows = parseCsv(indexRaw);
for (const r of indexRows) {
  const m = byPath.get(r.file);
  if (r.kind === 'word' || r.kind === 'line') {
    const he = r.pointed_hebrew || m?.text || '';
    const ph = (m && m.phonetic) || clipPhonetic(he, r.tradition);
    if (ph) r.phonetic = ph;
    const en = (m && m.english && m.english !== 'UNKNOWN') ? m.english : (r.english && r.english !== 'UNKNOWN' ? r.english : '');
    if (en) r.english = en;
  }
  r.say = (m && m.say) || englishSay(r.phonetic || '');
}
const quote = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csv = [header.map(quote).join(','), ...indexRows.map((r) => header.map((k) => quote(r[k] ?? '')).join(','))].join('\n') + '\n';
fs.writeFileSync(indexPath, csv);

const clipRows = loaded.flatMap(([, rows]) => rows.filter((e) => e.kind === 'word' || e.kind === 'line'));
function sameRate(kind, other) {
  const base = new Map(clipRows.filter((e) => e.tradition === 'israeli' && e.kind === kind && e.phonetic).map((e) => [`${e.voice}|${e.id}`, e.phonetic]));
  let n = 0; let same = 0;
  for (const e of clipRows) {
    if (e.tradition !== other || e.kind !== kind || !e.phonetic) continue;
    const b = base.get(`${e.voice}|${e.id}`);
    if (!b) continue;
    n += 1; if (b === e.phonetic) same += 1;
  }
  return { n, same, rate: n ? same / n : 0 };
}
console.log(`labelled ${labelled} word/line rows; still missing English: ${emptyEn}`);
for (const kind of ['word', 'line']) for (const t of ['ashkenazi', 'sephardi']) {
  const s = sameRate(kind, t);
  console.log(`${kind} ${t} identical to israeli: ${s.same}/${s.n} (${(s.rate * 100).toFixed(1)}%)`);
}
