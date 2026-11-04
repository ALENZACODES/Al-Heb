// @ts-check
// "Install ALEF" helper: capture beforeinstallprompt, detect iOS Safari, remember a dismissal under store key "install.v1".
// DOM-free and injectable (global, store, clock) so it runs in Node tests. See docs/install/ROUTES.md.
//  - Chromium (Android, desktop) fires `beforeinstallprompt`; the saved event's prompt() must be called from a click.
//  - iOS/iPadOS Safari has NO install prompt API: the learner uses Share, then "Add to Home Screen". We can only show instructions.
//  - src/app.js already keeps its own copy of the event as ctx.installPrompt; the view prefers that and falls back to this module.
export const INSTALL_KEY = "install.v1";
/** After "Not now" the card stays hidden this long. */
export const DISMISS_DAYS = 30;
const DAY_MS = 86400000;

/** @typedef {{v:1, dismissedAt:number|null, dismissCount:number, installedAt:number|null}} InstallState */
export const DEFAULT_STATE = Object.freeze({ v: 1, dismissedAt: null, dismissCount: 0, installedAt: null });

/** Validate stored state; never throws. @returns {InstallState} */
export function normalizeState(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const ts = (v) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
  return { v: 1, dismissedAt: ts(r.dismissedAt), dismissCount: Number.isInteger(r.dismissCount) && r.dismissCount >= 0 ? r.dismissCount : 0, installedAt: ts(r.installedAt) };
}
export const loadState = async (store) => { try { return normalizeState(store?.get ? await store.get(INSTALL_KEY) : null); } catch { return normalizeState(null); } };
const saveState = async (store, st) => { try { if (store?.set) await store.set(INSTALL_KEY, st); } catch { /* best effort */ } return st; };
export async function dismiss(store, now = Date.now()) { const st = await loadState(store); return saveState(store, { ...st, dismissedAt: now, dismissCount: st.dismissCount + 1 }); }
export async function markInstalled(store, now = Date.now()) { const st = await loadState(store); return saveState(store, { ...st, installedAt: now }); }
export async function resetState(store) { return saveState(store, normalizeState(null)); }

/** Platform facts from a global (navigator, matchMedia). @returns {{ios:boolean, iosSafari:boolean, iosOtherBrowser:boolean, android:boolean, standalone:boolean}} */
export function detectPlatform(g = globalThis) {
  const nav = g?.navigator || {};
  const ua = String(nav.userAgent || "");
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (nav.maxTouchPoints || 0) > 1);
  const other = /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua); // Chrome, Firefox, Edge, Opera, Google app on iOS
  let standalone = false;
  try { standalone = nav.standalone === true || !!g?.matchMedia?.("(display-mode: standalone)")?.matches; } catch { /* ignore */ }
  return { ios, iosSafari: ios && !other, iosOtherBrowser: ios && other, android: /Android/.test(ua), standalone };
}

/**
 * Listen for beforeinstallprompt / appinstalled on `g`. Returns a handle; call once, as early as possible.
 * @returns {{available():boolean, prompt():Promise<"accepted"|"dismissed"|"unavailable">, onChange(fn:Function):()=>void, installed():boolean, stop():void}}
 */
export function captureInstallPrompt(g = globalThis) {
  let ev = null, installed = false;
  const subs = new Set();
  const emit = () => { for (const f of subs) { try { f(); } catch { /* listener bug */ } } };
  const onBip = (e) => { try { e.preventDefault?.(); } catch { /* ignore */ } ev = e; emit(); };
  const onInstalled = () => { installed = true; ev = null; emit(); };
  g?.addEventListener?.("beforeinstallprompt", onBip);
  g?.addEventListener?.("appinstalled", onInstalled);
  return {
    available: () => !!ev,
    installed: () => installed,
    async prompt() {
      const e = ev; if (!e || typeof e.prompt !== "function") return "unavailable";
      ev = null; // a saved event can be used once
      try { e.prompt(); const c = await e.userChoice; emit(); return c?.outcome === "accepted" ? "accepted" : "dismissed"; } catch { emit(); return "dismissed"; }
    },
    onChange(fn) { subs.add(fn); return () => subs.delete(fn); },
    stop() { g?.removeEventListener?.("beforeinstallprompt", onBip); g?.removeEventListener?.("appinstalled", onInstalled); subs.clear(); },
  };
}

/**
 * What the card should show.
 *  mode: "installed" (already standalone / appinstalled) | "prompt" (native prompt available) | "ios-safari" (instructions)
 *      | "ios-other" (iOS non-Safari browser: instructions plus an honest caveat) | "manual" (browser menu; no prompt seen) | "none"
 *  show: false when installed, or dismissed less than DISMISS_DAYS ago (the Settings-style "show anyway" can pass force:true).
 * @param {{platform:ReturnType<typeof detectPlatform>, canPrompt:boolean, state:InstallState, now?:number, force?:boolean, installed?:boolean}} p
 */
export function installStatus(p) {
  const now = p.now ?? Date.now();
  const { platform: pf, state } = p;
  if (pf.standalone || p.installed || state.installedAt) return { mode: "installed", show: false };
  const mode = p.canPrompt ? "prompt" : pf.iosSafari ? "ios-safari" : pf.iosOtherBrowser ? "ios-other" : pf.ios ? "ios-safari" : "manual";
  const hidden = !p.force && state.dismissedAt != null && now - state.dismissedAt < DISMISS_DAYS * DAY_MS;
  return { mode, show: !hidden };
}

/** Steps for the iOS card. Wording matches Apple's published flow (iOS 16.4 and later); not verified on a device here. */
export const IOS_STEPS = Object.freeze([
  "Open ALEF in Safari.",
  "Tap the Share button (the square with an arrow) at the bottom of the screen, or at the top on an iPad.",
  "Scroll down and tap \"Add to Home Screen\".",
  "Tap \"Add\". Then open ALEF from the new icon on your Home Screen.",
]);
