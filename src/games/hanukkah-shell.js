// Shared plumbing for the Hanukkah games (src/games/hanukkah-*.view.js). Self-contained apart from the app's engine and
// shell modules, so the set can be mirrored into the alef-games repo as it is.
//   - data: data/games/hanukkah/{words,dreidel,candles}.json, fetched on first open (on demand, never precached);
//   - page: the standard game card (Title Case h1, Rimon/Ari/Noa line, How to Play, a polite status line, board, results);
//   - sound: Hebrew clips only through ctx.audio (recorded word or letter clip when one exists, otherwise text only);
//     game effects through the shared sfx player; nothing plays in calm mode or with reduced motion;
//   - best score: games.<id>.v1 = { best, plays, lastStars } on this device.
import { recordScore } from './scores.js';
import { h, heSpan } from '../shell/ui.js';
import { sfx } from '../audio/sfx.js';
import { quietNow } from '../shell/comfort.js';
import { isAudioFree } from '../shell/audiofree.js';
import { reactRimon } from '../shell/rimon-events.js';
import { playRecordedClip } from './engine.js';
import { createArcade, castArt } from './arcade.js';
import { HANUKKAH_GAMES } from './arcade.catalog.js';

const DATA_BASE = new URL('../../data/games/hanukkah/', import.meta.url);
const cache = new Map();

/** Load one Hanukkah data file (words, dreidel or candles). */
export async function loadHanukkah(ctx, name) {
  if (cache.has(name)) return cache.get(name);
  const f = ctx?.fetchFn || ctx?.fetch || globalThis.fetch;
  const res = await f(new URL(`${name}.json`, DATA_BASE));
  if (!res.ok) throw new Error(`could not load data/games/hanukkah/${name}.json: HTTP ${res.status}`);
  const json = await res.json();
  cache.set(name, json);
  return json;
}

/** Words a learner can spell or find: one word (no space), from the festival, game and story tags. */
export const spellable = (data, tags = ['light', 'food', 'party', 'story', 'dreidel']) => (data?.words || []).filter((w) => !/\s/.test(w.he) && (w.tags || []).some((t) => tags.includes(t)));
/** key -> word record. */
export const byKey = (data) => new Map((data?.words || []).map((w) => [w.key, w]));
/** Words carrying a tag. */
export const tagged = (data, tag) => (data?.words || []).filter((w) => (w.tags || []).includes(tag));

/** Pointed Hebrew split into letter clusters: each letter with the marks that follow it. */
export function clusters(text) { return [...String(text || '').normalize('NFC').matchAll(/[\u05D0-\u05EA][\u0591-\u05C7]*/g)].map((m) => m[0]); }
/** True when the text carries vowel points (niqqud). */
export const isPointed = (text) => /[\u05B0-\u05BC\u05C1\u05C2\u05C7]/.test(String(text || ''));

/** Calm mode or the system reduced-motion choice: no animation, no sound effects. */
export const isQuiet = (ctx) => { try { return quietNow(ctx?.settings); } catch { return false; } };

/** A game effect through the shared player (it keeps its own mute rules). Silent when quiet. */
export function fx(ctx, name) { try { if (!isQuiet(ctx)) sfx.play(name); } catch { /* sound is optional */ } }

/** A word's recorded clip through ctx.audio, when the word has a vocab id and a clip exists. Text stays on screen. */
export async function sayWord(ctx, word) {
  if (!word?.id || isAudioFree(ctx)) return false;
  return playRecordedClip(ctx, 'word', word.id, { text: word.he });
}
/** A letter's recorded name clip (letter ids as in data/letters/letters.json). */
export async function sayLetter(ctx, letterId, text = '') {
  if (!letterId || isAudioFree(ctx)) return false;
  return playRecordedClip(ctx, 'letter', letterId, { text });
}

/** Best-score saver: games.<id>.v1 = { best, plays, lastStars }. Returns the new record and whether it is a new best. */
export function saveBest(ctx, storeKey, score, stars = 0) {
  let prev = {};
  try { prev = ctx?.store?.get?.(storeKey) || {}; } catch { prev = {}; }
  const rec = { best: Math.max(prev.best || 0, score), plays: (prev.plays || 0) + 1, lastStars: stars };
  try { ctx?.store?.set?.(storeKey, rec); } catch { /* storage may be full or blocked; the game still ends */ }
  recordScore(ctx?.store, (/^games\.(.+)\.v1$/.exec(storeKey) || [])[1], score, stars); // last score for the game cards (src/games/scores.js)
  return { rec, newBest: (prev.plays || 0) > 0 && score > (prev.best || 0) };
}
export function readBest(ctx, storeKey) { try { return ctx?.store?.get?.(storeKey) || null; } catch { return null; } }

