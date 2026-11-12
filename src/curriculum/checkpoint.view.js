/** Cumulative confusable-group checkpoint over letters taught so far. #/learn?checkpoint=1[&seed=n] */
import { lessons } from "./lessons.js";
import { el, heText, replaceKeepingFocus } from "./dom.js";
import { loadContent } from "./content.js";
import { buildCheckpoint, gradeCheckpoint, stageFor, PASS_RATIO } from "./checkpoint.js";
import { loadState, taughtFromCompleted, saveCheckpoint } from "./actions.js";
import { hintPanel } from "./hint-ui.js";

export function mountCheckpoint(root, ctx, seed0 = 1) {
  let alive = true;
  const wrap = el("section", { class: "alef-checkpoint", "aria-labelledby": "view-title" });
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, "Look-alike checkpoint");
  root.append(wrap);
  (async () => {
    const [c, st] = await Promise.all([loadContent(), loadState(ctx)]);
    if (!alive) return;
    const taught = taughtFromCompleted(st.completed, lessons.filter((l) => l.track === "read"));
    const qs = buildCheckpoint({ taught, confusables: c.confusables, seed: Number(seed0) || 1 });
    if (!qs.length) { replaceKeepingFocus(wrap, h1, el("p", {}, "Nothing to check yet: this checkpoint needs at least two look-alike letters you have completed lessons for."), el("a", { class: "btn", href: "#/learn" }, "All lessons")); return; }
    const answers = {}; let pos = 0;
    const L = (id) => c.letters.get(id);
    function ask() {
      if (!alive) return;
      if (pos >= qs.length) return finish();
      const q = qs[pos];
      const fb = el("div", { role: "status", "aria-live": "polite" });
      const opts = q.options.map((o) => el("button", { type: "button", class: "btn secondary alef-opt",
        onclick: async () => {
          if (answers[q.id]) return; answers[q.id] = o;
          opts.forEach((b) => { b.disabled = true; });
          const right = o === q.answer;
          fb.replaceChildren(el("p", {}, right ? "Right." : `Not quite: it was ${L(q.answer)?.name}.`));
          const go = el("button", { type: "button", class: "btn", onclick: () => { pos++; ask(); } }, pos + 1 === qs.length ? "See results" : "Next");
          if (!right) {
            const set = (c.confusables.sets || []).find((s) => s.id === q.setId);
            const panel = await hintPanel(ctx, { kind: "confusable-pair", detail: set?.hint || "", correct: right }, () => panel?.remove());
            if (panel && alive) fb.append(panel);
          }
          fb.append(go);
        } }, q.type === "pick-glyph" ? heText(L(o)?.he || o, "alef-he alef-big") : (L(o)?.name || o)));
      replaceKeepingFocus(wrap, h1,
        el("p", { class: "muted", role: "status" }, `Question ${pos + 1} of ${qs.length}`),
        el("div", { class: "card" },
          q.type === "pick-glyph" ? el("p", {}, `Which one is ${L(q.targetId)?.name}?`) : el("p", {}, "What is this letter called?"),
          q.type === "pick-name" ? heText(L(q.targetId)?.he || "?", "alef-he alef-huge") : null,
          el("div", { class: "row alef-options" }, ...opts)), fb);
    }
    async function finish() {
      const res = gradeCheckpoint(qs, answers);
      await saveCheckpoint(ctx, stageFor(taught.size), qs, answers, res);
      if (!alive) return;
      replaceKeepingFocus(wrap, h1,
        el("h2", {}, res.passed ? "Checkpoint passed" : "Checkpoint: more practice needed"),
        el("p", {}, `${res.right} of ${res.total} right (${Math.round(res.ratio * 100)}%). The pass mark is ${Math.ceil(res.total * PASS_RATIO - 1e-9)} of ${res.total} (${res.total ? Math.round((Math.ceil(res.total * PASS_RATIO - 1e-9) / res.total) * 100) : 80}%).`),
        res.weakSets.length ? el("p", {}, "Look-alike groups to practice: " + res.weakSets.map((id) => (c.confusables.sets.find((s) => s.id === id)?.letters || []).map((l) => L(l)?.name || l).join("/")).join("; ") + ".") : null,
        res.wrongLetters.length ? el("div", {}, el("p", {}, "Scan drills for the ones you missed:"), el("div", { class: "row" }, ...res.wrongLetters.map((l) => el("a", { class: "btn secondary", href: `#/learn?spotit=${l}` }, `Spot It: ${L(l)?.name || l}`)))) : null,
        el("p", { class: "muted" }, "Missed letters were sent back to your review queue; correct ones counted as a good review."),
        el("div", { class: "row" }, el("a", { class: "btn", href: "#/learn?review=1" }, "Review now"), el("a", { class: "btn secondary", href: "#/learn" }, "All lessons")));
    }
    ask();
  })().catch((e) => { wrap.replaceChildren(h1, el("p", { role: "alert" }, "Could not start this check. Reload the page, then try again.")); });
  return () => { alive = false; wrap.remove(); };
}
