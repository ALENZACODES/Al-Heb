// Tiny DOM helpers + fallback cards.
/** @param {string} tag @param {Record<string,any>} [attrs] @param {...(Node|string|null|undefined)} kids */
export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (typeof v === 'boolean' && k.startsWith('aria-')) { e.setAttribute(k, String(v)); continue; } // aria-pressed={true} must be "true", not ""
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids) if (k != null) e.append(k);
  return e;
}
/** Hebrew text span: always lang=he dir=rtl. @param {string} text @param {string} [cls] */
export function heSpan(text, cls = 'he') { return h('span', { lang: 'he', dir: 'rtl', class: cls }, text); }

/** Card shown when a lane module is missing or throws. */
export function unavailableCard(root, { title, t, module, error, kind = 'unavailable' }) {
  const k = kind === 'error' || kind === 'offline' ? kind : 'unavailable'; // 'offline': the screen's files are not on this device yet
  const body = t(`${k}.body`);
  root.replaceChildren(h('section', { class: 'card alef-unavailable', 'aria-labelledby': 'view-title' },
    h('h1', { id: 'view-title', tabindex: '-1' }, `${title}: ${t(`${k}.title`)}`),
    h('p', {}, body),
    h('p', {}, h('a', { class: 'btn', href: '#/' }, t('nav.home'))),
    h('details', {}, h('summary', {}, 'Technical detail'),
      h('p', { class: 'mono' }, `module: ${module}`), error ? h('p', { class: 'mono' }, String(error)) : null)));
}

export { audioAccess, audioButton, deviceVoiceState, DEVICE_LABEL, NO_AUDIO } from './audio-access.js';

// Gold coin icons, lazy (assets/img/ is never precached); decorative. coin(): blank coin, the letter is live text.
export const medal = (g, id, z = 48, b = `assets/img/icons/ICON_${g}_${id}`) => h('img', { class: 'alef-medal', src: b + '.112.webp', srcset: [112, 160, 224, 320].map((w) => `${b}.${w}.webp ${w}w`).join(), sizes: z + 'px', width: z, height: z, alt: '', loading: 'lazy', decoding: 'async', onerror: (e) => e.target.remove() });
export const coin = (t, z = 56) => h('span', { class: 'alef-coin' + (t.replace(/[\u0591-\u05C7]/g, '').length > 2 ? ' is-long' : ''), style: `--z:${z}px`, 'aria-hidden': 'true' }, heSpan(t));

/** First Hebrew letter of a string, points and cantillation removed, or null. Lesson stops draw it as live text on the blank coin. */
export const firstHebrewLetter = (s) => (String(s || '').normalize('NFC').replace(/[\u0591-\u05C7]/g, '').match(/[\u05D0-\u05EA]/) || [null])[0];

