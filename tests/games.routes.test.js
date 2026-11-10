// Router wiring for the games programme (docs/games/GAMES-START-HERE.md). Both stay preview.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchRoute, tierOf } from '../src/shell/router.js';
import { createSession } from '../src/games/engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const GAMES = [
  ['#/tugowar', 'tugowar', 'Antonym Tug-of-War', '../games/tugowar.view.js', '../src/games/tugowar.view.js', 'games.tugowar.v1'],
  ['#/vowelcatcher', 'vowelcatcher', 'Vowel Catcher', '../games/vowelcatcher.view.js', '../src/games/vowelcatcher.view.js', 'games.vowelcatcher.v1'],
];

test('both games are preview routes whose modules export mount', async () => {
  for (const [hash, name, title, modulePath, importPath, storeKey] of GAMES) {
    const m = matchRoute(hash);
    assert.equal(m.route?.name, name);
    assert.equal(m.route.pattern, hash.slice(1));
    assert.equal(m.route.module, modulePath);
    assert.equal(m.route.title, title);
    assert.equal(m.route.owner, 'games');
    assert.equal(tierOf(m.route), 'preview');
    const mod = await import(importPath);
    assert.equal(typeof mod.mount, 'function');
    assert.equal(mod.STORE_KEY, storeKey);
  }
});

test('games.css is linked after learn.css', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const learn = html.indexOf('href="assets/css/learn.css"');
  const games = html.indexOf('href="assets/css/games.css"');
  assert.ok(learn >= 0 && games > learn, 'games.css link must follow learn.css');
});

test('a finished game writes best score and play count under its store key', () => {
  const mem = new Map();
  const store = { get: (k) => mem.get(k), set: (k, v) => mem.set(k, v) };
  const session = createSession({ store, storeKey: 'games.tugowar.v1', par: 1 });
  session.answer(true);
  const rec = session.saveBest();
  assert.equal(rec.plays, 1);
  assert.ok(rec.best >= 10);
  assert.equal(mem.get('games.tugowar.v1').plays, 1);
  const again = createSession({ store, storeKey: 'games.tugowar.v1', par: 1 });
  again.saveBest();
  assert.equal(store.get('games.tugowar.v1').plays, 2);
});
