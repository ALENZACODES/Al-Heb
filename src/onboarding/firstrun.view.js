/**
 * First-run flow (#/welcome; the route line in src/shell/router.js points at src/shell/onboarding.view.js, which re-exports this).
 * DRAFT, untested with learners.
 *  Stage 1  "Can you already read the Hebrew letters?" -> saved once under store key onboarding.v1; never asked again by itself.
 *  Stage 2  denomination (onboarding.v1 only) + pronunciation (existing `congregation` setting) with one-line explanations.
 *  Stage 3  "Your week": a 7-day card built from the placement result (placement.v1, read only) and minutes per day.
 * A return visit shows the plan with "Change my starting point", which is the only way the Stage 1 question comes back.
 * Look (2026-11-10, first-minute pass): one question per screen, the way a learner meets an app for the first time. Stage 1 is
 * one form in three pages (reading level, goal, daily goal); Rimon asks each question in a speech bubble, a progress bar sits on
 * top, Back and Continue are pinned to the bottom, and the shell chrome (header, tabs, teachers band) is hidden (body.ob-player).
 * The fieldsets and legends stay in the page for screen readers; the form still submits all three answers at once.
 * ctx used: settings.get/set(patch), store.get/set, route, t, hasRoute. Test extras: ctx.onboardingData {plans, lessons}, ctx.clock.now.
 */
import { h, heSpan } from '../shell/ui.js';
import { loadOnboardingData } from './loader.js';
import { STORE_KEY, PLACEMENT_KEY, LETTERS_QUESTION, LETTER_ANSWERS, DENOMINATIONS, PRONUNCIATIONS, SETTINGS_KEY_PRONUNCIATION,
  GOAL_QUESTION, GOAL_CHOICES, normalize, answerLetters, setDenomination, setMinutes, setStep, suggestedPronunciation, answerById, placementLesson, buildPlan } from './model.js';
import { DAILY_GOAL_KEY, DAILY_GOALS, FIRSTDAY_PROGRESS_KEY as FIRSTDAY_KEY } from '../home/today.js';
import { PROGRESS_KEY } from '../curriculum/dom.js';
import { audioSupport } from '../pronunciation/forTradition.js';
import { isAudioFree } from '../shell/audiofree.js';
import { rimonSays } from '../shell/rimon-inline.js';

/** Daily goal choices on the first run (minutes are DAILY_GOALS values; 30 stays available under "Change goal or minutes a day"). */
export const DAILY_CHOICES = Object.freeze([
  { min: 5, label: 'Casual' }, { min: 10, label: 'Regular', note: 'A good place to start' },
  { min: 15, label: 'Serious' }, { min: 20, label: 'Intense' },
]);
export const DAILY_QUESTION = '3. How much time can you give each day?';
/** What Rimon says on each screen (the question itself, without its number, for sighted learners; the legend keeps it for screen readers). */
export const RIMON_LINES = Object.freeze({
  level: 'Shalom! I\u2019m Rimon. How much Hebrew can you read today?',
  goal: 'What brings you to Hebrew?',
  daily: 'How much time can you give each day?',
  congregation: 'Which way should your Hebrew sound?',
  minutes: 'Let\u2019s set your goal and your time.',
});
/** Screens in the first run, in order: the progress bar counts these. Israel skips the pronunciation screen. */
export const firstRunPages = (goal) => (goal === 'israel' ? ['level', 'goal', 'daily', 'plan'] : ['level', 'goal', 'daily', 'congregation', 'plan']);

export const DRAFT_NOTE = 'Draft: no learner has tried this plan yet. The minutes are goals, not measurements. The plan has one lesson a day and starts with the lesson shown on Home. It updates as you finish lessons.';

