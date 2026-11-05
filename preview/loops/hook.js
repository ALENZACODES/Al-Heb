// Called from the intermediate lesson summary (preview tier) after a lesson is saved as finished. Loaded on demand by dynamic
// import; if the import or anything here fails, the lesson summary is unaffected (the caller ignores errors).
import { h } from '../../src/shell/ui.js';
import { quietNow, streakVisible } from '../../src/shell/comfort.js';
import { celebrationPlan, celebrationNode, ensureStyle } from './celebrate.js';
import { noteLesson, buildModel } from './sync.js';

/** @returns {HTMLElement|null} the celebration card to append, or null when nothing should be shown */
export function lessonFinished(ctx, { lessonId, now = Date.now(), doc = globalThis.document } = {}) {
  if (!ctx || !ctx.store || !lessonId) return null;
  const { rec, snap, before, after } = noteLesson(ctx.store, lessonId, now);
  const m = buildModel(rec, snap, now);
  const settings = ctx.settings;
  const quiet = quietNow(settings);
  const plan = celebrationPlan({ quiet, before, after, goal: m.goal, soundOn: !!(settings && settings.get && settings.get('soundEffects') === true), rhythmLine: streakVisible(ctx) ? m.rhythmLine : null });
  ensureStyle(doc);
  if (plan.sound && ctx.sfx && typeof ctx.sfx.play === 'function') { try { ctx.sfx.play(plan.sound); } catch { /* no sound is fine */ } }
  return celebrationNode(h, plan);
}
