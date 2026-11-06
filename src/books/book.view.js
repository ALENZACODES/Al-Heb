// @ts-check
/* Book reader: one page at a time — the picture, the pointed Hebrew line
   big, transliteration and English under it, and a Listen button for each
   read-along voice. Voice clips live in the audio tree (kind "book"); a
   page whose clips are not recorded yet says so instead of failing. */
import { h, heSpan } from "../shell/ui.js";

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

  let page = 0;
  const stage = h("div", { class: "book-stage" });
  const dots = h("div", { class: "book-dots", role: "tablist", "aria-label": "Pages" });
  const audioEl = h("audio", { preload: "none" });
  let audioState = h("span", { class: "muted book-audio-state", role: "status" });

  const render = () => {
    const p = book.pages[page];
    stage.replaceChildren();
    dots.replaceChildren();
    if (book.hasImages) {
      stage.append(h("img", { class: "book-page-img", src: p.img, alt: p.illustration || "" }));
    } else {
      stage.append(h("div", { class: "book-page-img book-page-pending" },
        h("span", { class: "muted" }, "Pictures for this book are still being made.")));
    }
    stage.append(heSpan(p.he, "book-line"));
    stage.append(h("p", { class: "book-translit" }, p.translit));
    stage.append(h("p", { class: "muted book-en" }, p.en));

    const listen = (voice, label) => h("button", {
      type: "button", class: "btn book-listen",
      onclick: async () => {
        audioState.textContent = "Loading…";
        audioEl.src = p.audio[voice];
        try { await audioEl.play(); audioState.textContent = ""; }
        catch { audioState.textContent = "This page's voice is not recorded yet."; }
      },
    }, label);
    stage.append(h("div", { class: "book-listen-row" },
      listen("f", "▶ Listen — Noa"), listen("m", "▶ Listen — Ari"), audioState));

    const prev = h("button", { type: "button", class: "btn", onclick: () => { if (page > 0) { page--; render(); } } }, "← Previous");
    const next = h("button", { type: "button", class: "btn primary", onclick: () => { if (page < book.pages.length - 1) { page++; render(); } } },
      page === book.pages.length - 1 ? "The end" : "Next →");
    if (page === 0) prev.setAttribute("disabled", "");
    if (page === book.pages.length - 1) next.setAttribute("disabled", "");
    stage.append(h("div", { class: "book-nav" }, prev,
      h("span", { class: "muted" }, `Page ${page + 1} of ${book.pages.length}`), next));

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
