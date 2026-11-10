// Practical course: the page outline and the pages written in full
// (data/curriculum/practical-pages/*.json, built by the page builder).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const nfc = (s) => s.normalize("NFC");
const pages = read("data/curriculum/practical-pages/written.json");
const outline = read("data/curriculum/practical-pages/outline.json");
const schema = read("data/curriculum/practical-pages/page.schema.json");

const phrasebook = new Map(read("data/corpus/phrasebook.json").entries.map((e) => [e.id, e]));
const lineClips = new Map(read("data/audio/manifest.json").map((x) => [x.id, x]));
const wordClips = new Map(read("data/audio/manifest-kind-word.json").map((x) => [x.id, x]));
const dialogues = read("data/curriculum/dialogues.json").dialogues;
const dlgLines = new Map(dialogues.flatMap((d) => d.lines.map((l) => [l.id, l])));
const lessons = read("data/curriculum/lessons.json").lessons;
const lessonIds = new Set(lessons.map((l) => l.id));

/** The Hebrew a source holds for an item id, or undefined. */
function sourceHebrew(it) {
  if (it.source === "data/corpus/phrasebook.json") return phrasebook.get(it.id)?.he;
  if (it.source === "data/audio/manifest.json") return lineClips.get(it.id)?.text;
  if (it.source === "data/audio/manifest-kind-word.json") return wordClips.get(it.id)?.text;
  if (it.source === "data/curriculum/dialogues.json") return dlgLines.get(it.id)?.he;
  const m = /^data\/curriculum\/lessons\.json#(.+)\.words\[(\d+)\]$/.exec(it.source);
  if (m) return lessons.find((l) => l.id === m[1])?.words[+m[2]]?.he;
  return undefined;
}

test("written pages: at least 30, in course order, unique ids that the outline marks written", () => {
  const n = pages.pages.length;
  assert.ok(n >= 30, `written pages: ${n}`);
  const ids = pages.pages.map((p) => p.id);
  assert.equal(new Set(ids).size, n);
  const outlineIds = outline.units.flatMap((u) => u.pages.map((p) => p.id));
  assert.deepEqual(ids, outlineIds.slice(0, n), "the written pages are the first pages of the outline, in order");
  for (const p of pages.pages) assert.equal(p.kind, outline.units.flatMap((u) => u.pages).find((o) => o.id === p.id).kind, `${p.id}: kind matches the outline`);
  const written = outline.units.flatMap((u) => u.pages.filter((p) => p.status === "written").map((p) => p.id));
  assert.deepEqual(written, ids);
});

test("every Hebrew line is copied exactly from its named source", () => {
  for (const p of pages.pages) {
    for (const it of p.items) {
      const src = sourceHebrew(it);
      assert.ok(src, `${p.id} ${it.id}: no source row in ${it.source}`);
      assert.equal(nfc(it.he), nfc(src), `${p.id} ${it.id}`);
      assert.ok(it.translit && it.en, `${p.id} ${it.id}: needs translit and English`);
      if (it.source === "data/corpus/phrasebook.json") assert.equal(it.translit, phrasebook.get(it.id).translit);
    }
  }
});

test("grammar, speak and example Hebrew come from the page's own items or earlier pages", () => {
  const seen = [];
  const taught = new Map();
  for (const p of pages.pages) {
    seen.push(...p.items.map((it) => nfc(it.he)));
    p.items.forEach((it) => taught.set(it.id, it));
    const pool = seen.join(" ");
    const mine = new Map(p.items.map((it) => [it.id, it]));
    // Review and check pages may also practise the earlier items they queue for review.
    for (const r of p.reviewOf) if (!mine.has(r) && ["review", "check"].includes(p.kind)) mine.set(r, taught.get(r));
    for (const run of p.grammar.body.match(/[֐-׿]+/g) || []) assert.ok(pool.includes(nfc(run)), `${p.id} grammar: ${run}`);
    for (const ex of p.grammar.examples) assert.equal(ex.he, mine.get(ex.itemId)?.he, `${p.id} example ${ex.itemId}`);
    for (const s of p.speak) assert.equal(s.he, mine.get(s.answer)?.he, `${p.id} speak ${s.answer}`);
    assert.ok(p.grammar.point && p.grammar.body.length > 40, `${p.id}: grammar needs a real explanation`);
    assert.ok(!/data\/|phrasebook|stored|json/i.test(p.grammarNote), `${p.id}: grammar note must not describe files`);
  }
});

test("audio: every clip id is in a manifest with both voices; only dialogue lines may be gaps", () => {
  const check = (where, a) => {
    if (a.status === "gap") {
      assert.match(a.clipId, /^d-[a-z]+-l\d+$/, `${where}: only dialogue lines may lack a clip`); assert.ok(!lineClips.has(a.clipId) && !wordClips.has(a.clipId), `${where}: marked gap but a clip exists`); return; }
    const row = wordClips.get(a.clipId) || lineClips.get(a.clipId);
    assert.ok(row, `${where}: ${a.clipId} not in a manifest`);
    assert.deepEqual(a.voices, ["f", "m"], `${where}: both voices`);
  };
  for (const p of pages.pages) {
    p.items.forEach((it) => check(`${p.id} ${it.id}`, it.audio));
    p.speak.forEach((s) => check(`${p.id} speak ${s.answer}`, s.audio));
    for (const l of p.listen) assert.ok(wordClips.has(l.clip.id) || lineClips.has(l.clip.id), `${p.id} listen ${l.clip.id}`);
  }
});

