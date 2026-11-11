import test from "node:test";
import assert from "node:assert/strict";
import * as N from "../src/shell/notify.js";
import * as C from "../src/curriculum/calendar.js";

// ---------- helpers ----------
const fakeNotification = (permission = "granted", opt = {}) => {
  const made = [];
  function Fake(title, options) { made.push({ title, options }); }
  Fake.permission = permission;
  Fake.requestPermission = opt.requestPermission ?? (async () => { Fake.permission = opt.answer ?? "granted"; return Fake.permission; });
  Fake.made = made;
  return Fake;
};
/** Fake timers: fns run when `advanceTo(ms)` passes their due time. */
function fakeTimers(start) {
  const t = { now: start, q: [], seq: 0 };
  t.setTimer = (fn, delay) => { const id = ++t.seq; t.q.push({ id, due: t.now + delay, fn }); return id; };
  t.clearTimer = (id) => { t.q = t.q.filter((x) => x.id !== id); };
  t.nowFn = () => new Date(t.now);
  t.advanceTo = (ms) => { // run due timers in order, letting rescheduled ones run too
    for (;;) { const next = t.q.filter((x) => x.due <= ms).sort((a, b) => a.due - b.due)[0]; if (!next) break; t.now = next.due; t.q = t.q.filter((x) => x !== next); next.fn(); }
    t.now = ms;
  };
  return t;
}
const local = (y, m, d, hh = 0, mm = 0) => new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
const toronto = { lat: 43.65, lon: -79.38, tz: "America/Toronto", candleMinutes: 18, name: "Toronto" };

test.afterEach(() => N.cancelAll());

