/** One lesson: its letters, vowels, words and prayer lines, with audio, completion and links to review. */
import { lessons, byId } from "./lessons.js";
import { el, heText, tr, replaceKeepingFocus, levelLabel } from "./dom.js";
import { loadContent, vowelEnglish } from "./content.js";
import { saveQuickCheck, loadState } from "./actions.js";
import { due as dueCards } from "./srs.js";
import { buildChoiceQuestions } from "./exercises.session.js";
import { mountQuiz, summaryNode } from "./exercises.ui.js";
import { wordAudioId } from "./progress.js";
import { playButton } from "./audio-ui.js";
import { saySound, respell, LABELS } from "../pronunciation/forTradition.js";
import { loadSoundTextData, letterSoundText, vowelSoundText, soundTextNode } from "../pronunciation/soundtext.js";
import { isAudioFree } from "../shell/audiofree.js";
import { plain } from "../shell/plain-copy.js";
import { chunkedLessons } from "../shell/comfort.js";
import { RESUME_KEY, getResume, setResume, clearResume } from "./chunks.js";
import { storeGet, storeSet, showSaveFailure } from "./dom.js";
import { hookLine, hookNode } from "../letters/hookline.js";
import { letterMeet, picture } from "../img/scenes.js";
import { celebrateWin } from "../motion/alive.js";
import { mountChunkedLesson } from "./lesson.parts.js";
import { loadWordVocabMap } from "./review.view.js";

