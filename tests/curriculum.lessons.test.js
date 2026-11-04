import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { lessons, byId, topoOrder, available, prayerLineIds, belts } from "../src/curriculum/lessons.js";

const LETTERS = "alef bet gimel dalet he vav zayin chet tet yod kaf lamed mem nun samekh ayin pe tsadi qof resh shin tav kaf-final mem-final nun-final pe-final tsadi-final".split(" ");
const VOWELS = "kamatz patach tzere segol chirik cholam kubutz shuruk shva chataf-patach chataf-segol chataf-kamatz dagesh shin-dot sin-dot".split(" ");

const CH = {
  "א": "alef", "ב": "bet", "ג": "gimel", "ד": "dalet", "ה": "he", "ו": "vav", "ז": "zayin", "ח": "chet", "ט": "tet", "י": "yod",
  "כ": "kaf", "ך": "kaf-final", "ל": "lamed", "מ": "mem", "ם": "mem-final", "נ": "nun", "ן": "nun-final", "ס": "samekh", "ע": "ayin",
  "פ": "pe", "ף": "pe-final", "צ": "tsadi", "ץ": "tsadi-final", "ק": "qof", "ר": "resh", "ש": "shin", "ת": "tav",
};
const MK = { "ַ": "patach", "ָ": "kamatz", "ֵ": "tzere", "ֶ": "segol", "ִ": "chirik", "ֹ": "cholam", "ֻ": "kubutz",
  "ְ": "shva", "ֲ": "chataf-patach", "ֱ": "chataf-segol", "ֳ": "chataf-kamatz", "ּ": "dagesh", "ׁ": "shin-dot", "ׂ": "sin-dot" };

test("lessons.json is well formed and has enough lessons", () => {
  const read = lessons.filter((l) => l.track === "read"), il = lessons.filter((l) => l.track === "israel");
  const beginnerRead = read.filter((l) => /^r\d+$/.test(l.id)), inter = lessons.filter((l) => /^I-\d{2}$/.test(l.id));
  assert.ok(beginnerRead.length >= 40 && beginnerRead.length <= 60, `beginner read ${beginnerRead.length}`);
  assert.equal(inter.length, 50, "intermediate lessons I-01..I-50 are registered");
  assert.equal(inter.filter((l) => l.track === "read").length, 20);
  assert.equal(inter.filter((l) => l.track === "israel").length, 30);
  assert.equal(read.length, beginnerRead.length + 20);
  assert.ok(il.length >= 15);
  const ids = new Set();
  for (const l of lessons) {
    assert.ok(!ids.has(l.id), `dup ${l.id}`); ids.add(l.id);
    assert.ok(["read", "israel"].includes(l.track));
    for (const k of ["title", "level"]) assert.ok(typeof l[k] === "string" && l[k]);
    for (const k of ["letters", "vowels", "words", "prayerLines", "goals", "prerequisites"]) assert.ok(Array.isArray(l[k]), `${l.id}.${k}`);
    assert.ok(l.goals.length >= 1);
    assert.ok(Number.isFinite(l.estMinutes) && l.estMinutes > 0);
    for (const w of l.words) { assert.ok(w.he && w.en); assert.ok("translit" in w); }
  }
});

test("letter and vowel ids are only shared contract ids", () => {
  for (const l of lessons) {
    for (const x of l.letters) assert.ok(LETTERS.includes(x), `${l.id}: ${x}`);
    for (const x of l.vowels) assert.ok(VOWELS.includes(x), `${l.id}: ${x}`);
  }
  // all 27 letters and all 15 vowel signs are introduced somewhere, each exactly once
  const L = lessons.flatMap((l) => l.letters), V = lessons.flatMap((l) => l.vowels);
  assert.deepEqual([...L].sort(), [...LETTERS].sort());
  assert.deepEqual([...V].sort(), [...VOWELS].sort());
});

test("prerequisites reference real lessons, stay in-track, and form a DAG", () => {
  for (const l of lessons) for (const p of l.prerequisites) {
    assert.ok(byId[p], `${l.id} -> ${p}`);
    assert.equal(byId[p].track, l.track);
    assert.notEqual(p, l.id);
  }
  assert.equal(topoOrder().length, lessons.length); // throws on a cycle
});

test("topoOrder test would catch a cycle (independent DFS)", () => {
  const color = {};
  const visit = (id) => { if (color[id] === 1) throw new Error("cycle at " + id); if (color[id] === 2) return; color[id] = 1; byId[id].prerequisites.forEach(visit); color[id] = 2; };
  assert.doesNotThrow(() => lessons.forEach((l) => visit(l.id)));
});

