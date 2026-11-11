// @ts-check
// Talk: a number must come through a translation unchanged. No DOM, no storage.
//
// The language pack reads a number as word pieces and sometimes copies it wrongly. Found by running lines with numbers
// through the shipped pack: "054-123-4567" came back as "054-113-4567", "18:40" as "6:40", "20:30" as "8:30",
// "Table for 6 at 20:30" as a table "for 6: 30", "50 שקלים" as "50 bucks" and "12.50 שקלים" as "$12.50".
// A wrong time, price or phone number is the worst mistake a phrase translator can make, because it reads fine.
// So every pack line is checked against the line as typed:
//   1. money signs the pack does not know (₪, ש"ח, NIS) are written as the word before the pack sees the line;
//   2. the numbers of the answer are compared with the numbers typed. A changed one is put back when it is clear which
//      one it was; "9: 15" is closed up to "9:15"; shekels that came back as dollars are shekels again, and kilos that
//      came back as pounds ("81 קילו" -> "81 pounds") or kilometres as miles are put back too;
//   3. when the numbers still do not match, the line is translated once more with each number swapped for a stand-in the
//      pack copies as it stands (417, 528, ...), and the typed numbers are put back in their places;
//   4. if that fails too, the answer is shown with a note to check the numbers.
// A small number the pack wrote as a word ("7 days" -> "שבעה ימים") is right and is left alone. The caller says how a
// number is written as a word (the stored number table); a small number that is in the answer neither as digits nor as
// a word counts as lost ("Table for 10 at 10:10" came back as a table "for 10:10").

/** A number as typed: digits, with ".", ",", ":", "/" or "-" between digits ("054-123-4567", "12.50", "20:30", "12/05/2027"). */
const NUMBER = /\d+(?:[.,:/-]\d+)*/g;
const AMOUNT = String.raw`\d+(?:[.,]\d+)*`;

/** @typedef {{text:string, index:number, key:string}} NumberToken  key: the digits alone */

/** @param {string} text @returns {NumberToken[]} */
export function numbersIn(text) {
  const out = [];
  for (const m of String(text || '').matchAll(NUMBER)) out.push({ text: m[0], index: m.index ?? 0, key: m[0].replace(/\D/g, '') });
  return out;
}

const shekelsEn = (n) => `${n} ${n === '1' ? 'shekel' : 'shekels'}`;
const shekelsHe = (n) => `${n} ${n === '1' ? 'שקל' : 'שקלים'}`;

/**
 * Before the pack: the shekel sign and its short forms written out as the word, which the pack knows.
 * ("It costs ₪120." came back with a black square for the sign; "50 ש"ח" came back as plain "50".)
 * @param {string} text @param {string} direction 'en-he' | 'he-en'
 */
export function plainMoney(text, direction) {
  const t = String(text || '');
  if (direction === 'en-he') {
    return t.replace(new RegExp(String.raw`₪\s?(${AMOUNT})`, 'g'), (_, n) => shekelsEn(n))
      .replace(new RegExp(String.raw`(${AMOUNT})\s?(?:₪|NIS\b|ILS\b)`, 'g'), (_, n) => shekelsEn(n));
  }
  return t.replace(new RegExp(String.raw`₪\s?(${AMOUNT})`, 'g'), (_, n) => shekelsHe(n))
    .replace(new RegExp(String.raw`(${AMOUNT})\s?(?:₪|ש["״]ח)`, 'g'), (_, n) => shekelsHe(n));
}

/**
 * After the pack, Hebrew to English: shekels stay shekels. The pack often answers a shekel price in dollars
 * ("50 שקלים" -> "50 bucks", "12.50 שקלים" -> "$12.50"). Only when the line names shekels and no dollars.
 * @param {string} out @param {string} source @param {string} direction
 */
