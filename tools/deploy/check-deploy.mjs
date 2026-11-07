#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
// Pre-deploy check for Cloudflare Pages. Serves a built folder (default dist/, from make-dist.mjs) on a local port, applying its
// _headers file with Cloudflare's documented rules, then verifies headers, MIME types, service-worker scope, the Hebrew web fonts,
// the manifest, the CSP and Cloudflare's file limits.
//   node tools/deploy/check-deploy.mjs [--root dist] [--serve]     (--serve: keep the server up for a manual browser look)
// WHAT THIS IS NOT: it is a local imitation of Cloudflare's header handling written from its docs, not Cloudflare itself. Real
// responses (content types Cloudflare adds, compression, ETags, the .pages.dev host) can only be seen after a deploy.
import { createServer } from 'node:http';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative, sep, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliDecompressSync } from 'node:zlib';
import { MIME as BASE_MIME } from '../serve.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LIMITS = { maxFileBytes: 25 * 1024 * 1024, maxHeaderRules: 100, maxHeaderLen: 2000 }; // Cloudflare Pages limits page, read 2026-11-03
// No file-count limit here: the host is Render, which has no file cap (fix #5). The old Cloudflare Pages Free
// cap was 20,000 files per site; this build ships ~20,800 files, almost all of them audio clips the tests
// require to ship (every mp3 on disk ships — see tests/deploy.test.js), so the count is reported, never failed on.
const MIME = { ...BASE_MIME, '.wasm': 'application/wasm', '.traineddata': 'application/octet-stream', '.md': 'text/markdown; charset=utf-8' };

// ---------- _headers parsing and matching (Cloudflare semantics: every matching rule applies, same header joined with ", ", "! Name" detaches)
export function parseHeaders(text) {
  const rules = []; let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trimStart().startsWith('#')) continue;
    if (/^\s/.test(raw)) {
      if (!cur) throw new Error('header line before any path: ' + raw);
      const l = raw.trim();
      if (l.startsWith('!')) cur.detach.push(l.slice(1).trim().toLowerCase());
      else { const i = l.indexOf(':'); if (i < 1) throw new Error('bad header line: ' + raw); cur.headers.push([l.slice(0, i).trim(), l.slice(i + 1).trim()]); }
    } else { cur = { path: raw.trim(), headers: [], detach: [] }; rules.push(cur); }
  }
  return rules;
}
const toRegex = (p) => new RegExp('^' + p.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('(.*)') + '$');
export function headersFor(rules, pathname) {
  const out = new Map();
  for (const r of rules) {
    if (!toRegex(r.path).test(pathname)) continue;
    for (const d of r.detach) out.delete(d);
    for (const [k, v] of r.headers) { const key = k.toLowerCase(); const prev = out.get(key); out.set(key, prev ? { name: prev.name, value: prev.value + ', ' + v } : { name: k, value: v }); }
  }
  return out;
}
export const cacheRuleCount = (rules, pathname) => rules.filter((r) => toRegex(r.path).test(pathname) && r.headers.some(([k]) => k.toLowerCase() === 'cache-control')).length;