export function mount(root, ctx) {
  const { settings, store } = ctx;
  const t = (k, fb) => { try { const v = ctx.t?.(k); return v && v !== k ? v : fb; } catch { return fb; } };
  let alive = true, D = null, loadError = null;
  let rec = normalize(store.get(STORE_KEY));
  let step = rec ? rec.step : 'letters';
  let page = 'level'; // Stage 1 page: level | goal | daily
  const nowISO = () => new Date(ctx?.clock?.now ? ctx.clock.now() : Date.now()).toISOString();
  const h1 = h('h1', { id: 'view-title', tabindex: '-1', class: 'ob-title' }, t('welcome.title', 'Welcome to Aleph'), ' ', heSpan('אלף'));
  const body = h('div', { class: 'ob-body' });
  const status = h('p', { role: 'status', 'aria-live': 'polite', class: 'muted ob-status', id: 'ob-status' });
  // Top bar: Back (or close on the plan), then the progress bar for the first run.
  const meterFill = h('span', { class: 'ob-meter-fill' });
  const meter = h('div', { class: 'ob-meter', role: 'progressbar', 'aria-label': 'Setup progress', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, meterFill);
  const topSlot = h('span', { class: 'ob-top-slot' });
  const top = h('div', { class: 'ob-top' }, topSlot, meter);
  const card = h('article', { class: 'card onboarding ob-v2', 'data-stage': step }, top, h1, body, status);
  root.replaceChildren(card);
  const bodyEl = globalThis.document?.body;
  try { bodyEl?.classList?.add('ob-player'); } catch { /* minimal DOMs */ }
  const say = (m) => { status.textContent = m; };
  const focus = (n) => { try { n?.focus?.({ preventScroll: true }); } catch { try { n?.focus?.(); } catch { /* ignore */ } } };
  // A new screen starts at its top (the old one kept its scroll, so step 2 opened half-way down and the plan below its Start button).
  const toTop = () => { try { globalThis.scrollTo?.({ top: 0, behavior: 'instant' }); } catch { try { globalThis.scrollTo?.(0, 0); } catch { /* ignore */ } } };
  const save = () => { try { store.set(STORE_KEY, rec); } catch { /* best effort */ } };
  const go = (next) => { step = next; if (rec) { rec = setStep(rec, next); save(); } render(); toTop(); focus(h1); };
  const startHref = () => '#' + (rec?.start || '/firstday');
  const startTitle = () => (rec ? answerById(rec.letters)?.start === '/placement' ? 'Placement check' : 'Your first 10 minutes' : '');
  const setMeter = (name, goal) => {
    const pages = firstRunPages(goal ?? settings.get('goal'));
    const at = Math.max(0, pages.indexOf(name));
    const pct = name === 'plan' ? 100 : Math.round((at / (pages.length - 1)) * 100);
    meterFill.setAttribute('style', `inline-size:${pct}%`);
    meter.setAttribute('aria-valuenow', String(pct));
    meter.setAttribute('aria-valuetext', name === 'plan' ? 'Setup done' : `Question ${at + 1} of ${pages.length - 1}`);
    card.setAttribute('data-stage', step); card.setAttribute('data-page', name);
  };
  const backBtn = (onclick, label = 'Back') => h('button', { type: 'button', class: 'ob-back', id: 'ob-back', 'aria-label': label, onclick }, h('span', { 'aria-hidden': 'true' }, '‹'));
  const setTop = (node) => topSlot.replaceChildren(...(node ? [node] : []));
  const rimon = (line, action = 'wave') => rimonSays(line, { action, ariaHidden: true }).el;

  const radio = (name, value, label, desc, checked, onchange, lead = null) => {
    const id = `ob-${name}-${value}`;
    return h('label', { class: 'opt opt-block', for: id },
      h('input', { type: 'radio', name, id, value, checked: checked ? true : null, onchange: () => onchange(value) }),
      lead,
      h('span', {}, h('strong', {}, label), desc ? h('span', { class: 'muted block' }, desc) : null));
  };
  const fieldset = (legend, intro, ...kids) => h('fieldset', { class: 'field' }, h('legend', {}, legend), intro ? h('p', { class: 'muted' }, intro) : null, ...kids);
  const skipNow = () => h('p', { class: 'muted ob-skipnow' }, h('a', { href: startHref(), id: 'ob-skip-now' }, `Skip the rest and start now: ${startTitle()}`));
  const bars = (n) => h('span', { class: 'ob-bars', 'data-n': String(n), 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i'), h('i'));
  const icon = (id) => h('span', { class: `ob-ico ob-ico-${id}`, 'aria-hidden': 'true' });

  // Sound, said before the first lesson: what this pronunciation gets (no recorded clips exist yet) and a way to start silent.
  const supportOf = (pron) => audioSupport(pron, { browserVoiceAnyway: !!settings.get('browserVoiceAnyway'), audioFree: isAudioFree(ctx), recorded: ctx?.audio?.summary?.recorded || 0 });
  const soundNote = (pron) => h('p', { class: 'muted ob-sound', id: 'ob-sound-note', role: 'note', 'data-audio-support': supportOf(pron).supported }, supportOf(pron).line);
  const silentToggle = (onchange) => h('label', { class: 'opt opt-block', for: 'ob-silent' },
    h('input', { type: 'checkbox', id: 'ob-silent', checked: isAudioFree(ctx) ? true : null, onchange: (e) => {
      const on = !!e.target.checked;
      try { settings.set({ audioFree: on }); } catch { /* best effort */ }
      say(on ? 'Sound is off. Listen buttons are hidden and nothing needs hearing; turn it back on in Settings.' : 'Sound is on where your device can play it.');
      if (onchange) onchange(on);
    } }),
    h('span', {}, h('strong', {}, 'Start without sound'), h('span', { class: 'muted block' }, 'Every first-day step can be done by reading. Nothing is marked wrong for skipping sound.')));

  // ---- Stage 1: three pages in one form (level, goal, daily goal) ----
  function renderLetters() {
    let picked = rec && step === 'letters' && page !== 'level' ? rec.letters : null;
    const prevGoal = settings.get('goal') || null;
    let goal = GOAL_CHOICES.some((g) => g.id === prevGoal) ? prevGoal : 'read'; // preselected: the current setting (default read), so a learner who skips it gets the old flow
    let daily = DAILY_GOALS.includes(rec?.minutesPerDay) ? rec.minutesPerDay : 10; // 10 = the plan default (data/onboarding/plans.json)
    const next = h('p', { class: 'muted ob-next', id: 'ob-next-step', 'aria-live': 'polite' }, 'Choose the description that feels closest. You can change your starting point later.');
    const explainNext = () => {
      if (!picked) return;
      next.textContent = picked === 'none' ? 'Your starting activity: first letters and sounds. No placement check needed.'
        : goal === 'israel' ? 'Your plan starts with everyday words and phrases. You can also review reading skills through the reading check.'
        : 'Your starting activity: a short reading check to suggest where to begin. It is a guide, not an exam; you can choose an earlier lesson.';
    };
    explainNext();
    const levelFs = fieldset(LETTERS_QUESTION, 'Choose one. Vowel marks are the small dots and lines that help you pronounce Hebrew.' + (rec ? ' This replaces your saved starting point.' : ''),
      ...LETTER_ANSWERS.map((a, i) => radio('letters', a.id, a.label, a.desc, picked === a.id, (v) => {
        picked = v; levelNext.removeAttribute?.('aria-disabled'); levelNext.className = 'btn ob-cta';
        explainNext();
      }, bars(i + 1))));
    const goalFs = fieldset(GOAL_QUESTION, 'This is your goal, not your level. You can choose any goal as a beginner.', ...GOAL_CHOICES.map((g) => radio('goal', g.id, g.label, g.desc, goal === g.id, (v) => { goal = v; explainNext(); setMeter(page, goal); }, icon(g.id))));
    const dailyFs = fieldset(DAILY_QUESTION, 'Your streak counts any day you study 5 minutes or more. Change this any time.',
      ...DAILY_CHOICES.map((c) => radio('daily', String(c.min), `${c.min} minutes a day`, c.note ? `${c.label} · ${c.note}` : c.label, daily === c.min, (v) => { daily = Number(v); }, h('span', { class: 'ob-min', 'aria-hidden': 'true' }, String(c.min)))));
    const pageBox = (name, ...kids) => h('div', { class: 'ob-page', 'data-page': name }, rimon(RIMON_LINES[name], name === 'level' ? 'wave' : name === 'goal' ? 'point' : 'bounce'), ...kids);
    const levelNext = h('button', { type: 'button', class: picked ? 'btn ob-cta' : 'btn ob-cta is-waiting', id: 'ob-page-next', 'aria-disabled': picked ? null : 'true', onclick: () => nextPage() }, 'Continue');
    const goalNext = h('button', { type: 'button', class: 'btn ob-cta', id: 'ob-goal-next', onclick: () => nextPage() }, 'Continue');
    const form = h('form', { id: 'ob-form-letters', 'data-page': page, onsubmit: (e) => {
      e.preventDefault();
      // A real Enter key press on an early page moves to the next page; anything else (the last page, scripts, tests) submits all three answers.
      const real = typeof Event !== 'undefined' && e instanceof Event && e.isTrusted;
      if (real && page !== 'daily') { nextPage(); return; }
      submit();
    } },
      pageBox('level', levelFs, h('p', { class: 'muted' }, 'Not sure? Choose “Starting from zero” for a gentle introduction.')),
      pageBox('goal', goalFs),
      pageBox('daily', dailyFs),
      next,
      h('div', { class: 'ob-foot' },
        h('div', { class: 'ob-foot-page', 'data-page': 'level' }, levelNext, rec ? h('button', { type: 'button', class: 'btn secondary', onclick: () => go('plan') }, 'Keep my current starting point') : null),
        h('div', { class: 'ob-foot-page', 'data-page': 'goal' }, goalNext),
        h('div', { class: 'ob-foot-page', 'data-page': 'daily' }, h('button', { type: 'submit', class: 'btn ob-cta', id: 'ob-letters-continue' }, 'Continue'))));
    const showPage = (name) => {
      page = name; form.setAttribute('data-page', name); setMeter(name, goal);
      setTop(name === 'level' ? (rec ? backBtn(() => go('plan'), 'Back to my plan') : null) : backBtn(() => showPage(name === 'daily' ? 'goal' : 'level')));
      toTop();
      const first = form.querySelector(`.ob-page[data-page="${name}"] input:checked`) || form.querySelector(`.ob-page[data-page="${name}"] input`);
      if (name !== 'level') focus(first);
    };
    function nextPage() {
      if (page === 'level') {
        if (!picked) { askForLevel(); return; }
        say(''); showPage('goal'); return;
      }
      if (page === 'goal') { showPage('daily'); return; }
      submit();
    }
    function askForLevel() {
      // Said next to the button AND shown at the question, which is scrolled into view: the learner sees what is missing, not an unchanged page.
      say('Choose one answer to continue.');
      next.textContent = 'First, choose how much Hebrew you can read today (question 1, above). Not sure? Choose “Starting from zero”.';
      if (page !== 'level') showPage('level');
      const first = form.querySelector('#ob-letters-none');
      try { first?.closest?.('fieldset')?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }); } catch { /* old browsers */ }
      focus(first);
    }
    const submit = () => {
      if (!picked) { askForLevel(); return; }
      rec = answerLetters(rec, picked, nowISO());
      if (DAILY_GOALS.includes(daily)) { rec = { ...rec, minutesPerDay: daily }; try { store.set(DAILY_GOAL_KEY, daily); } catch { /* best effort */ } }
      save();
      const israelNow = goal === 'israel';
      const patch = { onboarded: true, goal };
      if (israelNow && prevGoal !== 'israel') patch[SETTINGS_KEY_PRONUNCIATION] = 'israeli'; // speaking in Israel: Israeli sounds, so the Sephardi/Ashkenazi question is not asked
      try { settings.set(patch); } catch { /* settings may be read-only in tests */ }
      say(`Saved. Your starting point is ${answerById(picked).start === '/placement' ? 'the placement check' : 'your first 10 minutes'}.${israelNow ? ' Israeli pronunciation is set; change it in Settings.' : ''}`);
      page = 'level';
      go(israelNow ? 'plan' : 'congregation');
    };
    body.replaceChildren(h('p', { class: 'ob-lede' }, 'Let’s find a comfortable place to begin. Tell us what you can read now, then choose what you want to learn.'), form,
      h('p', { class: 'muted ob-fine' }, 'Your answer is saved only on this device. ', h('a', { href: '#/how' }, 'How this works'), '. ', h('a', { href: '#/accessibility', id: 'ob-a11y-link' }, 'Accessibility options'), '.'));
    showPage(page);
  }

  // ---- Stage 2 ----
  function renderCongregation() {
    setMeter('congregation');
    setTop(backBtn(() => { page = 'daily'; go('letters'); }));
    let denom = rec.denomination, pron = settings.get(SETTINGS_KEY_PRONUNCIATION) || 'sephardi', pronPicked = false;
    const pronInputs = {};
    const setPronRadio = (v) => { for (const [id, input] of Object.entries(pronInputs)) { const on = id === v; input.checked = on; if (on) input.setAttribute('checked', ''); else input.removeAttribute?.('checked'); } };
    const onDenom = (v) => {
      denom = v;
      const s = suggestedPronunciation(v);
      if (s && !pronPicked) { pron = s; setPronRadio(s); refreshSound(); say(`Suggested pronunciation: ${PRONUNCIATIONS.find((p) => p.id === s).label}. Change it below if your synagogue differs.`); }
      else if (!s) say(DENOMINATIONS.find((d) => d.id === v).changes);
    };
    const denomFs = fieldset('Which branch of Judaism are you part of? (optional)', 'Optional. It does not change your lessons.',
      ...DENOMINATIONS.map((d) => radio('denomination', d.id, d.label, d.changes, denom === d.id, onDenom)));
    const denomMore = h('details', { class: 'ob-more' }, h('summary', {}, 'Optional: your branch of Judaism'), denomFs); // kept out of the first screen so Continue and Skip stay visible
    const pronFs = fieldset('Which pronunciation style do you want?', 'It changes the sounds you hear and read. Change it any time in Settings.',
      ...PRONUNCIATIONS.map((p) => { const l = radio('pron', p.id, p.label, p.changes, pron === p.id, (v) => { pron = v; pronPicked = true; refreshSound(); }); pronInputs[p.id] = l.querySelector(`#ob-pron-${p.id}`) || l.children?.[0]; return l; }));
    const note = soundNote(pron);
    const refreshSound = () => { const s2 = supportOf(pron); note.textContent = s2.line; note.setAttribute('data-audio-support', s2.supported); };
    const apply = () => {
      rec = setDenomination(rec, denom); save();
      const rejected = settings.set({ [SETTINGS_KEY_PRONUNCIATION]: pron });
      if (Array.isArray(rejected) && rejected.length) say('The pronunciation could not be saved; pick it again in Settings.');
      else say(`Saved: ${PRONUNCIATIONS.find((p) => p.id === pron)?.label || pron} pronunciation.`);
      go('plan'); // minutes a day and goal keep their defaults; "Change minutes a day" on the plan card (and Settings) change them
    };
    const soundBox = h('div', { class: 'field ob-sound-box' }, note, silentToggle(() => refreshSound()));
    const form = h('form', { id: 'ob-form-congregation', onsubmit: (e) => { e.preventDefault(); apply(); } }, rimon(RIMON_LINES.congregation, 'thinking'), pronFs, soundBox,
      skipNow(), denomMore,
      h('div', { class: 'ob-foot' }, h('div', { class: 'row' }, h('button', { type: 'submit', class: 'btn ob-cta', id: 'ob-congregation-continue' }, 'Continue'),
        h('button', { type: 'button', class: 'btn secondary', id: 'ob-congregation-skip', onclick: () => { say('Skipped. Pronunciation stays as it is; you can change it in Settings.'); go('plan'); } }, 'Skip'))));
    body.replaceChildren(form);
  }

  // ---- Stage 3: minutes ----
  function renderMinutes() {
    setMeter('daily');
    setTop(backBtn(() => go('plan'), 'Back to my plan'));
    if (!D) { body.replaceChildren(h('p', {}, loadError ? 'The plan did not load. You can still start.' : 'Loading...'), skipNow()); return; }
    const opts = D.plans.minutesOptions;
    let mins = rec.minutesPerDay || D.plans.defaultMinutes;
    let goal = settings.get('goal') || 'read';
    const goalFs = fieldset('What do you want Hebrew for?', 'This chooses which lessons your week and the Today card start with. You can change it later in Settings.',
      ...[['read', 'Reading the prayer book (siddur)', 'Letters, vowels and prayer lines.'], ['israel', 'Speaking in Israel', 'Everyday words and phrases.'], ['both', 'Both', 'Reading lessons first, speaking lessons alongside.']]
        .map(([id, label, d]) => radio('goal', id, label, d, goal === id, (v) => { goal = v; }, icon(id))));
    const fs = fieldset('How many minutes a day?', 'This is your own daily goal. Your week plan is one lesson a day.',
      ...opts.map((m) => radio('minutes', String(m), `${m} minutes`, '', mins === m, (v) => { mins = Number(v); }, h('span', { class: 'ob-min', 'aria-hidden': 'true' }, String(m)))));
    const form = h('form', { id: 'ob-form-minutes', onsubmit: (e) => { e.preventDefault(); rec = setMinutes(rec, mins, D.plans); save(); try { settings.set({ goal }); } catch { /* best effort */ } if (DAILY_GOALS.includes(rec.minutesPerDay)) { try { store.set(DAILY_GOAL_KEY, rec.minutesPerDay); } catch { /* best effort */ } } say(`Planned for ${rec.minutesPerDay} minutes a day. This is your study goal on Home; the streak counts a day at 5 minutes.`); go('plan'); } }, rimon(RIMON_LINES.minutes, 'point'), goalFs, fs,
      h('div', { class: 'ob-foot' }, h('div', { class: 'row' }, h('button', { type: 'submit', class: 'btn ob-cta', id: 'ob-minutes-continue' }, 'Show my week'))));
    body.replaceChildren(h('h2', {}, 'Your goal and time'), form, skipNow());
  }

  // ---- Stage 3: plan card ----
  function renderPlan() {
    setMeter('plan');
    setTop(h('a', { class: 'ob-back ob-close', href: '#/', id: 'ob-close', 'aria-label': 'Close and go to Home' }, h('span', { 'aria-hidden': 'true' }, '×')));
    const placement = store.get(PLACEMENT_KEY);
    // The plan says "N minutes a day"; Home's daily goal must say the same N, so a learner who skipped the minutes question gets the plan's default.
    try { const want = rec.minutesPerDay || D?.plans?.defaultMinutes; const had = store.get(DAILY_GOAL_KEY); if ((had === null || had === undefined) && DAILY_GOALS.includes(want)) store.set(DAILY_GOAL_KEY, want); } catch { /* best effort */ }
    let completed = []; try { completed = Object.keys(store.get(PROGRESS_KEY)?.completed || {}); } catch { /* none */ }
    let firstdayDone = false; try { const fd = store.get(FIRSTDAY_KEY); firstdayDone = !!(fd && (fd.done || (Array.isArray(fd.wins) && fd.wins.length >= 5))); } catch { /* none */ }
    const plan = D ? buildPlan({ record: rec, placement, lessons: D.lessons, plans: D.plans, hasRoute: ctx.hasRoute, completed, goal: settings.get('goal'), firstdayDone }) : null;
    const placed = rec.letters !== 'none' && plan && (plan.source === 'placement' || settings.get('goal') === 'israel') ? plan.startLesson : null;
    const primaryHref = placed ? '#/learn?lesson=' + encodeURIComponent(placed) : startHref();
    const placedTitle = placed ? D?.lessons?.find((l) => l.id === placed)?.title : null;
    const primaryLabel = placed ? (placedTitle ? `Start: ${placedTitle}` : `Start lesson ${placed}`) : `Start: ${startTitle()}`;
    const dayNode = (d) => h('li', {}, h('strong', {}, d.label), h('span', { class: 'muted' }, ` (${d.minutes} min)`),
      h('ul', {}, ...d.items.map((i) => h('li', {}, h('a', { href: i.href }, i.title), i.kind === 'lesson' && i.parts > 1 ? ` (part ${i.part} of ${i.parts})` : '', h('span', { class: 'muted' }, ` ${i.minutes} min`)))));
    const weekCard = plan
      ? h('section', { class: 'card ob-plan', 'aria-labelledby': 'ob-plan-h' },
        h('h2', { id: 'ob-plan-h' }, 'Your week'),
        h('p', { class: 'draft-flag', role: 'note' }, DRAFT_NOTE),
        h('p', {}, `Your goal is ${plan.minutesPerDay} minutes a day. Some lessons take longer than that: stop whenever you like, and the lesson opens where you stopped.${plan.source === 'placement' || /placement/.test(plan.note) ? ' ' + plan.note : ''}`),
        h('ol', { class: 'ob-days' }, ...plan.days.map(dayNode)))
      : h('p', { role: 'note' }, loadError ? 'The plan did not load, so there is no week plan yet. Your starting point still works.' : 'Building your week...');
    const changeStart = h('button', { type: 'button', class: 'btn secondary', id: 'ob-change-start', onclick: () => { say('Answer the question again to change your starting point.'); page = 'level'; go('letters'); } }, 'Change my starting point');
    const firstTitle = placedTitle && settings.get('goal') === 'israel' ? placedTitle : startTitle();
    body.replaceChildren(
      rimon(`You’re all set! Day 1: ${firstTitle}.`, 'highfive'),
      h('p', { class: 'ob-summary' }, `Starting point: ${firstTitle}. ${rec.denomination ? DENOMINATIONS.find((d) => d.id === rec.denomination).label + '; ' : ''}${PRONUNCIATIONS.find((p) => p.id === settings.get(SETTINGS_KEY_PRONUNCIATION))?.label || 'Sephardi'} pronunciation.`),
      h('div', { class: 'ob-foot' }, h('div', { class: 'row' }, h('a', { class: 'btn ob-cta', id: 'ob-start', href: primaryHref }, primaryLabel))), // start button first: pinned to the bottom of the first screen
      weekCard,
      h('div', { class: 'row ob-changes' }, changeStart,
        h('button', { type: 'button', class: 'btn secondary', id: 'ob-change-congregation', onclick: () => go('congregation') }, 'Change pronunciation style'),
        h('button', { type: 'button', class: 'btn secondary', id: 'ob-change-minutes', onclick: () => go('minutes') }, 'Change goal or minutes a day')),
      h('details', { class: 'ob-more', id: 'ob-sound-plan' }, h('summary', {}, 'Sound'), soundNote(settings.get(SETTINGS_KEY_PRONUNCIATION)), silentToggle()),
      h('p', { class: 'muted' }, 'Saved only on this device. Settings has the full list of choices.'));
  }

  function render() {
    if (!rec) step = 'letters';
    if (step === 'letters') renderLetters();
    else if (step === 'congregation') renderCongregation();
    else if (step === 'minutes') renderMinutes();
    else renderPlan();
  }
  render();
  (async () => {
    try { D = await (ctx?.onboardingData ?? loadOnboardingData()); if (!D?.plans || !Array.isArray(D?.lessons)) throw new Error('plan data missing'); } catch (e) { D = null; loadError = e; }
    if (!alive) return;
    if (step === 'minutes' || step === 'plan') render(); // re-render with data; focus is left where it is
  })();
  return () => { alive = false; try { bodyEl?.classList?.remove('ob-player'); } catch { /* minimal DOMs */ } };
}
