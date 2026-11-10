import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lessons, byId } from "../src/curriculum/lessons.js";
import { cardsForLesson, ensureCards, confusableMap, buildQueue, recordActivity, currentStreak, dayKey, parseCardId, wordAudioId } from "../src/curriculum/progress.js";
import { review, MS_DAY } from "../src/curriculum/srs.js";
import { loadJSON } from "../src/curriculum/data.js";

const confusables = JSON.parse(readFileSync(new URL("../data/letters/confusables.json", import.meta.url), "utf8"));
const T0 = new Date(2026, 10, 3, 12).getTime();

test("loadJSON works in Node via fs and caches; missing file rejects", async () => {
  const a = await loadJSON("data/curriculum/belts.json");
  assert.equal(a, await loadJSON("data/curriculum/belts.json"));
  await assert.rejects(loadJSON("data/curriculum/nope.json"));
});

test("cards for a lesson: letters, vowels and words with stable ids", () => {
  const l = byId.r01;
  const d = cardsForLesson(l);
  assert.deepEqual(d.map((x) => x.id), ["letter:shin", "letter:bet", "vowel:kamatz", "vowel:patach", "vowel:shin-dot", "word:r01:1"]);
  assert.deepEqual(parseCardId("word:r01:1"), { kind: "word", key: "word:r01:1", lessonId: "r01", n: 1 });
  assert.equal(wordAudioId("r01", 1), "r01-w1");
  assert.equal(parseCardId("garbage"), null);
});

test("ensureCards adds only missing cards, new cards are due now, input untouched", () => {
  const { cards, added } = ensureCards({}, byId.r01, T0);
  assert.equal(added, 6);
  assert.ok(Object.values(cards).every((c) => c.state === "new" && c.due === T0));
  const again = ensureCards(cards, byId.r02, T0);
  assert.equal(again.added, cardsForLesson(byId.r02).length);
  assert.equal(ensureCards(cards, byId.r01, T0).added, 0);
  const frozen = Object.freeze({});
  ensureCards(frozen, byId.r01, T0);
});

test("every lesson's cards resolve to data (letters, vowels, words)", () => {
  const letters = new Set(JSON.parse(readFileSync(new URL("../data/letters/letters.json", import.meta.url), "utf8")).map((l) => l.id));
  const vowels = new Set(JSON.parse(readFileSync(new URL("../data/pronunciation/niqqud.json", import.meta.url), "utf8")).records.map((r) => r.id));
  for (const l of lessons) for (const d of cardsForLesson(l)) {
    const p = parseCardId(d.id);
    assert.ok(p, d.id);
    if (p.kind === "letter") assert.ok(letters.has(p.key), d.id);
    if (p.kind === "vowel") assert.ok(vowels.has(p.key), d.id);
    if (p.kind === "word") assert.ok(byId[p.lessonId].words[p.n - 1], d.id);
  }
});

test("confusableMap is symmetric and keyed by card id", () => {
  const m = confusableMap(confusables);
  assert.ok(m["letter:bet"].includes("letter:kaf"));
  assert.ok(m["letter:kaf"].includes("letter:bet"));
  assert.ok(!m["letter:bet"].includes("letter:bet"));
});

test("buildQueue: due only, lesson filter, cap, and confusables end up adjacent", () => {
  let cards = {};
  for (const id of ["r01", "r02", "r03"]) cards = ensureCards(cards, byId[id], T0).cards;
  const all = buildQueue(cards, T0, { lessons, confusables, limit: 100 });
  assert.equal(all.length, Object.keys(cards).length);
  const l1 = buildQueue(cards, T0, { lessonId: "r01", lessons, confusables });
  assert.deepEqual(new Set(l1.map((c) => c.id)), new Set(cardsForLesson(byId.r01).map((d) => d.id)));
  assert.equal(buildQueue(cards, T0, { lessons, confusables, limit: 3 }).length, 3);
  // not due yet: after a Good review the card leaves the queue
  const rev = review(cards["letter:shin"], 3, T0);
  const later = buildQueue({ ...cards, "letter:shin": rev }, T0 + 1000, { lessons, confusables, limit: 100 });
  assert.ok(!later.some((c) => c.id === "letter:shin"));
  assert.ok(buildQueue({ ...cards, "letter:shin": rev }, T0 + 40 * MS_DAY, { lessons, confusables, limit: 100 }).some((c) => c.id === "letter:shin"));
  // interleave: bet and kaf (confusable) come out adjacent when both are present among others
  const mk = (id) => ({ id, due: 0, state: "review", stability: 1, lastReview: 0 });
  const q = buildQueue({ a: mk("letter:bet"), b: mk("letter:alef"), c: mk("letter:kaf"), d: mk("letter:he") }, T0, { confusables });
  const ids = q.map((c) => c.id);
  assert.equal(Math.abs(ids.indexOf("letter:bet") - ids.indexOf("letter:kaf")), 1, ids.join());
});

test("streak: same day no change, next day +1, gap resets, display decays", () => {
  const day = (n) => new Date(2026, 10, 3 + n, 9).getTime();
  let s = recordActivity(null, day(0));
  assert.deepEqual(s, { count: 1, best: 1, last: dayKey(day(0)) });
  assert.deepEqual(recordActivity(s, day(0) + 3600e3), s);
  s = recordActivity(s, day(1)); assert.equal(s.count, 2);
  s = recordActivity(s, day(2)); assert.equal(s.count, 3);
  assert.deepEqual(currentStreak(s, day(2)), { count: 3, activeToday: true, best: 3 });
  assert.deepEqual(currentStreak(s, day(3)), { count: 3, activeToday: false, best: 3 });
  assert.equal(currentStreak(s, day(4)).count, 0);
  const reset = recordActivity(s, day(5)); assert.deepEqual([reset.count, reset.best], [1, 3]);
  assert.equal(currentStreak(null, T0).count, 0);
  // month boundary
  assert.equal(recordActivity({ count: 4, best: 4, last: "2026-10-31" }, new Date(2026, 10, 1, 8).getTime()).count, 5);
});
