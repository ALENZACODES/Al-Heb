// Pack Check: Rimon asks "is there … to you?", which is how Hebrew says "do you have …?". Look at the pack and answer
// "yes, there is to me" or "no, there is not to me". Later Rimon asks you about Ari's and Noa's packs: to him, to her.
import { mountArcade, choiceRow } from './arcade.js';
import { loadG3, shuffle } from './g3-core.js';
import { begin, grade, numberKeys, heText } from './g3-ui.js';

export const STORE_KEY = 'games.g3-packcheck.v1';
const ROUNDS = 8;
/** Who is asked and whose pack it is: ask = the ending in the question, say = the ending in the answer. */
export const ROLES = Object.freeze({
  ari: { owner: 'Ari', ask: '2msg', say: '1sg', line: 'Rimon asks Ari. Answer for Ari.' },
  noa: { owner: 'Noa', ask: '2fsg', say: '1sg', line: 'Rimon asks Noa. Answer for Noa.' },
  him: { owner: 'Ari', ask: '3msg', say: '3msg', line: 'Rimon asks you about Ari\'s pack.' },
  her: { owner: 'Noa', ask: '3fsg', say: '3fsg', line: 'Rimon asks you about Noa\'s pack.' },
});
/** The question and the two true answers, built from copied words (the game's own step: owner review). */
export function packLines(b, le, noun, role) {
  const r = ROLES[role];
  return {
    q: `${b.yesh} ${le.forms[r.ask].he} ${noun.he}?`,
    yes: `${b.ken}, ${b.yesh} ${le.forms[r.say].he}.`,
    no: `${b.lo}, ${b.ein} ${le.forms[r.say].he}.`,
    wrongYes: `${b.ken}, ${b.yesh} ${le.forms[r.ask === r.say ? '1sg' : r.ask].he}.`,
    wrongNo: `${b.lo}, ${b.ein} ${le.forms[r.ask === r.say ? '1sg' : r.ask].he}.`,
  };
}
/** Things that fit in a pack (nouns from data/games/g3/nouns.json). */
export const PACKABLE = Object.freeze(['תִּיק', 'בַּקְבּוּק', 'כּוֹבַע', 'מְעִיל', 'טֶלֶפוֹן', 'כַּרְטִיס', 'עִתּוֹן', 'תְּרוּפָה', 'כּוֹס', 'סַכִּין', 'חֻלְצָה', 'מַתָּנָה', 'תְּמוּנָה', 'טַבַּעַת', 'יַיִן', 'סַל', 'רִמּוֹן', 'זַיִת', 'נֵר', 'פְּרִי', 'רְשִׁימָה', 'דּוֹלָר', 'מַשְׁקֶה']);
const spec = {
  id: 'g3-packcheck', title: 'Pack Check', titleHe: 'תִּיק',
  blurb: 'Hebrew has no verb "to have". It says "there is to me" (yesh li) for "I have" and "there is not to me" (ein li) for "I don\'t have". The "to" word takes the person as an ending: li to me, lecha to you (a man), lach to you (a woman), lo to him, la to her. Check the pack and answer.',
  howTo: ['Read the pack, then the question. Pick the true answer; keys 1 to 4.', 'Levels 1 and 2: Rimon asks Ari or Noa; answer as them ("to me").', 'Levels 3 and 4: Rimon asks you about Ari or Noa ("to him", "to her"). The pack hides once the questions start.', 'Level 5 mixes them all.'],
  levels: [
    { name: 'Ari\'s pack', roles: ['ari'], hide: false },
    { name: 'Noa\'s pack', roles: ['noa'], hide: false },
    { name: 'About Ari', roles: ['him'], hide: true },
    { name: 'About Noa', roles: ['her'], hide: true },
    { name: 'Everyone\'s packs', roles: ['ari', 'noa', 'him', 'her'], hide: true },
  ],
  par: () => ROUNDS * 10,
  seconds: () => 150,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const { T, big, prompt, area } = begin(A, 'rimon', 'Is there … to you? That is "do you have?"',
    'Words copied from the word list; the questions and answers are put together by the game from them, following the lessons\' "yesh li" lines. Not reviewed by a teacher.');
  const cfg = A.cfg, rnd = A.rnd;
  const answers = A.h('div');
  numberKeys(A, () => answers.querySelector('.arc-choices'));
  let b = {}, le = null, nouns = [], pack = [], role = cfg.roles[0], n = 0;
  const packList = A.h('ul', { class: 'g3-pack', 'aria-label': 'The pack' });
  const showPack = (on) => packList.replaceChildren(...(on ? pack.map((x) => A.h('li', {}, heText(A, x.he), ' ', A.h('small', {}, x.en))) : [A.h('li', {}, 'The pack is closed. Answer from memory.')]));
  const newPack = () => {
    role = cfg.roles[Math.floor(rnd() * cfg.roles.length)];
    pack = shuffle(nouns, rnd).slice(0, 5);
    showPack(true);
    prompt.textContent = `${ROLES[role].owner}'s pack. ${ROLES[role].line}`;
  };
  const next = () => {
    if (n >= ROUNDS) { T.end({ won: true }); return; }
    n += 1;
    if (n === 1 || n === 5) { newPack(); if (cfg.hide) { big.textContent = ''; answers.replaceChildren(A.h('button', { type: 'button', class: 'btn', onclick: () => { showPack(false); ask(); } }, 'I have looked: close the pack')); return; } }
    ask();
  };
  const ask = () => {
    const has = rnd() < 0.5, noun = has ? pack[Math.floor(rnd() * pack.length)] : shuffle(nouns.filter((x) => !pack.includes(x)), rnd)[0];
    const L = packLines(b, le, noun, role);
    big.replaceChildren(heText(A, L.q));
    prompt.textContent = `${ROLES[role].line} (${n} of ${ROUNDS}) The question is about ${noun.en}.`;
    const opts = shuffle([{ he: L.yes, ok: has }, { he: L.no, ok: !has }, { he: L.wrongYes, ok: false, who: true }, { he: L.wrongNo, ok: false, who: true }], rnd);
    answers.replaceChildren(choiceRow(opts, (o) => o.he, (o) => {
      grade(A, o.ok, { right: has ? `Yes: the ${noun.en} is in ${ROLES[role].owner}'s pack.` : `Right: no ${noun.en} in the pack.`, wrong: o.who ? 'Check the ending: who has it?' : (has ? `The ${noun.en} is in the pack.` : `There is no ${noun.en} in the pack.`) });
      if (o.ok) T.later(700, next);
      return o.ok;
    }, { label: 'Answers' }));
  };
  Promise.all([loadG3(A.ctx, 'basics'), loadG3(A.ctx, 'suffixes'), loadG3(A.ctx, 'nouns')]).then(([bs, suf, nn]) => {
    if (!T.live()) return;
    for (const w of bs.words) b[w.key] = w.he;
    le = suf.preps.find((p) => p.key === 'le');
    nouns = nn.nouns.filter((x) => PACKABLE.includes(x.he));
    big.textContent = ''; area.replaceChildren(packList, answers);
    next();
  }).catch(() => A.announce('The pack did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
