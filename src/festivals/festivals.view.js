/**
 * Festivals screens (DRAFT). One module, three views chosen by ctx.query.id:
 *   (none)           "This week in the Jewish year" card (portion, next festival within 30 days, candle lighting for the
 *                    learner's city), the ten festival vocabulary packs, and a link to the Shabbat-ready checklist
 *   shabbat-ready    the phrases of a Friday-night table that the corpus holds, with the learner's coverage
 *   <festival id>    one festival's vocabulary pack: 12 words (or fewer, with the gaps named) and a corpus reading line
 * mount(root, ctx) -> unmount. ctx: { store, settings?, hasRoute?, query?, now?() } plus optional `festivalsData` for tests
 * { vocab, links, shabbat, registry:[{id,title,he,english}], lessons:[[id,title]...], progress:{ data, snapshot } }.
 * Offline; reads repo data only. Links are shown only when the route exists in this build (ctx.hasRoute).
 */
import { h, heSpan } from "../shell/ui.js";
import { uiEnglish } from "../shell/names.js";
import { loadJSON } from "../curriculum/data.js";
import { CAL_PREFS_KEY } from "../curriculum/calendar.locations.js";
import { weekCard, linksFor, shabbatReady, packById, PACK_OF } from "./model.js";

export const DRAFT_NOTICE = "Draft. Nobody has proofread these words or lines. Words come from ALEF's vocabulary list and lines are copied from its own texts; whether a word means the same in the festival or in a line was not checked.";
export const CALC_NOTE = "Dates and times are calculated, not authoritative. Check with your community.";
const CSS = `
.fv{display:grid;gap:var(--gap,1rem);max-inline-size:40rem;margin-inline:auto;overflow-wrap:anywhere}
.fv *{box-sizing:border-box;max-inline-size:100%}
.fv .fv-card{border:2px solid var(--border,#999);border-radius:8px;padding:.75rem 1rem}
.fv h2{margin-block:0 .4rem;font-size:1.2rem}
.fv ul{margin:0;padding-inline-start:1.25rem}
.fv ul.fv-plain{list-style:none;padding:0;display:grid;gap:.5rem}
.fv .he{font-size:1.7rem;line-height:1.6;unicode-bidi:isolate}
.fv .fv-muted{font-size:.9rem;color:var(--muted,#555)}
.fv .fv-lede{font-size:1.05rem;margin-block:.4rem .8rem}
.fv .btn{min-block-size:var(--tap,48px);display:inline-flex;align-items:center}
.fv a:focus-visible,.fv button:focus-visible{outline:3px solid var(--focus,currentColor);outline-offset:2px}
.fv .fv-line{border-inline-start:4px solid var(--border,#999);padding-inline-start:.6rem;margin-block:.3rem}
`;
const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const DAY_WORDS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayName = (iso) => DAY_WORDS[new Date(iso + "T12:00:00Z").getUTCDay()];

async function loadAll(ctx) {
  const inj = ctx?.festivalsData;
  const [vocab, links, shabbat, registry, lessons, library] = await Promise.all([
    inj?.vocab || loadJSON("data/festivals/vocab.json"),
    inj?.links || loadJSON("data/festivals/links.json"),
    inj?.shabbat || loadJSON("data/festivals/shabbat-ready.json"),
    inj?.registry || loadJSON("data/corpus/registry.json").then((r) => r.entries),
    inj?.lessons ? Promise.resolve(inj.lessons) : loadJSON("data/curriculum/lessons.json").then((l) => l.lessons.map((x) => [x.id, x.title])).catch(() => []),
    inj?.library ? Promise.resolve(inj.library) : loadJSON("data/library/articles.json").then((l) => l.articles).catch(() => []),
  ]);
  // Library articles by holiday (articles list the calendar days they cover); Shemini Atzeret's pack shares the Sukkot article.
  const articles = new Map();
  for (const a of library || []) for (const d of a.dayIds || []) { if (!articles.has(d)) articles.set(d, []); articles.get(d).push({ id: a.id, title: a.title }); }
  return { vocab, links, shabbat, registry, registryById: new Map(registry.map((e) => [e.id, e])), registryTitles: new Map(registry.map((e) => [e.id, e.title])), lessonTitles: new Map(lessons), articles };
}

