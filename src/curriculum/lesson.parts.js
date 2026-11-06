/**
 * A lesson in small parts (Settings: Short sessions, or Calm mode). One part on the screen at a time, the same buttons in the same places,
 * and your place saved after every part and every quick-check answer, so the lesson opens where you stopped.
 * Part size is set by count (src/curriculum/chunks.js), not by a clock: it has not been timed with learners.
 * mountChunkedLesson(root, ctx, lessonId) -> unmount. Reads and writes the store key lesson.resume.v1.
 */
import { lessons, byId } from "./lessons.js";
import { el, heText, replaceKeepingFocus, storeGet, storeSet, showSaveFailure } from "./dom.js";
import { loadContent, vowelEnglish } from "./content.js";
import { saveQuickCheck, loadState } from "./actions.js";
import { due as dueCards } from "./srs.js";
import { buildChoiceQuestions } from "./exercises.session.js";
import { mountQuiz, summaryNode, progressBar } from "./exercises.ui.js";
import { wordAudioId } from "./progress.js";
import { playButton } from "./audio-ui.js";
import { saySound } from "../pronunciation/forTradition.js";
import { hookLine, hookNode } from "../letters/hookline.js";
import { letterMeet, picture } from "../img/scenes.js";
import { loadWordVocabMap } from "./review.view.js";
import { celebrateWin } from "../motion/alive.js";
import { RESUME_KEY, planChunks, getResume, setResume, clearResume, statsFromResults } from "./chunks.js";

const A_ID = /^I-\d{2}$/;
const MAX_PER_STEP = 2;

