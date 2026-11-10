// Probe (not a gate): run sw.js in a vm with a fake CacheStorage and a "network" that has moved on to newer files than the precache.
import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const store = new Map(); // cacheName -> Map(url -> body)
const mkCache = (n) => { if (!store.has(n)) store.set(n, new Map()); const m = store.get(n); return {
  put: async (r, res) => { m.set(r.url, await res.text()); }, addAll: async (urls) => { for (const u of urls) m.set('https://x.test/' + u, 'v1:' + u); },
  match: async (r) => (m.has(r.url) ? new Response(m.get(r.url)) : undefined), keys: async () => [...m.keys()].map((u) => ({ url: u })), delete: async (r) => m.delete(r.url || r) }; };
const caches = { open: async (n) => mkCache(n), keys: async () => [...store.keys()], delete: async (n) => store.delete(n),
  match: async (r) => { for (const n of store.keys()) { const h = await mkCache(n).match(r); if (h) return h; } } };
const handlers = {};
const ctx = { self: { location: { origin: 'https://x.test' }, addEventListener: (t, f) => (handlers[t] = f), ALEF_VERSION: 'v1', ALEF_PRECACHE: ['a.js', 'b.js'], clients: { claim() {} } },
  importScripts() {}, caches, URL, Response, Request, fetch: async (r) => new Response('v2:' + new URL(r.url).pathname.slice(1)), console };
ctx.self.skipWaiting = () => {};
vm.createContext(ctx); vm.runInContext(readFileSync(process.argv[2], 'utf8'), ctx);
let p; handlers.install({ waitUntil: (x) => (p = x) }); await p;
const req = new Request('https://x.test/a.js', { headers: {} });
let out; handlers.fetch({ request: req, respondWith: (x) => (out = x) }); const served = await (await out).text();
await new Promise((r) => setTimeout(r, 50));
const shell = store.get('alef-shell-v1');
console.log('served first:', served);
console.log('shell a.js after refresh:', shell.get('https://x.test/a.js'), '| shell b.js:', shell.get('https://x.test/b.js'));
console.log('MIXED in one shell cache:', shell.get('https://x.test/a.js') !== shell.get('https://x.test/b.js').replace('b.js', 'a.js') ? 'YES' : 'no');
