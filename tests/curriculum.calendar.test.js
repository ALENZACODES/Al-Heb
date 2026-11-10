import test from "node:test";
import assert from "node:assert/strict";
import * as C from "../src/curriculum/calendar.js";

// FIXTURES (sourced, fetched 2026-11-03):
//  - torah-box.net/calendar/holidays/5787/ lists the EVENING on which each observance begins: Hanukkah Dec 4 2026,
//    Purim Mar 22 2027, Pesach Apr 21 2027, Shavuot Jun 10 2027, Fast of 9 Av Aug 11 2027. Its header showed 23 Cheshvan 5787 on 2026-11-03.
//  - torah-box.net/calendar/holidays/5788/ : Rosh Hashanah eve Oct 1 2027, Yom Kippur eve Oct 10, Sukkot eve Oct 15, Shemini Atzeret eve Oct 22, Simchat Torah eve Oct 23.
//  - almo-ai.com/blog/jewish-holidays-2027 (lower quality; its Pesach/Purim rows disagree with torah-box and are NOT used): Rosh Hashana 1 Tishrei = Sep 12 2026, Yom Kippur Sep 21, Sukkot Sep 26, Simchat Torah Oct 3.
const byId = (list, id) => list.find((h) => h.id === id);

test("Hebrew <-> Gregorian: 1 Tishrei 5787 = 2026-09-12; 23 Cheshvan 5787 = 2026-11-03", () => {
  assert.deepEqual(C.toHebrew({ y: 2026, m: 9, d: 12 }), { year: 5787, month: "tishrei", day: 1 });
  assert.deepEqual(C.toHebrew({ y: 2026, m: 11, d: 3 }), { year: 5787, month: "cheshvan", day: 23 });
  assert.equal(C.isoDate(C.fromHebrew({ year: 5787, month: "tishrei", day: 1 })), "2026-09-12");
});

test("round trip across many days", () => {
  for (let rd = C.toRD({ y: 2020, m: 1, d: 1 }); rd < C.toRD({ y: 2032, m: 1, d: 1 }); rd += 7) {
    const g = C.fromRD(rd);
    assert.deepEqual(C.fromHebrew(C.toHebrew(g)), g);
  }
});

test("year structure: lengths legal, leap years 13 months", () => {
  for (let y = 5780; y < 5800; y++) {
    const len = C.hebrewYearLength(y);
    assert.ok([353, 354, 355, 383, 384, 385].includes(len), `${y}: ${len}`);
    const months = C.monthsOfYear(y);
    assert.equal(months.length, C.isHebrewLeapYear(y) ? 13 : 12);
    assert.equal(months.reduce((a, m) => a + m.days, 0), len);
  }
  assert.equal(C.isHebrewLeapYear(5784), true);  // 5784 (2023-24) was a leap year
  assert.equal(C.isHebrewLeapYear(5787), true);  // consistent with Purim on 2027-03-23 (Adar II)
  assert.equal(C.isHebrewLeapYear(5786), false);
});

test("Rosh Hashanah never falls on Sunday, Wednesday or Friday (dehiyyot)", () => {
  for (let y = 5700; y < 5900; y++) assert.ok(![0, 3, 5].includes(C.weekday(C.fromRD(C.hebrewNewYearRD(y)))), String(y));
});

test("5787 holidays match sourced eve dates", () => {
  const h = C.holidaysInHebrewYear(5787);
  assert.equal(byId(h, "rosh-hashanah").start, "2026-09-12");
  assert.equal(byId(h, "yom-kippur").start, "2026-09-21");
  assert.equal(byId(h, "sukkot").start, "2026-09-26");
  assert.equal(byId(h, "shemini-atzeret").start, "2026-10-03");
  assert.equal(byId(h, "hanukkah").eve, "2026-12-04");
  assert.equal(byId(h, "hanukkah").end, "2026-12-12");
  assert.equal(byId(h, "purim").eve, "2027-03-22");
  assert.equal(byId(h, "pesach").eve, "2027-04-21");
  assert.equal(byId(h, "pesach").end, "2027-04-28");
  assert.equal(byId(h, "shavuot").eve, "2027-06-10");
  assert.equal(byId(h, "tisha-bav").eve, "2027-08-11");
});

