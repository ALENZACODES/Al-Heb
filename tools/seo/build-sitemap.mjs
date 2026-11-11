// Writes sitemap.xml from the router (S-08): the site root plus every main public page (the v0 tier and the pages in the
// main navigation). Pages that need a parameter, redirects and utility screens (settings, offline, install, search) are left
// out. The app uses hash addresses (#/learn), so each entry is the root address with its hash; see robots.txt.
//   node tools/seo/build-sitemap.mjs           write sitemap.xml
//   node tools/seo/build-sitemap.mjs --check   exit 1 when sitemap.xml is stale
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ORIGIN = 'https://alef-review.onrender.com';
const UTILITY = new Set(['/settings', '/offline', '/install', '/search', '/reminders', '/share', '/welcome', '/scheduler', '/light']);

/** Paths for the sitemap, in router order, from ROUTES. */
export function sitemapPaths(routes) {
  const seen = new Set();
  const out = [];
  for (const r of routes) {
    const p = r.pattern;
    if (!p || p.includes(':') || r.redirect || UTILITY.has(p)) continue;
    if (!(r.tier === 'v0' || r.nav || r.quick)) continue;
    if (seen.has(p)) continue;
    seen.add(p); out.push(p);
  }
  if (!seen.has('/')) out.unshift('/');
  return out;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
export function sitemapXml(paths) {
  const urls = paths.map((p) => `  <url>\n    <loc>${esc(p === '/' ? `${ORIGIN}/` : `${ORIGIN}/#${p}`)}</loc>\n    <changefreq>weekly</changefreq>\n  </url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export async function buildSitemap() {
  const { ROUTES } = await import(pathToFileURL(join(root, 'src/shell/router.js')).href);
  return sitemapXml(sitemapPaths(ROUTES));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const xml = await buildSitemap();
  const file = join(root, 'sitemap.xml');
  if (process.argv.includes('--check')) {
    if (readFileSync(file, 'utf8') !== xml) { console.error('sitemap.xml is stale: run node tools/seo/build-sitemap.mjs'); process.exit(1); }
  } else { writeFileSync(file, xml); console.log(`sitemap.xml: ${xml.split('<url>').length - 1} URLs`); }
}
