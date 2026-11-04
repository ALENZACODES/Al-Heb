import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { transliterate } from "../src/pronunciation/transliterate.js";

// Intermediate lessons I-01..I-50 live in data/curriculum/lessons-intermediate/ and are registered in lessons.json by tools/curriculum/intermediate/register.py
// (see docs/curriculum/INTERMEDIATE.md). The main rule checked here: every Hebrew string in a lesson is either a whole
// entry of, or a composition of whitespace tokens found in, data/vocab/words.json, data/corpus/*.json or data/service/*.json.

const ROOT = new URL("../", import.meta.url);
const readJson = (f) => JSON.parse(fs.readFileSync(new URL(f, ROOT), "utf8"));
const DIR = new URL("data/curriculum/lessons-intermediate/", ROOT);

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
const lessons = files.map((f) => readJson("data/curriculum/lessons-intermediate/" + f));
const index = readJson("data/curriculum/intermediate-index.json");
const main = readJson("data/curriculum/lessons.json");
const registry = readJson("data/corpus/registry.json");
const words = readJson("data/vocab/words.json");
const phrasebook = readJson("data/corpus/phrasebook.json");
const regById = Object.fromEntries(registry.entries.map((e) => [e.id, e]));
const wordById = Object.fromEntries(words.words.map((w) => [w.id, w]));
const phraseById = Object.fromEntries(phrasebook.entries.map((e) => [e.id, e]));

// ---- Hebrew normalisation shared with the authoring check
const HEB = /[א-ת]/;
const TAAM = /[֑-ֽֿׅ֯ׄ]/g;
const PUNCT = /[,.?!:;"'()\[\]׃׀…\-–—״]+/g;
const norm = (s) => s.normalize("NFC").replace(TAAM, "");
const tokens = (s) => norm(s).replace(/־/g, " ").replace(PUNCT, " ").split(/\s+/).filter((t) => HEB.test(t));
const key = (s) => tokens(s).join(" ");

const sourceTokens = new Set(), sourcePhrases = new Set();
function harvest(o) {
  if (typeof o === "string") { if (HEB.test(o)) { for (const t of tokens(o)) sourceTokens.add(t); sourcePhrases.add(key(o)); } }
  else if (Array.isArray(o)) o.forEach(harvest);
  else if (o && typeof o === "object") Object.values(o).forEach(harvest);
}
harvest(words.words);
for (const dir of ["data/corpus", "data/service"]) {
  for (const f of fs.readdirSync(new URL(dir + "/", ROOT)).filter((x) => x.endsWith(".json"))) harvest(readJson(`${dir}/${f}`));
}

/** Every Hebrew-bearing string in a lesson object, with a path for error messages. Registry ids (ASCII) are skipped. */
function hebrewStrings(o, p = "", out = []) {
  if (typeof o === "string") { if (HEB.test(o)) out.push([p, o]); }
  else if (Array.isArray(o)) o.forEach((v, i) => hebrewStrings(v, `${p}[${i}]`, out));
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) hebrewStrings(v, p ? `${p}.${k}` : k, out);
  return out;
}

const TYPES = ["recall", "produce", "match", "order", "respond", "gender", "dialogue", "fade", "spot", "register"];
const IDS = Array.from({ length: 50 }, (_, i) => `I-${String(i + 1).padStart(2, "0")}`);
const byId = Object.fromEntries(lessons.map((l) => [l.id, l]));
const mainIds = new Set(main.lessons.map((l) => l.id));

test("50 lesson files I-01..I-50 exist, one per file, 20 synagogue and 30 Israel", () => {
  assert.deepEqual(files, IDS.map((id) => id + ".json"));
  assert.deepEqual(lessons.map((l) => l.id), IDS);
  assert.equal(lessons.filter((l) => l.unit === "synagogue").length, 20);
  assert.equal(lessons.filter((l) => l.unit === "israel").length, 30);
  assert.deepEqual(lessons.filter((l) => l.unit === "synagogue").map((l) => l.id), [...IDS.slice(0, 10), ...IDS.slice(25, 35)]);
  const reg = main.lessons.filter((l) => l.id.startsWith("I-"));
  assert.deepEqual(reg.map((l) => l.id), IDS, "I-01..I-50 are registered in lessons.json, in order");
  for (const l of reg) assert.deepEqual(l, JSON.parse(fs.readFileSync(new URL(`data/curriculum/lessons-intermediate/${l.id}.json`, ROOT), "utf8")), `${l.id} in lessons.json equals its source file`);
});

