import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const audit = read('docs/legal/CONTENT-LICENCE-AUDIT.md');
const decisions = read('docs/legal/DECISIONS-FOR-JOHN.md');
const att = JSON.parse(read('data/legal/attributions.json'));
const STATUS = new Set(att.statusValues);
const COMMERCIAL = new Set(att.commercialUseValues);

const auditIds = [...audit.matchAll(/^\| `([a-z0-9-]+)` \|/gm)].map((m) => m[1]);
const byId = new Map(att.entries.map((e) => [e.id, e]));

test('the audit register names at least the core sources', () => {
  for (const id of ['wiktionary', 'tatoeba', 'uxlc', 'jps-1917', 'metsudah-siddur', 'frequencywords-opensubtitles'])
    assert.ok(auditIds.includes(id), id);
});

test('every source named in the audit has a row in attributions.json, and nothing extra', () => {
  assert.ok(auditIds.length >= 20);
  assert.equal(new Set(auditIds).size, auditIds.length, 'duplicate id in audit');
  for (const id of auditIds) assert.ok(byId.has(id), `missing attribution row for ${id}`);
  for (const e of att.entries) assert.ok(auditIds.includes(e.id), `attribution row ${e.id} not in the audit`);
  assert.equal(byId.size, att.entries.length, 'duplicate id in attributions.json');
});

test('each row has the fields the app list needs, with allowed values', () => {
  for (const e of att.entries) {
    for (const k of ['id', 'name', 'group', 'usedFor', 'licence', 'commercialUse', 'attributionText', 'status', 'auditRef'])
      assert.equal(typeof e[k], 'string', `${e.id}.${k}`);
    assert.equal(typeof e.shareAlike, 'boolean', e.id);
    assert.equal(typeof e.perItemCredit, 'boolean', e.id);
    assert.ok(STATUS.has(e.status), `${e.id} status ${e.status}`);
    assert.ok(COMMERCIAL.has(e.commercialUse), `${e.id} commercialUse ${e.commercialUse}`);
    assert.ok(e.licence.length > 0 && e.name.length > 0, e.id);
    assert.ok(e.auditRef.startsWith('CONTENT-LICENCE-AUDIT.md#'), e.id);
  }
});

test('status in the audit table matches status in the JSON', () => {
  for (const line of audit.split('\n')) {
    const m = line.match(/^\| `([a-z0-9-]+)` \|/);
    if (!m) continue;
    const cells = line.split('|').map((c) => c.trim());
    const last = cells[cells.length - 2];
    const word = last.split(/[ (]/)[0];
    assert.equal(word, byId.get(m[1]).status, m[1]);
  }
});

test('credit text is present wherever the licence requires credit, and the vocabulary text matches the data file', () => {
  for (const id of ['wiktionary', 'frequencywords-opensubtitles', 'tatoeba', 'uxlc', 'jps-1917', 'metsudah-siddur', 'hebcal-fixtures', 'font-heebo', 'font-frank-ruhl-libre', 'font-gveret-levin'])
    assert.ok(byId.get(id).attributionText.length > 20, id);
  const vocab = JSON.parse(read('data/vocab/attribution.json')).attributionText;
  assert.ok(vocab.includes(byId.get('wiktionary').attributionText.split('. Changes')[0].replace(/^Lemmas/, 'lemmas')), 'wiktionary credit is part of the in-app vocabulary credit');
  assert.ok(byId.get('tatoeba').perItemCredit);
});

test('sources that carry share-alike are flagged', () => {
  for (const id of ['wiktionary', 'kaikki-wiktextract', 'frequencywords-opensubtitles', 'wikipedia-paraphrase']) assert.equal(byId.get(id).shareAlike, true, id);
  for (const id of ['uxlc', 'tatoeba', 'jps-1917']) assert.equal(byId.get(id).shareAlike, false, id);
});

test('nothing marked verified-primary lacks a licence URL', () => {
  for (const e of att.entries) if (e.status === 'verified-primary') assert.ok(/^https?:\/\//.test(e.licenceUrl), e.id);
});

test('the corpus registry sources are all covered by a row', () => {
  const reg = JSON.parse(read('data/corpus/registry.json')).entries;
  const need = new Set();
  for (const r of reg) {
    if (/Leningrad/.test(r.source)) need.add('uxlc');
    if (/Metsudah/.test(r.source)) need.add('metsudah-siddur');
    if (/Torat Emet/.test(r.source)) need.add('torat-emet-357');
    if (/Shaliehsaboo/.test(r.source)) need.add('edot-hamizrach-shaliehsaboo');
    if (/JPS 1917/.test(r.englishSource || '')) need.add('jps-1917');
  }
  assert.ok(need.size >= 5);
  for (const id of need) assert.ok(byId.has(id), id);
});

test('the decisions file says it is not legal advice and has a checklist', () => {
  assert.ok(/not legal advice/i.test(decisions));
  assert.ok(/not legal advice/i.test(audit));
  assert.ok(/not legal advice/i.test(att.notLegalAdvice));
  assert.ok((decisions.match(/^\d+\. \[ \]/gm) || []).length >= 10);
  for (const w of ['MIT', 'Apache-2.0', 'Proprietary']) assert.ok(decisions.includes(w), w);
});

test('legal files contain no AI product names (same pattern as tools/meta/text.mjs)', async () => {
  const { TEXT_RE } = await import('../tools/meta/text.mjs');
  for (const f of ['docs/legal/CONTENT-LICENCE-AUDIT.md', 'docs/legal/DECISIONS-FOR-JOHN.md', 'data/legal/attributions.json', 'tests/legal.test.js'])
    for (const [i, ln] of read(f).split('\n').entries()) assert.ok(!TEXT_RE.test(ln), `${f}:${i + 1}`);
});

test('new data and picture files have a provenance row, and the data derived from the vocabulary is share-alike', () => {
  for (const id of ['morph-pictures', 'memory-chain-text', 'practice-data-from-vocab']) assert.ok(byId.has(id), id);
  assert.equal(byId.get('practice-data-from-vocab').shareAlike, true);
  assert.match(byId.get('morph-pictures').licence, /John Khan/);
  for (const f of ['data/roots/families.json', 'data/roots/verbs.json', 'data/gender/templates.json', 'data/nikkudfade/reading-set.json', 'data/nikkudfade/homographs.json'])
    assert.equal(JSON.parse(read(f)).source, 'data/vocab/words.json', f);
});

test('ts-fsrs MIT notice: credits entry, licence file and audit row agree', () => {
  const e = byId.get('ts-fsrs-weights');
  assert.ok(e, 'missing ts-fsrs-weights entry');
  assert.match(e.licence, /MIT/);
  const notice = read('docs/licenses/MIT-ts-fsrs.txt');
  for (const phrase of ['Permission is hereby granted, free of charge', 'The above copyright notice and this permission notice shall be included', 'THE SOFTWARE IS PROVIDED "AS IS"'])
    { assert.ok(notice.includes(phrase), phrase); assert.ok(e.attributionText.includes(phrase), `credits text: ${phrase}`); }
  assert.match(e.attributionText, /ts-fsrs/);
  assert.ok(read('src/fsrs/fsrs6.js').includes('ts-fsrs'), 'module still names its source');
});