// ---------- WOFF2 -> which code points does the cmap cover (cmap is never transformed in WOFF2; Brotli is in node:zlib)
export function woff2Coverage(buf, codePoints) {
  if (buf.toString('latin1', 0, 4) !== 'wOF2') throw new Error('not a WOFF2 file (bad signature)');
  const numTables = buf.readUInt16BE(12), compLen = buf.readUInt32BE(20);
  let o = 48; const b128 = () => { let v = 0; for (let i = 0; i < 5; i++) { const c = buf[o++]; v = v * 128 + (c & 0x7f); if (!(c & 0x80)) return v; } throw new Error('bad UIntBase128'); };
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const flags = buf[o++]; const idx = flags & 0x3f, ver = flags >> 6;
    let tag; if (idx === 63) { tag = buf.toString('latin1', o, o + 4); o += 4; } else tag = idx === 0 ? 'cmap' : idx === 3 ? 'hmtx' : idx === 10 ? 'glyf' : idx === 11 ? 'loca' : '?' + idx;
    const orig = b128();
    const transformed = (tag === 'glyf' || tag === 'loca') ? ver === 0 : (tag === 'hmtx' ? ver === 1 : ver !== 0);
    tables.push({ tag, len: transformed ? b128() : orig });
  }
  const data = brotliDecompressSync(buf.subarray(o, o + compLen));
  let off = 0, cmapAt = -1, cmapLen = 0;
  for (const t of tables) { if (t.tag === 'cmap') { cmapAt = off; cmapLen = t.len; } off += t.len; }
  if (cmapAt < 0) throw new Error('no cmap table');
  const cm = data.subarray(cmapAt, cmapAt + cmapLen); const n = cm.readUInt16BE(2);
  const has = new Set();
  const subs = [];
  for (let i = 0; i < n; i++) subs.push({ plat: cm.readUInt16BE(4 + i * 8), enc: cm.readUInt16BE(6 + i * 8), at: cm.readUInt32BE(8 + i * 8) });
  for (const s of subs) {
    const fmt = cm.readUInt16BE(s.at);
    if (fmt === 4) {
      const segX2 = cm.readUInt16BE(s.at + 6), end = s.at + 14, start = end + segX2 + 2, delta = start + segX2, range = delta + segX2;
      for (let i = 0; i < segX2 / 2; i++) {
        const e = cm.readUInt16BE(end + i * 2), st = cm.readUInt16BE(start + i * 2), ro = cm.readUInt16BE(range + i * 2), dl = cm.readInt16BE(delta + i * 2);
        for (const cp of codePoints) if (cp >= st && cp <= e) {
          const g = ro === 0 ? (cp + dl) & 0xffff : (() => { const p = range + i * 2 + ro + (cp - st) * 2; const gi = p + 2 <= cm.length ? cm.readUInt16BE(p) : 0; return gi ? (gi + dl) & 0xffff : 0; })();
          if (g) has.add(cp);
        }
      }
    } else if (fmt === 12) {
      const ng = cm.readUInt32BE(s.at + 12);
      for (let i = 0; i < ng; i++) { const q = s.at + 16 + i * 12; const a = cm.readUInt32BE(q), z = cm.readUInt32BE(q + 4); for (const cp of codePoints) if (cp >= a && cp <= z) has.add(cp); }
    }
  }
  return has;
}

// ---------- local server
function walk(dir, root = dir, out = []) { for (const n of readdirSync(dir).sort()) { const p = join(dir, n); if (statSync(p).isDirectory()) walk(p, root, out); else out.push(relative(root, p).split(sep).join('/')); } return out; }

