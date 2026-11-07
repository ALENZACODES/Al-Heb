// Plural Pop: a singular noun is shown; balloons float up with candidate plurals. Pop the right one.
// Most masculine plurals end in ים, most feminine in ות; the exceptions are the fun part.
import { mountArcade, randInt } from './arcade.js';
import { pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.pluralpop.v1';
const EXTRA_URL = new URL('../../data/games/arcade-extra.json', import.meta.url);

const spec = {
  id: 'pluralpop', title: 'Plural Pop', titleHe: 'רַבִּים',
  blurb: 'One book, many books: סֵפֶר, סְפָרִים. A singular noun appears and balloons rise with possible plurals. Pop the right one. ים for most masculine, ות for most feminine, and a few famous rebels.',
  howTo: ['Read the singular noun and its meaning.', 'Balloons rise carrying plural forms. Tap the right one.', 'Wrong balloons pop with a hint; letting the right one float away costs a life.', 'Fifteen nouns per round; level 4 adds the irregular plurals.'],
  levels: [
    { name: 'Ending only: ים or ות', count: 12, mode: 'ending', speed: 90 },
    { name: 'Pick the full plural, 2 balloons', count: 14, mode: 'full', options: 2, speed: 80 },
    { name: '3 balloons', count: 15, mode: 'full', options: 3, speed: 70 },
    { name: 'Irregulars in', count: 16, mode: 'full', options: 3, speed: 60, irregular: true },
    { name: '4 balloons, fast', count: 18, mode: 'full', options: 4, speed: 48, irregular: true },
  ],
  par: (l, cfg) => cfg.count * 10,
  seconds: (l, cfg) => 120,
  needsLetters: false,
};

const IRREGULAR = new Set(['אִישׁ', 'אִשָּׁה', 'בַּיִת', 'עִיר', 'יוֹם', 'שָׁנָה', 'מִלָּה', 'שֻׁלְחָן', 'חַלּוֹן', 'לַיְלָה', 'מָקוֹם', 'שָׁבוּעַ']);

async function loadExtra(ctx) {
  const f = ctx?.fetchFn || ctx?.fetch || globalThis.fetch;
  const res = await f(EXTRA_URL);
  if (!res.ok) throw new Error(`could not load data/games/arcade-extra.json: HTTP ${res.status}`);
  return res.json();
}

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd, H = 260;
  const prompt = A.h('div', { class: 'arc-big', lang: 'he', dir: 'rtl' });
  const meaning = A.h('p', { class: 'arc-prompt' });
  const sky = A.h('div', { class: 'arc-lane', style: `height:${H}px;width:100%` });
  A.board.replaceChildren(prompt, meaning, sky);
  let deck = [], n = 0, card = null, balloons = [];
  A.setLives(3);
  loadExtra(A.ctx).then((x) => {
    let pool = x.plurals;
    if (!cfg.irregular) pool = pool.filter((p) => !IRREGULAR.has(p.he));
    deck = pickSeeded(pool, cfg.count, rnd); all = x.plurals; next();
  }).catch(() => A.announce('The plural list did not load.'));
  let all = [];
  const wrongForms = (p) => {
    const bare = p.he.replace(/[֑-ׇ]/g, '');
    const stem = bare.replace(/ה$/, '');
    const out = new Set([stem + 'ים', stem + 'ות', bare + 'ים', bare + 'ות'].filter((f) => f !== p.plural.replace(/[֑-ׇ]/g, '')));
    for (const q of pickSeeded(all.filter((q) => q !== p), 3, rnd)) out.add(q.plural);
    return [...out];
  };
  const next = () => {
    if (n >= deck.length) { A.finish({ won: true }); return; }
    card = deck[n++];
    prompt.textContent = card.he; meaning.textContent = `${card.en} · "${card.translit}" · ${n} of ${deck.length}`;
    for (const b of balloons) b.el.remove(); balloons = [];
    const options = cfg.mode === 'ending' ? pickSeeded([{ t: 'ים', ok: card.ending === 'im' }, { t: 'ות', ok: card.ending === 'ot' }], 2, rnd)
      : pickSeeded([{ t: card.plural, ok: true }, ...pickSeeded(wrongForms(card), cfg.options - 1, rnd).map((t) => ({ t, ok: false }))], cfg.options, rnd);
    options.forEach((o, i) => {
      const y0 = A.quiet ? H / 2 - 30 : H + randInt(rnd, 80);
      const el = A.h('button', { type: 'button', class: 'arc-choice', lang: 'he', dir: 'rtl', style: `position:absolute;border-radius:50% 50% 50% 50% / 60% 60% 40% 40%;min-width:72px;height:60px;left:${Math.round((i + 0.5) * (100 / options.length))}%;transform:translateX(-50%);top:${y0}px`, onclick: () => pop(o, el) }, o.t);
      sky.append(el); balloons.push({ o, el, y: y0 });
    });
  };
  const pop = (o, el) => {
    if (o.ok) { A.addScore(10); A.sfx('bubble_pop'); A.announce(`${card.he} → ${card.plural} (${card.pluralTranslit}).`); next(); }
    else { A.addScore(-2); A.sfx('error_soft'); el.remove(); balloons = balloons.filter((b) => b.el !== el); A.announce(`Not ${o.t}. Think: ${card.ending === 'im' ? 'this one takes ים' : 'this one takes ות'}.`); }
  };
  const step = () => { for (const b of balloons) { b.y -= 2.5; b.el.style.top = `${b.y}px`; } if (balloons.some((b) => b.o.ok && b.y < -60)) { A.announce(`It floated away: ${card.he} → ${card.plural}.`); if (A.miss()) return; next(); } };
  if (!A.quiet) A.loop(step, cfg.speed); else A.announce('Calm mode: balloons hold still.');
}

export const mount = mountArcade(spec, setup);
