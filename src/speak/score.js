// Speaking score: pure functions, no DOM, no network. Runs entirely in the browser.
//
// WHAT THE SCORE IS: the share of the printed words that the browser's own speech recognizer (Web Speech API, lang he-IL) wrote
// back as that word. Comparison is letters only, because a recognizer returns unpointed text: vowel points, cantillation and
// punctuation are dropped, final letters are folded, and vav/yod spelling differences (full vs defective spelling) are tolerated.
// So the score says whether your words were RECOGNIZED. It does not measure accent, vowels, stress or how natural you sound, and
// Aleph has not measured how well any browser recognizer hears learners' Hebrew.
//
// Where the browser has no recognizer (Firefox, for example), nothing here invents a number: scoringStatus() says so and the
// screens fall back to a self-check (record, play back next to the model, mark it yourself), which is never shown as a score.
//
// Word credit: hit = 1, near = 0.5, miss = 0. score = credit / number of printed words (0..1). Extra words the recognizer
// wrote are ignored (they neither add nor subtract).
import { normalizeHe, spokenTarget, skeleton, similarity } from './model.js';

export const NEAR = 0.7;
export const CLOSE = 0.7;

export const SCORE_MEANS = 'What the score measures: how many of the printed words your browser\'s speech recognizer wrote back as that word. Vowel points are not checked, and it does not measure your accent or how natural you sound. Aleph has not verified how well the recognizer hears Hebrew, so treat the score as a guide, not a grade.';
export const SELF_CHECK_NOTE = 'Self-check: you compare what you said with the model and mark it yourself. There is no score for a self-check.';

// ---- Normalization for scoring --------------------------------------------------------------------------------------
const POINTS = '֑-ׇ';
const LETTER = 'א-ת';
/** A geresh or gershayim BETWEEN two letters (ג׳ירפה, צה״ל, or a recognizer's ASCII ' and ") is part of the word: join it. */
const JOIN_MARKS = new RegExp(`([${LETTER}][${POINTS}]*)[׳״'"’\`]+(?=[${POINTS}]*[${LETTER}])`, 'g');
export const joinMarks = (s) => String(s ?? '').normalize('NFC').replace(JOIN_MARKS, '$1');

/**
 * Number words a recognizer may write as digits. Masculine and feminine forms are both listed; the one closest to a printed
 * word is used. Only 0 to 10: longer numbers are left as written (and will not match).
 */
export const DIGIT_WORDS = Object.freeze({
  0: ['אפס'], 1: ['אחד', 'אחת'], 2: ['שתיים', 'שניים', 'שתי', 'שני'], 3: ['שלוש', 'שלושה'], 4: ['ארבע', 'ארבעה'], 5: ['חמש', 'חמישה'],
  6: ['שש', 'שישה'], 7: ['שבע', 'שבעה'], 8: ['שמונה'], 9: ['תשע', 'תשעה'], 10: ['עשר', 'עשרה'],
});

/** Letters-only words of a string, ready to score (marks joined, then normalizeHe, then the divine name folded to its spoken form). */
export const plainWords = (s) => spokenTarget(joinMarks(s)).split(' ').filter(Boolean);
/** Letters-only words for display (no divine-name folding): same count and order as plainWords. */
const displayPlain = (s) => normalizeHe(joinMarks(s)).split(' ').filter(Boolean);

/**
 * The printed (pointed) words of a target, in the same order and count as plainWords(target), so each score can be shown on
 * the word the learner sees. Separators are the ones normalizeHe uses (maqaf, sof pasuq, paseq, punctuation, spaces).
 */
export function pointedWords(he) {
  // Geresh, gershayim and quote marks are not split on here, so ג׳ירפה and ה׳ keep their mark on screen; joinMarks + normalizeHe
  // then decide whether a token holds any letters, exactly as plainWords does.
  const out = [];
  const tokens = String(he ?? '').normalize('NFC').replace(/[־׀׃]/g, ' ').replace(/[‎‏‪-‮.,;:!?()[\]{}\-–—/\\]/g, ' ').split(/\s+/);
  for (const t of tokens) out.push(...(normalizeHe(joinMarks(t)).split(' ').filter(Boolean).length === 1 ? [t] : normalizeHe(joinMarks(t)).split(' ').filter(Boolean)));
  return out;
}

