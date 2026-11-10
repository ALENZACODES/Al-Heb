// Duolingo-style answer band: a colour strip, a short word, and Rimon reacting. Visual only and aria-hidden:
// every screen still writes its own verdict to a status line, so sound, colour and Rimon are never the only cue.
import { showRimon } from './rimon-show.js';
export const OK_WORDS = Object.freeze(['Nice!', 'Yes!', "That's it!", 'Sharp!', 'Spot on!']);
export const NO_WORDS = Object.freeze(['Not quite. Keep going!', 'Almost. Try the next one!', 'Close! It will come back.']);
let n = 0, timer = 0;
/** Pure: the band word for the nth answer. */
export function bandWord(ok, i = 0) { const list = ok ? OK_WORDS : NO_WORDS; return list[Math.abs(i) % list.length]; }
/** Show the band and Rimon's reaction. Returns true when the band was shown. Never throws. */
export function showAnswerBand(ok, { doc = globalThis.document, win = globalThis, settings = null, ms = 1300 } = {}) {
  try {
    if (!doc?.createElement || !doc.body) return false;
    let band = doc.getElementById('alef-answer-band');
    if (!band) {
      band = doc.createElement('div');
      band.id = 'alef-answer-band';
      band.className = 'alef-answer-band';
      band.setAttribute('aria-hidden', 'true');
      doc.body.append(band);
    }
    const word = bandWord(ok, n++);
    band.replaceChildren();
    const ico = doc.createElement('b'); const s = doc.createElement('span'); s.textContent = ok ? '✓' : '✕'; ico.append(s);
    const txt = doc.createElement('span'); txt.textContent = word;
    band.append(ico, txt);
    band.className = `alef-answer-band ${ok ? 'is-ok' : 'is-no'}`;
    void band.offsetWidth;
    band.classList.add('is-on');
    if (timer) win.clearTimeout?.(timer);
    timer = win.setTimeout?.(() => band.classList.remove('is-on'), ms) || 0;
    showRimon(ok ? 'correct' : 'wrong', { doc, win, settings, ms: ms + 300 });
    return true;
  } catch { return false; }
}
