// @ts-check
// Aleph text corpus API (lane 5). Pure data access + letter inventory; no DOM.
//   const corpus = await loadCorpus();            // browser (fetch) or Node (fs)
//   corpus.getText('bless-priestly-1'); corpus.search('shalom'); corpus.bySituation('cafe');
//   letterInventory(he) -> which of the 27 letters / vowel signs occur
import {
  LETTER_ID, BASE_LETTER_IDS, FINAL_LETTER_IDS, FINAL_OF, MARK_ID, VOWEL_IDS, MARK_IDS,
  isHebrewLetter, stripAccents, skeleton, foldedSkeleton, wordsOf,
} from './normalize.js';

export { wordsOf, skeleton, foldedSkeleton, stripAccents };

/**
 * Which letters and marks occur in a Hebrew string. Accents are ignored.
 * Shuruk = a vav carrying only a dagesh dot (no other vowel); it is counted as 'shuruk', not as a dagesh.
 * Qamats-qatan U+05C7 counts as 'kamatz'; holam-haser U+05BA as 'cholam'.
 * @param {string} he
 */
export function letterInventory(he) {
  const s = stripAccents(he).normalize('NFC');
  /** @type {Record<string, number>} */ const letters = {};
  /** @type {Record<string, number>} */ const vowels = {};
  /** @type {Record<string, number>} */ const marks = {}; // vowels + dagesh + shin/sin dots
  let letterCount = 0;
  const chars = [...s];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (!isHebrewLetter(c)) continue;
    const id = LETTER_ID[c];
    letters[id] = (letters[id] || 0) + 1; letterCount++;
    const cluster = [];
    let j = i + 1;
    while (j < chars.length && chars[j] >= '֑' && chars[j] <= 'ׇ' && !isHebrewLetter(chars[j]) && chars[j] !== '־' && chars[j] !== '׃' && chars[j] !== '׀') { cluster.push(chars[j]); j++; }
    const ids = cluster.map((m) => MARK_ID[m]).filter(Boolean);
    const hasVowel = ids.some((m) => VOWEL_IDS.includes(m));
    for (let m of ids) {
      if (m === 'dagesh' && c === 'ו' && !hasVowel) m = 'shuruk';
      marks[m] = (marks[m] || 0) + 1;
      if (VOWEL_IDS.includes(m)) vowels[m] = (vowels[m] || 0) + 1;
    }
  }
  const lettersPresent = Object.keys(letters);
  const baseFolded = new Set(lettersPresent.map((id) => FINAL_OF[id] || id));
  return {
    words: wordsOf(s.replace(/\u05BE/g, ' ')).length, // research definition: a maqaf splits words (count.py)
    tokens: wordsOf(s).length,                          // reading tokens: maqaf-joined pairs stay together
    letterCount,
    letters,                                   // by shared id, finals separate
    distinctLetterIds: [...BASE_LETTER_IDS, ...FINAL_LETTER_IDS].filter((id) => letters[id]),
    distinctBaseLetters: BASE_LETTER_IDS.filter((id) => baseFolded.has(id)), // finals folded into base
    finalsPresent: FINAL_LETTER_IDS.filter((id) => letters[id]),
    missingBaseLetters: BASE_LETTER_IDS.filter((id) => !baseFolded.has(id)),
    vowels,
    distinctVowels: VOWEL_IDS.filter((id) => vowels[id]),
    marks,
    distinctMarks: MARK_IDS.filter((id) => marks[id]),
  };
}

