/**
 * Lesson-loop logic shared by the exercise players (pure, no DOM). Draft: not tested with learners.
 *  - sequenceExercises: reorders a lesson's exercises so the same type is not shown twice in a row when it can be avoided.
 *  - createSession: the queue. First attempts are what counts (accuracy and SRS); a miss is repeated ONCE at the end of the
 *    lesson (no extra marks either way); skip is penalty-free (nothing is recorded, the item comes back once, and a second
 *    skip drops it, ungraded); undo reverts the last answer so a mis-tap costs nothing.
 *  - choice questions for lessons that have no exercises of their own (letters and words): look-alike distractors that are
 *    never also correct.
 *  - feedback hooks (haptics, sound) that are off unless the learner turned them on, and never vibrate under reduced motion.
 */
import { showAnswerBand } from "../shell/answer-band.js";
import { plain } from "../shell/plain-copy.js";
import { rng, shuffled, decoysFor } from "./spotit.js";
import { letterSound } from "../pronunciation/forTradition.js";
import { shapeLabel, wordLabel } from "../letters/shapetext.js";

// ------------------------------------------------------------------------------------------------ variety
/** Can `rest` be arranged with no equal types adjacent, starting with something other than `prev`? */
function arrangeable(rest, prev) {
  const m = rest.length, c = {};
  for (const e of rest) c[e.type] = (c[e.type] || 0) + 1;
  return Object.entries(c).every(([t, n]) => n <= Math.ceil(m / 2) && (t !== prev || n <= Math.floor(m / 2)));
}
/**
 * Interleave: keep the author's order as far as possible, but never place the same type twice in a row when an arrangement
 * without repeats still exists for what is left (so a greedy pick cannot paint itself into a corner).
 */
export function sequenceExercises(exs) {
  const rest = [...exs], out = [];
  while (rest.length) {
    const prev = out.at(-1)?.type;
    let pick = -1;
    for (let i = 0; i < rest.length && pick < 0; i++) {
      if (rest[i].type === prev) continue;
      if (arrangeable(rest.filter((_, k) => k !== i), rest[i].type)) pick = i;
    }
    if (pick < 0) pick = rest.findIndex((e) => e.type !== prev);
    if (pick < 0) pick = 0;
    out.push(...rest.splice(pick, 1));
  }
  return out;
}
/** Number of adjacent same-type pairs (0 is ideal). */
export const backToBack = (exs) => exs.reduce((n, e, i) => n + (i > 0 && exs[i - 1].type === e.type ? 1 : 0), 0);

