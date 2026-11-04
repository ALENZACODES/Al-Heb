/**
 * Learn screen (Lane 1, wired by Lane 8). mount(root, ctx) -> unmount.
 *   #/learn                          lesson map (two tracks, progress, due reviews, streak)
 *   #/learn?lesson=<id>              one lesson (letters, vowels, words, prayer lines, audio, mark complete)
 *   #/learn?review=1                 review of all due cards
 *   #/learn?lesson=<id>&review=1     review of that lesson's cards
 * ctx: {store (sync or async get/set), route(path), t(key), settings?, audio?, query?}.
 * Storage keys: see progress.js.
 */
import { lessons, belts } from "./lessons.js";
import { due } from "./srs.js";
import { el, heText, tr, replaceKeepingFocus } from "./dom.js";
import { loadState, completeLesson } from "./actions.js";
import { mountLesson } from "./lesson.view.js";
import { mountReview } from "./review.view.js";
import { mountLoanwords } from "./loanwords.view.js";
import { mountSpotIt } from "./spotit.view.js";
import { mountCheckpoint } from "./checkpoint.view.js";
import { mountDialogues } from "./dialogues.view.js";

export function mount(root, ctx) {
  const q = ctx?.query || {};
  if (q.loanwords) return mountLoanwords(root, ctx, q.loanwords);
  if (q.spotit) return mountSpotIt(root, ctx, q.spotit, q.seed);
  if (q.checkpoint) return mountCheckpoint(root, ctx, q.seed);
  if (q.dialogues || q.dialogue) return mountDialogues(root, ctx, q.dialogue);
  if (q.review) return mountReview(root, ctx, { lessonId: q.lesson });
  if (q.lesson) return mountLesson(root, ctx, q.lesson);
  return mountMap(root, ctx);
}

function mountMap(root, ctx) {
  let alive = true;
  const goal = ctx?.settings?.get?.("goal");
  let track = goal === "israel" ? "israel" : "read";
  const wrap = el("section", { class: "alef-learn", "aria-labelledby": "view-title" });
  const h1 = el("h1", { id: "view-title", tabindex: "-1", class: "alef-h" }, tr(ctx, "learn.title", "Lessons"));
  wrap.append(h1);
  root.append(wrap);

  async function render() {
    const st = await loadState(ctx);
    if (!alive) return;
    const done = new Set(Object.keys(st.completed));
    const dueCount = due(Object.values(st.cards), Date.now()).length;
    const list = lessons.filter((l) => l.track === track);
    const doneInTrack = list.filter((l) => done.has(l.id)).length;

    replaceKeepingFocus(wrap, h1,
      el("div", { class: "alef-tabs", role: "group", "aria-label": tr(ctx, "learn.tracks", "Tracks") },
        ...[["read", tr(ctx, "learn.track.read", "Read the siddur")], ["israel", tr(ctx, "learn.track.israel", "Speak in Israel")]].map(([id, label]) =>
          el("button", { type: "button", class: "alef-tab", "aria-pressed": String(track === id), id: `alef-tab-${id}`,
            onclick: () => { track = id; render(); } }, label))),
      el("p", { class: "alef-progress", role: "status" }, `${doneInTrack} / ${list.length} ${tr(ctx, "learn.lessonsDone", "lessons done")}`),
      el("p", { class: "alef-due", role: "status" }, dueCount
        ? `${dueCount} ${tr(ctx, "learn.dueReviews", "reviews due")}`
        : tr(ctx, "learn.noDue", "No reviews due"), " ",
        dueCount ? el("a", { class: "btn", href: "#/learn?review=1" }, "Review now") : null),
      el("p", { class: "alef-streak" }, st.streak.count ? `Streak: ${st.streak.count} day${st.streak.count === 1 ? "" : "s"}${st.streak.activeToday ? "" : " (learn today to keep it)"}` : "No streak yet. Finish a lesson or review a card to start one."),
      track === "read" ? beltStrip(done) : null,
      el("p", { class: "row alef-extras" },
        track === "read" ? el("a", { class: "btn secondary", href: "#/learn?loanwords=1" }, "Words you can already read") : null,
        track === "read" ? el("a", { class: "btn secondary", href: "#/learn?checkpoint=1" }, "Look-alike checkpoint") : null,
        track === "israel" ? el("a", { class: "btn secondary", href: "#/learn?dialogues=1" }, "Dialogues") : null),
      el("ol", { class: "alef-lesson-list", "aria-label": track === "read" ? "Reading lessons" : "Israel lessons" },
        ...list.map((l) => {
          const ready = l.prerequisites.every((p) => done.has(p));
          const isDone = done.has(l.id);
          const state = isDone ? "done" : ready ? "available" : "locked";
          return el("li", { class: `alef-lesson alef-lesson-${state}`, "data-lesson": l.id },
            el("span", { class: "alef-level" }, l.level), " ",
            el("strong", {}, l.title), " ",
            el("span", { class: "alef-min" }, `${l.estMinutes} min`), " ",
            l.words[0] ? heText(l.words[0].he) : null, " ",
            el("button", { type: "button", class: "alef-btn", disabled: state === "locked" ? "" : null,
              "aria-label": `${state === "done" ? "Review" : "Start"} ${l.title}`,
              onclick: () => ctx && ctx.route && ctx.route(`/learn?lesson=${l.id}`) }, state === "done" ? tr(ctx, "learn.review", "Review") : tr(ctx, "learn.start", "Start")),
            " ",
            state === "available" ? el("button", { type: "button", class: "alef-btn alef-btn-secondary", "aria-label": `Mark complete: ${l.title}`,
              onclick: async () => { await completeLesson(ctx, l); render(); } }, tr(ctx, "learn.markDone", "Mark complete")) : null);
        })));
  }

  function beltStrip(done) {
    const current = belts.belts.find((b) => b.lessons && !lessonsOfBelt(b).every((id) => done.has(id)));
    return el("p", { class: "alef-belt" }, `${tr(ctx, "learn.belt", "Current belt")}: ${current ? current.name : "Black (fluency practice)"}`);
  }
  render();
  return () => { alive = false; wrap.remove(); };
}

function lessonsOfBelt(b) {
  const m = /^r(\d+)-r(\d+)$/.exec(b.lessons || "");
  if (!m) return [];
  const out = [];
  for (let i = Number(m[1]); i <= Number(m[2]); i++) out.push(`r${String(i).padStart(2, "0")}`);
  return out;
}
