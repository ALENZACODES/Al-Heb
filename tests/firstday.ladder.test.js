import test from "node:test";
import assert from "node:assert/strict";
import { waitFor } from './helpers/waitfor.js';
const L = await import("../src/firstday/loader.js");
const M = await import("../src/firstday/model.js");
const V = await import("../src/firstday/ladder.view.js");
const ladder = await L.loadLadder();

test("ladder data passes model checks and has 20 steps in 4 stages", () => {
  assert.deepEqual(M.checkLadder(ladder), []);
  for (const st of ladder.stages) assert.ok(ladder.steps.some((s) => s.stage === st));
  assert.ok(ladder.steps.every((s) => V.STAGE_LABEL[s.stage]));
});

test("hint only on with-hint stage; unpointed steps show no points", () => {
  for (const s of ladder.steps) {
    assert.equal(s.hintAvailable, s.stage === "unpointed-with-hint");
    if (s.stage.startsWith("unpointed")) assert.equal(M.bare(s.shown), s.shown);
  }
});

test("score counts unpointed steps only; hinted answers never count", () => {
  let st = V.emptyLadderState();
  for (const s of ladder.steps) st = V.recordAnswer(st, s.n, true);
  assert.deepEqual(M.unpointedScore(ladder, st.answers), { right: 8, total: 8, pct: 100 });
  st = V.recordAnswer(st, 13, true, true);
  assert.equal(M.unpointedScore(ladder, st.answers).right, 7);
  assert.equal(st.hinted[13], true);
  assert.equal(M.unpointedScore(ladder, V.emptyLadderState().answers).pct, 0);
});

test("store key and audio entries", () => {
  assert.equal(V.LADDER_KEY, "firstday.ladder");
  assert.equal(M.audioEntries({ words: [] }, ladder).length, 20);
});

let jsdom = null;
try { jsdom = await import("jsdom"); } catch { /* optional */ }
test("mount renders draft notice, labelled controls, and unmounts", { skip: !jsdom && "jsdom not installed" }, async () => {
  const { JSDOM } = jsdom;
  const dom = new JSDOM("<body><div id=r></div></body>");
  globalThis.document = dom.window.document; globalThis.window = dom.window;
  const root = dom.window.document.getElementById("r");
  const mem = {};
  const un = V.mount(root, { firstdayData: { ladder }, store: { get: async (k) => mem[k], set: async (k, v) => { mem[k] = v; } } });
  await waitFor(() => /unreviewed/.test(root.textContent), { message: "/unreviewed/.test(root.textContent)" });
  assert.match(root.textContent, /unreviewed/);
  assert.ok(root.querySelector("button[aria-label^='I read']"));
  un(); assert.equal(root.children.length, 0);
});