export function keepShekels(out, source, direction) {
  const o = String(out || '');
  if (direction !== 'he-en' || !/שקל|ש["״]ח|₪/.test(source) || /דולר|\$/.test(source)) return o;
  return o.replace(new RegExp(String.raw`\$\s?(${AMOUNT})`, 'g'), (_, n) => shekelsEn(n))
    .replace(/\b(?:bucks|dollars)\b/gi, 'shekels').replace(/\b(?:buck|dollar)\b/gi, 'shekel');
}

// ---- units of measure ----
// The pack swaps a unit for its cousin and keeps the number: "81 קילו" -> "81 pounds", "417 קילומטר" -> "417 miles",
// "5 miles" -> "5 קילומטרים". Or it converts both, roughly: "196 סנטימטר" -> 6'2". Either way the line now says another
// amount. Hebrew to English, a metric word of the line is put back after its number. Any other change of family
// (metric to feet-and-pounds or back) is reported, and the numbers are not touched: a typed number put back beside the
// wrong unit would be worse than what the pack wrote.
const HE = String.raw`(?<![א-ת])[ולבכמשה]{0,2}`;
const METRIC_EN = /\b(?:kilomet(?:er|re)s?|km|kilograms?|kilos?|kg|met(?:er|re)s?|centimet(?:er|re)s?|cm|millimet(?:er|re)s?|mm|lit(?:er|re)s?|grams?|celsius)\b/i;
// "foot", "feet" and "yard" are everyday words too ("on foot", "my feet", "the yard"): they count as units only after a number
const IMPERIAL_EN = /\b(?:miles?|pounds?|lbs?|inch(?:es)?|ounces?|oz|gallons?|acres?|fahrenheit)\b|\d[\s-]?(?:feet|foot|ft|yards?)\b/i;
const FEET_AND_INCHES = /\d\s?['′’]\s?\d/;
const METRIC_HE = new RegExp(`${HE}(?:קילומטר(?:ים)?|ק["״]מ|קילוגרם|קילו|ק["״]ג|סנטימטר(?:ים)?|ס["״]מ|מילימטר(?:ים)?|מטר(?:ים)?|ליטר(?:ים)?|גרם|דונם|צלזיוס)(?![\u05D0-\u05EA])`, 'u');
const IMPERIAL_HE = new RegExp(`${HE}(?:מייל(?:ים)?|פאונד(?:ים)?|ליברה|ליברות|אינץ'?|אינצ'ים|גלון|גלונים|פרנהייט)(?![\u05D0-\u05EA])`, 'u');

/** True when the answer measures in the other family of units than the line (kilos against pounds), or in feet and inches the line never had. */
export function unitsChanged(source, answer) {
  const src = { metric: METRIC_EN.test(source) || METRIC_HE.test(source), imperial: IMPERIAL_EN.test(source) || IMPERIAL_HE.test(source) };
  const ans = { metric: METRIC_EN.test(answer) || METRIC_HE.test(answer), imperial: IMPERIAL_EN.test(answer) || IMPERIAL_HE.test(answer) };
  if (src.metric && !src.imperial && ans.imperial) return true;
  if (src.imperial && !src.metric && ans.metric) return true;
  return FEET_AND_INCHES.test(answer) && !FEET_AND_INCHES.test(source);
}

/** [the Hebrew unit in the line, its English cousin the pack writes, the right English word, singular and plural] */
const UNIT_BACK = [
  [new RegExp(`${HE}(?:קילוגרם|קילו|ק["״]ג)(?![\u05D0-\u05EA])`, 'u'), /\b(pounds?|lbs?)\b/i, 'kilo', 'kilos', /\bkilo/i],
  [new RegExp(`${HE}(?:קילומטר(?:ים)?|ק["״]מ)(?![\u05D0-\u05EA])`, 'u'), /\b(miles?)\b/i, 'kilometer', 'kilometers', /\bkilomet/i],
  [new RegExp(`${HE}(?:סנטימטר(?:ים)?|ס["״]מ)(?![\u05D0-\u05EA])`, 'u'), /\b(inch(?:es)?)\b/i, 'centimeter', 'centimeters', /\bcentimet/i],
  [new RegExp(`${HE}(?:ליטר(?:ים)?)(?![\u05D0-\u05EA])`, 'u'), /\b(gallons?)\b/i, 'liter', 'liters', /\blit(?:er|re)/i],
  [new RegExp(`${HE}(?:גרם)(?![\u05D0-\u05EA])`, 'u'), /\b(ounces?|oz)\b/i, 'gram', 'grams', /\bgram/i],
  [new RegExp(`${HE}(?:דונם)(?![\u05D0-\u05EA])`, 'u'), /\b(acres?)\b/i, 'dunam', 'dunams', /\bdunam/i], // land in Israel is measured in dunams: 32 of them are not 32 acres
];
/**
 * After the pack, Hebrew to English: a metric unit of the line that came back as its cousin, right after a number, is put
 * back ("81 pounds" -> "81 kilos"). Only when the line has the metric word and the answer does not.
 * English to Hebrew is not put back: the Hebrew words for miles and pounds are not in this project's sources. It is reported.
 */
export function keepUnits(out, source, direction) {
  let o = String(out || '');
  if (direction !== 'he-en' || IMPERIAL_HE.test(source)) return o;
  for (const [inLine, cousin, one, many, already] of UNIT_BACK) {
    if (!inLine.test(source) || already.test(o)) continue;
    o = o.replace(new RegExp(String.raw`(\d+(?:[.,]\d+)*)(\s?)${cousin.source}`, 'gi'), (_, n, gap) => `${n}${gap || ' '}${n === '1' ? one : many}`);
  }
  return o;
}

/** The form of a number: "9:9" for a time, "9-9-9" for a phone number, "9.9", "9/9/9", "9". */
const shape = (text) => text.replace(/\d+/g, '9');
/** A number the pack would not write as a word: one with a mark inside it, or three digits and more that are not round. */
const neverAWord = (tok) => /\D/.test(tok.text) || (tok.key.length >= 3 && !/^[1-9]0+$/.test(tok.key));

function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) { const keep = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = keep; }
  }
  return row[b.length];
}