// ------------------------------------------------------------------------------------------------ session
/** @param {{id:string}[]} items  @param {{retry?:boolean, carry?:{it:{id:string}, right:boolean}[]}} [o] */
export function createSession(items, o = {}) {
  const retry = o.retry !== false;
  const queue = items.map((it) => ({ it, attempt: 1, skips: 0 }));
  const first = {};          // id -> boolean, first attempt only
  const skipped = new Set(); // ids dropped after a second skip (never answered)
  let resolved = 0, total = items.length, last = null, retried = 0, retriedRight = 0, retrySkips = 0;
  const length = items.length + (o.carry || []).length; // C-02: the lesson's fixed length (the denominator never moves)
  // carry: answers already given in an earlier visit ({ it, right }). They count as answered; a miss comes back once at the end, as it would have.
  for (const c of o.carry || []) { first[c.it.id] = !!c.right; resolved++; total++; if (!c.right && retry) { queue.push({ it: c.it, attempt: 2, skips: 0 }); total++; } }
  const api = {
    current: () => queue[0]?.it ?? null,
    isRetry: () => (queue[0]?.attempt ?? 1) > 1,
    done: () => queue.length === 0,
    /** Record the answer to the current item. Returns { first, requeued }. */
    answer(correct) {
      const cur = queue[0]; if (!cur) return null;
      last = { cur: { ...cur }, wasFirst: first[cur.it.id], resolved, total, retried, retriedRight, queueLen: queue.length, requeued: false };
      queue.shift();
      const id = cur.it.id;
      if (cur.attempt === 1) {
        first[id] = !!correct;
        if (!correct && retry) { queue.push({ it: cur.it, attempt: 2, skips: 0 }); total++; last.requeued = true; }
        resolved++;
      } else { retried++; if (correct) retriedRight++; resolved++; }
      return { first: cur.attempt === 1, requeued: last.requeued };
    },
    /**
     * Undo is for a slipped tap on a right answer. A first-try miss cannot be undone: the right answer is already on screen, so
     * undoing it and picking again would turn a miss into a "first try" (live finding, 2026-11-11; it broke the C-01 pass mark).
     */
    canUndo: () => !!last && !(last.cur.attempt === 1 && first[last.cur.it.id] === false),
    /** Undo the last answer (only until the next answer/skip, and never a first-try miss). Returns true when something was undone. */
    undo() {
      if (!api.canUndo()) return false;
      if (last.requeued) queue.pop();
      queue.unshift(last.cur);
      if (last.cur.attempt === 1) { if (last.wasFirst === undefined) delete first[last.cur.it.id]; else first[last.cur.it.id] = last.wasFirst; }
      ({ resolved, total, retried, retriedRight } = last);
      last = null; return true;
    },
    /**
     * Skip with no penalty: nothing recorded. Back of the queue once; a second skip drops the item (counted as skipped).
     * I5: a retry (the repeat of a first-try miss) is dropped at once: its first answer already counts and its review card is
     * already marked to come back, so the learner is never held in the retry loop. The result says what happens next:
     * { dropped, retry, again } where `again` is true when the skipped item is the only one left and so shows again at once.
     */
    skip() {
      const cur = queue[0]; if (!cur) return null;
      last = null; queue.shift();
      if (cur.attempt > 1) { retrySkips++; resolved++; return { dropped: true, retry: true, again: false }; }
      if (cur.skips >= 1) { skipped.add(cur.it.id); resolved++; return { dropped: true, retry: false, again: false }; }
      queue.push({ ...cur, skips: cur.skips + 1 }); return { dropped: false, retry: false, again: queue.length === 1 };
    },
    firstResults: () => ({ ...first }),
    skippedIds: () => [...skipped],
    /**
     * resolved/total/fraction: every attempt, retries included (total grows by one per first-try miss; kept for older callers).
     * length/position/retries: the honest counter (C-02). `length` is fixed; `position` is how many of those questions have had
     * their first try (or were dropped after two skips); `retries` counts the repeat questions added so far, shown apart from
     * the length ("1 retry so far"); `retriesLeft` is how many are still to come. `share` is position / length.
     */
    progress: () => {
      const position = Object.keys(first).length + skipped.size, retries = total - length;
      return { resolved, total, fraction: total ? resolved / total : 0, length, position, retries, retriesDone: retried, retriesSkipped: retrySkips, retriesLeft: Math.max(0, retries - retried - retrySkips), share: length ? Math.min(1, position / length) : 0 };
    },
    stats() {
      const ids = Object.keys(first), right = ids.filter((k) => first[k]).length;
      return { answered: ids.length, right, missed: ids.filter((k) => !first[k]), skipped: [...skipped], retried, retriedRight, retrySkips,
        accuracy: ids.length ? right / ids.length : null };
    },
  };
  return api;
}

// pass mark (C-01): see passmark.js (kept apart so the store actions can use it without this module)
export { PASS_SHARE, passMark, passed, passRuleText, retryText } from "./passmark.js";

