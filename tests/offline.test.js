import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import * as O from "../src/shell/offline.js";
import * as U from "../src/shell/update.js";

const manifestText = readFileSync(new URL("../precache-manifest.js", import.meta.url), "utf8");
const exists = (p) => existsSync(new URL("../" + p, import.meta.url));

// ---------- fakes ----------
const resp = (body, { ok = true, status = 200 } = {}) => ({ ok, status, headers: { get: () => null }, clone() { return this; }, async blob() { return { size: body.length }; }, async arrayBuffer() { return { byteLength: body.length }; }, async text() { return body; } });
function fakeCaches(map) { // { cacheName: { url: body } }
  return { keys: async () => Object.keys(map), open: async (n) => ({ match: async (u) => (map[n] && u in map[n] ? resp(map[n][u]) : undefined) }) };
}
const noSleep = async () => {};

// ---------- precache list ----------
test("parsePrecacheText: reads version and files without eval; the real manifest parses and lists index.html", () => {
  const r = O.parsePrecacheText(manifestText);
  assert.match(r.version, /^[0-9a-f]{12}$/); assert.ok(r.files.length > 200); assert.ok(r.files.includes("index.html")); assert.ok(r.files.includes("src/app.js"));
  assert.deepEqual(O.parsePrecacheText("garbage"), { version: null, files: [], onDemand: [] });
  assert.deepEqual(O.parsePrecacheText('self.ALEF_VERSION = "v";\nself.ALEF_PRECACHE = [\n "a.js",\n 3,\n "b.json"\n];\n'), { version: "v", files: ["a.js", "b.json"], onDemand: [] });
  assert.deepEqual(O.parsePrecacheText('self.ALEF_PRECACHE = ["a.js"];\nself.ALEF_ON_DEMAND = ["data/vocab/x.json", 7];\n').onDemand, ["data/vocab/x.json"]);
  assert.deepEqual(O.parsePrecacheText('self.ALEF_PRECACHE = [ not json ];').files, []);
});
test("loadPrecacheList: HTTP errors throw with the status, success parses", async () => {
  await assert.rejects(O.loadPrecacheList(async () => resp("", { ok: false, status: 404 })), /HTTP 404/);
  assert.equal((await O.loadPrecacheList(async () => resp(manifestText))).files[0], "index.html");
});

test("every precached file belongs to a known group (none fall into 'other' except by design) and the optional files exist on disk", () => {
  const files = O.parsePrecacheText(manifestText).files;
  const other = files.filter((f) => O.groupOf(f) === "other");
  assert.ok(other.length <= 3, "add a group or widen a prefix: " + other.slice(0, 5));
  assert.equal(O.groupOf("src/curriculum/calendar.view.js"), "calendar"); assert.equal(O.groupOf("src/curriculum/lesson.view.js"), "lessons");
  for (const t of ["israeli", "sephardi", "ashkenazi"]) for (const g of O.optionalGroups(t)) for (const u of g.urls) assert.ok(exists(u), u);
  assert.match(O.optionalGroups("nonsense")[0].urls[0], /sephardi/);
  for (const u of O.optionalGroups().flatMap((g) => g.urls)) assert.ok(!files.includes(u), "optional file is not already precached: " + u);
});

test("on-demand files: every one in precache-manifest.js is on disk, none is installed, each lands in a named group (not 'More pages and data'), and groups cover them exactly once", () => {
  const { files, onDemand } = O.parsePrecacheText(manifestText);
  assert.ok(onDemand.length > 100, "run node tools/build-precache.mjs");
  for (const u of onDemand) { assert.ok(exists(u), u); assert.ok(!files.includes(u), "installed and on demand: " + u); }
  const groups = O.onDemandGroups(onDemand);
  assert.ok(!groups.some((g) => g.id === "od-other"), "add an ON_DEMAND_GROUPS entry for: " + onDemand.filter((u) => !O.ON_DEMAND_GROUPS.some((g) => g.test.test(u))).slice(0, 5));
  assert.deepEqual(groups.flatMap((g) => g.urls).sort(), [...onDemand].sort());
  assert.deepEqual(O.onDemandGroups([]), []);
  assert.equal(O.onDemandGroups(["data/zzz/new.json"])[0].id, "od-other");
});

