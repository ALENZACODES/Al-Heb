// Pure navigation model (no DOM): five sections, which routes live in each, bottom-bar tabs, menu and search page lists.
// Every route in router.js ROUTES belongs to exactly one section (tests/nav.model.test.js enforces it). Order here is the order shown.
// Release tiers (router.js `tier`, docs/v0/SCOPE.md): the bar and the open menu groups show only 'v0' routes; 'preview' routes are
// listed in one collapsed Preview group at the end of the More sheet (previewGroups) and stay searchable (tests/v0.test.js).

export const SECTIONS = [
  { id: 'learn',    labelKey: 'nav.section.learn',    descKey: 'nav.section.learn.desc',    heKey: 'nav.learn', primary: ['learn'] },
  { id: 'read',     labelKey: 'nav.section.read',     descKey: 'nav.section.read.desc',     heKey: 'nav.read',  primary: ['read'] },
  { id: 'speak',    labelKey: 'nav.section.speak',    descKey: 'nav.section.speak.desc',    primary: ['speak', 'listen', 'compare', 'tradition-quiz'] },
  { id: 'progress', labelKey: 'nav.section.progress', descKey: 'nav.section.progress.desc', primary: ['progress', 'calendar'] },
  { id: 'more',     labelKey: 'nav.section.more',     descKey: 'nav.section.more.desc',     heKey: null, primary: [] },
];

/** Route names per section, in display order. */
export const SECTION_ROUTES = {
  learn: ['home', 'firstday', 'learn', 'letters', 'atlas', 'letter', 'sounds', 'rules', 'rules-page', 'loanwords', 'loanword', 'spotit', 'checkpoint',
    'ladder', 'fade', 'fadeline', 'scaffold', 'gender', 'roles', 'firstday-ladder', 'vocab', 'vocab-themes', 'sprint', 'wordtrace', 'dialogues', 'dialogue',
    'israel', 'israelsec', 'intermediate', 'intermediatelesson', 'grammar', 'grammartopic', 'typing', 'classtrack', 'classtrackweek', 'classtrackmode',
    'soundgap', 'vowelboard', 'niqquddial', 'dottile', 'syllablechips'],
  read: ['read', 'text', 'torahread', 'torahreadsec', 'service', 'trope', 'timedread', 'morning', 'scan'],
  speak: ['speak', 'listen', 'compare', 'tradition-quiz', 'read-my-way', 'traditions', 'traditions-guide', 'traditions-hear'],
  progress: ['progress', 'placement', 'calendar', 'festivals', 'festival', 'reminders', 'share', 'classsummary'],
  more: ['search', 'settings', 'workbook', 'install', 'offline', 'about', 'how', 'credits', 'privacy', 'welcome'],
};

/** Route name -> section id. */
export const ROUTE_SECTION = Object.fromEntries(Object.entries(SECTION_ROUTES).flatMap(([s, names]) => names.map((n) => [n, s])));

/** Parameterised routes are reached through a static parent page (a list, or a link from it). */
export const PARENT = {
  letter: 'letters', loanword: 'loanwords', spotit: 'learn', dialogue: 'dialogues', fadeline: 'fade', israelsec: 'israel',
  classtrackweek: 'classtrack', classtrackmode: 'classtrack', festival: 'festivals', 'rules-page': 'rules', intermediatelesson: 'intermediate',
  grammartopic: 'grammar', text: 'read', torahreadsec: 'torahread',
};

/** Hidden from the menu (still searchable): first-run onboarding. */
const MENU_HIDDEN = new Set(['welcome']);

export const isStatic = (r) => !r.pattern.includes(':');
/** Release tier of a route: 'v0' only when router.js says so; anything else is 'preview'. */
export const tierOf = (r) => (r && r.tier === 'v0' ? 'v0' : 'preview');
/** i18n key for a route's label. */
export const labelKey = (r) => r.nav || r.quick || 'nav.route.' + r.name;
export const sectionOf = (name) => ROUTE_SECTION[name] || 'more';

/** Static, available routes of one section, in display order. @param {any[]} routes @param {Set<string>} available */
/** `tier`: 'v0' or 'preview' keeps only that tier; null (default) keeps both. */
export function sectionRoutes(sectionId, routes, available, { includeHidden = false, tier = null } = {}) {
  const by = new Map(routes.map((r) => [r.name, r]));
  return (SECTION_ROUTES[sectionId] || []).map((n) => by.get(n))
    .filter((r) => r && isStatic(r) && available.has(r.name) && (includeHidden || !MENU_HIDDEN.has(r.name)) && (!tier || tierOf(r) === tier));
}

/** The "More" menu: every section with its available static v0 routes. Empty sections are dropped. Preview routes: previewGroups(). */
export function menuSections(routes, available) {
  return SECTIONS.map((s) => ({ section: s, items: sectionRoutes(s.id, routes, available, { tier: 'v0' }) })).filter((g) => g.items.length);
}

/** The collapsed Preview group: available static preview routes, grouped by section (same order), each section with a note key. */
export function previewGroups(routes, available) {
  return SECTIONS.map((s) => ({ section: s, noteKey: 'nav.preview.note.' + s.id, items: sectionRoutes(s.id, routes, available, { tier: 'preview' }) }))
    .filter((g) => g.items.length);
}

/** Bottom-bar tab for a section: first available primary v0 route, else the first v0 menu item; null if the section has no v0 page. */
export function tabTarget(section, routes, available) {
  const items = sectionRoutes(section.id, routes, available, { tier: 'v0' });
  const by = new Map(items.map((r) => [r.name, r]));
  for (const n of section.primary) if (by.has(n)) return by.get(n);
  return items[0] || null;
}

/** The section tabs: at most four (More is a separate button, so the bar has at most 5 controls); sections without a v0 page have no tab. */
export function tabs(routes, available) {
  return SECTIONS.filter((s) => s.id !== 'more').map((s) => ({ section: s, route: tabTarget(s, routes, available) })).filter((x) => x.route);
}

/**
 * Which control is current for a route name: 'page' when the tab's own target is the page, 'true' when the page is elsewhere in the
 * same section; home has no section tab. Preview pages (reached from the More sheet) and More-section pages mark More.
 * Returns {tab: sectionId|null, level: 'page'|'true'|null, more: boolean}. `tier` is the current route's tier ('v0' when omitted).
 */
export function currentState(routeName, tabList, tier = 'v0') {
  if (!routeName || routeName === 'home') return { tab: null, level: null, more: false };
  const s = sectionOf(routeName);
  if (s === 'more' || tier === 'preview') return { tab: null, level: null, more: true };
  const tab = tabList.find((x) => x.section.id === s);
  if (!tab) return { tab: null, level: null, more: false };
  return { tab: s, level: tab.route.name === routeName ? 'page' : 'true', more: false };
}

/** Every static, available route (including menu-hidden ones) for the search index. */
export function searchablePages(routes, available) {
  return SECTIONS.flatMap((s) => sectionRoutes(s.id, routes, available, { includeHidden: true }));
}

/** One-line description: the route's existing title when it adds something to the label, else ''. */
export function description(route, label) {
  const norm = (x) => String(x).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return norm(route.title) === norm(label) ? '' : route.title;
}
