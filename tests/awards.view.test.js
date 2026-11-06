// Awards page: keyboard controls, escaped names, sample watermark, untrusted progress.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { N } from './torahread.fakedom.js';
N.prototype.remove = function remove() { if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this); };
const { mount } = await import('../src/awards/gallery.view.js');
const { AWARDS_KEY } = await import('../src/awards/record.js');

const T = Date.UTC(2026, 10, 6, 12, 0, 0);
const mem = (init = {}) => {
  const m = { ...init };
  return { m, persistent: true, get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); return true; } };
};

async function show(init = {}, extra = {}) {
  const root = new N('main');
  const store = extra.store || mem(init);
  const ctx = { store, now: T, navigator: extra.navigator || {}, print: extra.print, download: extra.download, ...extra.ctx };
  const un = await mount(root, ctx);
  return { root, store, un, text: root.textContent };
}

test('first visit explains evidence, locks mastery, and watermarks the sample', async () => {
  const { root, store, text } = await show();
  assert.match(text, /First visit to Awards on this browser/);
  assert.match(text, /no sign-in/);
  assert.match(text, /Evidence missing/);
  assert.match(text, /Confirmed criteria: none/);
  assert.match(text, /awaiting-review/);
  assert.match(text, /SAMPLE \/ NOT EARNED/);
  assert.match(text, /Name panel empty/);
  assert.match(text, /Approved artwork: none yet/);
  assert.match(text, /Activity, not mastery|activity, not mastery/);
  assert.match(text, /Email is not offered/);
  assert.doesNotMatch(text, /mailto:|Sign in|signed in|FMVA|\bCFI\b/);
  assert.doesNotMatch(text, /is an accredited|accredited by/);
  const locked = [...root.queryAll('li[data-state="locked"]'), ...root.queryAll('p[data-state="locked"]')];
  assert.ok(locked.length >= 5);
  assert.ok(locked.every((n) => /Locked/.test(n.textContent)));
  for (const finish of ['matte', 'polished', 'foil']) {
    const slot = root.querySelector(`[data-finish="${finish}"]`);
    assert.equal(slot.getAttribute('data-state'), 'locked');
    assert.match(slot.textContent, new RegExp(finish, 'i'));
    assert.match(slot.textContent, /Locked/);
  }
  assert.equal(root.querySelector('#award-certificate').getAttribute('data-sample'), 'true');
  assert.equal(root.querySelector('#award-certificate').getAttribute('data-layout'), 'landscape');
  assert.equal(root.querySelector('[data-earned="true"]'), null);
  assert.equal(store.m[AWARDS_KEY].certificateEarned, undefined);
  assert.equal(store.m[AWARDS_KEY].v, 1);
  const style = root.querySelector('style').textContent;
  assert.match(style, /@media print/);
  assert.match(style, /landscape/);
  assert.match(style, /\.aw-cert-banner/);
  assert.doesNotMatch(style, /aw-watermark\{display:\s*none|aw-cert-banner\{display:\s*none/);
  const ids = ['award-name', 'award-save-name', 'award-jump', 'award-print', 'award-download', 'award-share'];
  const nodes = ids.map((id) => root.querySelector('#' + id));
  assert.ok(nodes.every(Boolean));
  const order = [];
  root.all((n) => { const id = n.getAttribute && n.getAttribute('id'); if (ids.includes(id)) order.push(id); });
  assert.deepEqual(order, ids);
  assert.equal(root.querySelector('#award-share').getAttribute('disabled'), '');
  assert.equal(root.queryAll('li.aw-badge button').length, 0);
});

test('a typed name is escaped, a saved name survives reload, and the sample stays unearned', async () => {
  const { root, store } = await show();
  const input = root.querySelector('#award-name');
  input.value = '<img src=x onerror=alert(1)> & "quotes"';
  await input.fire('input');
  const name = root.querySelector('[data-cert-name]');
  assert.equal(name.textContent, '<img src=x onerror=alert(1)> & "quotes"');
  assert.equal(name.queryAll('img').length, 0);
  assert.equal(root.querySelector('#award-certificate').getAttribute('data-sample'), 'true');
  assert.equal(store.m[AWARDS_KEY].displayName, '');
  await root.querySelector('#award-save-name').click();
  assert.equal(store.m[AWARDS_KEY].displayName, '<img src=x onerror=alert(1)> & "quotes"');
  assert.equal(store.m[AWARDS_KEY].certificateEarned, undefined);
  assert.match(root.querySelector('#award-status').textContent, /not an account and not a certificate/);
  const again = await show({}, { store });
  assert.match(again.root.querySelector('#award-visit').textContent, /opened Awards on this browser before/);
  assert.equal(again.root.querySelector('[data-cert-name]').textContent, '<img src=x onerror=alert(1)> & "quotes"');
  assert.equal(again.root.querySelector('.aw-name-empty'), null);
  await again.root.querySelector('#award-jump').click();
  assert.equal(globalThis.__focus, again.root.querySelector('#aw-cert-banner'));
});

test('wrong answers, self-marks, and legacy completion never certify; games record activity only', async () => {
  const init = {
    'curriculum.progress': { completed: { r01: T, r02: T, r03: T, r04: T, r05: T, r06: T, r07: T, r08: T, r09: T } },
    'letters.progress': { shin: { print: { completions: 9 } } },
    'games.tugowar.v1': { plays: 2, best: 4, lastStars: 0 },
  };
  const { root, store, text } = await show(init);
  assert.match(text, /Earned/);
  assert.match(text, /Activity, not mastery/);
  assert.equal(root.querySelector('[data-badge="game-session"]').getAttribute('data-state'), 'earned');
  assert.equal(root.querySelector('[data-badge="game-return"]').getAttribute('data-state'), 'earned');
  assert.equal(root.querySelector('[data-badge="beginner-completion"]').getAttribute('data-state'), 'locked');
  assert.match(root.querySelector('[data-badge="beginner-completion"]').textContent, /Locked/);
  assert.match(text, /SAMPLE \/ NOT EARNED/);
  assert.equal(store.m[AWARDS_KEY].awards['beginner-completion'], undefined);
  assert.equal(store.m[AWARDS_KEY].awards['mastery-foil'], undefined);
  const pdfs = [];
  let printed = 0;
  const shared = [];
  const nav = { share: async (payload) => { shared.push(payload); }, canShare: () => false };
  const again = await show(init, { print: () => { printed += 1; }, download: (bytes, filename) => pdfs.push({ bytes, filename }), navigator: nav });
  await again.root.querySelector('#award-print').click();
  await again.root.querySelector('#award-download').click();
  await again.root.querySelector('#award-share').click();
  assert.equal(printed, 1);
  assert.equal(pdfs.length, 1);
  assert.equal(pdfs[0].filename, 'alef-beginner-certificate-SAMPLE.pdf');
  const pdf = Buffer.from(pdfs[0].bytes).toString('latin1');
  assert.match(pdf, /SAMPLE/);
  assert.match(pdf, /NOT EARNED/);
  assert.match(pdf, /841\.89 595\.28/);
  assert.equal(shared.length, 1);
  assert.match(shared[0].text, /SAMPLE \/ NOT EARNED/);
  assert.equal(shared[0].files, undefined);
  assert.equal(again.store.m[AWARDS_KEY].certificateEarned, undefined);
});

test('storage denied and a second reload do not invent an earned certificate', async () => {
  const store = { persistent: false, get() { return null; }, set() { throw new Error('denied'); } };
  const { root, text } = await show({}, { store });
  assert.match(text, /refused to save/);
  assert.match(text, /Nothing new was marked earned/);
  assert.equal(root.querySelector('[data-badge="game-session"]').getAttribute('data-state'), 'locked');
  assert.match(text, /SAMPLE \/ NOT EARNED/);
  const src = readFileSync(new URL('../src/awards/gallery.view.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /mailto:|innerHTML|fetch\(/);
});
