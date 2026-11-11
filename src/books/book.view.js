// @ts-check
/* Book reader: one page at a time — the picture, the pointed Hebrew line
   big, transliteration and English under it, and a Listen button for each
   read-along voice. Voice clips live in the audio tree (kind "book"); a
   page whose clips are not recorded yet says so instead of failing. */
import { h, heSpan } from "../shell/ui.js";
import { readerSlow, setReaderSlow, applyReaderRate, speedLine } from "./reader.speed.js";
import { resolveBookId, shelfNumber, nextOnShelf } from "./order.js";
import { storyCheck } from "./check.js";
/** S-04: a page held back because it says the divine name; nothing plays, and the page says why. */
export const HELD_PAGE = "This page says the divine name, so it is not read aloud until the way to read it here is decided. Read it from the page.";

const fetchJson = async (ctx, url) => {
  const r = await (ctx.fetchFn ?? fetch)(url);
  return r && r.ok !== false ? r.json() : null;
};
const bookId = (ctx) => {
  const fromRoute = ctx.params?.id ?? ctx.query?.id ?? ctx.route?.params?.id ?? ctx.route?.query?.id;
  if (fromRoute) return String(fromRoute);
  const m = /#\/book\/([a-z0-9-]+)/i.exec(location.hash || "");
  return m ? m[1] : "book1";
};

