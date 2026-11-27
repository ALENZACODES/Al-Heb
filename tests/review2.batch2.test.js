import test from 'node:test';
import assert from 'node:assert/strict';
import './torahread.fakedom.js';
import { nextInCatalog } from '../src/games/engine.js';
import { mazeLayout, correctMirrorStep } from '../src/games/lasermaze.view.js';
import { allGames } from '../src/games/library.catalog.js';
import { showcaseNode, FLAGSHIPS } from '../src/shell/showcase.js';
import { matchRoute } from '../src/shell/router.js';

test('every game in the library hands on to another game, same level first', () => {
  const games = allGames();
  for (const g of games) { const n = nextInCatalog(games, g.id); assert.ok(n && n.id !== g.id, g.id); }
  const a = games.find((g) => games.filter((x) => x.level === g.level).length > 1);
  assert.equal(nextInCatalog(games, a.id).level, a.level);
  assert.equal(nextInCatalog(games, 'no-such-game'), null);
});

test('the mirror maze gives every letter its own place', () => {
  for (const n of [3, 4, 5]) {
    const cells = mazeLayout(n);
    assert.equal(cells.length, n);
    assert.equal(new Set(cells.map((c) => `${c.col},${c.row}`)).size, n);
  }
  assert.equal(correctMirrorStep(['ש', 'ל', 'ם'], 0, { i: 0, letter: 'ש' }), true);
});

test('Home names one place to start and shows Prayer Practice and the Dictionary', () => {
  const root = showcaseNode({ hasRoute: () => true, routeName: 'home' });
  assert.match(root.querySelector('.show-start-here').textContent, /Start here/);
  const hrefs = root.queryAll('a.show-flagship').map((n) => n.attrs.href);
  assert.deepEqual(hrefs, FLAGSHIPS.map((f) => f[1]));
  assert.deepEqual(hrefs, ['#/prayer-practice', '#/vocab']);
  for (const hash of hrefs) assert.ok(matchRoute(hash)?.route, hash);
});
