// Rule pages (#/rules, #/rules/:rule). Rule-generated, unverified.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { newRoot, all, tick, loaded, waitFor } from './pronunciation.dom-helper.js';
import { mount } from '../src/pronunciation/rules.view.js';
import { buildPages, rulesJson, RULES, EXAMPLES } from '../tools/pronunciation/build_pages.mjs';
import { RUNTIME_DIR } from '../tools/pronunciation/build_runtime.mjs';

const rules = JSON.parse(fs.readFileSync(join(RUNTIME_DIR, 'rules.json'), 'utf8'));
const text = (n) => n.textContent;
const page = async (rule) => { const root = newRoot(); mount(root, { compareData: { rules }, params: rule ? { rule } : {} }); await loaded(root); return root; };

test('rules.json: current with the builder; seven rules; six examples each; unverified labels', () => {
  assert.equal(fs.readFileSync(join(RUNTIME_DIR, 'rules.json'), 'utf8'), rulesJson(buildPages().rules), 'stale: run node tools/pronunciation/build_pages.mjs');
  assert.deepEqual(rules.pages.map((p) => p.id), ['kamatz', 'tav', 'holam', 'het', 'ayin', 'resh', 'stress']);
  assert.equal(rules.proofread, false); assert.match(rules.status, /not verified by a native speaker/);
  for (const p of rules.pages) {
    assert.equal(p.examples.length, EXAMPLES, p.id);
    assert.match(p.who, /Rule-generated/); assert.ok(p.summary && p.limits && p.sources.length >= 2 && p.sources.every((s) => s.url.startsWith('https://')));
    assert.equal(p.rows.length, 3);
    for (const e of p.examples) { assert.equal(e.ipa.length, 3); assert.ok(e.he && e.gloss); }
    assert.equal(new Set(p.examples.map((e) => e.he)).size, EXAMPLES);
  }
  assert.ok(fs.statSync(join(RUNTIME_DIR, 'rules.json')).size < 150000);
});

test('examples really show the rule: Ashkenazi differs for kamatz/tav/holam, Sephardi for het/ayin/resh', () => {
  const by = Object.fromEntries(rules.pages.map((p) => [p.id, p]));
  const strip = (s) => s.replace(/[ˈ.]/g, '');
  for (const e of by.kamatz.examples) assert.ok(e.ipa[2].includes('ɔ') && e.ipa[0].includes('a'), e.he);
  for (const e of by.tav.examples) assert.ok(e.ipa[2].includes('s'), e.he);
  for (const e of by.holam.examples) assert.ok(e.ipa[2].includes('oj'), e.he);
  for (const e of by.het.examples) assert.ok(e.ipa[1].includes('ħ'), e.he);
  for (const e of by.ayin.examples) assert.ok(e.ipa[1].includes('ʕ'), e.he);
  for (const e of by.resh.examples) assert.ok(e.ipa[0].includes('ʁ') && e.ipa[1].includes('r'), e.he);
  for (const e of by.stress.examples) assert.ok(e.ipa[0].split('.').findIndex((s) => s.includes('ˈ')) !== e.ipa[2].split('.').findIndex((s) => s.includes('ˈ')), e.he);
  assert.equal(RULES.length, 7);
  assert.ok(strip(by.tav.examples[0].ipa[0]) !== strip(by.tav.examples[0].ipa[2]));
});

test('index page links to all seven rule pages and to Compare', async () => {
  const root = await page();
  const links = all(root, (x) => x.tagName === 'A').map((a) => a.getAttribute('href'));
  for (const id of ['kamatz', 'tav', 'holam', 'het', 'ayin', 'resh', 'stress']) assert.ok(links.includes(`#/rules/${id}`), id);
  assert.ok(links.includes('#/compare')); assert.match(text(root), /each tradition says/);
});

test('a rule page shows the summary, a three-row table, "Who says it this way", limits, six example rows, sources and prev/next links', async () => {
  const root = await page('tav');
  assert.match(text(root), /Tav without a dot/); assert.match(text(root), /shabos/);
  assert.match(text(root), /Who says it this way\? Rule-generated/); assert.match(text(root), /Limits\./);
  const tables = all(root, (x) => x.tagName === 'TABLE');
  assert.equal(tables.length, 2);
  assert.equal(all(tables[0], (x) => x.tagName === 'TR').length, 4);
  assert.equal(all(tables[1], (x) => x.tagName === 'TR').length, 7); // header + 6 examples
  assert.ok(all(root, (x) => x.tagName === 'TH').every((th) => th.getAttribute('scope')));
  const links = all(root, (x) => x.tagName === 'A').map((a) => a.getAttribute('href'));
  assert.ok(links.includes('#/rules/kamatz') && links.includes('#/rules/holam') && links.includes('#/rules'));
  assert.ok(links.some((l) => l.includes('wikipedia.org')));
  assert.ok(all(root, (x) => x.tagName === 'STRONG').length >= 6);
});

test('every rule page renders; an unknown rule falls back to the index with a message; bad data shows a calm message', async () => {
  for (const p of rules.pages) { const root = await page(p.id); assert.match(text(root), new RegExp(p.title.split(' ')[0])); assert.equal(all(root, (x) => x.tagName === 'TR').length, 11, p.id); }
  const root = await page('nope'); assert.match(text(root), /no rule page called "nope"/); assert.ok(all(root, (x) => x.tagName === 'A').length >= 7);
  const r2 = newRoot(); const orig = globalThis.fetch; globalThis.fetch = async () => ({ ok: false, status: 500 });
  try { mount(r2, {}); await waitFor(() => /could not be loaded/.test(text(r2)), { message: 'no load-failure message' }); assert.match(text(r2), /could not be loaded/); } finally { globalThis.fetch = orig; }
});