test("every lesson keeps the lessons.json shape, is a draft, and has 12-20 exercises", () => {
  for (const l of lessons) {
    for (const k of ["id", "track", "level", "title", "letters", "vowels", "words", "prayerLines", "goals", "estMinutes", "prerequisites"]) assert.ok(k in l, `${l.id}.${k}`);
    assert.equal(l.status, "draft", l.id);
    assert.equal(l.proofread, false, l.id);
    assert.equal(l.needsNativeReview, true, l.id);
    assert.deepEqual(l.letters, []); assert.deepEqual(l.vowels, []);
    assert.ok(typeof l.title === "string" && l.title.length > 8);
    assert.ok(l.goals.length >= 1 && Number.isFinite(l.estMinutes) && l.estMinutes > 0, l.id);
    if (l.unit === "synagogue") { assert.equal(l.track, "read"); assert.equal(l.level, "black"); }
    else { assert.equal(l.track, "israel"); assert.equal(l.level, "B1"); }
    assert.ok(l.words.length >= 8, `${l.id} words`);
    for (const w of l.words) { assert.ok(w.he && w.en && "translit" in w, `${l.id} ${w.he}`); assert.ok(HEB.test(w.he)); }
    assert.ok(l.exercises.length >= 12 && l.exercises.length <= 20, `${l.id}: ${l.exercises.length} exercises`);
    const exIds = new Set();
    for (const ex of l.exercises) {
      assert.ok(ex.id.startsWith(l.id + "-e") && !exIds.has(ex.id), ex.id); exIds.add(ex.id);
      assert.ok(TYPES.includes(ex.type), `${ex.id} type ${ex.type}`);
    }
    assert.ok(new Set(l.exercises.map((e) => e.type)).size >= 4, `${l.id}: too few exercise types`);
    for (const p of l.prayerLines) assert.ok(regById[p], `${l.id} prayer line ${p}`);
    if (l.unit === "synagogue") assert.ok(l.prayerLines.length >= 1, l.id);
  }
});

test("every Hebrew string is a source entry or a composition of source tokens (never invented)", () => {
  let checked = 0;
  for (const l of lessons) {
    for (const [p, s] of hebrewStrings(l)) {
      if (sourcePhrases.has(key(s))) { checked++; continue; }
      const missing = tokens(s).filter((t) => !sourceTokens.has(t));
      assert.deepEqual(missing, [], `${l.id} ${p}: "${s}" has tokens not in any source file`);
      checked++;
    }
  }
  assert.ok(checked > 1000, `only ${checked} Hebrew strings checked`);
});

test("Hebrew is pointed, NFC, and within the Hebrew block plus plain punctuation", () => {
  for (const l of lessons) for (const [p, s] of hebrewStrings(l)) {
    assert.equal(s, s.normalize("NFC"), `${l.id} ${p} not NFC`);
    assert.ok(/^[֐-׿ \-.,?!:;…]+$/.test(s), `${l.id} ${p}: "${s}" has characters outside the Hebrew block`);
    assert.ok(/[ְ-ׇ]/.test(s), `${l.id} ${p}: "${s}" is unpointed`);
  }
});

test("exercise fields are well formed: options, order tokens, gender pairs, dialogues, registers", () => {
  for (const l of lessons) for (const ex of l.exercises) {
    switch (ex.type) {
      case "recall": assert.ok(ex.he && ex.en, ex.id); break;
      case "produce":
        assert.ok(ex.en && ex.options.length >= 3 && ex.answer >= 0 && ex.answer < ex.options.length, ex.id);
        assert.equal(new Set(ex.options.map(key)).size, ex.options.length, `${ex.id} duplicate options`); break;
      case "match": assert.ok(ex.pairs.length >= 3 && ex.pairs.length <= 5 && ex.pairs.every((x) => x.he && x.en), ex.id); break;
      case "order": assert.ok(tokens(ex.he).length >= 3 && ex.en, ex.id); break;
      case "respond": assert.ok(ex.cue && ex.answer.he && ex.answer.en, ex.id); if (ex.prompt) assert.ok(ex.prompt.he, ex.id); break;
      case "gender": assert.ok(ex.m && ex.f && ex.en && ex.m !== ex.f, ex.id); break;
      case "dialogue":
        assert.ok(ex.lines.length >= 2 && ex.lines.length <= 5 && ex.task, ex.id);
        for (const ln of ex.lines) assert.ok(["a", "b"].includes(ln.speaker) && ln.he && ln.en, ex.id); break;
      case "fade": case "spot": {
        const e = regById[ex.line]; assert.ok(e, `${ex.id} line ${ex.line}`);
        const lines = e.he.split("\n"); const li = ex.lineIndex || 1;
        assert.ok(li >= 1 && li <= lines.length, `${ex.id} lineIndex`);
        if (e.lines > 1 && ex.type === "spot") assert.ok(ex.lineIndex, `${ex.id}: multi-line entry needs lineIndex`);
        if (ex.type === "spot") assert.ok(tokens(lines[li - 1]).includes(ex.target), `${ex.id}: target "${ex.target}" not in ${ex.line} line ${li}`);
        if (ex.type === "fade") assert.ok(ex.en, ex.id);
        break;
      }
      case "register":
        assert.ok(ex.options.includes(ex.answer), ex.id);
        const pb = phrasebook.entries.find((e) => key(e.he) === key(ex.he));
        assert.ok(pb, `${ex.id}: register items must be phrasebook lines`);
        assert.equal(ex.answer, pb.register, `${ex.id} register`);
        break;
    }
  }
});

