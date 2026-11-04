import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as C from "../src/curriculum/calendar.js";

const fx = JSON.parse(fs.readFileSync(new URL("../data/calendar/hebcal-fixtures.json", import.meta.url)));
const ymd = (iso) => C.parseISO(iso);
const byId = (list, id) => list.find((h) => h.id === id);

// Independent anchors (calendar facts that are not copied from the Hebcal fixture; see docs/curriculum/calendar-notes.md):
//  - 1 Tishrei 5785 = Thursday 2024-10-03; 1 Tishrei 5786 = Tuesday 2025-09-23 (Rosh Hashanah eves Oct 2 2024 and Sep 22 2025)
//  - 1 Tishrei 5787 = 2026-09-12 and 5788 = 2027-10-02 (torah-box.net, fixtures in tests/curriculum.calendar.test.js)
//  - 25 Kislev 5786 = 2025-12-15 (first Hanukkah candle on the evening of 2025-12-14)
//  - 15 Nisan 5786 = 2026-04-02 (first seder on the evening of 2026-04-01); 15 Nisan 5785 = 2025-04-13

test("Rosh Hashanah 5785..5788 on known dates", () => {
  const rh = (y) => C.isoDate(C.fromRD(C.hebrewNewYearRD(y)));
  assert.equal(rh(5785), "2024-10-03");
  assert.equal(rh(5786), "2025-09-23");
  assert.equal(rh(5787), "2026-09-12");
  assert.equal(rh(5788), "2027-10-02");
  assert.equal(C.weekday(C.fromRD(C.hebrewNewYearRD(5785))), 4); // Thursday
  assert.equal(C.weekday(C.fromRD(C.hebrewNewYearRD(5788))), 6); // Saturday
});

test("Hanukkah and Pesach on known dates", () => {
  assert.equal(byId(C.holidaysInHebrewYear(5786), "hanukkah").start, "2025-12-15");
  assert.equal(byId(C.holidaysInHebrewYear(5786), "hanukkah").eve, "2025-12-14");
  assert.equal(byId(C.holidaysInHebrewYear(5786), "hanukkah").end, "2025-12-22");
  assert.equal(byId(C.holidaysInHebrewYear(5786), "pesach").start, "2026-04-02");
  assert.equal(byId(C.holidaysInHebrewYear(5785), "pesach").start, "2025-04-13");
  assert.equal(byId(C.holidaysInHebrewYear(5787), "hanukkah").start, "2026-12-05");
  assert.equal(byId(C.holidaysInHebrewYear(5787), "pesach").start, "2027-04-22");
  assert.equal(byId(C.holidaysInHebrewYear(5787), "pesach").end, "2027-04-28"); // Reform: 7 days
});

function fxFind(list, re) { return list.find(([t]) => re.test(t)); }

