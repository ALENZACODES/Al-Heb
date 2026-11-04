/** One lesson: its letters, vowels, words and prayer lines, with audio, completion and links to review. */
import { lessons, byId } from "./lessons.js";
import { el, heText, tr, replaceKeepingFocus } from "./dom.js";
import { loadContent, vowelEnglish, vowelIpa } from "./content.js";
import { saveQuickCheck, loadState } from "./actions.js";
import { buildChoiceQuestions } from "./exercises.session.js";
import { mountQuiz, summaryNode } from "./exercises.ui.js";
import { wordAudioId } from "./progress.js";
import { playButton } from "./audio-ui.js";
import { letterSound } from "../pronunciation/forTradition.js";

const A_ID = /^I-\d{2}$/;
export const MAX_PER_STEP = 2;
/** Quick-check size: a lesson with sub-steps (lessons.json `steps`) asks at most 2 questions per step, in the original order. */
export function sizeQuickCheck(questions, lesson) {
  const steps = Array.isArray(lesson?.steps) ? lesson.steps.length : 0;
  return steps ? questions.slice(0, MAX_PER_STEP * steps) : questions;
}
export function mountLesson(root, ctx, lessonId) {
  let alive = true, offQuiz = () => {};
  const wrap = el("article", { class: "alef-lesson-page", "aria-labelledby": "view-title" });
  root.append(wrap);
  const lesson = byId[lessonId];
  if (!lesson) {
    wrap.append(el("h1", { id: "view-title", tabindex: "-1" }, "Lesson not found"), el("p", {}, `There is no lesson with id "${lessonId}".`),
      el("a", { class: "btn", href: "#/learn" }, "All lessons"));
    return () => { alive = false; wrap.remove(); };
  }
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, lesson.title);
  wrap.append(h1);
  const note = el("p", { class: "alef-audio-note muted", role: "status", "aria-live": "polite" });
  const done = el("div", { class: "alef-done", role: "status", "aria-live": "polite" });
  const congregation = ctx.settings?.get?.("congregation") || "sephardi";

  (async () => {
    const [c, st] = await Promise.all([loadContent(), loadState(ctx)]);
    if (!alive) return;
    const isDone = !!st.completed[lesson.id];
    const unmet = lesson.prerequisites.filter((p) => !st.completed[p]);
    const idx = lessons.findIndex((l) => l.id === lesson.id);
    const next = lessons.slice(idx + 1).find((l) => l.track === lesson.track);

    const section = (id, title, ...kids) => el("section", { class: "card", "aria-labelledby": id }, el("h2", { id }, title), ...kids);
    const parts = [
      ctx.img?.(el, { kind: 'lesson', id: lesson.id, class: 'l-scene', width: 900 }),
      el("p", { class: "muted" }, `${lesson.level} · ${lesson.estMinutes} min · ${lesson.track === "read" ? "Read the siddur" : "Speak in Israel"}`),
      el("p", { class: "draft-flag", role: "note" }, "Draft content: glosses and pointing have not yet been reviewed by a native speaker."),
      unmet.length ? el("p", { class: "alef-locked", role: "note" }, `Locked: finish ${unmet.map((p) => byId[p]?.title || p).join(", ")} first. You can still look around.`) : null,
      lesson.onramp && !isDone ? el("p", { class: "card alef-onramp", role: "note" }, el("strong", {}, "Take this lesson one baby step at a time: "), `${lesson.steps?.length || 5} screens, about 2 minutes each. `,
        el("a", { class: "btn", id: "alef-onramp-link", href: "#" + lesson.onramp }, "Start with one letter")) : null,
      section("l-goals", tr(ctx, "lesson.goals", "Goals"), el("ul", {}, ...lesson.goals.map((g) => el("li", {}, g)))),
    ];
    if (lesson.letters.length) parts.push(section("l-letters", "Letters", el("ul", { class: "alef-items" },
      ...lesson.letters.map((id) => {
        const L = c.letters.get(id);
        return el("li", { class: "alef-item" },
          heText(L?.he || "?", "alef-he alef-big"),
          el("div", { class: "alef-item-body" }, el("strong", {}, L?.name || id), " ", L?.nameHe ? heText(L.nameHe) : null,
            el("div", { class: "muted" }, letterSound(c.consonants?.get(id), congregation, { fallbackEn: L?.sound?.en || "" }).en)),
          el("div", { class: "alef-item-actions" }, playButton(ctx, "letter", id, `Listen to ${L?.name || id}`, note),
            el("a", { class: "alef-link", href: `#/letters/${id}`, "aria-label": `Trace ${L?.name || id}` }, "Trace")));
      }))));
    const hooks = lesson.letters.map((id) => c.mnemonics?.get(id)).filter(Boolean);
    if (hooks.length) parts.push(el("details", { class: "card alef-why" }, el("summary", {}, el("strong", {}, "Why? Remember it: memory hooks")),
      el("p", { class: "muted" }, "Memory hooks written for this course (a draft; the stories are teaching aids, not history)."),
      el("ul", { class: "alef-items" }, ...hooks.map((m) => el("li", { class: "alef-item alef-hook" },
        el("div", { class: "alef-item-body" }, el("strong", {}, m.name),
          el("p", {}, m.shape), el("p", {}, m.story),
          el("p", {}, "Sound: ", m.sound, ". Anchor word: ", heText(m.word, "alef-he alef-word"), ` (${m.wordSound}, "${m.wordMeaning}")`),
          m.lookalike ? el("p", { class: "muted" }, "Watch out: " + m.lookalike) : null))))));
    if (lesson.letters.length) parts.push(el("details", { class: "alef-spotit" }, el("summary", { class: "muted" }, "Optional: Spot It drills"), el("p", { class: "row" }, ...lesson.letters.map((id) =>
      el("a", { class: "btn secondary", href: `#/learn?spotit=${id}` }, `Spot It: ${c.letters.get(id)?.name || id}`)))));
    if (lesson.vowels.length) parts.push(section("l-vowels", "Vowels and marks", el("ul", { class: "alef-items" },
      ...lesson.vowels.map((id) => {
        const V = c.vowels.get(id);
        return el("li", { class: "alef-item" },
          heText(V?.shape || "?", "alef-he alef-big"),
          el("div", { class: "alef-item-body" }, el("strong", {}, V?.name || id), V?.nameHe ? " " : null, V?.nameHe ? heText(V.nameHe) : null,
            el("div", { class: "muted" }, vowelEnglish(V, congregation), vowelIpa(V, congregation) ? ` ${vowelIpa(V, congregation)}` : "")),
          el("div", { class: "alef-item-actions" }, playButton(ctx, "vowel", id, `Listen to ${V?.name || id}`, note)));
      }))));
    if (lesson.words.length) parts.push(section("l-words", "Words", el("ul", { class: "alef-items" },
      ...lesson.words.map((w, i) => el("li", { class: "alef-item" },
        heText(w.he, "alef-he alef-word"),
        el("div", { class: "alef-item-body" }, el("span", {}, w.en)),
        el("div", { class: "alef-item-actions" }, playButton(ctx, "word", wordAudioId(lesson.id, i + 1), `Listen to ${w.en}`, note)))))));
    if (lesson.prayerLines.length) parts.push(section("l-lines", "Prayer lines", el("ul", { class: "alef-items" },
      ...lesson.prayerLines.map((id) => {
        const r = c.corpus.get(id);
        return el("li", { class: "alef-item alef-line" },
          r ? heText(r.he.split("\n")[0], "alef-he alef-word") : el("span", { class: "muted" }, `(${id}: text not in the corpus yet)`),
          el("div", { class: "alef-item-body" }, el("span", {}, r?.title || id), el("div", { class: "muted" }, r?.ref || "")),
          el("div", { class: "alef-item-actions" }, r ? playButton(ctx, "line", r.lines > 1 ? `${id}-l1` : id, `Listen to ${r.title}`, note) : null,
            el("a", { class: "alef-link", href: `#/read/${id}` }, "Read")));
      }))));
    parts.push(note);

    // Completion is earned: a quick check (letters and words of this lesson), not a bare "mark complete" tap.
    const allQuestions = buildChoiceQuestions(lesson, { ...c, wordPool: lessons.filter((l) => !A_ID.test(l.id)).flatMap((l) => l.words) }, { seed: 1 + idx, tradition: congregation });
    const questions = sizeQuickCheck(allQuestions, lesson);
    const quizHost = el("div", { class: "alef-quiz-host" });
    const startBtn = el("button", { type: "button", class: "btn", id: "alef-quick-start", disabled: unmet.length || !questions.length ? "" : null, onclick: () => {
      startBtn.hidden = true; startBtn.setAttribute("hidden", ""); done.replaceChildren();
      const t0 = Date.now();
      offQuiz = mountQuiz(quizHost, { questions, ctx, onFinish: async ({ stats, results, ms }) => {
        const { updated } = await saveQuickCheck(ctx, lesson, questions, results);
        if (!alive) return;
        const label = (id) => { const q = questions.find((x) => x.id === id); return q ? `${q.promptHe ? q.promptHe + " " : ""}${q.options[q.answerIndex].text}` : id; };
        quizHost.replaceChildren(summaryNode({ title: "Lesson complete", countText: `${stats.right} of ${stats.answered} right first time.`, stats, ms,
          goodLabels: Object.keys(results).filter((id) => results[id]).map(label), missedLabels: stats.missed.map(label), skippedN: stats.skipped.length, cardsUpdated: updated,
          nextHref: next ? `#/learn?lesson=${next.id}` : "#/learn", nextLabel: next ? "Next lesson" : "All lessons",
          extraLinks: [el("a", { class: "btn secondary", href: `#/learn?lesson=${lesson.id}&review=1` }, "Practise these cards")] }));
        quizHost.querySelector?.("#alef-int-ex")?.focus?.();
        startBtn.textContent = "Check again"; startBtn.hidden = false; startBtn.removeAttribute?.("hidden");
      } });
    } }, isDone ? "Check again" : "Start quick check");
    parts.push(el("p", { class: "muted" }, questions.length ? `Quick check: ${questions.length} question${questions.length === 1 ? "" : "s"}. The lesson counts as complete when you finish it.`
      : "No quick check is available for this lesson yet, so it cannot be marked complete."),
      el("div", { class: "row alef-actions" }, startBtn,
      el("a", { class: "btn secondary", href: `#/learn?lesson=${lesson.id}&review=1` }, "Practise these cards"),
      el("a", { class: "btn secondary", href: "#/learn" }, "All lessons")), quizHost, done);

    replaceKeepingFocus(wrap, h1, ...parts);
  })().catch((e) => { wrap.replaceChildren(h1, el("p", { role: "alert" }, "Could not load lesson content: " + (e?.message || e))); });
  return () => { alive = false; offQuiz(); wrap.remove(); };
}
