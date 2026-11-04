// ALEF Class track: a 10-week adult reading plan (DRAFT, ALEF original). Week list with progress from the store,
// a printable per-week handout and a one-page teacher/cantor session plan. No external dependencies.
import { h, heSpan } from '../shell/ui.js';
import { niceId } from '../progress/model.js';
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

const list = (items, cls) => h('ul', cls ? { class: cls } : {}, ...items.map((x) => h('li', {}, x)));
const names = (ids) => ids.map(niceId).join(', ');

export function mount(root, ctx = {}) {
  let alive = true;
  const style = h('style', {}); style.textContent = CSS;
  const main = h('div', { class: 'ct' });
  root.replaceChildren(style, h('h1', { id: 'view-title', tabindex: '-1' }, 'Class track'), h('p', { class: 'muted', role: 'status' }, 'Loading the class track...'), main);
  const loading = root.querySelector ? root.querySelector('p[role=status]') : null;

  (async () => {
    let d, completed;
    try { d = await loadClassTrack(); completed = await readCompleted(ctx.store); }
    catch (e) { if (alive && loading) loading.textContent = 'The class track could not load its data files. Your learning is not affected.'; return; }
    if (!alive) return;
    if (loading) loading.remove();
    const weeks = d.track.weeks;
    const problems = validate(d);
    const wk = Number(ctx.query?.week), idx = Number.isInteger(wk) && wk >= 1 && wk <= weeks.length ? wk - 1 : -1;
    const mode = ctx.query?.mode === 'teacher' ? 'teacher' : ctx.query?.mode === 'handout' ? 'handout' : '';
    const draft = h('p', { class: 'draft-flag', role: 'note' }, DRAFT);
    const bad = problems.length ? h('p', { role: 'alert' }, `Data check found ${problems.length} problem(s): ${problems[0]}`) : null;
    const printBtn = () => h('button', { type: 'button', class: 'btn ct-noprint', onclick: () => { if (typeof window !== 'undefined' && window.print) window.print(); } }, 'Print this page');
    const lessonTitle = (id) => d.lessons.find((l) => l.id === id)?.title || id;

    function renderList() {
      const cur = currentWeekIndex(weeks, completed);
      const total = weeks.reduce((a, w) => a + w.lessons.length, 0), done = weeks.reduce((a, w) => a + weekStatus(w, completed).done, 0);
      main.replaceChildren(draft, ...(bad ? [bad] : []),
        h('section', { class: 'card', 'aria-labelledby': 'ct-h-over' },
          h('h2', { id: 'ct-h-over' }, 'A ten-week plan for a beginners reading class'),
          h('p', {}, 'Each week gives a few letters and signs, a 10-minute warm-up, text to read aloud, homework in this app and a self-check. Use it alongside a class or on your own. It is not a copy of any book or course.'),
          h('progress', { max: String(total), value: String(done), 'aria-label': 'Core lessons finished in the class track' }),
          h('p', { class: 'small muted' }, `${done} of ${total} core lessons finished${cur === -1 ? '. All ten weeks are done.' : `. Next: week ${weeks[cur].week}.`}`)),
        h('ol', { class: 'ct-weeks', style: 'list-style:none;padding:0;display:grid;gap:.75rem' }, ...weeks.map((w, i) => {
          const s = weekStatus(w, completed), state = s.complete ? 'done' : i === cur ? 'next' : 'later';
          return h('li', { class: 'card', 'data-week': String(w.week), 'data-state': state },
            h('h2', {}, h('span', { class: 'ct-tag ' + state }, state === 'done' ? 'Done' : state === 'next' ? 'Next' : 'Later'), `Week ${w.week}: ${w.title}`),
            h('p', { class: 'small' }, `${s.done} of ${s.total} lessons${s.stretchTotal ? `, ${s.stretchDone} of ${s.stretchTotal} extras` : ''}: ${w.lessons.join(', ')}`),
            h('div', { class: 'ct-row' },
              h('a', { class: 'btn', href: `#/classtrack/${w.week}` }, 'Open week'),
              h('a', { class: 'btn secondary', href: `#/classtrack/${w.week}/handout` }, 'Handout'),
              h('a', { class: 'btn secondary', href: `#/classtrack/${w.week}/teacher` }, 'Teacher plan')));
        })));
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
          h('div', { class: 'ct-row' }, h('a', { class: 'btn', href: `#/classtrack/${w.week}/handout` }, 'Printable handout'), h('a', { class: 'btn secondary', href: `#/classtrack/${w.week}/teacher` }, 'Teacher plan'))));
    }

    function renderHandout(i) {
      const w = weeks[i], ra = readAloudTexts(d, w);
      main.replaceChildren(h('p', { class: 'ct-noprint' }, h('a', { href: `#/classtrack/${w.week}` }, `Back to week ${w.week}`)), printBtn(),
        h('article', { class: 'ct-sheet card', 'aria-label': `Week ${w.week} handout` },
          ...weekHeader(i),
          h('h3', {}, 'This week'), list(w.goals),
          h('h3', {}, 'Lessons in ALEF'), list([...w.lessons.map((id) => `${id}: ${lessonTitle(id)}`), ...(w.stretch || []).map((id) => `Extra: ${id}: ${lessonTitle(id)}`)]),
          h('h3', {}, `${w.readAloud.mode === 'listen' ? 'Listen to' : 'Read aloud'}`),
          ...(w.readAloud.mode === 'listen' ? [h('p', {}, `Listen to: ${ra.map((t) => t.title).join('; ')}. Do not read it yet.`)] : ra.flatMap((t) => [h('p', { class: 'small' }, t.title), ...t.lines.map((l) => heSpan(l, 'he ct-he'))])),
          h('h3', {}, 'Homework'), h('ul', { class: 'ct-checks' }, ...w.homework.map((x) => h('li', {}, h('span', { class: 'ct-box', 'aria-hidden': 'true' }), `${x.label} (about ${x.minutes} min)`))),
          h('h3', {}, 'Can you...'), h('ul', { class: 'ct-checks' }, ...w.canYou.map((c) => h('li', {}, h('span', { class: 'ct-box', 'aria-hidden': 'true' }), `...${c}?`))),
          h('p', { class: 'small' }, 'Culture note: ', w.culture),
          h('p', { class: 'small' }, 'ALEF class track: original plan, draft, not reviewed by an educator.')));
    }

    function renderTeacher(i) {
      const w = weeks[i], ra = readAloudTexts(d, w), er = commonErrors(d, w), nw = newInWeek(d, i);
      main.replaceChildren(h('p', { class: 'ct-noprint' }, h('a', { href: `#/classtrack/${w.week}` }, `Back to week ${w.week}`)), printBtn(),
        h('article', { class: 'ct-sheet ct-teacher card', 'aria-label': `Week ${w.week} teacher plan` },
          ...weekHeader(i),
          h('h3', {}, `Timing (${d.track.sessionMinutes} minutes)`), h('ol', {}, ...d.track.teacherPlan.map((p) => h('li', {}, `${p.min} min: ${p.what}`))),
          h('h3', {}, 'Warm-up'), list(w.warmUp.steps.map((s) => `${s.min} min. ${s.text}`)),
          h('h3', {}, 'New today'), h('p', {}, `Letters: ${nw.letters.length ? names(nw.letters) : 'none'}. Signs: ${nw.signs.length ? names(nw.signs) : 'none'}. Lessons: ${w.lessons.join(', ')}.`),
          h('h3', {}, 'What to say'), list([...d.track.teacherSay, ...w.goals.map((g) => `Aim: ${g}.`)]),
          h('h3', {}, w.readAloud.mode === 'listen' ? 'Play or sing (learners listen only)' : 'Read aloud'),
          ...(w.readAloud.mode === 'listen' ? [h('p', {}, ra.map((t) => t.title).join('; '))] : ra.flatMap((t) => [h('p', { class: 'small' }, t.title), ...t.lines.map((l) => heSpan(l, 'he ct-he'))])),
          h('h3', {}, 'Common errors to listen for'),
          er.gaps.length || er.kinds.length ? h('ul', {}, ...er.gaps.map((g) => h('li', {}, `${g.title}: ${g.trap}`)), ...er.kinds.map((k) => h('li', {}, `${k.kind}: ${k.hint}`))) : h('p', {}, 'No specific error data for this week.'),
          h('p', { class: 'small' }, 'Error text comes from ALEF\'s sound-gap and hints data, which is itself a draft written from general knowledge and not checked with learners.'),
          h('h3', {}, 'Homework to give'), list(w.homework.map((x) => `${x.label} (about ${x.minutes} min)`)),
          h('h3', {}, 'Self-check at the end'), list(w.canYou.map((c) => `Can you ${c}?`)),
          h('p', { class: 'small' }, 'Culture note: ', w.culture)));
    }

    if (idx < 0) renderList(); else if (mode === 'teacher') renderTeacher(idx); else if (mode === 'handout') renderHandout(idx); else renderWeek(idx);
    const t = root.querySelector ? root.querySelector('#view-title') : null; if (t && t.focus) t.focus();
  })();
  return () => { alive = false; };
}
