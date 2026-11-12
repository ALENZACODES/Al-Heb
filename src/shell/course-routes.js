// @ts-check
// Course lane (12 Nov): the course map, objective-led practice and the one rules page. Every view is a lazy route under
// src/coursemap/ (on demand, not in the first install); this file only lists them for the router.
/** @type {import('./router.js').RouteDef[]} */
export const COURSE_ROUTES = [
  { name: 'course-map', pattern: '/course-map', module: '../coursemap/map.view.js', title: 'Course Map', owner: 'course', group: 'learn', quick: 'nav.route.course-map' },
  { name: 'mixed-review', pattern: '/mixed-review', module: '../coursemap/practice.view.js', title: 'Mixed Review', owner: 'course', group: 'learn', quick: 'nav.route.mixed-review' },
  { name: 'five-minutes', pattern: '/five-minutes', module: '../coursemap/practice.view.js', title: 'Daily Five-Minute Set', owner: 'course', group: 'learn', quick: 'nav.route.five-minutes', query: { set: 'daily' } },
  { name: 'app-rules', pattern: '/app-rules', module: '../coursemap/rules.view.js', title: 'How Hearts, Streaks, Minutes and Passing Work', owner: 'course', group: 'progress', quick: 'nav.route.app-rules' },
];
/** Which nav section lists each course route (src/shell/nav-model.js reads this). */
export const COURSE_SECTIONS = { learn: ['course-map', 'mixed-review', 'five-minutes'], more: ['app-rules'] };
