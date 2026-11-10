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
  visibleItems, visiblePages, progressFraction, dueCardCount, paintDueBadge, withHidden,
} from "./practical-progress.js";
import { isAudioFree } from "../shell/audiofree.js";
import { WRITTEN_URL, applyWritten, reviewItems, writtenPageCounts } from "./practical-written.js";

export const STORE_KEY = "srs.practical";
export { PROGRESS_KEY };
export const INDEX_URL = "data/curriculum/practical/index.json";
export const RESULTS_URL = "data/curriculum/practical/gcloud-results.json";
export const HIDDEN_URL = "data/curriculum/practical/hidden-items.json";
export const CLIP_MAP_URL = "data/curriculum/practical/clip-map.json";
export const COVERS_URL = "data/curriculum/practical/covers.json";
export const DRAFT_TEXT = "Short practice pages for real situations. They add practice to your lessons and do not change them. A native speaker has not checked them yet.";
/** Sentences of a draft note that describe where the data came from, not the Hebrew. Learners never see them. */
const FILE_TALK = /\b[a-z]+(?:-[a-z]+)*-\d{2}\b|data\/|\.json|stored in|already in the sources|only name forms|copied from|phrasebook|first line:/i;
/** A draft grammar note with its file-talk sentences removed ("" if nothing is left). */
export function cleanNote(note) {
  return String(note || "").split(/(?<=[.!?])\s+/).filter((sentence) => sentence && !FILE_TALK.test(sentence)).join(" ").trim();
}

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

