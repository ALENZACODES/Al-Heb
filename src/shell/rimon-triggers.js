// Rimon's stills: which drawing appears where in the app, and what makes it appear.
//
// Pure module (no DOM, no clock, no store): src/shell/rimon-stage.js gathers the facts and asks this module what to
// show; tests/shell.rimon-triggers.test.js drives it with fixed dates. The 200 drawings, with the screen, the trigger
// and the image prompt for each, are listed in docs/images/RIMON-STILLS.md (built by tools/images/rimon/build.mjs
// from tools/images/rimon/stills.mjs).
//
// A still appears only once its file exists and its number is listed in data/images/rimon/present.json (the image
// ingest writes that list). Until then every trigger answers null and Rimon behaves exactly as before.
//
// Surfaces (how a still is shown):
//   pose  - Rimon in the corner (or the Home hero) shows the still for `ms`, then goes back to the animation
//   page  - Rimon in the corner wears the still for the whole page (dressed for that screen)
//   hero  - a large Rimon inside the page, under the heading or in a [data-rimon-slot] the view provides
//   swap  - an existing picture of Rimon in a view (img[data-rimon-still]) is replaced by the still
//   toast - a small card with the still and one line, at the bottom of the screen, gone after a few seconds
import { holidaysBetween, roshChodeshInHebrewYear, toHebrew, parseISO, weekday, candleLighting, havdalah } from '../curriculum/calendar.js';
import { STILL_IDS, STILL_FILES } from './rimon-stills.generated.js';

export const STILL_DIR = 'data/images/rimon';
export const PRESENT_URL = 'data/images/rimon/present.json';
export const STILL_COUNT = 200;
/** Still ids are file stems: '023' and '025b' (drawn set, tools/images/rimon/art-map.mjs) or 'a023' (the 200-still catalogue). */
export const STILL_ID = /^a?\d{3}[a-z]?$/;
/** 'a007' -> data/images/rimon/v2/rimon-007-starting-line.webp (catalogue); '023' -> data/images/rimon/rimon-023.webp (drawn set). */
export const stillPath = (id, files = STILL_FILES) => `${STILL_DIR}/${(id.startsWith('a') && files[id]) || `rimon-${id}`}.webp`;

// ---------------------------------------------------------------- respect rules
/**
 * Days when Rimon stays out of sight (companion, stills and toasts): days of mourning and remembrance. A cheerful
 * mascot does not belong on them. Owner decision to reverse: empty this list.
 */
export const QUIET_DAYS = Object.freeze(['yom-hashoah', 'yom-hazikaron', 'tisha-bav']);
/** Screens with prayer, Torah and the service: Rimon steps aside so the text has the screen to itself. */
export const QUIET_ROUTES = Object.freeze(['torahread', 'torahreadsec', 'torahreader', 'service', 'trope', 'listen-shelf', 'morning', 'text']);

// ---------------------------------------------------------------- triggers
const L = (en, he) => (he ? Object.freeze({ en, he }) : Object.freeze({ en }));
/**
 * Every trigger. `surface` as above; `pick` 'cycle' (next drawing each time) or 'day' (one drawing per day);
 * `once` 'ever' | 'day' (never repeats within that span; stored under rimon.seen.v1); `ms` for poses and toasts;
 * `line` what Rimon says with it ({n} is filled in); `fallback` the trigger to use when this one has no drawing yet.
 */
