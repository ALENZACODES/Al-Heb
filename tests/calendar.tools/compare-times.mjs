// Dev tool (network): compares candleLighting()/havdalah() with Hebcal for every preset in data/calendar/locations.json,
// every Friday/Saturday between two dates. Usage: node tests/calendar.tools/compare-times.mjs [start=2026-11-06] [end=2027-06-30] [outJson]
import fs from "node:fs";
import * as C from "../../src/curriculum/calendar.js";
const [start = "2026-11-06", end = "2027-06-30", outJson] = process.argv.slice(2);
const locs = JSON.parse(fs.readFileSync(new URL("../../data/calendar/locations.json", import.meta.url)));
const hav = [["tzeit85", "M=on", { mode: "tzeit", degrees: 8.5 }], ["min50", "m=50", { mode: "minutes", minutes: 50 }]];
const minute = (ms) => Math.round(ms / 60000);
const rows = []; let idx = 0;
async function get(url) { for (let t = 0; t < 4; t++) { const r = await fetch(url); if (r.status === 429) { await new Promise((x) => setTimeout(x, 3000)); continue; } if (!r.ok) throw new Error(r.status); return r.json(); } throw new Error("429"); }
async function worker() {
  while (idx < locs.presets.length * hav.length) {
    const k = idx++, p = locs.presets[Math.floor(k / hav.length)], [hid, q, hopt] = hav[k % hav.length];
    const url = `https://www.hebcal.com/hebcal?v=1&cfg=json&c=on&geo=pos&latitude=${p.lat}&longitude=${p.lon}&tzid=${p.tz}&b=${p.candleMinutes}&${q}&start=${start}&end=${end}&maj=off&min=off&mod=off&nx=off&s=off&ss=off&mf=off`;
    const d = await get(url);
    let nC = 0, nH = 0; const diffs = { candles: [], havdalah: [] };
    for (const it of d.items) {
      const day = it.date.slice(0, 10), g = C.parseISO(day), dow = C.weekday(g);
      if (it.category === "candles" && dow === 5) {
        const mine = C.candleLighting(g, { lat: p.lat, lon: p.lon, offsetMinutes: p.candleMinutes });
        nC++; diffs.candles.push(mine ? minute(C.floorToMinute(mine.candles)) - minute(Date.parse(it.date)) : null);
      } else if (it.category === "havdalah" && dow === 6) {
        const mine = C.havdalah(g, { lat: p.lat, lon: p.lon }, hopt);
        nH++; diffs.havdalah.push(mine ? minute(C.roundToMinute(mine.havdalah)) - minute(Date.parse(it.date)) : null);
      }
    }
    rows.push({ id: p.id, hav: hid, nC, nH, ...diffs });
  }
}
await Promise.all([1, 2, 3, 4].map(worker));
const summ = (a) => { const v = a.filter((x) => x != null); const h = {}; v.forEach((x) => (h[x] = (h[x] || 0) + 1)); return { n: a.length, nulls: a.length - v.length, maxAbs: Math.max(0, ...v.map(Math.abs)), hist: h }; };
let worstC = 0, worstH = {};
for (const r of rows.sort((a, b) => a.id.localeCompare(b.id) || a.hav.localeCompare(b.hav))) {
  const c = summ(r.candles), h = summ(r.havdalah);
  if (r.hav === "tzeit85") worstC = Math.max(worstC, c.maxAbs);
  worstH[r.hav] = Math.max(worstH[r.hav] || 0, h.maxAbs);
  console.log(r.id.padEnd(16), r.hav.padEnd(8), "candles n=" + c.n, "max|d|=" + c.maxAbs, JSON.stringify(c.hist), " havdalah n=" + h.n, "nulls=" + h.nulls, "max|d|=" + h.maxAbs, JSON.stringify(h.hist));
}
console.log("WORST candles", worstC, "WORST havdalah", JSON.stringify(worstH));
if (outJson) fs.writeFileSync(outJson, JSON.stringify(rows));
