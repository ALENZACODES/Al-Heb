// Static and fake-DOM accessibility checks for the four builder views (nikkud fade, roots, gender drill, record and compare).
// The real axe run is tests/a11y.browser.test.js; none of these views is registered there yet, and a real 375x667 browser pass was NOT run.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { N, tick, memStore, btn } from './torahread.fakedom.js';

const rd = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const j = (p) => JSON.parse(rd(p));
const SET = j('data/nikkudfade/reading-set.json'), FAM = j('data/roots/families.json'), VERBS = j('data/roots/verbs.json'), TPL = j('data/gender/templates.json'), PAIRS = j('data/speak/minimal-pairs.json');
const rec = { supported: true, async start() { return { ok: true }; }, async stop() { return { ok: true, url: 'blob:x', ms: 900 }; }, dispose() {} };
const VIEWS = [
  ['nikkudfade', 'src/nikkudfade/nikkudfade.view.js', () => ({ store: memStore(), nikkudfadeData: { set: { items: SET.items.slice(0, 20) }, schedule: j('data/nikkudfade/schedule.json') } })],
  ['roots', 'src/roots/roots.view.js', () => ({ store: memStore(), rootsData: { families: { coverage: FAM.coverage, families: FAM.families.slice(0, 20) }, verbs: { verbs: VERBS.verbs.slice(0, 100) } } })],
  ['genderdrill', 'src/genderdrill/genderdrill.view.js', () => ({ store: memStore(), genderData: { templates: TPL, paradigms: j('data/curriculum/gender-pairs.json').paradigms } })],
  ['recordcompare', 'src/recordcompare/recordcompare.view.js', () => ({ store: memStore(), recordCompare: { data: PAIRS, tradition: 'ashkenazi', recorder: rec, speaker: { supported: true, speak: async () => ({ ok: true }), cancel() {} } } })],
];

for (const [name, file, ctxOf] of VIEWS) {
  test(`${name}: source has no animation, no outline removal, no div-buttons, and uses real <button>/<label>`, () => {
    const src = rd(file);
    assert.doesNotMatch(src, /transition|animation|@keyframes|scroll-behavior|outline\s*:\s*none/i, 'nothing to turn off for reduced motion');
    assert.doesNotMatch(src, /role:\s*'button'/);
    assert.match(src, /role: 'status', 'aria-live': 'polite'/);
    assert.match(src, /aria-labelledby/); assert.match(src, /tabindex: '-1'/);
    assert.match(src, /min-height:44px;min-width:44px/);
  });
  test(`${name}: mounted page has one h1 labelling the section, one status region, 44px buttons, labelled inputs, Hebrew marked lang=he dir=rtl`, async () => {
    const V = await import('../' + file);
    const root = new N('main'); const un = V.mount(root, ctxOf()); await tick(60);
    const sec = root.queryAll('section')[0]; assert.ok(sec && sec.attrs['aria-labelledby']);
    const h1s = root.queryAll('h1'); assert.equal(h1s.length, 1); assert.equal(h1s[0].attrs.id, sec.attrs['aria-labelledby']);
    assert.equal(root.queryAll('[role="status"]').length, 1);
    const buttons = root.all((n) => n.tag === 'button'); assert.ok(buttons.length >= 3);
    for (const b of buttons) { assert.match(b.attrs.style || '', /min-height:44px/); assert.equal(b.attrs.type, 'button'); assert.ok(b.textContent.trim() || b.attrs['aria-label'], 'button has a name'); }
    for (const i of root.all((n) => n.tag === 'input')) assert.ok(root.queryAll('label').some((l) => l.attrs.for === i.attrs.id), 'input has a label');
    for (const g of root.queryAll('[role="group"]')) assert.ok(g.attrs['aria-label'] || g.attrs['aria-labelledby'], 'group is named');
    const he = root.all((n) => /[֐-׿]/.test(n.children.filter((c) => c.nodeType === 3).map((c) => c.data).join('')));
    for (const n of he) assert.ok(n.attrs.lang === 'he' && n.attrs.dir === 'rtl', `Hebrew text in <${n.tag}> is not marked lang=he dir=rtl: ${n.children[0]?.data}`);
    for (const b of buttons.filter((x) => x.attrs['aria-pressed'] !== undefined)) assert.match(b.attrs['aria-pressed'], /^(true|false)$/);
    un();
  });
}

