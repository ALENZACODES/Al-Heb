// Homepage and Welcome hero only. A one-off fine-art olive tree for this slot.
// It is not part of the flat-vector image sets, and it is not an approval for live use.
import { h, heSpan } from './ui.js';
import { ROUTES } from './router.js';

export const HOME_HERO_SRC = 'assets/img/gen/HERO_home_tree.webp';
export const HOME_HERO_ALT = 'An ancient olive tree with a twisted trunk, silvery-green leaves edged in gold, and roots over pale stones, above dark green hills.';

export function homeHeroNode(ctx) {
  const books = ROUTES.some((r) => r.name === 'books') && (typeof ctx?.hasRoute === 'function' ? !!ctx.hasRoute('books') : true);
  return h('section', { class: 'show-hero', 'aria-label': 'The Tree of Knowledge' },
    h('img', { class: 'show-hero-img', src: HOME_HERO_SRC, alt: HOME_HERO_ALT, width: '1600', height: '914', loading: 'eager', decoding: 'async' }),
    h('div', { class: 'show-hero-shade', 'aria-hidden': 'true' }),
    h('div', { class: 'show-hero-text' },
      h('p', { class: 'show-kicker' }, 'The Tree of Knowledge'),
      h('p', { class: 'show-title' }, 'Learn to read ', heSpan('עִבְרִית'), ' — Hebrew'),
      h('p', { class: 'show-sub' }, 'Prayers, Torah and everyday Israel. A few minutes a day, in your own tradition\u2019s voice.'),
      h('p', { class: 'show-cta' },
        h('a', { class: 'btn show-btn', href: '#/firstday' }, 'Start your first 10 minutes'),
        books ? h('a', { class: 'btn secondary show-btn2', href: '#/books' }, 'Read a story book') : null)));
}
