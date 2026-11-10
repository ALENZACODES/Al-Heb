import test from "node:test";
import assert from "node:assert/strict";
import * as I from "../src/shell/install.js";

const IPHONE_SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0 Mobile/15E148 Safari/604.1";
const IPAD_DESKTOP = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";
const memStore = (init = {}) => { const m = { ...init }; return { get: (k) => m[k], set: (k, v) => { m[k] = v; }, m }; };
const fakeWin = (ua, extra = {}) => { const L = {}; return { navigator: { userAgent: ua, ...extra.navigator }, matchMedia: extra.matchMedia, addEventListener: (t, f) => { (L[t] ||= []).push(f); }, removeEventListener: (t, f) => { L[t] = (L[t] || []).filter((x) => x !== f); }, fire: (t, e = {}) => (L[t] || []).forEach((f) => f(e)), L }; };

test("detectPlatform: iPhone Safari, iPhone Chrome, iPad reporting Macintosh, Android, desktop, standalone", () => {
  assert.deepEqual(I.detectPlatform(fakeWin(IPHONE_SAFARI)), { ios: true, iosSafari: true, iosOtherBrowser: false, android: false, standalone: false });
  const c = I.detectPlatform(fakeWin(IPHONE_CHROME)); assert.equal(c.ios, true); assert.equal(c.iosSafari, false); assert.equal(c.iosOtherBrowser, true);
  assert.equal(I.detectPlatform(fakeWin(IPAD_DESKTOP, { navigator: { maxTouchPoints: 5 } })).iosSafari, true);
  assert.equal(I.detectPlatform(fakeWin(IPAD_DESKTOP, { navigator: { maxTouchPoints: 0 } })).ios, false, "a real Mac");
  assert.equal(I.detectPlatform(fakeWin(ANDROID)).android, true);
  assert.equal(I.detectPlatform(fakeWin(IPHONE_SAFARI, { navigator: { standalone: true } })).standalone, true);
  assert.equal(I.detectPlatform(fakeWin(ANDROID, { matchMedia: (q) => ({ matches: /standalone/.test(q) }) })).standalone, true);
  assert.equal(I.detectPlatform({}).ios, false); assert.equal(I.detectPlatform(undefined).standalone, false);
});

test("captureInstallPrompt: saves the event (preventDefault called), prompt() works once, appinstalled clears it", async () => {
  const w = fakeWin(ANDROID); const h = I.captureInstallPrompt(w);
  assert.equal(h.available(), false); assert.equal(await h.prompt(), "unavailable");
  let prevented = 0, prompted = 0, changes = 0; h.onChange(() => changes++);
  w.fire("beforeinstallprompt", { preventDefault: () => prevented++, prompt: () => prompted++, userChoice: Promise.resolve({ outcome: "accepted" }) });
  assert.equal(prevented, 1); assert.equal(h.available(), true); assert.equal(changes, 1);
  assert.equal(await h.prompt(), "accepted"); assert.equal(prompted, 1); assert.equal(h.available(), false);
  assert.equal(await h.prompt(), "unavailable", "single use");
  w.fire("beforeinstallprompt", { preventDefault() {}, prompt() {}, userChoice: Promise.resolve({ outcome: "dismissed" }) });
  assert.equal(await h.prompt(), "dismissed");
  w.fire("beforeinstallprompt", { preventDefault() {}, prompt() {}, userChoice: Promise.resolve({ outcome: "accepted" }) });
  w.fire("appinstalled"); assert.equal(h.installed(), true); assert.equal(h.available(), false);
  h.stop(); assert.equal(w.L.beforeinstallprompt.length, 0);
  assert.doesNotThrow(() => I.captureInstallPrompt({}).stop()); // no addEventListener
});

