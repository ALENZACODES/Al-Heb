/**
 * Learn screen (Lane 1, wired by Lane 8). mount(root, ctx) -> unmount.
 *   #/learn                          lesson map (two tracks, progress, due reviews, streak)
 *   #/learn?lesson=<id>              one lesson (letters, vowels, words, prayer lines, audio, mark complete)
 *   #/learn?review=1                 review of all due cards
 *   #/learn?lesson=<id>&review=1     review of that lesson's cards
 *   #/learn?ladder=1 | fade=1 or <id> | gender=pairs[&quiz=1] | gender=roles | scaffold=1   round-4 exercises
 * ctx: {store (sync or async get/set), route(path), t(key), settings?, audio?, query?}.
 * Storage keys: see progress.js.
 */
import { plain } from "../shell/plain-copy.js";
import { lessons, belts } from "./lessons.js";
import { due } from "./srs.js";
import { plural } from "../shell/plural.js";
import { el, heText, tr, replaceKeepingFocus, levelLabel, showSaveFailure, refocusIfLost } from "./dom.js";
import { loadState, completeLesson } from "./actions.js";
import { mountLesson } from "./lesson.view.js";
import { mountReview } from "./review.view.js";
import { mountLoanwords } from "./loanwords.view.js";
import { mountSpotIt } from "./spotit.view.js";
import { mountCheckpoint } from "./checkpoint.view.js";
import { mountDialogues } from "./dialogues.view.js";
import { mountLadder } from "./ladder.view.js";
import { mountFade } from "./fade.view.js";
import { mountGender } from "./gender.view.js";
import { mountScaffold } from "./scaffold.view.js";
import { streakVisible } from "../shell/comfort.js";

export function mount(root, ctx) {
  const q = ctx?.query || {};
  if (q.loanwords) return mountLoanwords(root, ctx, q.loanwords);
  if (q.spotit) return mountSpotIt(root, ctx, q.spotit, q.seed);
  if (q.checkpoint) return mountCheckpoint(root, ctx, q.seed);
  if (q.ladder) return mountLadder(root, ctx, q);
  if (q.fade) return mountFade(root, ctx, String(q.fade), q);
  if (q.gender) return mountGender(root, ctx, q.gender === "roles" ? "roles" : "pairs", q);
  if (q.scaffold) return mountScaffold(root, ctx);
  if (q.dialogues || q.dialogue) return mountDialogues(root, ctx, q.dialogue);
  if (q.review) return mountReview(root, ctx, { lessonId: q.lesson });
  if (q.lesson) {
    const un = mountLesson(root, ctx, q.lesson);
    // intermediate lessons (I-xx) have a player of their own: guarded link, only when that route exists in this build
    if (/^I-\d+$/.test(String(q.lesson)) && ctx?.hasRoute?.("intermediatelesson")) {
      root.append(el("p", { class: "row" }, el("a", { class: "btn secondary", href: `#/intermediate/${encodeURIComponent(q.lesson)}` }, "Open in the intermediate player")));
    }
    return un;
  }
  return mountMap(root, ctx);
}

