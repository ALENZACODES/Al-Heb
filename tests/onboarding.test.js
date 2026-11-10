import test from 'node:test';
import assert from 'node:assert/strict';
import { N, btn, memStore } from './torahread.fakedom.js';
import { waitFor } from './helpers/waitfor.js'; // fake DOM: checks view logic, not browser rendering
const M = await import('../src/onboarding/model.js');
const { loadOnboardingData } = await import('../src/onboarding/loader.js');
const { matchRoute, ROUTES } = await import('../src/shell/router.js');
const { createSettings, ENUMS } = await import('../src/shell/settings.js');
const { mount, DRAFT_NOTE } = await import('../src/onboarding/firstrun.view.js');
const D = await loadOnboardingData();
const read = D.lessons.filter((l) => l.track === 'read');
const lessonIds = new Set(D.lessons.map((l) => l.id));
const routeOf = (href) => matchRoute(href).route;

// ---------- Stage 1 model ----------
test('stage 1: five reading levels map to the agreed routes and are stored under onboarding.v1', () => {
  assert.equal(M.STORE_KEY, 'onboarding.v1');
  assert.deepEqual(M.LETTER_ANSWERS.map((a) => [a.label, a.start]), [
    ['Starting from zero — I do not know the letters', '/firstday'], ['I recognize some letters', '/placement'], ['I know the letters, but cannot read words yet', '/placement'], ['I can read simple words with vowel marks', '/placement'], ['I can read words and sentences comfortably', '/placement']]);
  for (const a of M.LETTER_ANSWERS) assert.equal(routeOf('#' + a.start)?.name, a.start.slice(1));
  const r = M.answerLetters(null, 'none', '2026-11-04T00:00:00.000Z');
  assert.equal(r.v, 1); assert.equal(r.letters, 'none'); assert.equal(r.start, '/firstday'); assert.equal(r.step, 'congregation');
  assert.equal(M.asked(r), true); assert.equal(M.asked(null), false); assert.equal(M.asked({ v: 1, letters: 'nope' }), false);
  assert.throws(() => M.answerLetters(null, 'maybe', ''));
  const again = M.answerLetters({ ...r, denomination: 'reform', minutesPerDay: 15 }, 'some', 'x');
  assert.equal(again.start, '/placement'); assert.equal(again.denomination, 'reform'); assert.equal(again.minutesPerDay, 15);
  assert.equal(M.normalize({ v: 1, letters: 'vowels', denomination: 'other', minutesPerDay: -3, step: 'bogus' }).denomination, null);
});

// ---------- Stage 2 model ----------
test('stage 2: pronunciation ids are the existing congregation setting values; every option has a plain explanation', () => {
  assert.deepEqual(M.PRONUNCIATIONS.map((p) => p.id).sort(), [...ENUMS.congregation].sort());
  assert.equal(M.SETTINGS_KEY_PRONUNCIATION, 'congregation');
  assert.deepEqual(M.DENOMINATIONS.map((d) => d.label), ['Reform', 'Conservative', 'Reconstructionist', 'Orthodox']);
  assert.deepEqual(M.PRONUNCIATIONS.map((p) => p.label), ['Sephardi', 'Ashkenazi', 'Israeli']);
  for (const o of [...M.DENOMINATIONS, ...M.PRONUNCIATIONS]) { assert.ok(o.changes.length > 20, o.id); assert.ok(!/\n/.test(o.changes), o.id); }
  assert.equal(M.suggestedPronunciation('reform'), 'sephardi'); assert.equal(M.suggestedPronunciation('orthodox'), null);
});

