// M-08 (12 Nov audit, lane 1): "Held Recordings" on About. Loaded on demand (not in the first install) with its list,
// data/audio/held-recordings.json, which tools/audio/build-held-list.mjs builds from data/lab/clip-holds.json, the chirpHeld rows
// of the audio manifests and the held book pages. The wording is the players' own: the same "held for review" lines a learner
// meets where a held clip would play (src/shell/audio-access.js, src/books/book.view.js).
import { HELD_DEVICE, HELD_NONE } from './audio-access.js';
import { HELD_PAGE } from '../books/book.view.js';

export const HELD_URL = 'data/audio/held-recordings.json';
export const HELD_INTRO = 'Some recordings are held for review: checks that listen for the words found mistakes in them, and no person has listened to them yet. Nothing is deleted. This list says what is held, why, and what you hear instead.';
export const HELD_WHY = 'Why: each failed at least 2 of 3 independent checks of the words it says.';
export const HELD_INSTEAD = `What plays instead: where one of these would play, the screen says "${HELD_DEVICE}." If your device has no Hebrew voice it says "${HELD_NONE}." Brain Lab shows the written sound instead.`;
export const NEWER_WHY = 'A newer recording was made for each of these prayer lines and did not pass the same checks, so the earlier recording still plays. None of them goes silent.';

const and = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const KIND_TITLE = { syllable: 'Syllables', word: 'Words', phrase: 'Phrases' };

/** The section's content for a list (pure apart from the element factory `h`). */
export function heldNodes(h, list) {
  const held = list?.held || [], newer = list?.newerHeld || [], books = list?.bookPages || [];
  const out = [h('p', {}, HELD_INTRO)];
  out.push(h('h3', {}, `Held for review: ${plural(held.length, 'recording')}`), h('p', {}, HELD_WHY), h('p', {}, HELD_INSTEAD));
  const kinds = [...new Set(held.map((x) => x.kind))];
  for (const k of kinds) {
    const items = held.filter((x) => x.kind === k);
    out.push(h('details', { class: 'held-group', 'data-held-kind': k },
      h('summary', {}, `${KIND_TITLE[k] || k} (${items.length})`),
      h('ul', {}, ...items.map((x) => h('li', { 'data-held-path': x.path },
        x.he ? h('span', { lang: 'he', dir: 'rtl', class: 'he' }, x.he) : null, x.he ? ' ' : null, x.en ? `${x.en}, ` : '', `${x.voiceName}'s voice`)))));
  }
  if (newer.length) {
    out.push(h('h3', {}, `Newer takes held back: ${plural(list.counts?.newerHeld ?? newer.length, 'prayer recording')}`), h('p', {}, NEWER_WHY),
      h('details', { class: 'held-group', 'data-held-kind': 'newer' }, h('summary', {}, `The prayers (${newer.length})`),
        h('ul', {}, ...newer.map((x) => h('li', { 'data-held-id': x.id }, `${x.title}, ${x.part}: ${and(x.voices)}`)))));
  }
  if (books.length) {
    out.push(h('h3', {}, `Book pages held for review: ${plural(books.reduce((n, b) => n + b.pages.length, 0), 'page')}`),
      h('ul', {}, ...books.map((b) => h('li', { 'data-held-book': b.id }, `${b.title}: ${b.pages.length === 1 ? 'page' : 'pages'} ${and(b.pages.map(String))}.`))),
      h('p', {}, `Those pages show this line instead of a Listen button: "${HELD_PAGE}"`));
  }
  return out;
}

/** Fill the About section (its heading stays); a failed load says so in words. */
export async function fillHeld(section, h, { fetchFn = globalThis.fetch } = {}) {
  const heading = section.querySelector?.('h2');
  try {
    const r = await fetchFn(new URL('../../' + HELD_URL, import.meta.url));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const list = await r.json();
    section.replaceChildren(...[heading, ...heldNodes(h, list)].filter(Boolean));
  } catch {
    section.replaceChildren(...[heading, h('p', { role: 'status' }, 'The list of held recordings did not load. Open About again while online to see it.')].filter(Boolean));
  }
}
