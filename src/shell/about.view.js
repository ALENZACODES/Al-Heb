import { h } from './ui.js';
export function mount(root, ctx) {
  root.replaceChildren(h('article', { class: 'card' },
    h('h1', { id: 'view-title', tabindex: '-1' }, ctx.t('about.title')),
    h('p', {}, 'ALEF is an interactive Hebrew course with two goals: reading Torah and prayers aloud with a congregation, and getting around in Israel without sounding like an outsider.'),
    h('p', {}, 'Status: early build. Audio uses your device\'s speech synthesis unless recordings are present; Hebrew UI labels and all prayer text await native/clergy review. See the repository README and docs/STATUS.md for exactly what is built.'),
    h('p', {}, 'The software license has not been chosen yet.')));
  return () => {};
}
