// v0 scope (docs/v0/SCOPE.md): every route has a tier, the docs list matches the code, the bar shows only v0 destinations, the More
// sheet keeps preview pages in one collapsed group, search labels them, and the preview banner appears only on preview routes.
// Fake-DOM checks only (tests/torahread.fakedom.js); the real browser check at 390 px is in tests/nav.browser.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { N } from './torahread.fakedom.js';
import { ROUTES, availableRoutes, tierOf as routerTier } from '../src/shell/router.js';
import { VIEW_FILES } from '../src/shell/views.generated.js';
import { en } from '../src/shell/i18n.js';
import { tabs, menuSections, previewGroups, searchablePages, tierOf, isStatic, SECTIONS, PREVIEW_HIDDEN } from '../src/shell/nav-model.js';
import { renderMenu } from '../src/shell/menu.js';
import { buildPageIndex, searchPages } from '../src/shell/search.js';
import { mountPreviewBanner, needsBanner, BANNER_SELECTOR } from '../src/shell/preview-banner.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALL = new Set(ROUTES.map((r) => r.name));
const BUILD = availableRoutes(VIEW_FILES);
const by = (n) => ROUTES.find((r) => r.name === n);
const t = (k, vars) => { let s = en[k] ?? k; if (vars) s = s.replace(/\{(\w+)\}/g, (m, kk) => (kk in vars ? String(vars[kk]) : m)); return s; };
const docList = () => [...readFileSync(join(root, 'docs/v0/SCOPE.md'), 'utf8').matchAll(/^- `([a-z0-9-]+)` \(\//gm)].map((m) => m[1]);

test('every route has a tier of v0 or preview, and the two helpers agree', () => {
  for (const r of ROUTES) { assert.ok(r.tier === 'v0' || r.tier === 'preview', `${r.name} tier=${r.tier}`); assert.equal(tierOf(r), r.tier); assert.equal(routerTier(r), r.tier); }
  assert.equal(tierOf(undefined), 'preview'); assert.equal(tierOf({ name: 'x', pattern: '/x' }), 'preview');
});
test('the v0 set in the code matches the list in docs/v0/SCOPE.md exactly', () => {
  const docs = docList().sort(), code = ROUTES.filter((r) => r.tier === 'v0').map((r) => r.name).sort();
  assert.ok(docs.length >= 10, 'SCOPE.md lists the v0 routes as "- `name` (/path)" lines');
  assert.deepEqual(code, docs);
  for (const n of docs) assert.ok(ALL.has(n), `docs list unknown route ${n}`);
  for (const n of ['welcome', 'firstday', 'learn', 'letters', 'atlas', 'progress', 'settings', 'about', 'credits', 'privacy', 'install', 'offline', 'search']) assert.ok(docs.includes(n), n);
});
test('every v0 route is usable in this build (not an optional route whose view file is missing)', () => {
  for (const r of ROUTES) if (r.tier === 'v0') assert.ok(BUILD.has(r.name), `${r.name} not available`);
});
test('the bar shows only v0 destinations, at most 5 controls, for every availability case', () => {
  for (const av of [ALL, BUILD]) {
    const list = tabs(ROUTES, av);
    assert.ok(list.length + 1 <= 5);
    for (const x of list) assert.equal(x.route.tier, 'v0', `${x.route.name} in the bar`);
    assert.deepEqual(list.map((x) => x.route.name), ['learn', 'progress']);
  }
});
test('More sheet model: open groups hold only v0 pages; every available static preview page is in the Preview group with a note per section', () => {
  for (const av of [ALL, BUILD]) {
    const open = menuSections(ROUTES, av).flatMap((g) => g.items);
    for (const r of open) assert.equal(r.tier, 'v0', `${r.name} in an open group`);
    const prev = previewGroups(ROUTES, av);
    for (const g of prev) { assert.ok(en[g.noteKey], g.noteKey); for (const r of g.items) assert.equal(r.tier, 'preview'); }
    const listed = new Set([...open, ...prev.flatMap((g) => g.items)].map((r) => r.name));
    for (const r of ROUTES) if (isStatic(r) && av.has(r.name) && r.name !== 'welcome' && !PREVIEW_HIDDEN.has(r.name)) assert.ok(listed.has(r.name), `${r.name} not in the sheet`);
    for (const n of PREVIEW_HIDDEN) assert.ok(!listed.has(n), `${n} is triaged hidden but still in the sheet`);
  }
  for (const s of SECTIONS) assert.ok(en['nav.preview.note.' + s.id], 'note for ' + s.id);
});
test('More sheet DOM (fake DOM): preview group is last, collapsed, labelled honestly; it opens only on a preview page', () => {
  const list = new N('ul');
  const n = renderMenu(list, { routes: ROUTES, available: ALL, current: 'learn' });
  const groups = list.children.filter((c) => c.nodeType === 1);
  assert.equal(groups.length, n);
  const pv = groups[groups.length - 1];
  assert.equal(pv.getAttribute('data-section'), 'preview');
  assert.equal(pv.getAttribute('data-tier'), 'preview');
  const details = pv.children[0];
  assert.equal(details.tag, 'details'); assert.equal(details.getAttribute('open'), null, 'collapsed on a v0 page');
  assert.ok(pv.querySelector('summary').textContent.includes('Preview (unreviewed, work in progress)'));
  // The one documented exception (docs/v0/SCOPE.md): the Accessibility page, a preview page, also has a quick row under Settings.
  for (const g of groups.slice(0, -1).filter((x) => x.getAttribute('data-quick') !== 'accessibility')) { assert.notEqual(g.getAttribute('data-section'), 'preview'); for (const a of g.queryAll('a')) assert.equal(by(a.getAttribute('href').slice(2) === '' ? 'home' : ROUTES.find((r) => '#' + r.pattern === a.getAttribute('href'))?.name)?.tier, 'v0'); }
  const links = pv.queryAll('a').map((a) => a.getAttribute('href'));
  assert.ok(!links.includes('#/calendar') && links.includes('#/read') && !links.includes('#/settings'));
  assert.ok(pv.queryAll('.menu-preview-note').length >= 4, 'one note per section');
  assert.ok(pv.queryAll('.menu-preview-note').every((p) => /Not reviewed yet/.test(p.textContent)));
  renderMenu(list, { routes: ROUTES, available: ALL, current: 'read' });
  const pv2 = list.children[list.children.length - 1];
  assert.equal(pv2.children[0].getAttribute('open'), '', 'open on a preview page');
  assert.equal(pv2.querySelector('a[href="#/read"]').getAttribute('aria-current'), 'page');
});
test('search still finds preview pages and labels them; v0 pages carry no label', () => {
  const idx = buildPageIndex(ROUTES, ALL, t, () => '', (id) => t('nav.section.' + id));
  assert.equal(idx.find((e) => e.name === 'calendar').tier, 'v0');
  assert.equal(idx.find((e) => e.name === 'read').tier, 'preview');
  assert.equal(idx.find((e) => e.name === 'progress').tier, 'v0');
  assert.ok(searchPages(idx, 'calendar').some((e) => e.name === 'calendar' && e.tier === 'v0'));
  assert.ok(searchablePages(ROUTES, ALL).some((r) => r.tier === 'preview'));
  assert.ok(en['search.preview']);
});
test('preview banner (fake DOM): appears on a preview route, not on a v0 route, never stacks, is cleared on a v0 route', () => {
  const main = new N('main');
  main.append(new N('h1'));
  assert.equal(needsBanner(by('learn')), false); assert.equal(needsBanner(by('calendar')), false); assert.equal(needsBanner(by('read')), true); assert.equal(needsBanner(null), false);
  assert.equal(mountPreviewBanner(main, by('learn')), null);
  assert.equal(main.queryAll(BANNER_SELECTOR).length, 0);
  const el = mountPreviewBanner(main, by('read'));
  assert.ok(el); assert.equal(main.children[0], el, 'banner is first in main');
  assert.equal(el.getAttribute('data-tier'), 'preview'); assert.equal(el.getAttribute('role'), 'note');
  assert.ok(el.textContent.startsWith('Preview: unreviewed, may change'));
  mountPreviewBanner(main, by('read'));
  assert.equal(main.queryAll(BANNER_SELECTOR).length, 1, 'no stacking');
  mountPreviewBanner(main, by('settings'));
  assert.equal(main.queryAll(BANNER_SELECTOR).length, 0, 'cleared on a v0 route');
});

test('lean v0: hidden preview pages are preview-tier, still searchable, and each is documented as "hide" in docs/v0/PREVIEW-TRIAGE.md', () => {
  const doc = readFileSync(new URL('../docs/v0/PREVIEW-TRIAGE.md', import.meta.url), 'utf8');
  const search = new Set(searchablePages(ROUTES, ALL).map((r) => r.name));
  assert.ok(PREVIEW_HIDDEN.size >= 5);
  for (const n of PREVIEW_HIDDEN) {
    const r = ROUTES.find((x) => x.name === n); assert.ok(r, `${n} is a route`);
    assert.equal(tierOf(r), 'preview', `${n} must be preview`);
    assert.ok(search.has(n), `${n} still searchable`);
    assert.match(doc, new RegExp('^\\| `' + n + '` \\| hide \\|', 'm'), `${n} documented as hide`);
  }
  // every preview route has exactly one decision row
  for (const r of ROUTES.filter((x) => tierOf(x) === 'preview' && isStatic(x))) assert.match(doc, new RegExp('^\\| `' + r.name + '` \\| (hide|merge|keep) \\|', 'm'), `${r.name} has no triage row`);
});
