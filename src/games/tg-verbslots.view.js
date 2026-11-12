// Verb Slots: a Hebrew verb is listed by its past form ("he did"). Put its other forms in their slots: the infinitive
// ("to do", starts with lamed), the present ("doing") and the future ("he will do", starts with yod).
import { mountArcade, choiceRow } from './arcade.js';
import { loadData, options, shuffle } from './tg-core.js';
import { host, track, numberKeys, grade, draftNote, ensureStyle } from './tg-ui.js';

export const STORE_KEY = 'games.tg-verbslots.v1';
const ROUNDS = 8;
export const SLOTS = Object.freeze([
  { key: 'infinitive', en: 'to …', hint: 'starts with ל' },
  { key: 'present', en: 'doing (he is …ing)', hint: 'present' },
  { key: 'future', en: 'he will …', hint: 'starts with י' },
]);

const spec = {
  id: 'tg-verbslots', title: 'Verb Slots', titleHe: 'פֹּעַל',
  blurb: 'Every verb in the word list comes with the form "he did" and three more: to do, doing, and he will do. Learn to tell them apart by their shape, then fill all three slots, then do it with look-alike verbs that follow the same pattern.',
  howTo: ['Levels 1 to 3: a verb appears; pick its infinitive, then its present, then its future.', 'Level 4: fill the three slots in order (to …, doing, he will …). Some forms in the tray belong to other verbs.', 'Level 5: the same, but the other verbs share the pattern and the meaning is hidden until you finish.', 'Press 1 to 6 to pick from the keyboard.'],
  levels: [
    { name: 'To …: the infinitive', mode: 'one', slot: 'infinitive', band: ['A1'] },
    { name: 'Doing: the present', mode: 'one', slot: 'present', band: ['A1'] },
    { name: 'He will: the future', mode: 'one', slot: 'future', band: ['A1', 'A2'] },
    { name: 'All three slots', mode: 'all', band: ['A1', 'A2'], same: false },
    { name: 'Same pattern, no meaning', mode: 'all', band: ['A1', 'A2'], same: true },
  ],
  par: (l, cfg) => (cfg.mode === 'all' ? ROUNDS * 30 : ROUNDS * 10),
  seconds: (l, cfg) => (cfg.mode === 'all' ? 210 : 120),
  needsWords: false, needsLetters: false,
};

/** Forms in the tray: this verb's three plus `extra` forms from other verbs (the same pattern when asked), all different. */
export function trayForms(verb, verbs, extra, rnd = Math.random, same = false) {
  const own = SLOTS.map((s) => ({ he: verb.forms[s.key], slot: s.key, own: true }));
  const pool = verbs.filter((v) => v.id !== verb.id && (!same || v.binyan === verb.binyan))
    .flatMap((v) => SLOTS.map((s) => ({ he: v.forms[s.key], slot: s.key, own: false })))
    .filter((f) => !own.some((o) => o.he === f.he));
  const seen = new Set(own.map((f) => f.he)), add = [];
  for (const f of shuffle(pool, rnd)) { if (add.length >= extra) break; if (!seen.has(f.he)) { seen.add(f.he); add.push(f); } }
  return shuffle([...own, ...add], rnd);
}

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const big = A.h('div', { class: 'arc-big', lang: 'he', dir: 'rtl' });
  const prompt = A.h('p', { class: 'arc-prompt' });
  const area = A.h('div');
  A.board.replaceChildren(host(A, 'noa', 'Same verb, different jobs.'), big, prompt, area,
    draftNote(A, 'Forms come from the app\'s word list. The present is the dictionary form (masculine singular). Not reviewed by a teacher.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  let verbs = [], deck = [], n = 0;
  const gloss = (v) => v.en.split(/[;(]/)[0].trim();
  const next = () => { if (n >= ROUNDS || !deck.length) { T.end({ won: true }); return; } n += 1; cfg.mode === 'all' ? all() : one(); };
  const one = () => {
    const v = deck[(n - 1) % deck.length], slot = SLOTS.find((s) => s.key === cfg.slot);
    big.textContent = v.he;
    prompt.textContent = `"${gloss(v)}". Which is the ${cfg.slot} (${slot.en})? (${n} of ${ROUNDS})`;
    const want = v.forms[cfg.slot];
    const pool = verbs.filter((x) => x.id !== v.id).map((x) => x.forms[cfg.slot]).concat(SLOTS.filter((s) => s.key !== cfg.slot).map((s) => v.forms[s.key]));
    area.replaceChildren(choiceRow(options(want, pool, 4, rnd), (o) => o, (o) => {
      const own = SLOTS.find((s) => v.forms[s.key] === o);
      const ok = o === want;
      grade(A, ok, { right: `${want} is the ${cfg.slot} of ${v.he} ("${gloss(v)}").`, wrong: own ? `${o} is the same verb, but its ${own.key}.` : `${o} belongs to another verb.` });
      if (ok) { A.sayWord(v); T.later(900, next); }
      return ok;
    }, { label: 'Forms' }));
  };
  const all = () => {
    const v = deck[(n - 1) % deck.length];
    big.textContent = v.he;
    prompt.textContent = cfg.same ? `Verb ${n} of ${ROUNDS}: fill the slots.` : `Verb ${n} of ${ROUNDS}: "${gloss(v)}". Fill the slots.`;
    let filled = 0;
    const slots = SLOTS.map((s) => A.h('div', { class: 'arc-slot', 'aria-label': `${s.key} slot, empty` }, A.h('span', { class: 'muted' }, `${s.en} · ${s.hint}`)));
    const tray = A.h('div', { class: 'arc-choices', role: 'group', 'aria-label': 'Forms to place' });
    const forms = trayForms(v, verbs, 3, rnd, cfg.same);
    const draw = () => tray.replaceChildren(...forms.map((f) => A.h('button', { type: 'button', class: 'arc-choice', lang: 'he', dir: 'rtl', onclick: () => place(f) }, f.he)));
    const place = (f) => {
      const s = SLOTS[filled];
      if (f.own && f.slot === s.key) {
        forms.splice(forms.indexOf(f), 1);
        slots[filled].classList.add('is-filled'); slots[filled].setAttribute('aria-label', `${s.key} slot: ${f.he}`);
        slots[filled].replaceChildren(A.h('span', { lang: 'he', dir: 'rtl', class: 'he' }, f.he), A.h('small', { style: 'margin-inline-start:.4rem' }, s.en));
        filled += 1; grade(A, true, { right: `${f.he} is the ${s.key}.` }); draw();
        if (filled === 3) { A.announce(`${v.he}: ${gloss(v)}. All three slots filled.`); A.sayWord(v); T.later(1100, next); }
      } else grade(A, false, { wrong: f.own ? `${f.he} is this verb's ${f.slot}. The next slot is the ${s.key}.` : `${f.he} belongs to another verb.` });
    };
    draw();
    area.replaceChildren(A.h('div', { class: 'arc-tablets' }, ...slots), tray);
  };
  loadData(A.ctx, 'data/games/tg/verbs.json').then((d) => {
    if (!T.live()) return;
    verbs = (d.verbs || []).filter((v) => cfg.band.includes(v.level));
    deck = shuffle(verbs, rnd).slice(0, ROUNDS);
    next();
  }).catch(() => A.announce('The verbs did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
