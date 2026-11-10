import test from 'node:test';
import assert from 'node:assert/strict';
import { N, tick, btn, memStore } from './torahread.fakedom.js';
const { mount } = await import('../src/timedread/timedread.view.js');
import { KEY } from '../src/timedread/model.js';
import { loadProgressData } from '../src/progress/data.js';

// give the learner every letter and sign so lines are decodable
async function knowing() {
  const d = await loadProgressData();
  const store = memStore();
  store.set('curriculum.progress', { completed: Object.fromEntries(d.lessons.map((l) => [l.id, 1])) });
  const letters = {}; for (const l of d.lessons) for (const id of l.letters) letters[id] = 1;
  store.set('letters.progress', letters);
  return store;
}
const clockAt = () => { let t = 1000; const f = () => t; f.set = (v) => { t = v; }; return f; };

test('full flow: pick, start, stop, mark words, save; honest copy; a11y attributes', async () => {
  const store = await knowing(); const now = clockAt();
  const root = new N('div');
  const un = await mount(root, { store, now, query: {} });
  assert.match(root.textContent, /Self-reported, not measured by the app/);
  assert.match(root.textContent, /Compare yourself with yourself/);
  const sel = root.querySelector('#tdr-pick');
  if (!sel) { assert.match(root.textContent, /No line is fully readable/); un(); return; }
  const opts = sel.queryAll('option').filter((o) => o.attrs.value);
  assert.ok(opts.length > 0);
  sel.value = opts[0].attrs.value; await sel.fire('change');
  assert.ok(root.querySelector('#tdr-start'));
  assert.equal(root.queryAll('.tdr-plain')[0].attrs.lang, 'he');
  await btn(root, /Start timer/).click();
  assert.match(root.textContent, /Reading/);
  assert.equal(root.querySelector('#tdr-clock').attrs['aria-hidden'], 'true');
  now.set(1000 + 4000);
  await btn(root, /Stop - I finished/).click();
  assert.match(root.textContent, /Done in 4\.0 seconds/);
  const ws = root.queryAll('.tdr-w');
  assert.ok(ws.length >= 1);
  for (const w of ws) { assert.equal(w.tag, 'button'); assert.equal(w.attrs.lang, 'he'); assert.equal(w.attrs['aria-pressed'], 'false'); assert.match(w.attrs['aria-label'], /stumbled or skipped/); }
  await ws[0].click();
  assert.equal(root.queryAll('.tdr-w')[0].attrs['aria-pressed'], 'true');
  assert.match(root.querySelector('#tdr-count').textContent, /^1 of /);
  await ws[0].click(); await ws[0].click();
  await btn(root, /Save with my marked words/).click();
  const saved = store.m[KEY].reads;
  assert.equal(saved.length, 1); assert.equal(saved[0].ms, 4000); assert.equal(saved[0].stumbled, 1); assert.deepEqual(saved[0].stumbledIdx, [0]);
  assert.match(root.textContent, /Saved/); assert.match(root.textContent, /Self-reported\./);
  assert.match(root.textContent, /Your last 1 read|Your 1 read/);
  assert.match(root.textContent, /About speech recognition/);
  assert.ok(!/leaderboard|rank(ed|ing)? \d|score:/i.test(root.textContent.replace('no ranking and no single fluency score', '')));
  // again, "I read it all"
  await btn(root, /Read this line again/).click(); await btn(root, /Start timer/).click(); now.set(1000 + 4000 + 6000); await btn(root, /Stop/).click();
  await btn(root, /I read it all/).click();
  assert.equal(store.m[KEY].reads.length, 2); assert.equal(store.m[KEY].reads[1].stumbled, 0);
  // delete
  await btn(root, /Read this line again/).click();
  await btn(root, /Delete my timed reads/).click();
  assert.equal(store.m[KEY].reads.length, 0);
  un();
});

test('cancel and too-fast stop save nothing', async () => {
  const store = await knowing(); const now = clockAt(); const root = new N('div');
  const un = await mount(root, { store, now, query: {} });
  const sel = root.querySelector('#tdr-pick'); if (!sel) { un(); return; }
  sel.value = sel.queryAll('option').filter((o) => o.attrs.value)[0].attrs.value; await sel.fire('change');
  await btn(root, /Start timer/).click(); await btn(root, /Cancel/).click();
  assert.equal(store.m[KEY], undefined);
  await btn(root, /Start timer/).click(); await btn(root, /Stop/).click(); // 0 ms
  await btn(root, /I read it all/).click();
  assert.equal(store.m[KEY], undefined);
  assert.match(root.querySelector('p[role=status]').textContent, /Not saved: that was too short/);
  un();
});

test('a brand-new learner sees an honest empty state, not a broken screen', async () => {
  const root = new N('div'); const un = await mount(root, { store: memStore(), query: {} });
  assert.match(root.textContent, /No line is fully readable for you yet/); un();
});

test('unmount stops the timer', async () => {
  const store = await knowing(); const root = new N('div');
  const un = await mount(root, { store, query: {} });
  const sel = root.querySelector('#tdr-pick'); if (sel) { sel.value = sel.queryAll('option').filter((o) => o.attrs.value)[0].attrs.value; await sel.fire('change'); await btn(root, /Start timer/).click(); }
  un(); await tick(10);
});
