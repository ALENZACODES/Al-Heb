// One shared label table for the audio manifest statuses. Every screen, report or doc that names a clip's status
// reads from here, so the wording cannot drift. Status values the manifest may hold:
//   recorded              a human reader's recording
//   tts                   older synthetic Israeli-Hebrew clip (kept readable)
//   synthetic-unreviewed  synthetic clip from the local text-to-speech pipeline, no human has listened to it
//   synthetic-reviewed    same, after a human marked it reviewed (no tool does that yet; edit by hand)
// A clip whose manifest `source` is 'outside-respelled' was made from a stored respelling by an outside voice service; its label says that and that the accent is not verified.
// A clip whose manifest `source` is 'outside-synthetic' (tools/audio/ingest.mjs) came from a generator whose model and method are unknown, so its label
// says that instead of claiming "made from pointed Hebrew / a respelling".
// A clip whose `source` is one of ACCENT_SOURCES (src/audio/player.js) is an admitted Sephardi/Ashkenazi clip: either the Israeli voice
// reading the tradition's respelling ('tts-respelled-israeli-voice') or an older respelled clip sped up to the Israeli clip's pace
// ('tts-respelled-tempo-capped'); its label says which, and that nobody has listened to it.
// Anything else counts as 'missing' (see summarizeManifest in ./audio.js).
import { ACCENT_SOURCES } from '../audio/player.js';
export const STATUS_LABELS = Object.freeze({
  recorded: 'Recorded by a human reader',
  tts: 'Synthetic voice, not a recorded teacher',
  missing: 'No audio yet',
});

export const SYNTHETIC_STATUSES = Object.freeze(['tts', 'synthetic-unreviewed', 'synthetic-reviewed']);
/** True for every status that means "a computer-made clip". Use this, never `=== 'tts'`, to tell synthetic from human. */
export const isSyntheticStatus = (status) => SYNTHETIC_STATUSES.includes(status);

const TRAD_STYLE = Object.freeze({ israeli: 'Israeli', sephardi: 'Sephardi', ashkenazi: 'Ashkenazi', english: 'English' });

/**
 * Which tradition a playing file is, as a caption. Same file and setting: the tradition's name. A file of another tradition
 * standing in for the setting (the Sephardi setting plays the Israeli clips, owner decision 2026-11-07, src/audio/player.js
 * PLAYBACK_TRADITION): "Israeli voice; Sephardi reading shown in English letters".
 * @param {string} tradition the learner's setting @param {string} [fileTradition] the file's tradition when it differs
 */
export function traditionCaption(tradition, fileTradition) {
  const file = fileTradition || tradition;
  const fileName = TRAD_STYLE[file] || file || 'Israeli';
  if (!fileTradition || fileTradition === tradition || !TRAD_STYLE[tradition]) return fileName;
  return `${fileName} voice; ${TRAD_STYLE[tradition]} reading shown in English letters`;
}

/**
 * Honest label for a synthetic-unreviewed/-reviewed clip. `tradition` is the tradition of the FILE (not the learner's setting);
 * `source` is the manifest source when known ('tts-respelled...' or 'tts-hebrew...'); without it, Israeli means made from
 * pointed Hebrew and the other traditions mean made from a respelling (the only way the pipeline makes them).
 */
export function syntheticLabel(status, tradition, source) {
  if (tradition === 'english') return `Synthetic English voice (not a recorded teacher; ${status === 'synthetic-reviewed' ? 'reviewed by a listener' : 'unreviewed'})`;
  const style = TRAD_STYLE[tradition];
  const rev = status === 'synthetic-reviewed' ? 'reviewed by a listener' : 'unreviewed';
  if (source === ACCENT_SOURCES.israeliVoice) {
    // the Israeli he-IL voice of the same slot reading the tradition's English-letter respelling (tools/audio/render_tts.mjs --tradition)
    return `Synthetic voice (Israeli voice reading the ${style || 'tradition\'s'} respelling; not a recorded teacher; ${rev})`;
  }
  if (source === ACCENT_SOURCES.tempoCapped) {
    // an older outside-voice respelled clip, sped up at the same pitch to at most 1.26x its Israeli counterpart (tools/audio/tempo_cap.mjs)
    return `Synthetic voice (outside voice reading the ${style || 'tradition\'s'} respelling, sped up to the Israeli clip's pace; ${style ? `${style} style not verified; ` : ''}not a recorded teacher; ${rev})`;
  }
  if (typeof source === 'string' && source.startsWith('outside-respelled')) {
    // made by an outside voice service from a stored respelling (tools/tts/voice_*.mjs, tools/audio/ingest.mjs --origin respelled): say so, and that the accent is unverified
    const rev = status === 'synthetic-reviewed' ? 'reviewed by a listener' : 'unreviewed';
    return `Synthetic voice (${[style ? `${style} style not verified` : '', 'made from a respelling', 'not a recorded teacher', rev].filter(Boolean).join('; ')})`;
  }
  if (typeof source === 'string' && source.startsWith('outside-synthetic')) {
    const rev = status === 'synthetic-reviewed' ? 'reviewed by a listener' : 'unreviewed';
    return `Synthetic voice (${['outside generator', style ? `${style} style not verified` : '', 'not a recorded teacher', rev].filter(Boolean).join('; ')})`;
  }
  const respelled = typeof source === 'string' && source.startsWith('tts-respelled') ? true
    : typeof source === 'string' && source.startsWith('tts-hebrew') ? false
    : style ? tradition !== 'israeli' : null;
  const made = respelled === null ? '' : respelled ? 'made from a respelling' : 'made from pointed Hebrew';
  const reviewed = status === 'synthetic-reviewed' ? 'reviewed by a listener' : 'unreviewed';
  const parts = [style ? `${style} style` : '', made, 'not a recorded teacher', reviewed].filter(Boolean);
  return `Synthetic voice (${parts.join('; ').replace('style; ', 'style, ')})`;
}

/** Label for a manifest status value; anything that is not 'recorded' or synthetic is 'missing'. */
export function statusLabel(status, tradition, source) {
  if (status === 'recorded') return STATUS_LABELS.recorded;
  if (tradition === 'english' && isSyntheticStatus(status)) return syntheticLabel(status, tradition, source);
  if (status === 'tts') return STATUS_LABELS.tts;
  if (status === 'synthetic-unreviewed' || status === 'synthetic-reviewed') return syntheticLabel(status, tradition, source);
  return STATUS_LABELS.missing;
}

/**
 * Label for a clip that is being (or can be) played from a file. The player reports the manifest status as
 * `entryStatus`; with no status at all (a bare "has a file" answer) it is the human label, as before. A synthetic status
 * is never shown as a human recording.
 */
export function fileLabel(entryStatus, tradition, source) {
  if (isSyntheticStatus(entryStatus)) return statusLabel(entryStatus, tradition, source);
  return STATUS_LABELS.recorded;
}
