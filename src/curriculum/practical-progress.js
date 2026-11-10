/** Progress, due-count and Google Cloud pass filter for Practical pages. */
import { due } from "./srs.js";

export const PROGRESS_KEY = "practical.progress";

export function completedSet(progress) {
  const c = (progress && progress.completed) || {};
  return new Set(Object.keys(c).filter((k) => c[k]));
}

export function pageKey(unitId, pageId) {
  return `${unitId}|${pageId}`;
}

export function itemKey(unitId, itemId) {
  return `${unitId}|${itemId}`;
}

/** The check results with the committed hide list folded in, so failed clips stay hidden without the untracked results file. */
export function withHidden(results, hidden) {
  const keys = (hidden && hidden.items || []).map((x) => x.key);
  if (!keys.length) return results;
  return { ...(results || {}), failing_keys: [...new Set([...((results && results.failing_keys) || []), ...keys])] };
}

export function failingKeySet(results) {
  return new Set((results && results.failing_keys) || []);
}

export function passingItem(unitId, item, results) {
  if (!results || !Array.isArray(results.failing_keys)) return true;
  return !failingKeySet(results).has(itemKey(unitId, item.id));
}

export function visibleItems(unitId, items, results) {
  return (items || []).filter((it) => passingItem(unitId, it, results));
}

export function visiblePages(unit, results) {
  return (unit.pages || []).map((p) => {
    const items = visibleItems(unit.id, p.items || [], results);
    return { ...p, items };
  }).filter((p) => p.items.length > 0);
}

export function visibleUnits(index, unitBodies, results) {
  return (index.units || []).filter((row) => {
    const u = unitBodies[row.id];
    if (!u) return true;
    return visiblePages(u, results).length > 0;
  });
}

export function progressFraction(done, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(1, done / total));
}

export function dueCardCount(srsState, now = Date.now()) {
  const cards = Object.values((srsState && srsState.cards) || {});
  return due(cards, now).length;
}

/** Paint a due-review badge on Practical nav and menu links. Safe no-op if the menu is not in the document. */
export function paintDueBadge(doc, count) {
  const n = Math.max(0, Number(count) || 0);
  const links = [...(doc?.querySelectorAll?.('a[href="#/practical"]') || [])];
  for (const a of links) {
    a.querySelectorAll(".alef-nav-due").forEach((el) => el.remove());
    if (!n) continue;
    const span = doc.createElement("span");
    span.className = "alef-nav-due";
    span.setAttribute("data-practical-due", String(n));
    span.textContent = n === 1 ? "1 due" : `${n} due`;
    a.appendChild(span);
  }
  return n;
}
