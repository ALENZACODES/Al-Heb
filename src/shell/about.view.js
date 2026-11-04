import { h } from './ui.js';

export function mount(root, ctx) {
  root.replaceChildren(h('article', { class: 'stack' },
    h('section', { class: 'card' },
      h('h1', { id: 'view-title', tabindex: '-1' }, ctx.t('about.title')),
      h('p', {}, 'ALEF is an interactive Hebrew course with two goals: reading Torah and prayers aloud with a congregation, and getting around in Israel without sounding like an outsider.'),
      h('p', {}, 'Status: early build. Audio uses your device\'s speech synthesis because no recordings exist yet; Hebrew UI labels and all prayer text await native/clergy review. ', h('a', { href: '#/how' }, 'How this works'), ' lists exactly what is and is not finished.'),
      h('p', {}, 'The software licence has not been chosen yet: until one is added, all rights in ALEF\'s own code and original text are reserved.')),
    h('section', { class: 'card', id: 'credits', 'aria-labelledby': 'cr-top' }, h('h2', { id: 'cr-top' }, 'Credits & licences'),
      h('p', { class: 'draft-flag', role: 'note' }, 'Status: everything is draft and unreviewed. Licence labels are what each source says about itself; they were not checked by a lawyer, and no native speaker, rabbi or educator has reviewed the Hebrew, the pointing, the transliteration or the translations.'),
      h('p', {}, 'Every source (vocabulary, scripture, prayer text, calendar data, fonts, software and online services) is listed in one place, with its licence, a link and whether that licence was verified.'),
      h('p', {}, h('a', { class: 'btn', href: '#/credits' }, 'Credits and licences'), ' ', h('a', { class: 'btn secondary', href: '#/privacy' }, 'Privacy'), ' ', h('a', { class: 'btn secondary', href: '#/how' }, 'How this works'), ' ', h('a', { class: 'btn secondary', href: '#/settings' }, 'Settings')))));
  return () => {};
}
