import { signalRimon } from '../shell/rimon-events.js';
/** DOM pieces of the lesson loop shared by the exercise players: progress bar, summary card, and the quick-check player. */
import { plain } from "../shell/plain-copy.js";
import { el, heText, heLabeled } from "./dom.js";
import { createSession, fmtDuration, pct, feedbackText, closingLine, fireFeedback, buildChoiceQuestions, retryText, skipNotice } from "./exercises.session.js";
import { onKeys } from "./ex-ui.js";
import { confirmOn } from "../shell/motor.js";
import { rimonInline } from "../shell/rimon-inline.js";
import { flameCard } from "../shell/flame.js";

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
 * End-of-lesson card. data: { title, countText, stats, ms, goodLabels[], missedLabels[], skippedN, cardsUpdated, dueCount (optional; 0 hides the Review now link), nextHref, nextLabel,
 * extraLinks[] }. The primary button is "next"; review and the list are secondary.
 */
export function summaryNode(d) {
  if (d.passed === false) return notPassedNode(d);
  const st = d.stats;
  const next = d.nextHref ? el("a", { class: "btn alef-next-primary", href: d.nextHref }, d.nextLabel || "Next lesson") : null;
  // Celebration first: Rimon, confetti (still for reduced motion) and a cheer that matches the score.
  try { globalThis.document?.dispatchEvent?.(new CustomEvent("alef:rimon", { detail: { action: st.accuracy >= 0.8 ? "highfive" : "bounce" } })); } catch { /* the cheer is optional */ }
  try { globalThis.document?.dispatchEvent?.(new CustomEvent("alef:celebrate", { detail: { kind: "lesson", accuracy: st.accuracy, ms: d.ms, title: d.title } })); } catch { /* the sting is optional (src/audio/sting.js) */ }
  // Rimon in the page plays his move (high five for a strong lesson); the streak flame follows the shared record and lights live.
  let rimon = null; try { rimon = rimonInline({ action: st.accuracy >= 0.8 ? "highfive" : "bounce", size: 132, label: "Rimon cheers" }); } catch { rimon = null; }
  const store = d.store ?? d.ctx?.store ?? globalThis.alef?.store ?? null;
  let flame = null;
  if (store && d.showStreak !== false && d.ctx?.settings?.get?.("showStreak") !== false && d.ctx?.settings?.get?.("calmMode") !== true) { try { flame = flameCard({ make: el, store, onLit: () => { try { const fx = d.sfx || d.ctx?.sfx; if (fx?.play) fx.play("streak"); } catch { /* sound is never the only cue */ } rimon?.play?.("stretch"); } }); } catch { flame = null; } }
  // M-03: "Perfect" only at 100%.
  const cheer = st.accuracy >= 1 ? "Perfect lesson! Rimon is dancing." : st.accuracy >= 0.9 ? "Strong lesson! Rimon is dancing." : st.accuracy >= 0.7 ? "Great job! Keep it going." : "You finished! Every lesson counts.";
  const party = el("div", { class: "alef-celebrate", "aria-hidden": "true" },
    ...Array.from({ length: 18 }, (_, i) => el("i", { style: `--i:${i}` })),
    rimon ? rimon.el : el("img", { class: "alef-celebrate-rimon", alt: "", width: "120", height: "120", "data-rimon-still": st.accuracy >= 0.9 ? "lesson.complete.perfect" : st.accuracy >= 0.7 ? "lesson.complete.great" : "lesson.complete.done", src: new URL("../../assets/img/gen/MASCOT_rimon.800.webp", import.meta.url).href }));
  // The streak flame is the live card above (src/shell/flame.js).
  const remindSlot = el("div", { class: "alef-remind-slot" });
  if (d.ctx) import("../shell/reminder-ask.js").then((m) => m.offerReminders(remindSlot, d.ctx)).catch(() => {});
  return el("div", { class: "alef-summary" },
    party,
    el("p", { class: "alef-celebrate-cheer" }, cheer),
    el("h2", { id: "alef-int-ex", tabindex: "-1" }, d.title || "Lesson finished"),
    el("p", { role: "status" }, d.countText),
    flame ? flame.el : null,
    el("dl", { class: "alef-summary-stats" },
      el("div", {}, el("dt", {}, "Accuracy (first try)"), el("dd", { "data-stat": "accuracy" }, pct(st.accuracy))),
      el("div", {}, el("dt", {}, "Time"), el("dd", { "data-stat": "time" }, fmtDuration(d.ms))),
      d.goodLabels.length ? el("div", {}, el("dt", {}, "Answered right"), el("dd", { "data-stat": "good" }, d.goodLabels.join(", "))) : null),
    el("p", {}, closingLine(st.accuracy, st.missed.length)),
    d.missedLabels.length ? el("div", {}, el("p", {}, "To review:"), el("ul", { "data-list": "review" }, ...d.missedLabels.map((t) => el("li", {}, t)))) : el("p", {}, "Nothing to review."),
    d.skippedN ? el("p", { class: "muted", "data-skipped": String(d.skippedN) }, plain("skippedNote", { n: d.skippedN })) : null,
    el("p", { class: "muted" }, d.cardsUpdated ? `${d.cardsUpdated} review card${d.cardsUpdated === 1 ? "" : "s"} updated.` : "No review cards needed updating."),
    remindSlot,
    el("div", { class: "row alef-summary-actions" }, next, d.dueCount === 0 ? null : el("a", { class: next ? "btn secondary" : "btn", href: "#/learn?review=1" }, "Review now"), ...(d.extraLinks || [])));
}

