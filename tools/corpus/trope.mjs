// Cantillation (trope, te'amim) parser for the ALEF corpus (stage 2).
//   node tools/corpus/trope.mjs     # writes data/corpus/trope/{table,priestly-blessing,shema}.json and data/corpus/reader/*.json
//
// Input: the raw UXLC verse strings already stored in data/corpus/source-snapshot.json (Tanach.us, "may be viewed or
// copied without restriction"). When the UXLC XML cache (tools/vocab/.cache/tanach) is on disk the same verses are read
// from it and must be identical, otherwise the build stops. No text is fetched.
//
// Output per word: every cantillation code point with its Unicode name, the mark's name in the two naming systems
// (Ashkenazi and Sephardi), its class (disjunctive / conjunctive / separator / secondary-stress / verse-end), the
// disjunctive level, and where it sits: code-point offset in the word and the 0-based index of the letter it follows.
//
// Parsing rules that are not just a lookup (documented in docs/corpus/TROPE.md):
//   U+05BD   on the last word of a verse (the word that carries sof pasuq), the LAST U+05BD in that word is siluq
//            (disjunctive, level 1). Every other U+05BD is meteg (secondary stress, not a trope).
//   U+05C0   paseq. If the same word carries munach (U+05A3), the pair is read as munach legarmeh (disjunctive).
//            UXLC writes the paseq as a separate token "׀" after a space; it is attached to the preceding word.
//   U+0599   pashta is postpositive (printed on the last letter). When the stress is not on the last syllable UXLC
//            prints it twice; the copy that is not on the last letter is the stress copy (role "stress").
//            The same doubling rule is applied to the other post/prepositive marks (segol, zarqa, telisha, yetiv).
//   U+05C3   sof pasuq, verse end; listed so a renderer can place it, class "verse-end".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanLine, isHebrewLetter } from '../../src/corpus/normalize.js';
import { loadUxlcBook, UXLC_DIR } from './verify_texts.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Mark table for the prose ("21 books") system, which Numbers and Deuteronomy use.
 * level: 1 emperor (keisarim), 2 king (melachim), 3 duke (mishnim), 4 count (shlishim); conjunctives have no level.
 * placement: impositive = on the stressed syllable; prepositive = first letter; postpositive = last letter.
 * Hebrew names are unpointed, as commonly printed. The two naming columns follow the usual Ashkenazi and
 * Sephardi/Mizrahi lists (e.g. Jacobson, Chanting the Hebrew Bible; Wickes); a cantor has not reviewed them.
 */
