// A lesson word's clip must say that word. When a lesson word is corrected, its old clip says the old word,
// so the row is marked missing (and its mp3 removed) until it is re-rendered (I-16 charger, I-37 course, I-40 map).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const nfc = (s) => s.normalize("NFC");
const lessons = read("data/curriculum/lessons.json").lessons;
const rows = read("data/audio/manifest-kind-word.json").filter((x) => x.group === "lesson-word");
const bare = (s) => nfc(s).replace(/[\u0591-\u05C7]/g, "");
// The divine name is written in the lesson and read aloud as the substitute in the clip; that is intended (decision held for John).
const hasName = (he) => bare(he).includes("יהוה");
// Pointing-only fixes where the clip still sounds the same in Israeli Hebrew (segol and tsere are both "e").
const SAME_SOUND = new Map([["i-42-w11", "בֶּן was בֵּן; both are said ben"]]);

test("every lesson-word clip's text is the Hebrew of the lesson word it plays for", () => {
  const byId = new Map();
  for (const l of lessons) (l.words || []).forEach((w, i) => byId.set(`${l.id}-w${i + 1}`.toLowerCase(), w.he));
  const wrong = [];
  for (const r of rows) {
    const he = byId.get(r.id.toLowerCase());
    if (he !== undefined && !hasName(he) && !SAME_SOUND.has(r.id) && nfc(he) !== nfc(r.text)) wrong.push(`${r.id} (${r.voice}): clip says ${r.text}, lesson word is ${he}`);
  }
  assert.deepEqual(wrong, []);
});

test("the three corrected words are taught with the right Hebrew and have no stale clip", () => {
  const word = (id, n) => lessons.find((l) => l.id === id).words[n - 1].he;
  assert.equal(word("I-16", 8), "מַטְעֵן");
  assert.equal(word("I-37", 9), "קוּרְס");
  assert.equal(word("I-40", 7), "מַפָּה");
  for (const id of ["i-16-w8", "i-37-w9", "i-40-w7"]) {
    const mine = rows.filter((r) => r.id === id);
    assert.equal(mine.length, 2, `${id}: one row per voice`);
    for (const r of mine) {
      // either no clip, or a clip made from the corrected Hebrew (its sidecar records the text it was made from)
      if (r.status === "missing") { assert.ok(!fs.existsSync(new URL(`../${r.path}`, import.meta.url)), `${r.path}: the old mp3 is still on disk`); continue; }
      const meta = JSON.parse(fs.readFileSync(new URL(`../${r.path}.meta.json`, import.meta.url), "utf8"));
      assert.equal(nfc(meta.inputText), nfc(r.text), `${id} ${r.voice}: the clip was made from the corrected word`);
      assert.equal(nfc(r.text), nfc(lessons.flatMap((l) => l.words.map((w, i) => [`${l.id.toLowerCase()}-w${i + 1}`, w.he])).find(([k]) => k === id)[1]), `${id}: the row text is the taught word`);
    }
  }
});
