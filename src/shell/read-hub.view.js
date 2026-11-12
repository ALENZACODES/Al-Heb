// Thin Read door (#/read-home): a v0 landing so the Read tab and menu
// can open, then send the learner on to the reading pages.
import { h, destIcon } from './ui.js';

const LINKS = [
  ['#/read', 'Read texts'],
  ['#/books', 'Little books'],
  ['#/library', 'Library'],
  ['#/torahreader', 'Torah reader'],
  ['#/shabbat', 'Shabbat Companion'], // lane 5
  ['#/prayer-practice', 'Prayer Practice'], // siddur-speaking lane
  ['#/service', 'Follow the service'],
  ['#/scan', 'Scan'],
  ['#/camera', 'Camera'],
];

export function mount(root) {
  root.replaceChildren(h('article', { class: 'stack card', 'aria-labelledby': 'view-title' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Read'),
    h('p', { class: 'muted' }, 'Stories, prayers and texts, in one place.'),
    h('ul', { class: 'tiles' },
      ...LINKS.map(([href, label]) => h('li', {}, h('a', { class: 'tile', href }, destIcon(href.slice(2), 48, 'read'), h('span', {}, label)))))));
  // every door has its gold coin, like the Go to list on Home (owner, 2026-11-12: no entry without its icon)
}
