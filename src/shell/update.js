// @ts-check
// Update UX: notice that a new service worker is installed and offer "Reload", never reloading by itself.
//
// HOW IN-PROGRESS WORK SURVIVES (and what does not):
//  - Progress, settings and SRS cards live in localStorage (src/store.js writes synchronously on every change), so a reload loses none.
//  - The route is in the URL hash, so the learner comes back to the same screen.
//  - NOT saved: whatever a view keeps only in memory (an exercise half answered, a recording in progress, a running sprint timer).
//    So nothing here reloads automatically; the banner is a non-modal status with "Reload now" and "Later", and callers can register
//    `beforeReload` hooks (views that can flush state do it there).
//  - sw.js now installs and then WAITS (no skipWaiting in `install`); it takes over only after this module posts SKIP_WAITING
//    (Reload pressed, not mid-exercise) or when every tab is closed. That is the "waiting" state below. "activated" is kept for the
//    other case: the page sees controllerchange without having asked (e.g. a worker from before this change, or another tab's Reload),
//    so lazily imported modules may come from a newer cache than the running page; the banner then offers a plain reload.
//  - Busy guard: the banner's "Reload now" never reloads while an exercise is in progress (see isBusy). The click is remembered, the
//    banner says it will reload when the exercise is finished, and the reload happens only then (route change or idle check).
//    Views mark an exercise in progress with markBusy(true) or a data-busy="true" attribute on their root.
import { storageNotice } from "./settings.data.js";
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
        // the page reloads on controllerchange; if the worker ignores the message (an older sw.js without the handler) say so instead of hanging
        stallTimer = setT(() => { if (reloading) { reloading = false; set("stalled"); } }, STALL_MS);
        return;
      }
      try { g.location?.reload?.(); } catch { /* ignore */ }
    },
    stop() { swc.removeEventListener?.("controllerchange", onControllerChange); if (stallTimer != null) clrT(stallTimer); if (interval != null) (opt.clearInterval ?? ((h) => globalThis.clearInterval(h)))(interval); subs.clear(); },
  };
}

/** Set/clear the "exercise in progress" flag on <body>. Views call this when an exercise starts and when it ends. */
export function markBusy(on, doc = globalThis.document) { try { if (on) doc?.body?.setAttribute("data-busy", "true"); else doc?.body?.removeAttribute("data-busy"); } catch { /* ignore */ } }

/** True while the learner is mid-exercise or has typed an unsent answer. Conservative: when unsure, an unsent text answer counts as busy. */
export function isBusyDefault(doc = globalThis.document) {
  try {
    if (!doc?.querySelector) return false;
    if (doc.querySelector('[data-busy="true"],[data-exercise-active],.exercise-active')) return true;
    for (const el of doc.querySelectorAll?.('textarea, input[type="text"], input:not([type])') || []) {
      if (el.readOnly || el.disabled || el.closest?.('#s-settings, #alef-update-banner, [data-no-busy]')) continue;
      if (String(el.value ?? "").trim() !== "") return true;
    }
  } catch { /* ignore */ }
  return false;
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
  const isBusy = opt.isBusy ?? (() => isBusyDefault(doc));
  let pending = false, poll = null;
  const setT2 = opt.setInterval ?? ((f, ms) => globalThis.setInterval(f, ms));
  const clrT2 = opt.clearInterval ?? ((h) => globalThis.clearInterval(h));
  const stopPoll = () => { if (poll != null) { clrT2(poll); poll = null; } };
  const tryApply = () => { if (!pending) return; if (isBusy()) return; pending = false; stopPoll(); handle.apply({ beforeReload: opt.beforeReload }); };
  const render = (s) => {
    if (s === "idle") { bar.hidden = true; return; }
    msg.textContent = s === "stalled" ? "The update could not be applied from here. Close all ALEF tabs and open it again." : "A new version of ALEF is ready. Reload to use it; your progress is already saved.";
    reload.hidden = s === "stalled"; bar.hidden = false;
  };
  reload.addEventListener("click", () => {
    if (!isBusy()) { handle.apply({ beforeReload: opt.beforeReload }); return; }
    pending = true; msg.textContent = "You are in the middle of an exercise, so ALEF will reload when you finish it. Your progress is already saved.";
    if (poll == null) poll = setT2(tryApply, 2000);
  });
  later.addEventListener("click", () => { pending = false; stopPoll(); bar.hidden = true; });
  const off0 = handle.onChange(render);
  const onHash = () => { tryApply(); };
  try { doc.defaultView?.addEventListener?.("hashchange", onHash); } catch { /* ignore */ }
  const off = () => { off0(); stopPoll(); try { doc.defaultView?.removeEventListener?.("hashchange", onHash); } catch { /* ignore */ } };
  (doc.body || doc.documentElement)?.append(bar);
  render(handle.state());
  return () => { off(); bar.remove?.(); };
}

/**
 * Visible notice (non-modal, polite) when the store cannot save across reloads: private mode, blocked storage, quota.
 * @param {{status:()=>any, onStatus:(fn:Function)=>()=>void}} store
 * @returns {() => void} remove
 */
export function mountStorageNotice(store, opt = {}) {
  const doc = opt.document ?? globalThis.document;
  if (!doc || !store?.status || !store?.onStatus) return () => {};
  const bar = doc.createElement("div");
  bar.setAttribute("id", "alef-storage-notice"); bar.setAttribute("role", "status"); bar.setAttribute("aria-live", "polite"); bar.hidden = true;
  bar.setAttribute("style", "position:fixed;inset-inline:0;inset-block-start:0;z-index:50;padding:.6rem 1rem;background:var(--card,#fff);color:inherit;border-block-end:2px solid var(--warn,#a60);text-align:center");
  const msg = doc.createElement("span"); const link = doc.createElement("a"); link.setAttribute("href", "#/settings"); link.textContent = " Back up now";
  bar.append(msg, link);
  const render = () => { const m = storageNotice(store.status()); msg.textContent = m ? m.split(". ").slice(0, 2).join(". ").replace(/\.?$/, ".") : ""; bar.hidden = !m; };
  const off = store.onStatus(render);
  (doc.body || doc.documentElement)?.append(bar); render();
  return () => { off(); bar.remove?.(); };
}

/** Convenience for src/app.js: watch and show the banner (plus the storage notice when a store is given or window.alef.store exists). Never throws. */
export function startUpdateBanner(opt = {}) {
  try {
    const st = opt.store ?? globalThis.alef?.store; let rmN = () => {}; try { if (st) rmN = mountStorageNotice(st, opt); } catch { /* ignore */ }
    const handle = watchForUpdates(globalThis, opt); const rmB = mountUpdateBanner(handle, opt);
    return { handle, remove() { rmB(); rmN(); } };
  } catch { return { handle: null, remove() {} }; }
}