test("letter memory pictures: installed ones count under Letters, the rest are a named on-demand group", () => {
  assert.equal(O.groupOf("assets/letters/morph/shin.svg"), "letters");
  assert.equal(O.groupOf("data/letters/memory-chain.json"), "letters");
  const g = O.onDemandGroups(["assets/letters/morph/kaf.svg", "assets/letters/morph/sin.svg"]);
  assert.equal(g.length, 1); assert.equal(g[0].id, "od-letter-pictures"); assert.equal(g[0].urls.length, 2);
  const { onDemand } = O.parsePrecacheText(manifestText);
  const pics = onDemand.filter((u) => u.startsWith("assets/letters/morph/"));
  assert.ok(pics.length >= 15, "run node tools/build-precache.mjs");
  const bytes = pics.reduce((a, u) => a + statSync(new URL("../" + u, import.meta.url)).size, 0);
  assert.ok(Math.abs(bytes / 1e6 - O.ON_DEMAND_GROUPS.find((x) => x.id === "od-letter-pictures").approxMB) < 0.02, "approxMB of od-letter-pictures is a hint measured from the repo: update it (" + (bytes / 1e6).toFixed(2) + " MB)");
});

// ---------- cache report ----------
test("cacheReport: per-group states and sizes from several caches; non-alef caches ignored; no Cache API => unsupported", async () => {
  const files = ["index.html", "src/app.js", "src/letters/a.js", "src/letters/b.js", "src/photo/scan.view.js"];
  const caches = fakeCaches({ "alef-shell-abc": { "index.html": "12345", "src/app.js": "123", "src/letters/a.js": "12" }, "alef-runtime-v1": { "src/photo/scan.view.js": "1234567" }, "other-site": { "src/letters/b.js": "x" } });
  const r = await O.cacheReport(files, { caches });
  assert.equal(r.supported, true); assert.deepEqual(r.cacheNames, ["alef-shell-abc", "alef-runtime-v1"]);
  assert.equal(r.cached, 4); assert.deepEqual(r.missing, ["src/letters/b.js"]); assert.equal(r.bytes, 5 + 3 + 2 + 7);
  const by = Object.fromEntries(r.groups.map((g) => [g.id, g]));
  assert.equal(by.shell.state, "ready"); assert.equal(by.letters.state, "partial"); assert.equal(by.letters.cached, 1); assert.equal(by.photo.state, "ready"); assert.deepEqual(by.photo.needs, ["ocr"]);
  assert.equal((await O.cacheReport(files, { caches: fakeCaches({}) })).groups.every((g) => g.state === "missing"), true);
  const none = await O.cacheReport(files, { caches: null });
  assert.equal(none.supported, false); assert.equal(none.cached, 0);
  const broken = await O.cacheReport(files, { caches: { keys: async () => { throw new Error("x"); } } });
  assert.equal(broken.cached, 0);
  assert.equal((await O.cacheReport(files, { caches, measure: false })).bytes, null);
});

