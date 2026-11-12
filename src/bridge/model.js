// Unvocalized bridge (#/bridge), lane 6 (12 Nov 2026, points plan #16). Pure logic: no DOM, no network.
// The ladder goes on from the Fade-Out stages (0 full, 1 alternate letters, 2 initials, 3 blank; src/curriculum/fade.js) with three
// last reading stages: 4 vowel marks off, 5 transliteration off, 6 both off. The level is kept per text (store key bridge.v1),
// apart from the Fade-Out level each line keeps on its review card.
// Hebrew: every line shown here is the app's own pointed text with the marks taken off in code (stripPoints), or the sign spelling the
// Camera Translator's word list already stores. Nothing is typed here. The four-letter name is shown as ה׳ (showName) and never voiced.
import { stripPoints } from '../nikkudfade/model.js';
import { FADE_LEVELS } from '../curriculum/fade.js';
import { showName, hasName } from '../games/tg-core.js';

export { stripPoints, showName };
export const STORE_KEY = 'bridge.v1';
export const DRAFT_NOTE = 'Draft: no Hebrew teacher has checked this practice. You say whether you read each text; the app does not hear you.';
/** Said wherever marks were taken off in code: Israeli spelling often adds letters this cannot add. */
export const SPELLING_NOTE = 'These lines are the app’s pointed text with the vowel marks taken off. Israeli writing often adds a vav or a yod where a vowel was. The app does not add letters, so some words look shorter here than they do in Israel.';

/** The three last stages. `vowels` and `translit` say what is still shown. */
export const BRIDGE_STAGES = Object.freeze([
  { level: 4, id: 'vowels-off', name: 'Vowel marks off', help: 'The vowel marks are gone. The transliteration is still under each line.', vowels: false, translit: true },
  { level: 5, id: 'translit-off', name: 'Transliteration off', help: 'The vowel marks are back. The transliteration is hidden.', vowels: true, translit: false },
  { level: 6, id: 'both-off', name: 'Both off', help: 'No vowel marks and no transliteration, the way Hebrew is printed in Israel.', vowels: false, translit: false },
]);
export const FIRST_BRIDGE = 4, LAST_BRIDGE = 6;
/** The whole ladder: the four Fade-Out stages, then the three bridge stages. */
export const LADDER = Object.freeze([...FADE_LEVELS.map((l) => ({ ...l, kind: 'fade' })), ...BRIDGE_STAGES.map((s) => ({ ...s, kind: 'bridge' }))]);
export const stageOf = (level) => BRIDGE_STAGES.find((s) => s.level === level) || BRIDGE_STAGES[0];
const clampLevel = (n) => (Number.isInteger(n) && n >= FIRST_BRIDGE && n <= LAST_BRIDGE ? n : FIRST_BRIDGE);

/** How one text looks at a stage. text = {he (pointed), translit}. The four-letter name is shown as ה׳ at every stage. */
export function present(level, text) {
  const s = stageOf(clampLevel(level));
  const shown = showName(String(text?.he ?? ''));
  return { level: s.level, he: s.vowels ? shown : stripPoints(shown), pointed: shown, vowels: s.vowels, translit: s.translit && text?.translit ? String(text.translit) : null };
}

const num = (x) => (Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);
export const defaultState = () => ({ v: 1, texts: {}, words: {}, modern: {} });
/** Anything read back from storage -> a valid state (never throws). */
export function normalizeState(raw) {
  const s = defaultState();
  if (!raw || typeof raw !== 'object') return s;
  for (const [id, t] of Object.entries(raw.texts && typeof raw.texts === 'object' ? raw.texts : {}).slice(0, 2000)) {
    if (t && typeof t === 'object') s.texts[id] = { level: clampLevel(t.level), done: t.done === true, doneAt: num(t.doneAt), tries: num(t.tries), unaided: Math.min(num(t.unaided), num(t.tries)) };
  }
  for (const key of ['words', 'modern']) {
    for (const [id, w] of Object.entries(raw[key] && typeof raw[key] === 'object' ? raw[key] : {}).slice(0, 5000)) {
      if (w && typeof w === 'object') { const seen = num(w.seen); s[key][id] = { seen, firstTry: Math.min(num(w.firstTry), seen) }; }
    }
  }
  return s;
}

