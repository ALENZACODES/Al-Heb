import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
// C-03 (12 Nov site check): the host illustration in Six Tries and Parashah Path used the tile-overlay class and covered the board,
// hiding the Exodus button. Hosts and lanes sit in the flow; the overlay class is only for a picture inside its own tile.
test('game hosts and lanes never use the absolute tile-overlay picture class', () => {
  const files = readdirSync(new URL('../src/games/', import.meta.url)).filter((f) => f.endsWith('.js'));
  for (const f of files) {
    const s = read('src/games/' + f);
    for (const m of s.matchAll(/class: '([^']*(?:arc-host|g1-lane)[^']*)'[^\n]*?A\.cast\([^)]*'arc-sprite-inline'\)/g)) assert.fail(`${f}: ${m[0].slice(0, 120)}`);
  }
  assert.doesNotMatch(read('src/games/tg-ui.js'), /arc-sprite-inline/);
  assert.doesNotMatch(read('src/games/g1-ui.js'), /arc-sprite-inline/);
  assert.match(read('assets/css/arcade.css'), /\.arc-host \.arc-sprite-inline, \.g1-lane \.arc-sprite-inline \{ position: static;/);
});
