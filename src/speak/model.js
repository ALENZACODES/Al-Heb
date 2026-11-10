// "Say it" speaking practice: pure functions, no DOM, no clock (every time is passed in).
// Targets come only from data/vocab/words.json and data/corpus/phrasebook.json (both machine-built DRAFTS, not native-reviewed);
// nothing here writes Hebrew of its own. Comparison is letters-only (niqqud, cantillation and punctuation stripped, final letters
// folded), because a browser recognizer returns unpointed text. The recognizer itself is the browser's (SpeechRecognition,
// lang he-IL): Aleph has not verified how well it hears Hebrew, so a verdict is a hint, never a grade.

export const STORE_KEY = 'speak.v1';
export const MAX_ATTEMPTS = 1000;
export const MODES = ['asr', 'record', 'self'];
export const CLOSE_SCORE = 0.7;

/** Letters only: points (U+0591..U+05C7), maqaf, punctuation and bidi marks removed; final letters folded; one space between words. */
export function normalizeHe(s) {
  return String(s ?? '').normalize('NFC')
    .replace(/[־׀׃׳״]/g, ' ')
    .replace(/[֑-ׇ]/g, '')
    .replace(/[‎‏‪-‮"'`.,;:!?()\[\]{}\-–—/\\]/g, ' ')
    .replace(/[ךםןףץ]/g, (c) => ({ 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' })[c])
    .replace(/\s+/g, ' ').trim();
}

/**
 * The four-letter divine name is never read as written; a recognizer writes what it hears (אדוני), though it might also write the name
 * itself. Both the target and what was heard are folded to the spoken form before comparing, on normalized (unpointed) text, so
 * prefixed forms (ליהוה) are covered too.
 */
export const spokenTarget = (s) => normalizeHe(s).replace(/יהוה/g, 'אדני').replace(/(^| )ה(?= |$)/g, '$1אדני'); // a lone ה is the he+geresh abbreviation (normalizeHe drops the geresh)
/** Pointed text with the divine name replaced by its spoken form, for the browser voice (same substitution the audio manifest uses). */
export const spokenPointed = (he) => String(he ?? '').normalize('NFC').replace(/יְהוָה/g, 'אֲדֹנָי');

/** Spelling skeleton: vav and yod removed, so the recognizer's full spelling (בוקר) matches the pointed list's defective one (בקר). */
export const skeleton = (s) => String(s ?? '').replace(/[וי]/g, '');

/** Levenshtein distance between two strings (iterative, O(n*m)). */
export function levenshtein(a, b) {
  a = String(a); b = String(b);
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/** Similarity in [0,1]: 1 - distance / longer length. Empty vs empty = 1. */
export function similarity(a, b) {
  const n = Math.max(String(a).length, String(b).length);
  return n ? 1 - levenshtein(a, b) / n : 1;
}

/**
 * Compare the learner's recognized text with the target. `heard` may be one string or a list of recognizer alternatives.
 * Returns {outcome:'match'|'close'|'miss', score, heard (best alternative, raw), target (normalized), heardNorm}.
 * 'close' = similarity >= CLOSE_SCORE or the target appears inside the alternative; this is a hint from an unverified recognizer.
 */
export function compare(targetHe, heard) {
  const target = spokenTarget(targetHe);
  const alts = (Array.isArray(heard) ? heard : [heard]).map((h) => String(h ?? '')).filter((h) => h.trim());
  let best = { outcome: 'miss', score: 0, heard: alts[0] || '', target, heardNorm: normalizeHe(alts[0] || '') };
  for (const h of alts) {
    const hn = spokenTarget(h);
    let score = Math.max(similarity(target, hn), similarity(skeleton(target), skeleton(hn)));
    if (hn !== target && target && hn.split(' ').includes(target)) score = Math.max(score, CLOSE_SCORE);
    const same = !!target && (hn === target || skeleton(hn) === skeleton(target));
    const outcome = same ? 'match' : score >= CLOSE_SCORE ? 'close' : 'miss';
    const rank = { match: 2, close: 1, miss: 0 };
    if (rank[outcome] > rank[best.outcome] || (rank[outcome] === rank[best.outcome] && score > best.score)) best = { outcome, score, heard: h, target, heardNorm: hn };
  }
  return best;
}

/**
 * What this browser can do, from an injected global (nothing is started here).
 * SpeechRecognition exists in Chromium and Safari (webkit prefix); it may send audio to the browser vendor's servers.
 */
export function capabilities(g = globalThis) {
  const Rec = g?.SpeechRecognition || g?.webkitSpeechRecognition || null;
  const secure = g?.isSecureContext !== false;
  const gum = !!g?.navigator?.mediaDevices?.getUserMedia;
  const MR = g?.MediaRecorder || null;
  const synth = g?.speechSynthesis || null;
  let hebrewVoice = null; // null = unknown (voice list may load later), true/false when the list answered
  try { const vs = synth?.getVoices?.(); if (Array.isArray(vs) && vs.length) hebrewVoice = vs.some((v) => /^he\b/i.test(v.lang || '')); } catch { /* ignore */ }
  return { recognition: !!Rec && secure, recording: !!(MR && gum) && secure, synthesis: !!synth && !!(g?.SpeechSynthesisUtterance), hebrewVoice, secure };
}

/** The mode to use: the learner's choice if the browser supports it, else the best supported one. */
export function pickMode(caps, wanted = 'auto') {
  const ok = { asr: caps.recognition, record: caps.recording, self: true };
  if (wanted !== 'auto' && ok[wanted]) return wanted;
  return caps.recognition ? 'asr' : caps.recording ? 'record' : 'self';
}

/** A set's items, in order; `kinds` filters by item kind (word/phrase). Items lacking Hebrew are dropped (never invented). */
export function usableItems(items, { kinds = null } = {}) {
  return (items || []).filter((it) => it && typeof it.he === 'string' && normalizeHe(it.he) && (!kinds || kinds.includes(it.kind)));
}

/** Empty store value. */
export const emptyState = () => ({ v: 1, attempts: [], lastSet: null, mode: 'auto' });

/** Coerce whatever is in the store into a valid state (older or damaged values are tolerated, never thrown on). */
export function coerceState(raw) {
  const s = emptyState();
  if (!raw || typeof raw !== 'object') return s;
  if (Array.isArray(raw.attempts)) s.attempts = raw.attempts.filter((a) => a && typeof a === 'object' && typeof a.at === 'number');
  if (typeof raw.lastSet === 'string') s.lastSet = raw.lastSet;
  if (raw.mode === 'auto' || MODES.includes(raw.mode)) s.mode = raw.mode;
  return s;
}

/**
 * Record one attempt (input untouched). kind 'say' (Say it) or 'pair' (listening drill).
 * a = {kind, set, itemId, he, mode, outcome, score?, heard?, contrast?, correct?, tradition?, rating? (shadowing 1-3), missedWords?}.
 * kind 'read' = a line read aloud (set = prayer id, itemId = line number); kind 'shadow' = listen-and-repeat self-rated 1-3.
 */
export function recordAttempt(state, a, now) {
  const s = coerceState(state);
  const entry = { at: +now, kind: a.kind || 'say', set: a.set ?? null, itemId: a.itemId ?? null, he: normalizeHe(a.he), mode: a.mode || 'self', outcome: a.outcome };
  if (typeof a.score === 'number') entry.score = Math.round(a.score * 100) / 100;
  if (a.heard) entry.heard = String(a.heard).slice(0, a.kind === 'read' ? 400 : 80);
  if (a.contrast) entry.contrast = a.contrast;
  if (typeof a.correct === 'boolean') entry.correct = a.correct;
  if (a.tradition) entry.tradition = String(a.tradition);
  if (typeof a.rating === 'number') entry.rating = Math.max(1, Math.min(3, Math.round(a.rating)));
  if (Array.isArray(a.missedWords)) entry.missedWords = a.missedWords.slice(0, 12).map((w) => String(w).slice(0, 24));
  const attempts = s.attempts.concat(entry);
  return { ...s, attempts: attempts.length > MAX_ATTEMPTS ? attempts.slice(attempts.length - MAX_ATTEMPTS) : attempts };
}

/** Counts for one set from the attempts list: items tried, matched (match or said), close, missed. */
export function setSummary(attempts, setId) {
  const mine = attempts.filter((a) => a.kind === 'say' && a.set === setId && a.outcome !== 'skip'); // a skip is not an attempt
  const byItem = new Map();
  for (const a of mine) byItem.set(a.itemId, a); // last attempt per item wins
  const last = [...byItem.values()];
  const good = (a) => a.outcome === 'match' || a.outcome === 'said';
  return { tried: last.length, good: last.filter(good).length, close: last.filter((a) => a.outcome === 'close').length, missed: last.filter((a) => a.outcome === 'miss' || a.outcome === 'notyet').length };
}

// ---- Scoring history and the weakest-sounds report ----------------------------------------------------------------
// Say-it attempts in asr mode give a target string and the recognizer's text; both are letters only, so the report is by
// LETTER CLASS (bet/vet share ב, het/khaf share the kh sound), never by vowel. It counts what the browser recognizer wrote,
// which Aleph has not verified for Hebrew: a "weak" sound may be the recognizer's weakness, not the learner's.

export const SOUND_CLASSES = [
  { id: 'alef-ayin', label: 'alef / ayin (glottal or silent)', letters: 'אע' },
  { id: 'bet-vet', label: 'bet / vet', letters: 'ב' },
  { id: 'het-khaf', label: 'het / khaf (throaty kh)', letters: 'חכ' },
  { id: 'he', label: 'he (h)', letters: 'ה' },
  { id: 'resh', label: 'resh (r)', letters: 'ר' },
  { id: 'tsadi', label: 'tsadi (ts)', letters: 'צ' },
  { id: 'shin-sin', label: 'shin / sin', letters: 'ש' },
  { id: 'kamatz', label: 'kamatz: a or o', letters: '' },
  { id: 'vav', label: 'vav (v, o, u)', letters: 'ו' },
  { id: 'yod', label: 'yod (y, i)', letters: 'י' },
  { id: 'other', label: 'other letters', letters: 'בגדזטלמנספקת' },
];
export function soundClass(letter) {
  for (const c of SOUND_CLASSES) if (c.letters.includes(letter)) return c.id;
  return 'other';
}
const PAIR_LABELS = { 'kaf-khaf': 'kaf / khaf', 'pe-fe': 'pe / fe', 'tav-sav': 'tav / sav', 'tzere-segol': 'tzere / segol', 'kamatz-patach': 'kamatz / patach', 'alef-ayin': 'alef / ayin (glottal or silent)' };
export const soundLabel = (id) => (SOUND_CLASSES.find((c) => c.id === id) || { label: PAIR_LABELS[id] || id }).label;

/**
 * Align target letters against heard letters (edit-distance backtrace). Returns per target letter {letter, hit}: hit = the same
 * letter in the alignment; substitution or deletion = miss. Insertions in the heard text are ignored.
 */
export function alignLetters(target, heard) {
  const a = spokenTarget(target).replace(/ /g, ''), b = spokenTarget(heard).replace(/ /g, '');
  const n = a.length, m = b.length;
  const d = Array.from({ length: n + 1 }, (_, i) => { const r = new Array(m + 1); r[0] = i; return r; });
  for (let j = 1; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  const out = [];
  let i = n, j = m;
  while (i > 0) {
    if (j > 0 && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) { out.push({ letter: a[i - 1], hit: a[i - 1] === b[j - 1] }); i--; j--; }
    else if (d[i][j] === d[i - 1][j] + 1) { out.push({ letter: a[i - 1], hit: false }); i--; }
    else { j--; }
  }
  return out.reverse();
}

/**
 * Weakest sounds from the attempt history. Letter evidence: asr say-it attempts (alignment of target vs heard). Drill evidence:
 * pair attempts (contrast id, correct). Returns {rows:[{id,label,tries,misses,rate,sources}], ranked:[...rows with >= min tries, worst first], total}.
 */
export function soundReport(attempts, { min = 3 } = {}) {
  const acc = new Map();
  const bump = (id, miss, src) => { const r = acc.get(id) || { id, label: soundLabel(id), tries: 0, misses: 0, sources: {} }; r.tries++; if (miss) r.misses++; r.sources[src] = (r.sources[src] || 0) + 1; acc.set(id, r); };
  for (const a of attempts || []) {
    if (a.kind === 'say' && a.mode === 'asr' && a.he && typeof a.heard === 'string') {
      for (const { letter, hit } of alignLetters(a.he, a.heard)) bump(soundClass(letter), !hit, 'say');
    } else if (a.kind === 'pair' && a.contrast && typeof a.correct === 'boolean') bump(a.contrast, !a.correct, 'drill');
  }
  const rows = [...acc.values()].map((r) => ({ ...r, rate: r.tries ? r.misses / r.tries : 0 })).sort((x, y) => y.rate - x.rate || y.tries - x.tries || x.id.localeCompare(y.id));
  return { rows, ranked: rows.filter((r) => r.tries >= min), total: rows.reduce((n, r) => n + r.tries, 0) };
}

/** History rows for the screen: newest first, at most `limit`. */
export function historyRows(attempts, limit = 30) {
  return (attempts || []).filter((a) => a.outcome !== 'skip').sort((a, b) => b.at - a.at).slice(0, limit);
}
/** Day-by-day totals for say-it attempts (local date keys from the injected formatter). */
export function dailyTotals(attempts, dayKey = (t) => new Date(t).toISOString().slice(0, 10)) {
  const days = new Map();
  for (const a of attempts || []) { if (a.outcome === 'skip') continue; const k = dayKey(a.at); const d = days.get(k) || { day: k, say: 0, good: 0, drills: 0, drillRight: 0 }; if (a.kind === 'pair') { d.drills++; if (a.correct) d.drillRight++; } else { d.say++; if (a.outcome === 'match' || a.outcome === 'said') d.good++; } days.set(k, d); }
  return [...days.values()].sort((x, y) => y.day.localeCompare(x.day));
}


// ---- Word-level comparison for reading aloud ---------------------------------------------------------------------------
// A prayer line is compared with what the recognizer wrote, word by word (letters only). Words are aligned by edit distance
// over WORDS (a substitution costs 1 - similarity), so one missed word does not shift the rest of the line.

export const NEAR_WORD = 0.7;
/** Words of a line, letters only (maqaf and spaces split; punctuation gone). */
export const wordsOf = (s) => normalizeHe(s).split(' ').filter(Boolean);
const wordScore = (a, b) => (a === b || skeleton(a) === skeleton(b) ? 1 : Math.max(0, similarity(a, b)));

/**
 * Align target words with heard words. Returns [{word, heard, score, status}] in target order; status 'hit' (same letters, vav/yod
 * tolerant), 'near' (score >= NEAR_WORD) or 'miss' (not heard, or too different). `target` and `heard` are raw strings.
 */
export function alignWords(target, heard) {
  const a = wordsOf(target), b = wordsOf(heard);
  const af = spokenTarget(target).split(' ').filter(Boolean), bf = spokenTarget(heard).split(' ').filter(Boolean); // divine name folded to its spoken form for scoring
  const n = a.length, m = b.length;
  const cost = (i, j) => 1 - wordScore(af[i], bf[j]);
  const d = Array.from({ length: n + 1 }, (_, i) => { const r = new Array(m + 1).fill(0); r[0] = i; return r; });
  for (let j = 1; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost(i - 1, j - 1));
  const out = new Array(n);
  let i = n, j = m;
  while (i > 0) {
    if (j > 0 && Math.abs(d[i][j] - (d[i - 1][j - 1] + cost(i - 1, j - 1))) < 1e-9) { const sc = wordScore(af[i - 1], bf[j - 1]); out[i - 1] = { word: a[i - 1], heard: b[j - 1], score: sc, status: sc >= 1 ? 'hit' : sc >= NEAR_WORD ? 'near' : 'miss' }; i--; j--; }
    else if (Math.abs(d[i][j] - (d[i - 1][j] + 1)) < 1e-9) { out[i - 1] = { word: a[i - 1], heard: null, score: 0, status: 'miss' }; i--; }
    else j--;
  }
  return out;
}

/** Best of several recognizer alternatives for a line: {words, hit, near, miss, score, outcome, heard}. outcome match = every word hit; close = >= 70% of words hit or near. */
export function compareLine(target, heard) {
  const alts = (Array.isArray(heard) ? heard : [heard]).map((h) => String(h ?? '')).filter((h) => h.trim());
  let best = null;
  for (const h of alts.length ? alts : ['']) {
    const words = alignWords(target, h);
    const hit = words.filter((w) => w.status === 'hit').length, near = words.filter((w) => w.status === 'near').length;
    const score = words.length ? (hit + 0.5 * near) / words.length : 0;
    const cand = { words, hit, near, miss: words.length - hit - near, score, heard: h };
    if (!best || cand.score > best.score) best = cand;
  }
  best.outcome = best.words.length && best.hit === best.words.length ? 'match' : (best.hit + best.near) / (best.words.length || 1) >= CLOSE_SCORE ? 'close' : 'miss';
  return best;
}

/** Words missed most often when reading aloud: [{word, count}] with count >= min, most missed first. */
export function missedWordsReport(attempts, { min = 2, limit = 8 } = {}) {
  const c = new Map();
  for (const a of attempts || []) if (a.kind === 'read' && Array.isArray(a.missedWords)) for (const w of a.missedWords) c.set(w, (c.get(w) || 0) + 1);
  return [...c].map(([word, count]) => ({ word, count })).filter((x) => x.count >= min).sort((x, y) => y.count - x.count || x.word.localeCompare(y.word)).slice(0, limit);
}
