// @ts-check
/**
 * Reform synagogues in Canada. One module, two views chosen by ctx.query.id:
 *   (none)   the directory: every congregation grouped by province, west to east, with a picture where one is held
 *   <id>     one congregation: pictures, its history in a few paragraphs, visiting and contact details, and sources
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
.syn ul.syn-grid{list-style:none;margin:0;padding:0;display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr));align-items:stretch}
.syn ul.syn-grid>li{display:flex;flex-direction:column;gap:.4rem;min-inline-size:0}
.syn .syn-tile{display:flex;flex-direction:column;flex:1;border:2px solid var(--border,#999);border-radius:var(--radius,12px);overflow:hidden;background:var(--card,transparent);color:inherit;text-decoration:none;box-shadow:0 2px 10px rgba(0,0,0,.08);transition:transform .15s ease,box-shadow .15s ease}
.syn .syn-tile:hover,.syn .syn-tile:focus-visible{border-color:var(--accent,currentColor);transform:translateY(-2px);box-shadow:0 6px 18px rgba(0,0,0,.14)}
@media (prefers-reduced-motion:reduce){.syn .syn-tile{transition:none}.syn .syn-tile:hover{transform:none}}
.syn .syn-tile-pic{position:relative;aspect-ratio:4/3;overflow:hidden;background:#0f3d2e;display:grid;place-items:center;flex:none}
.syn .syn-tile-pic img{position:absolute;inset:0;inline-size:100%!important;block-size:100%!important;max-inline-size:none;object-fit:cover;object-position:center;display:block}
.syn .syn-tile-pic .he{font-size:2rem;color:#d4af37}
.syn .syn-tile-body{padding:.7rem .85rem .8rem;display:grid;gap:.15rem;flex:1}
.syn .syn-tile-name{display:block;font-size:1.05rem;line-height:1.25;font-weight:700}
.syn .syn-badge{display:inline-block;border:1px solid var(--border,#999);border-radius:999px;padding:0 .5em;font-size:.8rem;color:var(--muted,#555);margin-inline-start:.3em;vertical-align:middle}
.syn .syn-map{display:inline-flex;align-items:center;justify-content:center;gap:.35em;min-block-size:40px;padding:.3rem .8rem;border-radius:999px;border:1.5px solid #b8962e;color:inherit;text-decoration:none;font-size:.9rem;font-weight:600;background:transparent}
.syn .syn-map:hover,.syn .syn-map:focus-visible{background:#b8962e;color:#0f3d2e}
.syn .syn-map-row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}
.syn .syn-map-alt{font-size:.8rem;color:var(--muted,#555)}
.syn .syn-hero{position:relative;border:2px solid var(--border,#999);border-radius:var(--radius,12px);overflow:hidden;background:#0f3d2e;aspect-ratio:16/10}
.syn .syn-hero img{position:absolute;inset:0;inline-size:100%!important;block-size:100%!important;max-inline-size:none;object-fit:contain}
.syn .syn-hero figcaption{position:absolute;inset-inline-end:.5rem;inset-block-end:.5rem;background:rgba(15,61,46,.8);color:#f4e7c1;border-radius:999px;padding:.1rem .6rem;font-size:.8rem}
.syn .syn-caption{padding:0}
.syn .syn-src{font-size:10px;line-height:1.35;opacity:.45;color:var(--muted,#555)}
.syn .syn-src summary{cursor:pointer}
.syn .syn-src ul{margin:.3rem 0 0;padding-inline-start:1.1rem}
.syn .syn-src a{color:inherit}
.syn .syn-thumbs{list-style:none;margin:.6rem 0 0;padding:0;display:flex;flex-wrap:wrap;gap:.5rem}
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
/** Apple Maps on iPhone, iPad and Mac; Google Maps everywhere else. */
const isApple = () => { try { const n = globalThis.navigator || {}; return /iPhone|iPad|iPod|Macintosh/i.test(n.userAgent || "") || (n.platform === "MacIntel" && n.maxTouchPoints > 1); } catch { return false; } };
const mapQuery = (c) => (nz(c.address) ? c.address : `${c.name}, ${c.city}`);
const appleMaps = (c) => `https://maps.apple.com/?q=${encodeURIComponent(c.name)}&address=${encodeURIComponent(mapQuery(c))}`;
const googleMaps = (c) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.name}, ${mapQuery(c)}`)}`;
function mapLinks(c, { both = false } = {}) {
  const apple = isApple();
  const main = h("a", { class: "syn-map", href: apple ? appleMaps(c) : googleMaps(c), target: "_blank", rel: "noopener", "aria-label": `Directions to ${c.name} in ${apple ? "Apple" : "Google"} Maps` }, "📍 ", apple ? "Apple Maps" : "Google Maps");
  if (!both) return h("div", { class: "syn-map-row" }, main);
  const other = h("a", { class: "syn-map-alt", href: apple ? googleMaps(c) : appleMaps(c), target: "_blank", rel: "noopener" }, apple ? "or Google Maps" : "or Apple Maps");
  return h("div", { class: "syn-map-row" }, main, other);
}
const sinceText = (c) => { if (!nz(c.founded)) return ""; const f = c.founded.replace(/\s*\(.*\)/, ""); return `since ${/^\d/.test(f) ? f : "the " + f}`; };
const FORMER = "Former congregation";

async function loadData(ctx) {
  return ctx?.synagoguesData || loadJSON(DATA);
}

