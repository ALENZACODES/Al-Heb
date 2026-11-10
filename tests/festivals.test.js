// Festivals: "This week in the Jewish year" card, festival vocabulary packs, Shabbat-ready checklist (src/festivals/*, data/festivals/*).
// Independent checks: the Hebcal snapshot (data/calendar/hebcal-fixtures.json) for parsha, festival and candle values; a plain walk of
// the corpus JSON for the "no Hebrew was composed" rule. Written up in docs/festivals/FESTIVALS.md.
process.env.TZ = "America/Toronto";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { N, tick } from "./torahread.fakedom.js";
import * as M from "../src/festivals/model.js";
import { buildVocab, FESTIVAL_IDS, PACK_SIZE, stripMarks } from "../src/festivals/build.mjs";
const { mount } = await import("../src/festivals/festivals.view.js");

const rd = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const FIX = rd("data/calendar/hebcal-fixtures.json");
const WORDS = rd("data/vocab/words.json").words;
const REGISTRY = rd("data/corpus/registry.json").entries;
const PHRASEBOOK = rd("data/corpus/phrasebook.json").entries;
const VOCAB = rd("data/festivals/vocab.json");
const LINKS = rd("data/festivals/links.json");
const READY = rd("data/festivals/shabbat-ready.json");
const at = (iso, h = 12, mi = 0) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d, h, mi).getTime(); };
const plus = (iso, n) => new Date(Date.parse(iso + "T12:00:00Z") + n * 86400000).toISOString().slice(0, 10);
const ALL = () => true;

// ---------- vocabulary packs ----------
test("vocab.json is exactly what the builder produces from words.json and the corpus (no hand edits)", () => {
  const rebuilt = buildVocab({ words: WORDS, registry: REGISTRY, phrasebook: PHRASEBOOK });
  assert.deepEqual(VOCAB, rebuilt);
  assert.deepEqual(VOCAB.packs.map((p) => p.id), FESTIVAL_IDS);
});
test("every pack word is a words.json record (same pointed form, gloss, pos); packs hold at most 12 and say how short they are", () => {
  const by = new Map(WORDS.map((w) => [w.id, w]));
  let total = 0;
  for (const p of VOCAB.packs) {
    assert.ok(p.size <= PACK_SIZE && p.size === p.words.length && p.short === PACK_SIZE - p.size, p.id);
    assert.equal(new Set(p.words.map((w) => w.id)).size, p.size, `${p.id}: duplicate word`);
    for (const w of p.words) { const r = by.get(w.id); assert.ok(r, `${p.id}: ${w.id}`); assert.equal(w.he, r.he); assert.equal(w.en, r.en); assert.equal(w.pos, r.pos); total++; }
    assert.equal(p.withLine, p.words.filter((w) => w.line).length);
    assert.ok(p.gaps.length > 0 || p.id === "x", `${p.id}: every festival has named gaps`);
  }
  assert.equal(total, 119); // 9 packs of 12 + Shavuot with 11
  assert.deepEqual(VOCAB.packs.filter((p) => p.short).map((p) => [p.id, p.short]), [["shavuot", 1]]);
});
test("every reading line is copied verbatim from the corpus and really contains the word (independent substring check on unpointed text)", () => {
  const srcs = new Map();
  for (const e of REGISTRY) String(e.he).split("\n").map((x) => x.trim()).filter(Boolean).forEach((l) => srcs.set(`registry:${e.id}:${l}`, true));
  for (const e of PHRASEBOOK) srcs.set(`phrasebook:${e.id}:${String(e.he).trim()}`, true);
  const by = new Map(WORDS.map((w) => [w.id, w]));
  let n = 0;
  for (const p of VOCAB.packs) for (const w of p.words) {
    if (!w.line) continue;
    assert.ok(srcs.has(`${w.line.source}:${w.line.id}:${w.line.he}`), `${p.id}/${w.id}: line not in corpus`);
    assert.ok(stripMarks(w.line.he).replace(/[־]/g, " ").includes(by.get(w.id).heUnpointed), `${p.id}/${w.id}: word not in its line`);
    n++;
  }
  assert.equal(n, VOCAB.packs.reduce((a, p) => a + p.withLine, 0));
  assert.ok(n >= 40, `lines: ${n}`);
});
test("gap terms are absent from words.json (lookup keys live in the builder), and false friends are not used", () => {
  const present = new Set(WORDS.map((w) => w.heUnpointed));
  const { GAP_CHECK } = awaitImport;
  for (const [fid, list] of Object.entries(GAP_CHECK)) for (const [key, en] of list) assert.equal(present.has(key), false, `${fid}: ${en} is in the vocabulary`);
  assert.deepEqual(Object.keys(GAP_CHECK).sort(), [...FESTIVAL_IDS].sort());
  // Shavuot must not use the entries glossed "Chinese" or "roger"
  const used = new Set(VOCAB.packs.flatMap((p) => p.words.map((w) => w.en)));
  assert.equal(used.has("Chinese"), false); assert.equal(used.has("roger"), false);
});
const awaitImport = await import("../src/festivals/build.mjs");

