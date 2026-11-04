// @ts-check
// Sources and licences actually used by the Torah-reading course. Labels are copied from what each source said about itself
// on 2026-11-03 (see docs/torahread/SOURCES.md). Not legal advice; Sefaria labels are not independently verified.
export const SOURCES = [
  { name: 'Unicode/XML Leningrad Codex (UXLC 2.6), Tanach.us Inc.', used: 'Hebrew of the Torah verses, the Priestly Blessing and Shema, and the word counts', licence: '"All biblical Hebrew text, in any format, may be viewed or copied without restriction." Citation appreciated; not to be presented as the WLC.', how: 'Read from tanach.us/License.html and tanach.us/Books/*.xml on 2026-11-03.' },
  { name: 'JPS 1917, The Holy Scriptures: A New Translation (via Sefaria)', used: 'English of the Torah verses', licence: 'Public Domain (Sefaria label; public by age)', how: 'Sefaria API version metadata on 2026-11-03. The label itself was not independently verified.' },
  { name: 'Siddur Edot HaMizrach, "Shaliehsaboo Edition" (via Sefaria)', used: 'Hebrew of Barchu and the blessing before the reading (torah-barchu, torah-bless-1)', licence: 'CC0 (Sefaria label)', how: 'Registry record; label not independently verified.' },
  { name: 'Torat Emet 357 (via Sefaria)', used: 'Hebrew of the blessing after the reading (torah-bless-2) and the opening words of the Mi sheberach (mi-sheberach-opening)', licence: 'Public Domain (Sefaria label)', how: 'Registry record; label not independently verified.' },
  { name: 'Written for this project', used: 'English glosses of the siddur blessings and of the 30 words, all explanatory text, the aliyah steps and the trope explainer', licence: 'Project-owned', how: 'Original. Not reviewed by clergy or a Hebrew teacher.' },
];
export const NOT_USED = 'data/vocab glosses are not copied (they come from Wiktionary under CC BY-SA); only entry ids are cross-referenced.';
