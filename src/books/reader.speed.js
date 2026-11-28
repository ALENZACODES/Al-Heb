// @ts-check
/* Reader speed (pure helpers, no DOM creation). Every page plays at normal pace unless the learner presses
   "Slower"; the choice lasts for this visit to the app (module state, nothing stored) and is not a global setting.
   The slow rate is the one slow speed the shared player uses (src/audio/player.js, 0.7x), with preservesPitch so the
   same voice is heard slower at the same pitch where the browser supports it. */
import { clipPlaybackRate } from '../audio/player.js';

export const READER_SLOW_RATE = clipPlaybackRate('slow');
export const READER_NORMAL_RATE = 1;

let slowThisSession = false;
let slowRate = READER_SLOW_RATE; // 0.7x from the Slower button; the playback bar can pick 0.8x or 0.6x
/** Whether the reader is in slow mode for this session. */
export const readerSlow = () => slowThisSession;
/** Set slow mode for this session; returns the new value. */
export function setReaderSlow(on) { slowThisSession = !!on; slowRate = READER_SLOW_RATE; return slowThisSession; }

/** The rate for a choice. */
export const rateFor = (slow) => (slow ? slowRate : READER_NORMAL_RATE);
/** The playback bar changed the speed of the page's clip: keep that choice for the next pages too. Returns whether the reader is now slow. */
export function noteReaderRate(rate) {
  const r = Number(rate);
  if (!(r > 0)) return slowThisSession;
  if (r < 0.999) { slowThisSession = true; slowRate = r; } else slowThisSession = false;
  return slowThisSession;
}

/**
 * Apply the choice to a media element (before play). Sets playbackRate and defaultPlaybackRate, and asks the browser to keep
 * the pitch where it offers the property. Returns the rate applied. A fake element without these properties is tolerated.
 * @param {any} el @param {boolean} slow
 */
export function applyReaderRate(el, slow) {
  const rate = rateFor(slow);
  if (!el) return rate;
  try { el.defaultPlaybackRate = rate; } catch { /* read-only on a fake */ }
  try { el.playbackRate = rate; } catch { /* read-only on a fake */ }
  for (const k of ['preservesPitch', 'mozPreservesPitch', 'webkitPreservesPitch']) { try { if (k in el) el[k] = true; } catch { /* ignore */ } }
  return rate;
}

/** Text for the status line after the speed changes. */
export const speedLine = (slow) => (slow ? `Slower: ${READER_SLOW_RATE}x speed, same voice.` : 'Normal speed.');
