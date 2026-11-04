// @ts-check
// ALEF lane 2: per-letter tracing progress persisted through ctx.store (key `letters.progress`).
// Shape: { [letterId]: { print?: Entry, cursive?: Entry } }, Entry = { completions, perfect, bestMistakes, last }  (last = ISO date string)
// "completed" means: the learner finished all strokes at least once in that script (forced/shown strokes still count as completion;
// "perfect" counts zero-mistake runs). Works with any store exposing get(key, fallback) / set(key, value); without a store it is in-memory only.

export const PROGRESS_KEY = 'letters.progress';

/** @param {any} store */
export function createProgress(store) {
  /** @type {Record<string, any>} */
  let mem = {};
  const read = () => {
    if (!store || typeof store.get !== 'function') return mem;
    try { const v = store.get(PROGRESS_KEY, {}); return v && typeof v === 'object' ? v : {}; } catch { return mem; }
  };
  const write = (v) => { mem = v; if (store && typeof store.set === 'function') { try { store.set(PROGRESS_KEY, v); } catch { /* store is best-effort */ } } };
  return {
    /** @param {string} id @param {'print'|'cursive'} script @param {{perfect?: boolean, totalMistakes?: number}} [info] @param {Date} [now] */
    record(id, script, info = {}, now = new Date()) {
      const all = read(); const rec = all[id] || (all[id] = {});
      const e = rec[script] || (rec[script] = { completions: 0, perfect: 0, bestMistakes: null, last: null });
      e.completions++; if (info.perfect) e.perfect++;
      const m = Number.isFinite(info.totalMistakes) ? /** @type {number} */ (info.totalMistakes) : (info.perfect ? 0 : null);
      if (m !== null && (e.bestMistakes === null || m < e.bestMistakes)) e.bestMistakes = m;
      e.last = now.toISOString(); write(all); return e;
    },
    /** a walk-through with the "Next stroke" buttons (no drawing). Kept apart from `completions`, so it never counts as drawn. */
    recordAssisted(id, script, now = new Date()) {
      const all = read(); const rec = all[id] || (all[id] = {});
      const e = rec[script] || (rec[script] = { completions: 0, perfect: 0, bestMistakes: null, last: null });
      e.assisted = (e.assisted || 0) + 1; e.lastAssisted = now.toISOString(); write(all); return e;
    },
    /** @param {string} id @param {'print'|'cursive'} script */
    isAssisted(id, script) { const r = read()[id]; return !!(r && r[script] && r[script].assisted > 0); },
    /** @param {string} id @param {'print'|'cursive'} [script] omit = either script */
    isCompleted(id, script) { const r = read()[id]; if (!r) return false; return script ? !!(r[script] && r[script].completions > 0) : !!((r.print && r.print.completions) || (r.cursive && r.cursive.completions)); },
    /** @param {string} id */ get(id) { return read()[id] || null; },
    /** number of letters completed in a script (or either) */
    count(script) { return Object.keys(read()).filter(id => this.isCompleted(id, script)).length; },
    reset() { write({}); }
  };
}
