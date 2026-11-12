// Lost and Found: every lost thing has a tag, "the phone + mine / his / hers / ours / yours". Read the ending of the tag
// and put the thing in its owner's box. You run the desk, Ari and Noa are colleagues, a visitor stands at the counter.
import { mountArcade, choiceRow } from './arcade.js';
import { loadG3, shuffle } from './g3-core.js';
import { begin, grade, numberKeys, binRow, heText } from './g3-ui.js';

export const STORE_KEY = 'games.g3-lostfound.v1';
const ROUNDS = 10;
/** Owners, from your point of view at the desk. */
export const OWNERS = Object.freeze([
  { person: '1sg', label: 'Your own box', sub: 'mine' },
  { person: '3msg', label: 'Ari\'s box', sub: 'his' },
  { person: '3fsg', label: 'Noa\'s box', sub: 'hers' },
  { person: '1pl', label: 'The team box', sub: 'ours' },
  { person: '2msg', label: 'The visitor (a man)', sub: 'yours' },
  { person: '2fsg', label: 'The visitor (a woman)', sub: 'yours' },
]);
/** Things a person could leave behind, by their base noun (from data/games/g3/article.json). */
export const THINGS = Object.freeze(['טֶלֶפוֹן', 'תַּפְרִיט', 'חֻלְצָה', 'מְעִיל', 'כּוֹס', 'כִּסֵּא', 'מַשְׁקֶה', 'גָּבִיעַ', 'זָהָב', 'חֶשְׁבּוֹן']);
export const lostThings = (pairs) => pairs.filter((p) => THINGS.includes(p.base.he) && !p.baseFlagged);
const spec = {
  id: 'g3-lostfound', title: 'Lost and Found', titleHe: 'אֲבֵדָה',
  blurb: 'Hebrew says "my phone" as "the phone of-me": the noun with "the", then shel with an ending. shelli is mine, shelo is his, shela is hers, shelanu is ours, and "yours" has one form for a man and one for a woman. You run the lost-and-found desk: read each tag and drop the thing in its owner\'s box.',
  howTo: ['A tag appears: a thing and an owner word. Press the owner\'s box, or keys 1 to 6.', 'Mine means you (you run the desk). His is Ari, hers is Noa, ours is the team box.', 'Level 3 adds a visitor at the counter: yours, said to a man or to a woman.', 'Level 5 turns it round: the box is shown, pick the tag that belongs in it.'],
  levels: [
    { name: 'Mine, his, hers', owners: 3, mode: 'box' },
    { name: 'Ours too', owners: 4, mode: 'box' },
    { name: 'A visitor at the desk', owners: 6, mode: 'box' },
    { name: 'Hebrew only', owners: 6, mode: 'box', hideEn: true },
    { name: 'Which tag goes in the box?', owners: 6, mode: 'tag' },
  ],
  par: () => ROUNDS * 10,
  seconds: () => 150,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const { T, big, prompt, area } = begin(A, 'noa', 'Read the end of the tag. That tells you whose it is.',
    'Things are "the …" forms from the lessons and the Torah text; the endings are copied from the word lists. Putting the two together is the game\'s own step: not reviewed by a teacher.');
  const cfg = A.cfg, rnd = A.rnd, owners = OWNERS.slice(0, cfg.owners);
  numberKeys(A, () => area.querySelector('.arc-choices'));
  let things = [], shel = null, n = 0;
  const tag = (thing, person) => `${thing.the} ${shel.forms[person].he}`;
  const next = () => { if (n >= ROUNDS) { T.end({ won: true }); return; } n += 1; cfg.mode === 'tag' ? askTag() : askBox(); };
  const askBox = () => {
    const thing = things[(n - 1) % things.length], who = owners[Math.floor(rnd() * owners.length)];
    big.replaceChildren(heText(A, tag(thing, who.person)));
    prompt.textContent = cfg.hideEn ? `Tag ${n} of ${ROUNDS}: whose box?` : `Tag ${n} of ${ROUNDS}: the ${thing.base.en}. Whose box?`;
    const tried = new Set();
    const row = binRow(A, owners.map((o) => ({ key: o.person, label: o.label, sub: o.sub })), (k) => {
      if (k === who.person) { grade(A, true, { right: `${shel.forms[k].he} means ${who.sub}: ${who.label}.`, points: tried.size ? 5 : 10 }); T.later(600, next); for (const b of row.querySelectorAll('button')) b.disabled = true; }
      else { tried.add(k); row.querySelector(`[data-key="${k}"]`).disabled = true; grade(A, false, { wrong: `${shel.forms[k].he} would be ${owners.find((o) => o.person === k).sub}. Look at the ending again.` }); }
    }, { label: 'Owners\' boxes' });
    area.replaceChildren(row);
  };
  const askTag = () => {
    const who = owners[Math.floor(rnd() * owners.length)], thing = things[(n - 1) % things.length];
    big.textContent = '';
    prompt.textContent = `${who.label} (${who.sub}): which tag goes in it? (${n} of ${ROUNDS})`;
    const others = shuffle(owners.filter((o) => o.person !== who.person), rnd).slice(0, 3);
    const opts = shuffle([who, ...others], rnd);
    area.replaceChildren(choiceRow(opts, (o) => tag(thing, o.person), (o) => {
      const ok = o.person === who.person;
      grade(A, ok, { right: `${tag(thing, o.person)}: ${who.sub}.`, wrong: `${shel.forms[o.person].he} means ${o.sub}.` });
      if (ok) T.later(600, next);
      return ok;
    }, { label: 'Tags' }));
  };
  Promise.all([loadG3(A.ctx, 'article'), loadG3(A.ctx, 'suffixes')]).then(([art, suf]) => {
    if (!T.live()) return;
    shel = suf.preps.find((p) => p.key === 'shel');
    things = shuffle(lostThings(art.pairs), rnd).slice(0, ROUNDS);
    next();
  }).catch(() => A.announce('The tags did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
