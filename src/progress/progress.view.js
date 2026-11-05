// ALEF Progress screen: what you can read now, today (streak, gentle goal, rest day), your path per goal, belts, weak spots.
// Everything is computed offline from the store (see model.js). Nothing here is estimated: reading speed comes only from
// the learner's own timed reads (#/timedread), which are self-reported, and is labelled so (see docs/progress/timed-read-spec.md).
import { plain } from '../shell/plain-copy.js';
import { h, heSpan } from '../shell/ui.js';
import { streakVisible } from '../shell/comfort.js';
import { loadProgressData } from './data.js';
import { readSnapshot, makeContext, evaluatePath, evaluateBelts, streakInfo, goalInfo, lessonCounts, dayKey, addDays, teacherLesson, niceId, siddurCoverage, timedReadSummary, readNowSummary, ALL_LETTERS, ALL_SIGNS } from './model.js';
import { setRestDay, setGoalTarget, exportProgressJSON, progressFileName, inspectProgressBackup, importProgress, recordMilestones } from './store.js';
import { weakReport } from './weak.js';
import { weeklySummary, weeklySentences, sparklineSVG, WEEKS } from './weekly.js';
import { evaluateMilestones, milestoneRows } from './milestones.js';

const CSS = `
.pg { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--gap, 1rem); max-inline-size: 100%; overflow-wrap: anywhere; }
.pg > *, .pg li, .pg dl > *, .pg details, .pg .pg-row > * { min-inline-size: 0; }
.pg .pg-row > * { max-inline-size: 100%; }
.pg input, .pg select, .pg textarea { max-inline-size: 100%; box-sizing: border-box; }
.pg .btn { white-space: normal; max-inline-size: 100%; }
.pg .pg-spark-wrap { max-inline-size: 100%; overflow: hidden; }
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
.pg .pg-spark { display: block; inline-size: 100%; max-inline-size: 20rem; block-size: auto; color: var(--accent); }
.pg textarea { inline-size: 100%; max-inline-size: 100%; font-family: monospace; font-size: .85rem; }
.pg-now { list-style: none; padding: 0; margin: 0; display: grid; gap: .6rem; }
.pg-now li { margin: 0; display: grid; grid-template-columns: 1fr auto; gap: .1rem .75rem; align-items: baseline; border-top: 1px solid var(--border); padding-block-start: .4rem; }
.pg-now li:first-child { border-top: 0; padding-block-start: 0; }
.pg-now .pg-now-v { font-weight: 600; }
.pg-now .pg-now-d { grid-column: 1 / -1; }
.pg-now .pg-self { font-size: .75rem; font-weight: 700; padding: 0 .4rem; border: 1px solid var(--border); border-radius: 6px; margin-inline-start: .4rem; }
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

  const showStreak = streakVisible(ctx);
  const todaySection = h('section', { class: 'card', 'aria-labelledby': 'pg-h-today' });
  function renderToday(focusId) {
    const s = readSnapshot(store), t = now(), st = streakInfo(s, t), g = goalInfo(s, t, d.milestones.settings.defaultGoal);
    const today = dayKey(t), yesterday = addDays(today, -1);
    const missedYesterday = !s.rest.includes(yesterday) && streakInfo({ ...s, rest: [...s.rest, yesterday] }, t).count > st.count;
    const streakLine = st.count > 0
      ? `${plural(st.count, 'day', 'days')} in a row${st.restToday ? ' (resting today)' : st.activeToday ? ', including today' : ''}. Best so far: ${st.best}.`
      : st.restToday ? 'Resting today. Your streak is waiting for you.' : plain('progressNoStreak');
    const goalLine = g.lessonsToday > 0 ? `Today's goal is met: you finished ${plural(g.lessonsToday, 'lesson', 'lessons')}.`
      : g.cards >= g.target ? `Today's goal is met: ${plural(g.cards, 'card', 'cards')} reviewed.`
      : `${g.cards} of ${g.target} cards today. Any amount counts.`;
    const sel = h('select', { id: 'pg-goal', onchange: (e) => { try { setGoalTarget(store, Number(e.target.value)); status.textContent = `Daily goal set to ${e.target.value} cards.`; renderToday('pg-goal'); } catch { status.textContent = 'Could not save the goal.'; } } },
      ...[...new Set([...d.milestones.settings.goalChoices, g.target])].sort((a, b) => a - b).map((n) => h('option', { value: String(n), selected: n === g.target ? true : null }, `${n} cards a day`)));
    todaySection.replaceChildren(
      h('h2', { id: 'pg-h-today' }, 'Today'),
      showStreak ? h('p', { class: 'pg-big' }, streakLine) : null,
      h('p', {}, goalLine),
      h('progress', { max: String(g.target), value: String(g.met ? g.target : Math.min(g.cards, g.target)), 'aria-label': 'Cards reviewed today' }),
      showStreak ? h('p', { class: 'small muted' }, plain('progressRestNote')) : null,
      h('div', { class: 'pg-row' },
        h('label', { for: 'pg-goal' }, 'Daily goal '), sel),
      !showStreak ? null : h('div', { class: 'pg-row' },
        h('button', { type: 'button', class: 'btn secondary', id: 'pg-rest', 'aria-pressed': st.restToday ? 'true' : 'false', onclick: () => { setRestDay(store, today, !st.restToday); status.textContent = st.restToday ? 'Rest day removed for today.' : 'Today is a rest day. Your streak is safe.'; renderToday('pg-rest'); } }, st.restToday ? 'Today is a rest day (tap to undo)' : 'Take today as a rest day'),
        missedYesterday ? h('button', { type: 'button', class: 'btn secondary', id: 'pg-rest-y', onclick: () => { setRestDay(store, yesterday, true); status.textContent = 'Yesterday counted as a rest day.'; renderToday('pg-rest-y'); } }, 'Count yesterday as a rest day') : null),
      status);
    if (focusId) todaySection.querySelector('#' + focusId)?.focus();
  }

  function build() {
    const s = readSnapshot(store), c = makeContext(s, d, now());
    const sections = [];
    sections.push(h('p', { class: 'draft-flag', role: 'note' }, 'Draft: the milestones and levels here are ALEF\'s own, and no expert has reviewed them. A native Hebrew speaker has not yet checked the vowel marks.'));

    // 1. what can I read now: one summary over every lane (letters, lines, vocabulary, timed reads, siddur, first day)
    const HREF_ROUTE = { '#/learn': 'learn', '#/read': 'read', '#/vocab': 'vocab', '#/timedread': 'timedread', '#/service': 'service', '#/firstday': 'firstday', '#/firstday/ladder': 'firstday-ladder' };
    const nowRows = readNowSummary(s, d, c);
    sections.push(h('section', { class: 'card', 'aria-labelledby': 'pg-h-now' }, h('h2', { id: 'pg-h-now' }, 'What have I practised?'),
      h('p', { class: 'small muted' }, 'One view across the app. "Taught" rows come from lessons and tracing; "self-reported" rows are what you told the app about your own reading. None of it is a fluency score.'),
      h('ul', { class: 'pg-now' }, ...nowRows.map((row) => h('li', { 'data-now': row.id },
        h('span', {}, row.label, row.measured === 'self' ? h('span', { class: 'pg-self' }, 'self-reported') : null),
        h('span', { class: 'pg-now-v' }, row.value),
        h('span', { class: 'small muted pg-now-d' }, row.detail, has(HREF_ROUTE[row.href] ?? '') ? h('span', {}, ' ', h('a', { href: row.href }, 'Open')) : null))))));

    // 2. lines and words in detail (the hook)
    const r = c.read, cnt = lessonCounts(s, d.lessons);
    const readSec = h('section', { class: 'card', 'aria-labelledby': 'pg-h-read' }, h('h2', { id: 'pg-h-read' }, 'Lines and words using signs you have practised'));
    if (c.know.letters.size === 0) {
      readSec.append(h('p', {}, 'Finish your first lesson and this panel will list prayer lines and words using signs from that lesson.'), h('a', { class: 'btn', href: '#/learn' }, 'Start a lesson'));
    } else {
      const totalLines = r.lines.length;
      readSec.append(h('p', { class: 'pg-big' }, `${plural(r.linesFull.length, 'line', 'lines')} of ${totalLines} prayer and Torah lines, and ${plural(r.words.full.length.toLocaleString('en-US'), 'word', 'words')}, use only signs you have met.`),
        h('p', { class: 'small muted' }, `Based on ${c.know.letters.size} of ${ALL_LETTERS.length} letters (from completed lessons and finished tracing) and ${c.know.signs.size} of ${ALL_SIGNS.length} signs (from completed lessons). This records practice activity; it does not assess recognition or fluent reading.`));
      const pick = (arr, n) => arr.filter((l) => l.words >= 2).sort((a, b) => a.words - b.words || a.id.localeCompare(b.id)).slice(0, n);
      const lineHref = (l) => `#/read/${encodeURIComponent(l.entryId)}${l.n > 1 ? `?line=${l.n}` : ''}`;
      const full = pick(r.linesFull, 4);
      if (full.length) readSec.append(h('h3', {}, 'Try reading'), h('ul', {}, ...full.map((l) => h('li', {}, heSpan(l.he, 'he pg-he'), h('span', { class: 'small muted' }, `${l.title}${l.n > 1 ? `, line ${l.n}` : ''} `), h('a', { href: lineHref(l) }, 'Read it')))));
      const almost = pick(r.linesAlmost, 3);
      if (almost.length) readSec.append(h('h3', {}, 'Almost: one sign away'), h('ul', {}, ...almost.map((l) => { const les = teacherLesson(l.missing[0], d.lessons, d.gates.nameLesson); return h('li', {}, heSpan(l.he, 'he pg-he'), h('span', { class: 'small' }, `${l.title}: needs ${l.missing[0] === '@name' ? 'the Name (read as Adonai)' : niceId(l.missing[0])}. `), les ? h('a', { href: `#/learn?lesson=${les}` }, `Learn it in lesson ${les}`) : null); })));
      if (r.unlockers.length) { const u = r.unlockers[0]; readSec.append(h('p', {}, `Next best sign to learn: ${u.id === '@name' ? 'the Name' : niceId(u.id)}. It opens ${plural(u.lines, 'more line', 'more lines')}.`)); }
      if (r.words.full.length) {
        readSec.append(h('h3', {}, 'Words to practise'), h('ul', { class: 'pg-chips', 'aria-label': 'Sample words using practised signs' }, ...r.words.full.slice(0, 12).map((w) => h('li', {}, heSpan(w.he)))));
        if (r.words.almost.length) readSec.append(h('p', { class: 'small muted' }, `${plural(r.words.almost.length, 'more word', 'more words')} ${r.words.almost.length === 1 ? 'is' : 'are'} one sign away.`));
      }
      if (goals.includes('israel') || goalSetting === 'both') readSec.append(h('p', { class: 'small' }, `Phrasebook: ${r.phraseFull.length} of ${r.phraseTotal} phrases readable now, ${r.phraseAlmost.length} one sign away.`));
      if (!full.length && !almost.length) readSec.append(h('p', {}, 'No whole line yet. Keep going; the first lines open up after a few lessons.'));
    }
    const sc = siddurCoverage(s, d, c);
    if (sc) readSec.append(h('p', { class: 'pg-siddur', 'data-pct': String(sc.pct), 'data-order': sc.orderId },
      `Prayer book coverage: ${sc.pct}% of the phrases in ${sc.title} use signs you have practised`, ' ', h('a', { href: '#/service' }, 'See the service')),
      h('p', { class: 'small muted' }, `${sc.full} of the ${sc.lines} lines ALEF holds for ${sc.title.toLowerCase()} use only letters and signs from your completed activities. This is content coverage, not a reading assessment; ${plural(sc.gaps, 'part', 'parts')} of a typical service ${sc.gaps === 1 ? 'is' : 'are'} not in ALEF yet.`));
    sections.push(readSec);

    // 2. today, then this week
    sections.push(todaySection);
    const wk = weeklySummary(s, now()), ws = weeklySentences(wk);
    const spark = h('div', { class: 'pg-spark-wrap', 'data-series': wk.series.join(',') });
    spark.innerHTML = sparklineSVG(wk.series);
    sections.push(h('section', { class: 'card', 'aria-labelledby': 'pg-h-week', 'data-week': '1' }, h('h2', { id: 'pg-h-week' }, 'This week'),
      h('p', { class: 'small muted' }, `${wk.from} to ${wk.to}. Counted from what the app stored; where it cannot be exact the line says "at least".`),
      h('ul', { class: 'pg-week' },
        h('li', { 'data-w': 'minutes' }, ws.minutes), h('li', { 'data-w': 'days' }, ws.days), h('li', { 'data-w': 'words' }, ws.words),
        h('li', { 'data-w': 'reviews' }, ws.reviews), h('li', { 'data-w': 'reads' }, ws.reads), h('li', { 'data-w': 'streak' }, ws.streak), h('li', { 'data-w': 'rest' }, ws.rest[0].toUpperCase() + ws.rest.slice(1))),
      h('h3', {}, `Dated activity, last ${WEEKS} weeks`), spark,
      h('p', { class: 'small', 'data-w': 'series' }, `Oldest week to this week: ${wk.series.join(', ')} (${wk.seriesTotal} in all).`),
      h('p', { class: 'small muted' }, 'Minutes: the app keeps today\'s time and which past days reached the 5-minute goal, so past days count as 5 minutes each and the total is a floor. Review cards keep only their latest review, so cards reviewed and new words are floors too. The graph counts lessons finished, timed reads, speaking-practice attempts, checkpoints and loanword marks; review cards are left out because older reviews are not dated. Rest days appear only when your Shabbat and Yom Tov setting or you froze them. This is activity, not a measure of how well you read.')));

    // 2b. milestones (certificate-free); dates are kept under progress.milestones.v1
    const evals = evaluateMilestones(s, d, c);
    if (evals.length) {
      try { recordMilestones(store, evals, now()); } catch { /* the list still shows; the dates just are not kept this time */ }
      const rows = milestoneRows(evals, readSnapshot(store).milestonesStore);
      sections.push(h('section', { class: 'card', 'aria-labelledby': 'pg-h-ms' }, h('h2', { id: 'pg-h-ms' }, 'Milestones'),
        h('p', { class: 'small muted' }, 'Personal markers only: no certificate, badge or level. "Started" words are cards you have reviewed at least once, a timed read is self-reported, and coverage means you have been taught the letters and signs, not that you read the lines well.'),
        h('ul', { class: 'pg-ms' }, ...rows.map((m) => h('li', { 'data-ms': m.id, 'data-done': m.achieved ? '1' : '0' },
          h('span', { class: `pg-tag ${m.achieved ? 'done' : ''}` }, m.achieved ? 'Reached' : 'Not yet'), m.label,
          m.achieved ? h('span', { class: 'small muted' }, ` (${m.dateText})`) : h('span', { class: 'small muted' }, m.need > 1 ? ` (${m.have} of ${m.need})` : ''),
          !m.achieved && has(({ '#/vocab': 'vocab', '#/timedread': 'timedread', '#/service': 'service' })[m.href] ?? '') ? h('span', {}, ' ', h('a', { href: m.href }, 'Go')) : null)))));
    }

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
    const stateText = { earned: 'Earned', ready: 'Ready: only a check the app cannot make is left', current: 'Working on', later: 'Later' };
    const timedBelts = belts.filter((b) => b.gates.some((g) => g.kind === 'timedRead'));
    sections.push(h('section', { class: 'card', 'aria-labelledby': 'pg-h-belts' }, h('h2', { id: 'pg-h-belts' }, 'Belts'),
      h('p', { class: 'small muted' }, `Belts are ALEF's own levels, named after colours, like in martial arts. A belt means you have met every letter and vowel sign in its texts and finished its lessons.${timedBelts.length ? ` The ${timedBelts.map((b) => b.name).join(' and ')} belt${timedBelts.length === 1 ? '' : 's'} also ask for timed read-alouds, which you time and mark yourself (self-reported, not measured by the app).` : ''}`),
      ...belts.map((b) => h('details', { open: b.state === 'current' ? true : null }, h('summary', {}, `${b.name} belt: ${stateText[b.state]}`),
        h('p', { class: 'small' }, b.gate),
        h('ul', {}, ...b.gates.map((g) => h('li', { class: 'small', 'data-gate': g.kind }, `${g.label}: `, g.measurable ? (g.done ? 'met' : `${g.have} of ${g.need}`) : 'cannot be checked in the app yet',
          g.note && g.measurable ? h('span', { class: 'muted' }, ` (${g.note})`) : null,
          g.kind === 'timedRead' && !g.done && has('timedread') ? h('span', {}, ' ', h('a', { href: '#/timedread' }, 'Time a read')) : null)))))));

    // 5. weak spots: up to 10, merged across sources, each with a plain-English next step
    const weak = weakReport(s, d, c, { max: 10, has });
    sections.push(h('section', { class: 'card', 'aria-labelledby': 'pg-h-weak' }, h('h2', { id: 'pg-h-weak' }, 'Worth another look'),
      weak.length ? h('p', { class: 'small muted' }, 'Up to ten places where you slip most, from tracing, review cards, Spot It, speaking practice, the placement check and your timed reads. Each source counts slips its own way, so the order is a rough guide. Speaking and timed-read rows rest on a browser recognizer or on your own marks.') : null,
      weak.length ? h('ol', { class: 'pg-weak' }, ...weak.map((w) => h('li', { 'data-weak': w.subject },
        w.he ? heSpan(w.label, 'he pg-he') : h('strong', {}, w.label), h('br'), h('span', { class: 'small muted' }, w.detail + '.'), h('br'),
        h('span', { class: 'small' }, 'Do this next: ' + w.next + ' '), h('a', { class: 'btn secondary', href: w.href, 'aria-label': `Practice this: ${w.he ? 'the word' : w.label}` }, 'Practice this'))))
        : h('p', {}, 'Nothing stands out yet. Spot It, tracing, speaking practice and review cards feed this list as you practise.')));

    // 6. numbers
    const k = c.know, bands = c.vocab, sp = c.spot, cp = c.cp, tr = timedReadSummary(c.timedRead);
    const row = (a, b) => [h('dt', {}, a), h('dd', {}, b)];
    sections.push(h('section', { class: 'card', 'aria-labelledby': 'pg-h-num' }, h('h2', { id: 'pg-h-num' }, 'Your numbers'),
      h('dl', {},
        ...row('Letters traced', `${k.traced.size} of ${ALL_LETTERS.length}`),
        ...row('Letters taught by lessons', `${k.taughtLetters.size} of ${ALL_LETTERS.length}`),
        ...row('Signs taught by lessons', `${k.signs.size} of ${ALL_SIGNS.length}`),
        ...row('Lessons completed', `${cnt.read.done + cnt.israel.done} of ${cnt.read.total + cnt.israel.total}`),
        ...row('Review cards: new / learning / well known', `${c.srs.new} / ${c.srs.learning} / ${c.srs.mature}`),
        ...row('Vocabulary band', bands.reached ? `working in the first ${bands.reached.toLocaleString('en-US')}` : bands.started ? 'just started' : 'not started'),
        ...row('Spot It clean rounds', sp.cleanAtLeast === null ? 'no rounds yet' : `at least ${Math.round(sp.cleanAtLeast * 100)}% of ${sp.trials}`),
        ...row('Look-alike checkpoints passed', cp.passed.length ? cp.passed.map((n) => `${n}`).join(', ') + ' of 1, 2, 3' : 'none yet'),
        ...row('Timed reads (self-reported)', tr.reads ? `${plural(tr.reads, 'read', 'reads')} of ${plural(tr.texts, 'text', 'texts')}` : 'none yet'),
        ...row('Reading speed (self-reported)', tr.best ? `about ${tr.best.medianWpm} clean words a minute on ${tr.best.textId}, median of your last reads` : 'not measured')),
      h('p', { class: 'small muted' }, 'Review cards come back after longer and longer gaps while you keep remembering them. "Well known" means a card you should remember for 21 days or more. "Learning" is every other card you have started. Reading speed comes only from timed reads you timed and marked yourself; the app measures nothing but the clock.')));

    sections.push(backupSection());

    main.replaceChildren(...sections);
    renderToday();
  }
  // Progress-only backup: a JSON file of just the keys this screen reads, with a checksum, for moving progress between devices.
  const bkStatus = h('p', { class: 'small', role: 'status', 'aria-live': 'polite', id: 'pg-bk-status' });
  function downloadJSON(text, name) {
    const out = h('textarea', { class: 'pg-bk-text', readonly: true, 'aria-label': 'Your progress file', rows: '6' }); out.value = text; out.textContent = text;
    try {
      if (typeof Blob === 'function' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        const a = h('a', { href: url, download: name, class: 'btn secondary', id: 'pg-bk-dl' }, `Save ${name}`);
        bkStatus.replaceChildren('Your progress file is ready. ', a, h('details', {}, h('summary', {}, 'Show the file as text (to copy on a phone)'), out));
        if (typeof a.click === 'function') a.click();
        return;
      }
    } catch { /* fall through to the text box */ }
    bkStatus.replaceChildren('Copy this text into a file to keep it. ', out);
  }
  function backupSection() {
    const fileIn = h('input', { type: 'file', id: 'pg-bk-file', accept: '.json,application/json', 'aria-label': 'Import a progress file: choose a file' });
    const modeSel = h('select', { id: 'pg-bk-mode', 'aria-label': 'How to import' }, h('option', { value: 'replace' }, 'Replace my progress with the file'), h('option', { value: 'merge' }, 'Add the file to my progress (if both have the same item, the file wins)'));
    const confirmBox = h('div', { class: 'pg-row', id: 'pg-bk-confirm', hidden: true });
    let pending = null;
    const onText = (text) => {
      const r = inspectProgressBackup(text);
      if (!r.ok) { pending = null; confirmBox.hidden = true; confirmBox.replaceChildren(); bkStatus.textContent = r.error; return; }
      pending = text;
      bkStatus.textContent = `Checked: ${plural(r.keys.length, 'saved item', 'saved items')}${r.exportedAt ? `, saved ${r.exportedAt.slice(0, 10)}` : ''}${r.ignored.length ? `; ${plural(r.ignored.length, 'other key', 'other keys')} will be ignored` : ''}. The file check passed. Nothing is changed until you confirm.`;
      confirmBox.hidden = false;
      confirmBox.replaceChildren(
        h('button', { type: 'button', class: 'btn', id: 'pg-bk-go', onclick: () => {
          if (!pending) return;
          const res = importProgress(store, pending, { mode: modeSel.value === 'merge' ? 'merge' : 'replace' });
          pending = null; confirmBox.hidden = true; confirmBox.replaceChildren();
          if (!res.ok) { bkStatus.textContent = res.error; return; }
          bkStatus.textContent = `Imported ${plural(res.imported, 'saved item', 'saved items')}${res.removed ? `, cleared ${res.removed} not in the file` : ''}. Updating this screen.`;
          try { build(); } catch { /* build reports its own failure */ }
          main.querySelector('#pg-bk-status')?.replaceChildren(`Imported ${plural(res.imported, 'saved item', 'saved items')}${res.removed ? `, cleared ${res.removed} not in the file` : ''}.`);
        } }, 'Confirm import'),
        h('button', { type: 'button', class: 'btn secondary', onclick: () => { pending = null; confirmBox.hidden = true; confirmBox.replaceChildren(); bkStatus.textContent = 'Import cancelled. Nothing was changed.'; } }, 'Cancel'));
    };
    fileIn.addEventListener('change', async (e) => {
      const f = e.target && e.target.files && e.target.files[0];
      if (!f) return;
      try { onText(typeof f.text === 'function' ? await f.text() : String(f)); } catch { bkStatus.textContent = 'The file could not be read.'; }
    });
    const paste = h('textarea', { id: 'pg-bk-paste', rows: '3', 'aria-label': 'Or paste a progress file here', placeholder: 'Or paste the contents of a progress file here' });
    return h('section', { class: 'card', 'aria-labelledby': 'pg-h-bk' }, h('h2', { id: 'pg-h-bk' }, 'Back up your progress'),
      h('p', {}, 'Everything on this screen, including rest days and your goal, is saved with your other data. Back up or restore the whole app from Settings.'),
      h('a', { class: 'btn secondary', href: '#/settings' }, 'Open Settings'),
      h('h3', {}, 'Progress only'),
      h('p', { class: 'small muted' }, 'A smaller file with just what this screen reads (lessons, cards, tracing, checkpoints, timed reads, first-day work, rest days and goal). It has a built-in check, so a file that was cut short or edited is refused before anything changes.'),
      h('div', { class: 'pg-row' },
        h('button', { type: 'button', class: 'btn secondary', id: 'pg-bk-export', onclick: () => { try { downloadJSON(exportProgressJSON(store, now()), progressFileName(now())); } catch { bkStatus.textContent = 'The progress file could not be made.'; } } }, 'Export progress file')),
      h('div', { class: 'pg-row' }, h('label', { for: 'pg-bk-file' }, 'Import a progress file '), fileIn),
      h('div', { class: 'pg-row' }, paste, h('button', { type: 'button', class: 'btn secondary', id: 'pg-bk-check', onclick: () => onText(paste.value ?? paste.textContent ?? '') }, 'Check pasted file')),
      h('div', { class: 'pg-row' }, h('label', { for: 'pg-bk-mode' }, 'When importing '), modeSel),
      confirmBox, bkStatus);
  }
  try { build(); } catch (e) { console.error('progress build failed', e); main.replaceChildren(h('p', { class: 'muted' }, 'Progress could not be shown right now. Your saved learning is not affected.')); }
  return () => { alive = false; };
}
