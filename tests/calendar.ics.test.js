import test from "node:test";
import assert from "node:assert/strict";
import * as I from "../src/curriculum/reminders.ics.js";
import * as R from "../src/curriculum/reminders.js";
import * as L from "../src/curriculum/calendar.locations.js";

const NOW = new Date(Date.UTC(2026, 10, 4, 12, 0, 0));
const prefs = L.normalizePrefs({ locationId: "toronto", remind: { roshChodesh: true } });
const { items } = R.buildReminders(prefs, "2026-11-04", "2027-02-01");
const ics = I.toICS(items, { now: NOW });
const octets = (s) => new TextEncoder().encode(s).length;

test("raw text rules: CRLF everywhere, final CRLF, no bare LF, lines <= 75 octets, BEGIN/END balanced", () => {
  assert.ok(ics.endsWith("\r\n"));
  assert.ok(!/(^|[^\r])\n/.test(ics), "bare LF");
  const lines = ics.split("\r\n"); lines.pop();
  for (const l of lines) assert.ok(octets(l) <= 75, `line too long (${octets(l)}): ${l.slice(0, 40)}`);
  assert.equal(lines[0], "BEGIN:VCALENDAR"); assert.equal(lines.at(-1), "END:VCALENDAR");
  const count = (re) => lines.filter((l) => re.test(l)).length;
  assert.equal(count(/^BEGIN:VEVENT$/), count(/^END:VEVENT$/)); assert.equal(count(/^BEGIN:VEVENT$/), items.length);
  assert.equal(count(/^BEGIN:VALARM$/), count(/^END:VALARM$/));
});

test("parse back: calendar properties and one VEVENT per item", () => {
  const cal = I.parseICS(ics);
  assert.equal(cal.props.VERSION[0].value, "2.0");
  assert.match(cal.props.PRODID[0].value, /Aleph/);
  assert.equal(cal.props.CALSCALE[0].value, "GREGORIAN");
  assert.equal(cal.events.length, items.length);
  const uids = new Set(cal.events.map((e) => e.props.UID[0].value));
  assert.equal(uids.size, items.length);
  for (const e of cal.events) {
    for (const req of ["UID", "DTSTAMP", "DTSTART", "SUMMARY"]) assert.ok(e.props[req]?.length === 1, `${req} missing/duplicated`);
    assert.equal(e.props.DTSTAMP[0].value, "20261104T120000Z");
    assert.ok(e.props.UID[0].value.endsWith("@alef.local"));
  }
});

test("round trip: instants come back to the same minute (UTC), floating times to the same wall clock, all-day to the same dates", () => {
  const cal = I.parseICS(ics);
  const byUid = new Map(cal.events.map((e) => [e.props.UID[0].value, e]));
  let inst = 0, flo = 0, day = 0;
  for (const it of items) {
    const e = byUid.get(`${it.uid}@alef.local`);
    assert.ok(e, it.uid);
    const start = e.props.DTSTART[0];
    const d = I.parseICSDate(start.value);
    assert.equal(I.unescapeText(e.props.SUMMARY[0].value), it.title);
    assert.equal(I.unescapeText(e.props.DESCRIPTION[0].value), it.description);
    if (it.when.type === "instant") {
      assert.ok(d.utc && start.params.VALUE === undefined);
      assert.equal(Date.UTC(d.y, d.m - 1, d.d, d.hh, d.mm, d.ss), it.when.at.getTime()); inst++;
      const end = I.parseICSDate(e.props.DTEND[0].value);
      assert.equal(Date.UTC(end.y, end.m - 1, end.d, end.hh, end.mm, end.ss) - it.when.at.getTime(), it.durationMin * 60000);
    } else if (it.when.type === "floating") {
      assert.ok(!d.utc && start.params.TZID === undefined);
      assert.deepEqual([d.y, d.m, d.d, d.hh, d.mm], [it.when.y, it.when.m, it.when.d, it.when.hh, it.when.mm]); flo++;
    } else {
      assert.equal(start.params.VALUE, "DATE"); assert.equal(e.props.DTEND[0].params.VALUE, "DATE");
      assert.deepEqual([d.y, d.m, d.d], [it.when.y, it.when.m, it.when.d]);
      const end = I.parseICSDate(e.props.DTEND[0].value);
      // DTEND of an all-day event is exclusive: the day after the last day
      assert.equal(Date.UTC(end.y, end.m - 1, end.d) - Date.UTC(it.when.endY, it.when.endM - 1, it.when.endD), 86400000); day++;
    }
  }
  assert.ok(inst > 10 && flo > 100 && day > 3);
});

