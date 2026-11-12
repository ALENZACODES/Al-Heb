// Who Said It? A short line quoted exactly from a verse of the Torah. Who says it: Sarah, Moses, Pharaoh, Esau?
import { uiEnglish } from '../shell/names.js';
import { mountArcade, choiceRow } from './arcade.js';
import { loadData, loadVerse, excerpt, showName, refText, options, shuffle } from './tg-core.js';
import { host, track, numberKeys, grade, draftNote, ensureStyle } from './tg-ui.js';

export const STORE_KEY = 'games.tg-whosaid.v1';
const ROUNDS = 10;

const spec = {
  id: 'tg-whosaid', title: 'Who Said It?', titleHe: 'מִי אָמַר?',
  blurb: 'Famous lines from the Torah, word for word. Some are questions, some are cries, one is a blessing from a man sent to curse. Pick who says each one. The whole verse in English appears after every answer.',
  howTo: ['Read the line, then pick the speaker. Press 1 to 6 or tap.', 'Levels 1 and 2: the English is shown, with two or three names.', 'Level 3: four names, English after you answer.', 'Level 4: Hebrew names only. Level 5: six names, quick.'],
  levels: [
    { name: 'Two names, English shown', choices: 2, english: true, names: 'en' },
    { name: 'Three names, English shown', choices: 3, english: true, names: 'en' },
    { name: 'Four names', choices: 4, english: false, names: 'en' },
    { name: 'Hebrew names only', choices: 4, english: false, names: 'he' },
    { name: 'Six names, quick', choices: 6, english: false, names: 'both' },
  ],
  par: () => ROUNDS * 10,
  seconds: (l) => (l === 5 ? 100 : 150),
  needsWords: false, needsLetters: false,
};

/** The speaker's Hebrew name is the word the data points to in its verse (the verse's own spelling); tests check the copy. */
export const speakerHe = (verse, sp) => verse.he.trim().split(/\s+/)[sp.word];

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd, ctx = A.ctx;
  const quote = A.h('div', { class: 'tg-verse', lang: 'he', dir: 'rtl' });
  const prompt = A.h('p', { class: 'arc-prompt' });
  const area = A.h('div');
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'ari', 'Who said that?'), prompt, quote, area, after,
    draftNote(A, 'Lines from the Torah text in this app (Leningrad Codex); the English after each answer is the JPS 1917 translation. The divine name is shown as ה׳.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  let data = null, names = new Map(), deck = [], n = 0;
  const label = (sp) => (cfg.names === 'he' ? names.get(sp.id) : cfg.names === 'both' ? `${names.get(sp.id)} · ${sp.en}` : sp.en);
  const next = async () => {
    if (n >= ROUNDS || !deck.length) { T.end({ won: true }); return; }
    const q = deck[n % deck.length]; n += 1;
    const verse = await loadVerse(ctx, q.ref);
    if (!T.live()) return;
    const who = data.speakers.find((s) => s.id === q.who);
    quote.textContent = showName(excerpt(verse.he, q.from, q.to));
    prompt.textContent = `Line ${n} of ${ROUNDS}.` + (cfg.english ? ` "${q.en}"` : '');
    after.textContent = '';
    area.replaceChildren(choiceRow(options(who, data.speakers, cfg.choices, rnd, (s) => s.id), (s) => (cfg.names === 'en' ? A.h('span', { lang: 'en', dir: 'ltr' }, s.en) : label(s)), (s) => {
      const ok = s.id === who.id;
      grade(A, ok, { right: `${who.en} (${names.get(who.id)}), ${refText(q.ref)}.`, wrong: `Not ${s.en}.` });
      if (ok) { after.textContent = `${refText(q.ref)}: ${uiEnglish(ctx, showName(verse.en))}`; T.later(1600, () => { next().catch(fail); }); }
      return ok;
    }, { label: 'Speakers' }));
  };
  const fail = () => A.announce('The verses did not load. Check the connection and press Start again.');
  loadData(ctx, 'data/games/tg/whosaid.json').then(async (d) => {
    if (!T.live()) return;
    data = d;
    d.speakers.forEach((s) => names.set(s.id, s.he));
    deck = shuffle(d.quotes, rnd);
    return next();
  }).catch(fail);
}

export const mount = mountArcade(spec, setup);
