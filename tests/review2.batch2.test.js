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

test('a prayer marked "Follow It" on the Fluency Ladder counts as followed in the service ring', async () => {
  const { serviceRing, serviceTotals } = await import('../src/lib/counts.js');
  const orders = JSON.parse((await import('node:fs')).readFileSync(new URL('../data/service/orders.json', import.meta.url), 'utf8')).orders;
  const [oid, o] = Object.entries(orders).find(([id]) => serviceTotals(id));
  const first = o.items[0].id;
  const before = serviceRing(oid, { ladder: {} }, null, {}, o.items.map((x) => x.id));
  const after = serviceRing(oid, { ladder: { [first]: { hear: '2026-11-27', follow: '2026-11-27' } } }, null, {}, o.items.map((x) => x.id));
  assert.equal(before.prayers.have, 0);
  assert.equal(after.prayers.have, 1);
});

test('dictionary search: shalom, sholom, chalom and shalum all find the same word', async () => {
  const { matchBand, BAND, soundKey } = await import('../src/vocab/rank.js');
  const entry = { gloss: 'peace; hello; goodbye', translit: 'sholom', he: 'שלום' };
  for (const q of ['sholom']) assert.equal(matchBand(entry, q, 'sholom'), BAND.translit);
  for (const q of ['shalom', 'chalom', 'shalum']) assert.equal(matchBand(entry, q, 'sholom'), BAND.soundsLike, q);
  assert.notEqual(soundKey('shalom'), soundKey('shlom'));
});