test("VALARM: ACTION:DISPLAY with DESCRIPTION and a valid TRIGGER matching alarmMin", () => {
  const cal = I.parseICS(ics);
  const byUid = new Map(cal.events.map((e) => [e.props.UID[0].value, e]));
  for (const it of items) {
    const e = byUid.get(`${it.uid}@alef.local`);
    assert.equal(e.alarms.length, it.alarmMin == null ? 0 : 1);
    for (const a of e.alarms) {
      assert.equal(a.ACTION[0].value, "DISPLAY");
      assert.ok(a.DESCRIPTION[0].value.length > 0);
      const t = a.TRIGGER[0].value;
      assert.match(t, /^-?P(T(\d+H)?(\d+M)?(\d+S)?)$/);
      const m = /^(-?)PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(t);
      const mins = (Number(m[2] || 0) * 60 + Number(m[3] || 0)) * (m[1] ? 1 : 0);
      assert.equal(mins, it.alarmMin, `${it.uid} ${t}`);
    }
  }
  const candle = [...byUid.values()].find((e) => e.props.UID[0].value.startsWith("alef-candles-"));
  assert.equal(candle.alarms[0].TRIGGER[0].value, "-PT30M");
  const hol = [...byUid.values()].find((e) => e.props.UID[0].value.startsWith("alef-holiday-"));
  assert.equal(hol.alarms[0].TRIGGER[0].value, "-PT15H");
  const pray = [...byUid.values()].find((e) => e.props.UID[0].value.startsWith("alef-morning-"));
  assert.equal(pray.alarms[0].TRIGGER[0].value, "PT0S");
});

test("Hebrew text and special characters survive escaping, folding and unfolding", () => {
  const it = { uid: "t1", kind: "morning", title: "A, B; C \\ D", description: "שלום עולם, ‏מוֹדֶה אֲנִי\nline two; with semicolon, and comma \\ backslash. " + "x".repeat(200) + "שׁ".repeat(60), when: { type: "floating", y: 2026, m: 11, d: 4, hh: 7, mm: 30 }, durationMin: 5, alarmMin: 0 };
  const text = I.toICS([it], { now: NOW });
  for (const l of text.split("\r\n")) assert.ok(octets(l) <= 75);
  const e = I.parseICS(text).events[0];
  assert.equal(I.unescapeText(e.props.SUMMARY[0].value), it.title);
  assert.equal(I.unescapeText(e.props.DESCRIPTION[0].value), it.description);
});

test("foldLine never splits a multi-byte character and continuation lines start with one space", () => {
  const line = "DESCRIPTION:" + "מ".repeat(100);
  const folded = I.foldLine(line);
  const parts = folded.split("\r\n");
  assert.ok(parts.length > 2);
  for (const [i, p] of parts.entries()) { assert.ok(octets(p) <= 75); if (i) assert.ok(p.startsWith(" ")); }
  assert.equal(parts.map((p, i) => (i ? p.slice(1) : p)).join(""), line);
  assert.equal(I.foldLine("SHORT:x"), "SHORT:x");
});

test("escapeText / unescapeText round trip and triggerFor", () => {
  const s = "a,b;c\\d\ne";
  assert.equal(I.escapeText(s), "a\\,b\\;c\\\\d\\ne");
  assert.equal(I.unescapeText(I.escapeText(s)), s);
  assert.equal(I.triggerFor(0), "PT0S"); assert.equal(I.triggerFor(30), "-PT30M"); assert.equal(I.triggerFor(90), "-PT1H30M"); assert.equal(I.triggerFor(900), "-PT15H");
});

test("parser rejects malformed files (so a passing parse means something)", () => {
  assert.throws(() => I.parseICS("BEGIN:VCALENDAR\nEND:VCALENDAR\n"), /CRLF/);
  assert.throws(() => I.parseICS("BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nEND:VCALENDAR\r\n"), /unbalanced/);
  assert.throws(() => I.parseICS("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"), /end with CRLF|unclosed|VCALENDAR/);
  assert.throws(() => I.parseICS("BEGIN:VCALENDAR\r\nthis is not a content line\r\nEND:VCALENDAR\r\n"), /bad content line/);
  assert.throws(() => I.parseICSDate("2026-11-04"), /bad ICS date/);
});

test("empty item list still yields a valid empty VCALENDAR; deterministic output for fixed now", () => {
  const e = I.parseICS(I.toICS([], { now: NOW }));
  assert.equal(e.events.length, 0);
  assert.equal(I.toICS(items, { now: NOW }), ics);
});

test("downloadICS is a safe no-op without a DOM, and clicks a hidden link with one", () => {
  assert.equal(I.downloadICS("x", "a.ics", null), false);
  const clicked = [];
  const doc = { createElement: () => ({ style: {}, click() { clicked.push(this.download); }, remove() {} }), body: { append() {} } };
  assert.equal(I.downloadICS(ics, "alef.ics", doc), true);
  assert.deepEqual(clicked, ["alef.ics"]);
});
