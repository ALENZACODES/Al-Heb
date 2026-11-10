// @ts-check
// Onboarding model (DRAFT, untested with learners): pure functions, no DOM, no clock, no store access.
// Record shape under store key "onboarding.v1":
//   { v:1, letters:'none'|'some'|'vowels', start:'/firstday'|'/placement', askedAt:string,
//     denomination:null|'reform'|'conservative'|'reconstructionist'|'orthodox', minutesPerDay:number|null, step:'letters'|'congregation'|'minutes'|'plan' }
// The letters question is asked once; `letters` is only rewritten through "Change my starting point".
import { openStart } from '../placement/model.js';
import { lessonQueue } from '../home/nextlesson.js';
export const STORE_KEY = 'onboarding.v1';
export const PLACEMENT_KEY = 'placement.v1'; // written by src/placement (read here, never written)

/** First setup question: the goal decides the defaults (Israel -> Israeli pronunciation, no Sephardi/Ashkenazi question). Values are the existing `goal` setting. */
export const GOAL_QUESTION = '2. What would you like to use Hebrew for?';
export const GOAL_CHOICES = Object.freeze([
  { id: 'read',   label: 'Prayers and Torah study', desc: 'Build toward reading prayer lines and studying Torah with support. Beginners are welcome.' },
  { id: 'israel', label: 'Everyday Hebrew and conversation', desc: 'Learn useful words and phrases for daily life and speaking in Israel.' },
  { id: 'both',   label: 'Explore both', desc: 'Begin with reading foundations and add everyday Hebrew along the way.' },
]);
export const LETTERS_QUESTION = '1. How much Hebrew can you read today?';
/** Stage 1 answers. `start` is the route each answer leads to. */
export const LETTER_ANSWERS = Object.freeze([
  { id: 'none', label: 'Starting from zero — I do not know the letters', start: '/firstday', desc: 'Meet your first letters and their sounds. No Hebrew knowledge needed.' },
  { id: 'some', label: 'I recognize some letters', start: '/placement', desc: 'I still need help recognizing the alphabet and remembering its sounds.' },
  { id: 'letters', label: 'I know the letters, but cannot read words yet', start: '/placement', desc: 'I want to combine letter sounds and vowel marks to sound out words.' },
  { id: 'vowels', label: 'I can read simple words with vowel marks', start: '/placement', desc: 'I want to build vocabulary and move on to longer words and short sentences.' },
  { id: 'sentences', label: 'I can read words and sentences comfortably', start: '/placement', desc: 'I want to understand more of what I read and work toward longer passages.' },
]);
export const STEPS = Object.freeze(['letters', 'congregation', 'minutes', 'plan']);

/**
 * Stage 2: denomination. There is no denomination key in src/shell/settings.js, so this is kept under onboarding.v1 only.
 * `suggests` pre-selects the pronunciation radio when the learner has not picked one yet; it is a common pattern, not a rule.
 * `changes` is the honest one-line statement of what the choice does in the app.
 */
export const DENOMINATIONS = Object.freeze([
  { id: 'reform',            label: 'Reform',            suggests: 'sephardi', changes: 'Saved with your plan. Suggests Sephardi sounds; your lessons stay the same.' },
  { id: 'conservative',      label: 'Conservative',      suggests: 'sephardi', changes: 'Saved with your plan. Suggests Sephardi sounds; your lessons stay the same.' },
  { id: 'reconstructionist', label: 'Reconstructionist', suggests: 'sephardi', changes: 'Saved with your plan. Suggests Sephardi sounds; your lessons stay the same.' },
  { id: 'orthodox',          label: 'Orthodox',          suggests: null,       changes: 'Saved with your plan. Orthodox congregations vary, so pick the sounds you hear at yours.' },
]);
/** Stage 2: pronunciation. Ids are the existing `congregation` setting values (src/shell/settings.js ENUMS.congregation). */
export const PRONUNCIATIONS = Object.freeze([
  { id: 'sephardi',  label: 'Sephardi',  changes: 'The default. These are the vowel sounds most American synagogues use.' },
  { id: 'ashkenazi', label: 'Ashkenazi', changes: 'The older European style. For example, tav without a dot sounds like "s".' },
  { id: 'israeli',   label: 'Israeli',   changes: 'Spoken in Israel today. Best if you want to talk with Israelis or visit Israel.' },
]);
export const SETTINGS_KEY_PRONUNCIATION = 'congregation';

