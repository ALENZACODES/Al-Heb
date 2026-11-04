// Stage 6: deterministic corrections (data/vocab/corrections.json) applied by tools/vocab/apply_corrections.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const { ROOT } = await import('../tools/vocab/frequency.mjs');
const { applyCorrections, generateCorrections, CORRECTIONS_PATH, expectedTranslit } = await import('../tools/vocab/apply_corrections.mjs');
const { lintWords } = await import('../tools/vocab/review_pack.mjs');

const rd = (rel, root = ROOT) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const spec = rd(CORRECTIONS_PATH);
const wordsDoc = rd('data/vocab/words.json');
const words = wordsDoc.words;
const byId = new Map(words.map((w) => [w.id, w]));
const packFiles = fs.readdirSync(path.join(ROOT, 'data/vocab/packs')).filter((f) => f.endsWith('.json'));
const packs = packFiles.map((f) => rd(`data/vocab/packs/${f}`)).filter((p) => Array.isArray(p.words));

test('corrections.json: id, field, old, new, reason on every entry; only the deterministic kinds', () => {
  assert.equal(spec.schema, 'alef-vocab-corrections/1');
  assert.equal(spec.counts.removed, 2); assert.equal(spec.counts.translit, 67); assert.equal(spec.counts.forms, 1);
  assert.equal(spec.corrections.length, 70);
  for (const c of spec.corrections) {
    for (const k of ['id', 'field', 'old', 'new', 'reason']) assert.ok(k in c, `${c.id} lacks ${k}`);
    assert.ok(c.reason.length > 20);
    assert.ok(['translit', 'forms.plural', '(record)'].includes(c.field));
    if (c.field === '(record)') { assert.equal(c.new, null); assert.match(c.reason, /exact duplicate of h/); }
  }
  assert.equal(new Set(spec.corrections.map((c) => c.id + c.field)).size, spec.corrections.length);
});

test('applied: removed duplicates are gone everywhere, corrected translits are in words.json, every pack copy, and index.json', () => {
  assert.equal(words.length, wordsDoc.count);
  const index = rd('data/vocab/index.json'); const tcol = index.fields.indexOf('translit');
  const rows = new Map(index.rows.map((r) => [r[0], r]));
  const packWords = new Map(); for (const p of packs) for (const w of p.words) packWords.set(w.id, w);
  const packsDoc = rd('data/vocab/packs.json');
  const inPacksJson = new Set(packsDoc.packs.flatMap((p) => p.wordIds));
  for (const c of spec.corrections) {
    if (c.field === '(record)') {
      assert.ok(!byId.has(c.id), `${c.id} still in words.json`); assert.ok(!packWords.has(c.id)); assert.ok(!rows.has(c.id)); assert.ok(!inPacksJson.has(c.id));
      const kept = /duplicate of (h[0-9a-f]+)/.exec(c.reason)[1];
      assert.ok(byId.has(kept) && byId.get(kept).he === c.old.he && byId.get(kept).pos === c.old.pos, 'the kept twin exists');
    } else if (c.field !== 'translit') {
      const at = (w) => c.field.split('.').reduce((o, k) => o?.[k], w);
      assert.equal(at(byId.get(c.id)), c.new, c.id); assert.equal(at(packWords.get(c.id)), c.new);
    } else {
      assert.equal(byId.get(c.id).translit, c.new, c.id);
      assert.equal(packWords.get(c.id).translit, c.new); assert.equal(rows.get(c.id)[tcol], c.new);
    }
  }
});

test('derived copies agree with words.json: 146 pack files, packs.json, index.json, meta.json', () => {
  assert.equal(packs.length, 146);
  const seen = new Set();
  for (const p of packs) for (const w of p.words) { assert.deepEqual(w, byId.get(w.id), `${p.pack}/${w.id} differs from words.json`); assert.ok(!seen.has(w.id)); seen.add(w.id); }
  assert.equal(seen.size, words.length, 'every record is in exactly one pack');
  const packsDoc = rd('data/vocab/packs.json');
  for (const p of packsDoc.packs) { assert.equal(p.size, p.wordIds.length); for (const id of p.wordIds) assert.equal(byId.get(id).pack, p.id); }
  const index = rd('data/vocab/index.json');
  assert.equal(index.rows.length, words.length);
  assert.equal(rd('data/vocab/meta.json').counts.total, words.length);
});

test('lint after correction: no duplicates, no translit mismatch or gap; pack copies identical', () => {
  const flags = lintWords(words, packs);
  const all = [...flags.values()].flat();
  for (const f of ['duplicate', 'translit-mismatch', 'translit-missing', 'pack-mismatch']) assert.ok(!all.includes(f), f);
  assert.ok(all.includes('no-niqqud'), 'the two intentionally unpointed items are still reported, not hidden');
  assert.equal(new Set(words.map((w) => w.he.normalize('NFC') + '|' + w.pos)).size, words.length);
  for (const w of words) if (/[ְ-ּ]/.test(w.he) && w.translit) assert.equal(w.translit.replace(/^-+|-+$/g, '').replace(/h/g, ''), expectedTranslit(w.he).replace(/^-+|-+$/g, '').replace(/h/g, ''));
});

