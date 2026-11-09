/**
 * Start the engaged-time streak timer for the running app. Call once before the router starts so streak migration precedes learner actions:
 *   import { startMorning } from './morning/boot.js'; startMorning({ store, audio });
 * Listens (passively, same-origin, nothing leaves the device) to visibilitychange, pagehide, pointer/key/touch and hashchange.
 */
import { createEngagement, isCountedRoute } from "./engage.js";
import { createMorningModel } from "./model.js";
import { nudgeDue, showNudge, NUDGE_DELAY_MS } from "./nudge.js";

export function startMorning(ctx, env = globalThis) {
  const clock = () => Date.now();
  const model = createMorningModel(ctx.store, () => new Date());
  const eng = createEngagement(model.io, { visible: env.document?.visibilityState !== "hidden", extraRest: () => model.extraRest() });
  model.syncRecord();
  eng.resume(clock());
  const doc = env.document, win = env;
  const route = () => eng.setRoute(isCountedRoute(win.location.hash), clock());
  const on = (t, ev, fn, o) => t.addEventListener(ev, fn, o);
  on(win, "hashchange", route);
  on(doc, "visibilitychange", () => eng.setVisible(doc.visibilityState !== "hidden", clock()));
  on(win, "pagehide", () => eng.flush(clock()));
  for (const ev of ["pointerdown", "keydown", "touchstart", "wheel"]) on(doc, ev, () => eng.interact(clock()), { passive: true, capture: true });
  const timer = win.setInterval(() => eng.tick(clock()), 1000);
  route();
  // Friendly streak nudge, once a day, not on the first visit (no streak yet) and never during a rest day.
  const nudge = () => {
    try {
      if (!doc || doc.visibilityState === "hidden") return;
      const n = nudgeDue(new Date(), model.record(), model.prefs(), { observant: model.observant(), mode: model.mode(), extraRest: model.extraRest() });
      if (n.show && showNudge(doc, n.count)) model.markRescueShown();
    } catch { /* never block the app */ }
  };
  const nudgeTimer = win.setTimeout?.(nudge, NUDGE_DELAY_MS);
  return { engine: eng, model, stop() { win.clearInterval(timer); win.clearTimeout?.(nudgeTimer); eng.flush(clock()); } };
}
