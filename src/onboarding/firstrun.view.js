/**
 * First-run flow (#/welcome; the route line in src/shell/router.js points at src/shell/onboarding.view.js, which re-exports this).
 * DRAFT, untested with learners.
 *  Stage 1  "Can you already read the Hebrew letters?" -> saved once under store key onboarding.v1; never asked again by itself.
 *  Stage 2  denomination (onboarding.v1 only) + pronunciation (existing `congregation` setting) with one-line explanations.
 *  Stage 3  "Your week": a 7-day card built from the placement result (placement.v1, read only) and minutes per day.
 * A return visit shows the plan with "Change my starting point", which is the only way the Stage 1 question comes back.
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

export const DRAFT_NOTE = 'Draft: no learner has tried this plan yet. The minutes are goals, not measurements. The plan has one lesson a day and starts with the lesson shown on Home. It updates as you finish lessons.';

export function mount(root, ctx) {
  const { settings, store } = ctx;
  const t = (k, fb) => { try { const v = ctx.t?.(k); return v && v !== k ? v : fb; } catch { return fb; } };
  let alive = true, D = null, loadError = null;
  let rec = normalize(store.get(STORE_KEY));
  let step = rec ? rec.step : 'letters';
  const nowISO = () => new Date(ctx?.clock?.now ? ctx.clock.now() : Date.now()).toISOString();
  const h1 = h('h1', { id: 'view-title', tabindex: '-1' }, t('welcome.title', 'Welcome to Aleph'), ' ', heSpan('אלף'));
  const body = h('div', { class: 'ob-body' });
  const status = h('p', { role: 'status', 'aria-live': 'polite', class: 'muted', id: 'ob-status' });
  root.replaceChildren(h('article', { class: 'card onboarding' }, h1, body, status));
  const say = (m) => { status.textContent = m; };
  const focus = (n) => { try { n?.focus?.({ preventScroll: true }); } catch { try { n?.focus?.(); } catch { /* ignore */ } } };
  const save = () => { try { store.set(STORE_KEY, rec); } catch { /* best effort */ } };
  const go = (next) => { step = next; if (rec) { rec = setStep(rec, next); save(); } render(); focus(h1); };
  const startHref = () => '#' + (rec?.start || '/firstday');
  const startTitle = () => (rec ? answerById(rec.letters)?.start === '/placement' ? 'Placement check' : 'Your first 10 minutes' : '');

  const radio = (name, value, label, desc, checked, onchange) => {
    const id = `ob-${name}-${value}`;
    return h('label', { class: 'opt opt-block', for: id },
      h('input', { type: 'radio', name, id, value, checked: checked ? true : null, onchange: () => onchange(value) }),
      h('span', {}, h('strong', {}, label), desc ? h('span', { class: 'muted block' }, desc) : null));
  };
  const fieldset = (legend, intro, ...kids) => h('fieldset', { class: 'field' }, h('legend', {}, legend), intro ? h('p', { class: 'muted' }, intro) : null, ...kids);
  const skipNow = () => h('p', { class: 'muted' }, h('a', { href: startHref(), id: 'ob-skip-now' }, `Skip the rest and start now: ${startTitle()}`));

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

  // ---- Stage 1 ----
  function renderLetters() {
    let picked = null;
    const prevGoal = settings.get('goal') || null;
    let goal = GOAL_CHOICES.some((g) => g.id === prevGoal) ? prevGoal : 'read'; // preselected: the current setting (default read), so a learner who skips it gets the old flow
    const next = h('p', { class: 'muted', id: 'ob-next-step', 'aria-live': 'polite' }, 'Choose the description that feels closest. You can change your starting point later.');
    const explainNext = () => {
      if (!picked) return;
      next.textContent = picked === 'none' ? 'Your starting activity: first letters and sounds. No placement check needed.'
        : goal === 'israel' ? 'Your plan starts with everyday words and phrases. You can also review reading skills through the reading check.'
        : 'Your starting activity: a short reading check to suggest where to begin. It is a guide, not an exam; you can choose an earlier lesson.';
    };
    const goalFs = fieldset(GOAL_QUESTION, 'This is your goal, not your level. You can choose any goal as a beginner.', ...GOAL_CHOICES.map((g) => radio('goal', g.id, g.label, g.desc, goal === g.id, (v) => { goal = v; explainNext(); })));
    const fs = fieldset(LETTERS_QUESTION, 'Choose one. Vowel marks are the small dots and lines that help you pronounce Hebrew.' + (rec ? ' This replaces your saved starting point.' : ''),
      ...LETTER_ANSWERS.map((a) => radio('letters', a.id, a.label, a.desc, false, (v) => {
        picked = v;
        explainNext();
      })));
    const form = h('form', { id: 'ob-form-letters', onsubmit: (e) => { e.preventDefault(); submit(); } }, fs,
      h('p', { class: 'muted' }, 'Not sure? Choose “Starting from zero” for a gentle introduction.'), goalFs, next,
      h('div', { class: 'row' }, h('button', { type: 'submit', class: 'btn', id: 'ob-letters-continue' }, 'Continue to my learning plan'),
        rec ? h('button', { type: 'button', class: 'btn secondary', onclick: () => go('plan') }, 'Keep my current starting point') : null));
    const submit = () => {
      if (!picked) {
        // Said next to the button AND shown at the question, which is scrolled into view: the learner sees what is missing, not an unchanged page.
        say('Choose one answer to continue.');
        next.textContent = 'First, choose how much Hebrew you can read today (question 1, above). Not sure? Choose “Starting from zero”.';
        const first = form.querySelector('#ob-letters-none');
        try { first?.closest?.('fieldset')?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }); } catch { /* old browsers */ }
        focus(first); return;
      }
      rec = answerLetters(rec, picked, nowISO());
      save();
      const israelNow = goal === 'israel';
      const patch = { onboarded: true, goal };
      if (israelNow && prevGoal !== 'israel') patch[SETTINGS_KEY_PRONUNCIATION] = 'israeli'; // speaking in Israel: Israeli sounds, so the Sephardi/Ashkenazi question is not asked
      try { settings.set(patch); } catch { /* settings may be read-only in tests */ }
      say(`Saved. Your starting point is ${answerById(picked).start === '/placement' ? 'the placement check' : 'your first 10 minutes'}.${israelNow ? ' Israeli pronunciation is set; change it in Settings.' : ''}`);
      go(israelNow ? 'plan' : 'congregation');
    };
    body.replaceChildren(h('p', {}, 'Let’s find a comfortable place to begin. Tell us what you can read now, then choose what you want to learn.'), form, h('p', { class: 'muted' }, 'Your answer is saved only on this device. ', h('a', { href: '#/how' }, 'How this works'), '. ', h('a', { href: '#/accessibility', id: 'ob-a11y-link' }, 'Accessibility options'), '.'));
  }

  // ---- Stage 2 ----
  function renderCongregation() {
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
    const form = h('form', { id: 'ob-form-congregation', onsubmit: (e) => { e.preventDefault(); apply(); } }, pronFs, soundBox,
      h('div', { class: 'row' }, h('button', { type: 'submit', class: 'btn', id: 'ob-congregation-continue' }, 'Continue'),
        h('button', { type: 'button', class: 'btn secondary', id: 'ob-congregation-skip', onclick: () => { say('Skipped. Pronunciation stays as it is; you can change it in Settings.'); go('plan'); } }, 'Skip')),
      skipNow(), denomMore);
    body.replaceChildren(form);
  }

  // ---- Stage 3: minutes ----
  function renderMinutes() {
    if (!D) { body.replaceChildren(h('p', {}, loadError ? 'The plan did not load. You can still start.' : 'Loading...'), skipNow()); return; }
    const opts = D.plans.minutesOptions;
    let mins = rec.minutesPerDay || D.plans.defaultMinutes;
    let goal = settings.get('goal') || 'read';
    const goalFs = fieldset('What do you want Hebrew for?', 'This chooses which lessons your week and the Today card start with. You can change it later in Settings.',
      ...[['read', 'Reading the prayer book (siddur)', 'Letters, vowels and prayer lines.'], ['israel', 'Speaking in Israel', 'Everyday words and phrases.'], ['both', 'Both', 'Reading lessons first, speaking lessons alongside.']]
        .map(([id, label, d]) => radio('goal', id, label, d, goal === id, (v) => { goal = v; })));
    const fs = fieldset('How many minutes a day?', 'This is your own daily goal. Your week plan is one lesson a day.',
      ...opts.map((m) => radio('minutes', String(m), `${m} minutes`, '', mins === m, (v) => { mins = Number(v); })));
    const form = h('form', { id: 'ob-form-minutes', onsubmit: (e) => { e.preventDefault(); rec = setMinutes(rec, mins, D.plans); save(); try { settings.set({ goal }); } catch { /* best effort */ } if (DAILY_GOALS.includes(rec.minutesPerDay)) { try { store.set(DAILY_GOAL_KEY, rec.minutesPerDay); } catch { /* best effort */ } } say(`Planned for ${rec.minutesPerDay} minutes a day. This is your study goal on Home; the streak counts a day at 5 minutes.`); go('plan'); } }, goalFs, fs,
      h('div', { class: 'row' }, h('button', { type: 'submit', class: 'btn', id: 'ob-minutes-continue' }, 'Show my week')));
    body.replaceChildren(h('h2', {}, 'Your goal and time'), form, skipNow());
  }

  // ---- Stage 3: plan card ----
  function renderPlan() {
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
    const card = plan
      ? h('section', { class: 'card ob-plan', 'aria-labelledby': 'ob-plan-h' },
        h('h2', { id: 'ob-plan-h' }, 'Your week'),
        h('p', { class: 'draft-flag', role: 'note' }, DRAFT_NOTE),
        h('p', {}, `Your goal is ${plan.minutesPerDay} minutes a day. Some lessons take longer than that: stop whenever you like, and the lesson opens where you stopped.${plan.source === 'placement' || /placement/.test(plan.note) ? ' ' + plan.note : ''}`),
        h('ol', { class: 'ob-days' }, ...plan.days.map(dayNode)))
      : h('p', { role: 'note' }, loadError ? 'The plan did not load, so there is no week plan yet. Your starting point still works.' : 'Building your week...');
    const changeStart = h('button', { type: 'button', class: 'btn secondary', id: 'ob-change-start', onclick: () => { say('Answer the question again to change your starting point.'); go('letters'); } }, 'Change my starting point');
    body.replaceChildren(
      h('p', {}, `Starting point: ${placedTitle && settings.get('goal') === 'israel' ? placedTitle : startTitle()}. ${rec.denomination ? DENOMINATIONS.find((d) => d.id === rec.denomination).label + '; ' : ''}${PRONUNCIATIONS.find((p) => p.id === settings.get(SETTINGS_KEY_PRONUNCIATION))?.label || 'Sephardi'} pronunciation.`),
      h('div', { class: 'row' }, h('a', { class: 'btn', id: 'ob-start', href: primaryHref }, primaryLabel)), // start button first: within the first screen
      card,
      h('div', { class: 'row' }, changeStart,
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
  return () => { alive = false; };
}