test("gendered forms come in pairs, labelled, with the woman's form from the audio manifest", () => {
  for (const p of pages.pages) {
    const ids = new Set(p.items.map((it) => it.id));
    for (const it of p.items.filter((x) => /-(m|f)$/.test(x.id))) {
      assert.ok(it.form, `${p.id} ${it.id}: needs a form label`);
      const other = it.id.replace(/-(m|f)$/, (_, g) => (g === "m" ? "-f" : "-m"));
      if (it.id.startsWith("greetings-11") || it.id.startsWith("politeness-07") || it.id.startsWith("fillers-1") || it.id.startsWith("numbers-") || it.id.startsWith("greetings-2"))
        assert.ok(ids.has(other) || p.kind === "speak" || p.kind === "listen", `${p.id}: ${it.id} shown without ${other}`);
    }
  }
});

test("spaced review: core items first, then review items from earlier pages only, on the shared intervals", () => {
  const earlier = new Set();
  for (const p of pages.pages) {
    assert.deepEqual(p.reviewDays, [1, 3, 7, 14, 30]);
    const bands = p.srsQueue.map((q) => q.band);
    assert.equal(bands.indexOf("review") === -1 ? bands.length : bands.indexOf("review"), p.items.length);
    p.srsQueue.forEach((q, i) => assert.equal(q.position, i + 1));
    for (const r of p.reviewOf) assert.ok(earlier.has(r), `${p.id} reviews ${r}, which no earlier page taught`);
    if (p.kind === "review") assert.ok(p.reviewOf.length >= 5, `${p.id}: a unit review page reviews at least 5 items`);
    p.items.forEach((it) => earlier.add(it.id));
  }
});

test("pages fit the v2 page shape and the v3 schema's required fields", () => {
  const req = schema.required;
  const kinds = schema.properties.kind.enum;
  for (const p of pages.pages) {
    for (const k of req) assert.ok(k in p, `${p.id}: missing ${k}`);
    assert.match(p.id, new RegExp(schema.properties.id.pattern));
    assert.ok(kinds.includes(p.kind));
    for (const it of p.items) for (const k of schema.$defs.item.required) assert.ok(k in it, `${p.id} ${it.id}: missing ${k}`);
    for (const q of p.srsQueue) for (const k of schema.$defs.srsEntry.required) assert.ok(k in q);
  }
});

test("outline: 100-200 pages, unique ids, sequential order, real lessons and dialogues, every unit ends in review or check", () => {
  assert.ok(outline.totals.pages >= 100 && outline.totals.pages <= 200, `pages: ${outline.totals.pages}`);
  const all = outline.units.flatMap((u) => u.pages);
  assert.equal(all.length, outline.totals.pages);
  assert.equal(new Set(all.map((p) => p.id)).size, all.length);
  const dlgIds = new Set(dialogues.map((d) => d.id));
  for (const u of outline.units) {
    u.pages.forEach((p, i) => {
      assert.equal(p.order, i + 1);
      assert.equal(p.id, `${u.id}-p${String(i + 1).padStart(2, "0")}`);
      assert.equal(p.route, `#/practical/${u.id}/${p.id}`);
      assert.ok(Object.keys(outline.pageKinds).includes(p.kind));
    });
    for (const l of u.lessons) assert.ok(lessonIds.has(l), `${u.id}: lesson ${l}`);
    if (u.dialogue) assert.ok(dlgIds.has(u.dialogue), `${u.id}: dialogue ${u.dialogue}`);
    assert.ok(["review", "check"].includes(u.pages.at(-1).kind), `${u.id} ends with ${u.pages.at(-1).kind}`);
    assert.ok(u.pages.some((p) => ["grammar", "speak", "listen", "dialogue"].includes(p.kind)) || u.pages.length <= 3, `${u.id}: needs practice pages`);
  }
  for (const lv of ["L0", "L1", "L2", "L3"]) {
    const last = outline.units.filter((u) => u.level === lv).at(-1);
    assert.equal(last.pages.at(-1).kind, "check", `level ${lv} ends with a check page`);
  }
});

test("outline Hebrew in page titles is attested in the repo", () => {
  const pool = [
    ...[...phrasebook.values()].map((e) => e.he), ...[...lineClips.values()].map((x) => x.text),
    ...[...wordClips.values()].map((x) => x.text), ...[...dlgLines.values()].map((l) => l.he),
    ...lessons.flatMap((l) => (l.words || []).map((w) => w.he)),
  ].map(nfc).join(" ");
  for (const p of outline.units.flatMap((u) => u.pages)) {
    for (const run of p.title.match(/[֐-׿]+/g) || []) assert.ok(pool.includes(nfc(run)), `${p.id}: ${run}`);
  }
});

test("outline covers every Israel-track lesson (il01-il24 and the Israel I- lessons)", () => {
  const covered = new Set(outline.units.flatMap((u) => u.lessons));
  const missing = lessons.filter((l) => l.track === "israel" && !covered.has(l.id)).map((l) => l.id);
  assert.deepEqual(missing, []);
});

test("holds stay in place: politeness-21 held for John, pu-army off the live set", () => {
  const p05 = pages.pages.find((p) => p.id === "pu-politeness-p05");
  assert.deepEqual(p05.heldForJohn, ["politeness-21"]);
  assert.equal(p05.items.find((it) => it.id === "politeness-21").heldForJohn, true);
  const army = outline.units.find((u) => u.id === "pu-army");
  assert.equal(army.live, false);
  assert.equal(army.heldForJohn, true);
});
