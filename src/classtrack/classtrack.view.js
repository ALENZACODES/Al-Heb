// My 10-Week Plan: a self-study adult reading plan (DRAFT, Aleph original). Week list with progress from the store,
// the learner's own schedule (start date, pace, study days, personal goal), a "need help?" box per week and a printable
// per-week handout. There is no teacher plan: Aleph is for learners studying on their own. No external dependencies.
import { h, heSpan } from '../shell/ui.js';
import { niceId } from '../progress/model.js';
import { LESSONS, SCOPE } from '../lib/counts.js';
import { loadClassTrack, readCompleted, weekStatus, currentWeekIndex, newInWeek, readAloudTexts, commonErrors, validate, DRAFT } from './model.js';

const CSS = `
.ct { display: grid; gap: var(--gap, 1rem); }
.ct h2 { margin-block: 0 .5rem; font-size: 1.2rem; }
.ct h3 { margin-block: .75rem .25rem; font-size: 1rem; }
.ct ul, .ct ol { margin: 0; padding-inline-start: 1.25rem; }
.ct li + li { margin-block-start: .35rem; }
.ct .btn { min-block-size: var(--tap, 48px); }
.ct progress { inline-size: 100%; block-size: .8rem; accent-color: var(--accent); }
.ct-row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.ct-row input, .ct-row select { min-block-size: 44px; }
.ct-he { font-size: 1.6rem; line-height: 1.7; display: block; unicode-bidi: isolate; }
.ct-tag { display: inline-block; font-size: .8rem; font-weight: 700; padding: 0 .5rem; border: 1px solid var(--border); border-radius: 6px; margin-inline-end: .4rem; }
.ct-tag.done { background: var(--accent); color: var(--accent-fg); border-color: var(--accent); }
.ct-tag.next { border: 2px solid var(--focus); }
.ct-box { display: inline-block; inline-size: 1em; block-size: 1em; border: 1.5px solid currentColor; margin-inline-end: .5em; vertical-align: -.1em; }
.ct-sheet ul.ct-checks { list-style: none; padding-inline-start: 0; }
@media print {
  @page { size: letter; margin: 14mm; }
  body * { visibility: hidden !important; }
  .ct-sheet, .ct-sheet * { visibility: visible !important; }
  .ct-sheet { position: absolute; inset-block-start: 0; inset-inline-start: 0; inline-size: 100%; background: #fff !important; color: #000 !important; box-shadow: none !important; border: 0 !important; font-size: 11pt; }
  .ct-noprint { display: none !important; }
  .ct-sheet.ct-teacher { font-size: 9.5pt; line-height: 1.3; }
  .ct-sheet.ct-teacher .ct-he { font-size: 14pt; line-height: 1.4; }
  .ct-sheet h2 { font-size: 14pt; } .ct-sheet h3 { font-size: 11pt; margin-block: .4rem .1rem; }
}
`;

export const PLAN_KEY = 'classtrack.plan';
/** Plan lengths. Every step is one week; longer plans add more material after the ten core reading weeks (see buildSteps). */
export const LENGTHS = Object.freeze([['10w', 10, '10 weeks: learn to read'], ['3m', 13, '3 months: read real prayers'], ['6m', 26, '6 months: reading, speaking and first grammar'], ['1y', 52, '1 year: Torah reading, chanting marks and 5,000 words']]);
const stepsFor = (len) => (LENGTHS.find(([k]) => k === len) || LENGTHS[0])[1];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
async function readPlan(store) { try { return await store?.get?.(PLAN_KEY, null); } catch { return null; } }
/** @returns {{start:string, length:string, days:number[], goal:string}} */
export function normalizePlan(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const start = typeof r.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.start) ? r.start : '';
  const length = LENGTHS.some(([k]) => k === r.length) ? r.length : '10w';
  const days = Array.isArray(r.days) ? [...new Set(r.days.filter((x) => Number.isInteger(x) && x >= 0 && x <= 6))].sort() : [];
  const goal = typeof r.goal === 'string' ? r.goal.slice(0, 140) : '';
  return { start, length, days, goal };
}
/** "Nov 9 to Nov 15" for step i of the plan, or '' without a start date. */
export function weekDates(plan, i) {
  if (!plan?.start) return '';
  const [y, m, d] = plan.start.split('-').map(Number);
  const a = new Date(y, m - 1, d + i * 7), b = new Date(y, m - 1, d + (i + 1) * 7 - 1);
  const f = (x) => x.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  return `${f(a)} to ${f(b)}`;
}
/**
 * Steps after the ten core weeks, in teaching order. Each step: { title, why, items: [{ label, href }] }.
 * 3 months adds the rest of the reading course and real prayer reading; 6 months adds intermediate reading, the
 * Speak in Israel course and grammar; 1 year adds the rest of the intermediate lessons, chanting marks, Torah reading
 * and the 5,000-word dictionary. Catch-up weeks are spread through the longer plans.
 */
