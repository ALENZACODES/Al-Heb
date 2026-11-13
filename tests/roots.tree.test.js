// Word Families Explorer: a family as a tree, browsing by first letter, and the Family tree mode of the Roots page (fake DOM).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { N, tick, btn, memStore } from './torahread.fakedom.js';
import * as T from '../src/roots/tree.js';
import { BINYAN_ORDER } from '../src/roots/model.js';

const rd = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const FAM = rd('data/roots/families.json'), VERBS = rd('data/roots/verbs.json');
const data = { families: FAM, verbs: VERBS };

test('a tree holds every word of its family once, verbs split by pattern in the taught order, nothing added', () => {
  for (const f of FAM.families) {
    const t = T.familyTree(f);
    assert.equal(t.root, f.root); assert.equal(t.size, f.size);
    assert.deepEqual(t.branches.flatMap((b) => b.words.map((w) => w.id)).sort(), f.words.map((w) => w.id).sort(), f.root);
    assert.equal(new Set(t.branches.map((b) => b.key)).size, t.branches.length, `${f.root}: branch keys repeat`);
    for (const b of t.branches) {
      assert.ok(b.words.length >= 1 && b.label);
      for (const w of b.words) { assert.equal(w.pos, b.pos); if (b.pos === 'verb') assert.equal(w.binyan || null, b.binyan); }
      for (let i = 1; i < b.words.length; i++) assert.ok((b.words[i - 1].rank ?? 99999) <= (b.words[i].rank ?? 99999), `${f.root} ${b.key}: most common first`);
    }
    const verbs = t.branches.filter((b) => b.pos === 'verb' && b.binyan).map((b) => BINYAN_ORDER.indexOf(b.binyan)).filter((i) => i >= 0);
    assert.deepEqual(verbs, [...verbs].sort((a, b) => a - b), `${f.root}: pattern order`);
    if (t.branches.some((b) => b.pos === 'verb')) assert.equal(t.branches[0].pos, 'verb', `${f.root}: verbs first`);
    assert.match(T.treeSummary(t), new RegExp(`^${f.size} words in ${t.branches.length} branch(es)?: `));
  }
});

test('browsing: 22 letters, the counts add up to every family, neighbours step through one letter in order', () => {
  const idx = T.letterIndex(FAM.families);
  assert.equal(idx.length, 22); assert.equal(idx.map((x) => x.letter).join(''), 'אבגדהוזחטיכלמנסעפצקרשת');
  assert.equal(idx.reduce((n, x) => n + x.count, 0), FAM.families.length);
  for (const { letter, count } of idx) {
    const list = T.familiesByLetter(FAM.families, letter);
    assert.equal(list.length, count);
    for (const f of list) assert.equal(T.firstLetter(f.root), letter);
    list.forEach((f, i) => { const n = T.neighbours(FAM.families, f.root); assert.equal(n.index, i); assert.equal(n.of, count); assert.equal(n.prev, list[i - 1] || null); assert.equal(n.next, list[i + 1] || null); });
  }
});

test('a word card shows only what the data holds', () => {
  const f = FAM.families.find((x) => x.words.some((w) => w.pos === 'verb' && w.binyan && w.forms)), v = f.words.find((w) => w.pos === 'verb' && w.binyan && w.forms);
  const c = T.wordCard(v);
  assert.equal(c.he, v.he); assert.equal(c.hasForms, true);
  assert.equal(c.lines[0], `Sounds like: ${v.translit}`); assert.equal(c.lines[1], `Meaning: ${v.en}`); assert.match(c.lines[2], /^Kind of word: verb, .+ pattern/);
  const n = FAM.families.flatMap((x) => x.words).find((w) => w.pos === 'noun');
  assert.equal(T.wordCard(n).hasForms, false); assert.equal(T.wordCard(n).lines[2], 'Kind of word: noun');
  assert.match(T.wordCard(n, true).lines.at(-1), /^A loose match/);
  for (const w of FAM.families.flatMap((x) => x.words)) assert.doesNotMatch(T.wordCard(w).lines.join(' '), /undefined|null/);
});

test('view: Family tree mode browses by letter, opens a tree, a tapped word shows its meaning, and steps to the next family', async () => {
  const V = await import('../src/roots/roots.view.js');
  const root = new N('div');
  const f = FAM.families.find((x) => x.size >= 6 && x.words.some((w) => w.pos === 'verb' && w.forms));
  const un = V.mount(root, { store: memStore(), rootsData: data, query: { mode: 'tree', letters: f.root } }); await tick();
  assert.equal(btn(root, /^Family tree$/).attrs['aria-pressed'], 'true');
  assert.equal(root.queryAll('.rt-letters button').length, 22);
  assert.equal(root.queryAll('.rt-letters button').find((b) => b.attrs['aria-pressed'] === 'true').textContent, T.firstLetter(f.root));
  assert.match(root.textContent, /Family Tree for the Letters/);
  assert.match(root.textContent, /not yet confirmed|Loose|Confirmed/i, 'the family badge is shown');
  const tree = T.familyTree(f);
  assert.equal(root.queryAll('[data-branch]').length, tree.branches.length);
  assert.equal(root.queryAll('[data-word]').length, f.size);
  assert.equal(root.queryAll('.rt-card').length, 0);
  const w = tree.branches[0].words[0];
  const node = root.queryAll(`[data-word="${w.id}"] button`)[0];
  assert.equal(node.attrs['aria-expanded'], 'false');
  await node.click(); await tick();
  assert.equal(root.queryAll('.rt-card').length, 1);
  assert.ok(root.queryAll('.rt-card')[0].textContent.includes(`Meaning: ${w.en}`));
  assert.equal(root.queryAll(`[data-word="${w.id}"] button`)[0].attrs['aria-expanded'], 'true');
  const near = T.neighbours(FAM.families, f.root);
  if (near.next) { await btn(root, /^Next: /).click(); await tick(); assert.equal(root.queryAll('[data-word]').length, near.next.size); assert.equal(root.queryAll('.rt-card').length, 0); }
  await btn(root, /Same family as a plain list/).click(); await tick();
  assert.equal(btn(root, /^Word families$/).attrs['aria-pressed'], 'true');
  assert.match(root.textContent, /Words Listed Under the Letters/);
  await btn(root, /See this family as a tree/).click(); await tick();
  assert.match(root.textContent, /Family Tree for the Letters/);
  assert.doesNotMatch(root.textContent, /comes from the root|Same root|shares the root|undefined/i);
  un();
});

test('view: a letter with no families is disabled, and unknown letters say there is no tree', async () => {
  const V = await import('../src/roots/roots.view.js');
  const root = new N('div');
  const un = V.mount(root, { store: memStore(), rootsData: data, query: { mode: 'tree', letters: 'ץ־ץ־ץ' } }); await tick();
  assert.match(root.textContent, /so there is no tree to show/);
  for (const x of T.letterIndex(FAM.families)) if (!x.count) assert.ok(root.queryAll('.rt-letters button').find((b) => b.textContent === x.letter).attrs.disabled !== undefined);
  un();
});