export const TRIGGERS = Object.freeze({
  // onboarding and the first minutes
  'onboarding.letters': { surface: 'hero', line: L("Shalom! I'm Rimon. Let's see what you already know.", 'שָׁלוֹם!') },
  'onboarding.congregation': { surface: 'hero', line: L("Every community has its own sound. Pick the one you'll hear.") },
  'onboarding.minutes': { surface: 'hero', line: L('Five minutes a day is plenty to start.') },
  'onboarding.plan': { surface: 'hero', line: L("Here's your plan. One small step at a time.") },
  'greet.first': { surface: 'pose', ms: 6000, once: 'ever', line: L("Shalom! I'm Rimon. I'll be right here while you learn.", 'שָׁלוֹם!') },
  'first.return': { surface: 'pose', ms: 5000, once: 'ever', line: L('You came back! Day two is where habits start.') },
  'firstday.start': { surface: 'page', line: L("In ten minutes you'll read your first Hebrew word.") },
  'firstday.ladder': { surface: 'page' },
  'firstwin.builder': { surface: 'swap' },
  'placement.start': { surface: 'page', line: L('No pressure. This only finds your starting point.') },
  'install.page': { surface: 'page', line: L("Keep me on your home screen and I'm one tap away.") },
  'first.correct': { surface: 'pose', ms: 2600, once: 'ever', fallback: 'answer.correct', line: L('Your first right answer! Remember this one.') },
  'first.mistake': { surface: 'pose', ms: 2600, once: 'ever', fallback: 'answer.wrong', line: L("Mistakes are how we learn. You'll get it.") },
  'first.lesson': { surface: 'swap', once: 'ever', fallback: 'lesson.complete.perfect' },
  'first.badge': { surface: 'toast', ms: 5500, once: 'ever', fallback: 'award.new', line: L('Your first badge! Many more where that came from.') },
  'first.book': { surface: 'toast', ms: 5500, once: 'ever', fallback: 'book.finished', line: L('You read a whole book in Hebrew!') },
  'first.lab': { surface: 'toast', ms: 5000, once: 'ever', fallback: 'lab.result.good', line: L('First workout done. Your brain says thank you.') },

  // lessons and answers
  'answer.correct': { surface: 'pose', ms: 1400 },
  'answer.correct.streak3': { surface: 'pose', ms: 1600, fallback: 'answer.correct' },
  'answer.correct.streak5': { surface: 'pose', ms: 1800, fallback: 'answer.correct' },
  'answer.correct.streak10': { surface: 'pose', ms: 2200, fallback: 'answer.correct.streak5' },
  'answer.comeback': { surface: 'pose', ms: 1600, fallback: 'answer.correct' },
  'answer.wrong': { surface: 'pose', ms: 1500 },
  'answer.wrong.repeat': { surface: 'pose', ms: 2200, fallback: 'answer.wrong', line: L("Here's a thought: listen once more, then pick.") },
  'answer.wrong.many': { surface: 'pose', ms: 3000, fallback: 'answer.wrong', line: L("Deep breath. Let's slow down together.") },
  'game.timelow': { surface: 'pose', ms: 1800 },
  'game.end.good': { surface: 'pose', ms: 2000, fallback: 'answer.correct' },
  'lesson.next': { surface: 'pose', ms: 2600 },
  'learn.continue.first': { surface: 'swap' },
  'learn.continue.next': { surface: 'swap', pick: 'day' },
  'learn.continue.streak': { surface: 'swap', fallback: 'learn.continue.next' },
  'learn.continue.alldone': { surface: 'swap' },
  'lesson.complete.perfect': { surface: 'swap', fallback: 'lesson.complete.great' },
  'lesson.complete.great': { surface: 'swap', fallback: 'lesson.complete.done' },
  'lesson.complete.done': { surface: 'swap' },
  'checkpoint.home': { surface: 'page', line: L('Some letters look alike. Slow eyes win here.') },
  'review.home': { surface: 'page' },

  // streak and daily goal
  'streak.day.1': { surface: 'toast', ms: 5000, once: 'ever', line: L('Day one! Something just got planted.') },
  'streak.day.3': { surface: 'toast', ms: 5000, once: 'ever', line: L('Three days in a row. Keep watering it.') },
  'streak.day.7': { surface: 'toast', ms: 5500, once: 'ever', line: L('A whole week! That is a real habit.') },
  'streak.day.14': { surface: 'toast', ms: 5500, once: 'ever', line: L('Two weeks. Look how it has grown.') },
  'streak.day.30': { surface: 'toast', ms: 6000, once: 'ever', line: L('Thirty days of Hebrew. Wow.') },
  'streak.day.50': { surface: 'toast', ms: 6000, once: 'ever', line: L('Fifty days! You are unstoppable.') },
  'streak.day.100': { surface: 'toast', ms: 6500, once: 'ever', line: L('One hundred days! Mazal tov!', 'מַזָּל טוֹב!') },
  'streak.day.365': { surface: 'toast', ms: 7000, once: 'ever', line: L('A full year of Hebrew. The tree is yours.') },
  'streak.atrisk': { surface: 'pose', ms: 5000, once: 'day', line: L('Five minutes today keeps your streak going.') },
  'streak.saved': { surface: 'toast', ms: 4500, once: 'day', line: L('Phew! Streak saved.') },
  'streak.lost': { surface: 'pose', ms: 5000, once: 'day', line: L('Streaks start again. Today can be day one.') },
  'streak.restart': { surface: 'toast', ms: 4500, once: 'day', line: L("Day one again, and that's how every streak starts.") },
  'streak.rest': { surface: 'pose', ms: 5000, once: 'day', line: L('A rest day. Your streak is safe.') },
  'goal.reached': { surface: 'toast', ms: 4500, once: 'day', line: L('Daily goal done! See you tomorrow.') },

  // idle and breaks
  'idle.fidget': { surface: 'pose', ms: 4500 },
  'idle.sleep': { surface: 'pose', ms: 20000, fallback: 'idle.fidget' },
  'idle.water': { surface: 'toast', ms: 5000, line: L("Half an hour in. Water break? I'll wait.") },
  'idle.break': { surface: 'toast', ms: 5500, line: L('A whole hour of Hebrew! Stand up and stretch.') },
  'idle.snack': { surface: 'toast', ms: 5500, line: L('Snack time. Pomegranate seeds, anyone?') },

  // greetings (Home, first visit of the day)
  'greet.morning': { surface: 'pose', ms: 4500, once: 'day', pick: 'day' },
  'greet.day': { surface: 'pose', ms: 4000, once: 'day' },
  'greet.evening': { surface: 'pose', ms: 4500, once: 'day' },
  'greet.night': { surface: 'pose', ms: 4500, once: 'day', pick: 'day', fallback: 'greet.evening' },
  'greet.back': { surface: 'pose', ms: 5500, once: 'day', line: L("You're back! I missed you.") },
  'greet.week': { surface: 'pose', ms: 4500, once: 'day', line: L('A new week, new words.') },

  // Shabbat
  'shabbat.erev': { surface: 'pose', ms: 5000, once: 'day', pick: 'day', line: L('Shabbat is coming. Almost time for candles.') },
  'shabbat.evening': { surface: 'pose', ms: 5000, once: 'day', pick: 'day', line: L('Shabbat Shalom!', 'שַׁבָּת שָׁלוֹם!') },
  'shabbat.day': { surface: 'pose', ms: 5000, once: 'day', pick: 'day', line: L('Shabbat Shalom! Rest well.', 'שַׁבָּת שָׁלוֹם!') },
  'shabbat.havdalah': { surface: 'pose', ms: 5000, once: 'day', line: L('Shavua tov! A good week to you.', 'שָׁבוּעַ טוֹב!') },
  'shabbat.shavuatov': { surface: 'pose', ms: 4500, once: 'day', fallback: 'shabbat.havdalah', line: L('Shavua tov! A good week to you.', 'שָׁבוּעַ טוֹב!') },
  'shabbat.rest': { surface: 'page', line: L('Your streak rests on Shabbat too.') },

  // festivals: a pose on Home that day, and Rimon dressed for the festival on the calendar and festival pages
  'holiday.rosh-hashanah': { surface: 'page', pick: 'day', line: L('Shanah tovah! A sweet new year.', 'שָׁנָה טוֹבָה!') },
  'holiday.yom-kippur': { surface: 'page', pick: 'day', line: L('May you be sealed for good.', 'גְּמַר חֲתִימָה טוֹבָה') },
  'holiday.sukkot': { surface: 'page', pick: 'day', line: L('Chag sameach! Happy Sukkot.', 'חַג שָׂמֵחַ!') },
  'holiday.shemini-atzeret': { surface: 'page', line: L('Chag sameach!', 'חַג שָׂמֵחַ!') },
  'holiday.simchat-torah': { surface: 'page', pick: 'day', line: L('Chag sameach! Time to dance.', 'חַג שָׂמֵחַ!') },
  'holiday.hanukkah': { surface: 'page', pick: 'day', line: L('Happy Hanukkah!', 'חַג חֲנֻכָּה שָׂמֵחַ!') },
  'holiday.tu-bishvat': { surface: 'page', pick: 'day', line: L('Happy New Year of the Trees!', 'טוּ בִּשְׁבָט שָׂמֵחַ!') },
  'holiday.purim': { surface: 'page', pick: 'day', line: L('Happy Purim!', 'פּוּרִים שָׂמֵחַ!') },
  'holiday.pesach': { surface: 'page', pick: 'day', line: L('Happy Passover!', 'חַג שָׂמֵחַ!') },
  'holiday.yom-haatzmaut': { surface: 'page', pick: 'day', line: L('Happy Independence Day, Israel!', 'חַג עַצְמָאוּת שָׂמֵחַ!') },
  'holiday.shavuot': { surface: 'page', pick: 'day', line: L('Chag sameach! Happy Shavuot.', 'חַג שָׂמֵחַ!') },
  'holiday.rosh-chodesh': { surface: 'page', line: L('Chodesh tov! A good new month.', 'חֹדֶשׁ טוֹב!') },
  'holiday.erev-festival': { surface: 'page', line: L('A festival begins tonight.') },
  'holiday.lag-baomer': { surface: 'page', pick: 'day', line: L('Happy Lag BaOmer!') },
  'holiday.tu-bav': { surface: 'page', line: L("Happy Tu B'Av!") },

  // Brain Lab
  'lab.home': { surface: 'page', pick: 'day', line: L('Three short drills a day keep your Hebrew sharp.') },
  'lab.drill.hunt': { surface: 'page', fallback: 'lab.home' },
  'lab.drill.matrix': { surface: 'page', fallback: 'lab.home' },
  'lab.drill.soundmatch': { surface: 'page', fallback: 'lab.home' },
  'lab.drill.siddurflash': { surface: 'page', fallback: 'lab.home' },
  'lab.drill.switch': { surface: 'page', fallback: 'lab.home' },
  'lab.drill.gematria': { surface: 'page', fallback: 'lab.home' },
  'lab.drill.countup': { surface: 'page', fallback: 'lab.home' },
  'lab.drill.numberear': { surface: 'page', fallback: 'lab.home' },
  'lab.drill.calendar': { surface: 'page', fallback: 'lab.home' },
  'lab.drill.pattern': { surface: 'page', fallback: 'lab.home' },
  'lab.result.best': { surface: 'toast', ms: 5000, line: L('New personal best!') },
  'lab.result.good': { surface: 'pose', ms: 2600 },
  'lab.levelup': { surface: 'pose', ms: 2600, fallback: 'lab.result.good' },
  'lab.workout.done': { surface: 'toast', ms: 5000, once: 'day', line: L("Today's workout is done. Strong work.") },
  'lab.streak': { surface: 'toast', ms: 5000, line: L('{n} days of Brain Lab in a row!') },

  // books, library, listening
  'books.shelf': { surface: 'page', pick: 'day', line: L('Pick a little book. Each one is a short story.') },
  'book.finished': { surface: 'toast', ms: 5000, line: L('Another book finished!') },
  'books.milestone': { surface: 'toast', ms: 5500, line: L('{n} books read in Hebrew!') },
  'library.home': { surface: 'page' },
  'songs.home': { surface: 'page' },
  'listen.home': { surface: 'page' },
  'phrases.home': { surface: 'page' },
  'dialogues.home': { surface: 'page', line: L('Real conversations, the way Israelis talk.') },
  'israel.home': { surface: 'page' },

  // awards and progress
  'awards.gallery': { surface: 'page' },
  'awards.empty': { surface: 'page', fallback: 'awards.gallery', line: L('Your first badge is closer than you think.') },
  'award.new': { surface: 'toast', ms: 5000, line: L('New badge!') },
  'progress.home': { surface: 'page', pick: 'day' },
  'share.home': { surface: 'page' },
  'daily.home': { surface: 'page' },
  'lessons.10': { surface: 'toast', ms: 5500, once: 'ever', line: L('Ten lessons done!') },
  'lessons.25': { surface: 'toast', ms: 5500, once: 'ever', line: L('Twenty-five lessons. Look at you go.') },
  'lessons.50': { surface: 'toast', ms: 6000, once: 'ever', line: L('Fifty lessons! Halfway to a hundred.') },
  'lessons.100': { surface: 'toast', ms: 6500, once: 'ever', line: L('One hundred lessons! Mazal tov!', 'מַזָּל טוֹב!') },

  // reminders and planning
  'reminder.streak': { surface: 'swap' },
  'reminders.page': { surface: 'page', line: L("Pick a time and I'll remind you.") },
  'classtrack.home': { surface: 'page' },
  'calendar.home': { surface: 'page' },

  // errors, offline, loading and other screens
  'error.notfound': { surface: 'hero', line: L("Hmm, this page isn't here. Let's head home.") },
  'error.view': { surface: 'hero', line: L("Something broke on this screen. I'm on it. Try again in a moment.") },
  'offline.lost': { surface: 'toast', ms: 5000, line: L("You're offline. Lessons you've opened still work.") },
  'offline.back': { surface: 'toast', ms: 3500, line: L("Back online. Let's go!") },
  'offline.page': { surface: 'page' },
  'loading.slow': { surface: 'hero' },
  'settings.home': { surface: 'page' },
  'help.home': { surface: 'page' },
  'about.home': { surface: 'page', line: L("I'm Rimon. Pomegranates are an old Jewish symbol, and I'm proud of it.") },
  'search.home': { surface: 'page' },
  'letters.home': { surface: 'page' },
  'typing.home': { surface: 'page' },
  'scan.home': { surface: 'page' },
  'games.hub': { surface: 'swap' },
  'synagogues.home': { surface: 'page' },
  'grammar.home': { surface: 'page' },
  'roots.home': { surface: 'page', line: L('Most Hebrew words grow from a three-letter root.') },
  'vocab.home': { surface: 'page' },
  'speak.home': { surface: 'page' },
  'traditions.home': { surface: 'page' },
});

