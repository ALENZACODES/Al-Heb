#!/usr/bin/env node
// Number test of Talk: do the numbers typed in a line (times, prices, phone numbers, dates, room and bus numbers) come out
// of the translation unchanged? Runs the shipped code and the shipped language pack; no network.
//
//   node tools/talk/nmt/numbers-test.mjs [--per 30] [--seed 20261111] [--second | --third] [--out results.json] [--rows rows.jsonl]
//
// 20 sentence frames each way, each filled --per times with numbers drawn from a seeded generator (1,200 lines by default).
// The first set is the one the number check was built against, so its score says the check does what it was built to do
// and no more. --second: 12 more frames each way, written after the check was first finished and before it was run on
// them. That run found a mistake the first set could not (units of measure), and the check was changed. --third: 12 more
// frames each way, written after that change and before it was run on them: the fairest measure of the three.
// Every line is answered twice: by the pack alone (the line in, the answer out, as Talk worked before this check existed),
// and as the screen answers it now (src/talk/hybrid.js with src/talk/nmt/numbers.js).
//
// A line counts as "numbers intact" when
//   - the answer holds no number that was not typed, and
//   - every typed number is in the answer: a time, a price with a point, a phone number, a date or any number of three
//     digits and more with the same digits ("21:45" answered as "9:45 p.m." counts as the same time); a small count
//     as digits or as its word ("6" as "six" or "שישה", read from the stored number table data/talk/pack.json).
//     A typed "1" may be just the singular ("1 ticket" as "a ticket").
// "Shekels intact": a line that names shekels and no dollars has no "$", "bucks" or "dollars" in its English answer.
// The judging below is written apart from the fixing code, so the fix is not marking its own work.
// No reference translation is used and the wording is not scored. The Hebrew frames were written for this tool by the
// builder, not by a native speaker; only their numbers matter here.
import { readFileSync, writeFileSync } from 'node:fs';
import { loadEngine } from '../../../src/talk/data.js';
import { translateLine, CHECK_NUMBERS } from '../../../src/talk/hybrid.js';
import { finishLine } from '../../../src/talk/nmt/postedit.js';
import { loadDirection } from './node-runtime.mjs';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const PER = Number(flag('--per', '30')); const seed = Number(flag('--seed', '20261111'));
const has = (n) => { const i = args.indexOf(n); if (i < 0) return false; args.splice(i, 1); return true; };
const second = has('--second'); const third = has('--third');
const outFile = flag('--out', ''); const rowsFile = flag('--rows', '');

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export const FRAMES = {
  'en-he': [
    'My phone number is {phone}.', 'Call me at {phone} after {time}.', 'The bus leaves at {time} from platform {n2}.',
    'We arrive at {time} and leave at {time}.', 'Table for {q} at {time}, please.', 'The price is {price} shekels.',
    'It costs {price} shekels a month.', 'I paid ${price} for the tickets.', 'The flight is on {date}.', 'My room number is {n3}.',
    'I need {n3} grams of cheese.', 'Bus {n3} goes to Jerusalem.', 'The code is {n4}.', 'I live at {n2} Herzl Street, apartment {q}.',
    'The meeting is on {date} at {time}.', 'It costs ₪{price}.', 'Flight {n3} leaves at {time} from gate {n2}.', 'I was born in {year}.',
    'Check-in is at {time} and check-out is at {time}.', 'The train to Haifa leaves at {time} and costs {price} shekels.',
  ],
  'he-en': [
    'מספר הטלפון שלי הוא {phone}.', 'תתקשר אליי ל-{phone} אחרי {time}.', 'האוטובוס יוצא ב-{time} מרציף {n2}.',
    'אנחנו מגיעים ב-{time} ועוזבים ב-{time}.', 'שולחן ל-{q} בשעה {time}, בבקשה.', 'המחיר הוא {price} שקלים.',
    'זה עולה {price} שקלים בחודש.', 'שילמתי {price} דולר על הכרטיסים.', 'הטיסה ב-{date}.', 'מספר החדר שלי הוא {n3}.',
    'אני צריך {n3} גרם גבינה.', 'קו {n3} נוסע לירושלים.', 'הקוד הוא {n4}.', 'אני גר ברחוב הרצל {n2}, דירה {q}.',
    'הפגישה ב-{date} בשעה {time}.', 'זה עולה {price} ₪.', 'טיסה {n3} יוצאת ב-{time} משער {n2}.', 'נולדתי ב-{year}.',
    'הצ\'ק-אין ב-{time} והצ\'ק-אאוט ב-{time}.', 'הרכבת לחיפה יוצאת ב-{time} ועולה {price} שקלים.',
  ],
};

