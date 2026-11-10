// Link and asset check. Scans index.html, src/**/*.js, data/**/*.json, docs/**/*.md (and sw.js / manifest / precache) for internal
// references and verifies each resolves to a file in the repo; lists external http(s) links and (with --external) probes them
// with a HEAD/GET request. Zero dependencies.
//
//   node tools/check/links.mjs                 internal references only; exit 1 when any is broken
//   node tools/check/links.mjs --external      also probe external links over the network (HEAD, then GET on 405/403)
//   node tools/check/links.mjs --json out.json
//
// What counts as an internal reference:
//   - HTML/JS:   href="..." src="..." (static strings), import '...' / from '...' / import('...'), new URL('...', import.meta.url),
//                fetch('...') / loadJSON('...') / loadJson('...') string literals, and any quoted string that looks like a repo path with a
//                known asset extension (png jpg jpeg webp svg gif mp3 ogg wav json js mjs css html woff woff2 pdf ics md)
//   - JSON:      fields named img, image, audio, src, path, file, url, href, m, f, mp3, ogg, poster, icon whose value ends with one of those extensions
//   - Markdown:  [text](path) and <img src> that are not http(s), mailto or an anchor
// A reference is resolved from the referring file's directory; a root-relative one from the repo root; templates (${...}) and paths
// made of several variables are skipped; a path that resolves to a directory counts if it exists.
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve, relative, extname } from 'node:path';

const root = resolve(new URL('../../', import.meta.url).pathname);
const args = process.argv.slice(2);
const wantExternal = args.includes('--external');
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : '';
const EXT = 'png|jpg|jpeg|webp|svg|gif|mp3|ogg|wav|json|js|mjs|css|html|woff|woff2|pdf|ics|md|txt|csv|webmanifest';
// a URL may contain one level of balanced parentheses (Wikimedia "File:Name_(1903).ogg")
const URL_RE = /https?:\/\/(?:[^\s<>()"'`\]]|\([^\s()<>"'`]*\))+/g;
const EXT_RE = new RegExp(`\\.(${EXT})(\\?[^"'\\s)]*)?(#[^"'\\s)]*)?$`, 'i');

function walk(dir, pred, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name.startsWith('.')) continue;
    const p = join(dir, name); const st = statSync(p);
    if (st.isDirectory()) walk(p, pred, out); else if (pred(p)) out.push(p);
  }
  return out;
}
const files = [
  ...['index.html', 'offline.html', 'sw.js', 'manifest.webmanifest', 'precache-manifest.js'].map((f) => join(root, f)).filter(existsSync),
  ...walk(join(root, 'src'), (p) => /\.(js|mjs|html|css)$/.test(p)),
  ...walk(join(root, 'data'), (p) => p.endsWith('.json')),
  ...(existsSync(join(root, 'docs')) ? walk(join(root, 'docs'), (p) => p.endsWith('.md')) : []),
  ...(existsSync(join(root, 'preview')) ? walk(join(root, 'preview'), (p) => /\.(js|mjs|html)$/.test(p)) : []),
];

