/**
 * The light half of the letter memory chain (see memory.js for the question builder): card ids, chain index, which cards can be asked,
 * card descriptors, and the review-queue spacing. Split out so the home page, review queue and lesson actions can use them without loading
 * the question builder and its pronunciation imports (about 75 KB of script on a cold first load). Pure functions, no DOM, no storage.
 */
import { decoysFor } from "../curriculum/spotit.js";
import { cellsOf } from "../curriculum/hebrew.js";
import { newCard, MS_DAY } from "../curriculum/srs.js";

export const MEM_TYPES = Object.freeze(["pic", "hook", "word", "recall"]);
export const CHOICE_TYPES = Object.freeze(["pic", "hook", "word"]);
/** Days after a lesson before each card type first falls due: the first retrieval comes a day later (not straight after the lesson), and the four types do not arrive at once. */
export const MEM_DELAY_DAYS = Object.freeze({ pic: 1, hook: 2, word: 3, recall: 5 });

export const memCardId = (letterId, type) => `mem:${letterId}:${type}`;
/** @returns {{kind:"mem", key:string, letterId:string, type:string}|null} */
export function parseMemCardId(id) {
  const m = /^mem:([a-z-]+):(pic|hook|word|recall)$/.exec(String(id));
  return m ? { kind: "mem", key: String(id), letterId: m[1], type: m[2] } : null;
}

export const FINAL_RE = /-final$/;
export const DAGESH = "ּ", SIN_DOT = "ׂ";

/** Index a parsed memory-chain.json: Map letterId -> entry. Entries without an id are dropped; null/garbage gives an empty Map. */
export function indexChain(raw) {
  const list = Array.isArray(raw?.letters) ? raw.letters : [];
  return new Map(list.filter((e) => e && typeof e.id === "string").map((e) => [e.id, e]));
}
export const str = (v) => (typeof v === "string" ? v.trim() : "");
/** The one-word sound hook ("ball", "Bach"). */
export const hookWord = (entry) => str(entry?.sound?.hook);

/** letterId -> Set of look-alike partners from data/letters/confusables.json (both directions). */
export function partnersOf(confusables, letterId) { return new Set(decoysFor(letterId, confusables).letters); }

/** Which letter a word shows at the position this letter is asked about, with the dagesh/dot facts needed to name the sound. */
export function wordAnchor(he, letterId) {
  const cells = cellsOf(String(he ?? "")), last = FINAL_RE.test(letterId);
  const c = last ? cells.at(-1) : cells[0];
  if (!c || c.base !== letterId) return null;
  if (c.base === "shin" && c.text.includes(SIN_DOT)) return null; // a sin: not the sh sound this letter card teaches
  return { position: last ? "last" : "first", dagesh: !last && c.text.includes(DAGESH) };
}
/** Can this card type be asked for this chain entry? (No guessing: a missing piece means no card.) */
export function canAsk(type, entry, letters, letterId) {
  if (!entry || !letters?.has(letterId)) return false;
  if (type === "pic") return !!(str(entry.picture?.alt) || str(entry.picture?.idea));
  if (type === "hook") return !!hookWord(entry);
  if (type === "word") {
    const a = str(entry.word?.he) && wordAnchor(entry.word.he, letterId);
    return !!a && (!entry.word.position || (entry.word.position === "final") === (a.position === "last"));
  }
  if (type === "recall") return !!str(entry.word?.he) && !!hookWord(entry);
  return false;
}
/** Card descriptors for letters: [{id, kind:"mem", letterId, type, delayDays}] for every askable type. */
export function memoryCardsFor(letterIds, chain, letters) {
  const out = [];
  for (const letterId of letterIds) for (const type of MEM_TYPES) if (canAsk(type, chain.get(letterId), letters, letterId)) out.push({ id: memCardId(letterId, type), kind: "mem", letterId, type, delayDays: MEM_DELAY_DAYS[type] });
  return out;
}
/** Add missing memory cards (new cards fall due `delayDays` after `now`). Does not mutate `cards`. */
export function ensureMemoryCards(cards, descriptors, now) {
  const out = { ...cards }; let added = 0;
  for (const d of descriptors) if (!out[d.id]) { out[d.id] = newCard({ id: d.id, kind: "mem", now: now + d.delayDays * MS_DAY }); added++; }
  return { cards: out, added };
}