/** "m:ss" for a duration in ms. */
export function fmtDuration(ms) { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
export const pct = (x) => (x == null ? "n/a" : `${Math.round(x * 100)}%`);

/** I5: what the learner is told after Skip (the next card shows it), from skip()'s result. */
export function skipNotice(r) {
  if (!r) return "";
  if (r.retry) return "Skipped. Your first answer still counts, and this one comes back in your review.";
  if (r.dropped) return "Skipped again, so it is left out of this check. It is not counted either way.";
  if (r.again) return "Skipped. It is the last one left, so here it is again. Skip once more to leave it out.";
  return "Skipped. It will come back at the end.";
}

// ------------------------------------------------------------------------------------------------ copy (encouraging, not gushing)
const OK = ["Correct.", "Right.", "Yes.", "That's it."];
export function feedbackText(correct, { retry = false, streak = 0, n = 0 } = {}) {
  if (retry) return correct ? "Got it this time." : "Still tricky. It will come back in your review.";
  return correct ? OK[n % OK.length] + (streak >= 4 ? ` ${streak} in a row.` : "") : "Not quite.";
}
/** Closing line for the summary, from first-attempt accuracy. Never claims mastery. */
export function closingLine(accuracy, missedN) {
  if (accuracy == null) return "Nothing answered yet.";
  if (accuracy === 1) return plain("closingPerfect");
  if (accuracy >= 0.7) return plain("closingSolid", { n: missedN });
  return plain("closingTough", { n: missedN });
}

// ------------------------------------------------------------------------------------------------ feel hooks
export const reducedMotion = (win = globalThis) => !!win?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
/** Opt-in: settings "haptics" must be true. Never under reduced motion. */
export const hapticsOn = (ctx, win = globalThis) => ctx?.settings?.get?.("haptics") === true && ctx?.settings?.get?.("calmMode") !== true && !reducedMotion(win) && typeof win?.navigator?.vibrate === "function";
/** Opt-in: settings "soundEffects" must be true and the shell must offer ctx.sfx.play(name). */
export const soundOn = (ctx) => ctx?.settings?.get?.("soundEffects") === true && ctx?.settings?.get?.("calmMode") !== true && ctx?.settings?.get?.("audioFree") !== true && typeof ctx?.sfx?.play === "function"; // a sound is never the only cue: the verdict is also written (feedbackText) and marked on the answer
/** Fire the feedback hooks for one answer. Returns what it did (for tests). Never throws. */
export function fireFeedback(ctx, correct, win = globalThis) {
  const did = { haptic: false, sound: false };
  try { if (hapticsOn(ctx, win)) { win.navigator.vibrate(correct ? [12] : [30, 40, 30]); did.haptic = true; } } catch { /* ignore */ }
  try { if (soundOn(ctx)) { ctx.sfx.play(correct ? "correct" : "wrong"); did.sound = true; } } catch { /* ignore */ }
  try { if (win?.document?.body && ctx?.settings?.get?.("calmMode") !== true) showAnswerBand(!!correct, { doc: win.document, win, settings: ctx?.settings, words: false }); } catch { /* ignore */ } // C-06: the screen writes the one verdict; the band is colour only
  return did;
}

// ------------------------------------------------------------------------------------------------ choice questions (letters and words)
const norm = (s) => String(s ?? "").normalize("NFC").trim().toLowerCase();
/** Shuffle options and report where the answer landed. `answer` must be one of `options`. */
export function placeOptions(options, answer, rand) { const o = shuffled(options, rand); return { options: o, answerIndex: o.indexOf(answer) }; }

/**
 * Sound tokens a letter can make in a tradition, read from its consonants.json record (ipa and english, every dagesh/dot variant).
 * Bracketed IPA symbols are split on "~"/"/" and stripped of diacritics; community footnotes in plain parentheses are dropped,
 * but a parenthesis that itself starts with a bracket (e.g. "([p] with dagesh)") is kept. "silent" and "glottal" in the English
 * line become the tokens "0" and "?" so alef, ayin and a word-final he fall into one silent class. The English line itself is
 * a token too, so two letters read out with the same words always clash even when the IPA has no brackets.
 * @returns {Set<string>}
 */
export function soundTokens(rec, tradition, fallbackEn = "") {
  const out = new Set(), t = tradition || "sephardi";
  const take = (o) => o?.[t] || (t === "sephardi" ? o?.american_synagogue : "") || o?.israeli || "";
  const add = (ipa, en) => {
    const flat = String(ipa || "").replace(/\((?!\s*\[)[^)]*\)/g, " ");
    for (const m of flat.matchAll(/\[([^\]]+)\]/g)) for (const part of m[1].split(/[~/]/)) {
      const k = part.normalize("NFD").replace(/[\u0300-\u036f\u02b0-\u02ff\u0361\u035c]/g, "").trim(); if (k) out.add(k);
    }
    if (/∅/.test(flat)) out.add("0");
    const e = norm(en); if (e) out.add("en:" + e);
    if (/\bsilent\b/.test(e)) out.add("0");
    if (/glottal/.test(e)) out.add("?");
    if (out.has("ʔ")) out.add("?");
  };
  if (!rec) { add("", fallbackEn); return out; }
  add(take(rec.ipa), take(rec.english) || fallbackEn);
  for (const v of rec.variants || []) add(take(v.ipa), "");
  return out;
}
/** True when two letters share a sound token in the tradition (so a question about one has the other as a correct answer too). */
export function soundsClash(a, b, tradition) { const x = soundTokens(a, tradition), y = soundTokens(b, tradition); for (const k of x) if (y.has(k)) return true; return false; }

