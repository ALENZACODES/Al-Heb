// Dev tool (network): snapshots Hebcal values used by tests/calendar.hebcal-fixtures.test.js into
// data/calendar/hebcal-fixtures.json so the unit tests stay offline. Usage: node tests/calendar.tools/make-fixtures.mjs <rawDir>
import fs from "node:fs";
const raw = process.argv[2];
const norm = (s) => s.replace(/[’‘]/g, "'");
const KEEP = /^(Rosh Hashana \d+|Rosh Hashana II|Yom Kippur|Sukkot I|Shmini Atzeret|Simchat Torah|Chanukah: 1 Candle|Chanukah: 8th Day|Tu BiShvat|Purim|Pesach I|Pesach VII|Pesach VIII|Shavuot( I| II)?|Tish'a B'Av.*|Yom HaShoah|Yom HaZikaron|Yom HaAtzma'ut)$/;
const out = { schema: "alef-hebcal-fixtures-1", fetched: new Date().toISOString().slice(0, 10), source: "https://www.hebcal.com/hebcal (JSON API; Hebcal output is CC BY 4.0, credit Hebcal)", holidays: {}, parsha: {}, roshChodesh: {}, times: {} };
for (let y = 5785; y <= 5790; y++) for (const mode of ["dia", "il"]) {
  const items = JSON.parse(fs.readFileSync(`${raw}/${y}-${mode}.json`)).items;
  out.holidays[`${y}-${mode}`] = items.filter((i) => i.category === "holiday" && KEEP.test(norm(i.title))).map((i) => [norm(i.title), i.date]);
  out.parsha[`${y}-${mode}`] = items.filter((i) => i.category === "parashat").map((i) => [norm(i.title).replace(/^Parashat /, ""), i.date]);
  out.roshChodesh[`${y}-${mode}`] = items.filter((i) => i.category === "roshchodesh").map((i) => i.date);
}
const locs = JSON.parse(fs.readFileSync("data/calendar/locations.json")).presets;
for (const id of ["toronto", "new-york", "los-angeles", "chicago", "jerusalem", "haifa", "tel-aviv", "london", "sydney", "miami"]) {
  const p = locs.find((l) => l.id === id);
  const url = (q) => `https://www.hebcal.com/hebcal?v=1&cfg=json&c=on&geo=pos&latitude=${p.lat}&longitude=${p.lon}&tzid=${p.tz}&b=${p.candleMinutes}&${q}&start=2026-11-06&end=2027-06-30&maj=off&min=off&mod=off&nx=off&s=off&ss=off&mf=off`;
  const [a, b] = await Promise.all([fetch(url("M=on")).then((r) => r.json()), fetch(url("m=50")).then((r) => r.json())]);
  const pick = (d, cat, dow) => d.items.filter((i) => i.category === cat && new Date(i.date.slice(0, 10) + "T12:00:00Z").getUTCDay() === dow).map((i) => [i.date.slice(0, 10), Date.parse(i.date)]);
  out.times[id] = { candles: pick(a, "candles", 5), havdalahTzeit: pick(a, "havdalah", 6), havdalah50: pick(b, "havdalah", 6) };
}
fs.writeFileSync("data/calendar/hebcal-fixtures.json", JSON.stringify(out));
console.log("fixtures written", fs.statSync("data/calendar/hebcal-fixtures.json").size, "bytes");
