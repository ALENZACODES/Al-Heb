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

const EN_TENS = { __proto__: null, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const EN_UNITS = { __proto__: null, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
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
const EN_PLURAL = { __proto__: null, person: 'people' };
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
const withArticle = (en) => (MASS.has(en) || /s$/.test(en) ? en : (/^[aeiou]/.test(en) ? 'an ' : 'a ') + en);
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const hasHebrewText = (s) => /[א-ת]/.test(String(s));
const PREFIX_GLOSS = { __proto__: null, 'ו': 'and', 'ה': 'the', 'ב': 'in', 'ל': 'to' };
const SMALL_WORDS = new Map([['אפשר', 'may I'], ['עוד', 'more'], ['בלי', 'without'], ['עם', 'with'], ['יש', 'there is'], ['אין', 'there is no'], ['מה', 'what'], ['אתה', 'you'], ['את', 'you'], ['אתם', 'you'], ['אני', 'I'], ['אנחנו', 'we'], ['הוא', 'he'], ['היא', 'she'], ['זה', 'this'], ['זאת', 'this'], ['כאן', 'here'], ['פה', 'here'], ['שם', 'there'], ['לא', 'not'], ['כן', 'yes'], ['גם', 'also'], ['רק', 'only'], ['מאוד', 'very'], ['עכשיו', 'now'], ['היום', 'today'], ['מחר', 'tomorrow'], ['של', 'of'], ['שלי', 'my'], ['על', 'on'], ['אחרי', 'after'], ['לפני', 'before'], ['ליד', 'next to'], ['בבקשה', 'please'], ['תודה', 'thanks'], ['איפה', 'where'], ['מתי', 'when'], ['כמה', 'how much'], ['למה', 'why'], ['מי', 'who'], ['איך', 'how'], ['או', 'or'], ['אבל', 'but'], ['כי', 'because'], ['אם', 'if'], ['לי', 'to me'], ['לך', 'to you'], ['לנו', 'to us'], ['צריך', 'need'], ['צריכה', 'need'], ['רוצה', 'want'], ['יכול', 'can'], ['יכולה', 'can']]);

/**
 * @typedef {{id:string, src:string, en:string[], he:string, pointed?:string, f?:string, toF?:string, alt?:string[], other?:string, otherPointed?:string, clip?:string}} Pair
 * @typedef {{ok:boolean, held?:boolean, direction:'en-he'|'he-en', source:string, translation:string, pointed?:string,
 *   method:'phrase'|'pattern'|'close'|'word'|'words'|'none'|'held', confidence:'high'|'medium'|'low'|'none',
 *   matched?:{id:string, en:string, he:string}, variants?:{label:string, text:string}[], note?:string, clip?:{kind:string, id:string}, soundsLike?:boolean,
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
    const p = { id: `pb-${e.id}`, src: 'phrasebook', clip: String(e.id), en, he: stripNikkud(e.he).replace(/[.]$/, ''), pointed: e.he.replace(/[.]$/, '') };
    const f = e.forms?.f?.he; const m = e.forms?.m?.he;
    if (f && m && stripNikkud(f) !== stripNikkud(m)) { p.other = stripNikkud(f); p.otherPointed = f; }
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
    const kind = n.own ? 'own' : 'noun';
    for (const e of n.en) if (!nounEn.has(e)) nounEn.set(e, { en: n.en[0], he: n.he, def, kind, g: n.g || 'm', pl: n.pl || '', food: n.food || '' });
    const back = n.back || n.en[0];
    if (!nounHe.has(n.he)) nounHe.set(n.he, { en: back, definite: n.he === def, kind });
    if (!nounHe.has(def)) nounHe.set(def, { en: back, definite: true, kind });
    if (n.pl && !nounHe.has(n.pl)) nounHe.set(n.pl, { en: pluralEn(back), definite: false, kind: 'noun' });
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
  /** @type {Map<string, any>} */ const adjEn = new Map();
  /** @type {Map<string, any>} */ const adjHe = new Map();
  for (const a of pack.adjectives || []) { for (const e of a.en) if (!adjEn.has(e)) adjEn.set(e, a); for (const f of [a.m, a.f, a.mp, a.fp]) if (!adjHe.has(f)) adjHe.set(f, a); }
  /** @type {Map<string,string>} */ const compEn = new Map(Object.entries(pack.comparatives || {})); // "bigger" -> "big"
  /** @type {Map<string,string>} */ const compOf = new Map(); // "big" -> "bigger"
  for (const [c, base] of compEn) if (!compOf.has(base)) compOf.set(base, c);
  /** @type {Map<string,string>} */ const dayEn = new Map((pack.days || []).map((d) => [d[0], d[1]]));
  /** @type {Map<string,string>} */ const dayHe = new Map(); for (const d of pack.days || []) if (!dayHe.has(d[1])) dayHe.set(d[1], d[0][0].toUpperCase() + d[0].slice(1));
  const PER = new Map([['night', 'ללילה'], ['day', 'ליום'], ['person', 'לאדם'], ['hour', 'לשעה'], ['week', 'לשבוע']]);
  const PER_HE = new Map([...PER].map(([e, hx]) => [hx, e]));
  const adjFor = (a, g) => (g === 'f' ? a.f : g === 'pf' ? a.fp : g === 'p' ? a.mp : a.m);
  const ADV = [['here', 'כאן'], ['now', 'עכשיו'], ['today', 'היום'], ['tomorrow', 'מחר'], ['tonight', 'הערב'], ['outside', 'בחוץ'], ['inside', 'בפנים'], ['later', 'אחר כך'], ['there', 'שם']];
  const CONTAINER = new Map([['bottle', 'בקבוק'], ['glass', 'כוס'], ['cup', 'כוס'], ['plate', 'צלחת'], ['bowl', 'קערה']]);
  const CONTAINER_HE = new Map([['בקבוק', 'bottle'], ['כוס', 'glass'], ['צלחת', 'plate'], ['קערה', 'bowl']]);
  const LANGS = new Map([['english', 'אנגלית'], ['hebrew', 'עברית']]);

  // ---- dictionary (optional, loaded by the screen only when a line needs it) -------------------------------------
  /** @type {Map<string, {he:string, pointed:string, rank:number, verb:boolean, noun:boolean}>} */ let dictEn = new Map();
  /** @type {Map<string, {en:string, pointed:string}>} */ let dictHe = new Map();
  let hasDict = false;
  function setDictionary(rows) {
    dictEn = new Map(); dictHe = new Map(); hasDict = false;
    for (const r of rows || []) {
      const pointed = r[1]; const he = r[2]; const gloss = r[3]; const pos = r[4]; const rank = Number(r[9]) || 99999;
      if (!he || !gloss || /^\(/.test(String(gloss).trim())) continue;
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
    const whole0 = nounEn.get(t);
    if (whole0 && whole0.kind === 'own') return { he: whole0.he, def: whole0.he, definite: true, from: 'table', kind: 'own', g: whole0.g || 'm' }; // "my husband": already says whose
    let definite = false; let mine = false;
    const m = /^(the|a|an|some|any|my|our|this|that) (.+)$/.exec(t);
    if (m) { definite = !/^(?:a|an|some|any)$/.test(m[1]); mine = definite && m[1] !== 'the'; t = m[2]; }
    // what follows the noun: "my" שלי, "our" שלנו, "this" הזה in the noun's gender
    const owner = (g) => (!m ? '' : m[1] === 'my' ? ' שלי' : m[1] === 'our' ? ' שלנו' : m[1] === 'this' || m[1] === 'that' ? (g === 'f' ? ' הזאת' : String(g).startsWith('p') ? ' האלה' : ' הזה') : '');
    let hit = nounEn.get(t) || (definite ? nounEn.get('the ' + t) : null);
    /** @type {'table'|'dictionary'} */ let from = 'table';
    if (!hit && !t.includes(' ')) {
      const d = dictEn.get(t) || (/s$/.test(t) ? dictEn.get(t.slice(0, -1)) : null);
      if (d && d.noun) { hit = { en: t, he: d.he, def: 'ה' + d.he, kind: 'noun' }; from = 'dictionary'; }
    }
    if (!hit && !m) {
      // "three tickets", "two beers", "one night", "20 shekels": the noun must have a stored plural
      const c = /^(\S+) (.+)$/.exec(t); const N = c ? numEn.get(c[1]) : null;
      if (N && N.n >= 1 && /^more /.test(c[2])) { const more = np(`${c[1]} ${c[2].slice(5)}`); if (more && more.kind === 'count') return { ...more, he: `עוד ${more.he}`, def: `עוד ${more.he}` }; }
      const cc = N && N.n >= 2 ? /^(bottles|glasses|cups|plates|bowls) of (.+)$/.exec(c[2]) : null;
      if (cc) {
        // "two glasses of red wine"
        const box = nounEn.get(cc[1] === 'glasses' ? 'glass' : cc[1].replace(/s$/, '')); const inside = np(cc[2]);
        if (box && box.pl && inside && !inside.definite) {
          const fem = box.g === 'f';
          const he = `${N.n === 2 ? (fem ? 'שתי' : 'שני') : (fem ? N.count : N.m)} ${box.pl} ${inside.he}`;
          return { he, def: he, definite: false, from: inside.from, kind: 'count', g: fem ? 'pf' : 'p' };
        }
      }
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
      // "another towel", "a room per night"
      if (!m && (c = /^another (.+)$/.exec(t))) { const a = np(c[1], true); if (a && !a.definite) return { ...a, he: `עוד ${a.he}`, def: `עוד ${a.he}`, kind: 'noun' }; }
      if ((c = /^(.+) per (night|day|person|hour|week)$/.exec(t))) { const a = np(lead + c[1], true); if (a) { const tail = ' ' + PER.get(c[2]); return { ...a, he: a.he + tail, def: a.def + tail }; } }
      // "a big room", "cold water", "the old city", "a bigger room": the describing word follows the noun and takes its gender
      if (!mine && (c = /^(\S+) (.+)$/.exec(t))) {
        const base = compEn.get(c[1]); const adj = adjEn.get(base || c[1]);
        const a = adj && !(base && definite) ? np(lead + c[2], true) : null;
        if (a && a.from === 'table' && a.kind === 'noun' && a.g) {
          const word = adjFor(adj, a.g);
          const he = definite ? `${a.he} ה${word}` : `${a.he} ${base ? 'יותר ' : ''}${word}`;
          return { ...a, he, def: `${a.def} ה${word}` };
        }
      }
      // "a bottle of water", "a cup of coffee"
      if ((c = /^(bottle|glass|cup|plate|bowl) of (.+)$/.exec(t))) {
        const b = np(c[2]);
        if (b && !b.definite) { const he = `${CONTAINER.get(c[1])} ${b.he}`; return { he, def: he, definite: false, from: b.from, kind: 'noun', g: c[1] === 'bottle' ? 'm' : 'f' }; }
      }
      // "a table for six", "a room for two"
      if ((c = /^(.+) for (\w+)(?: people)?$/.exec(t))) {
        const a = np(lead + c[1], true); const N = numEn.get(c[2]);
        if (a && N && N.n >= 1) { const tail = ` ל${N.n === 2 ? 'שניים' : N.m}`; return { ...a, he: a.he + tail, def: a.def + tail, kind: 'noun' }; }
      }
      // "the rabbi's sermon" (the apostrophe is gone by now): the thing first, then whose it is
      if ((c = /^(.+) s (.+)$/.exec(t)) && definite) {
        const who = np(lead + c[1], true); const what = np('the ' + c[2], true);
        if (who && what && who.from === 'table' && what.from === 'table' && who.definite) { const he = `${what.he} של ${who.he}`; return { he, def: he, definite: true, from: 'table', kind: 'noun', g: what.g }; }
      }
      // "a supermarket near the hotel"
      if ((c = /^(.+) (?:near|next to|by) (.+)$/.exec(t))) {
        const a = np(lead + c[1], true); const b = np(c[2], true);
        if (a && b && b.from === 'table' && b.definite) { const tail = ` ליד ${b.he}`; return { ...a, he: a.he + tail, def: a.def + tail, kind: 'noun' }; }
      }
      // "a gift for my mother"
      if ((c = /^(.+) for (.+)$/.exec(t))) {
        const a = np(lead + c[1], true); const b = np(c[2], true);
        if (a && b && b.from === 'table' && b.definite) { const tail = ' ' + withPrep(b, 'ל'); return { ...a, he: a.he + tail, def: a.def + tail, kind: 'noun' }; }
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
    const def = mine ? `${hit.def}${owner(from === 'table' ? hit.g || 'm' : 'm')}` : hit.def;
    return { he: definite ? def : hit.he, def, definite, from, kind: hit.kind, g: from === 'table' ? (hit.g || 'm') : '' };
  }
  /** Attach a one-letter preposition (ל, ב, מ): the article ה folds into it. */
  const withPrep = (n, prep) => prep + (n.definite && n.kind !== 'place' && n.he.startsWith('ה') ? n.he.slice(1) : n.he);
  const obj = (n) => (n.definite ? 'את ' : '') + n.he; // definite direct object takes את

  /** Hebrew noun phrase -> English ("the hospital", "coffee", "two tickets"). */
  function enOf(heText) {
    const t = normHe(heText);
    if (!t) return null;
    const hit = nounHe.get(t);
    if (hit) return { en: hit.kind !== 'noun' ? hit.en : (hit.definite ? 'the ' + hit.en : hit.en), bare: hit.en, definite: hit.definite, from: 'table', kind: hit.kind };
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
    if (parts.length >= 2 && parts[0] === 'עוד') {
      const rest = enOf(parts.slice(1).join(' '));
      if (rest) { const one = !MASS.has(rest.bare) && !/s$/.test(rest.bare) && rest.kind === 'noun'; const b = `${one ? 'another' : 'more'} ${rest.bare}`; return { ...rest, en: b, bare: b, kind: 'count' }; }
    }
    if (parts.length >= 2 && ['שלנו', 'הזה', 'הזאת', 'האלה'].includes(parts[parts.length - 1])) {
      const rest = enOf(parts.slice(0, -1).join(' ')); const w = parts[parts.length - 1] === 'שלנו' ? 'our' : parts[parts.length - 1] === 'האלה' ? 'these' : 'this';
      if (rest && rest.definite && rest.kind === 'noun') return { ...rest, en: `${w} ${rest.bare}`, bare: `${w} ${rest.bare}` };
    }
    if (parts.length >= 2 && parts[parts.length - 1] === 'שלי') { const rest = enOf(parts.slice(0, -1).join(' ')); if (rest && rest.definite && rest.kind === 'noun') return { ...rest, en: `my ${rest.bare}`, bare: `my ${rest.bare}` }; }
    if (parts.length >= 3 && parts.includes('ליד')) {
      const k = parts.indexOf('ליד'); const what = enOf(parts.slice(0, k).join(' ')); const where = enOf(parts.slice(k + 1).join(' '));
      if (what && where && where.from === 'table' && (where.definite || where.kind !== 'noun')) { const tail = ` near ${where.en}`; return { ...what, en: what.en + tail, bare: what.bare + tail }; }
    }
    if (parts.length >= 3 && parts.includes('של')) {
      const k = parts.indexOf('של'); const what = enOf(parts.slice(0, k).join(' ')); const who = enOf(parts.slice(k + 1).join(' '));
      if (what && who && what.definite && who.definite && what.from === 'table' && who.from === 'table') { const b = `${who.kind === 'noun' ? who.en : who.bare}'s ${what.bare}`; return { ...what, en: b, bare: b, kind: 'own' }; }
    }
    if (parts.length >= 2 && parts[parts.length - 1][0] === 'ל') {
      const forN = parts[parts.length - 1] === 'לשניים' ? numHe.get('שניים') : numHe.get(parts[parts.length - 1].slice(1));
      const head = forN ? enOf(parts.slice(0, -1).join(' ')) : null;
      if (head && forN) { const tail = ` for ${forN.en[0]}`; return { ...head, en: head.en + tail, bare: head.bare + tail }; }
    }
    if (parts.length >= 2 && PER_HE.has(parts[parts.length - 1])) { const rest = enOf(parts.slice(0, -1).join(' ')); if (rest) { const tail = ` per ${PER_HE.get(parts[parts.length - 1])}`; return { ...rest, en: rest.en + tail, bare: rest.bare + tail }; } }
    if (parts.length >= 2) {
      // noun + describing word: "חדר גדול", "מים קרים", "חדר יותר גדול", "החדר הגדול"
      const lastW = parts[parts.length - 1]; const adj = adjHe.get(lastW) || (lastW[0] === 'ה' ? adjHe.get(lastW.slice(1)) : null);
      if (adj) {
        const more = parts[parts.length - 2] === 'יותר';
        const rest = enOf(parts.slice(0, more ? -2 : -1).join(' '));
        if (rest && rest.from === 'table' && rest.kind === 'noun') {
          const word = more ? (compOf.get(adj.en[0]) || `more ${adj.en[0]}`) : adj.en[0];
          // "כוס יין לבן" is a glass of white wine: the describing word belongs to what is inside
          const of = / of /.test(rest.bare) ? rest.bare.lastIndexOf(' of ') + 4 : 0;
          const b = `${rest.bare.slice(0, of)}${word} ${rest.bare.slice(of)}`;
          return { ...rest, en: rest.definite ? `the ${b}` : b, bare: b };
        }
      }
    }
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
      if (d) return { en: d.en, bare: d.en, definite: false, from: 'dictionary', kind: 'noun' };
      if (t.startsWith('ה') && t.length > 2) { const d2 = dictHe.get(t.slice(1)); if (d2) return { en: 'the ' + d2.en, bare: d2.en, definite: true, from: 'dictionary', kind: 'noun' }; }
    }
    return null;
  }

  /** English verb phrase after "to": a stored to-form, then an optional thing and an optional "here / now / outside". */
  function vp(text) {
    let t = String(text || '').trim(); let tail = '';
    for (const [e, hx] of ADV) { if (t.endsWith(' ' + e)) { tail = ' ' + hx + tail; t = t.slice(0, -e.length - 1); break; } }
    const words = t.split(' ');
    for (let k = Math.min(4, words.length); k >= 1; k--) {
      const key = words.slice(0, k).join(' ');
      const v = verbEn.get(key);
      if (!v) continue;
      const rest = words.slice(k).join(' ');
      if (!rest) return { he: v + tail, from: /** @type {'table'|'dictionary'} */ ('table') };
      if (!takesThing.has(key)) return null;
      const n = np(rest);
      if (n) return { he: tail === ' כאן' ? `${v} כאן ${obj(n)}` : `${v} ${obj(n)}${tail}`, from: n.from };
    }
    return null;
  }
  /** Hebrew to-form phrase -> English ("לשלם עכשיו" -> "pay now"). */
  function vpHe(text) {
    let t = normHe(text); let tail = '';
    for (const [e, hx] of ADV) { if (t.endsWith(' ' + hx)) { tail = ' ' + e; t = t.slice(0, -hx.length - 1); break; } }
    const words = t.split(' ');
    for (let k = Math.min(4, words.length); k >= 1; k--) {
      const key = words.slice(0, k).join(' ');
      const v = verbHe.get(key);
      if (!v) continue;
      let rest = words.slice(k).join(' ');
      if (!tail && /^כאן /.test(rest)) { tail = ' here'; rest = rest.slice(4); } // "להחליף כאן כסף"
      rest = rest.replace(/^את /, '');
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

  /** A clock time in words: "eight", "eight oclock", "eight thirty", "half past eight", "quarter past eight". */
  function clock(text) {
    const t = String(text).replace(/ oclock$/, '');
    let m;
    if ((m = /^half past (\w+)$/.exec(t)) || (m = /^(\w+) (?:30|thirty)$/.exec(t))) { const n = numEn.get(m[1]); return n && n.n >= 1 && n.n <= 12 ? `${n.count} וחצי` : null; }
    if ((m = /^(?:a )?quarter past (\w+)$/.exec(t)) || (m = /^(\w+) (?:15|fifteen)$/.exec(t))) { const n = numEn.get(m[1]); return n && n.n >= 1 && n.n <= 12 ? `${n.count} ורבע` : null; }
    const n = numEn.get(t);
    return n && n.n >= 1 && n.n <= 12 ? n.count : null;
  }
  /** Hebrew clock words -> English ("שמונה וחצי" -> "half past eight"). */
  function clockEn(text) {
    const m = /^(.+?)( וחצי| ורבע)?$/.exec(normHe(text));
    const n = m ? numHe.get(m[1]) : null;
    if (!n || n.n < 1 || n.n > 12) return null;
    return m[2] === ' וחצי' ? `half past ${n.en[0]}` : m[2] === ' ורבע' ? `quarter past ${n.en[0]}` : n.en[0];
  }

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
    if ((m = /^it is (\w+) oclock$/.exec(q))) { const n = numEn.get(m[1]); if (n && n.n >= 1 && n.n <= 24) return { he: `השעה ${n.count}`, from: 'table' }; }
    if ((m = /^the number is (.+)$/.exec(q))) { const he = numbersToHe(m[1]); if (he) return { he: `המספר הוא ${he}`, from: 'table' }; }
    if ((m = /^see you tomorrow at (.+)$/.exec(q))) { const t = clock(m[1]); if (t) return { he: `נתראה מחר ב${t}`, from: 'table' }; }
    if ((m = /^see you at (.+)$/.exec(q))) { const t = clock(m[1]); if (t) return { he: `נתראה ב${t}`, from: 'table' }; }
    // agreement with a stored noun's gender (dictionary nouns have no stored gender, so these frames need a noun from the Talk list)
    const byG = (n, mas, fem, plu, pluF = plu) => (n.g === 'f' ? fem : n.g === 'pf' ? pluF : n.g === 'p' ? plu : mas);
    const listed = (text) => { const n = np(/^(?:the|my|our|this|that) /.test(text) ? text : 'the ' + text) || np(text); return n && n.from === 'table' && (n.kind === 'noun' || n.kind === 'own') && n.definite && n.g ? n : null; };
    const forN = (w) => { const N = numEn.get(w); return N && N.n >= 1 ? (N.n === 2 ? 'שניים' : N.m) : null; };
    if ((m = /^we have a (?:reservation|booking) for (\w+)(?: people)?$/.exec(q))) { const x = forN(m[1]); if (x) return { he: `יש לנו הזמנה ל${x}`, from: 'table' }; }
    if ((m = /^(?:a )?table for (\w+)(?: people)?$/.exec(q))) { const x = forN(m[1]); if (x) return { he: `שולחן ל${x}`, from: 'table' }; }
    if ((m = /^(?:it|that|this) (?:costs|is) (.+ (?:shekels?|dollars?))$/.exec(q))) { const n = np(m[1]); if (n && n.kind === 'count') return { he: `זה עולה ${n.he}`, from: 'table' }; }
    if ((m = /^(?:it|that|this) cost (.+ (?:shekels?|dollars?))$/.exec(q))) { const n = np(m[1]); if (n && n.kind === 'count') return { he: `זה עלה ${n.he}`, from: 'table' }; }
    // who or what a describing word is about: I, we, you, it, or a noun from the Talk list (its gender picks the form)
    const subject = (text) => {
      if (text === 'i') return { he: 'אני', g: 'm', who: 'i' };
      if (text === 'we') return { he: 'אנחנו', g: 'p', who: 'we' };
      if (text === 'you') return { he: 'אתה', g: 'm', who: 'you' };
      if (text === 'it' || text === 'this' || text === 'that') return { he: 'זה', g: 'm', who: 'it' };
      const n = listed(text);
      return n ? { he: n.he, g: n.g, who: 'noun' } : null;
    };
    const described = (subjText, verb, not, degree, adjWord, when, ask) => {
      const sj = subject(subjText); const a = adjEn.get(adjWord);
      if (!sj || !a) return null;
      const past = verb === 'was' || verb === 'were';
      const day = when && /^on /.test(when) ? dayEn.get(when.slice(3)) : '';
      if (when && /^on /.test(when) && !day) return null;
      const tail = `${degree === 'too' ? ' מדי' : degree ? ' מאוד' : ''}${when === 'today' ? ' היום' : when === 'now' ? ' עכשיו' : day ? ' ב' + day : ''}${ask ? '?' : ''}`;
      const line = (g, subj) => {
        const was = !past ? '' : sj.who === 'i' ? 'הייתי ' : sj.who === 'we' ? 'היינו ' : g === 'f' ? 'הייתה ' : g.startsWith('p') ? 'היו ' : 'היה ';
        return `${subj} ${was}${not ? 'לא ' : ''}${adjFor(a, g)}${tail}`;
      };
      /** @type {{he:string, f?:string, toF?:string, from:'table'}} */
      const out = { he: line(sj.g, sj.he), from: 'table' };
      if (sj.who === 'i' && a.f !== a.m) out.f = line('f', 'אני');
      if (sj.who === 'you') out.toF = line('f', 'את');
      return out;
    };
    if ((m = /^(.+) (does not|do not) (close|open)$/.exec(q))) {
      const sj = listed(m[1]);
      if (sj) return { he: `${sj.he} לא ${m[3] === 'close' ? byG(sj, 'נסגר', 'נסגרת', 'נסגרים', 'נסגרות') : byG(sj, 'נפתח', 'נפתחת', 'נפתחים', 'נפתחות')}`, from: 'table' };
    }
    if ((m = /^(.+) (?:is|are) waiting(?: (outside|inside|here))?$/.exec(q))) {
      const sj = listed(m[1]);
      if (sj) return { he: `${sj.he} ${byG(sj, 'מחכה', 'מחכה', 'מחכים', 'מחכות')}${m[2] === 'outside' ? ' בחוץ' : m[2] === 'inside' ? ' בפנים' : m[2] ? ' כאן' : ''}`, from: 'table' };
    }
    if ((m = /^(?:when|what time) does (.+) (leave|arrive|come)$/.exec(q))) {
      const sj = listed(m[1]);
      if (sj) return { he: `מתי ${sj.he} ${m[2] === 'leave' ? byG(sj, 'יוצא', 'יוצאת', 'יוצאים', 'יוצאות') : byG(sj, 'מגיע', 'מגיעה', 'מגיעים', 'מגיעות')}?`, from: 'table' };
    }
    if ((m = /^how far is (.+)$/.exec(q))) { const sj = listed(m[1]) || (np(m[1])?.kind === 'place' ? np(m[1]) : null); if (sj) return { he: `כמה רחוק ${sj.he}?`, from: 'table' }; }
    if ((m = /^do you have (?:this|it) in (\w+)$/.exec(q))) { const col = adjEn.get(m[1]); if (col) return { he: `יש לכם את זה ב${col.m}?`, from: 'table' }; }
    if ((m = /^are there (?:any )?(.+)$/.exec(q))) { const n = np(m[1]); if (n && !n.definite) return { he: `יש ${n.he}?`, from: lvl(n) }; }
    if ((m = /^(?:can|could) you (.+)$/.exec(q))) { const v = vp(m[1]); if (v) return { he: `אפשר ${v.he}?`, from: v.from }; }
    if ((m = /^(?:can|could) you take me to (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `אפשר לקחת אותי ${withPrep(n, 'ל')}?`, from: lvl(n) }; }
    if ((m = /^i am waiting for (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `אני מחכה ${withPrep(n, 'ל')}`, from: lvl(n) }; }
    if ((m = /^where does (.+) go$/.exec(q))) { const sj = listed(m[1]); if (sj) return { he: `לאן ${sj.he} ${byG(sj, 'נוסע', 'נוסעת', 'נוסעים', 'נוסעות')}?`, from: 'table' }; }
    if ((m = /^do you sell (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `אתם מוכרים ${n.he}?`, from: lvl(n) }; }
    if ((m = /^(is this|this is) (.+)$/.exec(q))) {
      const n = np(m[2]);
      if (n && n.from === 'table' && n.g && n.kind !== 'count') return { he: `${n.g === 'f' ? 'זאת' : String(n.g).startsWith('p') ? 'אלה' : 'זה'} ${n.he}${m[1] === 'is this' ? '?' : ''}`, from: 'table' };
    }
    if ((m = /^(?:at )?(.+?) (tomorrow morning|tomorrow evening|tomorrow night|tomorrow|this evening|tonight|this morning)$/.exec(q))) {
      const t = clock(m[1]);
      if (t) return { he: `${{ 'tomorrow morning': 'מחר בבוקר', 'tomorrow evening': 'מחר בערב', 'tomorrow night': 'מחר בלילה', tomorrow: 'מחר', 'this evening': 'הערב', tonight: 'הערב', 'this morning': 'הבוקר' }[m[2]]} ב${t}`, from: 'table' };
    }
    if ((m = /^i do not (want|need) (to )?(.+)$/.exec(q))) {
      const v = m[2] ? vp(m[3]) : null; const n = m[2] ? null : np(m[3]);
      if (v || n) { const rest = v ? v.he : obj(n); const from = v ? v.from : lvl(n); return m[1] === 'want' ? { he: `אני לא רוצה ${rest}`, from } : { he: `אני לא צריך ${rest}`, f: `אני לא צריכה ${rest}`, from }; }
    }
    if ((m = /^(.+) (does not work|do not work|is not working|are not working|works|is working)$/.exec(q))) {
      const sj = listed(m[1]);
      if (sj) return { he: `${sj.he} ${/not/.test(m[2]) ? 'לא ' : ''}${byG(sj, 'עובד', 'עובדת', 'עובדים', 'עובדות')}`, from: 'table' };
    }
    if ((m = /^(.+) (?:is|are) (on|next to|near|behind|in front of|under) (.+)$/.exec(q))) {
      const sj = listed(m[1]); const n = np(m[3]);
      if (sj && n && n.from === 'table') {
        if (m[2] === 'on' && /(^|ה)קומה( |$)/.test(n.he)) return { he: `${sj.he} ${withPrep(n, 'ב')}`, from: 'table' }; // "on the third floor" is "in" in Hebrew
        const where = m[2] === 'under' ? 'מתחת ' + withPrep(n, 'ל') : `${{ on: 'על', 'next to': 'ליד', near: 'ליד', behind: 'מאחורי', 'in front of': 'מול' }[m[2]]} ${n.he}`;
        return { he: `${sj.he} ${where}`, from: 'table' };
      }
    }
    if ((m = /^which (.+)$/.exec(q))) { const n = np(m[1]); if (n && n.from === 'table' && n.kind === 'noun' && !n.definite) return { he: `${n.g === 'f' ? 'איזו' : String(n.g).startsWith('p') ? 'אילו' : 'איזה'} ${n.he}?`, from: 'table' }; }
    if ((m = /^(.+) (?:goes|go) to (.+)$/.exec(q))) { const sj = listed(m[1]); const n = np(m[2]); if (sj && n && n.from === 'table') return { he: `${sj.he} ${byG(sj, 'נוסע', 'נוסעת', 'נוסעים', 'נוסעות')} ${withPrep(n, 'ל')}`, from: 'table' }; }
    if ((m = /^(is|are|was|were|am) (.+?) (not )?(?:(very|really|so|too) )?(\w+)(?: (today|now|on \w+))?$/.exec(q))) { const r = described(m[2], m[1], m[3], m[4], m[5], m[6], true); if (r) return r; }
    if ((m = /^(.+?) (is|are|was|were|am) (not )?(?:(very|really|so|too) )?(\w+)(?: (today|now|on \w+))?$/.exec(q))) { const r = described(m[1], m[2], m[3], m[4], m[5], m[6], false); if (r) return r; }
    if ((m = /^we are from (.+)$/.exec(q))) { const n = np(m[1]); if (n && n.kind === 'place') return { he: `אנחנו מ${n.he}`, from: 'table' }; }
    if ((m = /^is (.+) in (english|hebrew)$/.exec(q))) { const n = listed(m[1]); if (n) return { he: `${n.he} ב${LANGS.get(m[2])}?`, from: 'table' }; }
    if ((m = /^see you on (\w+)$/.exec(q)) && dayEn.has(m[1])) return { he: `נתראה ב${dayEn.get(m[1])}`, from: 'table' };
    // someone else wants or needs: the verb follows the noun's gender
    if ((m = /^(.+) (wants?|needs?) (to )?(.+)$/.exec(q)) && !/^(?:i|we|you|he|she|they|it)$/.test(m[1])) {
      const sj = listed(m[1]); const thing = m[3] ? vp(m[4]) : null; const n = m[3] ? null : np(m[4]);
      if (sj && (thing || n)) {
        const verb = /^want/.test(m[2]) ? byG(sj, 'רוצה', 'רוצה', 'רוצים', 'רוצות') : byG(sj, 'צריך', 'צריכה', 'צריכים', 'צריכות');
        return { he: `${sj.he} ${verb} ${thing ? thing.he : obj(n)}`, from: thing ? thing.from : lvl(n) };
      }
    }
    if ((m = /^i live in (.+)$/.exec(q))) { const n = np(m[1]); if (n && n.from === 'table') return { he: `אני גר ${withPrep(n, 'ב')}`, f: `אני גרה ${withPrep(n, 'ב')}`, from: 'table' }; }
    if ((m = /^i work (?:in|at) (.+)$/.exec(q))) { const n = np(m[1]); if (n && n.from === 'table') return { he: `אני עובד ${withPrep(n, 'ב')}`, f: `אני עובדת ${withPrep(n, 'ב')}`, from: 'table' }; }
    if ((m = /^i am (\w+) years old$/.exec(q))) { const N = numEn.get(m[1]); if (N && N.n >= 1) return { he: `אני בן ${N.count}`, f: `אני בת ${N.count}`, from: 'table' }; }
    // clock times and when things start and end
    if ((m = /^at (.+)$/.exec(q))) { const t = clock(m[1]); if (t) return { he: `ב${t}`, from: 'table' }; }
    if ((m = /^it is (.+)$/.exec(q)) && / oclock$|half past|quarter past| 30$| thirty$| 15$| fifteen$/.test(m[1])) { const t = clock(m[1]); if (t) return { he: `השעה ${t}`, from: 'table' }; }
    if ((m = /^(.+) (starts|begins|ends|is) at (.+)$/.exec(q))) {
      const n = listed(m[1]); const t = clock(m[3]);
      if (n && t) { const v = m[2] === 'is' ? '' : m[2] === 'ends' ? byG(n, 'נגמר ', 'נגמרת ', 'נגמרים ', 'נגמרות ') : byG(n, 'מתחיל ', 'מתחילה ', 'מתחילים ', 'מתחילות '); return { he: `${n.he} ${v}ב${t}`, from: 'table' }; }
    }
    if ((m = /^(?:when|what time) does (.+) (start|begin|end)$/.exec(q))) {
      const n = listed(m[1]);
      if (n) return { he: `מתי ${n.he} ${m[2] === 'end' ? byG(n, 'נגמר', 'נגמרת', 'נגמרים', 'נגמרות') : byG(n, 'מתחיל', 'מתחילה', 'מתחילים', 'מתחילות')}?`, from: 'table' };
    }
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
    if ((m = /^i do not eat (.+)$/.exec(q))) { const n = np(m[1]); const x = n ? (nounEn.get(m[1])?.food || n.he) : ''; if (n) return { he: `אני לא אוכל ${x}`, f: `אני לא אוכלת ${x}`, from: lvl(n) }; }
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
    if ((m = /^i am allergic to (.+)$/.exec(q))) { const n = np(m[1]); const food = nounEn.get(m[1])?.food; if (n) return { he: `יש לי אלרגיה ${food ? 'ל' + food : withPrep(n, 'ל')}`, from: lvl(n) }; }
    if ((m = /^where is (?:the )?(?:nearest|closest) (.+)$/.exec(q)) || (m = /^where is (an? .+) (?:near here|nearby|around here)$/.exec(q))) { const n = np(m[1].replace(/^an? /, '')); if (n) return { he: `איפה יש ${n.kind === 'place' ? n.he : np(m[1].replace(/^(?:an?|the) /, '')).he} באזור?`, from: lvl(n) }; }
    if ((m = /^i (?:have )?lost (.+)$/.exec(q))) { const n = np(m[1]); if (n && n.definite) return { he: `איבדתי את ${n.he}`, from: lvl(n) }; }
    if ((m = /^where (?:is|are) (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `איפה ${n.he}?`, from: lvl(n) }; }
    if ((m = /^how do i get to (.+)$/.exec(q)) || (m = /^how can i get to (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `איך מגיעים ${withPrep(n, 'ל')}?`, from: lvl(n) }; }
    if ((m = /^how much (?:is|are|does|do) (.+?)(?: cost)?$/.exec(q))) {
      const n = np(m[1]);
      if (n) { const verb = n.g ? byG(n, 'עולה', 'עולה', 'עולים', 'עולות') : (/ים$/.test(n.he) ? 'עולים' : /ות$/.test(n.he) ? 'עולות' : 'עולה'); return { he: `כמה ${verb} ${n.he}?`, from: lvl(n) }; }
    }
    if ((m = /^(?:can|could) you tell me where (.+) (?:is|are)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `איפה ${n.he}?`, from: lvl(n) }; }
    if ((m = /^(?:what time|when) is (.+?)(?: (tomorrow|today|tonight))?$/.exec(q))) { const n = listed(m[1]); if (n) return { he: `מתי ${n.he}${m[2] === 'tomorrow' ? ' מחר' : m[2] === 'today' ? ' היום' : m[2] ? ' הערב' : ''}?`, from: 'table' }; }
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
    if ((m = /^זה עלה (.+)$/.exec(q))) { const n = enOf(m[1]); if (n && /shekel|dollar/.test(n.bare)) return { en: `It cost ${n.en}`, from: 'table' }; }
    if ((m = /^(.+?) לא (נסגר|נסגרת|נסגרים|נסגרות|נפתח|נפתחת|נפתחים|נפתחות)$/.exec(q))) {
      const sj = enOf(m[1]); const plural = /ים$|ות$/.test(m[2]);
      if (sj && sj.definite && sj.from === 'table') return { en: `${cap(sj.en)} ${plural ? "don't" : "doesn't"} ${/^נס/.test(m[2]) ? 'close' : 'open'}`, from: 'table' };
    }
    if ((m = /^(.+?) (מחכה|מחכים|מחכות)( בחוץ| בפנים| כאן)?$/.exec(q)) && !/^(?:אני|אנחנו|אתה|את|הוא|היא)$/.test(m[1])) {
      const sj = enOf(m[1]);
      if (sj && sj.definite && sj.from === 'table') return { en: `${cap(sj.en)} ${m[2] === 'מחכה' ? 'is' : 'are'} waiting${m[3] === ' בחוץ' ? ' outside' : m[3] === ' בפנים' ? ' inside' : m[3] ? ' here' : ''}`, from: 'table' };
    }
    if ((m = /^מתי (.+) (יוצא|יוצאת|יוצאים|יוצאות|מגיע|מגיעה|מגיעים|מגיעות)$/.exec(q))) { const sj = enOf(m[1]); if (sj && sj.definite && sj.from === 'table') return { en: `When does ${sj.en} ${/^יוצ/.test(m[2]) ? 'leave' : 'arrive'}?`, from: 'table' }; }
    if ((m = /^כמה רחוק (.+)$/.exec(q))) { const n = enOf(m[1]); if (n && n.from === 'table') return { en: `How far is ${n.en}?`, from: 'table' }; }
    if ((m = /^יש לכם את זה ב(.+)$/.exec(q))) { const col = adjHe.get(m[1]); if (col) return { en: `Do you have this in ${col.en[0]}?`, from: 'table' }; }
    if ((m = /^יש (.+)$/.exec(q)) && !/^(?:לי|לך|לנו|לכם|כאן|בזה) /.test(m[1] + ' ')) { const n = enOf(m[1]); if (n && n.from === 'table' && !n.definite && / /.test(m[1])) return { en: /s$/.test(n.bare) && !MASS.has(n.bare) ? `Are there ${n.bare}?` : `Is there ${a(n)}?`, from: 'table' }; }
    if ((m = /^אפשר לקחת אותי ל(.+)$/.exec(q))) { const n = afterPrep(m[1]); if (n) return { en: `Can you take me to ${n.en}?`, from: n.from }; }
    if ((m = /^אני מחכה ל(.+)$/.exec(q))) { const n = afterPrep(m[1]); if (n) return { en: `I am waiting for ${n.en}`, from: n.from }; }
    if ((m = /^לאן (.+) (?:נוסע|נוסעת|נוסעים|נוסעות)$/.exec(q))) { const n = enOf(m[1]); if (n && n.definite) return { en: `Where does ${n.en} go?`, from: n.from }; }
    if ((m = /^אתם מוכרים (.+)$/.exec(q))) { const n = enOf(m[1]); if (n) return { en: `Do you sell ${n.bare}?`, from: n.from }; }
    if ((m = /^(?:זה|זאת|אלה) (.+)$/.exec(q)) && !adjHe.has(m[1].split(' ')[0])) { const n = enOf(m[1]); if (n && n.from === 'table' && (n.definite || n.kind !== 'noun')) return { en: `This is ${n.en}`, from: 'table' }; }
    if ((m = /^מתי (.+) (מחר|היום|הערב)$/.exec(q))) { const n = enOf(m[1]); if (n && n.from === 'table' && n.definite) return { en: `When is ${n.en} ${m[2] === 'מחר' ? 'tomorrow' : m[2] === 'היום' ? 'today' : 'tonight'}?`, from: 'table' }; }
    if ((m = /^אני לא רוצה (.+)$/.exec(q))) { const v = /^ל/.test(m[1]) ? vpHe(m[1]) : null; const n = v ? null : enOf(m[1].replace(/^את /, '')); if (v) return { en: `I don't want to ${v.en}`, from: v.from }; if (n) return { en: `I don't want ${a(n)}`, from: n.from }; }
    if ((m = /^אני לא (?:צריך|צריכה) (.+)$/.exec(q))) { const v = /^ל/.test(m[1]) ? vpHe(m[1]) : null; const n = v ? null : enOf(m[1].replace(/^את /, '')); if (v) return { en: `I don't need to ${v.en}`, from: v.from }; if (n) return { en: `I don't need ${a(n)}`, from: n.from }; }
    if ((m = /^(.+?) (לא )?(עובד|עובדת|עובדים|עובדות)$/.exec(q)) && !/^(?:אני|אנחנו|אתה|את|הוא|היא)$/.test(m[1])) {
      const sj = enOf(m[1]); const plural = /ים$|ות$/.test(m[3]);
      if (sj && sj.definite && sj.from === 'table') return { en: `${cap(sj.en)} ${m[2] ? (plural ? "don't work" : "doesn't work") : (plural ? 'work' : 'works')}`, from: 'table' };
    }
    if ((m = /^(.+?) (על|ליד|מאחורי|מול) (.+)$/.exec(q))) {
      const sj = enOf(m[1]); const n = enOf(m[3]);
      if (sj && n && sj.definite && sj.from === 'table' && n.from === 'table') return { en: `${cap(sj.en)} is ${{ 'על': 'on', 'ליד': 'next to', 'מאחורי': 'behind', 'מול': 'in front of' }[m[2]]} ${n.definite || n.kind !== 'noun' ? n.en : withArticle(n.en)}`, from: 'table' };
    }
    if ((m = /^(?:איזה|איזו|אילו) (.+)$/.exec(q))) { const n = enOf(m[1]); if (n && n.from === 'table' && !n.definite) return { en: `Which ${n.bare}?`, from: 'table' }; }
    if ((m = /^אנחנו מ(.+)$/.exec(q))) { const n = enOf(m[1]); if (n && n.kind === 'place') return { en: `We are from ${n.en}`, from: 'table' }; }
    if ((m = /^נתראה ב(יום \S+|שבת)$/.exec(q)) && dayHe.has(m[1])) return { en: `See you on ${dayHe.get(m[1])}`, from: 'table' };
    if ((m = /^(.+?) (רוצה|רוצים|רוצות|צריך|צריכה|צריכים|צריכות) (.+)$/.exec(q)) && !/^(?:אני|אנחנו|אתה|את|אתם|הוא|היא|הם)$/.test(m[1])) {
      const sj = enOf(m[1]);
      if (sj && sj.definite && sj.from === 'table') {
        const plural = /ים$|ות$/.test(m[2]); const want = /^רוצ/.test(m[2]);
        const verb = want ? (plural ? 'want' : 'wants') : (plural ? 'need' : 'needs');
        const v = /^ל/.test(m[3]) ? vpHe(m[3]) : null; const n = v ? null : enOf(m[3].replace(/^את /, ''));
        if (v) return { en: `${cap(sj.en)} ${verb} to ${v.en}`, from: v.from };
        if (n) return { en: `${cap(sj.en)} ${verb} ${a(n)}`, from: n.from };
      }
    }
    if ((m = /^אני (?:גר|גרה) ב(.+)$/.exec(q))) { const n = enOf(m[1]) || afterPrep(m[1]); if (n && n.from === 'table') return { en: `I live in ${n.en}`, from: 'table' }; }
    if ((m = /^אני (?:עובד|עובדת) ב(.+)$/.exec(q))) { const n = enOf(m[1]) || afterPrep(m[1]); if (n && n.from === 'table') return { en: `I work in ${n.en}`, from: 'table' }; }
    if ((m = /^אני (?:בן|בת) (.+)$/.exec(q))) { const n = numbersToEn(m[1]); if (n) return { en: `I am ${n} years old`, from: 'table' }; }
    if ((m = /^נתראה מחר ב(.+)$/.exec(q))) { const t = clockEn(m[1]); if (t) return { en: `See you tomorrow at ${t}`, from: 'table' }; }
    if ((m = /^נתראה ב(.+)$/.exec(q))) { const t = clockEn(m[1]); if (t) return { en: `See you at ${t}`, from: 'table' }; }
    if ((m = /^השעה (.+ ו(?:חצי|רבע))$/.exec(q))) { const t = clockEn(m[1]); if (t) return { en: `It is ${t}`, from: 'table' }; }
    if ((m = /^מתי (.+) (מתחיל|מתחילה|מתחילים|מתחילות|נגמר|נגמרת|נגמרים|נגמרות)$/.exec(q))) { const n = the(m[1]); if (n) return { en: `When does ${n.en} ${/^מת/.test(m[2]) ? 'start' : 'end'}?`, from: n.from }; }
    if ((m = /^(.+?) (מתחיל |מתחילה |מתחילים |מתחילות |נגמר |נגמרת |נגמרים |נגמרות )?ב(\S+(?: ו(?:חצי|רבע))?)$/.exec(q))) {
      const n = the(m[1]); const t = clockEn(m[3]);
      if (n && n.definite && t) return { en: `${cap(n.en)} ${!m[2] ? 'is' : /^מת/.test(m[2]) ? 'starts' : 'ends'} at ${t}`, from: n.from };
    }
    if ((m = /^ב(\S+(?: ו(?:חצי|רבע))?)$/.exec(q))) { const t = clockEn(m[1]); if (t) return { en: `At ${t}`, from: 'table' }; }
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
    {
      // "הילדים רעבים", "החדר לא נקי", "האוכל היה קר מאוד", "אני עייפה", "זה יקר מדי"
      const toks = q.split(' ');
      let end = toks.length; let when = ''; let degree = '';
      if (toks[end - 1] === 'היום' || toks[end - 1] === 'עכשיו') { when = toks[end - 1] === 'היום' ? ' today' : ' now'; end -= 1; }
      if (toks[end - 1] === 'מאוד' || toks[end - 1] === 'מדי') { degree = toks[end - 1] === 'מאוד' ? 'very ' : 'too '; end -= 1; }
      const adj = end >= 2 ? adjHe.get(toks[end - 1]) : null;
      if (adj) {
        let k = end - 1; let not = '';
        if (toks[k - 1] === 'לא') { not = 'not '; k -= 1; }
        let past = false;
        if (['היה', 'הייתה', 'היו', 'הייתי', 'היינו'].includes(toks[k - 1])) { past = true; k -= 1; }
        const st = toks.slice(0, k).join(' ');
        const plural = /^(?:ים|ות)$/.test(toks[end - 1].slice(-2)) && toks[end - 1] !== adj.m && toks[end - 1] !== adj.f;
        const be = (sing, plu) => (past ? (plu ? 'were' : 'was') : (plu ? 'are' : sing));
        let subj = '';
        if (st === 'אני') subj = `I ${past ? 'was' : 'am'}`;
        else if (st === 'אנחנו') subj = `We ${past ? 'were' : 'are'}`;
        else if (st === 'אתה' || st === 'את' || st === 'אתם') subj = `You ${past ? 'were' : 'are'}`;
        else if (st === 'זה' || st === 'זאת') subj = `It ${past ? 'was' : 'is'}`;
        else { const n = st ? enOf(st) : null; if (n && n.definite && n.from === 'table') subj = `${cap(n.en)} ${be('is', plural)}`; }
        if (subj) return { en: `${subj} ${not}${degree}${adj.en[0]}${when}`, from: /** @type {'table'} */ ('table') };
      }
    }
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
   * Stored lines that sound or look like the request (letters compared with the spaces taken out), nearest first.
   * Used only to offer "Did you mean" choices: a line found this way is never given as the answer.
   */
  function soundsLike(text, lang) {
    const flat = (x) => (lang === 'he' ? normHe(x) : normEn(x)).replace(/ /g, '');
    const want = flat(text);
    if (want.length < 4) return [];
    /** @type {{pair:Pair, sim:number}[]} */ const out = [];
    for (const p of pairs) {
      let best = 0;
      for (const c of (lang === 'he' ? [p.he, p.f, p.toF, ...(p.alt || [])] : p.en)) {
        if (!c) continue;
        const f = flat(c); const cap2 = Math.ceil(Math.max(want.length, f.length) * 0.3);
        const d = editDistance(want, f, cap2);
        if (d <= cap2) { const sim = 1 - d / Math.max(want.length, f.length); if (sim > best) best = sim; }
      }
      if (best >= 0.7) out.push({ pair: p, sim: best });
    }
    return out.sort((x, y) => y.sim - x.sim);
  }
  /** Suggestions for a refused line: lines that sound like it first, then lines that share its words. */
  function suggest(text, lang, near) {
    const like = soundsLike(text, lang).slice(0, 3);
    const seen = new Set(like.map((x) => x.pair.id));
    const rest = near.filter((x) => x.score >= 0.5 && !seen.has(x.pair.id)).slice(0, 3 - like.length);
    return { suggestions: [...like, ...rest].map((x) => brief(x.pair)), soundsLike: like.length > 0 };
  }

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
        if (p.other) variants.push({ label: 'Feminine form', text: please(p.otherPointed || p.other) }); // shown as stored, with its vowel marks
        /** @type {TalkResult} */
        const r = { ok: true, direction, source, translation: please(main), method, confidence, matched: brief(p), variants };
        if (p.pointed && main === p.he) r.pointed = please(p.pointed);
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
        return { ...r, translation: strip(r.translation), ...(r.pointed ? { pointed: strip(r.pointed) } : {}), variants: (r.variants || []).map((v) => ({ ...v, text: strip(v.text) })) };
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
      return none(suggest(source, 'en', near));
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
    if (pat && /[?]\s*$/.test(source) && !/[?]$/.test(pat.en)) {
      // a Hebrew question often differs from the statement only by its question mark: "הרב כאן היום?" asks, it does not tell
      const mq = /^(The .+?|My .+?|Our .+?|This|It|You|We|I) (is|are|was|were|am) (.+)$/.exec(cap(pat.en));
      if (mq) pat.en = `${cap(mq[2])} ${/^(?:I)$/.test(mq[1]) ? 'I' : mq[1][0].toLowerCase() + mq[1].slice(1)} ${mq[3]}?`;
    }
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
    return none(suggest(source, 'he', near));
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

  // A Hebrew answer that is word for word a phrasebook line carries that line's clip id, whichever stored pair produced it.
  /** @type {Map<string,string>} */ const clipByHe = new Map();
  // Pointed phrasebook text drops the vowel letters everyday spelling adds ("בקר" for "בוקר"), so the comparison leaves ו and י out.
  const spine = (x) => normHe(x).replace(/[וי]/g, '');
  for (const p of pairs) if (p.clip) { const k = spine(p.he); if (k && !clipByHe.has(k)) clipByHe.set(k, p.clip); }
  /** @type {typeof translate} */
  const translateWithClip = (text, o) => {
    const r = translate(text, o);
    if (r.ok && r.direction === 'en-he') { const id = clipByHe.get(spine(r.translation)); if (id) r.clip = { kind: 'line', id }; }
    return r;
  };

  return {
    translate: translateWithClip,
    setDictionary,
    get hasDictionary() { return hasDict; },
    size: { pairs: pairs.length, nouns: nounEn.size, names: nameEn.size },
    /** Stored lines of one group, for the "Try saying" list. */
    examples(cat, n = 6) { return (pack.phrases || []).filter((p) => !cat || p.cat === cat).slice(0, n).map((p) => ({ id: p.id, en: p.en[0], he: p.he })); },
    categories() { return [...new Set((pack.phrases || []).map((p) => p.cat))]; },
  };
}
