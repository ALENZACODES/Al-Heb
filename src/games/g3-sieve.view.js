// Letter Sieve: a verb form goes through the sieve one letter at a time, right to left. Keep the three family letters the
// verb is listed under; let the pattern letters fall through (the l- of "to …", the y- of "he will", the m- of the
// present, the h- and t- of the patterns). The app's family letters are not yet confirmed as roots, so the game says letters.
import { mountArcade } from './arcade.js';
import { loadG3, shuffle, sieveItems, gloss } from './g3-core.js';
import { letterClusters } from './tg-core.js';
import { begin, grade, roundKeys, binRow } from './g3-ui.js';

export const STORE_KEY = 'games.g3-sieve.v1';
const ROUNDS = 6;
const spec = {
  id: 'g3-sieve', title: 'Letter Sieve', titleHe: 'נָפָה',
  blurb: 'Under every verb form sit three family letters. The pattern adds its own: lamed at the front of "to …", yod at the front of "he will", mem at the front of most present forms, he and tav in some patterns. Shake each form through the sieve: keep the family letters, let the pattern letters fall.',
  howTo: ['The outlined letter is in the sieve. Press "Keep" (key 1) for a family letter or "Let it fall" (key 2) for a pattern letter.', 'The three family letters are shown once the word is done.', 'Levels go from the dictionary form to the present, the "to …" form and the future; level 5 mixes them.'],
  levels: [
    { name: 'Dictionary forms', keys: ['past'], binyan: ["pa'al"] },
    { name: 'The present', keys: ['present'] },
    { name: 'The "to …" form', keys: ['infinitive'] },
    { name: 'The future', keys: ['future'], binyan: ["hif'il", "hitpa'el", "pi'el"] },
    { name: 'Every form', keys: ['past', 'present', 'future', 'infinitive'] },
  ],
  par: (l, cfg) => ROUNDS * 4 * 5,
  seconds: () => 180,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const { T, big, prompt, area } = begin(A, 'noa', 'Keep the family, drop the pattern.',
    'Verbs and their listed letters come from the app\'s verb list (dictionary source); forms where the letters could be found in more than one way are left out. Not reviewed by a teacher.');
  const cfg = A.cfg, rnd = A.rnd;
  let deck = [], n = 0, item = null, at = 0, clusters = [], marks = [];
  const row = binRow(A, [{ key: 'keep', label: 'Keep', sub: 'a family letter' }, { key: 'drop', label: 'Let it fall', sub: 'a pattern letter' }], (k) => judge(k === 'keep'), { label: 'Sieve' });
  area.replaceChildren(row);
  const draw = () => {
    big.replaceChildren(A.h('div', { class: 'g3-line', dir: 'rtl', lang: 'he' }, ...clusters.map((c, i) => A.h('span', { class: 'g3-word g3-static' + (i === at ? ' is-picked' : ''), 'aria-current': i === at ? 'true' : null }, c.text, marks[i] ? A.h('small', {}, marks[i] === 'keep' ? ' ✓' : ' ↓') : null))));
    if (clusters[at]) prompt.textContent = `Word ${n} of ${ROUNDS}: letter ${at + 1} of ${clusters.length}, ${clusters[at].base}. Keep it or let it fall?`;
  };
  const next = () => {
    if (n >= ROUNDS || !deck.length) { T.end({ won: true }); return; }
    item = deck[n]; n += 1; at = 0; clusters = letterClusters(item.he); marks = [];
    for (const b of row.querySelectorAll('button')) b.disabled = false;
    draw();
  };
  const judge = (keep) => {
    if (!item || !T.live() || at >= clusters.length) return;
    const isFamily = item.pos.includes(at);
    const ok = keep === isFamily;
    grade(A, ok, { right: isFamily ? `${clusters[at].base} is a family letter.` : `${clusters[at].base} belongs to the pattern.`, wrong: isFamily ? `${clusters[at].base} is one of the family letters.` : `${clusters[at].base} is a pattern letter here.`, points: 4 });
    marks[at] = isFamily ? 'keep' : 'drop'; at += 1;
    if (at >= clusters.length) {
      for (const b of row.querySelectorAll('button')) b.disabled = true;
      A.announce(`${item.he} (${gloss(item.verb.en)}): family letters ${item.letters.join(' ')}.`);
      draw(); T.later(1000, next);
    } else draw();
  };
  roundKeys(A, (k) => { if (k === '1') { judge(true); return true; } if (k === '2') { judge(false); return true; } return false; });
  loadG3(A.ctx, 'verbs').then((d) => {
    if (!T.live()) return;
    const verbs = d.verbs.filter((v) => !cfg.binyan || cfg.binyan.includes(v.binyan));
    const items = sieveItems(verbs, cfg.keys);
    const seen = new Set();
    deck = shuffle(items, rnd).filter((x) => (seen.has(x.verb.id) ? false : seen.add(x.verb.id))).slice(0, ROUNDS);
    next();
  }).catch(() => A.announce('The verbs did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