const calPrefsOf = (ctx) => { try { return ctx?.store?.get?.(CAL_PREFS_KEY, null) ?? null; } catch { return null; } };
const shellLocation = (ctx) => {
  const s = ctx?.settings, loc = s?.location, ok = (x) => typeof x === "number" && Number.isFinite(x);
  if (loc && ok(loc.lat) && ok(loc.lon)) return { lat: loc.lat, lon: loc.lon, tz: loc.tz };
  return ok(s?.lat) && ok(s?.lon) ? { lat: s.lat, lon: s.lon } : null;
};
const hasRoute = (ctx) => (typeof ctx?.hasRoute === "function" ? ctx.hasRoute : () => false);
const linkList = (links) => (links.length ? h("ul", {}, ...links.map((l) => h("li", {}, h("a", { href: l.href }, l.label)))) : null);

function weekView(ctx, D, now) {
  const card = weekCard({ now, calPrefs: calPrefsOf(ctx), fallbackLocation: shellLocation(ctx), links: D.links, env: { hasRoute: hasRoute(ctx), registryTitles: D.registryTitles, lessonTitles: D.lessonTitles } });
  const s = card.shabbat, f = card.festival, c = card.candles;
  const parts = [];
  parts.push(h("section", { class: "fv-card", "data-part": "parsha", "aria-labelledby": "fv-h-parsha" },
    h("h2", { id: "fv-h-parsha" }, "Torah portion"),
    s.parsha
      ? h("p", {}, heSpan(s.parsha.he), " ", h("strong", {}, s.parsha.en), h("span", { class: "fv-muted" }, ` (${s.schedule === "israel" ? "Israel" : "diaspora"} schedule), Shabbat ${s.hebrewDate}, ${s.daysAway === 0 ? "today" : s.daysAway === 1 ? "tomorrow" : "in " + s.daysAway + " days"}`))
      : h("p", {}, s.noPortion),
    card.parshaRoutes.length ? h("p", {}, h("a", { class: "btn secondary", href: "#/" + card.parshaRoutes[0] }, "Practise Torah reading")) : null));
  parts.push(h("section", { class: "fv-card", "data-part": "festival", "aria-labelledby": "fv-h-fest" },
    h("h2", { id: "fv-h-fest" }, "Next festival"),
    f ? h("div", {},
      ctx.img?.(h, { kind: 'festival', id: f.packId, class: 'fv-pic', width: 900 }),
      h("p", {}, heSpan(f.he), " ", h("strong", {}, f.en)),
      h("p", {}, f.inProgress ? `Under way now, until ${f.end}.` : `${f.start} (${dayName(f.start)}, ${f.hebrewDate}), ${f.daysUntil === 1 ? "tomorrow" : "in " + f.daysUntil + " days"}; begins at sundown on ${f.eve}.`),
      linkList(f.links),
      hasRoute(ctx)("festival") ? h("p", {}, h("a", { class: "btn", href: `#/festivals/${f.packId}` }, "Words for this festival")) : null)
    : h("p", {}, "No festival in the next 30 days.")));
  parts.push(h("section", { class: "fv-card", "data-part": "candles", "aria-labelledby": "fv-h-candles" },
    h("h2", { id: "fv-h-candles" }, "Candle lighting"),
    c && c.items.length
      ? h("div", {}, h("ul", {}, ...c.items.map((i) => h("li", {}, `${dayName(i.iso)} ${i.iso}: `, h("strong", {}, i.time), `, ${i.title.replace(/^Candle lighting \(|\)$/g, "")}${i.nightfall ? " (after nightfall, from an existing flame)" : ""}`))),
        h("p", { class: "fv-muted" }, `${c.city}; ${c.minutesBeforeSunset} minutes before sunset unless noted. ${CALC_NOTE}`))
      : h("p", {}, card.candleNote || ""),
    !c && hasRoute(ctx)("calendar") ? h("p", {}, h("a", { class: "btn secondary", href: "#/calendar" }, "Open Calendar")) : null,
    linkList(card.shabbatLinks),
    hasRoute(ctx)("festival") ? h("p", {}, h("a", { class: "btn", href: "#/festivals/shabbat-ready" }, "Shabbat-ready checklist")) : null));
  const packs = D.vocab.packs;
  parts.push(h("section", { class: "fv-card", "data-part": "packs", "aria-labelledby": "fv-h-packs" },
    h("h2", { id: "fv-h-packs" }, "Festival word packs"),
    h("ul", { class: "fv-plain" }, ...packs.map((p) => h("li", {}, hasRoute(ctx)("festival") ? h("a", { href: `#/festivals/${p.id}` }, nameOf(p.id)) : nameOf(p.id), h("span", { class: "fv-muted" }, ` ${pl(p.size, "word", "words")}${p.short ? ", short by " + p.short : ""}`))))));
  return parts;
}
const FEST_NAMES = { "rosh-hashanah": "Rosh Hashanah", "yom-kippur": "Yom Kippur", sukkot: "Sukkot", "shemini-atzeret": "Shemini Atzeret and Simchat Torah", hanukkah: "Hanukkah", "tu-bishvat": "Tu BiShvat", purim: "Purim", pesach: "Pesach (Passover)", shavuot: "Shavuot", "tisha-bav": "Tisha B'Av" };
const nameOf = (id) => FEST_NAMES[id] || id;

