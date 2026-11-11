import { signalRimon } from '../shell/rimon-events.js';
/** Store-backed learning actions shared by the Lane 1 views and the home screen. */
import { storeGet, storeSet, storeWriteAll, PROGRESS_KEY, CARDS_KEY, STREAK_KEY } from "./dom.js";
import { loadState } from "./state.js";
import { ensureCards, recordActivity, applyOutcomesToCards, syllableCardId, lineCardId, genderCardId } from "./progress.js";
import { review, newCard } from "./srs.js";
import { nextScaffold, SCAFFOLD_KEY } from "./scaffold.js";
import { nextFadeLevel } from "./fade.js";
import { memoryCardsFor, ensureMemoryCards } from "../letters/memory.core.js";
import { loadContent } from "./content.js";
import { passMark, passed as passedCheck } from "./passmark.js";
export { loadState };
async function pointToNext(lesson, completed) {
  const { available } = await import('./lessons.js');
  const next = available(Object.keys(completed), lesson.track)[0];
  signalRimon('lesson', { nextHref: next ? '#/learn?lesson=' + encodeURIComponent(next.id) : '#/learn' });
}
async function fullLesson(lesson) {
  if (lesson && Array.isArray(lesson.words)) return lesson;
  const { byId } = await import('./lessons.js');
  return byId[lesson?.id] || lesson;
}

/**
 * Work out every write that counting a lesson as done needs, without writing anything. `old` is what each key holds now, so a failed batch can be undone.
 * Order matters: the review cards go first, then the "done" mark, then the streak, so a lesson is never marked done without its cards.
 */
async function planCompletion(ctx, lesson, now, applyOutcomes) {
  const st = await loadState(ctx, now);
  const oldProgress = await storeGet(ctx, PROGRESS_KEY, undefined), oldCards = await storeGet(ctx, CARDS_KEY, undefined);
  const completed = { ...st.completed, [lesson.id]: st.completed[lesson.id] || now };
  const { cards: base, added } = ensureCards(st.cards, lesson, now);
  let cards = await withMemoryCards(base, lesson.letters, now); // memory-chain cards for the lesson's letters (none when the chain is absent)
  if (applyOutcomes) cards = applyOutcomes(cards);
  return { added, completed, writes: [
    { key: CARDS_KEY, value: cards, old: oldCards },
    { key: PROGRESS_KEY, value: { completed }, old: oldProgress },
    { key: STREAK_KEY, value: recordActivity(st.rawStreak, now), old: st.rawStreak ?? undefined },
  ] };
}

/**
 * Mark a lesson complete, create its SRS cards, count today as active. Idempotent for cards.
 * All-or-nothing: if the store is missing or a write fails, the writes already made are undone and StoreWriteError is thrown, so the caller must not show "complete".
 * (A store that has fallen back to memory still accepts the writes; that is disclosed by the storage notice, not an error.)
 */
export async function completeLesson(ctx, lesson, now = Date.now()) {
  const full = await fullLesson(lesson);
  const { added, completed, writes } = await planCompletion(ctx, full, now);
  await storeWriteAll(ctx, writes);
  pointToNext(full, completed);
  return { added, completed };
}

/**
 * Add the memory-chain cards (mem:<letter>:<type>) for these letters. They fall due on a staggered schedule (see MEM_DELAY_DAYS).
 * Without data/letters/memory-chain.json, or for a letter it does not cover, nothing is added. Never throws.
 */
export async function withMemoryCards(cards, letterIds, now = Date.now()) {
  try {
    const c = await loadContent();
    if (!c.chain?.size) return cards;
    return ensureMemoryCards(cards, memoryCardsFor(letterIds, c.chain, c.letters), now).cards;
  } catch { return cards; }
}
/** Register memory cards for every letter taught by a completed lesson (idempotent; covers lessons finished before the chain existed). */
export async function syncMemoryCards(ctx, lessonList, now = Date.now()) {
  const st = await loadState(ctx, now);
  const taught = [...taughtFromCompleted(st.completed, lessonList)];
  const next = await withMemoryCards(st.cards, taught, now);
  const added = Object.keys(next).length - Object.keys(st.cards).length;
  if (added > 0) await storeSet(ctx, CARDS_KEY, next);
  return { added, taught };
}
/** Count one look-alike pair outcome from a memory question: the pair (target, other) gets a trial, and an error when `other` was picked wrongly. */
export async function savePairOutcome(ctx, targetId, otherIds, pickedId) {
  const pairs = await storeGet(ctx, PAIRS_KEY, {}), next = { ...pairs };
  for (const o of otherIds) {
    const k = [targetId, o].sort().join("|");
    next[k] = { errors: (next[k]?.errors || 0) + (o === pickedId ? 1 : 0), trials: (next[k]?.trials || 0) + 1 };
  }
  await storeSet(ctx, PAIRS_KEY, next);
}

