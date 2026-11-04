#!/usr/bin/env node
// Stage 2 of the ALEF vocabulary pipeline.
//   input : tools/vocab/.cache/stage.json (build_lexicon.py), data/corpus/phrasebook.json,
//           data/curriculum/lessons.json, src/pronunciation/transliterate.js
//   output: data/vocab/words.json, packs.json, index.json, packs/<id>.json, meta.json
// Run:  node tools/vocab/build_words.mjs   (then node tools/vocab/stats.mjs for QUALITY numbers)
// Policy constants below are documented in docs/vocab/METHOD.md.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { transliterate } from '../../src/pronunciation/transliterate.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = path.join(ROOT, 'tools/vocab/.cache');
const OUT = path.join(ROOT, 'data/vocab');

// ---- policy (documented) ----------------------------------------------------------------------
export const POLICY = {
  modernMax: Number(process.env.MODERN_MAX || 5300),   // modern lemma kept if modernRank <= this
  readMax: Number(process.env.READ_MAX || 3100),       // biblical/liturgical lemma kept if readRank <= this
  readWeight: 1.5,                                     // priority = min(modernRank, readWeight * readRank)
  levelBands: [['A1', 600], ['A2', 1800], ['B1', 3600], ['B2', Infinity]],
  packSize: 48,
  unlockBuckets: [12, 21],                             // read-lesson numbers that separate pack ordering buckets
};

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const NIQ = /[֑-ׇ]/g;
const strip = (s) => s.replace(NIQ, '').replace(/[־]/g, '');
const nfc = (s) => s.normalize('NFC');
const hash = (s, n = 8) => crypto.createHash('sha1').update(s).digest('hex').slice(0, n);

const TOPIC_TITLES = {
  'small-words': 'Little words', 'people-family': 'People and family', 'body-health': 'Body and health',
  'food-drink': 'Food and drink', 'home-things': 'Home and things', 'nature-animals': 'Nature and animals',
  'places-travel': 'Places and travel', 'time-numbers': 'Time and numbers', 'clothes-shopping': 'Clothes, colours and shopping',
  'religion-prayer': 'Prayer and Jewish life', 'feelings-mind': 'Feelings and thinking', 'school-learning': 'School and learning',
  'tech-media': 'Tech and media', 'society-work-law': 'Work, money and society', 'science-ideas': 'Science and ideas',
  'arts-sports': 'Arts and sport', 'talking-asking': 'Talking and asking', 'moving-doing': 'Moving and doing',
  'doing-verbs': 'Everyday actions', 'describing-words': 'Describing words', 'general-things': 'More everyday nouns',
};
const SITUATION_TOPIC = {
  greetings: 'talking-asking', politeness: 'talking-asking', fillers: 'talking-asking', cafe: 'food-drink', shop: 'clothes-shopping',
  taxi: 'places-travel', directions: 'places-travel', numbers: 'time-numbers', 'small-talk': 'talking-asking', help: 'body-health',
};

// ---- lessons: which letters / vowels each read-track lesson has taught --------------------------
const lessonsJson = readJson('data/curriculum/lessons.json');
const readLessons = lessonsJson.lessons.filter((l) => l.track === 'read');
const israelLessons = lessonsJson.lessons.filter((l) => l.track === 'israel');
const taught = []; // cumulative sets after each read lesson
{
  const L = new Set(); const V = new Set(); const X = new Set();
  for (const l of readLessons) {
    l.letters.forEach((x) => L.add(x)); l.vowels.forEach((x) => V.add(x));
    // special concepts taught by title (documented in METHOD.md)
    if (/kamatz katan/i.test(l.title)) X.add('kamatz-katan');
    if (/mappiq/i.test(l.title)) X.add('mappiq');
    taught.push({ id: l.id, L: new Set(L), V: new Set(V), X: new Set(X) });
  }
}
const LETTER_ID = { א: 'alef', ב: 'bet', ג: 'gimel', ד: 'dalet', ה: 'he', ו: 'vav', ז: 'zayin', ח: 'chet', ט: 'tet', י: 'yod', כ: 'kaf', ך: 'kaf-final', ל: 'lamed', מ: 'mem', ם: 'mem-final', נ: 'nun', ן: 'nun-final', ס: 'samekh', ע: 'ayin', פ: 'pe', ף: 'pe-final', צ: 'tsadi', ץ: 'tsadi-final', ק: 'qof', ר: 'resh', ש: 'shin', ת: 'tav' };
const MARK_ID = { 'ְ': 'shva', 'ֱ': 'chataf-segol', 'ֲ': 'chataf-patach', 'ֳ': 'chataf-kamatz', 'ִ': 'chirik', 'ֵ': 'tzere', 'ֶ': 'segol', 'ַ': 'patach', 'ָ': 'kamatz', 'ֹ': 'cholam', 'ֺ': 'cholam', 'ֻ': 'kubutz', 'ׁ': 'shin-dot', 'ׂ': 'sin-dot' };