export const TROPE_TABLE = [
  { cp: 0x0591, unicode: 'HEBREW ACCENT ETNAHTA', id: 'etnachta', ashkenazi: 'Etnachta', ashkenaziHe: 'אתנחתא', sephardi: 'Atnach', sephardiHe: 'אתנח', cls: 'disjunctive', level: 1, placement: 'impositive' },
  { cp: 0x0592, unicode: 'HEBREW ACCENT SEGOL', id: 'segol', ashkenazi: 'Segol', ashkenaziHe: 'סגול', sephardi: 'Segolta', sephardiHe: 'סגולתא', cls: 'disjunctive', level: 2, placement: 'postpositive' },
  { cp: 0x0593, unicode: 'HEBREW ACCENT SHALSHELET', id: 'shalshelet', ashkenazi: 'Shalshelet', ashkenaziHe: 'שלשלת', sephardi: 'Shalshelet', sephardiHe: 'שלשלת', cls: 'disjunctive', level: 2, placement: 'impositive', note: 'always followed by paseq' },
  { cp: 0x0594, unicode: 'HEBREW ACCENT ZAQEF QATAN', id: 'zakef-katan', ashkenazi: 'Zakef katan', ashkenaziHe: 'זקף קטן', sephardi: 'Zakef katon', sephardiHe: 'זקף קטון', cls: 'disjunctive', level: 2, placement: 'impositive' },
  { cp: 0x0595, unicode: 'HEBREW ACCENT ZAQEF GADOL', id: 'zakef-gadol', ashkenazi: 'Zakef gadol', ashkenaziHe: 'זקף גדול', sephardi: 'Zakef gadol', sephardiHe: 'זקף גדול', cls: 'disjunctive', level: 2, placement: 'impositive' },
  { cp: 0x0596, unicode: 'HEBREW ACCENT TIPEHA', id: 'tipcha', ashkenazi: 'Tipcha', ashkenaziHe: 'טפחא', sephardi: 'Tarcha', sephardiHe: 'טרחא', cls: 'disjunctive', level: 2, placement: 'impositive' },
  { cp: 0x0597, unicode: 'HEBREW ACCENT REVIA', id: 'revia', ashkenazi: 'Revia', ashkenaziHe: 'רביע', sephardi: 'Revia', sephardiHe: 'רביע', cls: 'disjunctive', level: 3, placement: 'impositive' },
  { cp: 0x0598, unicode: 'HEBREW ACCENT ZARQA', id: 'zarka', ashkenazi: 'Zarka', ashkenaziHe: 'זרקא', sephardi: 'Zarka', sephardiHe: 'זרקא', cls: 'disjunctive', level: 3, placement: 'postpositive' },
  { cp: 0x0599, unicode: 'HEBREW ACCENT PASHTA', id: 'pashta', ashkenazi: 'Pashta', ashkenaziHe: 'פשטא', sephardi: 'Kadma', sephardiHe: 'קדמא', cls: 'disjunctive', level: 3, placement: 'postpositive', note: 'doubled when the stress is not on the last syllable' },
  { cp: 0x059a, unicode: 'HEBREW ACCENT YETIV', id: 'yetiv', ashkenazi: 'Yetiv', ashkenaziHe: 'יתיב', sephardi: 'Yetiv', sephardiHe: 'יתיב', cls: 'disjunctive', level: 3, placement: 'prepositive' },
  { cp: 0x059b, unicode: 'HEBREW ACCENT TEVIR', id: 'tevir', ashkenazi: 'Tevir', ashkenaziHe: 'תביר', sephardi: 'Tevir', sephardiHe: 'תביר', cls: 'disjunctive', level: 3, placement: 'impositive' },
  { cp: 0x059c, unicode: 'HEBREW ACCENT GERESH', id: 'geresh', ashkenazi: 'Geresh (Azla when it follows Kadma)', ashkenaziHe: 'גרש', sephardi: 'Gerish', sephardiHe: 'גריש', cls: 'disjunctive', level: 4, placement: 'impositive' },
  { cp: 0x059d, unicode: 'HEBREW ACCENT GERESH MUQDAM', id: 'geresh-mukdam', ashkenazi: 'Geresh mukdam (Geresh written early)', ashkenaziHe: 'גרש מוקדם', sephardi: 'Gerish', sephardiHe: 'גריש', cls: 'disjunctive', level: 4, placement: 'prepositive', note: 'a positional variant of geresh' },
  { cp: 0x059e, unicode: 'HEBREW ACCENT GERSHAYIM', id: 'gershayim', ashkenazi: 'Gershayim', ashkenaziHe: 'גרשיים', sephardi: 'Shenei gerishin', sephardiHe: 'שני גרישין', cls: 'disjunctive', level: 4, placement: 'impositive' },
  { cp: 0x059f, unicode: 'HEBREW ACCENT QARNEY PARA', id: 'karnei-parah', ashkenazi: 'Karnei parah', ashkenaziHe: 'קרני פרה', sephardi: 'Karnei farah', sephardiHe: 'קרני פרה', cls: 'disjunctive', level: 4, placement: 'impositive' },
  { cp: 0x05a0, unicode: 'HEBREW ACCENT TELISHA GEDOLA', id: 'telisha-gedolah', ashkenazi: 'Telisha gedolah', ashkenaziHe: 'תלישא גדולה', sephardi: 'Tilsha', sephardiHe: 'תלשא', cls: 'disjunctive', level: 4, placement: 'prepositive' },
  { cp: 0x05a1, unicode: 'HEBREW ACCENT PAZER', id: 'pazer', ashkenazi: 'Pazer', ashkenaziHe: 'פזר', sephardi: 'Pazer gadol', sephardiHe: 'פזר גדול', cls: 'disjunctive', level: 4, placement: 'impositive' },
  { cp: 0x05a3, unicode: 'HEBREW ACCENT MUNAH', id: 'munach', ashkenazi: 'Munach', ashkenaziHe: 'מונח', sephardi: 'Shofar holech', sephardiHe: 'שופר הולך', cls: 'conjunctive', level: null, placement: 'impositive', note: 'with paseq on the same word: munach legarmeh, disjunctive level 4' },
  { cp: 0x05a4, unicode: 'HEBREW ACCENT MAHAPAKH', id: 'mahpach', ashkenazi: 'Mahpach', ashkenaziHe: 'מהפך', sephardi: 'Shofar mehupach', sephardiHe: 'שופר מהופך', cls: 'conjunctive', level: null, placement: 'impositive' },
  { cp: 0x05a5, unicode: 'HEBREW ACCENT MERKHA', id: 'mercha', ashkenazi: 'Mercha', ashkenaziHe: 'מרכא', sephardi: 'Maarich', sephardiHe: 'מאריך', cls: 'conjunctive', level: null, placement: 'impositive' },
  { cp: 0x05a6, unicode: 'HEBREW ACCENT MERKHA KEFULA', id: 'mercha-kefulah', ashkenazi: 'Mercha kefulah', ashkenaziHe: 'מרכא כפולה', sephardi: 'Tere taamei', sephardiHe: 'תרי טעמי', cls: 'conjunctive', level: null, placement: 'impositive' },
  { cp: 0x05a7, unicode: 'HEBREW ACCENT DARGA', id: 'darga', ashkenazi: 'Darga', ashkenaziHe: 'דרגא', sephardi: 'Darga', sephardiHe: 'דרגא', cls: 'conjunctive', level: null, placement: 'impositive' },
  { cp: 0x05a8, unicode: 'HEBREW ACCENT QADMA', id: 'kadma', ashkenazi: 'Kadma', ashkenaziHe: 'קדמא', sephardi: 'Azla', sephardiHe: 'אזלא', cls: 'conjunctive', level: null, placement: 'impositive' },
  { cp: 0x05a9, unicode: 'HEBREW ACCENT TELISHA QETANA', id: 'telisha-ketanah', ashkenazi: 'Telisha ketanah', ashkenaziHe: 'תלישא קטנה', sephardi: 'Talsha', sephardiHe: 'תלשא', cls: 'conjunctive', level: null, placement: 'postpositive' },
  { cp: 0x05aa, unicode: 'HEBREW ACCENT YERAH BEN YOMO', id: 'yerach-ben-yomo', ashkenazi: 'Yerach ben yomo', ashkenaziHe: 'ירח בן יומו', sephardi: 'Yerach ben yomo (Galgal)', sephardiHe: 'ירח בן יומו', cls: 'conjunctive', level: null, placement: 'impositive' },
  { cp: 0x05bd, unicode: 'HEBREW POINT METEG', id: 'siluk', ashkenazi: 'Sof pasuk', ashkenaziHe: 'סוף פסוק', sephardi: 'Siluk', sephardiHe: 'סילוק', cls: 'disjunctive', level: 1, placement: 'impositive', note: 'same code point as meteg; it is siluk only on the last word of the verse (see parser rule)' },
  { cp: 0x05bd, unicode: 'HEBREW POINT METEG', id: 'meteg', ashkenazi: 'Meteg', ashkenaziHe: 'מתג', sephardi: 'Meteg (Gaya)', sephardiHe: 'מתג', cls: 'secondary-stress', level: null, placement: 'impositive', note: 'not a trope; marks a secondary stress or a long vowel' },
  { cp: 0x05c0, unicode: 'HEBREW PUNCTUATION PASEQ', id: 'pasek', ashkenazi: 'Pesik', ashkenaziHe: 'פסיק', sephardi: 'Pasek', sephardiHe: 'פסק', cls: 'separator', level: null, placement: 'after the word', note: 'a vertical bar after the word; not a melody. With munach on the same word: legarmeh' },
  { cp: 0x05c0, unicode: 'HEBREW PUNCTUATION PASEQ', id: 'legarmeh', ashkenazi: 'Munach legarmeh', ashkenaziHe: 'מונח לגרמיה', sephardi: 'Shofar holech legarmeh', sephardiHe: 'לגרמיה', cls: 'disjunctive', level: 4, placement: 'after the word' },
  { cp: 0x05c3, unicode: 'HEBREW PUNCTUATION SOF PASUQ', id: 'sof-pasuk', ashkenazi: 'Sof pasuk (the sign)', ashkenaziHe: 'סוף פסוק', sephardi: 'Sof pasuk', sephardiHe: 'סוף פסוק', cls: 'verse-end', level: null, placement: 'after the word', note: 'punctuation; the melody of the verse end is carried by siluk' },
];