// ---------- Stage 1: environment guards ----------
test("status(): no Notification in Node => unsupported, nothing scheduled, never throws", () => {
  const s = N.status();
  assert.equal(s.supported, false); assert.equal(s.permission, "unsupported"); assert.equal(s.push, false); assert.equal(s.scheduled, 0); assert.equal(s.next, null);
  assert.deepEqual(N.status(undefined).supported, false);
  assert.deepEqual(N.status({}).permission, "unsupported");
});
test("status(): reads permission, service worker, push, standalone and iOS from the global", () => {
  const g = { Notification: fakeNotification("denied"), navigator: { serviceWorker: {}, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", standalone: true }, PushManager: function () {} };
  const s = N.status(g);
  assert.equal(s.supported, true); assert.equal(s.permission, "denied"); assert.equal(s.serviceWorker, true); assert.equal(s.push, true); assert.equal(s.standalone, true); assert.equal(s.ios, true);
  const mac = N.status({ navigator: { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", maxTouchPoints: 5 } });
  assert.equal(mac.ios, true, "iPadOS reports itself as Macintosh with touch points");
});
test("requestPermission(): unsupported without Notification; otherwise returns what the browser says; never throws", async () => {
  assert.equal(await N.requestPermission({}), "unsupported");
  assert.equal(await N.requestPermission({ Notification: { permission: "default" } }), "unsupported");
  assert.equal(await N.requestPermission({ Notification: fakeNotification("default", { answer: "granted" }) }), "granted");
  assert.equal(await N.requestPermission({ Notification: fakeNotification("default", { answer: "denied" }) }), "denied");
  const thrower = fakeNotification("default", { requestPermission: () => { throw new Error("boom"); } });
  assert.equal(await N.requestPermission({ Notification: thrower }), "default");
  const legacy = fakeNotification("default", { requestPermission: () => undefined }); // old Safari callback style returns undefined
  assert.equal(await N.requestPermission({ Notification: legacy }), "default");
});

test("normalizePrefs: defaults, clamping, de-duplicated sorted days, unknown keys dropped", () => {
  const d = N.normalizePrefs(null);
  assert.deepEqual(d, { v: 1, enabled: false, hour: 19, minute: 0, days: [0, 1, 2, 3, 4], shabbatQuiet: true, yomTovQuiet: true, quietFrom: 22, quietTo: 7, perWeek: 5 });
  const p = N.normalizePrefs({ enabled: true, hour: 25, minute: 7, days: [6, 6, 2, 9, -1, "x"], shabbatQuiet: false, junk: 1 });
  assert.deepEqual(p, { v: 1, enabled: true, hour: 19, minute: 7, days: [2, 6], shabbatQuiet: false, yomTovQuiet: true, quietFrom: 22, quietTo: 7, perWeek: 5 });
  assert.deepEqual(N.normalizePrefs({ days: [] }).days, []);
  assert.equal(N.normalizePrefs("nonsense").enabled, false);
});

// ---------- Stage 1: scheduling ----------
test("nextOccurrence: next matching weekday at hh:mm, strictly after now, honours a quiet predicate", () => {
  const wed = new Date(2026, 10, 4, 20, 0); // Wednesday 2026-11-04 20:00 local
  assert.equal(N.nextOccurrence({ hour: 19, minute: 0, days: [3] }, wed).getTime(), local(2026, 11, 11, 19, 0), "same weekday, time passed => next week");
  assert.equal(N.nextOccurrence({ hour: 21, minute: 30, days: [3] }, wed).getTime(), local(2026, 11, 4, 21, 30), "later today");
  assert.equal(N.nextOccurrence({ hour: 20, minute: 0, days: [3] }, wed).getTime(), local(2026, 11, 11, 20, 0), "exactly now does not count");
  assert.equal(N.nextOccurrence({ hour: 7, minute: 0, days: [0, 1, 2, 3, 4, 5, 6] }, wed).getTime(), local(2026, 11, 5, 7, 0));
  assert.equal(N.nextOccurrence({ hour: 7, minute: 0, days: [] }, wed), null);
  const skipThu = (d) => d.getDay() === 4;
  assert.equal(N.nextOccurrence({ hour: 7, minute: 0, days: [4, 5] }, wed, { quiet: skipThu }).getTime(), local(2026, 11, 6, 7, 0));
  assert.equal(N.nextOccurrence({ hour: 7, minute: 0, days: [4] }, wed, { quiet: skipThu }), null, "everything quiet => null");
});

test("scheduleStudyReminder: no-ops without Notification, without permission, or with no days", () => {
  assert.equal(N.scheduleStudyReminder({ hour: 9, minute: 0, days: [1] }).ok, false);
  assert.equal(N.scheduleStudyReminder({ hour: 9, minute: 0, days: [1] }, { globalThis: {} }).reason, "unsupported");
  const g = { Notification: fakeNotification("default"), setTimeout, clearTimeout };
  assert.match(N.scheduleStudyReminder({ hour: 9, minute: 0, days: [1] }, { globalThis: g }).reason, /permission default/);
  g.Notification.permission = "granted";
  assert.equal(N.scheduleStudyReminder({ hour: 9, minute: 0, days: [] }, { globalThis: g }).reason, "no days chosen");
  assert.equal(N.status().scheduled, 0);
});

test("scheduleStudyReminder: fires at the chosen time via the injected show(), then re-arms for the next day", () => {
  const t = fakeTimers(local(2026, 11, 4, 8, 0)); // Wed 08:00
  const g = { Notification: fakeNotification("granted") };
  const shown = [], fired = [];
  const r = N.scheduleStudyReminder({ hour: 9, minute: 0, days: [3, 4] }, { globalThis: g, now: t.nowFn, setTimer: t.setTimer, clearTimer: t.clearTimer, show: (title, body, o) => { shown.push({ title, body, o }); return { ok: true }; }, onFire: (d) => fired.push(d.getTime()) });
  assert.equal(r.ok, true);
  assert.equal(r.next.getTime(), local(2026, 11, 4, 9, 0));
  assert.equal(N.status().scheduled, 1);
  assert.equal(N.status().next.getTime(), local(2026, 11, 4, 9, 0));
  t.advanceTo(local(2026, 11, 4, 8, 59));
  assert.equal(shown.length, 0);
  t.advanceTo(local(2026, 11, 4, 9, 0));
  assert.equal(shown.length, 1);
  assert.equal(shown[0].title, "Aleph: a few minutes of Hebrew");
  assert.equal(shown[0].o.route, "#/learn");
  assert.deepEqual(fired, [local(2026, 11, 4, 9, 0)]);
  assert.equal(N.status().next.getTime(), local(2026, 11, 5, 9, 0), "re-armed for Thursday");
  t.advanceTo(local(2026, 11, 5, 9, 0));
  assert.equal(shown.length, 2);
  assert.equal(N.status().next.getTime(), local(2026, 11, 11, 9, 0), "then next Wednesday");
  r.cancel();
  assert.equal(N.status().scheduled, 0);
  assert.equal(t.q.length, 0, "timer cleared");
});

test("scheduleStudyReminder: a long wait is split into <= MAX_TIMER_MS hops and still fires once, on time", () => {
  const t = fakeTimers(local(2026, 11, 4, 8, 0));
  const g = { Notification: fakeNotification("granted") };
  let shown = 0;
  N.scheduleStudyReminder({ hour: 9, minute: 0, days: [3] }, { globalThis: g, now: t.nowFn, setTimer: t.setTimer, clearTimer: t.clearTimer, show: () => { shown++; return { ok: true }; } });
  t.advanceTo(local(2026, 11, 4, 9, 0)); shown = 0; // consume today's
  assert.ok(t.q[0].due - t.now <= N.MAX_TIMER_MS);
  t.advanceTo(local(2026, 11, 11, 8, 59));
  assert.equal(shown, 0);
  t.advanceTo(local(2026, 11, 11, 9, 0));
  assert.equal(shown, 1);
});

test("scheduleStudyReminder: a missed time (tab frozen, timer ran late) is skipped, never fired late", () => {
  const t = fakeTimers(local(2026, 11, 4, 8, 0));
  const g = { Notification: fakeNotification("granted") };
  let shown = 0;
  N.scheduleStudyReminder({ hour: 9, minute: 0, days: [3] }, { globalThis: g, now: t.nowFn, setTimer: t.setTimer, clearTimer: t.clearTimer, show: () => { shown++; return { ok: true }; } });
  // simulate the browser delivering the 09:00 timer at 09:30 (frozen tab)
  const due = t.q[0]; t.q = []; t.now = local(2026, 11, 4, 9, 30); due.fn();
  assert.equal(shown, 0);
  assert.equal(N.status().next.getTime(), local(2026, 11, 11, 9, 0));
  // within the grace window it still fires
  const due2 = t.q[0]; t.q = []; t.now = local(2026, 11, 11, 9, 5); due2.fn();
  assert.equal(shown, 1);
});

test("cancelAll(): clears every schedule; safe to call with nothing scheduled", () => {
  N.cancelAll();
  const t = fakeTimers(local(2026, 11, 4, 8, 0));
  const g = { Notification: fakeNotification("granted") };
  N.scheduleStudyReminder({ hour: 9, minute: 0, days: [3] }, { globalThis: g, now: t.nowFn, setTimer: t.setTimer, clearTimer: t.clearTimer });
  N.scheduleStudyReminder({ hour: 10, minute: 0, days: [3] }, { globalThis: g, now: t.nowFn, setTimer: t.setTimer, clearTimer: t.clearTimer });
  assert.equal(N.status().scheduled, 2);
  N.cancelAll();
  assert.equal(N.status().scheduled, 0); assert.equal(t.q.length, 0); assert.equal(N.nextFireTime(), null);
});

test("showNow(): prefers the service-worker registration, falls back to the constructor, no-op without permission", async () => {
  assert.deepEqual(await N.showNow("x", "y", { globalThis: {} }), { ok: false, via: null, reason: "unsupported" });
  const denied = fakeNotification("denied");
  assert.match((await N.showNow("x", "y", { globalThis: { Notification: denied } })).reason, /permission denied/);
  assert.equal(denied.made.length, 0);
  const sw = []; const swc = { getRegistration: async () => ({ showNotification: async (t, o) => { sw.push({ t, o }); } }) };
  const F = fakeNotification("granted");
  const r1 = await N.showNow("Title", "Body", { globalThis: { Notification: F, navigator: { serviceWorker: swc } } });
  assert.deepEqual(r1, { ok: true, via: "sw" }); assert.equal(sw[0].t, "Title"); assert.equal(sw[0].o.body, "Body"); assert.equal(sw[0].o.tag, N.NOTIFICATION_TAG); assert.equal(F.made.length, 0);
  const r2 = await N.showNow("Title", "Body", { globalThis: { Notification: F, navigator: { serviceWorker: { getRegistration: async () => null } } }, tag: "alef-test" });
  assert.deepEqual(r2, { ok: true, via: "page" }); assert.equal(F.made[0].options.tag, "alef-test");
  function Illegal() { throw new TypeError("Illegal constructor"); } Illegal.permission = "granted";
  const r3 = await N.showNow("T", "B", { globalThis: { Notification: Illegal } });
  assert.equal(r3.ok, false); assert.match(r3.reason, /Illegal constructor/);
});

// ---------- Stage 3: Shabbat quiet hours ----------
test("shabbatWindow: Toronto 2026-11-06 = candles 16:43, havdalah 17:45 (the calendar lane's Hebcal-checked values)", () => {
  const w = N.shabbatWindow({ y: 2026, m: 11, d: 6 }, toronto);
  assert.deepEqual(w.friday, { y: 2026, m: 11, d: 6 });
  assert.equal(C.formatTime(C.floorToMinute(w.start), "America/Toronto"), "16:43");
  assert.equal(C.formatTime(C.roundToMinute(w.end), "America/Toronto"), "17:45");
  assert.deepEqual(N.shabbatWindow({ y: 2026, m: 11, d: 7 }, toronto).friday, { y: 2026, m: 11, d: 6 }, "a Saturday maps back to its Friday");
  assert.deepEqual(N.shabbatWindow({ y: 2026, m: 11, d: 4 }, toronto).friday, { y: 2026, m: 11, d: 6 }, "a weekday maps forward");
  // offsets are the learner's: Jerusalem-style 40 minutes and 'minutes after sunset' havdalah
  const w40 = N.shabbatWindow({ y: 2026, m: 11, d: 6 }, { ...toronto, candleMinutes: 40, havdalah: { mode: "minutes", minutes: 50 } });
  assert.equal(Math.round((w.start - w40.start) / 60000), 22);
  assert.equal(Math.round((w40.end - C.sunset({ y: 2026, m: 11, d: 7 }, toronto.lat, toronto.lon)) / 60000), 50, "50 minutes after SATURDAY sunset");
});

test("isShabbat: Friday before candles = no, during = yes, Saturday after havdalah = no, Sunday = no, no location = no", () => {
  const at = (iso) => new Date(iso);
  assert.equal(N.isShabbat(at("2026-11-06T21:30:00Z"), toronto), false); // Fri 16:30 Toronto
  assert.equal(N.isShabbat(at("2026-11-06T21:44:00Z"), toronto), true);  // Fri 16:44
  assert.equal(N.isShabbat(at("2026-11-07T15:00:00Z"), toronto), true);  // Sat 10:00
  assert.equal(N.isShabbat(at("2026-11-07T22:44:00Z"), toronto), true);  // Sat 17:44
  assert.equal(N.isShabbat(at("2026-11-07T22:46:00Z"), toronto), false); // Sat 17:46
  assert.equal(N.isShabbat(at("2026-11-08T15:00:00Z"), toronto), false); // Sunday
  assert.equal(N.isShabbat(at("2026-11-07T15:00:00Z"), null), false);
  assert.equal(N.isShabbat(at("2026-11-07T15:00:00Z"), { lat: NaN, lon: 1 }), false);
  // the zone matters: Jerusalem Friday 16:30 local (14:30Z) is after Jerusalem candle lighting (about 16:05 in November)
  const jlm = { lat: 31.78, lon: 35.22, tz: "Asia/Jerusalem", candleMinutes: 40 };
  assert.equal(N.isShabbat(at("2026-11-06T14:30:00Z"), jlm), true);
  assert.equal(N.isShabbat(at("2026-11-06T13:30:00Z"), jlm), false);
});

test("isShabbat: polar fallback (no computable sunset) = Friday from 15:00 local and all Saturday", () => {
  const tromso = { lat: 69.65, lon: 18.96, tz: "Europe/Oslo", candleMinutes: 18 }; // polar night in December
  assert.equal(N.shabbatWindow({ y: 2026, m: 12, d: 18 }, tromso), null);
  assert.equal(N.isShabbat(new Date("2026-12-18T13:00:00Z"), tromso), false); // Fri 14:00 local
  assert.equal(N.isShabbat(new Date("2026-12-18T14:30:00Z"), tromso), true);  // Fri 15:30 local
  assert.equal(N.isShabbat(new Date("2026-12-19T12:00:00Z"), tromso), true);  // Saturday
  assert.equal(N.isShabbat(new Date("2026-12-20T12:00:00Z"), tromso), false); // Sunday
});

test("scheduling with shabbatQuiet skips a Friday-evening / Saturday slot and lands on the next allowed day", () => {
  const t = fakeTimers(local(2026, 11, 6, 8, 0)); // Friday 2026-11-06 08:00 (device zone)
  const g = { Notification: fakeNotification("granted") };
  // a 19:00 reminder every day: Friday 19:00 and Saturday 19:00 are evaluated against Toronto's window in UTC terms,
  // so build the predicate from a fixed-offset check instead of the device zone to keep the test zone-independent
  const quiet = (d) => N.isShabbat(d, toronto);
  const fri1900 = new Date(2026, 10, 6, 19, 0);
  const expectQuiet = quiet(fri1900);
  const r = N.scheduleStudyReminder({ hour: 19, minute: 0, days: [0, 1, 2, 3, 4, 5, 6] }, { globalThis: g, now: t.nowFn, setTimer: t.setTimer, clearTimer: t.clearTimer, quiet });
  if (expectQuiet) assert.notEqual(r.next.getTime(), fri1900.getTime(), "Friday 19:00 skipped");
  assert.equal(quiet(r.next), false, "the chosen slot is never inside Shabbat");
  assert.ok(r.next.getTime() > t.now);
});

test("resolveQuietLocation: calendar prefs preset, shell settings fallback, nothing => null", async () => {
  const store = (m) => ({ get: (k) => m[k] });
  const a = await N.resolveQuietLocation({ store: store({ "calendar.prefs": { locationId: "toronto" } }) });
  assert.match(a.name, /^Toronto/); assert.equal(a.candleMinutes, 18); assert.equal(a.tz, "America/Toronto"); assert.equal(a.havdalah.mode, "tzeit");
  const b = await N.resolveQuietLocation({ store: store({}), settings: { get: (k) => ({ lat: 31.78, lon: 35.22 })[k] } });
  assert.equal(b.lat, 31.78); assert.equal(b.name, "Location from Settings");
  assert.equal(await N.resolveQuietLocation({ store: store({}), settings: { get: () => null } }), null);
  assert.equal(await N.resolveQuietLocation(null), null);
});

test("armFromPrefs: disabled => nothing; enabled + granted => one schedule with Shabbat quiet from the calendar city", async () => {
  const mem = { "notify.prefs": { enabled: false } };
  const ctx = { store: { get: (k) => mem[k] } };
  assert.equal((await N.armFromPrefs(ctx)).reason, "disabled");
  assert.equal(N.status().scheduled, 0);
  mem["notify.prefs"] = { enabled: true, hour: 12, minute: 0, days: [5, 6, 0], shabbatQuiet: true };
  mem["calendar.prefs"] = { locationId: "toronto" };
  const t = fakeTimers(local(2026, 11, 6, 8, 0)); // Friday 08:00
  const g = { Notification: fakeNotification("granted") };
  const r = await N.armFromPrefs(ctx, { globalThis: g, now: t.nowFn, setTimer: t.setTimer, clearTimer: t.clearTimer });
  assert.equal(r.ok, true); assert.equal(N.status().scheduled, 1);
  // Friday 12:00 is before candle lighting everywhere Toronto-like, so it is allowed; Saturday 12:00 must be skipped after that
  assert.equal(r.next.getTime(), local(2026, 11, 6, 12, 0));
  t.advanceTo(local(2026, 11, 6, 12, 0));
  assert.notEqual(N.status().next.getTime(), local(2026, 11, 7, 12, 0), "Saturday noon is Shabbat");
  assert.equal(N.isShabbat(N.status().next, await N.resolveQuietLocation(ctx)), false);
  // re-arming replaces rather than stacks
  await N.armFromPrefs(ctx, { globalThis: g, now: t.nowFn, setTimer: t.setTimer, clearTimer: t.clearTimer });
  assert.equal(N.status().scheduled, 1);
  assert.equal((await N.armFromPrefs({ store: { get: () => { throw new Error("x"); } } })).ok, false, "store error => no throw");
});

// ---------- Web Push placeholder ----------
test("subscribePush: refuses without a VAPID key, and the placeholder key is empty", async () => {
  assert.equal(N.VAPID_PUBLIC_KEY, "");
  assert.deepEqual(await N.subscribePush({}), { ok: false, reason: "no VAPID key" });
  assert.deepEqual(await N.subscribePush({}, "BAAA"), { ok: false, reason: "push unsupported" });
  const reg = { pushManager: { subscribe: async (o) => ({ toJSON: () => ({ endpoint: "e", key: o.applicationServerKey.length }) }) } };
  const g = { PushManager: function () {}, navigator: { serviceWorker: { ready: Promise.resolve(reg) } }, Notification: fakeNotification("granted") };
  const key = "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM"; // a well-formed 65-byte P-256 point from the web-push README, not ours
  const r = await N.subscribePush(g, key);
  assert.equal(r.ok, true); assert.equal(r.subscription.key, 65);
  assert.equal(N.urlBase64ToUint8Array(key).length, 65);
});

// ---------- Stage 2: the settings card, with a minimal fake DOM ----------
class El {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.className = ""; this.value = ""; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === "value") this.value = String(v); }
  removeAttribute(k) { delete this.attrs[k]; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { if (x && x.nodeType === 1) x.parent = this; this.children.push(x); } }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  set textContent(v) { this.replaceChildren(document.createTextNode(v)); }
  get textContent() { return this.text; }
  focus() {}
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(""); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  querySelector(sel) { return this.find((n) => n.attrs.id === sel.slice(1))[0] || null; }
  get checked() { return "checked" in this.attrs; }
  set checked(v) { if (v) this.attrs.checked = ""; else delete this.attrs.checked; }
  fire(type, ev = {}) { for (const f of this.listeners[type] || []) f({ target: this, preventDefault() {}, ...ev }); }
}
globalThis.document = { createElement: (t) => new El(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }), getElementById: () => null, head: null };
const flush = () => new Promise((r) => setTimeout(r, 0));
const waitFor = async (f) => { for (let i = 0; i < 200; i++) { const v = f(); if (v) return v; await flush(); } throw new Error("timed out waiting"); };
const byId = (root, id) => root.find((n) => n.attrs.id === id)[0];
const statusText = (root) => root.find((n) => n.attrs.role === "status")[0].text;
const { mount } = await import("../src/shell/notify.view.js");

/** A notify module surface bound to a fake global, so the view's calls hit the fake browser. */
function fakeNotify(g, t) {
  return { ...N,
    status: () => N.status(g),
    requestPermission: () => N.requestPermission(g),
    showNow: (title, body, o) => N.showNow(title, body, { ...o, globalThis: g }),
    armFromPrefs: (ctx, o) => N.armFromPrefs(ctx, { ...o, globalThis: g, now: t.nowFn, setTimer: t.setTimer, clearTimer: t.clearTimer }),
  };
}
async function boot(storeInit = {}, g = {}) {
  const t = fakeTimers(local(2026, 11, 4, 8, 0));
  const mem = { ...storeInit };
  const ctx = { store: { get: (k) => mem[k], set: (k, v) => { mem[k] = v; } }, settings: { get: () => null }, notify: fakeNotify(g, t), now: t.nowFn, t: (k) => k };
  const root = new El("div");
  const unmount = mount(root, ctx);
  await waitFor(() => byId(root, "nt-time"));
  return { root, mem, ctx, t, g, unmount };
}

test("card: unsupported browser => explains, controls disabled, nothing scheduled; iOS tab says install first", async () => {
  const { root, unmount } = await boot();
  assert.match(byId(root, "nt-support").text, /does not support notifications/);
  assert.ok("disabled" in byId(root, "nt-allow").attrs); assert.ok("disabled" in byId(root, "nt-test").attrs); assert.ok("disabled" in byId(root, "nt-enabled").attrs);
  assert.equal(N.status().scheduled, 0);
  unmount();
  const ios = await boot({}, { navigator: { userAgent: "iPhone", standalone: false } });
  assert.match(byId(ios.root, "nt-support").text, /Add to Home Screen/);
  ios.unmount();
});

test("card: Allow button requests permission on click only, then enables and schedules; time/day edits persist and re-arm", async () => {
  let asked = 0;
  const F = fakeNotification("default", { requestPermission: async () => { asked++; F.permission = "granted"; return "granted"; } });
  const { root, mem, t, unmount } = await boot({}, { Notification: F });
  assert.equal(asked, 0, "mounting never asks");
  assert.equal(byId(root, "nt-allow").attrs.disabled, undefined);
  byId(root, "nt-allow").fire("click");
  await waitFor(() => mem["notify.prefs"]?.enabled === true);
  assert.equal(asked, 1);
  await waitFor(() => /Next reminder/.test(byId(root, "nt-next").text));
  assert.equal(N.status().scheduled, 1);
  assert.equal(N.status().next.getTime(), local(2026, 11, 4, 19, 0), "default 19:00 today (Wednesday is a default day)");
  // change the time
  const time = byId(root, "nt-time"); time.value = "07:15"; time.fire("change");
  await waitFor(() => mem["notify.prefs"].hour === 7 && mem["notify.prefs"].minute === 15);
  await waitFor(() => N.status().next?.getTime() === local(2026, 11, 5, 7, 15));
  // untick Thursday => Sunday is next (Saturday is not in the default days)
  const thu = byId(root, "nt-day-4"); thu.checked = false; thu.fire("change");
  await waitFor(() => !mem["notify.prefs"].days.includes(4));
  await waitFor(() => N.status().next?.getTime() === local(2026, 11, 8, 7, 15));
  assert.match(byId(root, "nt-quiet-note").text, /No city is set/);
  // invalid time is flagged and ignored
  time.value = "late"; time.fire("change"); assert.equal(time.attrs["aria-invalid"], "true"); assert.equal(mem["notify.prefs"].hour, 7);
  // leaving the card keeps the schedule running
  unmount();
  assert.equal(N.status().scheduled, 1);
  t.advanceTo(local(2026, 11, 8, 7, 15));
  await waitFor(() => F.made.length === 1); // Rimon's line is picked at fire time (async: reads progress and the send log)
  assert.equal(F.made.length, 1, "fired via the page constructor (no service worker in the fake)");
  const R = await import("../src/shell/rimon-reminders.js");
  assert.ok(R.LINES.some((l) => l.title === F.made[0].title), `a Rimon line: ${F.made[0].title}`);
});

test("card: test-notification button shows one immediately; denied permission is explained", async () => {
  const F = fakeNotification("granted");
  const { root, unmount } = await boot({ "notify.prefs": { enabled: true, hour: 9, minute: 0, days: [1] } }, { Notification: F });
  byId(root, "nt-test").fire("click");
  await waitFor(() => F.made.length === 1);
  const R = await import("../src/shell/rimon-reminders.js");
  assert.ok(R.LINES.some((l) => l.title === F.made[0].title), "the test shows one of Rimon's lines"); assert.equal(F.made[0].options.tag, "alef-test");
  assert.match(statusText(root), /Test notification sent/);
  unmount();
  const d = await boot({}, { Notification: fakeNotification("denied") });
  assert.match(byId(d.root, "nt-support").text, /blocked/);
  assert.ok("disabled" in byId(d.root, "nt-allow").attrs);
  d.unmount();
});

test("card: with a calendar city the quiet note names it and the offsets; the Shabbat toggle persists", async () => {
  const F = fakeNotification("granted");
  const { root, mem, unmount } = await boot({ "notify.prefs": { enabled: true, hour: 12, minute: 0, days: [6] }, "calendar.prefs": { locationId: "toronto" } }, { Notification: F });
  assert.match(byId(root, "nt-quiet-note").text, /Toronto/);
  assert.match(byId(root, "nt-quiet-note").text, /18 minutes before Friday sunset/);
  assert.match(byId(root, "nt-quiet-note").text, /8\.5 degrees/);
  // Saturday noon is always inside Shabbat in Toronto, so with quiet on there is nothing to schedule and the card says so
  await waitFor(() => /No reminder in the next two weeks/.test(byId(root, "nt-next").text));
  assert.equal(N.status().next, null);
  const q = byId(root, "nt-quiet"); q.checked = false; q.fire("change");
  await waitFor(() => mem["notify.prefs"].shabbatQuiet === false);
  await waitFor(() => N.status().next?.getTime() === local(2026, 11, 7, 12, 0));
  assert.match(byId(root, "nt-next").text, /Next reminder/);
  unmount();
});

// ---------- Yom Tov quiet hours ----------
const when = (iso) => new Date(iso);
const tor = toronto;
const insideYT = (iso, o) => N.isYomTov(when(iso), tor, o);

test("Rosh Hashanah 2026 (Sat 12 Sep, Reform one day): quiet from Friday candle lighting to Saturday nightfall, not after", () => {
  const w = N.yomTovWindow(when("2026-09-12T15:00:00Z"), tor);
  assert.equal(w.id, "rosh-hashanah");
  assert.equal(C.formatTime(C.floorToMinute(w.start), "America/Toronto"), "19:16"); // sunset 19:34 minus 18
  assert.equal(insideYT("2026-09-11T23:00:00Z"), false, "Friday 19:00 local, before candle lighting");
  assert.equal(insideYT("2026-09-11T23:20:00Z"), true);
  assert.equal(insideYT("2026-09-12T15:00:00Z"), true);
  assert.equal(insideYT("2026-09-13T01:00:00Z"), false, "Saturday 21:00 local is after nightfall (about 20:15)");
  assert.equal(insideYT("2026-09-13T15:00:00Z"), false, "Sunday: the optional second day is NOT quiet under Reform");
  assert.equal(insideYT("2026-09-13T15:00:00Z", { mode: "traditional" }), true, "traditional: second day quiet");
  assert.equal(insideYT("2026-09-13T15:00:00Z", { mode: "israel" }), true, "calendar lists two days in Israel mode");
});

test("Sukkot 2026: only the first day (Sat 26 Sep) is yom tov; Chol HaMoed is not; Shemini Atzeret 3 Oct is", () => {
  assert.equal(N.yomTovWindow(when("2026-09-26T15:00:00Z"), tor).id, "sukkot");
  assert.equal(insideYT("2026-09-25T23:00:00Z"), true, "Friday 19:00 local is after candle lighting (about 18:51)");
  assert.equal(insideYT("2026-09-27T15:00:00Z"), false, "Sunday, second day of Sukkot, Chol HaMoed");
  for (const d of ["28", "29", "30"]) assert.equal(insideYT(`2026-09-${d}T15:00:00Z`), false);
  assert.equal(insideYT("2026-10-01T15:00:00Z"), false, "Hoshana Rabbah (7th day) is not yom tov");
  assert.equal(N.yomTovWindow(when("2026-10-03T15:00:00Z"), tor).id, "shemini-atzeret");
  assert.equal(insideYT("2026-09-27T15:00:00Z", { mode: "traditional" }), true, "traditional: second day of Sukkot is yom tov");
});

test("Yom Kippur 2026 (Monday 21 Sep) is quiet on a weekday where Shabbat does not apply; Pesach 2027 first and last days only", () => {
  assert.equal(N.isShabbat(when("2026-09-21T16:00:00Z"), tor), false);
  assert.equal(insideYT("2026-09-21T16:00:00Z"), true);
  assert.equal(insideYT("2026-09-20T22:00:00Z"), false); // Sun 18:00 local, before candle lighting
  assert.equal(insideYT("2026-09-20T23:30:00Z"), true);
  assert.equal(insideYT("2026-09-22T16:00:00Z"), false);
  const pes = C.holidaysInHebrewYear(5787, { mode: "reform" }).find((h) => h.id === "pesach");
  const noon = (iso) => when(`${iso}T16:00:00Z`);
  assert.equal(N.isYomTov(noon(pes.start), tor), true);
  assert.equal(N.isYomTov(noon(pes.end), tor), true);
  const mid = C.isoDate(C.addDays(C.parseISO(pes.start), 3));
  assert.equal(N.isYomTov(noon(mid), tor), false, "Chol HaMoed");
  const trad = C.holidaysInHebrewYear(5787, { mode: "traditional" }).find((h) => h.id === "pesach");
  assert.equal(N.isYomTov(noon(C.isoDate(C.addDays(C.parseISO(trad.start), 1))), tor, { mode: "traditional" }), true, "second day, traditional");
});

test("yom tov: no location => never quiet; yomTovRuns ignores Hanukkah, Purim and fasts; quietHours honours the toggles", () => {
  assert.equal(N.isYomTov(when("2026-09-21T16:00:00Z"), null), false);
  assert.deepEqual(N.yomTovRuns({ id: "hanukkah", start: "2026-12-05", end: "2026-12-12", days: 8 }), []);
  assert.deepEqual(N.yomTovRuns({ id: "purim", start: "2027-03-23", end: "2027-03-23", days: 1 }), []);
  assert.deepEqual(N.yomTovRuns({ id: "tisha-bav", start: "2027-07-22", end: "2027-07-22", days: 1 }), []);
  const yk = when("2026-09-21T16:00:00Z"), sat = when("2026-11-07T15:00:00Z");
  assert.equal(N.quietHours(tor)(yk), true); assert.equal(N.quietHours(tor, { yomTov: false })(yk), false);
  assert.equal(N.quietHours(tor)(sat), true); assert.equal(N.quietHours(tor, { shabbat: false })(sat), false);
  assert.equal(N.quietHours(tor)(when("2026-11-04T15:00:00Z")), false, "ordinary Wednesday");
});

test("armFromPrefs skips a Yom Kippur slot using the calendar observance and city", async () => {
  const mem = { "notify.prefs": { enabled: true, hour: 12, minute: 0, days: [0, 1, 2, 3, 4, 5, 6], shabbatQuiet: true, yomTovQuiet: true }, "calendar.prefs": { locationId: "toronto" } };
  const t = fakeTimers(local(2026, 9, 21, 8, 0)); // Yom Kippur morning, device zone
  const g = { Notification: fakeNotification("granted") };
  const loc = await N.resolveQuietLocation({ store: { get: (k) => mem[k] } });
  assert.equal(loc.observance, "reform");
  const r = await N.armFromPrefs({ store: { get: (k) => mem[k] } }, { globalThis: g, now: t.nowFn, setTimer: t.setTimer, clearTimer: t.clearTimer });
  assert.equal(r.ok, true);
  assert.equal(N.quietHours(loc, { observance: loc.observance })(r.next), false, "chosen slot is not quiet");
  mem["notify.prefs"].yomTovQuiet = false; mem["notify.prefs"].shabbatQuiet = false;
  const r2 = await N.armFromPrefs({ store: { get: (k) => mem[k] } }, { globalThis: g, now: t.nowFn, setTimer: t.setTimer, clearTimer: t.clearTimer });
  assert.ok(r2.next.getTime() <= r.next.getTime());
});
test("default days leave Saturday and Friday off; the no-city note says so", () => {
  assert.ok(!N.DEFAULT_PREFS.days.includes(6) && !N.DEFAULT_PREFS.days.includes(5));
  assert.deepEqual(N.normalizePrefs({ days: [0, 6] }).days, [0, 6], "a learner who picks Saturday keeps it");
});
