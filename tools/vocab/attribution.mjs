// Stage 5.1: record-level attribution for data/vocab/words.json -> data/vocab/attribution.json
//
//   node tools/vocab/attribution.mjs          writes data/vocab/attribution.json
//   node tools/vocab/attribution.mjs --dry    prints counts only
//
// Every word id is traced to what it came from, using only fields that already exist in the repo:
//   record.source.dictionary / .phrasebookId / .lesson   -> origin (wiktionary | phrasebook | lessons)
//   record.source.frequency                              -> which frequency list(s) shaped the rank
//   record.phrasebook[] / record.lessonRefs[]            -> project text merged into a Wiktionary entry
//   record.example.source                                -> Tatoeba (per-sentence authors) or UXLC
//   record.pack                                          -> pack file under data/vocab/packs
// Licence wording is copied from docs/vocab/LICENSES.md and docs/corpus/LICENSES.md; nothing is
// invented. Where the repo states no licence (lesson-derived entries) the record says so and is flagged.
// words.json is only read.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from './frequency.mjs';

export const ATTRIBUTION_PATH = 'data/vocab/attribution.json';
export const SA = 'CC BY-SA 4.0';
export const DISTRIBUTION = 'CC BY-SA 4.0 (the vocabulary data is distributed as a whole under CC BY-SA 4.0: docs/vocab/LICENSES.md, "Share-alike consequence")';

// Exact text of ATTRIBUTION in src/vocab/vocab.view.js (a test compares them).
export const ATTRIBUTION_TEXT = 'Word ranking derived from the OpenSubtitles-based FrequencyWords lists by Hermit Dave (CC BY-SA 4.0); lemmas, glosses and vocalisation derived from Wiktionary contributors (CC BY-SA 4.0), via Wiktextract/kaikki.org. Changes were made (filtering, re-ranking, topic assignment, gloss shortening). This vocabulary data is shared under CC BY-SA 4.0.';

export const SOURCES = {
  wiktionary: { name: 'Wiktionary contributors, via Wiktextract / kaikki.org Hebrew extract', licence: SA, shareAlike: true, use: 'lemma, gloss, pointed headword, part of speech, forms', stated: 'docs/vocab/LICENSES.md row 2: "Wiktionary text is CC BY-SA 4.0 (and GFDL); kaikki.org states its extracts follow the same terms."', caveat: 'docs/vocab/LICENSES.md marks the licence page itself as not re-read: UNVERIFIED.' },
  frequencywords: { name: 'hermitdave/FrequencyWords 2018 he (OpenSubtitles2018)', licence: SA, shareAlike: true, use: 'spoken-frequency rank (opensubtitles-he-2018)', stated: 'docs/vocab/LICENSES.md row 1: repo README "CC-by-sa-4.0 for content"; rank order is a derivative.' },
  'uxlc-counts': { name: 'Tanakh (UXLC) and prayer registry word counts', licence: 'public domain / copy without restriction', shareAlike: false, use: 'readRank boost (counts only, no text)', stated: 'docs/vocab/LICENSES.md row 3 and docs/corpus/LICENSES.md: no obligation; only counts are used.' },
  phrasebook: { name: 'Project phrasebook (data/corpus/phrasebook.json)', licence: 'original (project-owned)', shareAlike: false, use: 'phrase / word entries', stated: 'each phrasebook record: "license": "original (project-owned)"; docs/corpus/LICENSES.md: original, needs native-speaker review.', caveat: 'Pointing and gloss are unreviewed.' },
  lessons: { name: 'Project curriculum (data/curriculum/lessons.json)', licence: null, shareAlike: false, use: 'lesson words added to the list', stated: 'lessons.json states no licence; its note says "Pointing and glosses NOT reviewed by a native speaker".', caveat: 'Licence not stated anywhere in the repo for these entries: flagged lesson-licence-not-stated.' },
  tatoeba: { name: 'Tatoeba example sentences', licence: 'CC BY 2.0 FR', shareAlike: false, use: 'example sentence (per-sentence authors and ids kept on the record)', stated: 'docs/vocab/LICENSES.md: examples from Tatoeba keep their per-example attribution.' },
  'uxlc-text': { name: 'Leningrad Codex (UXLC 2.6, tanach.us) verse used as example', licence: 'public domain / copy without restriction (tanach.us/License.html)', shareAlike: false, use: 'example sentence', stated: 'docs/corpus/LICENSES.md section 1.' },
};

const FREQ_MAP = { 'opensubtitles-he-2018': 'frequencywords', 'uxlc-tanakh+prayer-registry': 'uxlc-counts' };

