// Prayer, calendar and community (idea N4): [name, pattern, module, title, section] for router.js, nav-model.js and nav.strings.js.
// The view loads on first open (src/service/ is on demand, see tools/build-precache.mjs). The synagogue directory's search (N9)
// lives on the existing /synagogues route and adds no route.
export const COMMUNITY = [
  ['my-prayer-book', '/my-prayer-book', '../service/prayerbook.view.js', 'My Prayer Book', 'read'],
];
export const COMMUNITY_ROUTES = COMMUNITY.map(([name, pattern, module, title]) => ({ name, pattern, module, title, owner: 'community', optional: true }));
export const COMMUNITY_SECTION = (sec) => COMMUNITY.filter((r) => r[4] === sec).map((r) => r[0]);
export const COMMUNITY_LABELS = Object.fromEntries(COMMUNITY.map((r) => ['nav.route.' + r[0], r[3]]));
