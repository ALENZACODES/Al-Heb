// I9 helpful 404: suggestions come from the route table only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROUTES } from '../src/shell/router.js';
import { suggestRoutes, lev, ALIASES } from '../src/platform/suggest.js';

const first = (p) => suggestRoutes(p, ROUTES)[0]?.href;
test('close spellings, longer forms and common words find the page', () => {
  assert.equal(lev('kitten', 'sitting'), 3);
  assert.equal(first('/vocabulary'), '#/vocab');
  assert.equal(first('/leters'), '#/letters');
  assert.equal(first('/settngs'), '#/settings');
  assert.equal(first('/lessons'), '#/learn');
  assert.equal(first('/prayers'), '#/service');
  assert.equal(first('/book'), '#/books');
  assert.equal(first('/games/nope'), '#/games');
  assert.deepEqual(suggestRoutes('/xyzzy', ROUTES), [], 'nothing close: no invented suggestion');
  assert.deepEqual(suggestRoutes('/', ROUTES), []);
  for (const name of Object.values(ALIASES)) assert.ok(ROUTES.some((r) => r.name === name), `alias target ${name} is a route`);
});
test('every suggestion is a real route without a parameter, at most three, and unavailable routes are skipped', () => {
  for (const p of ['/torah', '/progres', '/serach', '/abut', '/sheduler']) {
    const s = suggestRoutes(p, ROUTES);
    assert.ok(s.length >= 1 && s.length <= 3, p);
    for (const x of s) { assert.ok(ROUTES.some((r) => '#' + r.pattern === x.href), x.href); assert.doesNotMatch(x.href, /:/); }
  }
  assert.deepEqual(suggestRoutes('/vocabulary', ROUTES, { available: new Set(['home']) }), []);
});
test('the not-found page shows the suggestions and a Search link', () => {
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /import\('\.\/platform\/suggest\.js'\)/);
  assert.match(app, /Did you mean:/);
  assert.match(app, /href: '#\/search' \}, t\('search\.title'\)/);
});
