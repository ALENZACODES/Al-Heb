// @ts-check
/* Books shelf: the five Grade-1 read-along books (Sifrei Ha-Alef-Bet).
   Data: data/books/index.json + data/books/<id>.json. Covers use each
   book's page-1 picture when it exists; the badges say honestly what is
   still missing (pictures, voices) per book. */
import { h, heSpan } from "../shell/ui.js";

const fetchJson = async (ctx, url) => {
  const r = await (ctx.fetchFn ?? fetch)(url);
  return r && r.ok !== false ? r.json() : null;
};

export async function mount(root, ctx) {
  root.append(h("h1", {}, "Little books"));
  root.append(h("p", { class: "muted" },
    "Grade-1 Hebrew, read along page by page. Big print, full vowels, a voice for every page when it is ready."));
  const wrap = h("div", { class: "book-shelf" });
  root.append(wrap);
  const data = await fetchJson(ctx, "data/books/index.json").catch(() => null);
  if (!data || !Array.isArray(data.books)) {
    wrap.append(h("p", { class: "muted" }, "The bookshelf could not be loaded just now."));
    return;
  }
  // Reading place written by the reader (books.v1): a finished book says so on its card.
  let places = {};
  try { places = (await ctx.store.get("books.v1")) || {}; } catch { /* the shelf works without it */ }
  for (const b of data.books) {
    const cover = h("div", { class: "book-cover" });
    if (b.hasImages) {
      cover.append(h("img", {
        src: `assets/books/${b.id}/BOOK${b.id.slice(4)}_p01.jpg`,
        alt: "", loading: "lazy",
      }));
    } else {
      cover.append(heSpan(b.titleHe, "book-cover-title"));
    }
    const marks = [];
    marks.push(b.hasImages ? "Pictures ready" : (b.picturedPages ? `Pictures ${b.picturedPages} of ${b.pageCount}` : "Pictures coming"));
    marks.push(b.hasAudio ? "Voices ready" : (b.audioPages ? `Voices ${b.audioPages} of ${b.pageCount} pages` : "Voices coming"));
    if (places[b.id] && places[b.id].finishedAt) marks.push("Finished");
    const card = h("a", { class: "card book-card", href: `#/book/${b.id}` },
      cover,
      h("div", { class: "book-meta" },
        heSpan(b.titleHe, "book-title-he"),
        h("span", { class: "book-title-en" }, `${b.titleTranslit} — ${b.titleEn}`),
        h("span", { class: "muted" }, `${b.level} · ${b.pageCount} pages`),
        h("span", { class: "book-badges" }, marks.join(" · "))));
    wrap.append(card);
  }
}
