// S5 My Timeline (#/timeline): a diary, one entry per day, back to the first day there is anything for. Each day lists what was
// done (counted from this device's own records) and has room for a note. The weekly report summarises; this remembers.
import { h } from '../shell/ui.js';
import { KEY, read, write, clean } from './model.js';
import { VISITS_KEY, timeline, setDayNote, firstDay, MAX } from './diary.js';
import { dayKey } from '../progress/model.js';
import { DECKS } from '../platform/sched-state.js';
import { tryJSON, dayLabel, LINKS } from './shared.js';

const PAGE = 14;

export async function mount(root, ctx, env = {}) {
  const store = ctx?.store; const now = env.now || (() => Date.now());
  const lessons = (await tryJSON('../../data/curriculum/lessons-index.json', env.loadJSON))?.lessons || [];
  const titles = new Map(lessons.map((l) => [l.id, l.title]));
  const decks = {}; for (const [key] of DECKS) decks[key] = await read(store, key, {});
  let visits = await read(store, VISITS_KEY);
  const build = async () => timeline({ completed: (await read(store, 'curriculum.progress', {}))?.completed, checkpoints: await read(store, 'curriculum.checkpoints', {}), books: await read(store, 'books.v1', {}),
    decks, collection: clean(await read(store, KEY)), visits, lessonTitle: (id) => titles.get(id) || id });
  let entries = await build(); let shown = PAGE;
  const today = dayKey(now());
  if (!entries.some((e) => e.day === today)) entries = [{ day: today, lines: [], pages: [], note: '' }, ...entries];
  const status = h('p', { role: 'status', class: 'muted' });
  const list = h('div', { 'data-role': 'days' });
  const more = h('p', {});

  function dayCard(e) {
    const id = `tl-note-${e.day}`;
    return h('article', { class: 'timeline-day', 'data-day': e.day },
      h('h2', {}, e.day === today ? `Today, ${dayLabel(e.day)}` : dayLabel(e.day)),
      e.lines.length ? h('ul', {}, ...e.lines.map((t) => h('li', {}, t))) : null,
      e.pages.length ? h('p', {}, 'Opened: ', ...e.pages.flatMap((p, i) => [i ? ', ' : '', h('a', { href: p.h }, p.t)])) : null,
      !e.lines.length && !e.pages.length && !e.note ? h('p', { class: 'muted' }, 'Nothing recorded yet.') : null,
      h('p', {}, h('label', { for: id }, 'My note for this day'), h('br'), h('textarea', { id, rows: '2', maxlength: String(MAX.note), style: 'width:100%' }, e.note)),
      h('p', {}, h('button', { type: 'button', class: 'btn secondary', 'data-act': 'save-note', onclick: async (ev) => {
        const text = ev.target.closest('article').querySelector('textarea').value;
        visits = setDayNote(await read(store, VISITS_KEY), e.day, text); e.note = text.trim();
        status.textContent = (await write(store, VISITS_KEY, visits)) ? `Note for ${dayLabel(e.day)} saved.` : 'The note could not be saved on this device.';
      } }, 'Save note')));
  }
  function render() {
    list.replaceChildren(...entries.slice(0, shown).map(dayCard));
    more.replaceChildren(shown < entries.length ? h('button', { type: 'button', class: 'btn', 'data-act': 'older', onclick: () => { shown += PAGE; render(); } }, `Show ${Math.min(PAGE, entries.length - shown)} older days`) : h('span', { class: 'muted' }, entries.length > 1 ? `That is everything, back to ${dayLabel(firstDay(entries))}.` : ''));
  }
  root.append(h('section', { class: 'card', 'aria-labelledby': 'view-title' }, h('h1', { id: 'view-title', tabindex: '-1' }, 'My Timeline'),
    h('p', {}, 'Your Hebrew, day by day. Lessons, checkpoints, little books and review answers come from your own records on this device, as far back as they go. Pages you opened are listed from the day this diary began. Add a note to any day.'),
    list, more, status,
    h('p', { class: 'muted' }, h('a', { href: '#/my-week' }, 'My Week'), ...LINKS.filter(([href]) => href !== '#/timeline').flatMap(([href, label]) => [' · ', h('a', { href }, label)]))));
  render();
  return () => {};
}