function mountMap(root, ctx) {
  let alive = true;
  const goal = ctx?.settings?.get?.("goal");
  let track = goal === "israel" ? "israel" : "read";
  let showAll = false; // a long lesson list shows the next few lessons first; "Show all" opens the rest
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
    const firstOpen = Math.max(0, list.findIndex((l) => !done.has(l.id)));
    const far = (i) => list.length > 8 && !showAll && (i < firstOpen - 1 || i > firstOpen + 5);

    replaceKeepingFocus(wrap, h1,
      el("div", { class: "alef-tabs", role: "group", "aria-label": tr(ctx, "learn.tracks", "Tracks") },
        ...[["read", tr(ctx, "learn.track.read", "Read the prayer book")], ["israel", tr(ctx, "learn.track.israel", "Speak in Israel")]].map(([id, label]) =>
          el("button", { type: "button", class: "alef-tab", "aria-pressed": String(track === id), id: `alef-tab-${id}`,
            onclick: () => { track = id; render(); } }, label))),
      continueCard(list[firstOpen] && !done.has(list[firstOpen].id) ? list[firstOpen] : null, doneInTrack, list.length, st),
      track === "read" && ctx?.hasRoute?.("classtrack") ? el("p", { class: "alef-plan-link" }, el("a", { href: "#/classtrack" }, "My study plan"), ": 10 weeks, 3 months, 6 months or a year, on your own dates, with help each week.") : null,
      el("p", { class: "alef-progress", role: "status" }, `${doneInTrack} / ${list.length} ${tr(ctx, "learn.lessonsDone", "lessons done")}`),
      el("p", { class: "alef-due", role: "status" }, dueCount
        ? dueCount === 1 ? "1 review due" : `${dueCount} ${tr(ctx, "learn.dueReviews", "reviews due")}`
        : tr(ctx, "learn.noDue", "No reviews due"), " ",
        dueCount ? el("a", { class: "btn", href: "#/learn?review=1" }, "Review now") : null),
      !streakVisible(ctx) ? null : el("p", { class: "alef-streak" }, st.streak.count ? `Streak: ${st.streak.count} day${st.streak.count === 1 ? "" : "s"}.${st.streak.activeToday ? " Today counts." : " Study for 5 minutes today to add a day."}` : (st.streak.best ? `Your best streak was ${st.streak.best} day${st.streak.best === 1 ? "" : "s"}. A new one starts the next time you study for 5 minutes.` : plain("streakNone"))),
      track === "read" ? beltStrip(done) : null,
      el("details", { class: "alef-more-practice" }, el("summary", {}, "More ways to practise"), el("p", { class: "row alef-extras" },
        track === "read" ? el("a", { class: "btn secondary", href: "#/learn?loanwords=1" }, "Words you can already read") : null,
        track === "read" ? el("a", { class: "btn secondary", href: "#/learn?checkpoint=1" }, "Look-alike checkpoint") : null,
        track === "read" ? el("a", { class: "btn secondary", href: "#/learn?ladder=1" }, "Syllable ladder") : null,
        track === "read" ? el("a", { class: "btn secondary", href: "#/learn?fade=1" }, "Fade-out recall") : null,
        el("a", { class: "btn secondary", href: "#/learn?scaffold=1" }, "Read without English letters"),
        ctx?.hasRoute?.("intermediate") ? el("a", { class: "btn secondary", href: "#/intermediate" }, "Intermediate lessons") : null,
        track === "israel" ? el("a", { class: "btn secondary", href: "#/learn?gender=pairs" }, "Gender pairs") : null,
        track === "israel" ? el("a", { class: "btn secondary", href: "#/learn?gender=roles" }, "Say it as me") : null,
        track === "israel" ? el("a", { class: "btn secondary", href: "#/learn?dialogues=1" }, "Dialogues") : null)),
      el("ol", { class: "alef-lesson-list", "aria-label": track === "read" ? "Reading lessons" : "Israel lessons" },
        ...list.map((l, idx) => {
          const ready = l.prerequisites.every((p) => done.has(p));
          const isDone = done.has(l.id);
          const state = isDone ? "done" : ready ? "available" : "locked";
          return el("li", { class: `alef-lesson alef-lesson-${state}`, "data-lesson": l.id, hidden: far(idx) ? "" : null },
            el("span", { class: "alef-level" }, levelLabel(l.level)), " ",
            el("strong", {}, l.title), " ",
            el("span", { class: "alef-min" }, `about ${l.estMinutes} min`), " ",
            l.words[0] ? heText(l.words[0].he) : null, " ",
            el("button", { type: "button", class: "alef-btn", disabled: state === "locked" ? "" : null,
              "aria-label": `${state === "done" ? "Review" : "Start"} ${l.title}`,
              onclick: () => ctx && ctx.route && ctx.route(`/learn?lesson=${l.id}`) }, state === "done" ? tr(ctx, "learn.review", "Review") : tr(ctx, "learn.start", "Start")),
            " ",
            // U-13: completing a lesson without opening it is a test-out, and
            // the button says so — the lesson itself is completed by its
            // quick check, after looking through it.
            state === "available" ? el("button", { type: "button", class: "alef-btn alef-btn-secondary", "aria-label": `Mark complete without studying it (test out): ${l.title}`,
              onclick: async function markDone() { try { await completeLesson(ctx, l); } catch (e) { if (alive) showSaveFailure(wrap, e, markDone); return; } await render(); if (alive) { h1.focus?.({ preventScroll: true }); refocusIfLost(wrap, "#view-title", h1); } } }, tr(ctx, "learn.markDone", "Test out")) : null);
        })),
      list.length > 8 ? el("p", {}, el("button", { type: "button", class: "btn secondary", id: "alef-show-all", "aria-pressed": String(showAll), onclick: () => { showAll = !showAll; render().then(() => { if (alive) wrap.querySelector?.("#alef-show-all")?.focus?.(); }); } }, showAll ? "Show fewer lessons" : `Show all ${list.length} lessons`)) : null);
  }

  /** Duolingo-style "pick up where you left off": Rimon, the next lesson, one big button and a progress bar. */
  function continueCard(next, doneCount, total, st) {
    const pct = total ? Math.round((doneCount / total) * 100) : 0;
    const pic = el("img", { class: "alef-continue-rimon", alt: "", width: "96", height: "96", src: new URL("../../assets/img/gen/MASCOT_rimon.800.webp", import.meta.url).href });
    const streak = st?.streak?.count || 0;
    const say = !next ? "You finished every lesson in this track. Amazing!"
      : doneCount === 0 ? "Let's start! Your first lesson takes about " + next.estMinutes + " minutes."
      : streak > 1 && !st.streak.activeToday ? `${streak} days in a row! One lesson keeps it going.`
      : "Ready for the next one? You're doing great.";
    const goal = st?.streak?.goal || 300, secs = Math.min(goal, st?.streak?.todaySeconds || 0);
    const goalPct = Math.round((secs / goal) * 100), mins = Math.floor(secs / 60), goalMin = Math.round(goal / 60);
    const ring = el("div", { class: "alef-goal-ring", style: `--p:${goalPct}`, role: "img", "aria-label": goalPct >= 100 ? "Daily goal reached" : `Today: ${mins} of ${goalMin} minutes` },
      el("span", {}, goalPct >= 100 ? "✓" : `${mins}/${goalMin}`), el("small", {}, goalPct >= 100 ? "Goal!" : "min today"));
    return el("div", { class: "alef-continue", role: "group", "aria-label": "Continue learning" },
      pic, ring,
      el("div", { class: "alef-continue-body" },
        el("p", { class: "alef-continue-say" }, el("strong", {}, "Rimon: "), say),
        next ? el("p", { class: "alef-continue-next" }, el("span", { class: "muted" }, "Next: "), el("strong", {}, next.title)) : null,
        el("div", { class: "alef-continue-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(total), "aria-valuenow": String(doneCount), "aria-label": "Lessons done in this track" },
          el("span", { style: `inline-size:${pct}%` })),
        next ? el("button", { type: "button", class: "alef-continue-go", onclick: () => ctx?.route?.(`/learn?lesson=${next.id}`) }, doneCount === 0 ? "Start your first lesson" : "Continue") : null));
  }

  function beltStrip(done) {
    const current = belts.belts.find((b) => b.lessons && !lessonsOfBelt(b).every((id) => done.has(id)));
    return el("p", { class: "alef-belt" }, `${tr(ctx, "learn.belt", "Your level")}: ${current ? current.name + " belt" : "Black belt (all belts finished; keep practising)"}. `, el("span", { class: "muted" }, "Belts are Aleph's own levels, like in martial arts. Each one covers a set of lessons."));
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
