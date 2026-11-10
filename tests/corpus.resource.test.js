// Checks for the Metsudah re-sourcing (tools/corpus/resource_metsudah.mjs, docs/corpus/RESOURCE-METSUDAH.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applyTransforms, foldedSkeleton } from '../src/corpus/normalize.js';
import { PLAN, NOT_RESOURCED, qualityIssues, wordDiff, buildRawLines, pickVersion } from '../tools/corpus/resource_metsudah.mjs';

const root = new URL('../', import.meta.url);
const registry = JSON.parse(fs.readFileSync(new URL('data/corpus/registry.json', root), 'utf8')).entries;
const snapshot = JSON.parse(fs.readFileSync(new URL('data/corpus/source-snapshot.json', root), 'utf8')).items;
const doc = fs.readFileSync(new URL('docs/corpus/RESOURCE-METSUDAH.md', root), 'utf8');
const licenses = fs.readFileSync(new URL('docs/corpus/LICENSES.md', root), 'utf8');

const ALLOWED_LICENSES = new Set([
  'Public Domain / copy without restriction (tanach.us/License.html)', // UXLC, licence page read
  'Public Domain', // Sefaria label (Torat Emet 357)
  'CC0', // Sefaria label (Shaliehsaboo edition)
  'CC-BY', // Sefaria label (Metsudah 1981); the remaining records are listed in NOT_RESOURCED
]);

test('every registry record carries a licence value from the allowed set, and matches its snapshot item', () => {
  for (const e of registry) {
    assert.ok(ALLOWED_LICENSES.has(e.license), `${e.id}: licence "${e.license}"`);
    assert.equal(e.license, snapshot[e.snapshotId].license, `${e.id}: registry/snapshot licence disagree`);
  }
});

test('the CC-BY (Metsudah) records are exactly the documented remainder, and none of the planned ids is still Metsudah', () => {
  const ccby = registry.filter((e) => e.license === 'CC-BY').map((e) => e.id).sort();
  assert.deepEqual(ccby, Object.keys(NOT_RESOURCED).sort());
  for (const id of Object.keys(PLAN)) {
    const e = registry.find((x) => x.id === id);
    assert.ok(e, id);
    assert.notEqual(e.license, 'CC-BY', `${id}: still CC-BY`);
    assert.ok(!/Metsudah/.test(e.source), `${id}: source still names Metsudah`);
  }
  for (const e of registry) if (e.license === 'CC-BY') assert.ok(/Metsudah/.test(e.source), `${e.id}: CC-BY but not Metsudah`);
});

