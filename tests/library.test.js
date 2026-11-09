import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkArticles, checkLibrary, flesch, STOCK_PHRASES } from '../tools/content/check-articles.mjs';
import { articleLinks } from '../src/curriculum/calendar.day.js';
import { ROUTES } from '../src/shell/router.js';

const lib = JSON.parse(readFileSync('data/library/articles.json', 'utf8'));

test('every Library article passes all ten content checks', () => {
  const report = checkArticles(lib);
  assert.equal(report.length, lib.articles.length);
  for (const r of report) {
    assert.equal(r.checks.length, 10, r.id);
    const bad = r.checks.filter((c) => !c.ok).map((c) => `${c.name}: ${c.detail}`);
    assert.deepEqual(bad, [], r.id);
  }
  assert.deepEqual(checkLibrary(lib), []);
});

test('the gate catches what it is meant to catch', () => {
  const base = structuredClone(lib.articles[0]);
  const run = (a) => checkArticles({ articles: [a] }, { corpus: 'The LORD bless thee and keep thee the LORD make his face shine upon thee', appText: '' })[0].checks.filter((c) => !c.ok).map((c) => c.name);
  assert.ok(run({ ...base, references: base.references.slice(0, 1) }).includes('references'), 'one source is not enough');
  assert.ok(run({ ...base, sections: [{ ...base.sections[0], refs: [] }, ...base.sections.slice(1)] }).includes('every section cited'));
  const padded = structuredClone(base); padded.sections[0].paras[0] += ' Let us delve into this rich tapestry.';
  assert.ok(run(padded).includes('no stock phrasing'));
  const copied = structuredClone(base); copied.sections[0].paras[0] += ' The LORD bless thee and keep thee the LORD make his face shine upon thee.';
  assert.ok(run(copied).includes('original against app texts'));
  const quoted = structuredClone(base); quoted.sections[0].paras[0] += ' "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen"';
  assert.ok(run(quoted).includes('quotation limits'));
  const dashed = structuredClone(base); dashed.sections[0].paras[0] += ' It is old — very old.';
  assert.ok(run(dashed).includes('human rhythm'));
  const hedged = structuredClone(base); hedged.sections[0].paras[0] += ' Some say it began earlier.';
  assert.ok(run(hedged).includes('plain English'));
  const flat = structuredClone(base); flat.terms = [{ he: 'שבת', tr: 'Shabbat', en: 'Sabbath' }];
  assert.ok(run(flat).includes('Hebrew terms'), 'Hebrew needs vowel marks');
  assert.ok(flesch('The cat sat. It was warm.') > 80 && STOCK_PHRASES.includes('delve'));
});

test('articles link to screens that exist and to calendar days that exist', () => {
  const routes = new Set(ROUTES.map((r) => r.pattern.split('/')[1]));
  const days = JSON.parse(readFileSync('data/calendar/days.json', 'utf8')).days;
  for (const a of lib.articles) {
    assert.ok(routes.has(a.tryIt.href.replace(/^#\//, '').split(/[/?]/)[0]), `${a.id}: ${a.tryIt.href}`);
    for (const d of a.dayIds) assert.ok(days[d], `${a.id}: day ${d}`);
  }
});

test('calendar day pages offer the matching article when the Library is in the build', () => {
  const articles = new Map([['pesach', [{ id: 'passover-seder', title: 'Pesach and the Seder' }]]]);
  assert.deepEqual(articleLinks('pesach', 'pesach', { hasRoute: (n) => n === 'libraryarticle', articles }), [{ href: '#/library/passover-seder', label: 'Read: Pesach and the Seder', kind: 'article' }]);
  assert.deepEqual(articleLinks('pesach', 'pesach', { hasRoute: () => false, articles }), []);
});
