// @ts-check
// Root Builder (#/rootbuilder, D10). Three root letters; tap letter tiles (or type) to build words of the family. A word counts
// only when the app's own root families or verb list name it under this root (src/games/rootbuilder.model.js). When the round
// ends, every listed word is shown with its English, so the learner sees the family the data holds.
import { h, heSpan } from '../shell/ui.js';
import { recordScore } from './scores.js';
import { STORE_KEY, buildRounds, tilesFor, check, starsFor, pickRounds, POINTS_PER_WORD } from './rootbuilder.model.js';
import { injectStyles } from './library.view.js';

export { STORE_KEY };
export const NOTE = 'A word counts only when Aleph\'s own root families or verb list name it under this root. Those lists come from the dictionary and have not been reviewed by a Hebrew teacher, so a real word may be missing and some groupings may be wrong.';

export function mount(root, ctx) {
  injectStyles();
  let alive = true, rounds = [], idx = 0, round = null, found = new Map(), typed = '';
  const status = h('p', { role: 'status', 'aria-live': 'polite', class: 'gb-status' }, 'Loading the root families…');
  const board = h('div', { class: 'gb-root-board' });
  const load = async (rel) => { const r = await (ctx?.fetchFn ?? fetch)(new URL('../../' + rel, import.meta.url)); if (!r || r.ok === false) throw new Error(rel); return r.json(); };
  const get = (k) => { try { return ctx?.store?.get?.(k) || null; } catch { return null; } };
  const set = (k, v) => { try { ctx?.store?.set?.(k, v); } catch { /* storage full or blocked */ } };

  function finish() {
    const total = round.answers.length, n = found.size, score = n * POINTS_PER_WORD, stars = starsFor(n, total);
    const prev = get(STORE_KEY) || {};
    set(STORE_KEY, { best: Math.max(prev.best || 0, score), plays: (prev.plays || 0) + 1, lastStars: stars });
    recordScore(ctx?.store, 'rootbuilder', score, stars);
    try { globalThis.document?.dispatchEvent?.(new CustomEvent('alef:game-finished', { detail: { stars } })); } catch { /* optional */ }
    board.replaceChildren(h('section', { class: 'card game-results', 'aria-labelledby': 'rb-res-h' },
      h('h2', { id: 'rb-res-h', tabindex: '-1' }, `You found ${n} of the ${total} words listed under this root`),
      h('p', { class: 'game-stars', 'aria-label': `${stars} of 3 stars` }, '★'.repeat(stars) + '☆'.repeat(3 - stars)),
      h('p', {}, `${score} points. ${prev.best ? `Your best before: ${prev.best}.` : 'Your first score here.'}`),
      h('h3', {}, 'Every listed word'),
      h('ul', {}, ...round.answers.map((a) => h('li', {}, heSpan(a.he), ` — ${a.en || 'no English in the list'}`, found.has(a.key) ? ' ✓' : '', h('span', { class: 'muted' }, ` (${a.from})`)))),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn', onclick: () => { idx = (idx + 1) % rounds.length; start(); } }, 'Next root'),
        h('a', { class: 'btn secondary', href: '#/roots' }, 'Roots and verb families'),
        h('a', { class: 'btn secondary', href: '#/game-library' }, 'Games Library'))));
    status.textContent = `Round over: ${n} of ${total} words.`;
    try { board.querySelector('h2')?.focus?.(); } catch { /* no focus */ }
  }

  function submit() {
    const out = check(round, typed, found);
    if (out.result === 'found') { found.set(out.answer.key, out.answer); status.textContent = `Yes: ${out.answer.he} — ${out.answer.en}. ${found.size} of ${round.answers.length}.`; }
    else if (out.result === 'again') status.textContent = `You already have ${out.answer.he}.`;
    else if (out.result === 'short') status.textContent = 'Build a word of two letters or more.';
    else status.textContent = 'That is not a word Aleph lists under this root. It may still be Hebrew: the list is incomplete.';
    typed = ''; paint();
    if (found.size === round.answers.length) finish();
  }

  function paint() {
    const tiles = tilesFor(round), rootKeys = new Set(round.letters);
    const input = h('input', { type: 'text', class: 'gb-root-input', lang: 'he', dir: 'rtl', 'aria-label': 'Your word (type, or tap the letters)', value: typed, autocomplete: 'off',
      oninput: (e) => { typed = e.target.value; }, onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } } });
    board.replaceChildren(
      h('p', { class: 'gb-root-letters' }, 'Root: ', heSpan(round.letters.join(' · '), 'he gb-root-he'), h('span', { class: 'muted' }, ` · ${round.answers.length} words listed`)),
      h('div', { class: 'gb-filters', role: 'group', 'aria-label': 'Letter tiles' }, ...tiles.map((c) => h('button', { type: 'button', class: 'btn secondary' + (rootKeys.has(c) ? ' gb-root-tile' : ''),
        'aria-label': `${c}${rootKeys.has(c) ? ', a root letter' : ''}`, onclick: () => { typed += c; paint(); } }, heSpan(c)))),
      input,
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn', onclick: submit }, 'Check the word'),
        h('button', { type: 'button', class: 'btn secondary', onclick: () => { typed = [...typed].slice(0, -1).join(''); paint(); } }, 'Delete a letter'),
        h('button', { type: 'button', class: 'btn secondary', onclick: finish }, 'Finish and see all the words')),
      h('h3', {}, `Found: ${found.size}`),
      h('ul', { class: 'gb-root-found' }, ...[...found.values()].map((a) => h('li', {}, heSpan(a.he), ` — ${a.en}`))));
  }

  function start() { round = rounds[idx]; found = new Map(); typed = ''; status.textContent = 'Build a word from the tiles, then check it. Final letters can be typed either way.'; paint(); }

  root.replaceChildren(h('article', { class: 'card game-card gb-lib gb-rootbuilder' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Root Builder ', heSpan('שֹׁרֶשׁ')),
    h('p', {}, 'Most Hebrew words grow from a root of three letters. Build as many words of this root\'s family as you can.'),
    h('p', { class: 'muted' }, NOTE), status, board));
  (async () => {
    try {
      const [fam, verbs] = await Promise.all([load('data/roots/families.json'), load('data/roots/verbs.json').catch(() => ({ verbs: [] }))]);
      if (!alive) return;
      const daily = ctx?.query?.daily === '1' || ctx?.route?.query?.daily === '1';
      rounds = pickRounds(buildRounds(fam, verbs), 30, daily ? `rootbuilder|${new Date().toDateString()}` : null);
      if (!rounds.length) { status.textContent = 'No root has enough listed words to play.'; return; }
      start();
    } catch { if (alive) status.textContent = 'The root families did not load. Check the connection and open the game again.'; }
  })();
  return () => { alive = false; };
}
