import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Day-page model (pure) and the day view on the repo's fake DOM (view logic, not real rendering).
const copy = JSON.parse(fs.readFileSync(new URL("../data/calendar/days.json", import.meta.url), "utf8"));
const links = JSON.parse(fs.readFileSync(new URL("../data/festivals/links.json", import.meta.url), "utf8"));
const registry = JSON.parse(fs.readFileSync(new URL("../data/corpus/registry.json", import.meta.url), "utf8")).entries;
const vocab = JSON.parse(fs.readFileSync(new URL("../data/festivals/vocab.json", import.meta.url), "utf8"));
const registryTitles = new Map(registry.map((e) => [e.id, e.title]));
const env = { hasRoute: () => true, registryTitles, lessonTitles: new Map([["I-32", "Hanukkah"], ["I-50", "Festival words"]]) };
const toronto = { lat: 43.65, lon: -79.38, tz: "America/Toronto", name: "Toronto, ON", candleMinutes: 18 };

const { dayPage, dayFacts, validISO, nearestNotable, dayTimes, GENERIC_KEYS } = await import("../src/curriculum/calendar.day.js");
const { markersFor, isImportant, MARKER_KINDS, ART_NAME, markerArtPath } = await import("../src/curriculum/calendar.markers.js");
const { HOLIDAY_DEFS, holidaysBetween } = await import("../src/curriculum/calendar.js");

test("data: every holiday id and every generic day has copy with a pointed Hebrew name, transliteration, 3-6 sentences, customs and words", () => {
  const ids = [...HOLIDAY_DEFS.map((d) => d.id), "simchat-torah", ...GENERIC_KEYS];
  for (const id of ids) {
    const c = copy.days[id];
    assert.ok(c, `copy for ${id}`);
    assert.match(c.he, /[֑-ׇ]/, `${id}: Hebrew name carries vowel points`);
    assert.ok(c.tr && c.en, `${id}: tr and en`);
    assert.ok(c.what.length >= 2 && c.what.length <= 6, `${id}: ${c.what.length} sentences`);
    assert.ok(c.customs.length >= 2, `${id}: customs`);
    assert.ok(c.words.length >= 2, `${id}: words`);
    for (const w of c.words) { assert.match(w.he, /[֑-ׇ]/, `${id} word ${w.tr} pointed`); assert.ok(w.tr && w.en); }
    for (const t of c.texts || []) assert.ok(registryTitles.has(t), `${id}: text ${t} exists in the registry`);
    if (c.lesson && c.lesson !== "shabbat-ready") assert.ok(vocab.packs.some((p) => p.id === c.lesson), `${id}: pack ${c.lesson} exists`);
  }
});

test("markers: shape + label per kind, deduplicated, in display order; a day is important when it has any marker but 'done'", () => {
  assert.deepEqual(markersFor({ holidays: [{ kind: "major" }, { kind: "roshchodesh" }], isShabbat: true, isFriday: false, done: true }).map((m) => m.kind), ["festival", "roshchodesh", "shabbat", "havdalah", "done"]);
  assert.deepEqual(markersFor({ holidays: [{ kind: "fast" }] }).map((m) => m.kind), ["fast"]);
  assert.deepEqual(markersFor({ holidays: [{ kind: "minor" }, { kind: "modern" }] }).map((m) => m.kind), ["festival-minor", "remembrance"]);
  // every marker names the picture Lane 2 ordered (docs/images/CALENDAR-ART.md); the SVG and label stay when the file is absent
  const ordered = ["candles", "havdalah", "festival", "festival-minor", "fast", "rosh-chodesh", "shabbat", "remembrance", "morning", "evening", "reminder-set", "lesson-done"];
  for (const k of Object.values(ART_NAME)) assert.ok(ordered.includes(k), k);
  assert.equal(markerArtPath("done"), "assets/img/calendar/markers/lesson-done.png");
  assert.equal(markerArtPath("roshchodesh"), "assets/img/calendar/markers/rosh-chodesh.png");
  assert.deepEqual(markersFor({ isFriday: true }).map((m) => `${m.kind}:${m.label}`), ["candles:Candle lighting"]);
  assert.deepEqual(markersFor({ eveOfYomTov: true }).map((m) => m.kind), ["candles"]);
  assert.equal(isImportant(markersFor({ done: true })), false);
  assert.equal(isImportant(markersFor({})), false);
  assert.equal(isImportant(markersFor({ isShabbat: true })), true);
  assert.equal(MARKER_KINDS.length, 9);
  for (const m of MARKER_KINDS) assert.ok(m.label.length > 2);
});