/** The second set: written after the number check was finished, before it was run on them. */
export const FRAMES_SECOND = {
  'en-he': [
    'The pharmacy opens at {time} and closes at {time}.', 'Take {q} pills every {q} hours.', 'Our flight lands at {time}, please send a taxi.',
    'The apartment is on floor {q}, door {n2}.', 'It is {n3} kilometers from Tel Aviv.', 'The discount is {n2}% until {date}.',
    'She is {n2} years old and her brother is {n2}.', 'The bill is {price} shekels, and the tip is {n2} shekels.',
    'Please call {phone} and ask for room {n3}.', 'The show starts at {time}, doors open at {time}.',
    'I weigh {n2} kilos and I am {n3} centimeters tall.', 'We booked {q} rooms from {date} to {date}.',
  ],
  'he-en': [
    'בית המרקחת נפתח ב-{time} ונסגר ב-{time}.', 'קח {q} כדורים כל {q} שעות.', 'הטיסה שלנו נוחתת ב-{time}, בבקשה שלחו מונית.',
    'הדירה בקומה {q}, דלת {n2}.', 'זה {n3} קילומטר מתל אביב.', 'ההנחה היא {n2}% עד {date}.',
    'היא בת {n2} ואחיה בן {n2}.', 'החשבון הוא {price} שקלים, והטיפ {n2} שקלים.',
    'בבקשה התקשרו ל-{phone} ובקשו את חדר {n3}.', 'ההופעה מתחילה ב-{time}, הדלתות נפתחות ב-{time}.',
    'אני שוקל {n2} קילו והגובה שלי {n3} סנטימטר.', 'הזמנו {q} חדרים מ-{date} עד {date}.',
  ],
};

/** The third set: written after the units were added to the check, before it was run on them. */
export const FRAMES_THIRD = {
  'en-he': [
    'The pool is open from {time} to {time}.', 'My seat is {n2}, row {q}.', 'The package weighs {n2} kilos.',
    'The hotel is {n3} meters from the beach.', 'Add {n3} grams of sugar and {q} eggs.', 'The taxi costs {price} shekels to the airport.',
    'My passport number is {n4}{n4}.', 'The guided tour starts on {date} at {time} and lasts {q} hours.', 'There are {n3} steps to the top.',
    'The speed limit is {n2} kilometers per hour.', 'Order number {n4}, table {n2}.', 'He was born on {date} and she was born in {year}.',
  ],
  'he-en': [
    'הבריכה פתוחה מ-{time} עד {time}.', 'המושב שלי {n2}, שורה {q}.', 'החבילה שוקלת {n2} קילו.',
    'המלון נמצא {n3} מטר מהים.', 'הוסיפו {n3} גרם סוכר ו-{q} ביצים.', 'המונית עולה {price} שקלים לשדה התעופה.',
    'מספר הדרכון שלי הוא {n4}{n4}.', 'הסיור המודרך מתחיל ב-{date} בשעה {time} ונמשך {q} שעות.', 'יש {n3} מדרגות עד למעלה.',
    'המהירות המותרת היא {n2} קילומטר לשעה.', 'הזמנה מספר {n4}, שולחן {n2}.', 'הוא נולד ב-{date} והיא נולדה ב-{year}.',
  ],
};