/** Replace standalone digits 0..10 in heard words with the number word closest to any target word. */
export function expandDigits(heardWords, targetWords) {
  return heardWords.map((w) => {
    if (!/^\d{1,2}$/.test(w) || !DIGIT_WORDS[+w]) return w;
    let best = DIGIT_WORDS[+w][0], bs = -1;
    for (const opt of DIGIT_WORDS[+w]) for (const t of targetWords) { const s = similarity(opt, t); if (s > bs) { bs = s; best = opt; } }
    return best;
  });
}
const heardWordsOf = (h, targetWords) => expandDigits(spokenTarget(joinMarks(String(h ?? '').replace(/(\d+)/g, ' $1 '))).split(' ').filter(Boolean), targetWords);

/** One word against one heard word: 1 when the letters agree (vav/yod tolerant), else letter similarity (0..1). */
export function wordMatch(target, heard) {
  if (!target || !heard) return 0;
  if (target === heard || skeleton(target) === skeleton(heard)) return 1;
  return Math.max(0, similarity(target, heard), skeleton(target) && skeleton(heard) ? similarity(skeleton(target), skeleton(heard)) : 0);
}
export const statusOf = (m) => (m >= 1 ? 'hit' : m >= NEAR ? 'near' : 'miss');
const CREDIT = { hit: 1, near: 0.5, miss: 0 };

/**
 * Align printed words with heard words (edit distance over words; a substitution costs 1 - wordMatch), so one missed word
 * does not shift the rest. Returns one entry per printed word: {plain, heard|null, match, status}.
 */
export function alignPlain(tw, hw) {
  const n = tw.length, m = hw.length;
  const cost = (i, j) => 1 - wordMatch(tw[i], hw[j]);
  const d = Array.from({ length: n + 1 }, (_, i) => { const r = new Array(m + 1).fill(0); r[0] = i; return r; });
  for (let j = 1; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost(i - 1, j - 1));
  const out = new Array(n);
  let i = n, j = m;
  while (i > 0) {
    if (j > 0 && Math.abs(d[i][j] - (d[i - 1][j - 1] + cost(i - 1, j - 1))) < 1e-9) {
      const mt = wordMatch(tw[i - 1], hw[j - 1]); const st = statusOf(mt);
      out[i - 1] = { plain: tw[i - 1], heard: st === 'miss' ? null : hw[j - 1], heardAs: hw[j - 1], match: mt, status: st }; i--; j--;
    } else if (Math.abs(d[i][j] - (d[i - 1][j] + 1)) < 1e-9) { out[i - 1] = { plain: tw[i - 1], heard: null, heardAs: null, match: 0, status: 'miss' }; i--; }
    else j--;
  }
  return out;
}

/**
 * Score one attempt. `alternatives` is the recognizer's list (or one string). The best-scoring alternative is used.
 * Returns {words:[{word (pointed, for display), plain, heard, status, credit}], hit, near, miss, total, score (0..1), percent,
 * outcome 'match'|'close'|'miss', heard (the raw alternative used)}.
 * outcome: match = every word hit; close = at least 70% of words hit or near; else miss. No target words gives total 0, score 0, miss.
 */
export function scoreSpeech(targetHe, alternatives) {
  const tw = plainWords(targetHe);
  const shown = pointedWords(targetHe), dispPlain = displayPlain(targetHe);
  const alts = (Array.isArray(alternatives) ? alternatives : [alternatives]).map((h) => String(h ?? '')).filter((h) => h.trim());
  let best = null;
  for (const h of alts.length ? alts : ['']) {
    const al = alignPlain(tw, heardWordsOf(h, tw));
    const words = al.map((a, i) => ({ word: shown.length === tw.length ? shown[i] : (dispPlain[i] || a.plain), plain: dispPlain[i] || a.plain, heard: a.heard, status: a.status, credit: CREDIT[a.status] }));
    const hit = words.filter((w) => w.status === 'hit').length, near = words.filter((w) => w.status === 'near').length;
    const total = words.length, score = total ? (hit + 0.5 * near) / total : 0;
    const cand = { words, hit, near, miss: total - hit - near, total, score, heard: h };
    if (!best || cand.score > best.score) best = cand;
  }
  best.percent = Math.round(best.score * 100);
  best.outcome = best.total && best.hit === best.total ? 'match' : best.total && (best.hit + best.near) / best.total >= CLOSE ? 'close' : 'miss';
  return best;
}

