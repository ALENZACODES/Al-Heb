// lane platform (12 Nov, CODER-100 H, I, J): routes whose code lives under src/platform/ (on demand, see tools/build-precache.mjs).
// [name, pattern, view file under src/platform/, title, nav section]
export const PLATFORM_ROUTES = [
  ['whats-new', '/whats-new', 'whatsnew.view.js', "What's New", 'more'],
  ['my-data', '/my-data', 'mydata.view.js', 'My Data', 'more'],
  ['cram', '/cram', 'cram.view.js', 'Cram', 'learn'],
  ['mastery', '/mastery', 'mastery.view.js', 'Mastery Map', 'progress'],
  ['my-week', '/my-week', 'week.view.js', 'My Week', 'progress'],
  ['lesson-badges', '/lesson-badges', 'verified.view.js', 'Lesson Badges', 'progress'],
  ['shortcuts', '/shortcuts', 'shortcuts.view.js', 'Keyboard Shortcuts', 'more'],
  ['worksheet', '/worksheet', 'worksheet.view.js', 'Printable Worksheet', 'more'],
  ['focus', '/focus', 'focus.view.js', 'Focus Mode', 'read'],
].map(([name, pattern, file, title, section]) => ({ name, pattern, module: `../platform/${file}`, title, owner: 'platform', optional: true, quick: `nav.route.${name}`, section }));
