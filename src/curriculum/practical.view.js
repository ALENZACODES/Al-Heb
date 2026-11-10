/**
 * Practical conversation units (#/practical, #/practical/:id).
 * Preview. These are situation packs, not a 126th lesson. Every Hebrew line
 * is copied from the phrasebook or cited from an existing lesson. The units
 * are not native-reviewed; the badge on the page says so.
 */
import { el, heText, storeGet, storeSet } from "./dom.js";
import { audioButton } from "../shell/audio-access.js";
import { settingVoice } from "./ex-ui.js";
import { newCard, review, due } from "./srs.js";
import { loadJson } from "../grammar/loader.js";

export const STORE_KEY = "srs.practical";
export const REVIEW_FLAG = "Needs native review: the Hebrew, glosses and pronunciation have not been checked by a native speaker. Every line is copied from the existing phrasebook or from a lesson already in ALEF.";
export const DRAFT_TEXT = "Draft practical units. This is not a new lesson track and it does not change the 125 lessons.";

const RATINGS = [[1, "Again"], [2, "Hard"], [3, "Good"], [4, "Easy"]];

export const lessonHref = (id) => (/^I-\d+/.test(id) ? `#/intermediate/${id}` : `#/learn?lesson=${id}`);

export async function loadUnits() {
  const data = await loadJson("data/curriculum/practical-units.json");
  return data;
}

const cardId = (unitId, itemId) => `${unitId}|${itemId}`;

async function loadCards(ctx) {
  const s = await storeGet(ctx, STORE_KEY, null);
  return s && s.cards && typeof s.cards === "object" ? { cards: { ...s.cards } } : { cards: {} };
}

async function saveCards(ctx, state) {
  await storeSet(ctx, STORE_KEY, state);
}