function packView(ctx, D, pack) {
  const parts = [
    ctx.img?.(h, { kind: 'festival', id: pack.id, class: 'fv-pic', width: 900 }),
    h("p", { class: "fv-lede" }, `Words to know for ${nameOf(pack.id)}${pack.withLine ? `, with lines where they appear in the prayers and readings` : ""}.`),
    ...(D.articles?.get(pack.id) || []).filter(() => hasRoute(ctx)("libraryarticle")).map((a) => h("p", {}, h("a", { class: "btn secondary", href: `#/library/${a.id}` }, `Read: ${a.title}`))),
    h("ul", { class: "fv-plain", "data-part": "words" }, ...pack.words.map((w) => h("li", { class: "fv-card", "data-word": w.id },
      h("div", {}, heSpan(w.he), " ", h("strong", {}, uiEnglish(ctx, w.en)), h("span", { class: "fv-muted" }, ` (${w.translit}, ${w.pos})`)),
      w.senseNote ? h("p", { class: "fv-muted" }, w.senseNote) : null,
      w.line ? h("div", { class: "fv-line" }, h("div", {}, heSpan(w.line.he)), h("div", { class: "fv-muted" }, `From ${w.line.title}. `, hasRoute(ctx)("text") && w.line.source === "registry" && D.registryById.has(w.line.id) ? h("a", { href: `#/read/${w.line.id}` }, "Open the text") : null)) : null))),
  ];
  if (pack.gaps.length) parts.push(h("section", { class: "fv-card", "data-part": "gaps" }, h("h2", {}, "Not in ALEF's vocabulary yet"), h("p", {}, pack.gaps.map((g) => g.en).join("; ") + "."), ...pack.notes.map((n) => h("p", { class: "fv-muted" }, n))));
  else if (pack.notes.length) parts.push(...pack.notes.map((n) => h("p", { class: "fv-muted" }, n)));
  const lk = linkList(linksFor(D.links.festivals?.[pack.id], { hasRoute: hasRoute(ctx), registryTitles: D.registryTitles, lessonTitles: D.lessonTitles }));
  if (lk) parts.push(h("section", { class: "fv-card", "data-part": "links" }, h("h2", {}, "In ALEF"), lk));
  return parts;
}

