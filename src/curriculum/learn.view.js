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
import { lessonSummaries as lessons, belts } from "./lessons-index.js";
import { reviewsDue, minutesGoal, LESSONS, SCOPE, scopeOfTrack, daysText } from "../lib/counts.js";
import { plural } from "../shell/plural.js";
import { el, heText, tr, replaceKeepingFocus, levelLabel, showSaveFailure, refocusIfLost } from "./dom.js";
import { loadState, completeLesson } from "./actions.js";
import { streakVisible } from "../shell/comfort.js";
import { DAILY_GOAL_KEY } from "../home/today.js";
import { rimonInline } from "../shell/rimon-inline.js";
import { firstHebrewLetter } from "../shell/ui.js";
import { loadUnlocked, unlockLesson, doubleTap } from "./unlock.js";


export function mount(root, ctx) {
  const q = ctx?.query || {};
  // Sub-screens pull lessons.json and their own modules only when opened, so the map can paint from the slim index.
  if (q.loanwords || q.spotit || q.checkpoint || q.ladder || q.fade || q.gender || q.scaffold || q.dialogues || q.dialogue || q.review || q.lesson) {
    let alive = true, un = () => {};
    const go = (fn) => Promise.resolve().then(fn).then((u) => { if (!alive) { try { u && u(); } catch {} return; } if (typeof u === "function") un = u; }).catch((e) => { if (alive) console.error("learn sub-screen failed", e); });
    if (q.loanwords) go(() => import("./loanwords.view.js").then((m) => m.mountLoanwords(root, ctx, q.loanwords)));
    else if (q.spotit) go(() => import("./spotit.view.js").then((m) => m.mountSpotIt(root, ctx, q.spotit, q.seed)));
    else if (q.checkpoint) go(() => import("./checkpoint.view.js").then((m) => m.mountCheckpoint(root, ctx, q.seed)));
    else if (q.ladder) go(() => import("./ladder.view.js").then((m) => m.mountLadder(root, ctx, q)));
    else if (q.fade) go(() => import("./fade.view.js").then((m) => m.mountFade(root, ctx, String(q.fade), q)));
    else if (q.gender) go(() => import("./gender.view.js").then((m) => m.mountGender(root, ctx, q.gender === "roles" ? "roles" : "pairs", q)));
    else if (q.scaffold) go(() => import("./scaffold.view.js").then((m) => m.mountScaffold(root, ctx)));
    else if (q.dialogues || q.dialogue) go(() => import("./dialogues.view.js").then((m) => m.mountDialogues(root, ctx, q.dialogue)));
    else if (q.review) go(() => import("./review.view.js").then((m) => m.mountReview(root, ctx, { lessonId: q.lesson })));
    else if (q.lesson) go(() => import("./lesson.view.js").then((m) => {
      const u = m.mountLesson(root, ctx, q.lesson);
      if (/^I-\d+$/.test(String(q.lesson)) && ctx?.hasRoute?.("intermediatelesson")) {
        root.append(el("p", { class: "row" }, el("a", { class: "btn secondary", href: `#/intermediate/${encodeURIComponent(q.lesson)}` }, "Open in the intermediate player")));
      }
      return u;
    }));
    return () => { alive = false; try { un(); } catch {} };
  }
  return mountMap(root, ctx);
}