test("which days are important over a whole year: every festival day, Rosh Chodesh, Friday and Saturday; plain weekdays are not", () => {
  let important = 0, plain = 0;
  const hols = holidaysBetween("2026-09-01", "2027-08-31", { roshChodesh: true });
  const holDays = new Set();
  for (const h of hols) { const d0 = new Date(h.start + "T00:00:00Z"); for (let i = 0; i < h.days; i++) holDays.add(new Date(d0.getTime() + i * 864e5).toISOString().slice(0, 10)); }
  for (let t = Date.UTC(2026, 8, 1); t <= Date.UTC(2027, 7, 31); t += 864e5) {
    const iso = new Date(t).toISOString().slice(0, 10), dow = new Date(t).getUTCDay();
    const f = dayFacts(iso);
    const expectImportant = holDays.has(iso) || dow === 5 || dow === 6 || f.eveOfYomTov;
    assert.equal(f.important, expectImportant, iso);
    if (f.important) important++; else plain++;
  }
  assert.ok(important > 120 && plain > 200, `${important} important, ${plain} plain`);
});

test("Shabbat Hanukkah (2026-12-05, Toronto): two sections with copy, words, readings, in-app links, learn-more, parsha, havdalah time, navigation", () => {
  const p = dayPage("2026-12-05", { copy, links, env, loc: toronto });
  assert.equal(p.dateLabel, "Saturday 5 December 2026");
  assert.equal(p.hebrew.label, "25 Kislev 5787");
  assert.deepEqual(p.markers.map((m) => m.kind), ["festival-minor", "shabbat", "havdalah"]);
  assert.deepEqual(p.sections.map((s) => s.key), ["hanukkah", "shabbat"]);
  const h = p.sections[0];
  assert.equal(h.title, "Hanukkah, day 1 of 8");
  assert.equal(h.he, "חֲנֻכָּה"); assert.equal(h.tr, "Chanukah");
  assert.ok(h.what.length >= 3 && h.customs.length >= 3 && h.words.length >= 5 && h.readings.length >= 3);
  assert.ok(h.words.some((w) => w.tr === "sevivon" && /dreidel/.test(w.en)));
  assert.deepEqual(h.links.filter((l) => l.kind === "text").map((l) => l.href), ["#/read/hanukkah-candle", "#/read/hanukkah-nissim", "#/read/shehecheyanu", "#/read/hanerot-halalu", "#/read/maoz-tzur-1"]);
  assert.ok(h.links.some((l) => l.href === "#/learn?lesson=I-32"));
  assert.deepEqual(h.learnMore, { href: "#/festivals/hanukkah", label: "Words for Hanukkah" });
  assert.equal(p.sections[1].learnMore.href, "#/festivals/shabbat-ready");
  assert.ok(p.sections[1].links.some((l) => l.href === "#/read/havdalah-flame"));
  assert.equal(p.parsha.en, "Vayeshev"); assert.equal(p.parsha.href, "#/torahread");
  assert.deepEqual(p.times.map((t) => [t.kind, t.time]), [["havdalah", "17:28"]]);
  assert.deepEqual(p.nav, { prev: "2026-12-04", next: "2026-12-06", prevNotable: { iso: "2026-11-10", en: "Rosh Chodesh Kislev" }, nextNotable: { iso: "2026-12-10", en: "Rosh Chodesh Tevet" } });
  assert.equal(p.quiet, false);
});

