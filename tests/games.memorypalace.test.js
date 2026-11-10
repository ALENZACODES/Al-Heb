import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createImageResolver } from '../src/img/resolve.js';
import { buildStations, recallStation } from '../src/games/memorypalace.view.js';
const json = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
test('every courtyard station resolves to its real approved index id; pool reaches 30', () => {
  const R = createImageResolver({ index: json('data/img/index.json'), approvals: json('data/images/approvals.json') });
  const stations = buildStations(json('data/letters/letters.json'), R);
  assert.ok(stations.length >= 30, `station pool: ${stations.length}`);
  assert.equal(new Set(stations.map(s => s.id)).size, stations.length);
  for (const s of stations) assert.equal(R.resolve('id', s.id)?.src, s.image.src);
  assert.equal(recallStation(stations, 0, stations[0].id), true);
  assert.equal(recallStation(stations, 0, stations[1].id), false);
  assert.equal(recallStation(stations, stations.length, stations[0].id), false);
  assert.deepEqual(buildStations(json('data/letters/letters.json'), null), []);
});
