// Writes sitemap.xml from the router (S-08, M-05): the site root, every route without a parameter (the main pages, the utility
// screens and every game, including the hanukkah-*, tg-* and g1- to g5- games from the router's title tables), and every
// parameterised route whose set of values is finite and held in the app's own data (books, letters, texts, library articles,
// practical units and pages, and so on; ENUMERATE below). A route whose values are open-ended (/day/:date) is left out and
// counted as such. The app uses hash addresses (#/learn), so each entry is the root address with its hash; see robots.txt.
//   node tools/seo/build-sitemap.mjs           write sitemap.xml and print the count against the router's total
//   node tools/seo/build-sitemap.mjs --check   exit 1 when sitemap.xml is stale
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ORIGIN = 'https://alef-review.onrender.com';
/** Parameterised routes left out on purpose: their values are not a finite list in the data. */
export const OPEN_ENDED = Object.freeze({ '/day/:date': 'any calendar date' });

const rd = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));
const arr = (j, ...keys) => { if (Array.isArray(j)) return j; for (const k of keys) if (Array.isArray(j?.[k])) return j[k]; return []; };
const ids = (xs) => xs.map((x) => (x && typeof x === 'object' ? x.id : x)).filter((x) => typeof x === 'string' && x);

/** pattern -> async () => values (one string per parameter, or an array of strings for a two-parameter route). */
export const ENUMERATE = {
  '/letters/:id': async () => ids(arr(rd('data/letters/letters.json'), 'letters')),
  '/loanwords/:group': async () => ids(arr(rd('data/curriculum/loanwords.json'), 'groups')),
  '/spotit/:letter': async () => {
    const letters = new Set(ids(arr(rd('data/letters/letters.json'), 'letters')));
    const read = arr(rd('data/curriculum/lessons.json'), 'lessons').filter((l) => l.track === 'read');
    return [...new Set(read.flatMap((l) => l.letters || []))].filter((id) => letters.has(id));
  },
  '/dialogues/:id': async () => ids(arr(rd('data/curriculum/dialogues.json'), 'dialogues')),
  '/fade/:id': async () => {
    // the same two sources the fade view offers (src/curriculum/fade.view.js): short one-line corpus texts, then short pointed phrases
    const { eligibleLines } = await import(pathToFileURL(join(root, 'src/curriculum/fade.js')).href);
    const book = arr(rd('data/corpus/phrasebook.json'), 'entries').filter((e) => e.pointed && !/\n/.test(e.he) && e.he.split(/\s+/).length <= 8);
    return [...new Set([...ids(eligibleLines(arr(rd('data/corpus/registry.json'), 'texts', 'entries'))), ...ids(book)])];
  },
  '/phrases/:id': async () => {
    const { buildPhrases } = await import(pathToFileURL(join(root, 'src/phrases/model.js')).href);
    return ids(buildPhrases({ batch: rd('data/phrases/batch1.json'), phrasebook: rd('data/corpus/phrasebook.json'), genderFile: rd('data/curriculum/gender-pairs.json'), manifest: rd('data/audio/manifest.json') }));
  },
  '/israel/:sec': async () => {
    // the five sections are a constant in the view (not exported); read it from the source so the list cannot drift
    const m = /const SECTIONS = \[([\s\S]*?)\];/.exec(readFileSync(join(root, 'src/israel/israel.view.js'), 'utf8'));
    return m ? [...m[1].matchAll(/\["([a-z-]+)",/g)].map((x) => x[1]) : [];
  },
  '/classtrack/:week': async () => arr(rd('data/curriculum/class-track.json'), 'weeks').map((w) => String(w.week)),
  '/classtrack/:week/:mode': async () => arr(rd('data/curriculum/class-track.json'), 'weeks').map((w) => [String(w.week), 'handout']),
  '/synagogues/:id': async () => ids(arr(rd('data/synagogues/canada.json'), 'congregations')),
  '/book/:id': async () => ids(arr(rd('data/books/index.json'), 'books')),
  '/library/:id': async () => ids(arr(rd('data/library/articles.json'), 'articles')),
  '/lab/:game': async () => ids((await import(pathToFileURL(join(root, 'src/lab/lab.core.js')).href)).GAMES),
  '/festivals/:id': async () => ['shabbat-ready', ...ids(arr(rd('data/festivals/vocab.json'), 'packs'))],
  '/rules/:rule': async () => ids(arr(rd('data/pronunciation/runtime/rules.json'), 'pages')),
  '/intermediate/:id': async () => ids(arr(rd('data/curriculum/intermediate-index.json'), 'lessons')),
  '/practical/:id': async () => ids(arr(rd('data/curriculum/practical/index.json'), 'units')),
  '/practical/:id/:page': async () => arr(rd('data/curriculum/practical/index.json'), 'units')
    .flatMap((u) => (u.file && existsSync(join(root, u.file)) ? ids(arr(rd(u.file), 'pages')).map((p) => [u.id, p]) : [])),
  '/israel-units/:id': async () => ids(arr(rd('data/curriculum/israel-units.json'), 'units')),
  '/grammar/:topic': async () => { const t = rd('data/grammar/notes.json').topics; return Array.isArray(t) ? ids(t) : Object.keys(t || {}); },
  '/read/:textId': async () => ids(arr(rd('data/corpus/registry.json'), 'texts', 'entries')),
  '/torahread/:section': async () => ids((await import(pathToFileURL(join(root, 'src/torahread/torahread.view.js')).href)).SECTIONS),
};

/** Fill a pattern's parameters, in order, with one value (a string) or several (an array). */
export const fill = (pattern, v) => { const vs = Array.isArray(v) ? v : [v]; let i = 0; return pattern.replace(/:[A-Za-z]+/g, () => encodeURIComponent(vs[i++] ?? '')); };

/** Static paths, in router order (every route without a parameter), with the root first. */
export function sitemapPaths(routes) {
  const seen = new Set(['/']), out = ['/'];
  for (const r of routes) {
    const p = r.pattern;
    if (!p || p.includes(':') || r.redirect || seen.has(p)) continue;
    seen.add(p); out.push(p);
  }
  return out;
}

/** Every path for the sitemap plus a report of how the router's patterns are covered. */
export async function sitemapPlan(routes) {
  const paths = sitemapPaths(routes), seen = new Set(paths);
  const report = { routes: routes.length, staticRoutes: routes.filter((r) => !r.pattern.includes(':')).length, paramRoutes: 0, enumerated: [], openEnded: [], failed: [] };
  for (const r of routes) {
    if (!r.pattern.includes(':')) continue;
    report.paramRoutes++;
    if (OPEN_ENDED[r.pattern]) { report.openEnded.push(r.pattern); continue; }
    const fn = ENUMERATE[r.pattern];
    let vals = [];
    try { vals = fn ? await fn() : []; } catch { vals = []; }
    if (!vals.length) { report.failed.push(r.pattern); continue; }
    report.enumerated.push({ pattern: r.pattern, urls: vals.length });
    for (const v of vals) { const p = fill(r.pattern, v); if (!seen.has(p)) { seen.add(p); paths.push(p); } }
  }
  report.patternsListed = report.staticRoutes + report.enumerated.length;
  report.urls = paths.length;
  return { paths, report };
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
export function sitemapXml(paths) {
  const urls = paths.map((p) => `  <url>\n    <loc>${esc(p === '/' ? `${ORIGIN}/` : `${ORIGIN}/#${p}`)}</loc>\n    <changefreq>weekly</changefreq>\n  </url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export async function buildSitemapPlan() {
  const { ROUTES } = await import(pathToFileURL(join(root, 'src/shell/router.js')).href);
  return sitemapPlan(ROUTES);
}
export async function buildSitemap() { return sitemapXml((await buildSitemapPlan()).paths); }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { paths, report } = await buildSitemapPlan();
  const xml = sitemapXml(paths);
  const file = join(root, 'sitemap.xml');
  if (process.argv.includes('--check')) {
    if (readFileSync(file, 'utf8') !== xml) { console.error('sitemap.xml is stale: run node tools/seo/build-sitemap.mjs'); process.exit(1); }
    console.log('sitemap.xml is current');
  } else { writeFileSync(file, xml); console.log(`sitemap.xml: ${paths.length} URLs`); }
  console.log(`router patterns listed: ${report.patternsListed} of ${report.routes} (${report.staticRoutes} without a parameter, ${report.enumerated.length} of ${report.paramRoutes} parameterised enumerated from data; open-ended: ${report.openEnded.join(', ') || 'none'}; not enumerated: ${report.failed.join(', ') || 'none'})`);
}
