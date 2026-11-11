// Duolingo-style answer band: a colour strip, a short word, and Rimon reacting. Visual only and aria-hidden:
// every screen still writes its own verdict to a status line, so sound, colour and Rimon are never the only cue.
// C-06: a screen that writes its own verdict passes { words: false }, so the band is a colour flash and a mark, not a
// second message. When the flash ends (or the page changes) the band is removed from the DOM, not just hidden, so its
// text never lingers for text extraction or a screen reader on the next page.
import { showRimon } from './rimon-show.js';
export const OK_WORDS = Object.freeze(['Nice!', 'Yes!', "That's it!", 'Sharp!', 'Spot on!']);
export const NO_WORDS = Object.freeze(['Not quite. Keep going!', 'Almost. Try the next one!', 'Close! It will come back.']);
let n = 0, timer = 0, gone = 0, run = 0, watching = false;
/** Take the band out of the DOM (not merely hide it). Safe to call any time. */
export function removeAnswerBand(doc = globalThis.document, win = globalThis) {
  try {
    if (timer) win?.clearTimeout?.(timer); if (gone) win?.clearTimeout?.(gone); timer = 0; gone = 0;
    const band = doc?.getElementById?.('alef-answer-band');
    if (band) { band.replaceChildren?.(); band.remove?.(); }
  } catch { /* nothing to remove */ }
}
/** Pure: the combo word at a run of right answers in a row (3, 5, 10, then every 5), or null. Duolingo-style "in a row" moment. */
export function comboWord(count) { return count === 3 || count === 5 || (count >= 10 && count % 5 === 0) ? `${count} in a row!` : null; }
/** Current run of right answers (for tests). A wrong answer or a new page starts it again. */
export const answerRun = () => run;
export function resetAnswerRun() { run = 0; }
/** Pure: the band word for the nth answer. */
export function bandWord(ok, i = 0) { const list = ok ? OK_WORDS : NO_WORDS; return list[Math.abs(i) % list.length]; }
/** Show the band and Rimon's reaction. Returns true when the band was shown. Never throws. */
export function showAnswerBand(ok, { doc = globalThis.document, win = globalThis, settings = null, ms = 1300, words = true } = {}) {
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
    if (!watching) { watching = true; try { win.addEventListener?.('hashchange', () => { resetAnswerRun(); removeAnswerBand(doc, win); }); } catch { /* ignore */ } }
    run = ok ? run + 1 : 0;
    const combo = ok ? comboWord(run) : null;
    const word = words ? combo || bandWord(ok, n++) : '';
    band.replaceChildren();
    const ico = doc.createElement('b'); const s = doc.createElement('span'); s.textContent = ok ? '✓' : '✕'; ico.append(s);
    band.append(ico);
    if (word) { const txt = doc.createElement('span'); txt.textContent = word; band.append(txt); }
    band.className = `alef-answer-band ${ok ? 'is-ok' : 'is-no'}${combo ? ' is-combo' : ''}`;
    void band.offsetWidth;
    band.classList.add('is-on');
    if (timer) win.clearTimeout?.(timer);
    if (gone) { win.clearTimeout?.(gone); gone = 0; }
    // slide out, then leave the DOM (the slide-out transition is 0.18 s; see rimon.css)
    timer = win.setTimeout?.(() => { timer = 0; band.classList.remove('is-on'); gone = win.setTimeout?.(() => { gone = 0; if (!band.classList.contains?.('is-on')) { band.replaceChildren?.(); band.remove?.(); } }, 250) || 0; }, ms) || 0;
    showRimon(combo ? 'streak' : ok ? 'correct' : 'wrong', { doc, win, settings, ms: ms + 300 });
    return true;
  } catch { return false; }
}
