// @ts-check
// What the shared arcade shell (src/games/arcade.js) does for the daily challenge (D3), tournament runs (D5) and the score
// ledger (D4) at the start and end of a round. Kept here so arcade.js only gains a few lines.
import { recordScore } from './scores.js';
import { DAILY_KEY, noteDaily, dailyGameId, shareText } from './daily.js';
import { TOURNEY_KEY, TOURNEY_LEVEL, weekKey, nextGameId, noteRound, tourneyShareText } from './tournament.js';
import { seededRandom, seedFrom, dayKey } from './arcade.model.js';
import { ARCADE_GAMES } from './arcade.catalog.js';
import { shareBlock } from './sharecard.js';

const q = (ctx) => ({ ...(ctx?.query || {}), ...(ctx?.route?.query || {}) });
const get = (ctx, k) => { try { return ctx?.store?.get?.(k) ?? null; } catch { return null; } };
const set = (ctx, k, v) => { try { ctx?.store?.set?.(k, v); } catch { /* storage full or blocked: the round still ends */ } };
const titleOf = (id) => ARCADE_GAMES.find((g) => g.id === id)?.title || id;

/** How a game was opened: ?daily=1 turns the daily board on; ?tournament=1 plays the open run's next game at level 1. */
export function roundMode(ctx, id, now = new Date()) {
  const query = q(ctx);
  const week = weekKey(now);
  const tournament = query.tournament === '1' && nextGameId(get(ctx, TOURNEY_KEY), week) === id;
  return { daily: query.daily === '1' && !tournament, tournament, week, level: tournament ? TOURNEY_LEVEL : null };
}

/** The tournament board seed (same board for the same game all week). */
export const tournamentRandom = (id, week) => seededRandom(seedFrom(`${id}|${week}|tournament`));

/**
 * After a finished round: write the score ledger, then the daily and tournament records. Returns nodes for the results card.
 * @param {Function} h
 * @param {any} ctx
 * @param {{id:string, level:number, score:number, stars:number, daily:boolean, tournament:boolean, week:string, now?:number}} r
 */
export function afterRound(h, ctx, r) {
  const now = r.now ?? Date.now();
  recordScore(ctx?.store, r.id, r.score, r.stars, now);
  const nodes = [];
  if (r.daily) {
    const day = dayKey(new Date(now));
    const out = noteDaily(get(ctx, DAILY_KEY), { day, id: r.id, level: r.level, score: r.score, stars: r.stars, at: now });
    if (out.counted) {
      set(ctx, DAILY_KEY, out.record);
      const text = shareText({ day, title: titleOf(r.id), level: r.level, score: r.score, stars: r.stars });
      nodes.push(h('section', { class: 'gb-daily-done', 'aria-label': 'Daily challenge score' },
        h('p', {}, `Your daily challenge score for ${day} is in: ${r.score} points at level ${r.level}. Rounds you play after this today are practice.`),
        shareBlock(h, { title: 'Aleph Daily Challenge', lines: [day, `${titleOf(r.id)} · level ${r.level}`, `${r.score} points ${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}`], text, file: `aleph-daily-${day}.png` })));
    } else if (out.reason === 'already') {
      nodes.push(h('p', { class: 'muted gb-daily-done' }, `Practice round. Your daily challenge score for today is already in: ${out.entry.score} points at level ${out.entry.level}.`));
    } else {
      nodes.push(h('p', { class: 'muted gb-daily-done' }, `Daily board, practice only: today's daily challenge is ${titleOf(dailyGameId(day))}.`));
    }
  }
  if (r.tournament) {
    const out = noteRound(get(ctx, TOURNEY_KEY), r.week, r.id, r.score, now);
    if (out.counted) {
      set(ctx, TOURNEY_KEY, out.state);
      if (out.done) {
        const last = out.state.runs[out.state.runs.length - 1];
        const titles = last.games.map(titleOf);
        nodes.push(h('section', { class: 'gb-tourney-done' },
          h('p', {}, `Tournament finished: ${out.total} points over ${last.scores.length} games.`),
          h('p', {}, h('a', { class: 'btn', href: '#/tournament' }, 'See this week\'s board')),
          shareBlock(h, { title: 'Aleph Tournament', lines: [`Week ${r.week}`, `${out.total} points`, `${last.scores.length} games at level ${TOURNEY_LEVEL}`], text: tourneyShareText({ week: r.week, total: out.total, scores: last.scores, titles }), file: `aleph-tournament-${r.week}.png` })));
      } else {
        const next = nextGameId(out.state, r.week);
        nodes.push(h('p', { class: 'gb-tourney-next' }, `Tournament: game ${out.step} of ${out.state.run.games.length} done, ${out.total} points so far. `,
          next ? h('a', { class: 'btn', href: `#/${next}?tournament=1&level=${TOURNEY_LEVEL}` }, `Next game: ${titleOf(next)}`) : null));
      }
    }
  }
  return nodes;
}
