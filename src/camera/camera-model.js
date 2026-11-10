// Camera translator: pure logic (no DOM, no network). Tested in tests/camera.model.test.js.
// The word-list translator here and the one in tools/camera-translate/camera_translate/hebrew.py follow the same rules and
// are held to the same cases (data/camera/glossary-cases.json).
import { stripMarks, isHebrew } from '../photo/hebrew.js';
import { orderLines } from '../photo/order-lines.js';
import { findName } from '../shell/names.js';

export const HELD_NOTE = 'Sacred text. It is left exactly as written.';
export const MAX_PHOTO_SIDE = 2000;

// ---------------------------------------------------------------- sacred-name guard

/** True when a Hebrew string contains the four-letter name (alone or with prefix letters). */
export function containsSacredName(he) {
  return findName(String(he ?? '')).some((n) => n.kind === 'exact' || n.kind === 'prefixed');
}

// ---------------------------------------------------------------- sign word list

const EDGE_PUNCT = /^[.,;:!?"'()[\]|\-־׳״+*=\\]+|[.,;:!?"'()[\]|\-־׳״+*=\\]+$/g;
const SPLIT_PUNCT = /[\s.,;:!?\-־׳״"'()[\]|/\\]+/;
const NUM_RE = /^[0-9]+(?:[.,:][0-9]+)*%?$|^[₪$€]$/;
const LATIN_RE = /^[A-Za-z][A-Za-z0-9'&.-]*$/;

/** Split a line into words: marks removed, punctuation dropped, numbers kept whole. */
export function tokens(text) {
  const out = [];
  for (let raw of stripMarks(String(text ?? '')).split(/\s+/)) {
    raw = raw.replace(EDGE_PUNCT, '');
    if (!raw) continue;
    if (NUM_RE.test(raw)) { out.push(raw); continue; }
    for (const p of raw.split(SPLIT_PUNCT)) if (p) out.push(p);
  }
  return out;
}

/** Edit distance between two strings (letters added, removed or changed). */
export function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)));
    prev = cur;
  }
  return prev[b.length];
}

/** Number of differing letters when a and b have the same length, else Infinity. */
function substitutions(a, b) {
  if (a.length !== b.length) return Infinity;
  let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}
/** Letter pairs the reader mixes up because they look alike in print. */
export const LOOK_ALIKE = Object.freeze(['בכ', 'דר', 'הח', 'חת', 'הת', 'וז', 'וי', 'ון', 'סם', 'סט', 'גנ']);
const ALIKE = new Set(LOOK_ALIKE.flatMap((p) => [p, p[1] + p[0]]));
/** True when a and b have the same length and differ in exactly two letters, both of them look-alike pairs. */
export function twoLookAlikes(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { if (!ALIKE.has(a[i] + b[i])) return false; d++; }
  return d === 2;
}
/** "2ו" -> "12": a price whose digit 1 or 0 was read as a look-alike Hebrew letter (the mixed token comes out reversed). Null if not that. */
export function repairNumber(tok, afterListedWord = false) {
  // "סו" after a menu item is "10": no digit survived, so this is accepted only in that position and only for two or three such letters
  if (afterListedWord && /^[וןס]{2,3}$/.test(tok) && tok.includes('ס') && /[ון]/.test(tok)) { const f = [...tok].reverse().join('').replace(/[ון]/g, '1').replace(/ס/g, '0'); return /^[1-9]/.test(f) ? f : null; }
  if ([...tok].length > 5 || !/[0-9]/.test(tok) || !/^[0-9וןס.,:]+$/.test(tok) || /^[0-9.,:]+$/.test(tok)) return null;
  const fixed = [...tok].reverse().join('').replace(/[ון]/g, '1').replace(/ס/g, '0');
  return NUM_RE.test(fixed) && !/^0[0-9]/.test(fixed) ? fixed : null;
}
/** True when b is a with exactly one letter added or removed. */
function oneLetterAddedOrRemoved(a, b) {
  if (Math.abs(a.length - b.length) !== 1) return false;
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  for (let i = 0; i < l.length; i++) if (l.slice(0, i) + l.slice(i + 1) === s) return true;
  return false;
}

/** English glosses in English order: a describing word that follows its noun in Hebrew ("price new") goes before it. */
function englishOrder(segs) {
  const en = segs.map((s) => s.en);
  for (let i = 0; i + 1 < segs.length; i++) if (segs[i].kind === 'word' && !segs[i].describes && segs[i + 1].describes) { [en[i], en[i + 1]] = [en[i + 1], en[i]]; i++; }
  return en;
}