// ---------- warming ----------
test("warmCache: fetches everything with bounded concurrency, reports progress and bytes", async () => {
  let live = 0, peak = 0; const seen = [];
  const fetch = async (u, o) => { live++; peak = Math.max(peak, live); await new Promise((r) => setTimeout(r, 1)); live--; seen.push([u, o.cache]); return resp("abcd"); };
  const prog = [];
  const r = await O.warmCache(["a", "b", "c", "d", "e", "f"], { fetch, concurrency: 2, onProgress: (p) => prog.push(p.done) });
  assert.equal(r.ok, 6); assert.equal(r.failed.length, 0); assert.equal(r.bytes, 24); assert.ok(peak <= 2); assert.deepEqual(prog, [1, 2, 3, 4, 5, 6]);
  assert.ok(seen.every(([, c]) => c === "reload"));
});
test("warmCache: failures are reported with a reason; 404 is not retried; network errors retry once; offline short-circuits; no fetch", async () => {
  const calls = {};
  const fetch = async (u) => { calls[u] = (calls[u] || 0) + 1; if (u === "gone") return resp("", { ok: false, status: 404 }); if (u === "flaky") { if (calls[u] === 1) throw new Error("net down"); return resp("ok"); } if (u === "dead") throw new Error("net down"); if (u === "boom") return resp("", { ok: false, status: 503 }); return resp("ok"); };
  const r = await O.warmCache(["good", "gone", "flaky", "dead", "boom"], { fetch, sleep: noSleep });
  assert.equal(r.ok, 2); assert.equal(calls.gone, 1); assert.equal(calls.flaky, 2); assert.equal(calls.dead, 2); assert.equal(calls.boom, 2);
  assert.deepEqual(Object.fromEntries(r.failed.map((f) => [f.url, f.reason])), { gone: "HTTP 404", dead: "net down", boom: "HTTP 503" });
  const off = await O.warmCache(["a"], { fetch, online: () => false }); assert.equal(off.offline, true); assert.equal(off.failed[0].reason, "offline");
  const nof = await O.warmCache(["a"], { fetch: null }); assert.equal(nof.failed.length, 1);
});
test("warmCache: aborting stops the queue and marks the rest cancelled", async () => {
  const ac = new AbortController();
  const fetch = async (u) => { if (u === "b") ac.abort(); return resp("x"); };
  const r = await O.warmCache(["a", "b", "c", "d"], { fetch, concurrency: 1, signal: ac.signal });
  assert.equal(r.aborted, true); assert.ok(r.ok >= 1 && r.ok < 4); assert.ok(r.failed.some((f) => f.reason === "cancelled"));
});

test("downloadEverything: fetches only what is missing (precache + extras), then reports a fresh state; force refetches all", async () => {
  const files = ["index.html", "src/app.js", "src/letters/a.js"];
  const map = { "alef-shell-v": { "index.html": "1", "src/app.js": "22" }, "alef-runtime-v1": {} };
  const caches = fakeCaches(map); const fetched = [];
  const fetch = async (u) => { fetched.push(u); if (u === "data/x.json") return resp("", { ok: false, status: 500 }); map["alef-runtime-v1"][u] = "zzz"; return resp("zzz"); };
  const r = await O.downloadEverything({ files, extraUrls: ["data/x.json", "data/y.json"], fetch, caches, sleep: noSleep });
  assert.deepEqual(fetched.filter((u) => u !== "data/x.json").sort(), ["data/y.json", "src/letters/a.js"]);
  assert.equal(r.requested, 3); assert.equal(r.skipped, 2); assert.equal(r.ok, 2); assert.equal(r.failed[0].url, "data/x.json");
  assert.equal(r.report.cached, 3); assert.equal(r.report.groups.find((g) => g.id === "letters").state, "ready");
  fetched.length = 0; await O.downloadEverything({ files, extraUrls: [], fetch, caches, force: true }); assert.equal(fetched.length, 3);
});

// ---------- storage health ----------
const fakeLS = (entries) => { const k = Object.keys(entries); return { length: k.length, key: (i) => k[i] ?? null, getItem: (x) => entries[x] ?? null }; };
test("localStorageUsage: counts the whole origin, separates alef: keys, levels at 70% and 90%, survives a throwing store", () => {
  const ls = fakeLS({ "alef:a": "x".repeat(100), other: "y".repeat(50) });
  const u = O.localStorageUsage(ls); assert.equal(u.usedChars, 6 + 100 + 5 + 50); assert.equal(u.alefChars, 106); assert.equal(u.level, "ok");
  assert.equal(O.localStorageUsage(fakeLS({ k: "x".repeat(0.7 * O.LOCAL_LIMIT_CHARS) })).level, "warn");
  assert.equal(O.localStorageUsage(fakeLS({ k: "x".repeat(0.9 * O.LOCAL_LIMIT_CHARS) })).level, "critical");
  assert.equal(O.localStorageUsage({ get length() { throw new Error("denied"); } }).supported, false);
});
test("storageHealth: quota near full warns and links the Settings backup; persist state; unknown storage is not an alarm", async () => {
  const nav = { storage: { estimate: async () => ({ usage: 60, quota: 100 }), persisted: async () => false, persist: async () => true } };
  const big = fakeLS({ "alef:progress": "x".repeat(0.8 * O.LOCAL_LIMIT_CHARS) });
  const h = await O.storageHealth({ navigator: nav, localStorage: big, hasRoute: (n) => n === "settings" });
  assert.equal(h.level, "warn"); assert.equal(h.exportRoute, "#/settings"); assert.ok(h.advice.some((a) => /backup/.test(a))); assert.ok(h.advice.some((a) => /not protected/.test(a)));
  assert.equal((await O.storageHealth({ navigator: nav, localStorage: big, hasRoute: () => false })).exportRoute, null);
  const calm = await O.storageHealth({ navigator: {}, localStorage: fakeLS({}) });
  assert.equal(calm.level, "ok"); assert.deepEqual(calm.advice, []); assert.equal(calm.persist.supported, false);
  const crit = await O.storageHealth({ navigator: { storage: { estimate: async () => ({ usage: 95, quota: 100 }) } }, localStorage: fakeLS({}) });
  assert.equal(crit.level, "critical");
});
test("protectProgress asks the browser (persist) and never throws", async () => {
  let asked = 0; const nav = { storage: { persisted: async () => false, persist: async () => { asked++; return true; } } };
  assert.equal((await O.protectProgress(nav)).granted, true); assert.equal(asked, 1);
  assert.equal((await O.protectProgress({})).supported, false);
});
test("fmtBytes", () => { assert.equal(O.fmtBytes(null), "unknown"); assert.equal(O.fmtBytes(512), "512 B"); assert.equal(O.fmtBytes(2048), "2 KB"); assert.equal(O.fmtBytes(5 * 1048576), "5.0 MB"); });