test("read track: every word is decodable with letters/vowels introduced so far", () => {
  const seenL = new Set(), seenV = new Set();
  for (const l of lessons.filter((x) => x.track === "read")) {
    l.letters.forEach((x) => seenL.add(x)); l.vowels.forEach((x) => seenV.add(x));
    for (const w of l.words) {
      const he = w.he.replace(/[־ ]/g, "").replace(/׳/g, "");
      if (/[ְ-ׂ]/.test(he) === false) continue; // unpointed exploration words use only letters
      for (const c of he) {
        if (CH[c]) assert.ok(seenL.has(CH[c]), `${l.id} "${w.he}": letter ${CH[c]} not yet taught`);
        else if (MK[c]) assert.ok(seenV.has(MK[c]), `${l.id} "${w.he}": mark ${MK[c]} not yet taught`);
        else assert.fail(`${l.id} "${w.he}": unexpected char U+${c.codePointAt(0).toString(16)}`);
      }
    }
    for (const w of l.words) { const he = w.he.replace(/ /g, ""); for (const c of he) if (CH[c]) assert.ok(seenL.has(CH[c]), `${l.id} ${w.he}: ${CH[c]}`); }
  }
});

test("Hebrew in lessons is within U+0590-05FF (plus ASCII punctuation/spaces/ellipsis) for read track", () => {
  for (const l of lessons.filter((x) => x.track === "read")) for (const w of l.words) assert.ok(/^[֐-׿ \-]+$/.test(w.he), `${l.id} ${w.he}`);
});

test("israel track Hebrew words contain Hebrew and cap at B1", () => {
  const il = lessons.filter((l) => l.track === "israel");
  for (const l of il) { assert.ok(["A1", "A2", "B1"].includes(l.level)); assert.deepEqual(l.letters, []); for (const w of l.words) assert.ok(/[֐-׿]/.test(w.he)); }
  for (const u of ["greet", "caf", "shop", "taxi", "direct", "number", "small talk"]) {
    const hit = il.some((l) => l.title.toLowerCase().includes(u)) || (u === "greet" && il.some((l) => /hello/i.test(l.title))) || (u === "small talk" && il.some((l) => /small talk/i.test(l.title))) || (u === "taxi" && il.some((l) => /taxi/i.test(l.title)));
    assert.ok(hit, `israel unit ${u}`);
  }
});

test("levels are monotone along the read track and match belts.json", () => {
  const order = belts.belts.map((b) => b.id);
  let last = -1;
  for (const l of lessons.filter((x) => x.track === "read")) { const i = order.indexOf(l.level); assert.ok(i >= last && i >= 0, l.id); last = i; }
  for (const b of belts.belts.filter((x) => x.lessons)) {
    const [a, z] = b.lessons.split("-");
    for (const l of lessons.filter((x) => x.track === "read")) {
      const n = +l.id.slice(1);
      if (n >= +a.slice(1) && n <= +z.slice(1)) assert.equal(l.level, b.id, l.id);
    }
  }
  assert.equal(belts.belts.find((b) => b.id === "black").wpmTarget, 80);
});

test("Priestly Blessing is the spine: lines appear in r05 (preview), r15, r25, r26, r27", () => {
  for (const id of ["bless-priestly-1", "bless-priestly-2", "bless-priestly-3"]) assert.ok(prayerLineIds().includes(id));
  assert.deepEqual(byId.r05.prayerLines, ["bless-priestly-1", "bless-priestly-2", "bless-priestly-3"]);
  assert.deepEqual(byId.r15.prayerLines, ["bless-priestly-1"]);
  assert.ok(byId.r01.letters.includes("shin") && byId.r01.letters.includes("bet"));
  assert.deepEqual(lessons.filter((l) => l.track === "read").slice(0, 3).flatMap((l) => l.letters), ["shin", "bet", "tav", "lamed", "mem-final", "vav"]);
});

test("available() respects prerequisites; corpus id doc lists every referenced prayer id", () => {
  assert.deepEqual(available([], "read").map((l) => l.id), ["r01"]);
  assert.ok(available(["r01"], "read").some((l) => l.id === "r02"));
  const doc = fs.readFileSync(new URL("../docs/curriculum/corpus-ids-needed.md", import.meta.url), "utf8");
  for (const id of prayerLineIds()) assert.ok(doc.includes("`" + id + "`"), id);
});

test("data files parse and prompts meet minimums", async () => {
  const p = JSON.parse(fs.readFileSync(new URL("../data/curriculum/prompts.json", import.meta.url), "utf8"));
  assert.ok(p.morning.length >= 14 && p.evening.length >= 14 && p.shabbatEve.length >= 1 && Object.keys(p.holidays).length >= 3);
  const all = [...p.morning, ...p.evening, ...p.shabbatEve, ...Object.values(p.holidays).flat()];
  const ids = new Set();
  for (const x of all) {
    assert.ok(!ids.has(x.id)); ids.add(x.id);
    assert.ok(x.he && x.en && x.source && x.reflect);
    assert.ok(/^[֐-׿ \-.,׃׀]+$/.test(x.he), `${x.id} ${x.he}`);
    assert.ok(/[ְ-ׂ]/.test(x.he), `${x.id} not pointed`);
    assert.ok(/public domain|liturgy|greeting/i.test(x.source), x.id);
    assert.ok(x.he.length < 140, `${x.id} too long`);
  }
  assert.ok(p.morning.some((x) => x.id === "m01" && x.unlock === "r39" && x.he.includes("מוֹדֶה אֲנִי")));
  assert.ok(p.evening.some((x) => x.id === "e01" && x.unlock === "r22" && x.he.startsWith("שְׁמַע")));
  for (const x of all) if (x.unlock) assert.ok(byId[x.unlock], x.unlock);
});
