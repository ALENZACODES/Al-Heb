/**
 * Practical conversation curriculum (#/practical, #/practical/:id, #/practical/:id/:page).
 * Preview. Situation packs and short pages, not a 126th lesson. Every Hebrew
 * line is copied from the phrasebook, a lesson, or a dialogue. Units are not
 * native-reviewed; the badge on the page says so.
 */
import { el, heText, storeGet, storeSet } from "./dom.js";
import { audioButton } from "../shell/audio-access.js";
import { settingVoice } from "./ex-ui.js";
import { newCard, review, due } from "./srs.js";
import { loadJson } from "../grammar/loader.js";

export const STORE_KEY = "srs.practical";
export const INDEX_URL = "data/curriculum/practical/index.json";
export const REVIEW_FLAG = "Needs native review: the Hebrew, glosses and pronunciation have not been checked by a native speaker. Every line is copied from the existing phrasebook, a lesson, or a dialogue already in ALEF.";
export const DRAFT_TEXT = "Draft practical pages. This is not a new lesson track and it does not change the 125 lessons.";

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

const cardId = (unitId, itemId) => `${unitId}|${itemId}`;

async function loadCards(ctx) {
  const s = await storeGet(ctx, STORE_KEY, null);
  return s && s.cards && typeof s.cards === "object" ? { cards: { ...s.cards } } : { cards: {} };
}

async function saveCards(ctx, state) {
  await storeSet(ctx, STORE_KEY, state);
}

