// Corpus text verifier (stage 1). Pure checks + a Markdown report.
//   node tools/corpus/verify_texts.mjs            # writes docs/corpus/VERIFY-REPORT.md
//   node tools/corpus/verify_texts.mjs --check    # same, and exits 1 if any record has a hard failure
//
// What it checks, per record in data/corpus/registry.json (field `he`, plus `variants.*.he`):
//   latin / digit / control / non-hebrew  stray characters outside the Hebrew block, space and newline
//   accent / paseq / presentation         marks the normaliser (src/corpus/normalize.js) promises to remove
//   mark-no-letter                        a vowel, dagesh or shin/sin dot that does not sit on a Hebrew letter
//   double-vowel / double-mark            two vowels, or the same mark twice, on one letter
//   shin-dot-off-shin / sin-and-shin      shin/sin dot on another letter, or both dots on one shin
//   dagesh-on-alef-ayin (warning)         dagesh in alef or ayin (occurs in Leningrad; flagged, not failed)
//   final-midword / nonfinal-at-end       final-letter forms (ך ם ן ף ץ) only at word ends; maqaf counts as a word end
//   maqaf / sof-pasuq                     maqaf needs a letter on both sides; sof pasuq ends a word, never doubled
//   nfc                                   string is NFC-stable
// Cross-check: records whose `ref` is Book c:v[-v] are compared with the UXLC XML in tools/vocab/.cache/tanach/
// (if present; it is gitignored) and with the raw snapshot lines in data/corpus/source-snapshot.json.
// Licence listing: every record whose licence label comes from Sefaria metadata (UNVERIFIED in LICENSES.md) with its URL;
// the Metsudah (CC-BY label) records are listed separately.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanLine, applyTransforms, foldedSkeleton } from '../../src/corpus/normalize.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const UXLC_DIR = path.join(ROOT, 'tools/vocab/.cache/tanach');

const CP = (s) => [...s].map((c) => c.codePointAt(0));
const isLetter = (c) => c >= 0x05d0 && c <= 0x05ea;
const isFinal = (c) => c === 0x05da || c === 0x05dd || c === 0x05df || c === 0x05e3 || c === 0x05e5;
const NONFINAL_WITH_FINAL = new Set([0x05db, 0x05de, 0x05e0, 0x05e4, 0x05e6]); // כ מ נ פ צ
const isVowel = (c) => (c >= 0x05b0 && c <= 0x05bb) || c === 0x05c7;
const isAccent = (c) => c >= 0x0591 && c <= 0x05af;
const isMark = (c) => (c >= 0x0591 && c <= 0x05bd) || c === 0x05bf || c === 0x05c1 || c === 0x05c2 || c === 0x05c4 || c === 0x05c5 || c === 0x05c7;
const MAQAF = 0x05be, SOF = 0x05c3, PASEQ = 0x05c0, SHIN = 0x05e9, ALEF = 0x05d0, AYIN = 0x05e2, DAGESH = 0x05bc, SHIN_DOT = 0x05c1, SIN_DOT = 0x05c2;
const isControl = (c) => (c < 0x20 && c !== 0x0a) || (c >= 0x7f && c <= 0x9f) || (c >= 0x200b && c <= 0x200f) || (c >= 0x202a && c <= 0x202e) || (c >= 0x2060 && c <= 0x2064) || c === 0xfeff || c === 0x034f || c === 0xa0;

/** Codes that count as hard failures (the rest are warnings). */
export const HARD = new Set(['latin', 'digit', 'control', 'non-hebrew', 'accent', 'paseq', 'presentation', 'mark-no-letter', 'double-vowel', 'double-mark', 'shin-dot-off-shin', 'sin-and-shin', 'final-midword', 'nonfinal-at-end', 'maqaf', 'sof-pasuq', 'nfc']);

/**
 * Check one display-Hebrew string. Returns { issues: [{code, at, text}], stats }.
 * @param {string} s
 */