const CLOCK = /^(\d{1,2}):(\d{2})$/;
const AFTERNOON_AFTER = /^\s?(?:p\.?\s?m\b|in the (?:evening|afternoon)|at night|בערב|בלילה|אחר הצהריים|אחרי הצהריים|אחה["״]צ)/i;
/**
 * True when `typed` (a number of the line) and `got` (a number of the answer) are one clock time twelve hours apart on the
 * dial, and the side written in the twelve-hour way says it is after noon ("p.m.", "in the evening", "בערב").
 */
function sameClockTime(typed, got, source, answer) {
  const a = CLOCK.exec(typed.text), b = CLOCK.exec(got.text);
  if (!a || !b || a[2] !== b[2]) return false;
  const ha = Number(a[1]), hb = Number(b[1]);
  if (ha === hb + 12 && hb >= 1 && hb <= 11) return AFTERNOON_AFTER.test(answer.slice(got.index + got.text.length));   // 21:45 -> 9:45 p.m.
  if (hb === ha + 12 && ha >= 1 && ha <= 11) return AFTERNOON_AFTER.test(source.slice(typed.index + typed.text.length)); // 9:45 p.m. -> 21:45
  return false;
}

/** Tokens of `a` that have no partner in `b`, counting repeats. */
function unmatched(a, b) {
  const left = new Map();
  for (const t of b) left.set(t.key, (left.get(t.key) || 0) + 1);
  return a.filter((t) => { const n = left.get(t.key) || 0; if (n) { left.set(t.key, n - 1); return false; } return true; });
}

/** True when `word` stands in `text` as a word of its own; a Hebrew word may carry one or two prefix letters ("לשניים", "ובשש"). */
export function hasWord(text, word) {
  const w = String(word || '').trim().toLowerCase().replace(/[-\s]+/g, ' ');
  if (!w) return false;
  const t = ` ${String(text || '').toLowerCase().replace(/[\u0591-\u05C7]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
  if (/[\u05D0-\u05EA]/.test(w)) return new RegExp(` [ולבכמשה]{0,2}${w} `, 'u').test(t);
  return t.includes(` ${w} `);
}

/**
 * Compare the numbers of an answer with the numbers of the line it answers, and put back what can be put back.
 * @param {string} out the answer @param {string} source the line as given to the pack
 * @param {{wordsFor?:(n:number)=>string[]}} [opts] wordsFor: the ways a small number is written as a word, in both languages.
 *   A small typed number must be in the answer as digits or as one of those words. Without the list only digits count.
 * @returns {{text:string, state:'same'|'fixed'|'unsure'}}
 *   same: every number that could be checked is as typed.  fixed: one or more were put back, and all now match.
 *   unsure: a number is missing or strange and could not be put back.
 */
export function settleNumbers(out, source, opts = {}) {
  let text = String(out || '');
  const typed = numbersIn(source);
  if (!typed.length) return { text, state: 'same' }; // no number was typed: nothing to compare ("half past eight" -> "8:30" is fine)
  let fixed = false;
  // "9: 15" -> "9:15", when the line has a clock time in it
  if (typed.some((t) => CLOCK.test(t.text))) { const closed = text.replace(/(\d{1,2}):\s+(\d{2})(?!\d)/g, '$1:$2'); if (closed !== text) { text = closed; fixed = true; } }
  const unsure = { text, state: /** @type {'unsure'} */ ('unsure') }; // an answer that is not settled goes back as the pack wrote it
  if (unitsChanged(source, text)) return unsure;
  const got = numbersIn(text);
  // the same digits in the same order: nothing is lost. The numbers are written the way they were typed again
  // ("8.386" for "8,386", "13: 06.2028" for "13.06.2028", "44719920" for "4471 9920").
  if (typed.map((t) => t.key).join('') === got.map((t) => t.key).join('')) {
    const again = asTyped(text, got, typed, source);
    if (again !== null) return { text: again, state: fixed || again !== text ? 'fixed' : 'same' };
  }
  let missing = unmatched(typed, got);
  let strange = unmatched(got, typed);
  // a clock time said the other way round is not a mistake when the half of the day is said with it:
  // "21:45" answered as "9:45 p.m.", or "9:45 p.m." answered as "21:45". Those pairs are left as they are.
  for (const s of [...strange]) {
    const pair = missing.find((m) => sameClockTime(m, s, source, text));
    if (pair) { strange = strange.filter((x) => x !== s); missing = missing.filter((x) => x !== pair); }
  }
  // a small number that is in the answer as a word is not missing ("7 days" -> "שבעה ימים").
  // "1" may be just the singular ("1 ticket" -> "כרטיס"), and "3rd" may be an ordinal word: those two are let through.
  const wordsFor = opts.wordsFor || (() => []);
  const asWord = (m) => !neverAWord(m) && (Number(m.key) === 1 || /^[A-Za-z]/.test(source.slice(m.index + m.text.length))
    || wordsFor(Number(m.key)).some((w) => hasWord(text, w)));
  missing = missing.filter((m) => !asWord(m));
  // put back a changed number where it is clear which typed number it was: the same form and nearly the same digits
  const swaps = [];
  for (const s of [...strange]) {
    const like = missing.filter((m) => shape(m.text) === shape(s.text) && near(m, s)).sort((x, y) => distance(x.key, s.key) - distance(y.key, s.key))[0]
      || (strange.length === 1 && missing.length === 1 && near(missing[0], s) ? missing[0] : null);
    if (!like) continue;
    swaps.push({ at: s.index, len: s.text.length, put: like.text });
    missing = missing.filter((m) => m !== like); strange = strange.filter((x) => x !== s);
  }
  // still not typed: a long or marked number is wrong. A short one is a word the pack wrote in digits
  // ("twenty-four hours" -> "24 שעות") unless something typed is still missing.
  if (missing.length || strange.some(neverAWord)) return unsure;
  for (const w of swaps.sort((x, y) => y.at - x.at)) { text = text.slice(0, w.at) + w.put + text.slice(w.at + w.len); fixed = true; } // last first: the places of the earlier ones do not move
  // a number with the right digits written another way goes back to the way it was typed ("1.250" for "1,250")
  const again = sameDigitsAsTyped(text, typed);
  return { text: again, state: fixed || again !== text ? 'fixed' : 'same' };
}

const NO_LETTERS = /^[^\p{L}\p{N}]*$/u;
/** Replace spans of `text`, given as {at, len, put}, last first. */
const put = (text, spans) => [...spans].sort((x, y) => y.at - x.at).reduce((t, w) => t.slice(0, w.at) + w.put + t.slice(w.at + w.len), text);

/** Each number of the answer that has the digits of a typed number but is written another way is written as typed. */
function sameDigitsAsTyped(text, typed) {
  const forms = new Map();
  for (const t of typed) { if (!forms.has(t.key)) forms.set(t.key, []); forms.get(t.key).push(t.text); }
  const spans = [];
  for (const g of numbersIn(text)) { const q = forms.get(g.key); if (!q || !q.length) continue; const want = q.shift(); if (want !== g.text) spans.push({ at: g.index, len: g.text.length, put: want }); }
  return put(text, spans);
}

/**
 * The answer has the typed digits in the typed order. Where they are cut differently the typed form is put back:
 * several pieces that make one typed number ("13: 06.2028") become that number, and one piece that is several typed
 * numbers run together ("44719920") is cut as typed. Only marks and spaces may lie between the pieces, never a word:
 * then it returns null and the numbers are compared one by one.
 * @returns {string|null}
 */
function asTyped(text, got, typed, source) {
  const spans = [];
  let i = 0, j = 0;
  while (i < typed.length && j < got.length) {
    if (typed[i].key === got[j].key) { if (typed[i].text !== got[j].text) spans.push({ at: got[j].index, len: got[j].text.length, put: typed[i].text }); i++; j++; continue; }
    let k = j, joined = got[j].key;
    while (joined.length < typed[i].key.length && k + 1 < got.length) { k++; joined += got[k].key; }
    if (joined === typed[i].key) {                                                      // pieces of one typed number
      const end = got[k].index + got[k].text.length;
      if (!got.slice(j, k).every((g, n) => NO_LETTERS.test(text.slice(g.index + g.text.length, got[j + n + 1].index)))) return null; // a word between the pieces: two numbers, not one
      spans.push({ at: got[j].index, len: end - got[j].index, put: typed[i].text });
      i++; j = k + 1; continue;
    }
    let m = i; joined = typed[i].key;
    while (joined.length < got[j].key.length && m + 1 < typed.length) { m++; joined += typed[m].key; }
    if (joined === got[j].key) {                                                        // typed numbers run together
      const from = typed[i].index, to = typed[m].index + typed[m].text.length;
      if (!typed.slice(i, m).every((t, n) => NO_LETTERS.test(source.slice(t.index + t.text.length, typed[i + n + 1].index)))) return null;
      spans.push({ at: got[j].index, len: got[j].text.length, put: source.slice(from, to) });
      i = m + 1; j++; continue;
    }
    return null; // not lined up after all
  }
  return put(text, spans);
}

/**
 * Two numbers that are plausibly one number copied badly: a clock time with the same minutes, or digits that differ in
 * fewer than half their places (one place for a number of up to four digits). "44" is not a bad copy of "4471", nor "6" of "196".
 */
function near(a, b) {
  const ca = CLOCK.exec(a.text), cb = CLOCK.exec(b.text);
  if (ca && cb && ca[2] === cb[2]) return true;
  const longer = Math.max(a.key.length, b.key.length);
  return distance(a.key, b.key) <= Math.max(1, Math.ceil(longer / 2) - 1);
}

/** Stand-ins the pack copies as they stand (checked on the shipped pack, both ways). */
const STAND_INS = ['417', '528', '639', '741', '852', '963', '174', '285', '396'];

/**
 * The line with each number swapped for a stand-in, or null when it has no number or more than there are stand-ins.
 * @param {string} text
 * @returns {{text:string, pairs:{standIn:string, typed:string}[]}|null}
 */
export function maskNumbers(text) {
  const t = String(text || '');
  const toks = numbersIn(t);
  if (!toks.length) return null;
  const taken = new Set(toks.map((x) => x.key));
  const free = STAND_INS.filter((s) => !taken.has(s));
  if (toks.length > free.length) return null;
  const pairs = toks.map((tok, i) => ({ standIn: free[i], typed: tok.text }));
  let out = '';
  let at = 0;
  toks.forEach((tok, i) => { out += t.slice(at, tok.index) + free[i]; at = tok.index + tok.text.length; });
  return { text: out + t.slice(at), pairs };
}

/**
 * The typed numbers put back in place of their stand-ins. Null unless every stand-in is in the answer exactly once.
 * Any other number in the answer is left as it is (the caller compares the result with the line again).
 * @param {string} out @param {{pairs:{standIn:string, typed:string}[]}} masked
 */
export function unmaskNumbers(out, masked) {
  const text = String(out || '');
  const byStandIn = new Map(masked.pairs.map((p) => [p.standIn, p.typed]));
  const got = numbersIn(text).filter((g) => byStandIn.has(g.text));
  if (got.length !== masked.pairs.length || new Set(got.map((g) => g.text)).size !== got.length) return null;
  let res = '';
  let at = 0;
  for (const g of got) { res += text.slice(at, g.index) + byStandIn.get(g.text); at = g.index + g.text.length; }
  return res + text.slice(at);
}