// ---------- update detection ----------
function fakeSW({ controller = {}, waiting = null } = {}) {
  const L = {}, regL = {};
  const reg = { waiting, installing: null, updates: 0, addEventListener: (t, f) => { (regL[t] ||= []).push(f); }, update: async () => { reg.updates++; } };
  const swc = { controller, getRegistration: async () => reg, addEventListener: (t, f) => { (L[t] ||= []).push(f); }, removeEventListener: (t, f) => { L[t] = (L[t] || []).filter((x) => x !== f); },
    fire: (t) => (L[t] || []).forEach((f) => f()), L };
  const worker = () => { const wl = {}; return { state: "installing", messages: [], postMessage(m) { this.messages.push(m); }, addEventListener: (t, f) => { (wl[t] ||= []).push(f); }, set(s) { this.state = s; (wl.statechange || []).forEach((f) => f()); } }; };
  const g = { navigator: { serviceWorker: swc }, location: { reloads: 0, reload() { this.reloads++; } } };
  return { g, swc, reg, worker, foundUpdate(w) { reg.installing = w; (regL.updatefound || []).forEach((f) => f()); } };
}
const tick = () => new Promise((r) => setTimeout(r, 0));
const noTimers = { checkEveryMs: 0 };

test("watchForUpdates: no service worker support is inert", async () => {
  const h = U.watchForUpdates({}, noTimers); assert.equal(h.supported, false); assert.equal(h.state(), "idle"); assert.equal(await h.check(), false); await h.apply(); h.stop();
});
test("watchForUpdates: an existing waiting worker is reported; apply posts SKIP_WAITING and reloads on controllerchange", async () => {
  const w = fakeSW().worker(); w.state = "installed";
  const f = fakeSW({ waiting: w }); const h = U.watchForUpdates(f.g, noTimers); await tick();
  assert.equal(h.state(), "waiting");
  const order = []; await h.apply({ beforeReload: [() => order.push("hook1"), () => { throw new Error("bad hook"); }, async () => order.push("hook3")] });
  assert.deepEqual(order, ["hook1", "hook3"]); assert.deepEqual(w.messages, [U.SKIP_WAITING_MESSAGE]); assert.equal(f.g.location.reloads, 0, "not before the new worker takes over");
  f.swc.fire("controllerchange"); assert.equal(f.g.location.reloads, 1); h.stop();
});
test("watchForUpdates: updatefound -> installed with a controller => waiting; subscribers are told once per change", async () => {
  const f = fakeSW(); const h = U.watchForUpdates(f.g, noTimers); await tick();
  const seen = []; h.onChange((s) => seen.push(s));
  const w = f.worker(); f.foundUpdate(w); w.set("installed"); w.set("installed");
  assert.deepEqual(seen, ["waiting"]); h.stop();
});
test("watchForUpdates: current sw.js skips waiting, so the page sees controllerchange => 'activated'; a first install is not an update", async () => {
  const f = fakeSW(); const h = U.watchForUpdates(f.g, noTimers); await tick();
  f.swc.fire("controllerchange"); assert.equal(h.state(), "activated");
  await h.apply(); assert.equal(f.g.location.reloads, 1); h.stop();
  const first = fakeSW({ controller: null }); const h2 = U.watchForUpdates(first.g, noTimers); await tick();
  first.swc.fire("controllerchange"); assert.equal(h2.state(), "idle", "first install claims the page: not an update");
  const w = first.worker(); first.foundUpdate(w); w.set("installed"); assert.equal(h2.state(), "idle", "no controller yet: nothing to update"); h2.stop();
});
test("watchForUpdates: a worker that ignores SKIP_WAITING ends as 'stalled' instead of hanging; check() calls registration.update", async () => {
  const w = fakeSW().worker(); w.state = "installed";
  const f = fakeSW({ waiting: w }); let fire; const h = U.watchForUpdates(f.g, { ...noTimers, setTimeout: (fn) => { fire = fn; return 1; }, clearTimeout() {} }); await tick();
  await h.apply(); fire(); assert.equal(h.state(), "stalled");
  await h.check(); assert.equal(f.reg.updates, 1); h.stop();
});
test("watchForUpdates: periodic check runs through the injected interval", async () => {
  const f = fakeSW(); let tickFn; const h = U.watchForUpdates(f.g, { checkEveryMs: 1000, setInterval: (fn) => { tickFn = fn; return 9; }, clearInterval() {} }); await tick();
  tickFn(); await tick(); assert.equal(f.reg.updates, 1); h.stop();
});

