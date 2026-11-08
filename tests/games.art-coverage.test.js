import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {GAME_ENV} from '../src/games/engine.js';
import {ARCADE_GAMES} from '../src/games/arcade.catalog.js';
import {createImageResolver} from '../src/img/resolve.js';
import {buildIndex} from '../tools/img/build_index.mjs';

test('every game backdrop survives an image-index rebuild and resolves to a shipped file', () => {
  const root = new URL('../', import.meta.url);
  const approvals = JSON.parse(readFileSync(new URL('data/images/approvals.json', root)));
  const R = createImageResolver({index: buildIndex(), approvals});
  for (const id of Object.values(GAME_ENV)) {
    const picture = R.resolve('id', id);
    assert.ok(picture, `${id} must remain indexed and approved`);
    assert.ok(existsSync(new URL(picture.src, root)), picture.src);
  }
  for (const game of ARCADE_GAMES) assert.ok(existsSync(new URL(`assets/games/arcade/${game.id}/env.png`, root)), game.id);
});