export function buildSteps(lessons, length) {
  const total = stepsFor(length); if (total <= 10) return [];
  const L = (id) => ({ label: `${id}: ${lessons.find((l) => l.id === id)?.title || 'Lesson ' + id}`, href: `#/learn?lesson=${id}` });
  const I = (n) => { const id = `I-${String(n).padStart(2, '0')}`; const known = lessons.find((l) => l.id === id); return { label: `${id}: ${known?.title || 'Intermediate lesson'}`, href: `#/intermediate/${id}` }; };
  const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const read = ['r34', 'r35', 'r42', 'r43', 'r44', 'r45', 'r46', 'r47', 'r48', 'r49', 'r51'].filter((id) => lessons.some((l) => l.id === id));
  const israel = lessons.filter((l) => l.track === 'israel').map((l) => l.id);
  const catchUp = (n) => ({ title: 'Catch-up and review week', why: 'Rest from new material. Finish anything left over and clear your review cards.', items: [{ label: 'Review cards that are due', href: '#/learn?review=1' }, { label: 'Read a prayer you already know, out loud', href: '#/read' }, { label: 'Play a game from your level', href: '#/games' }], catchUp: n });
  const m3 = [
    ...chunk(read, 6).map((c, k) => ({ title: `Finish the reading course (part ${k + 1})`, why: 'The last reading lessons: harder vowel patterns and longer words.', items: c.map(L) })),
    { title: 'Read real prayers in a service', why: 'Put it all together: follow a real service and read at the speed of a congregation.', items: [{ label: 'Follow the service', href: '#/service' }, { label: 'Timed read-aloud', href: '#/timedread' }, { label: 'Prayers and texts to read', href: '#/read' }] }];
  const m6 = [
    ...chunk(range(1, 10), 5).map((c, k) => ({ title: `Intermediate reading (part ${k + 1})`, why: 'Longer words and prayer lines, with the vowel marks still there.', items: c.map(I) })),
    ...chunk(range(26, 35), 5).map((c, k) => ({ title: `Intermediate reading (part ${k + 3})`, why: 'Reading with confidence: longer passages and new word patterns.', items: c.map(I) })),
    ...chunk(israel, 9).map((c, k) => ({ title: `Speak in Israel (part ${k + 1} of ${Math.ceil(israel.length / 9)})`, why: 'Everyday Hebrew: greetings, ordering, getting around, small talk.', items: c.map(L) })),
    { title: 'First grammar: how Hebrew words are built', why: 'The, prefixes, plurals, word roots: the patterns that make new words easy to guess.', items: ['article', 'prefixes', 'plurals', 'roots', 'construct', 'openings'].map((t) => ({ label: `Grammar note: ${t}`, href: `#/grammar/${t}` })) }];
  const y1 = [
    ...chunk([...range(11, 25), ...range(36, 50)], 5).map((c, k) => ({ title: `Intermediate reading (part ${k + 5})`, why: 'Building fluency: read more, guess less, check with the audio.', items: c.map(I) })),
    ...[1, 2, 3].map((n) => ({ title: `Chanting marks, level ${n}`, why: 'The small marks above and below the words that tell you how to chant the Torah.', items: [{ label: `Chanting-mark trainer, level ${n}`, href: '#/trope' }] })),
    ...chunk(range(1, 10), 2).map((c, k) => ({ title: `Reading from the Torah (part ${k + 1} of 5)`, why: 'Step by step toward reading a few verses from the Torah scroll.', items: [{ label: `Torah reading, steps ${c[0]} and ${c[1]}`, href: '#/torahread' }, { label: 'Torah reader', href: '#/torahreader' }] })),
    ...[1, 2, 3, 4].map((n) => ({ title: `Dictionary words, tier ${n} of 4`, why: 'Grow your word bank from the most common words to 5,000.', items: [{ label: `Dictionary tier ${n}`, href: '#/vocab' }, { label: 'Theme packs', href: '#/vocab/themes' }] }))];
  const extra = length === '3m' ? m3 : length === '6m' ? [...m3, ...m6] : [...m3, ...m6, ...y1];
  const need = total - 10, out = [];
  const gaps = Math.max(0, need - extra.length);
  const every = gaps ? Math.max(2, Math.floor(extra.length / gaps)) : Infinity;
  let used = 0;
  for (let i = 0; i < extra.length && out.length < need; i++) { out.push(extra[i]); if (used < gaps && (i + 1) % every === 0 && out.length < need) { out.push(catchUp(++used)); } }
  while (out.length < need) out.push(catchUp(++used));
  return out.slice(0, need);
}
const list = (items, cls) => h('ul', cls ? { class: cls } : {}, ...items.map((x) => h('li', {}, x)));
const names = (ids) => ids.map(niceId).join(', ');

