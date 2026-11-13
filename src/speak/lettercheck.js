// @ts-check
// "Check my letters": letter-by-letter feedback on one spoken line, on this device (the precise pronunciation pack).
// Loaded on demand. It shows which consonants to say again and what they sounded like. It does not judge vowels, and letters
// that sound the same are never marked. The Name is never checked and never played.
import { el, heText } from '../curriculum/dom.js';
import { checkLetters } from './ondevice.js';

export const LETTER_NOTE = 'Checked on this device; nothing you say leaves it. Consonants only: vowels are not checked, and letters that sound the same count as right. It can mishear, so use it as a pointer for what to say again.';
const ERR = {
  'no-speech': 'Nothing was heard. Try again a little closer to the microphone.',
  'not-allowed': 'The microphone was not allowed, so there is nothing to check.',
  'audio-capture': 'No microphone was found.',
  unsupported: 'This browser cannot record here.',
  'pack-missing': 'The precise pronunciation pack is not on this device. Get it on the Language Packs page.',
  'too-short': 'That was too short to check. Say the whole line.',
};
const WHY = { 'vowel-letter': 'carries a vowel', silent: 'silent or very soft', unpointed: 'not checked without vowel points', 'beside-name': 'not checked' };

/** The result as one line of letters, each marked, plus a plain list of what to say again. */
export function renderLetters(he, r) {
  if (!r.ok) return el('p', {}, ERR[r.error] || 'The check did not work just now. Try again.');
  const marks = new Map(r.letters.map((l) => [l.index, l]));
  const line = el('p', { class: 'alef-he lc-line', dir: 'rtl', lang: 'he', 'aria-hidden': 'true' });
  const text = String(he).normalize('NFC');
  let run = '', runStatus = '';
  const flush = () => { if (run) line.append(el('span', { 'data-letter': runStatus || 'plain' }, run)); run = ''; };
  for (let i = 0; i < text.length; i++) {
    const m = marks.get(i);
    if (m || !/[֑-ׇ]/.test(text[i])) { const st = m ? m.status : ''; if (st !== runStatus) { flush(); runStatus = st; } }
    run += text[i];
  }
  flush();
  const again = r.letters.filter((l) => l.status === 'check');
  const summary = r.checked ? `${r.right} of ${r.checked} checked letters sounded right.` : 'Nothing in this line could be checked.';
  return el('div', { class: 'alef-letter-check' }, el('p', {}, el('strong', {}, summary)), line,
    again.length ? el('ul', { 'aria-label': 'Letters to say again' }, again.map((l) => el('li', { 'data-status': 'check' }, heText(l.ch), l.heard ? el('span', {}, ' sounded more like ', heText(l.heard), '. Say it again.') : ' was not heard clearly. Say it again.')))
      : r.checked ? el('p', {}, 'No letter stood out. Well said.') : null,
    r.letters.some((l) => l.status === 'skip') ? el('p', { class: 'muted' }, 'Not checked: ', [...new Set(r.letters.filter((l) => l.status === 'skip').map((l) => `${l.ch} (${WHY[l.why] || 'not checked'})`))].join(', '), '.') : null,
    el('p', { class: 'muted' }, LETTER_NOTE));
}

/**
 * A button plus a result area for one Hebrew line. o: {tradition, check (test), id}
 * The microphone opens only after the tap.
 */
export function letterCheckControl(he, o = {}) {
  const out = el('div', { 'aria-live': 'polite' });
  let busy = false;
  const b = el('button', { type: 'button', class: 'btn secondary', 'data-letter-check': o.id || null }, 'Check my letters');
  b.addEventListener('click', async () => {
    if (busy) return;
    busy = true; b.setAttribute('disabled', ''); b.textContent = 'Listening... say it now';
    const r = await (o.check || checkLetters)(he, { tradition: o.tradition });
    busy = false; b.removeAttribute?.('disabled'); b.textContent = 'Check my letters again';
    out.replaceChildren(renderLetters(he, r));
  });
  return el('div', {}, b, out);
}
