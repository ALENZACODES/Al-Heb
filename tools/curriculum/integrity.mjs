#!/usr/bin/env node
// Curriculum integrity check for the whole path (r01-r51, il01-il24, I-01..I-50). Static + simulated.
// Usage: node tools/curriculum/integrity.mjs      (exit 1 on any violation)
// Imported by tests/curriculum.integrity.test.js via runIntegrity().
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));

const CH = { "א": "alef", "ב": "bet", "ג": "gimel", "ד": "dalet", "ה": "he", "ו": "vav", "ז": "zayin", "ח": "chet", "ט": "tet", "י": "yod",
  "כ": "kaf", "ך": "kaf-final", "ל": "lamed", "מ": "mem", "ם": "mem-final", "נ": "nun", "ן": "nun-final", "ס": "samekh", "ע": "ayin",
  "פ": "pe", "ף": "pe-final", "צ": "tsadi", "ץ": "tsadi-final", "ק": "qof", "ר": "resh", "ש": "shin", "ת": "tav" };
const MK = { "ַ": "patach", "ָ": "kamatz", "ֵ": "tzere", "ֶ": "segol", "ִ": "chirik", "ֹ": "cholam", "ֺ": "cholam", "ֻ": "kubutz",
  "ְ": "shva", "ֲ": "chataf-patach", "ֱ": "chataf-segol", "ֳ": "chataf-kamatz", "ּ": "dagesh", "ׁ": "shin-dot", "ׂ": "sin-dot", "ׇ": "kamatz" };