export function checkHebrew(s) {
  const issues = [];
  const push = (code, at, text) => issues.push({ code, at, text });
  const cps = CP(s);
  const stats = { letters: 0, words: 0, maqaf: 0, sofPasuq: 0, lines: s ? s.split('\n').length : 0 };
  if (s !== s.normalize('NFC')) push('nfc', 0, 'not NFC');
  for (let i = 0; i < cps.length; i++) {
    const c = cps[i];
    if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) push('latin', i, String.fromCodePoint(c));
    else if (c >= 0x30 && c <= 0x39) push('digit', i, String.fromCodePoint(c));
    else if (isControl(c)) push('control', i, 'U+' + c.toString(16).toUpperCase().padStart(4, '0'));
    else if (c >= 0xfb1d && c <= 0xfb4f) push('presentation', i, 'U+' + c.toString(16).toUpperCase());
    else if (isAccent(c)) push('accent', i, 'U+' + c.toString(16).toUpperCase().padStart(4, '0'));
    else if (c === PASEQ) push('paseq', i, '׀');
    else if (!(c >= 0x0590 && c <= 0x05ff) && c !== 0x20 && c !== 0x0a) push('non-hebrew', i, 'U+' + c.toString(16).toUpperCase().padStart(4, '0'));
  }
  // letter clusters: letter + following marks
  let i = 0;
  let prevLetter = -1; // index of last letter in current word, -1 if none
  let wordHasLetter = false;
  const endWord = (at) => {
    if (prevLetter >= 0 && NONFINAL_WITH_FINAL.has(cps[prevLetter])) push('nonfinal-at-end', prevLetter, String.fromCodePoint(cps[prevLetter]));
    if (wordHasLetter) stats.words++;
    prevLetter = -1; wordHasLetter = false;
  };
  while (i < cps.length) {
    const c = cps[i];
    if (isLetter(c)) {
      if (prevLetter >= 0 && isFinal(cps[prevLetter])) push('final-midword', prevLetter, String.fromCodePoint(cps[prevLetter]));
      stats.letters++; wordHasLetter = true; prevLetter = i;
      let j = i + 1; const marks = [];
      while (j < cps.length && isMark(cps[j])) { marks.push(cps[j]); j++; }
      const vowels = marks.filter(isVowel);
      if (vowels.length > 1) push('double-vowel', i, String.fromCodePoint(c, ...marks));
      const seen = new Set();
      for (const m of marks) { if (seen.has(m)) push('double-mark', i, String.fromCodePoint(c, ...marks)); seen.add(m); }
      if ((seen.has(SHIN_DOT) || seen.has(SIN_DOT)) && c !== SHIN) push('shin-dot-off-shin', i, String.fromCodePoint(c, ...marks));
      if (seen.has(SHIN_DOT) && seen.has(SIN_DOT)) push('sin-and-shin', i, String.fromCodePoint(c, ...marks));
      if (seen.has(DAGESH) && (c === ALEF || c === AYIN)) push('dagesh-on-alef-ayin', i, String.fromCodePoint(c, ...marks));
      i = j; continue;
    }
    if (isMark(c)) { push('mark-no-letter', i, 'U+' + c.toString(16).toUpperCase().padStart(4, '0')); i++; continue; }
    if (c === MAQAF) {
      stats.maqaf++;
      if (prevLetter < 0) push('maqaf', i, 'maqaf with nothing before it');
      const n = cps[i + 1];
      if (n === undefined || !isLetter(n)) push('maqaf', i, 'maqaf not followed by a letter');
      endWord(i); i++; continue;
    }
    if (c === SOF) {
      stats.sofPasuq++;
      if (prevLetter < 0) push('sof-pasuq', i, 'sof pasuq with no word before it');
      const n = cps[i + 1];
      if (!(n === undefined || n === 0x20 || n === 0x0a)) push('sof-pasuq', i, 'sof pasuq not at the end of a word');
      endWord(i); i++; continue;
    }
    if (c === 0x20 || c === 0x0a) { endWord(i); i++; continue; }
    i++; // other characters were already reported above
  }
  endWord(cps.length);
  return { issues, stats };
}