const JUNK_INSIDE = /[\\|\]\[%+=*<>{}#@^~₪$€]/;
/** A piece of reader noise rather than a word: Hebrew letters mixed with digits or symbols, or a number that starts with zero. */
export function isJunkToken(raw) {
  const t = stripMarks(String(raw ?? '')).replace(EDGE_PUNCT, '');
  if (!t) return true;
  if (NUM_RE.test(t)) return /^0[0-9]/.test(t) || !/^[0-9]+(?:[.,:][0-9]+)*%?[.,!?]?$|^[₪$€]$/.test(stripMarks(String(raw)).trim());   // ":2" or "(7" is noise, "12" and "18.50" are prices
  if (repairNumber(t)) return false;
  if (/[0-9]/.test(t)) return true;
  return isHebrew(t) && JUNK_INSIDE.test(t);
}

/** True when the reader returned noise on this line besides its words (part of the sign may be hidden or unreadable). */
export function lineHadNoise(text) {
  const part = String(text ?? '').split('/').find((x) => isHebrew(x)) ?? '';
  // a stray mark standing on its own (a dash, a bar) is noise too; a word with punctuation attached is not
  return part.split(/\s+/).filter(Boolean).some((raw) => { const t = stripMarks(raw).replace(EDGE_PUNCT, ''); return !LATIN_RE.test(t) && isJunkToken(raw); });
}

/**
 * Hebrew part of a line, as tokens. On a bilingual sign the reader returns both languages on one line; the English is
 * already English, so Latin words (and a number that follows one) are dropped, and so is reader noise (isJunkToken).
 * A line that repeats itself is halved. Returns [] when the line has no Hebrew word at all.
 */
export function hebrewTokens(text) {
  const all = tokens(String(text ?? '').split(/\s+/).filter((raw) => LATIN_RE.test(raw.replace(EDGE_PUNCT, '')) || !isJunkToken(raw)).join(' '));
  if (!all.some((t) => isHebrew(t))) return [];
  const out = []; let inLatin = false;
  for (const t of all) {
    if (LATIN_RE.test(t)) { inLatin = true; continue; }
    if (NUM_RE.test(t)) { if (!inLatin) out.push(t); continue; }
    inLatin = false; out.push(t);
  }
  const half = out.length / 2;
  if (out.length >= 2 && out.length % 2 === 0 && out.slice(0, half).join(' ') === out.slice(half).join(' ')) return out.slice(0, half);
  return out;
}

/**
 * @param {{entries:Array<{he:string,en:string,pointed?:string,translit?:string}>, patterns?:Array<{head:string,en:string}>, variants?:Array<{he:string,of:string,exact?:boolean}>}} data
 * @param {{phrasebook?:Array<{he:string,en:string,translit?:string}>}} [extra] the app's own phrasebook: whole-line matches only;
 *   its words also count as real words, which are never treated as a misreading of a listed word
 * @returns {{translate:(text:string)=>{en:string|null,status:'full'|'near'|'none',translit:string|null,pointed:string|null,from?:string}}}
 *
 * Near matches (always marked 'near', never 'full'), for a word that is not listed:
 *   1. a listed other form of a listed word (data.variants, for example a plural);
 *   2. listed words with one letter different (readers confuse look-alike letters far more often than they add or drop one);
 *   3. failing that, listed words with one letter added or removed;
 *   4. failing that (four letters or more), listed words with two letters different where BOTH are look-alike pairs.
 * A candidate is accepted only if it is the only one at its step AND it makes sense where it stands: the word is alone on
 * the line, or it forms a listed phrase with the word beside it, or it is a street/square name pattern, or a describing
 * word beside a listed word. Several candidates: exactly one must form a listed phrase. A word of two or three letters, and
 * a real Hebrew word (realNeighbours), are corrected only on the evidence of a listed phrase. A line with "/" is read as
 * two languages: the first part that translates is used.
 */
export function createGlossary(data, { phrasebook = [] } = {}) {
  const entries = new Map();
  for (const e of data?.entries || []) entries.set(tokens(e.he).join(' '), e);
  const maxLen = Math.max(1, ...[...entries.keys()].map((k) => k.split(' ').length));
  const patterns = new Map((data?.patterns || []).map((p) => [p.head, p.en]));
  const vocab = [...new Set([...entries.keys()].flatMap((k) => k.split(' ')))].sort();
  const vocabSet = new Set(vocab);
  const variants = new Map((data?.variants || []).map((v) => [v.he, v]));
  const phrases = new Map();
  // Real words that sit one letter from a listed word (built by tools/camera-translate/build_real_neighbours.py from the app
  // dictionary and phrasebook), plus the phrasebook's own words. A real word is "corrected" into a listed one only when the
  // result forms a listed phrase with the word beside it.
  const realWords = new Set(data?.realNeighbours || []);
  for (const e of phrasebook || []) {
    const ts = tokens(e.he); const key = ts.join(' '); const en = String(e.en ?? '').split(' / ')[0].trim();
    for (const t of ts) realWords.add(t);
    if (key && en && !entries.has(key) && !phrases.has(key) && !containsSacredName(e.he)) phrases.set(key, { he: e.he, en: en[0].toUpperCase() + en.slice(1), translit: e.translit || null });
  }
  const describes = (w) => !!entries.get(w)?.describes;
  const steps = (tok) => {
    const n = [...tok].length; const pool = vocab.filter((v) => v.length >= 2);
    const out = [pool.filter((v) => substitutions(tok, v) === 1), pool.filter((v) => oneLetterAddedOrRemoved(tok, v))];
    if (n >= 4) out.push(pool.filter((v) => twoLookAlikes(tok, v)));
    return out;
  };
  /** Candidates for every token: {exact} or {hits:[...first non-empty step], short, real}. */
  const candidatesFor = (raw) => raw.map((t, i) => {
    if (vocabSet.has(t) || NUM_RE.test(t)) return { exact: t };
    const fixedNumber = repairNumber(t, i > 0 && vocabSet.has(raw[i - 1])); if (fixedNumber) return { exact: fixedNumber, near: true };
    if (t.length > 3 && t[0] === 'ה' && vocabSet.has(t.slice(1))) return { exact: t.slice(1) };   // "the" joined to a listed word
    const v = variants.get(t); if (v && vocabSet.has(v.of)) return { exact: v.of, near: !v.exact };
    const n = [...t].length;
    if (n < 2) return { hits: [] };
    return { hits: steps(t).find((h) => h.length) || [], short: n < 4, real: realWords.has(t) };
  });
  const options = (c) => (c ? (c.exact ? [c.exact] : c.hits) : []);
  const phraseFit = (h, prevs, nexts) => prevs.some((p) => entries.has(`${p} ${h}`)) || nexts.some((x) => entries.has(`${h} ${x}`));
  const looseFit = (h, prevs, nexts) => (patterns.has(h) && nexts.some((x) => vocabSet.has(x))) || prevs.some((p) => patterns.has(p))
    || (describes(h) && prevs.some((p) => vocabSet.has(p) && !describes(p))) || nexts.some((x) => describes(x) && !describes(h));
  /** Resolve every token to a listed word where the rules allow. Returns {toks, usedNear}. */
  const resolve = (raw) => {
    const cands = candidatesFor(raw); let usedNear = false;
    const words = raw.filter((t) => !NUM_RE.test(t) && !repairNumber(t)).length;
    const toks = raw.map((t, i) => {
      const c = cands[i];
      if (c.exact) { if (c.near) usedNear = true; return c.exact; }
      if (!c.hits.length) return t;
      const prevs = options(cands[i - 1]); const nexts = options(cands[i + 1]);
      const inPhrase = c.hits.filter((h) => phraseFit(h, prevs, nexts));
      let pick = null;
      if (inPhrase.length === 1) pick = inPhrase[0];
      else if (!inPhrase.length && !c.short && !c.real && c.hits.length === 1 && (words === 1 || looseFit(c.hits[0], prevs, nexts))) pick = c.hits[0];
      if (pick) { usedNear = true; return pick; }
      return t;
    });
    return { toks, usedNear };
  };
  const none = { en: null, status: 'none', translit: null, pointed: null };
  // Whole listed phrases (and street, boulevard and square names) with the spaces taken out, for lines where part of a
  // word is hidden or the reader split a word in two.
  const targets = [];
  for (const [key, e] of entries) if (key.replace(/ /g, '').length >= 5) targets.push({ joined: key.replace(/ /g, ''), en: e.en, translit: e.translit || null, pointed: e.pointed || e.he });
  for (const [head, pattern] of patterns) {
    const h = entries.get(head); if (!h) continue;
    for (const [key, e] of entries) if (e.name) targets.push({ joined: (head + key).replace(/ /g, ''), en: pattern.replace('{x}', e.en), translit: [h.translit, e.translit].filter(Boolean).join(' ') || null, pointed: `${h.pointed || h.he} ${e.pointed || e.he}` });
  }
  /**
   * Closest whole phrase for a line that could not be translated word by word. Accepted only when it is clearly the closest:
   * the line is in two or more pieces, at most a quarter of the phrase's letters differ, and no other listed phrase that is
   * also that close is within one more letter.
   */
  function closestPhrase(raw) {
    const words = raw.filter((t) => !NUM_RE.test(t)); const letters = words.join(''); const numbers = raw.filter((t) => NUM_RE.test(t) && [...t].length > 1);
    // One whole word on its own goes through the word rules only; a real word is never part of a guess.
    if (words.length < 2 || [...letters].length < 4 || words.some((w) => [...w].length >= 3 && !vocabSet.has(w) && realWords.has(w))) return null;
    let best = null; let bestD = Infinity; let second = Infinity;
    for (const t of targets) {
      const limit = Math.max(1, Math.floor(t.joined.length / 4));
      if (Math.abs(t.joined.length - letters.length) > limit) continue;
      const d = editDistance(letters, t.joined);
      if (d > limit) continue;
      if (d < bestD) { second = bestD; bestD = d; best = t; } else if (d < second && t.en !== best.en) second = d;
    }
    if (!best || bestD === 0 || second - bestD < 2) return null;
    return { en: [best.en, ...numbers].join(' '), status: 'near', translit: best.translit, pointed: best.pointed, from: 'closest-phrase' };
  }
  function translateTokens(raw) {
    if (!raw.length) return none;
    const whole = phrases.get(raw.join(' '));
    const asPhrase = whole ? { en: whole.en, status: 'full', translit: whole.translit, pointed: whole.he, from: 'phrasebook' } : null;
    const { toks, usedNear } = resolve(raw);
    const segs = [];
    for (let i = 0; i < toks.length;) {
      if (NUM_RE.test(toks[i])) { segs.push({ he: toks[i], en: toks[i], pointed: null, translit: toks[i], kind: 'literal' }); i++; continue; }
      let hit = null; let n = Math.min(maxLen, toks.length - i);
      for (; n > 0; n--) { hit = entries.get(toks.slice(i, i + n).join(' ')); if (hit) break; }
      if (!hit) return asPhrase || closestPhrase(raw) || none;
      segs.push({ he: hit.he, en: hit.en, pointed: hit.pointed || null, translit: hit.translit || null, kind: 'word', describes: !!hit.describes });
      i += n;
    }
    if (!segs.some((x) => x.kind === 'word')) return none;
    if (usedNear && asPhrase) return asPhrase;   // an exact phrasebook line beats a guess
    const words = segs.filter((s) => s.kind === 'word');
    const head = segs[0].he;
    const en = patterns.has(head) && words.length >= 2
      ? patterns.get(head).replace('{x}', segs.slice(1).map((s) => s.en).join(' '))
      : englishOrder(segs).join(' ');
    return { en, status: usedNear ? 'near' : 'full',
      translit: segs.filter((s) => s.translit).map((s) => s.translit).join(' '),
      pointed: segs.map((s) => s.pointed || s.he).join(' ') };
  }
  function translate(text) {
    const parts = String(text ?? '').split('/');
    if (parts.length > 1) {      // two languages on one line: use the first part that translates
      for (const part of parts) { const r = translateTokens(hebrewTokens(part)); if (r.en) return r; }
    }
    return translateTokens(hebrewTokens(text));
  }
  /** One listed word (single-word entries only), or null. */
  const entry = (tok) => { const e = entries.get(tok); return e ? { he: e.he, en: e.en, pointed: e.pointed || null, translit: e.translit || null, describes: !!e.describes } : null; };
  /** Longest listed phrase starting at toks[i]: {n, entry} or null. */
  const longest = (toks, i) => {
    for (let n = Math.min(maxLen, toks.length - i); n > 0; n--) { const e = entry(toks.slice(i, i + n).join(' ')); if (e) return { n, entry: e }; }
    return null;
  };
  return { translate, entry, longest };
}

// ---------------------------------------------------------------- word by word (the tap panel's deeper layer)

/** Letters that attach to the front of a Hebrew word, with the plain meaning shown to a learner. */
export const PREFIX_MEANING = Object.freeze({ 'ה': 'the', 'ו': 'and', 'ב': 'in', 'ל': 'to', 'מ': 'from' });

/**
 * The app's own dictionary (data/vocab/index.json: {fields, rows}) as a lookup by unpointed spelling.
 * A spelling can be several words, so up to three are returned: names of things before verbs, then by how common the word is.
 */
export function createDictionary(index) {
  const f = index?.fields || []; const at = (name) => f.indexOf(name);
  const iHe = at('he'); const iKey = at('heUnpointed'); const iEn = at('en'); const iTr = at('translit'); const iRank = at('frequencyRank'); const iPos = at('pos');
  const by = new Map();
  if (iHe >= 0 && iKey >= 0 && iEn >= 0) {
    for (const r of index.rows || []) {
      const key = String(r[iKey] ?? '').trim(); if (!key || key.includes(' ')) continue;
      const list = by.get(key) || []; list.push({ he: r[iHe], en: String(r[iEn] ?? '').slice(0, 80), translit: iTr >= 0 ? r[iTr] || null : null, rank: Number.isFinite(r[iRank]) ? r[iRank] : Infinity, verb: iPos >= 0 && r[iPos] === 'verb', pos: iPos >= 0 ? r[iPos] : null });
      by.set(key, list);
    }
    // Signs and menus name things: nouns and describing words come before verbs, then the more frequent word first.
    for (const list of by.values()) list.sort((a, b) => (a.verb - b.verb) || (a.rank - b.rank));
  }
  const senses = (key) => (by.get(key) || []).slice(0, 3).map(({ he, en, translit, pos }) => ({ he, en, translit, pos }));
  return { size: by.size, senses };
}

/**
 * Break one line into words for the learner. Each word is looked up in the sign list, then in the app dictionary as written,
 * then with one attached prefix letter removed, then as a possible joined form or plural of a dictionary word (always labelled
 * as a possibility). A word that matches none of these is reported as unknown.
 * @returns {Array<{word:string, kind:'number'|'sign-list'|'dictionary'|'prefix'|'joined'|'plural'|'unknown', senses:Array<{he:string,en:string,translit:string|null}>, prefix?:{letter:string,meaning:string}}>}
 */
export function wordBreakdown(he, glossary, dictionary) {
  if (containsSacredName(he)) return [];
  const toks = tokens(he); const out = [];
  for (let i = 0; i < toks.length;) {
    const word = toks[i];
    if (NUM_RE.test(word) || LATIN_RE.test(word)) { out.push({ word, kind: 'number', senses: [] }); i++; continue; }
    const listed = glossary?.longest?.(toks, i);          // a listed phrase ("kosher restaurant") stays together
    if (listed) { out.push({ word: toks.slice(i, i + listed.n).join(' '), kind: 'sign-list', senses: [{ he: listed.entry.pointed || listed.entry.he, en: listed.entry.en, translit: listed.entry.translit, pos: listed.entry.describes ? 'adj' : 'noun' }] }); i += listed.n; continue; }
    i++;
    const exact = dictionary?.senses(word) || [];
    if (exact.length) { out.push({ word, kind: 'dictionary', senses: exact }); continue; }
    const letter = word[0]; const rest = word.slice(1);
    if (PREFIX_MEANING[letter] && [...rest].length >= 2) {
      const inner = glossary?.entry?.(rest);
      const found = inner ? [{ he: inner.pointed || inner.he, en: inner.en, translit: inner.translit }] : (dictionary?.senses(rest) || []);
      if (found.length) { out.push({ word, kind: 'prefix', prefix: { letter, meaning: PREFIX_MEANING[letter] }, senses: found }); continue; }
    }
    // Two very common sign shapes, offered as possibilities only: a joined (construct) form ending in tav, and a plural.
    const base = (stem) => { const e = glossary?.entry?.(stem); return e ? [{ he: e.pointed || e.he, en: e.en, translit: e.translit }] : (dictionary?.senses(stem) || []); };
    const n = [...word].length;
    if (n >= 4 && word.endsWith('ת') && !word.endsWith('ות')) { const f = base(`${word.slice(0, -1)}ה`); if (f.length) { out.push({ word, kind: 'joined', senses: f }); continue; } }
    if (n >= 4 && word.endsWith('ים')) { const f = base(word.slice(0, -2)); if (f.length) { out.push({ word, kind: 'plural', senses: f }); continue; } }
    if (n >= 4 && word.endsWith('ות')) { const f = [...base(`${word.slice(0, -2)}ה`), ...base(word.slice(0, -2))].slice(0, 3); if (f.length) { out.push({ word, kind: 'plural', senses: f }); continue; } }
    out.push({ word, kind: 'unknown', senses: [] });
  }
  return out;
}

// ---------------------------------------------------------------- regions

/**
 * OCR word boxes -> line regions in reading order, translated with the word list. Lines without Hebrew are dropped.
 * @param {Array<{text:string,x:number,y:number,w:number,h:number,conf?:number}>} boxes
 */
export function regionsFromBoxes(boxes, glossary) {
  const out = [];
  for (const line of orderLines(boxes)) {
    if (!isHebrew(line.text)) continue;
    // On a bilingual line ("Hebrew / English") only the Hebrew words are replaced: the box is drawn around them alone.
    const slash = line.words.findIndex((w) => /\//.test(w.text));
    const side = slash > 0 && line.words.slice(0, slash).some((w) => isHebrew(w.text)) ? line.words.slice(0, slash) : line.words;
    const kept = side.filter((w) => isHebrew(w.text) || /[0-9]/.test(w.text)).filter((w) => !isJunkToken(w.text));
    const words = kept.some((w) => isHebrew(w.text)) ? kept : side;
    const x0 = Math.min(...words.map((w) => w.x)); const y0 = Math.min(...words.map((w) => w.y));
    const box = { x: x0, y: y0, w: Math.max(...words.map((w) => w.x + w.w)) - x0, h: Math.max(...words.map((w) => w.y + w.h)) - y0 };
    const held = containsSacredName(line.text);
    const t = held ? { en: null, status: 'none', translit: null, pointed: null } : glossary.translate(line.text);
    if (!held && !t.en && tokens(line.text).join('').length < 2) continue; // a lone letter is almost always noise
    const he = side === line.words ? line.text : side.map((w) => w.text).join(' ');
    const confs = words.map((w) => w.conf).filter((c) => Number.isFinite(c));
    out.push(makeRegion({ id: `r${out.length + 1}`, box, he, held, en: t.en, partial: !held && lineHadNoise(line.text), conf: confs.length ? confs.reduce((a, c) => a + c, 0) / confs.length : null,
      translationSource: t.en ? (t.from === 'phrasebook' ? 'phrasebook' : t.status === 'near' ? 'word-list-near' : 'word-list') : null, translit: t.translit, pointed: t.pointed }));
  }
  return out;
}

function makeRegion(r) {
  if (r.held) return { id: r.id, box: r.box, conf: r.conf ?? null, held: true, he: null, en: null, translationSource: null, translit: null, pointed: null, drawn: false, note: HELD_NOTE };
  return { id: r.id, box: r.box, conf: r.conf ?? null, held: false, he: r.he, en: r.en || null, partial: !!r.partial, translationSource: r.en ? r.translationSource : null,
    translit: r.translit || null, pointed: r.pointed || null, drawn: !!r.drawn };
}

/** Box in picture pixels -> CSS percentages for a tap target laid over the picture. */
export function percentBox(box, width, height) {
  const pc = (v, total) => `${Math.round((v / total) * 10000) / 100}%`;
  return { left: pc(box.x, width), top: pc(box.y, height), width: pc(box.w, width), height: pc(box.h, height) };
}

/** Human label for where a translation came from. */
export function sourceLabel(src) {
  if (src === 'word-list') return 'From the built-in word list.';
  if (src === 'word-list-near') return 'Closest match in the built-in word list. A letter may have been misread, so check it.';
  if (src === 'phrasebook') return 'From the Aleph phrasebook.';
  if (src === 'word-for-word') return 'Word for word from the Aleph dictionary. The word order and the exact meaning can be off.';
  return '';
}

/** Dictionary gloss -> a short label fit to draw on a sign: first meaning only, no brackets, no leading "a" or "to", Title Case. */
export function shortGloss(en) {
  let g = String(en ?? '').replace(/\([^)]*\)/g, ' ').split(/[;,]/)[0].replace(/\s+/g, ' ').trim();
  g = g.replace(/^(?:an?|the|to)\s+/i, '');
  if (!g || g.length > 28 || !/^[A-Za-z][A-Za-z '\-]*$/.test(g)) return null;
  return g.split(' ').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Last resort for a line the word list and phrasebook cannot translate: every word looked up as written in the sign list or
 * the app dictionary, glosses joined in the order read. Returns null unless EVERY word is found exactly (no prefix, plural or
 * joined-form guesses are drawn on a photo). Always labelled word-for-word.
 */
export function wordForWord(he, glossary, dictionary) {
  const words = wordBreakdown(he, glossary, dictionary);
  if (!words.some((w) => w.kind !== 'number')) return null;
  const parts = [];
  for (const w of words) {
    if (w.kind === 'number') { parts.push({ en: w.word, he: w.word, translit: w.word }); continue; }
    if (w.kind !== 'sign-list' && w.kind !== 'dictionary') return null;
    if (w.kind === 'dictionary' && ([...w.word].length < 2 || !['noun', 'adj', 'adv', 'num', 'intj'].includes(w.senses[0].pos))) return null;   // no grammar words: their glosses are descriptions, not translations
    const en = w.kind === 'sign-list' ? w.senses[0].en : shortGloss(w.senses[0].en);
    if (!en) return null;
    parts.push({ en, he: w.senses[0].he, translit: w.senses[0].translit, pos: w.senses[0].pos || null });
  }
  // Hebrew puts a describing word after its noun ("price new"); English puts it before. Only the English order changes.
  const english = parts.map((x) => x.en);
  for (let i = 0; i + 1 < parts.length; i++) if (parts[i].pos === 'noun' && parts[i + 1].pos === 'adj') { [english[i], english[i + 1]] = [english[i + 1], english[i]]; i++; }
  return { en: english.join(' '), pointed: parts.map((x) => x.he).join(' '),
    translit: parts.every((x) => x.translit) ? parts.map((x) => x.translit).join(' ') : null };
}

// ---------------------------------------------------------------- reading preparation (pure pixel work)

/** Otsu threshold of a 256-bin histogram. */
export function otsuThreshold(hist, total) {
  let sum = 0; for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sB = 0; let wB = 0; let best = -1; let thr = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]; if (!wB) continue; const wF = total - wB; if (!wF) break;
    sB += t * hist[t]; const mB = sB / wB; const mF = (sum - sB) / wF; const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > best) { best = v; thr = t; }
  }
  return thr;
}

/**
 * Make a sign easy for the reader, in place: grey, then black letters on white whatever the sign's colours were
 * (white-on-blue street signs are flipped). `mode` 'binary' also thresholds; 'grey' keeps the grey levels.
 * @returns {{inverted:boolean, threshold:number}}
 */
export function readerImage(img, mode = 'binary') {
  const { data, width: w, height: h } = img; const n = w * h;
  const grey = new Uint8Array(n); const hist = new Uint32Array(256);
  for (let i = 0, p = 0; i < n; i++, p += 4) { const v = (0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]) | 0; grey[i] = v; hist[v]++; }
  const threshold = otsuThreshold(hist, n);
  let dark = 0; let count = 0;      // is the frame's edge mostly dark? then the letters are the light part
  const edge = (i) => { count++; if (grey[i] <= threshold) dark++; };
  for (let x = 0; x < w; x++) { edge(x); edge((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { edge(y * w); edge(y * w + w - 1); }
  const inverted = dark > count / 2;
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    let v = inverted ? 255 - grey[i] : grey[i];
    if (mode === 'binary') v = (inverted ? grey[i] > threshold : grey[i] <= threshold) ? 0 : 255;
    data[p] = data[p + 1] = data[p + 2] = v; data[p + 3] = 255;
  }
  return { inverted, threshold };
}

/**
 * A box found on the levelled photo -> the same box on the photo as taken (centre turned back, size kept).
 * `angle` is what deskew() in src/photo/preprocess.js reported (the levelled photo is the original turned by -angle).
 */
export function boxOnOriginal(box, width, height, angle) {
  if (!angle) return { ...box };
  const a = (-angle * Math.PI) / 180; const cos = Math.cos(a); const sin = Math.sin(a);
  const dx = box.x + box.w / 2 - width / 2; const dy = box.y + box.h / 2 - height / 2;
  const cx = dx * cos + dy * sin + width / 2; const cy = -dx * sin + dy * cos + height / 2;
  const x = Math.min(Math.max(0, cx - box.w / 2), Math.max(0, width - box.w)); const y = Math.min(Math.max(0, cy - box.h / 2), Math.max(0, height - box.h));
  return { x, y, w: box.w, h: box.h };
}

// ---------------------------------------------------------------- drawing layout (used by the on-device overlay)

export const MIN_FONT = 9; export const LINE_HEIGHT = 1.12;

/** Split words into n lines of roughly equal length. */
export function wrapWords(words, n) {
  if (n <= 1 || words.length <= 1) return [words.join(' ')];
  n = Math.min(n, words.length);
  const total = words.reduce((a, w) => a + w.length, 0) + words.length - 1;
  const lines = []; let cur = []; let used = 0;
  words.forEach((w, i) => {
    cur.push(w); used += w.length + 1;
    const leftWords = words.length - i - 1; const leftLines = n - lines.length - 1;
    if (leftLines > 0 && (used >= (total / n) * (lines.length + 1) || leftWords === leftLines)) { lines.push(cur.join(' ')); cur = []; }
  });
  if (cur.length) lines.push(cur.join(' '));
  return lines;
}

/**
 * Largest font size (and line split) at which text fits the box.
 * @param {(text:string, sizePx:number)=>number} measure width of `text` at `sizePx`
 * @returns {{size:number, lines:string[], fits:boolean}}
 */
export function fitText(measure, text, boxW, boxH, maxLines = 3) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const availW = Math.max(4, boxW * 0.96); const availH = Math.max(4, boxH * 1.3);
  let best = null;
  for (let n = 1; n <= Math.min(maxLines, Math.max(1, words.length)); n++) {
    const lines = wrapWords(words, n);
    let lo = MIN_FONT; let hi = Math.max(MIN_FONT, Math.floor(availH / (lines.length * LINE_HEIGHT))); let ok = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const w = Math.max(...lines.map((l) => measure(l, mid)));
      if (w <= availW && lines.length * mid * LINE_HEIGHT <= availH) { ok = mid; lo = mid + 1; } else hi = mid - 1;
    }
    if (ok !== null && (!best || ok > best.size)) best = { size: ok, lines, fits: true };
  }
  return best || { size: MIN_FONT, lines: wrapWords(words, Math.min(maxLines, Math.max(1, words.length))), fits: false };
}

