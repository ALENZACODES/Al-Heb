// @ts-check
// Update UX: notice that a new service worker is installed and offer "Reload", never reloading by itself.
//
// HOW IN-PROGRESS WORK SURVIVES (and what does not):
//  - Progress, settings and SRS cards live in localStorage (src/store.js writes synchronously on every change), so a reload loses none.
//  - The route is in the URL hash, so the learner comes back to the same screen.
//  - NOT saved: whatever a view keeps only in memory (an exercise half answered, a recording in progress, a running sprint timer).
//    So nothing here reloads automatically; the banner is a non-modal status with "Reload now" and "Later", and callers can register
//    `beforeReload` hooks (views that can flush state do it there).
//  - Today's sw.js calls skipWaiting() in `install` and clients.claim() in `activate`, so a new worker takes over immediately and the
//    page is already talking to a worker whose cache name differs from the one it loaded from: that is the "activated" state below.
//    Lazily imported modules can then come from the newer cache while the running page is older (mixed versions). docs/offline/SW-PROPOSALS.md
//    proposes switching to a waiting worker plus a SKIP_WAITING message so the learner decides; this module already handles both.
export const SKIP_WAITING_MESSAGE = Object.freeze({ type: "SKIP_WAITING" });
export const STALL_MS = 4000;

/** @typedef {"idle"|"waiting"|"activated"|"stalled"} UpdateState */

/**
 * @param {any} [g] window-like. Needs navigator.serviceWorker; everything optional.
 * @param {{checkEveryMs?:number, setInterval?:Function, clearInterval?:Function, setTimeout?:Function, clearTimeout?:Function, beforeReload?:(()=>any)[]}} [opt]
 * @returns {{supported:boolean, state:()=>UpdateState, onChange:(fn:(s:UpdateState)=>void)=>()=>void, check:()=>Promise<boolean>, apply:(o?:{beforeReload?:(()=>any)[]})=>Promise<void>, stop:()=>void}}
 */
export function watchForUpdates(g = globalThis, opt = {}) {
  const swc = g?.navigator?.serviceWorker;
  let state = /** @type {UpdateState} */ ("idle"), reg = null, waiting = null, reloading = false, stallTimer = null, interval = null;
  const subs = new Set();
  const emit = () => { for (const f of subs) { try { f(state); } catch { /* listener bug */ } } };
  const set = (s) => { if (state !== s) { state = s; emit(); } };
  const setT = opt.setTimeout ?? ((f, ms) => globalThis.setTimeout(f, ms)), clrT = opt.clearTimeout ?? ((h) => globalThis.clearTimeout(h));
  const hadController = !!swc?.controller; // a first-ever install also fires controllerchange; that is not an update

  const inert = { supported: false, state: () => "idle", onChange: () => () => {}, check: async () => false, apply: async () => {}, stop() {} };
  if (!swc) return /** @type {any} */ (inert);

  const track = (r) => {
    if (!r) return; reg = r;
    if (r.waiting && hadController) { waiting = r.waiting; set("waiting"); }
    r.addEventListener?.("updatefound", () => {
      const w = r.installing; if (!w) return;
      w.addEventListener?.("statechange", () => {
        if (w.state === "installed" && swc.controller) { waiting = w; set("waiting"); }
        else if (w.state === "activated" && hadController && state !== "waiting") set("activated");
      });
    });
  };
  const onControllerChange = () => {
    if (reloading) { try { g.location?.reload?.(); } catch { /* ignore */ } return; }
    if (hadController) set("activated"); // a different worker now controls this page
  };
  swc.addEventListener?.("controllerchange", onControllerChange);
  Promise.resolve(swc.getRegistration?.()).then(track).catch(() => {});

  const check = async () => { try { if (!reg) reg = await swc.getRegistration?.(); if (reg && !hadController && !reg.active) return false; await reg?.update?.(); return state !== "idle"; } catch { return false; } };
  if ((opt.checkEveryMs ?? 3600000) > 0) {
    const si = opt.setInterval ?? ((f, ms) => globalThis.setInterval(f, ms));
    interval = si(() => { check(); }, opt.checkEveryMs ?? 3600000);
  }

  return {
    supported: true,
    state: () => state,
    onChange(fn) { subs.add(fn); return () => subs.delete(fn); },
    check,
    async apply(o = {}) {
      for (const h of [...(opt.beforeReload || []), ...(o.beforeReload || [])]) { try { await h(); } catch { /* a hook must not block the reload */ } }
      if (state === "waiting" && waiting) {
        reloading = true;
        try { waiting.postMessage(SKIP_WAITING_MESSAGE); } catch { reloading = false; set("stalled"); return; }
        // the page reloads on controllerchange; if the worker ignores the message (sw.js has no handler today) say so instead of hanging
        stallTimer = setT(() => { if (reloading) { reloading = false; set("stalled"); } }, STALL_MS);
        return;
      }
      try { g.location?.reload?.(); } catch { /* ignore */ }
    },
    stop() { swc.removeEventListener?.("controllerchange", onControllerChange); if (stallTimer != null) clrT(stallTimer); if (interval != null) (opt.clearInterval ?? ((h) => globalThis.clearInterval(h)))(interval); subs.clear(); },
  };
}

/**
 * Banner for any screen. Appends one status region to document.body; hidden until there is an update.
 * "Later" hides it until the state changes again (a second update), it does not disable detection.
 * @returns {() => void} remove
 */
export function mountUpdateBanner(handle, opt = {}) {
  const doc = opt.document ?? globalThis.document;
  if (!doc || !handle?.supported) return () => {};
  const bar = doc.createElement("div");
  bar.setAttribute("id", "alef-update-banner"); bar.setAttribute("role", "status"); bar.setAttribute("aria-live", "polite"); bar.hidden = true;
  bar.setAttribute("style", "position:fixed;inset-inline:0;inset-block-end:0;z-index:50;display:flex;gap:.75rem;align-items:center;justify-content:center;flex-wrap:wrap;padding:.75rem 1rem;background:var(--card,#fff);color:inherit;border-block-start:2px solid var(--accent,#036)");
  const msg = doc.createElement("span");
  const reload = doc.createElement("button"); reload.setAttribute("type", "button"); reload.setAttribute("id", "alef-update-reload"); reload.className = "btn"; reload.textContent = "Reload now";
  const later = doc.createElement("button"); later.setAttribute("type", "button"); later.setAttribute("id", "alef-update-later"); later.className = "btn secondary"; later.textContent = "Later";
  bar.append(msg, reload, later);
  const render = (s) => {
    if (s === "idle") { bar.hidden = true; return; }
    msg.textContent = s === "stalled" ? "The update could not be applied from here. Close all ALEF tabs and open it again." : "A new version of ALEF is ready. Reload to use it; your progress is already saved.";
    reload.hidden = s === "stalled"; bar.hidden = false;
  };
  reload.addEventListener("click", () => { handle.apply({ beforeReload: opt.beforeReload }); });
  later.addEventListener("click", () => { bar.hidden = true; });
  const off = handle.onChange(render);
  (doc.body || doc.documentElement)?.append(bar);
  render(handle.state());
  return () => { off(); bar.remove?.(); };
}

/** Convenience for src/app.js: watch and show the banner. Returns {handle, remove}. Never throws. */
export function startUpdateBanner(opt = {}) {
  try { const handle = watchForUpdates(globalThis, opt); return { handle, remove: mountUpdateBanner(handle, opt) }; }
  catch { return { handle: null, remove() {} }; }
}
