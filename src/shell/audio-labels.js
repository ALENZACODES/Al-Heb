// One shared label table for the audio manifest statuses. Every screen, report or doc that names a clip's status
// reads from here, so the wording cannot drift. The status values themselves do not change: the manifest and the
// TTS lane write 'recorded' or 'tts'; anything else counts as 'missing' (see summarizeManifest in ./audio.js).
export const STATUS_LABELS = Object.freeze({
  recorded: 'Recorded by a human reader',
  tts: 'Synthetic voice (Israeli only), not a recorded teacher',
  missing: 'No audio yet',
});

/** Label for a manifest status value; anything that is not 'recorded' or 'tts' is 'missing'. */
export function statusLabel(status) {
  return STATUS_LABELS[status === 'recorded' || status === 'tts' ? status : 'missing'];
}

/**
 * Label for a clip that is being (or can be) played from a file. The player reports the manifest status as
 * `entryStatus`; a file entry is 'tts' or 'recorded', so anything but 'tts' is the human label (the same rule the
 * views applied before this table existed).
 */
export function fileLabel(entryStatus) {
  return entryStatus === 'tts' ? STATUS_LABELS.tts : STATUS_LABELS.recorded;
}
