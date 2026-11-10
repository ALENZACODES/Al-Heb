// A data file that answers 404 is missing from this copy of the app: that is not the learner's connection, so say so.
// loadJson() (src/sprint/loader.js, src/grammar/loader.js) throws "could not load <file>: HTTP <status>".
export const isFileMissing = (err) => /\bHTTP 404\b/.test(String(err && err.message ? err.message : err));
export const MISSING_FILE_NOTE = 'A data file is missing from this copy of the app. This is not your connection. Nothing was lost.';
/** @param {unknown} err @param {string} stem sentence start, e.g. 'Could not load the word list' @param {string} fallback text used for any other failure */
export function loadFailureText(err, stem, fallback) {
  return isFileMissing(err) ? `${stem}. ${MISSING_FILE_NOTE}` : fallback;
}
