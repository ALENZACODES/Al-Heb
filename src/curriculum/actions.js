/** Store-backed learning actions shared by the Lane 1 views and the home screen. */
import { storeGet, storeSet, PROGRESS_KEY, CARDS_KEY, STREAK_KEY } from "./dom.js";
import { ensureCards, recordActivity, currentStreak, applyOutcomesToCards, syllableCardId, lineCardId, genderCardId } from "./progress.js";
import { review, newCard } from "./srs.js";
import { nextScaffold, SCAFFOLD_KEY } from "./scaffold.js";
import { nextFadeLevel } from "./fade.js";

export async function loadState(ctx, now = Date.now()) {
  const progress = await storeGet(ctx, PROGRESS_KEY, { completed: {} });
  const cards = await storeGet(ctx, CARDS_KEY, {});
  const streak = await storeGet(ctx, STREAK_KEY, null);
  const placementStart = await storeGet(ctx, "placement.startLesson", null);
  const normCards = Array.isArray(cards) ? Object.fromEntries(cards.filter((c) => c?.id).map((c) => [c.id, c])) : cards;
  return { placementStart, completed: progress.completed || {}, cards: normCards, streak: currentStreak(streak, now), rawStreak: streak };
}

/** Mark a lesson complete, create its SRS cards, count today as active. Idempotent for cards. */
export async function completeLesson(ctx, lesson, now = Date.now()) {
  const st = await loadState(ctx, now);
  const completed = { ...st.completed, [lesson.id]: st.completed[lesson.id] || now };
  const { cards, added } = ensureCards(st.cards, lesson, now);
  await storeSet(ctx, CARDS_KEY, cards, { required: true });
  await storeSet(ctx, PROGRESS_KEY, { completed }, { required: true });
  await storeSet(ctx, STREAK_KEY, recordActivity(st.rawStreak, now));
  return { added, completed };
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
  await storeSet(ctx, CARDS_KEY, { ...st.cards, [cardId]: next }, { required: true });
  await storeSet(ctx, STREAK_KEY, recordActivity(st.rawStreak, now));
  if (cardId.startsWith("word:")) await updateScaffold(ctx, cardId, rating, next, now);
  return next;
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

/** Placement unlocks only its chosen entry; earlier lessons remain uncompleted. */
export function unmetPrerequisites(lesson, state) {
  if (lesson.track === "read" && state.placementStart === lesson.id) return [];
  return lesson.prerequisites.filter((id) => !state.completed[id]);
}