/** Create the lesson's cards without completing it (used by the practice deep link). */
export async function addLessonCards(ctx, lesson, now = Date.now()) {
  const st = await loadState(ctx, now);
  const { cards, added } = ensureCards(st.cards, lesson, now);
  if (added) await storeSet(ctx, CARDS_KEY, cards);
  return { added, cards };
}

/** Apply a rating (1-4) to a stored card and persist it; counts today as active. Returns the new card. */
export async function rateCard(ctx, cardId, rating, now = Date.now()) {
  const st = await loadState(ctx, now);
  const card = st.cards[cardId];
  if (!card) throw new Error("unknown card " + cardId);
  const next = review(card, rating, now);
  // The rating is the primary write: a rejecting store must not be reported as a saved review.
  if (!ctx?.store?.set) throw new Error("Review storage is unavailable");
  await ctx.store.set(CARDS_KEY, { ...st.cards, [cardId]: next });
  await storeSet(ctx, STREAK_KEY, recordActivity(st.rawStreak, now));
  if (cardId.startsWith("word:")) await updateScaffold(ctx, cardId, rating, next, now);
  return next;
}

/**
 * Undo support for one review rating (a slipped tap on Again/Hard/Good/Easy). `snapshotRating` is taken just before `rateCard`; `restoreRating`
 * puts that one card (and, for a word card, its scaffold entry) back exactly as it was. The streak is left alone: the learner did study.
 */
export async function snapshotRating(ctx, cardId) {
  const st = await loadState(ctx);
  const scaffold = cardId.startsWith("word:") ? ((await storeGet(ctx, SCAFFOLD_KEY, {})) || {})[cardId] : undefined;
  return { cardId, card: st.cards[cardId], scaffold };
}
export async function restoreRating(ctx, snap) {
  if (!snap || !snap.card) return false;
  const st = await loadState(ctx);
  await storeSet(ctx, CARDS_KEY, { ...st.cards, [snap.cardId]: snap.card });
  if (snap.cardId.startsWith("word:")) {
    const map = { ...((await storeGet(ctx, SCAFFOLD_KEY, {})) || {}) };
    if (snap.scaffold === undefined) delete map[snap.cardId]; else map[snap.cardId] = snap.scaffold;
    await storeSet(ctx, SCAFFOLD_KEY, map);
  }
  return true;
}

// ---- practice features: hints, loanwords, Spot It, checkpoint (storage keys documented in docs/curriculum/onramp-drills-dialogues.md)
import { HINTS_KEY, newHintSession, dismissHint } from "./hints.js";
import { lapseLetters, applyCheckpointToCards } from "./checkpoint.js";
export const PAIRS_KEY = "curriculum.pairs";             // { "bet|kaf": { errors, trials } }
export const LOANWORDS_KEY = "curriculum.loanwords";     // { [wordId]: { knew:boolean, at:ms } }
export const CHECKPOINTS_KEY = "curriculum.checkpoints"; // { [stage]: { right, total, at } }

