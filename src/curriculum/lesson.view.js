/** One lesson: its letters, vowels, words and prayer lines, with audio, completion and links to review. */
import { lessons, byId } from "./lessons.js";
import { el, heText, tr, replaceKeepingFocus } from "./dom.js";
import { loadContent, vowelEnglish, vowelIpa } from "./content.js";
import { completeLesson, loadState, unmetPrerequisites } from "./actions.js";
import { wordAudioId } from "./progress.js";
import { playButton } from "./audio-ui.js";

export function mountLesson(root, ctx, lessonId) {
  let alive = true;
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
    const unmet = unmetPrerequisites(lesson, st);
    const idx = lessons.findIndex((l) => l.id === lesson.id);
    const next = lessons.slice(idx + 1).find((l) => l.track === lesson.track);

    const section = (id, title, ...kids) => el("section", { class: "card", "aria-labelledby": id }, el("h2", { id }, title), ...kids);
    const parts = [
      el("p", { class: "muted" }, `${lesson.level} · ${lesson.estMinutes} min · ${lesson.track === "read" ? "Read the siddur" : "Speak in Israel"}`),
      el("p", { class: "draft-flag", role: "note" }, "Draft content: glosses and pointing were written by an AI agent and have not been reviewed by a native speaker."),
      unmet.length ? el("p", { class: "alef-locked", role: "note" }, `Locked: finish ${unmet.map((p) => byId[p]?.title || p).join(", ")} first. You can still look around.`) : null,
      section("l-goals", tr(ctx, "lesson.goals", "Goals"), el("ul", {}, ...lesson.goals.map((g) => el("li", {}, g)))),
    ];
    if (lesson.letters.length) parts.push(section("l-letters", "Letters", el("ul", { class: "alef-items" },
      ...lesson.letters.map((id) => {
        const L = c.letters.get(id);
        return el("li", { class: "alef-item" },
          heText(L?.he || "?", "alef-he alef-big"),
          el("div", { class: "alef-item-body" }, el("strong", {}, L?.name || id), " ", L?.nameHe ? heText(L.nameHe) : null,
            el("div", { class: "muted" }, L?.sound?.en || "")),
          el("div", { class: "alef-item-actions" }, playButton(ctx, "letter", id, `Listen to ${L?.name || id}`, note),
            el("a", { class: "alef-link", href: `#/letters/${id}`, "aria-label": `Trace ${L?.name || id}` }, "Trace")));
      }))));
    const hooks = lesson.letters.map((id) => c.mnemonics?.get(id)).filter(Boolean);
    if (hooks.length) parts.push(section("l-remember", "Remember it",
      el("p", { class: "muted" }, "Memory hooks written for this course (a draft; the stories are teaching aids, not history)."),
      el("ul", { class: "alef-items" }, ...hooks.map((m) => el("li", { class: "alef-item alef-hook" },
        el("div", { class: "alef-item-body" }, el("strong", {}, m.name),
          el("p", {}, m.shape), el("p", {}, m.story),
          el("p", {}, "Sound: ", m.sound, ". Anchor word: ", heText(m.word, "alef-he alef-word"), ` (${m.wordSound}, "${m.wordMeaning}")`),
          m.lookalike ? el("p", { class: "muted" }, "Watch out: " + m.lookalike) : null))))));
    if (lesson.letters.length) parts.push(el("p", { class: "row" }, ...lesson.letters.map((id) =>
      el("a", { class: "btn secondary", href: `#/learn?spotit=${id}` }, `Spot It: ${c.letters.get(id)?.name || id}`))));
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

    const completeBtn = el("button", { type: "button", class: "btn", disabled: unmet.length ? "" : null, onclick: async () => {
      completeBtn.disabled = true;
      let added;
      try { ({ added } = await completeLesson(ctx, lesson)); }
      catch (error) {
        if (alive) { completeBtn.disabled = false; done.textContent = "Could not save: " + (error?.message || error) + ". Please try again."; }
        return;
      }
      if (!alive) return;
      completeBtn.textContent = "Completed";
      done.replaceChildren(el("p", {}, `Lesson complete. ${added} new review card${added === 1 ? "" : "s"} added.`),
        el("div", { class: "row" },
          el("a", { class: "btn", href: "#/learn?review=1" }, "Review now"),
          next ? el("a", { class: "btn secondary", href: `#/learn?lesson=${next.id}` }, "Next lesson") : null,
          el("a", { class: "btn secondary", href: "#/learn" }, "All lessons")));
    } }, isDone ? "Completed (tap to refresh cards)" : tr(ctx, "learn.markDone", "Mark lesson complete"));
    parts.push(el("div", { class: "row alef-actions" }, completeBtn,
      el("a", { class: "btn secondary", href: `#/learn?lesson=${lesson.id}&review=1` }, "Practice these cards"),
      el("a", { class: "btn secondary", href: "#/learn" }, "All lessons")), done);

    replaceKeepingFocus(wrap, h1, ...parts);
  })().catch((e) => { wrap.replaceChildren(h1, el("p", { role: "alert" }, "Could not load lesson content: " + (e?.message || e))); });
  return () => { alive = false; wrap.remove(); };
}