test('re-running is a no-op (idempotent) and a dry run writes nothing', () => {
  const sha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
  const before = [sha('data/vocab/words.json'), sha('data/vocab/packs.json'), sha('data/vocab/index.json'), sha('data/vocab/meta.json')];
  const r = applyCorrections(ROOT, { dry: true });
  assert.equal(r.applied.length, 0); assert.equal(r.conflicts.length, 0); assert.equal(r.already.length, 70);
  assert.deepEqual([sha('data/vocab/words.json'), sha('data/vocab/packs.json'), sha('data/vocab/index.json'), sha('data/vocab/meta.json')], before);
  assert.deepEqual(generateCorrections(ROOT).filter((c) => c.field === '(record)'), [], 'nothing left to generate for duplicates');
});

function miniRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alef-corr-'));
  const w = (id, he, tr, rank, extra = {}) => ({ id, kind: 'word', he, heUnpointed: he.replace(/[ְ-ׇ]/g, ''), translit: tr, en: 'x', pos: 'noun', frequencyRank: rank, pack: 'p-1', ...extra });
  const recs = [w('h1', 'הוֹד', 'od', 10), w('h2', 'סֵפֶר', 'sefer', 20), w('h3', 'סֵפֶר', 'sefer', 30)];
  const d = (rel, obj, ind) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), JSON.stringify(obj, null, ind) + '\n'); };
  d('data/vocab/words.json', { schema: 's', count: 3, words: recs });
  d('data/vocab/packs/p-1.json', { pack: 'p-1', words: recs });
  d('data/vocab/packs/vocab5k-tier-500.json', { entries: [] });
  d('data/vocab/packs.json', { count: 1, packs: [{ id: 'p-1', size: 3, medianRank: 20, wordIds: ['h1', 'h2', 'h3'] }] });
  d('data/vocab/index.json', { fields: ['id', 'he', 'translit'], rows: recs.map((r) => [r.id, r.he, r.translit]) });
  d('data/vocab/meta.json', { counts: { total: 3, words: 3 } }, 1);
  d(CORRECTIONS_PATH, { corrections: [
    { id: 'h1', field: 'translit', old: 'od', new: 'hod', reason: 'drops h' },
    { id: 'h3', field: '(record)', old: { he: 'סֵפֶר', pos: 'noun', en: 'x', frequencyRank: 30 }, new: null, reason: 'exact duplicate of h2' },
  ] });
  return root;
}

test('mini repo: dry run reports, apply edits every copy once, second run is a no-op, a hand edit is a conflict', () => {
  const root = miniRoot();
  const dry = applyCorrections(root, { dry: true });
  assert.equal(dry.applied.length, 2); assert.equal(rd('data/vocab/words.json', root).words.length, 3, 'dry run wrote nothing');
  const r = applyCorrections(root);
  assert.equal(r.applied.length, 2);
  assert.deepEqual(rd('data/vocab/words.json', root).words.map((x) => [x.id, x.translit]), [['h1', 'hod'], ['h2', 'sefer']]);
  assert.equal(rd('data/vocab/words.json', root).count, 2);
  assert.deepEqual(rd('data/vocab/packs/p-1.json', root).words.map((x) => [x.id, x.translit]), [['h1', 'hod'], ['h2', 'sefer']]);
  const pj = rd('data/vocab/packs.json', root).packs[0]; assert.deepEqual(pj.wordIds, ['h1', 'h2']); assert.equal(pj.size, 2); assert.equal(pj.medianRank, 20);
  assert.deepEqual(rd('data/vocab/index.json', root).rows, [['h1', 'הוֹד', 'hod'], ['h2', 'סֵפֶר', 'sefer']]);
  assert.equal(rd('data/vocab/meta.json', root).counts.total, 2);
  const again = applyCorrections(root);
  assert.equal(again.applied.length, 0); assert.equal(again.already.length, 2);
  const f = path.join(root, 'data/vocab/words.json'); const doc = JSON.parse(fs.readFileSync(f, 'utf8')); doc.words[0].translit = 'hand-edited'; fs.writeFileSync(f, JSON.stringify(doc) + '\n');
  const text = fs.readFileSync(f, 'utf8');
  const c = applyCorrections(root);
  assert.equal(c.conflicts.length, 1); assert.equal(fs.readFileSync(f, 'utf8'), text, 'a conflict writes nothing');
  fs.rmSync(root, { recursive: true, force: true });
});