const sessions = new WeakMap();
/** In-memory hint session for this page load, seeded with the persisted "Got it" suppressions. */
export async function hintSession(ctx) {
  const key = ctx?.store && typeof ctx.store === "object" ? ctx.store : sessions;
  if (!sessions.has(key)) sessions.set(key, newHintSession(await storeGet(ctx, HINTS_KEY, [])));
  return sessions.get(key);
}
export async function suppressHint(ctx, kind) {
  const s = await hintSession(ctx);
  await storeSet(ctx, HINTS_KEY, dismissHint(s, kind));
}
/** Letters whose cards a completed lesson list teaches (read track). */
export function taughtFromCompleted(completed, lessonList) {
  const done = new Set(Object.keys(completed || {}));
  return new Set(lessonList.filter((l) => done.has(l.id)).flatMap((l) => l.letters));
}
export async function markLoanword(ctx, wordId, knew, now = Date.now()) {
  const m = await storeGet(ctx, LOANWORDS_KEY, {});
  await storeSet(ctx, LOANWORDS_KEY, { ...m, [wordId]: { knew, at: now } });
}
/** Save a Spot It result: pair accuracy, and lapse the target and the decoys that fooled the learner. */
export async function saveSpotIt(ctx, model, score, now = Date.now()) {
  const pairs = await storeGet(ctx, PAIRS_KEY, {});
  const next = { ...pairs };
  const decoyBases = new Set(model.decoyIndices.map((i) => model.cells[i].base));
  for (const b of decoyBases) {
    const k = [model.targetId, b].sort().join("|");
    next[k] = { errors: (next[k]?.errors || 0) + (score.pairErrors[k] || 0), trials: (next[k]?.trials || 0) + 1 };
  }
  await storeSet(ctx, PAIRS_KEY, next);
  const fooled = Object.keys(score.fooledBy);
  if (fooled.length) {
    const st = await loadState(ctx, now);
    await storeSet(ctx, CARDS_KEY, lapseLetters(st.cards, [model.targetId, ...fooled], now));
  }
  const st2 = await loadState(ctx, now);
  await storeSet(ctx, STREAK_KEY, recordActivity(st2.rawStreak, now));
}
export async function saveCheckpoint(ctx, stage, qs, answers, result, now = Date.now()) {
  const st = await loadState(ctx, now);
  await storeSet(ctx, CARDS_KEY, applyCheckpointToCards(st.cards, qs, answers, now));
  const prev = await storeGet(ctx, CHECKPOINTS_KEY, {});
  await storeSet(ctx, CHECKPOINTS_KEY, { ...prev, [stage]: { right: result.right, total: result.total, at: now } });
  await storeSet(ctx, STREAK_KEY, recordActivity(st.rawStreak, now));
}

// ---- round 4 exercises: syllable ladder, fade-out recall, gender cards, per-word transliteration fading
export const LADDER_KEY = "curriculum.ladder";   // { level, best, cleared, at }
export const GENDER_KEY = "curriculum.gender";   // { iAm: "m"|"f", stats:{ [pairId]:{right,total} } }

async function touchStreak(ctx, now) {
  const st = await loadState(ctx, now);
  await storeSet(ctx, STREAK_KEY, recordActivity(st.rawStreak, now));
}

/** Save a ladder session: resume level, and SRS outcomes (misses lapse "syllable:<id>" cards, hits review existing ones). */
export async function saveLadder(ctx, state, now = Date.now()) {
  const kindOf = (id) => (/-final$/.test(id) ? "letter" : "syllable");
  const outcomes = [
    ...state.missed.map((id) => ({ id: kindOf(id) === "letter" ? `letter:${id}` : syllableCardId(id), kind: kindOf(id), good: false })),
    ...state.right.filter((id) => !state.missed.includes(id)).map((id) => ({ id: kindOf(id) === "letter" ? `letter:${id}` : syllableCardId(id), kind: kindOf(id), good: true })),
  ];
  if (outcomes.length) {
    const st = await loadState(ctx, now);
    await storeSet(ctx, CARDS_KEY, applyOutcomesToCards(st.cards, outcomes, now));
  }
  const prev = await storeGet(ctx, LADDER_KEY, {});
  await storeSet(ctx, LADDER_KEY, { level: state.cleared ? 1 : state.level, best: Math.max(prev.best || 0, state.best), cleared: !!(prev.cleared || state.cleared), at: now });
  if (state.answered) await touchStreak(ctx, now);
}

/** Save one fade-out recall attempt for a line. Returns { level, card }. `played` = the fade level the learner practised. */
export async function saveFade(ctx, lineId, played, correct, now = Date.now()) {
  const st = await loadState(ctx, now);
  const id = lineCardId(lineId);
  const have = st.cards[id] || newCard({ id, kind: "prayerLine", now });
  const stored = have.fadeLevel ?? 0;
  const fadeLevel = nextFadeLevel(stored, played, correct);
  const card = { ...review(have, correct ? 3 : 1, now), fadeLevel };
  await storeSet(ctx, CARDS_KEY, { ...st.cards, [id]: card });
  await storeSet(ctx, STREAK_KEY, recordActivity(st.rawStreak, now));
  return { level: fadeLevel, card };
}

