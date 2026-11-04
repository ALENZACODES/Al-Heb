// Stage 6: deterministic, safe corrections to data/vocab/words.json and every file that copies it.
//
//   node tools/vocab/apply_corrections.mjs --generate     write data/vocab/corrections.json from the current data
//                                                          (refuses to overwrite an existing file unless --force)
//   node tools/vocab/apply_corrections.mjs --dry-run      print the diff report, write nothing
//   node tools/vocab/apply_corrections.mjs                apply (idempotent; there is no backup, git is the backup)
//
// corrections.json = [{ id, field, old, new, reason }]. Two kinds:
//   field "translit"   set the field. Applied only if the current value equals `old`; if it already equals `new`
//                      the entry is reported "already applied"; any other value is a CONFLICT (nothing is written,
//                      exit code 1), so a hand edit is never overwritten silently.
//   field "(record)"   remove the whole record (exact duplicate). `old` is a summary of the removed record
//                      (he, pos, en, frequencyRank) and `new` is null; `reason` names the record that is kept.
// Files kept in step (all derived copies of words.json):
//   data/vocab/words.json            record edits, `count`
//   data/vocab/packs/<pack>.json     the 146 word packs (the four vocab5k-tier files hold other ids and are skipped)
//   data/vocab/packs.json            wordIds, size, medianRank of an affected pack, `count` unchanged
//   data/vocab/index.json            row removed / translit column (index 11) updated
//   data/vocab/meta.json             counts.total / counts.words
// What is NOT touched: anything that was built from words.json by another lane (data/speak, data/pronunciation,
// data/wordtrace, data/torahread, audio scripts) and the files this lane regenerates (review sheets, frequency,
// themes, attribution, deck-order). Rerun their builders afterwards.
//
// What generation includes (deterministic only):
//   - exact duplicates: same pointed form + same POS (the later-ranked record is removed)
//   - missing translit where the same text already has a transliteration in another record (the divine-name pair)
//   - initial-h translit loss: the stored translit equals transliterate(he) with every "h" deleted from both,
//     but is not equal to it; the new value is transliterate(he, {scheme:'siddur', tradition:'israeli'})
// Everything else (glosses, rank holders, POS, intentionally unpointed entries) is in docs/vocab/JUDGEMENT.md.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transliterate } from '../../src/pronunciation/transliterate.js';
import { ROOT } from './frequency.mjs';

export const CORRECTIONS_PATH = 'data/vocab/corrections.json';
const REMOVE = '(record)';
const NIQ = /[ְ-ׇּׁׂ]/;

const rd = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const wr = (root, rel, obj, indent) => fs.writeFileSync(path.join(root, rel), JSON.stringify(obj, null, indent) + '\n');
const stripH = (s) => s.replace(/h/g, '');
export const expectedTranslit = (he) => transliterate(he, { scheme: 'siddur', tradition: 'israeli' });

/** Deterministic corrections for the current words.json. */
export function generateCorrections(root = ROOT) {
  const words = rd(root, 'data/vocab/words.json').words;
  const out = [];
  // 1. exact duplicates: keep the best-ranked record, remove the others
  const groups = new Map();
  for (const w of words) { const k = w.he.normalize('NFC') + '|' + w.pos; (groups.get(k) || groups.set(k, []).get(k)).push(w); }
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    g.sort((a, b) => (a.frequencyRank ?? 1e9) - (b.frequencyRank ?? 1e9) || (a.id < b.id ? -1 : 1));
    for (const dup of g.slice(1)) out.push({ id: dup.id, field: REMOVE, old: { he: dup.he, pos: dup.pos, en: dup.en, frequencyRank: dup.frequencyRank }, new: null, reason: `exact duplicate of ${g[0].id} (same pointed form and part of speech); the better-ranked record is kept` });
  }
  const removed = new Set(out.map((c) => c.id));
  // 2. missing translit for the unpointed divine-name items: copy what the pointed sibling records already say
  const NAME_SIBLINGS = { יהוה: 'יְהוָה', אדני: 'אֲדֹנָי' };
  for (const w of words) {
    if (w.translit != null && w.translit !== '') continue;
    const sib = NAME_SIBLINGS[w.he] && words.find((x) => x.he === NAME_SIBLINGS[w.he] && x.translit);
    if (sib) out.push({ id: w.id, field: 'translit', old: w.translit ?? null, new: sib.translit, reason: `missing; the lesson gloss reads this spelling as Adonai and the pointed record ${sib.id} has the same transliteration` });
  }
  // 3. initial-h loss
  for (const w of words) {
    if (removed.has(w.id) || !NIQ.test(w.he) || !w.translit) continue;
    let exp; try { exp = expectedTranslit(w.he); } catch { continue; }
    const norm = (s) => s.replace(/^-+|-+$/g, '');
    if (norm(exp) === norm(w.translit) || stripH(norm(exp)) !== stripH(norm(w.translit))) continue;
    out.push({ id: w.id, field: 'translit', old: w.translit, new: exp, reason: 'the stored transliteration drops an h that the siddur scheme writes (ה); new value is the scheme output for the pointed form' });
  }
  return out;
}