/** "Numbers 6:24", "Deuteronomy 6:6-7", "Psalm 51:17 (Amidah preface)" -> {book, chapter, from, to}; null otherwise. */
export function parseRef(ref) {
  const m = /^(1 |2 |I |II )?([A-Za-z ]+?)\s+(\d+):(\d+)(?:-(\d+))?/.exec(ref || '');
  if (!m) return null;
  let book = (m[1] ? m[1].trim().replace(/^I$/, '1').replace(/^II$/, '2') + ' ' : '') + m[2].trim();
  book = canonBook(book);
  if (!book) return null;
  return { book, chapter: +m[3], from: +m[4], to: m[5] ? +m[5] : +m[4] };
}

const BOOK_FILES = {
  genesis: 'Genesis', exodus: 'Exodus', leviticus: 'Leviticus', numbers: 'Numbers', deuteronomy: 'Deuteronomy',
  joshua: 'Joshua', judges: 'Judges', '1 samuel': 'Samuel_1', '2 samuel': 'Samuel_2', '1 kings': 'Kings_1', '2 kings': 'Kings_2',
  isaiah: 'Isaiah', jeremiah: 'Jeremiah', ezekiel: 'Ezekiel', hosea: 'Hosea', joel: 'Joel', amos: 'Amos', obadiah: 'Obadiah',
  jonah: 'Jonah', micah: 'Micah', nahum: 'Nahum', habakkuk: 'Habakkuk', zephaniah: 'Zephaniah', haggai: 'Haggai',
  zechariah: 'Zechariah', malachi: 'Malachi', psalm: 'Psalms', psalms: 'Psalms', proverbs: 'Proverbs', job: 'Job',
  'song of songs': 'Song_of_Songs', ruth: 'Ruth', lamentations: 'Lamentations', ecclesiastes: 'Ecclesiastes', esther: 'Esther',
  daniel: 'Daniel', ezra: 'Ezra', nehemiah: 'Nehemiah', '1 chronicles': 'Chronicles_1', '2 chronicles': 'Chronicles_2',
};
export function canonBook(name) { return BOOK_FILES[name.toLowerCase()] || null; }

/** Embedded "Book c:v" references inside a siddur ref, e.g. "(Numbers 10:35, Isaiah 2:3, blessing)". */
export function embeddedRefs(ref) {
  const out = [];
  // "Psalm 99:5, 99:9" and "Proverbs 3:18, 3:17": a bare c:v after a comma keeps the last book name
  const re = /((?:1 |2 )?[A-Z][a-z]+(?: of [A-Z][a-z]+)?)? ?(\d+):(\d+)(?:-(\d+))?/g;
  let book = null;
  for (const m of (ref || '').matchAll(re)) {
    if (m[1]) book = canonBook(m[1]);
    else if (!/,\s*$/.test(ref.slice(0, m.index))) book = null;
    if (book) out.push({ book, chapter: +m[2], from: +m[3], to: m[4] ? +m[4] : +m[3] });
  }
  return out;
}

const uxlcCache = new Map();
/**
 * Load one UXLC book from the local cache: Map "c:v" -> { words: raw <w>/<q> strings (ketiv skipped), raw: joined }.
 * Returns null when the XML is not on disk.
 */
export function loadUxlcBook(book, dir = UXLC_DIR) {
  const key = dir + '/' + book;
  if (uxlcCache.has(key)) return uxlcCache.get(key);
  const file = path.join(dir, book + '.xml');
  if (!fs.existsSync(file)) { uxlcCache.set(key, null); return null; }
  const xml = fs.readFileSync(file, 'utf8');
  const verses = new Map();
  for (const cm of xml.matchAll(/<c n="(\d+)">([\s\S]*?)<\/c>/g)) {
    for (const vm of cm[2].matchAll(/<v n="(\d+)">([\s\S]*?)<\/v>/g)) {
      const words = [], wOnly = [];
      for (const wm of vm[2].matchAll(/<(w|q)>([\s\S]*?)<\/\1>/g)) { words.push(wm[2].trim()); if (wm[1] === 'w') wOnly.push(wm[2].trim()); }
      // <k> (ketiv, unpointed) is skipped; <q> (qere, pointed) is read as a word. wOnly = <w> elements alone.
      verses.set(cm[1] + ':' + vm[1], { words, raw: words.join(' '), rawWOnly: wOnly.join(' '), hasQere: wOnly.length !== words.length });
    }
  }
  uxlcCache.set(key, verses);
  return verses;
}