/** The Hanukkah game after this one, for the results hand-off. */
export function nextHanukkah(id) {
  const i = HANUKKAH_GAMES.findIndex((g) => g.id === id);
  return HANUKKAH_GAMES[(i + 1) % HANUKKAH_GAMES.length] || null;
}

/** Hebrew with its transliteration and meaning: "חַם · cham · hot". opts.translit / opts.en switch the parts. */
export function wordLine(word, { translit = true, en = true, cls = 'hk-word' } = {}) {
  return h('span', { class: cls },
    heSpan(word.he, 'he hk-he'),
    translit && word.translit ? h('span', { class: 'hk-tr' }, ` ${word.translit}`) : null,
    en && word.en ? h('span', { class: 'hk-en' }, ` · ${word.en}`) : null);
}

const CSS = `
.hk-card .hk-eyebrow{letter-spacing:.12em;font-size:.8rem;opacity:.8}
.hk-cast{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin:.25rem 0}
.hk-cast img{width:48px;height:48px;object-fit:contain}
.hk-he{font-size:1.35em}
.hk-tr{font-style:italic;opacity:.85}
.hk-en{opacity:.85}
.hk-row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin:.5rem 0}
.hk-big{font-size:3.2rem;line-height:1.1}
.hk-players{display:grid;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));gap:.5rem;margin:.5rem 0;padding:0;list-style:none}
.hk-player{border:1px solid var(--border,#8a8a8a55);border-radius:12px;padding:.5rem .65rem}
.hk-player.is-turn{box-shadow:0 0 0 3px var(--accent,#2a6)}
.hk-player.is-out{opacity:.5}
.hk-gelt{letter-spacing:.1em;word-break:break-all}
.hk-pot{font-size:1.15rem;margin:.4rem 0}
.hk-dreidel{display:inline-grid;place-items:center;width:6.5rem;height:6.5rem;border-radius:22% 22% 46% 46%;background:var(--gold-400,#d9b24c);color:#1d2b1a;font-size:3.4rem;margin:.5rem auto;box-shadow:0 4px 0 rgba(0,0,0,.25)}
.hk-dreidel{transition:transform 1.2s cubic-bezier(.2,.7,.2,1)}
.hk-face-card{border:2px solid var(--gold-500,#c9a23a);border-radius:14px;padding:.6rem .8rem;margin:.5rem 0}
.hk-menorah{display:flex;direction:ltr;justify-content:center;align-items:flex-end;gap:.35rem;margin:1rem 0;padding:.5rem;border-bottom:6px solid var(--gold-500,#c9a23a)}
.hk-holder{display:grid;place-items:end center;width:2.6rem;height:6.4rem;border:1px dashed var(--border,#8a8a8a88);border-radius:10px;background:transparent;color:inherit;padding:0 0 .2rem;font-size:.75rem}
.hk-holder.is-shamash{height:8rem}
.hk-holder:focus-visible{outline:3px solid var(--accent,#2a6);outline-offset:2px}
.hk-candle{display:block;width:.9rem;height:3.4rem;margin:0 auto;border-radius:3px;background:linear-gradient(#f7f3e8,#d9cfb5)}
.hk-flame{display:block;width:.9rem;height:1.2rem;margin:0 auto .1rem;border-radius:50% 50% 45% 45%;background:radial-gradient(circle at 50% 70%,#fff6c4,#ffb300 60%,#e8590c);}
.hk-blessing{border-inline-start:4px solid var(--gold-500,#c9a23a);padding:.25rem .75rem;margin:.6rem 0}
.hk-timer{font-variant-numeric:tabular-nums;font-size:1.4rem}
.hk-cardface{border:2px solid var(--gold-500,#c9a23a);border-radius:16px;padding:1rem;text-align:center;margin:.75rem 0}
.hk-cardface .hk-he{font-size:2.4rem;display:block}
.hk-forbid{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:.4rem;justify-content:center}
.hk-forbid li{border:1px solid var(--bad,#c44);border-radius:999px;padding:.15rem .6rem;text-decoration:line-through}
.hk-score{display:flex;gap:1rem;flex-wrap:wrap;font-size:1.1rem}
.hk-room{display:grid;gap:4px;direction:rtl}
.hk-room button{min-height:3.4rem;border-radius:10px;border:1px solid var(--border,#8a8a8a55);background:var(--card,#f3f0e8);color:inherit;font-size:.85rem;padding:.2rem}
.hk-room button .hk-ico{display:block;font-size:1.4rem}
.hk-room button.is-checked{opacity:.7}
.hk-room button.is-found{background:var(--good,#cfeedd)}
.hk-swatches{display:flex;flex-wrap:wrap;gap:.5rem}
.hk-swatch{min-width:4.5rem;border-radius:10px;border:2px solid var(--border,#8a8a8a55);padding:.35rem .5rem;color:#1d2b1a}
.hk-swatch[aria-pressed="true"]{outline:3px solid var(--accent,#2a6)}
.hk-paint{display:block;max-width:22rem;margin:.5rem auto}
.hk-paint [data-region]{cursor:pointer;stroke:#333;stroke-width:1.5}
.hk-paint [data-region]:focus{outline:none;stroke:var(--accent,#2a6);stroke-width:4}
.hk-slide{display:grid;gap:4px;direction:rtl;justify-content:center;margin:.5rem auto}
.hk-slide button{width:4rem;height:4rem;font-size:2rem;border-radius:10px;border:1px solid var(--border,#8a8a8a55);background:var(--card,#f3f0e8);color:inherit}
.hk-slide button.is-blank{background:transparent;border-style:dashed}
.hk-keys{display:flex;flex-wrap:wrap;gap:.3rem;direction:rtl;justify-content:center}
.hk-keys button{min-width:2.6rem;min-height:2.6rem;font-size:1.3rem;border-radius:8px}
.hk-slots{display:flex;gap:.3rem;direction:rtl;justify-content:center;font-size:2rem;margin:.5rem 0}
.hk-slots span{min-width:2.2rem;border-bottom:3px solid currentColor;text-align:center}
.hk-candle-meter{height:8rem;width:1.4rem;margin:.25rem auto;border-radius:4px;background:linear-gradient(#f7f3e8,#d9cfb5);transition:height .3s}
@media (prefers-reduced-motion: reduce){.hk-dreidel,.hk-candle-meter{transition:none}}
html[data-calm] .hk-dreidel,html[data-calm] .hk-candle-meter{transition:none}
`;
/** One <style> for all the Hanukkah games, added on first open (on demand; nothing goes into the installed CSS). */
export function injectStyles() {
  try {
    const doc = globalThis.document;
    if (!doc || doc.getElementById?.('hk-games-css')) return;
    const el = doc.createElement('style'); el.id = 'hk-games-css'; el.textContent = CSS;
    (doc.head || doc.body)?.appendChild?.(el);
  } catch { /* styles are optional; the games still work unstyled */ }
}

