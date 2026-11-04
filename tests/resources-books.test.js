import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../data/curriculum/resource-concepts-books.json', import.meta.url), 'utf8'));
const cs = data.concepts;
const SOURCES = ['bpa', 'bpa-gap', 'njop', 'udemy', 'dummies'];
const inRange = (n) => Number.isInteger(n) && n >= 0 && n <= 1000;

test('ids are unique and well formed', () => {
  const ids = cs.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((i) => /^bk-[a-z]+-\d{2}$/.test(i)));
});

test('every concept has a known source, text fields and status proposed', () => {
  for (const c of cs) {
    assert.ok(SOURCES.includes(c.source), c.id);
    assert.ok(c.name && c.what, c.id);
    assert.equal(c.status, 'proposed', c.id);
  }
});

test('scores and axes are integers in 0-1000 and improved >= original', () => {
  for (const c of cs) {
    assert.ok(inRange(c.score) && inRange(c.improvedScore), c.id);
    assert.ok(c.improvedScore >= c.score, c.id);
    for (const k of ['r', 'i', 'c', 'f', 'risk']) assert.ok(inRange(c.axes[k]), `${c.id}.${k}`);
  }
});

test('concepts scoring 850+ carry a full improved spec rescored to 950+', () => {
  const high = cs.filter((c) => c.score >= 850);
  assert.ok(high.length >= 1);
  for (const c of high) {
    assert.ok(c.improvedName, c.id);
    for (const k of ['screen', 'data', 'interaction', 'test']) assert.ok(c.spec && c.spec[k] && c.spec[k].length > 40, `${c.id}.${k}`);
    assert.ok(c.improvedScore >= 950, c.id);
  }
});

test('any concept with a spec has an improved score above the original', () => {
  for (const c of cs.filter((x) => x.spec)) assert.ok(c.improvedScore > c.score, c.id);
});

test('quoted material is short: no field holds a quote over 12 words', () => {
  for (const c of cs) {
    const text = JSON.stringify(c);
    for (const m of text.matchAll(/\\"([^"\\]+)\\"/g)) assert.ok(m[1].split(/\s+/).length <= 12, `${c.id}: ${m[1]}`);
  }
});
