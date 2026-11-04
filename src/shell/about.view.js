import { h } from './ui.js';

// One list item per entry (tables do not fit a 390px screen): bold name, then labelled lines.
const row = (name, ...lines) => ({ name, lines });
const table = (caption, head, rows) => h('ul', { class: 'credits', 'aria-label': caption },
  ...rows.map((r) => h('li', {}, h('strong', {}, r.name), ...r.lines.map((v, i) => h('span', { class: 'block' }, h('span', { class: 'muted' }, head[i + 1] + ': '), v)))));

export function mount(root, ctx) {
  root.replaceChildren(h('article', { class: 'stack' },
    h('section', { class: 'card' },
      h('h1', { id: 'view-title', tabindex: '-1' }, ctx.t('about.title')),
      h('p', {}, 'ALEF is an interactive Hebrew course with two goals: reading Torah and prayers aloud with a congregation, and getting around in Israel without sounding like an outsider.'),
      h('p', {}, 'Status: early build. Audio uses your device\'s speech synthesis because no recordings exist yet; Hebrew UI labels and all prayer text await native/clergy review. ', h('a', { href: '#/how' }, 'How this works'), ' lists exactly what is and is not finished.'),
      h('p', {}, 'The software licence has not been chosen yet: until one is added, all rights in ALEF\'s own code and original text are reserved.')),
    h('section', { class: 'card', 'aria-labelledby': 'cr-fonts' }, h('h2', { id: 'cr-fonts' }, 'Fonts'),
      h('p', {}, 'All fonts are self-hosted and licensed under the SIL Open Font License 1.1.'),
      table('Fonts used', ['Font', 'Used for', 'Copyright holder'], [
        row('Heebo', 'Interface text', 'The Heebo Project Authors (github.com/OdedEzer/heebo)'),
        row('Frank Ruhl Libre', 'Pointed Hebrew in prayers and lessons', 'The Frank Ruhl Libre Project Authors (github.com/fontef/frankruhllibre)'),
        row('Gveret Levin', 'Cursive (handwriting style) Hebrew', 'The Gveret Levin Project Authors (github.com/AlefAlefAlef/gveret-levin)')])),
    h('section', { class: 'card', 'aria-labelledby': 'cr-text' }, h('h2', { id: 'cr-text' }, 'Text sources'),
      h('p', { class: 'muted' }, 'Licence labels are what each source states about itself (several are Sefaria\'s labels and were not independently verified). This is not legal advice.'),
      table('Text sources list', ['Source', 'Used for', 'Licence as stated'], [
        row('Unicode/XML Leningrad Codex (UXLC 2.6), Tanach.us Inc.', 'Hebrew of Torah verses (priestly blessing, Shema, V\'ahavta, Mah Tovu, Mi Chamocha, Num 12:13, Gen 2:1-3). Cantillation marks removed.', '"May be viewed or copied without restriction" (tanach.us/License.html); citation requested'),
        row('JPS 1917, The Holy Scriptures: A New Translation', 'English for Torah verses', 'Public domain (label from Sefaria; not independently verified)'),
        row('Torat Emet 357 siddur text, via Sefaria', 'Shabbat candle blessing, blessing over wine, Birkat Hamazon opening', 'Public domain (Sefaria label; unverified)'),
        row('Siddur Edot HaMizrach, Shaliehsaboo Edition, via Sefaria', 'HaMotzi, Torah blessing before reading, Amidah preface and Avot, Aleinu', 'CC0 (Sefaria label; unverified)'),
        row('The Metsudah siddur (1981), via Sefaria: Siddur Ashkenaz', 'Baruch shem, Barchu, blessing after the Torah reading, Modeh Ani, Adon Olam, Mourner\'s Kaddish', 'CC-BY, attribution to the publisher (Sefaria label; unverified and the riskiest source: replace or get permission before selling)'),
        row('Original glosses and survival phrasebook', 'English glosses for siddur items; 204 everyday phrases', 'Written for this project; need native review'),
        row('xkeyboard-config symbols/il', 'Israeli keyboard layout data (SI-1452) for the typing trainer', 'Permissive X11-style licence'),
        row('DejaVu Sans glyph outlines (Bitstream Vera licence)', 'Print letter outlines in the tracing data', 'Bitstream Vera licence / public domain changes')])),
    h('section', { class: 'card', 'aria-labelledby': 'cr-more' }, h('h2', { id: 'cr-more' }, 'More'),
      h('p', {}, 'Letter names, IPA and gematria come from Wikipedia as recorded in the project\'s research notes; stroke centrelines were authored for this project and are drafts. The scheduler is original FSRS-style code, not the reference FSRS. Full per-text licence table: docs/corpus/LICENSES.md in the repository.'),
      h('p', {}, h('a', { class: 'btn secondary', href: '#/how' }, 'How this works'), ' ', h('a', { class: 'btn secondary', href: '#/settings' }, 'Settings')))));
  return () => {};
}
