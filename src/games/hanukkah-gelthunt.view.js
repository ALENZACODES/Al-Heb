// Gelt Hunt: hot or cold, in Hebrew. Gelt is hidden somewhere in the room. Tap a spot and Rimon calls how close you are:
// קַר מְאוֹד (very cold) far away, up to חַם מְאוֹד (very hot) right next to it. Every spot is a room word (שֻׁלְחָן, כִּסֵּא ...).
// Distance is rows plus columns to the nearest gelt still hidden. Levels grow the room and drop the English.
import { mountHanukkahArcade, tagged, wordLine } from './hanukkah-shell.js';

export const STORE_KEY = 'games.hanukkah-gelthunt.v1';

/** Pure: steps (rows + columns) from a cell to the nearest hidden coin. */
export function distance([r, c], coins) {
  return coins.length ? Math.min(...coins.map(([a, b]) => Math.abs(a - r) + Math.abs(b - c))) : Infinity;
}
/** Pure: the clue band for a distance (bands from data/games/hanukkah/words.json, sorted by max). */
export function clueFor(d, clues) {
  return [...clues].sort((a, b) => a.max - b.max).find((c) => d <= c.max) || clues[clues.length - 1];
}

const ICON = { shulchan: '\u{1F37D}', kise: '\u{1FA91}', chalon: '\u{1FA9F}', delet: '\u{1F6AA}', sapa: '\u{1F6CB}', mita: '\u{1F6CF}', aron: '\u{1F5C4}', shatiach: '\u{1F9F6}', karit: '\u{1F6CF}', mekarer: '\u{1F9CA}', tanur: '\u{1F525}', panas: '\u{1F3EE}' };

const spec = {
  id: 'hanukkah-gelthunt', title: 'Gelt Hunt', titleHe: 'חַם אוֹ קַר',
  blurb: 'Rimon hid the Hanukkah gelt in the room. Tap a spot to look there. The clue says how close you are, in Hebrew: hot means close, cold means far.',
  howTo: ['Tap a spot in the room (or move with the arrow keys and press Enter).', 'Read the clue: חַם מְאוֹד very hot, חַם hot, חָמִים warm, קָרִיר cool, קַר cold, קַר מְאוֹד very cold.', 'Each spot is a room word. Look at its Hebrew name as you search.', 'Find every coin in as few looks as you can. Later levels hide the English.'],
  levels: [
    { name: '3 x 3 room, one coin', size: 3, coins: 1, english: true },
    { name: '4 x 4 room, two coins', size: 4, coins: 2, english: true },
    { name: '4 x 4, Hebrew clues only', size: 4, coins: 2, english: false },
    { name: '5 x 5, three coins', size: 5, coins: 3, english: false },
    { name: '5 x 5, no transliteration', size: 5, coins: 3, english: false, noTranslit: true },
  ],
  par: (l, cfg) => cfg.coins * 20,
  seconds: (l, cfg) => 60 + cfg.size * cfg.size * 4,
};

