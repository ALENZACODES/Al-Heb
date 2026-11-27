// @ts-check
// One write path for "this game was played" (27 Nov 2026 review: 60 games were played, Progress said 5).
// Every game saves a record when a round FINISHES, but most games have no end the learner reaches in a short visit, so a
// played game often left no trace in Progress, the Games Library or Awards. This watcher sits in the shell, above every game:
// when the learner leaves a game they actually played (enough taps or keys, enough time) and the game itself saved nothing
// during the visit, it writes one play to the same two places the finished-round savers use: games.<id>.v1 (plays + 1, which
// Awards reads) and the games.scores.v1 ledger (which Progress and the Library read). No score, stars or badges are invented:
// those still need a finished round. Never throws.
import { SCORES_KEY } from './scores.js';

export const MIN_ACTIONS = 4;      // clicks or key presses inside the game
export const MIN_MS = 12000;       // time on the game page
const nat = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

/** Did this visit count as a play that still needs recording? Pure. */
export function shouldRecord({ actions, ms, before, after }) {
  if (nat(actions) < MIN_ACTIONS || nat(ms) < MIN_MS) return false;
  return JSON.stringify(before ?? null) === JSON.stringify(after ?? null); // the game saved its own record: nothing to add
}

/** The two records after one unfinished play. Pure. */
export function notePartialPlay(rec, ledger, id, now = Date.now()) {
  const r = obj(rec), led = { ...obj(ledger) }, was = obj(led[id]);
  const plays = Math.max(nat(r.plays), nat(was.plays)) + 1;
  led[id] = { ...was, best: nat(was.best), plays, lastAt: Number(now) || 0, bestStars: nat(was.bestStars) };
  return { rec: { ...r, plays }, ledger: led };
}

const routeId = (hash) => String(hash || '').replace(/^#\/?/, '').split(/[/?]/)[0];

/**
 * Watch game visits. isGame(id) says whether a route is a game (async, so the catalogue loads only when needed).
 * @param {{store:any, isGame:(id:string)=>Promise<boolean>|boolean, win?:any, doc?:any, now?:()=>number}} o
 */
export function installPlayTracker({ store, isGame, win = globalThis.window, doc = globalThis.document, now = () => Date.now() }) {
  let visit = null;
  const snap = (id) => { try { return [store.get(`games.${id}.v1`) ?? null, obj(store.get(SCORES_KEY))[id] ?? null]; } catch { return [null, null]; } };
  const open = () => { const id = routeId(win.location?.hash); visit = id ? { id, at: now(), actions: 0, before: snap(id) } : null; };
  const close = () => {
    const v = visit; visit = null;
    if (!v || !shouldRecord({ actions: v.actions, ms: now() - v.at, before: v.before, after: snap(v.id) })) return;
    Promise.resolve().then(() => isGame(v.id)).then((yes) => {
      if (!yes) return;
      const out = notePartialPlay(store.get(`games.${v.id}.v1`), store.get(SCORES_KEY), v.id, now());
      store.set(`games.${v.id}.v1`, out.rec); store.set(SCORES_KEY, out.ledger);
    }).catch(() => { /* recording a play is best effort */ });
  };
  const act = (e) => {
    if (!visit || !e?.target?.closest?.('#main')) return;
    if (++visit.actions === MIN_ACTIONS) { try { Promise.resolve(isGame(visit.id)).catch(() => {}); } catch { /* warm-up only */ } } // load the catalogue before the learner leaves
  };
  doc.addEventListener('click', act, true);
  doc.addEventListener('keydown', act, true);
  win.addEventListener('hashchange', () => { close(); open(); });
  win.addEventListener('pagehide', close);
  open();
  return { flush: close };
}
