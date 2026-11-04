// Dev tool: derives data/calendar/parsha.json (Torah-portion tables for the 14 Hebrew year types, diaspora and
// Israel) from Hebcal JSON dumps (see fetch-hebcal.mjs) and checks that (1) every year of the same type has an
// identical reading sequence and (2) tables learned from years <= 5820 reproduce years 5821-5900 exactly.
// Usage: node tests/calendar.tools/build-parsha.mjs <rawDir> <outFile>
import fs from "node:fs";
import * as C from "../../src/curriculum/calendar.js";
const [dir, out] = process.argv.slice(2);
const norm = (s) => s.replace(/[’‘]/g, "'");
const COMBOS = { "Vayakhel-Pekudei": ["Vayakhel", "Pekudei"], "Tazria-Metzora": ["Tazria", "Metzora"], "Achrei Mot-Kedoshim": ["Achrei Mot", "Kedoshim"], "Behar-Bechukotai": ["Behar", "Bechukotai"], "Chukat-Balak": ["Chukat", "Balak"], "Matot-Masei": ["Matot", "Masei"], "Nitzavim-Vayeilech": ["Nitzavim", "Vayeilech"] };
const names = {}; const parsed = [];
for (const f of fs.readdirSync(dir)) {
  const [y, mode] = f.replace(".json", "").split("-");
  const d = JSON.parse(fs.readFileSync(`${dir}/${f}`));
  parsed.push({ y: +y, mode, d });
  for (const it of d.items) if (it.category === "parashat") {
    const m = /\/s\/\d+\/(\d+)\?/.exec(it.link);
    if (m) names[+m[1]] = { en: norm(it.title).replace(/^Parashat /, ""), he: it.hebrew.replace(/^פרשת /, "") };
  }
}
const byEn = new Map(Object.entries(names).map(([n, v]) => [v.en, +n]));
const resolve = (title) => {
  const en = norm(title).replace(/^Parashat /, "");
  if (byEn.has(en)) return byEn.get(en);
  if (!COMBOS[en]) throw new Error("unknown parasha " + en);
  return COMBOS[en].map((n) => byEn.get(n));
};
function seqOf({ y, d }) {
  const rh = C.hebrewNewYearRD(y), len = C.hebrewYearLength(y), dow = C.weekday(C.fromRD(rh));
  const first = rh + ((6 - dow + 7) % 7);
  const total = Math.ceil((C.hebrewNewYearRD(y + 1) - first) / 7);
  const arr = Array.from({ length: total }, () => null);
  for (const it of d.items) if (it.category === "parashat") arr[(C.toRD(C.parseISO(it.date)) - first) / 7] = resolve(it.title);
  return { key: `${dow}-${len}`, arr };
}
const learn = (rows) => { const t = { dia: {}, il: {} }; const bad = []; for (const r of rows) { const { key, arr } = seqOf(r); const prev = t[r.mode][key]; if (prev && JSON.stringify(prev) !== JSON.stringify(arr)) bad.push([r.y, r.mode, key]); t[r.mode][key] = arr; } return { t, bad }; };
const all = learn(parsed);
console.log("types dia/il:", Object.keys(all.t.dia).length, Object.keys(all.t.il).length, "inconsistent:", all.bad.length);
const train = learn(parsed.filter((r) => r.y <= 5820));
let held = 0, heldBad = 0;
for (const r of parsed.filter((r) => r.y > 5820)) { const { key, arr } = seqOf(r); held++; if (JSON.stringify(train.t[r.mode][key]) !== JSON.stringify(arr)) heldBad++; }
console.log(`held-out years 5821-5900: ${held} year/mode pairs, ${heldBad} differ from tables learned on <=5820`);
if (all.bad.length || heldBad) process.exit(1);
const years = parsed.map((r) => r.y);
const doc = {
  schema: "alef-parsha-1",
  source: "Derived from Hebcal JSON output (hebcal.com/hebcal, parashat items) for Hebrew years " + Math.min(...years) + "-" + Math.max(...years) + ", diaspora and Israel schedules. Not an independent halachic table.",
  tableKey: "<weekday of 1 Tishrei, 0=Sunday>-<days in Hebrew year>",
  tableIndex: "Shabbat ordinal: 0 = first Saturday on or after 1 Tishrei. Entry: parasha number, [a,b] for a double portion, null = no regular portion (festival Shabbat, or 1 Tishrei itself).",
  names: Object.fromEntries(Object.entries(names).map(([n, v]) => [n, v])),
  dia: all.t.dia, il: all.t.il,
};
fs.writeFileSync(out, JSON.stringify(doc));
console.log("wrote", out, fs.statSync(out).size, "bytes");