// ---------- banner + card with a fake DOM ----------
class El {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.className = ""; this.hidden = false; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === "id") this.id = v; }
  removeAttribute(k) { delete this.attrs[k]; }
  append(...c) { for (const x of c) this.children.push(x); }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  set textContent(v) { this.replaceChildren({ nodeType: 3, data: String(v) }); }
  get textContent() { return this.text; }
  remove() { this.removed = true; }
  focus() {}
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(""); }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  querySelector(sel) { return this.find((n) => n.attrs.id === sel.slice(1))[0] || null; }
  click() { return Promise.all((this.listeners.click || []).map((f) => f({ target: this }))); }
}
const fakeDoc = () => ({ createElement: (t) => new El(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }), getElementById: () => null, head: null, body: new El("body") });
globalThis.document = fakeDoc();
const flush = () => new Promise((r) => setTimeout(r, 0));
const waitFor = async (f) => { for (let i = 0; i < 300; i++) { const v = f(); if (v) return v; await flush(); } throw new Error("timed out waiting"); };
const byId = (root, id) => root.find((n) => n.attrs.id === id)[0];

test("banner: hidden until an update exists, shows message, Reload applies with hooks, Later hides, remove cleans up", async () => {
  const w = fakeSW().worker(); w.state = "installed";
  const f = fakeSW({ waiting: null }); const doc = fakeDoc();
  const h = U.watchForUpdates(f.g, noTimers); await tick();
  let flushed = 0; const remove = U.mountUpdateBanner(h, { document: doc, beforeReload: [() => flushed++] });
  const bar = byId(doc.body, "alef-update-banner"); assert.equal(bar.hidden, true); assert.equal(bar.attrs.role, "status");
  const wk = f.worker(); f.foundUpdate(wk); wk.set("installed");
  assert.equal(bar.hidden, false); assert.match(bar.text, /new version of ALEF is ready/); assert.match(bar.text, /progress is already saved/);
  await byId(doc.body, "alef-update-later").click(); assert.equal(bar.hidden, true);
  bar.hidden = false; await byId(doc.body, "alef-update-reload").click(); assert.equal(flushed, 1); assert.deepEqual(wk.messages, [U.SKIP_WAITING_MESSAGE]);
  remove(); assert.equal(bar.removed, true);
  assert.doesNotThrow(() => U.mountUpdateBanner({ supported: false }, { document: doc })());
  assert.equal(U.startUpdateBanner({ document: doc }).handle?.supported ?? false, false, "Node has no navigator.serviceWorker");
  h.stop();
});

