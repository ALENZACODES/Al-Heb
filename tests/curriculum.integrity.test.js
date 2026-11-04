import test from "node:test";
import assert from "node:assert/strict";
import { runIntegrity } from "../tools/curriculum/integrity.mjs";

const clone = (o) => JSON.parse(JSON.stringify(o));
const base = await runIntegrity();

test("curriculum integrity: the shipped path has zero violations", () => {
  assert.deepEqual(base.violations, []);
  assert.equal(base.stats.lessons, 125);
  assert.equal(base.stats.reachable, 125);
  assert.deepEqual(base.stats.roots, ["r01", "il01"]);
});

// The checker must actually fail on each class of defect: inject one fault into an in-memory copy and look for it.
const catches = async (name, mutate, re) => {
  const r = await runIntegrity({ mutate });
  assert.ok(r.violations.some((v) => re.test(v)), `${name}: expected a violation matching ${re}, got ${r.violations.slice(0, 3)}`);
};
const L = (m, id) => m.main.lessons.find((l) => l.id === id);

test("integrity catches: duplicate ids (lessons.json and index)", async () => {
  await catches("dup lesson", (m) => { m.main.lessons.push(clone(L(m, "r02"))); }, /duplicate id in lessons.json/);
  await catches("dup index", (m) => { m.index.lessons[1].id = "I-01"; }, /duplicate id in intermediate-index.json/);
});
test("integrity catches: cycles, unreachable lessons, missing prerequisites", async () => {
  await catches("cycle", (m) => { L(m, "r01").prerequisites = ["r04"]; }, /unreachable/);
  await catches("missing prereq", (m) => { L(m, "r10").prerequisites = ["r99"]; }, /does not exist/);
  await catches("cross-track", (m) => { L(m, "il05").prerequisites = ["r05"]; }, /another track/);
});
test("integrity catches: a lesson teaching a letter or vowel before it is introduced", async () => {
  await catches("letter", (m) => { L(m, "r02").words.push({ he: "דָּג", en: "fish", translit: null }); }, /r02.*letter dalet used before/);
  await catches("vowel", (m) => { L(m, "r01").words.push({ he: "שֵׁב", en: "sit", translit: null }); }, /r01.*mark tzere used before/);
  await catches("prayer line", (m) => { L(m, "r15").prayerLines.push("shema-1"); }, /r15.*prayer line shema-1/);
});
test("integrity catches: Hebrew that is not in the data, and unknown prayer lines", async () => {
  await catches("invented", (m) => { L(m, "il01").words.push({ he: "בְּלַבְלָבוּץ", en: "made up", translit: null }); }, /il01.*not found in any data file/);
  await catches("line id", (m) => { L(m, "r15").prayerLines = ["no-such-line"]; }, /not in data\/corpus\/registry/);
});
test("integrity catches: missing titles or goals and bad level labels (incl. level black)", async () => {
  await catches("title", (m) => { L(m, "r03").title = ""; }, /r03: title missing/);
  await catches("goals", (m) => { L(m, "il03").goals = []; }, /il03: goals missing/);
  await catches("black", (m) => { L(m, "I-01").level = "black"; }, /I-01: level "black"/);
  await catches("level", (m) => { L(m, "il01").level = "C2"; }, /il01: level "C2"/);
});
test("integrity catches: exercise sets that cannot be completed", async () => {
  await catches("answer range", (m) => { L(m, "I-02").exercises.find((e) => e.type === "produce").answer = 9; }, /answer index is not inside options/);
  await catches("dup options", (m) => { const e = L(m, "I-02").exercises.find((x) => x.type === "produce"); e.options[1] = e.options[0]; }, /duplicate options/);
  await catches("spot target", (m) => { L(m, "I-01").exercises.find((e) => e.type === "spot").target = "אבג"; }, /not a token/);
  await catches("only self-rated", (m) => { L(m, "I-03").exercises = L(m, "I-03").exercises.filter((e) => ["recall", "respond", "fade", "dialogue", "gender"].includes(e.type)); }, /I-03: only \d+ exercises|auto-graded/);
});
test("integrity catches: index drift", async () => {
  await catches("index title", (m) => { m.index.lessons[4].title = "x"; }, /index.title/);
});
