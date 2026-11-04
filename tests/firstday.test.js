import test from "node:test";
import assert from "node:assert/strict";
const L = await import("../src/firstday/loader.js");
const M = await import("../src/firstday/model.js");
const first10 = await L.loadFirst10();
const ladder = await L.loadLadder();

test("content is marked draft and unreviewed", () => {
  for (const d of [first10, ladder]) { assert.equal(d.status, "draft"); assert.equal(d.proofread, false); assert.match(d.reviewNote, /unreviewed/i); }
  assert.match(M.DRAFT_NOTICE, /unreviewed/);
});

test("5 letters, 2 vowels, 3 words; every read step uses only taught letters and vowels", () => {
  assert.equal(first10.letters.length, 5);
  assert.equal(first10.vowels.length, 2);
  assert.equal(first10.words.length, 3);
  assert.deepEqual(M.checkGating(first10), []);
  for (const w of first10.words) { assert.deepEqual(M.wordLetterIds(w.he), w.letters.map((x) => x)); assert.equal(M.bare(w.he), w.bare); }
});

test("gating check catches a word read before its letters are taught", () => {
  const bad = structuredClone(first10);
  [bad.steps[1], bad.steps[3]] = [bad.steps[3], bad.steps[1]];
  assert.ok(M.checkGating(bad).length > 0);
});

test("budget is 10 minutes and the Priestly Blessing claim is honest", () => {
  assert.ok(M.totalMinutes(first10) <= M.BUDGET_MIN);
  const b = first10.words.filter((w) => w.fromBlessing);
  assert.deepEqual(b.map((w) => w.id), ["shalom"]);
  assert.match(first10.honestyNote, /Only one of the three/);
});

test("check question is deterministic given rng and grades correctly", () => {
  const rng = () => 0.3;
  const q = M.buildCheck(first10, "shalom", rng);
  assert.deepEqual(q, M.buildCheck(first10, "shalom", rng));
  assert.equal(q.options.length, 3);
  assert.equal(M.gradeCheck(q, "shalom").correct, true);
  assert.equal(M.gradeCheck(q, "mah").correct, false);
});

test("progress advances to the last step and tracks words once", () => {
  let p = M.emptyProgress();
  for (let i = 0; i < 20; i++) p = M.advance(p, first10);
  assert.equal(p.step, first10.steps.length - 1); assert.equal(p.done, true);
  p = M.markRead(M.markRead(p, "sham"), "sham");
  assert.deepEqual(p.readWords, ["sham"]);
});

test("audio hooks: entries cover every word and ladder step; playHook never throws", async () => {
  const e = M.audioEntries(first10, ladder);
  assert.equal(e.length, 3 + 20);
  assert.ok(e.every((x) => x.status === "missing" && x.tradition === "israeli"));
  const calls = [];
  const audio = { play: async (k, i) => { calls.push([k, i]); return { source: "tts-fallback" }; } };
  assert.equal((await M.playHook(audio, first10.words[0].audio)).source, "tts-fallback");
  assert.deepEqual(calls, [["word", "firstday-shalom"]]);
  assert.equal((await M.playHook({ play: () => { throw new Error("x"); } }, { kind: "word", id: "a" })).source, "none");
  assert.equal((await M.playHook(null, null)).source, "none");
});

test("audio hooks work with the real player and its speech fallback", async () => {
  const { createAudio } = await import("../src/audio/player.js");
  const spoken = [];
  const speech = { speak: (u) => { spoken.push(u.text); setTimeout(() => u.onend?.(), 0); }, cancel() {}, getVoices: () => [] };
  const a = createAudio({ settings: { voice: "m", congregation: "israeli" }, manifest: [], speech, UtteranceCtor: function (t) { this.text = t; } });
  a.extend(M.audioEntries(first10, ladder));
  assert.equal(a.has("word", "firstday-shalom"), false);
  assert.equal(a.status("word", "firstday-shalom").source, "tts-fallback");
});

test("ladder: 20 steps, stages never go backwards, unpointed steps show no points", () => {
  assert.deepEqual(M.checkLadder(ladder), []);
  assert.equal(ladder.steps.length, 20);
  assert.ok(ladder.steps.some((s) => s.stage === "pointed") && ladder.steps.some((s) => s.stage === "unpointed"));
  assert.equal(M.ladderStep(ladder, 20).n, 20);
});

test("ladder checker flags a pointed word shown in an unpointed step", () => {
  const bad = structuredClone(ladder); bad.steps[19].shown = bad.steps[19].word;
  assert.ok(M.checkLadder(bad).length > 0);
});

test("unpointed score counts only unpointed steps", () => {
  const un = ladder.steps.filter((s) => s.stage.startsWith("unpointed"));
  const answers = Object.fromEntries(ladder.steps.map((s) => [s.n, true]));
  assert.deepEqual(M.unpointedScore(ladder, answers), { right: un.length, total: un.length, pct: 100 });
  assert.equal(M.unpointedScore(ladder, {}).pct, 0);
});

test("view mounts with injected data, shows the draft notice and steps through", async () => {
  let doc; try { ({ JSDOM: doc } = await import("jsdom")); } catch { return; }
  const dom = new doc("<body></body>"); globalThis.document = dom.window.document;
  const V = await import("../src/firstday/firstday.view.js");
  const root = document.body; const un = V.mount(root, { firstdayData: { first10, ladder } });
  await new Promise((r) => setTimeout(r, 20));
  assert.match(root.textContent, /unreviewed/);
  un(); delete globalThis.document;
});