function mountMap(root, ctx) {
  let alive = true;
  const goal = ctx?.settings?.get?.("goal");
  let track = goal === "israel" ? "israel" : "read";
  let showAll = false; // a long lesson list shows the next few lessons first; "Show all" opens the rest
  const wrap = el("section", { class: "alef-learn", "aria-labelledby": "view-title" });
  const h1 = (root.querySelector && root.querySelector("#view-title")) || el("h1", { id: "view-title", tabindex: "-1", class: "alef-h alef-learn-hero" }, tr(ctx, "learn.title", "Lessons"));
  if (h1.classList) { h1.classList.add("alef-h"); h1.classList.add("alef-learn-hero"); }
  else h1.className = `${h1.className || ""} alef-h alef-learn-hero`.trim();
  // Leave #view-title as a child of #main. Moving it into the section disconnects it and
  // resets LCP to this late mount (often 8–11s after the route module loads).
  if (!h1.parentNode || h1.parentNode !== root) {
    if (root.insertBefore && root.firstChild) root.insertBefore(h1, root.firstChild);
    else if (root.append) root.append(h1);
  }
  root.append(wrap);

  async function render() {
    const st = await loadState(ctx);
    if (!alive) return;
    const done = new Set(Object.keys(st.completed));
    const unlocked = await loadUnlocked(ctx); // lessons opened early with a double tap
    if (!alive) return;
    const dueCount = reviewsDue(st.cards, Date.now()); // src/lib/counts.js: the same number Home and Progress show
    const list = lessons.filter((l) => l.track === track);
    const doneInTrack = list.filter((l) => done.has(l.id)).length;
    const firstOpen = Math.max(0, list.findIndex((l) => !done.has(l.id)));
    const far = (i) => list.length > 8 && !showAll && (i < firstOpen - 1 || i > firstOpen + 5);

    replaceKeepingFocus(wrap,
      el("div", { class: "alef-tabs", role: "group", "aria-label": tr(ctx, "learn.tracks", "Tracks") },
        ...[["read", tr(ctx, "learn.track.read", "Read the prayer book")], ["israel", tr(ctx, "learn.track.israel", "Speak in Israel")]].map(([id, label]) =>
          el("button", { type: "button", class: "alef-tab", "aria-pressed": String(track === id), id: `alef-tab-${id}`,
            onclick: () => { track = id; render(); } }, label))),
      continueCard(list[firstOpen] && !done.has(list[firstOpen].id) ? list[firstOpen] : null, doneInTrack, list.length, st),
      ctx?.hasRoute?.("curriculum") ? el("p", { class: "alef-plan-link" }, el("a", { href: "#/curriculum" }, "Curriculum"), ": the whole course in one order, every lesson and every Practical page, stage by stage.") : null,
      track === "read" && ctx?.hasRoute?.("classtrack") ? el("p", { class: "alef-plan-link" }, el("a", { href: "#/classtrack" }, "My study plan"), ": 10 weeks, 3 months, 6 months or a year, on your own dates, with help each week.") : null,
      ctx?.hasRoute?.("library") ? el("p", { class: "alef-plan-link" }, el("a", { href: "#/library" }, "Library"), ": short reads on Shabbat, the holidays and prayer, each with its Hebrew words.") : null,
      ctx?.hasRoute?.("lab") ? el("p", { class: "alef-plan-link" }, el("a", { href: "#/lab" }, "Brain Lab"), ": today’s three quick drills for your Hebrew eyes, ears and memory.") : null,
      // Scope named on the page (M-01): this is one track; the whole course and the ten-week plan count other sets (src/lib/counts.js SCOPE).
      el("p", { class: "alef-progress", role: "status", "data-scope": scopeOfTrack(track) }, `${doneInTrack} / ${list.length} ${tr(ctx, "learn.lessonsDone", "lessons done")} `, el("span", { class: "muted" }, `(${SCOPE[scopeOfTrack(track)]}; ${LESSONS.all} ${SCOPE.all})`)),
      el("p", { class: "alef-due", role: "status" }, dueCount
        ? dueCount === 1 ? "1 review due" : `${dueCount} ${tr(ctx, "learn.dueReviews", "reviews due")}`
        : tr(ctx, "learn.noDue", "No reviews due"), " ",
        dueCount ? el("a", { class: "btn", href: "#/learn?review=1" }, "Review now") : null),
      !streakVisible(ctx) ? null : el("p", { class: "alef-streak" }, st.streak.count ? `Streak: ${daysText(st.streak.count)}.${st.streak.activeToday ? " Today counts." : " Study for 5 minutes today to add a day."}` : (st.streak.best ? `Your best streak was ${daysText(st.streak.best)}. A new one starts the next time you study for 5 minutes.` : plain("streakNone"))),
      track === "read" ? beltStrip(done) : null,
      el("details", { class: "alef-more-practice" }, el("summary", {}, "More ways to practice"), el("p", { class: "row alef-extras" },
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
          const ready = l.prerequisites.every((p) => done.has(p)) || unlocked.has(l.id);
          const isDone = done.has(l.id);
          const state = isDone ? "done" : ready ? "available" : "locked";
          // Double tap a locked lesson to unlock it (owner, 2026-11-11: move freely from one lesson to another). The choice is kept.
          const unlock = async () => { await unlockLesson(ctx, l.id); if (alive) ctx?.route?.(`/learn?lesson=${l.id}`); };
          const showNote = (row) => { const note = row?.querySelector?.(".alef-locked-note"); if (note) { note.hidden = false; note.removeAttribute("hidden"); } };
          const lockedTap = state === "locked" ? doubleTap(unlock, (e) => showNote(e?.currentTarget)) : null;
          return el("li", { class: `alef-lesson alef-lesson-${state}`, "data-lesson": l.id, "data-glyph": firstHebrewLetter(l.teaser || l.words?.[0]?.he), hidden: far(idx) ? "" : null,
            // a tap anywhere on an open stop opens it, like the round stops of a path (keyboard and screen readers use its Start or Review button)
            onclick: (e) => {
              if (e?.target?.closest?.("button, a, summary")) return;
              if (state !== "locked") { ctx?.route?.(`/learn?lesson=${l.id}`); return; }
              // a locked stop says what opens it on the first tap, and opens on the second
              lockedTap(e);
            } },
            el("span", { class: "alef-level" }, levelLabel(l.level)), " ",
            el("strong", {}, l.title), " ",
            el("span", { class: "alef-min" }, `about ${l.estMinutes} min`), " ",
            (l.teaser || l.words?.[0]?.he) ? heText(l.teaser || l.words[0].he) : null, " ",
            el("button", { type: "button", class: "alef-btn", disabled: state === "locked" ? "" : null,
              "aria-label": `${state === "done" ? "Review" : "Start"} ${l.title}`,
              onclick: () => ctx && ctx.route && ctx.route(`/learn?lesson=${l.id}`) }, state === "done" ? tr(ctx, "learn.review", "Review") : tr(ctx, "learn.start", "Start")),
            " ",
            // U-13: completing a lesson without opening it is a test-out, and
            // the button says so — the lesson itself is completed by its
            // quick check, after looking through it.
            // Keyboard and screen readers: the same two presses on a real button (the first says what opens the lesson, the second unlocks it).
            state === "locked" ? (() => { let armed = false; const b = el("button", { type: "button", class: "alef-btn alef-btn-secondary alef-unlock", "aria-label": `Locked: ${l.title}. Press twice to unlock.`,
              onclick: (e) => { if (armed) { unlock(); return; } armed = true; showNote(e?.currentTarget?.closest?.("li") || e?.currentTarget?.parent); b.replaceChildren("Press again to unlock"); } }, "Locked"); return b; })() : null,
            state === "locked" ? el("p", { class: "alef-locked-note", hidden: "", role: "note" }, (() => { const need = l.prerequisites.filter((p) => !done.has(p)).map((p) => `“${lessons.find((x) => x.id === p)?.title || p}”`); return (need.length ? `Opens after you finish ${need.join(" and ")}.` : "Opens after the lesson before it.") + " Or double tap it to open it now."; })()) : null,
            state === "available" ? el("button", { type: "button", class: "alef-btn alef-btn-secondary", "aria-label": `${tr(ctx, "learn.markDone", "Test out")}: Mark complete without studying it: ${l.title}`,
              onclick: async function markDone() { try { await completeLesson(ctx, l); } catch (e) { if (alive) showSaveFailure(wrap, e, markDone); return; } await render(); if (alive) { h1.focus?.({ preventScroll: true }); refocusIfLost(wrap, "#view-title", h1); } } }, tr(ctx, "learn.markDone", "Test out")) : null);
        })),
      list.length > 8 ? el("p", {}, el("button", { type: "button", class: "btn secondary", id: "alef-show-all", "aria-pressed": String(showAll), onclick: () => { showAll = !showAll; render().then(() => { if (alive) wrap.querySelector?.("#alef-show-all")?.focus?.(); }); } }, showAll ? "Show fewer lessons" : `Show all ${list.length} lessons`)) : null);
  }

  /** Duolingo-style "pick up where you left off": Rimon, the next lesson, one big button and a progress bar. */
  function continueCard(next, doneCount, total, st) {
    const pct = total ? Math.round((doneCount / total) * 100) : 0;
    const streak = st?.streak?.count || 0;
    const goalMinutes = Math.round((st?.streak?.goal || 300) / 60);
    // Rimon waves (first lesson) or points to the next one, from the same animated sheets as setup and the lesson finish.
    // When a still for this moment exists, rimon-stage.js can replace the picture (data-rimon-still).
    const still = !next ? "learn.continue.alldone" : doneCount === 0 ? "learn.continue.first" : streak > 1 && !st.streak.activeToday ? "learn.continue.streak" : "learn.continue.next";
    let pic; try { pic = rimonInline({ action: doneCount === 0 ? "wave" : "point", size: 96, label: "Rimon" }).el; pic.setAttribute("class", "rimon-inline alef-continue-rimon"); pic.setAttribute("data-rimon-still", still); } catch { pic = null; }
    if (!pic) pic = el("img", { class: "alef-continue-rimon", alt: "", width: "96", height: "96", "data-rimon-still": still, src: new URL("../../assets/img/gen/MASCOT_rimon.800.webp", import.meta.url).href });
    const say = !next ? "You finished every lesson in this track. Amazing!"
      : doneCount === 0 ? "Let's start! " + goalMinutes + " minutes counts for today. The whole first lesson takes about " + next.estMinutes + ", and you can stop and come back."
      : streak > 1 && !st.streak.activeToday ? `${streak} days in a row! One lesson keeps it going.`
      : "Ready for the next one? You're doing great.";
    // the ring is the learner's own daily goal (chosen at setup, the same number the header shows); the streak still counts a day at 5 minutes
    // src/lib/counts.js minutesGoal: minutes today from the streak record against the setup goal, the same numbers as the header ring.
    let goalRaw = null; try { goalRaw = ctx?.store?.get?.(DAILY_GOAL_KEY) ?? null; } catch { /* no store: the default goal */ }
    const mg = minutesGoal(st?.rawStreak ?? null, goalRaw, Date.now());
    const goalPct = mg.pct, mins = mg.min, goalMin = mg.goal;
    const ring = el("div", { class: "alef-goal-ring", style: `--p:${goalPct}`, role: "img", "aria-label": goalPct >= 100 ? "Daily goal reached" : `Today: ${mins} of ${goalMin} minutes` },
      el("span", {}, goalPct >= 100 ? "✓" : mg.short), el("small", {}, goalPct >= 100 ? "Goal!" : "min today"));
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
    return el("p", { class: "alef-belt" }, `${tr(ctx, "learn.belt", "Your level")}: ${current ? current.name + " belt" : "Black belt (all belts finished; keep practicing)"}. `, el("span", { class: "muted" }, "Belts are Aleph's own levels, like in martial arts. Each one covers a set of lessons."));
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
