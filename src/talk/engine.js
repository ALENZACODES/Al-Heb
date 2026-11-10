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
export const looseHeTokens = (s) => normHe(s).split(' ').filter((w) => w && !HE_FILLER.has(w));

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
const PREFIX_GLOSS = { 'ו': 'and', 'ה': 'the', 'ב': 'in', 'ל': 'to', 'מ': 'from', 'ש': 'that', 'כ': 'like' };

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
    }
    index.push({ pair: p, en: p.en.map(looseEnTokens), he: heAll.map(looseHeTokens) });
  }

  // ---- nouns, places, names, numbers ---------------------------------------------------------------------------
  /** @type {Map<string, {en:string, he:string, def:string, kind:string}>} */ const nounEn = new Map();
  /** @type {Map<string, {en:string, definite:boolean, kind:string}>} */ const nounHe = new Map();
  for (const n of pack.nouns || []) {
    const def = n.def || 'ה' + n.he;
    for (const e of n.en) if (!nounEn.has(e)) nounEn.set(e, { en: n.en[0], he: n.he, def, kind: 'noun' });
    if (!nounHe.has(n.he)) nounHe.set(n.he, { en: n.en[0], definite: n.he === def, kind: 'noun' });
    if (!nounHe.has(def)) nounHe.set(def, { en: n.en[0], definite: true, kind: 'noun' });
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
  for (const n of NUMS) {
    for (const e of n.en) numEn.set(e, n);
    numEn.set(String(n.n), n);
    for (const hx of [n.count, n.m, n.mConstruct]) if (hx && !numHe.has(hx)) numHe.set(hx, n);
  }

  // ---- dictionary (optional, loaded by the screen only when a line needs it) -------------------------------------
  /** @type {Map<string, {he:string, pointed:string, rank:number, verb:boolean}>} */ let dictEn = new Map();
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
      for (let term of glossTerms(gloss)) {
        if (verb) term = term.replace(/^to /, '');
        if (!term) continue;
        const cur = dictEn.get(term);
        if (!cur || rank < cur.rank) dictEn.set(term, { he, pointed, rank, verb });
      }
    }
    hasDict = dictHe.size > 0;
  }
  if (data.dictRows) setDictionary(data.dictRows);

  // ---- noun phrases ---------------------------------------------------------------------------------------------
  /** English noun phrase -> Hebrew. @returns {{he:string, def:string, definite:boolean, from:'table'|'dictionary', kind:string}|null} */
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
      if (d && !d.verb) { hit = { en: t, he: d.he, def: 'ה' + d.he, kind: 'noun' }; from = 'dictionary'; }
    }
    if (!hit) {
      // "tea with milk", "coffee without sugar", "bread and cheese"
      const c = /^(.+?) (with|without|and) (.+)$/.exec(t);
      if (c && !deep) {
        const a = np((m ? m[1] + ' ' : '') + c[1], true); const b = np(c[3], true);
        if (a && b) {
          const link = c[2] === 'with' ? ' עם ' : c[2] === 'without' ? ' בלי ' : ' ו';
          return { he: a.he + link + b.he, def: a.def + link + b.he, definite: a.definite, from: a.from === 'dictionary' || b.from === 'dictionary' ? 'dictionary' : 'table', kind: 'noun' };
        }
      }
      return null;
    }
    if (hit.kind === 'place') return { he: hit.he, def: hit.he, definite: true, from, kind: 'place' };
    const def = mine ? `${hit.def} שלי` : hit.def;
    return { he: definite ? def : hit.he, def, definite, from, kind: hit.kind };
  }
  /** Attach a one-letter preposition (ל, ב, מ): the article ה folds into it. */
  const withPrep = (n, prep) => prep + (n.definite && n.kind !== 'place' && n.he.startsWith('ה') ? n.he.slice(1) : n.he);
  const obj = (n) => (n.definite ? 'את ' : '') + n.he; // definite direct object takes את

  /** Hebrew noun phrase -> English ("the hospital", "coffee", "two tickets"). */
  function enOf(heText) {
    const t = normHe(heText);
    if (!t) return null;
    const hit = nounHe.get(t);
    if (hit) return { en: hit.kind === 'place' ? hit.en : (hit.definite ? 'the ' + hit.en : hit.en), bare: hit.en, definite: hit.definite, from: 'table', kind: hit.kind };
    const parts = t.split(' ');
    if (parts.length === 2 && numHe.has(parts[0])) {
      const rest = enOf(parts[1]);
      if (rest) return { en: `${numHe.get(parts[0]).en[0]} ${rest.bare}`, bare: rest.bare, definite: false, from: rest.from, kind: 'count' };
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
      const one = numHe.get(toks[i]);
      if (!one) return null;
      out.push(one.en[0]); i += 1;
    }
    return out.join(' ');
  };

  // ---- English -> Hebrew patterns ---------------------------------------------------------------------------------
  /** @returns {{he:string, f?:string, from:'table'|'dictionary', note?:string}|null} */
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
      if (n) { const verb = /ים$/.test(n.he) ? 'עולים' : /ות$/.test(n.he) ? 'עולות' : 'עולה'; return { he: `כמה ${verb} ${n.he}?`, from: lvl(n) }; }
    }
    if ((m = /^(?:can|could|may) i (?:have|get) (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `אפשר ${obj(n)}?`, from: lvl(n) }; }
    if ((m = /^(?:i want|i would like|i will have) (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `אני רוצה ${obj(n)}`, from: lvl(n) }; }
    if ((m = /^i need (.+)$/.exec(q))) { const n = np(m[1]); if (n) return { he: `אני צריך ${obj(n)}`, f: `אני צריכה ${obj(n)}`, from: lvl(n) }; }
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
    if ((m = /^עוד (.+)$/.exec(q))) { const n = enOf(m[1]); if (n) return { en: `More ${n.bare}`, from: n.from }; }
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

  /** Hebrew word by word: every word must resolve, or the answer is refused. */
  function wordByWord(q) {
    const toks = normHe(q).split(' ').filter(Boolean);
    if (!toks.length || toks.length > 12) return null;
    const out = [];
    for (const w of toks) {
      const direct = heExact.get(w)?.en[0] || nounHe.get(w)?.en || numHe.get(w)?.en[0] || dictHe.get(w)?.en;
      if (direct) { out.push(direct.toLowerCase()); continue; }
      const pre = PREFIX_GLOSS[w[0]];
      const rest = w.slice(1);
      const inner = pre && rest.length >= 2 ? (nounHe.get(rest)?.en || numHe.get(rest)?.en[0] || dictHe.get(rest)?.en) : null;
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
      const q = normEn(source);
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
      const exact = enExact.get(q) || enExact.get(bare) || enLoose.get(looseEn(q));
      if (exact) return fromPair(exact, 'phrase', 'high');
      const pat = patternEnHe(bare);
      if (pat) {
        const main = woman && pat.f ? pat.f : pat.he;
        /** @type {{label:string, text:string}[]} */ const variants = [];
        if (pat.f) variants.push(woman ? { label: 'Said by a man', text: please(pat.he) } : { label: 'Said by a woman', text: please(pat.f) });
        const fromDict = pat.from === 'dictionary';
        return { ok: true, direction, source, translation: please(main), method: 'pattern', confidence: fromDict ? 'low' : 'medium', variants,
          note: pat.note || (fromDict ? 'Built from a sentence pattern and a dictionary word. Check it before you rely on it.' : 'Built from a sentence pattern.') };
      }
      const single = np(bare);
      if (single) return { ok: true, direction, source, translation: please(single.he), method: 'word', confidence: single.from === 'table' ? 'medium' : 'low', note: single.from === 'table' ? undefined : 'One dictionary word. It may not be the sense you meant.' };
      const verb = !bare.includes(' ') ? dictEn.get(bare) : null;
      if (verb) return { ok: true, direction, source, translation: verb.he, pointed: verb.pointed, method: 'word', confidence: 'low', note: verb.verb ? 'A dictionary verb, in its basic "he did" form.' : 'One dictionary word. It may not be the sense you meant.' };
      const toks = looseEnTokens(q);
      const parts = o.whole === false ? null : joinParts(source, o);
      if (parts) return parts;
      const near = nearest(toks, 'en', EN_SOFT);
      if (near.length && near[0].safe) return fromPair(near[0].pair, 'close', 'medium', `Closest line I know: “${near[0].pair.en[0]}”`);
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
    const pat = patternHeEn(q);
    if (pat) return { ok: true, direction, source, translation: cap(pat.en), method: 'pattern', confidence: pat.from === 'dictionary' ? 'low' : 'medium',
      note: pat.from === 'dictionary' ? 'Built from a sentence pattern and a dictionary word. Check it before you rely on it.' : 'Built from a sentence pattern.' };
    const toks = looseHeTokens(q);
    const parts = o.whole === false ? null : joinParts(source, o);
    if (parts) return parts;
    const near = nearest(toks, 'he', HE_SOFT);
    if (near.length && near[0].safe) return { ok: true, direction, source, translation: polite(cap(near[0].pair.en[0])), method: 'close', confidence: 'medium', matched: brief(near[0].pair), note: `Closest line I know: “${near[0].pair.he}”` };
    const words = wordByWord(q);
    if (words) return { ok: true, direction, source, translation: words, method: toks.length <= 1 ? 'word' : 'words', confidence: 'low', note: toks.length <= 1 ? 'One dictionary word. It may not be the sense you meant.' : 'Word by word, not a sentence. Use it to get the gist only.' };
    return none({ suggestions: near.filter((x) => x.score >= 0.5).slice(0, 3).map((x) => brief(x.pair)) });
  }

  /** A line with commas or several short sentences: every part must translate on its own, or the whole is refused. */
  function joinParts(source, o) {
    const segs = source.split(/[,.;!?،]+/).map((x) => x.trim()).filter(Boolean);
    if (segs.length < 2 || segs.length > 4) return null;
    const rs = segs.map((x) => translate(x, { ...o, whole: false }));
    if (!rs.every((r) => r.ok && r.method !== 'words' && r.direction === rs[0].direction)) return null;
    const question = /[?]\s*$/.test(source);
    const text = rs.map((r, i) => { const t = r.translation.replace(/[.?!]+$/, ''); return i && r.direction === 'he-en' && !/^I\b/.test(t) ? t[0].toLowerCase() + t.slice(1) : t; }).join(', ') + (question ? '?' : '');
    const low = rs.some((r) => r.confidence === 'low');
    return /** @type {TalkResult} */ ({ ok: true, direction: rs[0].direction, source, translation: text, method: 'pattern', confidence: low ? 'low' : 'medium', variants: [],
      note: low ? 'Put together from parts, one of them a dictionary word. Check it before you rely on it.' : 'Put together from stored parts.' });
  }

  return {
    translate,
    setDictionary,
    get hasDictionary() { return hasDict; },
    size: { pairs: pairs.length, nouns: nounEn.size, names: nameEn.size },
    /** Stored lines of one group, for the "Try saying" list. */
    examples(cat, n = 6) { return (pack.phrases || []).filter((p) => !cat || p.cat === cat).slice(0, n).map((p) => ({ id: p.id, en: p.en[0], he: p.he })); },
    categories() { return [...new Set((pack.phrases || []).map((p) => p.cat))]; },
  };
}
