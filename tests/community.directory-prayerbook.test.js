// Prayer, calendar and community: N9 (one searchable synagogue directory, ready for a United States file) and N4 (My Prayer Book).
// Logic and wiring in a fake DOM. The only congregation data in the repo is Canada's; the United States rows used here are made up
// inside this file to prove the join works and are never written to data/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { environment, memStore, wait, json } from './gb.env.js';
import * as D from '../src/synagogues/directory.js';
import { parseCsv, columnMap, regionCode, convert, slug, REGIONS, OUT_FILE } from '../tools/synagogues/import-directory.mjs';
import * as B from '../src/service/prayerbook.model.js';
import { loadServiceData } from '../src/service/model.js';
import { loadCorpus } from '../src/corpus/corpus.js';
import { SERVICE_KEYS } from '../src/lib/counts.js';
import { withStage } from '../src/service/practice.model.js';
import { matchRoute } from '../src/shell/router.js';
import { ROUTE_SECTION } from '../src/shell/nav-model.js';

const canada = json('data/synagogues/canada.json');
const csv = 'Congregation,City,State,Street Address,Zip,Website,Phone\n"Temple Example, The",Springfield,Illinois,"1 Main St, Springfield, IL",62701,example.org,555-0100\nBeth Sample,Portland,OR,,,,\nBeth Sample,Portland,OR,,,,\nNo City Shul,,NY,,,,\nBad State,Town,ZZ,,,,\n';
const usFile = () => convert(parseCsv(csv), { country: 'US', takenIds: new Set(canada.congregations.map((c) => c.id)), updated: '2026-11-12' });

test('N9: the sources list names Canada only, every listed file exists, and no United States file is in the repo', () => {
  const src = json(D.SOURCES_FILE);
  assert.deepEqual(D.normaliseSources(src).files, [{ country: 'CA', file: 'data/synagogues/canada.json' }]);
  for (const f of src.files) assert.ok(existsSync(new URL('../' + f.file, import.meta.url)), f.file);
  assert.ok(!existsSync(new URL('../' + OUT_FILE.US, import.meta.url)), 'no US data has been supplied yet');
  // a broken or hostile list falls back to Canada alone
  assert.deepEqual(D.normaliseSources({ files: [{ country: 'XX', file: 'data/synagogues/x.json' }, { country: 'US', file: '../../etc/passwd' }] }), { files: [{ country: 'CA', file: 'data/synagogues/canada.json' }] });
  assert.deepEqual(D.normaliseSources(null).files.length, 1);
});

test('N9: the Canada file is a valid country file and merges to the same 27 congregations, untouched', () => {
  assert.deepEqual(D.validateDirectory(canada, 'CA'), []);
  const dir = D.mergeDirectories([{ country: 'CA', data: canada }]);
  assert.equal(dir.congregations.length, 27); assert.deepEqual(dir.problems, []);
  assert.equal(D.directoryTitle(dir), 'Reform Synagogues in Canada');
  for (const c of dir.congregations) { const o = canada.congregations.find((x) => x.id === c.id); assert.deepEqual({ ...c, country: undefined }, { ...o, country: undefined }); assert.equal(c.country, 'CA'); }
});

test('N9: search matches name, city, province code or name, and postal code; every word must match; accents are folded', () => {
  const dir = D.mergeDirectories([{ country: 'CA', data: canada }]);
  const ids = (q, o = {}) => D.searchDirectory(dir, { q, ...o }).map((c) => c.id);
  assert.equal(ids('').length, 27);
  assert.ok(ids('vancouver').includes('temple-sholom-vancouver'));
  assert.deepEqual(ids('van'), ids('vancouver'), 'the start of a word is enough');
  assert.deepEqual(ids('Temple Sholom Vancouver'), ['temple-sholom-vancouver']);
  assert.deepEqual(ids('sholom zzz'), []);
  const qc = ids('quebec'); assert.ok(qc.length >= 1 && qc.every((id) => canada.congregations.find((c) => c.id === id).province === 'QC'));
  assert.deepEqual(ids('montreal'), ids('Montréal'));
  assert.deepEqual(ids('V6P'), ['temple-sholom-vancouver']);
  assert.equal(ids('', { region: 'ON' }).length, canada.congregations.filter((c) => c.province === 'ON').length);
  assert.equal(D.countLine(27, 27, false), '27 congregations'); assert.equal(D.countLine(1, 27, true), '1 of 27 congregations matches');
  assert.match(D.countLine(0, 27, true), /^No congregation matches\. Try a city, a province or part of a name\.$/);
});