test("every holiday start date for Hebrew years 5785-5790 equals the Hebcal snapshot (reform/diaspora and israel modes)", () => {
  let n = 0;
  for (let y = 5785; y <= 5790; y++) {
    for (const [fxMode, mode] of [["dia", "reform"], ["il", "israel"]]) {
      const hc = fx.holidays[`${y}-${fxMode}`];
      const mine = Object.fromEntries(C.holidaysInHebrewYear(y, { mode }).map((h) => [h.id, h]));
      const eq = (id, re, getter = (m) => m.start) => { const e = fxFind(hc, re); assert.ok(e, `${y} ${fxMode} missing ${re}`); assert.equal(getter(mine[id]), e[1], `${y} ${fxMode} ${id}`); n++; };
      eq("rosh-hashanah", /^Rosh Hashana \d+$/); eq("yom-kippur", /^Yom Kippur$/); eq("sukkot", /^Sukkot I$/);
      eq("shemini-atzeret", /^Shmini Atzeret$/); eq("tu-bishvat", /^Tu BiShvat$/); eq("purim", /^Purim$/); eq("pesach", /^Pesach I$/);
      eq("pesach", /^Pesach VII$/, (m) => m.end); eq("shavuot", /^Shavuot( I)?$/); eq("tisha-bav", /^Tish'a B'Av/);
      eq("yom-hashoah", /^Yom HaShoah$/); eq("yom-hazikaron", /^Yom HaZikaron$/); eq("yom-haatzmaut", /^Yom HaAtzma'ut$/);
      eq("hanukkah", /^Chanukah: 8th Day$/, (m) => m.end);
      const c1 = fxFind(hc, /^Chanukah: 1 Candle$/); assert.equal(mine.hanukkah.eve, c1[1]); n++; // Hebcal's "1 Candle" date is the eve
    }
  }
  assert.ok(n > 150);
});

test("traditional mode: two-day Rosh Hashanah and Shavuot, 8-day Pesach, Simchat Torah separate (Hebcal diaspora snapshot)", () => {
  for (let y = 5785; y <= 5790; y++) {
    const hc = fx.holidays[`${y}-dia`];
    const m = Object.fromEntries(C.holidaysInHebrewYear(y, { mode: "traditional" }).map((h) => [h.id, h]));
    assert.equal(m["rosh-hashanah"].days, 2);
    assert.equal(m["rosh-hashanah"].end, fxFind(hc, /^Rosh Hashana II$/)[1]);
    assert.equal(m["simchat-torah"].start, fxFind(hc, /^Simchat Torah$/)[1]);
    assert.equal(m["shemini-atzeret"].start, fxFind(hc, /^Shmini Atzeret$/)[1]);
    assert.equal(m["pesach"].end, fxFind(hc, /^Pesach VIII$/)[1]);
    assert.equal(m["shavuot"].end, fxFind(hc, /^Shavuot II$/)[1]);
  }
});

test("reform default keeps one Rosh Hashanah day with an optional second; israel mode keeps two", () => {
  assert.equal(byId(C.holidaysInHebrewYear(5787), "rosh-hashanah").optionalExtraDays, 1);
  assert.equal(byId(C.holidaysInHebrewYear(5787, { mode: "israel" }), "rosh-hashanah").days, 2);
  assert.equal(C.holidaysInHebrewYear(5787, { mode: "nonsense" }).length, C.holidaysInHebrewYear(5787).length);
});

test("modern Israeli days: weekday shifts (2025 Sat->3 Iyar, 2028 Mon->6 Iyar, 2029 Fri->4 Iyar)", () => {
  assert.equal(byId(C.holidaysInHebrewYear(5785), "yom-haatzmaut").start, "2025-05-01");
  assert.equal(byId(C.holidaysInHebrewYear(5785), "yom-hazikaron").start, "2025-04-30");
  assert.equal(byId(C.holidaysInHebrewYear(5788), "yom-haatzmaut").start, "2028-05-02");
  assert.equal(byId(C.holidaysInHebrewYear(5789), "yom-haatzmaut").start, "2029-04-19");
  assert.equal(byId(C.holidaysInHebrewYear(5789), "yom-hazikaron").start, "2029-04-18");
});

test("Tisha B'Av moves to 10 Av when 9 Av is Shabbat (5782: 9 Av = Sat 2022-08-06, observed Sun 08-07; Hebcal agrees for 5740-5900 in compare-holidays.mjs)", () => {
  assert.equal(C.isoDate(C.fromHebrew({ year: 5782, month: "av", day: 9 })), "2022-08-06");
  assert.equal(byId(C.holidaysInHebrewYear(5782), "tisha-bav").start, "2022-08-07");
  assert.equal(byId(C.holidaysInHebrewYear(5785), "tisha-bav").start, "2025-08-03"); // 9 Av was Sunday: no move
});

test("Rosh Chodesh matches the Hebcal snapshot day by day, and is one or two days", () => {
  for (let y = 5785; y <= 5790; y++) {
    const mine = C.roshChodeshInHebrewYear(y).flatMap((r) => (r.days === 2 ? [r.start, r.end] : [r.start])).sort();
    assert.deepEqual(mine, [...fx.roshChodesh[`${y}-dia`]].sort(), String(y));
    for (const r of C.roshChodeshInHebrewYear(y)) assert.ok(r.days === 1 || r.days === 2);
  }
  assert.equal(C.roshChodeshInHebrewYear(5787).some((r) => r.month === "tishrei"), false);
  assert.equal(C.roshChodeshInHebrewYear(5787).length, 12); // 13 months in a leap year, minus Tishrei
});

test("holidaysBetween with roshChodesh option and nextHolidays options", () => {
  const l = C.holidaysBetween("2026-11-01", "2026-12-31", { roshChodesh: true }).map((h) => h.id);
  assert.ok(l.includes("rosh-chodesh-kislev") && l.includes("hanukkah") && l.includes("rosh-chodesh-tevet"));
  assert.ok(!C.holidaysBetween("2026-11-01", "2026-12-31").some((h) => h.kind === "roshchodesh"));
  assert.equal(C.nextHolidays("2026-09-20", 2, { mode: "traditional" })[0].id, "yom-kippur");
});

test("Hebrew numerals and year labels", () => {
  assert.equal(C.hebrewNumeral(1), "א׳");
  assert.equal(C.hebrewNumeral(15), "ט״ו");
  assert.equal(C.hebrewNumeral(16), "ט״ז");
  assert.equal(C.hebrewNumeral(30), "ל׳");
  assert.equal(C.hebrewNumeral(29), "כ״ט");
  assert.equal(C.hebrewYearLabel(5787), "תשפ״ז");
  assert.equal(C.hebrewYearLabel(5786), "תשפ״ו");
  assert.throws(() => C.hebrewNumeral(0));
});

test("Gregorian <-> Hebrew round trip over 60 years and month lengths", () => {
  for (let rd = C.toRD({ y: 1990, m: 1, d: 1 }); rd < C.toRD({ y: 2050, m: 1, d: 1 }); rd += 11) {
    const g = C.fromRD(rd);
    assert.deepEqual(C.fromHebrew(C.toHebrew(g)), g);
  }
  assert.deepEqual(C.toHebrew({ y: 2027, m: 3, d: 23 }), { year: 5787, month: "adar2", day: 14 }); // Purim in a leap year
});

test("solar arithmetic: polar night/day return null; equator near the equinox sets about 18:00 local solar time", () => {
  assert.equal(C.sunset({ y: 2026, m: 12, d: 21 }, 80, 0), null);
  assert.equal(C.sunset({ y: 2026, m: 6, d: 21 }, 80, 0), null);
  const s = C.sunset({ y: 2026, m: 3, d: 20 }, 0, 0);
  const minutes = s.getUTCHours() * 60 + s.getUTCMinutes();
  assert.ok(Math.abs(minutes - (18 * 60 + 7)) <= 10, String(minutes));
  assert.equal(C.havdalah({ y: 2026, m: 6, d: 20 }, { lat: 64.15, lon: -21.94 }, { mode: "tzeit" }), null); // Reykjavik midsummer: sun never reaches 8.5 below the horizon
});

test("candle lighting and havdalah agree with the Hebcal snapshot to within 1 minute (10 cities, ~34 weeks each)", () => {
  const locs = JSON.parse(fs.readFileSync(new URL("../data/calendar/locations.json", import.meta.url))).presets;
  const min = (ms) => Math.round(ms / 60000);
  let n = 0, worst = 0;
  for (const [id, t] of Object.entries(fx.times)) {
    const p = locs.find((l) => l.id === id);
    for (const [iso, ms] of t.candles) {
      const mine = C.candleLighting(ymd(iso), { lat: p.lat, lon: p.lon, offsetMinutes: p.candleMinutes });
      worst = Math.max(worst, Math.abs(min(C.floorToMinute(mine.candles)) - min(ms))); n++;
    }
    for (const [iso, ms] of t.havdalahTzeit) { worst = Math.max(worst, Math.abs(min(C.roundToMinute(C.havdalah(ymd(iso), p, { mode: "tzeit", degrees: 8.5 }).havdalah)) - min(ms))); n++; }
    for (const [iso, ms] of t.havdalah50) { worst = Math.max(worst, Math.abs(min(C.roundToMinute(C.havdalah(ymd(iso), p, { mode: "minutes", minutes: 50 }).havdalah)) - min(ms))); n++; }
  }
  assert.ok(n > 800, String(n));
  assert.ok(worst <= 1, `worst difference ${worst} min`);
});

test("saturdayOnOrAfter / havdalah is on the Saturday and after candle lighting + 25h", () => {
  const g = { y: 2026, m: 11, d: 4 };
  const cl = C.candleLighting(g, { lat: 43.65, lon: -79.38 });
  const hv = C.havdalah(g, { lat: 43.65, lon: -79.38 });
  assert.equal(C.weekday(hv.date), 6);
  assert.deepEqual(C.saturdayOnOrAfter(g), hv.date);
  const hours = (hv.havdalah - cl.candles) / 3600000;
  assert.ok(hours > 24 && hours < 26.5, String(hours));
});
