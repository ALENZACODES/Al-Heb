// @ts-check
// Writing lane (12 Nov): the reflection journal, typed Hebrew answers and sentence rewriting, one lazy route under src/writing/
// (on demand, not in the first install). This file only lists it for the router.
/** @type {import('./router.js').RouteDef[]} */
export const WRITING_ROUTES = [
  { name: 'write', pattern: '/write', module: '../writing/writing.view.js', title: 'Writing', owner: 'writing', group: 'learn', quick: 'nav.route.write' },
];
/** Which nav section lists each writing route (src/shell/nav-model.js reads this). */
export const WRITING_SECTIONS = { learn: ['write'] };
