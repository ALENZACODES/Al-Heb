// Dev tool (network): compares toHebrew() with Hebcal's converter for every day in a Gregorian range.
// Usage: node tests/calendar.tools/compare-dates.mjs [startYear=2024] [endYear=2030]
import * as C from "../../src/curriculum/calendar.js";
const [y0 = "2024", y1 = "2030"] = process.argv.slice(2);
const MONTH = { Tishrei: "tishrei", Cheshvan: "cheshvan", Kislev: "kislev", Tevet: "tevet", "Sh'vat": "shevat", Adar: "adar", "Adar I": "adar1", "Adar II": "adar2", Nisan: "nisan", Iyyar: "iyar", Sivan: "sivan", "Tamuz": "tammuz", Av: "av", Elul: "elul" };
let n = 0, bad = 0;
// the converter returns at most 180 days per call
for (let rd = C.toRD({ y: +y0, m: 1, d: 1 }); rd <= C.toRD({ y: +y1, m: 12, d: 31 }); rd += 170) {
  const a = C.isoDate(C.fromRD(rd)), b = C.isoDate(C.fromRD(Math.min(rd + 169, C.toRD({ y: +y1, m: 12, d: 31 }))));
  const r = await fetch(`https://www.hebcal.com/converter?cfg=json&start=${a}&end=${b}&g2h=1`);
  const d = await r.json();
  for (const [iso, v] of Object.entries(d.hdates)) {
    n++;
    const mine = C.toHebrew(C.parseISO(iso));
    const m = MONTH[v.hm.replace("’", "'")] ?? "??" + v.hm;
    if (mine.year !== v.hy || mine.month !== m || mine.day !== v.hd) { bad++; if (bad < 10) console.log("MISMATCH", iso, mine, v.hy, v.hm, v.hd); }
  }
}
console.log(`compared ${n} days (${y0}-${y1}), ${bad} mismatches`);
process.exit(bad ? 1 : 0);
