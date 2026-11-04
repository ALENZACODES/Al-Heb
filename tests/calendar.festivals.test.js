/**
 * P061 stage 2: calendar reminder QA. Every festival in the calendar data (src/curriculum/calendar.js output and the
 * Hebcal snapshot in data/calendar/hebcal-fixtures.json) for 2026-2028 is checked against TWO Hebrew-date computations
 * written here, independently of calendar.js:
 *
 *  (A) The classical arithmetic calendar (molad of Tishrei + the four dehiyyot) in the form published by
 *      Reingold & Dershowitz, "Calendrical Calculations", Software: Practice and Experience 20(9), 1990, pp. 899-928
 *      (the hebrew-calendar-elapsed-days function also shipped in GNU Emacs cal-hebrew.el). Molad constants: months
 *      elapsed = floor((235y - 234)/19); parts 204 + 793*(months mod 1080); hours 5 + 12*months + 793*floor(months/1080)
 *      + floor(parts/1080); dehiyyot: molad zaken (parts >= 19440), GaTaRaD (Tuesday, parts >= 9924, common year),
 *      BeTU'TaKPaT (Monday, parts >= 16789, after a leap year), lo ADU Rosh (never Sunday, Wednesday, Friday).
 *      calendar.js uses the later Dershowitz & Reingold formulation (noon rule + 356/382-day year delays), so the two
 *      agree only if both are right.
 *  (B) Gauss's formula for the date of Pesach (C. F. Gauss, "Berechnung des jüdischen Osterfestes", Monatliche
 *      Correspondenz, 1802) in the Gregorian form given by Jean Meeus, "Astronomical Algorithms", 2nd ed., Willmann-Bell
 *      1998, chapter 9 "Jewish and Moslem Calendars". Every other festival follows from 15 Nisan by fixed day counts
 *      (1 Tishrei = 15 Nisan + 163; 6 Sivan = 15 Nisan + 50; 14 Adar [II] = 15 Nisan - 30) and from the year length
 *      (the next 15 Nisan - this one) for Hanukkah and Tu BiShvat.
 *
 * The epoch constant of (A) (R.D. of 1 Tishrei = elapsed - 1373428) and the constants of (B) were checked against the
 * Hebcal snapshot for Hebrew years 5785-5790 in this file; neither algorithm was tuned to calendar.js.
 *
 * Candle-lighting offsets by city are checked against the same snapshot, through the reminders path, and against a
 * third solar computation (the "sunrise equation", Wikipedia article of that name; accuracy about 1-2 minutes).
 *
 * Written up in docs/qa/CALENDAR-QA.md. Stage 5 fixed the two reminders.js defects found here; their tests are at the end.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as C from "../src/curriculum/calendar.js";
import * as R from "../src/curriculum/reminders.js";
import * as L from "../src/curriculum/calendar.locations.js";
import { yomTovDates } from "../src/curriculum/streak.js";

const FIX = JSON.parse(fs.readFileSync("data/calendar/hebcal-fixtures.json", "utf8"));
const LOCS = JSON.parse(fs.readFileSync("data/calendar/locations.json", "utf8")).presets;
const mod = (a, n) => ((a % n) + n) % n;
const MS_DAY = 86400000;
const rdOfISO = (iso) => { const [y, m, d] = iso.split("-").map(Number); return Math.round(Date.UTC(y, m - 1, d) / MS_DAY) + 719163; };
const isoOfRD = (rd) => new Date((rd - 719163) * MS_DAY).toISOString().slice(0, 10);
const plus = (iso, n) => isoOfRD(rdOfISO(iso) + n);
const dow = (iso) => mod(rdOfISO(iso), 7); // 0 = Sunday (R.D. 1 is a Monday)

// ---------- (A) molad + dehiyyot ----------
const isLeap = (y) => mod(7 * y + 1, 19) < 7;
function elapsedDays(y) {
  const months = Math.floor((235 * y - 234) / 19);
  const partsElapsed = 204 + 793 * mod(months, 1080);
  const hoursElapsed = 5 + 12 * months + 793 * Math.floor(months / 1080) + Math.floor(partsElapsed / 1080);
  let day = 1 + 29 * months + Math.floor(hoursElapsed / 24);
  const parts = 1080 * mod(hoursElapsed, 24) + mod(partsElapsed, 1080);
  if (parts >= 19440 || (mod(day, 7) === 2 && parts >= 9924 && !isLeap(y)) || (mod(day, 7) === 1 && parts >= 16789 && isLeap(y - 1))) day += 1;
  if (mod(day, 7) === 0 || mod(day, 7) === 3 || mod(day, 7) === 5) day += 1;
  return day;
}
const roshHashanahRD = (y) => elapsedDays(y) - 1373428;
const yearLength = (y) => roshHashanahRD(y + 1) - roshHashanahRD(y);
/** Month lengths in civil order from Tishrei. */
function monthsA(y) {
  const len = yearLength(y), leap = isLeap(y);
  const cheshvan = len === 355 || len === 385 ? 30 : 29, kislev = len === 353 || len === 383 ? 29 : 30;
  assert.ok([353, 354, 355, 383, 384, 385].includes(len), `year ${y} length ${len}`);
  const out = [["tishrei", 30], ["cheshvan", cheshvan], ["kislev", kislev], ["tevet", 29], ["shevat", 30]];
  if (leap) out.push(["adar1", 30], ["adar2", 29]); else out.push(["adar", 29]);
  out.push(["nisan", 30], ["iyar", 29], ["sivan", 30], ["tammuz", 29], ["av", 30], ["elul", 29]);
  return out;
}
function toHebrewA(iso) {
  const rd = rdOfISO(iso);
  let y = Math.floor((rd + 1373428) / 365.25) + 1; // rough, then correct
  while (roshHashanahRD(y) > rd) y--;
  while (roshHashanahRD(y + 1) <= rd) y++;
  let left = rd - roshHashanahRD(y);
  for (const [month, days] of monthsA(y)) { if (left < days) return { year: y, month, day: left + 1 }; left -= days; }
  throw new Error("unreachable");
}
function fromHebrewA(y, month, day) {
  let rd = roshHashanahRD(y);
  for (const [m, days] of monthsA(y)) { if (m === month) return isoOfRD(rd + day - 1); rd += days; }
  throw new Error(`no ${month} in ${y}`);
}

