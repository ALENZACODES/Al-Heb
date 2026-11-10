// Round 3 (lane 5): prayer roster, per-prayer metadata, Torah-service guide, gaps list.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { wordsOf } from '../src/corpus/normalize.js';

const root = new URL('../', import.meta.url);
const J = (p) => JSON.parse(fs.readFileSync(new URL(p, root), 'utf8'));
const registry = J('data/corpus/registry.json').entries;
const meta = J('data/corpus/prayer-meta.json');
const guide = J('data/corpus/torah-service-guide.json');
const gaps = J('data/corpus/gaps.json');
const snapshot = J('data/corpus/source-snapshot.json').items;
const ids = new Set(registry.map((e) => e.id));

const PERMISSIVE = /^(Public Domain|CC0|CC-BY|Public Domain \/ copy without restriction)/;
const RESTRICTED = /NC|SA\b|ND|All rights|Copyright|proprietary/i;

test('round 3: the registry grew by at least 40 records and none is typed from memory', () => {
  assert.ok(registry.length >= 67, 'registry has ' + registry.length);
  for (const e of registry) {
    assert.equal(e.typedFromMemory, false, `${e.id}: typedFromMemory must be false (nothing is typed from memory)`);
    assert.equal(e.proofread, false, e.id);
  }
});

test('round 3: every record states source URL, licence, retrieval date and a permissive licence label', () => {
  for (const e of registry) {
    assert.ok(/^https:\/\/[^ ]+$/.test(e.sourceUrl), `${e.id}: sourceUrl`);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(e.retrieved), `${e.id}: retrieved date`);
    assert.ok(PERMISSIVE.test(e.license), `${e.id}: licence ${e.license}`);
    assert.ok(!RESTRICTED.test(e.license), `${e.id}: restrictive licence ${e.license}`);
    assert.ok(e.attribution && e.attribution.length > 30, e.id);
    assert.ok(snapshot[e.snapshotId], `${e.id}: no snapshot entry`);
    assert.equal(e.retrieved, (snapshot[e.snapshotId].fetchedAt || J('data/corpus/source-snapshot.json').fetchedAt).slice(0, 10), `${e.id}: retrieved date matches snapshot`);
  }
});

test('round 3: no record or text is empty; every Hebrew string has letters and points', () => {
  for (const e of registry) {
    assert.ok(e.he.trim().length > 0, `${e.id}: empty he`);
    assert.ok(wordsOf(e.he).length >= 1, `${e.id}: no words`);
    assert.ok(e.english.trim().length > 0, `${e.id}: empty english`);
    assert.equal(e.he.split('\n').length, e.lines, `${e.id}: lines field`);
    assert.ok(e.he.split('\n').every((l) => l.trim().length > 0), `${e.id}: blank line`);
  }
});

test('round 3: records with corrections are never "verified" and say which words were corrected', () => {
  for (const e of registry) {
    if (e.transforms?.corrections) {
      assert.equal(e.status, 'transcribed-needs-check', e.id);
      assert.ok(/corrections/.test(e.verifiedAgainst), e.id);
      assert.ok(e.transforms.corrections.every((c) => c.length === 2 && c[0] !== c[1]), e.id);
    }
    if (e.transforms) assert.ok(e.he.length > 0);
  }
  assert.ok(registry.filter((e) => e.transforms?.corrections).length >= 1);
});

test('prayer-meta: one entry per registry id, none extra, with the required fields', () => {
  assert.equal(meta.schema, 'alef-corpus-prayer-meta/1');
  const keys = Object.keys(meta.entries);
  assert.deepEqual(keys.filter((k) => !ids.has(k)), [], 'meta for unknown ids');
  assert.deepEqual([...ids].filter((k) => !meta.entries[k]), [], 'registry ids without meta');
  for (const [id, m] of Object.entries(meta.entries)) {
    assert.ok(Array.isArray(m.service), id);
    assert.ok(m.whereInService.trim().length > 10, `${id}: whereInService`);
    assert.ok(meta.vocabulary.delivery.includes(m.delivery), `${id}: delivery ${m.delivery}`);
    assert.ok(m.whatItSays.trim().length > 10, `${id}: whatItSays`);
    assert.equal(m.clergyReviewed, false, `${id}: nobody has reviewed this`);
    for (const d of ['orthodox', 'conservative', 'reform']) {
      assert.ok(meta.vocabulary.denominationUse.includes(m.denominations[d].use), `${id}.${d}`);
    }
  }
});

