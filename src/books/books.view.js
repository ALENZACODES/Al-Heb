// @ts-check
/* Books shelf: the little read-along books (Sifrei Ha-Aleph-Bet), grouped by
   level with a "Start here" first group (U-16: 62 flat cards read as a
   warehouse). Data: data/books/index.json + data/books/<id>.json. Covers
   use each book's page-1 picture when it exists; the badges say honestly
   what is still missing (pictures, voices) per book. */
import { h, heSpan } from "../shell/ui.js";

const fetchJson = async (ctx, url) => {
  const r = await (ctx.fetchFn ?? fetch)(url);
  return r && r.ok !== false ? r.json() : null;
};

export async function mount(root, ctx) {
  root.append(h("h1", {}, "Little books"));
  root.append(h("p", { class: "muted" },
    "Little Hebrew story books, read along page by page. Big print, full vowels, and a voice for every page. Start at Beginner 1 — the shelf is grouped by level."));
  const wrap = h("div", { class: "book-groups" });
  root.append(wrap);
  const data = await fetchJson(ctx, "data/books/index.json").catch(() => null);
  if (!data || !Array.isArray(data.books)) {
    wrap.append(h("p", { class: "muted" }, "The bookshelf could not be loaded just now."));
    return;
  }
  // Reading place written by the reader (books.v1): a finished book says so on its card.
  let places = {};
  try { places = (await ctx.store.get("books.v1")) || {}; } catch { /* the shelf works without it */ }
  const cardFor = (b) => {
    const cover = h("div", { class: "book-cover" });
    if (b.hasImages) {
      cover.append(h("img", {
        src: `assets/books/${b.id}/BOOK${b.id.slice(4)}_p01.jpg`,
        alt: "", loading: "lazy",
      }));
    } else {
      cover.classList.add("book-cover-soon");
      cover.append(heSpan(b.titleHe, "book-cover-title"), h("span", { class: "book-soon-banner" }, "Artwork coming soon"));
    }
    const marks = [];
    // Learner-facing marks only: what the book does for the reader, not how far production has got.
    if (b.hasAudio) marks.push("Read aloud by Ari and Noa");
    if (places[b.id] && places[b.id].finishedAt) marks.push("Finished");
    return h("a", { class: "card book-card", href: `#/book/${b.id}` },
      cover,
      h("div", { class: "book-meta" },
        heSpan(b.titleHe, "book-title-he"),
        h("span", { class: "book-title-en" }, `${b.titleTranslit} — ${b.titleEn}`),
        h("span", { class: "muted" }, `${b.level} · ${b.pageCount} pages`),
        h("span", { class: "book-badges" }, marks.join(" · "))));
  };
  // A book left mid-read comes first, before the level groups.
  const openEntry = Object.entries(places).find(([, v]) => v && v.lastPage > 0 && !v.finishedAt);
  const openBook = openEntry ? data.books.find((b) => b.id === openEntry[0]) : null;
  if (openBook) {
    wrap.append(h("h2", { class: "book-group-title" }, "Continue reading"));
    const grid = h("div", { class: "book-shelf" });
    grid.append(cardFor(openBook));
    wrap.append(grid);
  }
  const LEVEL_ORDER = ["Beginner 1", "Beginner 2", "Beginner 3", "Advanced", "Grade 1"];
  const groups = new Map();
  for (const b of data.books) { const k = b.level || "More books"; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(b); }
  const keys = [...groups.keys()].sort((a, b) => {
    const ia = LEVEL_ORDER.indexOf(a), ib = LEVEL_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  for (const k of keys) {
    wrap.append(h("h2", { class: "book-group-title" }, k === keys[0] ? `Start here — ${k}` : k));
    const grid = h("div", { class: "book-shelf" });
    for (const b of groups.get(k)) grid.append(cardFor(b));
    wrap.append(grid);
  }
}
