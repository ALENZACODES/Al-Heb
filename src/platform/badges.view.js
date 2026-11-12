// H9 Lesson Badges (#/lesson-badges): badges from verified completions only, with the unverified era listed honestly.
import { h } from '../shell/ui.js';
import { lessonBadges } from './badges.js';
import { CHECKS_KEY } from '../curriculum/passmark.js';

async function loadIndex(fetchFn = globalThis.fetch) {
  const url = new URL('../../data/curriculum/lessons-index.json', import.meta.url);
  if (url.protocol === 'file:') { const { readFile } = await import('node:fs/promises'); return JSON.parse(await readFile(url, 'utf8')).lessons || []; }
  const r = await fetchFn(url); if (!r.ok) throw new Error('lessons index HTTP ' + r.status); return (await r.json()).lessons || [];
}

export function mount(root, ctx) {
  const body = h('div', {}, h('p', { class: 'muted', role: 'status' }, 'Loading your lessons…'));
  root.append(h('section', { class: 'card', 'aria-labelledby': 'view-title' }, h('h1', { id: 'view-title', tabindex: '-1' }, 'Lesson Badges'),
    h('p', {}, 'These badges count only verified lessons: ones you passed under the pass rule with your first-try score kept on this device. A lesson marked complete without a kept score does not count, and is listed below as the unverified era.'), body));
  let alive = true;
  const get = (k) => { try { return ctx?.store?.get?.(k, null) ?? null; } catch { return null; } };
  loadIndex(ctx?.readinessFetch || globalThis.fetch).then((lessons) => {
    if (!alive) return;
    const r = lessonBadges({ progress: get('curriculum.progress'), checks: get(CHECKS_KEY), lessons });
    const earned = r.badges.filter((b) => b.earned);
    body.replaceChildren(
      h('p', { role: 'status' }, `${earned.length} of ${r.badges.length} badges earned. ${r.verified.length} verified ${r.verified.length === 1 ? 'lesson' : 'lessons'}.`),
      h('ul', { class: 'wn-list' }, ...r.badges.map((b) => h('li', {}, h('strong', {}, b.name), `: ${b.earned ? 'earned' : `${b.have} of ${b.of}`}. `, h('span', { class: 'muted' }, `Needs ${b.need}.`)))),
      h('h2', {}, 'Verified Lessons'),
      r.verified.length ? h('ul', {}, ...r.verified.map((v) => h('li', {}, `${v.title}: ${v.right} of ${v.of} right on the first try`))) : h('p', {}, 'None yet. Pass a lesson\'s quick check and it appears here.'),
      h('h2', {}, 'Unverified Era'),
      r.unverified.length ? h('div', {}, h('p', {}, `${r.unverified.length} ${r.unverified.length === 1 ? 'lesson was' : 'lessons were'} marked complete without a kept passing score (finished before scores were kept). They stay complete in your course, but they do not count toward these badges. Passing the lesson's check again verifies it.`),
        h('ul', {}, ...r.unverified.map((u) => h('li', {}, h('a', { href: `#/learn?lesson=${encodeURIComponent(u.id)}` }, u.title)))))
        : h('p', {}, 'None: every completed lesson on this device is verified.'),
      h('p', {}, h('a', { class: 'btn secondary', href: '#/certificate' }, 'Certificate of lessons completed'), ' ', h('a', { class: 'btn secondary', href: '#/awards' }, 'All awards')));
  }).catch(() => { if (alive) body.replaceChildren(h('p', { role: 'status' }, 'The lesson list did not load. Open this page again while online.')); });
  return () => { alive = false; };
}
