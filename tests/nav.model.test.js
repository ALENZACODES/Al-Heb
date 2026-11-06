import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTES, availableRoutes } from '../src/shell/router.js';
import { VIEW_FILES } from '../src/shell/views.generated.js';
import { en, he } from '../src/shell/i18n.js';
import { NAV_EN } from '../src/shell/nav.strings.js';
import { SECTIONS, SECTION_ROUTES, PARENT, isStatic, labelKey, menuSections, previewGroups, tabs, currentState, searchablePages, tierOf, PREVIEW_HIDDEN } from '../src/shell/nav-model.js';
import { buildPageIndex, searchPages, searchLetters, searchWords, norm, loadLetters } from '../src/shell/search.js';
import { loadTier } from '../src/vocab/loader.js';

const ALL = new Set(ROUTES.map((r) => r.name));
const BUILD = availableRoutes(VIEW_FILES);
const t = (k) => en[k] ?? k;

test('there are exactly five sections with the agreed ids', () => {
  assert.deepEqual(SECTIONS.map((s) => s.id), ['learn', 'read', 'speak', 'progress', 'more']);
});
test('every route is in exactly one section, and no section names an unknown route', () => {
  const seen = new Map();
  for (const [sec, names] of Object.entries(SECTION_ROUTES)) for (const n of names) { assert.ok(!seen.has(n), `${n} is in both ${seen.get(n)} and ${sec}`); seen.set(n, sec); }
  for (const r of ROUTES) assert.ok(seen.has(r.name), `route ${r.name} has no section`);
  for (const n of seen.keys()) assert.ok(ALL.has(n), `section lists unknown route ${n}`);
  assert.equal(seen.size, ROUTES.length);
});
test('the bar has at most 5 controls (section tabs + More), for every availability case; only sections with a v0 page get a tab', () => {
  for (const av of [ALL, BUILD, new Set(['home'])]) assert.ok(tabs(ROUTES, av).length + 1 <= 5);
  const v0Sections = new Set(ROUTES.filter((r) => tierOf(r) === 'v0').map((r) => SECTIONS.find((s) => SECTION_ROUTES[s.id].includes(r.name)).id));
  assert.deepEqual(tabs(ROUTES, ALL).map((x) => x.section.id), SECTIONS.filter((s) => s.id !== 'more' && v0Sections.has(s.id)).map((s) => s.id));
  assert.deepEqual(tabs(ROUTES, ALL).map((x) => x.section.id), ['learn', 'progress']);
});
test('no route is unreachable: static routes are in the menu or search; parameterised routes have a reachable static parent', () => {
  for (const av of [ALL, BUILD]) {
    const menu = new Set([...menuSections(ROUTES, av), ...previewGroups(ROUTES, av)].flatMap((g) => g.items.map((r) => r.name)));
    const search = new Set(searchablePages(ROUTES, av).map((r) => r.name));
    for (const r of ROUTES) {
      if (!av.has(r.name)) continue;
      if (isStatic(r)) { assert.ok(search.has(r.name), `${r.name} not searchable`); assert.ok(menu.has(r.name) || r.name === 'welcome' || r.name === 'firstwin' || PREVIEW_HIDDEN.has(r.name), `${r.name} not in the menu`); }
      else { const p = PARENT[r.name]; assert.ok(p, `${r.name} has no parent`); assert.ok(isStatic(ROUTES.find((x) => x.name === p))); assert.ok(!av.has(p) || (search.has(p) && menu.has(p)), `${r.name} parent ${p} unreachable`); }
    }
  }
});
test('hidden or optional routes appear only when available', () => {
  const none = new Set(['home', 'learn', 'typing']);
  const names = menuSections(ROUTES, none).flatMap((g) => g.items.map((r) => r.name));
  assert.deepEqual(names.sort(), ['home', 'learn']);
  assert.deepEqual(previewGroups(ROUTES, none).flatMap((g) => g.items.map((r) => r.name)), ['typing']);
  assert.deepEqual(previewGroups(ROUTES, new Set(['home'])), []);
});
test('labels exist in i18n (English) for every route, section, and the More/Search controls', () => {
  for (const r of ROUTES.filter(isStatic)) assert.ok(en[labelKey(r)], `missing label ${labelKey(r)} for ${r.name}`);
  for (const s of SECTIONS) { assert.ok(en[s.labelKey], s.labelKey); assert.ok(en[s.descKey], s.descKey); if (s.heKey) assert.ok(he[s.heKey], 'existing Hebrew label ' + s.heKey); }
  for (const k of Object.keys(NAV_EN)) assert.ok(en[k]);
  assert.ok(en['nav.more'] && en['nav.search']);
});
test('current-page state: tab target is page, elsewhere in section is true, More pages mark More, home none', () => {
  const list = tabs(ROUTES, ALL);
  assert.deepEqual(currentState('learn', list), { tab: 'learn', level: 'page', more: false });
  assert.equal(currentState('letter', list).level, 'true');
  assert.equal(currentState('letter', list).tab, 'learn');
  assert.deepEqual(currentState('settings', list), { tab: null, level: null, more: true });
  assert.deepEqual(currentState('loanwords', list, 'preview'), { tab: null, level: null, more: true }, 'a preview page marks More');
  assert.deepEqual(currentState('read', list, 'preview'), { tab: null, level: null, more: true }, 'a preview page in a section without a tab marks More');
  assert.equal(currentState('home', list).tab, null);
  assert.equal(currentState('progress', list).tab, 'progress');
});
test('search: pages by title and nav label, letters by name and Hebrew, words by gloss and Hebrew', async () => {
  const idx = buildPageIndex(ROUTES, ALL, t, (k) => he[k] || '', (id) => t('nav.section.' + id));
  assert.ok(searchPages(idx, 'progress').some((e) => e.name === 'progress'));
  assert.ok(searchPages(idx, 'privacy').some((e) => e.name === 'privacy'));
  assert.ok(searchPages(idx, 'torah').some((e) => e.name === 'torahread'));
  assert.equal(searchPages(idx, 'xqzvw').length, 0);
  const letters = await loadLetters();
  assert.equal(searchLetters(letters, 'bet')[0].id, 'bet');
  assert.equal(searchLetters(letters, 'א')[0].id, 'alef');
  assert.ok(searchLetters(letters, 'ם').some((l) => l.id === 'mem-final'));
  const words = await loadTier(500);
  assert.ok(searchWords(words, 'אני').some((e) => e.lemma === 'אני'));
  assert.ok(searchWords(words, 'I').some((e) => e.lemma === 'אני'));
  assert.equal(norm('אֲנִי'), norm('אני'));
});
