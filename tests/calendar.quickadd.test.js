import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as Q from "../src/curriculum/calendar.quickadd.js";
import { parseICS, unescapeText } from "../src/curriculum/reminders.ics.js";

const root = new URL("../", import.meta.url);

test("prayer reminder is one daily repeating event with an alert at the time", () => {
  const t = Q.prayerReminderICS("morning", "06:00", { appUrl: "https://example.org/", now: new Date(Date.UTC(2026, 10, 8)), start: new Date(2026, 10, 9, 12) });
  const cal = parseICS(t);
  assert.equal(cal.events.length, 1);
  const e = cal.events[0];
  assert.equal(e.props.DTSTART[0].value, "20261109T060000");
  assert.equal(e.props.RRULE[0].value, "FREQ=DAILY");
  assert.equal(e.alarms[0].TRIGGER[0].value, "PT0S");
  const d = unescapeText(e.props.DESCRIPTION[0].value);
  assert.match(d, /Modeh ani/); assert.match(d, /keep your streak going/); assert.match(d, /https:\/\/example\.org\/#\/morning/);
  const b = parseICS(Q.prayerReminderICS("bedtime", "23:00", { now: new Date(0), start: new Date(2026, 0, 1, 12) })).events[0];
  assert.equal(b.props.DTEND[0].value, "20260101T230500");
  assert.throws(() => Q.prayerReminderICS("morning", "6am"));
});

test("published feeds exist for every offered time and parse", () => {
  const paths = [...Q.MORNING_TIMES.map((t) => Q.prayerFeedPath("morning", t)), ...Q.BEDTIME_TIMES.map((t) => Q.prayerFeedPath("bedtime", t)),
    ...Q.OBSERVANCES.map(Q.holidayFeedPath), Q.torahFeedPath()];
  for (const p of paths) {
    const text = fs.readFileSync(new URL(p, root), "utf8");
    const cal = parseICS(text);
    assert.ok(cal.events.length > 0, p);
    for (const e of cal.events) assert.ok(e.props.UID?.[0]?.value, p);
  }
  assert.ok(Q.MORNING_TIMES.includes(Q.DEFAULT_MORNING) && Q.BEDTIME_TIMES.includes(Q.DEFAULT_BEDTIME));
});

test("holiday and Torah feeds still cover at least the next 120 days (re-run tools/calendar/build-feeds.mjs)", () => {
  const soon = new Date(Date.now() + 120 * 86400000);
  const last = (p) => { const ds = [...fs.readFileSync(new URL(p, root), "utf8").matchAll(/DTSTART;VALUE=DATE:(\d{8})/g)].map((m) => m[1]).sort(); return ds[ds.length - 1]; };
  const iso = `${soon.getFullYear()}${String(soon.getMonth() + 1).padStart(2, "0")}${String(soon.getDate()).padStart(2, "0")}`;
  assert.ok(last(Q.torahFeedPath()) >= iso, "Torah feed ends soon");
  assert.ok(last(Q.holidayFeedPath("reform")) >= iso, "holiday feed ends soon");
});

test("Torah verse of the day: same verse in the app and the feed", () => {
  const quotes = JSON.parse(fs.readFileSync(new URL("data/torah-quotes.json", root))).quotes;
  assert.ok(quotes.length >= 50);
  for (const q of quotes) { assert.ok(q.he && q.tr && q.en && q.why && q.ref, q.id); assert.doesNotMatch(q.tr, /[֐-׿]/); }
  const day = new Date(2026, 10, 20, 9);
  const q = Q.torahQuoteFor(quotes, day);
  const t = Q.torahDailyICS(quotes, new Date(2026, 10, 20), 1, { now: new Date(0) });
  assert.match(unescapeText(parseICS(t).events[0].props.SUMMARY[0].value), new RegExp(q.ref.replace(/[.:]/g, "\\$&")));
});

test("subscribe links", () => {
  const l = Q.subscribeLinks("https://a.example/data/calendar/feeds/morning-0600.ics", "Aleph Morning Prayer");
  assert.equal(l.apple, "webcal://a.example/data/calendar/feeds/morning-0600.ics");
  assert.match(l.google, /^https:\/\/calendar\.google\.com\/calendar\/r\?cid=webcal%3A%2F%2Fa\.example/);
  assert.match(l.outlook, /addfromweb\?url=https%3A%2F%2Fa\.example.*&name=Aleph%20Morning%20Prayer$/);
  assert.equal(Q.isPublicHttps("http://localhost:8080/x"), false);
  assert.equal(Q.isPublicHttps("https://alef-review.onrender.com/x"), true);
});
