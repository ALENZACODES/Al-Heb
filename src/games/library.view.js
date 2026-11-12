// @ts-check
// Games Library (#/game-library): every game on the games page in one list, counted once (D1), filtered by skill and by
// played / mastered state, each card with its best and last score (D4) and the part of the course it practises (D9).
// Above the list: today's daily challenge (D3), the level ladder's requirements and a recommended next game (D2), and the
// tournament (D5). Every figure is from this device's saved scores or from the counts module; nothing is sent anywhere.
import { h, heSpan } from '../shell/ui.js';
import { GAMES_ALL, gamesProgress } from '../lib/counts.js';
import { allGames, SECTIONS, SKILLS, SKILL_RULE } from './library.catalog.js';
import { SCORES_KEY, readGameState, scoreLine, MASTERED_RULE } from './scores.js';
import { LEVELS9, LEVEL_RULE, levelProgress, recommendNext } from './levels.js';
import { DAILY_KEY, dailyGame, dailyRun, shareText } from './daily.js';
import { dayKey } from './arcade.model.js';
import { shareBlock } from './sharecard.js';

export const CSS = `
.gb-lib{max-inline-size:60rem;margin-inline:auto}
.gb-lib .gb-filters{display:flex;flex-wrap:wrap;gap:.4rem;margin-block:.5rem}
.gb-lib .gb-filters button{min-block-size:44px}
.gb-lib .gb-grid{list-style:none;padding:0;display:grid;gap:.6rem;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))}
.gb-card{border:1px solid var(--line,#8886);border-radius:10px;padding:.6rem .75rem;display:grid;gap:.25rem}
.gb-card .gb-title{font-weight:700}
.gb-card .gb-meta,.gb-card .gb-score{font-size:.92rem}
.gb-state{display:inline-block;font-size:.8rem;font-weight:700;border-radius:999px;padding:.05rem .5rem;border:1px solid currentColor}
.gb-practice{font-size:.9rem;display:inline-block;margin-block:.2rem}
.gb-hub-score{display:block;font-size:.85rem;margin-block-start:.2rem}
.gb-share .gb-share-text{border-inline-start:4px solid var(--line,#8886);padding-inline-start:.5rem}
.gb-levels{padding-inline-start:1.2rem}
.gb-levels li{margin-block:.25rem}
`;
export function injectStyles() {
  try { const d = globalThis.document; if (!d?.head || d.getElementById?.('gb-lib-css')) return; const s = d.createElement('style'); s.id = 'gb-lib-css'; s.textContent = CSS; d.head.append(s); } catch { /* styles are optional */ }
}

const sectionTitle = (id) => SECTIONS.find((s) => s.id === id)?.title || id;
const skillTitle = (k) => (SKILLS.find(([id]) => id === k) || [k, k])[1];
const readJson = (ctx, k) => { try { return ctx?.store?.get?.(k) ?? null; } catch { return null; } };

/** Per-game states for every game in the list, from one read of the ledger. */
export function statesFor(ctx, games) {
  const led = readJson(ctx, SCORES_KEY) || {};
  return Object.fromEntries(games.map((g) => [g.id, readGameState(ctx?.store, g.id, led)]));
}

/** A state label: 'Mastered', 'Played', or 'Not played yet'. */
export const stateLabel = (st) => (st?.mastered ? 'Mastered' : st?.played ? 'Played' : 'Not played yet');

/** Filter the list. skill: '' or a skill id; state: 'all' | 'new' | 'played' | 'mastered'. */
export function filterGames(games, states, { skill = '', state = 'all' } = {}) {
  return games.filter((g) => (!skill || g.skills.includes(skill)) && (state === 'all'
    || (state === 'new' && !states[g.id]?.played) || (state === 'played' && states[g.id]?.played && !states[g.id]?.mastered) || (state === 'mastered' && states[g.id]?.mastered)));
}

/** One game card. */
export function gameCard(g, st) {
  const line = scoreLine(st);
  return h('li', { class: 'gb-card', 'data-game': g.id },
    h('a', { class: 'gb-title', href: '#/' + g.id }, g.title, g.titleHe ? ' ' : '', g.titleHe ? heSpan(g.titleHe) : null),
    h('span', { class: 'gb-meta muted' }, `${sectionTitle(g.section)} · level ${g.level} of ${g.ladder}`),
    h('span', { class: 'gb-meta' }, 'Skills: ' + g.skills.map(skillTitle).join(', ')),
    h('span', {}, h('span', { class: 'gb-state' }, stateLabel(st)), line ? h('span', { class: 'gb-score' }, ' ' + line) : null),
    g.practice ? h('a', { class: 'gb-practice', href: g.practice.href }, `Practises: ${g.practice.label} →`) : null);
}

function dailyCard(ctx) {
  const day = dayKey(), game = dailyGame(day), rec = readJson(ctx, DAILY_KEY) || {}, mine = rec[day];
  const run = dailyRun(rec, day);
  const sec = h('section', { class: 'card gb-daily', 'aria-labelledby': 'gb-daily-h' }, h('h2', { id: 'gb-daily-h' }, 'Daily Challenge'));
  if (!game) { sec.append(h('p', { class: 'muted' }, 'No daily game today.')); return sec; }
  sec.append(h('p', {}, `Today (${day}): `, h('strong', {}, game.title), ' ', heSpan(game.titleHe), `. One seeded board a day, the same for everyone at the same level. Only your first finished round counts.`));
  if (mine) {
    sec.append(h('p', {}, `Your score today: ${mine.score} points at level ${mine.level}.`),
      shareBlock(h, { title: 'Aleph Daily Challenge', lines: [day, `${game.title} · level ${mine.level}`, `${mine.score} points ${'★'.repeat(mine.stars)}${'☆'.repeat(3 - mine.stars)}`],
        text: shareText({ day, title: game.title, level: mine.level, score: mine.score, stars: mine.stars }), file: `aleph-daily-${day}.png` }));
  } else sec.append(h('p', {}, h('a', { class: 'btn', href: `#/${game.id}?daily=1` }, 'Play today\'s challenge')));
  if (run) sec.append(h('p', { class: 'muted' }, `Daily challenges in a row: ${run}.`));
  return sec;
}

