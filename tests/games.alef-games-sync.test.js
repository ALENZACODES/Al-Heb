import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { gameFiles, PATTERNS } from '../tools/games/sync-alef-games.mjs';

test('alef-games sync: every Hanukkah and Torah/Hebrew game file is picked up, and nothing outside those folders', () => {
  const files = gameFiles();
  const tracked = execFileSync('git', ['ls-files', 'src/games/hanukkah-*', 'src/games/tg-*', 'data/games/hanukkah/*', 'data/games/tg/*', 'tests/games.hanukkah.test.js', 'tests/games.tg.test.js'], { encoding: 'utf8' }).split('\n').filter(Boolean).sort();
  assert.deepEqual(files, tracked);
  assert.ok(files.some((f) => f.endsWith('hanukkah-dreidel1.view.js')) && files.some((f) => f.endsWith('tg-parashah.view.js')));
  for (const bad of ['src/app.js', 'src/games/arcade.js', 'data/games/firstwords.json', '../x/hanukkah-a.js']) assert.ok(!PATTERNS.some((p) => p.test(bad)), bad);
});