/** letters / vowels / concepts a pointed word needs in order to be decoded. */
export function requirements(pointed) {
  const L = new Set(); const V = new Set(); const X = new Set();
  const chars = [...pointed.normalize('NFC').replace(/־/g, '')];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (LETTER_ID[c]) {
      L.add(LETTER_ID[c]);
      // marks that follow this letter
      let j = i + 1; const marks = [];
      while (j < chars.length && !LETTER_ID[chars[j]]) { marks.push(chars[j]); j++; }
      const hasDagesh = marks.includes('ּ');
      const vowelMarks = marks.filter((m) => MARK_ID[m] && MARK_ID[m] !== 'shin-dot' && MARK_ID[m] !== 'sin-dot');
      if (c === 'ו' && hasDagesh && vowelMarks.length === 0) V.add('shuruk');
      else if (hasDagesh) { if (c === 'ה' && j >= chars.length) X.add('mappiq'); else V.add('dagesh'); }
      for (const m of marks) {
        if (m === 'ׇ') { X.add('kamatz-katan'); V.add('kamatz'); }
        else if (MARK_ID[m]) V.add(MARK_ID[m]);
      }
    }
  }
  return { L, V, X };
}
export function unlockLessonFor(pointed) {
  const { L, V, X } = requirements(pointed);
  for (const t of taught) {
    if ([...L].every((x) => t.L.has(x)) && [...V].every((x) => t.V.has(x)) && [...X].every((x) => t.X.has(x))) return t.id;
  }
  return null; // needs something no read lesson teaches
}
const readIndex = Object.fromEntries(readLessons.map((l, i) => [l.id, i + 1]));

// ---- load stage --------------------------------------------------------------------------------
const stage = JSON.parse(fs.readFileSync(path.join(CACHE, 'stage.json'), 'utf8'));
const phrasebook = readJson('data/corpus/phrasebook.json');
const lock = readJson('data/vocab/sources.lock.json');

const TETRA = /\u05D9\u05B0\u05D4\u05B9\u05D5\u05B8\u05D4/g;
const fixDivine = (t) => t.replace(TETRA, '\u05D9\u05B0\u05D4\u05D5\u05B8\u05D4');
const levelOf = (rank) => POLICY.levelBands.find(([, max]) => rank <= max)[0];

function pointedDisplay(e) { return e.bound ? e.pointed + '־' : e.pointed; }

