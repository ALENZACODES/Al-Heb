// @ts-check
// Typing practice (pure logic, no DOM). Reuses the Israeli SI-1452 layout data read by src/letters/typing.js (data/letters/keyboard-si1452.json)
// and builds drills from data/typing/drills.json (made by src/typing/build.mjs from data/vocab/deck-order.json and data/corpus/registry.json).
//
// What this measures: whether the characters typed match the target, and how long the learner took between the first key press and Check.
// It is self-contained practice statistics. It is NOT a typing test, not words-per-minute on running text, and says nothing about fluency.
import { XKB_TO_DOM } from "../letters/typing.js";

export const TYPING_KEY = "typing.v1";
export const DRILLS = Object.freeze([
  { id: "letters", label: "Single letters", about: "A letter appears; type it. 10 letters per round.", size: 10 },
  { id: "finals", label: "Final forms", about: "You see the ordinary letter; type its form at the end of a word (ך ם ן ף ץ).", size: 5 },
  { id: "words", label: "Common words", about: "A word from the first 200 of the course word order; type its letters (vowel points are not needed). 8 per round.", size: 8 },
  { id: "lines", label: "Prayer lines", about: "A short prayer line, shown with vowel points; type the letters only. 3 per round.", size: 3 },
]);
export const FINAL_TO_REGULAR = Object.freeze({ "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" });
const HEBREW_LETTER = /^[א-ת]$/;

// ---------- text normalisation ----------
/** Remove vowel points, cantillation, sof pasuk, geresh signs; maqaf becomes a space; collapse whitespace; NFC. Used for targets AND for what the learner typed. */
export function stripPoints(s) {
  return String(s ?? "").normalize("NFC")
    .replace(/־/g, " ")
    .replace(/[֑-ׇ]/g, "")
    .replace(/[׳״‎‏‌‍⁦-⁩]/g, "")
    .replace(/\s+/g, " ").trim();
}
export const hasLatin = (s) => /[A-Za-z]/.test(String(s ?? ""));

export function levenshtein(a, b) {
  const x = [...a], y = [...b];
  let prev = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[y.length];
}
const regularise = (s) => [...s].map((c) => FINAL_TO_REGULAR[c] || c).join("");

/**
 * Compare typed text with the answer (both are stripped of points first).
 * @returns {{ok:boolean, accuracy:number, typed:string, answer:string, firstDiff:number, latin:boolean, empty:boolean, finalFormOnly:boolean}}
 */
export function checkAnswer(typedRaw, answerRaw) {
  const typed = stripPoints(typedRaw), answer = stripPoints(answerRaw);
  const empty = typed === "";
  const latin = hasLatin(typed);
  const ok = !empty && typed === answer;
  const dist = levenshtein(typed, answer);
  const accuracy = answer.length ? Math.max(0, 1 - dist / Math.max(answer.length, [...typed].length)) : 0;
  let firstDiff = -1; if (!ok) { const t = [...typed], a = [...answer]; const n = Math.max(t.length, a.length); for (let i = 0; i < n; i++) if (t[i] !== a[i]) { firstDiff = i; break; } }
  return { ok, accuracy, typed, answer, firstDiff, latin, empty, finalFormOnly: !ok && !empty && !latin && regularise(typed) === regularise(answer) };
}

// ---------- layout ----------
/** KeyboardEvent.code -> Hebrew letter for the keys of the SI-1452 base layer that carry a Hebrew letter. */
export function physicalMap(layout) {
  /** @type {Record<string,string>} */ const m = {};
  for (const k of layout?.keys || []) if (HEBREW_LETTER.test(k.base || "") && XKB_TO_DOM[k.code]) m[XKB_TO_DOM[k.code]] = k.base;
  return m;
}
/**
 * The Hebrew letter an English-layout key press should type when the learner turned on "Israeli key positions", else null.
 * Null when a modifier shortcut is held, when there is no mapping, or when the OS already produced a Hebrew character (no double mapping).
 */
export function mapKeyEvent(map, ev) {
  if (!ev || ev.ctrlKey || ev.metaKey || ev.altKey) return null;
  if (typeof ev.key !== "string" || !/^[\x21-\x7e]$/.test(ev.key)) return null;
  return map[ev.code] || null;
}
/** Rows of Hebrew-letter keys for the on-screen keyboard, in physical positions: [{code, domCode, char, qwerty}]. */
export function screenRows(layout) {
  const order = [["AD03", "AD04", "AD05", "AD06", "AD07", "AD08", "AD09", "AD10"], ["AC01", "AC02", "AC03", "AC04", "AC05", "AC06", "AC07", "AC08", "AC09", "AC10"], ["AB01", "AB02", "AB03", "AB04", "AB05", "AB06", "AB07", "AB08", "AB09"]];
  const by = new Map((layout?.keys || []).map((k) => [k.code, k]));
  const nameOfChar = new Map(Object.entries(layout?.letters || {}).map(([id, v]) => [v.char, id]));
  return order.map((r) => r.map((c) => by.get(c)).filter((k) => k && HEBREW_LETTER.test(k.base)).map((k) => ({ code: k.code, domCode: XKB_TO_DOM[k.code], char: k.base, qwerty: k.qwerty || "", name: nameOfChar.get(k.base) || k.base })));
}
export const letterName = (id) => String(id).replace(/-final$/, " (final form)");

