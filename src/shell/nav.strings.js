// Navigation and search strings (English). Merged into the shared `en` table by nav-model consumers (nav.js, menu.js, search.view.js)
// so the table in i18n.js stays untouched. Hebrew is NOT added here: no new Hebrew was written for this lane. The only Hebrew shown in
// the menu is what already exists in i18n.js `he` (looked up with tHe); sections without an existing label show English only.
import { en } from './i18n.js';

export const NAV_EN = {
  'nav.section.learn': 'Learn', 'nav.section.read': 'Read', 'nav.section.speak': 'Speak & Listen', 'nav.section.progress': 'Progress', 'nav.section.more': 'More',
  'nav.section.learn.desc': 'Lessons, letters, vocabulary, grammar and typing.',
  'nav.section.read.desc': 'Torah, prayers, the service and chanting marks.',
  'nav.section.speak.desc': 'Say it, listen, and compare pronunciation styles.',
  'nav.section.progress.desc': 'What you have done, what to review, and the Jewish calendar.',
  'nav.section.more.desc': 'Settings, search, install, offline use, credits and privacy.',
  'nav.more': 'More', 'nav.search': 'Search', 'nav.menu.label': 'All sections',
  'nav.route.nikkud-fade': 'Vowel marks, fading out',
  'nav.route.roots': 'Roots and verb families',
  'nav.route.gender-drill': 'Gender drill',
  'nav.route.record-compare': 'Record and compare',
  'nav.route.scheduler': 'How reviews could be spaced',
  'nav.route.known-words': 'Known-word checker',
  'nav.route.syllabus': 'Syllabus and goals',
  'nav.route.time-budget': 'Time budget',
  'nav.route.daily': 'Daily goal and quests',
  'nav.accessibility': 'Accessibility',
  'nav.route.welcome': 'Welcome', 'nav.route.how': 'How this works', 'nav.route.search': 'Search',
  'nav.route.traditions-guide': 'Which pronunciation style should I learn?', 'nav.route.traditions-hear': 'Hear the difference',
  'search.title': 'Search', 'search.label': 'Search pages, letters and words',
  'search.hint': 'Try a page name, a letter name such as bet, a Hebrew letter or word, or an English word.',
  'search.pages': 'Pages', 'search.letters': 'Letters', 'search.words': 'Words',
  'search.none': 'No matches yet. Try a different spelling, or fewer letters.', 'search.loading': 'Loading letters and words…',
  'search.loaded': 'Searched {n} words.', 'search.error': 'Letters and words did not load, but you can still search pages.',
  'search.count': '{n} results', 'search.preview': 'Preview',
  // Release tiers (docs/v0/SCOPE.md): the collapsed Preview group in the More sheet, its per-section notes, and the page banner.
  'nav.preview.title': 'Preview (unreviewed, work in progress)',
  'nav.preview.desc': 'Pages that are not part of the first release yet. They work, but nobody has reviewed them and they may change or move.',
  'nav.preview.section': 'Preview: {s}',
  'nav.preview.note.learn': 'Extra lessons and drills. Not reviewed yet; wording, order and exercises may change.',
  'nav.preview.note.read': 'Texts, Torah reading, the service and chanting marks. Not reviewed yet; texts and audio may change.',
  'nav.preview.note.speak': 'Speaking, listening and pronunciation-style pages. Not reviewed yet; pronunciation notes may change.',
  'nav.preview.note.progress': 'Placement, calendar, reminders and sharing. Not reviewed yet; dates and scores may change.',
  'nav.preview.note.more': 'Other pages. Not reviewed yet; may change or move.',
  'nav.preview.banner': 'Preview: unreviewed, may change',
  'nav.preview.banner.more': 'This page is not part of the first release yet. It works, but it has not been reviewed and may change or move.',
};
for (const [k, v] of Object.entries(NAV_EN)) if (!(k in en)) en[k] = v;