/** UXLC verse range as display Hebrew lines (one per verse) using the registry normaliser. */
export function uxlcLines(r, dir = UXLC_DIR) {
  const book = loadUxlcBook(r.book, dir);
  if (!book) return null;
  const lines = [], linesWOnly = [];
  let hasQere = false;
  for (let v = r.from; v <= r.to; v++) {
    const e = book.get(r.chapter + ':' + v);
    if (!e) return { missing: r.book + ' ' + r.chapter + ':' + v };
    lines.push(cleanLine(e.raw)); linesWOnly.push(cleanLine(e.rawWOnly)); hasQere = hasQere || e.hasQere;
  }
  return { lines, linesWOnly, hasQere };
}

const wordsNoStop = (s) => s.replace(/׃/g, ' ').split(/\s+/).filter(Boolean);
/** Is `needle` (word list) a contiguous run inside `hay` (word list)? */
export function isContiguousRun(hay, needle) {
  if (!needle.length) return false;
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

/**
 * Compare a record with UXLC. Result status:
 *   equal       every line of `he` equals the corresponding UXLC verse
 *   clip        `he` is a contiguous run of words inside the verse range (records built with a clip)
 *   mismatch    neither
 *   no-xml      UXLC cache not on disk
 *   missing     verse not found in the XML
 */
export function crossCheckUxlc(entry, dir = UXLC_DIR) {
  const r = parseRef(entry.ref);
  if (!r) return { status: 'no-ref' };
  const u = uxlcLines(r, dir);
  if (!u) return { status: 'no-xml', ref: r };
  if (u.missing) return { status: 'missing', ref: r, detail: u.missing };
  const heLines = entry.he.split('\n');
  const sameCount = heLines.length === u.lines.length && heLines.every((l, i) => l === u.lines[i]);
  if (sameCount) return { status: 'equal', ref: r, verses: u.lines.length };
  const run = isContiguousRun(wordsNoStop(u.lines.join(' ')), wordsNoStop(entry.he));
  if (run) return { status: 'clip', ref: r, verses: u.lines.length };
  const diff = [];
  const a = wordsNoStop(u.lines.join(' ')), b = wordsNoStop(entry.he);
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) { diff.push({ i, uxlc: a[i] || '', he: b[i] || '' }); if (diff.length >= 3) break; }
  const qereDropped = u.hasQere && heLines.length === u.linesWOnly.length && heLines.every((l, i) => l === u.linesWOnly[i]);
  return { status: 'mismatch', ref: r, verses: u.lines.length, diff, qereDropped };
}