// ---- 1. select ---------------------------------------------------------------------------------
let picked = stage.entries.filter((e) => (e.mrank && e.mrank <= POLICY.modernMax) || (e.rrank && e.rrank <= POLICY.readMax));
// quality gates (documented): need pointing, an English gloss, no Hebrew letters in the gloss, sane length
const CRUDE = /\b(fuck\w*|shit\w*|bitch\w*|whore|slut|cunt|dick|asshole|bastard|piss\w*|fart\w*|crap|screw(ing)?|wank\w*|prostitut\w*|horny|damn\w*|bloody)\b/i;
const crudeDropped = picked.filter((e) => CRUDE.test(e.en) || (e.alts || []).some((a) => CRUDE.test(a)));
picked = picked.filter((e) => !crudeDropped.includes(e));
picked = picked.filter((e) => e.pointed && e.en && !/[֐-׿]/.test(e.en) && e.en.length <= 80 && !/^\(/.test(e.en));
for (const e of picked) e.priority = Math.min(e.mrank ?? Infinity, POLICY.readWeight * (e.rrank ?? Infinity));
picked.sort((a, b) => a.priority - b.priority || (b.mscore + b.rscore) - (a.mscore + a.rscore) || a.pointed.localeCompare(b.pointed));

const words = [];
const byUnp = new Map(); // unpointed -> entries (for phrasebook / lesson matching)
let rank = 0;
for (const e of picked) {
  rank++;
  const modern = e.mrank && e.mrank <= POLICY.modernMax;
  const read = e.rrank && e.rrank <= POLICY.readMax;
  const track = modern && read ? 'both' : modern ? 'israel' : 'read';
  const heDisp = pointedDisplay(e);
  const tl = transliterate(e.pointed, { scheme: 'siddur', tradition: 'israeli' });
  const id = 'h' + hash(`${e.pointed}|${e.pos}|${e.word}`);
  const w = {
    id, kind: 'word',
    he: heDisp, heUnpointed: strip(heDisp),
    translit: tl, ipa: e.ipa || null,
    en: e.en, alt: e.alts || [], ...(e.enNote ? { enNote: e.enNote } : {}),
    pos: e.pos, ...(e.posAlt && e.posAlt.length ? { posAlt: [...new Set(e.posAlt)] } : {}),
    gender: e.gender || null, number: e.plural_only ? 'pl' : null,
    ...(e.forms ? { forms: e.forms } : {}),
    ...(e.binyan ? { binyan: e.binyan } : {}),
    root: e.root || null,
    track, topic: e.topic, frequencyRank: rank, level: levelOf(rank),
    modernRank: e.mrank || null, readRank: e.rrank || null,
    register: e.register || null,
    unlockLesson: unlockLessonFor(e.pointed),
    example: null,
    source: { dictionary: 'wiktionary', frequency: [...(modern ? ['opensubtitles-he-2018'] : []), ...(read ? ['uxlc-tanakh+prayer-registry'] : [])] },
    flags: { pointedFromSource: true, pointedSource: 'wiktionary', needsReview: false, reasons: [] },
    _tr: e.wikiTr || null, _eid: e.eid, _ex: e.example, _verse: e.verse || null, _homographs: e.homographs, _bound: !!e.bound,
  };
  words.push(w);
  const k = strip(e.pointed);
  if (!byUnp.has(k)) byUnp.set(k, []);
  byUnp.get(k).push(w);
}

// ---- 2. phrasebook + lesson words: merge / add -------------------------------------------------
const pbEntries = phrasebook.entries;
function addSurvival(p, kindSrc) {
  const he = nfc(p.he.replace(/[֑-֯]/g, ''));
  const key = strip(he).trim();
  return { he, key };
}
let pbMerged = 0; let pbAdded = 0;
const phrases = [];
for (const p of pbEntries) {
  const { he, key } = addSurvival(p);
  const single = !/\s/.test(key);
  const hit = single ? (byUnp.get(key) || []).find((w) => w.he === he || w.heUnpointed === key) : null;
  if (hit) {
    hit.phrasebook = [...(hit.phrasebook || []), p.id];
    hit.topic = hit.topic;
    if (hit.track === 'read') hit.track = 'both';
    pbMerged++;
    continue;
  }
  pbAdded++;
  const hasNiq = /[ְ-ׇ]/.test(he);
  const id = 'p' + hash(`${he}|phrase`);
  const w = {
    id, kind: single ? 'word' : 'phrase', he, heUnpointed: key,
    translit: hasNiq ? transliterate(he, { scheme: 'siddur', tradition: 'israeli' }) : null, ipa: null,
    en: p.en, alt: [], pos: single ? 'unknown' : 'phrase', gender: null, number: null, root: null,
    track: 'israel', topic: SITUATION_TOPIC[p.situation] || 'talking-asking', situation: p.situation,
    frequencyRank: null, level: 'A1', modernRank: null, readRank: null, register: p.register || null,
    unlockLesson: hasNiq ? unlockLessonFor(he) : null, example: null,
    source: { dictionary: 'project phrasebook (data/corpus/phrasebook.json, original text, AI-written, unreviewed)', phrasebookId: p.id },
    flags: { pointedFromSource: false, pointedSource: 'phrasebook', needsReview: true, reasons: ['pointing and gloss written by an AI agent, not native-reviewed'] },
    phrasebook: [p.id],
  };
  phrases.push(w);
}
// lesson words
let lwMerged = 0; let lwAdded = 0;
const lessonRefs = new Map(); // wordId -> [lessonIds]
for (const l of lessonsJson.lessons) {
  for (const lw of l.words || []) {
    const he = nfc(lw.he.replace(/[֑-֯]/g, ''));
    const key = strip(he).trim();
    const single = !/\s/.test(key);
    let hit = single ? (byUnp.get(key) || []).find((w) => w.he === he || w.heUnpointed === key) : null;
    if (!hit) hit = phrases.find((p) => p.he === he);
    if (hit) { lwMerged++; if (!lessonRefs.has(hit.id)) lessonRefs.set(hit.id, []); lessonRefs.get(hit.id).push(l.id); continue; }
    lwAdded++;
    const id = 'p' + hash(`${he}|phrase`);
    const hasNiq = /[ְ-ׇ]/.test(he);
    const w = {
      id, kind: single ? 'word' : 'phrase', he, heUnpointed: key,
      translit: hasNiq ? transliterate(he, { scheme: 'siddur', tradition: 'israeli' }) : null, ipa: null,
      en: lw.en, alt: [], pos: single ? 'unknown' : 'phrase', gender: null, number: null, root: null,
      track: l.track === 'read' ? 'read' : 'israel', topic: l.track === 'read' ? 'religion-prayer' : 'talking-asking',
      frequencyRank: null, level: l.level === 'A1' || l.level === 'A2' || l.level === 'B1' ? l.level : 'A1', modernRank: null, readRank: null, register: null,
      unlockLesson: hasNiq ? unlockLessonFor(he) : null, example: null,
      source: { dictionary: 'project curriculum (data/curriculum/lessons.json, AI-written, unreviewed)', lesson: l.id },
      flags: { pointedFromSource: false, pointedSource: 'curriculum', needsReview: true, reasons: ['pointing and gloss written by an AI agent, not native-reviewed'] },
    };
    phrases.push(w); lessonRefs.set(id, [l.id]);
  }
}
for (const [wid, ls] of lessonRefs) {
  const w = words.find((x) => x.id === wid) || phrases.find((x) => x.id === wid);
  if (w) w.lessonRefs = [...new Set(ls)];
}

// ---- 3. examples, flags, translit sanity -------------------------------------------------------
const tokensOf = (s) => s.replace(/[־.,!?;:"“”()\-–—…׃]/g, ' ').split(/\s+/).filter(Boolean).map((t) => strip(t).replace(/['׳]/g, ''));
let tatoebaEx = 0; let verseEx = 0;
for (const w of words) {
  const ex = w._ex; const v = w._verse;
  const preferVerse = w.track === 'read' && v;
  if (ex && !preferVerse) {
    w.example = {
      he: ex.he, en: ex.en, hePointed: false, translit: null, match: ex.match,
      source: { ...ex.source, note: 'Hebrew text is unpointed in Tatoeba; sense of the headword in the sentence was not verified' },
      flags: { senseChecked: false, ambiguousMatch: ex.matchShare < 0.7 },
    };
    tatoebaEx++;
  } else if (v) {
    const vhe = fixDivine(v.he);
    const tl = transliterate(vhe, { scheme: 'siddur', tradition: 'israeli' });
    w.example = {
      he: vhe, en: null, hePointed: true, translit: tl, match: v.match, ref: v.ref,
      source: { type: 'uxlc', ref: v.ref, license: 'public domain / copy without restriction (tanach.us/License.html)', url: 'https://tanach.us' },
      flags: { senseChecked: false, ambiguousMatch: v.share < 0.7, noTranslation: true },
    };
    verseEx++;
  } else if (ex) {
    w.example = {
      he: ex.he, en: ex.en, hePointed: false, translit: null, match: ex.match,
      source: { ...ex.source, note: 'Hebrew text is unpointed in Tatoeba; sense of the headword in the sentence was not verified' },
      flags: { senseChecked: false, ambiguousMatch: ex.matchShare < 0.7 },
    };
    tatoebaEx++;
  }
  // review flags
  const r = w.flags.reasons;
  if (!w.example) r.push('no example sentence found');
  if (w.example && w.example.flags.ambiguousMatch) r.push('example token also fits another dictionary entry');
  if (w._homographs > 1) r.push('homograph: other dictionary entries share the unpointed spelling');
  if (w.register === 'archaic' || w.register === 'rare' || w.register === 'dated') r.push('register ' + w.register);
  if (w.unlockLesson === null) r.push('uses a mark no read-track lesson teaches');
  if (w.track === 'read' && w.pos === 'verb' && !w.forms) r.push('verb without extracted forms');
  if (w.gender === null && w.pos === 'noun') r.push('noun without gender in source');
  w.flags.needsReview = r.some((x) => !/^no example sentence/.test(x)) || false;
}
for (const w of words) { delete w._ex; delete w._verse; }

// ---- 4. all entries, ids unique -----------------------------------------------------------------
const all = [...words, ...phrases];
const seen = new Set();
for (const w of all) { if (seen.has(w.id)) throw new Error('duplicate id ' + w.id); seen.add(w.id); }

// ---- 5. packs ------------------------------------------------------------------------------------
const unlockNum = (w) => (w.unlockLesson ? readIndex[w.unlockLesson] : 99);
const bucket = (w) => { const n = unlockNum(w); return n <= POLICY.unlockBuckets[0] ? 0 : n <= POLICY.unlockBuckets[1] ? 1 : 2; };
const packs = [];
function makePacks(list, groupKey, title, trackOf) {
  const sorted = [...list].sort((a, b) => bucket(a) - bucket(b) || (a.frequencyRank ?? 1e9) - (b.frequencyRank ?? 1e9) || a.id.localeCompare(b.id));
  const n = Math.max(1, Math.round(sorted.length / POLICY.packSize));
  const size = Math.ceil(sorted.length / n);
  for (let i = 0; i < n; i++) {
    const chunk = sorted.slice(i * size, (i + 1) * size);
    if (!chunk.length) continue;
    const ranks = chunk.map((w) => w.frequencyRank).filter((x) => x != null).sort((a, b) => a - b);
    const med = ranks.length ? ranks[Math.floor(ranks.length / 2)] : 0;
    const nums = chunk.map(unlockNum);
    const maxNum = Math.max(...nums);
    const unlock = maxNum === 99 ? null : readLessons[maxNum - 1].id;
    const tcount = { israel: 0, read: 0, both: 0 };
    chunk.forEach((w) => tcount[w.track]++);
    const refs = {};
    for (const w of chunk) for (const l of w.lessonRefs || []) refs[l] = (refs[l] || 0) + 1;
    const israelRefs = Object.keys(refs).filter((l) => l.startsWith('il')).sort();
    packs.push({
      id: `${groupKey}-${i + 1}`, title: n > 1 ? `${title} ${i + 1}` : title, topic: chunk[0].topic === 'multi' ? 'multi' : (trackOf === 'situation' ? chunk[0].topic : chunk[0].topic),
      track: tcount.read === chunk.length ? 'read' : tcount.israel + tcount.both === chunk.length && tcount.both < chunk.length / 2 ? 'israel' : 'both',
      level: levelOf(med || 1), medianRank: med, size: chunk.length,
      unlockLesson: unlock, unlockNumber: maxNum === 99 ? null : maxNum,
      earliestWordUnlock: readLessons[Math.min(...nums) - 1]?.id || null,
      alignedIsraelLessons: israelRefs, wordIds: chunk.map((w) => w.id),
    });
  }
}
{
  const byGroup = new Map();
  for (const w of words) {
    const g = (w.track === 'read' ? 'read-' : '') + w.topic;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(w);
  }
  for (const [g, list] of [...byGroup].sort((a, b) => a[0].localeCompare(b[0]))) {
    const topic = list[0].topic;
    makePacks(list, g, (g.startsWith('read-') ? 'Reading: ' : '') + (TOPIC_TITLES[topic] || topic));
  }
  const bySit = new Map();
  for (const w of phrases) {
    const g = 'survival-' + (w.situation || (w.source.lesson ? 'lesson-' + (w.track === 'read' ? 'read' : 'israel') : 'misc'));
    if (!bySit.has(g)) bySit.set(g, []);
    bySit.get(g).push(w);
  }
  for (const [g, list] of [...bySit].sort((a, b) => a[0].localeCompare(b[0]))) {
    const sit = g.replace('survival-', '');
    makePacks(list, g, 'Survival: ' + sit.replace(/-/g, ' '));
  }
}
// global order: frequent packs first, survival packs early (they are A1)
packs.sort((a, b) => (a.id.startsWith('survival-') ? -1 : 0) - (b.id.startsWith('survival-') ? -1 : 0) || a.medianRank - b.medianRank || a.id.localeCompare(b.id));
packs.forEach((p, i) => { p.order = i + 1; });
const packOf = new Map();
for (const p of packs) for (const id of p.wordIds) packOf.set(id, p.id);
for (const w of all) w.pack = packOf.get(w.id);

// ---- 6. finalize + write ------------------------------------------------------------------------
for (const w of all) {
  delete w._tr; delete w._eid; delete w._homographs; delete w._bound;
  w.flags.needsReview = w.flags.needsReview || !w.flags.pointedFromSource;
}
const out = all.map((w) => {
  // stable key order for readable diffs
  const { id, kind, he, heUnpointed, translit, ipa, en, alt, enNote, pos, posAlt, gender, number, forms, binyan, root, track, topic, situation, frequencyRank, level, modernRank, readRank, register, unlockLesson, pack, example, phrasebook, lessonRefs: lr, source, flags } = w;
  return JSON.parse(JSON.stringify({ id, kind, he, heUnpointed, translit, ipa, en, alt, enNote, pos, posAlt, gender, number, forms, binyan, root, track, topic, situation, frequencyRank, level, modernRank, readRank, register, unlockLesson, pack, example, phrasebook, lessonRefs: lr, source, flags }));
});
fs.mkdirSync(path.join(OUT, 'packs'), { recursive: true });
for (const f of fs.readdirSync(path.join(OUT, 'packs'))) fs.unlinkSync(path.join(OUT, 'packs', f));
const wjson = JSON.stringify({ schema: 'alef-vocab/1', generated: lock.fetched, count: out.length, words: out });
fs.writeFileSync(path.join(OUT, 'words.json'), wjson + '\n');
fs.writeFileSync(path.join(OUT, 'packs.json'), JSON.stringify({ schema: 'alef-vocab-packs/1', count: packs.length, packs }, null, 0) + '\n');
const byId = new Map(out.map((w) => [w.id, w]));
for (const p of packs) fs.writeFileSync(path.join(OUT, 'packs', p.id + '.json'), JSON.stringify({ pack: p.id, words: p.wordIds.map((i) => byId.get(i)) }) + '\n');
// compact search index: [id, he, heUnpointed, en, pos, level, track, topic, pack, rank, unlockNumber]
const idx = out.map((w) => [w.id, w.he, w.heUnpointed, w.en + (w.alt.length ? '; ' + w.alt.join('; ') : ''), w.pos, w.level, w.track, w.topic, w.pack, w.frequencyRank, w.unlockLesson, w.translit]);
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ schema: 'alef-vocab-index/1', fields: ['id', 'he', 'heUnpointed', 'en', 'pos', 'level', 'track', 'topic', 'pack', 'frequencyRank', 'unlockLesson', 'translit'], rows: idx }) + '\n');