// ---------- Stage 3 data + model ----------
test('plans.json: draft-flagged, every href is a real route, every lesson reference exists', () => {
  assert.equal(D.plans.status, 'draft');
  assert.ok(D.plans.minutesOptions.includes(D.plans.defaultMinutes));
  assert.ok(lessonIds.has(D.plans.firstLesson));
  for (const s of Object.values(D.plans.starts)) { assert.equal(routeOf(s.href)?.name, s.route, s.href); assert.ok(ROUTES.some((r) => r.name === s.route)); }
  for (const e of D.plans.extras) { assert.equal(routeOf(e.href)?.name, e.route, e.href); assert.ok(lessonIds.has(e.minLesson), e.id); assert.ok(e.minutes > 0); }
  assert.equal(routeOf(D.plans.review.href)?.name, 'learn');
  assert.equal(D.plans.dayLabels.length, 7);
});
const rec = (letters, minutes = 10, extra = {}) => ({ v: 1, letters, start: M.answerById(letters).start, askedAt: 'x', denomination: null, minutesPerDay: minutes, step: 'plan', ...extra });
const placement = (lesson) => ({ v: 1, draft: true, answers: [], result: { lesson, asked: 12, correct: 9 } });
test('buildPlan: 7 days, day 1 is the starting point, every item links to an existing route', () => {
  const p = M.buildPlan({ record: rec('none'), lessons: D.lessons, plans: D.plans, firstdayDone: false });
  assert.equal(p.days.length, 7); assert.equal(p.draft, true); assert.equal(p.minutesPerDay, 10);
  assert.equal(p.days[0].items[0].href, '#/firstday'); assert.equal(p.days[0].items[0].kind, 'start');
  // day 1 is the first 10 minutes alone (it fills a 10-minute goal); lessons follow one a day, in the order the Today card follows
  assert.ok(!p.days[0].items.some((i) => i.kind === 'lesson')); assert.equal(p.days[1].items[0].lesson, 'r01'); assert.equal(p.days[2].items[0].lesson, 'r02');
  for (const href of M.planHrefs(p)) assert.ok(routeOf(href), href);
  for (const d of p.days) { assert.ok(d.items.length >= 1, d.label); assert.equal(d.minutes, d.items.reduce((a, i) => a + i.minutes, 0)); }
  assert.equal(p.days[6].items[0].kind, 'review');
  assert.equal(p.source, 'default');
});
test('buildPlan: "some" without a placement result starts with the check and says the lessons are a placeholder', () => {
  const p = M.buildPlan({ record: rec('some'), lessons: D.lessons, plans: D.plans });
  assert.equal(p.days[0].items[0].href, '#/placement'); assert.match(p.note, /placeholder/);
  assert.equal(p.startLesson, 'r01');
});
test('buildPlan: a placement result moves the start lesson and drops the check; unknown lessons are ignored', () => {
  const before = read.slice(0, read.findIndex((l) => l.id === 'r07')).map((l) => l.id); // lessons that unlock r07 when done
  const p = M.buildPlan({ record: rec('vowels', 20), placement: placement('r07'), lessons: D.lessons, plans: D.plans, completed: before });
  assert.equal(p.source, 'placement'); assert.equal(p.startLesson, 'r07');
  const lockedPlan = M.buildPlan({ record: rec('vowels', 20), placement: placement('r07'), lessons: D.lessons, plans: D.plans });
  assert.equal(lockedPlan.startLesson, 'r01'); assert.match(lockedPlan.note, /locked until earlier lessons/);
  assert.ok(!M.planHrefs(p).includes('#/placement'));
  assert.equal(p.days[0].items[0].lesson, 'r07');
  const bad = M.buildPlan({ record: rec('vowels', 20), placement: placement('zzz'), lessons: D.lessons, plans: D.plans });
  assert.equal(bad.startLesson, 'r01'); assert.match(bad.note, /placeholder/);
  const israelOnly = M.placementLesson(placement(D.lessons.find((l) => l.track === 'israel')?.id || 'i01'), read);
  assert.equal(israelOnly, null);
});
test('buildPlan: minutes split long lessons into at most 4 parts; one lesson part per day; 30 minutes adds extras', () => {
  const five = M.buildPlan({ record: rec('vowels', 5), placement: placement('r01'), lessons: D.lessons, plans: D.plans });
  const parts = five.days.flatMap((d) => d.items.filter((i) => i.kind === 'lesson'));
  assert.ok(parts.every((i) => i.parts <= D.plans.lessonSplitMaxParts && i.part <= i.parts));
  assert.ok(five.days.every((d) => d.items.filter((i) => i.kind === 'lesson').length <= 1));
  assert.equal(parts[0].lesson, 'r01'); assert.ok(parts.every((i) => i.parts === 1)); assert.notEqual(parts[1].lesson, parts[0].lesson); // lessons are not split: Today completes a lesson in one press
  const thirty = M.buildPlan({ record: rec('vowels', 30), placement: placement('r10'), lessons: D.lessons, plans: D.plans });
  assert.ok(thirty.days.some((d) => d.items.some((i) => i.kind === 'extra')));
  for (const d of thirty.days) assert.ok(d.minutes <= 30 + 9, d.label); // never more than one over-budget lesson part
  const extras = thirty.days.flatMap((d) => d.items.filter((i) => i.kind === 'extra'));
  for (const e of extras) { const def = D.plans.extras.find((x) => x.href === e.href); assert.ok(read.findIndex((l) => l.id === def.minLesson) <= read.findIndex((l) => l.id === 'r10') + 7, e.title); }
});
test('buildPlan: hasRoute hides screens missing from the build; no record gives no plan', () => {
  const p = M.buildPlan({ record: rec('none', 30), lessons: D.lessons, plans: D.plans, hasRoute: (n) => n === 'learn' });
  assert.ok(M.planHrefs(p).every((h) => h.startsWith('#/learn')), M.planHrefs(p).join(' '));
  assert.equal(M.buildPlan({ record: null, lessons: D.lessons, plans: D.plans }), null);
});

