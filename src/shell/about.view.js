import { h } from './ui.js';
import { readinessNode } from './readiness.js';
import { audioTruthNode } from './audio-truth.js';

export function mount(root, ctx) {
  root.replaceChildren(h('article', { class: 'stack' },
    h('section', { class: 'card' },
      h('h1', { id: 'view-title', tabindex: '-1' }, ctx.t('about.title')),
      h('p', {}, 'ALEF is a Hebrew course with two goals. One is to read the Torah and prayers aloud in synagogue. The other is to get around in Israel and sound natural.'),
      h('p', {}, 'This is an early version. A Hebrew speaker or rabbi has not yet checked the Hebrew labels or the prayer text. ', h('a', { href: '#/how' }, 'How this works'), ' lists what is and is not finished.'),
      audioTruthNode(h, { id: 'about-audio-truth', fetchFn: ctx.readinessFetch }), // counts read from data/audio/summary.json
      h('p', {}, 'ALEF has no software licence yet. Until one is added, all rights to its code and original text are reserved.')),
    readinessNode(h, { open: true, fetchFn: ctx.readinessFetch }),
    h('section', { class: 'card', id: 'credits', 'aria-labelledby': 'cr-top' }, h('h2', { id: 'cr-top' }, 'Credits & licences'),
      h('p', { class: 'draft-flag', role: 'note' }, 'Everything here is a draft and has not been reviewed. Licence labels are what each source says about itself, and a lawyer has not checked them. No native speaker, rabbi or teacher has reviewed the Hebrew, the vowel marks, the English spelling of Hebrew words, or the translations.'),
      h('p', {}, 'Every source is listed on one page: words, scripture, prayers, calendar data, fonts, software and online services. Each has its licence, a link, and a note on whether the licence was checked.'),
      h('p', {}, h('a', { class: 'btn', href: '#/credits' }, 'Credits and licences'), ' ', h('a', { class: 'btn secondary', href: '#/privacy' }, 'Privacy'), ' ', h('a', { class: 'btn secondary', href: '#/how' }, 'How this works'), ' ', h('a', { class: 'btn secondary', href: '#/settings' }, 'Settings')))));
  return () => {};
}