function badge(extra) {
  return el("p", { class: "draft-flag", role: "note", "data-native-review": "true" }, extra || REVIEW_FLAG);
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

function renderList(root, ctx, index) {
  const byLevel = new Map((index.levels || []).map((lv) => [lv.id, { ...lv, units: [] }]));
  for (const u of index.units || []) {
    const bucket = byLevel.get(u.level) || { id: u.level, title: u.level, units: [] };
    bucket.units.push(u);
    byLevel.set(u.level, bucket);
  }
  const levels = [...byLevel.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const totals = index.totals || {};
  root.replaceChildren(
    el("article", { class: "card alef-practical", "aria-labelledby": "view-title" },
      el("h1", { id: "view-title", tabindex: "-1" }, "Practical"),
      el("p", {}, DRAFT_TEXT),
      badge(),
      el("p", { class: "muted" },
        `${totals.pages ?? ""} short pages in ${totals.units ?? ""} units, grouped by level. Each page has a grammar note, a spaced-review queue, listening of existing clips, and an existing speaking set.`),
      ...levels.map((lv) => el("section", { "data-level": lv.id },
        el("h2", {}, lv.title),
        el("ul", { class: "alef-practical-list" },
          ...lv.units.map((u) => el("li", { "data-unit": u.id },
            el("a", { href: unitHref(u.id) }, u.title),
            " ",
            el("span", { class: "muted" }, `${u.pageCount} page${u.pageCount === 1 ? "" : "s"}`),
            " ",
            el("span", { class: "draft-flag", "data-native-review": "true" }, "Needs native review"))))))));
}

function itemById(list, id) {
  return (list || []).find((it) => it.id === id) || null;
}

async function renderSrs(ctx, unit, items, mountEl) {
  const state = await loadCards(ctx);
  const now = Date.now();
  const queue = items.map((it) => {
    const cid = cardId(unit.id, it.id);
    const card = state.cards[cid] || newCard({ id: cid, kind: it.listen?.kind === "word" ? "word" : "prayerLine", now });
    if (!state.cards[cid]) state.cards[cid] = card;
    return { it, card };
  });
  const dueCards = due(queue.map((x) => x.card), now);
  const dueSet = new Set(dueCards.map((c) => c.id));
  const next = queue.find((x) => dueSet.has(x.card.id) || x.card.state === "new") || queue[0];

  function show(entry) {
    const it = entry?.it;
    if (!it) {
      mountEl.replaceChildren(el("p", {}, "This page has no review items."));
      return;
    }
    mountEl.replaceChildren(
      el("p", { class: "muted" }, `${dueCards.length} card(s) due now of ${queue.length}.`),
      el("div", { class: "alef-int-he row", "data-srs-id": it.id },
        heText(it.he, "alef-he alef-word"),
        el("p", {}, it.en),
        it.translit ? el("p", { class: "alef-pron muted" }, it.translit) : null,
        playBtn(ctx, it.listen?.kind, it.listen?.id || it.id, it.en)),
      el("p", { class: "muted" }, "Rate the card. Again / Hard / Good / Easy use the same spaced-review scheduler as vocabulary review."),
      el("div", { class: "alef-int-rate row", role: "group", "aria-label": "How did you do?" },
        ...RATINGS.map(([n, t]) => el("button", { type: "button", class: "btn secondary", "data-rating": String(n), onclick: async () => {
          const cur = state.cards[entry.card.id] || entry.card;
          state.cards[entry.card.id] = review(cur, n, Date.now());
          await saveCards(ctx, state);
          await renderSrs(ctx, unit, items, mountEl);
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

function listenList(ctx, unit, ids) {
  return el("ul", {},
    ...(ids || []).map((id) => {
      const it = itemById(unit.items, id) || (unit.pages || []).flatMap((p) => p.items || []).find((x) => x.id === id);
      const kind = it?.listen?.kind || (String(id).includes("-w") ? "word" : "line");
      const label = it ? `${it.he} — ${it.en}` : id;
      return el("li", { "data-listen": id },
        it ? heText(it.he, "alef-he") : el("span", {}, id),
        " ", el("span", { class: "muted" }, it?.en || ""),
        " ", playBtn(ctx, kind, it?.listen?.id || id, label));
    }));
}

function renderUnit(root, ctx, index, unit) {
  const pages = unit.pages || [];
  root.replaceChildren(
    el("article", { class: "card alef-practical", "aria-labelledby": "view-title", "data-unit": unit.id },
      el("p", {}, el("a", { href: "#/practical" }, "All practical units")),
      el("h1", { id: "view-title", tabindex: "-1" }, unit.title),
      badge(),
      el("p", { class: "muted" }, DRAFT_TEXT),
      unit.grammarNote ? el("p", { "data-grammar": "true" }, unit.grammarNote) : null,
      unit.note ? el("p", { class: "muted", "data-unit-note": "true" }, unit.note) : null,
      el("h2", {}, "Pages"),
      el("ol", { class: "alef-practical-pages" },
        ...pages.map((p) => el("li", { "data-page": p.id },
          el("a", { href: pageHref(unit.id, p.id) }, p.title),
          el("span", { class: "muted" }, ` · ${ (p.items || []).length } items`)))),
      el("h2", {}, "Related lessons"),
      el("ul", {},
        ...(unit.lessons || []).map((l) => el("li", {},
          el("a", { href: lessonHref(l.id) }, `${l.id}: ${l.title}`),
          el("span", { class: "muted" }, " (existing lesson, not a new one)"))))));
}

async function renderPage(root, ctx, index, unit, page) {
  const items = page.items || [];
  const srsMount = el("div", { class: "alef-practical-srs" });
  const speak = await speakBlock(ctx, page.speakSet || (unit.speakSets || [])[0], (unit.speakDrills || [])[0]?.goal);
  root.replaceChildren(
    el("article", { class: "card alef-practical", "aria-labelledby": "view-title", "data-unit": unit.id, "data-page": page.id },
      el("p", {}, el("a", { href: "#/practical" }, "Practical"), " · ", el("a", { href: unitHref(unit.id) }, unit.title)),
      el("h1", { id: "view-title", tabindex: "-1" }, page.title),
      badge(),
      el("h2", {}, "Grammar note"),
      el("p", { "data-grammar": "true" }, page.grammarNote || unit.grammarNote || ""),
      el("h2", {}, "Spaced review"),
      srsMount,
      el("section", { class: "alef-practical-listen" },
        el("h3", {}, "Listening"),
        el("p", { class: "muted" }, "Existing clip ids only. If a file is missing, the button will say so."),
        listenList(ctx, { ...unit, items: unit.items }, page.listenIds || items.map((it) => it.listen?.id || it.id))),
      speak));
  await renderSrs(ctx, unit, items, srsMount);
}

export function mount(root, ctx) {
  let alive = true;
  root.replaceChildren(el("article", { class: "card" }, el("h1", { id: "view-title" }, "Practical"), el("p", {}, "Loading…")));
  const id = ctx?.params?.id || ctx?.query?.id || "";
  const pageId = ctx?.params?.page || ctx?.query?.page || "";
  (async () => {
    const index = await loadIndex();
    if (!alive) return;
    if (!id) {
      renderList(root, ctx, index);
      return;
    }
    const unit = await loadUnit(id, index);
    if (!alive) return;
    if (pageId) {
      const page = (unit.pages || []).find((p) => p.id === pageId);
      if (!page) {
        root.replaceChildren(el("article", { class: "card" },
          el("h1", { id: "view-title" }, "Practical"),
          el("p", {}, "That page is not in this unit."),
          el("p", {}, el("a", { href: unitHref(id) }, "Back to the unit"))));
        return;
      }
      await renderPage(root, ctx, index, unit, page);
      return;
    }
    renderUnit(root, ctx, index, unit);
  })().catch((err) => {
    if (!alive) return;
    root.replaceChildren(el("article", { class: "card" },
      el("h1", { id: "view-title" }, "Practical"),
      el("p", {}, "The practical units could not be loaded."),
      el("p", { class: "muted" }, String(err && err.message ? err.message : err))));
  });
  return () => { alive = false; };
}
