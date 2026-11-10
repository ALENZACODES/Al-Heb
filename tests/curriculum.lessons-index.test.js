import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lessonSummaries } from '../src/curriculum/lessons-index.js';
import { lessons } from '../src/curriculum/lessons.js';

const index = JSON.parse(readFileSync(new URL('../data/curriculum/lessons-index.json', import.meta.url), 'utf8'));

test('lessons-index.json is a slim projection of lessons.json (same ids, titles, tracks, teasers)', () => {
  assert.equal(index.lessons.length, lessons.length);
  assert.deepEqual(index.lessons.map((l) => l.id), lessons.map((l) => l.id));
  assert.equal(lessonSummaries.length, lessons.length);
  for (const [i, full] of lessons.entries()) {
    const s = index.lessons[i];
    assert.equal(s.id, full.id);
    assert.equal(s.title, full.title);
    assert.equal(s.track, full.track);
    assert.equal(s.level, full.level);
    assert.equal(s.estMinutes, full.estMinutes);
    assert.deepEqual(s.prerequisites || [], full.prerequisites || []);
    const teaser = full.words?.[0]?.he;
    if (teaser) assert.equal(s.teaser, teaser, s.id);
    assert.ok(!('words' in s) && !('exercises' in s) && !('goals' in s), s.id + ' must stay slim');
  }
  const bytes = readFileSync(new URL('../data/curriculum/lessons-index.json', import.meta.url)).byteLength;
  assert.ok(bytes < 80 * 1024, `lessons-index.json is ${bytes} bytes; keep it well under 80 KB`);
});
