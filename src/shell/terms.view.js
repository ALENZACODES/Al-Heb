// /terms: the rights page. Ownership and terms for Aleph itself, and the one learner-facing
// roll of credits: music and sounds, the historic recordings, text sources, fonts, and the
// synthetic-voice note. The full source-by-source licence ledger stays on /credits.
import { h } from './ui.js';
import { LISTEN_ITEMS, MUSIC_TRACKS, ORIGINAL_MUSIC_TRACKS, ORIGINAL_SONG_TRACKS } from '../listen/catalog.js';

const FONTS = ['Heebo', 'Frank Ruhl Libre', 'Gveret Levin', 'Alef', 'Noto Sans Hebrew', 'Noto Serif Hebrew'];

export function mount(root, ctx) {
  const t = (k, fb) => { const v = ctx && typeof ctx.t === 'function' ? ctx.t(k) : null; return v && v !== k ? v : fb; };
  root.replaceChildren(h('article', { class: 'stack', id: 'terms' },
    h('section', { class: 'card' },
      h('h1', { id: 'view-title', tabindex: '-1' }, t('nav.terms', 'Terms and rights')),
      h('p', {}, '© 2026 John Khan. All rights reserved.'),
      h('p', {}, 'Aleph — the app, its lessons, its original text and its artwork — belongs to John Khan. You may use it for your own learning, free of charge. Nothing here grants a right to copy, redistribute or resell the app or its original material.'),
      h('p', { class: 'muted' }, 'Material that comes from elsewhere keeps its own licence, set out below. This page is a plain-language summary, not legal advice; the full source-by-source ledger is on the Credits page.')),
    h('section', { class: 'card', 'aria-labelledby': 'terms-music' },
      h('h2', { id: 'terms-music' }, 'Music and sound effects'),
      h('p', {}, 'The arcade loops and the interface sound effects are by Kenney (kenney.nl), released under CC0 1.0 — free for any use, no attribution required. They are credited here because credit is due.'),
      h('ul', {}, ...MUSIC_TRACKS.map((m) => h('li', {}, `${m.title} — ${m.role} music`))),
      h('p', {}, 'The original beds and songs were made for Aleph. © 2026 John Khan. All rights reserved.'),
      h('ul', {}, ...[...ORIGINAL_MUSIC_TRACKS, ...ORIGINAL_SONG_TRACKS].map((m) => h('li', {}, `${m.title} — ${m.role}`)))),
    h('section', { class: 'card', 'aria-labelledby': 'terms-recordings' },
      h('h2', { id: 'terms-recordings' }, 'Historic recordings (Sacred Listen)'),
      h('p', {}, 'These are real recordings, kept with their performers and licences. The playback copies were enhanced for clarity (gentle denoise, de-click and loudness levelling) from the originals, which are preserved unchanged; for CC BY-SA items the enhanced copy is an adaptation under the same licence.'),
      h('ul', {}, ...LISTEN_ITEMS.map((r) => h('li', {}, `${r.title} — ${r.performer}. ${r.licence}. Source: ${r.source}.`)))),
    h('section', { class: 'card', 'aria-labelledby': 'terms-texts' },
      h('h2', { id: 'terms-texts' }, 'Text sources'),
      h('ul', {},
        h('li', {}, 'Hebrew Bible text: the Unicode/XML Leningrad Codex (UXLC), Tanach.us — free to view and copy without restriction.'),
        h('li', {}, 'English Bible translation: the Jewish Publication Society translation of 1917 — public domain.'),
        h('li', {}, 'Prayer texts: the Metsudah siddur (CC BY, as labelled by Sefaria), Torat Emet 357 (public domain, as labelled), and Siddur Edot HaMizrach, Shaliehsaboo edition (CC0, as labelled).'),
        h('li', {}, 'Calendar data: derived from Hebcal (hebcal.com), CC BY 4.0.'),
        h('li', {}, 'Vocabulary senses draw on public-domain and openly licensed word lists; the per-source detail is on the Credits page.'))),
    h('section', { class: 'card', 'aria-labelledby': 'terms-torah' },
      h('h2', { id: 'terms-torah' }, 'Torah text and readings'),
      h('ul', {},
        h('li', {}, 'Torah Hebrew text: Unicode/XML Leningrad Codex (UXLC), Tanach.us Inc. The biblical Hebrew text may be viewed or copied without restriction. It is the Leningrad Codex in a Unicode edition; it is not represented as the Westminster Leningrad Codex.'),
        h('li', {}, 'Torah English translation: The Holy Scriptures: A New Translation, Jewish Publication Society, 1917 — public domain. Digital text via the Open Siddur Project and Sefaria. Newer JPS translations (1985, 2006, 2023) are not in the public domain and are not used.'),
        h('li', {}, 'Weekly portion names, ranges and schedule: derived from Hebcal, as is the calendar in this app.'),
        h('li', {}, 'Any Torah reading you hear here is a synthetic voice (Chirp 3 HD; a small number of verses use the standard voice and are marked in the data). It reads the Hebrew aloud in Israeli pronunciation; it does not chant the cantillation and is not a recording of a teacher or cantor.'),
        h('li', {}, 'Any Torah reading in English is the same synthetic voice reading the public-domain JPS 1917 text aloud, exactly as printed.'))),
    h('section', { class: 'card', 'aria-labelledby': 'terms-fonts' },
      h('h2', { id: 'terms-fonts' }, 'Fonts'),
      h('p', {}, `The Hebrew typefaces — ${FONTS.join(', ')} — are each released under the SIL Open Font License 1.1.`)),
    h('section', { class: 'card', 'aria-labelledby': 'terms-voices' },
      h('h2', { id: 'terms-voices' }, 'About the voices'),
      h('p', {}, 'The spoken Hebrew in the lessons, prayers, words and story books is synthetic speech: computer-generated, and labelled as synthetic where it plays. It is a reading voice, not a recording of a person, and it is not cantillation or chant. The only real human voices in the app are the historic recordings listed above.')),
    h('p', {}, h('a', { class: 'btn secondary', href: '#/credits' }, 'Credits and licences'), ' ', h('a', { class: 'btn secondary', href: '#/privacy' }, 'Privacy'), ' ', h('a', { class: 'btn secondary', href: '#/about' }, 'About'))));
  return () => {};
}