/** Poetic ("3 books": Psalms, Proverbs, Job) marks that have their own code points. Not parsed here; listed for completeness. */
export const POETIC_TABLE = [
  { cp: 0x05ab, unicode: 'HEBREW ACCENT OLE', id: 'ole', name: 'Ole (first half of Ole ve-yored)', cls: 'disjunctive' },
  { cp: 0x05ac, unicode: 'HEBREW ACCENT ILUY', id: 'iluy', name: 'Iluy (Munach superior)', cls: 'conjunctive' },
  { cp: 0x05ad, unicode: 'HEBREW ACCENT DEHI', id: 'dechi', name: 'Dechi', cls: 'disjunctive' },
  { cp: 0x05ae, unicode: 'HEBREW ACCENT ZINOR', id: 'tsinnor', name: 'Tsinnor (Zarka of the poetic books)', cls: 'disjunctive' },
  { cp: 0x0598, unicode: 'HEBREW ACCENT ZARQA', id: 'tsinnorit', name: 'Tsinnorit (the zarka shape as a conjunctive in the poetic books)', cls: 'conjunctive' },
];

const BY_CP = new Map();
for (const t of TROPE_TABLE) if (!BY_CP.has(t.cp)) BY_CP.set(t.cp, t);
const BY_ID = new Map(TROPE_TABLE.map((t) => [t.id, t]));
const uplus = (cp) => 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');
const isAccentCp = (cp) => (cp >= 0x0591 && cp <= 0x05ae) || cp === 0x05bd || cp === 0x05c0 || cp === 0x05c3;