export function buildAttribution(root = ROOT) {
  const rj = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  const words = rj('data/vocab/words.json').words;
  const phrasebook = new Map(rj('data/corpus/phrasebook.json').entries.map((e) => [e.id, e]));
  const lessonIds = new Set(rj('data/curriculum/lessons.json').lessons.map((l) => l.id));
  const packIds = new Map();
  const packDir = path.join(root, 'data/vocab/packs');
  for (const f of fs.readdirSync(packDir).filter((x) => x.endsWith('.json'))) {
    const p = JSON.parse(fs.readFileSync(path.join(packDir, f), 'utf8'));
    packIds.set(p.pack, new Set((p.words || []).map((w) => w.id)));
  }

  const records = {};
  const counts = { total: words.length, origin: {}, flags: {}, example: { tatoeba: 0, 'uxlc-text': 0, none: 0 }, shareAlike: 0, notShareAlike: 0, mergedPhrasebook: 0, mergedLessons: 0 };
  const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };

  for (const w of words) {
    const flags = [];
    const d = (w.source && w.source.dictionary) || '';
    let origin; let licence; const src = [];
    if (/^wiktionary$/.test(d)) {
      origin = 'wiktionary'; licence = SA; src.push('wiktionary');
      for (const f of (w.source.frequency || [])) { const k = FREQ_MAP[f]; if (k) src.push(k); else flags.push('unknown-frequency-source'); }
      if (!(w.source.frequency || []).length) flags.push('no-frequency-source');
    } else if (w.source && w.source.phrasebookId) {
      origin = 'phrasebook'; src.push('phrasebook');
      const pb = phrasebook.get(w.source.phrasebookId);
      if (!pb) { flags.push('phrasebook-id-not-found'); licence = null; } else licence = pb.license || null;
      if (!licence) flags.push('phrasebook-licence-not-stated');
      flags.push('pointing-unreviewed');
    } else if (w.source && w.source.lesson) {
      origin = 'lessons'; src.push('lessons'); licence = null;
      if (!lessonIds.has(w.source.lesson)) flags.push('lesson-id-not-found');
      flags.push('lesson-licence-not-stated', 'pointing-unreviewed');
    } else {
      origin = 'unknown'; licence = null; flags.push('origin-untraceable');
    }
    const merged = {};
    if (w.phrasebook && origin === 'wiktionary') { merged.phrasebook = w.phrasebook.filter((i) => phrasebook.has(i)); if (merged.phrasebook.length !== w.phrasebook.length) flags.push('merged-phrasebook-id-not-found'); if (merged.phrasebook.length) { src.push('phrasebook'); counts.mergedPhrasebook++; } }
    if (w.lessonRefs && origin === 'wiktionary') { merged.lessons = w.lessonRefs.filter((i) => lessonIds.has(i)); if (merged.lessons.length !== w.lessonRefs.length) flags.push('merged-lesson-id-not-found'); if (merged.lessons.length) { src.push('lessons'); counts.mergedLessons++; } }

    let ex = null;
    if (w.example && w.example.source) {
      const s = w.example.source;
      if (s.type === 'tatoeba') {
        ex = { source: 'tatoeba', licence: s.license, heId: s.heId, enId: s.enId, heAuthor: s.heAuthor, enAuthor: s.enAuthor, url: s.url };
        if (!s.heAuthor || !s.enAuthor || !s.url || !s.license) flags.push('example-attribution-incomplete');
        counts.example.tatoeba++;
      } else if (s.type === 'uxlc') {
        ex = { source: 'uxlc-text', licence: s.license, ref: s.ref, url: s.url };
        if (!s.license) flags.push('example-attribution-incomplete');
        counts.example['uxlc-text']++;
      } else { flags.push('example-source-unknown'); }
    } else counts.example.none++;

    const pack = w.pack;
    const set = packIds.get(pack);
    if (!set) flags.push('pack-file-not-found'); else if (!set.has(w.id)) flags.push('pack-lacks-record');

    const shareAlike = src.includes('wiktionary') || src.includes('frequencywords');
    shareAlike ? counts.shareAlike++ : counts.notShareAlike++;
    bump(counts.origin, origin);
    for (const f of new Set(flags)) bump(counts.flags, f);
    records[w.id] = { origin, sources: [...new Set(src)], licence, shareAlike, distribution: SA, pack, ...(Object.keys(merged).length ? { merged } : {}), ...(ex ? { example: ex } : {}), flags: [...new Set(flags)] };
  }
  return {
    schema: 'alef-vocab-attribution/1',
    generated: new Date().toISOString().slice(0, 10),
    note: 'Record-level source and licence trace for data/vocab/words.json, built by tools/vocab/attribution.mjs from fields already in the repo. Licence wording is quoted from docs/vocab/LICENSES.md and docs/corpus/LICENSES.md. Not legal advice; the Wiktionary licence page is marked UNVERIFIED in those docs. words.json itself carries no per-record licence field.',
    attributionText: ATTRIBUTION_TEXT,
    distribution: DISTRIBUTION,
    sources: SOURCES,
    counts,
    records,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = buildAttribution();
  if (!process.argv.includes('--dry')) fs.writeFileSync(path.join(ROOT, ATTRIBUTION_PATH), JSON.stringify(out) + '\n');
  const c = out.counts;
  console.log(`attribution: ${c.total} records; origin ${JSON.stringify(c.origin)}; share-alike ${c.shareAlike}, other ${c.notShareAlike}`);
  console.log(`examples ${JSON.stringify(c.example)}; merged phrasebook ${c.mergedPhrasebook}, merged lessons ${c.mergedLessons}`);
  console.log(`flags ${JSON.stringify(c.flags)}`);
}
