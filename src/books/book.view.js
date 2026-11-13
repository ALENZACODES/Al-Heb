// @ts-check
/* Book reader: one page at a time — the picture, the pointed Hebrew line
   big, transliteration and English under it, and a Listen button for each
   read-along voice. Voice clips live in the audio tree (kind "book"); a
   page whose clips are not recorded yet says so instead of failing. */
import { h, heSpan } from "../shell/ui.js";
import { readerSlow, setReaderSlow, applyReaderRate, speedLine } from "./reader.speed.js";
import { resolveBookId, shelfNumber, nextOnShelf } from "./order.js";
import { storyCheck } from "./check.js";
import { isAudioFree } from "../shell/audiofree.js";
import { estimateWordTimings, wordAt, bookReadiness, readinessLine } from "../audiolab/core.js";
import { ensureStyle as ensureListenStyle } from "../audiolab/ui.js";
/** A8: the read-along highlight uses estimated word timings (there are no measured ones for book pages); the page says so. */
export const ESTIMATED_NOTE = "Read along: the highlighted word follows estimated timings (shared out by word length), not measured ones.";
import { bookPage } from "./extras.js"; // lane games-books: difficulty, new-word marks, English per line, completion card, next in level
/** S-04: a page held back because it says the divine name; nothing plays, and the page says why. */
export const HELD_PAGE = "This page's recording is held for review: the checks heard words in it wrongly. Read it from the page.";

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

