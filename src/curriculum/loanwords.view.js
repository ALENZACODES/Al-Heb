/** "Words you can already read": try to decode the word first, then reveal the sound and meaning. #/learn?loanwords=<groupId|1> */
import { el, heText, tr, replaceKeepingFocus } from "./dom.js";
import { loanwordGroups, loanwordMeta, groupUnlocked } from "./loanwords.js";
import { byId } from "./lessons.js";
import { loadState, markLoanword, LOANWORDS_KEY } from "./actions.js";
import { storeGet } from "./dom.js";

export function mountLoanwords(root, ctx, groupId) {
  let alive = true;
  const wrap = el("section", { class: "alef-loanwords", "aria-labelledby": "view-title" });
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, tr(ctx, "loan.title", "Words you can already read"));
  root.append(wrap);
  (async () => {
    const st = await loadState(ctx);
    const known = await storeGet(ctx, LOANWORDS_KEY, {});
    if (!alive) return;
    const done = new Set(Object.keys(st.completed));
    const flag = el("p", { class: "draft-flag", role: "note" }, "Draft content: these words, their pointing and spellings are drafts and have not been checked by a native speaker or a dictionary.");
    const g = loanwordGroups.find((x) => x.id === groupId);
    if (!g) {
      replaceKeepingFocus(wrap, h1, flag, el("p", {}, "These are everyday words from other languages that Israelis use too. Once you know the letters, you can read them. Try to say each one before you look at the answer."),
        el("ul", { class: "alef-items" }, ...loanwordGroups.map((x) => {
          const open = groupUnlocked(x, done);
          return el("li", { class: "alef-item" }, el("div", { class: "alef-item-body" }, el("strong", {}, x.title), " ",
            el("span", { class: "muted" }, open ? `${x.words.length} ${x.words.length === 1 ? "word" : "words"}` : `Locked until you finish ${byId[x.unlockAfter]?.title || x.unlockAfter}`)),
            el("a", { class: "btn", href: `#/learn?loanwords=${x.id}`, "aria-disabled": open ? null : "true" }, open ? "Start" : "Take a Look"));
        })), el("a", { class: "btn secondary", href: "#/learn" }, "All lessons"));
      return;
    }
    const locked = !groupUnlocked(g, done);
    const items = g.words.map((w) => {
      const answer = el("div", { class: "alef-answer", hidden: "", role: "status" },
        el("strong", {}, w.gloss), el("p", { class: "muted" }, `Sounds like: ${w.translit}`));
      const verdict = el("span", { class: "muted", role: "status" });
      const mark = (knew) => async () => { await markLoanword(ctx, w.id, knew); verdict.textContent = knew ? "Marked: I knew this." : "Marked: not yet."; };
      const reveal = el("button", { type: "button", class: "btn", onclick: () => { answer.hidden = false; reveal.hidden = true; actions.hidden = false; } }, "Show the meaning");
      const actions = el("div", { class: "row", hidden: "" },
        el("button", { type: "button", class: "btn secondary", onclick: mark(true) }, "I knew this"),
        el("button", { type: "button", class: "btn secondary", onclick: mark(false) }, "Not yet"), verdict);
      return el("li", { class: "card alef-loan" }, heText(w.he, "alef-he alef-word-big"),
        known[w.id] ? el("span", { class: "muted" }, known[w.id].knew ? " (you marked: knew it)" : " (you marked: not yet)") : null,
        reveal, answer, actions);
    });
    replaceKeepingFocus(wrap, h1, flag,
      el("p", { class: "muted" }, g.title + ". " + (locked ? `Some letters here come after ${byId[g.unlockAfter]?.title || g.unlockAfter}.` : "Every letter here is one you have met.")),
      el("p", {}, "Read right to left and say the word out loud. Then check."),
      el("ul", { class: "alef-items" }, ...items),
      el("p", { class: "muted" }, loanwordMeta.note.split(". ").slice(0, 1).join(". ") + "."),
      el("div", { class: "row" }, el("a", { class: "btn secondary", href: "#/learn?loanwords=1" }, "All word groups"), el("a", { class: "btn secondary", href: "#/learn" }, "All lessons")));
  })().catch((e) => { wrap.replaceChildren(h1, el("p", { role: "alert" }, "Could not load this page. Check your connection, then try again.")); });
  return () => { alive = false; wrap.remove(); };
}