/** The learner's level for one text (4 when the text is new). */
export const levelOf = (state, id) => state?.texts?.[id]?.level ?? FIRST_BRIDGE;
export const isDone = (state, id) => state?.texts?.[id]?.done === true;

/**
 * Same rule as Fade-Out (nextFadeLevel): only a read AT the saved level moves it. Read without help -> one stage on
 * (at stage 6 the text is done); needed help -> one stage back (never below 4). Reading another stage changes nothing.
 */
export function nextBridgeLevel(stored, played, unaided) {
  const s = clampLevel(stored);
  if (played !== s) return { level: s, moved: false, finished: false };
  if (unaided) return s === LAST_BRIDGE ? { level: s, moved: false, finished: true } : { level: s + 1, moved: true, finished: false };
  return { level: Math.max(FIRST_BRIDGE, s - 1), moved: s > FIRST_BRIDGE, finished: false };
}

/** Record one read of a whole text at `played`. unaided = read through with nothing revealed and "I read it" chosen. */
export function recordText(state, id, played, unaided, now = 0) {
  const t = state.texts[id] || { level: FIRST_BRIDGE, done: false, doneAt: 0, tries: 0, unaided: 0 };
  const r = nextBridgeLevel(t.level, played, unaided);
  const done = t.done || r.finished;
  const next = { level: r.level, done, doneAt: t.doneAt || (r.finished ? now : 0), tries: t.tries + 1, unaided: t.unaided + (unaided ? 1 : 0) };
  return { state: { ...state, texts: { ...state.texts, [id]: next } }, result: r };
}

export const bookTextId = (id) => `book:${id}`;
export const lineTextId = (id) => `line:${id}`;

/**
 * Books in reading order for the bridge: the ones already read with vowels first (finished, then started, most recent first),
 * then the rest in shelf order. books.v1 is the reader's own record ({[id]: {lastPage, reachedEndAt, finishedAt}}).
 * @param {any[]} shelf books in shelf order @param {any} booksV1 @param {any} state
 */
export function bookShelf(shelf, booksV1, state) {
  const rec = booksV1 && typeof booksV1 === 'object' ? booksV1 : {};
  const read = (b) => { const e = rec[b.id]; return e && typeof e === 'object' ? (e.finishedAt ? 'finished' : Number.isInteger(e.lastPage) ? 'started' : null) : null; };
  const when = (b) => { const e = rec[b.id] || {}; return Math.max(num(e.finishedAt), num(e.reachedEndAt)); };
  const rows = (shelf || []).filter((b) => b && typeof b.id === 'string').map((b, i) => ({ id: b.id, titleEn: b.titleEn, titleTranslit: b.titleTranslit, level: b.level, pages: b.pageCount, shelfIndex: i,
    readWithVowels: read(b), bridgeLevel: levelOf(state, bookTextId(b.id)), done: isDone(state, bookTextId(b.id)) }));
  const rank = (r) => (r.readWithVowels === 'finished' ? 0 : r.readWithVowels === 'started' ? 1 : 2);
  return rows.sort((a, b) => rank(a) - rank(b) || (rank(a) < 2 ? when(b) - when(a) : 0) || a.shelfIndex - b.shelfIndex);
}

/** Prayer lines for the ladder: one-line prayer-book and Torah-verse entries (the Fade-out lines) of at most `maxWords` words, those with a Fade-Out card first (most faded first). */
export function prayerLines(entries, cards, maxWords = 12) {
  const fadeOf = (id) => cards?.[`line:${id}`]?.fadeLevel;
  const ok = (e) => e && e.id && e.he && (e.category === 'siddur' || e.category === 'torah') && !/\n/.test(e.he) && (e.lines ?? 1) === 1 && e.he.split(/[\s־]+/).filter(Boolean).length <= maxWords;
  return (entries || []).filter(ok).map((e, i) => ({ id: e.id, title: e.title || e.id, he: e.he, english: e.english || '', i, fade: Number.isInteger(fadeOf(e.id)) ? fadeOf(e.id) : null }))
    .sort((a, b) => (b.fade ?? -1) - (a.fade ?? -1) || a.i - b.i);
}

