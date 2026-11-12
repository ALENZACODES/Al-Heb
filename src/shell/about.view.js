import { h } from './ui.js';
import { readinessNode } from './readiness.js';
import { audioTruthNode } from './audio-truth.js';
import { buildStamp, BUILD, AUDIO_CATALOGUE, LESSONS, BOOKS, DICTIONARY, SCOPE, fmt } from '../lib/counts.js';

export function mount(root, ctx) {
  root.replaceChildren(h('article', { class: 'stack' },
    h('section', { class: 'card' },
      h('h1', { id: 'view-title', tabindex: '-1' }, ctx.t('about.title')),
      h('p', {}, 'Aleph is a Hebrew course with two goals. One is to read the Torah and prayers aloud in synagogue. The other is to get around in Israel and sound natural.'),
      h('p', {}, 'This is an early version. A Hebrew speaker or rabbi has not yet checked the Hebrew labels or the prayer text. ', h('a', { href: '#/how' }, 'How this works'), ' lists what is and is not finished.'),
      audioTruthNode(h, { id: 'about-audio-truth', fetchFn: ctx.readinessFetch }), // counts read from data/audio/summary.json
      // Course totals and the audio catalogue from src/lib/counts.js (counted from the served data at build time), and the build stamp.
      h('p', { id: 'about-counts' }, `The course: ${LESSONS.all} ${SCOPE.all} (${LESSONS.reading} reading, ${LESSONS.israel} Israel), ${fmt(BOOKS)} story books and a ${fmt(DICTIONARY.words)}-word dictionary. ${aboutAudioSentence(AUDIO_CATALOGUE)}`),
      h('p', { id: 'about-build', 'data-version': BUILD.version, 'data-built': BUILD.builtAt }, buildStamp()),
      h('p', {}, 'Made by John Khan. Aleph is \u00a9 2026 John Khan. All rights reserved.')),
    readinessNode(h, { open: true, fetchFn: ctx.readinessFetch }),
    h('section', { class: 'card', id: 'credits', 'aria-labelledby': 'cr-top' }, h('h2', { id: 'cr-top' }, 'Credits & licences'),
      h('p', { class: 'draft-flag', role: 'note' }, 'Everything here is a draft and has not been reviewed. Licence labels are what each source says about itself, and a lawyer has not checked them. No native speaker, rabbi or teacher has reviewed the Hebrew, the vowel marks, the English spelling of Hebrew words, or the translations.'),
      h('p', {}, 'Every source is listed on one page: words, scripture, prayers, calendar data, fonts, software and online services. Each has its licence, a link, and a note on whether the licence was checked.'),
      h('p', {}, h('a', { class: 'btn', href: '#/credits' }, 'Credits and licences'), ' ', h('a', { class: 'btn secondary', href: '#/privacy' }, 'Privacy'), ' ', h('a', { class: 'btn secondary', href: '#/terms' }, 'Terms'), ' ', h('a', { class: 'btn secondary', href: '#/how' }, 'How this works'), ' ', h('a', { class: 'btn secondary', href: '#/settings' }, 'Settings')))));
  return () => {};
}

/** C-02 (12 Nov site check): the three clip figures on this page, each said with what it counts, from one source (src/lib/counts.js). */
export function aboutAudioSentence(a) {
  const sm = a?.summary;
  if (!sm || !Number.isFinite(sm.spoken)) return `The audio catalogue lists ${fmt(a?.total)} clips in its manifests, ${fmt(a?.synthetic)} of them synthetic and ${fmt(a?.recorded)} recorded.`;
  const parts = [[sm.tts, 'have their own synthetic file'], [sm.playsIsraeli, 'play the Israeli clip of the same voice'], [sm.viaOther, 'play a linked clip with the same text'], [sm.missing, 'have no clip yet']]
    .filter(([v]) => Number.isFinite(v) && v > 0).map(([v, t]) => `${fmt(v)} ${t}`);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0] || '';
  return `Sound, counted two ways: ${fmt(sm.spoken)} Hebrew clips you can hear in the app (the course catalogue plus dictionary words, book pages, game lines and home-page clips), all synthetic and ${fmt(sm.recorded || 0)} recorded; and ${fmt(sm.total)} catalogue rows, one for each clip, voice and tradition, of which ${list}.`;
}
