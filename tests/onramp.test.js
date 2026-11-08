// On-ramp (first day, baby steps): data integrity, pure model, the step flow in a fake DOM, Today card labels, lesson-page sizing.
// The fake DOM checks view logic, not browser rendering; docs/onramp/ONRAMP.md holds the scripted phone run.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { waitFor } from './helpers/waitfor.js';
import { N, tick, memStore as mem0 } from './torahread.fakedom.js';
N.prototype.remove = function () { if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this); };
const memStore = (init = {}) => { const s = mem0(); Object.assign(s.m, init); return s; };

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const L = await import('../src/firstday/loader.js');
const O = await import('../src/firstday/onramp.model.js');
const F = await import('../src/pronunciation/forTradition.js');
const { lessons, byId } = await import('../src/curriculum/lessons.js');
const { loadContent } = await import('../src/curriculum/content.js');
const { buildChoiceQuestions } = await import('../src/curriculum/exercises.session.js');
const onramp = await L.loadOnramp();
const first10 = await L.loadFirst10();
const ladder = await L.loadLadder();
const content = await loadContent();
const r01 = byId.r01;

test('on-ramp data: draft, five steps of one thing each, at most 2 minutes and 2 questions, letters before use, bound to r01', () => {
  assert.equal(onramp.status, 'draft'); assert.equal(onramp.proofread, false); assert.match(onramp.reviewNote, /unreviewed/i);
  assert.deepEqual(O.checkOnramp(onramp, { lesson: r01, letters: content.letters, vowels: content.vowels }), []);
  assert.deepEqual(onramp.steps.map((s) => s.kind), ['letter', 'letter', 'vowel', 'syllable', 'word']);
  assert.deepEqual(onramp.steps.map((s) => s.id), ['shin', 'bet', 'kamatz', 'sha', 'shav']);
  assert.equal(O.totalMinutes(onramp), 10);
  for (const s of onramp.steps) assert.ok(s.source, `${s.id} names its Hebrew source`);
});

test('every Hebrew string in the on-ramp already exists in the course data (no new Hebrew)', () => {
  const shin = content.letters.get('shin').he, bet = content.letters.get('bet').he;
  assert.equal(onramp.steps[2].he, content.vowels.get('kamatz').shape);
  assert.equal(onramp.steps[4].he, r01.words[0].he); assert.equal(onramp.steps[4].en, r01.words[0].en);
  const syl = readFileSync(join(root, 'data/pronunciation/derived/_syllables-001.json'), 'utf8');
  assert.ok(syl.includes(`"${onramp.steps[3].he}"`), 'the syllable is a syllable of an existing word');
  for (const s of onramp.steps) for (const o of s.check?.options || []) assert.ok([shin, bet, onramp.steps[2].he, onramp.steps[3].he].includes(o.he), `option ${o.he} is existing data`);
});

test('r01 keeps its id, letters, vowels and word; it only gains an on-ramp pointer and sub-steps; r02-r05 untouched in shape', () => {
  assert.equal(r01.onramp, '/firstday');
  assert.deepEqual(r01.steps.map((s) => s.id), ['r01.1', 'r01.2', 'r01.3', 'r01.4', 'r01.5']);
  assert.deepEqual(r01.letters, ['shin', 'bet']); assert.deepEqual(r01.vowels, ['kamatz', 'patach', 'shin-dot']); assert.equal(r01.words.length, 1);
  for (const id of ['r02', 'r03', 'r04', 'r05']) { assert.ok(byId[id]); assert.equal(byId[id].steps, undefined); }
  assert.equal(lessons.filter((l) => l.onramp).length, 1);
});

test('integrity checker catches a word before its letters, a 3-question check and a 5-minute step', () => {
  const bad = structuredClone(onramp); [bad.steps[0], bad.steps[4]] = [bad.steps[4], bad.steps[0]];
  assert.ok(O.checkOnramp(bad, { lesson: r01, letters: content.letters, vowels: content.vowels }).some((p) => /not yet taught/.test(p)));
  const big = structuredClone(onramp); big.steps[0].check.max = 3; big.steps[1].minutes = 5;
  const probs = O.checkOnramp(big, { lesson: r01 });
  assert.ok(probs.some((p) => /check.max/.test(p)) && probs.some((p) => /2 minutes/.test(p)));
});