export function mount(root, ctx = {}) {
  let alive = true;
  const style = h('style', {}); style.textContent = CSS;
  const main = h('div', { class: 'ct' });
  root.replaceChildren(style, h('h1', { id: 'view-title', tabindex: '-1' }, 'My Study Plan'), h('p', { class: 'muted', role: 'status' }, 'Loading your plan...'), main);
  const loading = root.querySelector ? root.querySelector('p[role=status]') : null;

  (async () => {
    let d, completed;
    try { d = await loadClassTrack(); completed = await readCompleted(ctx.store); }
    catch (e) { if (alive && loading) loading.textContent = 'Your plan could not load its data files. Your learning is not affected.'; return; }
    if (!alive) return;
    if (loading) loading.remove();
    const weeks = d.track.weeks;
    const problems = validate(d);
    const wk = Number(ctx.query?.week);
    const mode = ctx.query?.mode === 'handout' ? 'handout' : ''; // an old 'teacher' link opens the week itself
    const draft = h('p', { class: 'draft-flag', role: 'note' }, DRAFT);
    const bad = problems.length ? h('p', { role: 'alert' }, `Data check found ${problems.length} problem(s): ${problems[0]}`) : null;
    const printBtn = () => h('button', { type: 'button', class: 'btn ct-noprint', onclick: () => { if (typeof window !== 'undefined' && window.print) window.print(); } }, 'Print this page');
    const lessonTitle = (id) => d.lessons.find((l) => l.id === id)?.title || id;
    let plan = normalizePlan(await readPlan(ctx.store));
    const ext = () => buildSteps(d.lessons, plan.length);
    const idx = Number.isInteger(wk) && wk >= 1 && wk <= weeks.length + ext().length ? wk - 1 : -1;
    const savePlan = async (next) => { plan = normalizePlan(next); try { await ctx.store?.set?.(PLAN_KEY, plan); } catch { /* best effort */ } };

    function renderList() {
      const cur = currentWeekIndex(weeks, completed);
      const total = weeks.reduce((a, w) => a + w.lessons.length, 0), done = weeks.reduce((a, w) => a + weekStatus(w, completed).done, 0);
      main.replaceChildren(draft, ...(bad ? [bad] : []),
        h('section', { class: 'card', 'aria-labelledby': 'ct-h-over' },
          h('h2', { id: 'ct-h-over' }, 'Learn to read the prayer book in ten steps, at your own pace'),
          h('p', {}, 'Each week gives a few letters and signs, a 10-minute warm-up, text to read aloud, homework in this app and a self-check. Go at your own pace: plan your dates below, and use the help box in each week when you get stuck. It is not a copy of any book or course.'),
          h('progress', { max: String(total), value: String(done), 'aria-label': 'Core lessons finished in the class track' }),
          h('p', { class: 'small muted' }, `${done} of ${total} core lessons finished (${SCOPE.core}; ${LESSONS.all} ${SCOPE.all})${cur === -1 ? '. All ten weeks are done.' : `. Next: week ${weeks[cur].week}.`}`)),
        planCard(),
        h('ol', { class: 'ct-weeks', style: 'list-style:none;padding:0;display:grid;gap:.75rem' }, ...weeks.map((w, i) => {
          const s = weekStatus(w, completed), state = s.complete ? 'done' : i === cur ? 'next' : 'later';
          const when = weekDates(plan, i);
          return h('li', { class: 'card', 'data-week': String(w.week), 'data-state': state },
            h('h2', {}, h('span', { class: 'ct-tag ' + state }, state === 'done' ? 'Done' : state === 'next' ? 'Next' : 'Later'), `Week ${w.week}: ${w.title}`),
            when ? h('p', { class: 'small muted' }, `Your dates: ${when}`) : null,
            h('p', { class: 'small' }, `${s.done} of ${s.total} lessons${s.stretchTotal ? `, ${s.stretchDone} of ${s.stretchTotal} extras` : ''}: ${w.lessons.join(', ')}`),
            h('div', { class: 'ct-row' },
              h('a', { class: 'btn', href: `#/classtrack/${w.week}` }, 'Open week'),
              h('a', { class: 'btn secondary', href: `#/classtrack/${w.week}/handout` }, 'Handout')));
        }),
          ...ext().map((st, j) => { const n = weeks.length + j + 1, when = weekDates(plan, n - 1);
            return h('li', { class: 'card', 'data-step': String(n) },
              h('h2', {}, `Week ${n}: ${st.title}`), when ? h('p', { class: 'small muted' }, `Your dates: ${when}`) : null,
              h('p', { class: 'small' }, st.why), h('div', { class: 'ct-row' }, h('a', { class: 'btn', href: `#/classtrack/${n}` }, 'Open week'))); })));
    }

    function renderStep(j) {
      const st = ext()[j], n = weeks.length + j + 1, when = weekDates(plan, n - 1);
      main.replaceChildren(h('p', {}, h('a', { href: '#/classtrack' }, 'All weeks')),
        h('section', { class: 'card', 'aria-labelledby': 'ct-h-st' },
          h('h2', { id: 'ct-h-st' }, `Week ${n}: ${st.title}`), when ? h('p', { class: 'small muted' }, `Your dates: ${when}`) : null,
          h('p', {}, st.why), h('h3', {}, 'This week'), h('ul', {}, ...st.items.map((it) => h('li', {}, h('a', { href: it.href }, it.label)))),
          h('section', { class: 'ct-help' }, h('h3', {}, 'Need help this week?'),
            h('p', { class: 'small' }, 'Forgot a letter or vowel? ', h('a', { href: '#/letters' }, 'Trace it and hear it'), '. Forgot a word? ', h('a', { href: '#/vocab' }, 'Look it up'), '. Too much this week? Split it over two weeks: the plan is yours.')),
          n < weeks.length + ext().length ? h('p', {}, h('a', { class: 'btn secondary', href: `#/classtrack/${n + 1}` }, `Next: week ${n + 1}`)) : h('p', {}, h('strong', {}, 'This is the last week of your plan. Mazal tov!'))));
    }

    function weekHeader(i) { const w = weeks[i]; return [h('h2', {}, `Week ${w.week}: ${w.title}`), h('p', { class: 'small' }, DRAFT)]; }

    function renderWeek(i) {
      const w = weeks[i], s = weekStatus(w, completed), nw = newInWeek(d, i), ra = readAloudTexts(d, w);
      main.replaceChildren(draft, ...(bad ? [bad] : []),
        h('p', {}, h('a', { href: '#/classtrack' }, 'All weeks')),
        h('section', { class: 'card', 'aria-labelledby': 'ct-h-wk' },
          h('h2', { id: 'ct-h-wk' }, `Week ${w.week}: ${w.title}`),
          h('progress', { max: String(s.total), value: String(s.done), 'aria-label': 'Lessons finished this week' }),
          h('p', { class: 'small muted' }, `${s.done} of ${s.total} lessons finished.`),
          h('h3', {}, 'By the end of the week'), list(w.goals),
          nw.letters.length || nw.signs.length ? h('p', { class: 'small' }, `New this week: ${[nw.letters.length ? 'letters ' + names(nw.letters) : '', nw.signs.length ? 'signs ' + names(nw.signs) : ''].filter(Boolean).join('; ')}.`) : null,
          h('h3', {}, 'Lessons to do'),
          h('ul', {}, ...w.lessons.map((id) => h('li', {}, completed[id] ? h('span', { class: 'ct-tag done' }, 'Done') : null, h('a', { href: `#/learn?lesson=${id}` }, `${id}: ${lessonTitle(id)}`))),
            ...(w.stretch || []).map((id) => h('li', {}, h('span', { class: 'ct-tag' }, 'Extra'), h('a', { href: `#/learn?lesson=${id}` }, `${id}: ${lessonTitle(id)}`)))),
          h('h3', {}, 'Ten-minute warm-up'), h('ol', {}, ...w.warmUp.steps.map((st) => h('li', {}, `${st.min} min. ${st.text} `, st.route ? h('a', { href: st.route }, 'Open') : null))),
          h('h3', {}, w.readAloud.mode === 'listen' ? 'Listen first (no reading yet)' : 'Read aloud'),
          ...(ra.length ? ra.map((t) => h('div', {}, h('p', { class: 'small' }, `${t.title}${t.line ? `, line ${t.line}` : ''} `, h('a', { href: `#/read/${encodeURIComponent(t.id)}` }, 'Open in the reader')), ...(w.readAloud.mode === 'listen' ? [] : t.lines.map((l) => heSpan(l, 'he ct-he'))))) : [h('p', {}, 'No whole text yet: read the words from this week\'s lessons.')]),
          h('h3', {}, 'Homework'), h('ul', {}, ...w.homework.map((x) => h('li', {}, h('a', { href: x.route }, x.label), ` (about ${x.minutes} min)`))),
          h('h3', {}, 'Can you...'), list(w.canYou.map((c) => `...${c}?`)),
          h('p', { class: 'small' }, 'Culture note: ', w.culture),
          helpBox(i),
          h('div', { class: 'ct-row' }, h('a', { class: 'btn', href: `#/classtrack/${w.week}/handout` }, 'Printable handout'))));
    }

    function renderHandout(i) {
      const w = weeks[i], ra = readAloudTexts(d, w);
      main.replaceChildren(h('p', { class: 'ct-noprint' }, h('a', { href: `#/classtrack/${w.week}` }, `Back to week ${w.week}`)), printBtn(),
        h('article', { class: 'ct-sheet card', 'aria-label': `Week ${w.week} handout` },
          ...weekHeader(i),
          h('h3', {}, 'This week'), list(w.goals),
          h('h3', {}, 'Lessons in Aleph'), list([...w.lessons.map((id) => `${id}: ${lessonTitle(id)}`), ...(w.stretch || []).map((id) => `Extra: ${id}: ${lessonTitle(id)}`)]),
          h('h3', {}, `${w.readAloud.mode === 'listen' ? 'Listen to' : 'Read aloud'}`),
          ...(w.readAloud.mode === 'listen' ? [h('p', {}, `Listen to: ${ra.map((t) => t.title).join('; ')}. Do not read it yet.`)] : ra.flatMap((t) => [h('p', { class: 'small' }, t.title), ...t.lines.map((l) => heSpan(l, 'he ct-he'))])),
          h('h3', {}, 'Homework'), h('ul', { class: 'ct-checks' }, ...w.homework.map((x) => h('li', {}, h('span', { class: 'ct-box', 'aria-hidden': 'true' }), `${x.label} (about ${x.minutes} min)`))),
          h('h3', {}, 'Can you...'), h('ul', { class: 'ct-checks' }, ...w.canYou.map((c) => h('li', {}, h('span', { class: 'ct-box', 'aria-hidden': 'true' }), `...${c}?`))),
          h('p', { class: 'small' }, 'Culture note: ', w.culture),
          h('p', { class: 'small' }, 'Aleph class track: original plan, draft, not reviewed by an educator.')));
    }

    /** Help for this week: sounds English speakers mix up, common slips, and where to practise them. */
    function helpBox(i) {
      const w = weeks[i], er = commonErrors(d, w);
      const tips = [...er.gaps.map((g) => `${g.title}: ${g.trap}`), ...er.kinds.map((k) => `${k.kind}: ${k.hint}`)];
      return h('section', { class: 'ct-help', 'aria-labelledby': `ct-help-${w.week}` },
        h('h3', { id: `ct-help-${w.week}` }, 'Need help this week?'),
        tips.length ? h('div', {}, h('p', { class: 'small' }, 'Watch out for:'), list(tips)) : null,
        h('p', { class: 'small' }, 'Stuck on a letter? ', h('a', { href: '#/letters' }, 'Trace it and hear it'), '. Mixing two letters up? ', h('a', { href: '#/letters?tab=drill' }, 'Practice look-alikes'), '. Forgot a word? ', h('a', { href: '#/vocab' }, 'Look it up in the dictionary'), '.'),
        h('p', { class: 'small' }, 'Take your time: redo a lesson as often as you like, and move to the next week only when the "Can you..." list feels easy.'));
    }

    /** The learner's own schedule: start date, pace, study days and a personal goal. Stored on this device only. */
    function planCard() {
      const body = h('div', { class: 'ct-plan-body' });
      const draw = () => {
        const start = h('input', { type: 'date', id: 'ct-start', value: plan.start || '' });
        const pace = h('select', { id: 'ct-pace' }, ...LENGTHS.map(([v, , label]) => h('option', { value: v, selected: plan.length === v ? '' : null }, label)));
        const days = h('fieldset', { class: 'ct-days' }, h('legend', {}, 'My study days'),
          ...DAY_NAMES.map((n, d2) => h('label', {}, h('input', { type: 'checkbox', value: String(d2), checked: plan.days.includes(d2) ? '' : null }), ' ', n)));
        const goal = h('input', { type: 'text', id: 'ct-goal', maxlength: '140', value: plan.goal || '', placeholder: 'For example: read the Shema at my synagogue by Passover' });
        const status = h('p', { class: 'small muted', role: 'status', 'aria-live': 'polite' }, plan.start ? `Your plan ends around ${weekDates(plan, stepsFor(plan.length) - 1).split(' to ')[1]}.` : 'Pick a start date to see dates for each week.');
        const save = h('button', { type: 'button', class: 'btn', onclick: async () => {
          const chosen = [...days.querySelectorAll?.('input[type=checkbox]') || []].filter((x) => x.checked).map((x) => Number(x.value));
          await savePlan({ start: start.value, length: pace.value, days: chosen, goal: goal.value });
          renderList();
        } }, 'Save my plan');
        body.replaceChildren(
          plan.goal ? h('p', {}, h('strong', {}, 'My goal: '), plan.goal) : '', // replaceChildren prints a null as the word "null"
          h('div', { class: 'ct-row' }, h('label', { for: 'ct-start' }, 'Start date '), start, h('label', { for: 'ct-pace' }, 'Plan length '), pace),
          days, h('p', {}, h('label', { for: 'ct-goal' }, 'My goal '), goal), h('div', { class: 'ct-row' }, save), status);
      };
      draw();
      return h('details', { class: 'card ct-plan', open: plan.start ? null : '' }, h('summary', {}, h('strong', {}, 'Plan it your way')), h('p', { class: 'small muted' }, 'Choose 10 weeks, 3 months, 6 months or a year, when to start and which days you study. Longer plans teach more. Nothing is sent anywhere.'), body);
    }

    if (idx < 0) renderList(); else if (idx >= weeks.length) renderStep(idx - weeks.length); else if (mode === 'handout') renderHandout(idx); else renderWeek(idx);
    const t = root.querySelector ? root.querySelector('#view-title') : null; if (t && t.focus) t.focus();
  })();
  return () => { alive = false; };
}