test('prayer-meta: service tags point at real guide sections', () => {
  const sectionIds = new Set(guide.sections.map((s) => s.id));
  const occ = new Set(guide.otherOccasions.map((o) => o.id));
  for (const [id, m] of Object.entries(meta.entries)) {
    for (const t of m.service) {
      if (t.startsWith('shabbat-morning/')) assert.ok(sectionIds.has(t.split('/')[1]), `${id}: ${t}`);
      else assert.ok(occ.has(t), `${id}: ${t}`);
    }
  }
});

test('guide: ordered sections, every prayer id is in the registry, every gap id is in gaps.json', () => {
  assert.equal(guide.schema, 'alef-corpus-guide/1');
  assert.ok(guide.sections.length >= 10);
  guide.sections.forEach((s, i) => {
    assert.equal(s.order, i + 1);
    for (const k of ['title', 'whatHappens', 'yourPart', 'howCongregationsDiffer']) assert.ok(typeof s[k] === 'string' && s[k].length > 5, `${s.id}.${k}`);
    for (const p of s.prayers) { assert.ok(ids.has(p.id), `${s.id}: unknown prayer ${p.id}`); assert.ok(p.role.length > 3); }
  });
  const gapIds = new Set(gaps.gaps.map((g) => g.id));
  const all = [...guide.sections, ...guide.otherOccasions];
  for (const s of all) for (const g of s.gaps) assert.ok(gapIds.has(g), `${s.id}: unknown gap ${g}`);
  for (const o of guide.otherOccasions) for (const p of o.prayers) assert.ok(ids.has(p), `${o.id}: unknown prayer ${p}`);
  // the sections a first-year attendee must meet, in this order
  const order = guide.sections.map((s) => s.id);
  const pos = (id) => order.indexOf(id);
  assert.ok(pos('shema-and-blessings') < pos('amidah') && pos('amidah') < pos('torah-service-open') && pos('torah-service-open') < pos('torah-reading') && pos('torah-reading') < pos('haftarah') && pos('haftarah') < pos('returning-torah') && pos('returning-torah') < pos('closing'));
  const inGuide = new Set(guide.sections.flatMap((s) => s.prayers.map((p) => p.id)));
  for (const need of ['shema-1', 'torah-bless-1', 'torah-bless-2', 'torah-barchu', 'haftarah-before', 'haftarah-after', 'aleinu-1', 'kaddish-1', 'vayehi-binsoa', 'ein-kamocha']) assert.ok(inGuide.has(need), need);
});

test('gaps: audit covers the requested list, ids are valid, statuses use the fixed vocabulary', () => {
  const STATUS = ['not-found-in-permissive-source', 'sourceable-not-added', 'likely-copyrighted', 'out-of-scope-this-round'];
  const seen = new Set();
  for (const g of gaps.gaps) {
    assert.ok(!seen.has(g.id), 'duplicate gap id ' + g.id); seen.add(g.id);
    assert.ok(STATUS.includes(g.status), g.id);
    assert.ok(g.why.length > 20, g.id);
    for (const r of g.relatedIds) assert.ok(ids.has(r), `${g.id}: related ${r}`);
  }
  for (const a of gaps.audit) {
    assert.ok(['present', 'added-round-3', 'partial', 'gap'].includes(a.status), a.item);
    for (const i of a.ids) assert.ok(ids.has(i), `${a.item}: ${i}`);
    if (a.status !== 'gap') assert.ok(a.ids.length > 0, a.item);
  }
  const items = gaps.audit.map((a) => a.item.toLowerCase()).join(' | ');
  for (const need of ['shema', 'baruch shem', "v'ahavta", 'amidah opening', 'amidah closing', 'kiddush, friday', 'kiddush, shabbat day', 'motzi', 'candle', 'havdalah', 'barchu', 'haftarah', 'ein kamocha', 'aleinu', 'kaddish', 'adon olam', 'yigdal', 'ashrei', 'modeh ani', 'shehecheyanu', 'hanukkah', 'birkat hamazon', 'priestly', 'mi shebeirach']) {
    assert.ok(items.includes(need), 'audit lacks: ' + need);
  }
});

test('new sources: only the labels recorded in the snapshot (Public Domain, CC0, CC-BY); Daat text is not used', () => {
  for (const e of registry) {
    assert.ok(!/Daat/i.test(e.source), `${e.id}: Daat Siddur text is not used (defective pointing)`);
    const sn = snapshot[e.snapshotId];
    assert.equal(e.license, sn.license, e.id);
  }
});

test('LICENSES.md lists every new record id and the retrieval date column', () => {
  const md = fs.readFileSync(new URL('docs/corpus/LICENSES.md', root), 'utf8');
  for (const e of registry) assert.ok(md.includes('`' + e.id + '`'), e.id);
  assert.ok(/\| Retrieved \|/.test(md));
  assert.ok(/Daat Siddur Ashkenaz/.test(md));
});