export function mountChunkedLesson(root, ctx, lessonId) {
  let alive = true, offQuiz = () => {};
  const lesson = byId[lessonId];
  const wrap = el("article", { class: "alef-lesson-page alef-chunked", "aria-labelledby": "view-title" });
  root.append(wrap);
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, lesson.title);
  wrap.append(h1);
  const note = el("p", { class: "alef-audio-note muted", role: "status", "aria-live": "polite" });
  const congregation = ctx.settings?.get?.("congregation") || "sephardi";
  const t0 = Date.now();

  (async () => {
    const [c, st, raw, wordVocab] = await Promise.all([loadContent(), loadState(ctx), storeGet(ctx, RESUME_KEY, {}), loadWordVocabMap()]);
    if (!alive) return;
    let resumeAll = raw;
    const isDone = !!st.completed[lesson.id];
    const unmet = lesson.prerequisites.filter((p) => !st.completed[p]);
    const idx = lessons.findIndex((l) => l.id === lesson.id);
    const next = lessons.slice(idx + 1).find((l) => l.track === lesson.track);
    const all = buildChoiceQuestions(lesson, { ...c, wordPool: lessons.filter((l) => !A_ID.test(l.id)).flatMap((l) => l.words) }, { seed: 1 + idx, tradition: congregation });
    const steps = Array.isArray(lesson.steps) ? lesson.steps.length : 0;
    const questions = steps ? all.slice(0, MAX_PER_STEP * steps) : all;
    const qids = questions.map((q) => q.id);
    const plan = planChunks(lesson, qids);
    const saved = getResume(resumeAll, lesson.id, { questionIds: qids, planLength: plan.length });
    let cur = saved.chunk;
    let results = { ...saved.results };
    const persist = (patch) => { resumeAll = setResume(resumeAll, lesson.id, patch); return storeSet(ctx, RESUME_KEY, resumeAll); };

    const section = (id, title, ...kids) => el("section", { class: "card", "aria-labelledby": id }, el("h2", { id }, title), ...kids);
    const letterItem = (id) => {
      const L = c.letters.get(id);
      return el("li", { class: "alef-item", "data-live": "letter" }, letterMeet(el, ctx, id), heText(L?.he || "?", "alef-he alef-big"),
        el("div", { class: "alef-item-body" }, el("strong", {}, L?.name || id), " ", L?.nameHe ? heText(L.nameHe) : null,
          el("div", { class: "muted" }, saySound(c.consonants?.get(id), congregation, { fallbackEn: L?.sound?.en || "" })),
          hookNode(el, hookLine(c.chain, congregation, { letterId: id }))),
        el("div", { class: "alef-item-actions" }, playButton(ctx, "letter", id, `Listen to ${L?.name || id}`, note)));
    };
    const vowelItem = (id) => {
      const V = c.vowels.get(id);
      return el("li", { class: "alef-item", "data-live": "vowel" }, picture(el, ctx, "vowel", id, { class: "vowel-pic", width: 360 }), heText(V?.shape || "?", "alef-he alef-big"),
        el("div", { class: "alef-item-body" }, el("strong", {}, V?.name || id), V?.nameHe ? " " : null, V?.nameHe ? heText(V.nameHe) : null, el("div", { class: "muted" }, vowelEnglish(V, congregation))),
        el("div", { class: "alef-item-actions" }, playButton(ctx, "vowel", id, `Listen to ${V?.name || id}`, note)));
    };
    const wordItem = (i) => {
      const w = lesson.words[i];
      return el("li", { class: "alef-item", "data-live": "word" }, picture(el, ctx, "word", wordVocab[`${lesson.id}:${i + 1}`] || w.vocabId || w.id, { class: "word-pic", width: 400 }), heText(w.he, "alef-he alef-word"),
        el("div", { class: "alef-item-body" }, el("span", {}, w.en), hookNode(el, hookLine(c.chain, congregation, { he: w.he }))),
        el("div", { class: "alef-item-actions" }, playButton(ctx, "word", wordAudioId(lesson.id, i + 1), `Listen to ${w.en}`, note)));
    };
    const lineItem = (id) => {
      const r = c.corpus.get(id);
      return el("li", { class: "alef-item alef-line" },
        r ? heText(r.he.split("\n")[0], "alef-he alef-word") : el("span", { class: "muted" }, `(${id}: text not in the corpus yet)`),
        el("div", { class: "alef-item-body" }, el("span", {}, r?.title || id), el("div", { class: "muted" }, r?.ref || "")),
        el("div", { class: "alef-item-actions" }, r ? playButton(ctx, "line", r.lines > 1 ? `${id}-l1` : id, `Listen to ${r.title}`, note) : null));
    };
    const groupOf = (items, t) => items.filter((x) => x.t === t);
    const teachNodes = (chunk) => {
      const out = [];
      const L = groupOf(chunk.items, "letter"), V = groupOf(chunk.items, "vowel"), W = groupOf(chunk.items, "word"), P = groupOf(chunk.items, "line");
      if (L.length) out.push(section("l-letters", L.length === 1 ? "Letter" : "Letters", el("ul", { class: "alef-items" }, ...L.map((x) => letterItem(x.id)))));
      if (V.length) out.push(section("l-vowels", "Vowels and marks", el("ul", { class: "alef-items" }, ...V.map((x) => vowelItem(x.id)))));
      if (W.length) out.push(section("l-words", W.length === 1 ? "Word" : "Words", el("ul", { class: "alef-items" }, ...W.map((x) => wordItem(x.i)))));
      if (P.length) out.push(section("l-lines", "Prayer lines", el("ul", { class: "alef-items" }, ...P.map((x) => lineItem(x.id)))));
      return out;
    };

    // Same places every time: the main button first, then Back, then the way out.
    const pauseLink = () => el("a", { class: "btn secondary", href: "#/learn", id: "alef-pause" }, "Pause for now");
    const goTo = (n) => {
      cur = Math.max(0, Math.min(plan.length - 1, n));
      persist({ chunk: cur });
      draw();
      wrap.querySelector?.("#alef-part-title")?.focus?.({ preventScroll: true });
      try { globalThis.scrollTo?.(0, 0); } catch { /* optional */ }
    };
    function head() {
      const pb = progressBar("Lesson parts");
      pb.update((cur + 1) / plan.length, `Part ${cur + 1} of ${plan.length}`);
      return [el("h2", { id: "alef-part-title", tabindex: "-1" }, `Part ${cur + 1} of ${plan.length}`),
        el("p", { class: "muted" }, "Stop whenever you like. Your place is saved."), pb.node];
    }

    function drawSummary(updated, dueCount) {
      const stats = statsFromResults(results, qids);
      const label = (id) => { const q = questions.find((x) => x.id === id); return q ? `${q.promptHe ? q.promptHe + " " : ""}${q.options[q.answerIndex].text}` : id; };
      replaceKeepingFocus(wrap, h1, summaryNode({ title: "Lesson complete", countText: `${stats.right} of ${stats.answered} right on the first try.`, stats, ms: Date.now() - t0,
        goodLabels: Object.keys(results).filter((id) => results[id]).map(label), missedLabels: stats.missed.map(label), skippedN: stats.skipped.length, cardsUpdated: updated, dueCount,
        nextHref: next ? `#/learn?lesson=${next.id}` : "#/learn", nextLabel: next ? "Next lesson" : "All lessons",
        extraLinks: [el("a", { class: "btn secondary", href: `#/learn?lesson=${lesson.id}&review=1` }, "Review these cards")] }));
      wrap.querySelector?.("#alef-int-ex")?.focus?.();
      celebrateWin(ctx, wrap, el, lesson.id);
    }
    async function finish(host) {
      let updated;
      try { ({ updated } = await saveQuickCheck(ctx, lesson, questions, results)); } catch (e) { if (alive) showSaveFailure(host, e, () => finish(host)); return; } // never say "Lesson complete" for a lesson that was not saved
      resumeAll = clearResume(resumeAll, lesson.id); await storeSet(ctx, RESUME_KEY, resumeAll);
      if (!alive) return;
      let dueCount; try { dueCount = dueCards(Object.values((await loadState(ctx)).cards), Date.now()).length; } catch { dueCount = undefined; }
      if (!alive) return;
      drawSummary(updated, dueCount);
    }

    function draw() {
      offQuiz(); offQuiz = () => {};
      note.textContent = "";
      const chunk = plan[cur];
      const kids = [...head()];
      if (unmet.length) kids.push(el("p", { class: "alef-locked", role: "note" }, `Locked: finish ${unmet.map((p) => byId[p]?.title || p).join(", ")} first. You can still look around.`));
      if (chunk.kind === "teach") {
        kids.push(...teachNodes(chunk), note,
          el("div", { class: "row alef-actions alef-actionbar" },
            el("button", { type: "button", class: "btn", id: "alef-next-part", onclick: () => goTo(cur + 1) }, plan[cur + 1]?.kind === "check" ? "Next: questions" : "Next"),
            cur > 0 ? el("button", { type: "button", class: "btn secondary", id: "alef-prev-part", onclick: () => goTo(cur - 1) }, "Back") : null,
            pauseLink()));
      } else if (unmet.length) {
        kids.push(el("p", {}, "The questions open when the lesson before this one is done."),
          el("div", { class: "row alef-actions alef-actionbar" }, cur > 0 ? el("button", { type: "button", class: "btn secondary", id: "alef-prev-part", onclick: () => goTo(cur - 1) }, "Back") : null, pauseLink()));
      } else {
        const host = el("div", { class: "alef-quiz-host" });
        const mine = questions.filter((q) => chunk.ids.includes(q.id));
        const carry = Object.fromEntries(Object.entries(results).filter(([id]) => chunk.ids.includes(id)));
        kids.push(host, el("div", { class: "row alef-actions" }, cur > 0 ? el("button", { type: "button", class: "btn secondary", id: "alef-prev-part", onclick: () => goTo(cur - 1) }, "Back") : null, pauseLink()));
        replaceKeepingFocus(wrap, h1, ...kids);
        offQuiz = mountQuiz(host, { questions: mine, ctx, carry,
          onProgress: (r) => { results = { ...Object.fromEntries(Object.entries(results).filter(([id]) => !chunk.ids.includes(id))), ...r }; persist({ results, replaceResults: true }); },
          onFinish: async ({ results: r }) => {
            results = { ...Object.fromEntries(Object.entries(results).filter(([id]) => !chunk.ids.includes(id))), ...r };
            await persist({ results, replaceResults: true, chunk: Math.min(cur + 1, plan.length - 1) });
            if (!alive) return;
            if (cur >= plan.length - 1) return finish(host);
            host.replaceChildren(el("section", { class: "card" }, el("h2", { id: "alef-part-done", tabindex: "-1" }, "That part is done"),
              el("p", {}, "Your place is saved."), el("div", { class: "row alef-actions alef-actionbar" }, el("button", { type: "button", class: "btn", id: "alef-next-part", onclick: () => goTo(cur + 1) }, "Next part"), pauseLink())));
            host.querySelector?.("#alef-part-done")?.focus?.({ preventScroll: true });
          } });
        return;
      }
      replaceKeepingFocus(wrap, h1, ...kids);
    }

    if (!plan.length) { replaceKeepingFocus(wrap, h1, el("p", {}, "There is nothing to show for this lesson yet."), el("a", { class: "btn", href: "#/learn" }, "All lessons")); return; }
    draw();
  })().catch(() => { wrap.replaceChildren(h1, el("p", { role: "alert" }, "This lesson did not load. Please reload the page and try again.")); });
  return () => { alive = false; offQuiz(); wrap.remove(); };
}