test("Friday 2026-12-04 Toronto: eve of Shabbat with candle lighting 16:23 (same number the reminders show); Rosh Chodesh day uses the generic copy", () => {
  const f = dayPage("2026-12-04", { copy, links, env, loc: toronto });
  assert.deepEqual(f.sections.map((s) => s.key), ["erev-shabbat"]);
  assert.deepEqual(f.times.map((t) => [t.kind, t.time]), [["candles", "16:23"]]);
  assert.match(f.times[0].detail, /18 minutes before sunset \(16:41\) in Toronto, ON/);
  assert.equal(f.sections[0].learnMore.href, "#/festivals/shabbat-ready");
  const rc = dayPage("2026-11-10", { copy, links, env, loc: toronto });
  assert.equal(rc.sections[0].key, "rosh-chodesh-kislev");
  assert.equal(rc.sections[0].title, "Rosh Chodesh Kislev, day 1 of 2");
  assert.equal(rc.sections[0].he, "רֹאשׁ חֹדֶשׁ כִּסְלֵו");
  assert.equal(rc.sections[0].tr, "Rosh Chodesh Kislev");
  assert.ok(rc.sections[0].hasCopy && rc.sections[0].what.length >= 3);
  assert.equal(rc.sections[0].learnMore, null);
  assert.deepEqual(rc.times, []);
});

test("festival eves and ends: erev Rosh Hashanah on a Friday, Rosh Hashanah on Shabbat (no portion), Yom Kippur ends at nightfall; traditional mode adds Simchat Torah", () => {
  const eve = dayPage("2026-09-11", { copy, links, env, loc: toronto });
  assert.deepEqual(eve.sections.map((s) => s.key), ["erev-shabbat", "erev-festival"]);
  assert.equal(eve.sections[1].title, "Eve of Rosh Hashanah: begins at sundown");
  assert.deepEqual(eve.times.map((t) => t.kind), ["candles"]);
  const rh = dayPage("2026-09-12", { copy, links, env, loc: toronto });
  assert.equal(rh.sections[0].key, "rosh-hashanah"); assert.equal(rh.parsha, null); assert.match(rh.noPortion, /festival reading/);
  assert.ok(rh.isYomTov);
  const yk = dayPage("2026-09-21", { copy, links, env, loc: toronto });
  assert.equal(yk.sections[0].key, "yom-kippur");
  assert.ok(yk.sections[0].links.every((l) => l.kind === "lesson"), "Yom Kippur: no stand-in text is linked, only the festival lesson");
  assert.deepEqual(yk.times.map((t) => t.kind), ["ends"]);
  const st = dayPage("2026-10-04", { mode: "traditional", copy, links, env, loc: toronto });
  assert.equal(st.sections[0].key, "simchat-torah"); assert.equal(st.sections[0].learnMore.href, "#/festivals/shemini-atzeret");
  // second night of a two-day festival: candles after nightfall from an existing flame
  const rh1 = dayPage("2026-09-12", { mode: "traditional", copy, links, env, loc: toronto });
  assert.deepEqual(rh1.times.map((t) => t.kind), ["candles-nightfall", "havdalah"]);
});

test("no location: no times are invented; without routes no links; an ordinary day is quiet; modern days have copy and no pack", () => {
  const p = dayPage("2026-12-08", { copy, links, env: { hasRoute: () => false, registryTitles }, loc: null });
  assert.deepEqual(p.times, []); assert.equal(p.needsLocation, true);
  assert.deepEqual(p.sections[0].links, []); assert.equal(p.sections[0].learnMore, null);
  const q = dayPage("2026-11-09", { copy, links, env, loc: toronto });
  assert.equal(q.quiet, true); assert.deepEqual(q.sections, []); assert.equal(q.nav.nextNotable.en, "Rosh Chodesh Kislev");
  const sh = dayPage("2027-05-04", { copy, links, env, loc: toronto }); // 27 Nisan 5787
  assert.equal(sh.sections[0].key, "yom-hashoah"); assert.ok(sh.sections[0].hasCopy); assert.equal(sh.sections[0].learnMore, null);
  assert.ok(sh.sections[0].links.some((l) => l.href === "#/read/kaddish-1"));
});