/** The lines of the test: every frame filled `per` times. The same seed always gives the same lines. */
export function lines({ per = 30, seed: s = 20261111, frames = FRAMES } = {}) {
  const rnd = mulberry32(s);
  const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const fill = {
    phone: () => (rnd() < 0.6 ? `05${int(0, 8)}-${pad(int(0, 999), 3)}-${pad(int(0, 9999), 4)}` : `0${int(2, 9)}-${pad(int(100, 999), 3)}-${pad(int(0, 9999), 4)}`),
    time: () => `${rnd() < 0.5 ? int(13, 23) : int(6, 12)}:${pad(int(0, 11) * 5)}`,
    price: () => { const k = rnd(); return k < 0.35 ? String(int(11, 999)) : k < 0.7 ? `${int(3, 480)}.${['50', '90', '99', '20'][int(0, 3)]}` : `${int(1, 9)},${pad(int(0, 999), 3)}`; },
    date: () => (rnd() < 0.5 ? `${int(1, 28)}/${int(1, 12)}/${int(2026, 2029)}` : `${pad(int(1, 28))}.${pad(int(1, 12))}.${int(2026, 2029)}`),
    n2: () => String(int(11, 99)), n3: () => String(int(101, 999)), n4: () => String(int(1000, 9999)), q: () => String(int(2, 12)), year: () => String(int(1950, 2030)),
  };
  const out = [];
  for (const direction of ['en-he', 'he-en']) frames[direction].forEach((frame, f) => {
    for (let i = 0; i < per; i++) out.push({ id: `${direction}-${f + 1}-${i + 1}`, direction, frame: f + 1, source: frame.replace(/\{(\w+)\}/g, (_, k) => fill[k]()) });
  });
  return out;
}

