// ALEF Progress screen: what you can read now, today (streak, gentle goal, rest day), your path per goal, belts, weak spots.
// Everything is computed offline from the store (see model.js). Nothing here is estimated: reading speed is not measured,
// so it is not shown (see docs/progress/timed-read-spec.md).
import { h, heSpan } from '../shell/ui.js';
import { loadProgressData } from './data.js';
import { readSnapshot, makeContext, evaluatePath, evaluateBelts, streakInfo, goalInfo, weakSpots, lessonCounts, dayKey, addDays, teacherLesson, niceId, ALL_LETTERS, ALL_SIGNS } from './model.js';
import { setRestDay, setGoalTarget } from './store.js';

const CSS = `
.pg { display: grid; gap: var(--gap, 1rem); }
.pg h2 { margin-block: 0 .5rem; font-size: 1.2rem; }
.pg h3 { margin-block: .75rem .25rem; font-size: 1rem; }
.pg ul, .pg ol { margin: 0; padding-inline-start: 1.25rem; }
.pg li + li { margin-block-start: .5rem; }
.pg-big { font-size: 1.15rem; font-weight: 600; margin-block: 0 .5rem; }
.pg-he { font-size: 1.5rem; line-height: 1.6; display: block; unicode-bidi: isolate; }
.pg-chips { display: flex; flex-wrap: wrap; gap: .4rem; padding: 0; margin: .25rem 0; list-style: none; }
.pg-chips li { margin: 0; padding: .1rem .6rem; border: 1px solid var(--border); border-radius: 999px; font-size: 1.25rem; }
.pg-chips li + li { margin-block-start: 0; }
.pg-row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.pg-tag { display: inline-block; font-size: .8rem; font-weight: 700; padding: 0 .5rem; border: 1px solid var(--border); border-radius: 6px; margin-inline-end: .4rem; }
.pg-tag.done { background: var(--accent); color: var(--accent-fg); border-color: var(--accent); }
.pg-tag.next { border: 2px solid var(--focus); }
.pg progress { inline-size: 100%; block-size: .9rem; accent-color: var(--accent); }
.pg dl { display: grid; grid-template-columns: 1fr auto; gap: .35rem 1rem; margin: 0; }
.pg dd { margin: 0; text-align: end; font-weight: 600; }
.pg .btn { min-block-size: var(--tap, 48px); }
.pg details { border-top: 1px solid var(--border); padding-block: .4rem; }
.pg summary { min-block-size: var(--tap, 48px); display: flex; align-items: center; cursor: pointer; font-weight: 600; }
.pg .small { font-size: .9rem; }
`;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export async function mount(root, ctx) {
  let alive = true;
  const { store } = ctx;
  const has = (name) => (typeof ctx.hasRoute === 'function' ? ctx.hasRoute(name) : true);
  const style = h('style', {}); style.textContent = CSS;
  const main = h('div', { class: 'pg' });
  root.replaceChildren(style, h('h1', { id: 'view-title', tabindex: '-1' }, 'Your progress'), h('p', { class: 'muted', role: 'status' }, 'Loading your progress...'), main);
  const loading = root.querySelector('p[role=status]');

  let d;
  try { d = await loadProgressData(); }
  catch (e) {
    if (!alive) return () => {};
    loading.textContent = 'Progress could not load its data files. Your learning is not affected.';
    return () => { alive = false; };
  }
  if (!alive) return () => {};
  loading.remove();

  const goalSetting = ctx.settings?.get?.('goal') || 'read';
  const goals = goalSetting === 'both' ? ['read', 'israel'] : [goalSetting === 'israel' ? 'israel' : 'read'];
  const now = () => Date.now();
  const status = h('p', { class: 'muted', role: 'status', 'aria-live': 'polite' });

  const todaySection = h('section', { class: 'card', 'aria-labelledby': 'pg-h-today' });
  function renderToday(focusId) {
    const s = readSnapshot(store), t = now(), st = streakInfo(s, t), g = goalInfo(s, t, d.milestones.settings.defaultGoal);
    const today = dayKey(t), yesterday = addDays(today, -1);
    const missedYesterday = !s.rest.includes(yesterday) && streakInfo({ ...s, rest: [...s.rest, yesterday] }, t).count > st.count;
    const streakLine = st.count > 0
      ? `${plural(st.count, 'day', 'days')} in a row${st.restToday ? ' (resting today)' : st.activeToday ? ', including today' : ''}. Best so far: ${st.best}.`
      : st.restToday ? 'Resting today. Your streak is waiting for you.' : 'No streak running right now. Any lesson or review card starts one.';
    const goalLine = g.lessonsToday > 0 ? `Today's goal is met: you finished ${plural(g.lessonsToday, 'lesson', 'lessons')}.`
      : g.cards >= g.target ? `Today's goal is met: ${plural(g.cards, 'card', 'cards')} reviewed.`
      : `${g.cards} of ${g.target} cards today. Any amount counts.`;
    const sel = h('select', { id: 'pg-goal', onchange: (e) => { try { setGoalTarget(store, Number(e.target.value)); status.textContent = `Daily goal set to ${e.target.value} cards.`; renderToday('pg-goal'); } catch { status.textContent = 'Could not save the goal.'; } } },
      ...[...new Set([...d.milestones.settings.goalChoices, g.target])].sort((a, b) => a - b).map((n) => h('option', { value: String(n), selected: n === g.target ? true : null }, `${n} cards a day`)));
    todaySection.replaceChildren(
      h('h2', { id: 'pg-h-today' }, 'Today'),
      h('p', { class: 'pg-big' }, streakLine),
      h('p', {}, goalLine),
      h('progress', { max: String(g.target), value: String(g.met ? g.target : Math.min(g.cards, g.target)), 'aria-label': 'Cards reviewed today' }),
      h('p', { class: 'small muted' }, 'A rest day does not break your streak. The goal is a gentle target in cards; the app does not time you, so there is no minutes goal.'),
      h('div', { class: 'pg-row' },
        h('label', { for: 'pg-goal' }, 'Daily goal '), sel),
      h('div', { class: 'pg-row' },
        h('button', { type: 'button', class: 'btn secondary', id: 'pg-rest', 'aria-pressed': st.restToday ? 'true' : 'false', onclick: () => { setRestDay(store, today, !st.restToday); status.textContent = st.restToday ? 'Rest day removed for today.' : 'Today is a rest day. Your streak is safe.'; renderToday('pg-rest'); } }, st.restToday ? 'Today is a rest day (tap to undo)' : 'Take today as a rest day'),
        missedYesterday ? h('button', { type: 'button', class: 'btn secondary', id: 'pg-rest-y', onclick: () => { setRestDay(store, yesterday, true); status.textContent = 'Yesterday counted as a rest day.'; renderToday('pg-rest-y'); } }, 'Count yesterday as a rest day') : null),
      status);
    if (focusId) todaySection.querySelector('#' + focusId)?.focus();
  }

  function build() {
    const s = readSnapshot(store), c = makeContext(s, d, now());
    const sections = [];
    sections.push(h('p', { class: 'draft-flag', role: 'note' }, 'Draft: milestones, belt gates and thresholds are ALEF\'s own and not expert-reviewed. Hebrew text is AI-pointed and awaits native-speaker review.'));

    // 1. what you can read now (the hook)
    const r = c.read, cnt = lessonCounts(s, d.lessons);
    const readSec = h('section', { class: 'card', 'aria-labelledby': 'pg-h-read' }, h('h2', { id: 'pg-h-read' }, 'What you can read now'));
    if (c.know.letters.size === 0) {
      readSec.append(h('p', {}, 'Finish your first lesson and this panel will list the prayer lines and words you can already sound out.'), h('a', { class: 'btn', href: '#/learn' }, 'Start a lesson'));
    } else {
      const totalLines = r.lines.length;
      readSec.append(h('p', { class: 'pg-big' }, `${plural(r.linesFull.length, 'line', 'lines')} of ${totalLines} prayer and Torah lines, and ${plural(r.words.full.length.toLocaleString('en-US'), 'word', 'words')}, use only signs you have met.`),
        h('p', { class: 'small muted' }, `Based on ${c.know.letters.size} of ${ALL_LETTERS.length} letters (from completed lessons and finished tracing) and ${c.know.signs.size} of ${ALL_SIGNS.length} signs (from completed lessons). This says you know the signs, not that you read the line fluently.`));
      const pick = (arr, n) => arr.filter((l) => l.words >= 2).sort((a, b) => a.words - b.words || a.id.localeCompare(b.id)).slice(0, n);
      const lineHref = (l) => `#/read/${encodeURIComponent(l.entryId)}${l.n > 1 ? `?line=${l.n}` : ''}`;
      const full = pick(r.linesFull, 4);
      if (full.length) readSec.append(h('h3', {}, 'Ready to read'), h('ul', {}, ...full.map((l) => h('li', {}, heSpan(l.he, 'he pg-he'), h('span', { class: 'small muted' }, `${l.title}${l.n > 1 ? `, line ${l.n}` : ''} `), h('a', { href: lineHref(l) }, 'Read it')))));
      const almost = pick(r.linesAlmost, 3);
      if (almost.length) readSec.append(h('h3', {}, 'Almost: one sign away'), h('ul', {}, ...almost.map((l) => { const les = teacherLesson(l.missing[0], d.lessons, d.gates.nameLesson); return h('li', {}, heSpan(l.he, 'he pg-he'), h('span', { class: 'small' }, `${l.title}: needs ${l.missing[0] === '@name' ? 'the Name (read as Adonai)' : niceId(l.missing[0])}. `), les ? h('a', { href: `#/learn?lesson=${les}` }, `Learn it in lesson ${les}`) : null); })));
      if (r.unlockers.length) { const u = r.unlockers[0]; readSec.append(h('p', {}, `Next best sign to learn: ${u.id === '@name' ? 'the Name' : niceId(u.id)}. It opens ${plural(u.lines, 'more line', 'more lines')}.`)); }
      if (r.words.full.length) readSec.append(h('h3', {}, 'Words you can sound out'), h('ul', { class: 'pg-chips', 'aria-label': 'Sample readable words' }, ...r.words.full.slice(0, 12).map((w) => h('li', {}, heSpan(w.he)))), ...(r.words.almost.length ? [h('p', { class: 'small muted' }, `${plural(r.words.almost.length, 'more word', 'more words')} ${r.words.almost.length === 1 ? 'is' : 'are'} one sign away.`)] : []));
      if (goals.includes('israel') || goalSetting === 'both') readSec.append(h('p', { class: 'small' }, `Phrasebook: ${r.phraseFull.length} of ${r.phraseTotal} phrases readable now, ${r.phraseAlmost.length} one sign away.`));
      if (!full.length && !almost.length) readSec.append(h('p', {}, 'No whole line yet. Keep going; the first lines open up after a few lessons.'));
    }
    sections.push(readSec);

    // 2. today
    sections.push(todaySection);

    // 3. paths
    for (const g of goals) {
      const p = evaluatePath(g, d, c);
      sections.push(h('section', { class: 'card', 'aria-labelledby': 'pg-h-path-' + g },
        h('h2', { id: 'pg-h-path-' + g }, `Your path: ${p.title}`),
        h('p', { class: 'muted' }, `${p.done} of ${p.total} milestones. Lessons done: ${g === 'read' ? `${cnt.read.done} of ${cnt.read.total}` : `${cnt.israel.done} of ${cnt.israel.total}`}.`),
        h('progress', { max: String(p.total), value: String(p.done), 'aria-label': `${p.title}: milestones reached` }),
        h('ol', {}, ...p.items.map((m) => h('li', {}, h('span', { class: `pg-tag ${m.status}` }, m.status === 'done' ? 'Done' : m.status === 'next' ? 'Next' : 'Later'), m.label,
          m.status !== 'done' && m.measurable !== false && m.need > 1 ? h('span', { class: 'small muted' }, ` (${m.have} of ${m.need})`) : null,
          m.note && m.status !== 'done' ? h('span', { class: 'small muted' }, ` (${m.note})`) : null,
          m.status === 'next' ? h('span', {}, ' ', h('a', { href: m.href }, 'Go')) : null)))));
    }

    // 4. belts
    const belts = evaluateBelts(d, c);
    const stateText = { earned: 'Earned', ready: 'Ready: only a timed read is left', current: 'Working on', later: 'Later' };
    sections.push(h('section', { class: 'card', 'aria-labelledby': 'pg-h-belts' }, h('h2', { id: 'pg-h-belts' }, 'Belts'),
      h('p', { class: 'small muted' }, 'ALEF\'s own belts (names borrowed, gates are ours). A belt means you have met every letter and sign in its texts and finished its lessons. Reading speed is not measured in the app yet, so no belt asks for it.'),
      ...belts.map((b) => h('details', { open: b.state === 'current' ? true : null }, h('summary', {}, `${b.name} belt: ${stateText[b.state]}`),
        h('p', { class: 'small' }, b.gate),
        h('ul', {}, ...b.gates.map((g) => h('li', { class: 'small' }, `${g.label}: `, g.measurable ? (g.done ? 'met' : `${g.have} of ${g.need}`) : 'cannot be checked in the app yet')))))));

    // 5. weak spots
    const weak = weakSpots(s, { max: d.milestones.settings.weakSpotsMax, has });
    sections.push(h('section', { class: 'card', 'aria-labelledby': 'pg-h-weak' }, h('h2', { id: 'pg-h-weak' }, 'Worth another look'),
      weak.length ? h('ul', {}, ...weak.map((w) => h('li', {}, h('strong', {}, w.label), h('br'), h('span', { class: 'small muted' }, w.detail + '.'), h('br'), h('a', { class: 'btn secondary', href: w.href, 'aria-label': `Practice this: ${w.label}` }, 'Practice this'))))
        : h('p', {}, 'Nothing stands out yet. Spot It, the look-alike check and review cards feed this list as you practise.')));

    // 6. numbers
    const k = c.know, bands = c.vocab, sp = c.spot, cp = c.cp;
    const row = (a, b) => [h('dt', {}, a), h('dd', {}, b)];
    sections.push(h('section', { class: 'card', 'aria-labelledby': 'pg-h-num' }, h('h2', { id: 'pg-h-num' }, 'Your numbers'),
      h('dl', {},
        ...row('Letters traced', `${k.traced.size} of ${ALL_LETTERS.length}`),
        ...row('Letters taught by lessons', `${k.taughtLetters.size} of ${ALL_LETTERS.length}`),
        ...row('Signs taught by lessons', `${k.signs.size} of ${ALL_SIGNS.length}`),
        ...row('Lessons completed', `${cnt.read.done + cnt.israel.done} of ${cnt.read.total + cnt.israel.total}`),
        ...row('Review cards: new / learning / mature', `${c.srs.new} / ${c.srs.learning} / ${c.srs.mature}`),
        ...row('Vocabulary band', bands.reached ? `working in the first ${bands.reached.toLocaleString('en-US')}` : bands.started ? 'just started' : 'not started'),
        ...row('Spot It clean rounds', sp.cleanAtLeast === null ? 'no rounds yet' : `at least ${Math.round(sp.cleanAtLeast * 100)}% of ${sp.trials}`),
        ...row('Look-alike checkpoints passed', cp.passed.length ? cp.passed.map((n) => `${n}`).join(', ') + ' of 1, 2, 3' : 'none yet'),
        ...row('Reading speed', 'not measured')),
      h('p', { class: 'small muted' }, 'Mature means a card the scheduler expects you to remember for 21 days or more. "Learning" is every other card you have started.')));

    sections.push(h('section', { class: 'card', 'aria-labelledby': 'pg-h-bk' }, h('h2', { id: 'pg-h-bk' }, 'Back up your progress'),
      h('p', {}, 'Everything on this screen, including rest days and your goal, is saved with your other data. Back it up or restore it from Settings.'),
      h('a', { class: 'btn secondary', href: '#/settings' }, 'Open Settings')));

    main.replaceChildren(...sections);
    renderToday();
  }
  try { build(); } catch (e) { console.error('progress build failed', e); main.replaceChildren(h('p', { class: 'muted' }, 'Progress could not be computed from the saved data. Your learning is not affected.')); }
  return () => { alive = false; };
}