const median = (ids, byId) => {
  const r = ids.map((i) => byId.get(i)?.frequencyRank).filter((x) => x != null).sort((a, b) => a - b);
  return r.length ? r[Math.floor(r.length / 2)] : 0;
};

/** Plan + (optionally) write. Returns {changes, conflicts, already, files}. */
export function applyCorrections(root = ROOT, { dry = false } = {}) {
  const spec = rd(root, CORRECTIONS_PATH);
  const list = spec.corrections;
  const wordsDoc = rd(root, 'data/vocab/words.json');
  const byId = new Map(wordsDoc.words.map((w) => [w.id, w]));
  const report = { applied: [], already: [], conflicts: [], files: {} };
  const todoSet = new Map(); const todoRemove = new Set();
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (const c of list) {
    const w = byId.get(c.id);
    if (c.field === REMOVE) {
      if (!w) { report.already.push(c); continue; }
      if (w.he === c.old.he && w.pos === c.old.pos && w.frequencyRank === c.old.frequencyRank) { todoRemove.add(c.id); report.applied.push(c); } else report.conflicts.push({ ...c, current: { he: w.he, pos: w.pos, frequencyRank: w.frequencyRank } });
    } else {
      if (!w) { report.conflicts.push({ ...c, current: 'record missing' }); continue; }
      if (eq(w[c.field] ?? null, c.new)) report.already.push(c);
      else if (eq(w[c.field] ?? null, c.old)) { (todoSet.get(c.id) || todoSet.set(c.id, {}).get(c.id))[c.field] = c.new; report.applied.push(c); } else report.conflicts.push({ ...c, current: w[c.field] ?? null });
    }
  }
  if (report.conflicts.length) return report;

  const touchWord = (w) => { if (todoSet.has(w.id)) Object.assign(w, todoSet.get(w.id)); return w; };
  const note = (f, n) => { report.files[f] = n; };
  // words.json
  const before = wordsDoc.words.length;
  wordsDoc.words = wordsDoc.words.filter((w) => !todoRemove.has(w.id)).map(touchWord);
  wordsDoc.count = wordsDoc.words.length;
  note('data/vocab/words.json', { records: wordsDoc.words.length, removed: before - wordsDoc.words.length, edited: todoSet.size });
  const newById = new Map(wordsDoc.words.map((w) => [w.id, w]));
  // pack copies
  const packDir = path.join(root, 'data/vocab/packs');
  const packWrites = [];
  let packEdits = 0; let packRemovals = 0; let packFiles = 0;
  for (const f of fs.readdirSync(packDir).filter((x) => x.endsWith('.json')).sort()) {
    const p = JSON.parse(fs.readFileSync(path.join(packDir, f), 'utf8'));
    if (!Array.isArray(p.words)) continue; // vocab5k tier files
    packFiles++;
    const n0 = p.words.length;
    let changed = false;
    p.words = p.words.filter((w) => !todoRemove.has(w.id)).map((w) => { if (todoSet.has(w.id)) { changed = true; packEdits++; return touchWord(w); } return w; });
    if (p.words.length !== n0) { changed = true; packRemovals += n0 - p.words.length; }
    if (changed) packWrites.push([`data/vocab/packs/${f}`, p]);
  }
  note('data/vocab/packs/*.json', { packFiles, filesChanged: packWrites.length, wordEdits: packEdits, wordRemovals: packRemovals });
  // packs.json
  const packsDoc = rd(root, 'data/vocab/packs.json');
  let packsChanged = 0;
  for (const k of packsDoc.packs) {
    if (!k.wordIds.some((i) => todoRemove.has(i))) continue;
    k.wordIds = k.wordIds.filter((i) => !todoRemove.has(i)); k.size = k.wordIds.length; k.medianRank = median(k.wordIds, newById); packsChanged++;
  }
  note('data/vocab/packs.json', { packsChanged });
  // index.json
  const indexDoc = rd(root, 'data/vocab/index.json');
  const tcol = indexDoc.fields.indexOf('translit');
  const n1 = indexDoc.rows.length;
  indexDoc.rows = indexDoc.rows.filter((r) => !todoRemove.has(r[0]));
  let rowEdits = 0;
  for (const r of indexDoc.rows) if (todoSet.has(r[0]) && 'translit' in todoSet.get(r[0])) { r[tcol] = todoSet.get(r[0]).translit; rowEdits++; }
  note('data/vocab/index.json', { rowsRemoved: n1 - indexDoc.rows.length, rowsEdited: rowEdits });
  // meta.json
  const metaDoc = rd(root, 'data/vocab/meta.json');
  const delta = before - wordsDoc.words.length;
  if (delta) { metaDoc.counts.total -= delta; metaDoc.counts.words -= delta; }
  note('data/vocab/meta.json', { countsTotalDelta: -delta });

  if (!dry) {
    wr(root, 'data/vocab/words.json', wordsDoc);
    for (const [rel, p] of packWrites) wr(root, rel, p);
    wr(root, 'data/vocab/packs.json', packsDoc);
    wr(root, 'data/vocab/index.json', indexDoc);
    wr(root, 'data/vocab/meta.json', metaDoc, 1);
  }
  return report;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = new Set(process.argv.slice(2));
  if (args.has('--generate')) {
    const target = path.join(ROOT, CORRECTIONS_PATH);
    if (fs.existsSync(target) && !args.has('--force')) { console.error(`${CORRECTIONS_PATH} exists; use --force to regenerate (it only finds work in unapplied data)`); process.exit(1); }
    const corrections = generateCorrections();
    const c = { removed: corrections.filter((x) => x.field === REMOVE).length, translit: corrections.filter((x) => x.field === 'translit').length };
    fs.writeFileSync(target, JSON.stringify({ schema: 'alef-vocab-corrections/1', generated: new Date().toISOString().slice(0, 10), note: 'Deterministic, safe corrections to data/vocab/words.json, applied by tools/vocab/apply_corrections.mjs. Each entry: id, field, old, new, reason. Judgement calls are NOT here: see docs/vocab/JUDGEMENT.md.', counts: c, corrections }, null, 1) + '\n');
    console.log(`wrote ${CORRECTIONS_PATH}: ${corrections.length} corrections (${c.removed} duplicate records, ${c.translit} translit)`);
  } else {
    const dry = args.has('--dry-run');
    const r = applyCorrections(ROOT, { dry });
    if (r.conflicts.length) {
      console.log(`CONFLICT: ${r.conflicts.length} correction(s) do not match the current data; nothing written`);
      for (const c of r.conflicts.slice(0, 20)) console.log(`  ${c.id} ${c.field}: expected ${JSON.stringify(c.old)}, found ${JSON.stringify(c.current)}`);
      process.exit(1);
    }
    console.log(`${dry ? 'DRY RUN (nothing written)' : 'applied'}: ${r.applied.length} changes, ${r.already.length} already applied`);
    for (const [f, n] of Object.entries(r.files)) console.log(`  ${f}: ${JSON.stringify(n)}`);
    if (dry) for (const c of r.applied.slice(0, 200)) console.log(c.field === REMOVE ? `  - remove ${c.id} ${c.old.he} (${c.old.pos}, rank ${c.old.frequencyRank})` : `  ~ ${c.id} translit ${JSON.stringify(c.old)} -> ${JSON.stringify(c.new)}`);
  }
}