/** Strip UXLC markup from a raw verse string: <x>n</x> notes, <s t="large"> wrappers; NFC. */
export function stripUxlcMarkup(raw) {
  return raw.replace(/<x>[\s\S]*?<\/x>/g, '').replace(/<[^>]+>/g, '').normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** Split a raw verse into word tokens; a lone paseq token "׀" is glued to the previous word. */
export function tokenise(raw) {
  const out = [];
  for (const t of stripUxlcMarkup(raw).split(' ')) {
    if (t === '׀' && out.length) out[out.length - 1] += ' ׀';
    else out.push(t);
  }
  return out;
}

/** Large letters (<s t="large">) in the raw string, by their letter chars. */
export function largeLettersIn(raw) {
  const out = [];
  for (const m of raw.matchAll(/<s t="large">([^<]*)<\/s>/g)) for (const c of m[1]) if (isHebrewLetter(c)) out.push(c);
  return out;
}

/** Parse one word token. isLast: the word closes the verse. Returns a word record. */
export function parseWord(token, isLast) {
  token = token.replace(' ׀', '׀'); // paseq glued to the word; offsets below are in this form
  const cps = [...token].map((c) => c.codePointAt(0));
  const letters = [];
  const marks = [];
  let letterIndex = -1;
  let lastMetegAt = -1;
  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i];
    if (cp >= 0x05d0 && cp <= 0x05ea) { letterIndex++; letters.push(String.fromCodePoint(cp)); continue; }
    if (!isAccentCp(cp)) continue;
    if (cp === 0x05bd) lastMetegAt = i;
    marks.push({ cp, at: i, letterIndex: cp === 0x05c0 || cp === 0x05c3 ? letterIndex : letterIndex });
  }
  const hasSof = cps.includes(0x05c3);
  const hasMunach = cps.includes(0x05a3);
  const countOf = (cp) => marks.filter((m) => m.cp === cp).length;
  const lastLetter = letters.length - 1;
  const out = [];
  for (const m of marks) {
    let id;
    if (m.cp === 0x05bd) id = isLast && hasSof && m.at === lastMetegAt ? 'siluk' : 'meteg';
    else if (m.cp === 0x05c0) id = hasMunach ? 'legarmeh' : 'pasek';
    else if (m.cp === 0x05c3) id = 'sof-pasuk';
    else id = BY_CP.get(m.cp)?.id;
    if (!id) throw new Error('unknown cantillation code point ' + uplus(m.cp) + ' in ' + token);
    const t = BY_ID.get(id);
    const rec = { id, unicode: uplus(m.cp), unicodeName: t.unicode, char: String.fromCodePoint(m.cp), ashkenazi: t.ashkenazi, sephardi: t.sephardi, cls: t.cls, level: t.level, placement: t.placement, at: m.at, letterIndex: m.letterIndex, letter: letters[m.letterIndex] ?? null };
    // doubled post/prepositive mark: the copy away from the edge letter marks the stress
    if (countOf(m.cp) > 1 && (t.placement === 'postpositive' || t.placement === 'prepositive')) {
      const edge = t.placement === 'postpositive' ? lastLetter : 0;
      rec.role = m.letterIndex === edge ? 'mark' : 'stress';
      rec.doubled = true;
    }
    out.push(rec);
  }
  // strongest disjunctive on the word (lowest level number); conjunctive words have none
  const disj = out.filter((m) => m.cls === 'disjunctive').sort((a, b) => a.level - b.level)[0] || null;
  const conj = out.filter((m) => m.cls === 'conjunctive')[0] || null;
  // stressed letter: an impositive trope, or the stress copy of a doubled mark; null when the parser cannot tell
  const stressMark = out.find((m) => m.role === 'stress') || out.find((m) => (m.cls === 'disjunctive' || m.cls === 'conjunctive') && m.placement === 'impositive');
  const plain = cleanLine(token);
  return {
    text: token,
    plain,
    letters: letters.length,
    marks: out,
    trope: disj ? disj.id : conj ? conj.id : null,
    tropeClass: disj ? 'disjunctive' : conj ? 'conjunctive' : 'none',
    disjunctiveLevel: disj ? disj.level : null,
    stressLetterIndex: stressMark ? stressMark.letterIndex : null,
    pasek: out.some((m) => m.id === 'pasek' || m.id === 'legarmeh'),
    sofPasuk: hasSof,
  };
}

