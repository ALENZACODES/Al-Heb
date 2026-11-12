// @ts-check
// Level requirements and the recommended next game (D2), for the nine-level ladder on the games page. Every level stays open
// (the games page says so); a requirement says when a learner is READY for the next level, and the recommendation points at a
// game on the lowest level not yet met. The rule is measured only from scores saved on this device. Pure: no DOM.
import { LEVEL_DESCRIPTIONS } from './wordfinder.model.js';

export const GAMES_FOR_NEXT = 2;
export const LEVEL_RULE = `You are ready for the next level when ${GAMES_FOR_NEXT} different games at this level have each given you one star or more. Every level stays open; this only guides the recommendation.`;

/** The nine levels: { level, focus, requirement } (requirement: what opens the NEXT level). */
export const LEVELS9 = Object.freeze(LEVEL_DESCRIPTIONS.map((focus, i) => Object.freeze({
  level: i + 1, focus,
  requirement: i + 1 < LEVEL_DESCRIPTIONS.length ? `Ready for level ${i + 2}: one star or more in ${GAMES_FOR_NEXT} level ${i + 1} games.` : 'The top level: no level after it.',
})));

/**
 * Progress on each level. games: the library's 9-level games ({id, level}); states: id -> {played, stars, mastered}.
 * @returns {{level:number, games:number, starred:number, met:boolean}[]}
 */
export function levelProgress(games, states) {
  return LEVELS9.map(({ level }) => {
    const at = games.filter((g) => g.ladder === 9 && g.level === level);
    const starred = at.filter((g) => (states[g.id]?.stars || 0) >= 1).length;
    return { level, games: at.length, starred, met: starred >= Math.min(GAMES_FOR_NEXT, at.length) && at.length > 0 };
  });
}

/**
 * The recommended next game: on the lowest level whose requirement is not met, an unplayed game first, then a played game
 * without a star, then any game not mastered. When every level is met, a game not yet mastered at the highest level that has one.
 * @returns {{game:any, level:number, why:string}|null}
 */
export function recommendNext(games, states) {
  const prog = levelProgress(games, states);
  const at = (l) => games.filter((g) => g.ladder === 9 && g.level === l);
  const pick = (list) => list.find((g) => !states[g.id]?.played) || list.find((g) => (states[g.id]?.stars || 0) < 1) || list.find((g) => !states[g.id]?.mastered) || null;
  const open = prog.find((p) => !p.met && p.games > 0);
  if (open) {
    const game = pick(at(open.level));
    if (game) return { game, level: open.level, why: `Level ${open.level}: ${open.starred} of ${GAMES_FOR_NEXT} games with a star so far.` };
  }
  for (let l = LEVELS9.length; l >= 1; l--) {
    const g = at(l).find((x) => !states[x.id]?.mastered);
    if (g) return { game: g, level: l, why: `Every level's requirement is met. ${g.title} at level ${l} is not mastered yet.` };
  }
  return null;
}
