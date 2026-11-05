// Called from the intermediate lesson summary (preview tier) after a lesson is saved as finished. Loaded on demand by dynamic
// import; if the import or anything here fails, the lesson summary is unaffected (the caller ignores errors).
import { h } from '../../src/shell/ui.js';
import { quietNow, streakVisible } from '../../src/shell/comfort.js';
import { celebrationPlan, celebrationNode, ensureStyle } from './celebrate.js';
import { noteLesson, buildModel } from './sync.js';
import { loadCatalog, settle, newBadgeNode } from './badges.view.js';

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
  const node = celebrationNode(h, plan);
  // A badge earned by this lesson is added to the same page as its own calm card, a moment later, once the catalogue is read.
  loadCatalog(ctx).then((cat) => {
    const s = settle(ctx.store, cat, now, { offline: false });
    const made = s && newBadgeNode(h, s, { quiet, soundOn: !!(settings && settings.get && settings.get('soundEffects') === true) });
    const host = node.parentNode || node.parent; if (made && made.node && host) host.append(made.node);
    if (made && made.plan.sound && ctx.sfx && typeof ctx.sfx.play === 'function') { try { ctx.sfx.play(made.plan.sound); } catch { /* no sound is fine */ } }
  }).catch(() => {});
  return node;
}
