// Word timing for the reading follower: where in a verse recording each word is likely to be heard.
// Pure functions, no DOM. Used by finger-follow.js so the finger guide can follow a playing recording.
//
// No Torah clip has word timestamps yet (Chirp 3 HD voices do not return SSML <mark> timepoints), so the default is an
// ESTIMATE: each word gets a share of the clip in proportion to how long it takes to say (its vowels, roughly its
// syllables), and a short share for the pause a disjunctive accent asks for. When real per-word times exist (for example
// from an offline forced alignment, see docs/photo/COMMERCIAL-LICENSES.md, "Follower"), pass them as `aligned` and they
// are used as they are.

const HEBREW_LETTER = /[\u05D0-\u05EA]/u;
// Full vowels (hiriq .. qubuts, qamats qatan) count as a syllable; hataf vowels count as a short one; shva as a little.
const FULL_VOWEL = /[\u05B4-\u05BB\u05C7]/gu;
const HATAF = /[\u05B1-\u05B3]/gu;
const SHVA = /\u05B0/gu;
// Shuruq: vav + dagesh with no vowel of its own is a vowel letter (holam male is already counted by its holam).
const VAV_VOWEL = /\u05D5\u05BC(?![\u05B0-\u05BB\u05C7])/gu;
// Disjunctive (pausing) accents: etnahta, segol, shalshelet, zaqef qatan/gadol, tipcha, revia, zarqa, pashta, yetiv, tevir,
// geresh, gershayim, pazer, qarne para, telisha gedola, legarmeh-like paseq, and sof pasuq. A word carrying one is followed
// by a short pause in a chanted or careful reading.
const PAUSE_MARK = /[\u0591-\u05A1\u05C0\u05C3]/u;

/** Words of a verse as the follower counts them: split on white space, Hebrew-bearing parts only (as finger-follow.js does). */
export function verseWords(text) {
  return String(text || '').split(/\s+/u).filter((part) => HEBREW_LETTER.test(part));
}

/** About how many syllables a word takes to say. Unpointed words fall back to letters / 2. Never below 1. */
export function wordWeight(word) {
  const w = String(word || '');
  const letters = (w.match(/[\u05D0-\u05EA]/gu) || []).length;
  if (!letters) return 0;
  const full = (w.match(FULL_VOWEL) || []).length;
  const hataf = (w.match(HATAF) || []).length;
  const shva = (w.match(SHVA) || []).length;
  const vav = (w.match(VAV_VOWEL) || []).length;
  const pointed = full + hataf + shva + vav > 0;
  const syll = pointed ? full + vav + 0.6 * hataf + 0.25 * shva : letters / 2;
  // A little for the consonants themselves, so long consonant clusters are not free.
  return Math.max(1, syll + 0.12 * letters);
}

/**
 * Estimated [start, end) fractions (0..1) of the clip for each word.
 * opts.lead: share of the clip before the first word (a TTS clip starts with a little silence), default 0.04.
 * opts.tail: share after the last word, default 0.06. opts.pause: extra weight after a pausing accent, default 0.5.
 */
export function estimateWordTimes(words, opts = {}) {
  const list = Array.isArray(words) ? words : verseWords(words);
  if (!list.length) return [];
  const lead = clamp(opts.lead ?? 0.04, 0, 0.3), tail = clamp(opts.tail ?? 0.06, 0, 0.3), pause = Math.max(0, opts.pause ?? 0.5);
  const weights = list.map((w, i) => ({ say: wordWeight(w), rest: i < list.length - 1 && PAUSE_MARK.test(w) ? pause : 0 }));
  const total = weights.reduce((s, x) => s + x.say + x.rest, 0) || 1;
  const span = 1 - lead - tail;
  const out = []; let at = lead;
  for (const x of weights) {
    const start = at, end = at + (span * x.say) / total;
    out.push({ start, end });
    at = end + (span * x.rest) / total;
  }
  return out;
}

/**
 * Times for a verse in milliseconds. `aligned` (an array of [startMs, endMs] or {start, end} in ms, one per word) wins when
 * it has exactly one entry per word; otherwise the estimate is scaled to durMs. Returns { times:[{start,end}], estimated }.
 */
export function verseTimes(words, durMs, aligned = null) {
  const list = Array.isArray(words) ? words : verseWords(words);
  if (Array.isArray(aligned) && aligned.length === list.length && aligned.every(okSpan)) {
    return { times: aligned.map((a) => (Array.isArray(a) ? { start: a[0], end: a[1] } : { start: a.start, end: a.end })), estimated: false };
  }
  const d = Number(durMs);
  if (!Number.isFinite(d) || d <= 0) return { times: [], estimated: true };
  return { times: estimateWordTimes(list).map((t) => ({ start: t.start * d, end: t.end * d })), estimated: true };
}

/** Index of the word being heard at `ms`: the last word whose start has passed (stays on a word through the pause after it). */
export function wordAt(times, ms) {
  if (!Array.isArray(times) || !times.length) return -1;
  const t = Number(ms) || 0;
  if (t < times[0].start) return 0;
  let lo = 0, hi = times.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (times[mid].start <= t) lo = mid; else hi = mid - 1; }
  return lo;
}

/** Word index for a speech-synthesis boundary event: how many words of `spoken` start before charIndex. */
export function wordAtChar(spoken, charIndex) {
  const s = String(spoken || ''); const c = Math.max(0, Math.min(s.length, Number(charIndex) || 0));
  return Math.max(0, verseWords(s.slice(0, c)).length - (/\s$/u.test(s.slice(0, c)) || c === 0 ? 0 : 1));
}

function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, Number(x) || 0)); }
function okSpan(a) {
  const s = Array.isArray(a) ? a[0] : a?.start, e = Array.isArray(a) ? a[1] : a?.end;
  return Number.isFinite(s) && Number.isFinite(e) && e >= s && s >= 0;
}