// ---------- (B) Gauss / Meeus: 15 Nisan in civil year X ----------
function pesachB(X) {
  const Cc = Math.floor(X / 100), S = Math.floor((3 * Cc - 5) / 4); // Gregorian correction (S = 0 would be Julian)
  const a = mod(12 * X + 12, 19), b = mod(X, 4);
  const Q = -1.904412361576 + 1.554241796621 * a + 0.25 * b - 0.003177794022 * X + S;
  const iQ = Math.floor(Q), r = Q - iQ, j = mod(iQ + 3 * X + 5 * b + 2 - S, 7);
  let D;
  if (j === 2 || j === 4 || j === 6) D = iQ + 23;
  else if (j === 1 && a > 6 && r >= 0.632870370) D = iQ + 24;
  else if (j === 0 && a > 11 && r >= 0.897723765) D = iQ + 23;
  else D = iQ + 22;
  return new Date(Date.UTC(X, 2, D)).toISOString().slice(0, 10); // March D, spilling into April
}
/** Festivals of Hebrew year y; y's Pesach falls in civil year y - 3760, its Rosh Hashanah is 163 days after the previous Pesach. */
function festivalsB(y) {
  const pesach = pesachB(y - 3760), pesachNext = pesachB(y - 3759), pesachPrev = pesachB(y - 3761);
  const rh = plus(pesachPrev, 163), rhNext = plus(pesach, 163);
  const len = rdOfISO(rhNext) - rdOfISO(rh);
  const leap = len >= 383, cheshvan = len % 10 === 5 ? 30 : 29, kislev = len % 10 === 3 ? 29 : 30;
  const shoah = (d) => (dow(d) === 5 ? plus(d, -1) : dow(d) === 0 ? plus(d, 1) : d);
  const atzmaut = (d) => (dow(d) === 5 ? plus(d, -1) : dow(d) === 6 ? plus(d, -2) : dow(d) === 1 ? plus(d, 1) : d);
  const tishaBav = plus(rhNext, -51); // 9 Av + 21 (rest of Av) + 1 + 29 (Elul) = 1 Tishrei
  return {
    "rosh-hashanah": rh, "yom-kippur": plus(rh, 9), sukkot: plus(rh, 14), "shemini-atzeret": plus(rh, 21), "simchat-torah": plus(rh, 22),
    hanukkah: plus(rh, 30 + cheshvan + 24), "tu-bishvat": plus(rh, 30 + cheshvan + kislev + 29 + 14),
    purim: plus(pesach, -30), pesach, "yom-hashoah": shoah(plus(pesach, 12)), "yom-haatzmaut": atzmaut(plus(pesach, 20)), "yom-hazikaron": plus(atzmaut(plus(pesach, 20)), -1),
    shavuot: plus(pesach, 50), "tisha-bav": dow(tishaBav) === 6 ? plus(tishaBav, 1) : tishaBav, _len: len, _leap: leap, _pesachNext: pesachNext,
  };
}