/**
 * Distractor names for a letter: look-alikes first (data/letters/confusables.json), then other letters. Never the target,
 * never a duplicate, never the base form of a final letter for the final form (or the reverse), and for sound questions never
 * a letter that makes a sound the target also makes. With `consonants` (Map id -> record) the sound test compares phonemes in
 * the learner's `tradition`; without it, the older comparison of letters.json `sound.en` is used.
 */
export function letterDistractors(targetId, letters, confusables, rand, { n = 2, bySound = false, consonants, tradition } = {}) {
  const t = letters.get(targetId);
  const root = (id) => letters.get(id)?.finalOf || id;
  const sameSound = (id) => {
    if (!bySound) return false;
    const a = consonants?.get?.(targetId), b = consonants?.get?.(id);
    if (a && b) return soundsClash(a, b, tradition);
    return norm(letters.get(id)?.sound?.en) === norm(t?.sound?.en);
  };
  const same = (id) => id === targetId || root(id) === root(targetId) || sameSound(id);
  const look = decoysFor(targetId, confusables).letters.filter((id) => letters.has(id) && !same(id));
  const pool = [...letters.keys()].filter((id) => !same(id) && !look.includes(id));
  return [...new Set([...shuffled(look, rand), ...shuffled(pool, rand)])].slice(0, n);
}

// ------------------------------------------------------------------------------------------------ word-meaning distractors
/** Consonant skeleton: the Hebrew string without niqqud, cantillation and maqaf (U+0591 to U+05C7). */
export const skeleton = (he) => String(he ?? "").normalize("NFC").replace(/[\u0591-\u05C7]/g, "");
const memo = (f) => { const m = new Map(); return (x) => { let v = m.get(x); if (v === undefined) { v = f(x); m.set(x, v); } return v; }; };
const toks = memo((s) => norm(s).replace(/\([^)]*\)/g, " ").replace(/[^\p{L}\p{N}\s]+/gu, " ").split(/\s+/).filter(Boolean));
const meaningParts = memo((en) => String(en ?? "").replace(/\([^)]*\)/g, " ").split(/[;,/]/).map((p) => toks(p)).filter((p) => p.length));
const hasRun = (hay, needle) => { for (let i = 0; i + needle.length <= hay.length; i++) if (needle.every((w, j) => hay[i + j] === w)) return true; return false; };
/** True when gloss `g` could also be read as a correct answer for `answer`: shares a whole-word phrase either way, a stem, or is a near duplicate. */
const STOP = new Set(["a", "an", "the", "to", "of", "in", "is", "he", "she", "it", "who", "and", "my", "our", "your", "you", "we", "they"]);
export function glossesOverlap(answer, g) {
  const A = meaningParts(answer), G = toks(g);
  if (!A.length || !G.length) return false;
  for (const part of A) {
    if (hasRun(G, part)) return true;
    if (part.length === 1 && part[0].length >= 4 && G.some((w) => w.startsWith(part[0]))) return true; // "peace" vs "peaceful"
  }
  const flatA = A.flat();
  for (const part of meaningParts(g)) if (part.join("").length >= 3 && hasRun(flatA, part)) return true; // distractor inside the answer
  const a = new Set(flatA.filter((w) => !STOP.has(w))), b = new Set(G.filter((w) => !STOP.has(w)));
  if (!a.size || !b.size) return false;
  let inter = 0; for (const w of a) if (b.has(w)) inter++;
  return inter / new Set([...a, ...b]).size >= 0.5;
}
const wordKey = (w) => `${w.he}|${norm(w.en)}`;
/**
 * The pool in lesson order plus the cut index of the current lesson: entries before `cut` come from lessons up to and including it.
 * With `order` (ordered lessons) the position comes from the lesson that first teaches the word; otherwise the pool's own order is
 * taken to be lesson order (how the lesson page builds it) and the cut is the current lesson's last word.
 */
