/**
 * Start the engaged-time streak timer for the running app. Call once after the router starts:
 *   import { startMorning } from './morning/boot.js'; startMorning({ store, audio });
 * Listens (passively, same-origin, nothing leaves the device) to visibilitychange, pagehide, pointer/key/touch and hashchange.
 */
import { createEngagement, isCountedRoute } from "./engage.js";
import { createMorningModel } from "./model.js";

export function startMorning(ctx, env = globalThis) {
  const clock = () => Date.now();
  const model = createMorningModel(ctx.store, () => new Date());
  const eng = createEngagement(model.io, { extraRest: () => model.extraRest() });
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
  return { engine: eng, model, stop() { win.clearInterval(timer); eng.flush(clock()); } };
}