// ---------- view ----------
const mk = (init = {}, settingsInit = {}) => {
  const root = new N('div'); const store = memStore(); Object.assign(store.m, JSON.parse(JSON.stringify(init)));
  const sstore = memStore(); sstore.m.settings = { ...settingsInit };
  const settings = createSettings(sstore);
  const routed = [];
  const ctx = { store, settings, t: (k) => k, route: (p) => routed.push(p), hasRoute: () => true, onboardingData: D, clock: { now: () => 1_800_000_000_000 } };
  return { root, store, settings, ctx, routed };
};
const card0Text = (root) => root.querySelector('section.ob-plan').textContent;
const radios = (root, name) => root.queryAll(`input[name="${name}"]`);
const labelFor = (root, id) => root.queryAll(`label[for="${id}"]`)[0];
const check = async (root, name, value) => { // mimic the browser: the picked radio becomes checked, then change fires
  const i = root.queryAll(`input[name="${name}"][value="${value}"]`)[0]; assert.ok(i, `${name}=${value}`);
  for (const o of root.queryAll(`input[name="${name}"]`)) o.checked = o === i;
  await i.fire('change'); return i; };
const ready = (root) => waitFor(() => !/Loading/.test(root.textContent) && (root.querySelector('#ob-start') || root.querySelector('fieldset') || /did not load/.test(root.textContent)), { message: 'onboarding view never finished rendering' });
const submit = (root, formId) => root.querySelector('#' + formId).fire('submit');
const statusText = (root) => root.querySelector('#ob-status').textContent;

