// @ts-check
// Writing: the reflection journal, typed Hebrew answers and sentence rewriting. Pure functions: no DOM, no network, no storage.
// Everything the learner writes stays on the device (store key writing.v1). The Hebrew comes from data the app already has:
// the daily prompts (data/curriculum/prompts.json) and the everyday lines, nouns and their forms (data/talk/pack.json).

export const WRITING_KEY = 'writing.v1';
export const NAME_SHOWN = 'ה׳';
export const MAX_ENTRY = 4000;
export const MAX_ANSWERS = 500;
const MARKS = /[֑-ֽֿ-ׇ]/g;
const PREFIX = 'ובלמכשה';

/** A Hebrew line with the four-letter Name shown as ה׳ (a prefix such as ל is kept). It is never spelled out. @param {string} he */
export function showName(he) {
  return String(he || '').replace(/[א-ת֑-ׇ]+/g, (word) => {
    const bare = word.replace(MARKS, '');
    const at = bare.indexOf('יהוה');
    if (at < 0 || at > 3 || at + 4 !== bare.length || ![...bare.slice(0, at)].every((c) => PREFIX.includes(c))) return word;
    return bare.slice(0, at) + NAME_SHOWN;
  });
}

/** The local day of a moment, as YYYY-MM-DD. @param {number} ms */
export function dayKey(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const dayNumber = (ms) => { const d = new Date(ms); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); };

/**
 * The one prompt of the day: a Shabbat-eve line on Friday, otherwise a morning line before three in the afternoon and an
 * evening line after. The lines go round in order, so each day has its own.
 * @param {{morning?:any[], evening?:any[], shabbatEve?:any[]}} bank @param {number} ms
 * @returns {{id:string, kind:'morning'|'evening'|'shabbatEve', he:string, en:string, reflect:string, source:string}|null}
 */
export function promptFor(bank, ms) {
  const d = new Date(ms);
  const kind = d.getDay() === 5 && (bank?.shabbatEve || []).length ? 'shabbatEve' : d.getHours() < 15 ? 'morning' : 'evening';
  const list = (bank && bank[kind]) || [];
  if (!list.length) return null;
  const p = list[((dayNumber(ms) % list.length) + list.length) % list.length];
  return { id: p.id, kind, he: showName(p.he), en: String(p.en || ''), reflect: String(p.reflect || ''), source: String(p.source || '') };
}

/** @param {any} [saved] @returns {{entries:{id:string, day:string, at:number, promptId:string, kind:string, text:string}[], answers:{at:number, drill:string, ask:string, typed:string, ok:boolean}[]}} */
export function normalizeState(saved) {
  const s = saved && typeof saved === 'object' ? saved : {};
  const entries = (Array.isArray(s.entries) ? s.entries : []).filter((e) => e && typeof e.text === 'string' && typeof e.day === 'string');
  const answers = (Array.isArray(s.answers) ? s.answers : []).filter((a) => a && typeof a.typed === 'string');
  return { entries, answers };
}

/** Saves the day's entry. Writing again on the same day replaces that day's entry; an empty text removes it. */
export function saveEntry(state, { ms, prompt, text }) {
  const s = normalizeState(state); const day = dayKey(ms); const body = String(text || '').trim().slice(0, MAX_ENTRY);
  const rest = s.entries.filter((e) => e.day !== day);
  if (!body) return { ...s, entries: rest };
  const entry = { id: `j-${day}`, day, at: ms, promptId: prompt?.id || '', kind: prompt?.kind || '', text: body };
  return { ...s, entries: [...rest, entry].sort((a, b) => (a.day < b.day ? 1 : -1)) };
}

/**
 * Days in a row with an entry, counted back from today (or from yesterday when today is not written yet).
 * A Friday or a Saturday with no entry does not break the run and does not add to it.
 * @param {{day:string}[]} entries @param {number} ms
 */