test('every re-sourced record has snapshot evidence: new raw lines, licence, URL, fetch date, and the Metsudah item in history', () => {
  for (const id of Object.keys(PLAN)) {
    const e = registry.find((x) => x.id === id);
    const it = snapshot[e.snapshotId];
    assert.ok(e.resourced && e.resourced.from === 'The Metsudah siddur, 1981', `${id}: resourced field`);
    assert.ok(it.resourced && it.history && it.history.length >= 1, `${id}: snapshot history`);
    assert.equal(it.history[0].versionTitle, 'The Metsudah siddur, 1981', `${id}: history[0] is the Metsudah item`);
    assert.ok(typeof it.history[0].metsudahHe === 'string' && it.history[0].metsudahHe.length > 0, `${id}: Metsudah text kept`);
    assert.ok(Array.isArray(it.history[0].rawLines) && it.history[0].rawLines.length > 0, `${id}: Metsudah raw lines kept`);
    assert.equal(it.versionTitle, PLAN[id].version, id);
    assert.equal(it.license, PLAN[id].license, id);
    assert.equal(it.ref, PLAN[id].ref, id);
    assert.deepEqual(it.lineIndexes, PLAN[id].lines, id);
    assert.ok(/^https:\/\/www\.sefaria\.org\/api\/v3\/texts\//.test(it.apiUrl), `${id}: apiUrl`);
    assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(it.fetchedAt), `${id}: fetchedAt`);
    assert.equal(e.retrieved, it.fetchedAt.slice(0, 10), id);
    assert.ok(/fetched on \d{4}-\d{2}-\d{2} from https:\/\//.test(e.verifiedAgainst), id);
    assert.equal(e.status, 'verified', id);
    assert.equal(e.proofread, false, id);
    assert.ok(/not independently verified/i.test(e.attribution), `${id}: attribution must say the label is unverified`);
    if (PLAN[id].splitAt) {
      assert.ok(it.splitFrom && it.splitFrom.raw, `${id}: splitFrom`);
      assert.equal(it.rawLines.map((l) => l.replace(/:$/, '').trim()).join(':'), it.splitFrom.raw.split(':').map((p) => p.trim()).filter(Boolean).join(':'), `${id}: split lines re-join to the source paragraph`);
    }
  }
});

test('re-sourced text replays from its raw lines, keeps the Metsudah consonants, and passes the quality gate', () => {
  for (const id of Object.keys(PLAN)) {
    const e = registry.find((x) => x.id === id);
    const it = snapshot[e.snapshotId];
    assert.equal(e.he, applyTransforms(it.rawLines, e.transforms || {}).join('\n'), `${id}: replay`);
    assert.equal(e.lines, e.he.split('\n').length, id);
    const skel = (s) => s.replace(/־/g, ' ').split(/\s+/).filter(Boolean).map(foldedSkeleton).join(' ');
    assert.equal(skel(e.he), skel(it.history[0].metsudahHe), `${id}: consonants differ from the Metsudah text`);
    assert.deepEqual(qualityIssues(e.he), [], id);
    assert.ok(!/[ֺ֒]/.test(it.rawLines.join('')), `${id}: raw lines carry the Metsudah fingerprint`);
    // the diff recorded in the registry agrees with a fresh diff
    const d = wordDiff(it.history[0].metsudahHe, e.he);
    assert.equal(e.resourced.wordsChanged, d.filter((x) => !x.punctuationOnly).length, id);
    assert.equal(e.resourced.punctuationChanged, d.filter((x) => x.punctuationOnly).length, id);
  }
});

test('docs: RESOURCE-METSUDAH.md and LICENSES.md list every re-sourced and every remaining record', () => {
  for (const id of [...Object.keys(PLAN), ...Object.keys(NOT_RESOURCED)]) {
    assert.ok(doc.includes('`' + id + '`'), `RESOURCE-METSUDAH.md lacks ${id}`);
    assert.ok(licenses.includes('`' + id + '`'), `LICENSES.md lacks ${id}`);
  }
  assert.ok(doc.includes('## 1. What the licence sources actually say'));
  assert.ok(doc.includes('character by character'));
  assert.ok(/all-rights-reserved|כל הזכויות שמורות/.test(licenses), 'LICENSES.md records the Torat Emet site footer');
  assert.ok(/RESOURCE-METSUDAH\.md/.test(licenses));
  // the Metsudah row in LICENSES.md must give the remaining count
  assert.ok(licenses.includes(`${Object.keys(NOT_RESOURCED).length} records`), 'LICENSES.md states the remaining Metsudah count');
});

test('helpers: qualityIssues flags undotted shin and vowel-less words; buildRawLines splits; pickVersion is exact', () => {
  assert.deepEqual(qualityIssues('שָׁלוֹם עָלֵינוּ׃'), []);
  assert.ok(qualityIssues('שֶהֶחֱזַרְתָּ').some((x) => x.startsWith('undotted-shin')));
  assert.ok(qualityIssues('שָׁלוֹם עלינו').some((x) => x.startsWith('no-vowel')));
  assert.ok(qualityIssues('שָׁל֥וֹם').some((x) => x.startsWith('hard:accent')));
  const b = buildRawLines(['a: b: c:'], { lines: [0], splitAt: ':' });
  assert.deepEqual(b.rawLines, ['a:', 'b:', 'c:']);
  assert.equal(b.splitFrom.raw, 'a: b: c:');
  assert.deepEqual(buildRawLines(['x', 'y', 'z'], { lines: [2, 0] }).rawLines, ['z', 'x']);
  const vs = [{ versionTitle: ' Shaliehsaboo Edition', license: 'CC0' }, { versionTitle: 'Shaliehsaboo Edition', license: 'unknown' }];
  assert.equal(pickVersion(vs, 'Shaliehsaboo Edition', 'CC0'), vs[0]);
  assert.equal(pickVersion(vs, 'Shaliehsaboo Edition', 'Public Domain'), null);
  const d = wordDiff('אָב׃ בֵּן', 'אָב בֵן׃');
  assert.equal(d.length, 2);
  assert.equal(d[0].punctuationOnly, true);
  assert.equal(d[1].punctuationOnly, false);
});
