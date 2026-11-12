// Right Tone: a whole day out, encounter by encounter (café, bus, market, a friend's father). Three replies are all
// "correct Hebrew", but one is natural, one is stiff and one is wrong for the moment. Keep people smiling. From level 4
// you also say it in your own form, as Ari or as Noa. Encounters are read straight from data/israel/scenarios.json.
import { mountArcade } from './arcade.js';
import { loadIsrael, sample, shuffle, stripPoints } from './g4-core.js';
import { begin, withBank, host, heText, enText, grade, draftNote, buttons, numberKeys } from './g4-ui.js';

export const STORE_KEY = 'games.g4-tone.v1';

/** The replies to offer for one scenario as one speaker ('m' or 'f'): each { role, he, translit, en, explain, wrongForm? }. */
export function replies(sc, g, { genderTrap = false } = {}) {
  const out = sc.options.map((o) => ({ role: o.role, he: o.forms?.[g]?.he || o.he, translit: o.forms?.[g]?.translit || o.translit, en: o.en, explain: o.explain }));
  if (genderTrap) {
    const o = sc.options.find((x) => x.forms && x.role !== 'off');
    const other = g === 'm' ? 'f' : 'm';
    if (o && o.forms[other].he !== o.forms[g].he) out.push({ role: 'form', he: o.forms[other].he, translit: o.forms[other].translit, en: o.en, explain: `That is the form for ${other === 'm' ? 'a man' : 'a woman'}.`, wrongForm: true });
  }
  return out;
}
export const MOOD = Object.freeze({ natural: 'They smile: that sounded natural.', stiff: 'They understand, but it sounded like a textbook.', off: 'They look taken aback: wrong tone for the moment.', form: 'They blink: wrong form for you.' });

const spec = {
  id: 'g4-tone', title: 'Right Tone', titleHe: 'בְּבַקָּשָׁה',
  blurb: 'Israeli Hebrew is direct but warm. A reply can be grammatical and still sound stiff, or friendly and still too pushy. Go through a day of small encounters and pick the reply that sounds natural. Four slips and the day is over.',
  howTo: ['Read the moment and what the other person says, then pick your reply (keys 1 to 4).', 'Natural replies score most; stiff ones a little; the wrong tone costs a heart.', 'Levels 1 and 2 show the English or how it sounds; levels 3 to 5 are Hebrew only.', 'From level 4 one reply is in the form for the other gender: you are Ari or Noa, so say it your way.'],
  levels: [
    { name: 'A short day, with English', count: 6, en: true },
    { name: 'How it sounds', count: 8, tr: true },
    { name: 'Hebrew only', count: 8 },
    { name: 'Your own form', count: 10, trap: true },
    { name: 'A long day, bare text', count: 12, trap: true, plain: true },
  ],
  par: (l) => spec.levels[l - 1].count * 10,
  seconds: (l) => 40 + spec.levels[l - 1].count * 25,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const T = begin(A), cfg = A.cfg, rnd = A.rnd;
  const scene = A.h('div', { class: 'g4-scene' }), area = A.h('div'), after = A.h('p', { 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'noa', 'A whole day out. Sound like a local!'), scene, area, after, draftNote(A, 'Encounters from the app\'s Israel scenarios. Tone labels are general impressions, not yet checked by a native speaker.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  withBank(A, T, (_B, data) => {
    A.setLives(4);
    const day = sample(data.scenarios, Math.min(cfg.count, data.scenarios.length), rnd);
    const txt = (s) => (cfg.plain ? stripPoints(s) : s);
    let n = 0;
    const next = () => {
      if (n >= day.length) { T.end({ won: true }); return; }
      const sc = day[n]; n += 1;
      const g = n % 2 ? 'm' : 'f', me = g === 'm' ? 'Ari' : 'Noa';
      after.textContent = '';
      scene.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Encounter ${n} of ${day.length} · ${sc.title} · you are ${me}`), A.h('p', {}, sc.situation),
        A.h('p', {}, 'They say: ', heText(A, txt(sc.other.he)), cfg.en || cfg.tr ? A.h('small', { class: 'g4-en', lang: 'en' }, ` ${cfg.en ? sc.other.en : sc.other.translit}`) : null));
      const opts = shuffle(replies(sc, g, { genderTrap: !!cfg.trap }), rnd);
      area.replaceChildren(buttons(A, opts, (o) => A.h('span', { class: 'g4-item' }, heText(A, txt(o.he)), cfg.en ? A.h('small', { class: 'g4-en', lang: 'en' }, o.en) : cfg.tr ? A.h('small', { class: 'g4-tr', lang: 'en' }, o.translit) : null), (o, b) => {
        const nat = opts.find((x) => x.role === 'natural');
        if (o.role === 'natural') grade(A, true, { right: MOOD.natural });
        else if (o.role === 'stiff') { A.addScore(4); A.sfx('confirm'); A.announce(MOOD.stiff); }
        else { grade(A, false, { wrong: MOOD[o.role] }); if (!T.live()) return false; }
        after.replaceChildren(A.h('strong', {}, o.role === 'natural' ? 'Natural. ' : o.role === 'stiff' ? 'Stiff. ' : 'Not this. '), enText(A, o.explain || ''),
          o.role !== 'natural' ? A.h('span', {}, ' A local would say: ', heText(A, txt(nat.he)), ` (${nat.en})`) : null);
        for (const x of area.querySelectorAll('button')) x.disabled = true;
        b.classList.add(o.role === 'natural' ? 'is-good' : 'is-bad');
        T.later(1800, next);
        return null;
      }, { label: 'Your reply' }));
    };
    next();
  }, (ctx) => loadIsrael(ctx, 'scenarios'));
}

export const mount = mountArcade(spec, setup);
