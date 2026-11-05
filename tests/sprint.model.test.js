import test from "node:test";
import assert from "node:assert/strict";
const L = await import("../src/sprint/loader.js");
const M = await import("../src/sprint/model.js");
const { review } = await import("../src/curriculum/srs.js");

const entries = await L.loadAllVocab();
const registry = await L.loadRegistry();
const scenarios = await L.loadScenarios();
const index = M.buildIndex(entries);
const dests = M.buildDestinations(index, registry, scenarios);
const seeded = (seed = 7) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const translit = (e) => (e.pointed ? e.pointed.length + ":" + e.id : "");

test("the visible entries load from the four packs in rank order (5000 minus the 4 flags.hidden records, ranks 43, 169, 1160 and 3834, suppressed pending native review)", () => {
  assert.equal(entries.length, 5000 - 4);
  assert.ok(!entries.some((e) => [43, 169, 1160, 3834].includes(e.rank)));
  assert.ok(entries.every((e, i) => i === 0 || entries[i - 1].rank <= e.rank));
});

test("matching: a pointed token matches the pointed list word; homographs are not guessed", () => {
  const baruch = index.find(M.tokens("בָּרוּךְ")[0]);
  assert.equal(baruch?.gloss, "blessed");
  const shem = index.find(M.tokens("שֵׁם")[0]);
  assert.ok(shem && /name/.test(shem.gloss), "shem must be 'name', not the verb 'to put'");
  assert.equal(index.find(M.tokens("וָעֶד")[0]), null, "va'ed must not be matched to the unrelated word 'council'");
  assert.equal(index.find(M.tokens("לְעוֹלָם")[0])?.lemma, "לעולם");
});

test("destinations: prayer lines and Israel scenarios with at least 3 recognised words, honest totals", () => {
  assert.ok(dests.some((d) => d.kind === "prayer") && dests.some((d) => d.kind === "israel"));
  for (const d of dests) {
    assert.ok(d.words.length >= 3, d.id);
    assert.ok(d.matchedTokens <= d.total && d.words.length <= d.matchedTokens, d.id);
    assert.ok(d.words.every((e, i) => i === 0 || d.words[i - 1].rank <= e.rank), "words by frequency rank");
    assert.equal(new Set(d.words.map((e) => e.id)).size, d.words.length);
  }
  const pr = dests.find((d) => d.id === "prayer:hamotzi");
  assert.equal(pr.readId, "hamotzi");
});

test("queue: destination words first, interleaved with common words, no duplicates, skips known", () => {
  const dest = dests.find((d) => d.id === "prayer:kiddush-wine-1");
  const q = M.buildQueue({ entries, cards: {}, dest, now: 1e12, limit: 12 });
  assert.equal(q.length, 12);
  assert.equal(new Set(q.map((e) => e.id)).size, 12);
  assert.deepEqual(q.slice(0, 3).map((e) => e.id), dest.words.slice(0, 3).map((e) => e.id));
  assert.ok(dest.words.every((w) => q.some((e) => e.id === w.id)), "every destination word is in a 12-word sprint here");
  const first = dest.words[0];
  const known = { [M.cardId(first)]: review({ id: M.cardId(first), kind: "word", state: "new", stability: 0, difficulty: 0, reps: 0, lapses: 0, lastReview: null, due: 0 }, 3, 1e12) };
  const q2 = M.buildQueue({ entries, cards: known, dest, now: 1e12 + 1000, limit: 12 });
  assert.ok(!q2.some((e) => e.id === first.id));
  const plain = M.buildQueue({ entries, cards: {}, dest: null, now: 0, limit: 5 });
  assert.deepEqual(plain.map((e) => e.rank), [...plain.map((e) => e.rank)].sort((a, b) => a - b), "no destination: frequency order");
});

test("queue: due cards come first", () => {
  const e = entries.find((x) => x.rank === 300 && !x.isForm && x.pointed);
  const c = { id: M.cardId(e), kind: "word", state: "review", stability: 3, difficulty: 5, reps: 1, lapses: 0, lastReview: 0, due: 5 };
  const q = M.buildQueue({ entries, cards: { [c.id]: c }, dest: null, now: 100, limit: 5 });
  assert.equal(q[0].id, e.id);
});

test("questions: three types, distinct options that contain the answer, deterministic", () => {
  const e = entries.find((x) => x.rank === 40 && x.pointed && !x.isForm);
  const types = [0, 1, 2].map((reps) => M.buildQuestion({ entry: e, entries, card: { reps }, translit, rng: seeded() }));
  assert.deepEqual(types.map((q) => q.type), ["hear-meaning", "pick-sound", "point-to-english"]);
  for (const q of types.slice(0, 2)) {
    assert.equal(q.options.length, 3);
    assert.equal(new Set(q.options.map((o) => o.label)).size, 3);
    assert.ok(q.options.some((o) => o.id === e.id && o.label === q.answer));
  }
  assert.deepEqual(M.buildQuestion({ entry: e, entries, card: { reps: 0 }, translit, rng: seeded() }), types[0]);
  const noTr = M.buildQuestion({ entry: e, entries, card: { reps: 1 }, translit: () => "", rng: seeded() });
  assert.equal(noTr.type, "hear-meaning", "no transliteration available: falls back instead of showing an empty question");
});

test("answers feed the SRS cards in the vocab store shape, input untouched", () => {
  const e = entries.find((x) => x.rank === 10 && x.pointed && !x.isForm);
  const cards = {};
  const good = M.applyAnswer(cards, e, true, 1000);
  assert.deepEqual(cards, {});
  const c = good["vocab:" + e.id];
  assert.equal(c.state, "review"); assert.equal(c.kind, "word"); assert.equal(c.reps, 1); assert.ok(c.stability >= 3);
  assert.ok(M.isKnown(c));
  const bad = M.applyAnswer(cards, e, false, 1000)["vocab:" + e.id];
  assert.equal(bad.state, "relearning"); assert.equal(bad.due, 1000 + 10 * 60 * 1000); assert.ok(!M.isKnown(bad));
  assert.equal(M.knownCount([e], good), 1); assert.equal(M.knownCount([e], { [c.id]: bad }), 0);
});

test("timer: counts only while running, pause and resume, clockText", () => {
  const t = M.createTimer(300000);
  t.start(0); assert.equal(t.remaining(60000), 240000);
  t.pause(60000); assert.equal(t.remaining(900000), 240000);
  t.resume(900000); assert.equal(t.remaining(1000000), 140000);
  assert.ok(!t.done(1000000)); assert.ok(t.done(1140000));
  assert.equal(M.clockText(300000), "5:00"); assert.equal(M.clockText(59001), "1:00"); assert.equal(M.clockText(0), "0:00");
});
