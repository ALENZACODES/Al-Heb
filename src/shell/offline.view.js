// @ts-check
// Offline readiness card (#/offline). mount(root, ctx) => unmount.
// Sections: which feature groups are in the offline cache; "Download everything for offline" with progress and failures;
// storage health (browser usage, protect-my-progress button, localStorage near-quota warning with a link to the backup download);
// app version / update check. Tests inject ctx.offline (the offline.js surface), ctx.env {fetch, caches, navigator, localStorage}, ctx.update.
import { el } from "../curriculum/dom.js";
import * as defaultOffline from "./offline.js";

const CSS = `
.alef-offline{max-inline-size:36rem;margin-inline:auto;overflow-wrap:anywhere}
.alef-offline *{box-sizing:border-box;max-inline-size:100%}
.alef-offline .of-card{border:1px solid var(--border,#999);border-radius:12px;padding:1rem;background:var(--card,#fff);margin-block:1rem}
.alef-offline ul{list-style:none;margin:0;padding:0;display:grid;gap:.4rem}
.alef-offline .of-row{display:grid;gap:.5rem;margin-block:.75rem}
.alef-offline button.btn{min-block-size:var(--tap,48px);inline-size:100%;white-space:normal;text-align:center}
.alef-offline progress{inline-size:100%;block-size:1rem}
.alef-offline .muted{color:var(--muted,#555);font-size:.9rem}
.alef-offline .of-warn{border-inline-start:6px solid currentColor;padding-inline-start:.5rem}
`;
function injectStyle() {
  try { if (!document.head || document.getElementById?.("alef-offline-style")) return; const s = document.createElement("style"); s.id = "alef-offline-style"; s.textContent = CSS; document.head.append(s); } catch { /* optional */ }
}
const STATE_TEXT = { ready: "ready offline", partial: "partly saved", missing: "not saved yet" };