/** The cast line: Rimon hosts, Ari and Noa play. Pictures are optional (they remove themselves when absent). */
export function castLine(text, pics = ['rimon-face', 'ari-side', 'noa-side']) {
  const alt = { 'rimon-face': 'Rimon', 'rimon-fly': 'Rimon', 'ari-side': 'Ari', 'ari-host': 'Ari', 'noa-side': 'Noa', 'noa-hint': 'Noa' };
  return h('p', { class: 'hk-cast' }, ...pics.map((p) => castArt(p, alt[p] || '', 'hk-cast-pic')), h('span', {}, text));
}

/**
 * The page for a turn-based or party game (the arcade games use createArcade instead).
 * Returns the parts a game fills: { article, status, board, controls, results, destroy }.
 */
/** The game's own cast picture (assets/games/arcade/<id>/env.webp), a plain block above the status line, never behind a control.
 * The page had no backdrop before, so if the file cannot load the picture simply goes away. */
function envPicture(id) {
  const img = h('img', { class: 'game-env arc-env', alt: '', src: `assets/games/arcade/${id}/env.webp`, width: 1600, height: 600, loading: 'lazy', decoding: 'async', 'data-cast-env': id });
  img.addEventListener('error', () => img.remove());
  return img;
}
export function createPage(root, ctx, { id, title, titleHe, blurb, howTo = [], cast = '' }) {
  injectStyles();
  const leaveSfx = sfx.enter(ctx);
  const status = h('p', { class: 'arc-status', role: 'status', 'aria-live': 'polite' }, 'Loading…');
  const board = h('div', { class: 'hk-board', id: `${id}-board` });
  const controls = h('div', { class: 'hk-row hk-controls' });
  const results = h('div', { class: 'hk-results' });
  const best = readBest(ctx, `games.${id}.v1`);
  const article = h('article', { class: 'card game-card hk-card', 'data-game': id },
    h('div', { class: 'hk-eyebrow arc-eyebrow' }, 'HANUKKAH · ', heSpan('חֲנֻכָּה')),
    h('h1', { id: 'view-title', tabindex: '-1' }, title + ' ', heSpan(titleHe)),
    cast ? castLine(cast) : null,
    h('p', { class: 'arc-blurb' }, blurb),
    howTo.length ? h('details', { class: 'arc-howto', open: best?.plays ? undefined : true }, h('summary', {}, 'How to Play'), h('ol', {}, ...howTo.map((s) => h('li', {}, s)))) : null,
    envPicture(id), status, board, controls, results,
    h('p', { class: 'muted arc-foot' }, best?.plays ? `Your best on this device: ${best.best} (played ${best.plays} time${best.plays === 1 ? '' : 's'}).` : 'Scores are saved on this device.'));
  root.replaceChildren(article);
  return {
    article, status, board, controls, results,
    announce(text) { status.textContent = text; },
    destroy() { try { ctx?.audio?.stop?.(); } catch { /* already stopped */ } leaveSfx(); },
  };
}

