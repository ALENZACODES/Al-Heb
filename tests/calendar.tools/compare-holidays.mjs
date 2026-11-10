// Dev tool (not a test; network-free once raw files exist). Compares calendar.js holidays with Hebcal JSON dumps
// written by fetch-hebcal.mjs. Usage: node tests/calendar.tools/compare-holidays.mjs <rawDir>
import fs from "node:fs";
import * as C from "../../src/curriculum/calendar.js";
const dir = process.argv[2];
const MIN_MODERN_YEAR = +(process.argv[3] || 5765); // Yom HaZikaron/HaAtzmaut Monday->Tuesday rule applies from 2004/5
const norm = (s) => s.replace(/[’‘]/g, "'");
let checked = 0, bad = 0;
const fail = (...a) => { bad++; if (bad < 40) console.log("MISMATCH", ...a); };
for (const f of fs.readdirSync(dir).sort()) {
  const [ys, mode] = f.replace(".json", "").split("-"); const y = +ys;
  const items = JSON.parse(fs.readFileSync(`${dir}/${f}`)).items.filter((i) => i.category !== "parashat");
  const one = (re) => items.find((i) => re.test(norm(i.title)));
  const m = mode === "il" ? "israel" : "reform";
  const mine = Object.fromEntries(C.holidaysInHebrewYear(y, { mode: m }).map((h) => [h.id, h]));
  const trad = mode === "dia" ? Object.fromEntries(C.holidaysInHebrewYear(y, { mode: "traditional" }).map((h) => [h.id, h])) : null;
  const eq = (id, hc, what, got) => { checked++; if (!hc) return fail(y, mode, id, "missing in Hebcal"); if (got !== hc.date) fail(y, mode, what, "mine", got, "hebcal", hc.date); };
  // Hebcal's "Rosh Hashana 5787" title carries the year; Israel mode has 2 days too
  eq("rh", one(/^Rosh Hashana \d+$/), "RH", mine["rosh-hashanah"].start);
  eq("yk", one(/^Yom Kippur$/), "YK", mine["yom-kippur"].start);
  eq("suk", one(/^Sukkot I$/), "Sukkot", mine["sukkot"].start);
  eq("sat", one(/^Shmini Atzeret$/), "ShAtz", mine["shemini-atzeret"].start);
  const c1 = one(/^Chanukah: 1 Candle$/); checked++; if (C.isoDate(C.addDays(C.parseISO(c1.date), 1)) !== mine["hanukkah"].start) fail(y, mode, "Hanukkah start", c1.date, mine["hanukkah"].start);
  eq("han8", one(/^Chanukah: 8th Day$/), "Hanukkah end", mine["hanukkah"].end);
  eq("tub", one(/^Tu BiShvat$/), "TuBiShvat", mine["tu-bishvat"].start);
  eq("pur", one(/^Purim$/), "Purim", mine["purim"].start);
  eq("pes", one(/^Pesach I$/), "Pesach", mine["pesach"].start);
  eq("pes7", one(/^Pesach VII$/), "Pesach7", mine["pesach"].end);
  eq("shav", one(/^Shavuot( I)?$/), "Shavuot", mine["shavuot"].start);
  eq("tbav", one(/^Tish'a B'Av/), "TishaBAv", mine["tisha-bav"].start);
  eq("shoah", one(/^Yom HaShoah$/), "Shoah", mine["yom-hashoah"].start);
  if (y >= MIN_MODERN_YEAR) {
    eq("zik", one(/^Yom HaZikaron$/), "Zikaron", mine["yom-hazikaron"].start);
    eq("atz", one(/^Yom HaAtzma'ut$/), "Atzmaut", mine["yom-haatzmaut"].start);
  }
  if (trad) {
    eq("rh2", one(/^Rosh Hashana II$/), "RH day2", C.isoDate(C.addDays(C.parseISO(trad["rosh-hashanah"].start), 1)));
    eq("st", one(/^Simchat Torah$/), "SimchatTorah", trad["simchat-torah"].start);
    eq("pes8", one(/^Pesach VIII$/), "Pesach8", trad["pesach"].end);
    eq("shav2", one(/^Shavuot II$/), "Shavuot2", trad["shavuot"].end);
  }
  // Rosh Chodesh: Hebcal lists one item per day
  const hcRC = items.filter((i) => i.category === "roshchodesh").map((i) => i.date).sort();
  const myRC = C.roshChodeshInHebrewYear(y).flatMap((r) => r.days === 2 ? [r.start, r.end] : [r.start]).sort();
  checked++; if (JSON.stringify(hcRC) !== JSON.stringify(myRC)) fail(y, mode, "RoshChodesh", hcRC.length, myRC.length, hcRC.filter((d) => !myRC.includes(d)), myRC.filter((d) => !hcRC.includes(d)));
}
console.log(`checked ${checked} comparisons, ${bad} mismatches`);
process.exit(bad ? 1 : 0);
