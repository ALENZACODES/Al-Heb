/**
 * Retrieval practice on the letter memory chain (data/letters/memory-chain.json): picture -> sound hook -> word, one chain per letter.
 * Pure functions, no DOM, no storage. Four quick question types, each a spaced-review card "mem:<letterId>:<type>":
 *   pic     a picture; which letter is it?                          (choices include look-alike partners)
 *   hook    a sound hook, in the learner's tradition; which letter?   (choices never share a sound with the answer)
 *   word    a Hebrew word; which letter does it start with, and what sound does that letter make there?
 *           (final forms: which letter does it END with)
 *   recall  the letter; recall its picture, hook and word, then flip the card and grade yourself.
 * A wrong answer is answered with the chain's story and tip, never with a verdict about the learner.
 * Every distractor is plausible (look-alike partners first) but never also correct: not the same letter in its other form,
 * and for the two sound-based types not a letter that makes the answer's sound in the learner's tradition.
 */
import { rng, shuffled } from "../curriculum/spotit.js";
import { soundsClash, hashSeed } from "../curriculum/exercises.session.js";
import { letterSound, respell, normalize } from "../pronunciation/forTradition.js";
import { MEM_TYPES, CHOICE_TYPES, MEM_DELAY_DAYS, memCardId, parseMemCardId, indexChain, hookWord, partnersOf, wordAnchor, canAsk, memoryCardsFor, ensureMemoryCards, spreadConfusables, minConfusableDistance, mergeMemoryIntoQueue, FINAL_RE, DAGESH, str } from "./memory.core.js";
// The light helpers live in memory.core.js (kept off the cold home load); re-exported here so this stays the one public module.
export { MEM_TYPES, CHOICE_TYPES, MEM_DELAY_DAYS, memCardId, parseMemCardId, indexChain, hookWord, partnersOf, wordAnchor, canAsk, memoryCardsFor, ensureMemoryCards, spreadConfusables, minConfusableDistance, mergeMemoryIntoQueue };

/** Glyphs for answer options: the hard form of the two-sound letters, so an option never looks like the other sound's letter. */
const OPTION_GLYPH = { bet: "ב" + DAGESH, kaf: "כ" + DAGESH, pe: "פ" + DAGESH, shin: "שׁ" };
const norm = (s) => String(s ?? "").normalize("NFC").trim().toLowerCase();
const rootOf = (letters, id) => letters.get(id)?.finalOf || id;
export const optionGlyph = (letters, id) => OPTION_GLYPH[id] || letters.get(id)?.he || id;

// ------------------------------------------------------------------------------------------------ chain data
const POSITION_PHRASE = { initial: "at the start of", final: "at the end of", medial: "in the middle of" };
/** The cue for a hook question: 'the sound at the start of "ball"'. */
export function hookCue(entry) { const w = hookWord(entry); return w ? `the sound ${POSITION_PHRASE[entry.sound.hookPosition] || "in"} "${w}"` : ""; }
/**
 * What the chain says about the sound in a tradition, for the feedback after an answer: its explanatory line, and, only where the
 * chain flags that the tradition differs (matches[t] === false), the tradition's own line.
 */