export async function mount(root, ctx) {
  const asked = bookId(ctx);
  // The shelf index names the shelf number, resolves #/book/<shelf number> (S-07) and the next book for the last-page hand-off.
  const shelf = await fetchJson(ctx, "data/books/index.json").catch(() => null);
  const shelfBooks = Array.isArray(shelf?.books) ? shelf.books : [];
  const id = resolveBookId(asked, shelfBooks) || asked;
  const book = await fetchJson(ctx, `data/books/${id}.json`).catch(() => null);
  if (!book || !Array.isArray(book.pages) || !book.pages.length) {
    root.append(h("h1", {}, "Book not found"));
    root.append(h("p", { class: "muted" }, "This book could not be loaded."));
    return;
  }
  root.append(h("p", {}, h("a", { href: "#/books" }, "← All books")));
  root.append(h("h1", {}, book.titleEn));
  const num = shelfNumber(id, shelfBooks);
  root.append(h("p", { class: "muted" }, `${num ? `Book ${num} of ${shelfBooks.length} · ` : ""}${book.titleTranslit} · ${book.level} · ${book.pages.length} pages`));
  const nextBook = nextOnShelf(id, shelfBooks);
  const check = storyCheck(book);

  // Reading place, shared with the shelf and the awards engine: books.v1 holds the last page
  // reached per book (and when its last page was first reached); books.finished.v1 is the
  // finished map the Book Finisher award reads. Best effort, like every other writer.
  // A book is finished when its last page is reached AND its one-question story check is answered (M-06); a book with
  // no check (fewer than three pages of text) is finished at the last page as before. A finish saved earlier is kept.
  let writtenPage = -1, finishedBefore = false, checkedNow = false;
  try { const all0 = (await ctx.store.get("books.v1")) || {}; finishedBefore = !!(all0[id] && all0[id].finishedAt); } catch { /* new reader */ }
  const recordProgress = async ({ finish = false } = {}) => {
    const last = book.pages.length - 1;
    if (page === writtenPage && !finish) return;
    try {
      const all = (await ctx.store.get("books.v1")) || {};
      const entry = all[id] && typeof all[id] === "object" ? all[id] : {};
      entry.lastPage = page;
      if (page === last && !entry.reachedEndAt) entry.reachedEndAt = Date.now();
      if (finish && !entry.finishedAt) entry.finishedAt = Date.now();
      if (finish && check) entry.checkedAt = entry.checkedAt || Date.now();
      all[id] = entry;
      await ctx.store.set("books.v1", all);
      writtenPage = page;
      if (entry.finishedAt) {
        const fin = (await ctx.store.get("books.finished.v1")) || {};
        if (!fin[id]) { fin[id] = entry.finishedAt; await ctx.store.set("books.finished.v1", fin); }
      }
    } catch { /* progress is an addition; the reading never waits on it */ }
  };
  const finishedLine = () => h("p", { class: "book-finished" }, `You finished ${book.titleEn}.`);
  const nextLink = () => (nextBook ? h("p", {}, h("a", { class: "btn secondary", href: `#/book/${nextBook.id}` },
    `Next book: ${nextBook.titleTranslit} — ${nextBook.titleEn}`)) : null);
  /** The story check on the last page: three options from the book's own pages. */
  const checkCard = () => {
    const box = h("section", { class: "card book-check", "aria-labelledby": "book-check-q" });
    const out = h("p", { class: "book-check-result", role: "status", "aria-live": "polite" }, "");
    const after = h("div", {});
    const opts = h("div", { class: "book-check-options", role: "group", "aria-labelledby": "book-check-q" });
    for (const o of check.options) {
      const b = h("button", { type: "button", class: "btn secondary book-check-option", onclick: async () => {
        if (checkedNow) return;
        if (o.correct) {
          checkedNow = true;
          b.classList.add("is-right"); b.setAttribute("aria-pressed", "true");
          for (const x of opts.querySelectorAll("button")) if (x !== b) x.setAttribute("disabled", "");
          out.textContent = `Right: that is page ${o.page}.`;
          await recordProgress({ finish: true });
          after.replaceChildren(...[finishedLine(), nextLink()].filter(Boolean));
        } else {
          b.setAttribute("disabled", ""); b.classList.add("is-wrong");
          out.textContent = `Not that one: it is on page ${o.page}. Try another, or look back through the pages.`;
        }
      } }, o.text);
      opts.append(b);
    }
    box.append(h("h2", { id: "book-check-q", class: "book-check-q" }, `One question: ${check.question}`),
      h("p", { class: "muted small" }, "Answer it and this book counts as finished."), opts, out, after);
    return box;
  };

  let page = 0;
  const stage = h("div", { class: "book-stage" });
  const dots = h("div", { class: "book-dots", role: "tablist", "aria-label": "Pages" });
  const audioEl = h("audio", { preload: "none" });
  applyReaderRate(audioEl, readerSlow()); // normal unless Slower was chosen earlier this session
  let audioState = h("span", { class: "muted book-audio-state", role: "status" });
  // One shared state line for the book's voice (M-04): playing, finished, or why there is no sound.
  let playingLabel = "";
  audioEl.addEventListener("playing", () => { audioState.textContent = `Playing: ${playingLabel || "this page"}.`; });
  audioEl.addEventListener("ended", () => { audioState.textContent = "Finished. Tap Listen to hear it again."; });
  audioEl.addEventListener("error", () => { if (audioEl.getAttribute("src")) audioState.textContent = "No sound: this page's recording did not load."; });

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
        if (p.audioHeld === "divine-name") { audioState.textContent = HELD_PAGE; return; }
        if (!p.audio || !p.audio[voice]) { audioState.textContent = "This page's voice is not recorded yet."; return; }
        audioState.textContent = "Loading…";
        playingLabel = label.replace(/^▶\s*/, "");
        audioEl.src = p.audio[voice];
        applyReaderRate(audioEl, readerSlow()); // normal pace unless the learner chose Slower (this session only)
        try { await audioEl.play(); }
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
      listen("f", "▶ Listen (Noa)"), listen("m", "▶ Listen (Ari)"), slower, audioState));

    const prev = h("button", { type: "button", class: "btn", onclick: () => { if (page > 0) { page--; render(); } } }, "← Previous");
    const next = h("button", { type: "button", class: "btn primary", onclick: () => { if (page < book.pages.length - 1) { page++; render(); } } },
      page === book.pages.length - 1 ? "The end" : "Next →");
    if (page === 0) prev.setAttribute("disabled", "");
    if (page === book.pages.length - 1) next.setAttribute("disabled", "");
    stage.append(h("div", { class: "book-nav" }, prev,
      h("span", { class: "muted" }, `Page ${page + 1} of ${book.pages.length}`), next));

    const atEnd = page === book.pages.length - 1;
    if (atEnd && check && !finishedBefore && !checkedNow) stage.append(checkCard());
    else if (atEnd) stage.append(...[finishedLine(), nextLink()].filter(Boolean));
    recordProgress({ finish: atEnd && (!check || finishedBefore || checkedNow) });

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
