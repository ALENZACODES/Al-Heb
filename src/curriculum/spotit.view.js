/** Spot It: tap every instance of the target letter in short lines of pointed Hebrew. #/learn?spotit=<letterId>[&seed=n] */
import { lessons } from "./lessons.js";
import { el, heText, tr, replaceKeepingFocus } from "./dom.js";
import { loadContent } from "./content.js";
import { buildSpotIt, scoreSpotIt } from "./spotit.js";
import { taughtThrough, loanwordGroups, decodableWords } from "./loanwords.js";
import { saveSpotIt } from "./actions.js";
import { hintPanel } from "./hint-ui.js";

export function mountSpotIt(root, ctx, letterId, seed0 = 1) {
  let alive = true, seed = Number(seed0) || 1;
  const wrap = el("section", { class: "alef-spotit", "aria-labelledby": "view-title" });
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, "Spot It");
  root.append(wrap);
  const intro = lessons.find((l) => l.track === "read" && l.letters.includes(letterId));

  async function round() {
    const c = await loadContent();
    if (!alive) return;
    const L = c.letters.get(letterId);
    if (!intro || !L) { replaceKeepingFocus(wrap, h1, el("p", { role: "alert" }, `There is no letter "${letterId}" to scan for.`), el("a", { class: "btn", href: "#/learn" }, "All lessons")); return; }
    const t = taughtThrough(intro.id);
    const upto = lessons.filter((l) => l.track === "read");
    const words = upto.slice(0, upto.indexOf(intro) + 1).flatMap((l) => l.words.map((w) => w.he))
      .concat(decodableWords(loanwordGroups.flatMap((g) => g.words), intro.id).map((w) => w.he));
    const model = buildSpotIt({ targetId: letterId, words, taught: t.letters, confusables: c.confusables, seed });
    if (!model) { replaceKeepingFocus(wrap, h1, el("p", {}, `There are not yet enough words with ${L.name} to scan. Finish the lesson first.`), el("a", { class: "btn", href: "#/learn?lesson=" + intro.id }, "Back to the lesson")); return; }
    const tapped = new Set();
    const result = el("div", { class: "alef-spot-result", role: "status", "aria-live": "polite" });
    const btns = model.cells.map((cell, i) => el("button", { type: "button", class: "alef-spot-cell", "aria-pressed": "false", "data-i": String(i),
      onclick: (e) => { if (checked) return; const on = !tapped.has(i); on ? tapped.add(i) : tapped.delete(i); e.currentTarget.setAttribute("aria-pressed", String(on)); } }, heText(cell.text, "alef-he alef-big")));
    let checked = false;
    const lineEls = model.lines.map((ln, li) => el("div", { class: "alef-spot-line", dir: "rtl", lang: "he", role: "group", "aria-label": `Line ${li + 1}` },
      ...ln.words.flatMap((w, wi) => [...w.map((i) => btns[i]), wi < ln.words.length - 1 ? el("span", { class: "alef-spot-gap", "aria-hidden": "true" }, "  ") : null])));
    const check = el("button", { type: "button", class: "btn", onclick: async () => {
      if (checked) return; checked = true; check.disabled = true;
      const s = scoreSpotIt(model, tapped);
      model.cells.forEach((cell, i) => { const b = btns[i]; b.disabled = true;
        if (cell.kind === "hit") b.className += tapped.has(i) ? " alef-spot-hit" : " alef-spot-missed";
        else if (tapped.has(i)) b.className += " alef-spot-wrong"; });
      const fooled = Object.entries(s.fooledBy).map(([b, n]) => `${c.letters.get(b)?.name || b} (${n})`);
      result.replaceChildren(...[
        el("p", {}, `Found ${s.hits} of ${s.total} ${L.name}.` + (s.otherTaps.length ? ` ${s.otherTaps.length} other tap${s.otherTaps.length === 1 ? "" : "s"} were not a look-alike or the target.` : "")),
        fooled.length ? el("p", {}, `A look-alike fooled you: ${fooled.join(", ")}.`) : null,
        s.missed.length ? el("p", { class: "muted" }, `${s.missed.length} missed (outlined).`) : null].filter(Boolean));
      await saveSpotIt(ctx, model, s);
      if (!alive) return;
      if (fooled.length) {
        const set = (c.confusables.sets || []).find((x) => x.letters.includes(letterId) && Object.keys(s.fooledBy).some((b) => x.letters.includes(b)));
        const panel = await hintPanel(ctx, { kind: "confusable-pair", detail: set?.hint || "" }, () => panel?.remove());
        if (panel && alive) result.append(panel);
      }
      result.append(el("div", { class: "row" }, el("button", { type: "button", class: "btn", onclick: () => { seed++; round(); } }, "Try new lines"),
        el("a", { class: "btn secondary", href: "#/learn?lesson=" + intro.id }, "Back to the lesson")));
    } }, "Check");
    replaceKeepingFocus(wrap, h1,
      el("p", { class: "draft-flag", role: "note" }, "Draft content: word pointing was written by an AI agent and not reviewed by a native speaker."),
      el("div", { class: "alef-spot-target", dir: "rtl" }, el("span", { class: "muted" }, "Tap every "), heText(L.he, "alef-he alef-huge"), el("span", { class: "muted" }, ` (${L.name})`)),
      el("p", { class: "muted" }, "Read each line right to left. Some letters look similar on purpose. Tap again to undo."),
      ...lineEls, check, result);
  }
  round().catch((e) => { wrap.replaceChildren(h1, el("p", { role: "alert" }, "Could not start: " + (e?.message || e))); });
  return () => { alive = false; wrap.remove(); };
}
