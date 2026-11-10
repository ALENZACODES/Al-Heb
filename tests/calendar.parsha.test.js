import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as C from "../src/curriculum/calendar.js";
import * as P from "../src/curriculum/calendar.parsha.js";

const fx = JSON.parse(fs.readFileSync(new URL("../data/calendar/hebcal-fixtures.json", import.meta.url)));
const { names, dia, il } = P.PARSHA_DATA;

test("data: 53 weekly portions, 14 year types for each schedule, every table entry valid", () => {
  assert.equal(Object.keys(names).length, 53);
  for (const n of Object.values(names)) { assert.ok(n.en && /[\u05D0-\u05EA]/.test(n.he)); assert.ok(!/[\u0591-\u05BD\u05BF-\u05C7]/.test(n.he), "names are unpointed"); }
  for (const t of [dia, il]) {
    assert.equal(Object.keys(t).length, 14);
    for (const [k, seq] of Object.entries(t)) {
      assert.match(k, /^[1246]-(353|354|355|383|384|385)$/);
      for (const e of seq) assert.ok(e === null || (Number.isInteger(e) && e >= 1 && e <= 53) || (Array.isArray(e) && e.length === 2 && e[1] === e[0] + 1));
    }
  }
});

test("parshaOnShabbat matches the Hebcal snapshot for every Shabbat of Hebrew years 5785-5790 (diaspora and Israel)", () => {
  let n = 0;
  for (let y = 5785; y <= 5790; y++) for (const [mode, israel] of [["dia", false], ["il", true]]) {
    const hc = new Map(fx.parsha[`${y}-${mode}`].map(([t, d]) => [d, t.replace(/Ha’azinu/, "Ha'azinu")]));
    for (let rd = C.hebrewNewYearRD(y); rd < C.hebrewNewYearRD(y + 1); rd++) {
      const g = C.fromRD(rd); if (C.weekday(g) !== 6) continue;
      const mine = P.parshaOnShabbat(g, { israel });
      const iso = C.isoDate(g);
      if (hc.has(iso)) { assert.equal(mine?.en, hc.get(iso), `${iso} ${mode}`); n++; } else { assert.equal(mine, null, `${iso} ${mode} should have no portion`); n++; }
    }
  }
  assert.ok(n > 600);
});

test("known weeks: 2026-11-07 Chayei Sara, 2026-11-14 Toldot, 2026-10-10 Bereshit (Hebcal converter showed Chayei Sara for the week of 2026-11-03)", () => {
  assert.equal(P.parshaOnShabbat({ y: 2026, m: 11, d: 7 }).en, "Chayei Sara");
  assert.equal(P.parshaOnShabbat({ y: 2026, m: 11, d: 14 }).en, "Toldot");
  assert.equal(P.parshaOnShabbat({ y: 2026, m: 10, d: 10 }).en, "Bereshit");
  assert.equal(P.parshaOnShabbat({ y: 2026, m: 9, d: 19 }).en, "Ha'azinu");
  assert.equal(P.parshaOnShabbat({ y: 2026, m: 9, d: 12 }), null); // Rosh Hashanah on Shabbat
  const dbl = P.parshaOnShabbat({ y: 2025, m: 5, d: 3 }); // a double portion (Hebcal snapshot: Tazria-Metzora)
  assert.equal(dbl.double, true); assert.equal(dbl.en, "Tazria-Metzora"); assert.deepEqual(dbl.ids, [27, 28].map((n) => n));
  assert.throws(() => P.parshaOnShabbat({ y: 2026, m: 11, d: 6 }), RangeError);
});

// Structural invariants of the Torah-reading cycle, checked independently of Hebcal's data for Hebrew years 5740-5900.
test("invariants for 5740-5900 (both schedules): order, Bereshit after Simchat Torah, Bamidbar before Shavuot, Devarim before Tisha B'Av", () => {
  const lastSaturdayOnOrBefore = (g) => C.addDays(g, -((C.weekday(g) + 1) % 7));
  for (let y = 5740; y <= 5900; y++) for (const israel of [false, true]) {
    const sats = P.shabbatotBetween(C.fromRD(C.hebrewNewYearRD(y)), C.fromRD(C.hebrewNewYearRD(y + 1) - 1), { israel });
    const flat = [];
    const at = {};
    for (const s of sats) if (s.parsha) { flat.push(...s.parsha.ids); at[s.parsha.ids[0]] = s.date; }
    const i1 = flat.indexOf(1);
    assert.ok(i1 >= 0, `${y} Bereshit`);
    // before Bereshit only the end of the previous cycle (Vayeilech 52 and/or Ha'azinu 53)
    for (const id of flat.slice(0, i1)) assert.ok(id === 52 || id === 53, `${y} prefix ${id}`);
    // from Bereshit on: consecutive numbers up to Nitzavim (51) or Vayeilech (52)
    const tail = flat.slice(i1);
    tail.forEach((id, k) => assert.equal(id, k + 1, `${y} sequence at ${k}`));
    assert.ok([51, 52].includes(tail[tail.length - 1]), `${y} ends ${tail[tail.length - 1]}`);
    // Bereshit is the first Shabbat after Simchat Torah (22 Tishrei in Israel, 23 in the diaspora)
    const simchat = C.fromHebrew({ year: y, month: "tishrei", day: israel ? 22 : 23 });
    assert.deepEqual(at[1], C.addDays(simchat, (6 - C.weekday(simchat) + 7) % 7 || 7), `${y} Bereshit date`);
    // Bamidbar is always read before Shavuot (the Shabbat just before it, or 11 days before in some year types);
    // Devarim on the last Shabbat on or before 9 Av (Shabbat Chazon)
    const shavuot = C.fromHebrew({ year: y, month: "sivan", day: 6 });
    const bam = C.toRD(shavuot) - C.toRD(at[Object.keys(names).find((k) => names[k].en === "Bamidbar") * 1]);
    assert.ok(bam >= 1 && bam <= 11, `${y} Bamidbar ${bam} days before Shavuot`);
    const av9 = C.fromHebrew({ year: y, month: "av", day: 9 });
    assert.deepEqual(at[Object.keys(names).find((k) => names[k].en === "Devarim") * 1], lastSaturdayOnOrBefore(av9), `${y} Devarim`);
  }
});

test("shabbatotBetween lists Saturdays only", () => {
  const l = P.shabbatotBetween({ y: 2026, m: 11, d: 1 }, { y: 2026, m: 11, d: 30 });
  assert.deepEqual(l.map((x) => x.date.d), [7, 14, 21, 28]);
});
