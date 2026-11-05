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
export const PROGRESS_KEY = "curriculum.progress";   // { completed: { [lessonId]: ms } }
export const CARDS_KEY = "srs.cards";                 // { [cardId]: card }
export const STREAK_KEY = "streak";                   // { count, best, last }
/** replaceChildren that keeps keyboard focus on `keep` (the heading) when it is re-inserted. */
export function replaceKeepingFocus(wrap, keep, ...nodes) {
  const had = globalThis.document?.activeElement === keep;
  wrap.replaceChildren(keep, ...nodes.filter(Boolean));
  if (had && keep.focus) keep.focus({ preventScroll: true });
}

/** Learner-facing name of a lesson's level: belt colours get "belt"; the A1/A2/B1 codes get a plain word. */
export function levelLabel(level) {
  const L = String(level || "");
  const plain = { A1: "Beginner (A1)", A2: "Elementary (A2)", B1: "Intermediate (B1)", intermediate: "Intermediate" };
  return plain[L] || (L ? L[0].toUpperCase() + L.slice(1) + " belt" : "");
}