/** Parse one verse. */
export function parseVerse(raw, ref) {
  const tokens = tokenise(raw);
  const words = tokens.map((t, i) => ({ i, ...parseWord(t, i === tokens.length - 1) }));
  // phrase split at the level-1 disjunctives: everything up to and including etnachta is the first half
  const etn = words.findIndex((w) => w.marks.some((m) => m.id === 'etnachta'));
  const halves = etn >= 0 ? [[0, etn], [etn + 1, words.length - 1]] : [[0, words.length - 1]];
  const counts = {};
  for (const w of words) for (const m of w.marks) counts[m.id] = (counts[m.id] || 0) + 1;
  return { ref, raw: stripUxlcMarkup(raw), he: cleanLine(raw), largeLetters: largeLettersIn(raw), words, halves, markCounts: counts };
}

/** The two passages this stage covers, with the snapshot items that hold their UXLC raw lines. */
export const PASSAGES = [
  // Numbers 6:22-27: the framing verses 22-23 and 27 are snapshot-only (fetch_sources_qere.py); the blessing itself is 6:24-26.
  { id: 'priestly-blessing', title: 'Priestly Blessing', book: 'Numbers', chapter: 6, from: 22, to: 27, registryIds: ['bless-priestly-1', 'bless-priestly-2', 'bless-priestly-3'], registryVerses: [24, 25, 26], snapshotIds: ['bless-priestly-intro', 'bless-priestly-1', 'bless-priestly-2', 'bless-priestly-3', 'bless-priestly-close'] },
  { id: 'shema', title: 'Shema and V\'ahavta', book: 'Deuteronomy', chapter: 6, from: 4, to: 9, registryIds: ['shema-vahavta'], registryVerses: [4, 5, 6, 7, 8, 9], snapshotIds: ['shema-vahavta'] },
];