export const SURFACES = Object.freeze(['pose', 'page', 'hero', 'swap', 'toast']);
export const HOLIDAY_TRIGGERS = Object.freeze(Object.keys(TRIGGERS).filter((t) => t.startsWith('holiday.')).map((t) => t.slice(8)));
export const LAB_DRILLS = Object.freeze(Object.keys(TRIGGERS).filter((t) => t.startsWith('lab.drill.')).map((t) => t.slice(10)));
export const STREAK_MILESTONES = Object.freeze([1, 3, 7, 14, 30, 50, 100, 365]);
export const LESSON_MILESTONES = Object.freeze([10, 25, 50, 100]);
export const BOOK_MILESTONES = Object.freeze([5, 10, 25, 57]);
export const LAB_STREAKS = Object.freeze([3, 7, 14, 30]);
/** Daily Brain Lab workout size (src/lab/lab.core.js dailyWorkout). */
export const LAB_WORKOUT = 3;

/** The line for a trigger, with {n} filled in; null when the trigger has none. */
export function lineFor(trigger, vars = {}) {
  const l = TRIGGERS[trigger]?.line;
  if (!l) return null;
  const fill = (s) => s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
  return l.he ? { en: fill(l.en), he: l.he } : { en: fill(l.en) };
}

// ---------------------------------------------------------------- routes
/** Screen -> trigger, for screens where Rimon is "dressed" for the page. Functions get (ctx, facts, params). */
export const ROUTE_TRIGGERS = Object.freeze({
  firstday: 'firstday.start', 'firstday-ladder': 'firstday.ladder', placement: 'placement.start', install: 'install.page',
  checkpoint: 'checkpoint.home', scheduler: 'review.home',
  lab: 'lab.home',
  labgame: (_c, _f, p) => (LAB_DRILLS.includes(p.game) ? `lab.drill.${p.game}` : 'lab.home'),
  books: 'books.shelf', library: 'library.home', songs: 'songs.home', listen: 'listen.home',
  phrases: 'phrases.home', dialogues: 'dialogues.home', israel: 'israel.home',
  awards: (_c, f) => (f.badges ? 'awards.gallery' : 'awards.empty'),
  progress: (c) => (c.shabbat === 'evening' || c.shabbat === 'day' ? 'shabbat.rest' : 'progress.home'),
  share: 'share.home', daily: 'daily.home', reminders: 'reminders.page', classtrack: 'classtrack.home',
  calendar: (c) => seasonTrigger(c) || 'calendar.home',
  festivals: (c) => seasonTrigger(c),
  festival: (_c, _f, p) => (HOLIDAY_TRIGGERS.includes(p.id) ? `holiday.${p.id}` : p.id === 'shemini-atzeret' ? 'holiday.shemini-atzeret' : null),
  day: (_c, _f, p) => dateTrigger(p.date),
  offline: 'offline.page', settings: 'settings.home', help: 'help.home', how: 'help.home', about: 'about.home', search: 'search.home',
  letters: 'letters.home', atlas: 'letters.home', typing: 'typing.home', scan: 'scan.home', synagogues: 'synagogues.home',
  grammar: 'grammar.home', roots: 'roots.home', vocab: 'vocab.home', 'vocab-themes': 'vocab.home', speak: 'speak.home',
  traditions: 'traditions.home', 'traditions-guide': 'traditions.home', 'traditions-hear': 'traditions.home',
});