export function journalStreak(entries, ms) {
  const have = new Set((entries || []).map((e) => e.day));
  let count = 0; let at = new Date(ms); at.setHours(12, 0, 0, 0);
  if (!have.has(dayKey(at.getTime()))) at.setDate(at.getDate() - 1);
  for (let guard = 0; guard < 3660; guard++) {
    const key = dayKey(at.getTime());
    if (have.has(key)) count++;
    else if (at.getDay() !== 5 && at.getDay() !== 6) break;
    else if (!count) break;
    at.setDate(at.getDate() - 1);
  }
  return count;
}

/** The journal as plain text, newest first, for the learner to keep. @param {any} state @param {(id:string)=>any} [promptOf] */
export function exportText(state, promptOf) {
  const s = normalizeState(state);
  const lines = ['My Aleph Journal', ''];
  for (const e of s.entries) {
    const p = promptOf ? promptOf(e.promptId) : null;
    lines.push(e.day); if (p) lines.push(`${showName(p.he)}  (${p.en})`); lines.push(e.text, '');
  }
  return lines.join('\n');
}

// ---- typed Hebrew answers -------------------------------------------------------------------------------------------------------
const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };

/** A Hebrew answer made ready to compare: no vowel points, no punctuation, final letters as ordinary ones, one space between words. @param {string} s */
export function heKey(s) {
  return String(s || '').normalize('NFKC').replace(MARKS, '').replace(/־/g, ' ').replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .replace(/[^א-ת0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
}
/**
 * The same line with the helper letters ו and י dropped from the middle of words: שולחן and שלחן, or אמא and אימא, come out alike.
 * A word's last letter is never dropped: there a י is grammar (עצור to a man, עצרי to a woman).
 * @param {string} key
 */
export function spellingKey(key) {
  return key.split(' ').map((w) => (w.length > 3 ? w[0] + w.slice(1, -1).replace(/[וי]/g, '') + w[w.length - 1] : w)).join(' ');
}
function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) { let prev = row[0]; row[0] = i; for (let j = 1; j <= b.length; j++) { const keep = row[j]; row[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j], row[j - 1]); prev = keep; } }
  return row[b.length];
}

/**
 * Grades a typed Hebrew answer against the answer and its accepted other wordings.
 * exact: the same letters (vowel points, punctuation and final-letter forms do not count).
 * spelling: right, with ו or י written or left out differently. close: one letter off, shown but not counted right.
 * @param {string} typed @param {{he:string, accept?:string[], strict?:boolean}} item  strict: no spelling allowance (used where the form itself is the lesson)
 * @returns {{ok:boolean, kind:'exact'|'spelling'|'close'|'wrong'|'empty'|'latin', model:string}}
 */
export function gradeHebrew(typed, item) {
  const model = item.he; const raw = String(typed || '').trim();
  if (!raw) return { ok: false, kind: 'empty', model };
  const key = heKey(raw);
  if (!key) return { ok: false, kind: /[A-Za-z]/.test(raw) ? 'latin' : 'empty', model };
  const wanted = [item.he, ...(item.accept || [])].map(heKey).filter(Boolean);
  if (wanted.includes(key)) return { ok: true, kind: 'exact', model };
  const loose = spellingKey(key);
  if (!item.strict && wanted.some((w) => spellingKey(w) === loose)) return { ok: true, kind: 'spelling', model };
  if (key.length >= 4 && wanted.some((w) => distance(w, key) === 1)) return { ok: false, kind: 'close', model };
  return { ok: false, kind: 'wrong', model };
}

/** English lines to answer in Hebrew, from the everyday lines the app stores: two to six Hebrew words, every stored wording accepted. */
export function freeTextItems(pack) {
  const out = [];
  for (const p of (pack && pack.phrases) || []) {
    const words = heKey(p.he).split(' ').length;
    if (!p.id || !Array.isArray(p.en) || !p.en[0] || words < 2 || words > 6 || p.he.includes('יהוה')) continue;
    out.push({ id: p.id, cat: p.cat || '', en: p.en[0], he: p.he, accept: [p.f, p.toF, ...(p.alt || [])].filter(Boolean) });
  }
  return out;
}

// ---- rewrite the sentence -------------------------------------------------------------------------------------------------------
export const REWRITE_ASK = Object.freeze({
  feminine: 'Rewrite it as a woman would say it.',
  toWoman: 'Rewrite it as said to a woman.',
  plural: 'Rewrite it about more than one.',
  negative: 'Rewrite it to say the opposite: you do not have it.',
});
const AN = (en) => (/^[aeiou]/i.test(en) ? 'an' : 'a');