function earlierPool(pool, lesson, order) {
  if (Array.isArray(order) && order.length) {
    const first = new Map(); order.forEach((l, i) => l.words.forEach((w) => { if (!first.has(wordKey(w))) first.set(wordKey(w), i); }));
    const at = order.findIndex((l) => l.id === lesson.id); if (at < 0) return { list: pool, cut: pool.length };
    const list = pool.map((p, i) => [first.get(wordKey(p)) ?? 1e9, i, p]).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    return { list: list.map((x) => x[2]), cut: list.filter((x) => x[0] <= at).length };
  }
  const mine = new Set(lesson.words.map(wordKey)); let last = -1;
  const seen = new Set(); // a word re-taught later counts at its first appearance
  pool.forEach((p, i) => { const k = wordKey(p); if (mine.has(k) && !seen.has(k)) { seen.add(k); last = i; } });
  return { list: pool, cut: last < 0 ? pool.length : last + 1 };
}
const MIN_EARLIER = 8;

/**
 * Build the quick-check questions for a lesson that has no exercises: one per letter (glyph -> name, and sound -> glyph) and
 * one per word (Hebrew -> meaning, options drawn from other lessons' words with a different meaning).
 * Question: { id, kind, prompt, promptHe?, options:[{text,he?}], answerIndex, why, cardId? }
 */