function tile(ctx, c) {
  const first = c.images?.[0];
  const pic = h("div", { class: "syn-tile-pic", "aria-hidden": first ? null : "true" },
    first
      ? h("img", { src: IMG(c.id, first.file, true), alt: first.alt || "", loading: "lazy", decoding: "async" })
      : heSpan("בֵּית כְּנֶסֶת"));
  const body = h("div", { class: "syn-tile-body" },
    h("strong", { class: "syn-tile-name" }, c.name),
    h("span", { class: "syn-muted" }, [c.city, c.status === "legacy" ? "" : sinceText(c)].filter(Boolean).join(" · ")));
  const href = `#/synagogues/${c.id}`;
  return h("li", { "data-id": c.id }, hasRoute(ctx)("synagogue") ? h("a", { class: "syn-tile", href }, pic, body) : h("div", { class: "syn-tile" }, pic, body), mapLinks(c));
}

function listView(ctx, D) {
  const parts = [];
  parts.push(h("section", { class: "syn-card", "data-part": "intro" },
    h("p", { class: "syn-lead" }, heSpan("בֵּית כְּנֶסֶת"), " ", h("em", {}, "beit knesset"), " means a house of gathering. It is the Hebrew word for a synagogue."),
    h("p", {}, "Find a Reform synagogue near you, from Vancouver to Montreal. Open any congregation to read its history, see its building and get directions.")));
  const current = D.congregations.filter((c) => c.status !== "legacy");
  const former = D.congregations.filter((c) => c.status === "legacy");
  for (const prov of D.provinces) {
    const items = current.filter((c) => c.province === prov.code);
    if (!items.length) continue;
    parts.push(h("section", { class: "syn-card", "data-part": "province", "data-province": prov.code, "aria-labelledby": `syn-h-${prov.code}` },
      h("h2", { id: `syn-h-${prov.code}` }, prov.name),
      h("ul", { class: "syn-grid" }, ...items.map((c) => tile(ctx, c)))));
  }
  if (former.length) parts.push(h("section", { class: "syn-card", "data-part": "former", "aria-labelledby": "syn-h-former" },
    h("h2", { id: "syn-h-former" }, "Former Congregations"),
    h("p", { class: "syn-muted" }, "Remembered here for the communities they built."),
    h("ul", { class: "syn-grid" }, ...former.map((c) => tile(ctx, c)))));
  return parts;
}

function gallery(c) {
  const imgs = c.images || [];
  if (!imgs.length) return null;
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
  return h("div", { "data-part": "gallery" }, hero, thumbs);
}

function facts(c) {
  const rows = [];
  const row = (k, v) => { if (v) rows.push(h("dt", {}, k), h("dd", {}, v)); };
  row("Address", nz(c.address) ? h("span", {}, c.address, c.addressNote ? h("span", { class: "syn-muted" }, ` (${c.addressNote})`) : null) : null);
  if (!nz(c.address) && c.addressNote) row("Address", h("span", { class: "syn-muted" }, c.addressNote));
  row("Map", mapLinks(c, { both: true }));
  row("Telephone", nz(c.phone) ? h("a", { href: telHref(c.phone) }, c.phone) : null);
  row("Email", nz(c.email) ? h("a", { href: `mailto:${c.email}` }, c.email) : null);
  row("Website", nz(c.website) ? h("a", { href: c.website, rel: "noopener", target: "_blank" }, siteLabel(c.website)) : null);
  row("Founded", nz(c.founded) ? c.founded : null);
  return h("section", { class: "syn-card", "data-part": "facts", "aria-labelledby": "syn-h-facts" }, h("h2", { id: "syn-h-facts" }, c.status === "legacy" ? "Details" : "Visit and Contact"), h("dl", {}, ...rows));
}

function detailView(ctx, D, c) {
  const i = D.congregations.indexOf(c);
  const prev = D.congregations[i - 1], next = D.congregations[i + 1];
  const parts = [];
  const place = `${c.city}, ${(D.provinces.find((p) => p.code === c.province) || {}).name || c.province}`;
  parts.push(h("p", { class: "syn-muted" }, [place, sinceText(c)].filter(Boolean).join(" · "), c.status === "legacy" ? h("span", { class: "syn-badge" }, FORMER) : null));
  if (c.summary) parts.push(h("p", { class: "syn-lead" }, c.summary));
  parts.push(mapLinks(c, { both: true }));
  const g = gallery(c); if (g) parts.push(g);
  parts.push(h("section", { class: "syn-card syn-story", "data-part": "story", "aria-labelledby": "syn-h-story" },
    h("h2", { id: "syn-h-story" }, "History"),
    ...(c.story || []).map((p) => h("p", {}, p))));
  parts.push(facts(c));
  if (c.sources?.length) parts.push(h("details", { class: "syn-src", "data-part": "sources" },
    h("summary", {}, "Sources"),
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
  const title = h("h1", { id: "view-title", tabindex: "-1" }, id ? "Synagogue" : "Reform Synagogues in Canada");
  const body = h("div", { class: "syn" });
  const back = id && hasRoute(ctx)("synagogues") ? h("p", {}, h("a", { href: "#/synagogues" }, "← All Synagogues")) : null;
  root.replaceChildren(style, ...(back ? [back] : []), title, body);
  try {
    const D = await loadData(ctx);
    if (!alive) return () => {};
    if (!id) { body.replaceChildren(...listView(ctx, D)); return () => { alive = false; }; }
    const c = D.congregations.find((x) => x.id === id);
    if (!c) {
      body.replaceChildren(h("p", { role: "alert" }, "We could not find that congregation."), hasRoute(ctx)("synagogues") ? h("p", {}, h("a", { class: "btn", href: "#/synagogues" }, "All Synagogues")) : null);
      return () => { alive = false; };
    }
    title.textContent = c.name;
    body.replaceChildren(...detailView(ctx, D, c));
  } catch (e) {
    body.replaceChildren(h("p", { role: "alert" }, "This page did not load. Please try again."));
  }
  return () => { alive = false; };
}