/** Route params from a hash like "#/lab/hunt" for the few patterns that need them. */
export function routeParams(routeName, hash = '') {
  const parts = String(hash).replace(/^#\/?/, '').split(/[?#]/)[0].split('/').filter(Boolean).map((s) => { try { return decodeURIComponent(s); } catch { return s; } });
  if (routeName === 'labgame') return { game: parts[1] || '' };
  if (routeName === 'festival') return { id: parts[1] || '' };
  if (routeName === 'day') return { date: parts[1] || '' };
  return {};
}

/** The page trigger for a route, or null. */
export function routeTrigger(routeName, ctx, facts = {}, hash = '') {
  const r = ROUTE_TRIGGERS[routeName];
  if (!r) return null;
  return typeof r === 'function' ? r(ctx || {}, facts, routeParams(routeName, hash)) || null : r;
}

// ---------------------------------------------------------------- the day
const pad = (n) => String(n).padStart(2, '0');
export const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoAdd = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/** Festivals the calendar does not list, by Hebrew date. */
const EXTRA_DAYS = Object.freeze([{ id: 'lag-baomer', month: 'iyar', day: 18 }, { id: 'tu-bav', month: 'av', day: 15 }]);

/** Holiday ids on a civil date (calendar ids, plus rosh-chodesh, lag-baomer and tu-bav), festival eves as 'erev-festival'. */
export function holidaysOn(iso, mode = 'reform') {
  const out = [];
  let list = [];
  try { list = holidaysBetween(isoAdd(iso, -1), isoAdd(iso, 1), { mode }); } catch { list = []; }
  for (const h of list) if (h.start <= iso && iso <= (h.end || h.start)) out.push(h.id);
  if (!out.length && list.some((h) => h.kind === 'major' && h.start === isoAdd(iso, 1))) out.push('erev-festival');
  try {
    const heb = toHebrew(parseISO(iso));
    for (const x of EXTRA_DAYS) if (heb.month === x.month && heb.day === x.day) out.push(x.id);
    for (const y of [heb.year, heb.year + 1]) for (const rc of roshChodeshInHebrewYear(y)) if (rc.start <= iso && iso <= rc.end && !out.includes('rosh-chodesh')) out.push('rosh-chodesh');
  } catch { /* the calendar is decoration here */ }
  return out;
}

/**
 * Facts about now that decide greetings and festival stills.
 * @param {Date} now
 * @param {{loc?:{lat:number,lon:number,offsetMinutes?:number}|null, mode?:string, havdalahOpt?:object}} [opt]
 * @returns {{iso:string, hour:number, weekday:number, holidays:string[], shabbat:null|'erev'|'evening'|'day'|'havdalah', quiet:boolean, timeOfDay:string}}
 */
export function dayContext(now, { loc = null, mode = 'reform', havdalahOpt } = {}) {
  const iso = localISO(now), hour = now.getHours(), wd = weekday(parseISO(iso));
  const holidays = holidaysOn(iso, mode);
  let shabbat = null;
  if (wd === 5) {
    let start = null;
    if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lon)) { try { start = candleLighting(parseISO(iso), loc)?.candles || null; } catch { start = null; } }
    const beforeCandles = start ? now < start : hour < 18;
    shabbat = beforeCandles ? (hour >= 10 ? 'erev' : null) : 'evening';
  } else if (wd === 6) {
    let end = null;
    if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lon)) { try { end = havdalah(parseISO(iso), loc, havdalahOpt)?.havdalah || null; } catch { end = null; } }
    shabbat = (end ? now < end : hour < 20) ? 'day' : 'havdalah';
  }
  const quiet = holidays.some((h) => QUIET_DAYS.includes(h));
  const timeOfDay = hour >= 5 && hour < 11 ? 'morning' : hour >= 11 && hour < 17 ? 'day' : hour >= 17 && hour < 22 ? 'evening' : 'night';
  return { iso, hour, weekday: wd, holidays, shabbat, quiet, timeOfDay };
}

