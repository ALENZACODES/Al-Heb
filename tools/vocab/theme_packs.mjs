// Stage 3: 40 theme packs of about 125 words each, written to data/vocab/themes/.
//
//   node tools/vocab/theme_packs.mjs            writes data/vocab/themes/*.json and themes/index.json
//   node tools/vocab/theme_packs.mjs --dry      prints the plan only
//
// Rules this builder keeps (tests/vocab.themes.test.js checks them):
//   - words.json is read, never written; every word record in a theme is a projection of its words.json row
//   - the 40 themes are the 21 words.json topics, split into numbered sets: one set per topic, then the
//     remaining sets go to the topics with the most unplaced words. Inside a topic, words are ordered by
//     project-corpus occurrences (same counting as data/vocab/frequency.json) and then by the main
//     frequencyRank, so set 1 is the most useful set
//   - example sentences are NEVER composed: an example is a verbatim line from the sentence pool
//     (tools/vocab/frequency.mjs, POOL_FILES) that contains the word or one of its listed forms. Words
//     that occur in no pool line get example: null and the flag noCorpusExample. One-word pool lines
//     (lesson word lists, loanwords) are not used as example sentences. The sense of the word in the
//     line is not verified (senseChecked: false); when the match is only by consonants and another
//     entry shares the spelling, the word is flagged exampleSpellingShared (the line may show a homograph)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, loadSentencePool, countOccurrences, rankEntries } from './frequency.mjs';

export const THEME_DIR = 'data/vocab/themes';
export const THEME_COUNT = 40;
export const THEME_SIZE = 125;

const TITLES = {
  'small-words': 'Small words', 'describing-words': 'Describing words', 'doing-verbs': 'Doing verbs', 'people-family': 'People and family',
  'talking-asking': 'Talking and asking', 'feelings-mind': 'Feelings and mind', 'places-travel': 'Places and travel', 'religion-prayer': 'Religion and prayer',
  'moving-doing': 'Moving and doing', 'nature-animals': 'Nature and animals', 'home-things': 'Home things', 'body-health': 'Body and health',
  'time-numbers': 'Time and numbers', 'society-work-law': 'Society, work and law', 'general-things': 'General things', 'science-ideas': 'Science and ideas',
  'food-drink': 'Food and drink', 'clothes-shopping': 'Clothes and shopping', 'tech-media': 'Tech and media', 'arts-sports': 'Arts and sports', 'school-learning': 'School and learning',
};
const titleOf = (topic) => TITLES[topic] || topic.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/**
 * Allocate `total` sets over topics: one per topic, then the remaining sets go one at a time to the
 * topic with the most still-unplaced words (so each extra set is as full as possible). Deterministic.
 */
export function allocateSets(sizes, total = THEME_COUNT, setSize = THEME_SIZE) {
  const topics = Object.keys(sizes).sort();
  const alloc = Object.fromEntries(topics.map((t) => [t, 1]));
  let used = topics.length;
  while (used < total) {
    const t = topics.map((x) => [x, sizes[x] - alloc[x] * setSize]).filter(([, r]) => r > 0).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
    if (!t) break;
    alloc[t[0]]++; used++;
  }
  return alloc;
}