/** S-09: a page's clip in one voice, or "" when the page is held or has no clip in that voice. */
export const pageClip = (p, voice) => (p && !p.audioHeld && p.audio && p.audio[voice]) || "";
/** S-09: the clip to warm once the current page's voice is playing: the next page, same voice. */
export const nextClip = (pages, page, voice) => pageClip((pages || [])[page + 1], voice);

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
  import('../bridge/chip.js').then((m) => m.attachChip(root, ctx)).catch(() => { /* the screen works without the stage line */ }); // your reading-ladder stage, on every reading screen
  const num = shelfNumber(id, shelfBooks);
  root.append(h("p", { class: "muted" }, `${num ? `Book ${num} of ${shelfBooks.length} · ` : ""}${book.titleTranslit} · ${book.level} · ${book.pages.length} pages`));
  // A7: how many pages have audio in the learner's voice, from the book's own page list
  { const v = (() => { try { return ctx?.settings?.get?.("voice") === "m" ? "m" : "f"; } catch { return "f"; } })();
    const line = readinessLine(bookReadiness(book.pages, v), "pages");
    if (line && !isAudioFree(ctx)) root.append(h("p", { class: "muted book-audio-ready", "data-audio-ready": "" }, `${v === "m" ? "Ari" : "Noa"}: ${line}`)); }
  ensureListenStyle(globalThis.document);
  const nextBook = nextOnShelf(id, shelfBooks);
  const check = storyCheck(book);
  const extras = bookPage(h, heSpan, ctx, { id, book, shelfBooks, onChange: () => { if (shownPage >= 0) render(); } });
  root.append(extras.header());

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
  const finishedLine = () => h("div", {}, h("p", { class: "book-finished" }, `You finished ${book.titleEn}.`), extras.finished());
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
  // S-09 (lane 1): long read-aloud clips were slow to start. The page's clip in the learner's voice is attached when the page is
  // drawn, with preload="metadata", so the browser knows its length and has its first bytes before Listen is pressed; once a
  // voice plays, the next page's clip in the same voice is fetched quietly so the next page starts quickly. Never in
  // audio-free mode or with the browser's data saver on.
  const audioEl = h("audio", { preload: "metadata" });
  const prefVoice = () => { try { return ctx?.settings?.get?.("voice") === "m" ? "m" : "f"; } catch { return "f"; } };
  const quietData = () => { try { return isAudioFree(ctx) || !!globalThis.navigator?.connection?.saveData; } catch { return false; } };
  let wanted = false, voiceNow = "";
  const warmed = new Set();
  const warmNext = () => {
    const u = nextClip(book.pages, page, voiceNow || prefVoice());
    if (!u || warmed.has(u) || quietData() || typeof fetch !== "function") return;
    warmed.add(u);
    fetch(u).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => { warmed.delete(u); });
  };
  const primeVoice = () => {
    const u = pageClip(book.pages[page], prefVoice());
    if (u && !quietData()) audioEl.setAttribute("src", u);
  };
  applyReaderRate(audioEl, readerSlow()); // normal unless Slower was chosen earlier this session
  let audioState = h("span", { class: "muted book-audio-state", role: "status" });
  // A8 read along: this visit only. The voice turns the page by itself at the end of each page and the word sounding now is highlighted.
  let readAlong = false, wordSpans = [], timings = null;
  const lightWord = () => {
    if (!readAlong || !wordSpans.length) return;
    if (!timings && audioEl.duration > 0) timings = estimateWordTimings(wordSpans.map((x) => x.textContent), audioEl.duration);
    const at = timings ? wordAt(timings, audioEl.currentTime) : -1;
    wordSpans.forEach((x, i) => x.setAttribute("data-on", i === at ? "1" : "0"));
  };
  audioEl.addEventListener("timeupdate", lightWord);
  audioEl.addEventListener("loadedmetadata", () => { timings = null; });
  // One shared state line for the book's voice (M-04): playing, finished, or why there is no sound.
  let playingLabel = "";
  audioEl.addEventListener("playing", () => { audioState.textContent = `Playing: ${playingLabel || "this page"}.`; warmNext(); });
  audioEl.addEventListener("ended", () => { audioState.textContent = "Finished. Tap Listen to hear it again."; });
  // registered after the Finished line, so a read-along page turn writes the last word on the status line
  audioEl.addEventListener("ended", () => {
    wordSpans.forEach((x) => x.setAttribute("data-on", "0"));
    if (!readAlong || page >= book.pages.length - 1) return;
    const v = voiceNow || prefVoice();
    page++; render();
    const np = book.pages[page];
    if (np.audioHeld) { audioState.textContent = HELD_PAGE; return; }
    if (!np.audio || !np.audio[v]) { audioState.textContent = "Read along stopped: this page's voice is not recorded yet."; return; }
    startVoice(v, v === "m" ? "Listen (Ari)" : "Listen (Noa)");
  });
  audioEl.addEventListener("error", () => { if (wanted && audioEl.getAttribute("src")) audioState.textContent = "No sound: this page's recording did not load."; });

  // C-04 (12 Nov site check): a page turn stops the voice, and the status line belongs to the page on screen. A play that
  // resolves after the page changed (a slow clip) is stopped too, so the old page never plays over the new one.
  let shownPage = -1, playToken = 0;
  const stopVoice = () => {
    playToken++; wanted = false;
    try { audioEl.pause(); } catch { /* already stopped */ }
    if (audioEl.getAttribute("src")) { audioEl.removeAttribute("src"); try { audioEl.load(); } catch { /* nothing loaded */ } }
    playingLabel = ""; audioState.textContent = "";
  };
  /** Play this page in one voice (Listen buttons, and read along turning to the next page). */
  async function startVoice(voice, label) {
    const p = book.pages[page];
    if (p.audioHeld) { audioState.textContent = HELD_PAGE; return; }
    if (!p.audio || !p.audio[voice]) { audioState.textContent = "This page's voice is not recorded yet."; return; }
    const tok = ++playToken, at = page;
    audioState.textContent = "Loading…";
    playingLabel = String(label).replace(/^▶\s*/, "");
    wanted = true; voiceNow = voice;
    if (audioEl.getAttribute("src") !== p.audio[voice]) audioEl.setAttribute("src", p.audio[voice]); // already primed: keep what has loaded
    applyReaderRate(audioEl, readerSlow()); // normal pace unless the learner chose Slower (this session only)
    try { await audioEl.play(); if (tok !== playToken || at !== page) { try { audioEl.pause(); } catch { /* stopped */ } } }
    catch { if (tok === playToken && at === page) audioState.textContent = "This page's voice is not recorded yet."; }
  }
  const render = () => {
    if (page !== shownPage) { stopVoice(); shownPage = page; primeVoice(); }
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
    // Read along (audio lane) draws the line as plain word spans it highlights; otherwise the line carries the new-word marks (games-books lane).
    if (readAlong) {
      wordSpans = String(p.he).split(/\s+/).filter(Boolean).map((w) => h("span", { class: "al-word", "data-on": "0" }, w));
      timings = null;
      stage.append(h("span", { lang: "he", dir: "rtl", class: "book-line" }, ...wordSpans.flatMap((x, i) => (i ? [" ", x] : [x]))));
    } else { wordSpans = []; stage.append(extras.line(p)); }
    stage.append(h("p", { class: "book-translit" }, p.translit));
    stage.append(extras.en(p, page));

    const listen = (voice, label) => h("button", {
      type: "button", class: "btn book-listen",
      onclick: () => startVoice(voice, label),
    }, label);
    const along = h("button", {
      type: "button", class: "btn secondary book-along", "aria-pressed": String(readAlong),
      onclick: () => { readAlong = !readAlong; along.setAttribute("aria-pressed", String(readAlong)); render(); audioState.textContent = readAlong ? "Read along is on: press Listen and the pages turn by themselves." : "Read along is off."; },
    }, "Read along");
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
    // S-06: a held page offers no Listen button, only the reason (a held page's recording is withheld on purpose).
    stage.append(p.audioHeld
      ? h("div", { class: "book-listen-row book-held" }, h("p", { class: "muted", role: "note" }, HELD_PAGE))
      : h("div", { class: "book-listen-row" }, listen("f", "▶ Listen (Noa)"), listen("m", "▶ Listen (Ari)"), slower, along, audioState));
    if (readAlong && !p.audioHeld) stage.append(h("p", { class: "muted al-est book-along-note" }, ESTIMATED_NOTE));

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