/** Festival trigger for today, if any (the first festival that has a trigger). */
export function seasonTrigger(ctx) {
  for (const h of ctx?.holidays || []) if (HOLIDAY_TRIGGERS.includes(h)) return `holiday.${h}`;
  if (ctx?.shabbat === 'erev') return 'shabbat.erev';
  if (ctx?.shabbat === 'evening') return 'shabbat.evening';
  if (ctx?.shabbat === 'day') return 'shabbat.day';
  if (ctx?.shabbat === 'havdalah') return 'shabbat.havdalah';
  return null;
}

/** The still for a day page (/day/YYYY-MM-DD): its festival, or Shabbat on a Saturday. */
export function dateTrigger(iso) {
  if (!/^\d{4}-\d\d-\d\d$/.test(iso || '')) return null;
  const h = holidaysOn(iso).find((x) => HOLIDAY_TRIGGERS.includes(x));
  if (h) return `holiday.${h}`;
  try { if (weekday(parseISO(iso)) === 6) return 'shabbat.day'; } catch { /* bad date */ }
  return null;
}

/**
 * Home greeting: the one moment Rimon marks when the learner arrives. First match wins; triggers already shown today
 * (or ever, for once:'ever') are skipped by the caller through `seen`.
 * facts: { firstVisit, daysAway, streak:{count,best,activeToday,restToday,broken} }
 */