/** Group lines that sit under one another (a menu, a two-line sign). */
export function groupBlocks(regions) {
  const groups = [];
  for (const r of [...regions].sort((a, b) => a.box.y - b.box.y)) {
    const { x, y, w, h } = r.box;
    const home = groups.find((g) => {
      const p = g[g.length - 1].box; const gap = y - (p.y + p.h); const overlap = Math.min(x + w, p.x + p.w) - Math.max(x, p.x);
      return gap >= -0.3 * h && gap <= 1.6 * Math.max(h, p.h) && overlap > 0.2 * Math.min(w, p.w) && h / Math.max(1, p.h) >= 0.5 && h / Math.max(1, p.h) <= 2;
    });
    if (home) home.push(r); else groups.push([r]);
  }
  return groups;
}

/**
 * Where the English goes. Hebrew lines set flush right in a group become flush-left English across the group's width;
 * everything else is centred on its own box (with a little sideways room, since English is often longer).
 * @returns {Map<string,{align:'center'|'left', box:{x:number,y:number,w:number,h:number}}>} keyed by region id
 */
export function chooseAlignment(regions, imageW) {
  const out = new Map();
  for (const rs of groupBlocks(regions)) {
    for (const r of rs) {
      const { x, y, w, h } = r.box;
      const grow = Math.max(0, Math.min(0.15 * w, x - 2, imageW - (x + w) - 2));
      out.set(r.id, { align: 'center', box: { x: x - grow, y, w: w + 2 * grow, h } });
    }
    if (rs.length < 2) continue;
    const lefts = rs.map((r) => r.box.x); const rights = rs.map((r) => r.box.x + r.box.w);
    const width = Math.max(...rights) - Math.min(...lefts);
    if (width > 0 && Math.max(...rights) - Math.min(...rights) <= 0.06 * width && Math.max(...lefts) - Math.min(...lefts) >= 0.12 * width) {
      for (const r of rs) out.set(r.id, { align: 'left', box: { x: Math.min(...lefts), y: r.box.y, w: width, h: r.box.h } });
    }
  }
  return out;
}

