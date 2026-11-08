import test from "node:test";
import assert from "node:assert/strict";

// Minimal fake DOM (checks view logic, NOT real browser rendering, layout or focus behaviour).
class Node_ {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.nodeType = 1; this.className = ""; this.style = {}; }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { this.children.push(x); if (x && x.parent !== undefined) x.parent = this; } }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(""); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  async fire(type, ev = {}) { for (const f of this.listeners[type] || []) await f({ target: this, ...ev }); }
  click() { return this.fire("click"); }
}
const bodyNode = new Node_("body");
globalThis.document = {
  createElement: (t) => new Node_(t), createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: undefined }), body: bodyNode,
};
import { waitFor } from "./helpers/waitfor.js";
const ready = (root) => waitFor(() => root.find((n) => n.tag === "table").length > 0 && !/Loading/.test(root.text), { message: "calendar view never finished rendering" });
const memStore = (init = {}) => { const m = { ...init }; return { get: async (k) => m[k], set: async (k, v) => { m[k] = v; }, m }; };
const byId = (root, id) => root.find((n) => n.attrs.id === id)[0];
const NOW = () => new Date(Date.UTC(2026, 10, 3, 15, 0)); // 10:00 in Toronto, 23 Cheshvan 5787
const ctxFor = (extra = {}) => ({ store: memStore(), settings: {}, t: (k) => k, now: NOW, ...extra });

const { mount } = await import("../src/curriculum/calendar.view.js");

test("with a saved Toronto city: today, Hebrew date, parsha, candle lighting, havdalah, both prayer cards, upcoming holidays", async () => {
  const store = memStore({ "calendar.prefs": { locationId: "toronto" } });
  const root = new Node_("div");
  const un = mount(root, ctxFor({ store })); await ready(root);
  const t = root.text;
  assert.match(t, /Tuesday 2026-11-03/); assert.match(t, /23 Cheshvan 5787/);
  assert.match(t, /Chayei Sara/);
  assert.match(t, /2026-11-06: 16:43 America\/Toronto/);
  assert.match(t, /2026-11-07: 17:4\d America\/Toronto/);
  assert.match(t, /Morning prompt/); assert.match(t, /Evening prompt/);
  assert.match(t, /Draft, not reviewed by clergy/);
  assert.match(t, /Hanukkah/);
  for (const n of root.find((x) => x.attrs.lang === "he")) assert.equal(n.attrs.dir, "rtl");
  assert.ok(root.find((x) => x.attrs.lang === "he").length >= 4);
  assert.equal(root.find((x) => x.attrs["data-slot"] === "morning")[0].className.includes("now"), true);
  assert.equal(root.find((x) => x.attrs["data-slot"] === "evening")[0].className.includes("now"), false);
  un();
});

test("no location: asks for one, never invents a time, settings panel opens", async () => {
  const root = new Node_("div");
  const un = mount(root, ctxFor({ now: () => new Date(2026, 10, 3, 20, 0) })); await ready(root);
  assert.match(root.text, /Set your location/);
  assert.doesNotMatch(root.text, /candle lighting in/);
  assert.ok("open" in root.find((n) => n.tag === "details")[0].attrs);
  assert.match(root.text, /No location set/);
  un();
});

test("month grid: caption with Hebrew months, 7 headers, 5 weeks for Nov 2026, Saturday shows the portion, holiday days flagged", async () => {
  const root = new Node_("div");
  const un = mount(root, ctxFor({ settings: { location: { lat: 43.65, lon: -79.38, tz: "America/Toronto" } } })); await ready(root);
  const table = root.find((n) => n.tag === "table" && /alef-cal-table/.test(n.className))[0];
  assert.match(table.find((n) => n.tag === "caption")[0].text, /November 2026 .* Cheshvan . Kislev 5787/);
  assert.equal(table.find((n) => n.tag === "th").length, 7);
  assert.equal(table.find((n) => n.tag === "tr").length, 1 + 5);
  const day = (iso) => table.find((n) => n.attrs["data-date"] === iso)[0];
  assert.match(day("2026-11-07").text, /Chayei Sara/);
  assert.match(day("2026-11-10").attrs["aria-label"], /Rosh Chodesh Kislev/);
  assert.match(day("2026-11-03").className, /today/);
  assert.match(day("2026-11-07").className, /shabbat/);
  assert.match(day("2026-11-03").attrs["aria-label"], /Tuesday 3 November 2026, 23 Cheshvan 5787/);
  un();
});

