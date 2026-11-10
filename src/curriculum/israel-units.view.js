/**
 * Practical units for the Israel track.
 *   #/israel-units        the 13 units: what you will be able to do, lessons done, review due
 *   #/israel-units/:id    one unit: lessons, grammar notes, and three drills (unit review, listening, speaking)
 * Built only from the lessons' own words, clips and exercises (see src/curriculum/israel-units.js). Draft content.
 */
import { el, heText, storeGet, storeSet } from "./dom.js";
import { byId as lessonById } from "./lessons.js";
import { loadState } from "./actions.js";
import { loadJSON } from "./data.js";
import { settingVoice } from "./ex-ui.js";
import { audioButton } from "../shell/audio-access.js";
import * as U from "./israel-units.js";

const DRAFT = "Draft. The grammar notes are original English, not yet checked by a native speaker or teacher. Every Hebrew line comes from the lessons themselves.";
const fmtDate = (ms) => new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const listen = (ctx, id, name) => audioButton(el, ctx, { kind: "word", id, voice: settingVoice(ctx), tradition: "israeli", label: "Listen", name, class: "btn secondary alef-play" });

function reviewLine(r) {
  if (r.state === "locked") return "Review opens when you finish the core lessons.";
  if (r.state === "complete") return "All five reviews done.";
  if (r.state === "due") return `Review ${r.step + 1} of 5 is due now.`;
  return `Next review (${r.step + 1} of 5) on ${fmtDate(r.dueAt)}.`;
}

async function loadAll(ctx) {
  const [data, st, store] = await Promise.all([loadJSON("data/curriculum/israel-units.json"), loadState(ctx), storeGet(ctx, U.STORE_KEY, null)]);
  return { data, completed: st.completed || {}, log: store?.reviews || {} };
}

function mountList(root, ctx) {
  let alive = true;
  const wrap = el("article", { class: "alef-israel-units", "aria-labelledby": "view-title" });
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, "Hebrew for Israel, Unit by Unit");
  wrap.append(h1, el("p", {}, "Each unit gets you through one real situation. Do the core lessons, then come back for short reviews spaced over a month."));
  root.append(wrap);
  loadAll(ctx).then(({ data, completed, log }) => {
    if (!alive) return;
    const now = Date.now();
    wrap.append(el("p", { class: "draft-flag", role: "note" }, DRAFT),
      el("ol", { class: "alef-linelist" }, ...data.units.map((u) => {
        const s = U.unitStatus(u, completed), r = U.reviewDue(u, completed, log, now, data.reviewDays);
        return el("li", { "data-unit": u.id }, el("a", { href: `#/israel-units/${u.id}` }, u.title), el("p", { class: "muted" }, `You will be able to: ${u.can}.`),
          el("p", { class: "muted" }, `${s.done} of ${s.total} lessons done. ${reviewLine(r)}`));
      })));
  }).catch(() => alive && wrap.append(el("p", { role: "alert" }, "Could not load the units. Check your connection, then try again.")));
  return () => { alive = false; wrap.remove(); };
}