/** Save gender-quiz answers: right/total per pair, and SRS cards "gender:<pairId>" (misses lapse; hits review existing). */
export async function saveGender(ctx, results, now = Date.now()) {
  const stats = (await storeGet(ctx, GENDER_KEY, {})) || {};
  const per = { ...(stats.stats || {}) };
  for (const r of results) per[r.id] = { right: (per[r.id]?.right || 0) + (r.good ? 1 : 0), total: (per[r.id]?.total || 0) + 1 };
  await storeSet(ctx, GENDER_KEY, { ...stats, stats: per });
  const st = await loadState(ctx, now);
  await storeSet(ctx, CARDS_KEY, applyOutcomesToCards(st.cards, results.map((r) => ({ id: genderCardId(r.id), kind: "genderPair", good: r.good })), now));
  if (results.length) await touchStreak(ctx, now);
}
export async function setLearnerGender(ctx, iAm) {
  const g = (await storeGet(ctx, GENDER_KEY, {})) || {};
  await storeSet(ctx, GENDER_KEY, { ...g, iAm });
  try { ctx?.settings?.set?.({ gender: iAm }); } catch { /* best effort */ } // keep the one shared setting in step (Settings > My gender)
}

/** Update a word card's transliteration scaffold after a review (see scaffold.js). */
export async function updateScaffold(ctx, cardId, rating, card, now = Date.now()) {
  const map = (await storeGet(ctx, SCAFFOLD_KEY, {})) || {};
  const start = ctx?.settings?.get?.("scaffoldStart") === "faint" ? "faint" : "full";
  await storeSet(ctx, SCAFFOLD_KEY, { ...map, [cardId]: nextScaffold(map[cardId], { rating, stability: card.stability, now, start }) });
}
export async function setScaffoldPin(ctx, cardId, pinned) {
  const map = (await storeGet(ctx, SCAFFOLD_KEY, {})) || {};
  const start = ctx?.settings?.get?.("scaffoldStart") === "faint" ? "faint" : "full";
  const cur = map[cardId] || { level: start === "faint" ? 1 : 0, pinned: false, advancedOn: null };
  await storeSet(ctx, SCAFFOLD_KEY, { ...map, [cardId]: { ...cur, pinned: !!pinned } });
}

/**
 * Finish a quick check. C-01: the lesson is completed (done mark, streak day) only when the learner PASSED: at least
 * PASS_SHARE (70%) of the questions right on the first try (exercises.session.js passMark). Below the mark the answers
 * still feed the SRS (the lesson's cards are created, misses lapse, hits review) but nothing marks the lesson done.
 * Returns { added, updated, completed, passed, right, need, of }.
 */
export async function saveQuickCheck(ctx, lesson, questions, results, now = Date.now()) {
  if (!questions.length || !Object.keys(results).length) return { added: 0, updated: 0, completed: false, passed: false, right: 0, need: passMark(questions.length), of: questions.length };
  const outcomes = questions.filter((q) => q.cardId && q.id in results).map((q) => ({ id: q.cardId, kind: q.cardKind || "word", good: !!results[q.id], create: true }));
  const right = questions.filter((q) => results[q.id] === true).length, of = questions.length, need = passMark(of);
  const ok = passedCheck(right, of);
  if (!ok) {
    // Not passed: review cards only (all or nothing), no done mark and no streak day.
    const full = await fullLesson(lesson);
    const st = await loadState(ctx, now);
    const oldCards = await storeGet(ctx, CARDS_KEY, undefined);
    const { cards: base, added } = ensureCards(st.cards, full, now);
    const cards = outcomes.length ? applyOutcomesToCards(base, outcomes, now) : base;
    await storeWriteAll(ctx, [{ key: CARDS_KEY, value: cards, old: oldCards }]);
    return { added, updated: outcomes.length, completed: false, passed: false, right, need, of };
  }
  // One batch: the lesson's cards, the answers' effect on them, the done mark and the streak are written together or not at all (throws StoreWriteError).
  const { added, completed, writes } = await planCompletion(ctx, lesson, now, outcomes.length ? (cards) => applyOutcomesToCards(cards, outcomes, now) : null);
  await storeWriteAll(ctx, writes);
  pointToNext(lesson, completed);
  return { added, updated: outcomes.length, completed: true, passed: true, right, need, of };
}