test('N9 import tool: reads a spreadsheet export, guesses columns, rejects rows it cannot place and never invents a field', () => {
  const rows = parseCsv(csv);
  assert.equal(rows.length, 5); assert.equal(rows[0].Congregation, 'Temple Example, The'); assert.equal(rows[0]['Street Address'], '1 Main St, Springfield, IL');
  assert.deepEqual(columnMap(Object.keys(rows[0])), { name: 'Congregation', city: 'City', region: 'State', address: 'Street Address', postal: 'Zip', website: 'Website', phone: 'Phone' });
  assert.equal(columnMap(['Org', 'City'], { name: 'Org' }).name, 'Org');
  assert.equal(regionCode('US', 'illinois'), 'IL'); assert.equal(regionCode('US', 'or'), 'OR'); assert.equal(regionCode('US', 'ZZ'), ''); assert.equal(regionCode('CA', 'Québec'.normalize('NFD').replace(/[̀-ͯ]/g, '')), 'QC');
  assert.equal(Object.keys(REGIONS.US).length, 53); assert.equal(slug('Temple Beth-El  (Reform)'), 'temple-beth-el-reform');
  const { data, rejected } = usFile();
  assert.deepEqual(rejected, [{ row: 5, reason: 'no city' }, { row: 6, reason: 'unknown state "ZZ"' }]);
  assert.deepEqual(data.congregations.map((c) => c.id), ['temple-example-the-springfield-il', 'beth-sample-portland-or', 'beth-sample-portland-or-2'], 'a repeated row gets its own id');
  assert.deepEqual(data.congregations[0], { id: 'temple-example-the-springfield-il', name: 'Temple Example, The', city: 'Springfield', state: 'IL', status: 'current', address: '1 Main St, Springfield, IL 62701', website: 'https://example.org', phone: '555-0100' });
  assert.deepEqual(Object.keys(data.congregations[1]), ['id', 'name', 'city', 'state', 'status'], 'empty cells add nothing');
  assert.deepEqual(data.states, [{ code: 'IL', name: 'Illinois' }, { code: 'OR', name: 'Oregon' }]);
  assert.deepEqual(D.validateDirectory(data, 'US'), []);
  assert.throws(() => convert([], { country: 'MX' }));
});

test('N9: a United States file joins the directory without touching Canada; a bad file or a reused id is left out and reported', () => {
  const us = usFile().data;
  const dir = D.mergeDirectories([{ country: 'CA', data: canada }, { country: 'US', data: us }]);
  assert.equal(dir.congregations.length, 30); assert.deepEqual(dir.problems, []);
  assert.equal(D.directoryTitle(dir), 'Reform Synagogues in Canada and the United States'); assert.equal(D.regionWords(dir), 'province or state');
  assert.deepEqual(D.searchDirectory(dir, { q: 'portland oregon' }).map((c) => c.country), ['US', 'US']);
  assert.equal(D.searchDirectory(dir, { country: 'CA' }).length, 27);
  assert.equal(D.searchDirectory(dir, { q: 'springfield', country: 'CA' }).length, 0);
  const bad = D.mergeDirectories([{ country: 'CA', data: canada }, { country: 'US', data: { states: [], congregations: [{ id: 'X Y', name: '', city: '' }] } }]);
  assert.equal(bad.congregations.length, 27); assert.equal(bad.problems.length, 1); assert.ok(bad.problems[0].errors.length >= 3);
  const clash = structuredClone(us); clash.congregations[0].id = canada.congregations[0].id;
  const c2 = D.mergeDirectories([{ country: 'CA', data: canada }, { country: 'US', data: clash }]);
  assert.equal(c2.congregations.length, 29); assert.match(c2.problems[0].errors[0], /already used/);
});