function mountUnit(root, ctx, id) {
  let alive = true;
  const wrap = el("article", { class: "alef-israel-units", "aria-labelledby": "view-title" });
  root.append(wrap);
  loadAll(ctx).then(({ data, completed, log }) => {
    if (!alive) return;
    const unit = data.units.find((u) => u.id === id);
    if (!unit) { wrap.append(el("h1", { id: "view-title", tabindex: "-1" }, "Unit not found"), el("a", { class: "btn", href: "#/israel-units" }, "All units")); return; }
    const byId = Object.fromEntries(U.lessonsOf(unit).map((lid) => [lid, lessonById[lid]]));
    const items = U.reviewItems(unit, byId), body = el("div", { class: "alef-unit-drill", "aria-live": "polite" });
    let rev = U.reviewDue(unit, completed, log, Date.now(), data.reviewDays);
    const revNote = el("p", { role: "status" }, reviewLine(rev));
    const lessonLi = (lid) => el("li", {}, el("a", { href: U.lessonHref(lid) }, `${lid} ${lessonById[lid]?.title || ""}`), completed[lid] ? " (done)" : "");

    const showReview = () => {
      const cards = items.slice(), seen = { n: 0 };
      const next = () => {
        if (seen.n >= cards.length) {
          body.replaceChildren(el("p", {}, `Unit review finished: ${cards.length} words.`));
          if (rev.state === "due") storeSet(ctx, U.STORE_KEY, { reviews: (log = U.recordReview(log, unit.id)) }).then(() => { rev = U.reviewDue(unit, completed, log, Date.now(), data.reviewDays); revNote.textContent = reviewLine(rev); }).catch(() => {});
          return;
        }
        const c = cards[seen.n++], back = el("div", { hidden: "" }, el("p", {}, c.en), listen(ctx, c.audioId, c.en));
        body.replaceChildren(el("p", { class: "muted" }, `Word ${seen.n} of ${cards.length}: say what it means, then check.`), heText(c.he, "alef-he alef-word"), back,
          el("div", { class: "row" }, el("button", { type: "button", class: "btn secondary", onclick: () => back.removeAttribute("hidden") }, "Check"), el("button", { type: "button", class: "btn", onclick: next }, "Next")));
      };
      next();
    };
    const showListening = () => {
      const qs = U.listeningRound(items, 6, Date.now() % 100000), score = { right: 0, i: 0 };
      const ask = () => {
        if (score.i >= qs.length) { body.replaceChildren(el("p", {}, `Listening: ${score.right} of ${qs.length} right.`)); return; }
        const q = qs[score.i++], fb = el("p", { role: "status" });
        const btns = q.options.map((o, k) => el("button", { type: "button", class: "btn secondary", onclick: () => {
          btns.forEach((b) => b.setAttribute("disabled", ""));
          if (k === q.answer) score.right++;
          fb.replaceChildren(k === q.answer ? "Right. " : `Not quite: it means "${q.options[q.answer]}". `, heText(q.he));
          fb.after(el("button", { type: "button", class: "btn", onclick: ask }, "Next"));
        } }, o));
        body.replaceChildren(el("p", { class: "muted" }, `Question ${score.i} of ${qs.length}: listen, then choose the meaning.`), listen(ctx, q.audioId, "the word"), el("div", { class: "row" }, ...btns), fb);
      };
      ask();
    };
    const showSpeaking = () => {
      const ds = U.speakingDrills(unit, byId), at = { i: 0 };
      const go = () => {
        if (at.i >= ds.length) { body.replaceChildren(el("p", {}, "Speaking done. Saying it aloud is what makes it stick.")); return; }
        const d = ds[at.i++], back = el("div", { hidden: "" }, heText(d.he, "alef-he alef-word"), el("p", { class: "muted" }, d.en), d.audioId ? listen(ctx, d.audioId, d.en) : null);
        body.replaceChildren(el("p", { class: "muted" }, `Line ${at.i} of ${ds.length}: say it out loud first.`), el("p", {}, d.cue), back,
          el("div", { class: "row" }, el("button", { type: "button", class: "btn secondary", onclick: () => back.removeAttribute("hidden") }, "Show the Hebrew"), el("button", { type: "button", class: "btn", onclick: go }, "Next")));
      };
      go();
    };

    wrap.append(
      el("h1", { id: "view-title", tabindex: "-1" }, unit.title),
      el("p", {}, `You will be able to: ${unit.can}.`),
      el("p", { class: "draft-flag", role: "note" }, DRAFT),
      el("section", { class: "card" }, el("h2", {}, "Core Lessons"), el("ul", {}, ...unit.core.map(lessonLi)),
        unit.more.length ? el("h3", {}, "Go Further (after the capstone)") : null, unit.more.length ? el("ul", {}, ...unit.more.map(lessonLi)) : null),
      el("section", { class: "card" }, el("h2", {}, "How It Works"), ...unit.grammar.map((g) => el("div", { class: "alef-grammar" }, el("p", {}, g.point),
        el("ul", {}, ...g.examples.map((x) => el("li", {}, heText(x.he), " ", el("span", { class: "muted" }, x.en))))))),
      el("section", { class: "card" }, el("h2", {}, "Practise"), revNote,
        el("div", { class: "row" },
          el("button", { type: "button", class: "btn", "data-drill": "review", onclick: showReview }, "Unit review"),
          el("button", { type: "button", class: "btn secondary", "data-drill": "listening", onclick: showListening }, "Listening"),
          el("button", { type: "button", class: "btn secondary", "data-drill": "speaking", onclick: showSpeaking }, "Speaking")),
        body),
      el("a", { class: "btn secondary", href: "#/israel-units" }, "All units"));
  }).catch(() => alive && wrap.append(el("p", { role: "alert" }, "Could not load this unit. Check your connection, then try again.")));
  return () => { alive = false; wrap.remove(); };
}

export function mount(root, ctx = {}) {
  const id = ctx.query?.id;
  return id ? mountUnit(root, ctx, id) : mountList(root, ctx);
}