/**
 * Sentences to rewrite, each with the answer worked out from stored forms: the woman's form and the form said to a woman of
 * a stored line, the stored plural of a noun, and "I have" turned into "I do not have".
 * @returns {{id:string, kind:keyof typeof REWRITE_ASK, from:string, en:string, he:string, accept:string[], answerEn:string}[]}
 */
export function rewriteItems(pack) {
  const out = [];
  for (const p of (pack && pack.phrases) || []) {
    if (!p.id || !p.en?.[0]) continue;
    if (p.f && heKey(p.f) !== heKey(p.he)) out.push({ id: `${p.id}-f`, kind: 'feminine', from: p.he, en: p.en[0], he: p.f, accept: [], strict: true, answerEn: p.en[0] });
    if (p.toF && heKey(p.toF) !== heKey(p.he)) out.push({ id: `${p.id}-to`, kind: 'toWoman', from: p.he, en: p.en[0], he: p.toF, accept: [], strict: true, answerEn: p.en[0] });
  }
  for (const n of (pack && pack.nouns) || []) {
    const en = n.en?.[0];
    if (!en || n.def || /\s/.test(n.he) || /\s/.test(en)) continue;
    if (n.pl && !/\s/.test(n.pl)) out.push({ id: `n-${n.he}-pl`, kind: 'plural', from: `איפה ה${n.he}?`, en: `Where is the ${en}?`, he: `איפה ה${n.pl}?`, accept: [], strict: true, answerEn: `Where are the ${en}s?`.replace(/([^aeiou])ys\?$/, '$1ies?').replace(/(s|x|ch|sh)s\?$/, '$1es?').replace('knifes', 'knives') });
    if (n.pl && (!n.g || n.g === 'f')) out.push({ id: `n-${n.he}-neg`, kind: 'negative', from: `יש לי ${n.he}`, en: `I have ${AN(en)} ${en}.`, he: `אין לי ${n.he}`, accept: [], strict: true, answerEn: `I do not have ${AN(en)} ${en}.` });
  }
  return out;
}

/** `n` items in a fresh order, the ones not yet seen first. @param {any[]} items @param {number} n @param {()=>number} [rng] @param {Set<string>} [seen] */
export function pickRound(items, n, rng = Math.random, seen = new Set()) {
  const mix = (xs) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  return [...mix(items.filter((x) => !seen.has(x.id))), ...mix(items.filter((x) => seen.has(x.id)))].slice(0, n);
}

/** Keeps what was typed, newest first, for the learner's own record. */
export function recordAnswer(state, a) {
  const s = normalizeState(state);
  return { ...s, answers: [{ at: a.at, drill: a.drill, ask: a.ask, typed: String(a.typed || '').slice(0, 300), ok: !!a.ok }, ...s.answers].slice(0, MAX_ANSWERS) };
}

// ---- copy-work ------------------------------------------------------------------------------------------------------------------
const tidy = (s) => String(s || '').normalize('NFKC').replace(MARKS, '').replace(/\s+/g, ' ').trim();
/**
 * Compares a copied line with the line shown, letter by letter (vowel points are not asked for; everything else is, punctuation included).
 * @returns {{exact:boolean, accuracy:number, marks:{ch:string, ok:boolean}[], missing:number, extra:number}} accuracy is 0 to 100
 */
export function copyCheck(typed, target) {
  const a = [...tidy(typed)], b = [...tidy(target)];
  const marks = a.map((ch, i) => ({ ch, ok: ch === b[i] }));
  const right = marks.filter((m) => m.ok).length;
  const accuracy = b.length ? Math.round((100 * right) / Math.max(a.length, b.length)) : 0;
  return { exact: a.length === b.length && right === b.length, accuracy, marks, missing: Math.max(0, b.length - a.length), extra: Math.max(0, a.length - b.length) };
}
/** Letters a minute for a copied line. @param {number} letters @param {number} ms */
export const copySpeed = (letters, ms) => (ms > 0 ? Math.round((letters * 60000) / ms) : 0);
/** Lines to copy: stored everyday lines of three to seven words. */
export function copyItems(pack) {
  return ((pack && pack.phrases) || []).filter((p) => p.id && p.en?.[0] && !p.he.includes('יהוה') && heKey(p.he).split(' ').length >= 3 && heKey(p.he).split(' ').length <= 7).map((p) => ({ id: p.id, he: p.he, en: p.en[0] }));
}

