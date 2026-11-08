// Static and fake-DOM accessibility checks for the four builder-2 views (scheduler preview, known-word checker, syllabus, time budget),
// plus the scheduler view's behaviour. A real axe run and a 375x667 browser pass were NOT done (no browser here).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { N, tick, btn, memStore } from './torahread.fakedom.js';

const rd = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const LESSONS = JSON.parse(rd('data/curriculum/lessons.json')).lessons;
const VIEWS = [
  ['scheduler', 'src/fsrs/scheduler.view.js', () => ({}), 3],
  ['knownwords', 'src/knownwords/knownwords.view.js', () => ({ knownWordsData: { words: [{ he: 'בַּיִת', heUnpointed: 'בית', level: 'A1', frequencyRank: 1 }] } }), 5],
  ['syllabus', 'src/coursemap/syllabus.view.js', () => ({ lessonsData: LESSONS }), 0],
  ['timebudget', 'src/coursemap/timebudget.view.js', () => ({ lessonsData: LESSONS, store: memStore() }), 3],
];
for (const [name, file, ctxOf, minButtons] of VIEWS) {
  test(`${name}: source has no animation, no outline removal, no div-buttons, labelled section, status region, 44px buttons`, () => {
    const src = rd(file);
    assert.doesNotMatch(src, /transition|animation|@keyframes|scroll-behavior|outline\s*:\s*none/i);
    assert.doesNotMatch(src, /role:\s*'button'/);
    assert.match(src, /role: 'status', 'aria-live': 'polite'/); assert.match(src, /aria-labelledby/); assert.match(src, /tabindex: '-1'/);
    if (minButtons) assert.match(src, /min-height:44px;min-width:44px/);
  });
  test(`${name}: mounted page has one h1 labelling its section, one status region, named 44px buttons, labelled inputs/groups, Hebrew marked lang=he dir=rtl`, async () => {
    const V = await import('../' + file);
    const root = new N('main'); const un = V.mount(root, ctxOf()); await tick(60);
    const sec = root.queryAll('section')[0]; assert.ok(sec && sec.attrs['aria-labelledby']);
    const h1s = root.queryAll('h1'); assert.equal(h1s.length, 1); assert.equal(h1s[0].attrs.id, sec.attrs['aria-labelledby']);
    assert.equal(root.queryAll('[role="status"]').length, 1);
    const buttons = root.all((n) => n.tag === 'button'); assert.ok(buttons.length >= minButtons);
    for (const b of buttons) { assert.match(b.attrs.style || '', /min-height:44px/); assert.equal(b.attrs.type, 'button'); assert.ok(b.textContent.trim() || b.attrs['aria-label']); }
    for (const i of root.all((n) => n.tag === 'input' || n.tag === 'textarea')) assert.ok(root.queryAll('label').some((l) => l.attrs.for === i.attrs.id), 'field has a label');
    for (const g of root.queryAll('[role="group"]')) assert.ok(g.attrs['aria-label'] || g.attrs['aria-labelledby'], 'group is named');
    for (const t of root.queryAll('table')) { assert.ok(t.queryAll('caption').length === 1); assert.ok(t.queryAll('th').every((h) => h.attrs.scope)); }
    for (const p of root.queryAll('progress')) assert.ok(p.attrs['aria-label']);
    for (const b of buttons.filter((x) => x.attrs['aria-pressed'] !== undefined)) assert.match(b.attrs['aria-pressed'], /^(true|false)$/);
    const he = root.all((n) => /[֐-׿]/.test(n.children.filter((c) => c.nodeType === 3).map((c) => c.data).join('')));
    for (const n of he) assert.ok(n.attrs.lang === 'he' && n.attrs.dir === 'rtl', `Hebrew in <${n.tag}> not marked`);
    assert.match(root.textContent, /Preview|Draft/i);
    un();
  });
}
test('scheduler view: choices change the table, pressed state follows, the first-review line lists all four answers, nothing is stored', async () => {
  const V = await import('../src/fsrs/scheduler.view.js'); const store = memStore();
  const root = new N('main'), un = V.mount(root, { store }); await tick();
  const rows = () => root.queryAll('tbody').flatMap((t) => t.queryAll('tr'));
  assert.equal(rows().length, 8); assert.match(root.textContent, /Again: \d+ days?, Hard: \d+ days?, Good: \d+ days?, Easy: \d+ days?/);
  const good = rows()[1].queryAll('td')[1].textContent;
  await btn(root, /^Again$/).click();   // first button named Again is in the "first time" group
  assert.equal(btn(root, /^Again$/).attrs['aria-pressed'], 'true');
  const after = rows()[1].queryAll('td')[1].textContent; assert.notEqual(after, good);
  await btn(root, /^95%$/).click(); assert.equal(btn(root, /^95%$/).attrs['aria-pressed'], 'true');
  assert.deepEqual(store.m, {}); assert.match(root.textContent, /does NOT|nothing here changes them/i); un();
});
test('every new route is registered as preview with a nav string, in a section, and v0 stays at 20 routes', async () => {
  const { ROUTES } = await import('../src/shell/router.js'); const { SECTION_ROUTES } = await import('../src/shell/nav-model.js');
  const strings = rd('src/shell/nav.strings.js');
  for (const n of ['scheduler', 'known-words', 'syllabus', 'time-budget']) {
    const r = ROUTES.find((x) => x.name === n); assert.ok(r, n); assert.equal(r.tier, 'preview');
    assert.ok(Object.values(SECTION_ROUTES).some((l) => l.includes(n)), `${n} in a nav section`); assert.ok(strings.includes(`'nav.route.${n}'`));
    assert.ok(readFileSync(new URL('../src/shell/' + r.module, import.meta.url)), 'module exists');
  }
  assert.equal(ROUTES.filter((r) => r.tier === 'v0').length, 20);
});