/** Raw verse lines for a passage from the committed snapshot; checked against the XML cache when it is on disk. */
export function passageRawLines(p, snapshot, uxlcDir = UXLC_DIR) {
  const lines = [];
  for (const sid of p.snapshotIds) {
    const item = snapshot[sid];
    if (!item || item.kind !== 'tanach-us') throw new Error('snapshot item missing or not UXLC: ' + sid);
    lines.push(...item.rawLines);
  }
  if (lines.length !== p.to - p.from + 1) throw new Error(`${p.id}: expected ${p.to - p.from + 1} raw lines, got ${lines.length}`);
  const book = loadUxlcBook(p.book, uxlcDir);
  if (book) {
    for (let v = p.from; v <= p.to; v++) {
      const x = book.get(p.chapter + ':' + v);
      const a = stripUxlcMarkup(lines[v - p.from]), b = stripUxlcMarkup(x ? x.raw : '');
      if (a !== b) throw new Error(`${p.book} ${p.chapter}:${v}: snapshot raw line differs from the UXLC XML cache`);
    }
  }
  return { lines, checkedAgainstXml: !!book };
}

export function buildPassage(p, snapshot, uxlcDir = UXLC_DIR) {
  const { lines, checkedAgainstXml } = passageRawLines(p, snapshot, uxlcDir);
  const item = snapshot[p.snapshotIds[0]];
  const verses = lines.map((raw, k) => parseVerse(raw, `${p.book} ${p.chapter}:${p.from + k}`)).map((v, k) => ({ book: p.book, chapter: p.chapter, verse: p.from + k, ...v }));
  const counts = {};
  for (const v of verses) for (const [k, n] of Object.entries(v.markCounts)) counts[k] = (counts[k] || 0) + n;
  return {
    schema: 'alef-corpus-trope/1',
    id: p.id,
    title: p.title,
    ref: `${p.book} ${p.chapter}:${p.from}-${p.to}`,
    system: 'prose (21 books)',
    source: item.versionTitle,
    sourceUrl: item.url,
    license: item.license,
    attribution: 'Hebrew text with cantillation: Unicode/XML Leningrad Codex (UXLC), Tanach.us Inc. ("may be viewed or copied without restriction"). Not the WLC.',
    checkedAgainstXml,
    note: 'Machine parse of the UXLC code points. Mark names follow the table in data/corpus/trope/table.json; the musical motifs are not described and nothing here was reviewed by a cantor.',
    registryIds: p.registryIds,
    registryVerses: p.registryVerses,
    markCounts: counts,
    words: verses.reduce((n, v) => n + v.words.length, 0),
    verses,
  };
}

