// The arcade writes the shared score ledger, and a round left part way through still counts as played (25 Nov 2026 audit:
// the Library said "Not played yet" for 27 of 30 played games). #/arcade opens the games page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { matchRoute } from '../src/shell/router.js';

test('arcade finish and leave both record the play', () => {
  const s = readFileSync(new URL('../src/games/arcade.js', import.meta.url), 'utf8');
  assert.match(s, /recordScore\(ctx\?\.store, spec\.id, score, out\.stars\)/);
  assert.match(s, /destroy\(\) \{[\s\S]{0,600}plays: \(record\.plays \|\| 0\) \+ 1/);
});

test('#/arcade is the games page', () => { assert.equal(matchRoute('#/arcade').route?.name, 'games'); });
