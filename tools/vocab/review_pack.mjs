// Stage 1 (lint + export) and Stage 4 (gender/plural completion by rule) for data/vocab/words.json.
//
//   node tools/vocab/review_pack.mjs            writes docs/vocab/review/*.csv
//   node tools/vocab/review_pack.mjs --dry      lint only, prints counts
//
// Reads words.json and the packs under data/vocab/packs; writes ONLY CSV files under
// docs/vocab/review/. It never modifies words.json or any pack.
//
// Review sheets: one CSV per theme (= words.json `topic`), split into chunks of at most 250 rows,
// columns id, hebrew, niqqud, translit, gloss, pos, gender, source, flags, reviewer_ok, reviewer_note.
// The reviewer fills the last two columns; nothing else should be edited by hand.
//
// Lint flags (all heuristics; a flag is a question for the reviewer, not a verdict):
//   duplicate            another record has the same pointed form and POS
//   dup-spelling         another record has the same unpointed spelling and POS (and binyan, for verbs)
//                        with different pointing: a possible duplicate or ktiv variant
//   homograph            another record shares the unpointed spelling (any POS): the two share one
//                        frequency count, so the rarer one's rank is inflated
//   no-niqqud            the pointed form carries no vowel points at all
//   partial-niqqud       two or more consonants in a row carry no mark (and the word is not a loan/acronym)
//   skeleton-mismatch    consonants of the pointed form differ from heUnpointed (ignoring vav/yod)
//   translit-missing     no transliteration
//   translit-mismatch    transliteration differs from the siddur-scheme output for the pointed form
//   translit-scheme      transliteration uses letters outside the siddur scheme (diacritics, ẖ, ts, q, w)
//   gender-missing       noun without gender
//   plural-missing       noun without a listed plural form
//   gloss-machine        dictionary-ese gloss (markup, "form of", "used to", "indicating", "one who",
//                        passive "to be X-ed" first sense, over 70 characters, ...). Glosses that
//                        contain "made by" are exempt on purpose.
//   gloss-empty          no English gloss
//   licence-missing      the record carries no per-record CC BY-SA licence field
//   source-missing       the record names no dictionary/source
//   example-licence      example present but without a licence/attribution
//   pos-unknown          part of speech is "unknown"
//   needs-review         the build already flagged the record (flags.needsReview)
//   pack-mismatch        the copy of the record inside data/vocab/packs differs from words.json

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transliterate } from '../../src/pronunciation/transliterate.js';
import { ROOT, plain } from './frequency.mjs';

export const REVIEW_DIR = 'docs/vocab/review';
export const COLUMNS = ['id', 'hebrew', 'niqqud', 'translit', 'gloss', 'pos', 'gender', 'source', 'flags', 'reviewer_ok', 'reviewer_note'];
export const COMPLETION_COLUMNS = ['id', 'hebrew', 'niqqud', 'pos', 'gender_current', 'gender_rule', 'plural_current', 'plural_rule', 'rule', 'flag', 'reviewer_ok', 'reviewer_note'];
export const MAX_ROWS = 250;
export const LICENCE_RE = /CC[ -]BY[ -]SA/i;

const NIQ = /[ְ-ׇּׁׂ]/;
const VOWEL = /[ְ-ׇֻ]/;
const LETTER = /[א-ת]/;