const TAAMIM_DAGESH = /[֑-ּֽֿ֯]/g;
const pointedKey = (s) => s.normalize('NFC').replace(TAAMIM_DAGESH, '').replace(/[־־]/g, ' ').replace(/[.,!?;:"“”()…׃]/g, ' ').trim();

/** True when the pool line contains the word's pointed form as a whole token (vowels agree, dagesh ignored). */
function pointedMatch(w, unit) {
  const key = pointedKey(w.he);
  if (!key) return false;
  const toks = pointedKey(unit.he).split(/\s+/);
  const kt = key.split(/\s+/);
  for (let i = 0; i + kt.length <= toks.length; i++) {
    let ok = true;
    for (let j = 0; j < kt.length; j++) if (toks[i + j] !== kt[j]) { ok = false; break; }
    if (ok) return true;
  }
  return false;
}

// Best example: pointed match first (vowels agree with the headword), then unpointed exact, then
// clitic; shorter lines and lines with an English rendering win. One-word lines are skipped.
function pickExample(w, units, pool) {
  let best = null;
  for (const { i, kind } of units) {
    const u = pool[i];
    if (u.tokens.length < 2 || u.he.split(/\s+/).length < 2) continue; // a hyphenated compound is one written word
    const match = kind === 'exact' && pointedMatch(w, u) ? 'pointed' : kind;
    const score = u.tokens.length + (u.en ? 0 : 6) + (match === 'pointed' ? 0 : match === 'exact' ? 8 : 14) + (u.channel === 'service' ? 2 : 0);
    if (!best || score < best.score || (score === best.score && u.he < best.u.he)) best = { score, u, match };
  }
  if (!best) return null;
  return { he: best.u.he, en: best.u.en, match: best.match, senseChecked: false, source: { file: best.u.file, ref: best.u.ref, channel: best.u.channel } };
}

export function buildThemes(root = ROOT) {
  const words = JSON.parse(fs.readFileSync(path.join(root, 'data/vocab/words.json'), 'utf8')).words;
  const pool = loadSentencePool(root);
  const counts = countOccurrences(words, pool);
  const ranked = rankEntries(words, counts);
  const corpusRank = new Map(ranked.map((r) => [r.id, r.corpusRank]));
  const total = new Map(ranked.map((r) => [r.id, r.total]));

  const spellings = new Map();
  for (const w of words) spellings.set(w.heUnpointed, (spellings.get(w.heUnpointed) || 0) + 1);
  const byTopic = new Map();
  for (const w of words) { if (w.flags && w.flags.hidden) continue; const t = w.topic || 'untopiced'; if (!byTopic.has(t)) byTopic.set(t, []); byTopic.get(t).push(w); }
  const sizes = Object.fromEntries([...byTopic].map(([t, l]) => [t, l.length]));
  const alloc = allocateSets(sizes);

  const themes = []; let dropped = 0; let withExample = 0; let withoutExample = 0;
  for (const topic of [...byTopic.keys()].sort()) {
    const list = byTopic.get(topic).slice().sort((a, b) => corpusRank.get(a.id) - corpusRank.get(b.id));
    const sets = alloc[topic];
    const keep = list.slice(0, sets * THEME_SIZE);
    dropped += list.length - keep.length;
    const per = Math.ceil(keep.length / sets);
    for (let s = 0; s < sets; s++) {
      const slice = keep.slice(s * per, (s + 1) * per);
      if (!slice.length) continue;
      const id = `${topic}-set${String(s + 1).padStart(2, '0')}`;
      const out = slice.map((w) => {
        const c = counts.get(w.id);
        const example = c ? pickExample(w, c.units, pool) : null;
        if (example) withExample++; else withoutExample++;
        const flags = [];
        if (!example) flags.push('noCorpusExample');
        else if (example.match !== 'pointed' && spellings.get(w.heUnpointed) > 1) flags.push('exampleSpellingShared');
        if (w.flags && w.flags.needsReview) flags.push('needsReview');
        return {
          id: w.id, kind: w.kind, he: w.he, heUnpointed: w.heUnpointed, translit: w.translit, en: w.en, pos: w.pos, gender: w.gender,
          forms: w.forms ?? null, frequencyRank: w.frequencyRank, corpusRank: corpusRank.get(w.id), corpusOccurrences: total.get(w.id), level: w.level, track: w.track,
          example, flags,
        };
      });
      themes.push({
        schema: 'alef-vocab-theme/1', id, topic, title: `${titleOf(topic)}, set ${s + 1} of ${sets}`, set: s + 1, sets, size: out.length,
        license: 'Word data CC BY-SA 4.0 (derived from Wiktionary and the FrequencyWords lists, see docs/vocab/LICENSES.md); example lines keep the licence of their source file',
        note: 'Projection of data/vocab/words.json; not native-reviewed. Examples are verbatim lines from the project corpus and lesson text (never composed). Built by tools/vocab/theme_packs.mjs.',
        words: out,
      });
    }
  }
  const index = { schema: 'alef-vocab-themes-index/1', generated: new Date().toISOString().slice(0, 10), count: themes.length, themeSize: THEME_SIZE, counts: { words: themes.reduce((a, t) => a + t.size, 0), withExample, withoutExample, droppedFromWordsJson: dropped }, themes: themes.map((t) => ({ id: t.id, topic: t.topic, title: t.title, size: t.size, withExample: t.words.filter((w) => w.example).length, file: `${t.id}.json` })) };
  return { themes, index, alloc, sizes };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const dry = process.argv.includes('--dry');
  const { themes, index, alloc } = buildThemes();
  if (!dry) {
    const dir = path.join(ROOT, THEME_DIR);
    fs.mkdirSync(dir, { recursive: true });
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.json')) fs.unlinkSync(path.join(dir, f));
    for (const t of themes) fs.writeFileSync(path.join(dir, `${t.id}.json`), JSON.stringify(t) + '\n');
    fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(index, null, 1) + '\n');
  }
  const sizes = themes.map((t) => t.size); const min = Math.min(...sizes); const max = Math.max(...sizes);
  console.log(`themes: ${themes.length} packs, ${index.counts.words} words (sets per topic: ${Object.entries(alloc).map(([k, v]) => `${k} ${v}`).join(', ')})`);
  console.log(`pack size min ${min} max ${max}; ${index.counts.droppedFromWordsJson} words.json entries not placed (lowest corpus rank in oversubscribed topics)`);
  console.log(`examples: ${index.counts.withExample} words have a verbatim corpus/lesson line, ${index.counts.withoutExample} have none (example: null)`);
  if (!dry) console.log(`wrote ${THEME_DIR}/`);
}
