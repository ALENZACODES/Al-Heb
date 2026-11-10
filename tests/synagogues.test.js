// Reform synagogues in Canada: the data file, its pictures, and the directory and detail screens (fake DOM; view logic only).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { N } from './torahread.fakedom.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const D = JSON.parse(readFileSync(join(root, 'data/synagogues/canada.json'), 'utf8'));
const { mount } = await import('../src/synagogues/synagogues.view.js');
const { ROUTES, matchRoute } = await import('../src/shell/router.js');
const { PARENT, ROUTE_SECTION } = await import('../src/shell/nav-model.js');
const { en } = await import('../src/shell/i18n.js');
await import('../src/shell/nav.strings.js'); // merges the nav.route.* labels into `en`

async function show(query = {}, extra = {}) {
  const r = new N('main');
  const un = await mount(r, { query, hasRoute: () => true, ...extra });
  return { root: r, text: r.textContent, un };
}

test('data: 27 congregations with unique ids, a province from the list, and a 2 to 5 paragraph story each', () => {
  assert.equal(D.congregations.length, 27);
  const ids = new Set(D.congregations.map((c) => c.id));
  assert.equal(ids.size, 27);
  const provs = new Set(D.provinces.map((p) => p.code));
  for (const c of D.congregations) {
    assert.match(c.id, /^[a-z0-9-]+$/, c.id);
    assert.ok(provs.has(c.province), `${c.id} province ${c.province}`);
    assert.ok(Array.isArray(c.story) && c.story.length >= 2 && c.story.length <= 5, `${c.id} has ${c.story?.length} paragraphs`);
    for (const p of c.story) assert.ok(p.split(/\s+/).length >= 25, `${c.id} has a very short paragraph`);
    assert.ok(['current', 'legacy'].includes(c.status), c.id);
    assert.ok(c.name && c.city && c.summary, c.id);
    assert.ok(Array.isArray(c.sources) && c.sources.length >= 1, `${c.id} has sources`);
    for (const s of c.sources) assert.match(s.url, /^https?:\/\//, `${c.id} source url`);
  }
  assert.equal(D.congregations.filter((c) => c.status === 'current').length, 25);
  assert.equal(D.congregations.filter((c) => c.status === 'legacy').length, 2);
});

test('data: every current congregation has an address and at least one way to reach it', () => {
  for (const c of D.congregations.filter((x) => x.status === 'current')) {
    assert.ok(c.address, `${c.id} address`);
    assert.ok(c.phone || c.email || c.website, `${c.id} contact`);
  }
});

test('pictures: every listed picture exists in full and thumbnail size, has alt text, and every file on disk is listed', () => {
  let n = 0;
  for (const c of D.congregations) {
    for (const im of c.images || []) {
      n++;
      assert.ok(existsSync(join(root, 'assets/synagogues', c.id, im.file)), `${c.id}/${im.file}`);
      assert.ok(existsSync(join(root, 'assets/synagogues', c.id, 'thumb', im.file)), `${c.id}/thumb/${im.file}`);
      assert.ok(typeof im.alt === 'string' && im.alt.length > 10, `${c.id}/${im.file} alt`);
    }
  }
  assert.equal(n, 51);
  for (const dir of readdirSync(join(root, 'assets/synagogues'))) {
    const c = D.congregations.find((x) => x.id === dir);
    assert.ok(c, `assets/synagogues/${dir} has no entry in the data file`);
    for (const f of readdirSync(join(root, 'assets/synagogues', dir))) {
      if (f === 'thumb') continue;
      assert.ok(c.images.some((i) => i.file === f), `${dir}/${f} is on disk but not listed`);
    }
  }
});

test('routes: /synagogues and /synagogues/:id exist, sit in the read section, and the detail route has a parent', () => {
  const list = ROUTES.find((r) => r.name === 'synagogues'), one = ROUTES.find((r) => r.name === 'synagogue');
  assert.ok(list && one);
  assert.equal(ROUTE_SECTION.synagogues, 'read');
  assert.equal(PARENT.synagogue, 'synagogues');
  assert.ok(en['nav.route.synagogues']);
  const m = matchRoute('#/synagogues/holy-blossom-toronto');
  assert.equal(m.route.name, 'synagogue');
  assert.equal(m.query.id, 'holy-blossom-toronto');
});

test('directory: one tile per congregation, grouped by province west to east, with a thumbnail where a picture is held', async () => {
  const { root: r, text } = await show();
  assert.match(text, /Reform Synagogues in Canada/);
  assert.doesNotMatch(text, /legacy|to confirm|not found|illustrative/i);
  const tiles = r.queryAll('li[data-id]');
  assert.equal(tiles.length, 27);
  const provinces = r.queryAll('section[data-province]').map((s) => s.getAttribute('data-province'));
  assert.deepEqual(provinces, ['BC', 'AB', 'MB', 'ON', 'QC']);
  const hb = tiles.find((t) => t.getAttribute('data-id') === 'holy-blossom-toronto');
  assert.ok(hb.querySelector('img'));
  assert.equal(hb.querySelector('a').getAttribute('href'), '#/synagogues/holy-blossom-toronto');
  const ks = tiles.find((t) => t.getAttribute('data-id') === 'iyr-ha-melech-kingston');
  assert.ok(ks.querySelector('img'));
  assert.equal(tiles.filter((t) => t.querySelector('img')).length, 27);
  assert.match(text, /Former Congregations/);
  assert.equal(r.queryAll('section[data-part="former"] li[data-id]').length, 2);
});

test('detail: story paragraphs, a gallery with one button per picture, contact facts, sources and neighbour links', async () => {
  const { root: r, text } = await show({ id: 'holy-blossom-toronto' });
  const c = D.congregations.find((x) => x.id === 'holy-blossom-toronto');
  assert.equal(r.querySelector('h1').textContent, c.name);
  assert.equal(r.queryAll('[data-part="story"] p').length, c.story.length);
  assert.match(text, /1856/);
  const buttons = r.queryAll('[data-part="gallery"] button');
  assert.equal(buttons.length, c.images.length);
  assert.equal(buttons[0].getAttribute('aria-pressed'), 'true');
  const hero = r.querySelector('.syn-hero img');
  assert.equal(hero.getAttribute('src'), `assets/synagogues/${c.id}/${c.images[0].file}`);
  await buttons[2].click();
  assert.equal(hero.getAttribute('src'), `assets/synagogues/${c.id}/${c.images[2].file}`);
  assert.equal(buttons[2].getAttribute('aria-pressed'), 'true');
  assert.equal(buttons[0].getAttribute('aria-pressed'), 'false');
  assert.match(text, /1950 Bathurst Street/);
  assert.ok(r.queryAll('[data-part="facts"] a').some((a) => a.getAttribute('href') === 'tel:4167893291'));
  assert.ok(r.queryAll('[data-part="sources"] a').length >= 1);
  assert.match(text, /All Synagogues/);
  assert.ok(r.queryAll('nav a').length === 2);
});

test('detail: a one-picture congregation shows it, and no hedging notes or open questions are shown', async () => {
  const { root: r, text } = await show({ id: 'iyr-ha-melech-kingston' });
  assert.ok(r.querySelector('.syn-hero img'));
  assert.doesNotMatch(text, /To confirm|not found|No telephone/);
  for (const id of ['or-hadash-newmarket', 'neshamah-york-region', 'beth-chaverim-baycrest']) {
    const { text: t } = await show({ id });
    assert.doesNotMatch(t, /legacy|to confirm|not found|reconstruct|inferred|rests on|ARZA/i, id);
  }
});

test('detail: former congregations carry a badge and the closing story; an unknown id gives a polite notice', async () => {
  const { text } = await show({ id: 'bnai-tikvah-niagara-falls' });
  assert.match(text, /Former congregation/);
  assert.match(text, /sold in November 2020/);
  const { root: r } = await show({ id: 'no-such-place' });
  assert.ok(r.querySelector('[role="alert"]'));
});

test('text: the data file and the view carry no tool or assistant names', () => {
  const src = readFileSync(join(root, 'data/synagogues/canada.json'), 'utf8') + readFileSync(join(root, 'src/synagogues/synagogues.view.js'), 'utf8');
  assert.doesNotMatch(src, /\bAI\b|artificial intelligence|language model|generated by/i);
});

test('standalone page: synagogues/index.html is current, lists every congregation, links into the app and has no script', async () => {
  const { buildPage } = await import('../tools/synagogues/build-page.mjs');
  const html = readFileSync(join(root, 'synagogues/index.html'), 'utf8');
  assert.equal(html, buildPage());
  for (const c of D.congregations) assert.ok(html.includes(`href="../#/synagogues/${c.id}"`), c.id);
  assert.ok(!/<script|\son[a-z]+\s*=/i.test(html));
  assert.match(html, /<title>Reform Synagogues in Canada<\/title>/);
});
