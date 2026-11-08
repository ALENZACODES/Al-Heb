// @ts-check
/**
 * Reform synagogues in Canada. One module, two views chosen by ctx.query.id:
 *   (none)   the directory: every congregation grouped by province, west to east, with a picture where one is held
 *   <id>     one congregation: pictures, the story in a few paragraphs, contact facts, open questions and sources
 * mount(root, ctx) -> unmount. ctx: { query?, hasRoute?, route? } plus optional `synagoguesData` for tests.
 * Data: data/synagogues/canada.json; pictures: assets/synagogues/<id>/ (full) and assets/synagogues/<id>/thumb/.
 * Offline once visited: the data and pictures are runtime-cached, not installed up front (tools/build-precache.mjs).
 */
import { h, heSpan } from "../shell/ui.js";
import { loadJSON } from "../curriculum/data.js";

const DATA = "data/synagogues/canada.json";
const IMG = (id, file, thumb = false) => `assets/synagogues/${id}/${thumb ? "thumb/" : ""}${file}`;

const CSS = `
.syn{display:grid;gap:var(--gap,1rem);max-inline-size:46rem;margin-inline:auto;overflow-wrap:anywhere}
.syn *{box-sizing:border-box;max-inline-size:100%}
.syn .syn-card{border:2px solid var(--border,#999);border-radius:var(--radius,12px);padding:.75rem 1rem;background:var(--card,transparent)}
.syn h2{margin-block:0 .4rem;font-size:1.2rem}
.syn h3{margin-block:.6rem .3rem;font-size:1.05rem}
.syn p{margin-block:.4rem}
.syn .he{font-family:var(--font-he,serif);font-size:1.5rem;line-height:1.5;unicode-bidi:isolate}
.syn .syn-muted{font-size:.9rem;color:var(--muted,#555)}
.syn .syn-lead{font-size:1.05rem}
.syn a:focus-visible,.syn button:focus-visible{outline:3px solid var(--focus,currentColor);outline-offset:2px}
.syn .btn{min-block-size:var(--tap,48px);display:inline-flex;align-items:center}
.syn ul.syn-plain{list-style:none;margin:0;padding:0;display:grid;gap:.6rem}
.syn ul.syn-grid{list-style:none;margin:0;padding:0;display:grid;gap:.75rem;grid-template-columns:repeat(auto-fill,minmax(14rem,1fr))}
.syn .syn-tile{display:grid;grid-template-rows:auto 1fr;border:2px solid var(--border,#999);border-radius:var(--radius,12px);overflow:hidden;background:var(--card,transparent);color:inherit;text-decoration:none;min-block-size:var(--tap,48px)}
.syn .syn-tile:hover,.syn .syn-tile:focus-visible{border-color:var(--accent,currentColor)}
.syn .syn-tile-pic{aspect-ratio:3/2;background:var(--bg,#eee);display:grid;place-items:center}
.syn .syn-tile-pic img{inline-size:100%;block-size:100%;object-fit:cover;display:block}
.syn .syn-tile-pic .he{font-size:2rem;color:var(--muted,#555)}
.syn .syn-tile-body{padding:.6rem .75rem}
.syn .syn-tile-body strong{display:block}
.syn .syn-badge{display:inline-block;border:1px solid var(--border,#999);border-radius:999px;padding:0 .5em;font-size:.8rem;color:var(--muted,#555);margin-inline-start:.3em;vertical-align:middle}
.syn .syn-hero{border:2px solid var(--border,#999);border-radius:var(--radius,12px);overflow:hidden;background:var(--bg,#eee)}
.syn .syn-hero img{display:block;inline-size:100%;block-size:auto;max-block-size:70vh;object-fit:contain;margin-inline:auto}
.syn .syn-caption{padding:.4rem .75rem}
.syn .syn-thumbs{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.5rem}
.syn .syn-thumbs button{padding:0;border:2px solid var(--border,#999);border-radius:8px;background:none;inline-size:6rem;block-size:4rem;overflow:hidden;cursor:pointer;min-block-size:0}
.syn .syn-thumbs button[aria-pressed="true"]{border-color:var(--accent,currentColor);outline:2px solid var(--accent,currentColor)}
.syn .syn-thumbs img{inline-size:100%;block-size:100%;object-fit:cover;display:block}
.syn dl{display:grid;grid-template-columns:max-content 1fr;gap:.3rem .9rem;margin:0}
.syn dt{font-weight:600}
.syn dd{margin:0}
.syn .syn-story p{line-height:1.55}
.syn .syn-nav{display:flex;flex-wrap:wrap;gap:.75rem;justify-content:space-between}
@media (max-width:480px){.syn dl{grid-template-columns:1fr}.syn dt{margin-block-start:.3rem}}
`;