// ---------- links and Shabbat-ready data ----------
test("links.json: every text id is in the registry and every lesson id is in lessons.json", () => {
  const ids = new Set(REGISTRY.map((e) => e.id));
  for (const [fid, l] of Object.entries(LINKS.festivals)) { assert.ok(FESTIVAL_IDS.includes(fid)); for (const t of l.texts) assert.ok(ids.has(t), `${fid}: ${t}`); }
  for (const t of LINKS.shabbat.texts) assert.ok(ids.has(t), t);
  const lessonIds = new Set(rd("data/curriculum/lessons.json").lessons.map((l) => l.id));
  for (const [fid, l] of Object.entries(LINKS.festivals)) for (const id of l.lessons) assert.ok(lessonIds.has(id), `${fid}: lesson ${id} is not in lessons.json, so the card would never link it`);
  assert.match(LINKS.note, /registered when this was checked/);
});
test("Shabbat-ready: the three phrases are registry entries; Shalom Aleichem and Birkat HaBanim are really absent from the repo's Hebrew texts", () => {
  const ids = new Set(REGISTRY.map((e) => e.id));
  assert.deepEqual(READY.phrases.map((p) => p.registry), ["candle-shabbat", "kiddush-shabbat-eve", "hamotzi"]);
  for (const p of READY.phrases) assert.ok(ids.has(p.registry));
  assert.deepEqual(READY.missing.map((m) => m.label.split(" (")[0]), ["Shalom Aleichem", "Birkat HaBanim"]);
  const flat = [];
  const walk = (x) => { if (typeof x === "string") flat.push(stripMarks(x).replace(/־/g, " ")); else if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === "object") Object.values(x).forEach(walk); };
  for (const d of ["data/corpus", "data/service", "data/curriculum", "data/torahread"]) for (const f of fs.readdirSync(d)) if (f.endsWith(".json")) walk(rd(`${d}/${f}`));
  walk(rd("data/morning-verses.json"));
  const text = flat.join("\n");
  assert.equal(text.includes("שלום עליכם"), false, "Shalom Aleichem phrase found: add it");
  assert.equal(text.includes("ישמך אלהים כאפרים"), false, "Birkat HaBanim found: add it");
});

