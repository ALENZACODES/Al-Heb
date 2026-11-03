#!/usr/bin/env node
// Builds data/audio/manifest.json (array of {path, voice, tradition, kind, id, text, ipa?, status, source, equivalentTo?}).
// Reads other lanes' data when present; skips gracefully when absent. Status is "missing" until a file exists under audio/.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  TRADITIONS, VOICES, KINDS, LETTERS, FINAL_LETTERS, GRID_MARKS, GRID_VOWELS, GRID_VOWEL_IPA_ISRAELI,
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

export function buildEntries({ root = ROOT, existsFn } = {}) {
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
    base.push({ kind: 'letter', id, text: name });
    base.push({ kind: 'letter', id: `${id}-sound`, text: name[0], ipa: { israeli: ipa }, isolatedSound: true });
  }
  for (const [id, , name] of FINAL_LETTERS) base.push({ kind: 'letter', id, text: name });

  // --- vowels
  const nq = readJson(root, 'data/pronunciation/niqqud.json');
  notes.push(nq.note);
  const nqById = new Map(listItems(nq.data).map((r) => [r.id, r]));
  for (const [id, text] of VOWELS) {
    const rec = nqById.get(id);
    const ipa = rec && rec.ipa && typeof rec.ipa === 'object' ? { ...rec.ipa } : undefined;
    base.push({ kind: 'vowel', id, text, ipa });
  }
  if (nq.data) for (const [id] of VOWELS) if (!nqById.has(id)) warnings.push(`niqqud.json lacks id ${id}`);

  // --- syllable grid: 22 letters x 5 vowel sounds
  for (const [lid, glyph, , cons] of LETTERS) {
    for (const [vs, mark] of GRID_VOWELS) {
      const text = (glyph + (GRID_MARKS[lid] || '') + mark).normalize('NFC');
      base.push({ kind: 'syllable', id: `${lid}-${vs}`, text, ipa: { israeli: cons + GRID_VOWEL_IPA_ISRAELI[vs] }, grid: true });
    }
  }

  // --- corpus + curriculum
  const seen = new Set(base.map((b) => `${b.kind}/${b.id}`));
  const add = (kind, rawId, text, src) => {
    const id = normalizeId(rawId);
    if (!id || !text || !HEB.test(text)) { warnings.push(`${src}: skipped ${JSON.stringify(rawId)} (no id or no Hebrew text)`); return; }
    if (seen.has(`${kind}/${id}`)) return;
    seen.add(`${kind}/${id}`);
    base.push({ kind, id, text, from: src });
  };
  const reg = readJson(root, 'data/corpus/registry.json');
  notes.push(reg.note);
  for (const it of listItems(reg.data)) add(guessKind(it), it.id, it.he || it.text, 'corpus');
  const les = readJson(root, 'data/curriculum/lessons.json');
  notes.push(les.note);
  for (const lesson of listItems(les.data)) {
    for (const [field, kind] of [['words', 'word'], ['prayerLines', 'line']]) {
      for (const w of lesson[field] || []) {
        if (typeof w === 'string') {
          if (HEB.test(w)) add(kind, `${kind[0]}-${crypto.createHash('sha1').update(w).digest('hex').slice(0, 8)}`, w, 'curriculum(hash-id)');
        } else if (w && typeof w === 'object') add(kind, w.id, w.he || w.text, 'curriculum');
      }
    }
  }

  // --- equivalence rules (human-reviewed only)
  const eq = readJson(root, 'data/audio/equivalence.json');
  notes.push(eq.note);
  const rules = (eq.data && eq.data.rules) || [];

  // --- expand to voice x tradition
  const out = [];
  for (const b of base) for (const voice of VOICES) for (const tradition of TRADITIONS) {
    const p = audioPath(voice, tradition, b.kind, b.id);
    const e = { path: p, voice, tradition, kind: b.kind, id: b.id, text: b.text };
    const ipa = b.ipa && b.ipa[tradition];
    if (ipa) e.ipa = ipa;
    let status = 'missing', source = 'none';
    if (exists(p)) {
      status = 'recorded'; source = 'file-present-provenance-unverified';
      const metaRel = `${p}.meta.json`;
      if (exists(metaRel)) {
        try {
          const m = JSON.parse(fs.readFileSync(path.join(root, metaRel), 'utf8'));
          if (['tts', 'recorded'].includes(m.status)) status = m.status;
          if (m.source) source = String(m.source);
        } catch { warnings.push(`${metaRel}: unreadable`); }
      }
    }
    e.status = status; e.source = source;
    const eqTo = rules.filter((r) => r.to !== tradition && r.from === tradition
      && (!r.kinds || r.kinds.includes(b.kind)) && (!r.ids || r.ids.includes(b.id))).map((r) => r.to);
    if (eqTo.length) e.equivalentTo = [...new Set(eqTo)];
    out.push(e);
  }
  return { entries: out, notes, warnings };
}

export function main(argv = process.argv.slice(2)) {
  const check = argv.includes('--check');
  const { entries, notes, warnings } = buildEntries();
  const text = JSON.stringify(entries, null, 1) + '\n';
  const target = path.join(ROOT, 'data/audio/manifest.json');
  if (check) {
    const cur = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
    if (cur !== text) { console.error('manifest.json is stale; run: node tools/audio/build_manifest.mjs'); process.exit(1); }
    console.log('manifest.json is current'); return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
  const counts = {};
  for (const e of entries) counts[`${e.kind}/${e.status}`] = (counts[`${e.kind}/${e.status}`] || 0) + 1;
  console.log(`wrote ${entries.length} entries to data/audio/manifest.json`);
  console.log(notes.join('\n')); console.log(JSON.stringify(counts));
  for (const w of warnings) console.warn('warning:', w);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