/** Route or feature name -> [group, id] for medal(). Unknown names return null (no broken image). */
export const MEDAL_FOR = Object.freeze({
  letters: ['home', 'letters'], vocab: ['home', 'vocab'], read: ['home', 'read'], progress: ['home', 'progress'],
  calendar: ['home', 'calendar'], sounds: ['home', 'sounds'], scan: ['home', 'scan'], workbook: ['home', 'workbook'],
  ask: ['home', 'ask'], talk: ['home', 'talk'], camera: ['home', 'camera'], light: ['home', 'light'],
  games: ['home', 'games'], books: ['home', 'books'], lab: ['home', 'lab'], learn: ['home', 'learn'],
  speak: ['home', 'speak'], firstday: ['home', 'firstday'], morning: ['home', 'firstday'],
  wordfinder: ['home', 'vocab'],
  tugowar: ['word', 'tugowar'], vowelcatcher: ['word', 'vowelcatcher'], pinball: ['word', 'pinball'],
  prefixblast: ['word', 'prefixblast'], memorypalace: ['word', 'memorypalace'],
  archbuilder: ['word', 'archbuilder'], barter: ['word', 'barter'], bumperverbs: ['word', 'bumperverbs'],
  ciphergrid: ['word', 'ciphergrid'], karaokebeat: ['word', 'karaokebeat'], lasermaze: ['word', 'lasermaze'],
  letterbridge: ['word', 'letterbridge'], museumcurator: ['word', 'museumcurator'], petclinic: ['word', 'petclinic'],
  rentalagent: ['word', 'rentalagent'], rhymelab: ['word', 'rhymelab'], roottree: ['word', 'roottree'],
  shabbatrush: ['word', 'shabbatrush'], shadowcraft: ['word', 'shadowcraft'], shuktaxi: ['word', 'shuktaxi'],
  submarinesonar: ['word', 'submarinesonar'], trainswitch: ['word', 'trainswitch'], typewriter: ['word', 'typewriter'],
  weatherstudio: ['word', 'weatherstudio'],
  sprint: ['home', 'sprint'], traditions: ['home', 'traditions'], 'traditions-guide': ['home', 'traditions'], 'traditions-hear': ['home', 'traditions'],
  'tradition-quiz': ['home', 'traditions'], compare: ['home', 'traditions'], 'read-my-way': ['home', 'traditions'],
  morning: ['home', 'morning'], torahreader: ['home', 'torahreader'], torahread: ['home', 'torahreader'], service: ['home', 'read'],
  'listen-shelf': ['home', 'listen'], listen: ['home', 'listen'], songs: ['home', 'listen'],
  settings: ['home', 'settings'], help: ['home', 'help'], how: ['home', 'help'], about: ['home', 'help'], accessibility: ['home', 'help'],
  library: ['home', 'books'], festivals: ['home', 'calendar'], atlas: ['home', 'letters'], search: ['home', 'scan'],
  awards: ['home', 'progress'], daily: ['home', 'progress'], firstwin: ['home', 'firstday'],
});
/** Games shown by their own scene picture in lists (owner, 2026-11-10: game pictures over gold icons). assets/img/game-thumbs/<id>.160.webp. */
export const GAME_PICS = new Set(('alefbetrun archbuilder barter bingoletters bubbleword bumperverbs ciphergrid fallingletters finalfive flapvowel gendersplit karaokebeat lasermaze letterbridge '
  + 'letterchomp lettercrush letterdrop lettersudoku lettertwins lookalikes meltdown memorypalace minicross mitzvot613 museumcurator noahseven petclinic pinball pluralpop prefixblast quizladder '
  + 'rentalagent rhymelab roottree scramble sentencetrain shabbatrush shadowcraft shuktaxi soundsnap speedtype submarinesonar syllablesnake tenwords trainswitch trueornot tugowar typewriter '
  + 'vowelcatcher vowelstack weatherstudio wordbuilder wordfinder wordmaze wordsearch').split(' '));
/** Icon for a destination in a list: a game's own scene (round, the same size as a coin), else its gold coin, else the coin of
 *  `section` (learn, read, speak, progress or more) so no entry is left without one. Lazy; a missing scene falls back to the coin. */
export function destIcon(name, z = 48, section = null) {
  const coinFor = () => medalFor(name, z) || (section ? medal('home', ['learn', 'read', 'speak', 'progress'].includes(section) ? section : 'more', z) : null);
  if (!GAME_PICS.has(name)) return coinFor();
  return h('img', { class: 'alef-medal alef-game-pic', src: `assets/img/game-thumbs/${name}.160.webp`, width: z, height: z, alt: '', loading: 'lazy', decoding: 'async',
    onerror: (e) => { const c = coinFor(); if (c) e.target.replaceWith(c); else e.target.remove(); } });
}

/** Decorative gold coin for a route name, or null if we have no emblem yet. */
export function medalFor(name, z = 48) {
  const pair = MEDAL_FOR[name];
  return pair ? medal(pair[0], pair[1], z) : null;
}

