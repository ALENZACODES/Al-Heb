// I5: Skip always does something visible, including in the retry phase ("skipped, will return").
import { test } from "node:test";
import assert from "node:assert/strict";
const S = await import("../src/curriculum/exercises.session.js");

test("a first-try skip goes to the back once and says it will come back", () => {
  const s = S.createSession([{ id: "a" }, { id: "b" }]);
  const r = s.skip();
  assert.deepEqual(r, { dropped: false, retry: false, again: false });
  assert.equal(S.skipNotice(r), "Skipped. It will come back at the end.");
  assert.equal(s.current().id, "b");
});

test("skipping the last item left says it shows again, and a second skip leaves it out ungraded", () => {
  const s = S.createSession([{ id: "a" }]);
  const r1 = s.skip();
  assert.equal(r1.again, true);
  assert.match(S.skipNotice(r1), /last one left, so here it is again/);
  const r2 = s.skip();
  assert.equal(r2.dropped, true);
  assert.match(S.skipNotice(r2), /left out of this check/);
  assert.ok(s.done());
  assert.deepEqual(s.stats().skipped, ["a"]);
});

test("retry phase: Skip moves on at once (never inert), the first answer still counts, and the counter adds up", () => {
  const s = S.createSession([{ id: "a" }, { id: "b" }]);
  s.answer(false); s.answer(true);          // a missed, b right
  assert.ok(s.isRetry()); assert.equal(s.current().id, "a");
  const r = s.skip();
  assert.deepEqual(r, { dropped: true, retry: true, again: false });
  assert.match(S.skipNotice(r), /first answer still counts.*comes back in your review/);
  assert.ok(s.done(), "the learner is not held in the retry loop");
  const st = s.stats();
  assert.deepEqual(st.missed, ["a"]); assert.deepEqual(st.skipped, [], "a skipped retry is not a skipped question");
  assert.equal(st.retrySkips, 1);
  const p = s.progress();
  assert.deepEqual([p.length, p.position, p.retries, p.retriesDone, p.retriesSkipped, p.retriesLeft, p.share], [2, 2, 1, 0, 1, 0, 1]);
});

test("the quick-check player and the intermediate player both show the skip notice", async () => {
  const { readFileSync } = await import("node:fs");
  for (const f of ["src/curriculum/exercises.ui.js", "src/curriculum/intermediate.view.js"]) {
    const src = readFileSync(new URL("../" + f, import.meta.url), "utf8");
    assert.match(src, /skipNotice\(session\.skip\(\)\)/, f);
    assert.match(src, /data-skipped-note/, f);
  }
});
