import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadCorpus, createCorpus } from '../src/corpus/corpus.js';

const c = await loadCorpus();
const root = new URL('../', import.meta.url);

test('getText / aliases / lists', () => {
  assert.equal(c.getText('bless-priestly-2').ref, 'Numbers 6:25');
  assert.equal(c.getText('kaddish-1').language, 'aramaic');
  assert.ok(c.textsByLevel('intro-1').some((t) => t.id === 'bless-priestly-1'));
  assert.ok(c.textsByCategory('siddur').length >= 12);
  assert.equal(c.textIds().length, c.registry.entries.length);
});

test('search: Latin finds texts and phrases; Hebrew search ignores points and final forms', () => {
  assert.ok(c.search('priestly').some((r) => r.id === 'bless-priestly-1'));
  assert.ok(c.search('sababa').some((r) => r.type === 'phrase'));
  const he = c.search('שלום');
  assert.ok(he.some((r) => r.type === 'text' && r.id === 'bless-priestly-3'));
  assert.ok(he.some((r) => r.type === 'phrase'));
  assert.deepEqual(c.search(''), []);
  assert.ok(c.search('שָׁלוֹם').length === he.length, 'pointed query == unpointed query');
});

test('bySituation / byRegister / situations', () => {
  assert.ok(c.situations().includes('cafe'));
  assert.ok(c.bySituation('cafe').every((p) => p.situation === 'cafe') && c.bySituation('cafe').length > 10);
  assert.deepEqual(c.bySituation('nope'), []);
  assert.ok(c.byRegister('slang').length >= 10);
});

test('createCorpus works on plain objects (no I/O)', () => {
  const x = createCorpus({ entries: [{ id: 'a', he: 'שָׁלוֹם', ref: 'r', title: 't', english: 'peace', aliases: ['b'] }] }, { entries: [] });
  assert.equal(x.getText('b').id, 'a');
  assert.equal(x.letterInventory('שָׁלוֹם').letterCount, 4);
});

test('LICENSES.md mentions every record id and flags unverified items', () => {
  const md = fs.readFileSync(new URL('docs/corpus/LICENSES.md', root), 'utf8');
  for (const id of c.textIds()) assert.ok(md.includes('`' + id + '`'), id);
  assert.ok(/UNVERIFIED/.test(md));
  assert.ok(/tanach\.us/i.test(md) && /JPS 1917/.test(md) && /Metsudah/.test(md));
  assert.ok(/not legal advice/i.test(md));
});

test('read.view.js exports mount and clusters (module parses; DOM behaviour is covered by tools/corpus-smoke if run)', async () => {
  const src = fs.readFileSync(new URL('src/corpus/read.view.js', root), 'utf8');
  assert.ok(/export async function mount\(root, ctx/.test(src));
  assert.ok(/ctx\.audio/.test(src) && /transliterate\.js/.test(src) && /congregation/.test(src));
  // importing in Node must not throw (no DOM access at module load)
  const m = await import('../src/corpus/read.view.js');
  assert.equal(typeof m.mount, 'function');
  const cl = m.clusters('שָׁלוֹם');
  assert.deepEqual(cl.map((x) => x.id), ['shin', 'lamed', 'vav', 'mem-final']);
});
