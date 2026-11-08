// @ts-check
/* Book reader: one page at a time — the picture, the pointed Hebrew line
   big, transliteration and English under it, and a Listen button for each
   read-along voice. Voice clips live in the audio tree (kind "book"); a
   page whose clips are not recorded yet says so instead of failing. */
import { h, heSpan } from "../shell/ui.js";
import { readerSlow, setReaderSlow, applyReaderRate, speedLine } from "./reader.speed.js";

const fetchJson = async (ctx, url) => {
  const r = await (ctx.fetchFn ?? fetch)(url);
  return r && r.ok !== false ? r.json() : null;
};
const bookId = (ctx) => {
  const fromRoute = ctx.route?.params?.id ?? ctx.route?.query?.id;
  if (fromRoute) return String(fromRoute);
  const m = /#\/book\/([a-z0-9-]+)/i.exec(location.hash || "");
  return m ? m[1] : "book1";
};

export async function mount(root, ctx) {
  const id = bookId(ctx);
  const book = await fetchJson(ctx, `data/books/${id}.json`).catch(() => null);
  if (!book || !Array.isArray(book.pages) || !book.pages.length) {
    root.append(h("h1", {}, "Book not found"));
    root.append(h("p", { class: "muted" }, "This book could not be loaded."));
    return;
  }
  root.append(h("p", {}, h("a", { href: "#/books" }, "← All books")));
  root.append(h("h1", {}, book.titleEn));
  root.append(h("p", { class: "muted" }, `${book.titleTranslit} · ${book.level} · ${book.pages.length} pages`));

  // The shelf index (best effort) names the next book for the last-page hand-off.
  const shelf = await fetchJson(ctx, "data/books/index.json").catch(() => null);
  const shelfBooks = Array.isArray(shelf?.books) ? shelf.books : [];
  const nextBook = shelfBooks[shelfBooks.findIndex((b) => b.id === id) + 1] || null;

  // Reading place, shared with the shelf and the awards engine: books.v1 holds the last page
  // reached per book (and when its last page was first reached); books.finished.v1 is the
  // finished map the Book Finisher award reads. Best effort, like every other writer.
  let writtenPage = -1, wroteFinished = false;
  const recordProgress = async () => {
    const last = book.pages.length - 1;
    if (page === writtenPage && !(page === last && !wroteFinished)) return;
    try {
      const all = (await ctx.store.get("books.v1")) || {};
      const entry = all[id] && typeof all[id] === "object" ? all[id] : {};
      entry.lastPage = page;
      if (page === last && !entry.finishedAt) entry.finishedAt = Date.now();
      all[id] = entry;
      await ctx.store.set("books.v1", all);
      writtenPage = page;
      if (page === last && entry.finishedAt) {
        const fin = (await ctx.store.get("books.finished.v1")) || {};
        if (!fin[id]) { fin[id] = entry.finishedAt; await ctx.store.set("books.finished.v1", fin); }
        wroteFinished = true;
      }
    } catch { /* progress is an addition; the reading never waits on it */ }
  };

  let page = 0;
  const stage = h("div", { class: "book-stage" });
  const dots = h("div", { class: "book-dots", role: "tablist", "aria-label": "Pages" });
  const audioEl = h("audio", { preload: "none" });
  applyReaderRate(audioEl, readerSlow()); // normal unless Slower was chosen earlier this session
  let audioState = h("span", { class: "muted book-audio-state", role: "status" });

  const render = () => {
    const p = book.pages[page];
    stage.replaceChildren();
    dots.replaceChildren();
    const pending = () => h("div", { class: "book-page-img book-page-pending" },
      h("span", { class: "book-soon-banner" }, "Artwork coming soon"));
    if (p.hasImg) {
      // hasImg comes from the build; if the file is still missing on the host, swap the broken picture for the notice.
      const img = h("img", { class: "book-page-img", src: p.img, alt: p.illustration || "" });
      img.addEventListener("error", () => { if (img.isConnected) img.replaceWith(pending()); }, { once: true });
      stage.append(img);
    } else {
      stage.append(pending());
    }
    stage.append(heSpan(p.he, "book-line"));
    stage.append(h("p", { class: "book-translit" }, p.translit));
    stage.append(h("p", { class: "muted book-en" }, p.en));

    const listen = (voice, label) => h("button", {
      type: "button", class: "btn book-listen",
      onclick: async () => {
        audioState.textContent = "Loading…";
        audioEl.src = p.audio[voice];
        applyReaderRate(audioEl, readerSlow()); // normal pace unless the learner chose Slower (this session only)
        try { await audioEl.play(); audioState.textContent = ""; }
        catch { audioState.textContent = "This page's voice is not recorded yet."; }
      },
    }, label);
    // Slower: the learner's choice, kept for this visit only; never a default
    const slower = h("button", {
      type: "button", class: "btn secondary book-slower", "aria-pressed": readerSlow(),
      onclick: () => {
        const on = setReaderSlow(!readerSlow());
        slower.setAttribute("aria-pressed", String(on));
        applyReaderRate(audioEl, on);
        audioState.textContent = speedLine(on);
      },
    }, "Slower");
    stage.append(h("div", { class: "book-listen-row" },
      listen("f", "▶ Listen — Noa"), listen("m", "▶ Listen — Ari"), slower, audioState));

    const prev = h("button", { type: "button", class: "btn", onclick: () => { if (page > 0) { page--; render(); } } }, "← Previous");
    const next = h("button", { type: "button", class: "btn primary", onclick: () => { if (page < book.pages.length - 1) { page++; render(); } } },
      page === book.pages.length - 1 ? "The end" : "Next →");
    if (page === 0) prev.setAttribute("disabled", "");
    if (page === book.pages.length - 1) next.setAttribute("disabled", "");
    stage.append(h("div", { class: "book-nav" }, prev,
      h("span", { class: "muted" }, `Page ${page + 1} of ${book.pages.length}`), next));

    if (page === book.pages.length - 1) {
      stage.append(h("p", { class: "book-finished" }, `You finished ${book.titleEn}.`));
      if (nextBook) {
        stage.append(h("p", {}, h("a", { class: "btn secondary", href: `#/book/${nextBook.id}` },
          `Next book: ${nextBook.titleTranslit} — ${nextBook.titleEn}`)));
      }
    }
    recordProgress();

    book.pages.forEach((_, i) => {
      const d = h("button", { type: "button", class: "book-dot" + (i === page ? " on" : ""),
        "aria-label": `Page ${i + 1}`, onclick: () => { page = i; render(); } }, "");
      dots.append(d);
    });
  };
  root.append(stage, dots, audioEl);
  render();
  return () => { try { audioEl.pause(); } catch { /* already stopped */ } };
}