const IGNORE = /[\s־׳״׃׀,.?!:;"'()…\-]/; // maqaf, geresh, gershayim, sof pasuq, punctuation
const CANT = /[֑-ֽ֯]/g;                    // cantillation and meteg: not taught, dropped before checks
const norm = (s) => String(s).normalize("NFC").replace(CANT, "");
const unp = (s) => s.replace(/[֑-ׇ]/g, "");
const HEB = /[א-ת]/;
const tokensOf = (s) => norm(s).split(/[\s־]+/).map((t) => t.replace(/[,.?!:;"'()׃׀…]+/g, "")).filter(Boolean);

const BEGINNER_READ = ["white", "red", "orange", "yellow", "green", "blue", "purple", "brown", "grey"];
const LEVELS = { read: new Set([...BEGINNER_READ, "intermediate"]), israel: new Set(["A1", "A2", "B1"]) };
const TYPES = ["recall", "produce", "match", "order", "respond", "gender", "dialogue", "fade", "spot", "register"];
// Lessons whose purpose is to listen/preview before the letters are taught: their prayer lines are exempt from the decodability check.
const PREVIEW_LESSONS = new Set(["r05"]);

/** Every Hebrew whitespace token / whole string that exists in the repo's data files (excluding the curriculum lesson files themselves). */
function sourceTokens() {
  const skip = new Set(["data/curriculum/lessons.json", "data/curriculum/intermediate-index.json"]);
  const whole = new Set(), toks = new Set();
  const scan = (o) => {
    if (typeof o === "string") { if (HEB.test(o)) { const n = norm(o); whole.add(n); for (const t of tokensOf(n)) toks.add(t); } }
    else if (Array.isArray(o)) o.forEach(scan);
    else if (o && typeof o === "object") Object.values(o).forEach(scan);
  };
  const walk = (d) => {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) { if (!/lessons-intermediate|node_modules/.test(p)) walk(p); }
      else if (f.name.endsWith(".json") && !skip.has(path.relative(ROOT, p))) { try { scan(JSON.parse(fs.readFileSync(p, "utf8"))); } catch { /* unparsable file: not a source */ } }
    }
  };
  walk(path.join(ROOT, "data"));
  return { whole, toks };
}

export async function runIntegrity(opts = {}) {
  const V = [], add = (id, msg) => V.push(`${id}: ${msg}`);
  const main = rd("data/curriculum/lessons.json"), belts = rd("data/curriculum/belts.json");
  const index = rd("data/curriculum/intermediate-index.json"), registry = rd("data/corpus/registry.json");
  if (opts.mutate) opts.mutate({ main, index, registry }); // tests inject faults into the in-memory copies
  const lessons = main.lessons, reg = new Map(registry.entries.map((e) => [e.id, e]));
  const adapter = await import("../../src/curriculum/intermediate-adapter.js");
  const stats = { lessons: lessons.length };

  // ---- 1. ids, shape, titles, goals, level labels
  const byId = new Map();
  for (const l of lessons) { if (byId.has(l.id)) add(l.id, "duplicate id in lessons.json"); byId.set(l.id, l); }
  const ids = { r: lessons.filter((l) => /^r\d{2}$/.test(l.id)), il: lessons.filter((l) => /^il\d{2}$/.test(l.id)), I: lessons.filter((l) => /^I-\d{2}$/.test(l.id)) };
  if (ids.r.length !== 51 || ids.il.length !== 24 || ids.I.length !== 50 || lessons.length !== 125) add("path", `expected 51 r + 24 il + 50 I = 125, got ${ids.r.length}+${ids.il.length}+${ids.I.length}=${lessons.length}`);
  for (const l of lessons) {
    if (typeof l.title !== "string" || l.title.trim().length < 4) add(l.id, "title missing or too short");
    if (!Array.isArray(l.goals) || !l.goals.length || l.goals.some((g) => typeof g !== "string" || !g.trim())) add(l.id, "goals missing or empty");
    if (!(l.estMinutes >= 5 && l.estMinutes <= 60)) add(l.id, `estMinutes ${l.estMinutes} not in 5..60`);
    if (!LEVELS[l.track]?.has(l.level)) add(l.id, `level "${l.level}" is not valid for track ${l.track}`);
    if (l.level === "black") add(l.id, 'level "black" is a fluency target with no lessons in belts.json; it must not label a lesson');
    for (const k of ["letters", "vowels", "words", "prayerLines", "prerequisites"]) if (!Array.isArray(l[k])) add(l.id, `${k} must be an array`);
    if (l.track === "israel" && l.letters?.length) add(l.id, "israel lessons teach no letters");
  }
  const titles = new Map();
  for (const l of lessons) { const k = l.title.trim().toLowerCase(); if (titles.has(k)) add(l.id, `title duplicates ${titles.get(k)}`); else titles.set(k, l.id); }
  const beltIds = new Set(belts.belts.map((b) => b.id));
  for (const l of ids.r) if (l.level !== "intermediate" && !beltIds.has(l.level)) add(l.id, `level ${l.level} is not a belt`);
  { let last = -1; for (const l of lessons.filter((x) => x.track === "read")) { const i = BEGINNER_READ.indexOf(l.level); if (i < 0) { last = 99; continue; } if (i < last) add(l.id, `level ${l.level} goes back down the belt order`); last = i; } }
  for (const l of ids.I) {
    if (l.unit === "synagogue" && !(l.track === "read" && l.level === "intermediate")) add(l.id, "synagogue unit must be track read, level intermediate");
    if (l.unit === "israel" && !(l.track === "israel" && l.level === "B1")) add(l.id, "israel unit must be track israel, level B1");
    if (!["synagogue", "israel"].includes(l.unit)) add(l.id, `unit ${l.unit}`);
  }

  // ---- 2. intermediate index and source files agree with lessons.json (I-01 duplicate regression)
  const idxIds = index.lessons.map((x) => x.id);
  for (const id of new Set(idxIds)) if (idxIds.filter((x) => x === id).length > 1) add(id, "duplicate id in intermediate-index.json");
  if (idxIds.length !== 50) add("index", `intermediate-index.json lists ${idxIds.length} lessons, expected 50`);
  const unitIds = Object.values(index.units).flat().map((x) => x.id);
  if (new Set(unitIds).size !== unitIds.length) add("index", "duplicate id inside index.units");
  for (const x of index.lessons) {
    const l = byId.get(x.id), f = `data/curriculum/${x.file}`;
    if (!l) { add(x.id, "in index but not in lessons.json"); continue; }
    if (!fs.existsSync(path.join(ROOT, f))) { add(x.id, `index file ${x.file} missing`); continue; }
    if (JSON.stringify(rd(f)) !== JSON.stringify(l)) add(x.id, "lessons.json entry differs from its lessons-intermediate file");
    for (const k of ["title", "level", "track", "unit", "estMinutes"]) if (x[k] !== l[k]) add(x.id, `index.${k} "${x[k]}" != lessons.json "${l[k]}"`);
    if (JSON.stringify(x.prerequisites) !== JSON.stringify(l.prerequisites)) add(x.id, "index prerequisites differ");
    if (x.exercises !== l.exercises?.length || x.words !== l.words.length) add(x.id, "index counts differ");
  }
  for (const u of Object.values(index.units).flat()) if (u.level !== byId.get(u.id)?.level) add(u.id, `index.units level "${u.level}" differs`);
  const dir = fs.readdirSync(path.join(ROOT, "data/curriculum/lessons-intermediate")).filter((f) => f.endsWith(".json"));
  if (dir.length !== 50) add("files", `lessons-intermediate has ${dir.length} files, expected 50`);

  // ---- 3. prerequisite graph: exists, same track, DAG, every lesson reachable by simulation
  for (const l of lessons) for (const p of l.prerequisites) {
    if (!byId.has(p)) add(l.id, `prerequisite ${p} does not exist`);
    else if (byId.get(p).track !== l.track) add(l.id, `prerequisite ${p} is in another track`);
    if (p === l.id) add(l.id, "is its own prerequisite");
  }
  const done = new Set(), order = [];
  for (let progress = true; progress;) {
    progress = false;
    for (const l of lessons) if (!done.has(l.id) && l.prerequisites.every((p) => done.has(p))) { done.add(l.id); order.push(l.id); progress = true; }
  }
  for (const l of lessons) if (!done.has(l.id)) add(l.id, "unreachable: cycle or missing prerequisite (simulated completion never unlocks it)");
  const roots = lessons.filter((l) => !l.prerequisites.length).map((l) => l.id);
  stats.roots = roots; stats.reachable = done.size;
  if (roots.join() !== "r01,il01") add("path", `expected roots r01 and il01, got ${roots}`);
  // every lesson (except the two terminal ones per chain) should lead somewhere, and I-lessons hang off r51 / il24
  const hasChild = new Set(lessons.flatMap((l) => l.prerequisites));
  const leaves = lessons.filter((l) => !hasChild.has(l.id)).map((l) => l.id);
  stats.leaves = leaves;
  for (const l of lessons) if (!done.has(l.id) || (!hasChild.has(l.id) && !["I-35", "I-50"].includes(l.id) && !/^I-/.test(l.id) && l.id !== "r51" && l.id !== "il24")) { /* orphan check below */ }
  const anc = new Map();
  const ancestors = (id) => { if (anc.has(id)) return anc.get(id); const s = new Set(); anc.set(id, s); for (const p of byId.get(id)?.prerequisites || []) { s.add(p); for (const q of ancestors(p)) s.add(q); } return s; };
  if (!ancestors("I-01").has("r51")) add("I-01", "does not follow r51");
  if (!ancestors("I-11").has("il24")) add("I-11", "does not follow il24");

  // ---- 4. known-set decodability along the prerequisite path (read track)
  const src = sourceTokens();
  const checkHebrew = (id, label, he, known) => {
    for (const c of norm(he)) {
      if (CH[c]) { if (!known.L.has(CH[c])) add(id, `${label} "${he}": letter ${CH[c]} used before it is taught on this path`); }
      else if (MK[c]) { if (!known.V.has(MK[c])) add(id, `${label} "${he}": mark ${MK[c]} used before it is taught on this path`); }
      else if (!IGNORE.test(c)) add(id, `${label} "${he}": unexpected character U+${c.codePointAt(0).toString(16)}`);
    }
  };
  const introduced = { L: new Map(), V: new Map() };
  for (const l of lessons.filter((x) => x.track === "read")) {
    for (const x of l.letters) { if (introduced.L.has(x)) add(l.id, `letter ${x} already introduced in ${introduced.L.get(x)}`); introduced.L.set(x, l.id); }
    for (const x of l.vowels) { if (introduced.V.has(x)) add(l.id, `mark ${x} already introduced in ${introduced.V.get(x)}`); introduced.V.set(x, l.id); }
  }
  if (introduced.L.size !== 27) add("path", `${introduced.L.size} letters introduced, expected 27`);
  if (introduced.V.size !== 15) add("path", `${introduced.V.size} marks introduced, expected 15`);
  for (const l of lessons.filter((x) => x.track === "read")) {
    const chain = [l.id, ...ancestors(l.id)].map((i) => byId.get(i)).filter(Boolean);
    const known = { L: new Set(chain.flatMap((x) => x.letters)), V: new Set(chain.flatMap((x) => x.vowels)) };
    for (const w of l.words) checkHebrew(l.id, "word", w.he, known);
    if (!PREVIEW_LESSONS.has(l.id)) for (const p of l.prayerLines) { const e = reg.get(p); if (e) for (const line of e.he.split("\n")) checkHebrew(l.id, `prayer line ${p}`, line, known); }
    if (l.id === "r51" || /^I-/.test(l.id)) { if (known.L.size !== 27 || known.V.size !== 15) add(l.id, "not all 27 letters and 15 marks are known on its path"); }
  }

  // ---- 5. every Hebrew string comes from existing data; prayer-line ids exist
  const fromData = (he) => { const n = norm(he); return src.whole.has(n) || tokensOf(n).every((t) => src.toks.has(t)); };
  for (const l of lessons) {
    l.words.forEach((w, i) => {
      if (!w.he || !w.en) add(l.id, `word ${i + 1} lacks he or en`);
      else if (!HEB.test(w.he)) add(l.id, `word ${w.he} has no Hebrew`);
      else if (!fromData(w.he)) add(l.id, `word "${w.he}" is not found in any data file (possibly invented)`);
    });
    for (const p of l.prayerLines) if (!reg.has(p)) add(l.id, `prayer line ${p} is not in data/corpus/registry.json`);
  }

  // ---- 6. practice set per lesson
  for (const l of ids.I) {
    const ex = l.exercises || [], exIds = new Set();
    if (ex.length < 12) add(l.id, `only ${ex.length} exercises`);
    let graded = 0;
    for (const e of ex) {
      if (exIds.has(e.id) || !String(e.id).startsWith(l.id + "-e")) add(l.id, `exercise id ${e.id} duplicated or mis-prefixed`); exIds.add(e.id);
      if (!TYPES.includes(e.type)) { add(e.id, `unknown type ${e.type}`); continue; }
      if (!adapter.SELF_RATED.has(e.type)) graded++;
      const hebs = [];
      switch (e.type) {
        case "recall": if (!e.he || !e.en) add(e.id, "recall needs he and en"); hebs.push(e.he); break;
        case "produce": {
          if (!Number.isInteger(e.answer) || e.answer < 0 || e.answer >= (e.options || []).length) { add(e.id, "answer index is not inside options"); break; }
          if (e.options.length < 3) add(e.id, "fewer than 3 options");
          const keys = e.options.map(adapter.heKey);
          if (new Set(keys).size !== keys.length) add(e.id, "duplicate options (more than one option grades as correct)");
          if (!adapter.gradeExercise(e, e.options[e.answer]).correct) add(e.id, "correct option does not grade correct");
          e.options.forEach((o, i) => { if (i !== e.answer && adapter.gradeExercise(e, o).correct) add(e.id, `wrong option ${i} grades correct`); });
          hebs.push(...e.options); break;
        }
        case "match": {
          const P = e.pairs || [];
          if (P.length < 3 || P.length > 5) add(e.id, `match has ${P.length} pairs`);
          if (new Set(P.map((p) => adapter.heKey(p.he))).size !== P.length || new Set(P.map((p) => p.en)).size !== P.length) add(e.id, "duplicate he or en in match pairs");
          if (!adapter.gradeExercise(e, Object.fromEntries(P.map((p) => [p.he, p.en]))).correct) add(e.id, "correct matching does not grade correct");
          hebs.push(...P.map((p) => p.he)); break;
        }
        case "order": {
          const t = adapter.orderTokens(e);
          if (t.length < 3) add(e.id, "order line has fewer than 3 tokens");
          if (!adapter.gradeExercise(e, t).correct) add(e.id, "correct order does not grade correct");
          if (t.length >= 2 && adapter.orderPuzzle(e, 1).every((x, i) => adapter.heKey(x) === adapter.heKey(t[i])) && new Set(t.map(adapter.heKey)).size > 1) add(e.id, "puzzle starts already solved");
          hebs.push(e.he); break;
        }
        case "respond": if (!e.cue || !e.answer?.he || !e.answer?.en) add(e.id, "respond needs cue and answer"); hebs.push(e.answer?.he, e.prompt?.he); break;
        case "gender": if (!e.m || !e.f || e.m === e.f) add(e.id, "gender needs two different forms"); hebs.push(e.m, e.f); break;
        case "dialogue": if (!(e.lines?.length >= 2) || !e.task) add(e.id, "dialogue needs 2+ lines and a task"); (e.lines || []).forEach((x) => hebs.push(x.he)); break;
        case "fade": case "spot": {
          const r = reg.get(e.line);
          if (!r) { add(e.id, `line ${e.line} not in registry`); break; }
          const lines = r.he.split("\n"), li = e.lineIndex || 1;
          if (li < 1 || li > lines.length) add(e.id, "lineIndex out of range");
          else if (e.type === "spot") {
            const toks = lines[li - 1].split(/\s+/).flatMap((t) => t.split(/(?<=־)/)).filter(Boolean); // the view shows these tokens (split after a maqaf too); grading compares heKey (no cantillation, no end punctuation)
            const hit = toks.find((x) => adapter.heKey(x) === adapter.heKey(e.target));
            if (!hit) add(e.id, `target "${e.target}" is not a token of ${e.line} line ${li}`);
            else if (!adapter.gradeExercise(e, hit).correct) add(e.id, "spot target does not grade correct");
          }
          break;
        }
        case "register": if (!e.options?.includes(e.answer)) add(e.id, "register answer not in options"); hebs.push(e.he); break;
      }
      for (const h of hebs.filter(Boolean)) if (!fromData(h)) add(e.id, `Hebrew "${h}" is not found in any data file (possibly invented)`);
    }
    if (graded < 3) add(l.id, `only ${graded} auto-graded exercises: it cannot be completed by answering`);
    if (new Set(ex.map((e) => e.type)).size < 4) add(l.id, "fewer than 4 exercise types");
    if (l.words.length < 8) add(l.id, "fewer than 8 words");
  }
  // beginner lessons carry no exercises array: their practice set is the SRS cards completeLesson creates plus Spot It (letters)
  const { cardsForLesson } = await import("../../src/curriculum/progress.js");
  stats.practiceCards = {};
  for (const l of [...ids.r, ...ids.il]) {
    const n = cardsForLesson(l).length; stats.practiceCards[l.id] = n;
    if (n < 1) add(l.id, "no practice cards: completing it would teach and test nothing");
    if (l.track === "read" && !l.letters.length && !l.vowels.length && !l.words.length && !l.prayerLines.length) add(l.id, "empty lesson");
    if (l.words.length + l.letters.length + l.vowels.length + l.prayerLines.length < 1) add(l.id, "no content");
  }
  stats.noBeginnerExerciseArray = [...ids.r, ...ids.il].filter((l) => !l.exercises).length;
  stats.order = order;
  return { violations: V, stats };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { violations, stats } = await runIntegrity();
  console.log(`curriculum integrity: ${stats.lessons} lessons, ${stats.reachable} reachable, ${violations.length} violation(s)`);
  for (const v of violations) console.log("  FAIL " + v);
  console.log(`note: ${stats.noBeginnerExerciseArray} beginner lessons (r/il) have no exercises array; their practice set is SRS cards + Spot It`);
  process.exit(violations.length ? 1 : 0);
}
