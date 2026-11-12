import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {GAME_ENV} from '../src/games/engine.js';
import {ARCADE_GAMES} from '../src/games/arcade.catalog.js';
import { TG_GAMES, TG_IDS } from '../src/games/tg-catalog.js';
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
  // The Torah and Hebrew games (tg-*) have no backdrop yet: each catalogue entry carries its scene brief (art) for the owner to make; the card falls back to its coin.
  for (const game of ARCADE_GAMES) if (!TG_IDS.includes(game.id)) assert.ok(existsSync(new URL(`assets/games/arcade/${game.id}/env.png`, root)), game.id);
  for (const id of TG_IDS) assert.ok(TG_GAMES.find((g) => g.id === id).art, `${id} has a scene brief`);
});
