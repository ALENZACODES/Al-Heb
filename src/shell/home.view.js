import { h, heSpan } from './ui.js';
import { tHe } from './i18n.js';

async function tryImport(paths) {
  for (const p of paths) { try { return await import(new URL(p, import.meta.url).href); } catch { /* try next */ } }
  return null;
}

export const QUICK = [['letters', '#/letters'], ['sounds', '#/sounds'], ['read', '#/read'], ['scan', '#/scan'], ['calendar', '#/calendar']];

export function mount(root, ctx) {
  const { settings, store, t } = ctx;
  let alive = true;
  const todayBody = h('p', { class: 'muted' }, t('home.today.none'));
  const dueBody = h('p', { class: 'muted' }, t('home.due.none'));

  root.replaceChildren(h('div', { class: 'stack' },
    h('header', {}, h('h1', { id: 'view-title', tabindex: '-1' }, h('span', {}, t('app.name')), ' ', heSpan('אלף')), h('p', { class: 'muted' }, t('app.tagline'))),
    h('section', { class: 'card opening', 'aria-labelledby': 'h-open' },
      h('h2', { id: 'h-open' }, t('home.opening.title')),
      h('p', { class: 'draft-flag', role: 'note' }, t('home.opening.draft')),
      h('p', {}, t('home.opening.body')),
      h('a', { class: 'btn secondary', href: '#/read' }, t('home.opening.link'))),
    h('section', { class: 'card', 'aria-labelledby': 'h-today' }, h('h2', { id: 'h-today' }, t('home.today')), todayBody),
    h('section', { class: 'card', 'aria-labelledby': 'h-due' }, h('h2', { id: 'h-due' }, t('home.due')), dueBody),
    h('nav', { class: 'card', 'aria-labelledby': 'h-quick' }, h('h2', { id: 'h-quick' }, t('home.quick')),
      h('ul', { class: 'tiles' }, ...QUICK.map(([k, href]) => h('li', {}, h('a', { class: 'tile', href }, h('span', {}, t('nav.' + k)), heSpan(tHe('nav.' + k)))))) ),
    h('section', { class: 'card', 'aria-labelledby': 'h-ref' }, h('h2', { id: 'h-ref' }, t('home.reflect')),
      h('a', { class: 'btn secondary', href: '#/calendar' }, t('home.reflect.link'))),
    ctx.installPrompt?.available() ? h('button', { class: 'btn', type: 'button', onclick: () => ctx.installPrompt.prompt() }, t('home.install')) : null));

  // Lane 1 data, best effort. Real module shapes are documented in docs/ARCHITECTURE.md.
  (async () => {
    const cur = await tryImport(['../curriculum/index.js', '../curriculum/lessons.js']);
    if (!alive) return;
    const lessons = cur?.lessons;
    if (Array.isArray(lessons) && lessons.length) {
      const track = settings.get('israelTrack') ? 'israel' : 'read';
      const done = new Set(store.get('progress.completed', []));
      const next = lessons.find((l) => l.track === track && !done.has(l.id)) ?? lessons.find((l) => !done.has(l.id)) ?? lessons[0];
      todayBody.replaceChildren(h('strong', {}, next.title ?? next.id), ' ', h('a', { class: 'btn', href: `#/learn?lesson=${encodeURIComponent(next.id)}` }, t('home.today.start')));
    }
    const srs = await tryImport(['../curriculum/srs.js']);
    if (!alive || !srs?.due) return;
    try {
      const raw = store.get('srs.cards', {});
      const cards = Array.isArray(raw) ? raw : Object.values(raw);
      const n = srs.due(cards, new Date()).length;
      if (n > 0) dueBody.replaceChildren(h('a', { href: '#/learn?review=1' }, t('home.due.count', { n })));
    } catch { /* leave default */ }
  })();
  return () => { alive = false; };
}
