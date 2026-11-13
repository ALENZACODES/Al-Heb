// @ts-check
// Local ratings (R8): one to five stars for any lesson, game or book, for the learner's own use. Kept on this device with
// the rest of this learner's data, never sent anywhere and never shown to anyone else. The ratings steer "more like the
// ones you rated 5". No DOM.
export const RATINGS_KEY = 'ratings.v1';
export const KINDS = Object.freeze(['lesson', 'game', 'book']);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,47}$/;
export const emptyRatings = () => ({ v: 1, items: {} });
const norm = (state) => { const s = { ...emptyRatings(), ...obj(state) }; s.items = { ...obj(s.items) }; return s; };
const key = (kind, id) => `${kind}:${id}`;

/** Sets a rating (1 to 5), or clears it with 0. */
export function rate(state, kind, id, stars, now = Date.now()) {
  const s = norm(state);
  if (!KINDS.includes(kind) || !ID.test(String(id))) return s;
  const n = Math.floor(Number(stars));
  if (!(n >= 1 && n <= 5)) delete s.items[key(kind, id)]; else s.items[key(kind, id)] = { stars: n, at: now };
  return s;
}
export const ratingOf = (state, kind, id) => norm(state).items[key(kind, id)]?.stars || 0;
/** Every rating of one kind, best first, then newest. */
export function rated(state, kind) {
  return Object.entries(norm(state).items).filter(([k]) => k.startsWith(kind + ':')).map(([k, v]) => ({ id: k.slice(kind.length + 1), stars: v.stars, at: v.at })).sort((a, b) => b.stars - a.stars || b.at - a.at);
}

/**
 * "More like the ones you rated 5": games the learner has not rated that share a level with a five-star game, nearest in
 * the games list first. Games rated 1 or 2 pull their own level down the list. Nothing is suggested until something has
 * five stars. @param {{id:string, title:string, level:number, tag?:string}[]} games @param {Set<string>|string[]} [played]
 */
export function moreLikeGames(state, games, played = [], limit = 5) {
  const mine = new Map(rated(state, 'game').map((r) => [r.id, r.stars]));
  const fives = games.filter((g) => mine.get(g.id) === 5);
  if (!fives.length) return [];
  const likedLevels = new Map(), dislikedLevels = new Map();
  for (const g of games) { const st = mine.get(g.id); if (st === 5) likedLevels.set(g.level, (likedLevels.get(g.level) || 0) + 1); else if (st && st <= 2) dislikedLevels.set(g.level, (dislikedLevels.get(g.level) || 0) + 1); }
  const seen = new Set(played);
  const index = new Map(games.map((g, i) => [g.id, i]));
  return games.filter((g) => !mine.has(g.id) && likedLevels.has(g.level))
    .map((g) => ({ g, score: 2 * likedLevels.get(g.level) - (dislikedLevels.get(g.level) || 0) + (seen.has(g.id) ? 0 : 1), near: Math.min(...fives.map((f) => Math.abs(index.get(f.id) - index.get(g.id)))) }))
    .sort((a, b) => b.score - a.score || a.near - b.near)
    .slice(0, limit).map(({ g }) => ({ id: g.id, title: g.title, level: g.level, why: `Level ${g.level}, like ${fives.filter((f) => f.level === g.level)[0].title}, which you gave 5 stars` }));
}
/** Books and lessons: the ones right after a five-star one that the learner has not rated yet (ids in shelf or course order). */
export function nextAfterFives(state, kind, orderedIds, limit = 3) {
  const mine = new Map(rated(state, kind).map((r) => [r.id, r.stars]));
  const out = [];
  orderedIds.forEach((id, i) => { if (mine.get(id) === 5) { const next = orderedIds.slice(i + 1).find((x) => !mine.has(x)); if (next && !out.includes(next)) out.push(next); } });
  return out.slice(0, limit);
}