test('model: progress migrates, wins accumulate once, next step is named, done after five', () => {
  assert.equal(O.migrateProgress(null).part, 'onramp');
  const legacy = O.migrateProgress({ step: 3, readWords: ['shalom'], checkCorrect: null, done: false });
  assert.equal(legacy.part, 'preview'); assert.equal(legacy.previewStep, 3); assert.deepEqual(legacy.readWords, ['shalom']);
  assert.equal(O.migrateProgress({ step: 0, readWords: [], checkCorrect: null, done: false }).part, 'onramp');
  let p = O.emptyOnramp();
  p = O.winStep(p, onramp, 'shin'); p = O.winStep(p, onramp, 'shin');
  assert.deepEqual(p.wins, ['shin']); assert.equal(p.step, 1); assert.equal(p.next.n, 2); assert.match(p.next.title, /Bet/); assert.equal(p.done, false);
  for (const id of ['bet', 'kamatz', 'sha', 'shav']) p = O.winStep(p, onramp, id);
  assert.equal(O.onrampDone(onramp, p), true); assert.equal(p.done, true); assert.equal(p.next, null);
  assert.equal(O.migrateProgress(p).wins.length, 5);
});

test('step questions: letters reuse r01 quick-check questions (same card ids), never more than 2; pick checks have one right answer', () => {
  const qs = buildChoiceQuestions(r01, { ...content, wordPool: lessons.flatMap((l) => l.words) }, { seed: 1 });
  const byStep = onramp.steps.map((s) => O.stepQuestions(s, qs));
  assert.ok(byStep.every((q) => q.length >= 1 && q.length <= 2));
  assert.deepEqual(byStep[0].map((q) => q.cardId), ['letter:shin', 'letter:shin']);
  assert.deepEqual(byStep[4].map((q) => q.cardId), ['word:r01:1']);
  assert.equal(byStep[2][0].kind, 'pick'); assert.equal(byStep[2][0].options.length, 2); assert.equal(byStep[2][0].answerIndex, 0);
});

test('tradition: tav differs between Ashkenazi and Israeli, and so does the first word respelling and the kamatz wording', () => {
  const tav = content.consonants.get('tav');
  const a = F.letterSound(tav, 'ashkenazi', { fallbackEn: 'x' }).en, i = F.letterSound(tav, 'israeli', { fallbackEn: 'x' }).en;
  assert.notEqual(a, i); assert.match(a, /\bs\b/); assert.match(i, /\bt\b/);
  assert.notEqual(F.respell(onramp.steps[4].he, 'ashkenazi'), F.respell(onramp.steps[4].he, 'israeli'));
  assert.equal(F.respell(onramp.steps[4].he, 'israeli'), 'shav');
  assert.notEqual(F.vowelSound(content.vowels.get('kamatz'), 'ashkenazi').en, F.vowelSound(content.vowels.get('kamatz'), 'israeli').en);
});

// ---------- the flow in a fake DOM ----------
const { mount } = await import('../src/firstday/firstday.view.js');
const ctxFor = (store, extra = {}) => ({ store, t: (k) => k, hasRoute: () => true, rng: () => 0.3, settings: { get: (k) => ({ congregation: extra.congregation || 'ashkenazi' })[k] },
  audio: { play: async () => ({ source: 'tts-fallback' }), extend() {} }, firstdayData: { first10, ladder, onramp, content, lessons }, query: extra.query || {} });
const btns = (root, re) => root.queryAll('button').filter((b) => re.test(b.textContent));
const h2 = (root) => root.queryAll('h2')[0]?.textContent || '';