test("validISO, nearestNotable and dayTimes edge cases", () => {
  assert.equal(validISO("2026-12-05"), true); assert.equal(validISO("2026-02-30"), false); assert.equal(validISO("2026-13-01"), false);
  assert.equal(validISO("abc"), false); assert.equal(validISO("0999-01-01"), false); assert.equal(validISO(null), false);
  assert.deepEqual(nearestNotable("2026-12-05", 1), { iso: "2026-12-10", en: "Rosh Chodesh Tevet" });
  assert.deepEqual(nearestNotable("2026-12-05", -1), { iso: "2026-11-10", en: "Rosh Chodesh Kislev" });
  const f = dayFacts("2026-12-04");
  assert.equal(dayTimes(f, null).length, 0);
  const far = dayTimes(f, { lat: 70, lon: 25, tz: "Europe/Oslo", name: "Far north", candleMinutes: 18 }, { mode: "tzeit", degrees: 8.5 });
  assert.ok(far.length === 1 && far[0].kind === "candles");
});

// ---------- the view on the fake DOM ----------
class Node_ {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.nodeType = 1; this.className = ""; this.classList = { add: (c) => { this.className += " " + c; } }; }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { this.children.push(x); if (x && x.parent !== undefined) x.parent = this; } }
  prepend(...c) { this.children.unshift(...c); }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(""); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
}
globalThis.document = { createElement: (t) => new Node_(t), createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: undefined }), body: new Node_("body"), title: "" };
import { waitFor } from "./helpers/waitfor.js";
const { mount } = await import("../src/curriculum/day.view.js");
const memStore = (init = {}) => { const m = { ...init }; return { get: async (k) => m[k], set: async (k, v) => { m[k] = v; } }; };
const dayData = { copy, links, registry, lessons: [["I-32", "Hanukkah"]] };

test("day view: Shabbat Hanukkah in Toronto renders both sections, key words table, links, times, prev/next and sets the title", async () => {
  const root = new Node_("div");
  const un = mount(root, { params: { date: "2026-12-05" }, store: memStore({ "calendar.prefs": { locationId: "toronto" } }), hasRoute: () => true, dayData, now: () => new Date(2026, 10, 3) });
  await waitFor(() => /Hanukkah/.test(root.text), { message: "day view never rendered" });
  const t = root.text;
  assert.match(t, /Saturday 5 December 2026/); assert.match(t, /25 Kislev 5787/);
  assert.match(t, /Hanukkah, day 1 of 8/); assert.match(t, /What it is/); assert.match(t, /What people do/); assert.match(t, /Key words/); assert.match(t, /Prayers and readings/);
  assert.match(t, /Havdalah17:28 America\/Toronto/); assert.match(t, /Vayeshev/);
  assert.match(t, /Dates and times are calculated, not authoritative/);
  const hrefs = root.find((n) => n.tag === "a").map((n) => n.attrs.href);
  for (const h of ["#/read/hanukkah-candle", "#/learn?lesson=I-32", "#/festivals/hanukkah", "#/festivals/shabbat-ready", "#/torahread", "#/day/2026-12-04", "#/day/2026-12-06", "#/day/2026-12-10", "#/calendar"]) assert.ok(hrefs.includes(h), h);
  for (const n of root.find((x) => x.attrs.lang === "he")) assert.equal(n.attrs.dir, "rtl");
  assert.ok(root.find((n) => n.tag === "table" && /alef-day-words/.test(n.className)).length === 2);
  assert.deepEqual(root.find((n) => n.attrs["data-marker"]).map((n) => n.attrs["data-marker"]), ["festival-minor", "shabbat", "havdalah"]);
  assert.equal(globalThis.document.title, "Saturday 5 December 2026 - ALEF");
  un(); assert.equal(root.children.length, 0);
});

test("day view: no city asks for one and invents no time; a bad date gets a plain message and a way back", async () => {
  const root = new Node_("div");
  const un = mount(root, { params: { date: "2026-12-04" }, store: memStore(), hasRoute: () => false, dayData });
  await waitFor(() => /Friday, the eve of Shabbat/.test(root.text), { message: "day view never rendered" });
  assert.match(root.text, /Choose a city on the Calendar screen/); assert.doesNotMatch(root.text, /16:23/);
  assert.match(root.text, /None of these texts is in ALEF yet/);
  un();
  const bad = new Node_("div");
  const un2 = mount(bad, { params: { date: "2026-02-30" }, dayData });
  assert.match(bad.text, /not a date this calendar can show/);
  assert.ok(bad.find((n) => n.tag === "a" && n.attrs.href === "#/calendar").length);
  un2();
});
