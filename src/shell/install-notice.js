// @ts-check
// Browser-tab storage notice. Safari (iPhone/iPad) may delete a website's saved data after 7 days without a visit when the site
// is used in a browser tab (not added to the Home Screen). This shows one dismissible banner, after the learner has come back on
// a second day, telling them to add Aleph to the Home Screen and keep a backup file. Not shown when installed (standalone).
// Own keys, plain localStorage, never throws. Loaded from index.html as a second module so src/app.js is untouched.
const KEY = "alef.storage-notice.v1";
const DAY = 86400000;

/** @param {{platform:{ios:boolean,standalone:boolean}, rec:any, now:number}} p @returns {{show:boolean, rec:any}} */
export function decide({ platform, rec, now }) {
  const r = rec && typeof rec === "object" ? rec : {};
  const first = typeof r.first === "number" ? r.first : now;
  const next = { first, dismissed: r.dismissed === true };
  if (platform.standalone || next.dismissed) return { show: false, rec: next };
  // Safari-family only: Chromium keeps tab data unless the learner clears it, so the notice would be noise there.
  if (!platform.ios) return { show: false, rec: next };
  return { show: now - first >= DAY, rec: next };
}

async function run() {
  const g = globalThis, d = g.document;
  if (!d) return;
  let rec = null;
  try { rec = JSON.parse(g.localStorage.getItem(KEY) || "null"); } catch { /* storage blocked */ }
  const now = Date.now();
  // The notice needs the platform check (install.js) only when it could show: not dismissed and a day or more since the first visit. Otherwise decide() would return show:false whatever the platform, so skip loading it.
  const first = rec && typeof rec.first === "number" ? rec.first : now;
  let platform = { ios: false, standalone: false };
  if (!(rec && rec.dismissed === true) && now - first >= DAY) {
    try { platform = (await import("./install.js")).detectPlatform(g); } catch { return; }
  }
  const out = decide({ platform, rec, now });
  try { g.localStorage.setItem(KEY, JSON.stringify(out.rec)); } catch { /* ignore */ }
  if (!out.show) return;
  const box = d.createElement("aside");
  box.setAttribute("aria-label", "Keep your progress");
  box.style.cssText = "margin:.5rem max(1rem,env(safe-area-inset-left));padding:.75rem 1rem;border:1px solid var(--border);border-radius:12px;background:var(--card);color:var(--fg);font-size:.9rem";
  const p = d.createElement("p"); p.style.margin = "0 0 .5rem";
  p.textContent = "Safari can erase what a website saved if you do not open it for about a week. To keep your progress, add Aleph to your Home Screen, and save a backup file from Settings now and then.";
  const row = d.createElement("div"); row.style.cssText = "display:flex;flex-wrap:wrap;gap:.5rem";
  const how = d.createElement("a"); how.href = "#/install"; how.className = "btn"; how.textContent = "How to add it";
  const x = d.createElement("button"); x.type = "button"; x.className = "btn secondary"; x.textContent = "Not now";
  x.addEventListener("click", () => { try { g.localStorage.setItem(KEY, JSON.stringify({ ...out.rec, dismissed: true })); } catch { /* ignore */ } box.remove(); });
  row.append(how, x); box.append(p, row);
  d.querySelector(".sound-bar")?.after(box);
}
if (typeof document !== "undefined") { run().catch(() => { /* never break the app */ }); }