test("word source references resolve; pronunciation equals the project's transliterator output", () => {
  for (const l of lessons) {
    assert.ok(l.pronunciation && l.pronunciation.generatedBy === "src/pronunciation/transliterate.js", l.id);
    const trads = l.unit === "synagogue" ? ["israeli", "sephardi", "ashkenazi"] : ["israeli"];
    assert.deepEqual(l.pronunciation.traditions, trads, l.id);
    for (const w of l.words) {
      assert.equal(w.translit, null, `${l.id} ${w.he}: translit stays null like lessons.json; use pronunciation`);
      assert.deepEqual(Object.keys(w.pronunciation), trads, `${l.id} ${w.he}`);
      for (const t of trads) assert.equal(w.pronunciation[t], transliterate(w.he, { scheme: "siddur", tradition: t }), `${l.id} ${w.he} ${t}`);
      const src = w.source; assert.ok(src, `${l.id} ${w.he} source`);
      if (src.file === "data/vocab/words.json") {
        const [id, form] = src.id.split("#forms.");
        const ent = wordById[id]; assert.ok(ent, `${l.id} ${w.he}: unknown word id ${id}`);
        assert.equal(key(form ? ent.forms[form] : ent.he), key(w.he), `${l.id} ${w.he} != ${src.id}`);
      } else if (src.file === "data/corpus/phrasebook.json") {
        assert.ok(phraseById[src.id] && key(phraseById[src.id].he) === key(w.he), `${l.id} ${w.he} ${src.id}`);
      } else if (src.file === "data/corpus/registry.json") {
        const [id, ln] = src.id.split("#l"); const e = regById[id]; assert.ok(e, src.id);
        assert.equal(key(e.he.split("\n")[(ln ? +ln : 1) - 1]), key(w.he), `${l.id} ${w.he} ${src.id}`);
      } else {
        assert.equal(src.file, "composed", `${l.id} ${w.he}`);
        assert.deepEqual(src.tokens, tokens(w.he));
        for (const t of src.tokens) assert.ok(sourceTokens.has(t), `${l.id} ${w.he}: ${t}`);
      }
    }
  }
});

test("prerequisites reference intermediate or lessons.json ids of the same track and form a DAG", () => {
  for (const l of lessons) for (const p of l.prerequisites) {
    const t = byId[p] || main.lessons.find((x) => x.id === p);
    assert.ok(t, `${l.id} -> ${p}`); assert.equal(t.track, l.track, `${l.id} -> ${p} track`); assert.notEqual(p, l.id);
  }
  assert.deepEqual(byId["I-01"].prerequisites, ["r51"]);
  assert.deepEqual(byId["I-11"].prerequisites, ["il24"]);
  assert.deepEqual(byId["I-36"].prerequisites, ["I-25"]);
  const color = {};
  const visit = (id) => { if (!byId[id]) return; if (color[id] === 1) throw new Error("cycle at " + id); if (color[id] === 2) return; color[id] = 1; byId[id].prerequisites.forEach(visit); color[id] = 2; };
  assert.doesNotThrow(() => lessons.forEach((l) => visit(l.id)));
  // all mentioned lessons.json ids exist
  for (const l of lessons) for (const p of l.prerequisites) if (!byId[p]) assert.ok(mainIds.has(p), p);
});

