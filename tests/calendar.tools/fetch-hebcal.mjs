// Dev tool: downloads Hebcal JSON (diaspora and Israel schedules, holidays + parashot + Rosh Chodesh) for a range of
// Hebrew years into <outDir>. Network needed; the unit tests never call it.
// Usage: node tests/calendar.tools/fetch-hebcal.mjs <outDir> [fromYear=5740] [toYear=5900]
import fs from "node:fs";
const [outDir, from = "5740", to = "5900"] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const jobs = [];
for (let y = +from; y <= +to; y++) for (const il of [0, 1]) jobs.push([y, il]);
let idx = 0, fails = 0;
async function worker() {
  while (idx < jobs.length) {
    const [y, il] = jobs[idx++];
    const f = `${outDir}/${y}-${il ? "il" : "dia"}.json`;
    if (fs.existsSync(f)) continue;
    const url = `https://www.hebcal.com/hebcal?v=1&cfg=json&year=${y}&yt=H&s=on&i=${il ? "on" : "off"}&maj=on&min=on&mod=on&nx=on&mf=on&ss=on&c=off&lg=s`;
    for (let t = 0; t < 4; t++) {
      try {
        const r = await fetch(url);
        if (r.status === 429) { await new Promise((r) => setTimeout(r, 3000)); continue; }
        if (!r.ok) throw new Error(r.status);
        const d = await r.json();
        fs.writeFileSync(f, JSON.stringify({ title: d.title, items: d.items.map(({ title, date, hdate, category, subcat, hebrew, yomtov, link }) => ({ title, date, hdate, category, subcat, hebrew, yomtov, link })) }));
        break;
      } catch (e) { if (t === 3) { fails++; console.error("fail", y, il, String(e)); } }
    }
  }
}
await Promise.all([1, 2, 3, 4].map(worker));
console.log("done, failures:", fails);