test('view, first run: the letters question with five labelled radios; Continue without an answer saves nothing', async () => {
  const { root, store, settings, ctx } = mk();
  mount(root, ctx); await ready(root);
  assert.equal(root.querySelector('#view-title').textContent.replace(/\s+/g, ' ').trim(), 'Welcome to ALEF אלף'); // t() returned the key, so the English fallback is used
  assert.match(root.textContent, /How much Hebrew can you read today\?/);
  const rs = radios(root, 'letters');
  assert.deepEqual(rs.map((r) => r.attrs.value), ['none', 'some', 'letters', 'vowels', 'sentences']);
  for (const r of rs) { const l = labelFor(root, r.attrs.id); assert.ok(l, r.attrs.id); assert.ok(l.textContent.length > 3); }
  const labels = rs.map((r) => labelFor(root, r.attrs.id).textContent);
  assert.ok(labels.every((label, i) => label.startsWith(M.LETTER_ANSWERS[i].label)));
  assert.equal(root.queryAll('fieldset legend').length, 2, 'reading level then learning goal');
  assert.match(root.textContent, /What would you like to use Hebrew for\?/);
  assert.deepEqual(radios(root, 'goal').map((r) => r.attrs.value), ['read', 'israel', 'both']);
  assert.ok(radios(root, 'goal')[0].attrs.checked !== undefined && radios(root, 'goal')[0].attrs.checked !== null, 'the current goal (read by default) is preselected');
  await submit(root, 'ob-form-letters');
  assert.match(statusText(root), /Choose one answer/);
  assert.equal(store.m[M.STORE_KEY], undefined); assert.equal(settings.get('onboarded'), false);
  assert.equal(globalThis.__focus?.attrs.id, 'ob-letters-none');
});
test('view: "No" stores onboarding.v1 with start /firstday, marks onboarded, and moves on to the synagogue step', async () => {
  const { root, store, settings, ctx } = mk();
  mount(root, ctx); await ready(root);
  await check(root, 'letters', 'none'); await submit(root, 'ob-form-letters');
  const saved = store.m[M.STORE_KEY];
  assert.equal(saved.letters, 'none'); assert.equal(saved.start, '/firstday'); assert.equal(saved.askedAt, '2027-01-15T08:00:00.000Z');
  assert.equal(settings.get('onboarded'), true);
  assert.ok(root.querySelector('#ob-form-congregation'));
  assert.equal(globalThis.__focus?.attrs.id, 'view-title');
  assert.match(root.querySelector('#ob-skip-now').attrs.href, /^#\/firstday$/);
});
test('view: "Some" and "Yes, I can read with vowel marks" both lead to #/placement', async () => {
  for (const v of ['some', 'letters', 'vowels', 'sentences']) {
    const { root, store, ctx } = mk();
    mount(root, ctx); await ready(root);
    await check(root, 'letters', v); await submit(root, 'ob-form-letters');
    assert.equal(store.m[M.STORE_KEY].start, '/placement');
    assert.equal(root.querySelector('#ob-skip-now').attrs.href, '#/placement');
  }
});
test('view, stage 2: Reform suggests Sephardi; an explicit Ashkenazi pick is written to the congregation setting; Orthodox suggests nothing', async () => {
  const { root, store, settings, ctx } = mk({ [M.STORE_KEY]: rec('none', null, { step: 'congregation' }) });
  mount(root, ctx); await ready(root);
  assert.ok(!root.querySelector('#ob-form-letters'), 'the question is not asked again');
  assert.deepEqual(radios(root, 'denomination').map((r) => r.attrs.value), ['reform', 'conservative', 'reconstructionist', 'orthodox']);
  assert.deepEqual(radios(root, 'pron').map((r) => r.attrs.value), ['sephardi', 'ashkenazi', 'israeli']);
  for (const o of [...M.DENOMINATIONS, ...M.PRONUNCIATIONS]) assert.ok(root.textContent.includes(o.changes), o.id);
  await check(root, 'denomination', 'reform');
  assert.match(statusText(root), /Suggested pronunciation: Sephardi/);
  assert.equal(root.queryAll('input[name="pron"][value="sephardi"]')[0].checked, true);
  await check(root, 'denomination', 'orthodox');
  assert.match(statusText(root), /Orthodox congregations vary/);
  await check(root, 'pron', 'ashkenazi');
  await check(root, 'denomination', 'reform'); // a later suggestion must not override an explicit pick
  assert.equal(root.queryAll('input[name="pron"][value="ashkenazi"]')[0].checked, true);
  await submit(root, 'ob-form-congregation');
  assert.equal(settings.get('congregation'), 'ashkenazi');
  assert.equal(store.m[M.STORE_KEY].denomination, 'reform');
  assert.equal(store.m[M.STORE_KEY].step, 'plan', 'Continue goes straight to the plan card; minutes and goal keep their defaults');
  assert.ok(root.querySelector('#ob-start'));
});
test('view, stage 2: Skip leaves the pronunciation setting untouched', async () => {
  const { root, settings, ctx } = mk({ [M.STORE_KEY]: rec('some', null, { step: 'congregation' }) }, { congregation: 'israeli' });
  mount(root, ctx); await ready(root);
  await check(root, 'denomination', 'conservative');
  await root.querySelector('#ob-congregation-skip').click();
  assert.equal(settings.get('congregation'), 'israeli');
  assert.ok(root.querySelector('#ob-start'));
  assert.ok(root.querySelector('#ob-change-minutes'), 'minutes stay reachable from the plan card');
});
test('view, stage 3: minutes choice builds the week card; links are real routes; start button goes to the stage 1 route', async () => {
  const { root, store, ctx } = mk({ [M.STORE_KEY]: rec('none', null, { step: 'minutes' }) });
  mount(root, ctx); await ready(root);
  assert.deepEqual(radios(root, 'minutes').map((r) => Number(r.attrs.value)), D.plans.minutesOptions);
  assert.equal(radios(root, 'minutes').find((r) => r.attrs.checked === '')?.attrs.value, String(D.plans.defaultMinutes));
  await check(root, 'minutes', '15'); await submit(root, 'ob-form-minutes');
  assert.equal(store.m[M.STORE_KEY].minutesPerDay, 15); assert.equal(store.m[M.STORE_KEY].step, 'plan');
  assert.equal(store.m['onboarding.v1.dailyGoal'], 15, 'minutes chosen here are the Today card study goal');
  assert.match(card0Text(root), /one lesson a day/);
  const card = root.querySelector('section.ob-plan');
  assert.ok(card); assert.ok(card.textContent.includes(DRAFT_NOTE));
  assert.equal(card.queryAll('ol.ob-days li strong').length, 7);
  for (const a of card.queryAll('a')) assert.ok(routeOf(a.attrs.href), a.attrs.href);
  assert.equal(root.querySelector('#ob-start').attrs.href, '#/firstday');
  assert.match(root.querySelector('#ob-start').textContent, /Your first 10 minutes/);
  assert.match(card.textContent, /15 minutes a day/);
});
test('view, plan: a placement result changes the start button to the recommended lesson and rebuilds the card', async () => {
  const done = Object.fromEntries(read.slice(0, read.findIndex((l) => l.id === 'r07')).map((l) => [l.id, 1]));
  const { root, ctx } = mk({ [M.STORE_KEY]: rec('vowels', 10), [M.PLACEMENT_KEY]: placement('r07'), 'curriculum.progress': { completed: done } });
  mount(root, ctx); await ready(root);
  assert.equal(root.querySelector('#ob-start').attrs.href, '#/learn?lesson=r07');
  assert.match(root.querySelector('section.ob-plan').textContent, /Lessons start at r07/);
  assert.ok(!root.querySelector('section.ob-plan').queryAll('a').some((a) => a.attrs.href === '#/placement'));
});
test('view, return visit: never re-asks by itself; "Change my starting point" re-asks and rewrites the record', async () => {
  const { root, store, ctx } = mk({ [M.STORE_KEY]: rec('none', 10) });
  mount(root, ctx); await ready(root);
  assert.ok(!root.querySelector('#ob-form-letters'));
  const change = root.querySelector('#ob-change-start');
  assert.equal(change.attrs.type, 'button'); assert.match(change.textContent, /Change my starting point/);
  await change.click();
  assert.ok(root.querySelector('#ob-form-letters'));
  await btn(root, /Keep my current starting point/).click();
  assert.ok(root.querySelector('#ob-start'), 'back on the plan without changes');
  assert.equal(store.m[M.STORE_KEY].start, '/firstday');
  await root.querySelector('#ob-change-start').click();
  await check(root, 'letters', 'vowels'); await submit(root, 'ob-form-letters');
  assert.equal(store.m[M.STORE_KEY].start, '/placement'); assert.equal(store.m[M.STORE_KEY].minutesPerDay, 10, 'minutes kept');
});
test('view, accessibility: every radio has a label[for], every fieldset a legend, every button a type, one h1 and a live status', async () => {
  for (const init of [{}, { [M.STORE_KEY]: rec('none', null, { step: 'congregation' }) }, { [M.STORE_KEY]: rec('none', null, { step: 'minutes' }) }, { [M.STORE_KEY]: rec('none', 10) }]) {
    const { root, ctx } = mk(init);
    mount(root, ctx); await ready(root);
    for (const i of root.queryAll('input')) assert.ok(labelFor(root, i.attrs.id), 'label for ' + i.attrs.id);
    for (const f of root.queryAll('fieldset')) assert.equal(f.children[0].tag, 'legend');
    for (const b of root.queryAll('button')) assert.ok(['button', 'submit'].includes(b.attrs.type), b.textContent);
    assert.equal(root.queryAll('h1').length, 1);
    assert.equal(root.querySelector('#ob-status').attrs['aria-live'], 'polite');
    const ids = root.queryAll('[id]').map((n) => n.attrs.id); assert.equal(new Set(ids).size, ids.length, 'unique ids');
  }
});
test('view: when the plan data fails to load the learner can still start, and the failure is said', async () => {
  const { root, ctx } = mk({ [M.STORE_KEY]: rec('none', 10) });
  ctx.onboardingData = Promise.reject(new Error('boom'));
  mount(root, ctx); await ready(root);
  assert.equal(root.querySelector('#ob-start').attrs.href, '#/firstday');
  assert.match(root.textContent, /did not load/);
  assert.ok(!root.querySelector('section.ob-plan'));
});

test('view, plan: a locked placement result starts the week and the Start button at an open lesson', async () => {
  const { root, ctx } = mk({ [M.STORE_KEY]: rec('vowels', 10), [M.PLACEMENT_KEY]: placement('r13') });
  mount(root, ctx); await ready(root);
  assert.equal(root.querySelector('#ob-start').attrs.href, '#/learn?lesson=r01');
});

test('buildPlan: Israel goal plans israel-track lessons, no letters start, no read extras', () => {
  const p = M.buildPlan({ record: rec('vowels'), lessons: D.lessons, plans: D.plans, goal: 'israel' });
  const first = D.lessons.find((l) => l.track === 'israel');
  assert.equal(p.startLesson, first.id);
  assert.ok(p.days[0].items.every((i) => i.kind === 'lesson'));
  assert.ok(p.days.flatMap((d) => d.items).filter((i) => i.kind === 'lesson').every((i) => D.lessons.find((l) => l.id === i.lesson).track === 'israel'));
});

test('plan copy: the default note names the first lesson (not an id), and the goal line says goal vs lesson minutes', () => {
  const p = M.buildPlan({ record: rec('vowels'), lessons: D.lessons, plans: D.plans, goal: 'israel' });
  const first = D.lessons.find((l) => l.id === p.startLesson);
  assert.ok(p.note.includes(`"${first.title}"`), p.note); assert.doesNotMatch(p.note, /\b(il|r)\d\d\b/);
});
test('view, plan: an Israel goal starts with the lesson title, says so under "Starting point", and offers to change the goal', async () => {
  const { root, ctx } = mk({ [M.STORE_KEY]: rec('vowels', 10) }, { goal: 'israel' });
  mount(root, ctx); await ready(root);
  const first = D.lessons.find((l) => l.track === 'israel');
  assert.equal(root.querySelector('#ob-start').textContent, `Start: ${first.title}`);
  assert.equal(root.querySelector('#ob-start').attrs.href, '#/learn?lesson=' + first.id);
  assert.match(root.textContent, new RegExp(`Starting point: ${first.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.`));
  assert.match(root.querySelector('#ob-change-minutes').textContent, /goal or minutes/);
  assert.match(root.querySelector('section.ob-plan').textContent, /Your goal is 10 minutes a day\. Some lessons take longer than that: stop whenever you like, and the lesson opens where you stopped\./);
});

test('view, first screen goal: Israel sets Israeli pronunciation and skips the Sephardi/Ashkenazi step', async () => {
  const { root, store, settings, ctx } = mk();
  mount(root, ctx); await ready(root);
  await check(root, 'goal', 'israel'); await check(root, 'letters', 'none'); await submit(root, 'ob-form-letters');
  assert.equal(settings.get('goal'), 'israel'); assert.equal(settings.get('congregation'), 'israeli');
  assert.ok(!root.querySelector('#ob-form-congregation'), 'pronunciation step is skipped');
  assert.equal(store.m[M.STORE_KEY].step, 'plan');
  await waitFor(() => root.querySelector('#ob-start'));
  assert.match(root.textContent, /Israeli pronunciation/); assert.doesNotMatch(root.textContent, /Sephardi pronunciation/);
  assert.ok(root.querySelector('#ob-change-congregation'), 'still changeable');
});
test('view, first screen goal: community and both still ask the pronunciation question', async () => {
  for (const g of ['read', 'both']) {
    const { root, settings, ctx } = mk();
    mount(root, ctx); await ready(root);
    await check(root, 'goal', g); await check(root, 'letters', 'none'); await submit(root, 'ob-form-letters');
    assert.equal(settings.get('goal'), g);
    assert.ok(root.querySelector('#ob-form-congregation'), g);
    assert.equal(settings.get('congregation'), 'sephardi');
  }
});

test('view, stage 2: the sound line follows the picked pronunciation, and "Start without sound" turns audioFree on', async () => {
  const { root, settings, ctx } = mk({ [M.STORE_KEY]: rec('none', null, { step: 'congregation' }) }, { congregation: 'israeli' });
  mount(root, ctx); await ready(root);
  const note = () => root.querySelector('#ob-sound-note');
  assert.equal(note().getAttribute('data-audio-support'), 'device');
  assert.match(note().textContent, /Ari and Noa read every word aloud in Israeli Hebrew/);
  await check(root, 'pron', 'ashkenazi');
  // "Use my browser's voice anyway" is on by default: the line says the device voice will not sound Ashkenazi
  assert.equal(note().getAttribute('data-audio-support'), 'device-mismatch');
  assert.match(note().textContent, /No Ashkenazi audio yet.*Israeli Hebrew, so it will not sound Ashkenazi/);
  assert.doesNotMatch(note().textContent, /recorded teacher clips? (is|are) ready|Ashkenazi voice/i);
  const box = root.querySelector('#ob-silent'); box.checked = true; await box.fire('change');
  assert.equal(settings.get('audioFree'), true);
  assert.match(statusText(root), /Sound is off/);
  assert.equal(note().getAttribute('data-audio-support'), 'off');
});

test('new reading levels survive storage and include the reading check in their plans', () => {
  for (const level of ['letters', 'sentences']) {
    const saved = M.answerLetters(null, level, 'now');
    assert.equal(M.normalize(saved).letters, level);
    const plan = M.buildPlan({record: saved, lessons: D.lessons, plans: D.plans});
    assert.equal(plan.days[0].items[0].href, '#/placement');
  }
});

test('starting from zero always offers first letters, even with a speaking goal or an old placement result', async () => {
  for (const goal of ['read', 'israel', 'both']) {
    const saved = rec('none', 10);
    const p = M.buildPlan({record: saved, lessons: D.lessons, plans: D.plans, goal, placement: placement('r07')});
    assert.equal(p.days[0].items[0].href, '#/firstday');
    const {root, ctx} = mk({[M.STORE_KEY]: saved, [M.PLACEMENT_KEY]: placement('r07')}, {goal});
    mount(root,ctx); await ready(root);
    assert.equal(root.querySelector('#ob-start').attrs.href, '#/firstday');
  }
});

test('first step puts ability before purpose and explains the selected next activity', async () => {
  const {root, ctx} = mk(); mount(root,ctx); await ready(root);
  assert.equal(root.queryAll('fieldset legend')[0].textContent, M.LETTERS_QUESTION);
  await check(root, 'letters', 'none');
  assert.match(root.querySelector('#ob-next-step').textContent, /No placement check needed/);
  await check(root, 'letters', 'letters');
  assert.match(root.querySelector('#ob-next-step').textContent, /short reading check/);
  await check(root, 'goal', 'israel');
  assert.match(root.querySelector('#ob-next-step').textContent, /everyday words and phrases/);
});
