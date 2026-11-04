// @ts-check
// "Install ALEF" card (#/install). mount(root, ctx) => unmount. Uses ctx.installPrompt (from src/app.js) when it has a saved
// beforeinstallprompt event, else this module's own capture. Dismissal is stored under "install.v1" for 30 days.
// Tests inject ctx.install (the install.js surface), ctx.platformGlobal and ctx.now.
import { el } from "../curriculum/dom.js";
import * as defaultInstall from "./install.js";

const CSS = `
.alef-install{max-inline-size:36rem;margin-inline:auto;overflow-wrap:anywhere}
.alef-install *{box-sizing:border-box;max-inline-size:100%}
.alef-install .in-card{border:1px solid var(--border,#999);border-radius:12px;padding:1rem;background:var(--card,#fff);margin-block:1rem}
.alef-install .in-row{display:grid;gap:.5rem;margin-block:.75rem}
.alef-install button.btn{min-block-size:var(--tap,48px);inline-size:100%;white-space:normal;text-align:center}
.alef-install ol{padding-inline-start:1.4rem}
.alef-install .muted{color:var(--muted,#555);font-size:.9rem}
`;
function injectStyle() {
  try { if (!document.head || document.getElementById?.("alef-install-style")) return; const s = document.createElement("style"); s.id = "alef-install-style"; s.textContent = CSS; document.head.append(s); } catch { /* optional */ }
}

/** Focus the heading only if nothing else has focus yet: this runs after async loading, and must not pull focus back from a keyboard user who already moved on. */
function focusHeadingIfIdle(h1) {
  try { const a = globalThis.document?.activeElement; if (!a || a === globalThis.document.body || a === h1 || a.id === "main") h1?.focus?.(); } catch { /* ignore */ }
}
/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  injectStyle();
  /** @type {typeof defaultInstall} */
  const I = ctx?.install || defaultInstall;
  const g = ctx?.platformGlobal || globalThis;
  const now = ctx?.now || (() => Date.now());
  const own = I.captureInstallPrompt(g);
  const wrap = el("section", { class: "alef-install", "aria-labelledby": "view-title" });
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, "Install ALEF");
  const body = el("div", { class: "in-body" });
  const status = el("p", { role: "status", "aria-live": "polite" });
  wrap.append(h1, body, status);
  root.append(wrap);

  let alive = true, state = I.normalizeState(null), force = false;
  const canPrompt = () => !!(ctx?.installPrompt?.available?.() || own.available());
  const doPrompt = async () => {
    if (ctx?.installPrompt?.available?.()) { await ctx.installPrompt.prompt(); return; } // app.js owns that event
    return own.prompt();
  };

  function render() {
    if (!alive) return;
    const st = I.installStatus({ platform: I.detectPlatform(g), canPrompt: canPrompt(), state, now: now(), force, installed: own.installed() });
    const kids = [];
    if (st.mode === "installed") {
      kids.push(el("div", { class: "in-card", id: "in-installed" }, el("p", {}, "ALEF is installed on this device. You are all set."),
        el("p", { class: "muted" }, "Installed apps open without the browser bars and can show study reminders on iPhone and iPad.")));
    } else if (!st.show) {
      kids.push(el("p", {}, "You chose not to install for now."),
        el("div", { class: "in-row" }, el("button", { type: "button", class: "btn secondary", id: "in-showagain", onclick: () => { force = true; render(); } }, "Show the install steps again")));
    } else {
      const card = el("div", { class: "in-card", id: "in-card", "data-mode": st.mode });
      card.append(el("p", {}, "Put ALEF on your home screen so it opens like an app, works offline, and can remind you to study."));
      if (st.mode === "prompt") {
        card.append(el("div", { class: "in-row" }, el("button", { type: "button", class: "btn", id: "in-install", onclick: async () => {
          const r = await doPrompt();
          if (r === "accepted") { await I.markInstalled(ctx?.store, now()); state = await I.loadState(ctx?.store); status.textContent = "Installing. Open ALEF from your home screen or app list."; }
          else status.textContent = "Install cancelled. You can try again any time.";
          render();
        } }, "Install ALEF")));
      } else if (st.mode === "ios-safari" || st.mode === "ios-other") {
        if (st.mode === "ios-other") card.append(el("p", { class: "muted", id: "in-ios-other" }, "You seem to be in a browser other than Safari. The steps below are for Safari; other iPhone browsers may or may not offer \"Add to Home Screen\" in their share menu. If you do not see it, open this page in Safari."));
        card.append(el("ol", { id: "in-ios-steps" }, I.IOS_STEPS.map((s) => el("li", {}, s))));
      } else {
        card.append(el("p", { id: "in-manual" }, "Use your browser's menu and look for \"Install app\" or \"Add to Home screen\". This browser has not offered a one-tap install."));
      }
      card.append(el("div", { class: "in-row" }, el("button", { type: "button", class: "btn secondary", id: "in-dismiss", onclick: async () => {
        state = await I.dismiss(ctx?.store, now()); force = false; status.textContent = "Okay. We will not ask again for a month."; render();
      } }, "Not now")));
      kids.push(card);
    }
    body.replaceChildren(...kids);
  }

  const off = own.onChange(() => render());
  (async () => { state = await I.loadState(ctx?.store); if (alive) { render(); focusHeadingIfIdle(h1); } })();
  return () => { alive = false; off(); own.stop(); };
}