test("the requested synagogue and Israel topics are all covered by titles", () => {
  const titles = lessons.map((l) => l.title.toLowerCase());
  const want = ["shema", "amidah", "torah service", "kaddish", "kiddush", "havdalah", "hallel", "aleinu", "adon olam", "mi shebeirach",
    "bus and train", "shuk", "cafe", "pharmacy", "directions", "phone and sim", "apartment", "army slang", "shabbat invitation", "hospital", "bank", "post office", "taxi", "weather", "small talk",
    "torah service in order", "amidah responses", "yom kippur", "pesach", "sukkot", "purim", "hanukkah", "birkat hamazon", "journey", "shabbat-day kiddush",
    "work", "university", "dating", "driving", "hiking", "beach", "kids", "supermarket", "repairs", "delivery", "emergencies", "news headlines", "banking forms", "social media", "holiday greetings"];
  for (const w of want) assert.ok(titles.some((t) => t.includes(w)), `no lesson title for ${w}`);
});

test("index matches the files and the docs explain registration", () => {
  assert.equal(index.status, "draft"); assert.equal(index.proofread, false);
  assert.deepEqual(index.lessons.map((x) => x.id), IDS);
  for (const i of index.lessons) {
    const l = byId[i.id];
    assert.ok(fs.existsSync(new URL("data/curriculum/" + i.file, ROOT)), i.file);
    assert.equal(i.title, l.title); assert.equal(i.exercises, l.exercises.length); assert.equal(i.words, l.words.length);
    assert.deepEqual(i.prerequisites, l.prerequisites); assert.equal(i.unit, l.unit);
  }
  assert.equal(index.units.synagogue.length, 20); assert.equal(index.units.israel.length, 30);
  for (const t of TYPES) assert.ok(index.exerciseTypes[t], t);
  const doc = fs.readFileSync(new URL("docs/curriculum/INTERMEDIATE.md", ROOT), "utf8");
  for (const id of IDS) assert.ok(doc.includes(id), `doc lacks ${id}`);
  assert.ok(doc.includes("intermediate-index.json") && doc.includes("lessons.json"), "doc must say how to register");
  for (const t of TYPES) assert.ok(doc.includes("`" + t + "`"), `doc lacks exercise type ${t}`);
});

test("no file in the intermediate set claims review it did not get, and corpus gaps are named where a topic is thin", () => {
  for (const l of lessons) {
    const text = JSON.stringify(l);
    assert.ok(!/reviewed by a native|proofread": true|verified by/i.test(text), l.id);
  }
  assert.ok(/g-hallel/.test(byId["I-07"].note), "Hallel lesson must name the corpus gap");
  assert.ok(/g-mi-sheberach-full/.test(byId["I-10"].note));
});

test("image slot map: exactly two slots per lesson, one line each, no text in images, ids unique", () => {
  const slots = readJson("data/curriculum/intermediate-image-slots.json");
  assert.equal(slots.status, "draft");
  assert.deepEqual(slots.lessons.map((x) => x.lesson), IDS);
  const seen = new Set();
  for (const x of slots.lessons) {
    assert.equal(x.title, byId[x.lesson].title);
    assert.equal(x.slots.length, 2, x.lesson);
    for (const sl of x.slots) {
      assert.ok(sl.id.startsWith(x.lesson + "-img") && !seen.has(sl.id), sl.id); seen.add(sl.id);
      assert.ok(sl.scene.length > 20 && sl.scene.length < 220 && !sl.scene.includes("\n"), sl.id);
      assert.ok(!HEB.test(sl.scene), `${sl.id}: scene must contain no Hebrew`);
      assert.ok(!/\b(text|caption|writing|lettering|label|sign reading|says)\b/i.test(sl.scene), `${sl.id}: scene must not ask for text`);
    }
  }
  assert.ok(slots.rules.some((r) => /no text/i.test(r)));
});

test("the generator under tools/curriculum/intermediate is in the repo and has no machine-specific paths", () => {
  const dir = new URL("tools/curriculum/intermediate/", ROOT);
  for (const f of ["build.py", "sources.py", "dsl.py", "syn.py", "syn2.py", "isr.py", "isr2.py", "slots.py", "chk.py"]) {
    const t = fs.readFileSync(new URL(f, dir), "utf8");
    assert.ok(!/\/tmp\/ib|\/home\/claude/.test(t), `${f} has a machine-specific path`);
  }
});