/**
 * C-01: the end card for a quick check below the pass mark. No celebration event (so no lesson XP, gems or streak day from
 * the retention layer), no confetti, no "Lesson complete": it says the score, the pass mark, that review cards were updated,
 * and offers to try again. d: { title?, countText, stats, ms, need, of, missedLabels[], cardsUpdated, onRetry?, retryLabel?, extraLinks[] }.
 */
export function notPassedNode(d) {
  const st = d.stats || { accuracy: null, missed: [] };
  const retry = d.onRetry ? el("button", { type: "button", class: "btn alef-retry-primary", id: "alef-try-again", onclick: () => d.onRetry() }, d.retryLabel || "Try again") : null;
  return el("div", { class: "alef-summary alef-summary-notpassed", "data-passed": "false" },
    el("h2", { id: "alef-int-ex", tabindex: "-1" }, d.title || "Not passed yet — try again"),
    el("p", { role: "status" }, d.countText),
    d.need ? el("p", { "data-pass-mark": String(d.need) }, `The pass mark is ${d.need} of ${d.of} right on the first try (${Math.round((d.need / d.of) * 100)}%). ${d.wasDone ? "The lesson stays marked done from before; this try gives no lesson XP." : "This lesson is not marked done yet, and no lesson XP was given."}`) : null,
    el("dl", { class: "alef-summary-stats" },
      el("div", {}, el("dt", {}, "Accuracy (first try)"), el("dd", { "data-stat": "accuracy" }, pct(st.accuracy))),
      d.ms != null ? el("div", {}, el("dt", {}, "Time"), el("dd", { "data-stat": "time" }, fmtDuration(d.ms))) : null),
    d.missedLabels?.length ? el("div", {}, el("p", {}, "To review:"), el("ul", { "data-list": "review" }, ...d.missedLabels.map((t) => el("li", {}, t)))) : null,
    el("p", { class: "muted" }, d.cardsUpdated ? `${d.cardsUpdated} review card${d.cardsUpdated === 1 ? "" : "s"} updated, so the ones you missed come back in Review.` : "No review cards needed updating."),
    el("div", { class: "row alef-summary-actions" }, retry, ...(d.extraLinks || [])));
}

/**
 * Quick-check player for lessons without exercises of their own. opts: { questions, ctx, onFinish({stats, results, ms}) }.
 * Keys: 1-9 pick an option, Enter continues, S skips. Wrong answers are repeated once at the end.
 */