// ---- the portfolio --------------------------------------------------------------------------------------------------------------
export const PORTFOLIO_KIND = Object.freeze({ journal: 'Journal', answer: 'Typed Answer', rewrite: 'Rewrite', copy: 'Copy-Work', gym: 'Translation', errors: 'Correction', story: 'Story Ending', postcard: 'Postcard' });
/** Everything the learner has written, newest first: journal entries and every typed line. @returns {{at:number, day:string, kind:string, text:string, ok:boolean|null}[]} */
export function portfolio(state) {
  const s = normalizeState(state);
  const out = s.entries.map((e) => ({ at: e.at, day: e.day, kind: 'journal', text: e.text, ok: null }));
  for (const a of s.answers) out.push({ at: a.at, day: dayKey(a.at), kind: PORTFOLIO_KIND[a.drill] ? a.drill : 'answer', text: a.typed, ok: a.drill === 'story' || a.drill === 'postcard' ? null : a.ok });
  return out.sort((x, y) => y.at - x.at);
}
/** The items that hold the words searched for (any language, vowel points ignored), or all of them for an empty search. */
export function searchPortfolio(items, query) {
  const q = tidy(query).toLowerCase();
  return q ? items.filter((x) => tidy(x.text).toLowerCase().includes(q)) : items;
}
/** The portfolio as plain text to keep. */
export function portfolioText(items) {
  return ['My Aleph Writing', '', ...items.map((x) => `${x.day}  ${PORTFOLIO_KIND[x.kind]}${x.ok === null ? '' : x.ok ? '  (right)' : '  (not yet)'}\n${x.text}\n`)].join('\n');
}

// ---- translation gym: whole sentences ----------------------------------------------------------------------------------------------
/** Longer stored lines (four Hebrew words or more) to translate from English, with every stored wording accepted. */
export function gymItems(pack) { return freeTextItems(pack).filter((x) => heKey(x.he).split(' ').length >= 4); }

// ---- error-spotting --------------------------------------------------------------------------------------------------------------
export const ERROR_RULE = Object.freeze({
  number: 'After "two" the noun is in the plural.',
  gender: 'The word for "two" follows the noun: שני before a masculine noun, שתי before a feminine one.',
});
const pluralEn = (w) => ({ knife: 'knives', glass: 'glasses' }[w] || (/(s|x|ch|sh)$/.test(w) ? `${w}es` : /[^aeiou]y$/.test(w) ? `${w.slice(0, -1)}ies` : `${w}s`));
/**
 * Sentences with exactly one planted error, built from stored forms: a countable noun, its stored plural and its gender.
 * The learner types the sentence put right.
 * @returns {{id:string, rule:'number'|'gender', wrong:string, he:string, en:string, accept:string[], strict:boolean, answerEn:string}[]}
 */
export function errorItems(pack) {
  const out = [];
  for (const n of (pack && pack.nouns) || []) {
    const en = n.en?.[0];
    if (!en || !n.pl || n.def || /\s/.test(n.he) || /\s/.test(n.pl) || /\s/.test(en) || (n.g && n.g !== 'f')) continue;
    const two = n.g === 'f' ? 'שתי' : 'שני', other = n.g === 'f' ? 'שני' : 'שתי';
    const right = `יש לי ${two} ${n.pl}`; const meaning = `I have two ${pluralEn(en)}.`;
    out.push({ id: `e-${n.he}-number`, rule: 'number', wrong: `יש לי ${two} ${n.he}`, he: right, en: meaning, accept: [], strict: true, answerEn: ERROR_RULE.number });
    out.push({ id: `e-${n.he}-gender`, rule: 'gender', wrong: `יש לי ${other} ${n.pl}`, he: right, en: meaning, accept: [], strict: true, answerEn: ERROR_RULE.gender });
  }
  return out;
}