test("navigating to December shows Hanukkah; selecting a day shows details; Today returns", async () => {
  const root = new Node_("div");
  const un = mount(root, ctxFor({ store: memStore({ "calendar.prefs": { locationId: "toronto" } }) })); await ready(root);
  await root.find((n) => n.attrs["aria-label"] === "Next month")[0].click();
  const table = () => root.find((n) => n.tag === "table" && /alef-cal-table/.test(n.className))[0];
  assert.match(table().find((n) => n.tag === "caption")[0].text, /December 2026/);
  const d = table().find((n) => n.attrs["data-date"] === "2026-12-05")[0];
  assert.match(d.text, /Hanukkah/); assert.match(d.className, /holiday/);
  // a marked day is a link to its day page (shape + label markers, no colour-only meaning)
  assert.equal(d.tag, "a"); assert.equal(d.attrs.href, "#/day/2026-12-05");
  assert.deepEqual(d.find((n) => n.attrs["data-marker"]).map((n) => n.attrs["data-marker"]), ["festival-minor", "shabbat", "havdalah"]);
  assert.match(d.attrs["aria-label"], /Minor festival, Shabbat, Havdalah/);
  const fri = table().find((n) => n.attrs["data-date"] === "2026-12-04")[0];
  assert.equal(fri.tag, "a"); assert.match(fri.text, /Candles/); assert.ok(fri.find((n) => n.attrs["data-marker"] === "candles").length);
  // an ordinary weekday stays a button and shows the short detail panel with a link to the page
  const wed = table().find((n) => n.attrs["data-date"] === "2026-12-02")[0];
  assert.equal(wed.tag, "button");
  await wed.click();
  const detail = root.find((n) => n.className === "alef-cal-detail")[0];
  assert.match(detail.text, /Wednesday 2026-12-02/); assert.match(detail.text, /22 Kislev 5787/);
  assert.ok(detail.find((n) => n.tag === "a" && n.attrs.href === "#/day/2026-12-02").length);
  // the legend names every marker
  assert.equal(root.find((n) => /alef-cal-legend/.test(n.className))[0].find((n) => n.tag === "li").length, 9);
  await root.find((n) => n.tag === "button" && n.text === "Today")[0].click();
  assert.match(table().find((n) => n.tag === "caption")[0].text, /November 2026/);
  await root.find((n) => n.attrs["aria-label"] === "Previous month")[0].click();
  assert.match(table().find((n) => n.tag === "caption")[0].text, /October 2026/);
  un();
});

test("year view: 12 mini months with festival days marked; picking a month returns to month view", async () => {
  const root = new Node_("div");
  const un = mount(root, ctxFor()); await ready(root);
  await root.find((n) => n.tag === "button" && n.text === "Year")[0].click();
  const minis = root.find((n) => /alef-cal-mini/.test(n.className));
  assert.equal(minis.length, 12);
  const hol = minis[8].find((n) => n.className === "hol"); // September 2026: Rosh Hashanah 12, Yom Kippur 21, Sukkot 26+
  assert.ok(hol.some((n) => n.text === "12") && hol.some((n) => n.text === "21"));
  await root.find((n) => n.tag === "button" && n.text === "March")[0].click();
  assert.match(root.find((n) => n.tag === "caption")[0].text, /March 2026/);
  un();
});

test("choosing a city saves preferences, switches candle minutes (Jerusalem 40) and the Israel schedule", async () => {
  const store = memStore();
  const root = new Node_("div");
  const un = mount(root, ctxFor({ store })); await ready(root);
  await byId(root, "alef-loc-select").fire("change", { target: { value: "jerusalem" } }); await waitFor(() => store.m["calendar.prefs"]?.locationId === "jerusalem" && /40 min before/.test(root.text), { message: "store.m[\"calendar.prefs\"]?.locationId === \"jerusalem\" && /40 min before/.test(root.text)" });
  assert.equal(store.m["calendar.prefs"].locationId, "jerusalem");
  assert.equal(store.m["calendar.prefs"].candleMinutes, 40);
  assert.match(root.text, /2026-11-06: 16:05 Asia\/Jerusalem/);
  assert.match(root.text, /40 min before/);
  assert.equal(byId(root, "alef-candle-min").attrs.value, "40");
  // custom candle minutes + havdalah choice persist
  await byId(root, "alef-candle-min").fire("change", { target: { value: "25" } }); await waitFor(() => store.m["calendar.prefs"]?.candleMinutes === 25, { message: "store.m[\"calendar.prefs\"]?.candleMinutes === 25" });
  assert.equal(store.m["calendar.prefs"].candleMinutes, 25);
  await byId(root, "alef-havdalah").fire("change", { target: { value: "min72" } }); await waitFor(() => store.m["calendar.prefs"]?.havdalah?.minutes === 72 && /72 min after sunset/.test(root.text), { message: "store.m[\"calendar.prefs\"]?.havdalah?.minutes === 72 && /72 min after sunset/.test(root.text)" });
  assert.deepEqual([store.m["calendar.prefs"].havdalah.mode, store.m["calendar.prefs"].havdalah.minutes], ["minutes", 72]);
  assert.match(root.text, /72 min after sunset/);
  un();
});

