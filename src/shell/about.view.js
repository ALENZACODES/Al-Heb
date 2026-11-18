import { h } from './ui.js';
import { audioTruthNode } from './audio-truth.js';
import { buildStamp, BUILD, LESSONS, BOOKS, DICTIONARY, fmt } from '../lib/counts.js';

export function mount(root, ctx) {
  root.replaceChildren(h('article', { class: 'stack' },
    h('section', { class: 'card' },
      h('h1', { id: 'view-title', tabindex: '-1' }, ctx.t('about.title')),
      h('p', {}, 'Aleph teaches you to read Hebrew prayers and the Torah aloud with your congregation, and to speak everyday Hebrew in Israel.'),
      // Course totals from src/lib/counts.js (counted from the served data at build time).
      h('p', { id: 'about-counts' }, `${LESSONS.all} lessons (${LESSONS.reading} for reading, ${LESSONS.israel} for Israel), ${fmt(BOOKS)} little books and a ${fmt(DICTIONARY.words)}-word dictionary.`),
      audioTruthNode(h, { id: 'about-audio-truth', fetchFn: ctx.readinessFetch, detail: false, prefix: '' }), // the one place that describes the voices (src/shell/audio-truth.js)
      h('p', {}, 'Aleph is new and still growing. Lessons, words and pictures are added and improved with every update.'),
      h('p', {}, 'Made by John Khan. Aleph is \u00a9 2026 John Khan. All rights reserved.'),
      h('p', { id: 'about-build', class: 'muted small', 'data-version': BUILD.version, 'data-built': BUILD.builtAt }, buildStamp())),
    h('section', { class: 'card', id: 'credits', 'aria-labelledby': 'cr-top' }, h('h2', { id: 'cr-top' }, 'Credits and Licences'),
      h('p', {}, 'Aleph is built on public-domain texts, open dictionaries, open fonts and free software. Every source is listed with its licence.'),
      h('p', {}, h('a', { class: 'btn', href: '#/credits' }, 'Credits and licences'), ' ', h('a', { class: 'btn secondary', href: '#/privacy' }, 'Privacy'), ' ', h('a', { class: 'btn secondary', href: '#/terms' }, 'Terms'), ' ', h('a', { class: 'btn secondary', href: '#/settings' }, 'Settings')))));
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