// ---------- rounds ----------
/** Deterministic PRNG (same generator as src/letters/typing.js, kept local so this module has one import). */
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function sample(pool, n, rng, weightOf = () => 1) {
  const left = pool.map((item) => ({ item, w: Math.max(0.01, weightOf(item)) })); const out = [];
  while (out.length < n && left.length) {
    let total = 0; for (const x of left) total += x.w;
    let r = rng() * total, i = 0; for (; i < left.length - 1; i++) { r -= left[i].w; if (r <= 0) break; }
    out.push(left.splice(i, 1)[0].item);
  }
  return out;
}
/**
 * Items for one round. Item: {drill, id, prompt, promptIsHebrew, gloss, answer, label}.
 * @param {"letters"|"finals"|"words"|"lines"} drill
 * @param {{words?:any[], lines?:any[]}} data  data/typing/drills.json
 * @param {any} layout keyboard-si1452.json
 * @param {{rng?:()=>number, misses?:Record<string,number>, size?:number}} [opt]
 */
export function buildRound(drill, data, layout, opt = {}) {
  const rng = opt.rng || Math.random, misses = opt.misses || {};
  const def = DRILLS.find((d) => d.id === drill); if (!def) throw new Error(`unknown drill ${drill}`);
  const size = opt.size ?? def.size;
  const letters = Object.entries(layout?.letters || {}).map(([id, v]) => ({ id, char: v.char, final: id.endsWith("-final") }));
  if (drill === "letters") return sample(letters.filter((l) => !l.final), size, rng, (l) => 1 + 2 * (misses[l.char] || 0))
    .map((l) => ({ drill, id: l.id, prompt: l.char, promptIsHebrew: true, gloss: letterName(l.id), answer: l.char, label: `Type the letter ${letterName(l.id)}` }));
  if (drill === "finals") return sample(letters.filter((l) => l.final), size, rng, (l) => 1 + 2 * (misses[l.char] || 0))
    .map((l) => { const reg = FINAL_TO_REGULAR[l.char]; return { drill, id: l.id, prompt: reg, promptIsHebrew: true, gloss: `Type the final form of ${letterName(l.id.replace("-final", ""))}`, answer: l.char, label: `Type the final form of ${letterName(l.id.replace("-final", ""))}` }; });
  const list = (drill === "words" ? data?.words : data?.lines) || [];
  return sample(list, size, rng).map((w) => ({ drill, id: w.id, prompt: w.pointed, promptIsHebrew: true, gloss: w.en || "", answer: w.he, label: drill === "words" ? "Type this word (letters only)" : "Type this line (letters only)" }));
}

// ---------- stats ----------
/**
 * @param {{ok:boolean, chars:number, ms:number}[]} results one entry per answered item
 * @returns {{items:number, correct:number, accuracy:number, chars:number, ms:number, cpm:number|null}}
 * chars and ms count CORRECT answers only. cpm is characters per minute over that time, null under 3 seconds (too little to mean anything).
 */
export function summarise(results) {
  const items = results.length, ok = results.filter((r) => r.ok);
  const chars = ok.reduce((s, r) => s + r.chars, 0), ms = ok.reduce((s, r) => s + r.ms, 0);
  return { items, correct: ok.length, accuracy: items ? ok.length / items : 0, chars, ms, cpm: ms >= 3000 ? Math.round((chars / (ms / 60000)) * 10) / 10 : null };
}
export const fmtClock = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

// ---------- storage: typing.v1 ----------
/** @typedef {{items:number, correct:number, chars:number, ms:number, rounds:number}} Total */
export const emptyTotal = () => ({ items: 0, correct: 0, chars: 0, ms: 0, rounds: 0 });
export function normalizeState(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const n = (v) => (Number.isFinite(v) && v >= 0 ? v : 0);
  const totals = {}; for (const d of DRILLS) { const t = r.totals?.[d.id] || {}; totals[d.id] = { items: n(t.items), correct: n(t.correct), chars: n(t.chars), ms: n(t.ms), rounds: n(t.rounds) }; }
  const misses = {}; if (r.misses && typeof r.misses === "object") for (const [k, v] of Object.entries(r.misses)) if (HEBREW_LETTER.test(k) && Number.isFinite(v) && v > 0) misses[k] = Math.min(20, Math.floor(v));
  const recent = Array.isArray(r.recent) ? r.recent.filter((x) => x && DRILLS.some((d) => d.id === x.drill)).slice(-20).map((x) => ({ drill: x.drill, at: n(x.at), items: n(x.items), correct: n(x.correct), chars: n(x.chars), ms: n(x.ms) })) : [];
  return { v: 1, mapKeys: r.mapKeys === true, lastDrill: DRILLS.some((d) => d.id === r.lastDrill) ? r.lastDrill : "letters", totals, misses, recent };
}
/** Fold a finished round into the state. `answered` = [{char?:string, ok:boolean}] for letter/final items so misses can weight later rounds. */
export function recordRound(state, drill, at, summary, answered = []) {
  const s = normalizeState(state), t = s.totals[drill];
  t.items += summary.items; t.correct += summary.correct; t.chars += summary.chars; t.ms += summary.ms; t.rounds += 1;
  for (const a of answered) if (a.char && HEBREW_LETTER.test(a.char)) { if (a.ok) { if (s.misses[a.char]) { s.misses[a.char] -= 1; if (!s.misses[a.char]) delete s.misses[a.char]; } } else s.misses[a.char] = Math.min(20, (s.misses[a.char] || 0) + 1); }
  s.recent = [...s.recent, { drill, at, items: summary.items, correct: summary.correct, chars: summary.chars, ms: summary.ms }].slice(-20);
  s.lastDrill = drill;
  return s;
}
