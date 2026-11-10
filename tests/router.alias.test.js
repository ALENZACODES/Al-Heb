import test from 'node:test';
import assert from 'node:assert/strict';
import { matchRoute, canonicalPath, parseHash } from '../src/shell/router.js';

test('canonicalPath keeps ordinary addresses unchanged', () => {
  assert.equal(canonicalPath('/lab'), '/lab');
  assert.equal(canonicalPath('/lab/hunt'), '/lab/hunt');
  assert.equal(canonicalPath('/learn'), '/learn');
});

test('#/brainlab and #/brainlab/:game open the Brain Lab routes', () => {
  const hub = matchRoute('#/brainlab');
  assert.equal(hub.path, '/lab');
  assert.equal(hub.route?.name, 'lab');
  const drill = matchRoute('#/brainlab/hunt');
  assert.equal(drill.path, '/lab/hunt');
  assert.equal(drill.route?.name, 'labgame');
  assert.equal(drill.query.game, 'hunt');
  // The typed address is only rewritten when matching, so a bookmark of #/brainlab still works.
  assert.equal(parseHash('#/brainlab').path, '/brainlab');
});