test('N9 view: the directory has a labelled search box that narrows the list; a second country adds a picker and changes the title', async () => {
  const { mount } = await import('../src/synagogues/synagogues.view.js');
  const env = environment();
  await mount(env.root, { query: {}, hasRoute: () => true });
  const r = env.root, tiles = () => r.querySelectorAll('li').filter((li) => li.getAttribute('data-id'));
  assert.equal(r.querySelector('h1').textContent, 'Reform Synagogues in Canada');
  assert.equal(tiles().length, 27);
  const input = r.querySelector('#syn-q');
  assert.ok(input && r.querySelectorAll('label').some((l) => l.getAttribute('for') === 'syn-q' && /Search by name, city or province/.test(l.textContent)));
  assert.equal(r.querySelector('#syn-country'), null, 'one country: no country picker');
  assert.equal(r.querySelector('#syn-count').textContent, '27 congregations');
  input.value = 'vancouver'; input.dispatch('input');
  assert.ok(tiles().length >= 1 && tiles().length < 27);
  assert.match(r.querySelector('#syn-count').textContent, /^\d+ of 27 congregations? match/);
  input.value = 'qqqq'; input.dispatch('input');
  assert.equal(tiles().length, 0); assert.match(r.querySelector('#syn-count').textContent, /^No congregation matches/);
  input.value = ''; input.dispatch('input');
  assert.equal(tiles().length, 27);

  const env2 = environment();
  await mount(env2.root, { query: {}, hasRoute: () => true, synagogueFiles: [{ country: 'CA', data: canada }, { country: 'US', data: usFile().data }] });
  assert.equal(env2.root.querySelector('h1').textContent, 'Reform Synagogues in Canada and the United States');
  assert.ok(env2.root.querySelector('#syn-country'));
  assert.equal(env2.root.querySelectorAll('li').filter((li) => li.getAttribute('data-id')).length, 30);
  assert.ok(env2.root.querySelectorAll('h2').some((h) => h.textContent === 'Oregon'));
  // a congregation with contact details only opens without an empty History section
  const env3 = environment();
  await mount(env3.root, { query: { id: 'beth-sample-portland-or' }, hasRoute: () => true, synagogueFiles: [{ country: 'CA', data: canada }, { country: 'US', data: usFile().data }] });
  assert.equal(env3.root.querySelector('h1').textContent, 'Beth Sample');
  assert.match(env3.root.textContent, /Portland, Oregon/); assert.ok(!env3.root.querySelectorAll('h2').some((h) => h.textContent === 'History'));
});

// ---------- N4 ----------
const S = await loadServiceData({ loadCorpus });
const cat = B.catalogue(S.orders, S.byId);

test('N4 model: the catalogue is every service prayer once; the book keeps the learner\'s picks, order and options', () => {
  const all = new Set(Object.values(S.orders.orders).flatMap((o) => o.items.map((i) => i.id)).filter((id) => S.byId.has(id)));
  assert.equal(cat.length, all.size); assert.equal(new Set(cat.map((c) => c.id)).size, cat.length);
  assert.ok(cat.some((c) => c.services.length > 1), 'a prayer said in two services is listed once, with both named');
  assert.deepEqual(B.normaliseBook('junk'), { v: 1, title: 'My Prayer Book', ids: [], showTranslit: true, showEnglish: true, showMarks: true });
  assert.deepEqual(B.normaliseBook({ ids: ['a', 'a', 7, '<x>', 'b'], title: '  ' + 'x'.repeat(99) }).ids, ['a', 'b']);
  assert.equal(B.normaliseBook({ title: 'x'.repeat(99) }).title.length, B.MAX_TITLE);
  let b = B.normaliseBook(null);
  const [p, q, r] = cat.map((c) => c.id);
  b = B.add(B.add(B.add(B.add(b, p), q), r), p);
  assert.deepEqual(b.ids, [p, q, r]);
  assert.deepEqual(B.move(b, r, -1).ids, [p, r, q]); assert.deepEqual(B.move(b, p, -1).ids, [p, q, r], 'the first stays first');
  assert.deepEqual(B.move(b, r, 1).ids, [p, q, r]); assert.deepEqual(B.move(b, 'nope', 1).ids, [p, q, r]);
  assert.deepEqual(B.remove(b, q).ids, [p, r]);
  assert.equal(B.setOption(b, 'showEnglish', false).showEnglish, false); assert.deepEqual(B.setOption(b, 'ids', false), b);
  assert.equal(B.setTitle(b, ' Sam’s Siddur ').title, 'Sam’s Siddur');
});