// Deeper states: every screen a learner can reach by tapping through, not only the first one.
function audit(root, where) {
  for (const b of root.all((n) => n.tag === 'button')) { assert.match(b.attrs.style || '', /min-height:44px/, where); assert.ok(b.textContent.trim() || b.attrs['aria-label'], where + ': unnamed button'); }
  const he = root.all((n) => /[\u0590-\u05FF]/.test(n.children.filter((c) => c.nodeType === 3).map((c) => c.data).join('')));
  for (const n of he) assert.ok(n.attrs.lang === 'he' && n.attrs.dir === 'rtl', `${where}: Hebrew in <${n.tag}> not marked: ${n.children[0]?.data}`);
  assert.equal(root.queryAll('[role="status"]').length, 1, where);
}
test('deep states keep the same guarantees: gender drill through a whole round, roots (family, verb table, drill), record and compare (contrast, both takes, answer), nikkud fade (look-alike check)', async () => {
  let V = await import('../src/genderdrill/genderdrill.view.js'), root = new N('main'), un = V.mount(root, VIEWS[2][2]()); await tick();
  await btn(root, /^I am a woman/).click(); await tick(); audit(root, 'gender start');
  for (let i = 0; i < 12 && !/Round done/.test(root.textContent); i++) {
    const ans = root.queryAll('[aria-label="Answers"] button');
    if (ans.length) { await ans[0].click(); await tick(); audit(root, 'gender answer'); await btn(root, /^(Next|Finish round)/).click(); }
    else if (btn(root, /^Show my form/)) { await btn(root, /^Show my form/).click(); await tick(); await btn(root, /^Show the other gender/).click(); await tick(); audit(root, 'gender reveal'); await btn(root, /^I said it right/).click(); }
    else await btn(root, /^Next/).click();
    await tick(5); audit(root, 'gender step');
  }
  assert.match(root.textContent, /Round done/); un();

  V = await import('../src/roots/roots.view.js'); root = new N('main'); un = V.mount(root, VIEWS[1][2]()); await tick();
  await root.all((n) => n.tag === 'button' && /^Family letters /.test(n.attrs['aria-label'] || ''))[0].click(); await tick(); audit(root, 'roots family');
  const vb = root.all((n) => n.tag === 'button' && /^Verb forms for/.test(n.attrs['aria-label'] || ''))[0]; if (vb) { await vb.click(); await tick(); audit(root, 'roots table'); }
  await btn(root, /^Drill$/).click(); await tick(); audit(root, 'roots drill');
  for (let i = 0; i < 8; i++) { const o = root.queryAll('[aria-label="Answers"] button'); if (!o.length) break; await o[0].click(); await tick(); audit(root, 'roots answer'); await btn(root, /^(Next question|Finish round)/).click(); await tick(5); }
  await btn(root, /^Verb forms$/).click(); await tick(); await root.all((n) => n.tag === 'button' && /^Show forms of/.test(n.attrs['aria-label'] || ''))[0].click(); await tick(); audit(root, 'roots verbs'); un();

  V = await import('../src/recordcompare/recordcompare.view.js'); root = new N('main'); un = V.mount(root, VIEWS[3][2]()); await tick();
  await btn(root, /^Kamatz/).click(); await tick(); audit(root, 'rc contrast');
  await btn(root, /^Record A/).click(); await tick(); audit(root, 'rc recording'); await btn(root, /^Stop recording A/).click(); await tick();
  await btn(root, /^Record B/).click(); await tick(); await btn(root, /^Stop recording B/).click(); await tick(); audit(root, 'rc both takes');
  await btn(root, /^Yes, I could hear/).click(); await tick(); audit(root, 'rc answered'); un();

  V = await import('../src/nikkudfade/nikkudfade.view.js'); root = new N('main');
  const amb = SET.items.find((i) => i.ambiguous && i.rival.translit !== i.translit && i.unlock <= 10);
  const store = memStore(); store.m['nikkudfade.v1'] = { stage: 3, auto: false };
  un = V.mount(root, { store, nikkudfadeData: { set: { items: [amb] }, schedule: j('data/nikkudfade/schedule.json') } }); await tick();
  audit(root, 'nf start'); await btn(root, /^I read it/).click(); await tick(); audit(root, 'nf look-alike check'); un();
});

test('hebrewtext/mixed splits Hebrew runs from English and keeps the text', async () => {
  const { runs, mixed } = await import('../src/hebrewtext/mixed.js');
  assert.deepEqual(runs('Say: אֲנִי תַּלְמִיד now'), [{ he: false, text: 'Say: ' }, { he: true, text: 'אֲנִי תַּלְמִיד' }, { he: false, text: ' now' }]);
  assert.deepEqual(runs('plain'), [{ he: false, text: 'plain' }]); assert.deepEqual(runs(''), []);
  globalThis.document = globalThis.document || {};
  const nodes = mixed('a שלום b'); assert.equal(nodes.length, 3); assert.equal(nodes[1].attrs.lang, 'he'); assert.equal(nodes[1].attrs.dir, 'rtl');
});