test("installStatus: modes and the 30-day dismissal", () => {
  const now = 1_800_000_000_000, st = I.normalizeState(null);
  const pf = (ua, extra) => I.detectPlatform(fakeWin(ua, extra));
  assert.deepEqual(I.installStatus({ platform: pf(ANDROID), canPrompt: true, state: st, now }), { mode: "prompt", show: true });
  assert.deepEqual(I.installStatus({ platform: pf(IPHONE_SAFARI), canPrompt: false, state: st, now }), { mode: "ios-safari", show: true });
  assert.deepEqual(I.installStatus({ platform: pf(IPHONE_CHROME), canPrompt: false, state: st, now }), { mode: "ios-other", show: true });
  assert.deepEqual(I.installStatus({ platform: pf("Mozilla/5.0 (X11; Linux) Firefox/125.0"), canPrompt: false, state: st, now }), { mode: "manual", show: true });
  assert.deepEqual(I.installStatus({ platform: pf(IPHONE_SAFARI, { navigator: { standalone: true } }), canPrompt: false, state: st, now }), { mode: "installed", show: false });
  assert.equal(I.installStatus({ platform: pf(ANDROID), canPrompt: true, state: { ...st, installedAt: 5 }, now }).mode, "installed");
  const d = { ...st, dismissedAt: now - 29 * 86400000 };
  assert.equal(I.installStatus({ platform: pf(ANDROID), canPrompt: true, state: d, now }).show, false);
  assert.equal(I.installStatus({ platform: pf(ANDROID), canPrompt: true, state: d, now, force: true }).show, true);
  assert.equal(I.installStatus({ platform: pf(ANDROID), canPrompt: true, state: { ...st, dismissedAt: now - 31 * 86400000 }, now }).show, true);
});

test("state: install.v1 round trip, dismissal counts, garbage is normalised, a throwing store does not throw", async () => {
  const s = memStore();
  assert.deepEqual(await I.loadState(s), { v: 1, dismissedAt: null, dismissCount: 0, installedAt: null });
  await I.dismiss(s, 1000); await I.dismiss(s, 2000);
  assert.deepEqual(s.m["install.v1"], { v: 1, dismissedAt: 2000, dismissCount: 2, installedAt: null });
  await I.markInstalled(s, 3000); assert.equal((await I.loadState(s)).installedAt, 3000);
  await I.resetState(s); assert.equal((await I.loadState(s)).dismissCount, 0);
  assert.deepEqual(I.normalizeState({ dismissedAt: "x", dismissCount: -1, installedAt: NaN, junk: 1 }), { v: 1, dismissedAt: null, dismissCount: 0, installedAt: null });
  const bad = { get: () => { throw new Error("x"); }, set: () => { throw new Error("y"); } };
  assert.equal((await I.loadState(bad)).dismissCount, 0); await assert.doesNotReject(I.dismiss(bad));
});

// ---------- card with a fake DOM ----------
class El {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.className = ""; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  append(...c) { this.children.push(...c); }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  focus() {}
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(""); }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  click() { return Promise.all((this.listeners.click || []).map((f) => f({ target: this }))); }
}
globalThis.document = { createElement: (t) => new El(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }), getElementById: () => null, head: null };
const flush = () => new Promise((r) => setTimeout(r, 0));
const waitFor = async (f) => { for (let i = 0; i < 200; i++) { const v = f(); if (v) return v; await flush(); } throw new Error("timed out waiting"); };
const byId = (root, id) => root.find((n) => n.attrs.id === id)[0];
const { mount } = await import("../src/shell/install.view.js");

async function boot(ua, { storeInit, installPrompt, extra } = {}) {
  const root = new El("div"), store = memStore(storeInit), win = fakeWin(ua, extra);
  const unmount = mount(root, { store, installPrompt, platformGlobal: win, now: () => 1_800_000_000_000, t: (k) => k });
  await waitFor(() => byId(root, "in-card") || byId(root, "in-installed") || byId(root, "in-showagain"));
  return { root, store, win, unmount };
}