export function greetingCandidates(ctx, facts = {}) {
  const out = [];
  const st = facts.streak || {};
  if (facts.firstVisit) out.push('greet.first');
  if (facts.secondDay) out.push('first.return');
  if ((facts.daysAway || 0) >= 7) out.push('greet.back');
  const season = seasonTrigger(ctx);
  if (season) out.push(season);
  if (ctx.shabbat === 'havdalah' && ctx.hour >= 21) out.push('shabbat.shavuatov');
  if (st.broken && (st.best || 0) >= 2) out.push('streak.lost');
  if (st.count > 0 && !st.activeToday && !st.restToday && ctx.hour >= 18) out.push('streak.atrisk');
  if (st.restToday && !ctx.shabbat && !season) out.push('streak.rest');
  if (ctx.weekday === 0 && ctx.hour < 14) out.push('greet.week');
  out.push(`greet.${ctx.timeOfDay}`);
  return out;
}

// ---------------------------------------------------------------- reactions
/** Existing companion actions (alef:rimon detail.action) grouped: which ones are answers. */
const ANSWER_OK = new Set(['correct', 'bounce', 'wink', 'highfive']);
const ANSWER_BAD = new Set(['wrong', 'sad']);
const RANK = { correct: 1, bounce: 1, wink: 2, highfive: 3 };
/** Non-answer actions that have a still of their own. */
export const ACTION_TRIGGERS = Object.freeze({ nervous: 'game.timelow', laugh: 'game.end.good', lesson: 'lesson.next', point: 'lesson.next' });
export const ANSWER_WINDOW_MS = 300;