function badge(unit) {
  if (unit.nativeReview || unit.status === "built-draft" || unit.proofread === false) {
    return el("p", { class: "draft-flag", role: "note", "data-native-review": "true" }, REVIEW_FLAG);
  }
  return null;
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

function renderList(root, ctx, data) {
  const units = data.units || [];
  root.replaceChildren(
    el("article", { class: "card alef-practical", "aria-labelledby": "view-title" },
      el("h1", { id: "view-title", tabindex: "-1" }, "Practical"),
      el("p", {}, DRAFT_TEXT),
      el("p", { class: "draft-flag", role: "note" }, REVIEW_FLAG),
      el("p", { class: "muted" }, "Each unit is a short conversation pack: a grammar note, a spaced-review queue (the same scheduler as the rest of ALEF), listening of existing clips, and a speaking set that already exists. Open a unit to practise."),
      el("ul", { class: "alef-practical-list" },
        ...units.map((u) => el("li", { "data-unit": u.id },
          el("a", { href: `#/practical/${u.id}` }, u.title),
          " ",
          el("span", { class: "draft-flag", "data-native-review": "true" }, "Needs native review"))))));
}

function itemById(unit, id) {
  return (unit.items || []).find((it) => it.id === id) || null;
}

async function renderUnit(root, ctx, data, unit) {
  const state = await loadCards(ctx);
  const now = Date.now();
  const queue = unit.srsQueue || [];
  const items = queue.map((q) => {
    const it = itemById(unit, q.id);
    const cid = cardId(unit.id, q.id);
    const card = state.cards[cid] || newCard({ id: cid, kind: q.srsKind || "prayerLine", now });
    if (!state.cards[cid]) state.cards[cid] = card;
    return { q, it, card };
  });
  const dueCards = due(items.map((x) => x.card), now);
  const dueSet = new Set(dueCards.map((c) => c.id));
  const next = items.find((x) => dueSet.has(x.card.id) || x.card.state === "new") || items[0];

  const rateBox = el("div", { class: "alef-int-rate row", role: "group", "aria-label": "How did you do?" });
  function showItem(entry) {
    const it = entry?.it;
    if (!it) {
      rateBox.replaceChildren(el("p", {}, "This unit has no review items."));
      return;
    }
    rateBox.replaceChildren(
      el("div", { class: "alef-int-he row", "data-srs-id": it.id },
        heText(it.he, "alef-he alef-word"),
        el("p", {}, it.en),
        it.translit ? el("p", { class: "alef-pron muted" }, it.translit) : null,
        playBtn(ctx, it.listen?.kind, it.listen?.id || it.id, it.en)),
      el("p", { class: "muted" }, "Rate the card. Again / Hard / Good / Easy use the same spaced-review scheduler as vocabulary review."),
      ...RATINGS.map(([n, t]) => el("button", { type: "button", class: "btn secondary", "data-rating": String(n), onclick: async () => {
        const cur = state.cards[entry.card.id] || entry.card;
        state.cards[entry.card.id] = review(cur, n, Date.now());
        await saveCards(ctx, state);
        await renderUnit(root, ctx, data, unit);
      } }, `${n} ${t}`)));
  }

  const listenBlocks = (unit.listenDrills || []).map((drill) => el("section", { class: "alef-practical-listen" },
    el("h3", {}, "Listening"),
    el("p", { class: "muted" }, drill.goal),
    el("ul", {},
      ...(drill.items || []).map((id) => {
        const it = itemById(unit, id);
        const kind = it?.listen?.kind || (id.includes("-w") ? "word" : "line");
        const label = it ? `${it.he} — ${it.en}` : id;
        return el("li", { "data-listen": id }, it ? heText(it.he, "alef-he") : el("span", {}, id), " ", el("span", { class: "muted" }, it?.en || ""), " ", playBtn(ctx, kind, id, label));
      }))));

  const speakBlocks = [];
  for (const drill of unit.speakDrills || []) {
    let set = null;
    try { set = await loadJson(`data/speak/sets/${drill.set}.json`); } catch { set = null; }
    speakBlocks.push(el("section", { class: "alef-practical-speak" },
      el("h3", {}, "Speaking"),
      el("p", { class: "muted" }, drill.goal + (drill.note ? ` ${drill.note}` : "")),
      el("p", {}, el("a", { href: "#/speak" }, "Open the Say it page"), " for more speaking practice. The lines below are the existing survival set, not a new recording."),
      set ? el("ul", {}, ...(set.items || []).map((it) => el("li", { "data-speak": it.id },
        heText(it.he, "alef-he"), " ", el("span", { class: "muted" }, it.en || ""),
        it.audioId ? playBtn(ctx, it.kind === "word" ? "word" : "line", it.audioId, it.en) : el("span", { class: "muted" }, " No clip id yet."))))
        : el("p", { class: "muted" }, `Could not load ${drill.set}.`)));
  }

  const lessonLinks = el("ul", {},
    ...(unit.lessons || []).map((l) => el("li", {},
      el("a", { href: lessonHref(l.id) }, `${l.id}: ${l.title}`),
      el("span", { class: "muted" }, " (existing lesson, not a new one)"))));

  root.replaceChildren(
    el("article", { class: "card alef-practical", "aria-labelledby": "view-title", "data-unit": unit.id },
      el("p", {}, el("a", { href: "#/practical" }, "All practical units")),
      el("h1", { id: "view-title", tabindex: "-1" }, unit.title),
      badge(unit),
      el("p", { class: "muted" }, DRAFT_TEXT),
      el("h2", {}, "Grammar note"),
      el("p", { "data-grammar": "true" }, unit.grammarNote),
      unit.note ? el("p", { class: "muted", "data-unit-note": "true" }, unit.note) : null,
      el("h2", {}, "Related lessons"),
      lessonLinks,
      el("h2", {}, "Spaced review"),
      el("p", { class: "muted" }, `${dueCards.length} card(s) due now of ${items.length} in this unit.`),
      rateBox,
      ...listenBlocks,
      ...speakBlocks));
  showItem(next);
}

export function mount(root, ctx) {
  let alive = true;
  root.replaceChildren(el("article", { class: "card" }, el("h1", { id: "view-title" }, "Practical"), el("p", {}, "Loading…")));
  const id = ctx?.params?.id || ctx?.query?.id || "";
  (async () => {
    const data = await loadUnits();
    if (!alive) return;
    if (id) {
      const unit = (data.units || []).find((u) => u.id === id);
      if (!unit) {
        root.replaceChildren(el("article", { class: "card" },
          el("h1", { id: "view-title" }, "Practical"),
          el("p", {}, "That unit is not in the list."),
          el("p", {}, el("a", { href: "#/practical" }, "All practical units"))));
        return;
      }
      await renderUnit(root, ctx, data, unit);
    } else {
      renderList(root, ctx, data);
    }
  })().catch((err) => {
    if (!alive) return;
    root.replaceChildren(el("article", { class: "card" },
      el("h1", { id: "view-title" }, "Practical"),
      el("p", {}, "The practical units could not be loaded."),
      el("p", { class: "muted" }, String(err && err.message ? err.message : err))));
  });
  return () => { alive = false; };
}
