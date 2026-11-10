/**
 * Fade-out recall (concept gr-gv-01): progressive masking of a pointed Hebrew line, pure logic, no data of its own.
 * Levels: 0 full, 1 alternate letters hidden (first letter of each word kept), 2 initials only, 3 blank.
 * The unit of hiding is a CLUSTER (a letter with all its niqqud/dagesh/dots), so a vowel mark is never hidden or shown
 * apart from its letter. Separators (spaces, maqaf, sof pasuq, newlines, punctuation) are never hidden.
 */
import { BASE } from "./hebrew.js";
import { rng, shuffled } from "./spotit.js";

export const FADE_LEVELS = [
  { level: 0, name: "Full line", help: "Read the whole line and listen." },
  { level: 1, name: "Alternate letters", help: "Every second letter is hidden." },
  { level: 2, name: "Initials", help: "Only the first letter of each word is shown." },
  { level: 3, name: "Blank", help: "Nothing is shown. Say the line from memory." },
];
export const MAX_FADE = 3;
export const GAP_CHAR = "_";

const isLetter = (ch) => ch >= "א" && ch <= "ת";
const isMark = (ch) => ch >= "֑" && ch <= "ׇ" && ch !== "־" && ch !== "׀" && ch !== "׃";
const LETTER_CHAR = Object.fromEntries(Object.entries(BASE).map(([ch, id]) => [id, ch]));

/** Split into tokens: { type:"word", clusters:[{text, base}] } and { type:"sep", text }. Concatenating all texts gives back the input. */
export function tokenize(he) {
  const tokens = [];
  let word = null, sep = "";
  const flushSep = () => { if (sep) { tokens.push({ type: "sep", text: sep }); sep = ""; } };
  const flushWord = () => { if (word) { tokens.push({ type: "word", clusters: word }); word = null; } };
  for (const ch of he) {
    if (isLetter(ch)) { flushSep(); (word ||= []).push({ text: ch, base: BASE[ch] || null }); }
    else if (isMark(ch)) {
      if (word) word.at(-1).text += ch;
      else if (tokens.length && tokens.at(-1).type === "word") tokens.at(-1).clusters.at(-1).text += ch;
      else sep += ch;
    } else { flushWord(); sep += ch; }
  }
  flushWord(); flushSep();
  return tokens;
}

/** Which cluster positions (within a word of n clusters) are hidden at a level. */
function hiddenAt(level, i) {
  if (level <= 0) return false;
  if (level === 1) return i % 2 === 1;
  return i >= 1; // level 2 and 3 (3 handled as everything below)
}

/**
 * @returns {{level:number, original:string, tokens:object[], text:string, gaps:{n:number, tokenIndex:number, clusterIndex:number, text:string, base:string|null}[]}}
 *   `text` is the masked string: hidden clusters become "_"; level 3 is the empty string.
 */
export function fade(he, level) {
  const lv = Math.max(0, Math.min(MAX_FADE, Math.floor(level)));
  const tokens = tokenize(he), gaps = [];
  const out = tokens.map((t, ti) => {
    if (t.type === "sep") return t;
    return { type: "word", clusters: t.clusters.map((c, ci) => {
      const hidden = lv === 3 || hiddenAt(lv, ci);
      if (hidden) gaps.push({ n: gaps.length, tokenIndex: ti, clusterIndex: ci, text: c.text, base: c.base });
      return { text: c.text, base: c.base, hidden };
    }) };
  });
  const text = lv === 3 ? "" : out.map((t) => (t.type === "sep" ? t.text : t.clusters.map((c) => (c.hidden ? GAP_CHAR : c.text)).join(""))).join("");
  return { level: lv, original: he, tokens: out, text, gaps };
}

/** Rebuild the original line from a faded line, ignoring the masking ("reversing the fade"). */
export const restore = (f) => f.tokens.map((t) => (t.type === "sep" ? t.text : t.clusters.map((c) => c.text).join(""))).join("");

const VOWEL_CHARS = ["ַ", "ָ", "ֵ", "ֶ", "ִ", "ֹ", "ֻ"];
const stripVowels = (s) => [...s].filter((ch) => !VOWEL_CHARS.includes(ch)).join("");
const nfc = (s) => s.normalize("NFC");

/**
 * Choice list for one gap: the right cluster plus near misses (look-alike letter with the same marks, same letter with another
 * vowel, other clusters from the same line). Deterministic for a seed. Always contains the correct text exactly once.
 */
export function gapOptions(gap, line, confusables, { seed = 1, count = 4 } = {}) {
  const rand = rng(seed), right = nfc(gap.text), seen = new Set([right]), cand = [];
  const add = (s) => { const n = nfc(s); if (!seen.has(n)) { seen.add(n); cand.push(n); } };
  const marks = [...gap.text].filter((ch) => isMark(ch)).join("");
  for (const set of confusables?.sets || []) if (gap.base && set.letters.includes(gap.base))
    for (const l of set.letters) if (l !== gap.base && LETTER_CHAR[l]) add(LETTER_CHAR[l] + marks);
  if ([...gap.text].some((ch) => VOWEL_CHARS.includes(ch))) for (const v of shuffled(VOWEL_CHARS, rand)) add(gap.text[0] + stripVowels(marks) + v);
  const fromLine = line.tokens.flatMap((t) => (t.type === "word" ? t.clusters.map((c) => c.text) : []));
  for (const s of shuffled(fromLine, rand)) add(s);
  return shuffled([right, ...cand.slice(0, Math.max(1, count - 1))], rand);
}

/**
 * Next stored fade level for a line after an attempt. Only an attempt AT the stored level moves it:
 * correct -> one level further faded (max 3), miss -> one level back (min 0). Practising another level changes nothing.
 */
export function nextFadeLevel(stored, played, correct) {
  const s = Math.max(0, Math.min(MAX_FADE, stored ?? 0));
  if (played !== s) return s;
  return correct ? Math.min(MAX_FADE, s + 1) : Math.max(0, s - 1);
}

/** Lines suitable for gap practice: one-line corpus entries of at most `maxWords` words. */
export function eligibleLines(entries, maxWords = 12) {
  return entries.filter((e) => e.he && !/[\n]/.test(e.he) && (e.lines ?? 1) === 1 && e.he.split(/[\s־]+/).filter(Boolean).length <= maxWords);
}