// ---------- (C) sunrise equation (Wikipedia "Sunrise equation") ----------
const rad = (d) => (d * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;
function sunsetC(iso, lat, lon) {
  const jd = rdOfISO(iso) + 1721424.5; // JD at 00:00 UT of the civil date
  const n = Math.ceil(jd - 2451545.0 + 0.0008);
  const Jstar = n - lon / 360;
  const M = mod(357.5291 + 0.98560028 * Jstar, 360);
  const Cc = 1.9148 * Math.sin(rad(M)) + 0.02 * Math.sin(rad(2 * M)) + 0.0003 * Math.sin(rad(3 * M));
  const lambda = mod(M + Cc + 180 + 102.9372, 360);
  const Jtransit = 2451545.0 + Jstar + 0.0053 * Math.sin(rad(M)) - 0.0069 * Math.sin(rad(2 * lambda));
  const sinDecl = Math.sin(rad(lambda)) * Math.sin(rad(23.4397)), decl = Math.asin(sinDecl);
  const cosW = (Math.sin(rad(-0.833)) - Math.sin(rad(lat)) * sinDecl) / (Math.cos(rad(lat)) * Math.cos(decl));
  if (cosW < -1 || cosW > 1) return null;
  const Jset = Jtransit + deg(Math.acos(cosW)) / 360;
  return (Jset - 2440587.5) * MS_DAY; // Unix ms
}

const YEARS = [5786, 5787, 5788, 5789]; // cover every civil day of 2026, 2027 and 2028 (5786 starts 2025-09-23, 5789 ends 2029-09-09)

// ---------- Hebrew dates ----------
test("(A) agrees with the Hebcal snapshot and (B) on Rosh Hashanah and Pesach for 5785-5790 (calibration of the two independent algorithms)", () => {
  for (let y = 5785; y <= 5790; y++) {
    const fx = Object.fromEntries(FIX.holidays[`${y}-il`]);
    assert.equal(isoOfRD(roshHashanahRD(y)), fx[`Rosh Hashana ${y}`], `A: RH ${y}`);
    assert.equal(fromHebrewA(y, "nisan", 15), fx["Pesach I"], `A: Pesach ${y}`);
    assert.equal(pesachB(y - 3760), fx["Pesach I"], `B: Pesach ${y}`);
    assert.equal(festivalsB(y)["rosh-hashanah"], fx[`Rosh Hashana ${y}`], `B: RH ${y}`);
  }
});

test("every civil day 2026-01-01..2028-12-31: calendar.js toHebrew equals (A); month lengths and year lengths equal (B)", () => {
  let n = 0;
  for (let rd = rdOfISO("2026-01-01"); rd <= rdOfISO("2028-12-31"); rd++) {
    const iso = isoOfRD(rd);
    const mine = toHebrewA(iso), theirs = C.toHebrew(C.parseISO(iso));
    assert.deepEqual(theirs, mine, iso); n++;
  }
  assert.equal(n, 1096);
  for (const y of YEARS) {
    const b = festivalsB(y);
    assert.equal(yearLength(y), b._len, `year length ${y}`); assert.equal(C.hebrewYearLength(y), b._len);
    assert.equal(isLeap(y), b._leap); assert.equal(C.isHebrewLeapYear(y), b._leap);
    assert.deepEqual(C.monthsOfYear(y).map((m) => [m.key, m.days]), monthsA(y), `months ${y}`);
  }
});

// ---------- festivals: calendar.js (all three modes) vs (A), (B) and the Hebcal snapshot ----------
const FIX_NAME = { // calendar.js id -> Hebcal title in the snapshot (first day)
  "rosh-hashanah": (y) => `Rosh Hashana ${y}`, "yom-kippur": () => "Yom Kippur", sukkot: () => "Sukkot I", "shemini-atzeret": () => "Shmini Atzeret",
  "simchat-torah": () => "Simchat Torah", hanukkah: () => "Chanukah: 1 Candle", "tu-bishvat": () => "Tu BiShvat", purim: () => "Purim", pesach: () => "Pesach I",
  "yom-hashoah": () => "Yom HaShoah", "yom-hazikaron": () => "Yom HaZikaron", "yom-haatzmaut": () => "Yom HaAtzma'ut", shavuot: (y, mode) => (mode === "traditional" ? "Shavuot I" : "Shavuot"), "tisha-bav": () => "Tish'a B'Av",
};
for (const mode of ["reform", "traditional", "israel"]) {
  test(`festivals 2026-2028, mode ${mode}: start dates equal (A), (B) and Hebcal; day counts and last days as the mode says`, () => {
    let checked = 0;
    for (const y of YEARS) {
      const hols = C.holidaysInHebrewYear(y, { mode });
      // Hebcal titles the postponed fast "Tish'a B'Av (observed)" when 9 Av is a Saturday (5789); normalise the title
      const fx = Object.fromEntries(FIX.holidays[`${y}-${mode === "traditional" ? "dia" : "il"}`].map(([n, d]) => [n.replace(" (observed)", ""), d]));
      const b = festivalsB(y);
      const expectIds = ["rosh-hashanah", "yom-kippur", "sukkot", "shemini-atzeret", "hanukkah", "tu-bishvat", "purim", "pesach", "yom-hashoah", "yom-hazikaron", "yom-haatzmaut", "shavuot", "tisha-bav", ...(mode === "traditional" ? ["simchat-torah"] : [])];
      assert.deepEqual(hols.map((h) => h.id).sort(), expectIds.sort(), `${mode} ${y} ids`);
      for (const h of hols) {
        const start = h.start;
        assert.equal(start, b[h.id], `${mode} ${y} ${h.id} vs Gauss`);
        // Hebcal lists "Chanukah: 1 Candle" on the evening before 25 Kislev (the eve); every other title is the first day
        assert.equal(h.id === "hanukkah" ? h.eve : start, fx[FIX_NAME[h.id](y, mode)], `${mode} ${y} ${h.id} vs Hebcal`);
        // (A) by Hebrew date, with the same weekday rules written again here
        const monthKey = h.id === "purim" ? (isLeap(y) ? "adar2" : "adar") : { "rosh-hashanah": "tishrei", "yom-kippur": "tishrei", sukkot: "tishrei", "shemini-atzeret": "tishrei", "simchat-torah": "tishrei", hanukkah: "kislev", "tu-bishvat": "shevat", pesach: "nisan", "yom-hashoah": "nisan", "yom-hazikaron": "iyar", "yom-haatzmaut": "iyar", shavuot: "sivan", "tisha-bav": "av" }[h.id];
        const dayNo = { "rosh-hashanah": 1, "yom-kippur": 10, sukkot: 15, "shemini-atzeret": 22, "simchat-torah": 23, hanukkah: 25, "tu-bishvat": 15, purim: 14, pesach: 15, "yom-hashoah": 27, "yom-hazikaron": 4, "yom-haatzmaut": 5, shavuot: 6, "tisha-bav": 9 }[h.id];
        let a = fromHebrewA(y, monthKey, dayNo);
        if (h.id === "tisha-bav" && dow(a) === 6) a = plus(a, 1);
        if (h.id === "yom-hashoah") a = dow(a) === 5 ? plus(a, -1) : dow(a) === 0 ? plus(a, 1) : a;
        if (h.id === "yom-haatzmaut" || h.id === "yom-hazikaron") { let az = fromHebrewA(y, "iyar", 5); az = dow(az) === 5 ? plus(az, -1) : dow(az) === 6 ? plus(az, -2) : dow(az) === 1 ? plus(az, 1) : az; a = h.id === "yom-haatzmaut" ? az : plus(az, -1); }
        assert.equal(start, a, `${mode} ${y} ${h.id} vs molad`);
        // day counts per mode and the derived last day
        const days = { reform: { "rosh-hashanah": 1, pesach: 7, shavuot: 1, sukkot: 7, hanukkah: 8 }, israel: { "rosh-hashanah": 2, pesach: 7, shavuot: 1, sukkot: 7, hanukkah: 8 }, traditional: { "rosh-hashanah": 2, pesach: 8, shavuot: 2, sukkot: 7, hanukkah: 8 } }[mode][h.id] ?? 1;
        assert.equal(h.days, days, `${mode} ${y} ${h.id} days`);
        assert.equal(h.end, plus(start, days - 1)); assert.equal(h.eve, plus(start, -1));
        if (h.id === "pesach") { assert.equal(plus(start, 6), fx["Pesach VII"]); if (mode === "traditional") assert.equal(h.end, fx["Pesach VIII"]); }
        if (h.id === "hanukkah") assert.equal(h.end, fx["Chanukah: 8th Day"]);
        if (h.id === "rosh-hashanah" && mode !== "reform") assert.equal(h.end, fx["Rosh Hashana II"]);
        if (h.id === "shavuot" && mode === "traditional") assert.equal(h.end, fx["Shavuot II"]);
        checked++;
      }
    }
    assert.equal(checked, YEARS.length * (mode === "traditional" ? 14 : 13));
  });
}

test("Rosh Hashanah never on Sunday, Wednesday or Friday; Yom Kippur never on Friday or Sunday; Pesach I never on Mon/Wed/Fri (classical rules, 5786-5790)", () => {
  for (let y = 5786; y <= 5790; y++) {
    const rh = isoOfRD(roshHashanahRD(y));
    assert.ok(![0, 3, 5].includes(dow(rh)), rh);
    assert.ok(![0, 5].includes(dow(plus(rh, 9))), `YK ${y}`);
    assert.ok(![1, 3, 5].includes(dow(pesachB(y - 3760))), `Pesach ${y}`);
  }
});

// ---------- candle lighting offsets by city ----------
const fixCities = Object.keys(FIX.times);
test(`candle offsets by city: Hebcal snapshot minus calendar.js sunset equals the preset candleMinutes on every Friday (${fixCities.join(", ")})`, () => {
  const expectedOffset = (p) => (!p.israel ? 18 : p.id === "jerusalem" ? 40 : ["haifa", "zikhron-yaakov"].includes(p.id) ? 30 : 20);
  let n = 0;
  for (const id of fixCities) {
    const p = LOCS.find((l) => l.id === id);
    assert.equal(p.candleMinutes, expectedOffset(p), id);
    for (const [iso, ms] of FIX.times[id].candles) {
      const ss = C.sunset(C.parseISO(iso), p.lat, p.lon);
      const implied = (ss.getTime() - ms) / 60000; // Hebcal floors candle time to the minute, so implied is in [offset, offset + 1)
      assert.ok(implied >= p.candleMinutes - 0.05 && implied < p.candleMinutes + 1.05, `${id} ${iso}: implied offset ${implied.toFixed(2)} vs ${p.candleMinutes}`);
      n++;
    }
  }
  assert.equal(n, 340);
});

test("candle offsets by city through the reminders path: buildReminders for each snapshot city equals Hebcal to the minute, labelled with the city's offset", () => {
  for (const id of fixCities) {
    const prefs = L.normalizePrefs({ locationId: id });
    const p = LOCS.find((l) => l.id === id);
    assert.equal(prefs.candleMinutes, p.candleMinutes, id);
    const { items } = R.buildReminders(prefs, "2026-11-06", "2027-06-30");
    const candles = new Map(items.filter((i) => i.kind === "candles").map((i) => [i.uid.replace("alef-candles-", ""), i]));
    for (const [iso, ms] of FIX.times[id].candles) {
      const it = candles.get(iso);
      assert.ok(it, `${id} ${iso} missing`);
      assert.ok(Math.abs(it.when.at.getTime() - ms) <= 60000, `${id} ${iso}: ${it.when.at.toISOString()} vs ${new Date(ms).toISOString()}`);
      assert.match(it.description, new RegExp(`${p.candleMinutes} minutes before sunset`));
      assert.equal(C.formatTime(it.when.at, p.tz), C.formatTime(new Date(ms), p.tz));
    }
  }
});

test("third computation: the sunrise equation puts sunset within 3 minutes of Hebcal's (snapshot candle time + offset) for all 10 cities", () => {
  let worst = 0, n = 0;
  for (const id of fixCities) {
    const p = LOCS.find((l) => l.id === id);
    for (const [iso, ms] of FIX.times[id].candles) {
      const hebcalSunset = ms + p.candleMinutes * 60000; // floor(candles) + offset: within a minute of the true sunset
      let mine = sunsetC(iso, p.lat, p.lon);
      // the equation's day index can land on the previous/next solar day at large longitudes; take the nearest of three
      mine = [sunsetC(plus(iso, -1), p.lat, p.lon), mine, sunsetC(plus(iso, 1), p.lat, p.lon)].filter((x) => x != null).sort((a, b) => Math.abs(a - hebcalSunset) - Math.abs(b - hebcalSunset))[0];
      const diff = Math.abs(mine - hebcalSunset) / 60000;
      worst = Math.max(worst, diff); n++;
      assert.ok(diff <= 3, `${id} ${iso}: ${diff.toFixed(1)} min`);
    }
  }
  assert.equal(n, 340);
  assert.ok(worst <= 3, `worst ${worst.toFixed(1)} min`);
});

test("locations.json: every preset's offset follows the documented rule (18 outside Israel; Jerusalem 40; Haifa and Zikhron 30; other Israeli cities 20) and suggestCandleMinutes agrees", () => {
  for (const p of LOCS) {
    const expect = !p.israel ? 18 : p.id === "jerusalem" ? 40 : ["haifa", "zikhron-yaakov"].includes(p.id) ? 30 : 20;
    assert.equal(p.candleMinutes, expect, p.id);
    assert.equal(L.suggestCandleMinutes(p.lat, p.lon), expect, `suggest ${p.id}`);
    assert.equal(p.israel, L.looksLikeIsrael(p.lat, p.lon), `israel box ${p.id}`);
    assert.equal(p.tz === "Asia/Jerusalem", p.israel, `tz ${p.id}`);
  }
});

// ---------- festival-eve candle reminders 2026-2028 ----------
const eveItems = (mode, city = "toronto") => {
  const prefs = L.normalizePrefs({ locationId: city, observance: mode });
  const items = [...R.buildReminders(prefs, "2026-01-01", "2027-01-31").items, ...R.buildReminders(prefs, "2027-02-01", "2028-02-29").items, ...R.buildReminders(prefs, "2028-03-01", "2028-12-31").items];
  return items.filter((i) => i.kind === "candles").map((i) => ({ iso: i.uid.replace("alef-candles-", ""), title: i.title, description: i.description, at: i.when.at }));
};
test("reform: a candle-lighting reminder exists on the eve of every first festival day 2026-2028, none on a Saturday, Friday eves merge with Shabbat", () => {
  const items = eveItems("reform");
  const byIso = new Map(items.map((i) => [i.iso, i]));
  for (const h of C.holidaysBetween("2026-01-01", "2028-12-31", { mode: "reform" })) {
    if (h.kind !== "major") continue;
    const it = byIso.get(h.eve);
    assert.ok(it, `${h.id} ${h.start}: no candle reminder on its eve ${h.eve}`);
    assert.ok(it.title.includes(h.en), `${h.id}: ${it.title}`);
    if (dow(h.eve) === 5) assert.match(it.title, /^Candle lighting \(Shabbat and /);
    assert.notEqual(dow(h.eve), 6, `${h.id} ${h.start}: eve on Shabbat (in 2026-2028 no Reform festival starts on a Sunday)`);
  }
  for (const i of items) assert.notEqual(dow(i.iso), 6, `candle reminder on a Saturday: ${i.iso} ${i.title}`);
  for (const i of items) if (dow(i.iso) === 5) assert.match(i.title, /^Candle lighting \(Shabbat/);
});

// Stage 5: reminders.js now builds candle evenings from every Yom Tov day (same set as the streak freeze), and lights after nightfall
// when the evening is Shabbat or itself a Yom Tov day other than Friday.
const lightsAfterNightfall = (iso, mode) => dow(iso) === 6 || (dow(iso) !== 5 && yomTovSet(mode).has(iso));
const yomTovSet = (mode) => yomTovDates("2025-12-01", "2029-01-31", mode);
test("reminders: the eve of the LAST Pesach day (Reform Pesach VII, 20 Nisan: 2026-04-07, 2027-04-27, 2028-04-16) has a candle reminder before sunset", () => {
  const items = new Map(eveItems("reform").map((i) => [i.iso, i]));
  for (const eve of ["2026-04-07", "2027-04-27", "2028-04-16"]) {
    const it = items.get(eve);
    assert.ok(it, `no candle reminder on ${eve} (eve of Pesach VII)`);
    assert.match(it.title, /Pesach/);
    assert.ok(it.at.getTime() < C.sunset(C.parseISO(eve), 43.65, -79.38).getTime(), "first-day eve: before sunset");
  }
});
test("reminders, every mode: a candle reminder on the eve of every Yom Tov day 2026-2028 (the streak-freeze day list); after nightfall when the evening is Shabbat or a Yom Tov day other than Friday, else before sunset", () => {
  for (const mode of ["reform", "traditional", "israel"]) {
    const items = new Map(eveItems(mode).map((i) => [i.iso, i]));
    const yt = [...yomTovSet(mode)].filter((d) => d >= "2026-01-01" && d <= "2028-12-31").sort();
    assert.ok(yt.length >= ({ reform: 21, israel: 24, traditional: 30 })[mode], `${mode}: ${yt.length}`);
    for (const y of yt) {
      const eve = plus(y, -1), it = items.get(eve);
      assert.ok(it, `${mode}: no candle reminder on ${eve} (eve of Yom Tov ${y})`);
      const ss = C.sunset(C.parseISO(eve), 43.65, -79.38).getTime();
      if (lightsAfterNightfall(eve, mode)) {
        assert.ok(it.at.getTime() > ss + 30 * 60000, `${mode} ${eve}: ${it.title} must be after nightfall`);
        assert.match(it.title, dow(eve) === 6 ? /^Candle lighting \(/ : /second night/);
        assert.match(it.description, /existing flame/);
      } else assert.ok(it.at.getTime() < ss, `${mode} ${eve}: ${it.title} must be before sunset`);
    }
    // nothing on a Saturday except those after nightfall, and every Saturday item is a Yom Tov evening
    for (const i of items.values()) if (dow(i.iso) === 6) { assert.ok(yomTovSet(mode).has(plus(i.iso, 1)), i.iso); assert.ok(i.at.getTime() > C.sunset(C.parseISO(i.iso), 43.65, -79.38).getTime()); }
  }
});
test("reminders, traditional mode: Simchat Torah 2026-10-04 and 2027-10-24 follow Shemini Atzeret on Shabbat, so the candles are after Shabbat ends (equal to the Toronto havdalah time), not 18 minutes before sunset", () => {
  const items = new Map(eveItems("traditional").map((i) => [i.iso, i]));
  for (const eve of ["2026-10-03", "2027-10-23"]) {
    const it = items.get(eve);
    assert.match(it.title, /Simchat Torah/);
    const hv = C.roundToMinute(C.havdalah(C.parseISO(eve), { lat: 43.65, lon: -79.38 }).havdalah);
    assert.equal(it.at.getTime(), hv.getTime());
  }
  // second nights: RH II 2026-09-12 (Shabbat), Sukkot II eve 2026-09-26 (Shabbat), Pesach II 2027-04-22, Shavuot II 2027-06-11 (Friday: before sunset)
  assert.match(items.get("2027-04-22").title, /second night/);
  assert.ok(items.get("2027-06-11").at.getTime() < C.sunset(C.parseISO("2027-06-11"), 43.65, -79.38).getTime(), "Shavuot I is a Friday: Shabbat candles before sunset");
});

test("Israel (Jerusalem, israel mode): candle reminder on the eve of every Yom Tov day 2026-2028, first-day eves 40 minutes before sunset, RH II after nightfall, no Simchat Torah or Pesach VIII", () => {
  const prefs = L.normalizePrefs({ locationId: "jerusalem", observance: "israel" });
  const items = new Map([["2026-01-01", "2027-01-31"], ["2027-02-01", "2028-02-29"], ["2028-03-01", "2028-12-31"]].flatMap(([a, b]) => R.buildReminders(prefs, a, b).items).filter((i) => i.kind === "candles").map((i) => [i.uid.replace("alef-candles-", ""), i]));
  const yt = [...yomTovDates("2025-12-01", "2029-01-31", "israel")].filter((d) => d >= "2026-01-01" && d <= "2028-12-31").sort();
  assert.equal(yt.length, 24);
  for (const y of yt) {
    const eve = plus(y, -1), it = items.get(eve);
    assert.ok(it, `no reminder on ${eve}`);
    const ss = C.sunset(C.parseISO(eve), 31.78, 35.22).getTime();
    const at = it.when.at.getTime();
    if (lightsAfterNightfall(eve, "israel")) assert.ok(at > ss + 30 * 60000, `${eve} nightfall`);
    else { assert.ok(at <= ss - 39 * 60000 && at > ss - 41 * 60000, `${eve} 40 min`); assert.match(it.description, /40 minutes before sunset/); }
  }
  // RH II 2026-09-13 (Sunday): its eve Sat 12 Sep is Rosh Hashanah I itself, so the candles are after Shabbat ends
  assert.match(items.get("2026-09-12").title, /Rosh Hashanah/); assert.ok(items.get("2026-09-12").when.at.getTime() > C.sunset(C.parseISO("2026-09-12"), 31.78, 35.22).getTime() + 30 * 60000);
  for (const eve of ["2027-04-22", "2027-04-28", "2026-10-03"]) assert.equal(items.has(eve), false, `${eve}: no Pesach II / VIII / Simchat Torah night in Israel`);
});