// Dictionary-ese that a learner should not see as the headline gloss. "made by" is deliberately absent.
const MACHINE_PATTERNS = [
  /\[\[|\]\]|\{\{|\}\}/, /\bform of\b/i, /\balternative (spelling|form)\b/i, /\bdefective spelling\b/i, /\bexcessive spelling\b/i,
  /\bused to (introduce|indicate|express|mark|form|denote)\b/i, /\bindicating\b/i, /\bsemantically\b/i, /\bone who\b/i, /\bthat which\b/i,
  /\bany instance of\b/i, /\bthe act of\b/i, /\bof or (relating|pertaining) to\b/i, /\bpertaining to\b/i, /\bcharacteri[sz]ed by\b/i,
  /\bplural of\b/i, /\binflection of\b/i, /\bconstruct (state|form)\b/i, /\bsee also\b/i, /\(obsolete\)|\(archaic\)|\(rare\)/i,
  /\bto be (\w+ed|\w+en)\b/i, /\betc\.?$/i, /\bin the sense of\b/i, /\bgrammatical\b/i, /\(see usage note/i,
];

export function lintGloss(en) {
  if (!en || !en.trim()) return 'gloss-empty';
  if (/\bmade by\b/i.test(en)) return null;
  if (en.length > 70) return 'gloss-machine';
  for (const re of MACHINE_PATTERNS) if (re.test(en)) return 'gloss-machine';
  return null;
}

const skeleton = (s) => plain(s).replace(/[וי]/g, '').replace(/[\s'׳"״]/g, '');

export function lintNiqqud(w) {
  const flags = [];
  const he = w.he.normalize('NFC');
  if (!NIQ.test(he)) flags.push('no-niqqud');
  else {
    // two consecutive non-final, non-mater consonants without any vowel mark => partial pointing
    const chars = [...he];
    let unmarkedRun = 0;
    let partial = false;
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      if (!LETTER.test(c)) { if (!/[֑-ׇ]/.test(c)) unmarkedRun = 0; continue; }
      let j = i + 1; let marked = false;
      while (j < chars.length && /[֑-ׇ]/.test(chars[j])) { if (VOWEL.test(chars[j])) marked = true; j++; }
      const isLast = j >= chars.length || /[\s־]/.test(chars[j]);
      const matres = /[ויאה]/.test(c);
      if (!marked && !isLast && !matres) unmarkedRun++; else unmarkedRun = 0;
      if (unmarkedRun >= 2) partial = true;
    }
    if (partial && !/[׳"״]/.test(he)) flags.push('partial-niqqud');
  }
  if (skeleton(he) !== skeleton(w.heUnpointed)) flags.push('skeleton-mismatch');
  return flags;
}

export function lintTranslit(w) {
  const flags = [];
  const t = w.translit;
  if (t == null || t === '') { flags.push('translit-missing'); return flags; }
  if (/[^a-z'\- ?!.,…]/i.test(t) || /\bts|q|w|ẖ|ḥ|ṣ|ṭ|š|x/.test(t)) flags.push('translit-scheme');
  if (NIQ.test(w.he)) {
    let expect = null;
    try { expect = transliterate(w.he, { scheme: 'siddur', tradition: 'israeli' }); } catch { expect = null; }
    const norm = (s) => s.replace(/-+$/g, '').replace(/^-+/g, '').toLowerCase();
    if (expect != null && norm(expect) !== norm(t)) flags.push('translit-mismatch');
  }
  return flags;
}

function shortSource(w) {
  const d = w.source && w.source.dictionary;
  if (!d) return '';
  if (d === 'wiktionary') return 'wiktionary';
  if (/phrasebook/.test(d)) return 'project-phrasebook';
  if (/curriculum/.test(d)) return 'project-lessons';
  return d.slice(0, 40);
}

/** Lint every entry. Returns Map id -> flags[]. */
export function lintWords(words, packs = null) {
  const byHePos = new Map(); const bySpellPos = new Map(); const bySpell = new Map();
  const k1 = (w) => w.he.normalize('NFC') + '|' + w.pos;
  const k2 = (w) => plain(w.heUnpointed) + '|' + w.pos + (w.pos === 'verb' ? '|' + (w.binyan || '') : '');
  const k3 = (w) => plain(w.heUnpointed);
  for (const w of words) {
    byHePos.set(k1(w), (byHePos.get(k1(w)) || 0) + 1);
    bySpellPos.set(k2(w), (bySpellPos.get(k2(w)) || 0) + 1);
    bySpell.set(k3(w), (bySpell.get(k3(w)) || 0) + 1);
  }
  const packCopy = new Map();
  if (packs) for (const p of packs) for (const w of p.words || []) packCopy.set(w.id, w);
  const out = new Map();
  for (const w of words) {
    const f = [];
    if (byHePos.get(k1(w)) > 1) f.push('duplicate');
    else if (bySpellPos.get(k2(w)) > 1) f.push('dup-spelling');
    if (bySpell.get(k3(w)) > 1) f.push('homograph');
    f.push(...lintNiqqud(w));
    f.push(...lintTranslit(w));
    if (w.pos === 'noun' && w.kind === 'word') {
      if (!w.gender) f.push('gender-missing');
      if (!(w.forms && typeof w.forms.plural === 'string' && w.forms.plural) && w.number !== 'pl') f.push('plural-missing');
    }
    const g = lintGloss(w.en); if (g) f.push(g);
    const lic = w.license || w.licence || (w.source && (w.source.license || w.source.licence));
    if (!(typeof lic === 'string' && LICENCE_RE.test(lic))) f.push('licence-missing');
    if (!(w.source && w.source.dictionary)) f.push('source-missing');
    if (w.example && !(w.example.source && (w.example.source.license || w.example.source.licence))) f.push('example-licence');
    if (w.pos === 'unknown') f.push('pos-unknown');
    if (w.flags && w.flags.needsReview) f.push('needs-review');
    if (packs) {
      const c = packCopy.get(w.id);
      if (!c || JSON.stringify(c) !== JSON.stringify(w)) f.push('pack-mismatch');
    }
    out.set(w.id, f);
  }
  return out;
}

export function flagCounts(flagMap) {
  const c = {};
  for (const f of flagMap.values()) for (const x of f) c[x] = (c[x] || 0) + 1;
  return Object.fromEntries(Object.entries(c).sort((a, b) => b[1] - a[1]));
}

export const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export const toCsv = (cols, rows) => '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n';

export function reviewRows(words, flagMap) {
  return words.map((w) => ({
    id: w.id, hebrew: w.heUnpointed, niqqud: w.he, translit: w.translit ?? '', gloss: w.en ?? '', pos: w.pos, gender: w.gender ?? '',
    source: shortSource(w), flags: (flagMap.get(w.id) || []).join(' '), reviewer_ok: '', reviewer_note: '',
  }));
}

/** Group by theme (topic), order by frequencyRank, chunk at MAX_ROWS. Returns [{file, theme, part, parts, rows}]. */
export function groupSheets(rows, words) {
  const topicOf = new Map(words.map((w) => [w.id, w.topic || 'untopiced']));
  const rankOf = new Map(words.map((w) => [w.id, w.frequencyRank ?? 1e9]));
  const groups = new Map();
  for (const r of rows) { const t = topicOf.get(r.id); if (!groups.has(t)) groups.set(t, []); groups.get(t).push(r); }
  const sheets = [];
  for (const theme of [...groups.keys()].sort()) {
    const list = groups.get(theme).sort((a, b) => rankOf.get(a.id) - rankOf.get(b.id) || (a.id < b.id ? -1 : 1));
    const parts = Math.ceil(list.length / MAX_ROWS);
    for (let i = 0; i < parts; i++) sheets.push({ file: `${theme}-${String(i + 1).padStart(2, '0')}.csv`, theme, part: i + 1, parts, rows: list.slice(i * MAX_ROWS, (i + 1) * MAX_ROWS) });
  }
  return sheets;
}

// ---- Stage 4: gender / plural by rule (nouns only; output is a sheet, never written to words.json) --------

const KAMATZ_HE = /[ַָ]ה$/; // ..ָה / ..ַה
export function ruleGender(w) {
  const he = w.he.normalize('NFC').replace(/־$/, '');
  const u = plain(w.heUnpointed);
  if (/\s/.test(u)) return { gender: null, rule: 'multi-word: no rule', confidence: 'none' };
  if (KAMATZ_HE.test(he)) return { gender: 'f', rule: 'ends in kamatz/patach + he', confidence: 'medium' };
  if (/וּת$/.test(he) || /ות$/.test(u)) return { gender: 'f', rule: 'ends in -ut', confidence: 'medium' };
  if (/ִית$/.test(he) || /ית$/.test(u)) return { gender: 'f', rule: 'ends in -it', confidence: 'medium' };
  if (/ת$/.test(u)) return { gender: 'f', rule: 'ends in tav', confidence: 'low' };
  if (/ה$/.test(u)) return { gender: 'f', rule: 'ends in he (unpointed)', confidence: 'low' };
  return { gender: 'm', rule: 'no feminine ending', confidence: 'low' };
}

const FINAL_TO_MEDIAL = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
/** Final letter becomes medial when a suffix follows (unpointed only; vowels are never generated). */
export const unfinal = (stem) => stem.replace(/[ךםןףץ]$/, (c) => FINAL_TO_MEDIAL[c]);

export function rulePlural(w, gender) {
  const u = plain(w.heUnpointed);
  if (/\s/.test(u)) return { plural: null, rule: 'multi-word: no rule' };
  if (gender === 'f') {
    if (/ה$/.test(u)) return { plural: u.slice(0, -1) + 'ות', rule: '-a > -ot' };
    if (/ית$/.test(u)) return { plural: u.slice(0, -2) + 'יות', rule: '-it > -iyot' };
    if (/ות$/.test(u)) return { plural: u.slice(0, -2) + 'ויות', rule: '-ut > -uyot' };
    if (/ת$/.test(u)) return { plural: u + 'ות', rule: '-t > -tot (often -ot; check)' };
    return { plural: unfinal(u) + 'ות', rule: 'f without ending > +ot (body-part duals -ayim not generated)' };
  }
  return { plural: unfinal(u) + 'ים', rule: 'm > +im' };
}

export function completionRows(words) {
  const rows = [];
  for (const w of words) {
    if (w.pos !== 'noun' || w.kind !== 'word') continue;
    const hasPlural = w.forms && typeof w.forms.plural === 'string' && w.forms.plural;
    if (w.gender && hasPlural) continue;
    const g = w.gender ? { gender: w.gender, rule: 'kept (present)', confidence: 'source' } : ruleGender(w);
    const p = hasPlural ? { plural: w.forms.plural, rule: 'kept (present)' } : (w.number === 'pl' ? { plural: null, rule: 'entry is itself plural' } : rulePlural(w, g.gender));
    const flags = [];
    if (!w.gender) flags.push(`gender:rule(${g.confidence})`);
    if (!hasPlural && w.number !== 'pl') flags.push('plural:rule-unpointed');
    if (!hasPlural && w.number === 'pl') flags.push('plural:entry-is-plural');
    rows.push({
      id: w.id, hebrew: w.heUnpointed, niqqud: w.he, pos: w.pos,
      gender_current: w.gender ?? '', gender_rule: w.gender ? '' : (g.gender ?? ''),
      plural_current: hasPlural ? w.forms.plural : '', plural_rule: hasPlural ? '' : (p.plural ?? ''),
      rule: [w.gender ? null : g.rule, hasPlural ? null : p.rule].filter(Boolean).join('; '),
      flag: flags.join(' '), reviewer_ok: '', reviewer_note: '',
    });
  }
  return rows;
}

// ---- driver -----------------------------------------------------------------------------------

export function loadPacks(root = ROOT) {
  const dir = path.join(root, 'data/vocab/packs');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}

export function buildReviewPack(root = ROOT, { write = true } = {}) {
  const words = JSON.parse(fs.readFileSync(path.join(root, 'data/vocab/words.json'), 'utf8')).words;
  const packs = loadPacks(root);
  const flagMap = lintWords(words, packs);
  const rows = reviewRows(words, flagMap);
  const sheets = groupSheets(rows, words);
  const completion = completionRows(words);
  const compSheets = [];
  for (let i = 0; i < Math.ceil(completion.length / MAX_ROWS); i++) compSheets.push({ file: `gender-plural-rules-${String(i + 1).padStart(2, '0')}.csv`, rows: completion.slice(i * MAX_ROWS, (i + 1) * MAX_ROWS) });
  const counts = flagCounts(flagMap);
  const flagged = [...flagMap.values()].filter((f) => f.length).length;
  const summary = { entries: words.length, flagged, clean: words.length - flagged, sheets: sheets.length, themes: new Set(sheets.map((s) => s.theme)).size, completionRows: completion.length, completionSheets: compSheets.length, flags: counts };
  if (write) {
    const dir = path.join(root, REVIEW_DIR);
    fs.mkdirSync(dir, { recursive: true });
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.csv')) fs.unlinkSync(path.join(dir, f));
    for (const s of sheets) fs.writeFileSync(path.join(dir, s.file), toCsv(COLUMNS, s.rows));
    for (const s of compSheets) fs.writeFileSync(path.join(dir, s.file), toCsv(COMPLETION_COLUMNS, s.rows));
    const sumRows = Object.entries(counts).map(([flag, count]) => ({ flag, count }));
    fs.writeFileSync(path.join(dir, '_flag-summary.csv'), toCsv(['flag', 'count'], sumRows));
    const index = sheets.map((s) => ({ file: s.file, theme: s.theme, part: `${s.part}/${s.parts}`, rows: s.rows.length, flagged: s.rows.filter((r) => r.flags).length }))
      .concat(compSheets.map((s) => ({ file: s.file, theme: 'gender-plural-rules', part: '', rows: s.rows.length, flagged: s.rows.length })));
    fs.writeFileSync(path.join(dir, '_index.csv'), toCsv(['file', 'theme', 'part', 'rows', 'flagged'], index));
  }
  return { summary, sheets, compSheets, flagMap, words };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const dry = process.argv.includes('--dry');
  const { summary } = buildReviewPack(ROOT, { write: !dry });
  console.log(`lint: ${summary.entries} entries, ${summary.flagged} with at least one flag, ${summary.clean} clean`);
  console.log('flags: ' + Object.entries(summary.flags).map(([k, v]) => `${k} ${v}`).join(', '));
  console.log(`sheets: ${summary.sheets} review CSVs over ${summary.themes} themes (<= ${MAX_ROWS} rows each); ${summary.completionSheets} gender/plural rule sheets (${summary.completionRows} nouns)`);
  if (!dry) console.log(`wrote ${REVIEW_DIR}/`);
}
