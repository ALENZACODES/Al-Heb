// @ts-check
// Hash router + route table. Pure matching (matchRoute) is testable in Node.
// Each route lazily imports its view module; views export mount(root, ctx) => unmount.

/**
 * @typedef {{name:string, pattern:string, module:string|null, nav?:string, title:string, owner:string}} RouteDef
 */
/** @type {RouteDef[]} Module paths are relative to src/shell/. */
export const ROUTES = [
  { name: 'home',     pattern: '/',               module: './home.view.js',                      nav: 'nav.home',     title: 'Home', owner: 'lane8' },
  { name: 'learn',    pattern: '/learn',          module: '../curriculum/learn.view.js',         nav: 'nav.learn',    title: 'Learn', owner: 'lane1' },
  { name: 'letters',  pattern: '/letters',        module: '../letters/trace.view.js',            nav: 'nav.letters',  title: 'Letters', owner: 'lane2' },
  { name: 'letter',   pattern: '/letters/:id',    module: '../letters/trace.view.js',            title: 'Letter', owner: 'lane2' },
  { name: 'sounds',   pattern: '/sounds',         module: '../pronunciation/sounds.view.js',     nav: 'nav.sounds',   title: 'Sounds', owner: 'lane3' },
  { name: 'read',     pattern: '/read',           module: '../corpus/read.view.js',              nav: 'nav.read',     title: 'Read', owner: 'lane5' },
  { name: 'text',     pattern: '/read/:textId',   module: '../corpus/read.view.js',              title: 'Read', owner: 'lane5' },
  { name: 'scan',     pattern: '/scan',           module: '../photo/scan.view.js',               nav: 'nav.scan',     title: 'Scan', owner: 'lane6' },
  { name: 'calendar', pattern: '/calendar',       module: '../curriculum/calendar.view.js',      nav: 'nav.calendar', title: 'Calendar', owner: 'lane1' },
  { name: 'settings', pattern: '/settings',       module: './settings.view.js',                  nav: 'nav.settings', title: 'Settings', owner: 'lane8' },
  { name: 'about',    pattern: '/about',          module: './about.view.js',                     nav: 'nav.about',    title: 'About', owner: 'lane8' },
];

/** Parse "#/letters/alef?x=1" -> {path, query}. @param {string} hash */
export function parseHash(hash) {
  let h = (hash || '').replace(/^#/, '');
  if (!h.startsWith('/')) h = '/' + h;
  const [rawPath, qs = ''] = h.split('?');
  let path = rawPath.replace(/\/{2,}/g, '/');
  if (path.length > 1) path = path.replace(/\/$/, '');
  /** @type {Record<string,string>} */
  const query = {};
  for (const [k, v] of new URLSearchParams(qs)) query[k] = v;
  return { path, query };
}

/** @param {string} hash @returns {{route:RouteDef|null, params:Record<string,string>, path:string, query:Record<string,string>}} */
export function matchRoute(hash) {
  const { path, query } = parseHash(hash);
  const segs = path.split('/').filter(Boolean);
  for (const route of ROUTES) {
    const ps = route.pattern.split('/').filter(Boolean);
    if (ps.length !== segs.length) continue;
    /** @type {Record<string,string>} */
    const params = {}; let ok = true;
    for (let i = 0; i < ps.length; i++) {
      if (ps[i].startsWith(':')) {
        let v = segs[i]; try { v = decodeURIComponent(v); } catch { ok = false; break; }
        if (!/^[\p{L}\p{N}_.-]{1,80}$/u.test(v)) { ok = false; break; }
        params[ps[i].slice(1)] = v;
      } else if (ps[i] !== segs[i]) { ok = false; break; }
    }
    if (ok) return { route, params, path, query };
  }
  return { route: null, params: {}, path, query };
}

/** @param {(m:ReturnType<typeof matchRoute>)=>void} onChange */
export function createRouter(onChange) {
  const handle = () => onChange(matchRoute(location.hash));
  return {
    start() { window.addEventListener('hashchange', handle); handle(); },
    stop() { window.removeEventListener('hashchange', handle); },
    /** @param {string} path e.g. "/letters/alef" */
    go(path) { const target = '#' + (path.startsWith('/') ? path : '/' + path); if (location.hash === target) handle(); else location.hash = target; },
  };
}

/** Lazily import a route's view module (paths in ROUTES are relative to this file). @param {RouteDef} route */
export function loadRouteModule(route) {
  if (!route.module) return Promise.reject(new Error('route has no module'));
  return import(route.module);
}
