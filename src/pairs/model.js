// Look-Alike Words (#/pairs): the tell-them-apart drill over data/vocab/confusables.json. Pure functions, no DOM.
// The pairs are found by rule from the word list (tools/vocab/build_confusables.mjs); nobody picked them by hand.
export const STORE_KEY = 'pairs.v1';
export const KINDS = Object.freeze([
  ['look', 'Look alike', 'One letter apart, or two letters swapped.'],
  ['sound', 'Sound alike', 'Said the same way, or one sound apart, and spelled differently.'],
  ['same', 'Same letters', 'The same letters with different vowel marks. Without the marks they look identical.'],
]);
export const KIND_IDS = KINDS.map((k) => k[0]);
export const DRAFT_NOTE = 'Draft and unreviewed: these pairs are found by rule from the word list (spelling and sound). No Hebrew teacher has checked them, and some pairs will be easier than others.';
const MAX_TRACKED = 1500;

function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

export const emptyProgress = () => ({ v: 1, asked: 0, right: 0, round: 0, pairs: {} });
export function normalizeProgress(raw) {
  const p = emptyProgress();
  if (!raw || typeof raw !== 'object') return p;
  const n = (x) => (Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);
  p.asked = n(raw.asked); p.right = Math.min(n(raw.right), p.asked); p.round = n(raw.round);
  if (raw.pairs && typeof raw.pairs === 'object') for (const [id, v] of Object.entries(raw.pairs).slice(0, MAX_TRACKED)) if (/^[lsv]\d{3}$/.test(id) && Array.isArray(v)) p.pairs[id] = [n(v[0]), n(v[1])];
  return p;
}
/** Record one answer for a pair. @returns a new progress object */
export function record(progress, pairId, correct) {
  const p = normalizeProgress(progress), cur = p.pairs[pairId] || [0, 0];
  p.pairs[pairId] = [cur[0] + (correct ? 1 : 0), cur[1] + (correct ? 0 : 1)];
  p.asked += 1; p.right += correct ? 1 : 0;
  return p;
}
/** How a pair stands: 'new' (never asked), 'shaky' (missed at least as often as got), 'steady'. */
export function standing(progress, pairId) {
  const s = progress?.pairs?.[pairId];
  if (!s || s[0] + s[1] === 0) return 'new';
  return s[1] >= s[0] ? 'shaky' : 'steady';
}
export function tally(data, progress, kind) {
  const out = { total: 0, new: 0, shaky: 0, steady: 0 };
  for (const p of data.pairs) { if (kind && p.kind !== kind) continue; out.total += 1; out[standing(progress, p.id)] += 1; }
  return out;
}

/** What tells the two words apart, in one plain line. */
export function difference(pair, words) {
  const a = words[pair.a], b = words[pair.b];
  if (pair.kind === 'same') return `Same letters, different vowel marks: ${a.translit} and ${b.translit}.`;
  if (pair.kind === 'sound') return pair.sameSound ? `Both are said "${a.translit}". The letters differ.` : `Nearly the same sound: ${a.translit} and ${b.translit}.`;
  if (pair.swap) return `Two letters change places: ${pair.differs[0]} and ${pair.differs[1]}.`;
  return pair.differs ? `One letter differs: ${pair.differs[0]} and ${pair.differs[1]}.` : 'One letter differs.';
}

/**
 * One round: pairs the learner has missed come first, then pairs never asked (most common words first), then the rest.
 * Each question shows one side of a pair and asks for the other side; the two options are always the two words of the pair.
 *   type 'meaning' : an English meaning is shown, pick the Hebrew word
 *   type 'word'    : a Hebrew word is shown, pick the English meaning
 */
export function buildRound(data, progress, { kind = null, seed = 1, count = 8 } = {}) {
  const r = rng(seed), pool = data.pairs.filter((p) => !kind || p.kind === kind);
  const order = { shaky: 0, new: 1, steady: 2 };
  const ranked = pool.map((p, i) => ({ p, i, s: order[standing(progress, p.id)] })).sort((x, y) => x.s - y.s || x.i - y.i);
  const picked = [], usedWords = new Set();
  for (const { p } of ranked) {
    if (picked.length >= count) break;
    if (usedWords.has(p.a) || usedWords.has(p.b)) continue; // a word appears once in a round, so one answer never gives away another
    usedWords.add(p.a); usedWords.add(p.b); picked.push(p);
  }
  return picked.map((p, n) => {
    const flip = r() < 0.5, target = flip ? p.b : p.a, other = flip ? p.a : p.b;
    const type = p.kind === 'sound' && p.sameSound ? 'meaning' : (r() < 0.5 ? 'meaning' : 'word');
    const options = (r() < 0.5 ? [target, other] : [other, target]).map((id) => ({ id, he: data.words[id].he, en: data.words[id].en }));
    return { n, pair: p, type, target, other, answer: target, options, prompt: type === 'meaning' ? `Which word means "${data.words[target].en}"?` : 'What does this word mean?' };
  });
}
export const grade = (q, optionId) => ({ correct: optionId === q.answer, answer: q.answer });

/** Pairs for the browse list: a kind, an optional search over Hebrew letters, sounds-like and English. */
export function listPairs(data, { kind = null, q = '', limit = 40 } = {}) {
  const t = String(q || '').trim().toLowerCase(), bare = (s) => String(s).normalize('NFD').replace(/[֑-ׇ]/g, '');
  const hit = (id) => { const w = data.words[id]; return !t || bare(w.he).includes(bare(t)) || w.translit.toLowerCase().includes(t) || w.en.toLowerCase().includes(t); };
  return data.pairs.filter((p) => (!kind || p.kind === kind) && (hit(p.a) || hit(p.b))).slice(0, limit);
}
