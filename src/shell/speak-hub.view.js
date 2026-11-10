// Thin Speak door (#/speak-home): a v0 landing so the Speak tab and menu
// can open, then send the learner on to speaking and listening pages.
import { h } from './ui.js';

const LINKS = [
  ['#/speak', 'Say it'],
  ['#/talk', 'Talk'],
  ['#/listen', 'Listen and pick'],
  ['#/songs', 'Songs'],
  ['#/traditions', 'Pronunciation styles'],
];

export function mount(root) {
  root.replaceChildren(h('article', { class: 'stack card', 'aria-labelledby': 'view-title' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Speak'),
    h('p', { class: 'muted' }, 'Practice saying the words, and hear how they sound.'),
    h('ul', { class: 'tiles' },
      ...LINKS.map(([href, label]) => h('li', {}, h('a', { class: 'tile', href }, label))))));
}