/** Median colour of a list of [r,g,b] samples. */
export function medianColour(samples) {
  if (!samples.length) return [255, 255, 255];
  const ch = (i) => { const a = samples.map((s) => s[i]).sort((x, y) => x - y); return a[a.length >> 1]; };
  return [ch(0), ch(1), ch(2)];
}

const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
export function contrastRatio(a, b) { const la = lum(a); const lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }

/**
 * Background and letter colours of one box, from RGBA pixels of the whole picture.
 * Background = median of a ring just outside the box; letters = median of the pixels inside that differ most from it.
 * @returns {{bg:number[], fg:number[]}} fg falls back to black or white when the letters do not stand out enough
 */
export function boxColours(data, W, H, box) {
  const x0 = Math.max(0, Math.floor(box.x)); const y0 = Math.max(0, Math.floor(box.y));
  const x1 = Math.min(W, Math.ceil(box.x + box.w)); const y1 = Math.min(H, Math.ceil(box.y + box.h));
  const ring = Math.max(3, Math.round(box.h * 0.25));
  const at = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
  const step = Math.max(1, Math.round(Math.max(box.w, box.h) / 80));
  const ringPx = [];
  for (let y = Math.max(0, y0 - ring); y < Math.min(H, y1 + ring); y += step) {
    for (let x = Math.max(0, x0 - ring); x < Math.min(W, x1 + ring); x += step) if (x < x0 || x >= x1 || y < y0 || y >= y1) ringPx.push(at(x, y));
  }
  const inside = [];
  for (let y = y0; y < y1; y += step) for (let x = x0; x < x1; x += step) inside.push(at(x, y));
  const bg = medianColour(ringPx.length >= 8 ? ringPx : inside);
  const far = inside.filter((p) => Math.hypot(p[0] - bg[0], p[1] - bg[1], p[2] - bg[2]) > 60);
  let fg = far.length >= 4 ? medianColour(far) : null;
  if (!fg || contrastRatio(fg, bg) < 3) fg = lum(bg) < 0.4 ? [255, 255, 255] : [17, 17, 17];
  return { bg, fg };
}