export function mountQuiz(host, { questions, ctx, onFinish, now = () => Date.now(), carry = {}, onProgress }) {
  // carry: { [questionId]: boolean } answered in an earlier visit. onProgress(firstResults) is called after every answer and undo, so a caller can save the place.
  const carried = questions.filter((q) => q.id in carry);
  const session = createSession(questions.filter((q) => !(q.id in carry)), { carry: carried.map((q) => ({ it: q, right: !!carry[q.id] })) });
  const saveProgress = () => { try { onProgress?.(session.firstResults()); } catch { /* saving the place is best effort */ } };
  const t0 = now();
  const pb = progressBar("Quick check progress");
  const body = el("div", { class: "alef-quiz" });
  let off = () => {}, streak = 0, n = 0, notice = "";
  host.replaceChildren(pb.node, body);
  // C-02: the bar and the counter run on the check's fixed length; repeats of missed questions are counted apart ("1 retry so far").
  const refresh = () => { const p = session.progress(); pb.update(p.share, `${p.position} of ${p.length} done${p.retries ? `, ${retryText(p.retries)}` : ""}`); };

  function show() {
    off();
    refresh();
    if (session.done()) { const stats = session.stats(); return onFinish({ stats, results: session.firstResults(), ms: now() - t0 }); }
    const q = session.current(), retry = session.isRetry(), p = session.progress();
    let answered = false;
    const status = el("p", { class: "alef-fb", role: "status", "aria-live": "polite", id: "alef-fb-" + (n + 1) });
    const why = el("p", { class: "muted alef-why", id: "alef-why-" + (n + 1) });
    const cont = el("button", { type: "button", class: "btn", "data-act": "next", hidden: "", onclick: () => show() }, session.progress().resolved + 1 >= p.total ? "Finish" : "Continue");
    const undo = el("button", { type: "button", class: "btn secondary", "data-act": "undo", hidden: "", onclick: () => { if (session.undo()) { n--; saveProgress(); show(); } } }, "Undo");
    const skip = el("button", { type: "button", class: "btn secondary", "data-act": "skip", onclick: () => { if (!answered) { notice = skipNotice(session.skip()); show(); } } }, "Skip");
    const skipped = notice ? el("p", { class: "muted alef-skipped", role: "status", "data-skipped-note": "" }, notice) : null; notice = "";
    // Settings > "Ask me to confirm each answer": a tap only marks a choice; "Check answer" submits it. Nothing is graded until then.
    const confirm = confirmOn(ctx); let selected = -1;
    const check = confirm ? el("button", { type: "button", class: "btn", "data-act": "check", disabled: "", onclick: () => { if (selected >= 0) submit(selected); } }, "Check answer") : null;
    const mark = (i) => {
      selected = i;
      opts.forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
      check.disabled = false; check.removeAttribute("disabled");
      status.textContent = `Marked: ${q.options[i].text}. Press Check answer to submit, or choose another.`;
    };
    const opts = q.options.map((o, i) => el("button", { type: "button", class: "btn secondary alef-int-opt", "data-n": String(i + 1), ...(confirm ? { "aria-pressed": "false" } : {}), ...(o.he ? { lang: "he", dir: "rtl" } : {}), ...(o.label ? { "aria-label": o.label } : {}),
      // the browser's own focus scroll stops at the viewport edge, i.e. under the sticky bar (it ignores scroll-margin), and runs after this event: re-scroll a tick later
      onfocus: (e) => { const b = e.currentTarget; setTimeout(() => { try { if (b.matches(":focus-visible")) b.scrollIntoView?.({ block: "nearest" }); } catch { /* engines without :focus-visible */ } }, 0); },
      onclick: () => { if (answered) return; if (confirm) mark(i); else submit(i); } }, o.text));
    function submit(i) {
        if (answered) return; answered = true;
        const ok = i === q.answerIndex; n++;
        session.answer(ok); signalRimon(ok ? 'correct' : 'wrong', { source: 'lesson', questionId: q.id, retry }); streak = ok ? streak + 1 : 0; fireFeedback(ctx, ok); saveProgress();
        opts.forEach((b, k) => { b.disabled = true; b.setAttribute("disabled", ""); if (k === q.answerIndex) b.setAttribute("data-state", "right"); else if (k === i) b.setAttribute("data-state", "wrong");
          // a label that replaces the glyph also replaces the mark the style adds (right or wrong): say it in words
          if (q.options[k].label) b.setAttribute("aria-label", q.options[k].label + (k === q.answerIndex ? " This was the right answer." : k === i ? " Your choice, not the answer." : "")); });
        card.setAttribute("data-result", ok ? "right" : "wrong");
        status.textContent = feedbackText(ok, { retry, streak, n }) + (ok ? "" : ` The answer is ${q.options[q.answerIndex].text}.`);
        why.textContent = q.why || "";
        [cont, ...(session.canUndo() ? [undo] : [])].forEach((b) => { b.hidden = false; b.removeAttribute?.("hidden"); }); // no Undo after a first-try miss
        skip.hidden = true; skip.setAttribute("hidden", "");
        if (check) { check.hidden = true; check.setAttribute("hidden", ""); opts.forEach((b) => b.removeAttribute("aria-pressed")); }
        // Focus moves to Continue because the answer buttons are now disabled. A screen reader may speak the new focus instead of the polite
        // status, so Continue also carries the verdict as its description: it is read whichever of the two is spoken.
        cont.setAttribute("aria-describedby", "alef-fb-" + (n) + (q.why ? " alef-why-" + (n) : ""));
        refresh(); cont.focus?.({ preventScroll: true });
        (q.why ? why : status).scrollIntoView?.({ block: "nearest" }); // one call (a second would cancel the smooth scroll): the explanation sits last, so clearing the sticky bar with it keeps the verdict above it in view
    }
    const card = el("section", { class: "card alef-ex-card", "data-ex": q.id, "data-type": q.kind, "aria-labelledby": "alef-q-title" },
      el("h2", { id: "alef-q-title", tabindex: "-1" }, retry ? `Try again: retry ${Math.min(p.retriesDone + p.retriesSkipped + 1, p.retries)} of ${p.retries}` : `Question ${Math.min(p.position + 1, p.length)} of ${p.length}`), skipped,
      p.retries ? el("p", { class: "muted alef-retries", "data-retries": String(p.retries) }, retryText(p.retries) + ". Only first tries count toward the pass mark.") : null,
      el("p", {}, q.prompt), q.promptHe ? el("p", {}, heLabeled(q.promptHe, q.promptLabel, "alef-he alef-big")) : null,
      el("div", { class: "alef-int-options col", role: "group", "aria-label": "Choices" }, ...opts), status, why,
      el("div", { class: "row alef-actionbar" }, check, cont, undo, skip));
    body.replaceChildren(card);
    off = onKeys((e) => {
      if (/^[1-9]$/.test(e.key)) { const b = opts[Number(e.key) - 1]; if (b && !b.disabled) b.click(); }
      else if (e.key === "Enter" && check && !answered && selected >= 0 && globalThis.document?.activeElement !== check) check.click();
      else if (e.key === "Enter" && answered && !cont.hidden && globalThis.document?.activeElement !== cont) cont.click();
      else if ((e.key === "s" || e.key === "S") && !answered) skip.click();
    });
  }
  show();
  return () => off();
}
export { buildChoiceQuestions };