function renderList(root, ctx, index, covers, progress, results, written) {
  const counts = writtenPageCounts(index, written);
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
        `${totals.units ?? ""} units of short pages, grouped by level. Each page has a grammar note, spaced review, listening and speaking.`),
      ...levels.map((lv) => el("section", { "data-level": lv.id },
        el("h2", {}, lv.title),
        el("ul", { class: "alef-practical-list" },
          ...lv.units.map((u) => {
            const imgId = covers?.units?.[u.id]?.imageId;
            const pageCount = counts[u.id] || u.pageCount || 0;
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
      el("p", { class: "muted" }, "How well did you know it? Your answer decides when this card comes back."),
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
    el("p", { class: "muted" }, fallbackNote || "Say each line aloud. These lines have not been checked by a native speaker yet."),
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
      const tag = it?.form ? FORM_TAG[it.form] : (it?.register && it.register !== "neutral" ? it.register : null);
      return el("li", { "data-listen": listen.id },
        it ? heText(it.he, "alef-he") : el("span", {}, id),
        " ", el("span", { class: "muted" }, it?.en || ""),
        tag ? el("span", { class: "alef-tag", "data-form": tag }, ` ${tag}`) : null,
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
      cleanNote(unit.grammarNote) ? el("p", { "data-grammar": "true" }, cleanNote(unit.grammarNote)) : null,
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

/** True when the cloud check lists this item as failing in any unit. */
function failingAnywhere(results, itemId) {
  return ((results && results.failing_keys) || []).some((k) => k.endsWith(`|${itemId}`));
}

const FORM_TAG = { "to or by a man": "man", "to or by a woman": "woman" };

/** One grammar point with its examples (written pages). */
function grammarBlock(page, unit) {
  if (page.grammar) {
    return el("section", { class: "alef-practical-grammar", "data-grammar": "true" },
      el("h2", {}, `Grammar: ${page.grammar.point}`),
      el("p", {}, page.grammar.body),
      el("ul", {}, ...page.grammar.examples.map((e) => el("li", { "data-example": e.itemId },
        heText(e.he, "alef-he"), " ", el("span", { class: "muted" }, e.en)))));
  }
  const note = cleanNote(page.grammarNote) || cleanNote(unit.grammarNote);
  return note ? el("section", {}, el("h2", {}, "Grammar note"), el("p", { "data-grammar": "true" }, note)) : null;
}

/** Speaking prompts: an English situation, then the line to say and its clip, shown on request. */
function speakCards(ctx, page, kindOf) {
  return el("section", { class: "alef-practical-speak" },
    el("h3", {}, "Speaking"),
    el("p", { class: "muted" }, "Say the line aloud first, then show it and listen."),
    el("ol", {}, ...page.speak.map((s) => {
      const answer = el("div", { class: "alef-practical-answer", hidden: "" },
        heText(s.he, "alef-he"), " ", el("span", { class: "alef-pron muted" }, s.translit), " ",
        el("span", { class: "muted" }, s.en), " ",
        s.audio && s.audio.status !== "gap" ? playBtn(ctx, kindOf(s.answer), s.audio.clipId, s.en) : el("span", { class: "muted" }, " No recording yet."));
      const show = el("button", { type: "button", class: "btn secondary", onclick: () => {
        answer.hidden = false; answer.removeAttribute?.("hidden"); show.hidden = true;
      } }, "Show the line");
      return el("li", { "data-speak": s.answer }, el("p", {}, s.prompt), show, answer);
    })));
}

/** Hear a clip, pick its meaning from the page's own lines. */
function listenRound(ctx, page, items) {
  if (isAudioFree(ctx)) return null; // the round needs sound; reading and speaking stay available
  const byId = new Map(items.map((it) => [it.id, it]));
  const rounds = (page.listen || []).filter((r) => byId.has(r.answer) && r.options.every((o) => byId.has(o)));
  if (!rounds.length) return null;
  return el("section", { class: "alef-practical-pick" },
    el("h3", {}, "Hear it, pick the meaning"),
    el("ol", {}, ...rounds.map((r) => {
      const feedback = el("p", { class: "muted", "aria-live": "polite" });
      const opts = [...r.options].sort();
      return el("li", { "data-listen-round": r.answer },
        playBtn(ctx, r.clip.kind, r.clip.id, "the line to match"),
        el("div", { class: "row", role: "group", "aria-label": "Pick the meaning" },
          ...opts.map((o) => el("button", { type: "button", class: "btn secondary", "data-option": o, onclick: () => {
            feedback.textContent = o === r.answer ? `Right: ${byId.get(o).en}.` : `Not that one. It was: ${byId.get(r.answer).en}.`;
          } }, byId.get(o).en))),
        feedback);
    })));
}

async function renderPage(root, ctx, index, unit, page, extras) {
  const { covers, progress, results, clipMap, written } = extras || {};
  const items = visibleItems(unit.id, page.items || [], results);
  if (!items.length) {
    root.replaceChildren(el("article", { class: "card" },
      el("h1", { id: "view-title" }, page.title),
      el("p", {}, "This page is not ready yet. Its audio is still being checked."),
      el("p", {}, el("a", { href: unitHref(unit.id) }, "Back to the unit"))));
    return;
  }
  const srsMount = el("div", { class: "alef-practical-srs" });
  const review = reviewItems(page, written).filter((it) => !failingAnywhere(results, it.id));
  const kinds = new Map([...(page.items || []), ...review].map((it) => [it.id, it.listen?.kind || "line"]));
  const shown = new Set([...items, ...review].map((it) => it.id));
  const livePageView = { ...page, speak: (page.speak || []).filter((x) => shown.has(x.answer)) };
  const speak = page.speak
    ? (livePageView.speak.length ? speakCards(ctx, livePageView, (id) => kinds.get(id) || "line") : null)
    : await speakBlock(ctx, page.speakSet || (unit.speakSets || [])[0], (unit.speakDrills || [])[0]?.goal);
  const srsItems = [...items, ...review];
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
      page.can ? el("p", { class: "alef-practical-can" }, page.can) : null,
      grammarBlock(page, unit),
      page.culture ? el("p", { class: "alef-practical-culture" }, el("strong", {}, "Culture. "), page.culture) : null,
      page.dialogue ? el("p", { class: "muted", "data-dialogue": page.dialogue.id }, page.dialogue.setting) : null,
      el("h2", {}, "Spaced review"),
      review.length ? el("p", { class: "muted" }, `${review.length} earlier line${review.length === 1 ? "" : "s"} come back here for review.`) : null,
      srsMount,
      el("section", { class: "alef-practical-listen" },
        el("h3", {}, "Listening"),
        el("p", { class: "muted" }, "Tap to hear each line. If a recording is missing, the button says so."),
        listenList(ctx, unit, page.listenIds?.filter((id) => items.some((it) => it.id === id || it.listen?.id === id)) || items.map((it) => it.id), items, clipMap)),
      listenRound(ctx, page, items),
      speak));
  await renderSrs(ctx, unit, srsItems, srsMount, { clipMap, onPageComplete });
}

export function mount(root, ctx) {
  let alive = true;
  root.replaceChildren(el("article", { class: "card" }, el("h1", { id: "view-title" }, "Practical"), el("p", {}, "Loading…")));
  const id = ctx?.params?.id || ctx?.query?.id || "";
  const pageId = ctx?.params?.page || ctx?.query?.page || "";
  (async () => {
    const [index, covers, rawResults, clipMap, progress, written, hidden] = await Promise.all([
      loadIndex(),
      loadOptional(COVERS_URL),
      loadOptional(RESULTS_URL),
      loadOptional(CLIP_MAP_URL),
      loadProgress(ctx),
      loadOptional(WRITTEN_URL),
      loadOptional(HIDDEN_URL),
    ]);
    const results = withHidden(rawResults, hidden);
    if (!alive) return;
    await paintPracticalDueBadge(ctx);
    if (!id) {
      renderList(root, ctx, index, covers, progress, results, written);
      return;
    }
    const unit = applyWritten(await loadUnit(id, index), written);
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
      await renderPage(root, ctx, index, unit, page, { covers, progress, results, clipMap, written });
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
