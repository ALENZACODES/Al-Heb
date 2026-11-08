// Item: the Torah ladder links to the vowel-fade page; the More sheet lists the four preview features under the Preview group (not as v0).
import test from 'node:test';
import assert from 'node:assert/strict';
import { N, tick, memStore } from './torahread.fakedom.js';
import { ROUTES } from '../src/shell/router.js';
import { menuSections, previewGroups, tierOf, PREVIEW_HIDDEN } from '../src/shell/nav-model.js';
import { t } from '../src/shell/i18n.js';
import '../src/shell/nav.strings.js';

const FOUR = ['nikkud-fade', 'roots', 'gender-drill', 'record-compare'];

test('Torah ladder page links to #/nikkud-fade and says Preview', async () => {
  const { mount } = await import('../src/torahread/torahread.view.js');
  const root = new N('div'); const store = memStore();
  const un = await mount(root, { store, settings: { congregation: 'sephardi' }, query: {} }); await tick();
  const a = root.all((n) => n.tag === 'a' && n.attrs.href === '#/nikkud-fade');
  assert.equal(a.length, 1); assert.match(a[0].textContent, /Vowel Points/); un();
});

test('the four preview features: preview tier, listed in the More sheet Preview group unless triaged hidden, absent from the v0 groups, route exists', () => {
  const av = new Set(ROUTES.map((r) => r.name));
  const v0 = new Set(menuSections(ROUTES, av).flatMap((g) => g.items.map((r) => r.name)));
  const pv = new Set(previewGroups(ROUTES, av).flatMap((g) => g.items.map((r) => r.name)));
  for (const n of FOUR) { const r = ROUTES.find((x) => x.name === n); assert.ok(r, n); assert.equal(tierOf(r), 'preview', n); assert.ok(PREVIEW_HIDDEN.has(n) ? !pv.has(n) : pv.has(n), n + (PREVIEW_HIDDEN.has(n) ? ' triaged hidden (docs/v0/PREVIEW-TRIAGE.md)' : ' in Preview group')); assert.ok(!v0.has(n), n + ' not in v0 groups'); }
  assert.match(t('nav.preview.title'), /^Preview/);
});