export function buildChoiceQuestions(lesson, { letters, confusables, consonants, mnemonics, wordPool = [], lessons: order }, { seed = 1, optionCount = 3, tradition, lessons: order2 } = {}) {
  const soundEn = (id, L) => letterSound(consonants?.get?.(id), tradition, { fallbackEn: L.sound?.en || "" }).en;
  const rand = rng(seed), qs = [];
  const shapeOf = (x) => shapeLabel(letters.get(x), mnemonics?.get?.(x)); // '' when there is no shape text; then the plain glyph is all there is
  const meaningKeys = new Set(lesson.words.map((w) => norm(w.en)));
  // C4: the reason a wrong pick is wrong, from the data only: what the picked letter is, plus the look-alike rule that names both
  // letters (data/letters/confusables.json hint, else the target's mnemonics.json look-alike line when it names the picked letter).
  const pickedLetterWhy = (pid, target, already = "") => {
    if (!pid || pid === target) return "";
    const P = letters.get(pid); if (!P) return "";
    const snd = soundEn(pid, P);
    const set = (confusables?.sets || []).find((s) => s.letters.includes(pid) && s.letters.includes(target));
    const look = mnemonics?.get?.(target)?.lookalike;
    const rule = set?.hint || (look && new RegExp(`\\b${String(P.name).replace(/[^A-Za-z]/g, "")}\\b`, "i").test(look) ? look : "");
    return `You picked ${P.name}: that is ${P.he}${snd ? `, which sounds like ${snd}` : ""}.${rule && rule !== already ? " " + rule : ""}`;
  };
  lesson.letters.forEach((id, i) => {
    const L = letters.get(id); if (!L) return;
    const names = [id, ...letterDistractors(id, letters, confusables, rand, { n: optionCount - 1 })];
    const named = placeOptions(names.map((x) => letters.get(x).name), L.name, rand);
    const hint = (confusables?.sets || []).find((s) => s.letters.includes(id))?.hint;
    const byName = new Map(names.map((x) => [letters.get(x).name, x]));
    qs.push({ id: `${lesson.id}-q-name-${id}`, kind: "letter-name", prompt: "Which letter is this?", promptHe: L.he, promptLabel: shapeOf(id),
      options: named.options.map((text) => ({ text })), answerIndex: named.answerIndex, optionWhy: named.options.map((text) => pickedLetterWhy(byName.get(text), id, hint)),
      why: `This is ${L.name}${soundEn(id, L) ? `, which sounds like ${soundEn(id, L)}` : ""}.${hint ? " Tip: " + hint : ""}`, cardId: `letter:${id}`, cardKind: "letter" });
    if (L.sound?.en) {
      const ids = [id, ...letterDistractors(id, letters, confusables, rand, { n: optionCount - 1, bySound: true, consonants, tradition })];
      const g = placeOptions(ids.map((x) => letters.get(x).he), L.he, rand);
      qs.push({ id: `${lesson.id}-q-sound-${id}`, kind: "letter-sound", prompt: `Which letter sounds like: ${soundEn(id, L)}`,
        options: g.options.map((text) => ({ text, he: true, label: shapeOf(ids[ids.findIndex((x) => letters.get(x).he === text)]) })), answerIndex: g.answerIndex, why: `${L.he} is ${L.name}.`, cardId: `letter:${id}`, cardKind: "letter",
        optionWhy: g.options.map((text) => pickedLetterWhy(ids.find((x) => letters.get(x).he === text), id)) });
    }
  });
  lesson.words.forEach((w, i) => {
    const ok = (p) => norm(p.en) !== norm(w.en) && !meaningKeys.has(norm(p.en)) && p.he !== w.he && skeleton(p.he) !== skeleton(w.he) && !glossesOverlap(w.en, p.en);
    const pick = (pool) => {
      const uniq = [];
      for (const p of shuffled(pool, rand)) if (uniq.length < MIN_EARLIER && ok(p) && !uniq.some((u) => norm(u.en) === norm(p.en) || glossesOverlap(u.en, p.en) || skeleton(u.he) === skeleton(p.he))) uniq.push(p);
      return uniq;
    };
    // lessons up to this one; when they give too few usable glosses, reach into the next lessons only as far as needed
    const { list, cut } = earlierPool(wordPool, lesson, order2 || order);
    let k = cut, good = 0; for (let i = 0; i < k; i++) if (ok(list[i])) good++;
    while (good < MIN_EARLIER && k < list.length) { if (ok(list[k])) good++; k++; }
    const uniq = pick(list.slice(0, k));
    if (uniq.length < optionCount - 1) return;
    const opts = placeOptions([w.en, ...uniq.slice(0, optionCount - 1).map((p) => p.en)], w.en, rand);
    const heOf = new Map(uniq.slice(0, optionCount - 1).map((p) => [p.en, p.he]));
    qs.push({ id: `${lesson.id}-q-word-${i + 1}`, kind: "word-meaning", prompt: "What does this mean?", promptHe: w.he, promptLabel: wordLabel(w.he, tradition),
      options: opts.options.map((text) => ({ text })), answerIndex: opts.answerIndex, optionWhy: opts.options.map((text) => (heOf.has(text) ? `You picked "${text}": that is ${heOf.get(text)}, a different word.` : "")), why: `${w.he} means "${w.en}".`, cardId: `word:${lesson.id}:${i + 1}`, cardKind: "word" });
  });
  return sequenceExercises(qs.map((q) => ({ ...q, type: q.kind })));
}

/** Audit one choice question: returns a list of problems (empty = fine). Used by tests and by the dev scan. */
export function auditQuestion(q) {
  const bad = [], keys = q.options.map((o) => norm(o.text));
  if (new Set(keys).size !== keys.length) bad.push("duplicate options");
  if (q.answerIndex < 0 || q.answerIndex >= q.options.length) bad.push("answer not among options");
  if (q.options.length < 2) bad.push("fewer than 2 options");
  return bad;
}

// ------------------------------------------------------------------------------------------------ answer-position fairness
/** FNV-1a hash of a string (stable seed from an exercise id; small consecutive integer seeds are correlated and skew the shuffle). */
export function hashSeed(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
/**
 * Options of a `produce` exercise as [{ text, correct }], with the right answer's slot chosen from the id's hash (so slots are
 * spread evenly across a lesson set) and the distractors shuffled into the other slots. Deterministic per exercise id.
 */
export function fairProduceOptions(ex, salt = 0) {
  const h = hashSeed(ex.id + ":" + salt), n = ex.options.length, slot = h % n, rand = rng(h ^ 0x9e3779b9);
  const wrong = shuffled(ex.options.filter((_, i) => i !== ex.answer), rand).map((text) => ({ text, correct: false }));
  wrong.splice(slot, 0, { text: ex.options[ex.answer], correct: true });
  return wrong;
}