const refs = []; // {file, line, raw, kind, bases}
const planned = []; // references to files the data itself declares absent (not broken)
const external = new Map(); // url -> [file:line]
const booksIndex = new Map();
try { for (const b of JSON.parse(readFileSync(join(root, 'data/books/index.json'), 'utf8')).books) booksIndex.set(b.id, b); } catch { /* no books */ }
const LOCAL_OR_PLACEHOLDER = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|[^/]*\.(test|example|invalid|local)|example\.(com|org|net)|host|your-|<|\{|\*)/i;
const add = (file, line, raw, kind, bases = []) => {
  if (!raw || /\$\{|^\s*$/.test(raw)) return;
  if (/^(https?:)?\/\//i.test(raw)) {
    const u = raw.replace(/^\/\//, 'https://').replace(/[`'")\]>*.,;:]+$/, '').replace(/\\$/, '');
    if (LOCAL_OR_PLACEHOLDER.test(u) || /[<>{}`*\s]/.test(u)) return; // dev servers, documentation placeholders
    if (!external.has(u)) external.set(u, []); external.get(u).push(`${relative(root, file)}:${line}`); return;
  }
  if (/^(mailto:|tel:|data:|blob:|javascript:|#|about:)/i.test(raw)) return;
  refs.push({ file, line, raw, kind, bases });
};
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const ext = extname(file);
  if (ext === '.json') {
    // walk the JSON tree
    let data; try { data = JSON.parse(text); } catch (e) { refs.push({ file, line: 1, raw: '(invalid JSON: ' + e.message.slice(0, 60) + ')', kind: 'json-parse' }); continue; }
    const KEYS = new Set(['img', 'image', 'audio', 'src', 'path', 'file', 'url', 'href', 'm', 'f', 'mp3', 'ogg', 'poster', 'icon', 'thumb', 'thumbnail', 'sheet', 'page', 'pdf', 'cover', 'clip', 'sprite']);
    // Declared absences are not broken links: an audio-manifest entry with status "missing" names the clip it is waiting for
    // (src/audio/player.js never plays it); a book listed with hasImages:false in data/books/index.json names pages whose
    // pictures are not made yet (src/books/books.view.js says "Pictures coming" and draws no <img>).
    const rel = relative(root, file);
    // Image-pipeline inventories: prompt plans and provenance records whose `file` fields name originals that are deliberately
    // not in git (their own `note`/`meta` say so); nothing in src/ loads them. Listed, not resolved.
    if (/^data\/images\/(provenance|prompt-groups|next1000-groups)\.json$/.test(rel)) { planned.push({ file, raw: '(whole file)', why: 'image pipeline inventory, originals not in git' }); continue; }
    const bookNoImages = /^data\/books\/book\d+\.json$/.test(rel) && booksIndex.get(rel.slice(11, -5))?.hasImages === false;
    const dirHint = data && typeof data === 'object' && typeof data.dir === 'string' ? data.dir : '';
    const visit = (v, key, parent) => {
      if (Array.isArray(v)) { for (const x of v) visit(x, key, parent); return; }
      if (v && typeof v === 'object') { for (const [k, x] of Object.entries(v)) visit(x, k, v); return; }
      if (typeof v === 'string' && KEYS.has(key) && EXT_RE.test(v) && !/\s/.test(v)) {
        if (parent && parent.status === 'missing') { planned.push({ file, raw: v, why: 'audio manifest status missing' }); return; }
        if (bookNoImages && key === 'img') { planned.push({ file, raw: v, why: 'book hasImages false' }); return; }
        const i = text.indexOf(JSON.stringify(v));
        const raw = dirHint && !v.includes('/') ? `${dirHint}/${v}` : v;
        add(file, i >= 0 ? lineOf(text, i) : 0, raw, 'json:' + key, dirHint && !v.includes('/') ? ['assets/img'] : []);
      }
    };
    visit(data, '', null);
    continue;
  }
  if (ext === '.md') {
    for (const m of text.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) add(file, lineOf(text, m.index), m[1], 'md-link');
    for (const m of text.matchAll(/<img[^>]*\ssrc=["']([^"']+)["']/g)) add(file, lineOf(text, m.index), m[1], 'md-img');
    for (const m of text.matchAll(URL_RE)) add(file, lineOf(text, m.index), m[0].replace(/[.,;:]+$/, ''), 'md-url');
    continue;
  }
  // HTML / JS / CSS
  const pathy = (v) => /\//.test(v) || EXT_RE.test(v);
  for (const m of text.matchAll(/\b(?:href|src|poster|data-src)=["']([^"'\s]+)["']/g)) if (pathy(m[1])) add(file, lineOf(text, m.index), m[1], 'attr');
  // static imports (import x from '...'; import '...'; export ... from '...') and dynamic import('...'); node: built-ins are dev-only files
  for (const m of text.matchAll(/^[ \t]*(?:import|export)\b[^;'"`]*?\bfrom\s*["']([^"'\n]+)["']|^[ \t]*import\s*["']([^"'\n]+)["']|\bimport\(\s*["']([^"'\n]+)["']\s*\)/gm)) { const v = m[1] || m[2] || m[3]; if (v && !v.startsWith('node:')) add(file, lineOf(text, m.index), v, 'import'); }
  for (const m of text.matchAll(/new URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url/g)) add(file, lineOf(text, m.index), m[1], 'new URL');
  for (const m of text.matchAll(/\b(?:fetch|loadJSON|loadJson|loadData|importJSON)\(\s*["']([^"']+)["']/g)) add(file, lineOf(text, m.index), m[1], 'fetch');
  for (const m of text.matchAll(/url\(\s*["']([^"')\s]+)["']\s*\)/g)) if (pathy(m[1])) add(file, lineOf(text, m.index), m[1], 'css-url');
  for (const m of text.matchAll(/["'`]((?:\.{1,2}\/|\/)?(?:assets|data|audio|book|docs|src|preview|img|fonts)\/[^"'`\s]*?\.(?:png|jpe?g|webp|svg|gif|mp3|ogg|wav|json|js|mjs|css|html|woff2?|pdf|ics|md|csv))["'`]/g)) add(file, lineOf(text, m.index), m[1], 'path-literal');
  for (const m of text.matchAll(URL_RE)) add(file, lineOf(text, m.index), m[0].replace(/[.,;:]+$/, ''), 'url');
}

// resolve
const strip = (p) => p.replace(/[?#].*$/, '');
const results = [];
for (const r of refs) {
  if (r.kind === 'json-parse') { results.push({ ...r, ok: false, resolved: '' }); continue; }
  const p = strip(r.raw);
  if (!p) continue;
  let candidates;
  if (p.startsWith('/')) candidates = [join(root, p)];
  else if (p.startsWith('.')) candidates = [resolve(dirname(r.file), p)];
  else {
    // bare path: relative to the referring file, else to the repo root (how the served app and loadJSON("data/...") resolve)
    candidates = [resolve(dirname(r.file), p), join(root, p), ...(r.bases || []).map((b) => join(root, b, p))];
    // module specifiers that are not paths (none expected in a zero-dependency app)
    if (r.kind === 'import' && !/[\/.]/.test(p)) { results.push({ ...r, ok: false, resolved: '(bare module specifier)' }); continue; }
  }
  const hit = candidates.find((c) => existsSync(c));
  results.push({ ...r, ok: !!hit, resolved: hit ? relative(root, hit) : relative(root, candidates[candidates.length - 1]) });
}
const broken = results.filter((r) => !r.ok);
// de-duplicate by (file, raw)
const seen = new Set(); const brokenUniq = broken.filter((r) => { const k = r.file + '|' + r.raw; if (seen.has(k)) return false; seen.add(k); return true; });

const plannedBy = {}; for (const p of planned) plannedBy[p.why] = (plannedBy[p.why] || 0) + 1;
console.log(`${files.length} files scanned, ${results.length} internal references, ${brokenUniq.length} broken, ${planned.length} declared-absent (${JSON.stringify(plannedBy)}), ${external.size} distinct external URLs.`);
const byKind = {}; for (const r of brokenUniq) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
console.log('broken by kind:', JSON.stringify(byKind));
const max = Number((args.includes('--max') && args[args.indexOf('--max') + 1]) || 400);
for (const r of brokenUniq.slice(0, max)) console.log(`BROKEN ${relative(root, r.file)}:${r.line} [${r.kind}] ${r.raw} -> ${r.resolved}`);
if (brokenUniq.length > max) console.log(`... ${brokenUniq.length - max} more (use --max N or --json)`);

// external
const extResults = [];
if (wantExternal) {
  const probe = async (url) => {
    const t = (ms) => AbortSignal.timeout(ms);
    try {
      const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
      let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: t(15000), headers: { 'user-agent': 'alef-link-check/1' } });
      let method = 'HEAD';
      if ([403, 405, 404, 406, 429, 500, 501, 503].includes(res.status)) { res = await fetch(url, { method: 'GET', redirect: 'follow', signal: t(20000), headers: { 'user-agent': UA, accept: 'text/html,*/*;q=0.8', 'accept-language': 'en' } }); method = 'GET (browser user agent)'; }
      return { url, status: res.status, ok: res.ok || res.status === 206, method, final: res.url !== url ? res.url : '' };
    } catch (e) { return { url, status: 0, ok: false, method: 'fetch', error: String(e.cause?.message || e.message).slice(0, 120) }; }
  };
  const urls = [...external.keys()].sort();
  let i = 0;
  await Promise.all([1, 2, 3, 4, 5, 6].map(async () => { while (i < urls.length) { const u = urls[i++]; const r = await probe(u); r.where = external.get(u); extResults.push(r); } }));
  extResults.sort((a, b) => a.url.localeCompare(b.url));
  const bad = extResults.filter((r) => !r.ok);
  console.log(`\nexternal: ${extResults.length} probed, ${bad.length} not reachable (status 0 = network/TLS error):`);
  for (const r of bad) console.log(`EXT ${r.status} ${r.url}  (${r.where.slice(0, 2).join(', ')}${r.where.length > 2 ? ', +' + (r.where.length - 2) : ''})${r.error ? ' ' + r.error : ''}`);
} else {
  console.log(`\nexternal URLs (not probed; pass --external):`);
  for (const [u, where] of [...external.entries()].sort()) console.log(`  ${u}  (${where.length} ref${where.length > 1 ? 's' : ''})`);
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ files: files.length, internal: results.length, planned: plannedBy, broken: brokenUniq.map((r) => ({ file: relative(root, r.file), line: r.line, kind: r.kind, raw: r.raw, resolved: r.resolved })), external: wantExternal ? extResults : [...external.entries()].map(([url, where]) => ({ url, where })) }, null, 1));
process.exit(brokenUniq.length ? 1 : 0);
