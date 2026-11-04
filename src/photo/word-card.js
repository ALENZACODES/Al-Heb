// Word-card model for the scan view. Lane 6 (round 3). Pure: no DOM, no network.
// A card answers four questions about one Hebrew word read from a photo:
//   1. which letters, with which vowel          -> card.letters   (letter-by-letter breakdown)
//   2. how does it split                        -> card.syllables (from syllabify.js; stress = default-final unless listed)
//   3. how do I say it in each tradition        -> card.translit  {israeli, sephardi, ashkenazi} via lane 3's transliterate()
//   4. can I hear it                            -> card.audio     (hook: manifest word id when known, else the text for a flagged fallback)
// Transliteration comes from lane 3 (src/pronunciation/transliterate.js, scheme 'siddur'). Lane 3 currently renders israeli and sephardi
// identically in Latin letters (their differences are not written in that scheme); the card says so instead of implying a difference.
// Nothing here has been checked by a native speaker.
import { tokenise, isHebrew } from './hebrew.js';

export const TRADITIONS = ['israeli', 'sephardi', 'ashkenazi'];

/** Load lane 3's transliterate (or null if unavailable). Browser or Node. */
export async function loadTransliterator() {
  try { const m = await import('../pronunciation/transliterate.js'); return typeof m.transliterate === 'function' ? m.transliterate : null; } catch { return null; }
}

/** Load letter names/sounds from data/letters/letters.json -> Map(id -> {name, soundEn}). Empty map on failure. */
export async function loadLetterInfo(fetchImpl = globalThis.fetch) {
  const map = new Map();
  try {
    let j;
    if (typeof fetchImpl === 'function' && typeof location !== 'undefined') j = await (await fetchImpl(new URL('../../data/letters/letters.json', import.meta.url))).json();
    else { const fs = await import('node:fs/promises'); j = JSON.parse(await fs.readFile(new URL('../../data/letters/letters.json', import.meta.url), 'utf8')); }
    for (const l of Array.isArray(j) ? j : j.letters || []) map.set(l.id, { name: l.name, soundEn: l.sound?.en ?? null });
  } catch { /* names are optional */ }
  return map;
}

/** Three-tradition transliteration of a pointed word. Returns {israeli, sephardi, ashkenazi, sameIsraeliSephardi} or null. */
export function transliterateThree(pointedWord, transliterate) {
  if (typeof transliterate !== 'function') return null;
  const out = {};
  try { for (const t of TRADITIONS) out[t] = transliterate(pointedWord, { scheme: 'siddur', tradition: t }); } catch { return null; }
  out.sameIsraeliSephardi = out.israeli === out.sephardi;
  return out;
}

/**
 * Manifest word id for the `tokenIndex`-th Hebrew word of a line that matched a registry entry (ids look like `bless-priestly-2-w3`,
 * counted over the whole entry in reading order). Null if the line is not a clean per-line corpus match.
 * Whether an audio FILE exists for that id is a separate question: ask ctx.audio.has('word', id) / play().
 */
export function wordAudioId(match, registry, tokenIndex) {
  if (!match?.matched || match.source !== 'registry' || match.lineIndex < 0) return null;
  const arr = Array.isArray(registry) ? registry : (registry?.entries || registry?.texts || registry?.items || []);
  const e = arr.find((x) => x.id === match.id);
  if (!e || typeof e.he !== 'string') return null;
  const lines = e.he.split(/\n|׃/u).map((l) => l.trim()).filter(Boolean);
  // The audio manifest splits on whitespace only (a maqaf compound such as בכל־לבבך is ONE audio word); the pipeline splits on maqaf too.
  const ws = (l) => l.split(/\s+/u).filter(Boolean);
  let offset = 0;
  for (let i = 0; i < match.lineIndex && i < lines.length; i++) offset += ws(lines[i]).length;
  let seen = 0;
  const words = ws(lines[match.lineIndex] ?? '');
  for (let k = 0; k < words.length; k++) { seen += tokenise(words[k]).length; if (tokenIndex < seen) return `${match.id}-w${offset + k + 1}`; }
  return null;
}

/**
 * @param {object} result runPipeline() result
 * @param {{transliterate?:Function, letterInfo?:Map, registry?:any}} [o]
 */
export function buildWordCards(result, { transliterate, letterInfo, registry } = {}) {
  const cards = [];
  for (const line of result.lines) {
    let hebIdx = 0;
    for (const w of line.words) {
      if (w.kind !== 'hebrew') continue;
      const tokenIndex = hebIdx++;
      const hasSyl = w.syllables.length > 0;
      const letters = w.syllables.flatMap((s) => s.letters.map((l) => {
        const info = letterInfo?.get(l.id);
        return { letter: l.letter, id: l.id, name: info?.name ?? null, soundEn: info?.soundEn ?? null, vowel: l.vowel ?? null, silent: !!(l.silent || l.mater) };
      }));
      const audioId = hasSyl ? wordAudioId(line.match, registry, tokenIndex) : null;
      cards.push({
        lineIndex: line.index, he: w.he, note: w.note || null, ipa: w.ipa || null,
        pointedSource: line.pointedSource,
        letters,
        syllables: w.syllables.map((s) => ({ he: s.he, translit: s.translit ?? '', stressed: !!s.stressed })),
        translit: hasSyl ? transliterateThree(w.he, transliterate) : null,
        audio: { kind: 'word', id: audioId, text: w.he, canSpeak: hasSyl },
        unpointedNote: hasSyl ? null : 'no vowel points, so no letter-by-letter vowels, syllables or transliteration',
      });
    }
  }
  return cards;
}
