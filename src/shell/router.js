// @ts-check
// Hash router + route table. Pure matching (matchRoute) is testable in Node.
// Each route lazily imports its view module; views export mount(root, ctx) => unmount.

/**
 * @typedef {{name:string, pattern:string, module:string|null, nav?:string, title:string, owner:string, optional?:boolean, quick?:string,
 *   group?:string, needs?:string, query?:Record<string,string>, paramQuery?:Record<string,string>}} RouteDef
 * `query` is merged into ctx.query for the view; `paramQuery` copies a path param into ctx.query (param -> query key). This lets
 * pretty routes such as /dialogues/cafe drive lane 1's learn.view.js, which dispatches on ?dialogue=cafe. `group` ("learn") lists
 * the route on Home under "More ways to learn" instead of the nav bar.
 */
/** @type {RouteDef[]} Module paths are relative to src/shell/. */
export const ROUTES = [
  { name: 'home',     pattern: '/',               module: './home.view.js',                      nav: 'nav.home',     title: 'Home', owner: 'lane8' },
  { name: 'learn',    pattern: '/learn',          module: '../curriculum/learn.view.js',         nav: 'nav.learn',    title: 'Learn', owner: 'lane1' },
  { name: 'letters',  pattern: '/letters',        module: '../letters/trace.view.js',            nav: 'nav.letters',  title: 'Letters', owner: 'lane2' },
  { name: 'atlas',    pattern: '/letters/atlas',  module: '../letters/atlas.view.js',            title: 'Letter atlas', owner: 'lane2', optional: true, quick: 'nav.atlas' },
  { name: 'letter',   pattern: '/letters/:id',    module: '../letters/trace.view.js',            title: 'Letter', owner: 'lane2' },
  // Lane 1 sub-screens. They have no nav entry (nav is already full); Home lists them under "More ways to learn".
  // Their code lives in curriculum/*.view.js and is dispatched by learn.view.js from ctx.query; these routes only inject the query.
  { name: 'loanwords',  pattern: '/loanwords',         module: '../curriculum/learn.view.js', title: 'Words you can already read', owner: 'lane1', group: 'learn', quick: 'nav.loanwords', query: { loanwords: '1' }, needs: 'curriculum/loanwords.view.js' },
  { name: 'loanword',   pattern: '/loanwords/:group',  module: '../curriculum/learn.view.js', title: 'Words you can already read', owner: 'lane1', paramQuery: { group: 'loanwords' }, needs: 'curriculum/loanwords.view.js' },
  { name: 'spotit',     pattern: '/spotit/:letter',    module: '../curriculum/learn.view.js', title: 'Spot It', owner: 'lane1', paramQuery: { letter: 'spotit' }, needs: 'curriculum/spotit.view.js' },
  { name: 'checkpoint', pattern: '/checkpoint',        module: '../curriculum/learn.view.js', title: 'Look-alike checkpoint', owner: 'lane1', group: 'learn', quick: 'nav.checkpoint', query: { checkpoint: '1' }, needs: 'curriculum/checkpoint.view.js' },
  { name: 'dialogues',  pattern: '/dialogues',         module: '../curriculum/learn.view.js', title: 'Israel dialogues', owner: 'lane1', group: 'learn', quick: 'nav.dialogues', query: { dialogues: '1' }, needs: 'curriculum/dialogues.view.js' },
  { name: 'dialogue',   pattern: '/dialogues/:id',     module: '../curriculum/learn.view.js', title: 'Israel dialogue', owner: 'lane1', paramQuery: { id: 'dialogue' }, needs: 'curriculum/dialogues.view.js' },
  { name: 'sounds',   pattern: '/sounds',         module: '../pronunciation/sounds.view.js',     nav: 'nav.sounds',   title: 'Sounds', owner: 'lane3' },
  { name: 'read',     pattern: '/read',           module: '../corpus/read.view.js',              nav: 'nav.read',     title: 'Read', owner: 'lane5' },
  { name: 'text',     pattern: '/read/:textId',   module: '../corpus/read.view.js',              title: 'Read', owner: 'lane5' },
  { name: 'scan',     pattern: '/scan',           module: '../photo/scan.view.js',               nav: 'nav.scan',     title: 'Scan', owner: 'lane6' },
  { name: 'calendar', pattern: '/calendar',       module: '../curriculum/calendar.view.js',      nav: 'nav.calendar', title: 'Calendar', owner: 'lane1' },
  { name: 'settings', pattern: '/settings',       module: './settings.view.js',                  nav: 'nav.settings', title: 'Settings', owner: 'lane8' },
  { name: 'welcome', pattern: '/welcome',        module: './onboarding.view.js',                title: 'Welcome', owner: 'lane8' },
  { name: 'how',      pattern: '/how',            module: './how.view.js',                       title: 'How this works', owner: 'lane8' },
  // Optional routes: other lanes add these view files over time. When the file is missing the route is hidden from nav/quick
  // links (see probeRoutes) and a direct visit shows the "not available yet" card; nothing else breaks.
  { name: 'workbook', pattern: '/workbook',        module: './workbook.view.js',                  nav: 'nav.workbook', title: 'Workbook', owner: 'lane8' },
  { name: 'soundgap', pattern: '/soundgap',       module: '../pronunciation/soundgap.view.js',   title: 'Sound gap', owner: 'lane3', optional: true, quick: 'nav.soundgap' },
  { name: 'vocab',    pattern: '/vocab',          module: '../vocab/vocab.view.js',              title: 'Vocabulary', owner: 'lane9', optional: true, quick: 'nav.vocab' },
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
    if (ok) {
      const q = { ...query, ...(route.query || {}) };
      for (const [p, k] of Object.entries(route.paramQuery || {})) if (p in params) q[k] = params[p];
      return { route, params, path, query: q };
    }
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

/**
 * Which routes have a view file in this build? `views.generated.js` (written by tools/build-precache.mjs from the files on disk)
 * lists every src/**\/*.view.js, so no network probe (and no 404 in the console) is needed. Non-optional routes always count.
 * @param {string[]} files view files relative to src/, e.g. "letters/atlas.view.js" @returns {Set<string>} usable route names
 */
export function availableRoutes(files) {
  const have = new Set(files);
  const norm = (m) => m.replace(/^\.\//, 'shell/').replace(/^\.\.\//, '');
  return new Set(ROUTES.filter((r) => (!r.optional || (r.module && have.has(norm(r.module)))) && (!r.needs || have.has(r.needs))).map((r) => r.name));
}