// ------------------------------------------------------------------------------------------------ order in time
/**
 * Re-order memory card ids so cards of look-alike letters (or the same letter) are at least `gap` places apart where the list allows,
 * keeping the given order otherwise. Deterministic. The questions themselves still offer the partners as choices, so a pair is
 * tested against each other without being asked back to back.
 * @param {string[]} ids card ids  @param {(letterId:string)=>Iterable<string>} partners
 */
export function spreadConfusables(ids, partners, { gap = 3, budget = 40000 } = {}) {
  const letterOf = (id) => parseMemCardId(id)?.letterId || id;
  const cache = new Map();
  const clash = (id, other) => {
    const k = id + "|" + other; let v = cache.get(k);
    if (v === undefined) { const a = letterOf(id), b = letterOf(other); v = a === b || new Set(partners(a)).has(b) || new Set(partners(b)).has(a); cache.set(k, v); }
    return v;
  };
  // depth-first: take the first remaining id that clears the last gap-1 placed ids; back up when stuck (bounded). First with the given order
  // (kept as far as spacing allows), then, if that gets stuck, trying the most tangled ids first.
  const attempt = (order, limit) => {
    const out = [], rest = [...ids]; let steps = 0;
    const go = () => {
      if (!rest.length) return true;
      if (++steps > limit) return false;
      const recent = out.slice(-(gap - 1));
      const idx = rest.map((_, i) => i);
      if (order === "tangled") { const deg = rest.map((id) => rest.filter((o) => o !== id && clash(id, o)).length); idx.sort((a, b) => deg[b] - deg[a] || a - b); }
      for (const i of idx) {
        if (recent.some((r) => clash(rest[i], r))) continue;
        const [x] = rest.splice(i, 1); out.push(x);
        if (go()) return true;
        out.pop(); rest.splice(i, 0, x);
        if (steps > limit) return false;
      }
      return false;
    };
    return go() ? out : null;
  };
  const solved = attempt("given", Math.min(budget, 3000)) || attempt("tangled", budget);
  if (solved) return solved;
  // no full solution within the budget: greedy, spacing as far as it can
  const left = [...ids], res = [];
  while (left.length) {
    const recent = res.slice(-(gap - 1));
    let pick = left.findIndex((id) => !recent.some((r) => clash(id, r)));
    if (pick < 0) pick = left.findIndex((id) => !(res.length && clash(id, res.at(-1))));
    res.push(...left.splice(pick < 0 ? 0 : pick, 1));
  }
  return res;
}
/** Smallest distance between two look-alike or same-letter ids in an ordering (Infinity when none). */
export function minConfusableDistance(ids, partners) {
  const letterOf = (id) => parseMemCardId(id)?.letterId || id; let min = Infinity;
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = letterOf(ids[i]), b = letterOf(ids[j]);
    if (a === b || new Set(partners(a)).has(b)) min = Math.min(min, j - i);
  }
  return min;
}
/** Merge memory ids among other review ids at even spacing, memory ids spread apart; the other ids keep their order. */
export function mergeMemoryIntoQueue(others, memIds, partners) {
  const mem = spreadConfusables(memIds, partners, { gap: 3 });
  if (!mem.length) return others;
  if (!others.length) return mem;
  const out = [], step = Math.max(1, Math.floor((others.length + mem.length) / mem.length));
  let o = 0, m = 0;
  for (let i = 0; o < others.length || m < mem.length; i++) {
    if (m < mem.length && (i % step === step - 1 || o >= others.length)) out.push(mem[m++]); else out.push(others[o++]);
  }
  return out;
}
