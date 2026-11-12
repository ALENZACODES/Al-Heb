// @ts-check
// Tournament (#/tournament, D5): this week's five arcade games at level 1, played in a row, one combined score, and the week's
// board of the runs finished on this device. The rules and the record are in src/games/tournament.js; the arcade shell
// (src/games/arcade.js) counts a round toward the run when the game was opened from here.
import { h, heSpan } from '../shell/ui.js';
import { ARCADE_GAMES } from './arcade.catalog.js';
import { TOURNEY_KEY, TOURNEY_GAMES, TOURNEY_LEVEL, weekKey, weekGames, startRun, nextGameId, leaderboard, tourneyShareText } from './tournament.js';
import { shareBlock } from './sharecard.js';
import { injectStyles } from './library.view.js';

export const STORE_KEY = TOURNEY_KEY;
const titleOf = (id) => ARCADE_GAMES.find((g) => g.id === id)?.title || id;
const heOf = (id) => ARCADE_GAMES.find((g) => g.id === id)?.titleHe || '';
const when = (t) => { try { return new Date(t).toLocaleString('en-CA', { weekday: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

export function mount(root, ctx) {
  injectStyles();
  const now = ctx?.now ? ctx.now() : new Date();
  const week = weekKey(now);
  const get = () => { try { return ctx?.store?.get?.(TOURNEY_KEY) || null; } catch { return null; } };
  const put = (v) => { try { ctx?.store?.set?.(TOURNEY_KEY, v); return true; } catch { return false; } };
  const body = h('div', {});
  const status = h('p', { role: 'status', 'aria-live': 'polite', class: 'muted' }, '');
  function paint() {
    const t = get(), run = t?.run && t.run.week === week ? t.run : null, games = run ? run.games : weekGames(week);
    const next = nextGameId(t, week);
    const board = leaderboard(t, week);
    const list = h('ol', {}, ...games.map((id, i) => h('li', {}, h('strong', {}, titleOf(id)), ' ', heSpan(heOf(id)),
      run && i < run.scores.length ? ` — ${run.scores[i]} points` : run && i === run.scores.length ? ' — next' : '')));
    const start = h('button', { type: 'button', class: 'btn', onclick: () => {
      if (run && run.scores.length && !globalThis.confirm?.('Start over? The run in progress will not be kept.')) return;
      put(startRun(get(), week, Date.now())); status.textContent = 'A new run has started. Play the first game.'; paint();
    } }, run ? 'Start over' : 'Start this week\'s run');
    body.replaceChildren(
      h('p', {}, `This week (${week}) the tournament is these ${TOURNEY_GAMES} games, each at level ${TOURNEY_LEVEL}, with the same board for each game all week. Your combined score is the sum of the five rounds.`),
      list,
      run ? h('p', {}, `Your run: ${run.scores.length} of ${run.games.length} games played, ${run.scores.reduce((a, b) => a + b, 0)} points so far.`) : null,
      next ? h('p', {}, h('a', { class: 'btn', href: `#/${next}?tournament=1&level=${TOURNEY_LEVEL}` }, `Play game ${run.scores.length + 1}: ${titleOf(next)}`)) : null,
      h('p', {}, start),
      h('h2', {}, 'This Week\'s Board'),
      h('p', { class: 'muted' }, 'Runs finished on this device this week. There are no accounts and no other players\' scores here.'),
      board.length ? h('ol', { class: 'gb-board' }, ...board.map((r) => h('li', {}, `${r.total} points`, h('span', { class: 'muted' }, ` (${r.scores.join(' + ')}) · ${when(r.at)}`))))
        : h('p', {}, 'No finished runs this week yet.'),
      board.length ? shareBlock(h, { title: 'Aleph Tournament', lines: [`Week ${week}`, `Best run: ${board[0].total} points`], text: tourneyShareText({ week, total: board[0].total, scores: board[0].scores, titles: board[0].games.map(titleOf) }), file: `aleph-tournament-${week}.png` }) : null);
  }
  root.replaceChildren(h('article', { class: 'gb-lib' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Games Tournament'),
    h('p', {}, h('a', { href: '#/game-library' }, '← Games Library')), body, status));
  paint();
  return () => {};
}
