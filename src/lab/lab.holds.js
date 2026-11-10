// Recordings Brain Lab does not play (data/lab/clip-holds.json): each failed at least 2 of 3 independent transcription checks.
// The files stay in the app for other screens. A held clip counts as "no recording", so the game shows the written sound
// instead, exactly as it does with sound off. Loading the list never blocks or breaks a game: any failure means no holds.
import { playRecordedClip, hasRecordedClip } from '../games/engine.js';

const url = new URL('../../data/lab/clip-holds.json', import.meta.url);
let pending = null;
/** The held file paths as a Set (empty on any failure). Fetched once per page. */
export function loadHolds(ctx) {
  if (!pending) {
    const f = ctx?.fetchFn || ctx?.fetch || globalThis.fetch;
    pending = Promise.resolve()
      .then(() => (typeof f === 'function' ? f(url) : null))
      .then((res) => (res && res.ok ? res.json() : null))
      .then((j) => new Set(Array.isArray(j?.paths) ? j.paths : []))
      .catch(() => new Set());
  }
  return pending;
}
/** The file the player would use for this clip, or null. */
function filePath(ctx, kind, id, options) {
  try { const s = ctx?.audio?.status?.(kind, id, options); return s?.source === 'file' ? s.path || null : null; } catch { return null; }
}
/** hasRecordedClip, minus held files. */
export function hasLabClip(ctx, held, kind, id, options = {}) {
  if (!hasRecordedClip(ctx, kind, id, options)) return false;
  const p = filePath(ctx, kind, id, options);
  return !(p && held?.has?.(p));
}
/** playRecordedClip, unless the file is held (then false, as if no recording). */
export function playLabClip(ctx, held, kind, id, options = {}) {
  return hasLabClip(ctx, held, kind, id, options) ? playRecordedClip(ctx, kind, id, options) : Promise.resolve(false);
}