export function buildTable() {
  return {
    schema: 'alef-corpus-trope-table/1',
    note: 'Cantillation marks of the prose (21 books) system with their names in the two usual naming systems, Ashkenazi and Sephardi/Mizrahi. Hebrew names unpointed. Levels: 1 emperor (keisarim), 2 king (melachim), 3 duke (mishnim), 4 count (shlishim), a teaching grouping of the disjunctives by strength. Not reviewed by a cantor. The poetic (3 books) marks are listed separately and are not parsed.',
    prose: TROPE_TABLE.map((t) => ({ ...t, unicodePoint: uplus(t.cp), char: String.fromCodePoint(t.cp) })),
    poetic: POETIC_TABLE.map((t) => ({ ...t, unicodePoint: uplus(t.cp), char: String.fromCodePoint(t.cp) })),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Stage 3: reader data (verse by verse, word index, aliyah context, timing placeholders)

/**
 * Aliyah context. Ranges are the standard weekly division as listed by the Sefaria calendar API (fetched 2026-11-04
 * for Nasso 2026-05-30 and Vaetchanan 2026-07-25, diaspora). Structural references only; no text was taken.
 */
export const ALIYOT = {
  'priestly-blessing': {
    parashah: { en: 'Nasso', he: 'נשא', number: 35, range: 'Numbers 4:21-7:89' },
    aliyot: ['Numbers 4:21-4:37', 'Numbers 4:38-4:49', 'Numbers 5:1-5:10', 'Numbers 5:11-6:27', 'Numbers 7:1-7:41', 'Numbers 7:42-7:71', 'Numbers 7:72-7:89'],
    maftir: 'Numbers 7:87-7:89',
    passageAliyah: 4,
    startsAliyah: false,
    note: 'Numbers 6:22-27 sits inside the fourth aliyah (5:11-6:27). Verses 22-23 (the instruction to Aaron) and 27 (the closing) are narrative; the blessing proper is 6:24-26. It is also recited, not read from the scroll, as the Priestly Blessing in the service; there the three verses are said one at a time with the congregation responding after each.',
  },
  shema: {
    parashah: { en: 'Vaetchanan', he: 'ואתחנן', number: 45, range: 'Deuteronomy 3:23-7:11' },
    aliyot: ['Deuteronomy 3:23-4:4', 'Deuteronomy 4:5-4:40', 'Deuteronomy 4:41-4:49', 'Deuteronomy 5:1-5:18', 'Deuteronomy 5:19-6:3', 'Deuteronomy 6:4-6:25', 'Deuteronomy 7:1-7:11'],
    maftir: 'Deuteronomy 7:9-7:11',
    passageAliyah: 6,
    startsAliyah: true,
    note: 'Deuteronomy 6:4 opens the sixth aliyah (6:4-6:25). In the service the passage is recited (first paragraph of the Shema); verse 4 is said alone, the response Baruch shem (registry shema-2, not Torah text) follows, then verses 5-9.',
  },
};

/** Liturgical reading units inside each passage (where a reciter pauses), by verse. */
export const READING_UNITS = {
  'priestly-blessing': [
    { id: 'intro', verses: [22, 23], label: 'Introduction (6:22-23, narrative, not part of the blessing)' },
    { id: 'line-1', verses: [24], label: 'Line 1 (3 words)' },
    { id: 'line-2', verses: [25], label: 'Line 2 (5 words)' },
    { id: 'line-3', verses: [26], label: 'Line 3 (7 words)' },
    { id: 'closing', verses: [27], label: 'Closing (6:27, narrative)' },
  ],
  shema: [
    { id: 'shema', verses: [4], label: 'Shema (verse 4)' },
    { id: 'vahavta', verses: [5, 6, 7, 8, 9], label: 'V\'ahavta (verses 5-9)' },
  ],
};

export function buildReader(p, trope, registry, snapshot) {
  const regById = new Map(registry.map((e) => [e.id, e]));
  // English (JPS 1917) by verse from the snapshot
  const english = new Map();
  for (const sid of p.snapshotIds) {
    const it = snapshot[sid];
    const en = it.english?.rawLines || [];
    for (let k = 0; k < en.length; k++) english.set(it.verses[0] + k, en[k]);
  }
  // literal glosses: any one-verse registry record for the verse that carries wordGlosses (one gloss per reading token)
  const glosses = new Map();
  for (const e of registry) {
    if (!e.wordGlosses || e.lines !== 1) continue;
    const m = /^(\w+) (\d+):(\d+)$/.exec(e.ref);
    if (m && m[1] === p.book && +m[2] === p.chapter) glosses.set(+m[3], { id: e.id, glosses: e.wordGlosses });
  }
  const units = READING_UNITS[p.id];
  let g = 0;
  const index = {};
  const verses = trope.verses.map((v) => {
    const unit = units.find((u) => u.verses.includes(v.verse));
    const words = v.words.map((w, i) => {
      const key = w.plain.replace(/׃$/, '');
      (index[key] ||= []).push([v.verse, i]);
      return {
        i, g: g++,
        he: key,
        heTrope: w.text,
        joinedWithNext: /־$/.test(key),
        trope: w.trope,
        tropeClass: w.tropeClass,
        marks: w.marks.filter((m) => m.cls !== 'verse-end').map((m) => m.id),
        stressLetterIndex: w.stressLetterIndex,
        pauseAfter: w.disjunctiveLevel === 1 ? 'major' : w.tropeClass === 'disjunctive' ? 'minor' : w.pasek ? 'pasek' : 'none',
        timing: { start: null, end: null },
      };
    });
    // reading tokens: maqaf-joined words form one token (the registry's wordsOf convention); glosses attach here
    const tokens = [];
    let cur = null;
    for (const w of words) {
      if (!cur) cur = { t: tokens.length, he: '', words: [] };
      cur.he += w.he; cur.words.push(w.i);
      if (!w.joinedWithNext) { tokens.push(cur); cur = null; }
    }
    if (cur) tokens.push(cur);
    const gl = glosses.get(v.verse);
    for (const t of tokens) {
      t.gloss = gl && gl.glosses.length === tokens.length ? gl.glosses[t.t] : null;
      t.trope = words[t.words[t.words.length - 1]].trope;
      t.timing = { start: null, end: null };
    }
    return {
      ref: v.ref, book: v.book, chapter: v.chapter, verse: v.verse,
      unit: unit ? unit.id : null,
      he: v.he,
      heTrope: v.raw,
      english: english.get(v.verse) ?? null,
      englishSource: english.has(v.verse) ? 'JPS 1917 (The Holy Scriptures: A New Translation), Public Domain (label from Sefaria metadata, unverified)' : null,
      glossSource: gl && gl.glosses.length === tokens.length ? `registry ${gl.id} wordGlosses (original literal glosses)` : null,
      largeLetters: v.largeLetters,
      halves: v.halves,
      words,
      tokens,
      timing: { start: null, end: null },
    };
  });
  const reg0 = regById.get(p.registryIds[0]);
  return {
    schema: 'alef-corpus-reader/1',
    id: p.id,
    title: p.title,
    ref: trope.ref,
    registryIds: p.registryIds,
    registryVerses: p.registryVerses,
    source: trope.source,
    sourceUrl: trope.sourceUrl,
    license: trope.license,
    attribution: reg0?.attribution || trope.attribution,
    note: 'Verse-by-verse reader data. he = pointed text without cantillation (registry normalisation); heTrope = UXLC text with cantillation. words = UXLC word units (a maqaf-joined proclitic is its own word, joinedWithNext true); tokens = reading tokens, maqaf groups joined, which is where the literal glosses attach (null where no registry record has them). timing.start/end are placeholders in seconds for future audio alignment; null until a recording exists. Aliyah ranges from the Sefaria calendar API; reading units are common practice, not reviewed by clergy.',
    aliyah: ALIYOT[p.id],
    readingUnits: units,
    wordCount: g,
    tokenCount: verses.reduce((n, v) => n + v.tokens.length, 0),
    wordIndex: index,
    verses,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const snapshot = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/corpus/source-snapshot.json'), 'utf8')).items;
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/corpus/registry.json'), 'utf8')).entries;
  const tropeDir = path.join(ROOT, 'data/corpus/trope');
  const readerDir = path.join(ROOT, 'data/corpus/reader');
  fs.mkdirSync(tropeDir, { recursive: true });
  fs.mkdirSync(readerDir, { recursive: true });
  fs.writeFileSync(path.join(tropeDir, 'table.json'), JSON.stringify(buildTable(), null, 1) + '\n');
  for (const p of PASSAGES) {
    const t = buildPassage(p, snapshot);
    fs.writeFileSync(path.join(tropeDir, p.id + '.json'), JSON.stringify(t, null, 1) + '\n');
    const r = buildReader(p, t, registry, snapshot);
    fs.writeFileSync(path.join(readerDir, p.id + '.json'), JSON.stringify(r, null, 1) + '\n');
    console.log(`${p.id}: ${t.verses.length} verses, ${t.words} words, marks ${JSON.stringify(t.markCounts)}; xml-checked ${t.checkedAgainstXml}`);
  }
  console.log('wrote data/corpus/trope/*.json and data/corpus/reader/*.json');
}