/**
 * One app event can reach the companion two or three times for the same answer (the session, the sound effect and
 * the exercise each say so). The tracker merges events that arrive within ANSWER_WINDOW_MS into one answer, keeps
 * the run of right and wrong answers, and returns a trigger for each merged answer.
 */
export function createAnswerTracker() {
  let right = 0, wrong = 0, lastWrong = 0, open = null, closedAt = -Infinity;
  function close() {
    if (!open) return null;
    const ok = open.ok, prevWrong = wrong;
    closedAt = open.t; open = null;
    if (ok) {
      right++; wrong = 0;
      if (right >= 10 && right % 10 === 0) return 'answer.correct.streak10';
      if (right >= 5 && right % 5 === 0) return 'answer.correct.streak5';
      if (right % 3 === 0) return 'answer.correct.streak3';
      if (prevWrong > 0) return 'answer.comeback';
      return 'answer.correct';
    }
    wrong++; right = 0; lastWrong = wrong;
    if (wrong >= 3) return 'answer.wrong.many';
    if (wrong === 2) return 'answer.wrong.repeat';
    return 'answer.wrong';
  }
  return {
    /** Feed an action at time t. Returns a trigger when an earlier answer window closed, else null. */
    feed(action, t) {
      const isOk = ANSWER_OK.has(action), isBad = ANSWER_BAD.has(action);
      if (!isOk && !isBad) return null;
      if (!open && t - closedAt <= ANSWER_WINDOW_MS) return null; // a late echo of an answer already counted
      if (open && t - open.t <= ANSWER_WINDOW_MS) {
        if (isBad) open.ok = false; // a miss in the window wins: the answer was wrong
        else if (open.ok && (RANK[action] || 0) > open.rank) open.rank = RANK[action];
        return null;
      }
      const done = close();
      open = { t, ok: isOk, rank: RANK[action] || 0 };
      return done;
    },
    /** Close the open window (the stage calls this ANSWER_WINDOW_MS after the last event). */
    flush() { return close(); },
    get pending() { return !!open; },
    get right() { return right; },
    get wrong() { return wrong; },
    get lastWrong() { return lastWrong; },
    reset() { right = 0; wrong = 0; open = null; closedAt = -Infinity; },
  };
}

// ---------------------------------------------------------------- progress milestones (from store changes)
/** The highest milestone crossed going from `before` to `after`, or null. */
export function crossed(list, before, after) {
  let hit = null;
  for (const m of list) if ((before || 0) < m && (after || 0) >= m) hit = m;
  return hit;
}

/** Streak record change -> one toast trigger (milestone > restart > saved > goal), or null. a, b: projectStreak() results. */
export function streakChangeTrigger(a, b, hour) {
  if (!b) return null;
  const before = a?.count || 0, after = b.count || 0;
  const m = after > before ? crossed(STREAK_MILESTONES, before, after) : null;
  if (m && m > (a?.best || 0)) return `streak.day.${m}`; // a new personal record; a rebuilt streak gets the restart line instead
  if (after === 1 && before === 0 && (b.best || 0) >= 2) return 'streak.restart';
  if (after > before && hour >= 20 && a && !a.activeToday) return 'streak.saved';
  if (!a?.activeToday && b.activeToday) return 'goal.reached';
  return null;
}