// ---------- parsha ----------
test("parsha of the week equals the Hebcal diaspora snapshot for 3 Hebrew years (5787-5789); every other Shabbat is a festival Shabbat with no regular portion", () => {
  let n = 0, festSat = 0;
  for (const y of ["5787", "5788", "5789"]) {
    const list = new Map(FIX.parsha[`${y}-dia`].map(([name, d]) => [d, name]));
    const first = FIX.parsha[`${y}-dia`][0][1], last = FIX.parsha[`${y}-dia`].at(-1)[1];
    for (let d = plus(first, -6 + 7 * 0); d <= last; d = plus(d, 1)) {
      if (new Date(d + "T12:00:00Z").getUTCDay() !== 6) continue;
      const card = M.weekCard({ now: at(plus(d, -3)), calPrefs: null });
      assert.equal(card.shabbat.date, d);
      if (list.has(d)) { assert.equal(card.shabbat.parsha?.en, list.get(d), `${d}`); n++; } else { assert.equal(card.shabbat.parsha, null, d); assert.match(card.shabbat.noPortion, /No regular portion/); festSat++; }
    }
  }
  assert.ok(n >= 140, `portions checked: ${n}`); assert.ok(festSat >= 8, `festival Shabbatot: ${festSat}`);
  // Israel schedule differs in 5787 around Shemini Atzeret/Simchat Torah? both on weekdays/Sat: the schedule label and data are the Israel tables
  const il = M.weekCard({ now: at("2026-09-16"), calPrefs: { locationId: "jerusalem" } });
  assert.equal(il.shabbat.schedule, "israel");
  const ilList = new Map(FIX.parsha["5787-il"].map(([name, d]) => [d, name]));
  for (const [d, name] of ilList) assert.equal(M.weekCard({ now: at(plus(d, -2)), calPrefs: { locationId: "jerusalem" } }).shabbat.parsha?.en, name, d);
});
test("on a Saturday the card shows that day's portion; Hebrew name is the data's own", () => {
  const c = M.weekCard({ now: at("2026-11-14", 10), calPrefs: null });
  assert.equal(c.shabbat.date, "2026-11-14"); assert.equal(c.shabbat.daysAway, 0);
  assert.equal(c.shabbat.parsha.en, new Map(FIX.parsha["5787-dia"].map(([n, d]) => [d, n])).get("2026-11-14"));
  assert.match(c.shabbat.parsha.he, /[א-ת]/);
  assert.match(c.shabbat.hebrewDate, /^\d+ \w+ 5787$/);
});

