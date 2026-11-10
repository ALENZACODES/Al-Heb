/**
 * Interference hints, shown only after the learner's own error.
 * Rules: never on a correct answer; once per error kind per session; "Got it" suppresses a kind for good (persisted by the caller);
 * a second miss of the same kind in the same session escalates once to the worked example; later misses show nothing more.
 */
import { loadJSON } from "./data.js";
import { decoysFor } from "./spotit.js";

const data = await loadJSON("data/curriculum/hints.json");
export const hintKinds = data.kinds;
export const HINTS_KEY = "curriculum.hints.suppressed"; // array of errorKind

/** A fresh in-memory session. `suppressed` is an iterable of kinds the learner already dismissed with "Got it". */
export function newHintSession(suppressed = []) { return { suppressed: new Set(suppressed), misses: {}, shown: {} }; }

/**
 * @param {ReturnType<typeof newHintSession>} session mutated
 * @param {{kind:string, correct?:boolean, detail?:string}} miss
 * @returns {null | {kind:string, level:1|2, text:string, detail:string}}
 */
export function hintFor(session, { kind, correct = false, detail = "" }) {
  if (correct) return null;
  const rec = hintKinds.find((k) => k.errorKind === kind);
  if (!rec || session.suppressed.has(kind)) return null;
  const n = (session.misses[kind] = (session.misses[kind] || 0) + 1);
  const level = n === 1 ? 1 : n === 2 ? 2 : 0;
  if (!level) return null;
  session.shown[kind] = level;
  return { kind, level, text: level === 1 ? rec.hint : rec.example, detail: level === 1 ? detail : "" };
}
export function dismissHint(session, kind) { session.suppressed.add(kind); return [...session.suppressed]; }

/** Guess the error kind of a missed review card from its kind (an inference, not a diagnosis) and give a detail line. */
export function errorKindForCard({ kind, key }, confusables) {
  if (kind === "letter") {
    const { sets } = decoysFor(key, confusables);
    if (sets.length) return { kind: "confusable-pair", detail: sets[0].hint };
    if (key === "alef" || key === "ayin") return { kind: "silent-letter", detail: "" };
    if (/-final$/.test(key)) return { kind: "final-form", detail: "" };
    return null;
  }
  if (kind === "vowel") return { kind: "wrong-vowel", detail: "" };
  if (kind === "word") return { kind: "direction-slip", detail: "" };
  return null;
}