const LETTER_IDS = LETTER_ANSWERS.map((a) => a.id);
const DENOM_IDS = DENOMINATIONS.map((d) => d.id);
export const answerById = (id) => LETTER_ANSWERS.find((a) => a.id === id) || null;

/** Validate a stored record; returns null when there is no usable answer yet. @param {any} raw */
export function normalize(raw) {
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return null;
  const a = answerById(raw.letters);
  if (!a) return null;
  return {
    v: 1, letters: a.id, start: a.start, askedAt: typeof raw.askedAt === 'string' ? raw.askedAt : '',
    denomination: DENOM_IDS.includes(raw.denomination) ? raw.denomination : null,
    minutesPerDay: Number.isInteger(raw.minutesPerDay) && raw.minutesPerDay > 0 ? raw.minutesPerDay : null,
    step: STEPS.includes(raw.step) ? raw.step : 'congregation',
  };
}
/** Stage 1 answer -> fresh record (denomination/minutes kept when re-answering through "Change my starting point"). */
export function answerLetters(prev, id, nowISO) {
  const a = answerById(id);
  if (!a) throw new Error('unknown answer: ' + id);
  const p = normalize(prev);
  return { v: 1, letters: a.id, start: a.start, askedAt: nowISO, denomination: p?.denomination ?? null, minutesPerDay: p?.minutesPerDay ?? null, step: 'congregation' };
}
export const setDenomination = (rec, id) => ({ ...rec, denomination: DENOM_IDS.includes(id) ? id : null });
export const setMinutes = (rec, n, plans) => ({ ...rec, minutesPerDay: plans.minutesOptions.includes(n) ? n : rec.minutesPerDay });
export const setStep = (rec, step) => ({ ...rec, step: STEPS.includes(step) ? step : rec.step });
export const suggestedPronunciation = (denomination) => DENOMINATIONS.find((d) => d.id === denomination)?.suggests ?? null;
/** True once Stage 1 was answered: the question must not be shown again by itself. */
export const asked = (raw) => normalize(raw) !== null;

/** Lesson the placement check recommended, if it is a real read-track lesson. @param {any} placement store value */
export function placementLesson(placement, readLessons) {
  const id = placement?.result?.lesson;
  return typeof id === 'string' && readLessons.some((l) => l.id === id) ? id : null;
}

/**
 * Stage 3: a 7-day plan from the Stage 1 answer, the placement result (if any) and the minutes-per-day choice.
 * One lesson part per day at most; a lesson longer than the daily budget is split over up to `lessonSplitMaxParts` days.
 * Extras (drills) fill the remaining minutes once the lesson that introduces them has been reached. Day 7 starts with review.
 * @param {{record:any, placement?:any, lessons:any[], plans:any, hasRoute?:(name:string)=>boolean}} o
 */