const { mount } = await import("../src/shell/offline.view.js");
const FILES = ["index.html", "src/app.js", "src/letters/a.js", "src/photo/scan.view.js"];
const pm = `self.ALEF_VERSION = "v123";\nself.ALEF_PRECACHE = ${JSON.stringify(FILES)};\n`;
async function boot({ cached = { "index.html": "1", "src/app.js": "22" }, extra = {}, fetchImpl, navigator = {}, localStorage = fakeLS({ "alef:s": "x" }), update, hasRoute = (n) => n === "settings" } = {}) {
  const map = { "alef-shell-v123": { ...cached }, "alef-runtime-v1": {} };
  const fetched = [];
  const fetch = fetchImpl ?? (async (u) => { fetched.push(u); if (u === "precache-manifest.js") return resp(pm); map["alef-runtime-v1"][u] = "data"; return resp("data"); });
  const nav = { onLine: true, serviceWorker: { controller: {} }, storage: { estimate: async () => ({ usage: 1048576, quota: 1073741824 }), persisted: async () => false, persist: async () => true }, ...navigator };
  const root = new El("div");
  const ctx = { env: { fetch, caches: fakeCaches(map), navigator: nav, localStorage }, settings: { get: () => "israeli" }, hasRoute, update, ...extra };
  const unmount = mount(root, ctx);
  await waitFor(() => byId(root, "of-groups"));
  return { root, ctx, fetched, map, unmount };
}

