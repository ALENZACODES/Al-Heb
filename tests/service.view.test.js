import test from 'node:test';
import assert from 'node:assert/strict';
import { N, tick, btn } from './torahread.fakedom.js';
const { mount } = await import('../src/service/service.view.js');

const memStore = (init = {}) => { const m = { ...init }; return { m, get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); } }; };
const mk = (o = {}) => { const root = new N('div'); const store = memStore(o.init); return { root, store, ctx: { store, settings: { get: (k) => (k === 'congregation' ? 'sephardi' : undefined) }, audio: o.audio } }; };
const key = (node, k) => node.fire('keydown', { key: k });

test('coverage tab: three services, honest wording, no fluency claim, gaps separate', async () => {
  const { root, ctx } = mk();
  const un = await mount(root, ctx);
  const secs = root.queryAll('section.card');
  assert.equal(secs.length, 3);
  assert.match(root.textContent, /does not mean you read it fluently/);
  assert.match(root.textContent, /Draft, not reviewed by a rabbi/);
  assert.match(root.textContent, /Mishkan T'filah are copyrighted/);
  for (const s of secs) { assert.match(s.textContent, /\d+% decodable/); assert.match(s.textContent, /not in ALEF yet/); assert.doesNotMatch(s.textContent, /fluent/); }
  assert.match(root.queryAll('[data-order="friday-night"]')[0].textContent, /^Friday evening0% decodable/); // fresh learner
  assert.equal(root.queryAll('[data-follow]').length, 2); // weekday morning has no follow mode
  un();
});

test('follow mode: card has pointed Hebrew lang=he dir=rtl, transliteration, English, varies-by-congregation, keyboard paging', async () => {
  const { root, ctx, store } = mk();
  await mount(root, ctx);
  await root.queryAll('[data-follow="friday-night"]')[0].click();
  assert.match(root.querySelector('#sv-card-h').textContent, /Candle blessing/);
  const he = root.queryAll('.sv-he');
  assert.ok(he.length >= 1);
  for (const w of he) { assert.equal(w.attrs.lang, 'he'); assert.equal(w.attrs.dir, 'rtl'); assert.match(w.textContent, /[ְ-ּ]/); }
  assert.ok(root.queryAll('.sv-tr').length >= 1);
  assert.match(root.querySelector('.sv-en').textContent, /\S/);
  assert.match(root.querySelector('.sv-varies').textContent, /varies by congregation/);
  assert.equal(root.querySelector('#sv-play'), null, 'no clip exists, so no audio button');
  assert.equal(root.querySelector('#sv-prev').attrs.disabled, '');
  // keyboard: arrows on the card turn pages
  await key(root.querySelector('#sv-card'), 'ArrowRight');
  assert.match(root.querySelector('#sv-card-h').textContent, /Welcoming Shabbat/);
  await key(root.querySelector('#sv-card'), 'ArrowLeft');
  assert.match(root.querySelector('#sv-card-h').textContent, /Candle blessing/);
  assert.match(root.textContent, /Friday evening|Friday night/);
  assert.equal(store.m['service.prefs'].order, 'friday-night');
});

test('transliteration toggle hides it and is remembered; tradition changes the respelling', async () => {
  const { root, ctx, store } = mk();
  await mount(root, ctx);
  await btn(root, /Follow the service/).click();
  await root.querySelector('[data-order="shabbat-morning"]').click();
  while (!/Barchu/.test(root.querySelector('#sv-card-h').textContent)) await root.querySelector('#sv-next').click();
  const before = root.queryAll('.sv-tr').map((n) => n.textContent).join('|');
  await root.querySelector('#sv-tradition').fire('change', { target: { value: 'ashkenazi' } });
  const after = root.queryAll('.sv-tr').map((n) => n.textContent).join('|');
  assert.notEqual(before, after);
  await root.querySelector('#sv-toggle-tr').click();
  assert.equal(root.queryAll('.sv-tr').length, 0);
  assert.equal(root.querySelector('#sv-toggle-tr').attrs['aria-pressed'], 'true');
  assert.equal(store.m['service.prefs'].showTr, false);
  assert.equal(store.m['service.prefs'].tradition, 'ashkenazi');
});

test('markers: Amidah card shows stand and silent with the guide quote; Shema card shows varies; every card is reachable', async () => {
  const { root, ctx } = mk();
  await mount(root, ctx);
  await root.querySelector('[data-follow="shabbat-morning"]').click();
  const seen = {};
  for (let g = 0; g < 40; g++) {
    const title = root.querySelector('#sv-card-h').textContent;
    seen[title] = { marks: root.queryAll('.sv-mark').map((m) => m.attrs['data-kind']), varies: !!root.querySelector('.sv-varies') };
    if (root.querySelector('#sv-next').attrs.disabled === '') break;
    await root.querySelector('#sv-next').click();
  }
  assert.equal(Object.keys(seen).length, 24);
  assert.deepEqual(seen['The Amidah begins'].marks, ['stand', 'silent']);
  assert.equal(seen['The Amidah begins'].varies, false);
  assert.deepEqual(seen['The Shema'], { marks: [], varies: true });
  assert.deepEqual(seen['Aleinu'].marks, ['stand']);
  assert.match(root.querySelector('#sv-card-h').textContent, /Closing hymn/);
});

test('audio button appears only for a real clip and plays it', async () => {
  const played = [];
  const audio = { status: (k, id) => ({ source: id === 'candle-shabbat' ? 'file' : 'tts-fallback' }), play: (...a) => { played.push(a); return Promise.resolve({ ok: true }); } };
  const { root, ctx } = mk({ audio });
  await mount(root, ctx);
  await root.querySelector('[data-follow="friday-night"]').click();
  await root.querySelector('#sv-play').click();
  assert.deepEqual(played[0].slice(0, 2), ['line', 'candle-shabbat']);
  await root.querySelector('#sv-next').click();
  // no clip here, but the fake player reports a device voice: the button is offered and labelled as a device voice, never as a recording
  const dev = root.querySelector('#sv-play');
  assert.equal(dev.getAttribute('data-audio-state'), 'device');
  assert.match(dev.getAttribute('aria-label'), /device voice/);
});

test('no clip and no usable voice: no play button, a one-line No audio yet', async () => {
  const audio = { status: () => ({ source: 'none', reason: 'no-speech-synthesis' }), play: () => Promise.resolve({ source: 'none' }) };
  const { root, ctx } = mk({ audio });
  await mount(root, ctx);
  await root.querySelector('[data-follow="friday-night"]').click();
  assert.equal(root.querySelector('#sv-play'), null);
  assert.match(root.textContent, /No audio yet/);
});

test('every control is a real button/select/summary (keyboard operable) and Hebrew is always lang=he', async () => {
  const { root, ctx } = mk();
  await mount(root, ctx);
  await root.querySelector('[data-follow="shabbat-morning"]').click();
  for (const n of root.all((x) => x.listeners.click)) assert.ok(['button', 'a'].includes(n.tag), n.tag);
  for (const n of root.all((x) => x.className.includes('sv-he'))) assert.equal(n.attrs.lang, 'he');
});
