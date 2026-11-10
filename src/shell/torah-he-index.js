// The Hebrew Torah verse recordings are listed in a small index (data/audio/manifest-torah-he.json) instead of one manifest
// entry per clip: 11,692 entries would make the Torah manifest tens of megabytes, and the app loads it at startup.
// Index shape: { voices: { m: providerVoice, f: providerVoice }, status, source, provider,
//   verses: { m: { genesis: { "1": "1-31", ... }, ... }, f: { ... } } }  (verse lists are ranges: "1-5,7,9-12")
export const TORAH_HE_INDEX_URL = 'data/audio/manifest-torah-he.json';

/** "1-5,7" -> [1,2,3,4,5,7] */
export function expandRanges(s) {
  const out = [];
  for (const part of String(s || '').split(',')) {
    const m = /^\s*(\d+)(?:-(\d+))?\s*$/.exec(part);
    if (!m) continue;
    const a = +m[1], b = m[2] ? +m[2] : a;
    for (let n = a; n <= b; n++) out.push(n);
  }
  return out;
}

/** The index as ordinary manifest entries (kind line, id torah-<book>-<chapter>-<verse>). Anything malformed gives []. */
export function expandTorahHebrew(index) {
  if (!index || typeof index !== 'object' || !index.verses || typeof index.verses !== 'object') return [];
  const out = [];
  for (const voice of ['m', 'f']) {
    const books = index.verses[voice];
    if (!books || typeof books !== 'object') continue;
    for (const [book, chapters] of Object.entries(books)) {
      if (!/^[a-z]+$/.test(book) || !chapters || typeof chapters !== 'object') continue;
      for (const [chapter, list] of Object.entries(chapters)) {
        if (!/^\d+$/.test(chapter)) continue;
        for (const verse of expandRanges(list)) {
          const id = `torah-${book}-${chapter}-${verse}`;
          out.push({ path: `audio/${voice}/israeli/line/${id}.mp3`, voice, tradition: 'israeli', kind: 'line', id,
            status: index.status || 'tts', source: index.source || 'paid-cloud', provider: index.provider || 'google',
            providerVoice: index.voices?.[voice] || '' });
        }
      }
    }
  }
  return out;
}
