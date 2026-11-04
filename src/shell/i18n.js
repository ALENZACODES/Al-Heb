// Minimal i18n. English is the UI language. Hebrew strings exist for key navigation
// labels only and are FLAGGED FOR NATIVE REVIEW (see HEBREW_REVIEW_NEEDED).
export const en = {
  'app.name': 'ALEF',
  'app.tagline': 'Read Hebrew aloud. Speak it in Israel.',
  'skip': 'Skip to main content',
  'nav.home': 'Home', 'nav.learn': 'Learn', 'nav.letters': 'Letters', 'nav.sounds': 'Sounds',
  'nav.read': 'Read', 'nav.scan': 'Scan', 'nav.calendar': 'Calendar', 'nav.settings': 'Settings', 'nav.about': 'About', 'nav.workbook': 'Workbook', 'nav.atlas': 'Letter atlas', 'nav.soundgap': 'Sound gap', 'nav.vocab': 'Vocabulary', 'nav.ladder': 'Syllable ladder', 'nav.fade': 'Fade-out recall', 'nav.gender': 'Gender pairs', 'nav.roles': 'Say it as me', 'nav.scaffold': 'Read without Latin', 'nav.vowelboard': 'Vowel board', 'nav.progress': 'Your progress', 'nav.wordtrace': 'Trace words', 'nav.torahread': 'Torah reading', 'nav.israel': 'Sound like a local', 'nav.traditions': 'Traditions', 'nav.classtrack': 'Class track', 'nav.morning': 'Morning verse', 'nav.timedread': 'Timed read-aloud', 'nav.share': 'Share my progress', 'nav.service': 'Follow the service', 'nav.firstday': 'First 10 minutes', 'nav.placement': 'Placement check', 'nav.reminders': 'Study reminders', 'nav.install': 'Install ALEF', 'nav.compare': 'Compare traditions', 'nav.typing': 'Typing practice', 'nav.credits': 'Credits and licences', 'nav.privacy': 'Privacy', 'nav.grammar': 'Grammar notes', 'nav.intermediate': 'Intermediate lessons', 'nav.traditionquiz': 'Which tradition is this?', 'nav.readmyway': 'Read it my way', 'nav.rules': 'Pronunciation rules', 'nav.trope': 'Trope trainer', 'nav.listen': 'Listen and pick', 'nav.festivals': 'This week in the Jewish year', 'nav.offline': 'Use ALEF offline', 'nav.vocab-themes': 'Theme packs', 'nav.speak': 'Say it', 'nav.firstday-ladder': 'Pointed to unpointed ladder', 'nav.sprint': 'Word Sprint', 'nav.classsummary': 'Class summary', 'nav.niqquddial': 'Vowel-point dial', 'nav.dottile': 'Dot tiles', 'nav.syllablechips': 'Syllable chips', 'nav.loanwords': 'Words you can read', 'nav.checkpoint': 'Look-alike check', 'nav.dialogues': 'Israel dialogues',
  'home.more': 'More ways to learn', 'home.more.hint': 'Optional practice. These open inside the Learn section.',
  'home.opening.title': 'Opening',
  'home.opening.draft': 'Draft opening: pending clergy/educator review.',
  'home.opening.body': 'The opening prayer slot is reserved. No liturgy is bundled here until it has been reviewed. The Priestly Blessing (Numbers 6:24-26) is planned as the opener in the Read section.',
  'home.opening.link': 'Open the reader',
  'home.today': "Today's lesson",
  'home.today.none': 'The lesson plan is not available yet.',
  'home.today.start': 'Start',
  'home.due': 'Reviews due',
  'home.due.none': 'No reviews due.',
  'home.due.count': '{n} cards due',
  'home.due.count.one': '{n} card due',
  'home.quick': 'Go to',
  'home.reflect': 'Morning and evening reflection',
  'home.reflect.link': 'Open today\'s prompt',
  'home.install': 'Install ALEF on this device',
  'settings.title': 'Settings',
  'settings.voice': 'Voice', 'settings.voice.f': 'Woman (Noa)', 'settings.voice.m': 'Man (Ari)',
  'settings.congregation': 'Prayer pronunciation',
  'settings.congregation.sephardi': 'Sephardi (default for American synagogues)',
  'settings.congregation.ashkenazi': 'Ashkenazi',
  'settings.congregation.israeli': 'Israeli',
  'settings.israelTrack': 'Israel track (everyday spoken Hebrew)',
  'settings.script': 'Letter style', 'settings.script.print': 'Print', 'settings.script.cursive': 'Cursive',
  'settings.theme': 'Theme', 'settings.theme.auto': 'Match device', 'settings.theme.light': 'Light', 'settings.theme.dark': 'Dark',
  'settings.location': 'Location for candle lighting (optional)',
  'settings.lat': 'Latitude', 'settings.lon': 'Longitude', 'settings.useLocation': 'Use my current location', 'settings.clearLocation': 'Clear',
  'settings.backup': 'Backup', 'settings.export': 'Download backup', 'settings.import': 'Restore from backup file',
  'settings.persist.no': 'Storage is unavailable; progress is kept only until you close the app.',
  'settings.reset': 'Reset settings to defaults',
  'unavailable.title': 'Not available yet',
  'unavailable.body': 'This part of ALEF is still being built. Nothing is broken; the module has not been added to this build.',
  'error.title': 'Something went wrong',
  'error.body': 'This screen failed to load. You can go back to the home screen.',
  'notfound.title': 'Page not found',
  'about.title': 'About ALEF',
  'how.title': 'How this works',
  'welcome.title': 'Welcome to ALEF',
  'home.streak': 'Streak',
  'home.goal.read': 'Next lesson: synagogue reading',
  'home.goal.israel': 'Next lesson: Hebrew in Israel',
  'home.how': 'How this works, credits and licences',
  'settings.goal': 'My goal', 'settings.goal.read': 'Read in synagogue', 'settings.goal.israel': 'Get around in Israel', 'settings.goal.both': 'Both',
  'settings.browserVoiceAnyway': 'Use the browser voice even when it cannot match my pronunciation choice (it is labelled when it does)',
  'settings.redo': 'Run the first-time setup again',
};
/** Hebrew UI labels. FLAGGED: machine-assisted drafts, need native-speaker review. */
export const he = {
  'nav.home': 'בית', 'nav.learn': 'לימוד', 'nav.letters': 'אותיות', 'nav.sounds': 'צלילים',
  'nav.read': 'קריאה', 'nav.scan': 'סריקה', 'nav.calendar': 'לוח שנה', 'nav.settings': 'הגדרות', 'nav.about': 'אודות', 'nav.workbook': 'חוברת',
  // DRAFT, unreviewed machine-assisted labels for the new Learn sub-screens:
  'nav.loanwords': 'מילים שאפשר לקרוא', 'nav.checkpoint': 'בדיקת אותיות דומות', 'nav.dialogues': 'שיחות בישראל',
  'app.name': 'אלף',
};
export const HEBREW_REVIEW_NEEDED = Object.keys(he);

const warned = new Set();
/** @param {string} key @param {Record<string,string|number>} [vars] */
export function t(key, vars) {
  let s = en[key];
  if (s === undefined) { if (/^(app|skip|nav|home|settings|unavailable|error|notfound|about)\./.test(key) && !warned.has(key)) { warned.add(key); try { console.warn('[i18n] missing key', key); } catch {} } s = key; }
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return s;
}
/** Hebrew label or '' if none. @param {string} key */
export const tHe = (key) => he[key] ?? '';
