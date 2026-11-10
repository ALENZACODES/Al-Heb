import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const load = (f) => JSON.parse(readFileSync(new URL(`../data/curriculum/${f}`, import.meta.url), 'utf8'));
const files = {
  yt: { data: load('resource-concepts-yt.json'), idRe: /^yt-[a-z]+-\d{2}$/ },
  gratis: { data: load('resource-concepts-gratis.json'), idRe: /^gr-[a-z0-9]+-\d{2}$/ },
};
const inRange = (n) => Number.isInteger(n) && n >= 0 && n <= 1000;

for (const [name, { data, idRe }] of Object.entries(files)) {
  const cs = data.concepts;

  test(`${name}: ids unique and well formed`, () => {
    const ids = cs.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const c of cs) {
      assert.match(c.id, idRe, c.id);
    }
  });

  test(`${name}: every concept source is declared with licence text`, () => {
    for (const c of cs) {
      const s = data.sources[c.source];
      assert.ok(s, `${c.id} undeclared source ${c.source}`);
      assert.ok(typeof s.licence === 'string' && s.licence.length > 5, c.source);
    }
  });

  test(`${name}: text fields, status and evidence present`, () => {
    for (const c of cs) {
      assert.ok(c.name && c.what && c.what.length > 40, c.id);
      assert.equal(c.status, 'proposed', c.id);
      assert.ok(typeof c.evidence === 'string' && c.evidence.length > 3, c.id);
    }
  });

  test(`${name}: scores and axes are integers in 0-1000, improved >= original`, () => {
    for (const c of cs) {
      assert.ok(inRange(c.score) && inRange(c.improvedScore), c.id);
      assert.ok(c.improvedScore >= c.score, c.id);
      for (const k of ['r', 'i', 'c', 'f', 'risk']) assert.ok(inRange(c.axes[k]), `${c.id}.${k}`);
    }
  });

  test(`${name}: concepts scoring 850+ carry a full improved spec rescored to 950+`, () => {
    const high = cs.filter((c) => c.score >= 850);
    assert.ok(high.length >= 1);
    for (const c of high) {
      assert.ok(c.improvedName, c.id);
      for (const k of ['screen', 'data', 'interaction', 'test']) assert.ok(c.spec && c.spec[k] && c.spec[k].length > 40, `${c.id}.${k}`);
      assert.ok(c.improvedScore >= 950, c.id);
    }
  });

  test(`${name}: any concept with a spec improves its score, and none without one does`, () => {
    for (const c of cs) {
      if (c.spec) assert.ok(c.improvedScore > c.score, c.id);
      else {
        assert.equal(c.improvedScore, c.score, c.id);
        assert.equal(c.improvedName, null, c.id);
      }
    }
  });

  test(`${name}: quoted material is short, no field holds a quote over 12 words`, () => {
    for (const c of cs) {
      const text = JSON.stringify(c);
      for (const m of text.matchAll(/\\"([^"\\]+)\\"/g)) assert.ok(m[1].split(/\s+/).length <= 12, `${c.id}: ${m[1]}`);
    }
  });

  test(`${name}: no field carries a long Hebrew run (no copied vocabulary)`, () => {
    for (const c of cs) {
      const text = JSON.stringify(c);
      assert.ok(!/[֐-׿]{3,}/.test(text), c.id);
    }
  });
}

test('yt: source records list the captions actually read and the gaps', () => {
  const { sources } = files.yt.data;
  for (const k of ['yt-alphabet', 'yt-vowels', 'yt-handwriting']) {
    const s = sources[k];
    assert.ok(Number.isInteger(s.videos) && Number.isInteger(s.captionsRead), k);
    assert.ok(s.captionsRead <= s.videos, k);
    assert.ok(Array.isArray(s.captionsMissing), k);
  }
  assert.equal(sources['yt-alphabet'].captionsRead, 7);
});

test('gratis: unreachable sources are flagged and carry no concepts', () => {
  const { sources, concepts } = files.gratis.data;
  for (const [k, s] of Object.entries(sources)) {
    assert.equal(typeof s.reached, 'boolean', k);
    assert.ok(Array.isArray(s.pagesRead), k);
    if (s.reached === false && s.pagesRead.length === 0) assert.ok(!concepts.some((c) => c.source === k), k);
  }
  assert.equal(sources.ben.reached, false);
});

test('gratis: only a source marked openly licensed may be described as open', () => {
  const { sources } = files.gratis.data;
  const open = Object.entries(sources).filter(([, s]) => s.openlyLicensed === true).map(([k]) => k);
  assert.deepEqual(open, ['wikibooks']);
});

test('gratis: required sources and task C references are covered', () => {
  const have = new Set(files.gratis.data.concepts.map((c) => c.source));
  for (const k of ['tmh', 'learn101', 'storyolive', 'alh', 'fsi', 'dli', 'goethe', 'loecsen', 'laits', 'wikibooks', 'top625', 'jewishmiami']) assert.ok(have.has(k), k);
});

test('matrix doc exists and mentions every source', () => {
  const p = new URL('../docs/resources/gratis-reuse-matrix.md', import.meta.url);
  assert.ok(existsSync(p));
  const md = readFileSync(p, 'utf8');
  for (const k of Object.keys(files.gratis.data.sources)) assert.ok(md.includes(files.gratis.data.sources[k].name), k);
  assert.match(md, /ShareAlike|share-alike/i);
});
