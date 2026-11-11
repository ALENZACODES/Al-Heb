/**
 * #/israel-units and #/israel-units/:id now redirect to the live Practical course
 * (one Israel course). The old routes stay registered so bookmarks and search
 * are not dead links. The preview list is hidden from the nav.
 */
import { el } from "./dom.js";
import { practicalHref } from "./israel-units.js";

export function mount(root, ctx = {}) {
  const href = practicalHref(ctx.query?.id || ctx.params?.id);
  const path = href.replace(/^#/, "") || "/practical";
  const wrap = el("article", { class: "alef-israel-units", "aria-labelledby": "view-title" },
    el("h1", { id: "view-title", tabindex: "-1" }, "This course is now Practical"),
    el("p", {}, "Hebrew for Israel is one course: the live Practical units. The old unit-by-unit preview opens there, so earlier links still work."),
    el("a", { class: "btn", href, "data-redirect": href }, "Open Practical"));
  root.append(wrap);
  if (typeof ctx.route === "function") {
    try { ctx.route(path); } catch { /* tests may stub or omit the router */ }
  }
  return () => { wrap.remove(); };
}