const sz = (p) => { const b = fs.readFileSync(p); return { bytes: b.length, gzip: zlib.gzipSync(b, { level: 9 }).length }; };
const packSizes = packs.map((p) => sz(path.join(OUT, 'packs', p.id + '.json')).gzip);
const meta = {
  generated: lock.fetched,
  policy: POLICY,
  counts: {
    crudeGlossDropped: crudeDropped.length,
    total: out.length, words: words.length, phrases: phrases.length, packs: packs.length,
    phrasebookMergedIntoWords: pbMerged, phrasebookAddedAsEntries: pbAdded, lessonWordsMerged: lwMerged, lessonWordsAdded: lwAdded,
    tatoebaExamples: tatoebaEx, verseExamples: verseEx, noExample: words.filter((w) => !w.example).length,
    pointedFromSource: out.filter((w) => w.flags.pointedFromSource).length,
    autoVowelized: 0,
  },
  files: { 'words.json': sz(path.join(OUT, 'words.json')), 'packs.json': sz(path.join(OUT, 'packs.json')), 'index.json': sz(path.join(OUT, 'index.json')), packGzipMax: Math.max(...packSizes), packGzipMean: Math.round(packSizes.reduce((a, b) => a + b, 0) / packSizes.length) },
  sources: lock.files.map(({ name, url, sha256, bytes }) => ({ name, url, sha256, bytes })).filter((f) => !f.name.startsWith('tanach/')),
};
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 1) + '\n');
console.log(JSON.stringify(meta.counts), '\nfiles', JSON.stringify(meta.files));