test('flow: one screen per step, one letter first, the check opens Next, five wins credit r01 and name the next lesson', async () => {
  const store = memStore(); const root = new N('div'); const un = mount(root, ctxFor(store));
  await waitFor(() => /Step 1 of 5/.test(root.textContent));
  assert.match(h2(root), /Shin/);
  assert.equal(root.queryAll('.alef-huge').length, 1, 'exactly one big Hebrew glyph on the screen');
  assert.equal(root.queryAll('.alef-huge')[0].textContent, content.letters.get('shin').he);
  assert.ok(root.queryAll('a').some((a) => a.attrs.href === '#/letters/shin'), 'Trace it link');
  assert.ok(root.queryAll('details').some((d) => /Why\?/.test(d.textContent)), 'memory hook is behind Why?');
  assert.ok(root.queryAll('details').some((d) => /Spot It/.test(d.textContent)), 'Spot It is optional, inside Why?');
  assert.ok(!/Bet|Lamed|Vav/.test(root.queryAll('h2')[0].textContent));
  assert.equal(btns(root, /^Next$/).length, 0, 'Next waits for the check');
  assert.match(root.textContent, /Ashkenazi/);
  // app-style player: learn screen -> Continue -> each question on its own screen (pick a card, Check, then Continue / Got it)
  const byId = (id) => root.queryAll('button').find((b) => b.getAttribute('id') === id);
  for (let step = 1; step <= 5; step++) {
    await waitFor(() => new RegExp(`Step ${step} of 5`).test(root.textContent));
    await waitFor(() => byId('fd-continue'), { timeout: 4000, message: 'learn screen Continue' });
    await byId('fd-continue').click(); await tick(40);
    for (let guard = 0; guard < 4; guard++) {
      if (byId('fd-continue') && new RegExp(`Step ${step + 1} of 5`).test(root.textContent)) break;
      if (/Five wins/.test(root.textContent)) break;
      const check = byId('fd-check');
      if (check) {
        assert.ok('disabled' in check.attrs, 'Check stays grey until a card is picked');
        const opts = root.queryAll('.fd-check button').filter((b) => !('disabled' in b.attrs));
        assert.ok(opts.length >= 2 && opts.length <= 3, 'a check has 2 or 3 choices');
        await opts[0].click(); await tick(20);
        assert.ok(!('disabled' in byId('fd-check').attrs), 'picking a card turns Check on');
        await byId('fd-check').click(); await tick(40);
      }
      const nextQ = byId('fd-next-q'), next = byId('fd-next');
      if (next) { assert.match(root.textContent, new RegExp(`Win ${step} of 5`)); await next.click(); await tick(60); break; }
      if (nextQ) { await nextQ.click(); await tick(40); continue; }
    }
  }
  await waitFor(() => /Five wins/.test(root.textContent));
  const prog = store.m['firstday.progress'];
  assert.equal(prog.wins.length, 5); assert.equal(prog.done, true); assert.equal(prog.v, 2);
  assert.ok(store.m['curriculum.progress']?.completed?.r01, 'r01 completed by the on-ramp');
  assert.ok(Object.keys(store.m['srs.cards'] || {}).some((id) => id === 'letter:shin'), 'review cards exist');
  assert.ok(store.m.streak?.last, 'day credited');
  const next = root.queryAll('a').find((a) => a.attrs.id === 'fd-next-lesson');
  assert.equal(next.attrs.href, '#/learn?lesson=r02');
  assert.ok(root.queryAll('a').some((a) => a.attrs.href === '#/firstday?part=preview'), 'preview of shalom offered');
  un();
});

test('flow: a legacy record mid-way keeps the older flow; ?part=preview opens it; the preview shows tradition respellings', async () => {
  const store = memStore({ 'firstday.progress': { step: 3, readWords: [], checkCorrect: null, done: false } });
  const root = new N('div'); const un = mount(root, ctxFor(store));
  await waitFor(() => /Preview\. Step 4 of 8/.test(root.textContent));
  assert.match(root.textContent, /Ashkenazi style/);
  un();
  const root2 = new N('div'); const un2 = mount(root2, ctxFor(memStore(), { query: { part: 'preview' } }));
  await waitFor(() => /Preview\. Step 1 of 8/.test(root2.textContent));
  un2();
});