function setup(A, data) {
  const cfg = A.cfg, rnd = A.rnd, h = A.h;
  const room = tagged(data, 'room');
  const clues = data.clues || [];
  const n = cfg.size;
  const spots = [];
  for (let i = 0; i < n * n; i++) spots.push(room[(i + Math.floor(rnd() * room.length)) % room.length]);
  const all = []; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) all.push([r, c]);
  const coins = [];
  while (coins.length < cfg.coins) { const cell = all[Math.floor(rnd() * all.length)]; if (!coins.some(([a, b]) => a === cell[0] && b === cell[1])) coins.push(cell); }
  let hidden = coins.slice(), looks = 0, cursor = [0, 0];
  const clueEl = h('p', { class: 'hk-pot', 'aria-live': 'off' }, 'Tap a spot to start looking.');
  const grid = h('div', { class: 'hk-room', role: 'grid', 'aria-label': `Room, ${n} by ${n}`, style: `grid-template-columns:repeat(${n},minmax(3.6rem,1fr))` });
  const buttons = [];
  for (let r = 0; r < n; r++) {
    const row = h('div', { role: 'row', style: 'display:contents' });
    for (let c = 0; c < n; c++) {
      const w = spots[r * n + c];
      const b = h('button', { type: 'button', role: 'gridcell', 'data-r': r, 'data-c': c, tabindex: r === 0 && c === 0 ? '0' : '-1', 'aria-label': `${w.translit}, ${w.en}`, onclick: () => look(r, c) },
        h('span', { class: 'hk-ico', 'aria-hidden': 'true' }, ICON[w.key] || '□'), A.heSpan(w.he));
      buttons.push(b); row.append(b);
    }
    grid.append(row);
  }
  const btnAt = (r, c) => buttons[r * n + c];
  function look(r, c) {
    if (!hidden.length) return;
    looks++;
    const b = btnAt(r, c);
    const hit = hidden.findIndex(([a, bb]) => a === r && bb === c);
    if (hit >= 0) {
      hidden.splice(hit, 1);
      b.classList.add('is-found'); b.replaceChildren(h('span', { class: 'hk-ico', 'aria-hidden': 'true' }, '\u{1FA99}'), A.heSpan(spots[r * n + c].he));
      b.setAttribute('aria-label', `${spots[r * n + c].translit}: gelt found here`);
      const found = clues.find((x) => x.max === 0);
      clueEl.replaceChildren(A.heSpan(found.he, 'he hk-he'), ' / ', A.heSpan(found.heF, 'he hk-he'), cfg.noTranslit ? '' : ` ${found.translit} / ${found.translitF}`, ' ', found.en);
      A.addScore(Math.max(5, 25 - looks)); A.sfx('success');
      A.announce(`You found a coin under the ${spots[r * n + c].en}! ${hidden.length ? `${hidden.length} more to find.` : 'That was the last one.'}`);
      A.sayWord(spots[r * n + c]);
      looks = 0;
      if (!hidden.length) { A.addScore(10); A.finish({ won: true }); }
      return;
    }
    const d = distance([r, c], hidden);
    const clue = clueFor(d, clues.filter((x) => x.max > 0));
    b.classList.add('is-checked');
    clueEl.replaceChildren(A.heSpan(clue.he, 'he hk-he'), cfg.noTranslit ? '' : ` ${clue.translit}`, cfg.english ? ` (${clue.en})` : '');
    A.sfx(d <= 2 ? 'tick' : 'pop');
    A.announce(`${spots[r * n + c].en}: ${clue.translit}${cfg.english ? `, ${clue.en}` : ''}.`);
    if (looks > n * 2) A.addScore(-1);
  }
  A.keys((k) => {
    const [r, c] = cursor; let nr = r, nc = c;
    if (k === 'up') nr = Math.max(0, r - 1); else if (k === 'down') nr = Math.min(n - 1, r + 1);
    else if (k === 'left') nc = Math.min(n - 1, c + 1); else if (k === 'right') nc = Math.max(0, c - 1); // right to left room
    else return false;
    btnAt(r, c).setAttribute('tabindex', '-1'); cursor = [nr, nc]; const b = btnAt(nr, nc); b.setAttribute('tabindex', '0'); try { b.focus(); } catch { /* ignore */ }
    return true;
  });
  const legend = h('details', { class: 'arc-howto' }, h('summary', {}, 'Hot and Cold Words'),
    h('ul', {}, ...clues.filter((x) => x.max > 0).map((x) => h('li', {}, A.heSpan(x.he, 'he hk-he'), ` ${x.translit}`, cfg.english ? ` · ${x.en}` : ''))));
  A.board.replaceChildren(h('p', { class: 'arc-prompt' }, `${cfg.coins} coin${cfg.coins > 1 ? 's' : ''} hidden. `, wordLine(data.words.find((w) => w.key === 'matbea'), { en: cfg.english })), clueEl, grid, legend);
}

export const mount = mountHanukkahArcade(spec, setup);
