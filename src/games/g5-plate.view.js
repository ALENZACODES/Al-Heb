// Seder Plate: six foods, six places on the plate. Pick a food from the tray, then tap its place. The early levels label
// each place with what its food stands for; the top level shows the full plate for a moment, then asks you to set it
// from memory. The layout is one common arrangement (the Ari's); many families lay their plate another way.
import { mountG5, host, track, grade, draftNote, card, button, lock } from './g5-ui.js';
import { loadData, g5Data, shuffle } from './g5-core.js';

export const STORE_KEY = 'games.g5-plate.v1';
/** The plate as a 3 by 3 grid, as the leader sees it; null cells stay empty. */
export const GRID = Object.freeze(['top-left', null, 'top-right', null, 'middle', null, 'bottom-left', 'bottom-middle', 'bottom-right']);

const spec = {
  id: 'g5-plate', title: 'Seder Plate', titleHe: 'פֶּסַח',
  blurb: 'In the middle of the seder table sits a plate of symbols, each pointed to and explained during the evening. Put every food in its place.',
  howTo: ['Tap a food in the tray, then tap its place on the plate.', 'Each place is labelled with what its food stands for (until level 5).', 'Level 5: study the full plate, then set it from memory.', 'A wrong place costs a few points; the food goes back to the tray.'],
  levels: [
    { name: 'Names, Hebrew and hints', plates: 2, english: true, tr: true, hints: true },
    { name: 'Hebrew and how to say it', plates: 2, english: false, tr: true, hints: true },
    { name: 'Hebrew only', plates: 2, english: false, tr: false, hints: true },
    { name: 'Hints in short', plates: 3, english: false, tr: false, hints: 'short' },
    { name: 'From memory', plates: 2, english: false, tr: false, hints: false, study: 5000 },
  ],
  par: (l, cfg) => cfg.plates * 60,
  seconds: (l, cfg) => 30 + cfg.plates * 50 + (cfg.study ? 10 : 0),
};

function setup(A) {
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt', 'aria-live': 'polite' });
  const plate = A.h('div', { class: 'g5-plate', dir: 'ltr', role: 'group', 'aria-label': 'The seder plate' });
  const tray = A.h('div', { class: 'g5-grid', role: 'group', 'aria-label': 'Foods to place' });
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'noa', 'Pick a food, then its place.'), prompt, plate, tray, after,
    draftNote(A, 'The foods and three of their meanings are from the app\'s article Pesach and the Seder. The layout and the other meanings await a teacher\'s check.'));
  loadData(A.ctx, g5Data('seder')).then((d) => {
    if (!T.live()) return;
    const items = d.plate;
    let p = 0;
    const hint = (it) => (cfg.hints === 'short' ? it.means.split(/[,:]/)[0] : it.means);
    const round = () => {
      if (p >= cfg.plates) { T.end({ won: true }); return; }
      p += 1;
      const placedIds = new Set();
      let chosen = null;
      const label = (it) => card(A, it.he, cfg.english ? it.name : null, cfg.tr ? it.tr : null);
      const drawPlate = (all) => plate.replaceChildren(...GRID.map((slot) => {
        if (!slot) return A.h('span', { 'aria-hidden': 'true' });
        const it = items.find((x) => x.slot === slot);
        if (all || placedIds.has(it.id)) return A.h('button', { type: 'button', class: 'arc-choice', disabled: true }, label(it), A.h('small', {}, ` ✓ ${it.name}`));
        return button(A, A.h('small', {}, cfg.hints ? hint(it) : `place: ${slot.replace('-', ' ')}`), (b) => {
          if (!chosen) { A.announce('Pick a food from the tray first.'); return; }
          const ok = chosen === it;
          grade(A, ok, { right: `${chosen.tr}: ${chosen.means}.`, wrong: `${chosen.tr} goes in another place.` });
          if (ok) { placedIds.add(it.id); after.textContent = `${it.he}, ${it.tr}: ${it.name}. ${it.means}.`; }
          chosen = null; drawTray(); drawPlate(false);
          if (placedIds.size === items.length) { A.addScore(10); A.announce('The plate is set.'); lock(plate); T.later(1200, round); }
        }, 'arc-choice g5-slot-empty', { 'aria-label': `Empty place, ${slot.replace('-', ' ')}${cfg.hints ? ': ' + hint(it) : ''}` });
      }));
      const order = shuffle(items, rnd);
      const drawTray = () => tray.replaceChildren(...order.filter((it) => !placedIds.has(it.id)).map((it) => button(A, label(it), (b) => {
        chosen = it; A.sfx('select');
        for (const x of tray.querySelectorAll('button')) x.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-pressed', 'true');
        A.announce(`${it.tr} picked. Now tap its place.`);
      }, 'arc-choice g5-word', { 'aria-pressed': 'false' })));
      prompt.textContent = `Plate ${p} of ${cfg.plates}: set the plate.`;
      if (cfg.study) {
        prompt.textContent = `Plate ${p} of ${cfg.plates}: study the plate.`;
        drawPlate(true); tray.replaceChildren();
        T.later(cfg.study + Math.max(0, A.readyAt - Date.now()), () => { prompt.textContent = `Plate ${p} of ${cfg.plates}: now set it from memory.`; drawPlate(false); drawTray(); });
      } else { drawPlate(false); drawTray(); }
    };
    round();
  }).catch(() => A.announce('The plate did not load. Check the connection and press Start again.'));
}

export const mount = mountG5(spec, setup);