export function startServer(root, rules) {
  const indexHtml = join(root, 'index.html');
  return new Promise((ok) => {
    const srv = createServer((req, res) => {
      const url = new URL(req.url, 'http://x'); let pathname = decodeURIComponent(url.pathname);
      let file = resolve(root, '.' + pathname); let st;
      if (pathname.endsWith('/')) file = join(file, 'index.html');
      if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
      try { st = statSync(file); if (st.isDirectory()) { file = join(file, 'index.html'); st = statSync(file); } } catch { st = null; }
      if (!st) { if (extname(pathname)) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found'); } file = indexHtml; st = statSync(file); pathname = '/index.html'; } // Pages serves index.html (SPA mode) when there is no 404.html
      const rel = '/' + relative(root, file).split(sep).join('/');
      if (rel === '/_headers' || rel === '/_redirects') { res.writeHead(404); return res.end(); } // Pages does not serve these two
      const h = { 'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream', 'accept-ranges': 'bytes' };
      for (const { name, value } of headersFor(rules, url.pathname).values()) h[name.toLowerCase()] = value; // matched on the REQUESTED path
      const body = readFileSync(file);
      const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
      if (m) { const a = m[1] === '' ? body.length - Number(m[2]) : Number(m[1]); const z = m[1] !== '' && m[2] !== '' ? Math.min(Number(m[2]), body.length - 1) : body.length - 1; res.writeHead(206, { ...h, 'content-range': `bytes ${a}-${z}/${body.length}`, 'content-length': z - a + 1 }); return res.end(req.method === 'HEAD' ? undefined : body.subarray(a, z + 1)); }
      res.writeHead(200, { ...h, 'content-length': body.length }); res.end(req.method === 'HEAD' ? undefined : body);
    });
    srv.listen(0, '127.0.0.1', () => ok(srv));
  });
}

// ---------- the checks
export async function runChecks(root) {
  const results = []; const warnings = [];
  const check = (name, pass, detail = '') => results.push({ name, pass: !!pass, detail });
  const warn = (m) => warnings.push(m);
  const headersPath = join(root, '_headers');
  check('_headers exists in the build folder', existsSync(headersPath), headersPath);
  if (!existsSync(headersPath)) return { results, warnings };
  const rules = parseHeaders(readFileSync(headersPath, 'utf8'));
  check(`_headers has at most ${LIMITS.maxHeaderRules} rules (Cloudflare limit)`, rules.length <= LIMITS.maxHeaderRules, `${rules.length} rules`);
  const longest = Math.max(...rules.flatMap((r) => r.headers.map(([, v]) => v.length)));
  check(`every header value is at most ${LIMITS.maxHeaderLen} characters`, longest <= LIMITS.maxHeaderLen, `longest ${longest}`);

  const star = headersFor(rules, '/x/y.js');
  const csp = star.get('content-security-policy')?.value ?? '';
  const origins = [...csp.matchAll(/(?:https?|wss?):\/\/[^\s;]+/g)].map((m) => m[0]).filter((u) => !/^http:\/\/(127\.0\.0\.1|localhost)(:\*|:\d+)?$/.test(u));
  check('CSP present and has no third-party origins (only self, blob:, data:, local helper on 127.0.0.1/localhost)', csp && origins.length === 0, origins.join(' '));
  check("CSP: default-src 'self', object-src 'none', frame-ancestors 'none', base-uri 'self'", /default-src 'self'/.test(csp) && /object-src 'none'/.test(csp) && /frame-ancestors 'none'/.test(csp) && /base-uri 'self'/.test(csp));
  check("CSP does not allow 'unsafe-eval' or 'unsafe-inline' for scripts", !/script-src[^;]*'unsafe-(eval|inline)'/.test(csp));
  check('X-Content-Type-Options: nosniff', star.get('x-content-type-options')?.value === 'nosniff');
  check('Referrer-Policy set', !!star.get('referrer-policy'));
  check('Permissions-Policy set', !!star.get('permissions-policy'));
  const pp = star.get('permissions-policy')?.value ?? '';
  check('Permissions-Policy allows the microphone for the app origin only (microphone=(self)), not everyone and not blocked', /(^|,\s*)microphone=\(self\)(,|$)/.test(pp), pp);
  check('Permissions-Policy still denies payment, usb, bluetooth, serial', ['payment', 'usb', 'bluetooth', 'serial'].every((f) => new RegExp(`(^|,\\s*)${f}=\\(\\)(,|$)`).test(pp)));

  check('_headers sets Content-Type application/manifest+json for /manifest.webmanifest explicitly (the local server has a built-in MIME map, so this is checked on the file, not just the response)', headersFor(rules, '/manifest.webmanifest').get('content-type')?.value === 'application/manifest+json');

  // limits (Cloudflare Pages: 25 MiB per file; file count is reported in the summary, not limited — the host is Render, no file cap; fix #5)
  const files = walk(root); const sizes = files.map((f) => ({ f, b: statSync(join(root, f)).size }));
  const big = sizes.reduce((a, s) => (s.b > a.b ? s : a), { b: 0 });
  check('every file within 25 MiB (Cloudflare Pages)', big.b <= LIMITS.maxFileBytes, `largest ${big.f} ${(big.b / 1048576).toFixed(2)} MiB`);
  const total = sizes.reduce((a, s) => a + s.b, 0);
  const none = files.filter((f) => cacheRuleCount(rules, '/' + f) > 1);
  check('no file matches two rules that both set Cache-Control (Cloudflare would join them into one invalid value)', none.length === 0, none.slice(0, 3).join(', '));
  const imm = files.filter((f) => /immutable/.test(headersFor(rules, '/' + f).get('cache-control')?.value ?? ''));
  check('nothing is marked immutable while file names are un-hashed', imm.length === 0, imm.slice(0, 3).join(', '));
  const unruled = files.filter((f) => !headersFor(rules, '/' + f).get('cache-control') && !['_headers', '_redirects'].includes(f));
  if (unruled.length) warn(`${unruled.length} files have no Cache-Control rule (Cloudflare default applies), e.g. ${unruled.slice(0, 3).join(', ')}`);

  // static scans for CSP breakers
  const code = files.filter((f) => /\.(js|mjs|html)$/.test(f) && !f.startsWith('assets/vendor/'));
  const evalHits = code.filter((f) => f !== 'sw.js' && /\b(eval\s*\(|new Function\s*\()/.test(readFileSync(join(root, f), 'utf8').replace(/\/\*[\s\S]*?\*\/|(^|[^:\\'"`])\/\/.*$/gm, '$1')));
  check('no eval() or new Function() in shipped app code (CSP blocks them)', evalHits.length === 0, evalHits.join(', '));
  const inline = files.filter((f) => f.endsWith('.html')).filter((f) => /<script(?![^>]*\bsrc=)[^>]*>|\son[a-z]+\s*=\s*["']/i.test(readFileSync(join(root, f), 'utf8')));
  check('no inline <script> or on*= handlers in html (CSP blocks them)', inline.length === 0, inline.join(', '));
  const hosts = new Map();
  for (const f of code.filter((x) => x.endsWith('.js') || x.endsWith('.mjs'))) {
    for (const line of readFileSync(join(root, f), 'utf8').split('\n')) {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
      for (const m of line.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) { const h = m[1].toLowerCase(); if (h === 'www.w3.org' || h === 'localhost' || h === '127.0.0.1') continue; (hosts.get(h) ?? hosts.set(h, new Set()).get(h)).add(f); }
    }
  }
  // Credit and licence links, checked by hand: these files name the host only inside an <a href> (never fetch). A line that names an
  // allowlisted host and is not an href still warns, so a later fetch to the same host cannot hide behind this list.
  const LINK_ONLY = { 'src/vocab/vocab.view.js': ['creativecommons.org', 'github.com', 'www.wiktionary.org', 'kaikki.org'] };
  const linkOnly = (h, f) => (LINK_ONLY[f] || []).includes(h) && readFileSync(join(root, f), 'utf8').split('\n')
    .filter((line) => line.toLowerCase().includes('//' + h)).every((line) => new RegExp(`href:\\s*['"]https?://${h.replace(/\./g, '\\.')}`, 'i').test(line) && !/fetch\s*\(/.test(line));
  let credited = 0;
  for (const [h, fs] of hosts) {
    const rest = [...fs].filter((f) => !linkOnly(h, f)); credited += fs.size - rest.length;
    if (rest.length) warn(`origin named in code: ${h} (${rest.join(', ')}) - harmless if only shown as a link or credit; if fetched, the CSP blocks it`);
  }
  if (credited) console.log(`info  ${credited} credit link origin(s) allowlisted as link-only (LINK_ONLY in tools/deploy/check-deploy.mjs)`);

  // HTTP checks
  const srv = await startServer(root, rules); const base = `http://127.0.0.1:${srv.address().port}`;
  const get = async (p, init) => { const r = await fetch(base + p, init); const buf = Buffer.from(await r.arrayBuffer()); return { r, buf, ct: r.headers.get('content-type') ?? '', cc: r.headers.get('cache-control') ?? '' }; };
  try {
    const home = await get('/');
    check('GET / is 200 text/html; charset=utf-8', home.r.status === 200 && /^text\/html;\s*charset=utf-8$/i.test(home.ct), home.ct);
    check('index.html: Cache-Control no-cache', home.cc === 'no-cache', home.cc);
    check('index.html carries CSP, nosniff, Referrer-Policy, Permissions-Policy', ['content-security-policy', 'x-content-type-options', 'referrer-policy', 'permissions-policy'].every((h) => home.r.headers.has(h)));
    const spa = await get('/letters/alef');
    check('unknown extensionless path falls back to index.html (hash router never needs it; Pages SPA mode)', spa.r.status === 200 && /text\/html/.test(spa.ct));
    const missing = await get('/data/nope.json');
    check('missing file with an extension is a real 404', missing.r.status === 404);
    check('_headers is not served as a file', (await get('/_headers')).r.status === 404);

    // service worker: scope, headers, importScripts target, precache list
    const sw = await get('/sw.js'); const swText = sw.buf.toString('utf8');
    check('sw.js: 200, JavaScript MIME', sw.r.status === 200 && /^(text|application)\/javascript/.test(sw.ct), sw.ct);
    check('sw.js: Cache-Control no-cache (browsers also bypass HTTP cache for it, but proxies should not keep it)', sw.cc === 'no-cache', sw.cc);
    const appJs = existsSync(join(root, 'src/app.js')) ? readFileSync(join(root, 'src/app.js'), 'utf8') : '';
    const reg = /(?:serviceWorker|swc)\.register\(\s*['"]([^'"]+)['"](?:\s*,\s*(\{[^}]*\}))?/.exec(appJs);
    check("app registers 'sw.js' relative to the page with no custom scope option", reg && reg[1] === 'sw.js' && !reg[2], reg ? reg[0] : 'registration not found in src/app.js');
    const man = await get('/manifest.webmanifest');
    check('manifest: Content-Type application/manifest+json', /^application\/manifest\+json/.test(man.ct), man.ct);
    check('manifest: Cache-Control no-cache', man.cc === 'no-cache', man.cc);
    const mj = JSON.parse(man.buf.toString('utf8'));
    const scope = new URL(mj.scope, base + '/manifest.webmanifest'), start = new URL(mj.start_url, base + '/manifest.webmanifest'), swUrl = new URL('sw.js', base + '/');
    check('SW scope: manifest scope resolves to the site root and the worker URL is inside/at it', scope.pathname === '/' && swUrl.pathname.startsWith(scope.pathname) && start.pathname.startsWith(scope.pathname), `scope ${scope.pathname}, start ${start.pathname}${start.hash}, sw ${swUrl.pathname}`);
    for (const ic of mj.icons) { const g = await get('/' + ic.src); if (g.r.status !== 200 || g.ct.split(';')[0] !== (MIME[extname(ic.src)] ?? '')) check('manifest icon ' + ic.src, false, `${g.r.status} ${g.ct}`); }
    const shots = []; for (const s of mj.screenshots ?? []) { const g = await get('/' + s.src); if (g.r.status !== 200 || g.ct !== MIME[extname(s.src)]) shots.push(s.src); }
    check(`manifest icons (${mj.icons.length}) and screenshots (${(mj.screenshots ?? []).length}) resolve with the right image MIME`, shots.length === 0 && !results.some((r) => !r.pass && r.name.startsWith('manifest icon')), shots.join(', '));
    const pm = await get('/precache-manifest.js');
    check('precache-manifest.js: 200, JavaScript, no-cache', pm.r.status === 200 && /javascript/.test(pm.ct) && pm.cc === 'no-cache', `${pm.r.status} ${pm.ct} ${pm.cc}`);
    check('sw.js importScripts the precache list at the same level', /importScripts\(\s*['"]precache-manifest\.js['"]/.test(swText));
    const list = JSON.parse(/self\.ALEF_PRECACHE\s*=\s*(\[[\s\S]*?\]);/.exec(pm.buf.toString('utf8'))[1]);
    const bad = [];
    let installBytes = 0;
    for (const f of list) { const g = await get('/' + f); installBytes += g.buf.length; const want = MIME[extname(f).toLowerCase()]; if (g.r.status !== 200 || (want && g.ct !== want) || (g.buf.length === 0)) bad.push(`${f} -> ${g.r.status} ${g.ct}`); }
    check(`all ${list.length} precache entries return 200 with the expected MIME (one failure makes the whole SW install fail)`, bad.length === 0, bad.slice(0, 3).join('; '));
    check(`first-install precache is ${(installBytes / 1048576).toFixed(2)} MiB (${list.length} files), budget 4 MiB`, installBytes <= 4 * 1048576, `${(installBytes / 1048576).toFixed(2)} MiB`);
    const od = /self\.ALEF_ON_DEMAND\s*=\s*(\[[\s\S]*?\])\s*;/.exec(pm.buf.toString('utf8')); const onDemand = od ? JSON.parse(od[1]) : [];
    const odBad = []; let odBytes = 0;
    for (const f of onDemand) { const g = await get('/' + f); odBytes += g.buf.length; if (g.r.status !== 200 || g.buf.length === 0) odBad.push(`${f} -> ${g.r.status}`); }
    check(`all ${onDemand.length} on-demand files (${(odBytes / 1048576).toFixed(2)} MiB, fetched later, not installed) are served with 200`, odBad.length === 0, odBad.slice(0, 3).join('; '));

    // MIME for every extension that ships
    const byExt = new Map(); for (const f of files) { if (['_headers', '_redirects'].includes(f)) continue; const e = extname(f).toLowerCase(); if (!byExt.has(e)) byExt.set(e, f); }
    const mimeBad = [];
    for (const [e, f] of byExt) { const g = await get('/' + f); const want = MIME[e]; if (!want) { warn(`no expected MIME for ${e} (${f}): served as ${g.ct}`); continue; } if (g.ct !== want) mimeBad.push(`${f}: ${g.ct}`); }
    check(`MIME types right for all ${byExt.size} extensions that ship (${[...byExt.keys()].join(' ')})`, mimeBad.length === 0, mimeBad.join('; '));
    const jsonFile = files.find((f) => f.startsWith('data/') && f.endsWith('.json') && statSync(join(root, f)).size < 400000 && /[\u05d0-\u05ea]/.test(readFileSync(join(root, f), 'utf8')));
    check('a shipped JSON file containing Hebrew exists to test with', !!jsonFile);
    if (jsonFile) { const g = await get('/' + jsonFile); check('JSON data is UTF-8 and decodes with Hebrew intact', /charset=utf-8/i.test(g.ct) && /[א-ת]/.test(g.buf.toString('utf8')), `${jsonFile} ${g.ct}`); }

    // Hebrew web fonts
    const css = await get('/assets/css/fonts.css');
    check('fonts.css served as text/css', css.r.status === 200 && css.ct === 'text/css; charset=utf-8', css.ct);
    const faces = [...css.buf.toString('utf8').matchAll(/font-family:\s*"([^"]+)";\s*src:\s*url\("([^"]+)"\)/g)];
    check('fonts.css declares @font-face rules', faces.length > 0, `${faces.length} found`);
    const hebrew = []; for (let c = 0x5d0; c <= 0x5ea; c++) hebrew.push(c);
    const niqqud = [0x5b0, 0x5b4, 0x5b5, 0x5b6, 0x5b7, 0x5b8, 0x5b9, 0x5bc, 0x5c1, 0x5c2];
    for (const [, fam, rel] of faces) {
      const u = new URL(rel, base + '/assets/css/fonts.css'); const g = await get(u.pathname);
      const okType = g.r.status === 200 && g.ct === 'font/woff2' && /max-age=\d+/.test(g.cc);
      let cov = null, err = ''; try { cov = woff2Coverage(g.buf, [...hebrew, ...niqqud]); } catch (e) { err = e.message; }
      const letters = cov ? hebrew.filter((c) => cov.has(c)).length : 0, marks = cov ? niqqud.filter((c) => cov.has(c)).length : 0;
      check(`font "${fam}" (${u.pathname}): 200, font/woff2, cached, all 27 Hebrew letters in the cmap`, okType && letters === 27, `${g.ct} ${g.cc} letters ${letters}/27, vowel/dagesh marks ${marks}/${niqqud.length}${err ? ' ' + err : ''}`);
      if (cov && marks < niqqud.length) warn(`font "${fam}" lacks ${niqqud.length - marks} of the sampled niqqud marks: pointed text would fall back to another font`);
    }
    const preload = /<link[^>]+rel="preload"[^>]+href="([^"]+\.woff2)"[^>]*>/.exec(home.buf.toString('utf8'));
    check('index.html preloads a woff2 with the crossorigin attribute (needed or the preload is fetched twice)', preload && /crossorigin/.test(preload[0]), preload ? preload[0] : 'no preload');

    // Range requests (needed for audio seeking; the SW deliberately bypasses the cache for Range)
    const pdf = files.find((f) => f.endsWith('.pdf')) ?? files.find((f) => f.endsWith('.json'));
    const rg = await get('/' + pdf, { headers: { range: 'bytes=0-9' } });
    check('Range request answered 206 by the local server (Cloudflare serves Range natively; this only proves the checker)', rg.r.status === 206 && rg.buf.length === 10);
  } finally { srv.close(); }
  return { results, warnings, summary: { files: files.length, bytes: total, rules: rules.length } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2); const i = args.indexOf('--root');
  const root = resolve(i >= 0 ? args[i + 1] : join(REPO, 'dist'));
  if (!existsSync(root)) { console.error(`No build folder at ${root}. Run: node tools/deploy/make-dist.mjs`); process.exit(2); }
  if (args.includes('--serve')) {
    const rules = parseHeaders(readFileSync(join(root, '_headers'), 'utf8')); const s = await startServer(root, rules);
    console.log(`serving ${root} with _headers at http://127.0.0.1:${s.address().port}/  (Ctrl-C to stop)`); await new Promise(() => {});
  }
  const { results, warnings, summary } = await runChecks(root);
  for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  [' + r.detail + ']' : ''}`);
  for (const w of warnings) console.log(`WARN  ${w}`);
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} passed, ${warnings.length} warnings. ${summary ? `${summary.files} files, ${(summary.bytes / 1048576).toFixed(2)} MiB, ${summary.rules} header rules.` : ''}`);
  process.exit(failed ? 1 : 0);
}