// ---------- word recognition without vowel marks ----------
/** Words for the drill: the vowel-fade reading set without its look-alikes, and only spellings no other item in the set shares. */
export function drillWords(set) {
  const items = (set?.items || []).filter((i) => i && i.id && i.he && i.en && i.ambiguous === false);
  const count = new Map();
  for (const i of set?.items || []) { const u = stripPoints(i.he); count.set(u, (count.get(u) || 0) + 1); }
  return items.filter((i) => count.get(stripPoints(i.he)) === 1 && !hasName(i.he));
}

/** Seeded generator (mulberry32), so a test can fix the order. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = (a, r) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

/** Least-seen words first (ties shuffled), at most `size`. */
export function pickWords(words, state, { size = 8, seed = 1 } = {}) {
  const r = rng(seed);
  return words.map((w) => ({ w, k: (state.words[w.id]?.seen || 0) + r() * 0.5 })).sort((a, b) => a.k - b.k).slice(0, size).map((x) => x.w);
}

/** One question: the word without marks and four meanings (one right). */
export function wordQuestion(word, pool, seed = 1, n = 4) {
  const r = rng(seed);
  const seen = new Set([word.en]);
  const wrong = [];
  for (const p of shuffle(pool, r)) { if (seen.has(p.en)) continue; seen.add(p.en); wrong.push(p); if (wrong.length === n - 1) break; }
  return { id: word.id, shown: stripPoints(word.he), pointed: word.he, translit: word.translit || '', options: shuffle([word, ...wrong], r).map((o) => ({ id: o.id, label: o.en, correct: o.id === word.id })) };
}

/** First-try recognition: right on the first pick AND the vowelled form was not opened. Anything else is a seen, not a first try. */
export function recordWord(state, id, firstTry) {
  const w = state.words[id] || { seen: 0, firstTry: 0 };
  return { ...state, words: { ...state.words, [id]: { seen: w.seen + 1, firstTry: w.firstTry + (firstTry ? 1 : 0) } } };
}
export function wordSummary(state) {
  const all = Object.values(state.words);
  const seen = all.reduce((a, w) => a + w.seen, 0), first = all.reduce((a, w) => a + w.firstTry, 0);
  return { words: all.length, seen, firstTry: first, rate: seen ? Math.round((first / seen) * 100) : null };
}

// ---------- modern texts shelf ----------
/**
 * Short modern texts from existing data, shown the way Israel shows them:
 *  signs and menus: the Camera Translator's sign list (data/camera/sign-glossary.json), whose `he` is the spelling on the sign;
 *  messages: the Israel scenarios (data/israel/scenarios.json), the other speaker's line and the natural reply, marks taken off in code.
 * Lines holding the four-letter name are left out. Every item keeps its pointed form, one tap away.
 */
export function modernShelf({ signs, scenarios } = {}) {
  const out = [], seen = new Set();
  for (const e of signs?.entries || []) {
    if (!e || !e.he || !e.pointed || !e.en || seen.has(e.he) || hasName(e.pointed)) continue;
    seen.add(e.he);
    out.push({ id: `sign:${e.he}`, kind: 'sign', shown: e.he, pointed: e.pointed, translit: e.translit || '', en: e.en, spelling: 'as-written' });
  }
  for (const s of scenarios?.scenarios || []) {
    const lines = [s?.other ? { k: 'other', l: s.other } : null, ...(s?.options || []).map((o, i) => (o && o.role === 'natural' ? { k: `reply${i}`, l: o } : null))].filter(Boolean);
    for (const { k, l } of lines) {
      if (!l.he || !l.en || hasName(l.he)) continue;
      out.push({ id: `msg:${s.id}:${k}`, kind: 'message', shown: stripPoints(l.he), pointed: l.he, translit: l.translit || '', en: l.en, place: s.title || '', spelling: 'marks-removed' });
    }
  }
  return out;
}

/** Record a modern-text read: unaided = read with nothing revealed. */
export function recordModern(state, id, unaided) {
  const w = state.modern[id] || { seen: 0, firstTry: 0 };
  return { ...state, modern: { ...state.modern, [id]: { seen: w.seen + 1, firstTry: w.firstTry + (unaided ? 1 : 0) } } };
}
