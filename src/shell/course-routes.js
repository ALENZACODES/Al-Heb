// @ts-check
// Course lane (12 Nov): the course map, objective-led practice and the one rules page. Every view is a lazy route under
// src/coursemap/ (on demand, not in the first install); this file only lists them for the router.
/** @type {import('./router.js').RouteDef[]} */
export const COURSE_ROUTES = [
  { name: 'app-rules', pattern: '/app-rules', module: '../coursemap/rules.view.js', title: 'How Hearts, Streaks, Minutes and Passing Work', owner: 'course', group: 'progress', quick: 'nav.route.app-rules' },
];
/** Which nav section lists each course route (src/shell/nav-model.js reads this). */
export const COURSE_SECTIONS = { learn: [], more: ['app-rules'] };
