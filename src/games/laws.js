// Shared loader for the three law games (data/games/mitzvot.json).
const URL_ = new URL('../../data/games/mitzvot.json', import.meta.url);
let cache = null;
export async function loadLaws(ctx) {
  if (cache) return cache;
  const f = ctx?.fetchFn || ctx?.fetch || globalThis.fetch;
  const res = await f(URL_);
  if (!res.ok) throw new Error(`could not load data/games/mitzvot.json: HTTP ${res.status}`);
  cache = await res.json();
  return cache;
}
export const LAWS_NOTICE = 'Draft content: the lists follow the traditional enumerations but have not been reviewed by a rabbi or Hebrew educator.';
