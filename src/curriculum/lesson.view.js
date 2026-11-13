/** One lesson: its letters, vowels, words and prayer lines, with audio, completion and links to review. */
import { streakVisible } from "../shell/comfort.js";
import { lessons, byId, rankOf } from "./lessons.js";
import { el, heText, tr, replaceKeepingFocus, levelLabel } from "./dom.js";
import { loadContent, vowelEnglish } from "./content.js";
import { saveQuickCheck, loadState } from "./actions.js";
import { due as dueCards } from "./srs.js";
import { buildChoiceQuestions } from "./exercises.session.js";
import { mountQuiz, summaryNode } from "./exercises.ui.js";
import { wordAudioId } from "./progress.js";
import { playButton, slowButton } from "./audio-ui.js";
import { saySound, respell, LABELS } from "../pronunciation/forTradition.js";
import { loadSoundTextData, letterSoundText, vowelSoundText, soundTextNode } from "../pronunciation/soundtext.js";
import { isAudioFree } from "../shell/audiofree.js";
import { displayHebrew } from "../shell/names.js";
import { plain } from "../shell/plain-copy.js";
import { chunkedLessons } from "../shell/comfort.js";
import { RESUME_KEY, getResume, setResume, clearResume } from "./chunks.js";
import { storeGet, storeSet, showSaveFailure } from "./dom.js";
import { hookLine, hookNode } from "../letters/hookline.js";
import { mountChunkedLesson } from "./lesson.parts.js";
import { loadUnlocked, unlockLesson, stillLocked, doubleTap } from "./unlock.js";
import { passMark, passRuleText, passPercent, CHECKS_KEY } from "./passmark.js";
// C2/C8: objective cards and the learner's own record load on demand (src/coursemap/objectives.js); the lesson works without them.
const objectives = () => import("../coursemap/objectives.js");

