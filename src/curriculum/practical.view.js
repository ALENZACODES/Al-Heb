/**
 * Practical conversation curriculum (#/practical, #/practical/:id, #/practical/:id/:page).
 * Preview. Situation packs and short pages, not a 126th lesson. Every Hebrew
 * line is copied from the phrasebook, a lesson, or a dialogue. Learner-facing
 * pages show only items that passed the Google Cloud check (or all items if
 * that report has not been written yet).
 */
import { el, heText, storeGet, storeSet } from "./dom.js";
import { audioButton } from "../shell/audio-access.js";
import { settingVoice } from "./ex-ui.js";
import { newCard, review, due } from "./srs.js";
import { loadJson } from "../grammar/loader.js";
import { showRimon } from "../shell/rimon-events.js";
import {
  PROGRESS_KEY, completedSet, pageKey,
  visibleItems, visiblePages, progressFraction, dueCardCount, paintDueBadge,
} from "./practical-progress.js";

export const STORE_KEY = "srs.practical";
export { PROGRESS_KEY };
export const INDEX_URL = "data/curriculum/practical/index.json";
export const RESULTS_URL = "data/curriculum/practical/gcloud-results.json";
export const CLIP_MAP_URL = "data/curriculum/practical/clip-map.json";
export const COVERS_URL = "data/curriculum/practical/covers.json";
export const DRAFT_TEXT = "Practical conversation pages. This is not a new lesson track and it does not change the 125 lessons.";

const RATINGS = [[1, "Again"], [2, "Hard"], [3, "Good"], [4, "Easy"]];

export const lessonHref = (id) => (/^I-\d+/.test(id) ? `#/intermediate/${id}` : `#/learn?lesson=${id}`);
export const unitHref = (id) => `#/practical/${id}`;
export const pageHref = (unitId, pageId) => `#/practical/${unitId}/${pageId}`;

export async function loadIndex() {
  return loadJson(INDEX_URL);
}

export async function loadUnit(id, index) {
  const row = (index?.units || []).find((u) => u.id === id);
  const file = row?.file || `data/curriculum/practical/${id}.json`;
  return loadJson(file);
}

async function loadOptional(url) {
  try { return await loadJson(url); } catch { return null; }
}

const cardId = (unitId, itemId) => `${unitId}|${itemId}`;

async function loadCards(ctx) {
  const s = await storeGet(ctx, STORE_KEY, null);
  return s && s.cards && typeof s.cards === "object" ? { cards: { ...s.cards } } : { cards: {} };
}

async function saveCards(ctx, state) {
  await storeSet(ctx, STORE_KEY, state);
}

async function loadProgress(ctx) {
  const s = await storeGet(ctx, PROGRESS_KEY, null);
  return s && typeof s === "object" ? { completed: { ...(s.completed || {}) } } : { completed: {} };
}

export async function paintPracticalDueBadge(ctx, doc = globalThis.document) {
  try {
    const state = await loadCards(ctx);
    const n = dueCardCount(state);
    paintDueBadge(doc, n);
    return n;
  } catch {
    return 0;
  }
}

function playBtn(ctx, kind, id, name) {
  return audioButton(el, ctx, {
    kind: kind || "line",
    id,
    voice: settingVoice(ctx),
    tradition: "israeli",
    label: "Listen",
    name: name || id,
    class: "btn secondary alef-play",
  });
}

function listenFor(item, clipMap, unitId) {
  const hit = clipMap?.items?.[`${unitId}|${item.id}`];
  if (hit?.clipId) return { kind: hit.kind || item.listen?.kind || "word", id: hit.clipId };
  return item.listen || { kind: "word", id: item.id };
}

function ring(fraction, label) {
  const f = progressFraction(fraction, 1) === fraction ? fraction : progressFraction(fraction, 1);
  const pct = Math.round((Number.isFinite(f) ? f : 0) * 100);
  const r = 16, c = 2 * Math.PI * r, dash = `${(pct / 100) * c} ${c}`;
  const svg = `<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="${r}" fill="none" stroke="currentColor" stroke-opacity="0.2" stroke-width="4"/><circle cx="20" cy="20" r="${r}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" transform="rotate(-90 20 20)" stroke-dasharray="${dash}"/></svg>`;
  const wrap = el("span", { class: "alef-practical-ring", role: "img", "aria-label": label || `${pct} percent complete` });
  wrap.innerHTML = svg;
  return wrap;
}

