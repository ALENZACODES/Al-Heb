import { pathToFileURL } from 'node:url';
// Tiny zero-dependency static server. Usage: node tools/serve.mjs [port]   (default 8080; PORT env also works)
// SPA-safe: unknown extensionless paths serve index.html. Never serves outside the repo root.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf',
};

/** @param {{root?:string, prefix?:string}} [o] prefix e.g. "/alef/" serves the site under that path (to test project-site hosting) */
export function createAppServer({ root = ROOT, prefix = '/' } = {}) {
  root = resolve(root); // Normalize trailing separators before the containment check.
  const pre = prefix.replace(/\/+$/, '');
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://x');
      let rel = decodeURIComponent(url.pathname);
      if (pre) { if (rel === pre) { res.writeHead(301, { location: pre + '/' }); return res.end(); } if (!rel.startsWith(pre + '/')) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found (outside prefix)'); } rel = rel.slice(pre.length); }
      if (rel.includes('\0')) throw Object.assign(new Error('bad'), { code: 400 });
      let file = normalize(join(root, rel));
      if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); return res.end('Forbidden'); }
      let st = await stat(file).catch(() => null);
      if (st?.isDirectory()) { file = join(file, 'index.html'); st = await stat(file).catch(() => null); }
      if (!st) {
        if (extname(rel)) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found'); }
        file = join(root, 'index.html'); st = await stat(file);
      }
      const body = await readFile(file);
      const type = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
      res.writeHead(200, { 'content-type': type, 'content-length': body.length, 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (e) {
      res.writeHead(e.code === 400 ? 400 : 500, { 'content-type': 'text/plain' }); res.end('Server error');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const port = Number(args.find((a) => /^\d+$/.test(a)) ?? process.env.PORT ?? 8080);
  createAppServer({ root: flag('--root') ? resolve(flag('--root')) : ROOT, prefix: flag('--prefix') ?? '/' }).listen(port, () => console.log(`ALEF dev server: http://localhost:${port}/`));
}
