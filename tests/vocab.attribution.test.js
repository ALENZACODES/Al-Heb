import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const { ROOT } = await import('../tools/vocab/frequency.mjs');
const { buildAttribution, ATTRIBUTION_TEXT, SA, SOURCES } = await import('../tools/vocab/attribution.mjs');
const { ATTRIBUTION } = await import('../src/vocab/vocab.view.js');

const words = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/vocab/words.json'), 'utf8')).words;
const att = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/vocab/attribution.json'), 'utf8'));
const doc = fs.readFileSync(path.join(ROOT, 'docs/vocab/ATTRIBUTION.md'), 'utf8');

test('attribution text equals the one shown in the app', () => {
  assert.equal(ATTRIBUTION_TEXT, ATTRIBUTION);
  assert.equal(att.attributionText, ATTRIBUTION);
  assert.ok(doc.includes(ATTRIBUTION));
});

test('every word id has a record; nothing extra', () => {
  assert.equal(Object.keys(att.records).length, words.length);
  for (const w of words) assert.ok(att.records[w.id], w.id);
});

test('each record names an origin, sources and a CC BY-SA distribution licence', () => {
  for (const w of words) {
    const r = att.records[w.id];
    assert.ok(['wiktionary', 'phrasebook', 'lessons'].includes(r.origin), `${w.id} ${r.origin}`);
    assert.equal(r.distribution, SA);
    assert.ok(r.sources.length >= 1 && r.sources.every((s) => SOURCES[s]));
    if (r.origin === 'wiktionary') {
      assert.equal(r.licence, SA); assert.equal(r.shareAlike, true); assert.ok(r.sources.includes('wiktionary'));
    } else {
      assert.equal(r.shareAlike, false);
      if (r.origin === 'lessons') { assert.equal(r.licence, null); assert.ok(r.flags.includes('lesson-licence-not-stated')); }
      else assert.match(r.licence, /project-owned/);
      assert.ok(r.flags.includes('pointing-unreviewed'));
    }
    if (w.source.frequency && w.source.frequency.includes('opensubtitles-he-2018')) assert.ok(r.sources.includes('frequencywords'));
  }
});

test('examples keep their per-sentence attribution', () => {
  for (const w of words) {
    const r = att.records[w.id];
    if (!w.example) { assert.equal(r.example, undefined); continue; }
    if (w.example.source.type === 'tatoeba') {
      assert.equal(r.example.source, 'tatoeba'); assert.equal(r.example.licence, 'CC BY 2.0 FR');
      assert.ok(r.example.heAuthor && r.example.enAuthor && r.example.url && r.example.heId && r.example.enId);
    } else assert.equal(r.example.source, 'uxlc-text');
  }
});

test('flags are honest: no record is silently clean when its licence is unknown', () => {
  for (const r of Object.values(att.records)) if (r.licence == null) assert.ok(r.flags.some((f) => /licence-not-stated|untraceable/.test(f)));
  assert.ok(att.counts.flags['lesson-licence-not-stated'] > 0);
});

test('file and doc agree with the builder; words.json untouched by it', () => {
  const before = fs.readFileSync(path.join(ROOT, 'data/vocab/words.json'));
  const fresh = buildAttribution(ROOT);
  assert.deepEqual(fresh.counts, att.counts, 'attribution.json is stale; rerun tools/vocab/attribution.mjs');
  assert.ok(before.equals(fs.readFileSync(path.join(ROOT, 'data/vocab/words.json'))));
  const fmt = (n) => n.toLocaleString('en-US');
  for (const n of [att.counts.total, att.counts.origin.wiktionary, att.counts.origin.phrasebook, att.counts.origin.lessons, att.counts.example.tatoeba, att.counts.example['uxlc-text'], att.counts.example.none, att.counts.mergedPhrasebook, att.counts.mergedLessons, att.counts.flags['lesson-licence-not-stated'], att.counts.flags['pointing-unreviewed']]) assert.ok(doc.includes(fmt(n)), `doc lacks ${fmt(n)}`);
});
