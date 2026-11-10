// Word Sprint model: pure functions, no DOM, no clock (every time is passed in), deterministic given an rng.
// Words come from the vocabulary list (data/vocab, a machine-built DRAFT, proofread:false). SRS cards are the vocab
// view's own cards (store key "srs.vocab", ids "vocab:<id>") scheduled by src/curriculum/srs.js; nothing here reschedules.
import { review, newCard } from '../curriculum/srs.js';
import { stripPoints, cardId, VOCAB_CARDS_KEY } from '../vocab/model.js';

export { VOCAB_CARDS_KEY, cardId };
export const SPRINT_MS = 5 * 60 * 1000;
export const LAST_KEY = 'sprint.last';
export const TOP = 'top';
export const CARD_TYPES = ['hear-meaning', 'pick-sound', 'point-to-english'];
const CLITICS = 'והבכלמש';

/** Letters only: points, cantillation, maqaf and verse punctuation removed. */
export const letters = (s) => stripPoints(String(s ?? '')).replace(/[־׀׃:.,;!?"'()]/g, '');
/** Words of a Hebrew line, points kept (maqaf joins are split). */
export const tokens = (he) => String(he ?? '').split(/[\s־]+/).map(pointedKey).filter(Boolean);

const usable = (e) => !e.isForm && !(e.tags || []).includes('rare-sense') && !!e.pointed && !!e.gloss;

/** Pointed form for matching: cantillation, maqaf and verse punctuation removed; vowel points and dots kept. */
export const pointedKey = (s) => String(s ?? '').normalize('NFC').replace(/[\u0591-\u05AF\u05BE\u05C0\u05C3\u05C6]/g, '').replace(/[:.,;!?"'()\s]/g, '');

/**
 * Surface form -> list entry. A pointed token must match a pointed list form (optionally after one prefix letter), so homographs
 * are not guessed; an unpointed token falls back to letters only when exactly one list word has those letters.
 */
export function buildIndex(entries) {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const pointed = new Map(), loose = new Map();
  const addTo = (m, k, e) => { if (!k) return; const cur = m.get(k); if (!cur) m.set(k, new Map([[e.id, e]])); else cur.set(e.id, e); };
  for (const e of entries) {
    const target = e.isForm ? byId.get(e.formOf) : e;
    if (!target || !usable(target)) continue;
    for (const [he, pt] of [[e.lemma, e.pointed], ...(e.forms || []).map((f) => [f.he, f.pointed])]) {
      addTo(loose, letters(he), target);
      if (pt) addTo(pointed, pointedKey(pt), target);
    }
  }
  const best = (m) => [...m.values()].sort((a, b) => a.rank - b.rank)[0];
  const only = (m, k) => { const g = m.get(k); return g && g.size === 1 ? best(g) : null; };
  return { byId, find(word) {
    const pk = pointedKey(word), w = letters(word), isPointed = pk !== w;
    const hit = pointed.get(pk); if (hit) return best(hit);
    if (isPointed) { // a pointed token must match a pointed entry; strip one prefix letter (with its points) and try again
      if (w.length > 2 && CLITICS.includes(w[0])) { const rest = pk.replace(/^.[\u05B0-\u05C7]*/u, ''); const h2 = pointed.get(rest); if (h2) return best(h2); }
      return null;
    }
    const lo = only(loose, w); if (lo) return lo;
    if (w.length > 2 && CLITICS.includes(w[0])) return only(loose, w.slice(1));
    return null;
  } };
}

/**
 * Destinations: every corpus siddur line and Israel scenario that matches at least `min` list words, plus "most common words".
 * words = distinct list entries (by rank) found in the line; total = word tokens in the line (matched/total is shown to the learner).
 */
export function buildDestinations(index, registry, scenarios, min = 3) {
  const make = (id, kind, title, texts, extra = {}) => {
    const toks = texts.flatMap(tokens);
    const seen = new Map();
    for (const t of toks) { const e = index.find(t); if (e && !seen.has(e.id)) seen.set(e.id, e); }
    const words = [...seen.values()].sort((a, b) => a.rank - b.rank);
    return { id, kind, title, total: toks.length, matchedTokens: toks.filter((t) => index.find(t)).length, words, ...extra };
  };
  const out = [];
  for (const r of registry) if (r.category === 'siddur') out.push(make('prayer:' + r.id, 'prayer', r.title, [r.he], { readId: r.id }));
  for (const s of scenarios) {
    const natural = (s.options || []).filter((o) => o.role === 'natural').map((o) => o.he);
    out.push(make('israel:' + s.id, 'israel', s.title, [s.other?.he, ...natural].filter(Boolean)));
  }
  return out.filter((d) => d.words.length >= min);
}

/** "Known" for the end screen: the word has an SRS card whose last answer was a recall (state review) with stability >= 3 days (one Good answer). Not mastery. */
export const isKnown = (card) => !!card && card.state === 'review' && card.lastReview != null && card.stability >= 3;
export const knownCount = (words, cards) => words.filter((e) => isKnown(cards[cardId(e)])).length;

/**
 * Build the queue for one sprint. Order: due cards first (up to `dueMax`), then destination words not yet known by rank,
 * interleaved 3:1 with the next unseen common words (so a prayer line is not the only thing practised); common words only when no destination.
 */
export function buildQueue({ entries, cards, dest = null, now, limit = 40, dueMax = 4 }) {
  const t = +now, picked = new Set(), q = [];
  const take = (e) => { if (!e || picked.has(e.id) || !usable(e) || q.length >= limit) return false; picked.add(e.id); q.push(e); return true; };
  const byId = new Map(entries.map((e) => [e.id, e]));
  const pool = dest ? dest.words : [];
  const dueIds = Object.values(cards || {}).filter((c) => c && String(c.id).startsWith('vocab:') && c.due <= t && c.state !== 'new')
    .sort((a, b) => a.due - b.due || String(a.id).localeCompare(String(b.id)));
  let nDue = 0;
  for (const c of dueIds) { if (nDue >= dueMax) break; const e = byId.get(String(c.id).slice(6)); if (e && (!dest || pool.some((w) => w.id === e.id) || nDue < 2) && take(e)) nDue++; }
  const destLeft = pool.filter((e) => !isKnown(cards?.[cardId(e)]));
  const fill = entries.filter((e) => usable(e) && !cards?.[cardId(e)]);
  let di = 0, fi = 0, n = 0;
  while (q.length < limit && (di < destLeft.length || fi < fill.length)) {
    const wantFill = !dest || (n % 4 === 3);
    if (!wantFill && di < destLeft.length) take(destLeft[di++]);
    else if (fi < fill.length) take(fill[fi++]);
    else if (di < destLeft.length) take(destLeft[di++]);
    n++;
  }
  return q;
}

/**
 * Build one question. Types: hear-meaning (see + hear if a clip exists, pick the English), pick-sound (see, pick the transliteration),
 * point-to-english (pointed Hebrew, reveal the English, say if you knew it). Type is rotated by card reps so a word comes back in a new way.
 * `translit(entry)` -> string, `rng()` -> [0,1). Returns {type, entry, options?, answer}.
 */
export function buildQuestion({ entry, entries, card, translit, rng }) {
  const reps = card?.reps || 0;
  let type = CARD_TYPES[reps % CARD_TYPES.length];
  const shuffle = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const others = entries.filter((e) => usable(e) && e.id !== entry.id);
  const distract = (val, key, n = 2) => {
    const seen = new Set([key(entry)]); const out = [];
    for (const e of shuffle(others.filter((o) => o.pos === entry.pos).concat(shuffle(others)))) {
      const k = key(e); if (!k || seen.has(k)) continue; seen.add(k); out.push(e); if (out.length >= n) break;
    }
    return out;
  };
  if (type === 'pick-sound') {
    const mine = translit(entry);
    if (!mine) type = 'hear-meaning';
    else {
      const ds = distract(entry, (e) => translit(e)).filter((e) => translit(e));
      if (ds.length < 2) type = 'hear-meaning';
      else return { type, entry, answer: mine, options: shuffle([{ id: entry.id, label: mine }, ...ds.map((e) => ({ id: e.id, label: translit(e) }))]) };
    }
  }
  if (type === 'hear-meaning') {
    const ds = distract(entry, (e) => e.gloss);
    if (ds.length >= 2) return { type, entry, answer: entry.gloss, options: shuffle([{ id: entry.id, label: entry.gloss }, ...ds.map((e) => ({ id: e.id, label: e.gloss }))]) };
  }
  return { type: 'point-to-english', entry, answer: entry.gloss };
}

/** Rating from an outcome: first-try correct / knew it -> Good (3); anything else -> Again (1). No penalty beyond the normal SRS due time. */
export const ratingFor = (correct) => (correct ? 3 : 1);

/** Apply one answer to the vocab card map (input untouched). Creates the card if the word is new. */
export function applyAnswer(cards, entry, correct, now) {
  const id = cardId(entry);
  const base = cards[id] || { ...newCard({ id, kind: 'word', now }), tier: entry.tier, topic: entry.topic };
  return { ...cards, [id]: { ...review(base, ratingFor(correct), now), tier: base.tier, topic: base.topic } };
}

/** Sprint timer: pure state machine with an injected clock. Counts only while running; pause() when the page is hidden. */
export function createTimer(total = SPRINT_MS) {
  let used = 0, since = null;
  return {
    start(t) { since = +t; },
    pause(t) { if (since != null) { used += Math.max(0, +t - since); since = null; } },
    resume(t) { if (since == null) since = +t; },
    get running() { return since != null; },
    elapsed(t) { return used + (since != null ? Math.max(0, +t - since) : 0); },
    remaining(t) { return Math.max(0, total - this.elapsed(t)); },
    done(t) { return this.remaining(t) <= 0; },
  };
}
export const clockText = (ms) => { const s = Math.ceil(Math.max(0, ms) / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