const hasRoute = (ctx) => (typeof ctx?.hasRoute === "function" ? ctx.hasRoute : () => true);
const telHref = (s) => "tel:" + String(s).replace(/\s*ext\.?.*$/i, "").replace(/[^\d+]/g, "");
const siteLabel = (u) => String(u).replace(/^https?:\/\//, "").replace(/\/$/, "");
const nz = (s) => typeof s === "string" && s.trim().length > 0;
const foundedText = (c) => (nz(c.founded) ? c.founded : "founding date not found");

async function loadData(ctx) {
  return ctx?.synagoguesData || loadJSON(DATA);
}

function tile(ctx, c) {
  const first = c.images?.[0];
  const pic = h("div", { class: "syn-tile-pic", "aria-hidden": first ? null : "true" },
    first
      ? h("img", { src: IMG(c.id, first.file, true), alt: first.alt || "", loading: "lazy", decoding: "async", width: "480", height: "320" })
      : heSpan("בֵּית כְּנֶסֶת"));
  const body = h("div", { class: "syn-tile-body" },
    h("strong", {}, c.name, c.status === "legacy" ? h("span", { class: "syn-badge" }, "Legacy") : null),
    h("span", { class: "syn-muted" }, `${c.city} · founded ${foundedText(c)}`),
    c.images?.length ? h("span", { class: "syn-muted" }, ` · ${c.images.length} ${c.images.length === 1 ? "picture" : "pictures"}`) : null);
  const href = `#/synagogues/${c.id}`;
  return h("li", { "data-id": c.id }, hasRoute(ctx)("synagogue") ? h("a", { class: "syn-tile", href }, pic, body) : h("div", { class: "syn-tile" }, pic, body));
}

function listView(ctx, D) {
  const parts = [];
  const current = D.congregations.filter((c) => c.status !== "legacy").length;
  const legacy = D.congregations.length - current;
  const pictured = D.congregations.filter((c) => c.images?.length).length;
  parts.push(h("section", { class: "syn-card", "data-part": "intro" },
    h("p", { class: "syn-lead" }, heSpan("בֵּית כְּנֶסֶת"), " ", h("em", {}, "beit knesset"), ", a house of gathering: the Hebrew word for a synagogue. Reform congregations in Canada often call theirs a temple."),
    h("p", {}, `${D.congregations.length} congregations are listed: ${current} current members of the Reform movement in Canada and ${legacy} kept as legacy entries. ${pictured} have pictures. Open one to read its story, see its building and find its contact details.`),
    h("p", { class: "syn-muted" }, D.pictureNote)));
  for (const prov of D.provinces) {
    const items = D.congregations.filter((c) => c.province === prov.code);
    if (!items.length) continue;
    parts.push(h("section", { class: "syn-card", "data-part": "province", "data-province": prov.code, "aria-labelledby": `syn-h-${prov.code}` },
      h("h2", { id: `syn-h-${prov.code}` }, prov.name, h("span", { class: "syn-badge" }, `${items.length}`)),
      h("ul", { class: "syn-grid" }, ...items.map((c) => tile(ctx, c)))));
  }
  parts.push(h("footer", { class: "syn-muted" }, h("p", {}, D.sourceNote)));
  return parts;
}

function gallery(c) {
  const imgs = c.images || [];
  if (!imgs.length) return h("p", { class: "syn-muted", "data-part": "no-picture" }, "No picture is held for this congregation yet.");
  let idx = 0;
  const main = h("img", { src: IMG(c.id, imgs[0].file), alt: imgs[0].alt || "", decoding: "async", loading: "eager" });
  const cap = h("div", { class: "syn-caption syn-muted" }, imgs.length > 1 ? `Picture 1 of ${imgs.length}` : "Picture");
  const hero = h("figure", { class: "syn-hero", style: "margin:0" }, main, h("figcaption", {}, cap));
  const buttons = [];
  const show = (i) => {
    idx = i;
    main.setAttribute("src", IMG(c.id, imgs[i].file));
    main.setAttribute("alt", imgs[i].alt || "");
    cap.textContent = `Picture ${i + 1} of ${imgs.length}`;
    buttons.forEach((b, j) => b.setAttribute("aria-pressed", String(j === i)));
  };
  const thumbs = imgs.length > 1
    ? h("ul", { class: "syn-thumbs", "aria-label": "Pictures" }, ...imgs.map((im, i) => {
      const b = h("button", { type: "button", "aria-pressed": String(i === 0), "aria-label": `Show picture ${i + 1} of ${imgs.length}`, onclick: () => show(i) },
        h("img", { src: IMG(c.id, im.file, true), alt: "", loading: "lazy", decoding: "async" }));
      buttons.push(b);
      return h("li", {}, b);
    }))
    : null;
  return h("div", { "data-part": "gallery" }, hero, thumbs, c.imageNote ? h("p", { class: "syn-muted" }, c.imageNote) : null);
}

function facts(c) {
  const rows = [];
  const row = (k, v) => { if (v) rows.push(h("dt", {}, k), h("dd", {}, v)); };
  row("Address", nz(c.address) ? h("span", {}, c.address, c.addressNote ? h("span", { class: "syn-muted" }, ` (${c.addressNote})`) : null) : null);
  if (!nz(c.address) && c.addressNote) row("Address", h("span", { class: "syn-muted" }, c.addressNote));
  row("Telephone", nz(c.phone) ? h("span", {}, h("a", { href: telHref(c.phone) }, c.phone), c.phoneNote ? h("span", { class: "syn-muted" }, ` (${c.phoneNote})`) : null) : c.phoneNote ? h("span", { class: "syn-muted" }, c.phoneNote) : null);
  row("Email", nz(c.email) ? h("a", { href: `mailto:${c.email}` }, c.email) : c.emailNote ? h("span", { class: "syn-muted" }, c.emailNote) : null);
  row("Website", nz(c.website) ? h("a", { href: c.website, rel: "noopener", target: "_blank" }, siteLabel(c.website)) : c.websiteNote ? h("span", { class: "syn-muted" }, c.websiteNote) : null);
  row("Founded", h("span", {}, foundedText(c), c.foundedNote ? h("span", { class: "syn-muted" }, ` (${c.foundedNote})`) : null));
  row("Status", c.statusNote || (c.status === "legacy" ? "Legacy" : "Current"));
  return h("section", { class: "syn-card", "data-part": "facts", "aria-labelledby": "syn-h-facts" }, h("h2", { id: "syn-h-facts" }, "At a glance"), h("dl", {}, ...rows));
}

function detailView(ctx, D, c) {
  const i = D.congregations.indexOf(c);
  const prev = D.congregations[i - 1], next = D.congregations[i + 1];
  const parts = [];
  parts.push(h("p", { class: "syn-muted" }, `${c.city}, ${(D.provinces.find((p) => p.code === c.province) || {}).name || c.province} · founded ${foundedText(c)}`, c.status === "legacy" ? h("span", { class: "syn-badge" }, "Legacy") : null));
  if (c.summary) parts.push(h("p", { class: "syn-lead" }, c.summary));
  parts.push(gallery(c));
  parts.push(h("section", { class: "syn-card syn-story", "data-part": "story", "aria-labelledby": "syn-h-story" },
    h("h2", { id: "syn-h-story" }, "The story"),
    ...(c.story || []).map((p) => h("p", {}, p))));
  parts.push(facts(c));
  if (c.checks?.length) parts.push(h("section", { class: "syn-card", "data-part": "checks", "aria-labelledby": "syn-h-checks" },
    h("h2", { id: "syn-h-checks" }, "To confirm"),
    h("ul", {}, ...c.checks.map((x) => h("li", {}, x)))));
  if (c.sources?.length) parts.push(h("section", { class: "syn-card", "data-part": "sources", "aria-labelledby": "syn-h-sources" },
    h("h2", { id: "syn-h-sources" }, "Sources"),
    h("ul", {}, ...c.sources.map((s) => h("li", {}, h("a", { href: s.url, rel: "noopener", target: "_blank" }, s.label))))));
  parts.push(h("nav", { class: "syn-nav", "aria-label": "Other congregations" },
    prev ? h("a", { class: "btn secondary", href: `#/synagogues/${prev.id}` }, `← ${prev.name}`) : h("span", {}),
    next ? h("a", { class: "btn secondary", href: `#/synagogues/${next.id}` }, `${next.name} →`) : h("span", {})));
  return parts;
}

export async function mount(root, ctx) {
  let alive = true;
  const style = h("style", {}); style.textContent = CSS;
  const id = ctx?.query?.id || "";
  const title = h("h1", { id: "view-title", tabindex: "-1" }, id ? "Synagogue" : "Reform synagogues in Canada");
  const body = h("div", { class: "syn" });
  const back = id && hasRoute(ctx)("synagogues") ? h("p", {}, h("a", { href: "#/synagogues" }, "← All synagogues")) : null;
  root.replaceChildren(style, ...(back ? [back] : []), title, body);
  try {
    const D = await loadData(ctx);
    if (!alive) return () => {};
    if (!id) { body.replaceChildren(...listView(ctx, D)); return () => { alive = false; }; }
    const c = D.congregations.find((x) => x.id === id);
    if (!c) {
      body.replaceChildren(h("p", { role: "alert" }, "No such congregation in the list."), hasRoute(ctx)("synagogues") ? h("p", {}, h("a", { class: "btn", href: "#/synagogues" }, "All synagogues")) : null);
      return () => { alive = false; };
    }
    title.textContent = c.name;
    body.replaceChildren(...detailView(ctx, D, c));
  } catch (e) {
    body.replaceChildren(h("p", { role: "alert" }, "This screen could not load its data. Nothing was lost."));
  }
  return () => { alive = false; };
}
