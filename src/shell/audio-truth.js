// @ts-check
// The one plain statement about what sound the app has. Every count comes from data/audio/summary.json (read at run time),
// never from text typed here. Two words are never used for the synthetic clips: "native" and "recorded". They are computer-made
// and no native speaker has listened to them (docs/audio/INGEST-REPORT-83.md, -88.md; docs/review/STATUS.md).

const n = (x) => Number(x).toLocaleString('en-US');

/** What every screen may say when the clip count is not known (offline, first load, file unreadable). No number, no promise. */
export const AUDIO_UNKNOWN = 'The clip count could not be checked right now. There is no recorded teacher; the clips are synthetic, and the app uses your device voice when it has a Hebrew voice.';

/** True when the summary has a usable count. @param {any} a */
export const hasAudioCounts = (a) => !!a && Number.isFinite(a.total) && Number.isFinite(a.recorded) && Number.isFinite(a.tts);

/** Every synthetic speech clip on disk: the manifests' count plus the book, arcade and opening-prayer clips that no manifest lists
 *  (summary.spoken, written by tools/audio/summary.mjs). An older summary without that field gives the manifest count alone. @param {any} a */
export const spokenClips = (a) => (hasAudioCounts(a) ? (Number.isFinite(a.spoken) && a.spoken >= a.tts ? a.spoken : a.tts) : 0);

/** What the synthetic clips cover, read from the summary's per-kind counts (kinds, extra) in this order; '' when the summary has no breakdown. @param {any} a */
export function clipCoverage(a) {
  const k = a?.kinds || {}, x = a?.extra || {};
  const names = [['letters', k.letter], ['vowels', k.vowel], ['syllables', k.syllable], ['words', k.word], ['lines', k.line], ['prayers', (k.prayer || 0) + (x.homepage || 0)], ['book pages', x.book], ['games', x.games]]
    .filter(([, n]) => Number.isFinite(n) && n > 0).map(([name]) => name);
  if (!names.length) return '';
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * The statement. With synthetic clips and no human recording this is exactly:
 * "<N> Hebrew clips in a synthetic voice (a man's and a woman's; no recorded teacher, unreviewed by native speakers) cover letters, vowels,
 * syllables, words, lines, prayers, book pages and games; where none exists the app uses your device voice when it has a Hebrew voice."
 * (<N> and the covered kinds are read from the summary: spoken and kinds/extra; an older file without them gives the tts count and no list.) If human recordings are ever counted, the line stops claiming "no recorded teacher" and says to update it.
 * @param {{total?:number, recorded?:number, tts?:number, spoken?:number}|null|undefined} a
 */
export function audioTruthLine(a) {
  if (!hasAudioCounts(a)) return AUDIO_UNKNOWN;
  const rec = /** @type {number} */ (a.recorded), spoken = spokenClips(a);
  if (rec > 0) return `${n(rec)} recorded ${rec === 1 ? 'clip' : 'clips'} and ${n(spoken)} with a synthetic voice (unreviewed by native speakers); where none exists the app uses your device voice when it has a Hebrew voice.`;
  const cover = clipCoverage(a);
  if (spoken > 0) return `${n(spoken)} Hebrew ${spoken === 1 ? 'clip' : 'clips'} in a synthetic voice (a man's and a woman's; no recorded teacher, unreviewed by native speakers)${cover ? ` cover ${cover}` : ''}; where none exists the app uses your device voice when it has a Hebrew voice.`;
  return `No audio clips are included; no recorded teacher; the app uses your device voice when it has a Hebrew voice.`;
}

/** Second sentence for About and Settings: how the clips are labelled (in their manifest entries and sidecars). Only said when clips exist. @param {any} a */
export function audioTruthDetail(a) {
  // A clip is synthetic and unreviewed. It plays only for the voice and tradition on its own row.
  // tests/trust-copy.test.js fails if a clip is handed to a different voice or tradition.
  return hasAudioCounts(a) && a.recorded === 0 && spokenClips(a) > 0
    ? `A clip plays only for the voice and pronunciation you selected, and only when that exact combination has a file. It is not swapped for a different voice or tradition. The Israeli style has not been verified. Where no exact file exists, nothing is spoken unless this device has a Hebrew voice, and that voice is not a recording.`
    : '';
}

/** Read the tiny shipped summary. Never throws; null when it cannot be read. @param {(u:string)=>Promise<any>} [fetchFn] */
export async function loadAudioSummary(fetchFn = globalThis.fetch) {
  try {
    const r = await fetchFn('data/audio/summary.json');
    if (!r || r.ok === false) return null;
    const j = await r.json();
    return hasAudioCounts(j) ? j : null;
  } catch { return null; }
}

/**
 * A paragraph (or other tag) that shows "Sound: <statement>". Drawn at once without a number, then filled in from the data.
 * @param {Function} h element factory @param {{tag?:string, id?:string, class?:string, summary?:any, fetchFn?:any, prefix?:string, detail?:boolean}} [o]
 */
export function audioTruthNode(h, { tag = 'p', id = 'audio-truth', class: cls = '', summary, fetchFn, prefix = 'Sound: ', detail = true } = {}) {
  const text = (a) => `${prefix}${audioTruthLine(a)}${detail && audioTruthDetail(a) ? ' ' + audioTruthDetail(a) : ''}`;
  const el = h(tag, { id, class: cls, 'data-audio-truth': 'yes' }, text(summary || null));
  if (!summary) loadAudioSummary(fetchFn).then((a) => { el.textContent = text(a); }).catch(() => { /* keep the no-number wording */ });
  return el;
}
