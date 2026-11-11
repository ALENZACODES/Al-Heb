/** Tiny DOM helpers shared by the Lane 1 views (plain DOM APIs, no dependencies). */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children.flat()) if (c != null && c !== false) node.append(c.nodeType ? c : document.createTextNode(String(c)));
  return node;
}
/** Hebrew text element: always dir=rtl lang=he. */
export const heText = (text, cls = "alef-he") => el("span", { class: cls, dir: "rtl", lang: "he" }, text);
/**
 * Hebrew text that a screen reader cannot be trusted to read (a lone letter, a pointed word) and that is the item of an exercise.
 * Sighted users see the Hebrew; a screen reader gets `label` instead (role "img"), e.g. a letter's shape in words or a word's respelling.
 * Without a label this is exactly heText.
 */
export const heLabeled = (text, label, cls = "alef-he") => label
  ? el("span", { class: cls, dir: "rtl", lang: "he", role: "img", "aria-label": label }, text)
  : heText(text, cls);
/** ctx.t(key) with a readable fallback when the shell has no string for the key. */
export function tr(ctx, key, fallback) {
  try { const v = ctx && typeof ctx.t === "function" ? ctx.t(key) : undefined; return v && v !== key ? v : fallback; } catch { return fallback; }
}
/** store.get may be sync or async; always returns a promise. Missing store => fallback. */
export async function storeGet(ctx, key, fallback) {
  try { const v = ctx?.store?.get ? await ctx.store.get(key) : undefined; return v == null ? fallback : v; } catch { return fallback; }
}
export async function storeSet(ctx, key, value) {
  try { if (ctx?.store?.set) await ctx.store.set(key, value); } catch { /* best effort */ }
}
/** A write that matters (a lesson counted as done) did not happen. `rolledBack` is false when an earlier write of the same batch could not be undone. */
export class StoreWriteError extends Error {
  constructor(message, { key = "", rolledBack = true, cause } = {}) { super(message); this.name = "StoreWriteError"; this.key = key; this.rolledBack = rolledBack; if (cause !== undefined) this.cause = cause; }
}
/**
 * Write several keys as one unit. Unlike storeSet this does not swallow a missing store or a store whose set() throws or rejects: it undoes the
 * writes already made (in reverse order) and throws StoreWriteError. A store that keeps data in memory because the browser refused (store.set
 * returns false) is NOT an error here: the learner is told about that by the storage notice, and the data is in the store.
 * @param {any} ctx @param {Array<{key:string, value:any, old:any}>} writes `old` is the value to put back (undefined = the key did not exist)
 */
export async function storeWriteAll(ctx, writes) {
  const st = ctx?.store;
  if (!st || typeof st.set !== "function") throw new StoreWriteError("There is no place to save your progress.", { rolledBack: true });
  const done = [];
  for (const w of writes) {
    try { await st.set(w.key, w.value); done.push(w); }
    catch (e) {
      let rolledBack = true;
      for (const u of done.reverse()) {
        try { if (u.old === undefined && typeof st.remove === "function") await st.remove(u.key); else await st.set(u.key, u.old); } catch { rolledBack = false; }
      }
      throw new StoreWriteError(rolledBack ? "Your progress could not be saved. Nothing was changed." : "Your progress could only be partly saved.", { key: w.key, rolledBack, cause: e });
    }
  }
}
/**
 * Tell the learner a save failed and offer one more try, inside `host` (replaces an earlier notice). Used where a lesson would otherwise claim to be complete.
 * @param {any} host element to append to @param {any} err the StoreWriteError (or any error) @param {() => any} retry called when the learner presses the button
 */
export function showSaveFailure(host, err, retry) {
  host.querySelector?.("#alef-save-failed")?.remove?.();
  const partly = err && err.rolledBack === false;
  const btn = el("button", { type: "button", class: "btn", id: "alef-save-retry", onclick: () => { btn.disabled = true; Promise.resolve().then(retry).catch(() => {}); } }, "Try saving again");
  const box = el("div", { class: "card", id: "alef-save-failed", role: "alert", tabindex: "-1" },
    el("p", {}, el("strong", {}, "This lesson was not saved as complete.")),
    el("p", {}, (err && err.message) || "Your progress could not be saved.", partly ? " Download a backup from Settings before you leave." : " Your earlier progress is unchanged."),
    btn);
  host.append(box);
  box.focus?.({ preventScroll: true });
  return box;
}
export const PROGRESS_KEY = "curriculum.progress";   // { completed: { [lessonId]: ms } }
export const CARDS_KEY = "srs.cards";                 // { [cardId]: card }
export const STREAK_KEY = "streak";                   // { count, best, last }
/** replaceChildren that keeps keyboard focus on `keep` (the heading) when it is re-inserted. */
export function replaceKeepingFocus(wrap, keep, ...nodes) {
  const had = globalThis.document?.activeElement === keep;
  wrap.replaceChildren(keep, ...nodes.filter(Boolean));
  if (had && keep.focus) keep.focus({ preventScroll: true });
}

/**
 * Learner-facing name of a lesson's level. Pass the lesson's rank (src/curriculum/ranks.js) to get the Krav Maga style label,
 * e.g. "Yellow belt · P2"; Israel-track codes map to course-stage names (not CEFR claims).
 */
export function levelLabel(level, rank) {
  if (rank && rank.label) return rank.label;
  const L = String(level || "");
  const plain = { A1: "Stage 1", A2: "Stage 2", B1: "Stage 3", intermediate: "Intermediate" };
  return plain[L] || (L ? L[0].toUpperCase() + L.slice(1) + " belt" : "");
}
/**
 * After a control is disabled or removed, keep keyboard focus inside `root` (never leave it on body).
 * Only moves focus when it was already lost. `sel` is a querySelector string; `fallback` is an element.
 */
export function refocusIfLost(root, sel, fallback) {
  try {
    const doc = globalThis.document;
    const a = doc?.activeElement;
    const lost = !a || a === doc.body || (root && !root.contains(a)) || a.disabled;
    if (!lost) return false;
    const t = (sel && root?.querySelector?.(sel)) || fallback;
    if (t?.focus) { t.focus({ preventScroll: true }); return true; }
  } catch { /* ignore */ }
  return false;
}