/** Results card for a page game: score, stars, best, play again, next Hanukkah game, all games. Focus moves to its heading. */
export function pageResults(P, ctx, { id, heading, lines = [], score = 0, stars = 0, onAgain }) {
  const { rec, newBest } = saveBest(ctx, `games.${id}.v1`, score, stars);
  reactRimon(stars >= 2 ? 'highfive' : stars ? 'laugh' : 'wave');
  try { globalThis.document?.dispatchEvent?.(new CustomEvent('alef:game-finished', { detail: { stars } })); } catch { /* optional: XP listens for this */ }
  const next = nextHanukkah(id);
  const hEl = h('h2', { id: `${id}-results-h`, tabindex: '-1' }, heading);
  P.results.replaceChildren(h('section', { class: 'card game-results', 'aria-labelledby': `${id}-results-h` },
    hEl,
    h('p', { class: 'game-stars', 'aria-label': `${stars} of 3 stars` }, '★'.repeat(stars) + '☆'.repeat(3 - stars)),
    ...lines.map((l) => (typeof l === 'string' ? h('p', {}, l) : l)),
    h('p', { class: 'muted' }, newBest ? `New best: ${rec.best}!` : `Your best on this device: ${rec.best} (played ${rec.plays} time${rec.plays === 1 ? '' : 's'}).`),
    h('div', { class: 'row hk-row' },
      h('button', { type: 'button', class: 'btn', onclick: onAgain }, 'Play Again'),
      next ? h('a', { class: 'btn secondary', href: `#/${next.id}` }, `Next: ${next.title}`) : null,
      h('a', { class: 'btn secondary', href: '#/games' }, 'All Games'))));
  try { hEl.focus?.(); } catch { /* no focus in a small DOM */ }
  return rec;
}

/**
 * Arcade-shell mount for a Hanukkah game: loads the Hanukkah words first, then the shared arcade (five levels, HUD, badges,
 * best score per level). setup(A, data) runs for each round.
 */
export function mountHanukkahArcade(spec, setup) {
  return async function mount(root, ctx) {
    injectStyles();
    root.replaceChildren(h('article', { class: 'card game-card arcade' }, h('h1', { id: 'view-title', tabindex: '-1' }, spec.title + ' ', heSpan(spec.titleHe)), h('p', { role: 'status' }, 'Loading the Hanukkah words…')));
    let data = null;
    try { data = await loadHanukkah(ctx, 'words'); } catch { data = null; }
    const A = await createArcade(root, ctx, { needsWords: false, needsLetters: false, ...spec });
    if (!A) return () => {};
    A.onRound((a) => {
      if (!data) { a.announce('The Hanukkah words could not load. Check the connection and open the game again.'); return; }
      setup(a, data);
    });
    return () => A.destroy();
  };
}
