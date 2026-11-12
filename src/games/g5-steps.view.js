// Seder Steps: the seder's fifteen steps, Kadesh to Nirtzah, with some missing. Choose an empty step (the first one is
// chosen for you) and tap the card that belongs there. Higher levels leave more gaps, drop the English and slip in cards
// that are not seder steps at all.
import { mountG5, host, track, grade, draftNote, numberKeys, card, button, lock } from './g5-ui.js';
import { loadData, g5Data, shuffle, gaps, shortEn } from './g5-core.js';

export const STORE_KEY = 'games.g5-steps.v1';

const spec = {
  id: 'g5-steps', title: 'Seder Steps', titleHe: 'סֵדֶר',
  blurb: 'Seder means order: the evening follows about fifteen steps, from blessing the wine to the closing songs. Some steps have gone missing. Put them back.',
  howTo: ['The first empty step is chosen for you; tap another empty step to choose it instead.', 'Tap the card that belongs in the chosen step (or press its number).', 'A wrong card costs a few points and stays in the tray.', 'Level 4 and up: some cards in the tray are not seder steps.'],
  levels: [
    { name: 'Three gaps, with English', gaps: 3, rounds: 2, english: true, tr: true, decoys: 0 },
    { name: 'Five gaps', gaps: 5, rounds: 2, english: true, tr: true, decoys: 0 },
    { name: 'Seven gaps, Hebrew and how to say it', gaps: 7, rounds: 2, english: false, tr: true, decoys: 0 },
    { name: 'Nine gaps and strangers', gaps: 9, rounds: 1, english: false, tr: false, decoys: 2 },
    { name: 'Twelve gaps, Hebrew only', gaps: 12, rounds: 1, english: false, tr: false, decoys: 3 },
  ],
  par: (l, cfg) => cfg.gaps * cfg.rounds * 10,
  seconds: (l, cfg) => 30 + cfg.gaps * cfg.rounds * 9,
};

function setup(A) {
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt', 'aria-live': 'polite' });
  const list = A.h('ol', { class: 'g5-grid', 'aria-label': 'The fifteen steps' });
  const tray = A.h('div', { class: 'g5-grid', role: 'group', 'aria-label': 'Cards' });
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'rimon', 'Kadesh, Urchatz... what comes next?'), prompt, list, tray, after,
    draftNote(A, 'The fifteen traditional steps the app\'s Pesach article mentions. Step names other than matzah, maror and Hallel await a teacher\'s check.'));
  numberKeys(A, () => tray);
  loadData(A.ctx, g5Data('seder')).then((d) => {
    if (!T.live()) return;
    const steps = d.steps;
    const what = (s) => s.step || s.en;
    let r = 0;
    const round = () => {
      if (r >= cfg.rounds) { T.end({ won: true }); return; }
      r += 1;
      const open = new Set(gaps(steps.length, cfg.gaps, rnd));
      let at = Math.min(...open);
      const cards = shuffle([...[...open].map((i) => steps[i]), ...shuffle(d.stepDecoys, rnd).slice(0, cfg.decoys)], rnd);
      const draw = () => {
        list.replaceChildren(...steps.map((s, i) => A.h('li', {}, open.has(i)
          ? button(A, `Step ${i + 1}: ?`, () => { at = i; draw(); A.announce(`Step ${i + 1} chosen.`); }, 'arc-choice g5-slot-empty', { 'aria-pressed': String(i === at) })
          : card(A, s.he, `${i + 1}. ${s.tr}`, cfg.english ? what(s) : null))));
        tray.replaceChildren(...cards.map((c) => button(A, card(A, c.he, cfg.tr ? c.tr : null, cfg.english ? what(c) : null), (b) => {
          const ok = steps[at] === c;
          grade(A, ok, { right: `Step ${at + 1}: ${c.tr}, ${what(c)}.`, wrong: c.step || steps.includes(c) ? `${c.tr} is another step, not step ${at + 1}.` : `${c.tr} (${shortEn(c.en)}) is not a seder step.` });
          if (!ok) { if (!steps.includes(c)) { b.disabled = true; b.append(A.h('span', { class: 'g5-tag' }, ' ✗ not a step')); } return; }
          open.delete(at); cards.splice(cards.indexOf(c), 1);
          after.textContent = `${at + 1}. ${c.tr}: ${what(c)}.`;
          if (![...open].length) { A.addScore(10); prompt.textContent = 'All fifteen steps, in order.'; draw(); lock(list); lock(tray); T.later(1300, round); return; }
          at = Math.min(...open); draw();
        })));
        prompt.textContent = `Round ${r} of ${cfg.rounds}: ${open.size} step${open.size === 1 ? '' : 's'} missing. Now filling step ${at + 1}.`;
      };
      draw();
    };
    round();
  }).catch(() => A.announce('The steps did not load. Check the connection and press Start again.'));
}

export const mount = mountG5(spec, setup);
