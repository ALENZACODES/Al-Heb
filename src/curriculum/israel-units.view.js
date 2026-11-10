// Retired route. The Israel units were merged into the Practical course (#/practical), so there is one
// Israel conversation course. Old links and bookmarks to #/israel-units and #/israel-units/:id land here
// and are sent on to #/practical. The unit data and helpers in israel-units.js stay for the review history.
import { el } from "./dom.js";

export const NEW_HREF = "#/practical";

export function mount(root, ctx = {}) {
  const loc = ctx.location || globalThis.location;
  root.replaceChildren(
    el("section", { class: "card" },
      el("h1", { id: "view-title", tabindex: "-1" }, "Hebrew for Israel has moved"),
      el("p", {}, "The Israel units are now part of Practical, one course with grammar, review, listening and speaking on every page."),
      el("p", {}, el("a", { href: NEW_HREF, class: "btn", "data-redirect": NEW_HREF }, "Open Practical"))));
  try { if (loc && typeof loc.replace === "function") loc.replace(NEW_HREF); } catch { /* the link above still works */ }
  return () => {};
}