test("5788 holidays match sourced eve dates", () => {
  const h = C.holidaysInHebrewYear(5788);
  assert.equal(byId(h, "rosh-hashanah").eve, "2027-10-01");
  assert.equal(byId(h, "yom-kippur").eve, "2027-10-10");
  assert.equal(byId(h, "sukkot").eve, "2027-10-15");
  assert.equal(byId(h, "shemini-atzeret").eve, "2027-10-22");
});

test("Purim is in Adar II in a leap year (5784: 2024-03-24 is the commonly published date; unsourced here, structural check only)", () => {
  const p = C.holidaysInHebrewYear(5784).find((h) => h.id === "purim");
  assert.equal(C.toHebrew(C.parseISO(p.start)).month, "adar2");
});

test("nextHolidays returns the upcoming ones in order", () => {
  const n = C.nextHolidays("2026-11-03", 3).map((h) => h.id);
  assert.deepEqual(n, ["hanukkah", "tu-bishvat", "purim"]);
});

test("weekday: 2026-11-06 is a Friday; fridayOnOrAfter", () => {
  assert.equal(C.weekday({ y: 2026, m: 11, d: 6 }), 5);
  assert.deepEqual(C.fridayOnOrAfter({ y: 2026, m: 11, d: 3 }), { y: 2026, m: 11, d: 6 });
  assert.deepEqual(C.fridayOnOrAfter({ y: 2026, m: 11, d: 6 }), { y: 2026, m: 11, d: 6 });
});

// Solar tests: SANITY/PHYSICS ONLY. No external reference table was available, so absolute accuracy is NOT verified.
test("sunset sanity: equator near the equinox is about 18:00 local, day about 12 h", () => {
  const ss = C.sunset({ y: 2026, m: 3, d: 20 }, 0, 0);
  const mins = ss.getUTCHours() * 60 + ss.getUTCMinutes();
  assert.ok(Math.abs(mins - 1080) < 12, `sunset UT minutes ${mins}`);
});

test("sunset sanity: Toronto Nov 6 2026 is between 16:50 and 17:15 EST; summer is much later than winter", () => {
  const t = C.sunset({ y: 2026, m: 11, d: 6 }, 43.65, -79.38);
  assert.match(C.formatTime(t, "America/Toronto"), /^(16:5\d|17:0\d|17:1[0-5])$/);
  const winter = C.sunset({ y: 2026, m: 12, d: 18 }, 43.65, -79.38), summer = C.sunset({ y: 2026, m: 6, d: 19 }, 43.65, -79.38);
  assert.ok(+C.formatTime(summer, "America/Toronto").slice(0, 2) >= 20);
  assert.ok(+C.formatTime(winter, "America/Toronto").slice(0, 2) <= 16);
});

test("polar night returns null", () => {
  assert.equal(C.sunset({ y: 2026, m: 12, d: 21 }, 80, 0), null);
});

test("candle lighting: default 18 min, configurable, Jerusalem 40", () => {
  const loc = { lat: 43.65, lon: -79.38 };
  const a = C.candleLighting({ y: 2026, m: 11, d: 3 }, loc);
  assert.deepEqual(a.date, { y: 2026, m: 11, d: 6 });
  assert.equal((a.sunset - a.candles) / 60000, 18);
  const b = C.candleLighting({ y: 2026, m: 11, d: 3 }, { ...loc, offsetMinutes: 30 });
  assert.equal((b.sunset - b.candles) / 60000, 30);
  const j = C.candleLighting({ y: 2026, m: 11, d: 6 }, { lat: 31.78, lon: 35.22, offsetMinutes: C.JERUSALEM_CANDLE_OFFSET_MIN });
  assert.equal((j.sunset - j.candles) / 60000, 40);
  assert.equal(C.JERUSALEM_CANDLE_OFFSET_MIN, 40);
  assert.equal(C.DEFAULT_CANDLE_OFFSET_MIN, 18);
});

test("calendar.js makes no network calls and imports nothing", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("../src/curriculum/calendar.js", import.meta.url), "utf8");
  assert.ok(!/\bfetch\s*\(|XMLHttpRequest|^import /m.test(src.replace(/\/\*[\s\S]*?\*\//g, "")));
});