/** Plain, serialisable corpus built from parsed JSON. */
export function createCorpus(registry, phrasebook, extras = {}) {
  const guide = extras.guide ?? null, prayerMeta = extras.prayerMeta?.entries ?? {}, gaps = extras.gaps?.gaps ?? [];
  const texts = (registry?.entries ?? []);
  const phrases = (phrasebook?.entries ?? []);
  const textById = new Map(texts.map((t) => [t.id, t]));
  for (const t of texts) for (const a of t.aliases ?? []) if (!textById.has(a)) textById.set(a, t);
  const phraseById = new Map(phrases.map((p) => [p.id, p]));
  const hasHe = (q) => /[א-ת]/.test(q);
  const lower = (s) => String(s ?? '').toLowerCase();
  return {
    registry, phrasebook,
    /** Torah-service guide ({title, sections[], otherOccasions[]}) or null when the file is absent */
    guide: () => guide,
    /** per-prayer metadata (where in the service, delivery, denominations, plain-English line) or null */
    prayerMeta: (id) => prayerMeta[textById.get(id)?.id ?? id] ?? null,
    /** a gap from gaps.json (something the corpus does not contain) by id */
    gap: (id) => gaps.find((g) => g.id === id) ?? null,
    /** by id or by an alias (earlier descriptive id) */
    getText: (id) => textById.get(id) ?? null,
    allTexts: () => texts.slice(),
    textIds: () => texts.map((t) => t.id),
    getPhrase: (id) => phraseById.get(id) ?? null,
    allPhrases: () => phrases.slice(),
    situations: () => (phrasebook?.situations ?? [...new Set(phrases.map((p) => p.situation))]).slice(),
    bySituation: (sit) => phrases.filter((p) => p.situation === sit),
    byRegister: (reg) => phrases.filter((p) => p.register === reg),
    textsByLevel: (level) => texts.filter((t) => t.level === level),
    textsByCategory: (cat) => texts.filter((t) => t.category === cat),
    /**
     * Search texts and phrases. Latin queries match id/ref/title/English/transliteration (case-insensitive);
     * Hebrew queries match the consonant skeleton (points and final forms ignored).
     * @returns {{type:'text'|'phrase', id:string, item:any}[]}
     */
    search(query) {
      const q = String(query ?? '').trim();
      if (!q) return [];
      const out = [];
      if (hasHe(q)) {
        const k = foldedSkeleton(q);
        for (const t of texts) if (foldedSkeleton(t.he).includes(k)) out.push({ type: 'text', id: t.id, item: t });
        for (const p of phrases) {
          const hay = [p.he, ...(p.forms ? [p.forms.m.he, p.forms.f.he] : [])].map(foldedSkeleton);
          if (hay.some((h) => h.includes(k))) out.push({ type: 'phrase', id: p.id, item: p });
        }
        return out;
      }
      const ql = lower(q);
      for (const t of texts) if ([t.id, t.ref, t.title, t.english].some((f) => lower(f).includes(ql))) out.push({ type: 'text', id: t.id, item: t });
      for (const p of phrases) if ([p.id, p.en, p.translit, p.notes, p.situation].some((f) => lower(f).includes(ql))) out.push({ type: 'phrase', id: p.id, item: p });
      return out;
    },
    letterInventory,
  };
}

/**
 * Load registry.json and phrasebook.json. Browser: fetch relative to this module. Node: read from disk.
 * @param {{base?: string|URL}} [opts]
 */
export async function loadCorpus(opts = {}) {
  const base = opts.base ?? new URL('../../data/corpus/', import.meta.url);
  const readJson = async (name) => {
    const url = new URL(name, base);
    if (typeof process !== 'undefined' && process.versions?.node && url.protocol === 'file:') {
      const fs = await import('node:fs/promises');
      return JSON.parse(await fs.readFile(url, 'utf8'));
    }
    const r = await fetch(url);
    if (!r.ok) throw new Error(`corpus: ${name} -> HTTP ${r.status}`);
    return r.json();
  };
  // guide, per-prayer metadata and gaps are optional: the reader still works without them
  const optional = (name) => readJson(name).catch(() => null);
  const [registry, phrasebook, guide, prayerMeta, gaps] = await Promise.all([readJson('registry.json'), readJson('phrasebook.json'), optional('torah-service-guide.json'), optional('prayer-meta.json'), optional('gaps.json')]);
  return createCorpus(registry, phrasebook, { guide, prayerMeta, gaps });
}

/** Read one JSON file under data/corpus/ (same browser/Node duality as loadCorpus). */
async function readCorpusJson(name, opts = {}) {
  const base = opts.base ?? new URL('../../data/corpus/', import.meta.url);
  const url = new URL(name, base);
  if (typeof process !== 'undefined' && process.versions?.node && url.protocol === 'file:') {
    const fs = await import('node:fs/promises');
    return JSON.parse(await fs.readFile(url, 'utf8'));
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`corpus: ${name} -> HTTP ${r.status}`);
  return r.json();
}

/** The full-Torah grid: books, chapter verse counts, the 54 portions, provenance (data/corpus/torah/index.json). */
export const loadTorahIndex = (opts = {}) => readCorpusJson('torah/index.json', opts);
/** One built chapter of the full Torah (data/corpus/torah/<book>/<nn>.json). */
export const loadTorahChapter = (book, chapter, opts = {}) => readCorpusJson(`torah/${book}/${String(chapter).padStart(2, '0')}.json`, opts);