test("manual coordinates: custom location, candle minutes suggested from position", async () => {
  const store = memStore();
  const root = new Node_("div");
  const un = mount(root, ctxFor({ store })); await ready(root);
  await byId(root, "alef-lat").fire("change", { target: { value: "43.7" } }); await waitFor(() => store.m["calendar.prefs"]?.lat === 43.7, { message: "store.m[\"calendar.prefs\"]?.lat === 43.7" });
  await byId(root, "alef-lon").fire("change", { target: { value: "-79.4" } }); await waitFor(() => store.m["calendar.prefs"]?.lon === -79.4 && /candle lighting in Custom location/.test(root.text), { message: "store.m[\"calendar.prefs\"]?.lon === -79.4 && /candle lighting in Custom location/.test(root.text)" });
  const p = store.m["calendar.prefs"];
  assert.deepEqual([p.locationId, p.lat, p.lon, p.candleMinutes], ["custom", 43.7, -79.4, 18]);
  assert.match(root.text, /candle lighting in Custom location/);
  un();
});

test("reminders list, .ics download status, toggles", async () => {
  const store = memStore({ "calendar.prefs": { locationId: "new-york" } });
  const root = new Node_("div");
  const un = mount(root, ctxFor({ store, now: () => new Date(Date.UTC(2026, 10, 4, 15, 0)) })); await ready(root);
  const list = root.find((n) => n.attrs["aria-label"] === "Upcoming reminders")[0];
  assert.equal(list.find((n) => n.tag === "li").length, 8);
  assert.match(list.text, /Evening prayer moment/);
  const clicked = [];
  globalThis.document.createElement = (t) => { const n = new Node_(t); if (t === "a") n.click = () => clicked.push(n.attrs.download ?? n.download); return n; };
  await byId(root, "alef-ics-days").fire("change", { target: { value: "30" } });
  await byId(root, "alef-ics-btn").click();
  assert.equal(clicked.length, 1);
  assert.match(clicked[0], /^alef-calendar-2026-11-04\.ics$/);
  assert.match(byId(root, "alef-rem-status").text, /Downloaded \d+ events for 30 days/);
  assert.match(byId(root, "alef-rem-status").text, /alarm behaviour depends on the calendar app/);
  // switch everything off -> nothing to export
  for (const cb of root.find((n) => n.tag === "input" && n.attrs.type === "checkbox")) await cb.fire("change", { target: { checked: false } });
  await waitFor(() => /Nothing scheduled/.test(root.text), { message: "/Nothing scheduled/.test(root.text)" });
  assert.match(root.text, /Nothing scheduled/);
  await byId(root, "alef-ics-btn").click();
  assert.match(byId(root, "alef-rem-status").text, /Nothing to export/);
  assert.equal(store.m["calendar.prefs"].remind.candles, false);
  un();
});

test("notifications section is honest about limits; button only when the browser supports them", async () => {
  const root = new Node_("div");
  const un = mount(root, ctxFor()); await ready(root);
  assert.match(root.text, /can only fire while this app is open/);
  assert.match(root.text, /nothing can wake the app when it is closed/);
  assert.match(root.text, /does not support notifications/);
  assert.equal(byId(root, "alef-notify-btn"), undefined);
  un();
});

test("notification permission flow with a fake Notification (granted)", async () => {
  const fired = [];
  class N { constructor(t, o) { fired.push([t, o]); } static async requestPermission() { N.permission = "granted"; return "granted"; } }
  N.permission = "default";
  globalThis.Notification = N;
  const store = memStore({ "calendar.prefs": { locationId: "toronto" } });
  const root = new Node_("div");
  const un = mount(root, ctxFor({ store })); await ready(root);
  await byId(root, "alef-notify-btn").click(); await waitFor(() => store.m["calendar.prefs"]?.notify === true, { message: "store.m[\"calendar.prefs\"]?.notify === true" });
  assert.equal(store.m["calendar.prefs"].notify, true);
  assert.match(byId(root, "alef-rem-status").text, /for as long as this app stays open/);
  un();
  delete globalThis.Notification;
});

test("unmount removes the view and is safe to call twice; no store and no ctx fields still renders", async () => {
  const root = new Node_("div");
  const un = mount(root, {}); await ready(root);
  assert.ok(root.find((n) => n.tag === "table").length > 0);
  un(); un();
  assert.equal(root.children.length, 0);
});

test("on a Saturday the Today card pairs THIS Shabbat's candle lighting (yesterday) with today's havdalah, not next week's candles", async () => {
  const store = memStore({ "calendar.prefs": { locationId: "toronto" } });
  const root = new Node_("div");
  // Saturday 2026-11-07, 10:00 in Toronto (15:00 UTC). Before the fix the card read "2026-11-13: 16:36" beside "2026-11-07: 17:45".
  const un = mount(root, ctxFor({ store, now: () => new Date(Date.UTC(2026, 10, 7, 15, 0)) })); await ready(root);
  const t = root.text;
  assert.match(t, /Saturday 2026-11-07/);
  assert.match(t, /2026-11-06: 16:43 America\/Toronto/);
  assert.doesNotMatch(t, /2026-11-13: 16:36/);
  assert.match(t, /2026-11-07: 17:45 America\/Toronto/);
  un();
});