// ---- story completer -------------------------------------------------------------------------------------------------------------
/** A little book cut one line early: every page but the last, and the real last line kept back. Lines that hold the Name are shown as ה׳. */
export function storyCut(book) {
  const pages = ((book && book.pages) || []).filter((p) => p && p.he && p.en);
  if (pages.length < 3) return null;
  const last = pages[pages.length - 1];
  return { id: book.id, title: book.titleEn || '', titleHe: showName(book.titleHe || ''), lines: pages.slice(0, -1).map((p) => ({ he: showName(p.he), en: p.en })), ending: { he: showName(last.he), en: last.en } };
}
/** Saves the learner's own ending of a story (one per story; writing it again replaces it). */
export function saveEnding(state, { at, bookId, text }) {
  const s = normalizeState(state); const body = String(text || '').trim().slice(0, 600);
  const rest = s.answers.filter((a) => !(a.drill === 'story' && a.ask === bookId));
  return body ? { ...s, answers: [{ at, drill: 'story', ask: bookId, typed: body, ok: true }, ...rest].slice(0, MAX_ANSWERS) } : { ...s, answers: rest };
}

// ---- postcards -------------------------------------------------------------------------------------------------------------------
const POSTCARD = { greeting: ['t-hello', 't-morning', 't-evening'], line: ['t-all-good', 't-delicious', 't-food-excellent', 't-like-it', 't-learning-hebrew', 't-speak-little'], signoff: ['t-bye', 't-see-tomorrow', 't-thanks-much'] };
const ISRAEL_PLACES = ['jerusalem', 'tel aviv', 'haifa', 'eilat', 'beer sheva', 'tiberias', 'safed', 'the dead sea', 'nazareth'];
/** What a postcard can be made of: stored greetings, places in Israel, stored lines and stored sign-offs. Nothing is composed that the app does not store. */
export function postcardChoices(pack) {
  const by = new Map(((pack && pack.phrases) || []).map((p) => [p.id, p])); const place = new Map(((pack && pack.places) || []).map((p) => [p.en[0], p.he]));
  const pick = (ids) => ids.map((id) => by.get(id)).filter(Boolean).map((p) => ({ id: p.id, he: p.he, en: p.en[0] }));
  const more = ((pack && pack.phrases) || []).filter((p) => p.cat === 'smalltalk' && !POSTCARD.line.includes(p.id) && !/\?/.test(p.he)).slice(0, 8).map((p) => ({ id: p.id, he: p.he, en: p.en[0] }));
  return { greeting: pick(POSTCARD.greeting), place: ISRAEL_PLACES.filter((n) => place.has(n)).map((n) => ({ id: n, he: place.get(n), en: n.replace(/\b[a-z]/g, (c) => c.toUpperCase()) })), line: [...pick(POSTCARD.line), ...more], signoff: pick(POSTCARD.signoff) };
}
/**
 * The lines of a postcard, top to bottom: the greeting (with who it is for), the place, the learner's line, the sign-off and the name.
 * @param {{greeting:string, place:string, line:string, signoff:string}} picks ids from postcardChoices
 * @param {{to?:string, from?:string, own?:string}} [words] typed by the learner; `own` replaces the chosen line
 * @returns {{he:string[], en:string[]}|null}
 */
export function postcard(choices, picks, words = {}) {
  const get = (k) => (choices[k] || []).find((x) => x.id === picks[k]);
  const g = get('greeting'), p = get('place'), l = get('line'), s = get('signoff');
  const clean = (x, n) => showName(String(x || '').replace(/\s+/g, ' ').trim().slice(0, n));
  const own = clean(words.own, 80), to = clean(words.to, 30), from = clean(words.from, 30);
  if (!g || !p || !s || !(own || l)) return null;
  return { he: [to ? `${g.he}, ${to}!` : `${g.he}!`, p.he, own || l.he, s.he, from].filter(Boolean), en: [g.en, p.en, own ? '' : l.en, s.en].filter(Boolean) };
}
