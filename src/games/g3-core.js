// Grammar in Action games (g3-*): shared pure rules. No DOM here, so every rule is unit tested in Node.
// All Hebrew comes from data/games/g3/*.json, which is copied from the app's own data (word list, phrasebook, lessons,
// units, little books, the Torah text and the Tug-of-War bank) and checked against those sources by tests/games.g3.test.js.
// No Hebrew words are typed here; the hints name single letters only.
import { loadData, shuffle, options, bare, toBase } from './tg-core.js';

export { shuffle, options };
/** One file from data/games/g3 (cached; fetched through ctx.fetchFn in tests). */
export const loadG3 = (ctx, name) => loadData(ctx, `data/games/g3/${name}.json`);

// ---- words of a line ----
const PUNCT = /[?,.!:;׃]+$/;
/** Words of a line with their trailing punctuation split off: [{ w, p }]. */
export const wordsOf = (he) => String(he ?? '').trim().split(/\s+/).filter(Boolean).map((t) => ({ w: t.replace(PUNCT, ''), p: (PUNCT.exec(t) || [''])[0] }));
/** The line again from its words (punctuation back where it was). */
export const lineOf = (ws) => ws.map((x) => x.w + x.p).join(' ');
/** First English sense, short: "to do (to perform …)" -> "to do". */
export const gloss = (en) => String(en ?? '').split(/[;(]/)[0].split(',')[0].trim();

// ---- verbs: tense and pattern ----
export const TENSES = Object.freeze([
  { key: 'past', en: 'he did', hint: 'the dictionary form' },
  { key: 'present', en: 'is doing', hint: 'present' },
  { key: 'future', en: 'he will do', hint: 'starts with י' },
  { key: 'infinitive', en: 'to do', hint: 'starts with ל' },
]);
/** The form of a verb for a tense key (the headword is the past "he did" form). */
export const formOf = (v, key) => (key === 'past' ? v.he : v.forms[key]);
/** A conveyor deck: n verb forms, each { he, tense, verb }, from the given tense keys, no form twice. */
export function tenseDeck(verbs, n, keys, rnd = Math.random) {
  const out = [], seen = new Set();
  for (const v of shuffle(verbs, rnd)) {
    if (out.length >= n) break;
    const key = keys[Math.floor(rnd() * keys.length)], he = formOf(v, key);
    if (!he || seen.has(he) || TENSES.some((t) => t.key !== key && formOf(v, t.key) === he)) continue;
    seen.add(he); out.push({ he, tense: key, verb: v });
  }
  return out;
}
/** The usual textbook summaries of the five common patterns (needs a teacher's review; names as the Roots page uses them). */
export const BINYANIM = Object.freeze([
  { key: "pa'al", name: "Pa'al", gist: 'the basic pattern', sign: 'the plainest shape: three letters, no added letter in front of the dictionary form' },
  { key: "nif'al", name: "Nif'al", gist: 'often passive', sign: 'the dictionary form starts with נ' },
  { key: "pi'el", name: "Pi'el", gist: 'often doing it a lot or making it happen', sign: 'the present starts with מ and the future with י, both with a quick vowel' },
  { key: "hif'il", name: "Hif'il", gist: 'often making someone do it', sign: 'the dictionary form starts with ה, the present with מ, often with a י before the last letter' },
  { key: "hitpa'el", name: "Hitpa'el", gist: 'often doing it to yourself', sign: 'the dictionary form starts with הת, the present with מת (before ס, ש, צ or ז the ת moves in one letter)' },
]);
export const binyanOf = (key) => BINYANIM.find((b) => b.key === key) || null;
/** Clues in the order Binyan Clues reveals them: meaning, present, future, infinitive, dictionary form. */
export const clueOrder = (v) => [
  { kind: 'meaning', label: 'Meaning', text: gloss(v.en) },
  { kind: 'present', label: 'Present', he: v.forms.present },
  { kind: 'future', label: 'Future', he: v.forms.future },
  { kind: 'infinitive', label: 'To …', he: v.forms.infinitive },
  { kind: 'past', label: 'Dictionary form (he did)', he: v.he },
];
/** Points for a right pattern after `shown` clues: fewer clues, more points. */
export const cluePoints = (shown) => Math.max(4, 24 - shown * 4);

// ---- shared letters (the data lists them per verb; not yet confirmed as roots, so the games say "letters") ----
/** The three listed letters of a verb, base forms ("ע־שׂ־ה" -> ['ע','ש','ה']). */
export const familyLetters = (root) => String(root ?? '').split(/[־\-\s]/).map((x) => toBase(bare(x))).filter(Boolean);
/** Every way the letters appear in order inside the word (positions in bare letters). */
export function letterMatches(word, letters) {
  const w = [...bare(word)].map(toBase), out = [];
  const go = (i, j, acc) => {
    if (j === letters.length) { out.push(acc); return; }
    for (let k = i; k < w.length; k++) if (w[k] === letters[j]) go(k + 1, j + 1, [...acc, k]);
  };
  go(0, 0, []);
  return out;
}
/** Positions only when the letters fit the word in exactly one way (else null: the game skips the form). */
export const uniqueLetters = (word, letters) => { const m = letterMatches(word, letters); return m.length === 1 ? m[0] : null; };
/** Sieve items: verb forms whose three letters can be found in exactly one way. */
export function sieveItems(verbs, keys = ['past', 'present', 'future', 'infinitive']) {
  const out = [];
  for (const v of verbs) {
    const letters = familyLetters(v.root);
    if (letters.length !== 3) continue;
    for (const key of keys) {
      // a yod-first family loses its yod in the future, and the future's own yod would be taken for it
      if (key === 'future' && letters[0] === 'י') continue;
      const he = formOf(v, key), pos = he && uniqueLetters(he, letters);
      if (pos) out.push({ he, key, verb: v, letters, pos });
    }
  }
  return out;
}
/**
 * Pattern Press choices for a verb with listed letters: the verb, verbs with the same letters in another pattern,
 * verbs in the same pattern with other letters, then any other verb. All different dictionary forms.
 */
export function pressChoices(v, verbs, n = 4, rnd = Math.random) {
  const pool = verbs.filter((x) => x.id !== v.id && x.he !== v.he && x.root);
  const sameLetters = shuffle(pool.filter((x) => x.root === v.root), rnd);
  const samePattern = shuffle(pool.filter((x) => x.binyan === v.binyan && x.root !== v.root), rnd);
  const rest = shuffle(pool.filter((x) => x.root !== v.root && x.binyan !== v.binyan), rnd);
  const out = [v], seen = new Set([v.he]);
  for (const x of [...sameLetters.slice(0, 1), ...samePattern.slice(0, 2), ...sameLetters.slice(1), ...samePattern.slice(2), ...rest]) {
    if (out.length >= n) break;
    if (!seen.has(x.he)) { seen.add(x.he); out.push(x); }
  }
  return shuffle(out, rnd);
}

// ---- person endings ----
export const PERSON_KEYS = Object.freeze(['1sg', '2msg', '2fsg', '3msg', '3fsg', '1pl', '2mpl', '2fpl', '3mpl', '3fpl']);
/** Every ending form with its preposition and person: [{ he, prep, person }]. */
export const allEndings = (suffixes) => suffixes.preps.flatMap((p) => Object.entries(p.forms).map(([person, f]) => ({ he: f.he, prep: p.key, prepHe: p.he, prepEn: p.en, person })));
/** Persons that have a form for every listed preposition (a full grid row). */
export const sharedPersons = (preps) => PERSON_KEYS.filter((k) => preps.every((p) => p.forms[k]));

// ---- nouns, adjectives, numbers, one-two-many ----
/** A noun whose ending points the wrong way: masculine with a feminine-looking ending or an -ot plural, or feminine without one or with an -im plural. */
export function looksOdd(n) {
  const sg = bare(n.he), pl = bare(n.plural);
  return n.gender === 'm' ? /[הת]$/.test(sg) || /ות$/.test(pl) : !/[הת]$/.test(sg) || /ים$/.test(pl);
}
/** Adjective form for a noun: gender 'm'|'f', plural true|false. */
export const adjFor = (adj, gender, plural) => adj[(gender === 'f' ? 'f' : 'm') + (plural ? 'p' : 's')];
/** The counting form for n (1 to 10) with a noun of this gender. 3 to 10 swap endings: -a goes with masculine nouns. */
export const numberFor = (nums, n, gender) => { const r = nums.find((x) => x.n === n); return r ? r[gender === 'f' ? 'f' : 'm'] : null; };
/** Which form a count takes for a one-two-many set: 'one', 'two' or 'many'. Body pairs use the -ayim form for two and for many. */
export function formForCount(set, count) {
  if (set.kind === 'single' || set.kind === 'looks') return 'one';
  if (count === 1) return 'one';
  if (count === 2) return 'two';
  return set.kind === 'pair' ? 'two' : 'many';
}

// ---- lines: gaps, swaps and genders ----
/** A negation round: the line without its not-word, the gap index (0 = before the first word) and the word. */
export function negationGap(he, at) {
  const ws = wordsOf(he);
  return { word: ws[at].w, gap: at, rest: ws.filter((_, i) => i !== at) };
}
/** Swap two words (indexes a, b) of a list, returning a new list. */
export const swapped = (ws, a, b) => { const out = [...ws]; [out[a], out[b]] = [out[b], out[a]]; return out; };
/** A word-order puzzle: the line with `swaps` random swaps applied, never equal to the line itself. */
export function scramble(ws, swaps, rnd = Math.random) {
  if (ws.length < 2) return [...ws];
  for (let tries = 0; tries < 20; tries++) {
    let out = [...ws];
    for (let s = 0; s < swaps; s++) { const a = Math.floor(rnd() * out.length); let b = Math.floor(rnd() * (out.length - 1)); if (b >= a) b += 1; out = swapped(out, a, b); }
    if (out.some((x, i) => x !== ws[i])) return out;
  }
  return swapped(ws, 0, 1);
}
/** Word indexes where the man's and the woman's line differ (same word count). */
export function genderDiff(m, f) {
  const a = wordsOf(m), b = wordsOf(f);
  if (a.length !== b.length) return null;
  return a.map((x, i) => (x.w !== b[i].w ? i : -1)).filter((i) => i >= 0);
}
/** A broken line for Repair Shop: the line for `gender` with one changing word taken from the other gender's line. */
export function brokenLine(item, gender, rnd = Math.random) {
  const diff = genderDiff(item.m, item.f);
  if (!diff?.length) return null;
  const right = wordsOf(item[gender]), wrong = wordsOf(item[gender === 'm' ? 'f' : 'm']);
  const at = diff[Math.floor(rnd() * diff.length)];
  const words = right.map((x, i) => (i === at ? { ...wrong[i] } : { ...x }));
  return { words, at, fix: right[at].w, bad: wrong[at].w };
}
