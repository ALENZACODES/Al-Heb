/**
 * Lesson map view (Lane 1). mount(root, ctx) -> unmount.
 * ASSUMED ctx shape (lane 8 owns the real one): ctx.store.get(key)/set(key, value) (sync or Promise),
 * ctx.route(path), ctx.t(key), ctx.settings. Keys: "curriculum.progress" {completed:{id:ms}}, "srs.cards" {id: card}.
 * Lesson navigation target: ctx.route("/learn/<lessonId>") (route name is a proposal; lane 8 must wire it).
 */
import { lessons, belts } from "./lessons.js";
import { due } from "./srs.js";
import { el, heText, tr, storeGet, storeSet, PROGRESS_KEY, CARDS_KEY } from "./dom.js";

export function mount(root, ctx) {
  let alive = true;
  let track = "read";
  const wrap = el("section", { class: "alef-learn", "aria-labelledby": "alef-learn-h" });
  root.append(wrap);

  async function render() {
    const progress = await storeGet(ctx, PROGRESS_KEY, { completed: {} });
    const cards = Object.values(await storeGet(ctx, CARDS_KEY, {}));
    if (!alive) return;
    const done = new Set(Object.keys(progress.completed || {}));
    const dueCount = due(cards, Date.now()).length;
    const list = lessons.filter((l) => l.track === track);
    const doneInTrack = list.filter((l) => done.has(l.id)).length;

    wrap.replaceChildren(
      el("h1", { id: "alef-learn-h", class: "alef-h" }, tr(ctx, "learn.title", "Lessons")),
      el("div", { class: "alef-tabs", role: "tablist", "aria-label": tr(ctx, "learn.tracks", "Tracks") },
        ...[["read", tr(ctx, "learn.track.read", "Read the siddur")], ["israel", tr(ctx, "learn.track.israel", "Speak in Israel")]].map(([id, label]) =>
          el("button", { type: "button", role: "tab", class: "alef-tab", "aria-selected": String(track === id), id: `alef-tab-${id}`,
            onclick: () => { track = id; render(); } }, label))),
      el("p", { class: "alef-progress", role: "status" }, `${doneInTrack} / ${list.length} ${tr(ctx, "learn.lessonsDone", "lessons done")}`),
      el("p", { class: "alef-due", role: "status" }, dueCount
        ? `${dueCount} ${tr(ctx, "learn.dueReviews", "reviews due")}`
        : tr(ctx, "learn.noDue", "No reviews due")),
      track === "read" ? beltStrip(done) : null,
      el("ol", { class: "alef-lesson-list", role: "tabpanel", "aria-labelledby": `alef-tab-${track}` },
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
              onclick: () => ctx && ctx.route && ctx.route(`/learn/${l.id}`) }, state === "done" ? tr(ctx, "learn.review", "Review") : tr(ctx, "learn.start", "Start")),
            " ",
            state === "available" ? el("button", { type: "button", class: "alef-btn alef-btn-secondary", "aria-label": `Mark ${l.title} complete`,
              onclick: async () => {
                const p = await storeGet(ctx, PROGRESS_KEY, { completed: {} });
                p.completed = { ...(p.completed || {}), [l.id]: Date.now() };
                await storeSet(ctx, PROGRESS_KEY, p);
                render();
              } }, tr(ctx, "learn.markDone", "Mark complete")) : null);
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
