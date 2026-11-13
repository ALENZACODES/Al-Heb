// together lane (12 Nov, ideas R1 to R10): community and sharing without accounts. Route code lives under src/together/
// (on demand, see tools/build-precache.mjs). [name, pattern, view file, title, nav section]
export const TOGETHER_ROUTES = [
  ['profiles', '/profiles', 'profiles.view.js', 'Profiles', 'more'],
  ['study-hall', '/study-hall', 'hall.view.js', 'Study Hall', 'progress'],
  ['friend-challenge', '/friend-challenge', 'challenge.view.js', 'Challenge A Friend', 'learn'],
  ['buddy', '/buddy', 'buddy.view.js', 'Buddy Pairing', 'progress'],
  ['gift', '/gift', 'gift.view.js', 'Gift A Lesson', 'more'],
  ['ratings', '/ratings', 'ratings.view.js', 'My Ratings', 'progress'],
].map(([name, pattern, file, title, section]) => ({ name, pattern, module: `../together/${file}`, title, owner: 'together', optional: true, quick: `nav.route.${name}`, section }));
