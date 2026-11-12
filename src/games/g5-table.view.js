// Shabbat Table: stock the Friday night table (two candles, two challot, a cup for Kiddush) from a shelf that
// also holds things for other days, then the Saturday night table for Havdalah (a cup, spices, a braided candle).
// Press Ready when the table is set; Noa says what is missing or what does not belong.
import { mountG5, host, track, grade, draftNote, card, button, lock } from './g5-ui.js';
import { loadData, g5Data, shuffle, shortEn, clean } from './g5-core.js';

export const STORE_KEY = 'games.g5-table.v1';
const MAX = 4;

const spec = {
  id: 'g5-table', title: 'Shabbat Table', titleHe: 'שַׁבָּת שָׁלוֹם',
  blurb: 'Shabbat starts with candles, wine and two loaves on Friday night, and ends with Havdalah on Saturday night. Set each table from the shelf, then press Ready.',
  howTo: ['Press + to put a thing on the table and − to take it off.', 'Press Ready when the table is set.', 'Things for other holidays stay on the shelf.', 'Levels 1 and 2 show a checklist; level 3 does not. Levels 4 and 5 add the Havdalah table.'],
  levels: [
    { name: 'Friday night, with a checklist', tables: ['friday'], english: true, list: true, decoys: 2 },
    { name: 'Hebrew and how to say it', tables: ['friday'], english: false, tr: true, list: true, decoys: 3 },
    { name: 'From memory, Hebrew only', tables: ['friday'], english: false, list: false, decoys: 4 },
    { name: 'Saturday night: Havdalah', tables: ['saturday'], english: true, list: true, decoys: 3 },
    { name: 'Both tables, Hebrew only', tables: ['friday', 'saturday'], english: false, list: false, decoys: 4 },
  ],
  par: (l, cfg) => cfg.tables.length * 30,
  seconds: (l, cfg) => 60 + cfg.tables.length * 50,
};

/** What is wrong with a table: counts by item id, needs [{ id, need, unit }] and decoy ids. */
export function tableProblems(counts, needs, decoyIds) {
  const out = [];
  for (const n of needs) if ((counts[n.id] || 0) < n.need) out.push(`It needs ${n.need === 1 ? 'a' : n.need} ${n.unit}${n.need > 1 && !/s$/.test(n.unit) ? 's' : ''}.`);
  for (const id of decoyIds) if (counts[id]) out.push('Something on the table belongs to another day.');
  return [...new Set(out)];
}

function setup(A) {
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const list = A.h('ul', { class: 'muted' });
  const shelf = A.h('div', { class: 'g5-grid', role: 'group', 'aria-label': 'Shelf' });
  const table = A.h('p', { class: 'arc-prompt', 'aria-live': 'polite' });
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  const ready = A.h('div', { class: 'g5-row' });
  A.board.replaceChildren(host(A, 'noa', 'Let\'s set the table.'), prompt, list, shelf, table, ready, after,
    draftNote(A, 'From the app\'s article Shabbat at Home. Many homes light more than two candles; your family\'s custom comes first.'));
  loadData(A.ctx, g5Data('shabbat')).then((d) => {
    if (!T.live()) return;
    let t = 0;
    const round = () => {
      if (t >= cfg.tables.length) { T.end({ won: true }); return; }
      const which = cfg.tables[t++];
      const needs = d[which];
      const decoys = shuffle(d.decoys, rnd).slice(0, cfg.decoys).map((x, k) => ({ ...x, id: `decoy-${k}` }));
      const items = shuffle([...needs, ...decoys], rnd);
      const counts = {};
      prompt.textContent = which === 'friday' ? 'Friday night: set the table for Shabbat.' : 'Saturday night: set the table for Havdalah.';
      list.replaceChildren(...(cfg.list ? needs.map((n) => A.h('li', {}, `${n.need} × ${n.unit}`)) : []));
      const label = (x) => `${clean(x.he)}${cfg.tr ? ` (${x.tr})` : ''}`;
      const paint = () => {
        const on = items.filter((x) => counts[x.id]);
        table.textContent = on.length ? `On the table: ${on.map((x) => `${counts[x.id]} × ${cfg.english ? shortEn(x.en) : label(x)}`).join(', ')}.` : 'The table is empty.';
      };
      shelf.replaceChildren(...items.map((x) => {
        const n = A.h('span', { class: 'g5-count', 'aria-live': 'polite' }, '0');
        const decoy = x.id.startsWith('decoy-');
        const set = (k, b) => {
          if (decoy && k > 0) { grade(A, false, { wrong: `${cfg.english ? shortEn(x.en) : label(x)} is for another day. It stays on the shelf.` }); b.disabled = true; b.append(A.h('span', { class: 'g5-tag' }, ' ✗ another day')); return; }
          counts[x.id] = Math.max(0, Math.min(MAX, (counts[x.id] || 0) + k)); n.textContent = String(counts[x.id]); A.sfx('click'); paint();
        };
        return A.h('div', { class: 'g5-card' }, card(A, x.he, cfg.english ? shortEn(x.en) : null, cfg.tr ? x.tr : null),
          A.h('div', { class: 'g5-step' }, button(A, '−', (b) => set(-1, b), 'btn secondary', { 'aria-label': `Take one off: ${shortEn(x.en)}` }), n,
            button(A, '+', (b) => set(1, b), 'btn secondary', { 'aria-label': `Put one on: ${shortEn(x.en)}` })));
      }));
      ready.replaceChildren(button(A, 'Ready', () => {
        const problems = tableProblems(counts, needs, decoys.map((x) => x.id));
        if (problems.length) { grade(A, false, { wrong: `Not yet. ${problems.join(' ')}` }); after.textContent = problems.join(' '); return; }
        grade(A, true, { right: which === 'friday' ? 'Shabbat shalom! The table is ready.' : 'Shavua tov! Ready for Havdalah.', points: 10 * needs.length });
        after.textContent = needs.map((n) => `${clean(n.he)} (${n.tr}): ${shortEn(n.en)}`).join(' · ');
        lock(shelf); lock(ready); T.later(1200, round);
      }, 'btn'));
      paint();
    };
    round();
  }).catch(() => A.announce('The shelf did not load. Check the connection and press Start again.'));
}

export const mount = mountG5(spec, setup);
