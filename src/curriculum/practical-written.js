/**
 * Written Practical pages (data/curriculum/practical-pages/written.json) laid over the live units.
 * A unit whose outline pages are all written shows only its written pages; any other unit keeps its
 * draft pages, with a written page replacing the draft page of the same id. Items held for John are
 * never shown. Pure functions: no DOM, no fetch.
 */
export const WRITTEN_URL = "data/curriculum/practical-pages/written.json";

const isLive = (it) => !it.heldForJohn;

/** Written pages grouped by unit id, in page order. */
export function writtenByUnit(written) {
  const by = new Map();
  for (const p of (written && written.pages) || []) {
    const unitId = p.id.replace(/-p\d+$/, "");
    if (!by.has(unitId)) by.set(unitId, []);
    by.get(unitId).push(p);
  }
  for (const list of by.values()) list.sort((a, b) => a.order - b.order);
  return by;
}

/** A written page with held items removed from its items, examples and speaking prompts. */
export function livePage(page) {
  const held = new Set((page.items || []).filter((it) => !isLive(it)).map((it) => it.id));
  if (!held.size) return page;
  const out = { ...page, items: page.items.filter(isLive) };
  delete out.heldForJohn;
  if (page.grammar) {
    const examples = page.grammar.examples.filter((e) => !held.has(e.itemId));
    // A grammar point that only explains a held item is held with it.
    out.grammar = examples.length ? { ...page.grammar, examples } : null;
    if (!examples.length) out.grammarNote = "";
  }
  if (page.speak) out.speak = page.speak.filter((s) => !held.has(s.answer));
  if (page.listen) out.listen = page.listen.filter((l) => !held.has(l.answer)).map((l) => ({ ...l, options: l.options.filter((o) => !held.has(o)) }));
  if (page.listenIds) out.listenIds = page.listenIds.filter((id) => !held.has(id));
  if (page.srsQueue) out.srsQueue = page.srsQueue.filter((q) => !held.has(q.id));
  return out;
}

/** The unit as the learner sees it, with written pages applied. */
export function applyWritten(unit, written) {
  if (!unit || !written) return unit;
  const mine = writtenByUnit(written).get(unit.id);
  if (!mine || !mine.length) return unit;
  const pages = mine.map(livePage);
  const held = new Set(written.pages.flatMap((p) => (p.items || []).filter((it) => !isLive(it)).map((it) => it.id)));
  unit = { ...unit, items: (unit.items || []).filter((it) => !held.has(it.id)) };
  if ((written.completeUnits || []).includes(unit.id)) return { ...unit, pages, written: true };
  const byId = new Map(pages.map((p) => [p.id, p]));
  const merged = (unit.pages || []).map((p) => byId.get(p.id) || p);
  for (const p of pages) if (!merged.some((m) => m.id === p.id)) merged.push(p);
  merged.sort((a, b) => (a.order || 0) - (b.order || 0));
  return { ...unit, pages: merged };
}

/** Earlier items a written page brings back for review, looked up across all written pages. */
export function reviewItems(page, written) {
  const all = new Map();
  for (const p of (written && written.pages) || []) for (const it of p.items || []) if (!all.has(it.id)) all.set(it.id, it);
  const own = new Set((page.items || []).map((it) => it.id));
  return (page.reviewOf || []).filter((id) => !own.has(id)).map((id) => all.get(id)).filter((it) => it && isLive(it));
}

/** Page count per unit id as the learner will see it, for the unit list. */
export function writtenPageCounts(index, written) {
  const by = writtenByUnit(written);
  const out = {};
  for (const row of (index && index.units) || []) {
    const mine = by.get(row.id);
    out[row.id] = mine && (written.completeUnits || []).includes(row.id) ? mine.length : row.pageCount;
  }
  return out;
}