test('Today card: first recommendation is the first letter, then counts wins, then the next lesson after the on-ramp', async () => {
  const T = await import('../src/home/today.js');
  const base = (o = {}) => ({ completedIds: [], lessons, goal: 'read', dueCount: 0, streak: { count: 0 }, hasRoute: () => true, ...o });
  assert.equal(T.buildToday(base()).primary.label, 'Learn your first letter: Shin (2 min)');
  const mid = T.buildToday(base({ firstday: { v: 2, wins: ['shin', 'bet'], next: { n: 3, title: 'Your first vowel mark: the small T', minutes: 2 } } }));
  assert.equal(mid.primary.href, '#/firstday'); assert.match(mid.primary.label, /step 3 of 5/);
  assert.match(T.renderToday(mid, (k) => k).textContent, /2 of 5 wins/);
  const after = T.buildToday(base({ completedIds: ['r01'], firstday: { v: 2, wins: ['shin', 'bet', 'kamatz', 'sha', 'shav'], done: true } }));
  assert.equal(after.primary.href, '#/learn?lesson=r02');
  // a learner with study time but no lesson is sent to the on-ramp, not the full r01 page; placement learners keep the page
  assert.equal(T.buildToday(base({ streak: { count: 1, best: 1 } })).primary.href, '#/firstday');
  assert.equal(T.buildToday(base({ onboarding: { start: '/placement' }, placement: { result: { lesson: 'r01' } } })).primary.href, '#/learn?lesson=r01');
});

test('lesson page: r01 quick check is capped at 2 per sub-step and the page links to the on-ramp', async () => {
  const { sizeQuickCheck, MAX_PER_STEP } = await import('../src/curriculum/lesson.view.js');
  assert.equal(MAX_PER_STEP, 2);
  const qs = Array.from({ length: 30 }, (_, i) => ({ id: 'q' + i }));
  assert.equal(sizeQuickCheck(qs, r01).length, 10); assert.equal(sizeQuickCheck(qs, byId.r02).length, 30);
  const src = readFileSync(join(root, 'src/curriculum/lesson.view.js'), 'utf8');
  assert.match(src, /alef-onramp-link/); assert.match(src, /Why\? Remember it/);
});

test('docs: ONRAMP.md exists, names the limits, and its screenshots exist and carry no metadata', () => {
  const doc = readFileSync(join(root, 'docs/onramp/ONRAMP.md'), 'utf8');
  assert.match(doc, /scripted/i); assert.match(doc, /not .*real learner/i);
  const shots = [...doc.matchAll(/docs\/onramp\/[\w-]+\/[\w.-]+\.jpg/g)].map((m) => m[0]);
  assert.ok(shots.length >= 4);
  for (const s of new Set(shots)) assert.ok(existsSync(join(root, s)), 'missing ' + s);
  for (const dir of ['before', 'after']) for (const f of readdirSync(join(root, 'docs/onramp', dir)).filter((f) => f.endsWith('.jpg'))) {
    const b = readFileSync(join(root, 'docs/onramp', dir, f));
    assert.equal(b.indexOf(Buffer.from('Exif')), -1, f + ' has an EXIF block'); assert.equal(b.indexOf(Buffer.from('http://ns.adobe.com/xap')), -1, f + ' has XMP');
  }
});

test('first day follows the chosen tradition: a style line before step 1, and the Hear result never calls the Israeli device voice Ashkenazi', async () => {
  const store = memStore(); const root = new N('div'); const un = mount(root, ctxFor(store));
  await waitFor(() => /Step 1 of/.test(root.textContent), { message: 'step 1 never rendered' });
  const style = root.queryAll('p').find((p) => p.getAttribute('id') === 'fd-style');
  assert.ok(style, 'style line present');
  assert.match(style.textContent, /Reading style: Ashkenazi\./);
  assert.equal(style.getAttribute('data-audio-support'), 'none');
  assert.match(style.textContent, /Ashkenazi way to say it is written in English letters/);
  const hear = btns(root, /Hear it/)[0]; assert.ok(hear);
  await hear.fire('click');
  await waitFor(() => /browser voice/.test(root.queryAll('div').find((d) => d.getAttribute('id') === 'fd-status')?.textContent || ''), { message: 'no play line' });
  assert.match(root.textContent, /It speaks Israeli Hebrew, not Ashkenazi/);
  un?.();
});
