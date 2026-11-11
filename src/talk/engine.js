// @ts-check
// Talk: the on-device English <-> Hebrew engine. Pure functions: no DOM, no network, no storage.
//
// It is a phrase memory with a few sentence patterns on top, not a general translator. Every answer says how it was made:
//   phrase   an exact line from the stored sentence pairs (data/talk/pack.json, the phrasebook, the dialogues)
//   pattern  a stored sentence frame with a noun, place, name or number slotted in
//   close    the nearest stored line, shown together with the line it matched
//   word     one dictionary word
//   words    Hebrew read word by word (not a sentence)
//   none     nothing good enough: the screen says so and offers the nearest stored lines
// Nothing here invents a sentence it has no frame for.

import { stripNikkud, holdsDivineName, detectDirection } from './talk.model.js';

const HE_PUNCT = /[.,!?;:"“”„״()\[\]…‏‎]|־|–|—/g;

const CONTRACTIONS = [
  [/\bi'm\b/g, 'i am'], [/\bi'd\b/g, 'i would'], [/\bi'll\b/g, 'i will'], [/\bi've\b/g, 'i have'],
  [/\bit's\b/g, 'it is'], [/\bthat's\b/g, 'that is'], [/\bwhat's\b/g, 'what is'], [/\bwhere's\b/g, 'where is'],
  [/\bthere's\b/g, 'there is'], [/\bhow's\b/g, 'how is'], [/\blet's\b/g, 'let us'], [/\byou're\b/g, 'you are'],
  [/\bwe're\b/g, 'we are'], [/\bthey're\b/g, 'they are'], [/\bcan't\b/g, 'cannot'], [/\bdon't\b/g, 'do not'],
  [/\bdoesn't\b/g, 'does not'], [/\bisn't\b/g, 'is not'], [/\baren't\b/g, 'are not'], [/\bwon't\b/g, 'will not'],
  [/\bo'clock\b/g, 'oclock'], [/\bwi-fi\b/g, 'wifi'], [/\bcheck-out\b/g, 'checkout'],
];

/** English compare key: lower case, contractions opened, punctuation dropped. */
export function normEn(s) {
  let t = String(s || '').toLowerCase().replace(/[’‘`]/g, "'");
  for (const [re, to] of CONTRACTIONS) t = t.replace(re, /** @type {string} */ (to));
  return t.replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const EN_FILLER = new Set(['please', 'the', 'a', 'an', 'some', 'any', 'kindly']);
const EN_SAME = new Map([['could', 'can'], ['may', 'can'], ['thanks', 'thank'], ['hi', 'hello'], ['hey', 'hello'], ['restroom', 'bathroom'], ['toilet', 'bathroom'], ['washroom', 'bathroom'], ['okay', 'ok']]);

/** English tokens for loose matching: fillers dropped, a few equal words folded, "would like" read as "want". */
export function looseEnTokens(s) {
  const t = normEn(s).replace(/\bwould like\b/g, 'want').replace(/\bthank you\b/g, 'thank');
  return t.split(' ').filter((w) => w && !EN_FILLER.has(w)).map((w) => EN_SAME.get(w) || w);
}
const looseEn = (s) => looseEnTokens(s).join(' ');

/** Hebrew compare key: vowel points and punctuation dropped. */
export function normHe(s) {
  return stripNikkud(String(s || '')).replace(HE_PUNCT, ' ').replace(/\s+/g, ' ').trim();
}
const HE_FILLER = new Set(['בבקשה', 'את']);
// Words a listener or a speech recogniser swaps without changing what is asked for (direction without the ending, "meet" for "see you",
// one-person for several-people commands, a spelling without the yod).
const HE_SAME = new Map([['שמאל', 'שמאלה'], ['ימין', 'ימינה'], ['ניפגש', 'נתראה'], ['תתקשר', 'תתקשרו'], ['תתקשרי', 'תתקשרו'], ['תקרא', 'תקראו'], ['תקראי', 'תקראו'],
  ['התפלה', 'התפילה'], ['תפלה', 'תפילה'], ['פה', 'כאן'], ['תפנה', 'פנה'], ['תפני', 'פני'], ['מפה', 'מכאן'], ['תזמין', 'תזמינו'], ['תזמיני', 'תזמינו']]);
export const looseHeTokens = (s) => normHe(s).split(' ').filter((w) => w && !HE_FILLER.has(w)).map((w) => HE_SAME.get(w) || w);
/** The same tokens with a leading article ה dropped: recognisers often lose it ("בית חולים" for "בית החולים"). */
export const bareHeTokens = (s) => looseHeTokens(s).map((w) => (w.length > 2 && w[0] === 'ה' ? w.slice(1) : w));

/** Character edit distance, capped: returns `cap + 1` as soon as the distance must exceed `cap`. */
export function editDistance(a, b, cap = 2) {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let low = i;
    for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); if (cur[j] < low) low = cur[j]; }
    if (low > cap) return cap + 1;
    prev = cur;
  }
  return prev[b.length];
}

const EN_TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const EN_UNITS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
/** "twenty five" -> "25", "a hundred" -> "100". Words for 0 to 19 are left alone (the number table knows them). */
export function foldNumbersEn(q) {
  const t = String(q).replace(/\b(?:a|one) hundred\b/g, '100').split(' ');
  const out = [];
  for (let i = 0; i < t.length; i++) {
    const tens = EN_TENS[t[i]];
    if (tens) { const u = EN_UNITS[t[i + 1]]; if (u) { out.push(String(tens + u)); i += 1; } else out.push(String(tens)); } else out.push(t[i]);
  }
  return out.join(' ');
}
const EN_PLURAL = { person: 'people' };
const pluralEn = (en) => EN_PLURAL[en] || (/(s|sh|ch|x)$/.test(en) ? en + 'es' : en + 's');

/** Dice overlap of two token lists (0..1). */
export function dice(a, b) {
  if (!a.length || !b.length) return 0;
  const A = new Set(a); const B = new Set(b);
  let both = 0;
  for (const x of A) if (B.has(x)) both += 1;
  return (2 * both) / (A.size + B.size);
}

const EN_SOFT = new Set(['very', 'so', 'really', 'here', 'now', 'today', 'thank', 'you', 'just', 'ok', 'well', 'there', 'then', 'much', 'too', 'oh', 'hello', 'sorry', 'excuse', 'me']);
const HE_SOFT = new Set(['מאוד', 'כאן', 'פה', 'עכשיו', 'היום', 'תודה', 'רק', 'אז', 'סליחה', 'רבה', 'שלום', 'כן', 'טוב']);
/** True when two token lists differ only by small words that do not change what is being asked for. */
export function softlyEqual(a, b, soft) {
  const A = new Set(a); const B = new Set(b);
  let shared = 0;
  for (const x of A) { if (B.has(x)) shared += 1; else if (!soft.has(x)) return false; }
  for (const x of B) if (!A.has(x) && !soft.has(x)) return false;
  return shared >= 2;
}

/** First plain meaning in a dictionary gloss ("month; new moon, ..." -> "month"). */
export function firstGloss(gloss) {
  const g = String(gloss || '').replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ');
  for (const part of g.split(/[;,]/)) { const t = part.replace(/\s+/g, ' ').trim(); if (t) return t; }
  return '';
}
function glossTerms(gloss) {
  const g = String(gloss || '').replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ').toLowerCase();
  return g.split(/[;,]/).map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => p && p.split(' ').length <= 3);
}

const MASS = new Set(['coffee', 'tea', 'water', 'milk', 'bread', 'wine', 'beer', 'juice', 'orange juice', 'meat', 'rice', 'cheese', 'sugar', 'salt', 'pepper', 'ice', 'ice cream', 'help', 'money', 'cash', 'hummus', 'falafel', 'internet', 'wifi', 'time', 'parking', 'fruit', 'chicken', 'fish', 'soup', 'salad', 'gluten', 'sesame', 'dairy', 'breakfast', 'lunch', 'dinner', 'kiddush', 'police', 'family', 'challah', 'sunscreen', 'pizza', 'medicine']);
/** A dictionary gloss may already carry its article ("a sofa"): the bare noun is what the frames work with. */
const noArticle = (en) => String(en).replace(/^(?:an?|the) (?=\S)/i, '');
const withArticle = (en) => (/^(?:an?|the|some|my|your|his|her|our|their) /i.test(en) || MASS.has(en) || /s$/.test(en) ? en : (/^[aeiou]/.test(en) ? 'an ' : 'a ') + en);
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const hasHebrewText = (s) => /[א-ת]/.test(String(s));
const PREFIX_GLOSS = { 'ו': 'and', 'ה': 'the', 'ב': 'in', 'ל': 'to' };
const SMALL_WORDS = new Map([['אפשר', 'may I'], ['עוד', 'more'], ['בלי', 'without'], ['עם', 'with'], ['יש', 'there is'], ['אין', 'there is no'], ['מה', 'what'], ['אתה', 'you'], ['את', 'you'], ['אתם', 'you'], ['אני', 'I'], ['אנחנו', 'we'], ['הוא', 'he'], ['היא', 'she'], ['זה', 'this'], ['זאת', 'this'], ['כאן', 'here'], ['פה', 'here'], ['שם', 'there'], ['לא', 'not'], ['כן', 'yes'], ['גם', 'also'], ['רק', 'only'], ['מאוד', 'very'], ['עכשיו', 'now'], ['היום', 'today'], ['מחר', 'tomorrow'], ['של', 'of'], ['שלי', 'my'], ['על', 'on'], ['אחרי', 'after'], ['לפני', 'before'], ['ליד', 'next to'], ['בבקשה', 'please'], ['תודה', 'thanks'], ['איפה', 'where'], ['מתי', 'when'], ['כמה', 'how much'], ['למה', 'why'], ['מי', 'who'], ['איך', 'how'], ['או', 'or'], ['אבל', 'but'], ['כי', 'because'], ['אם', 'if'], ['לי', 'to me'], ['לך', 'to you'], ['לנו', 'to us'], ['צריך', 'need'], ['צריכה', 'need'], ['רוצה', 'want'], ['יכול', 'can'], ['יכולה', 'can']]);

/**
 * @typedef {{id:string, src:string, en:string[], he:string, pointed?:string, f?:string, toF?:string, alt?:string[], other?:string}} Pair
 * @typedef {{ok:boolean, held?:boolean, direction:'en-he'|'he-en', source:string, translation:string, pointed?:string,
 *   method:'phrase'|'pattern'|'close'|'word'|'words'|'none'|'held', confidence:'high'|'medium'|'low'|'none',
 *   matched?:{id:string, en:string, he:string}, variants?:{label:string, text:string}[], note?:string,
 *   suggestions?:{id:string, en:string, he:string}[]}} TalkResult
 */

/** Sentence pairs from the stored phrasebook (data/corpus/phrasebook.json). */
export function pairsFromPhrasebook(phrasebook) {
  /** @type {Pair[]} */
  const out = [];
  for (const e of phrasebook?.entries || []) {
    if (!e || !e.he || !e.en) continue;
    const en = String(e.en).split(' / ').map((x) => x.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (!en.length) continue;
    /** @type {Pair} */
    const p = { id: `pb-${e.id}`, src: 'phrasebook', en, he: stripNikkud(e.he).replace(/[.]$/, ''), pointed: e.he.replace(/[.]$/, '') };
    const f = e.forms?.f?.he; const m = e.forms?.m?.he;
    if (f && m && stripNikkud(f) !== stripNikkud(m)) p.other = stripNikkud(f);
    out.push(p);
  }
  return out;
}

/** Sentence pairs from lines that carry `he` and `en` (dialogues, scenarios). */
export function pairsFromLines(lines, src) {
  /** @type {Pair[]} */
  const out = [];
  for (const l of lines || []) {
    if (!l || !l.he || !l.en || !l.id) continue;
    out.push({ id: `${src}-${l.id}`, src, en: [String(l.en).replace(/[.]$/, '')], he: stripNikkud(l.he).replace(/[.]$/, ''), pointed: l.he.replace(/[.]$/, '') });
  }
  return out;
}

/**
 * Build the engine.
 * @param {{pack:any, phrasebook?:any, extraPairs?:Pair[], dictRows?:any[][]}} data
 *   dictRows: rows of data/vocab/index.json ([id, he, heUnpointed, en, pos, level, track, topic, pack, frequencyRank, ...]); optional.
 */
export function createEngine(data) {
  const pack = data.pack || {};
  /** @type {Pair[]} */
  const pairs = [
    ...(pack.phrases || []).map((p) => ({ id: p.id, src: 'talk', en: p.en, he: p.he, f: p.f, toF: p.toF, alt: p.alt })),
    ...pairsFromPhrasebook(data.phrasebook),
    ...(data.extraPairs || []),
  ];

  /** @type {Map<string, Pair>} */ const enExact = new Map();
  /** @type {Map<string, Pair>} */ const enLoose = new Map();
  /** @type {Map<string, Pair>} */ const heExact = new Map();
  /** @type {Map<string, Pair>} */ const heLoose = new Map();
  /** @type {Map<string, Pair>} */ const heBare = new Map();
  /** @type {Set<string>} */ const heWords = new Set();
  /** @type {Set<string>} */ const enWords = new Set();
  /** @type {{pair:Pair, en:string[][], he:string[][]}[]} */ const index = [];
  for (const p of pairs) {
    const heAll = [p.he, p.f, p.toF, p.other, ...(p.alt || [])].filter(Boolean);
    for (const e of p.en) {
      const k = normEn(e); if (k && !enExact.has(k)) enExact.set(k, p);
      const l = looseEn(e); if (l && !enLoose.has(l)) enLoose.set(l, p);
    }
    for (const hx of heAll) {
      const k = normHe(hx); if (k && !heExact.has(k)) heExact.set(k, p);
      const l = looseHeTokens(hx).join(' '); if (l && !heLoose.has(l)) heLoose.set(l, p);
      const b = bareHeTokens(hx).join(' '); if (b && !heBare.has(b)) heBare.set(b, p);
      for (const w of normHe(hx).split(' ')) heWords.add(w);
    }
    for (const e of p.en) for (const w of normEn(e).split(' ')) enWords.add(w);
    index.push({ pair: p, en: p.en.map(looseEnTokens), he: heAll.map(looseHeTokens) });
  }

  // ---- nouns, places, names, numbers ---------------------------------------------------------------------------
  /** @type {Map<string, {en:string, he:string, def:string, kind:string, g?:string, pl?:string}>} */ const nounEn = new Map();
  /** @type {Map<string, {en:string, definite:boolean, kind:string}>} */ const nounHe = new Map();
  for (const n of pack.nouns || []) {
    const def = n.def || 'ה' + n.he;
    for (const e of n.en) if (!nounEn.has(e)) nounEn.set(e, { en: n.en[0], he: n.he, def, kind: 'noun', g: n.g || 'm', pl: n.pl || '' });
    if (!nounHe.has(n.he)) nounHe.set(n.he, { en: n.en[0], definite: n.he === def, kind: 'noun' });
    if (!nounHe.has(def)) nounHe.set(def, { en: n.en[0], definite: true, kind: 'noun' });
    if (n.pl && !nounHe.has(n.pl)) nounHe.set(n.pl, { en: pluralEn(n.en[0]), definite: false, kind: 'noun' });
  }
  for (const pl of pack.places || []) {
    const shown = pl.en[0].replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/^The /, 'the ');
    for (const e of pl.en) if (!nounEn.has(e)) nounEn.set(e, { en: shown, he: pl.he, def: pl.he, kind: 'place' });
    if (!nounHe.has(pl.he)) nounHe.set(pl.he, { en: shown, definite: false, kind: 'place' });
  }
  /** @type {Map<string,string>} */ const nameEn = new Map();
  /** @type {Map<string,string>} */ const nameHe = new Map();
  for (const n of pack.names || []) { nameEn.set(n.en.toLowerCase(), n.he); if (!nameHe.has(n.he)) nameHe.set(n.he, n.en); }
  const NUMS = pack.numbers?.list || [];
  /** @type {Map<string, any>} */ const numEn = new Map();
  /** @type {Map<string, any>} */ const numHe = new Map();
  const addNum = (n) => {
    for (const e of n.en) if (!numEn.has(e)) numEn.set(e, n);
    numEn.set(String(n.n), n);
    for (const hx of [n.count, n.m, n.mConstruct, n.fConstruct]) if (hx && !numHe.has(hx)) numHe.set(hx, n);
  };
  for (const n of NUMS) addNum(n);
  const unit = (k) => NUMS.find((x) => x.n === k);
  for (const t of pack.numbers?.tens || []) {
    addNum({ n: t.n, en: [t.en], count: t.he, m: t.he });
    if (t.n >= 100) continue;
    for (let k = 1; k <= 9; k++) { const u = unit(k); if (u) addNum({ n: t.n + k, en: [`${t.en}-${u.en[0]}`], count: `${t.he} ו${u.count}`, m: `${t.he} ו${u.m}` }); }
  }

  /** @type {Map<string,string>} */ const verbEn = new Map();
  /** @type {Map<string,string>} */ const verbHe = new Map();
  /** @type {Set<string>} */ const takesThing = new Set(); // to-forms that can be followed by a thing ("buy a ticket"); the rest stand alone ("sit", "leave")
  for (const v of pack.verbs || []) { if (!verbEn.has(v.en)) verbEn.set(v.en, v.he); if (!verbHe.has(v.he)) verbHe.set(v.he, v.en); if (v.thing) { takesThing.add(v.en); takesThing.add(v.he); } }
  const ADV = [['here', 'כאן'], ['now', 'עכשיו'], ['today', 'היום'], ['tomorrow', 'מחר'], ['tonight', 'הערב'], ['outside', 'בחוץ'], ['inside', 'בפנים'], ['later', 'אחר כך'], ['there', 'שם']];
  /** "Where" words go before "when" words in English ("eat outside today"); Hebrew keeps the order it was said in. */
  const WHERE_EN = new Set(['here', 'there', 'outside', 'inside']);
  /**
   * Words for "when" that are not things. היום is "today" far more often than "the day", and the frames read it as the noun:
   * "אני רוצה לאכול היום בחוץ" came out as "I want to eat the day outside" (found by the back test).
   */
  const WHEN_HE = new Set(['היום', 'מחר', 'עכשיו']);
  /** Up to two closing words for where and when ("... outside today"), taken off the end of a to-form phrase. */
  const takeAdverbs = (text, side) => {
    let t = text; const found = [];
    for (let n = 0; n < 2; n++) {
      const hit = ADV.find((pair) => t.endsWith(' ' + pair[side]));
      if (!hit) break;
      found.unshift(hit); t = t.slice(0, -hit[side].length - 1);
    }
    return { rest: t, found };
  };
  const CONTAINER = new Map([['bottle', 'בקבוק'], ['glass', 'כוס'], ['cup', 'כוס'], ['plate', 'צלחת'], ['bowl', 'קערה']]);
  const CONTAINER_HE = new Map([['בקבוק', 'bottle'], ['כוס', 'glass'], ['צלחת', 'plate'], ['קערה', 'bowl']]);
  const LANGS = new Map([['english', 'אנגלית'], ['hebrew', 'עברית']]);

  // ---- dictionary (optional, loaded by the screen only when a line needs it) -------------------------------------
  /** @type {Map<string, {he:string, pointed:string, rank:number, verb:boolean, noun:boolean}>} */ let dictEn = new Map();
  /** @type {Map<string, {en:string, pointed:string}>} */ let dictHe = new Map();
  let hasDict = false;
  /** Ordinary English words: the lower-case words of the dictionary's glosses. Used to tell a common word from a name. */
  /** @type {Set<string>} */ let glossWords = new Set();
  function setDictionary(rows) {
    dictEn = new Map(); dictHe = new Map(); hasDict = false; glossWords = new Set();
    for (const r of rows || []) {
      const pointed = r[1]; const he = r[2]; const gloss = r[3]; const pos = r[4]; const rank = Number(r[9]) || 99999;
      if (!he || !gloss || /^\(/.test(String(gloss).trim())) continue;
      // every lower-case word of a gloss is an ordinary English word (a gloss word written with a capital is a name and is left out)
      for (const w of String(gloss).split(/[^A-Za-z']+/)) if (w.length > 1 && w === w.toLowerCase()) glossWords.add(w);
      const first = firstGloss(gloss);
      if (first && !dictHe.has(he)) dictHe.set(he, { en: first, pointed });
      const verb = pos === 'verb';
      // English -> Hebrew uses a word's first meaning only: later glosses are side senses ("wall" also glossed "castle")
      let term = (glossTerms(gloss)[0] || '');
      if (verb) term = term.replace(/^to /, '');
      if (term && term === first.toLowerCase().replace(/^to /, '')) {
        const cur = dictEn.get(term);
        if (!cur || rank < cur.rank) dictEn.set(term, { he, pointed, rank, verb, noun: pos === 'noun' });
      }
    }
    hasDict = dictHe.size > 0;
  }
  if (data.dictRows) setDictionary(data.dictRows);

  // ---- noun phrases ---------------------------------------------------------------------------------------------
  /** English noun phrase -> Hebrew. `g` is the gender for agreement ('m', 'f', 'p' plural; '' when not known). @returns {{he:string, def:string, definite:boolean, from:'table'|'dictionary', kind:string, g?:string}|null} */
  function np(text, deep = false) {
    let t = String(text || '').trim();
    if (!t) return null;
    let definite = false; let mine = false;
    const m = /^(the|a|an|some|any|my) (.+)$/.exec(t);
    if (m) { definite = m[1] === 'the' || m[1] === 'my'; mine = m[1] === 'my'; t = m[2]; }
    let hit = nounEn.get(t) || (definite ? nounEn.get('the ' + t) : null);
    /** @type {'table'|'dictionary'} */ let from = 'table';
    if (!hit && !t.includes(' ')) {
      const d = dictEn.get(t) || (/s$/.test(t) ? dictEn.get(t.slice(0, -1)) : null);
      if (d && d.noun) { hit = { en: t, he: d.he, def: 'ה' + d.he, kind: 'noun', pointed: d.pointed }; from = 'dictionary'; }
    }
    if (!hit && !m) {
      // "three tickets", "two beers", "one night", "20 shekels": the noun must have a stored plural
      const c = /^(\S+) (.+)$/.exec(t); const N = c ? numEn.get(c[1]) : null;
      if (N && N.n >= 1) {
        const sing = nounEn.get(c[2].replace(/s$/, '')) || nounEn.get(c[2].replace(/es$/, '')) || (c[2] === 'people' ? nounEn.get('person') : null);
        const whole = nounEn.get(c[2]);
        const isPl = (x) => !!x && String(x.g || '').startsWith('p');
        const base = N.n === 1 ? (whole && !isPl(whole) ? whole : null) : (sing && sing.pl ? sing : (isPl(whole) ? { ...whole, pl: whole.he, g: whole.g === 'pf' ? 'f' : 'm' } : null));
        if (base && base.kind === 'noun') {
          const fem = base.g === 'f';
          const he = N.n === 1 ? `${base.he} ${fem ? 'אחת' : 'אחד'}` : N.n === 2 ? `${fem ? 'שתי' : 'שני'} ${base.pl}` : `${fem ? N.count : N.m} ${base.pl}`;
          return { he, def: he, definite: false, from: 'table', kind: 'count', g: fem ? 'pf' : 'p' };
        }
      }
    }
    if (!hit && /s$/.test(t)) {
      // a stored plural: "keys", "rooms"
      const sing = nounEn.get(t.replace(/s$/, '')) || nounEn.get(t.replace(/es$/, ''));
      if (sing && sing.pl) hit = { en: t, he: sing.pl, def: 'ה' + sing.pl, kind: 'noun', g: sing.g === 'f' ? 'pf' : 'p', pl: '' };
    }
    if (!hit && !deep) {
      const lead = m ? m[1] + ' ' : '';
      let c;
      // "a bottle of water", "a cup of coffee"
      if ((c = /^(bottle|glass|cup|plate|bowl) of (.+)$/.exec(t))) {
        const b = np(c[2], true);
        if (b && !b.definite) { const he = `${CONTAINER.get(c[1])} ${b.he}`; return { he, def: he, definite: false, from: b.from, kind: 'noun', g: c[1] === 'bottle' ? 'm' : 'f' }; }
      }
      // "a table for six", "a room for two"
      if ((c = /^(.+) for (\w+)(?: people)?$/.exec(t))) {
        const a = np(lead + c[1], true); const N = numEn.get(c[2]);
        if (a && N && N.n >= 1) { const tail = ` ל${N.n === 2 ? 'שניים' : N.m}`; return { ...a, he: a.he + tail, def: a.def + tail, kind: 'noun' }; }
      }
      // "a bus to Tel Aviv", "a ticket to Eilat", "a taxi to the airport"
      if ((c = /^(.+) to (.+)$/.exec(t))) {
        const a = np(lead + c[1], true); const b = np(c[2], true);
        if (a && b && b.from === 'table' && (b.kind === 'place' || b.definite)) { const tail = ' ' + withPrep(b, 'ל'); return { ...a, he: a.he + tail, def: a.def + tail, from: a.from, kind: 'noun' }; }
      }
      // "a table outside", "a menu in English"
      if ((c = /^(.+) (outside|inside)$/.exec(t))) { const a = np(lead + c[1], true); if (a) { const tail = c[2] === 'outside' ? ' בחוץ' : ' בפנים'; return { ...a, he: a.he + tail, def: a.def + tail }; } }
      if ((c = /^(.+) in (english|hebrew)$/.exec(t))) { const a = np(lead + c[1], true); if (a) { const tail = ` ב${LANGS.get(c[2])}`; return { ...a, he: a.he + tail, def: a.def + tail }; } }
    }
    if (!hit) {
      // "tea with milk", "coffee without sugar", "bread and cheese"
      const c = /^(.+?) (with|without|and) (.+)$/.exec(t);
      if (c && !deep) {
        const a = np((m ? m[1] + ' ' : '') + c[1], true); const b = np(c[3], true);
        if (a && b) {
          const link = c[2] === 'with' ? ' עם ' : c[2] === 'without' ? ' בלי ' : ' ו';
          return { he: a.he + link + b.he, def: a.def + link + b.he, definite: a.definite, from: a.from === 'dictionary' || b.from === 'dictionary' ? 'dictionary' : 'table', kind: 'noun', g: a.g };
        }
      }
      return null;
    }
    if (hit.kind === 'place') return { he: hit.he, def: hit.he, definite: true, from, kind: 'place', g: '' };
    const def = mine ? `${hit.def} שלי` : hit.def;
    return { he: definite ? def : hit.he, def, definite, from, kind: hit.kind, g: from === 'table' ? (hit.g || 'm') : '', ...(from === 'dictionary' && !definite && hit.pointed ? { pointed: hit.pointed } : {}) };
  }
  /** Attach a one-letter preposition (ל, ב, מ): the article ה folds into it. */
  const withPrep = (n, prep) => prep + (n.definite && n.kind !== 'place' && n.he.startsWith('ה') ? n.he.slice(1) : n.he);
  const obj = (n) => (n.definite ? 'את ' : '') + n.he; // definite direct object takes את

  /** Hebrew noun phrase -> English ("the hospital", "coffee", "two tickets"). */
  function enOf(heText) {
    const t = normHe(heText);
    if (!t || WHEN_HE.has(t)) return null;
    const hit = nounHe.get(t);
    if (hit) return { en: hit.kind === 'place' ? hit.en : (hit.definite ? 'the ' + hit.en : hit.en), bare: hit.en, definite: hit.definite, from: 'table', kind: hit.kind };
    const parts = t.split(' ');
    for (let k = Math.min(3, parts.length - 1); k >= 1; k--) {
      const N = numHe.get(parts.slice(0, k).join(' '));
      if (!N) continue;
      const rest = enOf(parts.slice(k).join(' '));
      if (rest && !rest.definite) {
        const one = N.n === 1;
        // "עשרים שקל" is said with the singular; English still wants the plural
        const noun = !one && rest.from === 'table' && !MASS.has(rest.bare) && !/s$/.test(rest.bare) && !/ /.test(rest.bare) && rest.bare !== 'people' ? pluralEn(rest.bare) : rest.bare;
        return { en: `${N.en[0]} ${noun}`, bare: noun, definite: false, from: rest.from, kind: 'count' };
      }
    }
    if (parts.length >= 2 && parts[0] === 'עוד') { const rest = enOf(parts.slice(1).join(' ')); if (rest) return { ...rest, en: `more ${rest.bare}`, bare: `more ${rest.bare}`, kind: 'count' }; }
    if (parts.length === 2 && CONTAINER_HE.has(parts[0])) { const rest = enOf(parts[1]); if (rest && !rest.definite) { const b = `${CONTAINER_HE.get(parts[0])} of ${rest.bare}`; return { en: b, bare: b, definite: false, from: rest.from, kind: 'noun' }; } }
    if (parts.length >= 2) {
      const last = parts[parts.length - 1]; const head = parts.slice(0, -1).join(' ');
      const tail = last === 'בחוץ' ? 'outside' : last === 'בפנים' ? 'inside' : last === 'באנגלית' ? 'in English' : last === 'בעברית' ? 'in Hebrew' : '';
      if (tail) { const a0 = enOf(head); if (a0) return { ...a0, en: `${a0.en} ${tail}`, bare: `${a0.bare} ${tail}` }; }
      if (last[0] === 'ל' && last.length > 2) {
        const dest = nounHe.get(last.slice(1)) || nounHe.get('ה' + last.slice(1)); const a0 = dest ? enOf(head) : null;
        if (a0 && dest) { const to = dest.kind === 'place' ? dest.en : 'the ' + dest.en; return { ...a0, en: `${a0.en} to ${to}`, bare: `${a0.bare} to ${to}` }; }
      }
    }
    if (parts.length === 2 && (parts[1] === 'אחד' || parts[1] === 'אחת')) {
      const rest = enOf(parts[0]);
      if (rest) return { en: `one ${rest.bare}`, bare: rest.bare, definite: false, from: rest.from, kind: 'count' };
    }
    if (parts.length === 1) {
      const d = dictHe.get(t);
      if (d) { const bare = noArticle(d.en); return { en: bare, bare, definite: false, from: 'dictionary', kind: 'noun' }; }
      if (t.startsWith('ה') && t.length > 2) { const d2 = dictHe.get(t.slice(1)); if (d2) { const bare = noArticle(d2.en); return { en: 'the ' + bare, bare, definite: true, from: 'dictionary', kind: 'noun' }; } }
    }
    return null;
  }

  /** English verb phrase after "to": a stored to-form, then an optional thing and an optional "here / now / outside". */
  function vp(text) {
    const cut = takeAdverbs(String(text || '').trim(), 0);
    const t = cut.rest; const tail = cut.found.map((pair) => ' ' + pair[1]).join('');
    const words = t.split(' ');
    for (let k = Math.min(4, words.length); k >= 1; k--) {
      const key = words.slice(0, k).join(' ');
      const v = verbEn.get(key);
      if (!v) continue;
      const rest = words.slice(k).join(' ');
      if (!rest) return { he: v + tail, from: /** @type {'table'|'dictionary'} */ ('table') };
      if (!takesThing.has(key)) return null;
      const n = np(rest);
      if (n) return { he: `${v} ${obj(n)}${tail}`, from: n.from };
    }
    return null;
  }
  /** Hebrew to-form phrase -> English ("לשלם עכשיו" -> "pay now"). */
  function vpHe(text) {
    const cut = takeAdverbs(normHe(text), 1);
    const t = cut.rest;
    const tail = [...cut.found].sort((x, y) => Number(WHERE_EN.has(y[0])) - Number(WHERE_EN.has(x[0]))).map((pair) => ' ' + pair[0]).join('');
    const words = t.split(' ');
    for (let k = Math.min(4, words.length); k >= 1; k--) {
      const key = words.slice(0, k).join(' ');
      const v = verbHe.get(key);
      if (!v) continue;
      const rest = words.slice(k).join(' ').replace(/^את /, '');
      if (!rest) return { en: v + tail, from: /** @type {'table'|'dictionary'} */ ('table') };
      if (!takesThing.has(key)) return null;
      const n = enOf(rest);
      if (n) return { en: `${v} ${n.definite || n.kind !== 'noun' ? n.en : withArticle(n.en)}${tail}`, from: n.from };
    }
    return null;
  }

  const numbersToHe = (text) => {
    const toks = String(text).split(' ').filter(Boolean).flatMap((w) => (/^\d+$/.test(w) && w.length > 1 && !numEn.has(w) ? w.split('') : [w]));
    if (!toks.length || !toks.every((w) => numEn.has(w))) return null;
    return toks.map((w) => numEn.get(w).count).join(' ');
  };
  const numbersToEn = (text) => {
    const toks = normHe(text).split(' ');
    const out = []; let i = 0;
    while (i < toks.length) {
      const two = toks[i + 1] ? numHe.get(`${toks[i]} ${toks[i + 1]}`) : null;
      if (two) { out.push(two.en[0]); i += 2; continue; }
      const three = toks[i + 2] ? numHe.get(`${toks[i]} ${toks[i + 1]} ${toks[i + 2]}`) : null;
      if (three) { out.push(three.en[0]); i += 3; continue; }
      const one = numHe.get(toks[i]);
      if (!one) return null;
      out.push(one.en[0]); i += 1;
    }
    return out.join(' ');
  };

  // ---- English -> Hebrew patterns ---------------------------------------------------------------------------------
  /** @returns {{he:string, f?:string, toF?:string, from:'table'|'dictionary', note?:string}|null} */
  function patternEnHe(q) {
    let m;
    const lvl = (...ns) => (ns.some((n) => n && n.from === 'dictionary') ? 'dictionary' : 'table');
    if ((m = /^my name is (.+)$/.exec(q)) || (m = /^i am called (.+)$/.exec(q))) {
      const he = nameEn.get(m[1]);
      if (he) return { he: `קוראים לי ${he}`, from: 'table' };
      if (m[1].split(' ').length <= 3) return { he: `קוראים לי ${m[1].replace(/\b[a-z]/g, (c) => c.toUpperCase())}`, from: 'table', note: 'The name is left in English letters.' };
    }
    if ((m = /^i am from (.+)$/.exec(q))) { const n = np(m[1]); if (n && n.kind === 'place') return { he: `אני מ${n.he}`, from: 'table' }; }
    if ((m = /^it is (\w+) oclock$/.exec(q))) { const n = numEn.get(m[1]); if (n && n.n >= 1) return { he: `השעה ${n.count}`, from: 'table' }; }
    if ((m = /^the number is (.+)$/.exec(q))) { const he = numbersToHe(m[1]); if (he) return { he: `המספר הוא ${he}`, from: 'table' }; }
    if ((m = /^see you tomorrow at (\w+)(?: oclock)?$/.exec(q))) { const n = numEn.get(m[1]); if (n && n.n >= 1) return { he: `נתראה מחר ב${n.count}`, from: 'table' }; }
    if ((m = /^see you at (\w+)(?: oclock)?$/.exec(q))) { const n = numEn.get(m[1]); if (n && n.n >= 1) return { he: `נתראה ב${n.count}`, from: 'table' }; }
    // agreement with a stored noun's gender (dictionary nouns have no stored gender, so these frames need a noun from the Talk list)
    const byG = (n, mas, fem, plu, pluF = plu) => (n.g === 'f' ? fem : n.g === 'pf' ? pluF : n.g === 'p' ? plu : mas);
    const listed = (text) => { const n = np(/^the /.test(text) ? text : 'the ' + text); return n && n.from === 'table' && n.kind === 'noun' && n.g ? n : null; };
    const forN = (w) => { const N = numEn.get(w); return N && N.n >= 1 ? (N.n === 2 ? 'שניים' : N.m) : null; };
    if ((m = /^we have a (?:reservation|booking) for (\w+)(?: people)?$/.exec(q))) { const x = forN(m[1]); if (x) return { he: `יש לנו הזמנה ל${x}`, from: 'table' }; }
    if ((m = /^(?:a )?table for (\w+)(?: people)?$/.exec(q))) { const x = forN(m[1]); if (x) return { he: `שולחן ל${x}`, from: 'table' }; }
    if ((m = /^(?:it|that|this) (?:costs|is) (.+ (?:shekels?|dollars?))$/.exec(q))) { const n = np(m[1]); if (n && n.kind === 'count') return { he: `זה עולה ${n.he}`, from: 'table' }; }
    if ((m = /^in (.+ (?:minutes?|hours?|days?|weeks?))$/.exec(q))) { const n = np(m[1]); if (n && n.kind === 'count') return { he: `בעוד ${n.he}`, from: 'table' }; }
    if ((m = /^for (.+)$/.exec(q))) { const n = np(m[1]); if (n && n.kind === 'count') return { he: `ל${n.he}`, from: 'table' }; }
    if ((m = /^does (?:this|it) (?:have|contain) (.+)$/.exec(q)) || (m = /^(?:is|are) there (.+) in (?:this|it)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `יש בזה ${n.he}?`, from: lvl(n) }; }
    if ((m = /^where can i (buy|find) (.+)$/.exec(q))) { const n = np(m[2]); if (n) return { he: `איפה אפשר ${{ buy: 'לקנות', find: 'למצוא', get: 'להשיג' }[m[1]]} ${obj(n)}?`, from: lvl(n) }; }
    if ((m = /^can i pay (?:with|by|in) (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `אפשר לשלם ${withPrep(n, 'ב')}?`, from: lvl(n) }; }
    if ((m = /^(?:when|what time) does (.+) (open|close)$/.exec(q))) {
      const n = listed(m[1]);
      if (n) return { he: `מתי ${n.he} ${m[2] === 'open' ? byG(n, 'נפתח', 'נפתחת', 'נפתחים', 'נפתחות') : byG(n, 'נסגר', 'נסגרת', 'נסגרים', 'נסגרות')}?`, from: 'table' };
    }
    if ((m = /^is (.+) (open|closed)(?: (today|now))?$/.exec(q)) || (m = /^(.+) is (open|closed)(?: (today|now))?$/.exec(q))) {
      const n = listed(m[1]);
      if (n) return { he: `${n.he} ${m[2] === 'open' ? byG(n, 'פתוח', 'פתוחה', 'פתוחים', 'פתוחות') : byG(n, 'סגור', 'סגורה', 'סגורים', 'סגורות')}${m[3] === 'today' ? ' היום' : m[3] === 'now' ? ' עכשיו' : ''}${/^is /.test(q) ? '?' : ''}`, from: 'table' };
    }
    if ((m = /^(.+) is late$/.exec(q))) { const n = listed(m[1]); if (n) return { he: `${n.he} ${byG(n, 'מאחר', 'מאחרת', 'מאחרים', 'מאחרות')}`, from: 'table' }; }
    if ((m = /^turn (left|right) (after|at) (.+)$/.exec(q))) {
      const n = np(m[3]);
      if (n) { const tail = `${m[1] === 'left' ? 'שמאלה' : 'ימינה'} ${m[2] === 'after' ? 'אחרי ' + n.he : withPrep(n, 'ב')}`; return { he: `פנה ${tail}`, toF: `פני ${tail}`, from: lvl(n) }; }
    }
    if ((m = /^i (want|would like|need) to (?:go|get) to (.+)$/.exec(q))) {
      const n = np(m[2]);
      if (n) return m[1] === 'need' ? { he: `אני צריך להגיע ${withPrep(n, 'ל')}`, f: `אני צריכה להגיע ${withPrep(n, 'ל')}`, from: lvl(n) } : { he: `אני רוצה להגיע ${withPrep(n, 'ל')}`, from: lvl(n) };
    }
    if ((m = /^i do not eat (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `אני לא אוכל ${n.he}`, f: `אני לא אוכלת ${n.he}`, from: lvl(n) }; }
    if ((m = /^i do not drink (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `אני לא שותה ${n.he}`, from: lvl(n) }; }
    // tickets (a masculine noun, so the number form is known)
    const tickets = (w) => { const n = numEn.get(w); if (!n || n.n < 1) return null; return n.n === 1 ? 'כרטיס אחד' : `${n.mConstruct || n.m} כרטיסים`; };
    if ((m = /^(?:i need|i want|i would like) (\w+) tickets?(?: to (.+))?$/.exec(q))) {
      const t = tickets(m[1]); const to = m[2] ? np(m[2]) : null;
      if (t && (!m[2] || to)) {
        const tail = to ? ' ' + withPrep(to, 'ל') : '';
        const want = /^i need/.test(q);
        return want ? { he: `אני צריך ${t}${tail}`, f: `אני צריכה ${t}${tail}`, from: 'table' } : { he: `אני רוצה ${t}${tail}`, from: 'table' };
      }
    }
    if ((m = /^(\w+) tickets?(?: to (.+))?$/.exec(q)) || (m = /^(a) ticket(?: to (.+))?$/.exec(q))) {
      const t = m[1] === 'a' ? 'כרטיס' : tickets(m[1]); const to = m[2] ? np(m[2]) : null;
      if (t && (!m[2] || to)) return { he: t + (to ? ' ' + withPrep(to, 'ל') : ''), from: 'table' };
    }
    if ((m = /^how many (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `כמה ${n.he}?`, from: lvl(n) }; }
    if ((m = /^i am allergic to (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `יש לי אלרגיה ${withPrep(n, 'ל')}`, from: lvl(n) }; }
    if ((m = /^where is (?:the )?(?:nearest|closest) (.+)$/.exec(q)) || (m = /^where is (an? .+) (?:near here|nearby|around here)$/.exec(q))) { const n = np(m[1].replace(/^an? /, '')); if (n) return { he: `איפה יש ${n.kind === 'place' ? n.he : np(m[1].replace(/^(?:an?|the) /, '')).he} באזור?`, from: lvl(n) }; }
    if ((m = /^i (?:have )?lost (.+)$/.exec(q))) { const n = np(m[1]); if (n && n.definite) return { he: `איבדתי את ${n.he}`, from: lvl(n) }; }
    if ((m = /^where (?:is|are) (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `איפה ${n.he}?`, from: lvl(n) }; }
    if ((m = /^how do i get to (.+)$/.exec(q)) || (m = /^how can i get to (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `איך מגיעים ${withPrep(n, 'ל')}?`, from: lvl(n) }; }
    if ((m = /^how much (?:is|are|does|do) (.+?)(?: cost)?$/.exec(q))) {
      const n = np(m[1]);
      if (n) { const verb = n.g ? byG(n, 'עולה', 'עולה', 'עולים', 'עולות') : (/ים$/.test(n.he) ? 'עולים' : /ות$/.test(n.he) ? 'עולות' : 'עולה'); return { he: `כמה ${verb} ${n.he}?`, from: lvl(n) }; }
    }
    if ((m = /^(?:can|could) you tell me where (.+) (?:is|are)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `איפה ${n.he}?`, from: lvl(n) }; }
    if ((m = /^(?:what time|when) is (.+)$/.exec(q))) { const n = listed(m[1]); if (n) return { he: `מתי ${n.he}?`, from: 'table' }; }
    if ((m = /^thank you for (?:your |the )?(.+)$/.exec(q))) { const n = listed(m[1]); if (n) return { he: `תודה על ${n.he}`, from: 'table' }; }
    if ((m = /^how long does it take to get to (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `כמה זמן לוקח להגיע ${withPrep(n, 'ל')}?`, from: lvl(n) }; }
    if ((m = /^(?:can|could|may) i (?:have|get) (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `אפשר ${obj(n)}?`, from: lvl(n) }; }
    if ((m = /^(?:i want|i would like|i will have) (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `אני רוצה ${obj(n)}`, from: lvl(n) }; }
    if ((m = /^i need (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `אני צריך ${obj(n)}`, f: `אני צריכה ${obj(n)}`, from: lvl(n) }; }
    if ((m = /^we (?:want|would like) (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `אנחנו רוצים ${obj(n)}`, from: lvl(n) }; }
    if ((m = /^we need (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `אנחנו צריכים ${obj(n)}`, from: lvl(n) }; }
    // to-forms: the same after "want", "need" and "may I", whoever speaks
    if ((m = /^i (?:want|would like) to (.+)$/.exec(q))) { const v = vp(m[1]); if (v) return { he: `אני רוצה ${v.he}`, from: v.from }; }
    if ((m = /^i (?:need|have) to (.+)$/.exec(q))) { const v = vp(m[1]); if (v) return { he: `אני צריך ${v.he}`, f: `אני צריכה ${v.he}`, from: v.from }; }
    if ((m = /^we (?:want|would like) to (.+)$/.exec(q))) { const v = vp(m[1]); if (v) return { he: `אנחנו רוצים ${v.he}`, from: v.from }; }
    if ((m = /^we (?:need|have) to (.+)$/.exec(q))) { const v = vp(m[1]); if (v) return { he: `אנחנו צריכים ${v.he}`, from: v.from }; }
    if ((m = /^where can (?:i|we) (.+)$/.exec(q))) { const v = vp(m[1]); if (v) return { he: `איפה אפשר ${v.he}?`, from: v.from }; }
    if ((m = /^(?:can|could|may) (?:i|we) (.+)$/.exec(q)) || (m = /^is it possible to (.+)$/.exec(q))) { const v = vp(m[1]); if (v) return { he: `אפשר ${v.he}?`, from: v.from }; }
    if ((m = /^i am looking for (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `אני מחפש ${obj(n)}`, f: `אני מחפשת ${obj(n)}`, from: lvl(n) }; }
    if ((m = /^i (?:like|love) (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `אני אוהב ${obj(n)}`, f: `אני אוהבת ${obj(n)}`, from: lvl(n) }; }
    if ((m = /^do you have (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `יש לכם ${n.he}?`, from: lvl(n) }; }
    if ((m = /^is there (.+?)(?: here| nearby| near here| around here)?$/.exec(q))) { const n = np(m[1]); if (n) return { he: `יש כאן ${n.he}?`, from: lvl(n) }; }
    if ((m = /^i do not have (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `אין לי ${n.he}`, from: lvl(n) }; }
    if ((m = /^i have (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `יש לי ${n.he}`, from: lvl(n) }; }
    if ((m = /^more (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `עוד ${n.he}`, from: lvl(n) }; }
    if ((m = /^to (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: withPrep(n, 'ל'), from: lvl(n) }; }
    if ((m = /^(.+?) (?:with no|no) (.+)$/.exec(q))) { const a = np(m[1]); const b = np(m[2]); if (a && b) return { he: `${a.he}, בלי ${b.he}`, from: lvl(a, b) }; }
    if ((m = /^(?:without|no) (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `בלי ${n.he}`, from: lvl(n) }; }
    if (/ (?:with|without|and) /.test(q)) { const n = np(q); if (n) return { he: n.he, from: lvl(n) }; }
    const nums = numbersToHe(q);
    if (nums) return { he: nums, from: 'table' };
    return null;
  }

  // ---- Hebrew -> English patterns -----------------------------------------------------------------------------------
  /** @returns {{en:string, from:'table'|'dictionary'}|null} */
  function patternHeEn(q) {
    let m;
    const a = (n) => (n.definite || n.kind !== 'noun' ? n.en : withArticle(n.en));
    if ((m = /^(.+) בבקשה$/.exec(q))) {
      const inner = heToEnCore(m[1], false);
      if (inner) return { en: `${inner.en.replace(/[.?!]$/, '')}, please${/\?$/.test(inner.en) ? '?' : ''}`, from: inner.from };
    }
    const the = (x) => enOf(x);
    const afterPrep = (x) => enOf('ה' + x) || enOf(x);
    if ((m = /^זה עולה (.+)$/.exec(q))) { const n = enOf(m[1]); if (n && /shekel|dollar/.test(n.bare)) return { en: `It costs ${n.en}`, from: 'table' }; }
    if ((m = /^יש לנו הזמנה ל(.+)$/.exec(q))) { const n = numbersToEn(m[1]); if (n) return { en: `We have a reservation for ${n}`, from: 'table' }; }
    if ((m = /^שולחן ל(.+)$/.exec(q))) { const n = numbersToEn(m[1]); if (n) return { en: `A table for ${n}`, from: 'table' }; }
    if ((m = /^בעוד (.+)$/.exec(q))) { const n = enOf(m[1]); if (n && n.kind === 'count') return { en: `In ${n.en}`, from: n.from }; }
    if ((m = /^יש בזה (.+)$/.exec(q))) { const n = enOf(m[1]); if (n) return { en: `Does it have ${n.bare}?`, from: n.from }; }
    if ((m = /^איפה אפשר (לקנות|למצוא|להשיג) (?:את )?(.+)$/.exec(q))) { const n = enOf(m[2]); if (n) return { en: `Where can I ${{ 'לקנות': 'buy', 'למצוא': 'find', 'להשיג': 'get' }[m[1]]} ${a(n)}?`, from: n.from }; }
    if ((m = /^אפשר לשלם ב(.+)$/.exec(q))) { const n = afterPrep(m[1]); if (n) return { en: `Can I pay with ${n.definite ? withArticle(n.bare) : a(n)}?`, from: n.from }; }
    if ((m = /^מתי (.+) (נפתח|נפתחת|נפתחים|נסגר|נסגרת|נסגרים)$/.exec(q))) { const n = the(m[1]); if (n) return { en: `When does ${n.en} ${/^נפ/.test(m[2]) ? 'open' : 'close'}?`, from: n.from }; }
    if ((m = /^(.+) (סגור|סגורה|סגורים|סגורות|פתוח|פתוחה|פתוחים|פתוחות)( היום| עכשיו)?$/.exec(q))) {
      const n = the(m[1]);
      if (n) return { en: `${cap(n.en)} ${/s$/.test(n.bare) && !n.definite ? 'are' : 'is'} ${/^ס/.test(m[2]) ? 'closed' : 'open'}${m[3] === ' היום' ? ' today' : m[3] === ' עכשיו' ? ' now' : ''}`, from: n.from };
    }
    if ((m = /^(.+) (מאחר|מאחרת|מאחרים)$/.exec(q))) { const n = the(m[1]); if (n) return { en: `${cap(n.en)} is late`, from: n.from }; }
    if ((m = /^(?:ת?פנה|ת?פני|ת?פנו) (ימינה|שמאלה|ימין|שמאל) (?:אחרי (.+)|ב(.+))$/.exec(q))) {
      const n = m[2] ? enOf(m[2]) : afterPrep(m[3]);
      if (n) return { en: `Turn ${/^ימ/.test(m[1]) ? 'right' : 'left'} ${m[2] ? 'after' : 'at'} ${n.definite || n.kind !== 'noun' ? n.en : withArticle(n.en)}`, from: n.from };
    }
    if ((m = /^אני רוצה להגיע ל(.+)$/.exec(q))) { const n = afterPrep(m[1]); if (n) return { en: `I want to go to ${n.en}`, from: n.from }; }
    if ((m = /^אני (?:צריך|צריכה) להגיע ל(.+)$/.exec(q))) { const n = afterPrep(m[1]); if (n) return { en: `I need to get to ${n.en}`, from: n.from }; }
    if ((m = /^אני לא (?:אוכל|אוכלת) (.+)$/.exec(q))) { const n = enOf(m[1]); if (n) return { en: `I don't eat ${n.bare}`, from: n.from }; }
    if ((m = /^אני לא שותה (.+)$/.exec(q))) { const n = enOf(m[1]); if (n) return { en: `I don't drink ${n.bare}`, from: n.from }; }
    if ((m = /^כמה זמן לוקח להגיע ל(.+)$/.exec(q))) { const n = afterPrep(m[1]); if (n) return { en: `How long does it take to get to ${n.en}?`, from: n.from }; }
    if ((m = /^תודה על (.+)$/.exec(q))) { const n = enOf(m[1]); if (n) return { en: `Thank you for ${n.en}`, from: n.from }; }
    if ((m = /^בלי (.+)$/.exec(q))) { const n = enOf(m[1]); if (n) return { en: `No ${n.bare}`, from: n.from }; }
    if ((m = /^אני רוצה (ל.+)$/.exec(q))) { const v = vpHe(m[1]); if (v) return { en: `I want to ${v.en}`, from: v.from }; }
    if ((m = /^אני (?:צריך|צריכה) (ל.+)$/.exec(q))) { const v = vpHe(m[1]); if (v) return { en: `I need to ${v.en}`, from: v.from }; }
    if ((m = /^אנחנו רוצים (.+)$/.exec(q))) { const v = vpHe(m[1]); if (v) return { en: `We want to ${v.en}`, from: v.from }; const n = enOf(m[1].replace(/^את /, '')); if (n) return { en: `We want ${a(n)}`, from: n.from }; }
    if ((m = /^אנחנו צריכים (.+)$/.exec(q))) { const v = vpHe(m[1]); if (v) return { en: `We need to ${v.en}`, from: v.from }; const n = enOf(m[1].replace(/^את /, '')); if (n) return { en: `We need ${a(n)}`, from: n.from }; }
    if ((m = /^איפה אפשר (ל.+)$/.exec(q))) { const v = vpHe(m[1]); if (v) return { en: `Where can I ${v.en}?`, from: v.from }; }
    if ((m = /^אפשר (ל.+)$/.exec(q))) { const v = vpHe(m[1]); if (v) return { en: `Can I ${v.en}?`, from: v.from }; }
    if ((m = /^קוראים לי (.+)$/.exec(q))) return { en: `My name is ${nameHe.get(m[1]) || m[1]}`, from: 'table' };
    if ((m = /^השעה (.+)$/.exec(q))) { const n = numbersToEn(m[1]); if (n) return { en: `It is ${n} o'clock`, from: 'table' }; }
    if ((m = /^המספר הוא (.+)$/.exec(q))) { const n = numbersToEn(m[1]); if (n) return { en: `The number is ${n}`, from: 'table' }; }
    if ((m = /^נתראה מחר ב(.+)$/.exec(q))) { const n = numbersToEn(m[1]); if (n) return { en: `See you tomorrow at ${n}`, from: 'table' }; }
    if ((m = /^נתראה ב(.+)$/.exec(q))) { const n = numbersToEn(m[1]); if (n) return { en: `See you at ${n}`, from: 'table' }; }
    if ((m = /^יש לי אלרגיה ל(.+)$/.exec(q))) { const n = enOf(m[1]) || enOf('ה' + m[1]); if (n) return { en: `I am allergic to ${n.bare}`, from: n.from }; }
    if ((m = /^איפה יש (.+) באזור$/.exec(q))) { const n = enOf(m[1]); if (n) return { en: `Where is the nearest ${n.bare}?`, from: n.from }; }
    if ((m = /^איבדתי את (.+?)( שלי)?$/.exec(q))) { const n = enOf(m[1]); if (n) return { en: `I lost my ${n.bare}`, from: n.from }; }
    if ((m = /^איפה (.+)$/.exec(q))) { const n = enOf(m[1]); if (n) return { en: `Where is ${a(n)}?`, from: n.from }; }
    if ((m = /^איך מגיעים ל(.+)$/.exec(q))) { const n = enOf('ה' + m[1]) || enOf(m[1]); if (n) return { en: `How do I get to ${n.en}?`, from: n.from }; }
    if ((m = /^כמה (?:עולה|עולים|עולות) (.+)$/.exec(q))) { const n = enOf(m[1]); if (n) return { en: `How much is ${a(n)}?`, from: n.from }; }
    if ((m = /^כמה (.+)$/.exec(q))) { const n = enOf(m[1]); if (n) return { en: `How many ${n.bare}?`, from: n.from }; }
    if ((m = /^אפשר (?:את )?(.+)$/.exec(q))) { const n = enOf(m[1]); if (n) return { en: `Can I have ${a(n)}?`, from: n.from }; }
    if ((m = /^אני רוצה (?:את )?(.+)$/.exec(q))) { const n = enOf(m[1]); if (n) return { en: `I want ${a(n)}`, from: n.from }; }
    if ((m = /^אני (?:צריך|צריכה) (?:את )?(.+)$/.exec(q))) { const n = enOf(m[1]); if (n) return { en: `I need ${a(n)}`, from: n.from }; }
    if ((m = /^אני (?:מחפש|מחפשת) (?:את )?(.+)$/.exec(q))) { const n = enOf(m[1]); if (n) return { en: `I am looking for ${a(n)}`, from: n.from }; }
    if ((m = /^אני (?:אוהב|אוהבת) (?:את )?(.+)$/.exec(q))) { const n = enOf(m[1]); if (n) return { en: `I like ${n.en}`, from: n.from }; }
    if ((m = /^יש לכם (.+)$/.exec(q))) { const n = enOf(m[1]); if (n) return { en: `Do you have ${a(n)}?`, from: n.from }; }
    if ((m = /^יש כאן (.+)$/.exec(q))) { const n = enOf(m[1]); if (n) return { en: `Is there ${a(n)} here?`, from: n.from }; }
    if ((m = /^אין לי (.+)$/.exec(q))) { const n = enOf(m[1]); if (n) return { en: `I don't have ${a(n)}`, from: n.from }; }
    if ((m = /^יש לי (.+)$/.exec(q))) { const n = enOf(m[1]); if (n) return { en: `I have ${a(n)}`, from: n.from }; }
    if ((m = /^אני מ(.+)$/.exec(q))) { const n = enOf(m[1]); if (n && n.kind === 'place') return { en: `I am from ${n.en}`, from: 'table' }; }
    if ((m = /^מתי (.+)$/.exec(q))) { const n = enOf(m[1]); if (n && n.from === 'table' && n.kind === 'noun') return { en: `When is ${n.definite ? n.en : 'the ' + n.bare}?`, from: 'table' }; }
    if ((m = /^(.+) בלי (.+)$/.exec(q))) { const x = enOf(m[1]); const y = enOf(m[2]); if (x && y) return { en: `${cap(x.bare)}, no ${y.bare}`, from: x.from === 'dictionary' || y.from === 'dictionary' ? 'dictionary' : 'table' }; }
    if ((m = /^(.+) עם (.+)$/.exec(q))) { const x = enOf(m[1]); const y = enOf(m[2]); if (x && y) return { en: `${cap(x.bare)} with ${y.bare}`, from: x.from === 'dictionary' || y.from === 'dictionary' ? 'dictionary' : 'table' }; }
    if ((m = /^ל(.+)$/.exec(q))) { const n = enOf('ה' + m[1]); if (n && n.from === 'table') return { en: `To ${n.en}`, from: 'table' }; }
    const nums = numbersToEn(q);
    if (nums) return { en: cap(nums), from: 'table' };
    const whole = enOf(q);
    if (whole && whole.from === 'table') return { en: cap(a(whole)), from: 'table' };
    return null;
  }

  /** Stored line or pattern for a Hebrew key, without the fuzzy steps. */
  function heToEnCore(q, allowPattern = true) {
    const key = normHe(q);
    const hit = heExact.get(key);
    if (hit) return { en: hit.en[0], from: /** @type {'table'} */ ('table'), pair: hit };
    if (allowPattern) return patternHeEn(key);
    const n = enOf(key);
    if (n) return { en: cap(n.kind === 'noun' && !n.definite ? withArticle(n.en) : n.en), from: n.from };
    return patternHeEn(key);
  }

  function nearest(tokens, lang, soft) {
    /** @type {{pair:Pair, score:number, safe:boolean}[]} */
    const scored = [];
    for (const row of index) {
      let best = 0; let safe = false;
      for (const cand of row[lang]) {
        const s = dice(tokens, cand);
        if (s > best) best = s;
        if (softlyEqual(tokens, cand, soft)) safe = true;
      }
      if (best > 0) scored.push({ pair: row.pair, score: safe ? 2 + best : best, safe });
    }
    scored.sort((x, y) => y.score - x.score);
    return scored;
  }
  const brief = (p) => ({ id: p.id, en: p.en[0], he: p.he });

  /**
   * One word that is not a word (a slip of the ear or the keyboard) next to a stored line that is otherwise the same:
   * "אני צריך שקיד" -> "אני צריך שקית". Only when the dictionary is loaded, so "not a word" means something, only for one
   * word per line, and only within one letter (two for words of six letters or more). A real word is never replaced.
   */
  function snap(tokens, lang) {
    if (!hasDict || tokens.length < 2) return null;
    const known = lang === 'he'
      ? (w) => heWords.has(w) || nounHe.has(w) || numHe.has(w) || dictHe.has(w) || (w.length > 2 && 'והבלמשכ'.includes(w[0]) && (heWords.has(w.slice(1)) || nounHe.has(w.slice(1)) || dictHe.has(w.slice(1))))
      : (w) => enWords.has(w) || nounEn.has(w) || numEn.has(w) || dictEn.has(w) || dictEn.has(w.replace(/(?:es|s|ed|ing)$/, '')) || /^\d+$/.test(w);
    /** @type {{pair:Pair, heard:string, as:string}|null} */ let found = null;
    for (const row of index) {
      for (const cand of row[lang]) {
        if (cand.length !== tokens.length) continue;
        let diff = -1; let ok = true;
        for (let i = 0; i < cand.length; i++) { if (cand[i] !== tokens[i]) { if (diff >= 0) { ok = false; break; } diff = i; } }
        if (!ok || diff < 0) continue;
        const heard = tokens[diff]; const want = cand[diff];
        if (known(heard) || heard.length < 3) continue;
        if (editDistance(heard, want, 2) > (Math.min(heard.length, want.length) >= 6 ? 2 : 1)) continue;
        if (found && found.pair !== row.pair) return null; // two different lines fit: do not choose
        found = { pair: row.pair, heard, as: want };
      }
    }
    return found;
  }

  /** Hebrew word by word: every word must be in the Talk lists (small words, nouns, numbers, to-forms), or the answer is refused. The big dictionary is used for a single word only: its glosses are too loose to string together. */
  function wordByWord(q) {
    const toks = normHe(q).split(' ').filter(Boolean);
    if (!toks.length || toks.length > 6) return null;
    const out = [];
    for (const w of toks) {
      const direct = SMALL_WORDS.get(w) || nounHe.get(w)?.en || numHe.get(w)?.en[0] || verbHe.get(w) || (toks.length === 1 ? heExact.get(w)?.en[0] || dictHe.get(w)?.en : '');
      if (direct) { out.push(direct.toLowerCase()); continue; }
      const pre = PREFIX_GLOSS[w[0]];
      const rest = w.slice(1);
      const inner = pre && rest.length >= 2 ? (nounHe.get(rest)?.en || numHe.get(rest)?.en[0]) : null;
      if (inner) { out.push(`${pre} ${inner.toLowerCase()}`); continue; }
      return null;
    }
    return out.join(' · ');
  }

  /**
   * Translate one line.
   * @param {string} text
   * @param {{direction?:'auto'|'en-he'|'he-en', speaker?:'m'|'f'|'', whole?:boolean}} [o]
   * @returns {TalkResult}
   */
  function translate(text, o = {}) {
    const source = String(text || '').replace(/\s+/g, ' ').trim();
    /** @type {'en-he'|'he-en'} */
    const direction = o.direction === 'en-he' || o.direction === 'he-en' ? o.direction : (detectDirection(source) || 'en-he');
    const none = (extra = {}) => /** @type {TalkResult} */ ({ ok: false, direction, source, translation: '', method: 'none', confidence: 'none', ...extra });
    if (!source) return none();
    if (holdsDivineName(source)) return { ok: false, held: true, direction, source, translation: '', method: 'held', confidence: 'none' };
    const woman = o.speaker === 'f';

    if (direction === 'en-he') {
      const q = foldNumbersEn(normEn(source));
      if (!q) return none();
      const asked = /\bplease\b/.test(q);
      const bare = q.replace(/\bplease\b/g, ' ').replace(/\s+/g, ' ').trim();
      const please = (he) => {
        const has = /בבקשה/.test(he);
        if (asked && !has && he !== 'בבקשה') return /\?$/.test(he) ? he.replace(/\?$/, ', בבקשה?') : `${he.replace(/[.!]$/, '')}, בבקשה`;
        return he;
      };
      const fromPair = (p, method, confidence, note) => {
        const main = woman && p.f ? p.f : p.he;
        /** @type {{label:string, text:string}[]} */ const variants = [];
        if (p.f) variants.push(woman ? { label: 'Said by a man', text: please(p.he) } : { label: 'Said by a woman', text: please(p.f) });
        if (p.toF) variants.push({ label: 'Said to a woman', text: please(p.toF) });
        if (p.other) variants.push({ label: 'Feminine form', text: please(p.other) });
        /** @type {TalkResult} */
        const r = { ok: true, direction, source, translation: please(main), method, confidence, matched: brief(p), variants };
        if (p.pointed && main === p.he && please(main) === main) r.pointed = p.pointed;
        if (note) r.note = note;
        return r;
      };
      const exact = enExact.get(q) || enExact.get(bare);
      if (exact) return fromPair(exact, 'phrase', 'high');
      const loose = enLoose.get(looseEn(q));
      if (loose) {
        // matched with "please" and the articles set aside: a "please" the speaker did not say is taken back out
        const r = fromPair(loose, 'phrase', 'high');
        const strip = (t) => (asked ? t : t.replace(/, בבקשה(\??)$/, '$1'));
        return { ...r, translation: strip(r.translation), variants: (r.variants || []).map((v) => ({ ...v, text: strip(v.text) })) };
      }
      const pat = patternEnHe(bare);
      if (pat) {
        const main = woman && pat.f ? pat.f : pat.he;
        /** @type {{label:string, text:string}[]} */ const variants = [];
        if (pat.f) variants.push(woman ? { label: 'Said by a man', text: please(pat.he) } : { label: 'Said by a woman', text: please(pat.f) });
        if (pat.toF) variants.push({ label: 'Said to a woman', text: please(pat.toF) });
        const fromDict = pat.from === 'dictionary';
        return { ok: true, direction, source, translation: please(main), method: 'pattern', confidence: fromDict ? 'low' : 'medium', variants,
          note: pat.note || (fromDict ? 'Built from a sentence pattern and a dictionary word. Check it before you rely on it.' : 'Built from a sentence pattern.') };
      }
      const single = np(bare);
      if (single) {
        const several = bare.includes(' '); // "two beers", "tea with milk": put together, not one word
        return { ok: true, direction, source, translation: please(single.he), method: several ? 'pattern' : 'word', confidence: single.from === 'table' ? 'medium' : 'low',
          // a lone dictionary word carries its vowel marks: the screen shows them, because the short spelling can read as another word
          ...(!several && /** @type {any} */ (single).pointed && please(single.he) === single.he ? { pointed: /** @type {any} */ (single).pointed } : {}),
          note: single.from !== 'table' ? 'One dictionary word. It may not be the sense you meant.' : (several ? 'Built from a sentence pattern.' : undefined) };
      }
      const verb = !bare.includes(' ') ? dictEn.get(bare) : null;
      if (verb) return { ok: true, direction, source, translation: verb.he, pointed: verb.pointed, method: 'word', confidence: 'low', note: verb.verb ? 'A dictionary verb, in its basic "he did" form.' : 'One dictionary word. It may not be the sense you meant.' };
      const toks = looseEnTokens(q);
      const parts = o.whole === false ? null : joinParts(source, o);
      if (parts) return parts;
      const near = nearest(toks, 'en', EN_SOFT);
      if (near.length && near[0].safe) return fromPair(near[0].pair, 'close', 'medium', `Closest line I know: “${near[0].pair.en[0]}”`);
      const fixed = snap(toks, 'en');
      if (fixed) return fromPair(fixed.pair, 'close', 'medium', `Read “${fixed.heard}” as “${fixed.as}”. Closest line I know: “${fixed.pair.en[0]}”`);
      return none({ suggestions: near.filter((x) => x.score >= 0.5).slice(0, 3).map((x) => brief(x.pair)) });
    }

    // Hebrew -> English
    const q = normHe(source);
    if (!q) return none();
    const asksNicely = /(^| )בבקשה$/.test(q) && q !== 'בבקשה';
    const polite = (en) => {
      if (asksNicely && !/please|welcome/i.test(en)) return `${en.replace(/[.!?]$/, '')}, please${/\?$/.test(en) ? '?' : ''}`;
      if (!asksNicely && q !== 'בבקשה' && /,? please\??$/i.test(en) && en.toLowerCase() !== 'please') return en.replace(/,? please(\??)$/i, '$1');
      return en;
    };
    const hit = heExact.get(q) || heLoose.get(looseHeTokens(q).join(' '));
    if (hit) return { ok: true, direction, source, translation: polite(cap(hit.en[0])), method: 'phrase', confidence: 'high', matched: brief(hit) };
    // a stored line that differs only by a dropped article wins over a frame ("איפה בית חולים" is the stored hospital line)
    const bare = heBare.get(bareHeTokens(q).join(' '));
    if (bare) return { ok: true, direction, source, translation: polite(cap(bare.en[0])), method: 'close', confidence: 'medium', matched: brief(bare), note: `Closest line I know: “${bare.he}”` };
    // the frames are tried on the line as heard, then with the swapped words folded ("ניפגש" read as "נתראה")
    const folded = normHe(source).split(' ').map((w) => HE_SAME.get(w) || w).join(' ');
    const pat = patternHeEn(q) || (folded !== q ? patternHeEn(folded) : null);
    if (pat) return { ok: true, direction, source, translation: cap(pat.en), method: 'pattern', confidence: pat.from === 'dictionary' ? 'low' : 'medium',
      note: pat.from === 'dictionary' ? 'Built from a sentence pattern and a dictionary word. Check it before you rely on it.' : 'Built from a sentence pattern.' };
    const toks = looseHeTokens(q);
    const parts = o.whole === false ? null : joinParts(source, o);
    if (parts) return parts;
    const near = nearest(toks, 'he', HE_SOFT);
    if (near.length && near[0].safe) return { ok: true, direction, source, translation: polite(cap(near[0].pair.en[0])), method: 'close', confidence: 'medium', matched: brief(near[0].pair), note: `Closest line I know: “${near[0].pair.he}”` };
    const fixed = snap(toks, 'he');
    if (fixed) return { ok: true, direction, source, translation: polite(cap(fixed.pair.en[0])), method: 'close', confidence: 'medium', matched: brief(fixed.pair), note: `Read “${fixed.heard}” as “${fixed.as}”. Closest line I know: “${fixed.pair.he}”` };
    const words = wordByWord(q);
    if (words) return { ok: true, direction, source, translation: words, method: toks.length <= 1 ? 'word' : 'words', confidence: 'low', note: toks.length <= 1 ? 'One dictionary word. It may not be the sense you meant.' : 'Word by word, not a sentence. Use it to get the gist only.' };
    return none({ suggestions: near.filter((x) => x.score >= 0.5).slice(0, 3).map((x) => brief(x.pair)) });
  }

  /** A line with commas or several short sentences: every part must translate on its own, or the whole is refused. */
  function joinParts(source, o) {
    let segs = source.split(/[,.;!?،]+/).map((x) => x.trim()).filter(Boolean);
    let glue = ', ';
    if (segs.length === 1 && / and /i.test(source) && !hasHebrewText(source)) { segs = source.split(/ and /i).map((x) => x.replace(/[.!?]+$/, '').trim()).filter(Boolean); glue = ' ו'; }
    if (segs.length < 2 || segs.length > 4) return null;
    const rs = segs.map((x) => translate(x, { ...o, whole: false }));
    if (!rs.every((r) => r.ok && r.method !== 'words' && r.direction === rs[0].direction)) return null;
    const question = /[?]\s*$/.test(source);
    const text = rs.map((r, i) => { const t = r.translation.replace(/[.?!]+$/, ''); return i && r.direction === 'he-en' && !/^I\b/.test(t) ? t[0].toLowerCase() + t.slice(1) : t; }).join(glue) + (question ? '?' : '');
    const low = rs.some((r) => r.confidence === 'low');
    return /** @type {TalkResult} */ ({ ok: true, direction: rs[0].direction, source, translation: text, method: 'pattern', confidence: low ? 'low' : 'medium', variants: [],
      note: low ? 'Put together from parts, one of them a dictionary word. Check it before you rely on it.' : 'Put together from stored parts.' });
  }

  return {
    translate,
    setDictionary,
    get hasDictionary() { return hasDict; },
    /** True when `word` (lower case) is an ordinary English word the dictionary uses in a gloss. False for every word while no dictionary is loaded. */
    knowsEnglish: (word) => glossWords.has(String(word || '').toLowerCase()),
    /** The ways a number of the table (0 to 100) is written as a word, in English and in Hebrew (every gender form); empty lists for any other number. */
    numberWords(n) { const N = numEn.get(String(n)); return N ? { en: [...N.en], he: [N.count, N.m, N.mConstruct, N.fConstruct].filter(Boolean) } : { en: [], he: [] }; },
    size: { pairs: pairs.length, nouns: nounEn.size, names: nameEn.size },
    /** Stored lines of one group, for the "Try saying" list. */
    examples(cat, n = 6) { return (pack.phrases || []).filter((p) => !cat || p.cat === cat).slice(0, n).map((p) => ({ id: p.id, en: p.en[0], he: p.he })); },
    categories() { return [...new Set((pack.phrases || []).map((p) => p.cat))]; },
  };
}