/** For siddur records quoting Tanakh verses in the ref: how many of the quoted verses occur verbatim in `he`. */
export function embeddedQuoteCheck(entry, dir = UXLC_DIR) {
  const refs = embeddedRefs(entry.ref.replace(/^[^()]*\(/, '('));
  if (!refs.length) return null;
  const hay = wordsNoStop(entry.he.replace(/\n/g, ' ')).map(foldedSkeleton);
  const out = [];
  for (const r of refs) {
    const u = uxlcLines(r, dir);
    if (!u) return { status: 'no-xml', refs: refs.length };
    if (u.missing) { out.push({ ref: r, found: false, missing: true }); continue; }
    const needle = wordsNoStop(u.lines.join(' ')).map(foldedSkeleton);
    out.push({ ref: r, found: isContiguousRun(hay, needle) });
  }
  return { status: 'checked', refs: refs.length, found: out.filter((o) => o.found).length, detail: out };
}

/** Re-derive `he` from the committed snapshot raw lines with the record's transforms (same rule the registry builder uses). */
export function crossCheckSnapshot(entry, snapshot) {
  const item = snapshot[entry.snapshotId || entry.id];
  if (!item) return { status: entry.derivedFrom ? 'derived' : 'no-snapshot' };
  const he = entry.he.split('\n');
  // First-round records carry no `transforms` field although the builder applied dropSmall / clip to some of them,
  // so when the record's own transforms do not reproduce `he`, the two documented stage-direction options are tried too.
  const candidates = entry.transforms ? [entry.transforms] : [{}, { dropSmall: true }, { dropParen: true, dropSmall: true }];
  let run = false;
  for (const t of candidates) {
    let derived;
    try { derived = applyTransforms(item.rawLines, t); } catch (e) { return { status: 'error', detail: String(e.message) }; }
    if (derived.length === he.length && derived.every((l, i) => l === he[i])) return { status: 'equal' };
    if (isContiguousRun(wordsNoStop(derived.join(' ')), wordsNoStop(entry.he.replace(/\n/g, ' ')))) run = true;
  }
  return { status: run ? 'clip' : 'differs' };
}

const SEFARIA_LABEL_RE = /NOT INDEPENDENTLY VERIFIED|label not independently verified/i;

/** Run everything. */
export function verifyAll({ root = ROOT, uxlcDir = UXLC_DIR } = {}) {
  const reg = JSON.parse(fs.readFileSync(path.join(root, 'data/corpus/registry.json'), 'utf8'));
  const snap = JSON.parse(fs.readFileSync(path.join(root, 'data/corpus/source-snapshot.json'), 'utf8'));
  const uxlcPresent = fs.existsSync(uxlcDir);
  const records = [];
  for (const e of reg.entries) {
    const strings = [['he', e.he]];
    for (const [k, v] of Object.entries(e.variants || {})) if (v && typeof v.he === 'string') strings.push(['variants.' + k + '.he', v.he]);
    const issues = [];
    let stats = null;
    for (const [field, s] of strings) {
      const r = checkHebrew(s);
      for (const i of r.issues) issues.push({ field, ...i });
      if (field === 'he') stats = r.stats;
    }
    const hard = issues.filter((i) => HARD.has(i.code));
    const warn = issues.filter((i) => !HARD.has(i.code));
    const snapItem = snap.items[e.snapshotId || e.id];
    const sefariaHebrew = !!snapItem && snapItem.kind !== 'tanach-us';
    const englishViaSefaria = !!(snapItem && snapItem.english) || (e.englishSource || '').startsWith('JPS');
    records.push({
      id: e.id, ref: e.ref, category: e.category, status: e.status, license: e.license, sourceUrl: e.sourceUrl,
      source: e.source, englishSource: e.englishSource, englishLicense: e.englishLicense,
      englishVersionSource: snapItem?.english?.versionSource || null,
      metsudah: /Metsudah/i.test(e.source),
      licenceUnverified: sefariaHebrew || SEFARIA_LABEL_RE.test(e.attribution || ''),
      englishLabelUnverified: englishViaSefaria && (e.englishSource || '').startsWith('JPS'),
      stats, hard, warn,
      uxlc: e.category === 'torah' || parseRef(e.ref) ? crossCheckUxlc(e, uxlcDir) : { status: 'no-ref' },
      quotes: e.category === 'siddur' ? embeddedQuoteCheck(e, uxlcDir) : null,
      snapshot: crossCheckSnapshot(e, snap.items),
    });
  }
  const count = (f) => records.filter(f).length;
  const byCode = {};
  for (const r of records) for (const i of [...r.hard, ...r.warn]) byCode[i.code] = (byCode[i.code] || 0) + 1;
  const summary = {
    records: records.length,
    torah: count((r) => r.category === 'torah'),
    siddur: count((r) => r.category === 'siddur'),
    hardFail: count((r) => r.hard.length),
    warn: count((r) => r.warn.length),
    byCode,
    uxlc: tally(records.map((r) => r.uxlc.status)),
    snapshot: tally(records.map((r) => r.snapshot.status)),
    licenceUnverified: count((r) => r.licenceUnverified),
    englishLabelUnverified: count((r) => r.englishLabelUnverified),
    metsudah: count((r) => r.metsudah),
    byLicence: tally(records.map((r) => r.license)),
    uxlcPresent,
  };
  return { generated: new Date().toISOString().slice(0, 10), registryGenerated: reg.generated, snapshotFetched: snap.fetchedAt, uxlcDir: path.relative(root, uxlcDir), summary, records };
}

function tally(list) { const m = {}; for (const x of list) m[x] = (m[x] || 0) + 1; return m; }
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

/** Markdown report. */
export function renderReport(rep) {
  const S = rep.summary;
  const L = [];
  L.push('# Corpus text verification report');
  L.push('');
  L.push(`Generated ${rep.generated} by \`tools/corpus/verify_texts.mjs\` from \`data/corpus/registry.json\` (built ${rep.registryGenerated}) and \`data/corpus/source-snapshot.json\` (fetched ${rep.snapshotFetched}). Regenerate with \`node tools/corpus/verify_texts.mjs\`; \`tests/corpus.verify.test.js\` re-runs the same checks.`);
  L.push('');
  L.push('These are machine checks of character-level consistency and of agreement with the cited source files. They are not proofreading by a Hebrew educator, and nothing here changes a licence label; see `docs/corpus/LICENSES.md`.');
  L.push('');
  L.push('## 1. Counts');
  L.push('');
  L.push('| Check | Count |');
  L.push('|---|---|');
  L.push(`| Records | ${S.records} (torah ${S.torah}, siddur ${S.siddur}) |`);
  L.push(`| Records with a hard failure (stray characters, mark placement, final forms, maqaf/sof pasuq, NFC) | ${S.hardFail} |`);
  L.push(`| Records with warnings only (dagesh on alef/ayin) | ${S.warn} |`);
  for (const [code, n] of Object.entries(S.byCode).sort()) L.push(`| ${HARD.has(code) ? 'failure' : 'warning'} \`${code}\` (occurrences) | ${n} |`);
  L.push(`| UXLC cross-check (${rep.uxlcDir}${S.uxlcPresent ? '' : ', NOT on disk'}) | ${Object.entries(S.uxlc).map(([k, v]) => `${k} ${v}`).join(', ')} |`);
  L.push(`| Snapshot re-derivation (source-snapshot.json raw lines through normalize.js) | ${Object.entries(S.snapshot).map(([k, v]) => `${k} ${v}`).join(', ')} |`);
  L.push(`| Hebrew licence label taken from Sefaria metadata (unverified) | ${S.licenceUnverified} |`);
  L.push(`| English licence label (JPS 1917 "Public Domain") taken from Sefaria metadata (unverified) | ${S.englishLabelUnverified} |`);
  L.push(`| Metsudah siddur (1981) records, labelled CC-BY by Sefaria | ${S.metsudah} |`);
  for (const [k, v] of Object.entries(S.byLicence)) L.push(`| Licence label "${esc(k)}" | ${v} |`);
  L.push('');
  L.push('Cross-check statuses: `equal` every line equals the UXLC verse after the registry normalisation; `clip` the record is a contiguous run of words inside the verse range (records that quote part of a verse); `mismatch` neither; `no-ref` the ref is not Book chapter:verse; `no-xml` the UXLC cache is not on disk (it is gitignored, so a fresh clone shows this). Snapshot statuses: `equal` re-derived from the raw snapshot line with the record\'s `transforms`; `clip` a word run of that derivation; `derived` the record is derived from another record and has no snapshot item.');
  L.push('');
  L.push('## 2. Per-record table');
  L.push('');
  L.push('| id | ref | cat | letters | words | maqaf | sof pasuq | failures | warnings | UXLC | snapshot |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rep.records) {
    const st = r.stats || {};
    const f = r.hard.length ? r.hard.map((i) => `${i.code}@${i.at}`).join(' ') : '-';
    const w = r.warn.length ? r.warn.map((i) => `${i.code}@${i.at}`).join(' ') : '-';
    let u = r.uxlc.status;
    if (r.uxlc.status === 'mismatch') u += ' (' + r.uxlc.diff.map((d) => `${d.i}: ${d.uxlc} / ${d.he}`).join('; ') + (r.uxlc.qereDropped ? '; equals UXLC with the qere word dropped' : '') + ')';
    if (r.quotes && r.quotes.status === 'checked') u += ` quotes ${r.quotes.found}/${r.quotes.refs}`;
    L.push(`| \`${r.id}\` | ${esc(r.ref)} | ${r.category} | ${st.letters ?? ''} | ${st.words ?? ''} | ${st.maqaf ?? ''} | ${st.sofPasuq ?? ''} | ${esc(f)} | ${esc(w)} | ${esc(u)} | ${r.snapshot.status} |`);
  }
  L.push('');
  L.push('`quotes a/b` on a siddur record: of the b Tanakh verses named in its ref, a occur verbatim (by consonant skeleton) inside the record. A miss is not an error: siddur wording often differs from the Masoretic verse.');
  L.push('');
  L.push('## 3. Records whose licence label is unverified');
  L.push('');
  L.push('The Hebrew licence label of every record below is what Sefaria\'s API reported for the version; nobody on this project has checked it against the publisher. Exact source URL as stored in the registry.');
  L.push('');
  L.push('| id | licence label | Hebrew source | source URL |');
  L.push('|---|---|---|---|');
  for (const r of rep.records.filter((x) => x.licenceUnverified)) L.push(`| \`${r.id}\` | ${esc(r.license)} | ${esc(r.source)} | ${r.sourceUrl} |`);
  L.push('');
  const en = rep.records.filter((x) => x.englishLabelUnverified);
  L.push(`English: ${en.length} records carry JPS 1917 English labelled "Public Domain" by Sefaria (public domain by age in the US; label itself unverified). Version source URL given by Sefaria: ${[...new Set(en.map((r) => r.englishVersionSource).filter(Boolean))].join(', ') || 'none recorded'}. Records: ${en.map((r) => '`' + r.id + '`').join(', ')}.`);
  L.push('');
  L.push('## 4. Metsudah records (flagged)');
  L.push('');
  L.push('The Metsudah siddur is a 1981 publication. Sefaria labels its digitisation CC-BY; LICENSES.md calls it the riskiest source. These records would need replacing or permission before commercial use:');
  L.push('');
  L.push('| id | ref | source URL |');
  L.push('|---|---|---|');
  for (const r of rep.records.filter((x) => x.metsudah)) L.push(`| \`${r.id}\` | ${esc(r.ref)} | ${r.sourceUrl} |`);
  L.push('');
  L.push('## 5. UXLC mismatches');
  L.push('');
  const mm = rep.records.filter((r) => r.uxlc.status === 'mismatch');
  if (!mm.length) L.push('None.');
  for (const r of mm) {
    L.push(`- \`${r.id}\` (${esc(r.ref)}): first differing words (UXLC / record): ` + r.uxlc.diff.map((d) => `#${d.i} ${d.uxlc} / ${d.he}`).join('; ') + '.' + (r.uxlc.qereDropped ? ' The record equals the UXLC verse with its qere word (`<q>`) left out: the snapshot fetcher reads `<w>` elements only, so a ketiv/qere word is missing from the record. Fix belongs in `src/corpus/tools/fetch_sources*.py` and a re-fetch; not changed here.' : ''));
  }
  L.push('');
  L.push('## 6. Failures and warnings in detail');
  L.push('');
  const bad = rep.records.filter((r) => r.hard.length || r.warn.length);
  if (!bad.length) L.push('None.');
  for (const r of bad) {
    L.push(`- \`${r.id}\`: ` + [...r.hard, ...r.warn].map((i) => `${HARD.has(i.code) ? 'FAIL' : 'warn'} ${i.code} at ${i.field}[${i.at}] (${i.text})`).join('; '));
  }
  L.push('');
  return L.join('\n');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const rep = verifyAll();
  const out = path.join(ROOT, 'docs/corpus/VERIFY-REPORT.md');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, renderReport(rep));
  const S = rep.summary;
  console.log(`records ${S.records}; hard failures ${S.hardFail}; warnings ${S.warn}; uxlc ${JSON.stringify(S.uxlc)}; snapshot ${JSON.stringify(S.snapshot)}; unverified labels ${S.licenceUnverified}; metsudah ${S.metsudah}`);
  console.log('wrote ' + path.relative(ROOT, out));
  if (process.argv.includes('--check') && S.hardFail) process.exit(1);
}
