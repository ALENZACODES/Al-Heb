// @ts-check
// The one plain statement about what sound the app has (shown on About). Every count comes from data/audio/summary.json
// (copied into src/lib/counts.generated.js at build time; fetched at run time only as a fallback), never from text typed here.
// The clips are computer-made, so two words are never used for them: "native" and "recorded".

import { TOTALS } from '../lib/counts.generated.js';

const n = (x) => Number(x).toLocaleString('en-US');

/** What every screen may say when the clip count is not known (offline, first load, file unreadable). No number, no promise. */
export const AUDIO_UNKNOWN = "Ari and Noa's voices are computer-generated. Where a word has no audio yet, your device's own Hebrew voice reads it, if it has one.";

/** True when the summary has a usable count. @param {any} a */
export const hasAudioCounts = (a) => !!a && Number.isFinite(a.total) && Number.isFinite(a.recorded) && Number.isFinite(a.tts);

/** Every synthetic speech clip on disk: the manifests' count plus the book, arcade and opening-prayer clips that no manifest lists
 *  (summary.spoken, written by tools/audio/summary.mjs). An older summary without that field gives the manifest count alone. @param {any} a */
export const spokenClips = (a) => (hasAudioCounts(a) ? (Number.isFinite(a.spoken) && a.spoken >= a.tts ? a.spoken : a.tts) : 0);

/** What the synthetic clips cover, read from the summary's per-kind counts (kinds, extra) in this order; '' when the summary has no breakdown. @param {any} a */
export function clipCoverage(a) {
  const k = a?.kinds || {}, x = a?.extra || {};
  const names = [['letters', k.letter], ['vowels', k.vowel], ['syllables', k.syllable], ['words', (k.word || 0) + (x.dictionary || 0)], ['lines', k.line], ['prayers', (k.prayer || 0) + (x.homepage || 0)], ['book pages', x.book], ['games', x.games]]
    .filter(([, n]) => Number.isFinite(n) && n > 0).map(([name]) => name);
  if (!names.length) return '';
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * The statement. With computer-generated clips and no human recording this is exactly:
 * "Ari and Noa read <N> Hebrew clips: letters, vowels, syllables, words, lines, prayers, book pages and games. Their voices are
 * computer-generated. Where a word has no audio yet, your device's own Hebrew voice reads it, if it has one."
 * (<N> and the covered kinds are read from the summary: spoken and kinds/extra; an older file without them gives the tts count and no list.)
 * If human recordings are ever counted, the line names them and stops calling every voice computer-generated.
 * @param {{total?:number, recorded?:number, tts?:number, spoken?:number}|null|undefined} a
 */
export function audioTruthLine(a) {
  if (!hasAudioCounts(a)) return AUDIO_UNKNOWN;
  const rec = /** @type {number} */ (a.recorded), spoken = spokenClips(a);
  if (rec > 0) return `${n(rec)} recorded ${rec === 1 ? 'clip' : 'clips'} and ${n(spoken)} computer-generated ${spoken === 1 ? 'clip' : 'clips'}. Where a word has no audio yet, your device's own Hebrew voice reads it, if it has one.`;
  const cover = clipCoverage(a);
  if (spoken > 0) return `Ari and Noa read ${n(spoken)} Hebrew ${spoken === 1 ? 'clip' : 'clips'}${cover ? `: ${cover}` : ''}. Their voices are computer-generated. Where a word has no audio yet, your device's own Hebrew voice reads it, if it has one.`;
  return "Aleph has no audio clips yet. Your device's own Hebrew voice reads each word, if it has one.";
}

/** Second sentence for About and Settings: how the clips are labelled (in their manifest entries and sidecars). Only said when clips exist. @param {any} a */
export function audioTruthDetail(a) {
  // A clip is synthetic and unreviewed. It plays only for the voice (man or woman) on its own row; the Sephardi and Ashkenazi
  // settings play the Israeli clip of that voice when they have none of their own (owner rule, 7 November 2026).
  // tests/trust-copy.test.js fails if a clip is handed to a different voice.
  return hasAudioCounts(a) && a.recorded === 0 && spokenClips(a) > 0
    ? `Each clip plays in the voice you chose, Ari or Noa. The Sephardi and Ashkenazi settings play the Israeli clip and show their own reading in English letters.`
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
  // One source: the build-time totals (src/lib/counts.generated.js, copied from summary.json); the run-time fetch is only a fallback.
  if (!summary && hasAudioCounts(TOTALS?.audio?.summary)) el.textContent = text(TOTALS.audio.summary);
  else if (!summary) loadAudioSummary(fetchFn).then((a) => { el.textContent = text(a); }).catch(() => { /* keep the no-number wording */ });
  return el;
}