const A_ID = /^I-\d{2}$/;
export const MAX_PER_STEP = 2;
/** Quick-check size: a lesson with sub-steps (lessons.json `steps`) asks at most 2 questions per step, in the original order. */
export function sizeQuickCheck(questions, lesson) {
  const steps = Array.isArray(lesson?.steps) ? lesson.steps.length : 0;
  return steps ? questions.slice(0, MAX_PER_STEP * steps) : questions;
}
export function mountLesson(root, ctx, lessonId) {
  // C-01 "Test out": a short test on the lesson's quick check, with the same pass mark, instead of a free "mark complete".
  const testOut = ctx?.query?.testout === "1";
  // Short sessions and calm mode: the lesson comes in small parts (lesson.parts.js)
  if (!testOut && (chunkedLessons(ctx) || ctx?.query?.quick === "1") && byId[lessonId]) return mountChunkedLesson(root, ctx, lessonId); // ?quick=1: the 3-minute lesson uses the same short parts
  let alive = true, offQuiz = () => {};
  const wrap = el("article", { class: "alef-lesson-page", "aria-labelledby": "view-title" });
  root.append(wrap);
  const lesson = byId[lessonId];
  if (!lesson) {
    wrap.append(el("h1", { id: "view-title", tabindex: "-1" }, "Lesson not found"), el("p", {}, "We could not find that lesson."),
      el("a", { class: "btn", href: "#/learn" }, "All lessons"));
    return () => { alive = false; wrap.remove(); };
  }
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, testOut ? `Test out: ${lesson.title}` : lesson.title);
  wrap.append(h1);
  const note = el("p", { class: "alef-audio-note muted", role: "status", "aria-live": "polite" });
  const done = el("div", { class: "alef-done", role: "status", "aria-live": "polite" });
  const congregation = ctx.settings?.get?.("congregation") || "sephardi";

  (async () => {
    const [c, st] = await Promise.all([loadContent(), loadState(ctx)]);
    if (!alive) return;
    const isDone = !!st.completed[lesson.id];
    // A lesson the learner opened early (double tap on the lesson list, or the Unlock button below) is not locked: see unlock.js.
    const unlockedSet = await loadUnlocked(ctx);
    if (!alive) return;
    const unmet = stillLocked(lesson, st.completed, unlockedSet);
    const idx = lessons.findIndex((l) => l.id === lesson.id);
    const next = lessons.slice(idx + 1).find((l) => l.track === lesson.track);
    let resumeAll = await storeGet(ctx, RESUME_KEY, {}); // answers already given in an earlier visit, so a lesson can be paused and picked up again

    const section = (id, title, ...kids) => el("section", { class: "card", "aria-labelledby": id }, el("h2", { id }, title), ...kids);
    const parts = [
      ctx.img?.(el, { kind: 'lesson', id: lesson.id, class: 'l-scene', width: 900 }),
      el("p", { class: "muted alef-meta" }, `${levelLabel(lesson.level, rankOf.get(lesson.id))} · about ${lesson.estMinutes} min · ${lesson.track === "read" ? "Read the prayer book" : "Speak in Israel"}`),
      el("details", { class: "draft-flag alef-draft" }, el("summary", {}, "About This Lesson"),
        // review status is stated once, on the credits page
        el("h2", { id: "l-goals", class: "alef-draft-h" }, tr(ctx, "lesson.goals", "Goals")), el("ul", {}, ...lesson.goals.map((g) => el("li", {}, g)))),
      unmet.length ? el("p", { class: "alef-locked", role: "note" }, `Locked: finish ${unmet.map((p) => byId[p]?.title || p).join(", ")} first. You can still look around, or double tap Unlock to take this lesson now. `,
        (() => { const go = async () => { await unlockLesson(ctx, lesson.id); if (alive) { root.replaceChildren(); mountLesson(root, ctx, lessonId); } };
          const b = el("button", { type: "button", class: "btn secondary", id: "alef-unlock", "aria-label": `Unlock ${lesson.title}. Press twice.`, onclick: doubleTap(go, () => { b.replaceChildren("Tap again to unlock"); }) }, "Unlock"); return b; })()) : null,
      lesson.onramp && !isDone ? el("p", { class: "card alef-onramp", role: "note" }, el("strong", {}, "Short steps: "), (() => { const n = lesson.steps?.length || 5, each = lesson.estMinutes ? Math.max(1, Math.round(lesson.estMinutes / n)) : 2; return `${n} steps, about ${each} minute${each === 1 ? "" : "s"} each. `; })(), // from the lesson's own estimate, so it agrees with "about N min" above
        el("a", { class: "btn", id: "alef-onramp-link", href: "#" + lesson.onramp }, "Start with one letter")) : null,
    ];
    const teach = !testOut; // a test-out shows the test only
    if (teach && lesson.letters.length) parts.push(section("l-letters", "Letters", el("ul", { class: "alef-items" },
      ...lesson.letters.map((id) => {
        const L = c.letters.get(id);
        return el("li", { class: "alef-item" },
          heText(L?.he || "?", "alef-he alef-big"),
          el("div", { class: "alef-item-body" }, el("strong", {}, L?.name || id), " ", L?.nameHe ? heText(L.nameHe) : null,
            el("div", { class: "muted" }, saySound(c.consonants?.get(id), congregation, { fallbackEn: L?.sound?.en || "" })),
            hookNode(el, hookLine(c.chain, congregation, { letterId: id }))),
          el("div", { class: "alef-item-actions" }, playButton(ctx, "letter", id, `Listen to ${L?.name || id}`, note),
            el("a", { class: "alef-link", href: `#/letters/${id}`, "aria-label": `Trace ${L?.name || id}` }, "Trace")));
      }))));
    // Written "how it is said" for every letter and vowel of the lesson (no audio needed); filled in once the pronunciation notes load.
    if (teach && (lesson.letters.length || lesson.vowels.length)) {
      const soundBox = el("div", { class: "alef-soundtext-box" });
      parts.push(soundBox);
      loadSoundTextData().then((sd) => {
        if (!alive) return;
        const open = isAudioFree(ctx);
        const nodes = [...lesson.letters.map((id) => soundTextNode(el, letterSoundText(id, sd, congregation))), ...lesson.vowels.map((id) => soundTextNode(el, vowelSoundText(id, sd, congregation)))].filter(Boolean);
        if (open) nodes.forEach((n) => n.setAttribute("open", ""));
        soundBox.replaceChildren(...(nodes.length ? [el("h2", { class: "alef-draft-h" }, "How these sounds are said, in words"), ...nodes] : []));
      }).catch(() => {});
    }
    const hooks = !teach ? [] : lesson.letters.map((id) => c.mnemonics?.get(id)).filter(Boolean);
    if (hooks.length) parts.push(el("details", { class: "card alef-why" }, el("summary", {}, el("strong", {}, "Why? Remember it: memory hooks")),
      el("p", { class: "muted" }, plain("hooksNote")),
      el("ul", { class: "alef-items" }, ...hooks.map((m) => {
        // the memory chain is the one story and word for a letter that has an entry (the hook line above and the card say it); keep shape, sound and look-alike only
        const chained = !!c.chain?.get?.(m.id);
        return el("li", { class: "alef-item alef-hook" },
          el("div", { class: "alef-item-body" }, el("strong", {}, m.name),
            el("p", {}, m.shape), chained ? null : el("p", {}, m.story),
            el("p", {}, saySound(c.consonants?.get(m.id), congregation, { fallbackEn: m.sound }), chained ? null : [" Anchor word: ", heText(m.word, "alef-he alef-word"), ` (${m.wordSound}, "${m.wordMeaning}")`]),
            m.lookalike ? el("p", { class: "muted" }, "Watch out: " + m.lookalike) : null));
      }))));
    if (teach && lesson.letters.length) parts.push(el("details", { class: "alef-spotit" }, el("summary", { class: "muted" }, "Optional: Spot It drills"), el("p", { class: "row" }, ...lesson.letters.map((id) =>
      el("a", { class: "btn secondary", href: `#/learn?spotit=${id}` }, `Spot It: ${c.letters.get(id)?.name || id}`)))));
    if (teach && lesson.vowels.length) parts.push(section("l-vowels", "Vowels and marks", el("ul", { class: "alef-items" },
      ...lesson.vowels.map((id) => {
        const V = c.vowels.get(id);
        return el("li", { class: "alef-item" },
          heText(V?.shape || "?", "alef-he alef-big"),
          el("div", { class: "alef-item-body" }, el("strong", {}, V?.name || id), V?.nameHe ? " " : null, V?.nameHe ? heText(V.nameHe) : null,
            el("div", { class: "muted" }, vowelEnglish(V, congregation))),
          el("div", { class: "alef-item-actions" }, playButton(ctx, "vowel", id, `Listen to ${V?.name || id}`, note)));
      }))));
    if (teach && lesson.words.length) parts.push(section("l-words", "Words", el("ul", { class: "alef-items" },
      ...lesson.words.map((w, i) => el("li", { class: "alef-item" },
        heText(displayHebrew(w.he, "abbrev"), "alef-he alef-word"),
        // a pointed word gets its respelling as text (a screen reader may have no Hebrew voice); the English meaning stays first
        el("div", { class: "alef-item-body" }, el("span", {}, w.en), hookNode(el, hookLine(c.chain, congregation, { he: w.he })), (() => { const r = respell(w.he, congregation); return r ? el("div", { class: "muted alef-respell", lang: "en" }, `Sounds like: ${r} (${LABELS[congregation] || congregation} style)`) : null; })()),
        el("div", { class: "alef-item-actions" }, playButton(ctx, "word", wordAudioId(lesson.id, i + 1), `Listen to ${w.en}`, note, { text: w.he }), slowButton(ctx, "word", wordAudioId(lesson.id, i + 1), `Listen to ${w.en}`, note, { text: w.he })))))));
    if (teach && lesson.prayerLines.length) parts.push(section("l-lines", "Prayer lines", el("ul", { class: "alef-items" },
      ...lesson.prayerLines.map((id) => {
        const r = c.corpus.get(id);
        return el("li", { class: "alef-item alef-line" },
          r ? heText(displayHebrew(r.he.split("\n")[0], "abbrev"), "alef-he alef-word") : el("span", { class: "muted" }, `(${id}: text not in the corpus yet)`),
          el("div", { class: "alef-item-body" }, el("span", {}, r?.title || id), el("div", { class: "muted" }, r?.ref || "")),
          el("div", { class: "alef-item-actions" }, r ? playButton(ctx, "line", r.lines > 1 ? `${id}-l1` : id, `Listen to ${r.title}`, note) : null,
            r ? slowButton(ctx, "line", r.lines > 1 ? `${id}-l1` : id, `Listen to ${r.title}`, note) : null,
            el("a", { class: "alef-link", href: `#/read/${id}` }, "Read")));
      }))));
    parts.push(note);
    if (teach) { const gs = el("div", { class: "alef-spotlight-slot" }); parts.push(gs); import("../coursemap/spotlight.js").then((m) => alive && m.mountSpotlight(gs, lesson.id)).catch(() => {}); } // C9: grammar spotlight, on demand

    // Completion is earned: a quick check (letters and words of this lesson), not a bare "mark complete" tap.
    const allQuestions = buildChoiceQuestions(lesson, { ...c, wordPool: lessons.filter((l) => !A_ID.test(l.id)).flatMap((l) => l.words) }, { seed: 1 + idx, tradition: congregation });
    const questions = sizeQuickCheck(allQuestions, lesson);
    let carry = isDone || testOut ? {} : getResume(resumeAll, lesson.id, { questionIds: questions.map((q) => q.id) }).results;
    const carried = Object.keys(carry).length;
    const saveResume = (patch) => { if (testOut) return; resumeAll = setResume(resumeAll, lesson.id, patch); return storeSet(ctx, RESUME_KEY, resumeAll); };
    const quizHost = el("div", { class: "alef-quiz-host" });
    const showStart = (text) => { startBtn.textContent = text; startBtn.hidden = false; startBtn.removeAttribute?.("hidden"); actions.className = "row alef-actions alef-actionbar"; };
    function startQuiz() {
      startBtn.hidden = true; startBtn.setAttribute("hidden", ""); done.replaceChildren();
      actions.className = "row alef-actions"; // the quiz has its own action bar; two sticky bars would stack
      offQuiz(); offQuiz = () => {};
      offQuiz = mountQuiz(quizHost, { questions, ctx, carry, onProgress: (r) => { saveResume({ results: r, replaceResults: true }); }, onFinish: async function finishQuiz(res) {
        const { stats, results, ms } = res;
        let saved;
        try { saved = await saveQuickCheck(ctx, lesson, questions, results, Date.now(), ms); } catch (e) { if (alive) showSaveFailure(quizHost, e, () => finishQuiz(res)); return; } // never say "Lesson complete" for a lesson that was not saved
        const updated = saved.updated;
        carry = {}; // a new try starts from the first question
        if (!testOut) { resumeAll = clearResume(resumeAll, lesson.id); await storeSet(ctx, RESUME_KEY, resumeAll); }
        if (!alive) return;
        let dueCount; try { dueCount = dueCards(Object.values((await loadState(ctx)).cards), Date.now()).length; } catch { dueCount = undefined; } // hide "Review now" when nothing is due
        if (!alive) return;
        const label = (id) => { const q = questions.find((x) => x.id === id); return q ? `${q.promptHe ? q.promptHe + " " : ""}${q.options[q.answerIndex].text}` : id; };
        const countText = `${stats.right} of ${questions.length} right on the first try.`;
        const reviewLink = el("a", { class: "btn secondary", href: `#/learn?lesson=${lesson.id}&review=1` }, "Review these cards");
        if (!saved.passed) {
          // C-01: below the pass mark — no "Lesson complete", no celebration (so no lesson XP), review cards still updated.
          quizHost.replaceChildren(summaryNode({ passed: false, ctx, title: "Not passed yet — try again", countText, stats, ms, need: saved.need, of: saved.of, wasDone: isDone,
            missedLabels: stats.missed.map(label), cardsUpdated: updated, onRetry: () => startQuiz(), retryLabel: "Try again",
            extraLinks: [testOut ? el("a", { class: "btn secondary", href: `#/learn?lesson=${lesson.id}` }, "Study the lesson") : reviewLink, el("a", { class: "btn secondary", href: "#/learn" }, "All lessons")] }));
          quizHost.querySelector?.("#alef-int-ex")?.focus?.();
          objectives().then((m) => { if (alive) quizHost.append(m.provedCard(el, questions, results)); }).catch(() => {});
          return;
        }
        quizHost.replaceChildren(summaryNode({ ctx, store: ctx?.store, sfx: ctx?.sfx, showStreak: streakVisible(ctx), title: testOut ? "Test passed: lesson complete" : "Lesson complete", countText, stats, ms,
          goodLabels: Object.keys(results).filter((id) => results[id]).map(label), missedLabels: stats.missed.map(label), skippedN: stats.skipped.length, cardsUpdated: updated, dueCount,
          nextHref: next ? `#/learn?lesson=${next.id}` : "#/learn", nextLabel: next ? "Next lesson" : "All lessons",
          extraLinks: [reviewLink] }));
        quizHost.querySelector?.("#alef-int-ex")?.focus?.();
        objectives().then((m) => { if (alive) quizHost.append(m.provedCard(el, questions, results)); }).catch(() => {});
        showStart("Check again");
      } });
      // Nothing else on screen shows the quiz began (the card sits below the first screen): move focus to its heading and bring the card up.
      // preventScroll on focus, then one scrollIntoView; scroll-behavior is auto under reduced motion (app.css), so no animation is forced.
      const qCard = quizHost.querySelector?.(".alef-ex-card"), qHead = quizHost.querySelector?.("#alef-q-title");
      qHead?.focus?.({ preventScroll: true });
      const bring = () => { if (alive) qCard?.scrollIntoView?.({ block: "start" }); };
      // after the next frame, so the card's final height is in the layout; scrolling in the same task stopped about 300 px short (the page grew after the target was fixed)
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(bring); else bring();
    }
    const startBtn = el("button", { type: "button", class: "btn", id: "alef-quick-start", disabled: unmet.length || !questions.length ? "" : null, onclick: () => startQuiz() },
      testOut ? "Start the test" : isDone ? "Check again" : carried ? "Continue quick check" : "Start quick check");
    // The start button sits in the page, after the letters it checks: a sticky bar here covered the letter cards before
    // the learner had read them. Inside the quick check, Continue/Undo/Skip keep the sticky action bar.
    const actions = el("div", { class: "row alef-actions alef-start-row" }, startBtn);
    const more = el("div", { class: "row alef-actions" },
      el("a", { class: "btn secondary", href: `#/learn?lesson=${lesson.id}&review=1` }, "Review these cards"),
      el("a", { class: "btn secondary", href: "#/learn" }, "All lessons"));
    // U-13 (completion without contact): the quick check IS the completion,
    // so it asks for contact first — the learner must have scrolled the
    // lesson's last content part into view before it opens. A lesson already
    // finished, or one being resumed mid-check, is never re-gated; where
    // scrolling cannot be observed, the check stays open (no traps).
    const lastPart = [...parts].reverse().find((n) => n && typeof n === 'object' && (n.tagName === 'SECTION' || n.tagName === 'P'));
    let visited = testOut || isDone || carried > 0 || typeof IntersectionObserver !== 'function' || !lastPart;
    const gateNote = el("p", { class: "muted", id: "alef-check-gate", role: "note" },
      visited ? "" : "Look through the lesson first — the quick check opens when you reach the end of it, or press “Go to the quick check” at the top. (If you already know this lesson, “Test out” on the lesson list is a short test you can pass instead.)");
    const syncGate = () => {
      const gated = !visited && !unmet.length && !!questions.length;
      startBtn.disabled = gated || !!unmet.length || !questions.length;
      if (!gated && gateNote.textContent) gateNote.textContent = "";
    };
    if (!visited) startBtn.disabled = true;
    parts.push(el("p", { class: "muted" }, questions.length ? (questions.length === 1 ? "Quick check: 1 question. Your place is saved." : `Quick check: ${questions.length} questions. Your place is saved.`) + (carried ? ` You have already answered ${carried}.` : "")
      : "No quick check is available for this lesson yet, so it cannot be marked complete."),
      questions.length ? el("p", { class: "alef-pass-rule", "data-pass-mark": String(passMark(questions.length)) }, `Pass mark: ${passMark(questions.length)} of ${questions.length} right on the first try (${passPercent(questions.length)}%).`) : null,
      gateNote, actions, more, quizHost, done);
    // S-13 and C-01: the rule is stated before the lesson starts, at the top, where it is seen without scrolling, with a way straight to the check.
    if (questions.length) {
      const goCheck = el("button", { type: "button", class: "btn secondary", id: "alef-go-check", onclick: () => {
        visited = true; syncGate();
        try { actions.scrollIntoView?.({ block: "center" }); } catch { /* optional */ }
        startBtn.focus?.({ preventScroll: true });
      } }, testOut ? "Go to the test" : "Go to the quick check");
      const intro = el("p", { class: "card alef-check-rule", id: "alef-check-rule", role: "note" },
        el("strong", {}, testOut ? `Test out: ${questions.length} question${questions.length === 1 ? "" : "s"}. ` : `Quick check at the end: ${questions.length} question${questions.length === 1 ? "" : "s"}. `),
        passRuleText(questions.length),
        testOut ? " Pass it and this lesson counts as done without studying it. Retries of a missed question do not count toward the pass." : " The check is at the end of the lesson; look through the lesson first, or go straight to it.",
        " ", testOut || unmet.length ? null : goCheck);
      const at = parts.findIndex((n) => n && /\balef-meta\b/.test(n.className || ""));
      const objSlot = el("div", { class: "alef-objectives-slot" });
      parts.splice(at >= 0 ? at + 1 : 1, 0, intro, objSlot);
      Promise.all([objectives(), storeGet(ctx, CHECKS_KEY, {})]).then(([m, checks]) => { if (alive) objSlot.replaceChildren(m.objectiveCard(el, lesson, questions, m.lessonRecord(checks, lesson.id))); }).catch(() => {});
    }

    replaceKeepingFocus(wrap, h1, ...parts);
    if (!visited && lastPart && typeof IntersectionObserver === 'function') {
      try {
        const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { visited = true; try { io.disconnect(); } catch { /* ignore */ } syncGate(); } }, { rootMargin: '0px 0px -10% 0px' });
        io.observe(lastPart);
      } catch { visited = true; syncGate(); }
    }
  })().catch((e) => { wrap.replaceChildren(h1, el("p", { role: "alert" }, "This lesson did not load. Please reload the page and try again.")); });
  return () => { alive = false; offQuiz(); wrap.remove(); };
}