test('N4 model: "learned" is the learner\'s own ladder marks; pages carry the registry text, the Name as ה׳, and honest marks', () => {
  const none = B.choices(cat, B.normaliseBook(null), null, new Set());
  assert.deepEqual(none, [], 'nothing marked, nothing offered as learned');
  assert.equal(B.choices(cat, B.normaliseBook(null), null, new Set(), true).length, cat.length);
  const one = cat[0];
  const rec = withStage(withStage(null, one.id, 'hear', true, '2026-11-12'), one.id, 'vowels', true, '2026-11-12');
  const offered = B.choices(cat, B.normaliseBook(null), rec, new Set());
  assert.deepEqual(offered.map((c) => c.id), [one.id]); assert.equal(offered[0].progress.done, 2); assert.equal(offered[0].progress.of, 4);
  // a picked prayer stays listed even with no marks, so it can be taken out
  assert.ok(B.choices(cat, B.add(B.normaliseBook(null), cat[1].id), rec, new Set()).some((c) => c.id === cat[1].id && c.picked));
  const withName = cat.find((c) => /יְהוָה|יהוה/.test(S.byId.get(c.id).he));
  const second = cat.find((c) => c.id !== withName.id);
  const rec2 = withStage(withStage(null, second.id, 'hear', true, '2026-11-12'), second.id, 'vowels', true, '2026-11-12');
  const book = B.add(B.add(B.normaliseBook(null), withName.id), second.id);
  const ps = B.pages(book, cat, S.byId, rec2, new Set(), 'israeli');
  assert.deepEqual(ps.map((p) => p.id), [withName.id, second.id]); assert.deepEqual(ps.map((p) => p.n), [1, 2]);
  const text = ps[0].lines.map((l) => l.he).join(' ');
  assert.ok(text.includes('ה׳') && !text.replace(/[^א-ת ]/g, '').split(' ').includes('יהוה'));
  assert.equal(ps[1].lines.length, String(S.byId.get(second.id).he).split('\n').filter((x) => x.trim()).length);
  assert.equal(B.marksText(ps[1].progress), '2 of 4 steps: Hear It done, Follow It not yet, Read It with Vowels done, Read It without Vowels not yet');
  assert.deepEqual(B.missingIds(B.add(book, 'gone-prayer'), cat), ['gone-prayer']);
  assert.equal(B.pages(B.add(book, 'gone-prayer'), cat, S.byId, rec2, new Set()).length, 2);
  assert.match(B.MARKS_NOTE, /does not listen/); assert.match(B.SOURCE_NOTE, /not a published siddur/);
});

test('N4 view: pick, reorder, rename and print; the choices are saved under service.mybook.v1; the route sits in Read', async () => {
  assert.equal(matchRoute('#/my-prayer-book').route.name, 'my-prayer-book'); assert.equal(ROUTE_SECTION['my-prayer-book'], 'read');
  const { mount } = await import('../src/service/prayerbook.view.js');
  const env = environment(), m = memStore();
  const one = cat[0], two = cat[1];
  m.store.set(SERVICE_KEYS.practice, withStage(withStage(null, one.id, 'hear', true, '2026-11-12'), two.id, 'hear', true, '2026-11-12'));
  let printed = 0; const was = globalThis.print; globalThis.print = () => { printed++; };
  try {
    await mount(env.root, { store: m.store, settings: { get: () => undefined }, serviceData: S });
    const r = env.root, pick = (id) => r.querySelectorAll('button').find((b) => b.getAttribute('data-pick') === id);
    await wait(() => pick(one.id));
    assert.equal(r.querySelectorAll('button').filter((b) => b.getAttribute('data-pick')).length, 2, 'only the two marked prayers are offered');
    assert.ok(r.querySelector('#mpb-print').getAttribute('disabled') !== null, 'an empty book cannot be printed');
    pick(one.id).click(); pick(two.id).click();
    assert.deepEqual(m.mem.get(B.MYBOOK_KEY).ids, [one.id, two.id]);
    assert.equal(pick(one.id).getAttribute('aria-pressed'), 'true');
    r.querySelectorAll('button').find((b) => b.getAttribute('data-up') === two.id).click();
    assert.deepEqual(m.mem.get(B.MYBOOK_KEY).ids, [two.id, one.id]);
    assert.deepEqual(r.querySelectorAll('section').filter((s) => s.getAttribute('data-page')).map((s) => s.getAttribute('data-page')), [two.id, one.id], 'the book below follows the order');
    assert.match(r.textContent, /1 of 4 steps: Hear It done/); assert.ok(r.textContent.includes(B.MARKS_NOTE) && r.textContent.includes(B.SOURCE_NOTE));
    const title = r.querySelector('#mpb-title'); title.value = 'Our Shabbat Book'; r.querySelector('#mpb-save-title').click();
    assert.equal(m.mem.get(B.MYBOOK_KEY).title, 'Our Shabbat Book'); assert.ok(r.querySelectorAll('h2').some((h) => h.textContent === 'Our Shabbat Book'));
    r.querySelector('#mpb-print').click(); assert.equal(printed, 1);
    r.querySelector('#mpb-all').click();
    assert.equal(r.querySelectorAll('button').filter((b) => b.getAttribute('data-pick')).length, cat.length);
    r.querySelectorAll('button').find((b) => b.getAttribute('data-remove') === two.id).click();
    assert.deepEqual(m.mem.get(B.MYBOOK_KEY).ids, [one.id]);
    assert.doesNotMatch(r.textContent, /\bAI\b|artificial|language model|machine/i);
    assert.ok(!r.textContent.replace(/[^א-ת ]/g, ' ').split(/\s+/).includes('יהוה'));
  } finally { globalThis.print = was; }
});
