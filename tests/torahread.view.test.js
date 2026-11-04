import test from 'node:test';
import assert from 'node:assert/strict';
import { N, tick, btn, memStore } from './torahread.fakedom.js';
const { mount } = await import('../src/torahread/torahread.view.js');

const mk = (audio) => { const root = new N('div'); const store = memStore(); return { root, store, ctx: { store, settings: { congregation: 'sephardi' }, audio, query: {} } }; };
const status = (root) => root.queryAll('.trd-status')[0]?.textContent;

test('mounts, shows draft notice, Hebrew is lang=he dir=rtl, all five sections reachable by buttons', async () => {
  const { root, ctx } = mk();
  const un = await mount(root, ctx);
  assert.match(root.textContent, /Not reviewed by a rabbi, cantor or Hebrew teacher/);
  const he = root.queryAll('.trd-w');
  assert.equal(he.length, 3);
  for (const w of he) { assert.equal(w.attrs.lang, 'he'); assert.equal(w.attrs.dir, 'rtl'); assert.ok(w.tag === 'button'); }
  const tabs = root.queryAll('.trd-tab');
  assert.equal(tabs.length, 5);
  for (const t of tabs) assert.ok(t.attrs['aria-pressed']);
  assert.equal(typeof un, 'function'); un();
});

test('ladder: levels change what is shown; tap reveals points; check + self-rating is stored, no speech recognition claim', async () => {
  const { root, ctx, store } = mk();
  await mount(root, ctx);
  const text = () => root.queryAll('.trd-w').map((w) => w.textContent);
  const pointed = text();
  await root.queryAll('[data-level="3"]')[0].click();
  const bare = text();
  assert.ok(bare.every((t, i) => !/[ְ-ּ]/.test(t) && t.length <= pointed[i].length));
  const first = root.queryAll('.trd-w')[0];
  assert.match(first.attrs['aria-label'], /Points hidden/);
  await first.click();
  assert.match(root.queryAll('.trd-w')[0].textContent, /[ְ-ּ]/);
  assert.equal(root.queryAll('.trd-w')[0].attrs['aria-pressed'], 'true');
  assert.match(root.textContent, /does not listen: there is no speech recognition/);
  await btn(root, /Did you say it right/).click();
  assert.ok(root.querySelector('#trd-answer'));
  assert.match(root.querySelector('#trd-answer').textContent, /LORD bless thee/);
  await btn(root, /^I said it right$/).click();
  assert.deepEqual(store.m['torahread.v1'].ladder['bless-priestly-1'], { 3: 'right' });
  assert.equal(root.queryAll('.trd-rate').find((b) => b.attrs['aria-pressed'] === 'true').textContent, 'I said it right');
});

test('audio hook is honest: no player, unknown item, tts fallback, file', async () => {
  for (const [audio, re] of [
    [undefined, /No audio yet.*no audio player/],
    [{ play: async () => ({ source: 'none', reason: 'unknown-item' }), has: () => false }, /No audio yet.*no audio entry exists/],
    [{ play: async () => ({ source: 'tts-fallback' }), has: () => false }, /computer voice, not a person/],
    [{ play: async () => ({ source: 'file', entryStatus: 'recorded' }), has: () => true }, /recorded audio file/],
  ]) {
    const { root, ctx } = mk(audio);
    await mount(root, ctx);
    await btn(root, /^Hear it$/).click(); await tick(5);
    assert.match(status(root), re);
  }
  const { root, ctx } = mk({ play: async () => ({ source: 'none', reason: 'unknown-item' }), has: () => false });
  await mount(root, ctx);
  assert.match(root.textContent, /No recorded audio for this line yet/);
});

test('aliyah section: steps, blessings from the registry, rehearsal mode hides words, unknowns visible, progress stored', async () => {
  const { root, ctx, store } = mk();
  await mount(root, ctx);
  await btn(root, /^Aliyah rehearsal$/).click();
  const t = root.textContent;
  assert.match(t, /Say Barchu/); assert.match(t, /Unknown here/); assert.match(t, /unknown \(not recorded here\)/);
  assert.ok(root.queryAll('.trd-he').length >= 4);
  await btn(root, /Rehearsal mode: off/).click();
  assert.equal(root.queryAll('.trd-he').length, 0);
  assert.ok(btn(root, /Show the words/));
  await btn(root, /Show the words/).click();
  assert.ok(root.queryAll('.trd-he').length >= 1);
  const cb = root.queryAll('input')[0]; cb.checked = true; await cb.fire('change');
  assert.ok(store.m['torahread.v1'].aliyah.done.before);
});

test('words section: 30 cards, covered until tapped; trope + sources sections render', async () => {
  const { root, ctx } = mk();
  await mount(root, ctx);
  await btn(root, /30 Torah words/).click();
  assert.equal(root.queryAll('li.trd-card').length, 30);
  assert.equal(root.queryAll('.trd-answer').length, 0);
  await root.querySelector('#trd-w-14 button').click();
  assert.match(root.querySelector('#trd-w-14').textContent, /she, it/);
  await btn(root, /Trope: not taught/).click();
  assert.match(root.textContent, /not taught here/i); assert.match(root.textContent, /cantor/);
  await btn(root, /^Sources$/).click();
  assert.match(root.textContent, /Leningrad Codex/); assert.match(root.textContent, /Public Domain/); assert.match(root.textContent, /CC-BY/);
});

test('section can be chosen by route param', async () => {
  const { root, ctx } = mk(); ctx.params = { section: 'trope' };
  await mount(root, ctx);
  assert.equal(root.queryAll('.trd-tab').find((b) => b.attrs['aria-pressed'] === 'true').attrs['data-section'], 'trope');
});
