/** DOM pieces of the lesson loop shared by the exercise players: progress bar, summary card, and the quick-check player. */
import { el, heText } from "./dom.js";
import { createSession, fmtDuration, pct, feedbackText, closingLine, fireFeedback, buildChoiceQuestions } from "./exercises.session.js";
import { onKeys } from "./ex-ui.js";

/** Accessible lesson progress bar. `update(fraction, label)` changes it. */
export function progressBar(label = "Lesson progress") {
  const fill = el("span", { class: "alef-pb-fill", style: "width:0%" });
  const node = el("div", { class: "alef-pb", role: "progressbar", "aria-label": label, "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0" }, fill);
  return { node, update(fraction, text) {
    const v = Math.max(0, Math.min(100, Math.round(fraction * 100)));
    fill.setAttribute("style", `width:${v}%`); node.setAttribute("aria-valuenow", String(v)); if (text) node.setAttribute("aria-valuetext", text);
  } };
}

/**
 * End-of-lesson card. data: { title, countText, stats, ms, goodLabels[], missedLabels[], skippedN, cardsUpdated, nextHref, nextLabel,
 * extraLinks[] }. The primary button is "next"; review and the list are secondary.
 */
export function summaryNode(d) {
  const st = d.stats;
  const next = d.nextHref ? el("a", { class: "btn alef-next-primary", href: d.nextHref }, d.nextLabel || "Next lesson") : null;
  return el("div", { class: "alef-summary" },
    el("h2", { id: "alef-int-ex", tabindex: "-1" }, d.title || "Lesson finished"),
    el("p", { role: "status" }, d.countText),
    el("dl", { class: "alef-summary-stats" },
      el("div", {}, el("dt", {}, "Accuracy (first try)"), el("dd", { "data-stat": "accuracy" }, pct(st.accuracy))),
      el("div", {}, el("dt", {}, "Time"), el("dd", { "data-stat": "time" }, fmtDuration(d.ms))),
      d.goodLabels.length ? el("div", {}, el("dt", {}, "Answered right"), el("dd", { "data-stat": "good" }, d.goodLabels.join(", "))) : null),
    el("p", {}, closingLine(st.accuracy, st.missed.length)),
    d.missedLabels.length ? el("div", {}, el("p", {}, "To review:"), el("ul", { "data-list": "review" }, ...d.missedLabels.map((t) => el("li", {}, t)))) : el("p", {}, "Nothing to review."),
    d.skippedN ? el("p", { class: "muted", "data-skipped": String(d.skippedN) }, `${d.skippedN} skipped (not counted either way). Use "Practise again" to do them.`) : null,
    el("p", { class: "muted" }, d.cardsUpdated ? `${d.cardsUpdated} review card${d.cardsUpdated === 1 ? "" : "s"} updated.` : "No review cards needed updating."),
    el("div", { class: "row alef-summary-actions" }, next, el("a", { class: next ? "btn secondary" : "btn", href: "#/learn?review=1" }, "Review now"), ...(d.extraLinks || [])));
}

/**
 * Quick-check player for lessons without exercises of their own. opts: { questions, ctx, onFinish({stats, results, ms}) }.
 * Keys: 1-9 pick an option, Enter continues, S skips. Wrong answers are repeated once at the end.
 */
export function mountQuiz(host, { questions, ctx, onFinish, now = () => Date.now() }) {
  const session = createSession(questions);
  const t0 = now();
  const pb = progressBar("Quick check progress");
  const body = el("div", { class: "alef-quiz" });
  let off = () => {}, streak = 0, n = 0;
  host.replaceChildren(pb.node, body);
  const refresh = () => { const p = session.progress(); pb.update(p.fraction, `${p.resolved} of ${p.total} done`); };

  function show() {
    off();
    refresh();
    if (session.done()) { const stats = session.stats(); return onFinish({ stats, results: session.firstResults(), ms: now() - t0 }); }
    const q = session.current(), retry = session.isRetry(), p = session.progress();
    let answered = false;
    const status = el("p", { class: "alef-fb", role: "status", "aria-live": "polite" });
    const why = el("p", { class: "muted alef-why" });
    const cont = el("button", { type: "button", class: "btn", "data-act": "next", hidden: "", onclick: () => show() }, session.progress().resolved + 1 >= p.total ? "Finish" : "Continue");
    const undo = el("button", { type: "button", class: "btn secondary", "data-act": "undo", hidden: "", onclick: () => { if (session.undo()) { n--; show(); } } }, "Undo");
    const skip = el("button", { type: "button", class: "btn secondary", "data-act": "skip", onclick: () => { if (!answered) { session.skip(); show(); } } }, "Skip");
    const opts = q.options.map((o, i) => el("button", { type: "button", class: "btn secondary alef-int-opt", "data-n": String(i + 1), ...(o.he ? { lang: "he", dir: "rtl" } : {}),
      onclick: () => {
        if (answered) return; answered = true;
        const ok = i === q.answerIndex; n++;
        session.answer(ok); streak = ok ? streak + 1 : 0; fireFeedback(ctx, ok);
        opts.forEach((b, k) => { b.disabled = true; b.setAttribute("disabled", ""); if (k === q.answerIndex) b.setAttribute("data-state", "right"); else if (k === i) b.setAttribute("data-state", "wrong"); });
        card.setAttribute("data-result", ok ? "right" : "wrong");
        status.textContent = feedbackText(ok, { retry, streak, n }) + (ok ? "" : ` The answer is ${q.options[q.answerIndex].text}.`);
        why.textContent = q.why || "";
        [cont, undo].forEach((b) => { b.hidden = false; b.removeAttribute?.("hidden"); });
        skip.hidden = true; skip.setAttribute("hidden", "");
        refresh(); cont.focus?.();
      } }, o.text));
    const card = el("section", { class: "card alef-ex-card", "data-ex": q.id, "data-type": q.kind, "aria-labelledby": "alef-q-title" },
      el("h2", { id: "alef-q-title", tabindex: "-1" }, `${retry ? "Try again: " : ""}Question ${Math.min(p.resolved + 1, p.total)} of ${p.total}`),
      el("p", {}, q.prompt), q.promptHe ? el("p", {}, heText(q.promptHe, "alef-he alef-big")) : null,
      el("div", { class: "alef-int-options col", role: "group", "aria-label": "Choices" }, ...opts), status, why,
      el("div", { class: "row" }, cont, undo, skip));
    body.replaceChildren(card);
    off = onKeys((e) => {
      if (/^[1-9]$/.test(e.key)) { const b = opts[Number(e.key) - 1]; if (b && !b.disabled) b.click(); }
      else if (e.key === "Enter" && answered && !cont.hidden && globalThis.document?.activeElement !== cont) cont.click();
      else if ((e.key === "s" || e.key === "S") && !answered) skip.click();
    });
  }
  show();
  return () => off();
}
export { buildChoiceQuestions };