test("card: iPhone Safari shows the four Share steps and no install button", async () => {
  const { root, unmount } = await boot(IPHONE_SAFARI);
  assert.equal(byId(root, "in-ios-steps").children.length, 4);
  assert.match(byId(root, "in-ios-steps").text, /Add to Home Screen/);
  assert.equal(byId(root, "in-install"), undefined);
  unmount();
});
test("card: iPhone Chrome gets the caveat; Linux Firefox gets the manual line", async () => {
  const a = await boot(IPHONE_CHROME); assert.match(byId(a.root, "in-ios-other").text, /other than Safari/); a.unmount();
  const b = await boot("Mozilla/5.0 (X11; Linux) Firefox/125.0"); assert.match(byId(b.root, "in-manual").text, /Install app/); b.unmount();
});
test("card: native prompt from app.js ctx.installPrompt; accept stores installedAt; cancel does not", async () => {
  let n = 0; const ip = { available: () => n < 2, prompt: async () => { n++; } };
  const a = await boot(ANDROID, { installPrompt: ip });
  assert.ok(byId(a.root, "in-install"));
  await byId(a.root, "in-install").click(); // our fake prompt() returns undefined => cancelled branch
  assert.equal(n, 1); assert.equal(a.store.m["install.v1"], undefined);
  a.unmount();
  // own capture: event fires after mount
  const root = new El("div"), store = memStore(), win = fakeWin(ANDROID);
  mount(root, { store, platformGlobal: win, now: () => 1_800_000_000_000 });
  await waitFor(() => byId(root, "in-manual"));
  win.fire("beforeinstallprompt", { preventDefault() {}, prompt() {}, userChoice: Promise.resolve({ outcome: "accepted" }) });
  await waitFor(() => byId(root, "in-install"));
  await byId(root, "in-install").click();
  await waitFor(() => store.m["install.v1"]?.installedAt === 1_800_000_000_000);
  await waitFor(() => byId(root, "in-installed"));
});
test("card: Not now stores dismissal and hides the card; Show again brings it back; stored dismissal hides on load; standalone says installed", async () => {
  const a = await boot(IPHONE_SAFARI);
  await byId(a.root, "in-dismiss").click();
  await waitFor(() => byId(a.root, "in-showagain"));
  assert.equal(a.store.m["install.v1"].dismissCount, 1); assert.equal(a.store.m["install.v1"].dismissedAt, 1_800_000_000_000);
  await byId(a.root, "in-showagain").click();
  await waitFor(() => byId(a.root, "in-card")); a.unmount();
  const b = await boot(IPHONE_SAFARI, { storeInit: { "install.v1": { v: 1, dismissedAt: 1_800_000_000_000 - 86400000, dismissCount: 1, installedAt: null } } });
  assert.ok(byId(b.root, "in-showagain")); assert.equal(byId(b.root, "in-card"), undefined); b.unmount();
  const c = await boot(IPHONE_SAFARI, { extra: { navigator: { standalone: true } } });
  assert.ok(byId(c.root, "in-installed")); c.unmount();
});

test("boot-hooks: armReminders never throws, does nothing when disabled, arms when enabled and granted", async () => {
  const { armReminders } = await import("../src/shell/boot-hooks.js");
  const N = await import("../src/shell/notify.js");
  assert.equal((await armReminders({ store: { get: () => ({ enabled: false }) } })).reason, "disabled");
  assert.equal((await armReminders(undefined)).ok, false);
  assert.equal((await armReminders({ store: { get: () => { throw new Error("x"); } } })).ok, false);
  assert.equal(N.status().scheduled, 0);
  // enabled but Notification is undefined in Node => safe no-op with a reason
  const r = await armReminders({ store: { get: () => ({ enabled: true, hour: 9, minute: 0, days: [1] }) } });
  assert.equal(r.ok, false); assert.equal(r.reason, "unsupported");
});