// ---- judging (kept apart from src/talk/nmt/numbers.js on purpose) ----
const digitRuns = (text) => [...String(text).matchAll(/\d+(?:[.,:/-]\d+)*/g)].map((m) => ({ text: m[0], key: m[0].replace(/\D/g, '') }));
const hard = (t) => /\D/.test(t.text) || (t.key.length >= 3 && !/^[1-9]0+$/.test(t.key));
/** value -> the words for it, both languages, built here from the stored number table (0 to 100). */
const WORDS = (() => {
  const table = JSON.parse(readFileSync(new URL('../../../data/talk/pack.json', import.meta.url), 'utf8')).numbers;
  const map = new Map(); const units = table.list;
  for (const u of units) map.set(u.n, [...u.en, u.count, u.m, u.mConstruct, u.fConstruct].filter(Boolean));
  for (const t of table.tens) {
    map.set(t.n, [t.en, t.he]);
    if (t.n < 100) for (const u of units) if (u.n >= 1 && u.n <= 9) map.set(t.n + u.n, [`${t.en} ${u.en[0]}`, `${t.he} ו${u.count}`, `${t.he} ו${u.m}`]);
  }
  return map;
})();
const flat = (x) => ` ${String(x).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
const saidAsWord = (n, answer) => (WORDS.get(n) || []).some((w) => { const f = flat(w).trim(); const a = flat(answer); return /[\u05D0-\u05EA]/.test(f) ? new RegExp(` [\u05D0-\u05EA]{0,2}${f} `, 'u').test(a) : a.includes(` ${f} `); });
/** @returns {{intact:boolean, why:string}} */
export function judge(source, answerAsGiven) {
  if (!answerAsGiven) return { intact: false, why: 'no answer' };
  // "9: 15" for "9:15" is a blemish, not a wrong number: it is closed up here and counted on its own (strayColon)
  const answer = closeUp(answerAsGiven);
  const typed = digitRuns(source), got = digitRuns(answer);
  if (typed.map((t) => t.key).join('') === got.map((t) => t.key).join('')) return { intact: true, why: '' };
  const left = new Map(); for (const t of typed) left.set(t.key, (left.get(t.key) || 0) + 1);
  const extra = [];
  for (const g of [...String(answer).matchAll(/\d+(?:[.,:/-]\d+)*/g)]) {
    const key = g[0].replace(/\D/g, ''); const n = left.get(key) || 0;
    if (n) { left.set(key, n - 1); continue; }
    // "21:45" answered as "9:45 p.m." is the same time: the 24-hour form counts as found
    const clock = /^(\d{1,2}):(\d{2})$/.exec(g[0]); const later = clock ? `${Number(clock[1]) + 12}${clock[2]}` : '';
    if (clock && Number(clock[1]) <= 11 && (left.get(later) || 0) && /^\s?(?:p\.?\s?m\b|in the (?:evening|afternoon)|at night)/i.test(String(answer).slice((g.index ?? 0) + g[0].length))) { left.set(later, left.get(later) - 1); continue; }
    extra.push(g[0]);
  }
  if (extra.length) return { intact: false, why: `not typed: ${extra.join(' ')}` };
  const lost = typed.filter((t) => { const n = left.get(t.key) || 0; if (n) { left.set(t.key, n - 1); return true; } return false; })
    .filter((t) => hard(t) || (Number(t.key) !== 1 && !saidAsWord(Number(t.key), answer)));
  if (lost.length) return { intact: false, why: `lost: ${lost.map((t) => t.text).join(' ')}` };
  return { intact: true, why: '' };
}
const closeUp = (answer) => String(answer).replace(/(\d{1,2}):\s+(\d{2})(?!\d)/g, '$1:$2');
export const strayColon = (answer) => closeUp(answer) !== String(answer);
/** [metric in English, metric in Hebrew, its cousin in English, its cousin in Hebrew]: a line in one must not be answered in the other. */
const UNIT_PAIRS = [
  [/\bkilo(?:gram)?s?\b|\bkg\b/i, /קילו(?!מטר)|ק["״]ג/, /\b(?:pounds?|lbs?)\b/i, /פאונד|ליבר/],
  [/\bkilomet(?:er|re)s?\b|\bkm\b/i, /קילומטר|ק["״]מ/, /\bmiles?\b/i, /מייל/],
  [/\bcentimet(?:er|re)s?\b|\bcm\b/i, /סנטימטר|ס["״]מ/, /\binch(?:es)?\b|\d['′’]\d/i, /אינץ|אינצ/],
  [/(?<![a-z])met(?:er|re)s?\b/i, /(?<!קילו|סנטי|מילי)מטר/, /\d\s?(?:feet|foot|ft|yards?)\b/i, /יארד|\d\s?רגל/],
  [/\bgrams?\b/i, /גרם/, /\bounces?\b|\boz\b/i, /אונקי/],
  [/\blit(?:er|re)s?\b/i, /ליטר/, /\bgallons?\b/i, /גלון/],
];
/** True unless the line measures in one unit and the answer in its cousin (kilos answered in pounds, miles in kilometres). */
export function unitsKept(source, answer) {
  const inText = (text, en, he) => en.test(text) || he.test(text);
  for (const [mEn, mHe, iEn, iHe] of UNIT_PAIRS) {
    const srcMetric = inText(source, mEn, mHe), srcOther = inText(source, iEn, iHe);
    if (srcMetric && !srcOther && inText(answer, iEn, iHe)) return false;
    if (srcOther && !srcMetric && inText(answer, mEn, mHe)) return false;
  }
  return true;
}
const namesShekels = (s) => /shekel|₪|שקל|ש["״]ח|NIS/i.test(s) && !/\$|dollar|דולר/i.test(s);
export const shekelsKept = (source, answer, direction) => direction !== 'he-en' || !namesShekels(source) || !/\$|\bbucks?\b|\bdollars?\b/i.test(answer);

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const SET = third ? FRAMES_THIRD : second ? FRAMES_SECOND : FRAMES;
  const samples = lines({ per: PER, seed, frames: SET });
  const engine = await loadEngine(); await engine.loadDictionary();
  let terms = null; try { terms = JSON.parse(readFileSync(new URL('../../../data/talk/terms.json', import.meta.url), 'utf8')); } catch { /* optional */ }
  const loaded = {}; const memo = new Map(); let calls = 0;
  const ask = async (d, t) => { const k = d + '\u0001' + t; if (!memo.has(k)) { calls++; memo.set(k, await (loaded[d] ||= await loadDirection(d)).translate(t, { beams: 2 })); } return memo.get(k); };
  const pack = { ready: () => true, translate: ask };
  const rows = []; const t0 = Date.now();
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const alone = finishLine(await ask(s.direction, s.source), s.source, s.direction, terms);
    const r = await translateLine(engine, pack, s.source, { direction: s.direction, terms });
    const now = r.ok ? String(r.translation || '') : '';
    const a = judge(s.source, alone), b = judge(s.source, now);
    rows.push({ ...s, alone, now, method: r.ok ? r.method : 'none', flagged: Boolean(r.note && r.note.includes(CHECK_NUMBERS)),
      aloneIntact: a.intact, aloneWhy: a.why, nowIntact: b.intact, nowWhy: b.why,
      aloneShekels: shekelsKept(s.source, alone, s.direction), nowShekels: shekelsKept(s.source, now, s.direction),
      aloneStray: strayColon(alone), nowStray: strayColon(now), aloneUnits: unitsKept(s.source, alone), nowUnits: unitsKept(s.source, now) });
    if ((i + 1) % 200 === 0) console.error(`${i + 1}/${samples.length} lines, ${Math.round((Date.now() - t0) / 1000)}s`);
  }
  const of = (sel) => {
    const r = rows.filter(sel); const money = r.filter((x) => x.direction === 'he-en' && namesShekels(x.source));
    return { lines: r.length, packAloneIntact: r.filter((x) => x.aloneIntact).length, nowIntact: r.filter((x) => x.nowIntact).length,
      nowWrongAndNotFlagged: r.filter((x) => !x.nowIntact && !x.flagged).length, flagged: r.filter((x) => x.flagged).length,
      packAloneStrayColon: r.filter((x) => x.aloneStray).length, nowStrayColon: r.filter((x) => x.nowStray).length,
      packAloneUnitChanged: r.filter((x) => !x.aloneUnits).length, nowUnitChanged: r.filter((x) => !x.nowUnits).length, nowUnitChangedAndNotFlagged: r.filter((x) => !x.nowUnits && !x.flagged).length,
      shekelLines: money.length, packAloneShekelsKept: money.filter((x) => x.aloneShekels).length, nowShekelsKept: money.filter((x) => x.nowShekels).length };
  };
  const summary = { set: third ? 'third' : second ? 'second' : 'first', lines: rows.length, perFrame: PER, seed, seconds: Math.round((Date.now() - t0) / 1000), packCalls: calls,
    all: of(() => true), 'en-he': of((x) => x.direction === 'en-he'), 'he-en': of((x) => x.direction === 'he-en'),
    byFrame: Object.fromEntries(['en-he', 'he-en'].flatMap((d) => SET[d].map((frame, f) => [`${d} ${f + 1}: ${frame}`, (({ lines: n, packAloneIntact, nowIntact, flagged }) => ({ lines: n, packAloneIntact, nowIntact, flagged }))(of((x) => x.direction === d && x.frame === f + 1))]))) };
  console.log(JSON.stringify(summary, null, 1));
  if (outFile) writeFileSync(outFile, JSON.stringify({ schema: 'alef.talk.numbers-test.v1', summary }, null, 1) + '\n');
  if (rowsFile) writeFileSync(rowsFile, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
}