/** Brain Lab state change (store key lab.v1) -> { trigger, n } or null. */
export function labChangeTrigger(a, b, today) {
  const games = (s) => (s && typeof s === 'object' && s.games && typeof s.games === 'object' ? s.games : {});
  const ga = games(a), gb = games(b);
  const plays = (g) => Object.values(g).reduce((n, x) => n + (Number(x?.plays) || 0), 0);
  if (plays(gb) <= plays(ga)) return null;
  if (plays(ga) === 0) return { trigger: 'first.lab' };
  const doneA = a?.workouts?.[today]?.done?.length || 0, doneB = b?.workouts?.[today]?.done?.length || 0;
  if (doneA < LAB_WORKOUT && doneB >= LAB_WORKOUT) {
    const n = labStreak(b, today);
    if (LAB_STREAKS.includes(n)) return { trigger: 'lab.streak', n };
    return { trigger: 'lab.workout.done' };
  }
  for (const [id, g] of Object.entries(gb)) {
    const prev = ga[id] || {};
    if ((Number(g?.plays) || 0) <= (Number(prev.plays) || 0)) continue;
    if ((Number(prev.best) || 0) > 0 && (Number(g.best) || 0) > Number(prev.best)) return { trigger: 'lab.result.best' };
    if ((Number(prev.lastMax) || 0) > 0 && (Number(g.lastMax) || 0) > Number(prev.lastMax)) return { trigger: 'lab.levelup' };
    return { trigger: 'lab.result.good' };
  }
  return null;
}

/** Days in a row, ending today, with the full daily workout done. */
export function labStreak(state, today) {
  let n = 0, d = today;
  while ((state?.workouts?.[d]?.done?.length || 0) >= LAB_WORKOUT && n < 400) { n++; d = isoAdd(d, -1); }
  return n;
}

/** Books finished (store key books.finished.v1) change -> { trigger, n } or null. */
export function booksChangeTrigger(a, b) {
  const n = (x) => (x && typeof x === 'object' ? Object.keys(x).length : 0);
  const before = n(a), after = n(b);
  if (after <= before) return null;
  if (before === 0) return { trigger: 'first.book', n: after };
  const m = crossed(BOOK_MILESTONES, before, after);
  return m ? { trigger: 'books.milestone', n: m } : { trigger: 'book.finished', n: after };
}

/** Awards (store key awards.v1) change -> trigger or null. */
export function awardsChangeTrigger(a, b) {
  const ids = (x) => Object.keys(x?.awards || {});
  const before = ids(a), after = ids(b);
  const fresh = after.filter((id) => !before.includes(id));
  if (!fresh.length) return null;
  return before.length === 0 ? 'first.badge' : 'award.new';
}

/** Lessons completed (store key curriculum.progress) change -> trigger or null. */
export function lessonsChangeTrigger(a, b) {
  const n = (x) => Object.keys(x?.completed || {}).length;
  const m = crossed(LESSON_MILESTONES, n(a), n(b));
  return m ? `lessons.${m}` : null;
}

/** Session clock (active minutes) -> break toast, or null. */
export function breakTrigger(activeMs, shown) {
  const min = activeMs / 60000;
  if (min >= 90 && !shown.has('idle.snack')) return 'idle.snack';
  if (min >= 60 && !shown.has('idle.break')) return 'idle.break';
  if (min >= 30 && !shown.has('idle.water')) return 'idle.water';
  return null;
}

// ---------------------------------------------------------------- picking a drawing
/** Days since 1970 in local time: the "day" pick rotates on it. */
export const dayNumber = (d) => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);

/** Whether a once-trigger was already shown. seen: { [trigger]: 'YYYY-MM-DD' | true }. */
export function alreadySeen(trigger, seen, iso) {
  const once = TRIGGERS[trigger]?.once;
  if (!once || !seen) return false;
  const v = seen[trigger];
  if (once === 'ever') return !!v;
  return v === iso;
}

/**
 * Which drawing to show for a trigger, following the fallback chain, among the drawings that exist.
 * @param {string} trigger
 * @param {{present:Set<number>, now?:Date, counters?:Map<string,number>, ids?:Record<string,number[]>}} opt
 * @returns {{id:number, trigger:string}|null}  `trigger` is the one whose drawing was used (after fallbacks)
 */
export function pickStill(trigger, { present, now = new Date(), counters = null, ids = STILL_IDS } = {}) {
  const visited = new Set();
  let t = trigger;
  while (t && TRIGGERS[t] && !visited.has(t)) {
    visited.add(t);
    const list = (ids[t] || []).filter((id) => present?.has(id));
    if (list.length) {
      const mode = TRIGGERS[t].pick || (TRIGGERS[t].surface === 'page' || TRIGGERS[t].surface === 'hero' ? 'day' : 'cycle');
      let i;
      if (mode === 'day' || !counters) i = dayNumber(now) % list.length;
      else { const c = counters.get(t) ?? dayNumber(now); counters.set(t, c + 1); i = c % list.length; }
      return { id: list[i], trigger: t };
    }
    t = TRIGGERS[t].fallback;
  }
  return null;
}

/** Normalise data/images/rimon/present.json -> Set of still ids. Anything malformed counts as "no stills". */
export function presentSet(json) {
  const ids = Array.isArray(json?.ids) ? json.ids : [];
  return new Set(ids.filter((id) => typeof id === 'string' && STILL_ID.test(id)));
}
