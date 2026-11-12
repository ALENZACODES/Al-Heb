// M-08 (12 Nov audit): held recordings were invisible except as silence. About now has a Held Recordings section: what is held,
// why, and what plays instead, from data/audio/held-recordings.json (built from clip-holds.json and the manifests' chirpHeld rows).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildHeldList, heldListText, OUT } from '../tools/audio/build-held-list.mjs';
import { heldNodes, HELD_INSTEAD, NEWER_WHY, fillHeld } from '../src/shell/held-recordings.js';
import { HELD_DEVICE, HELD_NONE } from '../src/shell/audio-access.js';
import { HELD_PAGE } from '../src/books/book.view.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const list = JSON.parse(read(OUT));

test('M-08: the held list is exactly what clip-holds.json, the chirpHeld rows and the held book pages build today', () => {
  assert.equal(read(OUT), heldListText(buildHeldList()), 'run node tools/audio/build-held-list.mjs');
  const holds = JSON.parse(read('data/lab/clip-holds.json')).paths;
  assert.deepEqual(list.held.map((x) => x.path).sort(), [...holds].sort());
  const chirp = JSON.parse(read('data/audio/manifest.json')).filter((r) => r.chirpHeld).length
    + JSON.parse(read('data/audio/manifest-kind-word.json')).filter((r) => r.chirpHeld).length;
  assert.equal(list.counts.newerHeld, chirp);
  for (const x of list.held) { assert.ok(x.he, x.path + ' has its Hebrew'); assert.ok(x.en, x.path + ' has its English'); }
  assert.doesNotMatch(read(OUT), /י[֑-ׇ]*ה[֑-ׇ]*ו[֑-ׇ]*ה/, 'no divine name in the list');
  assert.doesNotMatch(read(OUT).replace(/"note": "[^"]*"/, ''), /chirp|wavenet|google|speech-to-text/i, 'no engine names in learner text');
});

function fakeH(tag, attrs = {}, ...kids) {
  const el = { tag, attrs, kids: kids.flat().filter((k) => k != null && k !== false) };
  el.text = () => el.kids.map((k) => (typeof k === 'string' ? k : k.text())).join('');
  return el;
}
test('M-08: the section says what is held, why, and what plays instead, in the players\' own words', () => {
  const text = heldNodes(fakeH, list).map((n) => n.text()).join('\n');
  assert.match(text, new RegExp(`Held for review: ${list.held.length} recordings`));
  assert.match(text, /failed at least 2 of 3 independent checks/);
  assert.ok(HELD_INSTEAD.includes(HELD_DEVICE) && HELD_INSTEAD.includes(HELD_NONE));
  assert.ok(text.includes(HELD_INSTEAD));
  assert.ok(text.includes(NEWER_WHY));
  assert.ok(text.includes(HELD_PAGE), 'the book line is the reader\'s own');
  assert.match(text, /The Story of Moses: pages 8, 9, 11 and 12\./);
  assert.match(text, /Syllables \(\d+\)/);
});

test('M-08: About shows the section, loading until the list arrives; a failed load says so', async () => {
  const about = read('src/shell/about.view.js');
  assert.match(about, /h\('h2', \{ id: 'held-h' \}, 'Held Recordings'\)/);
  assert.match(about, /import\('\.\/held-recordings\.js'\)/, 'the code loads on demand');
  const sec = { kids: [], firstChild: null, querySelector: () => ({ heading: true }), replaceChildren(...k) { this.kids = k; } };
  await fillHeld(sec, fakeH, { fetchFn: async () => ({ ok: true, json: async () => list }) });
  assert.ok(sec.kids[0].heading);
  assert.match(sec.kids.slice(1).map((n) => n.text()).join(' '), /Held for review/);
  await fillHeld(sec, fakeH, { fetchFn: async () => ({ ok: false, status: 503 }) });
  assert.match(sec.kids[1].text(), /did not load/);
});

test('M-08: the section code and list are on demand, not in the first install', () => {
  const pm = read('precache-manifest.js');
  const [installed, onDemand] = pm.split('self.ALEF_ON_DEMAND');
  for (const f of ['src/shell/held-recordings.js', 'data/audio/held-recordings.json']) {
    assert.ok(!installed.includes(`"${f}"`), f + ' is not installed');
    assert.ok(onDemand.includes(`"${f}"`), f + ' is listed on demand');
    assert.match(read('tools/build-precache.mjs'), new RegExp(f.replace(/[./]/g, '\\$&')));
  }
});
