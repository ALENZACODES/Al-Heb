// Practical curriculum: not a 126th lesson; only existing Hebrew; pages under #/practical.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ROUTES } from '../src/shell/router.js';
import { SECTION_ROUTES, PARENT, labelKey } from '../src/shell/nav-model.js';
import { en } from '../src/shell/i18n.js';
import { lessonHref, pageHref } from '../src/curriculum/practical.view.js';

const root = new URL('../', import.meta.url);
const J = (p) => JSON.parse(fs.readFileSync(new URL(p, root), 'utf8'));
const index = J('data/curriculum/practical/index.json');
const lessons = J('data/curriculum/lessons.json');
const phrasebook = new Map(J('data/corpus/phrasebook.json').entries.map((e) => [e.id, e]));
const lessonWord = new Map();
for (const l of lessons.lessons) {
  const stem = l.id.startsWith('I-') ? `i-${l.id.slice(2)}` : l.id;
  (l.words || []).forEach((w, i) => lessonWord.set(`${stem}-w${i + 1}`, w));
}
const dialogueLine = new Map();
for (const d of J('data/curriculum/dialogues.json').dialogues) {
  for (const line of d.lines || []) dialogueLine.set(line.id, line);
}
const units = index.units.map((row) => J(row.file));

test('the course still has exactly 125 lessons; practical units are not lessons', () => {
  assert.equal(lessons.lessons.length, 125);
  const ids = new Set(lessons.lessons.map((l) => l.id));
  for (const u of units) assert.equal(ids.has(u.id), false, u.id);
});

test('the built curriculum has at least 100 sourced pages, each flagged for native review', () => {
  assert.ok(index.totals.pages >= 100, index.totals);
  assert.ok(index.totals.pages <= 200, index.totals);
  assert.equal(index.proofread, false);
  assert.equal(index.nativeReview, 'required');
  let pages = 0;
  for (const u of units) {
    assert.equal(u.nativeReview, true, u.id);
    assert.equal(u.proofread, false, u.id);
    assert.equal(u.status, 'built-draft', u.id);
    assert.ok((u.pages || []).length >= 1, u.id);
    pages += u.pages.length;
    for (const p of u.pages) {
      assert.ok((p.items || []).length >= 1, p.id);
      assert.ok((p.grammarNote || '').length > 20, p.id);
      assert.ok((p.srsQueue || []).length === p.items.length, p.id);
      assert.ok(fs.existsSync(new URL(`data/speak/sets/${p.speakSet}.json`, root)), p.speakSet);
    }
  }
  assert.equal(pages, index.totals.pages);
});

test('every item copies phrasebook, lesson or dialogue Hebrew byte for byte', () => {
  const held = /יְהוָה|יהוה|הַשֵּׁם|אֲדֹנָי|אֱלֹהִים|גּוֹי/;
  for (const u of units) {
    for (const it of u.items) {
      assert.equal(held.test(it.he), false, `${u.id} ${it.id} held form`);
      if (it.source === 'data/corpus/phrasebook.json') {
        const src = phrasebook.get(it.id);
        assert.ok(src, it.id);
        assert.equal(it.he, src.he, it.id);
        assert.equal(it.en, src.en, it.id);
      } else if (it.source.startsWith('data/curriculum/lessons.json')) {
        const src = lessonWord.get(it.id);
        assert.ok(src, it.id);
        assert.equal(it.he, src.he, it.id);
        assert.equal(it.en, src.en, it.id);
      } else if (it.source.startsWith('data/curriculum/dialogues.json')) {
        const src = dialogueLine.get(it.id);
        assert.ok(src, it.id);
        assert.equal(it.he, src.he, it.id);
        assert.equal(it.en, src.en, it.id);
      } else {
        assert.fail(`unexpected source ${it.source} on ${it.id}`);
      }
    }
  }
});

test('family, home, work, health, numbers, time, weather, emergencies and Shabbat units are built', () => {
  const ids = new Set(units.map((u) => u.id));
  for (const id of ['pu-family', 'pu-home', 'pu-work', 'pu-health', 'pu-numbers', 'pu-time', 'pu-weather', 'pu-emergencies', 'pu-shabbat', 'pu-holidays', 'pu-bank', 'pu-phone', 'pu-introducing', 'pu-apartment', 'pu-plans', 'pu-opinions', 'pu-driving', 'pu-hiking', 'pu-beach', 'pu-social', 'pu-news', 'pu-verbs-now', 'pu-past', 'pu-decide']) {
    assert.ok(ids.has(id), id);
  }
  const restaurant = units.find((u) => u.id === 'pu-restaurant');
  assert.match(restaurant.note || restaurant.grammarNote, /no separate restaurant phrasebook/i);
});

test('Practical list, unit and page routes exist and do not change the 125-lesson graph', () => {
  const list = ROUTES.find((r) => r.name === 'practical');
  const unit = ROUTES.find((r) => r.name === 'practicalunit');
  const page = ROUTES.find((r) => r.name === 'practicalpage');
  assert.ok(list && unit && page);
  assert.equal(list.pattern, '/practical');
  assert.equal(unit.pattern, '/practical/:id');
  assert.equal(page.pattern, '/practical/:id/:page');
  assert.ok(SECTION_ROUTES.learn.includes('practicalpage'));
  assert.equal(PARENT.practicalpage, 'practical');
  assert.ok(en[labelKey(list)]);
  assert.equal(lessonHref('I-14'), '#/intermediate/I-14');
  assert.equal(lessonHref('il14'), '#/learn?lesson=il14');
  assert.equal(pageHref('pu-family', 'pu-family-p01'), '#/practical/pu-family/pu-family-p01');
});
