// @ts-check
// The one plain statement about what sound the app has. Every count comes from data/audio/summary.json (read at run time),
// never from text typed here. Two words are never used for the synthetic clips: "native" and "recorded". They are computer-made
// and no native speaker has listened to them (docs/audio/INGEST-REPORT-83.md, -88.md; docs/review/STATUS.md).

const n = (x) => Number(x).toLocaleString('en-US');

/** What every screen may say when the clip count is not known (offline, first load, file unreadable). No number, no promise. */
export const AUDIO_UNKNOWN = 'The clip count could not be checked right now. There is no recorded teacher; the app uses your device voice when it has a Hebrew voice.';

/** True when the summary has a usable count. @param {any} a */
export const hasAudioCounts = (a) => !!a && Number.isFinite(a.total) && Number.isFinite(a.recorded) && Number.isFinite(a.tts);

/**
 * The statement. With synthetic clips and no human recording this is exactly:
 * "<N> short word clips with a synthetic voice, unreviewed by native speakers; no recorded teacher; the rest of the app uses your device voice when it has a Hebrew voice."
 * (<N> is read from the summary.) If human recordings are ever counted, the line stops claiming "no recorded teacher" and says to update it.
 * @param {{total?:number, recorded?:number, tts?:number}|null|undefined} a
 */
export function audioTruthLine(a) {
  if (!hasAudioCounts(a)) return AUDIO_UNKNOWN;
  const rec = /** @type {number} */ (a.recorded), tts = /** @type {number} */ (a.tts);
  const rest = 'the rest of the app uses your device voice when it has a Hebrew voice.';
  if (rec > 0) return `${n(rec)} recorded ${rec === 1 ? 'clip' : 'clips'} and ${n(tts)} with a synthetic voice (unreviewed by native speakers); ${rest}`;
  if (tts > 0) return `${n(tts)} short word ${tts === 1 ? 'clip' : 'clips'} with a synthetic voice, unreviewed by native speakers; no recorded teacher; ${rest}`;
  return `No audio clips are included; no recorded teacher; the app uses your device voice when it has a Hebrew voice.`;
}

/** Second sentence for About and Settings: how the clips are labelled (in their manifest entries and sidecars). Only said when clips exist. @param {any} a */
export function audioTruthDetail(a) {
  // Every counted clip is the Man (Ari) voice in the Israeli style: tests/audio.truth.test.js fails if the manifests ever say otherwise,
  // and then this sentence must be updated. The count is the one read from the summary.
  return hasAudioCounts(a) && a.recorded === 0 && a.tts > 0
    ? `The clips are labelled synthetic and Israeli style; the Israeli style has not been verified. All ${n(a.tts)} use the Man (Ari) voice, so the Man and Woman choice changes the sound only for Man with the Israeli style, where those words play a clip. With any other choice no clip plays, and your device voice, whose gender and accent your device sets, is never changed by it.`
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