/** One plain sentence for a scored attempt (always says what the number counts). */
export function scoreLine(r) {
  if (!r.total) return 'There were no words to score.';
  const close = r.near ? `, ${r.near} close` : '';
  return `Score ${r.percent}%: ${r.hit} of ${r.total} word${r.total === 1 ? '' : 's'} recognized${close}.`;
}
/** Words for each status, for a list a screen reader can follow (status is never shown by colour alone). */
export const STATUS_TEXT = Object.freeze({ hit: 'heard right', near: 'close', miss: 'not heard' });

// ---- Availability ---------------------------------------------------------------------------------------------------
/**
 * Can this browser score speech? `caps` is capabilities() from model.js ({recognition, recording, secure}).
 * Returns {scored, reason:'ok'|'insecure'|'no-recognizer', text}. When scored is false the text says so plainly and names
 * the fallback; no screen may show a score in that case.
 */
export function scoringStatus(caps) {
  const c = caps || {};
  if (c.recognition && c.onDevice) return { scored: true, reason: 'ok', text: 'Scoring is on: the listening pack on this device listens and Aleph compares what it wrote with the printed words. Nothing you say leaves this device.' };
  if (c.recognition) return { scored: true, reason: 'ok', text: 'Scoring is on: your browser\'s speech recognizer listens and Aleph compares what it wrote with the printed words.' };
  const fallback = c.recording
    ? 'You can still record yourself, play it back next to the model, and mark it yourself.'
    : 'You can still say it out loud, listen to the model again, and mark it yourself.';
  if (c.secure === false) return { scored: false, reason: 'insecure', text: `No score here: speech recognition only works on a secure (https) page. ${fallback} A self-check is not scored.` };
  return { scored: false, reason: 'no-recognizer', text: `No score in this browser: it has no speech recognition (Firefox, for example, does not offer it). ${fallback} A self-check is not scored.` };
}

/** Recognizer errors after which scoring cannot work in this browser session (so the screen should offer the self-check). */
export const FATAL_ERRORS = Object.freeze(['unsupported', 'not-allowed', 'service-not-allowed', 'language-not-supported', 'network', 'audio-capture', 'start-failed']);
export const isFatal = (e) => FATAL_ERRORS.includes(String(e));

// ---- Round and set summaries ---------------------------------------------------------------------------------------
const SCORED = new Set(['match', 'close', 'miss']);
const SELF = new Set(['said', 'notyet']);
/**
 * Split attempts (or one round's results) into recognizer-scored and self-marked. Scored average is over scored items only;
 * self-marks never enter it. Items: [{outcome, score?, itemId?}] (skips are ignored). When `byItem` is true the last entry per
 * itemId wins.
 */
export function splitSummary(list, { byItem = false } = {}) {
  let rows = (list || []).filter((r) => r && r.outcome && r.outcome !== 'skip');
  if (byItem) { const m = new Map(); for (const r of rows) m.set(r.itemId, r); rows = [...m.values()]; }
  const scored = rows.filter((r) => SCORED.has(r.outcome) && typeof r.score === 'number');
  const self = rows.filter((r) => SELF.has(r.outcome));
  return {
    scored: scored.length,
    average: scored.length ? scored.reduce((a, r) => a + r.score, 0) / scored.length : null,
    matched: scored.filter((r) => r.outcome === 'match').length,
    close: scored.filter((r) => r.outcome === 'close').length,
    missed: scored.filter((r) => r.outcome === 'miss').length,
    said: self.filter((r) => r.outcome === 'said').length,
    notYet: self.filter((r) => r.outcome === 'notyet').length,
  };
}
/**
 * Plain text for a summary. Scored and self-marked are reported separately; self-marks get no percentage.
 * `average: false` leaves the percentage out: use it for stored history, where attempts saved before word scoring carry a
 * letter-similarity number that is not a share of words.
 */
export function summaryText(s, { average = true } = {}) {
  const parts = [];
  if (s.scored) parts.push(`Scored by the recognizer: ${s.scored} item${s.scored === 1 ? '' : 's'}${average ? `, average ${Math.round(s.average * 100)}% of words recognized` : ''} (${s.matched} fully, ${s.close} close, ${s.missed} missed).`);
  if (s.said + s.notYet) parts.push(`Marked by you, not scored: ${s.said} said, ${s.notYet} not yet.`);
  return parts.join(' ') || 'Nothing scored or marked yet.';
}