/** Focus the heading only if nothing else has focus yet: this runs after async loading, and must not pull focus back from a keyboard user who already moved on. */
function focusHeadingIfIdle(h1) {
  try { const a = globalThis.document?.activeElement; if (!a || a === globalThis.document.body || a === h1 || a.id === "main") h1?.focus?.(); } catch { /* ignore */ }
}
/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  injectStyle();
  /** @type {typeof defaultOffline} */
  const O = ctx?.offline || defaultOffline;
  const env = ctx?.env || {};
  const nav = env.navigator ?? globalThis.navigator;
  const wrap = el("section", { class: "alef-offline", "aria-labelledby": "view-title" });
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, "Use ALEF offline");
  const body = el("div", { class: "of-body" });
  const status = el("p", { role: "status", "aria-live": "polite", id: "of-status" });
  wrap.append(h1, body, status);
  root.append(wrap);

  let alive = true, files = [], onDemand = [], version = null, report = null, extraReport = null, health = null, loadError = "", job = null, ac = null, last = null, updState = "idle";
  const say = (t) => { status.textContent = t; };
  const tradition = () => { try { return ctx?.settings?.get?.("congregation"); } catch { return undefined; } };
  const extras = () => [...O.optionalGroups(tradition()), ...O.onDemandGroups(onDemand)];
  const extraUrls = () => extras().flatMap((g) => g.urls);
  const upd = ctx?.update ?? null;
  const offUpd = upd?.onChange?.((s) => { updState = s; if (alive && !job) render(); });
  if (upd?.state) updState = upd.state();

  async function refresh() {
    try { const l = await O.loadPrecacheList(env.fetch); files = l.files; onDemand = l.onDemand || []; version = l.version; loadError = ""; }
    catch (e) { loadError = `The list of offline files did not load. Open ALEF once while online, then try again.`; files = []; onDemand = []; }
    report = await O.cacheReport(files, { caches: env.caches });
    extraReport = await O.cacheReport(extraUrls(), { caches: env.caches, measure: false });
    health = await O.storageHealth({ navigator: nav, localStorage: env.localStorage, hasRoute: ctx?.hasRoute });
  }

  async function download() {
    if (job) return;
    ac = typeof AbortController === "function" ? new AbortController() : null;
    job = { done: 0, total: 0 }; last = null; render(); say("Downloading. Keep this screen open.");
    try {
      const r = await O.downloadEverything({ files, extraUrls: extraUrls(), fetch: env.fetch, caches: env.caches, signal: ac?.signal, online: () => nav?.onLine !== false,
        onProgress: (p) => { job = { done: p.done, total: job.total || p.total }; updateProgress(); } });
      last = r;
      say(r.offline ? "You are offline, so nothing could be downloaded. Try again with a connection." : r.aborted ? "Download cancelled. What was saved stays saved." : r.failed.length ? `${r.ok} files saved, ${r.failed.length} failed. You can try again; saved files are skipped.` : r.requested === 0 ? "Everything was already saved on this device." : `Saved ${r.ok} files (${O.fmtBytes(r.bytes)}).`);
    } catch (e) { last = { failed: [{ url: "(list)", reason: String(e?.message || e) }], ok: 0, aborted: false, offline: false, requested: 0, skipped: 0, bytes: 0 }; say("The download did not finish. Check your connection and try again."); }
    job = null; ac = null;
    await refresh(); if (alive) render();
  }
  function updateProgress() {
    const p = body.querySelector?.("#of-progress"); if (!p) return;
    p.setAttribute("value", String(job.done)); p.setAttribute("max", String(job.total || 1));
    const t = body.querySelector?.("#of-progress-text"); if (t) t.textContent = `${job.done} of ${job.total} files`;
  }

  function render() {
    if (!alive) return;
    const kids = [];
    const controlled = !!nav?.serviceWorker?.controller;
    const swLine = !nav?.serviceWorker ? "This browser cannot keep an offline copy of ALEF."
      : controlled ? "Offline use is switched on for this page." : "Offline use is not switched on for this page yet. Reload once while online; until then ALEF needs a connection.";
    kids.push(el("p", {}, "ALEF keeps a copy of itself on this device so it can open without a connection."), el("p", { class: "muted", id: "of-sw" }, swLine + (version ? ` Version ${version}.` : "")));
    if (loadError) kids.push(el("p", { role: "alert", id: "of-error" }, loadError));

    // groups
    if (report && files.length) {
      const items = report.groups.map((g) => el("li", { "data-group": g.id },
        el("strong", {}, g.label), ` ${STATE_TEXT[g.state]} (${g.cached} of ${g.total} files${g.bytes ? `, ${O.fmtBytes(g.bytes)}` : ""})`,
        g.needs && extras().some((x) => g.needs.includes(x.id) && x.urls.some((u) => extraReport?.missing.includes(u))) ? el("span", { class: "muted" }, " Needs an optional download below.") : null));
      const optMissing = extras().map((g) => ({ g, miss: g.urls.filter((u) => (extraReport?.missing || []).includes(u)).length }));
      kids.push(el("div", { class: "of-card", id: "of-groups" },
        el("h2", {}, "What works without a connection"),
        el("p", {}, `${report.cached} of ${report.total} files are saved (${O.fmtBytes(report.bytes)}). "Ready" means every file of that part is on this device; it has not been tested in airplane mode.`),
        el("ul", {}, items),
        el("h3", {}, "Optional downloads"),
        el("ul", { id: "of-extras" }, optMissing.map(({ g, miss }) => el("li", { "data-extra": g.id }, `${g.label}: ${miss === 0 ? "saved" : `${miss} of ${g.urls.length} not saved, about ${g.approxMB} MB`}`))),
        el("p", { class: "muted" }, "Spoken audio clips are not part of this: none are recorded yet. The speech you hear is your browser's own voice, not a recording; whether it works without a connection depends on your device.")));
    }

    // download
    const dl = [];
    if (job) {
      dl.push(el("progress", { id: "of-progress", value: String(job.done), max: String(job.total || 1), "aria-label": "Download progress" }), el("p", { id: "of-progress-text" }, `${job.done} of ${job.total || "?"} files`),
        el("button", { type: "button", class: "btn secondary", id: "of-cancel", onclick: () => { ac?.abort(); say("Cancelling..."); } }, "Cancel"));
    } else dl.push(el("button", { type: "button", class: "btn", id: "of-download", disabled: files.length ? null : true, onclick: download }, "Download everything for offline"));
    if (!job && last?.failed?.length) {
      dl.push(el("div", { class: "of-warn", id: "of-failures", role: "alert" }, el("p", {}, `${last.failed.length} file${last.failed.length === 1 ? "" : "s"} could not be saved:`),
        el("ul", {}, last.failed.slice(0, 20).map((f) => el("li", {}, `${f.url}: ${f.reason}`))), last.failed.length > 20 ? el("p", { class: "muted" }, `and ${last.failed.length - 20} more.`) : null));
    }
    kids.push(el("div", { class: "of-row" }, dl));

    // storage
    if (health) {
      const o = health.origin, l = health.local;
      const rows = [];
      rows.push(el("p", { id: "of-usage" }, o.usage != null ? `This site uses ${O.fmtBytes(o.usage)} of about ${O.fmtBytes(o.quota)} the browser allows.` : "This browser does not report storage use."));
      rows.push(el("p", { id: "of-local" }, l.supported ? `Saved progress and settings: about ${O.fmtBytes(l.alefChars * 2)} (about ${Math.round((l.ratio || 0) * 100)}% of the small space browsers allow for this; we assume ${(l.limitChars / 1e6).toFixed(0)} million characters).` : "Could not read saved progress size."));
      rows.push(el("p", { class: "muted", id: "of-persist" }, !health.persist.supported ? "This browser cannot be asked to protect storage." : health.persist.persisted ? "Your progress is protected from automatic browser clean-up." : "Your progress is not protected from automatic browser clean-up yet."));
      if (health.persist.supported && !health.persist.persisted) rows.push(el("div", { class: "of-row" }, el("button", { type: "button", class: "btn secondary", id: "of-protect", onclick: async () => {
        const r = await O.protectProgress(nav); health = await O.storageHealth({ navigator: nav, localStorage: env.localStorage, hasRoute: ctx?.hasRoute });
        say(!r.supported ? "This browser cannot be asked to protect storage. Download a backup instead." : r.granted ? "Progress is now protected." : "The browser did not agree. Keep a backup file."); render();
      } }, "Protect my progress")));
      for (const a of health.advice) rows.push(el("p", { class: "of-warn", role: health.level === "critical" ? "alert" : "note", "data-level": health.level }, a));
      if (health.advice.length && health.exportRoute) rows.push(el("p", {}, el("a", { href: health.exportRoute, id: "of-export" }, "Go to Settings to download a backup")));
      kids.push(el("div", { class: "of-card", id: "of-storage" }, el("h2", {}, "Storage"), rows));
    }

    // updates
    if (upd) {
      kids.push(el("div", { class: "of-card", id: "of-update" }, el("h2", {}, "Updates"),
        el("p", { id: "of-update-text" }, updState === "waiting" || updState === "activated" ? "A new version is ready. Use the Reload button at the bottom of the screen when you are at a good stopping point." : updState === "stalled" ? "An update is waiting but could not be applied here. Close all ALEF tabs and open it again." : "You have the latest version this device has seen."),
        el("div", { class: "of-row" }, el("button", { type: "button", class: "btn secondary", id: "of-check", onclick: async () => { await upd.check(); say(upd.state() === "idle" ? "No newer version found." : "A newer version was found."); } }, "Check for a new version"))));
    }
    body.replaceChildren(...kids.filter(Boolean));
  }

  (async () => { render(); await refresh(); if (alive) { render(); focusHeadingIfIdle(h1); } })();
  return () => { alive = false; ac?.abort(); offUpd?.(); };
}
