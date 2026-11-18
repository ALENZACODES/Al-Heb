// /terms: the rights page. Ownership and terms for Aleph itself, and the one learner-facing
// roll of credits: music and sounds, the historic recordings, text sources, fonts, and the
// note about the voices. The full source-by-source licence ledger stays on /credits.
import { h } from './ui.js';
import { LISTEN_ITEMS, MUSIC_TRACKS, ORIGINAL_MUSIC_TRACKS, ORIGINAL_SONG_TRACKS } from '../listen/catalog.js';

const FONTS = ['Heebo', 'Frank Ruhl Libre', 'Gveret Levin', 'Alef', 'Noto Sans Hebrew', 'Noto Serif Hebrew'];

export function mount(root, ctx) {
  const t = (k, fb) => { const v = ctx && typeof ctx.t === 'function' ? ctx.t(k) : null; return v && v !== k ? v : fb; };
  root.replaceChildren(h('article', { class: 'stack', id: 'terms' },
    h('section', { class: 'card' },
      h('h1', { id: 'view-title', tabindex: '-1' }, t('nav.terms', 'Terms and rights')),
      h('p', {}, '© 2026 John Khan. All rights reserved.'),
      h('p', {}, 'Aleph (the app, its lessons, its original text and its artwork) belongs to John Khan. You may use it for your own learning, free of charge. Nothing here grants a right to copy, redistribute or resell the app or its original material.'),
      h('p', { class: 'muted' }, 'Material from other sources keeps its own licence, set out below. Every source is listed on the Credits page. This page is a plain-language summary, not legal advice.')),
    h('section', { class: 'card', 'aria-labelledby': 'terms-music' },
      h('h2', { id: 'terms-music' }, 'Music and sound effects'),
      h('p', {}, 'The arcade loops and the interface sound effects are by Kenney (kenney.nl), released under CC0 1.0. No credit is required; we give it with thanks.'),
      h('ul', {}, ...MUSIC_TRACKS.map((m) => h('li', {}, `${m.title}: ${m.role} music`))),
      h('p', {}, 'The original beds and songs were made for Aleph. © 2026 John Khan. All rights reserved.'),
      h('ul', {}, ...[...ORIGINAL_MUSIC_TRACKS, ...ORIGINAL_SONG_TRACKS].map((m) => h('li', {}, `${m.title}: ${m.role}`)))),
    h('section', { class: 'card', 'aria-labelledby': 'terms-recordings' },
      h('h2', { id: 'terms-recordings' }, 'Historic recordings (Sacred Listen)'),
      h('p', {}, 'These are real recordings, listed with their performers and licences. The copies you hear were cleaned up for clarity (gentle noise reduction, de-clicking and even loudness); the originals are kept unchanged. For CC BY-SA items, the cleaned-up copy is shared under the same licence.'),
      h('ul', {}, ...LISTEN_ITEMS.map((r) => h('li', {}, `${r.title}: ${r.performer}. ${r.licence}. Source: ${r.source}${r.sourceTitle ? `, filed as "${r.sourceTitle}"` : ''}.`)))),
    h('section', { class: 'card', 'aria-labelledby': 'terms-texts' },
      h('h2', { id: 'terms-texts' }, 'Text sources'),
      h('ul', {},
        h('li', {}, 'Hebrew Bible text: the Unicode/XML Leningrad Codex (UXLC), Tanach.us, free to view and copy without restriction.'),
        h('li', {}, 'English Bible translation: the Jewish Publication Society translation of 1917, public domain.'),
        h('li', {}, 'Prayer texts: the Metsudah siddur (CC BY, as labelled by Sefaria), Torat Emet 357 (public domain, as labelled), and Siddur Edot HaMizrach, Shaliehsaboo edition (CC0, as labelled).'),
        h('li', {}, 'Calendar data: derived from Hebcal (hebcal.com), CC BY 4.0.'),
        h('li', {}, 'Vocabulary senses draw on public-domain and openly licensed word lists; the per-source detail is on the Credits page.'))),
    h('section', { class: 'card', 'aria-labelledby': 'terms-torah' },
      h('h2', { id: 'terms-torah' }, 'Torah text and readings'),
      h('ul', {},
        h('li', {}, 'Torah Hebrew text: Unicode/XML Leningrad Codex (UXLC), Tanach.us Inc. The biblical Hebrew text may be viewed or copied without restriction. It is the Leningrad Codex in a Unicode edition; it is not represented as the Westminster Leningrad Codex.'),
        h('li', {}, 'Torah English translation: The Holy Scriptures: A New Translation, Jewish Publication Society, 1917, public domain. Digital text via the Open Siddur Project and Sefaria. Newer JPS translations (1985, 2006, 2023) are not in the public domain and are not used.'),
        h('li', {}, 'Weekly portion names, ranges and schedule: derived from Hebcal, as is the calendar in this app.'),
        h('li', {}, 'Torah readings use a computer-generated voice that reads the Hebrew with Israeli pronunciation. It reads the words; it does not chant the cantillation.'),
        h('li', {}, 'English Torah readings use the same voice to read the JPS 1917 translation as printed.'))),
    h('section', { class: 'card', 'aria-labelledby': 'terms-fonts' },
      h('h2', { id: 'terms-fonts' }, 'Fonts'),
      h('p', {}, `The Hebrew typefaces (${FONTS.join(', ')}) are each released under the SIL Open Font License 1.1.`)),
    h('section', { class: 'card', 'aria-labelledby': 'terms-voices' },
      h('h2', { id: 'terms-voices' }, 'About the voices'),
      h('p', {}, 'The spoken Hebrew in the lessons, prayers, words and little books is computer-generated speech in two voices, Ari and Noa. It reads; it does not chant. The only human voices in the app are the historic recordings listed above.')),
    h('p', {}, h('a', { class: 'btn secondary', href: '#/credits' }, 'Credits and licences'), ' ', h('a', { class: 'btn secondary', href: '#/privacy' }, 'Privacy'), ' ', h('a', { class: 'btn secondary', href: '#/about' }, 'About'))));
  return () => {};
}
