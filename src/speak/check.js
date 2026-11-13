// A small "Check what I said" control for speaking lines outside the Say it page (the practical units' speaking cards).
// Uses the browser's own speech recognizer (he-IL) and src/speak/score.js; no server, nothing uploaded by Aleph.
// Where the browser has no recognizer it says so and shows no button and no score.
// Loaded on demand (dynamic import) by the screens that use it.
import { el, heText } from '../curriculum/dom.js';
import { capabilities } from './model.js';
import { createListener, DEVICE_NOTE, pronReady } from './recognizer.js';
import { scoreSpeech, scoreLine, scoringStatus, STATUS_TEXT } from './score.js';

export const CHECK_NOTE = 'The check uses your browser\'s speech recognizer set to Hebrew; your browser may send the audio to its maker to do this. The score counts words recognized; it does not measure your accent or vowels.';
export const CHECK_NOTE_DEVICE = `${DEVICE_NOTE} The score counts words recognized; it does not measure your accent or vowels.`;
const ERR = {
  'pack-failed': 'The listening pack could not run just now, so there is no score.',
  unsupported: 'This browser cannot listen here, so there is no score.',
  'audio-capture': 'No microphone was found, so there is no score.',
  'not-allowed': 'The microphone was not allowed, so there is no score.',
  'service-not-allowed': 'The browser\'s recognizer is not allowed here, so there is no score.',
  'language-not-supported': 'This browser\'s recognizer does not offer Hebrew, so there is no score.',
  network: 'The browser\'s recognizer needs a connection, so there is no score.',
  'no-speech': 'Nothing was heard. Try again a little closer to the microphone.',
  timeout: 'The recognizer gave no answer in time.',
};

/** One plain line for a section: scoring on, or why not. */
export function checkIntro(caps = capabilities()) {
  const st = scoringStatus(caps);
  if (st.scored && caps.onDevice) return CHECK_NOTE_DEVICE;
  return st.scored ? CHECK_NOTE : 'No score in this browser: it has no speech recognition (Firefox, for example, does not offer it). Say each line aloud and compare it with the recording yourself.';
}

/**
 * A button plus a result area for one Hebrew line, or null when the browser cannot score.
 * o: {caps, Ctor (test), setTimeout/clearTimeout (test), id}
 */
export function checkControl(he, o = {}) {
  const caps = o.caps || capabilities();
  if (!scoringStatus(caps).scored) return null;
  const rec = createListener({ Ctor: o.Ctor, setTimeout: o.setTimeout, clearTimeout: o.clearTimeout, pack: o.listenPack, loadDevice: o.loadDevice });
  const out = el('div', { class: 'alef-speak-check', 'aria-live': 'polite' });
  const b = el('button', { type: 'button', class: 'btn secondary', 'data-check': o.id || null }, 'Check what I said');
  b.addEventListener('click', async () => {
    if (rec.listening) return;
    b.setAttribute('disabled', ''); b.textContent = 'Listening... say it now';
    const r = await rec.listen();
    b.removeAttribute?.('disabled'); b.textContent = 'Check again';
    if (!r.ok) { out.replaceChildren(el('p', {}, ERR[r.error] || 'The recognizer stopped. Try again.')); return; }
    const c = scoreSpeech(he, r.alternatives);
    out.replaceChildren(
      el('p', {}, el('strong', {}, scoreLine(c))),
      el('ul', { 'aria-label': 'Word by word' }, c.words.map((w) => el('li', { 'data-status': w.status }, heText(w.word), ` - ${STATUS_TEXT[w.status]}`))),
      el('p', { class: 'muted' }, r.engine === 'device' ? 'Heard on this device: ' : 'The recognizer wrote: ', heText(c.heard)));
  });
  return el('div', {}, b, out, lettersSlot(he, o));
}

/**
 * "Check my letters" for one line, when the precise pronunciation pack is on this device; otherwise nothing.
 * The control's code is fetched only then. o: {tradition, id, pron (test: true/false), loadLetters (test)}
 */
export function lettersSlot(he, o = {}) {
  if (!(o.pron !== undefined ? o.pron : pronReady())) return null;
  const slot = el('div', { class: 'alef-letter-slot' });
  (o.loadLetters || (() => import('./lettercheck.js')))().then((m) => slot.replaceChildren(m.letterCheckControl(he, { tradition: o.tradition, id: o.id, check: o.checkLetters }))).catch(() => { /* optional */ });
  return slot;
}