test("card: lists groups with honest states, optional downloads, version, and storage lines", async () => {
  const { root, unmount } = await boot();
  const g = byId(root, "of-groups");
  assert.match(g.text, /App shell, settings and install ready offline \(2 of 2 files/);
  assert.match(g.text, /Scan a photo not saved yet \(0 of 1 files/); assert.match(g.text, /Needs an optional download/);
  assert.match(g.text, /Letters and tracing not saved yet \(0 of 1 files/);
  assert.match(g.text, /2 of 4 files are saved/); assert.match(g.text, /"Ready" means every file of that part is on this device\./); assert.match(g.text, /after it plays once while you are online/);
  assert.match(byId(root, "of-extras").text, /Word audio list \(israeli\): 1 of 1 not saved/);
  assert.match(byId(root, "of-sw").text, /switched on for this page/); assert.match(byId(root, "of-sw").text, /Version v123/);
  assert.match(byId(root, "of-usage").text, /1\.0 MB of about 1024\.0 MB/);
  assert.match(byId(root, "of-persist").text, /not protected/);
  unmount();
});
test("card: files the manifest lists as ALEF_ON_DEMAND appear under optional downloads and are fetched by Download everything", async () => {
  const od = ["data/vocab/index.json", "data/vocab/themes/a.json", "data/audio/manifest.json"];
  const pmOd = pm + `self.ALEF_ON_DEMAND = ${JSON.stringify(od)};\n`;
  const fetched = []; const map = { "alef-shell-v123": { "index.html": "1", "src/app.js": "22" }, "alef-runtime-v1": {} };
  const fetch = async (u) => { fetched.push(u); if (u === "precache-manifest.js") return resp(pmOd); map["alef-runtime-v1"][u] = "d"; return resp("d"); };
  const root = new El("div");
  const unmount = mount(root, { env: { fetch, caches: fakeCaches(map), navigator: { onLine: true, serviceWorker: { controller: {} } }, localStorage: fakeLS({}) }, settings: { get: () => "israeli" } });
  await waitFor(() => byId(root, "of-groups"));
  assert.match(byId(root, "of-extras").text, /Vocabulary data and theme packs: 2 of 2 not saved/); assert.match(byId(root, "of-extras").text, /Audio clip list \(core\): 1 of 1 not saved/);
  assert.match(byId(root, "of-groups").text, /2 of 4 files are saved/, "on-demand files do not count against the installed list");
  await byId(root, "of-download").click(); await waitFor(() => /Saved \d+ files/.test(byId(root, "of-status").text));
  for (const u of od) assert.ok(fetched.includes(u), u);
  await waitFor(() => /Vocabulary data and theme packs: saved/.test(byId(root, "of-extras").text));
  unmount();
});
test("card: uncontrolled page says to reload; browser without service workers says so; unreadable manifest is an alert and the button is disabled", async () => {
  const a = await boot({ navigator: { serviceWorker: { controller: null } } }); assert.match(byId(a.root, "of-sw").text, /not switched on for this page/); a.unmount();
  const b = await boot({ navigator: { serviceWorker: undefined } }); assert.match(byId(b.root, "of-sw").text, /cannot keep an offline copy/); b.unmount();
  const root = new El("div");
  const m = mount(root, { env: { fetch: async () => resp("", { ok: false, status: 500 }), caches: fakeCaches({}), navigator: {}, localStorage: fakeLS({}) } });
  await waitFor(() => byId(root, "of-error")); assert.match(byId(root, "of-error").text, /did not load/); assert.ok("disabled" in byId(root, "of-download").attrs); m();
});
test("card: Download everything fetches the missing files and extras only, then shows the new state", async () => {
  const { root, fetched, unmount } = await boot();
  await byId(root, "of-download").click();
  await waitFor(() => /Saved \d+ files/.test(byId(root, "of-status").text));
  const dl = fetched.filter((u) => u !== "precache-manifest.js");
  assert.ok(dl.includes("src/letters/a.js")); assert.ok(dl.includes("src/photo/scan.view.js")); assert.ok(!dl.includes("index.html")); assert.ok(dl.includes("data/audio/manifest-words-israeli.json")); assert.ok(dl.includes("assets/vendor/_tesseract/heb.traineddata"));
  await waitFor(() => /4 of 4 files are saved/.test(byId(root, "of-groups").text));
  assert.match(byId(root, "of-extras").text, /Word audio list \(israeli\): saved/);
  await byId(root, "of-download").click();
  await waitFor(() => /already saved/.test(byId(root, "of-status").text));
  unmount();
});
test("card: failures are listed with reasons; offline is explained", async () => {
  const fetchImpl = async (u) => { if (u === "precache-manifest.js") return resp(pm); if (u.endsWith("heb.traineddata")) return resp("", { ok: false, status: 404 }); return resp("d"); };
  const a = await boot({ fetchImpl });
  await byId(a.root, "of-download").click();
  await waitFor(() => byId(a.root, "of-failures"));
  assert.match(byId(a.root, "of-failures").text, /heb\.traineddata: HTTP 404/); assert.match(byId(a.root, "of-status").text, /failed\. You can try again/); a.unmount();
  const b = await boot({ navigator: { onLine: false } });
  await byId(b.root, "of-download").click();
  await waitFor(() => /You are offline/.test(byId(b.root, "of-status").text)); b.unmount();
});
test("card: near-quota Web Storage warns with a link to Settings; Protect my progress asks on click only", async () => {
  const big = fakeLS({ "alef:progress": "x".repeat(0.85 * O.LOCAL_LIMIT_CHARS) });
  const { root, unmount } = await boot({ localStorage: big });
  assert.match(byId(root, "of-storage").text, /Download a backup/); assert.equal(byId(root, "of-export").attrs.href, "#/settings");
  let asked = 0; // the button exists but nothing was requested on mount
  const nav = { storage: { estimate: async () => ({ usage: 1, quota: 100 }), persisted: async () => false, persist: async () => { asked++; return true; } } };
  const b = await boot({ navigator: nav }); assert.equal(asked, 0);
  await byId(b.root, "of-protect").click(); assert.equal(asked, 1); await waitFor(() => /now protected/.test(byId(b.root, "of-status").text));
  const c = await boot({ localStorage: big, hasRoute: () => false }); assert.equal(byId(c.root, "of-export"), undefined);
  unmount(); b.unmount(); c.unmount();
});
test("card: the Updates section follows the handle and its check button works; absent handle hides the section", async () => {
  const f = fakeSW(); const h = U.watchForUpdates(f.g, noTimers); await tick();
  const { root, unmount } = await boot({ update: h });
  assert.match(byId(root, "of-update-text").text, /latest version/);
  const w = f.worker(); f.foundUpdate(w); w.set("installed");
  await waitFor(() => /new version is ready/.test(byId(root, "of-update-text").text));
  await byId(root, "of-check").click(); assert.equal(f.reg.updates, 1);
  unmount(); h.stop();
  const none = await boot(); assert.equal(byId(none.root, "of-update"), undefined); none.unmount();
});
