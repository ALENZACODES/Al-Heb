import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadCorpus } from '../src/corpus/corpus.js';

const root = new URL('../', import.meta.url);
const registry = JSON.parse(fs.readFileSync(new URL('data/corpus/registry.json', root), 'utf8'));
const snapshot = JSON.parse(fs.readFileSync(new URL('data/corpus/source-snapshot.json', root), 'utf8'));
const entries = registry.entries;

const CONTRACT_IDS = ['bless-priestly-1', 'bless-priestly-2', 'bless-priestly-3', 'shema-1'];
const ROSTER_IDS = ['shema-vahavta', 'bless-formula-1', 'mah-tovu-1', 'mi-chamocha-1', 'num-12-13', 'kiddush-wine-1', 'hamotzi', 'candle-shabbat',
  'torah-bless-1', 'torah-bless-2', 'avot-1', 'aleinu-1', 'adon-olam-1', 'kaddish-1', 'birkat-hamazon-1'];

test('registry: top-level shape consumed by other lanes (first object-array is `entries`)', () => {
  assert.equal(registry.schema, 'alef-corpus-registry/1');
  assert.ok(Array.isArray(registry.entries) && registry.entries.length >= 20);
  const arrays = Object.values(registry).filter((v) => Array.isArray(v) && v.length && typeof v[0] === 'object');
  assert.equal(arrays.length, 1, 'tools/audio listItems() takes the first object-array: keep exactly one');
});

test('registry: contract ids, roster ids and lane-1 ids are all present', () => {
  const ids = new Set(entries.map((e) => e.id));
  for (const id of [...CONTRACT_IDS, ...ROSTER_IDS]) assert.ok(ids.has(id), 'missing ' + id);
  const f = new URL('docs/curriculum/corpus-ids-needed.md', root);
  assert.ok(fs.existsSync(f), 'lane 1 id list not found');
  const wanted = [...fs.readFileSync(f, 'utf8').matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|/gm)].map((m) => m[1]);
  assert.ok(wanted.length >= 15, 'parsed ' + wanted.length + ' lane-1 ids');
  const missing = wanted.filter((id) => !ids.has(id));
  assert.deepEqual(missing, [], 'lane-1 ids with no registry record');
});

test('registry: ids unique, aliases do not collide', () => {
  const ids = entries.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  const all = new Set(ids);
  for (const e of entries) for (const a of e.aliases || []) { assert.ok(!all.has(a), 'alias collides with id: ' + a); all.add(a); }
});

test('registry: every record has the required fields and a licence', () => {
  for (const e of entries) {
    for (const k of ['id', 'ref', 'title', 'he', 'source', 'sourceUrl', 'license', 'attribution', 'english', 'englishSource', 'englishLicense', 'status', 'language', 'category', 'level']) {
      assert.ok(typeof e[k] === 'string' && e[k].trim().length > 0, `${e.id}: field ${k} missing/empty`);
    }
    assert.ok(/^https:\/\//.test(e.sourceUrl), `${e.id}: sourceUrl`);
    assert.ok(['transcribed-needs-check', 'verified'].includes(e.status), `${e.id}: status ${e.status}`);
    assert.ok(['hebrew', 'aramaic'].includes(e.language));
    assert.equal(e.traditionNeutral, true);
    assert.equal(typeof e.proofread, 'boolean');
    assert.ok(e.attribution.length > 30, `${e.id}: attribution too short`);
  }
});

test('registry: English is public domain (JPS 1917) or our original gloss, nothing else', () => {
  for (const e of entries) {
    assert.ok(/^JPS 1917 /.test(e.englishSource) || e.englishSource === 'original-gloss', `${e.id}: englishSource ${e.englishSource}`);
    if (e.englishSource === 'original-gloss') assert.equal(e.englishLicense, 'original (project-owned)');
    else assert.equal(e.englishLicense, 'Public Domain');
    const lines = e.he.split('\n').length;
    const en = e.english.split('\n').length;
    if (lines > 1 && e.englishSource === 'original-gloss') assert.equal(en, lines, `${e.id}: one English gloss line per Hebrew line`);
  }
  // none of the restricted translations may appear in sources
  for (const e of entries) assert.ok(!/NJPS|JPS 1985|JPS 2023|Koren|Sacks|Artscroll|Soncino/i.test(e.english + e.englishSource), e.id);
});

test('registry: "verified" records state what they were compared with, and nothing is claimed as educator-proofread', () => {
  for (const e of entries) {
    if (e.status === 'verified') {
      assert.ok(/fetched on \d{4}-\d{2}-\d{2} from https:\/\//.test(e.verifiedAgainst), `${e.id}: verifiedAgainst`);
      assert.ok(snapshot.items[e.snapshotId], `${e.id}: no snapshot entry ${e.snapshotId}`);
    }
    assert.equal(e.proofread, false, `${e.id}: no educator has proofread this text`);
  }
});

test('registry: Kaddish and Brich shmei are flagged Aramaic, every other record Hebrew', () => {
  for (const e of entries) assert.equal(e.language, ['kaddish-1', 'brich-shmei'].includes(e.id) ? 'aramaic' : 'hebrew', e.id);
});

test('registry: Modeh Ani feminine variant is present but honestly marked as derived', () => {
  const m = entries.find((e) => e.id === 'modeh-ani-1');
  assert.equal(m.variants.f.status, 'transcribed-needs-check');
  assert.notEqual(m.variants.f.he, m.he);
});

test('registry: Deut 6:4 keeps UXLC enlarged-letter marks (ayin of shema, dalet of echad)', () => {
  const s = entries.find((e) => e.id === 'shema-1');
  assert.deepEqual(s.largeLetters, ['ע', 'ד']);
});

test('corpus API loads both data files and resolves aliases', async () => {
  const c = await loadCorpus();
  assert.equal(c.getText('mah-tovu-1').ref, 'Numbers 24:5');
  assert.equal(c.getText('mah-tovu-num-24-5').id, 'mah-tovu-1');
  assert.equal(c.getText('nope'), null);
  assert.ok(c.allPhrases().length >= 150);
});
