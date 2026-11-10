// Practical conversation units: not a 126th lesson, only existing Hebrew, wired behind #/practical.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ROUTES } from '../src/shell/router.js';
import { SECTION_ROUTES, PARENT, labelKey } from '../src/shell/nav-model.js';
import { en } from '../src/shell/i18n.js';
import { lessonHref } from '../src/curriculum/practical.view.js';

const root = new URL('../', import.meta.url);
const J = (p) => JSON.parse(fs.readFileSync(new URL(p, root), 'utf8'));
const unitsDoc = J('data/curriculum/practical-units.json');
const lessons = J('data/curriculum/lessons.json');
const phrasebook = new Map(J('data/corpus/phrasebook.json').entries.map((e) => [e.id, e]));

test('the course still has exactly 125 lessons; practical units are not lessons', () => {
  assert.equal(lessons.lessons.length, 125);
  const ids = new Set(lessons.lessons.map((l) => l.id));
  for (const u of unitsDoc.units) assert.equal(ids.has(u.id), false, u.id);
});

test('every built unit is marked for native review and copies phrasebook Hebrew byte for byte', () => {
  assert.ok(unitsDoc.units.length >= 6);
  for (const u of unitsDoc.units) {
    assert.equal(u.nativeReview, true, u.id);
    assert.equal(u.proofread ?? false, false, u.id);
    assert.equal(u.status, 'built-draft', u.id);
    assert.ok((u.grammarNote || '').length > 40, u.id);
    assert.ok((u.srsQueue || []).length >= 12, u.id);
    assert.ok((u.listenDrills || []).length >= 1, u.id);
    assert.ok((u.speakDrills || []).length >= 1, u.id);
    for (const it of u.items) {
      const src = phrasebook.get(it.id);
      assert.ok(src, `${u.id} item ${it.id} is not in the phrasebook`);
      assert.equal(it.he, src.he, it.id);
      assert.equal(it.en, src.en, it.id);
      assert.equal(it.translit, src.translit, it.id);
    }
    for (const q of u.srsQueue) assert.ok(u.items.some((it) => it.id === q.id), q.id);
    for (const d of u.speakDrills) {
      assert.ok(fs.existsSync(new URL(`data/speak/sets/${d.set}.json`, root)), d.set);
    }
  }
});

test('shopping, transport, small talk and restaurant units are built from existing situations', () => {
  const by = Object.fromEntries(unitsDoc.units.map((u) => [u.id, u]));
  assert.equal(by['pu-shop'].phrasebookSituation, 'shop');
  assert.equal(by['pu-transport'].phrasebookSituation, 'taxi');
  assert.equal(by['pu-small-talk'].phrasebookSituation, 'small-talk');
  assert.equal(by['pu-restaurant'].phrasebookSituation, 'cafe');
  assert.match(by['pu-restaurant'].note, /no separate restaurant phrasebook/i);
  assert.ok(by['pu-restaurant'].lessons.some((l) => l.id === 'I-38'));
});

test('Practical is a learn-section route and does not change the 125-lesson graph', () => {
  const list = ROUTES.find((r) => r.name === 'practical');
  const one = ROUTES.find((r) => r.name === 'practicalunit');
  assert.ok(list && one);
  assert.equal(list.pattern, '/practical');
  assert.equal(one.pattern, '/practical/:id');
  assert.ok(SECTION_ROUTES.learn.includes('practical') && SECTION_ROUTES.learn.includes('practicalunit'));
  assert.equal(PARENT.practicalunit, 'practical');
  assert.ok(en[labelKey(list)]);
  assert.equal(lessonHref('I-13'), '#/intermediate/I-13');
  assert.equal(lessonHref('il08'), '#/learn?lesson=il08');
});