const A_ID = /^I-\d{2}$/;
export const MAX_PER_STEP = 2;
/** Quick-check size: a lesson with sub-steps (lessons.json `steps`) asks at most 2 questions per step, in the original order. */
export function sizeQuickCheck(questions, lesson) {
  const steps = Array.isArray(lesson?.steps) ? lesson.steps.length : 0;
  return steps ? questions.slice(0, MAX_PER_STEP * steps) : questions;
}
export function mountLesson(root, ctx, lessonId) {
  // Short sessions and calm mode: the lesson comes in small parts (lesson.parts.js)
  if (chunkedLessons(ctx) && byId[lessonId]) return mountChunkedLesson(root, ctx, lessonId);
  let alive = true, offQuiz = () => {};
  const wrap = el("article", { class: "alef-lesson-page", "aria-labelledby": "view-title" });
  root.append(wrap);
  const lesson = byId[lessonId];
  if (!lesson) {
    wrap.append(el("h1", { id: "view-title", tabindex: "-1" }, "Lesson not found"), el("p", {}, "We could not find that lesson."),
      el("a", { class: "btn", href: "#/learn" }, "All lessons"));
    return () => { alive = false; wrap.remove(); };
  }
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, lesson.title);
  wrap.append(h1);
  const note = el("p", { class: "alef-audio-note muted", role: "status", "aria-live": "polite" });
  const done = el("div", { class: "alef-done", role: "status", "aria-live": "polite" });
  const congregation = ctx.settings?.get?.("congregation") || "sephardi";

  (async () => {
    const [c, st, wordVocab] = await Promise.all([loadContent(), loadState(ctx), loadWordVocabMap()]);
    if (!alive) return;
    const isDone = !!st.completed[lesson.id];
    const unmet = lesson.prerequisites.filter((p) => !st.completed[p]);
    const idx = lessons.findIndex((l) => l.id === lesson.id);
    const next = lessons.slice(idx + 1).find((l) => l.track === lesson.track);
    let resumeAll = await storeGet(ctx, RESUME_KEY, {}); // answers already given in an earlier visit, so a lesson can be paused and picked up again

    const section = (id, title, ...kids) => el("section", { class: "card", "aria-labelledby": id }, el("h2", { id }, title), ...kids);
    const parts = [
      ctx.img?.(el, { kind: 'lesson', id: lesson.id, class: 'l-scene', width: 900 }),
      el("p", { class: "muted alef-meta" }, `${levelLabel(lesson.level)} · ${lesson.estMinutes} min · ${lesson.track === "read" ? "Read the prayer book" : "Speak in Israel"}`),
      el("details", { class: "draft-flag alef-draft" }, el("summary", {}, "About this lesson (draft content)"),
        el("p", {}, plain("lessonDraft")),
        el("h2", { id: "l-goals", class: "alef-draft-h" }, tr(ctx, "lesson.goals", "Goals")), el("ul", {}, ...lesson.goals.map((g) => el("li", {}, g)))),
      unmet.length ? el("p", { class: "alef-locked", role: "note" }, `Locked: finish ${unmet.map((p) => byId[p]?.title || p).join(", ")} first. You can still look around.`) : null,
      lesson.onramp && !isDone ? el("p", { class: "card alef-onramp", role: "note" }, el("strong", {}, "Short steps: "), `${lesson.steps?.length || 5} steps, about 2 minutes each. `,
        el("a", { class: "btn", id: "alef-onramp-link", href: "#" + lesson.onramp }, "Start with one letter")) : null,
    ];
    if (lesson.letters.length) parts.push(section("l-letters", "Letters", el("ul", { class: "alef-items" },
      ...lesson.letters.map((id) => {
        const L = c.letters.get(id);
        return el("li", { class: "alef-item", "data-live": "letter" },
          letterMeet(el, ctx, id),
          heText(L?.he || "?", "alef-he alef-big"),
          el("div", { class: "alef-item-body" }, el("strong", {}, L?.name || id), " ", L?.nameHe ? heText(L.nameHe) : null,
            el("div", { class: "muted" }, saySound(c.consonants?.get(id), congregation, { fallbackEn: L?.sound?.en || "" })),
            hookNode(el, hookLine(c.chain, congregation, { letterId: id }))),
          el("div", { class: "alef-item-actions" }, playButton(ctx, "letter", id, `Listen to ${L?.name || id}`, note),
            el("a", { class: "alef-link", href: `#/letters/${id}`, "aria-label": `Trace ${L?.name || id}` }, "Trace")));
      }))));
    // Written "how it is said" for every letter and vowel of the lesson (no audio needed); filled in once the pronunciation notes load.
    if (lesson.letters.length || lesson.vowels.length) {
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
    const hooks = lesson.letters.map((id) => c.mnemonics?.get(id)).filter(Boolean);
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
    if (lesson.letters.length) parts.push(el("details", { class: "alef-spotit" }, el("summary", { class: "muted" }, "Optional: Spot It drills"), el("p", { class: "row" }, ...lesson.letters.map((id) =>
      el("a", { class: "btn secondary", href: `#/learn?spotit=${id}` }, `Spot It: ${c.letters.get(id)?.name || id}`)))));
    if (lesson.vowels.length) parts.push(section("l-vowels", "Vowels and marks", el("ul", { class: "alef-items" },
      ...lesson.vowels.map((id) => {
        const V = c.vowels.get(id);
        return el("li", { class: "alef-item", "data-live": "vowel" },
          picture(el, ctx, "vowel", id, { class: "vowel-pic", width: 360 }),
          heText(V?.shape || "?", "alef-he alef-big"),
          el("div", { class: "alef-item-body" }, el("strong", {}, V?.name || id), V?.nameHe ? " " : null, V?.nameHe ? heText(V.nameHe) : null,
            el("div", { class: "muted" }, vowelEnglish(V, congregation))),
          el("div", { class: "alef-item-actions" }, playButton(ctx, "vowel", id, `Listen to ${V?.name || id}`, note)));
      }))));
    if (lesson.words.length) parts.push(section("l-words", "Words", el("ul", { class: "alef-items" },
      ...lesson.words.map((w, i) => el("li", { class: "alef-item", "data-live": "word" },
        picture(el, ctx, "word", wordVocab[`${lesson.id}:${i + 1}`] || w.vocabId || w.id, { class: "word-pic", width: 400 }),
        heText(w.he, "alef-he alef-word"),
        // a pointed word gets its respelling as text (a screen reader may have no Hebrew voice); the English meaning stays first
        el("div", { class: "alef-item-body" }, el("span", {}, w.en), hookNode(el, hookLine(c.chain, congregation, { he: w.he })), (() => { const r = respell(w.he, congregation); return r ? el("div", { class: "muted alef-respell", lang: "en" }, `Sounds like: ${r} (${LABELS[congregation] || congregation} style)`) : null; })()),
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
    const carry = isDone ? {} : getResume(resumeAll, lesson.id, { questionIds: questions.map((q) => q.id) }).results;
    const carried = Object.keys(carry).length;
    const saveResume = (patch) => { resumeAll = setResume(resumeAll, lesson.id, patch); return storeSet(ctx, RESUME_KEY, resumeAll); };
    const quizHost = el("div", { class: "alef-quiz-host" });
    const startBtn = el("button", { type: "button", class: "btn", id: "alef-quick-start", disabled: unmet.length || !questions.length ? "" : null, onclick: () => {
      startBtn.hidden = true; startBtn.setAttribute("hidden", ""); done.replaceChildren();
      actions.className = "row alef-actions"; // the quiz has its own action bar; two sticky bars would stack
      const t0 = Date.now();
      offQuiz = mountQuiz(quizHost, { questions, ctx, carry, onProgress: (r) => { saveResume({ results: r, replaceResults: true }); }, onFinish: async function finishQuiz(res) {
        const { stats, results, ms } = res;
        let updated;
        try { ({ updated } = await saveQuickCheck(ctx, lesson, questions, results)); } catch (e) { if (alive) showSaveFailure(quizHost, e, () => finishQuiz(res)); return; } // never say "Lesson complete" for a lesson that was not saved
        resumeAll = clearResume(resumeAll, lesson.id); await storeSet(ctx, RESUME_KEY, resumeAll);
        if (!alive) return;
        let dueCount; try { dueCount = dueCards(Object.values((await loadState(ctx)).cards), Date.now()).length; } catch { dueCount = undefined; } // hide "Review now" when nothing is due
        if (!alive) return;
        const label = (id) => { const q = questions.find((x) => x.id === id); return q ? `${q.promptHe ? q.promptHe + " " : ""}${q.options[q.answerIndex].text}` : id; };
        quizHost.replaceChildren(summaryNode({ title: "Lesson complete", countText: `${stats.right} of ${stats.answered} right first time.`, stats, ms,
          goodLabels: Object.keys(results).filter((id) => results[id]).map(label), missedLabels: stats.missed.map(label), skippedN: stats.skipped.length, cardsUpdated: updated, dueCount,
          nextHref: next ? `#/learn?lesson=${next.id}` : "#/learn", nextLabel: next ? "Next lesson" : "All lessons",
          extraLinks: [el("a", { class: "btn secondary", href: `#/learn?lesson=${lesson.id}&review=1` }, "Review these cards")] }));
        quizHost.querySelector?.("#alef-int-ex")?.focus?.();
        celebrateWin(ctx, quizHost, el, lesson.id);
        startBtn.textContent = "Check again"; startBtn.hidden = false; startBtn.removeAttribute?.("hidden");
        actions.className = "row alef-actions alef-actionbar";
      } });
      // Nothing else on screen shows the quiz began (the card sits below the first screen): move focus to its heading and bring the card up.
      // preventScroll on focus, then one scrollIntoView; scroll-behavior is auto under reduced motion (app.css), so no animation is forced.
      const qCard = quizHost.querySelector?.(".alef-ex-card"), qHead = quizHost.querySelector?.("#alef-q-title");
      qHead?.focus?.({ preventScroll: true });
      const bring = () => { if (alive) qCard?.scrollIntoView?.({ block: "start" }); };
      // after the next frame, so the card's final height is in the layout; scrolling in the same task stopped about 300 px short (the page grew after the target was fixed)
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(bring); else bring();
    } }, isDone ? "Check again" : carried ? "Continue quick check" : "Start quick check");
    // The primary action sits in the sticky action bar (same one exercises use), so it is reachable without scrolling the whole lesson.
    const actions = el("div", { class: "row alef-actions alef-actionbar" }, startBtn);
    const more = el("div", { class: "row alef-actions" },
      el("a", { class: "btn secondary", href: `#/learn?lesson=${lesson.id}&review=1` }, "Review these cards"),
      el("a", { class: "btn secondary", href: "#/learn" }, "All lessons"));
    parts.push(el("p", { class: "muted" }, questions.length ? (questions.length === 1 ? "Quick check: 1 question. Finish it to complete the lesson. Your place is saved." : plain("quickCheckMany", { n: questions.length })) + (carried ? ` You have already answered ${carried}.` : "")
      : "No quick check is available for this lesson yet, so it cannot be marked complete."),
      actions, more, quizHost, done);

    replaceKeepingFocus(wrap, h1, ...parts);
  })().catch((e) => { wrap.replaceChildren(h1, el("p", { role: "alert" }, "This lesson did not load. Please reload the page and try again.")); });
  return () => { alive = false; offQuiz(); wrap.remove(); };
}