export function buildPlan(o) {
  const rec = normalize(o.record);
  if (!rec) return null;
  const plans = o.plans;
  const has = (name) => (typeof o.hasRoute === 'function' ? o.hasRoute(name) !== false : true);
  const minutes = rec.minutesPerDay || plans.defaultMinutes;
  const israel = o.goal === 'israel';
  const read = o.lessons.filter((l) => l.track === (israel ? 'israel' : 'read'));
  const order = new Map(read.map((l, i) => [l.id, i]));
  const wanted = israel || rec.letters === 'none' ? null : placementLesson(o.placement, read);
  // Lessons unlock in order and placement completes none, so the plan starts at the recommended lesson only if it is open now.
  const open = wanted ? openStart(o.lessons, o.completed || [], wanted) : null;
  const placed = open ? open.id : null;
  const startLesson = placed || (israel ? (read[0]?.id || plans.firstLesson) : plans.firstLesson);

  // Lessons come from the shared next-lesson rule (src/home/nextlesson.js), one finished lesson per day, so day 1 is what the Today card
  // recommends now and each later day is what it recommends after the lessons before it are done. Rebuilt from progress on every view.
  const parts = lessonQueue({ lessons: o.lessons, completed: o.completed || [], goal: israel ? 'israel' : o.goal, first: (o.completed || []).length ? null : placed, limit: 14 })
    .map((l) => ({ kind: 'lesson', lesson: l.id, title: l.title, part: 1, parts: 1, minutes: Number(l.estMinutes) || minutes, route: 'learn', href: '#/learn?lesson=' + encodeURIComponent(l.id) }));
  const startDef = israel && rec.letters !== 'none' ? null : plans.starts[rec.letters];
  const needsPlacement = !israel && rec.start === '/placement' && !placed;
  const extras = israel ? [] : plans.extras.filter((e) => has(e.route) && order.has(e.minLesson));
  const used = new Map();
  let reached = order.get(parts[0]?.lesson ?? startLesson) ?? 0; // index of the furthest lesson started
  const days = [];
  for (let d = 0; d < 7; d++) {
    const items = []; let left = minutes;
    const push = (it) => { items.push(it); left -= it.minutes; };
    if (d === 0 && startDef && has(startDef.route) && (rec.letters === 'none' || needsPlacement)) push({ kind: 'start', title: startDef.title, href: startDef.href, route: startDef.route, minutes: startDef.minutes, why: startDef.why });
    if (d === 6 && has(plans.review.route)) push({ kind: 'review', ...plans.review });
    // Day 1 of a learner starting from zero is the first 10 minutes alone when that already fills the daily goal: the first day should feel small.
    if (parts.length && !(d === 0 && o.firstdayDone === false && items.length && left <= 0)) { const p = parts.shift(); push(p); reached = Math.max(reached, order.get(p.lesson) ?? reached); }
    for (const e of extras) {
      if (left < e.minutes) break;
      if ((order.get(e.minLesson) ?? Infinity) > reached) continue;
      if ((used.get(e.id) || 0) >= 2 || items.some((i) => i.route === e.route)) continue;
      used.set(e.id, (used.get(e.id) || 0) + 1);
      push({ kind: 'extra', title: e.title, href: e.href, route: e.route, minutes: e.minutes });
    }
    days.push({ label: plans.dayLabels[d] || `Day ${d + 1}`, minutes: items.reduce((a, i) => a + i.minutes, 0), items });
  }
  const firstLessonItem = days.flatMap((d) => d.items).find((i) => i.kind === 'lesson');
  const note = needsPlacement
    ? `Lessons from ${plans.firstLesson} are a placeholder until you take the placement check; this plan is rebuilt from its result.`
    : open && open.locked ? `The placement check fit you to ${open.wanted}, which is locked until earlier lessons are done, so lessons start at ${placed}.`
    : placed ? `Lessons start at ${placed}, the placement check's suggestion (a draft guess).` : firstLessonItem ? `The first lesson is "${firstLessonItem.title}".` : `Lessons start at ${plans.firstLesson}.`;
  return { v: 1, draft: true, minutesPerDay: minutes, startLesson, source: placed ? 'placement' : 'default', letters: rec.letters, days, totalMinutes: days.reduce((a, x) => a + x.minutes, 0), note };
}

/** Every href in a plan must be a route the app has (checked against the route table in tests). */
export const planHrefs = (plan) => plan.days.flatMap((d) => d.items.map((i) => i.href));
