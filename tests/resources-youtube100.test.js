import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../data/curriculum/resource-concepts-youtube100.json', import.meta.url), 'utf8'));
const cs = data.concepts;
const inRange = (n) => Number.isInteger(n) && n >= 0 && n <= 1000;
const docDir = new URL('../docs/youtube/', import.meta.url);

test('ids unique and well formed; 15 techniques and 10 errors', () => {
  const ids = cs.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of cs) assert.match(c.id, /^y100-(tech|err|gap)-\d{2}$/);
  assert.equal(cs.filter((c) => c.source === 'y100-tech').length, 15);
  assert.equal(cs.filter((c) => c.source === 'y100-err').length, 10);
  assert.ok(cs.filter((c) => c.source === 'y100-gap').length >= 5);
});

test('every source is declared with licence text and matches the id prefix', () => {
  for (const c of cs) {
    assert.ok(c.id.startsWith(c.source + '-'), c.id);
    const s = data.sources[c.source];
    assert.ok(s && typeof s.licence === 'string' && s.licence.length > 5, c.source);
  }
});

test('text fields, status and evidence present', () => {
  for (const c of cs) {
    assert.ok(c.name && c.what && c.what.length > 40, c.id);
    assert.equal(c.status, 'proposed', c.id);
    assert.ok(typeof c.evidence === 'string' && c.evidence.length > 3, c.id);
  }
});

test('scores and axes are integers in 0-1000, improved >= original', () => {
  for (const c of cs) {
    assert.ok(inRange(c.score) && inRange(c.improvedScore), c.id);
    assert.ok(c.improvedScore >= c.score, c.id);
    for (const k of ['r', 'i', 'c', 'f', 'risk']) assert.ok(inRange(c.axes[k]), `${c.id}.${k}`);
  }
});

test('concepts scoring 850+ carry a full improved spec rescored to 950+', () => {
  const high = cs.filter((c) => c.score >= 850);
  assert.ok(high.length >= 5);
  for (const c of high) {
    assert.ok(c.improvedName, c.id);
    for (const k of ['screen', 'data', 'interaction', 'test']) assert.ok(c.spec && c.spec[k] && c.spec[k].length > 40, `${c.id}.${k}`);
    assert.ok(c.improvedScore >= 950, c.id);
  }
});

test('a spec exists exactly when the concept was improved', () => {
  for (const c of cs) {
    if (c.spec) assert.ok(c.improvedScore > c.score && c.improvedName, c.id);
    else {
      assert.equal(c.improvedScore, c.score, c.id);
      assert.equal(c.improvedName, null, c.id);
    }
  }
});

test('no field holds a quote over 12 words or a long Hebrew run', () => {
  for (const c of cs) {
    const text = JSON.stringify(c);
    for (const m of text.matchAll(/\\"([^"\\]+)\\"/g)) assert.ok(m[1].split(/\s+/).length <= 12, `${c.id}: ${m[1]}`);
    assert.ok(!/[֐-׿]{3,}/.test(text), c.id);
  }
});

test('the note admits the caption limits', () => {
  assert.match(data.note, /judgement/);
  assert.match(data.note, /No video was watched/);
});

test('top100.md lists 100 videos with a status each and coverage that adds up', () => {
  const md = readFileSync(new URL('top100.md', docDir), 'utf8');
  const rows = md.split('\n').filter((l) => /^\| \d+ \| /.test(l));
  assert.equal(rows.length, 100);
  const statuses = ['read', 'fetched, not read', 'unusable', 'no captions', 'blocked'];
  const counts = Object.fromEntries(statuses.map((s) => [s, 0]));
  for (const r of rows) {
    const cells = r.split(' | ');
    const last = cells[cells.length - 1].replace(/ \|$/, '').replace(/ \((manual|auto)\)$/, '');
    assert.ok(statuses.includes(last), r);
    counts[last]++;
    assert.match(r, /https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}/);
  }
  for (const s of statuses) assert.match(md, new RegExp(`\\| ${s} \\| ${counts[s]} \\|`), s);
});

test('docs carry no long quotations and say plainly that no video was watched', () => {
  for (const f of readdirSync(docDir)) {
    const md = readFileSync(new URL(f, docDir), 'utf8');
    for (const line of md.split('\n')) {
      const parts = line.split('"');
      if (parts.length % 2 === 0) continue; // unbalanced quotes: apostrophe-like use, skip
      for (let i = 1; i < parts.length; i += 2) assert.ok(parts[i].split(/\s+/).length <= 12, `${f}: ${parts[i]}`);
    }
    if (f !== 'top100.md') assert.ok(!/[֐-׿]{3,}/.test(md), `${f} has a long Hebrew run`); // top100.md holds video titles as published
  }
  assert.match(readFileSync(new URL('top100.md', docDir), 'utf8'), /did not watch any video/);
});