async function readyView(ctx, D) {
  let graded = null, err = null;
  try {
    const inj = ctx?.festivalsData?.progress;
    if (inj) graded = inj.lines;
    else {
      const [{ loadProgressData }, { readSnapshot, readableNow }] = await Promise.all([import("../progress/data.js"), import("../progress/model.js")]);
      const data = await loadProgressData();
      graded = readableNow(readSnapshot(ctx.store), data).lines;
    }
  } catch (e) { err = e; }
  const r = shabbatReady(D.shabbat, D.registryById, graded);
  const parts = [
    h("p", { class: "fv-muted" }, r.measured ? `${r.ready} of ${r.of} phrases use only letters and signs you have been taught. That says you can decode them, not that you can say them smoothly.` : "Coverage is not available right now (your progress could not be read), so the phrases are listed without it."),
    h("ul", { class: "fv-plain", "data-part": "phrases" }, ...r.phrases.map((p) => h("li", { class: "fv-card", "data-phrase": p.id },
      h("h2", {}, p.label), h("p", { class: "fv-muted" }, p.moment),
      ...p.he.map((l) => h("div", {}, heSpan(l))),
      p.english ? h("p", { class: "fv-muted" }, uiEnglish(ctx, p.english)) : null,
      h("p", { "data-coverage": p.decodable === null ? "unknown" : p.decodable ? "full" : "partial" },
        p.decodable === null ? "Coverage unknown." : p.decodable ? "You have been taught every letter and sign in it." : `${p.full} of ${pl(p.lines, "line", "lines")} use only what you have been taught${p.almost ? `; ${p.almost} more ${p.almost === 1 ? "is" : "are"} one step away` : ""}.`),
      hasRoute(ctx)("text") ? h("a", { class: "btn secondary", href: p.href }, "Open and read it") : null))),
  ];
  if (r.skipped.length) parts.push(h("section", { class: "fv-card", "data-part": "skipped" }, h("h2", {}, "Not in ALEF yet"), h("ul", {}, ...r.skipped.map((s) => h("li", {}, `${s.label}: ${s.reason}.`)))));
  return parts;
}

export async function mount(root, ctx) {
  let alive = true;
  const style = h("style", {}); style.textContent = CSS;
  const id = ctx?.query?.id || "";
  const title = id === "shabbat-ready" ? "Shabbat-ready" : id ? nameOf(id) : "This week in the Jewish year";
  const body = h("div", { class: "fv" });
  root.replaceChildren(style, h("h1", { id: "view-title", tabindex: "-1" }, title), body);
  try {
    const D = await loadAll(ctx);
    if (!alive) return () => {};
    const now = typeof ctx?.now === "function" ? ctx.now() : Date.now();
    let parts;
    if (!id) parts = weekView(ctx, D, now);
    else if (id === "shabbat-ready") parts = await readyView(ctx, D);
    else if (PACK_OF[id] === id || packById(D.vocab, id)) { const p = packById(D.vocab, id); parts = p ? packView(ctx, D, p) : [h("p", {}, "No such festival pack.")]; }
    else parts = [h("p", {}, "No such festival pack.")];
    if (!alive) return () => {};
    body.replaceChildren(...[...parts, h("footer", { class: "fv-muted" }, h("p", { class: "draft-flag" }, DRAFT_NOTICE), h("p", {}, CALC_NOTE)),
      id && hasRoute(ctx)("festivals") ? h("p", {}, h("a", { class: "btn secondary", href: "#/festivals" }, "Back to this week")) : null].filter(Boolean));
  } catch (e) {
    body.replaceChildren(h("p", { role: "alert" }, "This screen could not load its data. Nothing was lost."));
  }
  return () => { alive = false; };
}