function coverNode(ctx, imageId, title) {
  if (!imageId) return null;
  try {
    const node = ctx?.img?.(el, { kind: "id", id: imageId, decorative: true, width: 800, class: "alef-practical-cover", alt: "" });
    if (node) {
      if (title && !node.getAttribute("alt")) node.setAttribute("alt", "");
      return node;
    }
  } catch { /* no approved picture is a silent skip */ }
  return null;
}

function renderList(root, ctx, index, covers, progress, results) {
  const byLevel = new Map((index.levels || []).map((lv) => [lv.id, { ...lv, units: [] }]));
  for (const u of index.units || []) {
    const bucket = byLevel.get(u.level) || { id: u.level, title: u.level, units: [] };
    bucket.units.push(u);
    byLevel.set(u.level, bucket);
  }
  const levels = [...byLevel.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const totals = index.totals || {};
  const done = completedSet(progress);
  root.replaceChildren(
    el("article", { class: "card alef-practical", "aria-labelledby": "view-title" },
      el("h1", { id: "view-title", tabindex: "-1" }, "Practical"),
      el("p", {}, DRAFT_TEXT),
      el("p", { class: "muted" },
        `${totals.pages ?? ""} short pages in ${totals.units ?? ""} units, grouped by level. Each page has a grammar note, a spaced-review queue, listening of existing clips, and an existing speaking set.`),
      ...levels.map((lv) => el("section", { "data-level": lv.id },
        el("h2", {}, lv.title),
        el("ul", { class: "alef-practical-list" },
          ...lv.units.map((u) => {
            const imgId = covers?.units?.[u.id]?.imageId;
            const pageCount = u.pageCount || 0;
            const doneN = [...done].filter((k) => k.startsWith(`${u.id}|`)).length;
            return el("li", { "data-unit": u.id },
              coverNode(ctx, imgId, u.title),
              ring(progressFraction(doneN, pageCount), `${doneN} of ${pageCount} pages done`),
              el("a", { href: unitHref(u.id) }, u.title),
              " ",
              el("span", { class: "muted" }, `${pageCount} page${pageCount === 1 ? "" : "s"}`));
          }))))));
}

async function renderSrs(ctx, unit, items, mountEl, { clipMap, onPageComplete } = {}) {
  const state = await loadCards(ctx);
  const now = Date.now();
  const queue = items.map((it) => {
    const cid = cardId(unit.id, it.id);
    const card = state.cards[cid] || newCard({ id: cid, kind: listenFor(it, clipMap, unit.id).kind === "word" ? "word" : "prayerLine", now });
    if (!state.cards[cid]) state.cards[cid] = card;
    return { it, card };
  });
  const dueCards = due(queue.map((x) => x.card), now);
  const dueSet = new Set(dueCards.map((c) => c.id));
  const next = queue.find((x) => dueSet.has(x.card.id) || x.card.state === "new") || null;

  function celebrate() {
    try { showRimon("highfive", { from: "practical" }); } catch { /* optional */ }
    const cheer = el("div", { class: "alef-practical-celebrate", "data-practical-complete": "true" },
      el("img", { class: "alef-celebrate-rimon", alt: "", width: "120", height: "120", src: new URL("../../assets/img/gen/MASCOT_rimon.800.webp", import.meta.url).href }),
      el("p", {}, "Page complete. Rimon is cheering."));
    mountEl.replaceChildren(cheer);
    if (onPageComplete) onPageComplete();
  }

  function show(entry) {
    if (!entry) {
      celebrate();
      return;
    }
    const it = entry.it;
    const listen = listenFor(it, clipMap, unit.id);
    mountEl.replaceChildren(
      el("p", { class: "muted" }, `${dueCards.length} card(s) due now of ${queue.length}.`),
      el("div", { class: "alef-int-he row", "data-srs-id": it.id },
        heText(it.he, "alef-he alef-word"),
        el("p", {}, it.en),
        it.translit ? el("p", { class: "alef-pron muted" }, it.translit) : null,
        playBtn(ctx, listen.kind, listen.id, it.en)),
      el("p", { class: "muted" }, "Rate the card. Again / Hard / Good / Easy use the same spaced-review scheduler as vocabulary review."),
      el("div", { class: "alef-int-rate row", role: "group", "aria-label": "How did you do?" },
        ...RATINGS.map(([n, t]) => el("button", { type: "button", class: "btn secondary", "data-rating": String(n), onclick: async () => {
          const cur = state.cards[entry.card.id] || entry.card;
          state.cards[entry.card.id] = review(cur, n, Date.now());
          await saveCards(ctx, state);
          await renderSrs(ctx, unit, items, mountEl, { clipMap, onPageComplete });
        } }, `${n} ${t}`))));
  }
  show(next);
}

async function speakBlock(ctx, setId, fallbackNote) {
  let set = null;
  try { set = await loadJson(`data/speak/sets/${setId}.json`); } catch { set = null; }
  return el("section", { class: "alef-practical-speak" },
    el("h3", {}, "Speaking"),
    el("p", { class: "muted" }, fallbackNote || "Repeat the existing survival or theme set. It is machine-built and unverified."),
    el("p", {}, el("a", { href: "#/speak" }, "Open the Say it page"), " for more speaking practice."),
    set ? el("ul", {}, ...(set.items || []).map((it) => el("li", { "data-speak": it.id },
      heText(it.he, "alef-he"), " ", el("span", { class: "muted" }, it.en || ""),
      it.audioId ? playBtn(ctx, it.kind === "word" ? "word" : "line", it.audioId, it.en) : el("span", { class: "muted" }, " No clip id yet."))))
      : el("p", { class: "muted" }, `Could not load ${setId}.`));
}

function listenList(ctx, unit, ids, items, clipMap) {
  const byId = new Map((items || []).map((it) => [it.id, it]));
  return el("ul", {},
    ...(ids || []).map((id) => {
      const it = byId.get(id) || (unit.items || []).find((x) => x.id === id || x.listen?.id === id);
      const listen = it ? listenFor(it, clipMap, unit.id) : { kind: String(id).includes("-w") ? "word" : "line", id };
      return el("li", { "data-listen": listen.id },
        it ? heText(it.he, "alef-he") : el("span", {}, id),
        " ", el("span", { class: "muted" }, it?.en || ""),
        " ", playBtn(ctx, listen.kind, listen.id, it?.en || id));
    }));
}

function renderUnit(root, ctx, index, unit, { covers, progress, results } = {}) {
  const pages = visiblePages(unit, results);
  const done = completedSet(progress);
  const doneN = pages.filter((p) => done.has(pageKey(unit.id, p.id))).length;
  const imgId = covers?.units?.[unit.id]?.imageId;
  root.replaceChildren(
    el("article", { class: "card alef-practical", "aria-labelledby": "view-title", "data-unit": unit.id },
      el("p", {}, el("a", { href: "#/practical" }, "All practical units")),
      coverNode(ctx, imgId, unit.title),
      el("h1", { id: "view-title", tabindex: "-1" }, unit.title),
      ring(progressFraction(doneN, pages.length), `${doneN} of ${pages.length} pages done`),
      el("span", { class: "muted" }, `${doneN} of ${pages.length} pages done`),
      el("p", { class: "muted" }, DRAFT_TEXT),
      unit.grammarNote ? el("p", { "data-grammar": "true" }, unit.grammarNote) : null,
      unit.note ? el("p", { class: "muted", "data-unit-note": "true" }, unit.note) : null,
      el("h2", {}, "Pages"),
      el("ol", { class: "alef-practical-pages" },
        ...pages.map((p) => el("li", { "data-page": p.id },
          el("a", { href: pageHref(unit.id, p.id) }, p.title),
          el("span", { class: "muted" }, ` · ${ (p.items || []).length } items`),
          done.has(pageKey(unit.id, p.id)) ? el("span", { class: "muted" }, " · done") : null))),
      el("h2", {}, "Related lessons"),
      el("ul", {},
        ...(unit.lessons || []).map((l) => el("li", {},
          el("a", { href: lessonHref(l.id) }, `${l.id}: ${l.title}`),
          el("span", { class: "muted" }, " (existing lesson, not a new one)"))))));
}

async function renderPage(root, ctx, index, unit, page, extras) {
  const { covers, progress, results, clipMap } = extras || {};
  const items = visibleItems(unit.id, page.items || [], results);
  if (!items.length) {
    root.replaceChildren(el("article", { class: "card" },
      el("h1", { id: "view-title" }, page.title),
      el("p", {}, "This page has no items that passed the Google Cloud check yet."),
      el("p", {}, el("a", { href: unitHref(unit.id) }, "Back to the unit"))));
    return;
  }
  const srsMount = el("div", { class: "alef-practical-srs" });
  const speak = await speakBlock(ctx, page.speakSet || (unit.speakSets || [])[0], (unit.speakDrills || [])[0]?.goal);
  const imgId = covers?.units?.[unit.id]?.imageId;
  const onPageComplete = async () => {
    const next = await loadProgress(ctx);
    next.completed[pageKey(unit.id, page.id)] = Date.now();
    await storeSet(ctx, PROGRESS_KEY, next);
  };
  root.replaceChildren(
    el("article", { class: "card alef-practical", "aria-labelledby": "view-title", "data-unit": unit.id, "data-page": page.id },
      coverNode(ctx, imgId, unit.title),
      el("p", {}, el("a", { href: "#/practical" }, "Practical"), " · ", el("a", { href: unitHref(unit.id) }, unit.title)),
      el("h1", { id: "view-title", tabindex: "-1" }, page.title),
      el("h2", {}, "Grammar note"),
      el("p", { "data-grammar": "true" }, page.grammarNote || unit.grammarNote || ""),
      el("h2", {}, "Spaced review"),
      srsMount,
      el("section", { class: "alef-practical-listen" },
        el("h3", {}, "Listening"),
        el("p", { class: "muted" }, "Existing clip ids only. If a file is missing, the button will say so."),
        listenList(ctx, unit, page.listenIds?.filter((id) => items.some((it) => it.id === id || it.listen?.id === id)) || items.map((it) => it.id), items, clipMap)),
      speak));
  await renderSrs(ctx, unit, items, srsMount, { clipMap, onPageComplete });
}

export function mount(root, ctx) {
  let alive = true;
  root.replaceChildren(el("article", { class: "card" }, el("h1", { id: "view-title" }, "Practical"), el("p", {}, "Loading…")));
  const id = ctx?.params?.id || ctx?.query?.id || "";
  const pageId = ctx?.params?.page || ctx?.query?.page || "";
  (async () => {
    const [index, covers, results, clipMap, progress] = await Promise.all([
      loadIndex(),
      loadOptional(COVERS_URL),
      loadOptional(RESULTS_URL),
      loadOptional(CLIP_MAP_URL),
      loadProgress(ctx),
    ]);
    if (!alive) return;
    await paintPracticalDueBadge(ctx);
    if (!id) {
      renderList(root, ctx, index, covers, progress, results);
      return;
    }
    const unit = await loadUnit(id, index);
    if (!alive) return;
    if (pageId) {
      const page = visiblePages(unit, results).find((p) => p.id === pageId) || (unit.pages || []).find((p) => p.id === pageId);
      if (!page) {
        root.replaceChildren(el("article", { class: "card" },
          el("h1", { id: "view-title" }, "Practical"),
          el("p", {}, "That page is not in this unit."),
          el("p", {}, el("a", { href: unitHref(id) }, "Back to the unit"))));
        return;
      }
      await renderPage(root, ctx, index, unit, page, { covers, progress, results, clipMap });
      return;
    }
    renderUnit(root, ctx, index, unit, { covers, progress, results });
  })().catch((err) => {
    if (!alive) return;
    root.replaceChildren(el("article", { class: "card" },
      el("h1", { id: "view-title" }, "Practical"),
      el("p", {}, "The practical units could not be loaded."),
      el("p", { class: "muted" }, String(err && err.message ? err.message : err))));
  });
  return () => { alive = false; };
}