export function soundNotes(entry, tradition) {
  const t = normalize(tradition), s = entry?.sound || {};
  const own = typeof s.perTradition?.[t] === "string" ? s.perTradition[t].trim() : "";
  return [str(s.line), s.matches?.[t] === false ? own : ""].filter(Boolean);
}
/** Replace the letter's own name (every word of it, from both name fields) and glyph inside a cue with a blank, so a cue never gives the answer away. */
export function maskLeak(text, L, entry) {
  let out = String(text ?? "");
  const names = new Set();
  for (const full of [L?.name, entry?.name, L?.nameHe && L.nameHe.replace(/[\u0591-\u05C7]/g, "")].filter(Boolean)) { names.add(full); for (const w of String(full).split(/[\s/]+/)) if (w.length >= 2 && !/^final$/i.test(w)) names.add(w); }
  for (const n of [...names].sort((a, b) => b.length - a.length)) out = out.replace(new RegExp(`(^|[^\\p{L}])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "giu"), "$1___");
  for (const g of [L?.he, entry?.hebrew].filter(Boolean)) out = out.split(g).join("___");
  return out;
}


const tipFor = (confusables, id) => (confusables?.sets || []).find((s) => s.letters.includes(id))?.hint || "";

// ------------------------------------------------------------------------------------------------ short sound text for the "word" options
/** The letter's sound in a tradition, shortened to its first clause: "k with dagesh; kh (loch) without" -> "k with dagesh". */
export function shortSound(rec, tradition, fallbackEn, dagesh) {
  const en = letterSound(rec, tradition, { dagesh, fallbackEn }).en || fallbackEn || "";
  return en.replace(/\s*\([^)]*\)/g, "").split(/[;,]/)[0].trim();
}

// ------------------------------------------------------------------------------------------------ distractors
/**
 * Distractor letter ids: look-alike partners first (up to two, rotated by the seed), then letters the learner has met (`known`), then the rest.
 * Never the target, never its other form (base/final), never a letter whose picture or cue text equals the target's, and for `bySound`
 * never a letter that shares a sound with the target in `tradition`. `noFinal` keeps final forms out (they cannot begin a word).
 */
export function memoryDistractors(targetId, env, rand, { n = 3, bySound = false, noFinal = false, accept, forHook = false } = {}) {
  const { letters, consonants, confusables, tradition, known } = env;
  const root = rootOf(letters, targetId), tgt = env.chain?.get(targetId);
  const hookIsIsraeli = bySound && tgt?.sound?.matches?.[tradition] === false && tradition !== "israeli" && forHook;
  const ok = (id) => {
    if (id === targetId || !letters.has(id) || rootOf(letters, id) === root) return false;
    if (noFinal && FINAL_RE.test(id)) return false;
    if (bySound) {
      const a = consonants?.get?.(targetId), b = consonants?.get?.(id);
      if (a && b ? soundsClash(a, b, tradition) : norm(letters.get(id)?.sound?.en) === norm(letters.get(targetId)?.sound?.en)) return false;
      // a hook that only matches the Israeli value (chain: matches[tradition] === false, e.g. chet "Chanukah" for Sephardi) is heard the Israeli way, so Israeli clashes count too
      if (hookIsIsraeli && a && b && soundsClash(a, b, "israeli")) return false;
    }
    const e = env.chain?.get(id);
    if (tgt && e && e !== tgt) {
      if (norm(e.picture?.idea) && norm(e.picture?.idea) === norm(tgt.picture?.idea)) return false;
      if (bySound && norm(hookWord(e)) && norm(hookWord(e)) === norm(hookWord(tgt))) return false;
    }
    return !accept || accept(id);
  };
  const partners = shuffled([...partnersOf(confusables, targetId)].filter(ok), rand).slice(0, n >= 3 ? 2 : 1);
  const rest = [...letters.keys()].filter((id) => ok(id) && !partners.includes(id));
  const seen = rest.filter((id) => known?.has?.(id)), unseen = rest.filter((id) => !known?.has?.(id));
  const chosen = [...partners];
  for (const id of [...shuffled(seen, rand), ...shuffled(unseen, rand)]) { if (chosen.length >= n) break; if (!accept || accept(id, chosen)) chosen.push(id); }
  return chosen.slice(0, n);
}

function place(options, answerId, rand) { const o = shuffled(options, rand); return { options: o, answerIndex: o.findIndex((x) => x.id === answerId) }; }

/**
 * Build one memory question. Returns null when the chain does not support it (nothing is invented).
 * Shape: { id, kind:"mem-<type>", type, letterId, prompt, promptHe?, cue?, picture?, options:[{id,text,he?,sub?}], answerIndex,
 *          why, story, tip, answerLines[], respelling?, partners[] }   (recall has no options; it is a flip-and-grade card)
 * @param {string} type  @param {string} letterId
 * @param {{chain:Map, letters:Map, consonants?:Map, confusables?:object, tradition?:string, known?:Set<string>}} env
 */
export function buildMemoryQuestion(type, letterId, env, { seed = 1, optionCount = 4 } = {}) {
  const { chain, letters, consonants } = env, tradition = normalize(env.tradition);
  const entry = chain.get(letterId), L = letters.get(letterId);
  if (!canAsk(type, entry, letters, letterId)) return null;
  const e2 = { ...env, tradition }, rand = rng(hashSeed(`${letterId}:${type}:${seed}`));
  const story = str(entry.storyByTradition?.[tradition]) || str(entry.story), tip = str(entry.tip) || tipFor(env.confusables, letterId);
  const hook = hookWord(entry), wordHe = str(entry.word?.he), gloss = str(entry.word?.gloss);
  const soundOf = (id, dagesh) => shortSound(consonants?.get?.(id), tradition, letters.get(id)?.sound?.en || "", dagesh);
  const base = {
    id: memCardId(letterId, type), kind: "mem-" + type, type, letterId, story, tip,
    why: [story, tip].filter(Boolean).join(" "),
    soundNotes: soundNotes(entry, tradition), hook,
    answerLines: [`${L.name}${soundOf(letterId, true) ? `: ${soundOf(letterId, true)}` : ""}`, hook ? `Hook: ${hook}` : "", wordHe ? `${wordHe}${gloss ? ` = ${gloss}` : ""}` : ""].filter(Boolean),
    respelling: wordHe ? respell(wordHe, tradition) : "",
    picture: { src: str(entry.picture?.svg), alt: maskLeak(str(entry.picture?.alt) || str(entry.picture?.idea), L, entry), idea: maskLeak(str(entry.picture?.idea), L, entry) },
    partners: [...partnersOf(env.confusables, letterId)],
  };
  if (type === "recall") return { ...base, prompt: "Remember its picture, its sound hook and its word. Then flip the card.", promptHe: L.he, options: [], answerIndex: -1 };

  const letterOptions = (ids) => ids.map((id) => ({ id, text: letters.get(id).name, he: optionGlyph(letters, id) }));
  if (type === "pic") {
    const ids = [letterId, ...memoryDistractors(letterId, e2, rand, { n: optionCount - 1 })];
    return { ...base, prompt: "Which letter goes with this picture?", ...place(letterOptions(ids), letterId, rand) };
  }
  if (type === "hook") {
    const ids = [letterId, ...memoryDistractors(letterId, e2, rand, { n: optionCount - 1, bySound: true, forHook: true })];
    return { ...base, prompt: "Which letter goes with this sound hook?", cue: maskLeak(hookCue(entry), L, entry), ...place(letterOptions(ids), letterId, rand) };
  }
  // word: first (or, for a final form, last) letter and its sound there
  const anchor = wordAnchor(wordHe, letterId), last = anchor.position === "last";
  const subOf = (id) => soundOf(id, last ? undefined : true);
  const ids = [letterId, ...memoryDistractors(letterId, e2, rand, {
    n: optionCount - 1, bySound: true, noFinal: !last,
    accept: (id, chosen = []) => !!subOf(id) && subOf(id) !== subOf(letterId) && !chosen.some((c) => subOf(c) === subOf(id)),
  })];
  const opts = ids.map((id) => ({ id, text: letters.get(id).name, he: optionGlyph(letters, id), sub: subOf(id) }));
  return { ...base, prompt: last ? "Which letter does this word end with, and what sound does it make?" : "Which letter does this word start with, and what sound does it make there?",
    promptHe: wordHe, position: anchor.position, ...place(opts, letterId, rand) };
}

/**
 * Words shown after an answer (pure). Right: a short confirmation and the story. Not right: the answer in a calm sentence, then the story and
 * the look-alike tip. Never a verdict on the learner ("wrong", "incorrect", "mistake" do not occur).
 * @returns {{lead:string, story:string, tip:string, notes:string[], respelling:string}}
 */
export function memoryFeedback(q, correct) {
  const right = q.options[q.answerIndex];
  const lead = correct ? "Right." : right ? `Close. It is ${right.text}${right.sub ? `, ${right.sub}` : ""}.` : "";
  return { lead, story: q.story || "", tip: correct ? "" : q.tip || "", notes: q.type === "hook" ? q.soundNotes : [], respelling: q.type === "word" ? q.respelling : "" };
}

/** Problems with a built question (empty = fine): used by the unit tests and the dev scan. */
export function auditMemoryQuestion(q, env) {
  const bad = [], { letters, consonants } = env, tradition = normalize(env.tradition);
  if (!q) return ["no question"];
  if (q.type === "recall") return q.options.length ? ["recall card has options"] : [];
  const ids = q.options.map((o) => o.id);
  if (new Set(ids).size !== ids.length) bad.push("duplicate option letters");
  if (new Set(q.options.map((o) => norm(o.text))).size !== ids.length) bad.push("duplicate option names");
  if (q.options.length < 3) bad.push("fewer than 3 options");
  if (ids.filter((id) => id === q.letterId).length !== 1 || ids[q.answerIndex] !== q.letterId) bad.push("answer not exactly once at answerIndex");
  const root = rootOf(letters, q.letterId);
  for (const id of ids) {
    if (id === q.letterId) continue;
    if (rootOf(letters, id) === root) bad.push(`${id} is another form of the answer`);
    if (q.type !== "pic") { const a = consonants?.get?.(q.letterId), b = consonants?.get?.(id); if (a && b && soundsClash(a, b, tradition)) bad.push(`${id} shares a sound with ${q.letterId}`); }
    if (q.type === "word" && q.position === "first" && FINAL_RE.test(id)) bad.push(`${id} cannot start a word`);
  }
  if (q.type === "word") { const subs = q.options.map((o) => norm(o.sub)); if (subs.some((s) => !s) || new Set(subs).size !== subs.length) bad.push("word options need distinct sounds"); }
  if (q.type === "hook" && !q.cue) bad.push("no cue");
  if (q.cue && /___/.test(q.cue) === false && new RegExp(`\\b${letters.get(q.letterId).name}\\b`, "i").test(q.cue)) bad.push("cue names the letter");
  return bad;
}