function ladderCard(games, states) {
  const prog = levelProgress(games, states), rec = recommendNext(games, states);
  return h('section', { class: 'card gb-ladder', 'aria-labelledby': 'gb-ladder-h' },
    h('h2', { id: 'gb-ladder-h' }, 'Levels and Your Next Game'),
    rec ? h('p', {}, 'Recommended next: ', h('a', { class: 'btn', href: '#/' + rec.game.id }, rec.game.title), ' ', h('span', { class: 'muted' }, rec.why)) : h('p', {}, 'Every game on the ladder is mastered.'),
    h('p', { class: 'muted' }, LEVEL_RULE),
    h('details', {}, h('summary', {}, 'What each level asks'),
      h('ol', { class: 'gb-levels' }, ...LEVELS9.map((L, i) => h('li', {},
        h('strong', {}, `Level ${L.level}: `), L.focus, ' ', h('span', { class: 'muted' }, L.requirement), ' ',
        h('span', { class: 'gb-state' }, prog[i].met ? 'Ready' : `${prog[i].starred} of ${Math.min(2, prog[i].games)} games with a star`))))));
}

export function mount(root, ctx) {
  injectStyles();
  const games = allGames();
  const states = statesFor(ctx, games);
  const mine = gamesProgress(states);
  let skill = '', state = 'all';
  const grid = h('ul', { class: 'gb-grid', 'aria-label': 'Games' });
  const shown = h('p', { class: 'muted', role: 'status', 'aria-live': 'polite' });
  const skillBar = h('div', { class: 'gb-filters', role: 'group', 'aria-label': 'Skill' });
  const stateBar = h('div', { class: 'gb-filters', role: 'group', 'aria-label': 'Played or not' });
  const STATES = [['all', 'All'], ['new', 'Not played yet'], ['played', 'Played'], ['mastered', 'Mastered']];
  function paint() {
    skillBar.replaceChildren(...[['', 'All skills'], ...SKILLS].map(([id, label]) => h('button', { type: 'button', class: 'btn secondary', 'aria-pressed': skill === id, onclick: () => { skill = id; paint(); } },
      id ? `${label} (${GAMES_ALL.bySkill?.[id] ?? 0})` : label)));
    stateBar.replaceChildren(...STATES.map(([id, label]) => h('button', { type: 'button', class: 'btn secondary', 'aria-pressed': state === id, onclick: () => { state = id; paint(); } }, label)));
    const list = filterGames(games, states, { skill, state });
    grid.replaceChildren(...list.map((g) => gameCard(g, states[g.id])));
    shown.textContent = `Showing ${list.length} of ${GAMES_ALL.total} games.`;
  }
  root.replaceChildren(h('article', { class: 'gb-lib' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Games Library ', heSpan('מִשְׂחָקִים')),
    h('p', {}, `${GAMES_ALL.total} games, each counted once, from every section of the `, h('a', { href: '#/games' }, 'games page'), '.'),
    h('p', { class: 'muted' }, `On this device: ${mine.played} played, ${mine.mastered} mastered. ${MASTERED_RULE}`),
    dailyCard(ctx), ladderCard(games, states),
    h('section', { class: 'card gb-tourney-link' }, h('h2', {}, 'Tournament'), h('p', {}, 'Five arcade games in a row, one combined score, and a weekly board of your own runs on this device. ', h('a', { class: 'btn', href: '#/tournament' }, 'Open the tournament'))),
    h('h2', {}, 'All Games'), h('p', { class: 'muted' }, SKILL_RULE), skillBar, stateBar, shown, grid));
  paint();
  return () => {};
}

/**
 * The games page (#/games) cards: add each game's best and last score, its played / mastered state and its practice link
 * beside the card. Sections that load later are decorated when they arrive (MutationObserver where the browser has one).
 */
export function decorateHub(article, ctx) {
  injectStyles();
  const games = new Map(allGames().map((g) => [g.id, g]));
  const led = readJson(ctx, SCORES_KEY) || {};
  const done = new WeakSet();
  const run = () => {
    for (const a of article.querySelectorAll?.('a.wf-level-tile') || []) {
      if (done.has(a)) continue; done.add(a);
      const id = String(a.getAttribute('href') || '').replace(/^#\//, '').split('?')[0];
      const g = games.get(id); if (!g) continue;
      const st = readGameState(ctx?.store, id, led), line = scoreLine(st);
      if (st.played) a.append(h('span', { class: 'gb-hub-score' }, h('span', { class: 'gb-state' }, stateLabel(st)), line ? ' ' + line : ''));
      if (g.practice && a.parentNode && !a.parentNode.querySelector?.('.gb-practice')) a.parentNode.append(h('a', { class: 'gb-practice', href: g.practice.href }, `Practises: ${g.practice.label} →`));
    }
  };
  run();
  try { const mo = new globalThis.MutationObserver(run); mo.observe(article, { childList: true, subtree: true }); return () => mo.disconnect(); } catch { return () => {}; }
}
