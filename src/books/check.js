// @ts-check
/* One-question story check for the little books (M-06). A book counts as finished when the reader reaches the last page
   AND answers one question about the story. The question is built from the book's own pages only: three things that
   happen in the story (one sentence from an early, a middle and a late page), and the learner picks the one that
   happens first. Pure and deterministic: the same book always gives the same question and the same option order. */

/** First sentence of a page's English line (the long Advanced pages have several). */
export function firstSentence(en) {
  const t = String(en || "").replace(/\s+/g, " ").trim();
  const m = /^(.+?[.!?])(?=\s|$)/.exec(t);
  return (m ? m[1] : t).trim();
}

/**
 * A sentence a reader can place in the story: at least three words, and no quote left open. One-word lines ("Yes.",
 * "Fine.", "Rain.") and the cut-off start of a quotation could belong anywhere in the book, so the check avoids them.
 */
export function placeable(text) {
  const t = String(text || "").trim();
  const words = t.replace(/["“”]/g, "").split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w));
  const quotes = (t.match(/["“”]/g) || []).length;
  return words.length >= 3 && quotes % 2 === 0;
}

const hash = (s) => { let x = 2166136261; for (const ch of String(s)) { x ^= ch.codePointAt(0) || 0; x = Math.imul(x, 16777619) >>> 0; } return x; };

/**
 * @param {{id?:string, pages:Array<{en?:string, n?:number}>}} book
 * @returns {{question:string, options:Array<{text:string, page:number, correct:boolean}>, answerPage:number}|null}
 */
export function storyCheck(book) {
  const pages = (book && Array.isArray(book.pages) ? book.pages : []).map((p, i) => ({ page: Number.isInteger(p?.n) ? p.n : i + 1, text: firstSentence(p?.en) }))
    .filter((p) => p.text.length > 3);
  if (pages.length < 3) return null;
  const n = pages.length;
  // an early page (not the opening scene-setter when there is room), a middle page and a late page
  const want = [Math.min(1, n - 3), Math.floor(n / 2), n - 1];
  const picked = [];
  const seen = new Set();
  // Pass 1 takes only sentences a reader can place in the story (see placeable); pass 2 falls back to any page text.
  for (const target of want) {
    let found = null;
    for (const strict of [true, false]) {
      for (let d = 0; d < n && !found; d++) {
        for (const j of [target + d, target - d]) {
          const p = pages[j];
          if (p && (!strict || placeable(p.text)) && !picked.includes(p) && !seen.has(p.text.toLowerCase())) { found = p; break; }
        }
      }
      if (found) break;
    }
    if (!found) return null;
    picked.push(found); seen.add(found.text.toLowerCase());
  }
  const earliest = picked.reduce((a, b) => (b.page < a.page ? b : a));
  const h = hash(book.id || picked.map((p) => p.text).join("|"));
  const perms = [[0, 1, 2], [1, 2, 0], [2, 0, 1], [1, 0, 2], [2, 1, 0], [0, 2, 1]];
  const order = perms[h % perms.length].map((i) => picked[i]);
  return {
    question: "Which of these happens first in the story?",
    options: order.map((p) => ({ text: p.text, page: p.page, correct: p === earliest })),
    answerPage: earliest.page,
  };
}
