import { el } from "./dom.js";
import { hintFor } from "./hints.js";
import { hintSession, suppressHint } from "./actions.js";

/**
 * Hint panel for one miss, or null when nothing should be shown (correct answer, dismissed kind, or already shown enough).
 * Never call this for a correct answer; `correct` is accepted anyway and returns null.
 */
export async function hintPanel(ctx, { kind, detail = "", correct = false }, onClose) {
  const session = await hintSession(ctx);
  const h = hintFor(session, { kind, detail, correct });
  if (!h) return null;
  return el("div", { class: "card alef-hint-panel", role: "note", "data-hint-kind": h.kind },
    el("p", {}, el("strong", {}, h.level === 2 ? "Worked example: " : "Tip: "), h.text),
    h.detail ? el("p", { class: "muted" }, h.detail) : null,
    el("div", { class: "row" },
      el("button", { type: "button", class: "btn secondary", onclick: async () => { await suppressHint(ctx, h.kind); onClose?.(); } }, "Got it, don't show this again"),
      el("button", { type: "button", class: "btn", onclick: () => onClose?.() }, "Continue")));
}