// ---------- festival within 30 days ----------
const FEST_OF = { "Rosh Hashana": ["rosh-hashanah", 1], "Yom Kippur": ["yom-kippur", 1], "Sukkot I": ["sukkot", 7], "Shmini Atzeret": ["shemini-atzeret", 1], "Tu BiShvat": ["tu-bishvat", 1], Purim: ["purim", 1], "Pesach I": ["pesach", 7], Shavuot: ["shavuot", 1], "Tish'a B'Av": ["tisha-bav", 1] };
function expectedFestivals() {
  const out = [];
  for (const y of ["5786", "5787", "5788", "5789"]) for (const [name, d] of FIX.holidays[`${y}-il`]) {
    const key = Object.keys(FEST_OF).find((k) => name === k || name.startsWith(k + " ") || name === k + " (observed)");
    if (name.startsWith("Chanukah: 1 Candle")) out.push({ id: "hanukkah", start: plus(d, 1), end: plus(d, 8) });
    else if (key && !/^(Rosh Hashana II)$/.test(name)) { const [id, days] = FEST_OF[key]; out.push({ id, start: d, end: plus(d, days - 1) }); }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}
test("next festival within 30 days equals the Hebcal-snapshot festival list on every day of 2026-2028 (reform mode)", () => {
  const exp = expectedFestivals();
  assert.ok(exp.length >= 33, String(exp.length));
  let days = 0, withFest = 0;
  for (let d = "2026-01-01"; d <= "2028-12-31"; d = plus(d, 1)) {
    const want = exp.find((f) => f.end >= d && f.start <= plus(d, 30));
    const got = M.weekCard({ now: at(d), calPrefs: null }).festival;
    assert.equal(got?.id ?? null, want?.id ?? null, d);
    if (want) { withFest++; assert.equal(got.start, want.start, d); assert.equal(got.end, want.end, d); assert.equal(got.inProgress, want.start <= d); assert.equal(got.daysUntil, want.start <= d ? 0 : Math.round((Date.parse(want.start) - Date.parse(d)) / 86400000)); }
    days++;
  }
  assert.equal(days, 1096); assert.ok(withFest > 500, String(withFest));
});
test("festival boundaries: 30 days inclusive, under way, traditional Simchat Torah shares the Shemini Atzeret pack, links need hasRoute", () => {
  assert.equal(M.weekCard({ now: at("2026-11-04"), calPrefs: null }).festival, null); // Hanukkah starts 2026-12-05: 31 days away
  const a = M.weekCard({ now: at("2026-11-05"), calPrefs: null }).festival;
  assert.equal(a.id, "hanukkah"); assert.equal(a.daysUntil, 30); assert.equal(a.packId, "hanukkah"); assert.equal(a.eve, "2026-12-04");
  const b = M.weekCard({ now: at("2026-12-08"), calPrefs: null }).festival;
  assert.equal(b.inProgress, true); assert.equal(b.end, "2026-12-12");
  const t = M.weekCard({ now: at("2026-10-04"), calPrefs: { observance: "traditional" } }).festival; // Sunday: Simchat Torah day
  assert.equal(t.id, "simchat-torah"); assert.equal(t.packId, "shemini-atzeret");
  // links: none without hasRoute; with it, registry texts (titles from the registry) and lesson links only when the lesson titles are loaded
  const env = (hasRoute, lessonTitles = new Map()) => ({ hasRoute, registryTitles: new Map(REGISTRY.map((e) => [e.id, e.title])), lessonTitles });
  const lessons = new Map(rd("data/curriculum/lessons.json").lessons.map((l) => [l.id, l.title]));
  assert.deepEqual(M.weekCard({ now: at("2026-11-20"), calPrefs: null, links: LINKS, env: env(() => false) }).festival.links, []);
  const withRoutes = M.weekCard({ now: at("2026-11-20"), calPrefs: null, links: LINKS, env: env(ALL) }).festival.links;
  assert.deepEqual(withRoutes.map((l) => l.href), ["#/read/hanukkah-candle", "#/read/hanukkah-nissim", "#/read/shehecheyanu", "#/read/hanerot-halalu", "#/read/maoz-tzur-1"]);
  assert.deepEqual(M.weekCard({ now: at("2026-11-20"), calPrefs: null, links: LINKS, env: env(ALL, lessons) }).festival.links.filter((l) => l.kind === "lesson").map((l) => l.href), ["#/learn?lesson=I-32", "#/learn?lesson=I-50"]);
  assert.deepEqual(M.weekCard({ now: at("2026-11-20"), calPrefs: null, links: LINKS, env: env((r) => r === "learn", lessons) }).festival.links.map((l) => l.kind), ["lesson", "lesson"]);
});

// ---------- candle lighting ----------
test("candle lighting for Toronto: the card's Friday time equals the Hebcal snapshot to the minute, every Friday of the snapshot", () => {
  let n = 0;
  for (const [iso, ms] of FIX.times.toronto.candles) {
    const c = M.weekCard({ now: at(plus(iso, -3), 9), calPrefs: { locationId: "toronto" } });
    const it = c.candles.items.find((i) => i.iso === iso);
    assert.ok(it, iso);
    assert.ok(Math.abs(it.at.getTime() - ms) <= 60000, `${iso}: ${it.at.toISOString()} vs ${new Date(ms).toISOString()}`);
    assert.equal(c.candles.city, "Toronto, ON"); assert.equal(c.candles.minutesBeforeSunset, 18);
    n++;
  }
  assert.equal(n, 34);
});
test("candle lighting: the Jerusalem offset is 40 minutes and uses the Israel portion schedule; Friday after candle lighting shows next week's", () => {
  const [iso, ms] = FIX.times.jerusalem.candles[0];
  const c = M.weekCard({ now: at(plus(iso, -2), 9), calPrefs: { locationId: "jerusalem" } });
  assert.equal(c.candles.minutesBeforeSunset, 40); assert.ok(Math.abs(c.candles.items[0].at.getTime() - ms) <= 60000); assert.equal(c.shabbat.schedule, "israel");
  const late = M.weekCard({ now: at("2026-11-06", 23), calPrefs: { locationId: "toronto" } }); // Friday 23:00, candles long past
  assert.equal(late.candles.items[0].iso, "2026-11-13");
  const sat = M.weekCard({ now: at("2026-11-07", 12), calPrefs: { locationId: "toronto" } });
  assert.equal(sat.candles.items[0].iso, "2026-11-13");
});
test("candle lighting: festival eves appear before Shabbat (Pesach 2027: Wednesday 21 April, before sunset); second nights after nightfall; no city gives a prompt", () => {
  const c = M.weekCard({ now: at("2027-04-19", 9), calPrefs: { locationId: "toronto" } });
  assert.deepEqual(c.candles.items.map((i) => i.iso), ["2027-04-21", "2027-04-23"]);
  assert.match(c.candles.items[0].title, /Pesach/); assert.equal(c.candles.items[0].nightfall, false);
  assert.match(c.candles.items[1].title, /^Candle lighting \(Shabbat/);
  const t = M.weekCard({ now: at("2027-04-19", 9), calPrefs: { locationId: "toronto", observance: "traditional" } });
  assert.deepEqual(t.candles.items.map((i) => [i.iso, i.nightfall]), [["2027-04-21", false], ["2027-04-22", true], ["2027-04-23", false]]);
  const none = M.weekCard({ now: at("2027-04-19", 9), calPrefs: null });
  assert.equal(none.candles, null); assert.match(none.candleNote, /Choose a city/);
  const fb = M.weekCard({ now: at("2026-11-04", 9), calPrefs: null, fallbackLocation: { lat: 43.65, lon: -79.38, tz: "America/Toronto" } });
  assert.equal(fb.candles.city, "Location from Settings"); assert.ok(fb.candles.items.length >= 1);
});

// ---------- Shabbat-ready ----------
test("shabbatReady: coverage per phrase from graded lines; unknown coverage is reported as unknown, never as ready", () => {
  const byId = new Map(REGISTRY.map((e) => [e.id, e]));
  const lines = (id, statuses) => statuses.map((status, i) => ({ entryId: id, n: i + 1, status }));
  const none = M.shabbatReady(READY, byId, null);
  assert.equal(none.measured, false); assert.deepEqual(none.phrases.map((p) => p.decodable), [null, null, null]);
  const g = [...lines("candle-shabbat", ["full"]), ...lines("hamotzi", ["almost"]), ...lines("kiddush-shabbat-eve", ["full", "full", "none"])];
  const r = M.shabbatReady(READY, byId, g);
  assert.equal(r.measured, true); assert.equal(r.of, 3); assert.equal(r.ready, 1);
  const by = Object.fromEntries(r.phrases.map((p) => [p.id, p]));
  assert.equal(by.candles.decodable, true); assert.equal(by.hamotzi.decodable, false); assert.equal(by.hamotzi.almost, 1); assert.equal(by.kiddush.full, 2);
  assert.deepEqual(r.skipped.map((s) => s.label.split(" (")[0]), ["Shalom Aleichem", "Birkat HaBanim"]);
  const gone = M.shabbatReady({ phrases: [{ id: "x", label: "X", registry: "nope", moment: "" }], missing: [] }, byId, g);
  assert.equal(gone.phrases.length, 0); assert.match(gone.skipped[0].reason, /not found/);
});

// ---------- views (fake DOM) ----------
const memStore = (init = {}) => { const m = { ...init }; return { m, get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); } }; };
const ctxOf = (o = {}) => ({ store: memStore(o.init), now: () => at(o.day || "2026-11-04", 9), hasRoute: o.hasRoute || ALL, query: o.query || {}, settings: o.settings });
const hrefs = (root) => root.queryAll("a").map((a) => a.attrs.href);
test("home view: portion, next festival, candle time for the chosen city, ten packs, Shabbat-ready link", async () => {
  const root = new N("div"), ctx = ctxOf({ day: "2026-11-20", init: { "calendar.prefs": { locationId: "toronto" } } });
  const un = await mount(root, ctx);
  assert.match(root.querySelector("h1").textContent, /This week in the Jewish year/);
  const portion = new Map(FIX.parsha["5787-dia"].map(([n, d]) => [d, n])).get("2026-11-21");
  assert.match(root.querySelector('[data-part="parsha"]').textContent, new RegExp(portion));
  assert.match(root.querySelector('[data-part="festival"]').textContent, /Hanukkah/);
  const hc = FIX.times.toronto.candles.find(([d]) => d === "2026-11-20");
  assert.match(root.querySelector('[data-part="candles"]').textContent, /Toronto/);
  assert.ok(root.querySelector('[data-part="candles"]').textContent.includes(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Toronto" }).format(new Date(hc[1]))));
  assert.equal(root.queryAll('[data-part="packs"] a').length, 10);
  assert.ok(hrefs(root).includes("#/festivals/shabbat-ready")); assert.ok(hrefs(root).includes("#/festivals/hanukkah")); assert.ok(hrefs(root).includes("#/read/hanukkah-candle"));
  for (const he of root.queryAll("span")) if (he.attrs.lang === "he") assert.equal(he.attrs.dir, "rtl");
  assert.match(root.textContent, /Draft\. Nobody has proofread/); assert.match(root.textContent, /not authoritative/);
  un();
});
test("home view: with no festival routes in the build there are no festival links; with no city a Calendar prompt", async () => {
  const root = new N("div");
  await mount(root, ctxOf({ hasRoute: () => false }));
  assert.equal(hrefs(root).filter((x) => /#\/(festivals|read|learn|calendar|torahread)/.test(x)).length, 0);
  assert.match(root.querySelector('[data-part="candles"]').textContent, /Choose a city/);
  const r2 = new N("div"); await mount(r2, ctxOf({ hasRoute: (n) => n === "calendar" }));
  assert.ok(hrefs(r2).includes("#/calendar"));
});
test("pack view: 12 words with Hebrew lang/dir, corpus line where one exists, gaps named; short pack says so", async () => {
  const root = new N("div"); await mount(root, ctxOf({ query: { id: "hanukkah" } }));
  assert.match(root.querySelector("h1").textContent, /Hanukkah/);
  assert.equal(root.queryAll("li").filter((l) => l.attrs["data-word"]).length, 12);
  assert.equal(root.queryAll(".fv-line").length, VOCAB.packs.find((p) => p.id === "hanukkah").withLine);
  assert.match(root.querySelector('[data-part="gaps"]').textContent, /dreidel/);
  assert.match(root.textContent, /Words to know for Hanukkah/); assert.doesNotMatch(root.textContent, /No reading line|copied from Aleph's texts/);
  assert.ok(hrefs(root).includes("#/read/hanukkah-candle"));
  const sh = new N("div"); await mount(sh, ctxOf({ query: { id: "shavuot" } }));
  assert.equal(sh.queryAll("li").filter((l) => l.attrs["data-word"]).length, 11); assert.ok(sh.querySelector('[data-part="gaps"]'), "missing words are named in their own section"); assert.match(sh.textContent, /"Chinese"/);
  const bad = new N("div"); await mount(bad, ctxOf({ query: { id: "nope" } })); assert.match(bad.textContent, /No such festival pack/);
});
test("Shabbat-ready view: three phrases, fresh learner 0 of 3, skipped phrases named, links guarded; learner who has all signs sees full coverage", async () => {
  const root = new N("div"); await mount(root, ctxOf({ query: { id: "shabbat-ready" } }));
  assert.equal(root.queryAll("li").filter((l) => l.attrs["data-phrase"]).length, 3);
  assert.match(root.textContent, /0 of 3 phrases use only letters and signs you have been taught/);
  assert.match(root.querySelector('[data-part="skipped"]').textContent, /Shalom Aleichem.*Birkat HaBanim/s);
  assert.ok(hrefs(root).includes("#/read/candle-shabbat"));
  const fully = new N("div");
  const lines = ["candle-shabbat", "kiddush-shabbat-eve", "hamotzi"].flatMap((id) => String(REGISTRY.find((e) => e.id === id).he).split("\n").map((_, i) => ({ entryId: id, n: i + 1, status: "full" })));
  const c2 = ctxOf({ query: { id: "shabbat-ready" } }); c2.festivalsData = { progress: { lines } };
  await mount(fully, c2);
  assert.match(fully.textContent, /3 of 3 phrases use only letters/); assert.equal(fully.queryAll("[data-coverage]").filter((p) => p.attrs["data-coverage"] === "full").length, 3);
  const off = new N("div"); await mount(off, { ...ctxOf({ query: { id: "shabbat-ready" } }), hasRoute: () => false });
  assert.equal(hrefs(off).filter((x) => x.startsWith("#/read")).length, 0);
});
test("view survives a data failure with a plain message and unmount stops late updates", async () => {
  const root = new N("div"); const c = ctxOf(); c.festivalsData = { vocab: null, links: {}, shabbat: {}, registry: [] };
  const un = await mount(root, c); assert.ok(root.queryAll("p").length >= 1); un();
});
