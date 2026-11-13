// @ts-check
// Israel trip lane (12 Nov): the Trip Planner and the restaurant scene, one lazy route under src/trip/ (on demand, not in the
// first install). This file only lists it for the router.
/** @type {import('./router.js').RouteDef[]} */
export const TRIP_ROUTES = [
  { name: 'trip', pattern: '/trip', module: '../trip/trip.view.js', title: 'Israel Trip', owner: 'trip', group: 'learn', quick: 'nav.route.trip' },
];
/** Which nav section lists each trip route (src/shell/nav-model.js reads this). */
export const TRIP_SECTIONS = { learn: ['trip'] };
