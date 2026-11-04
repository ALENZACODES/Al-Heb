/** Dialogues: list (#/learn?dialogues=1) and one dialogue (#/learn?dialogue=<id>) with show/hide transliteration and English. */
import { el, heText, replaceKeepingFocus } from "./dom.js";
import { dialogues, dialogueById } from "./dialogues.js";
import { byId } from "./lessons.js";
import { loadState } from "./actions.js";

const FLAG = "Draft content: these dialogues have not been reviewed by a native speaker. There is no audio for them yet.";

export function mountDialogues(root, ctx, id) {
  let alive = true;
  const wrap = el("section", { class: "alef-dialogues", "aria-labelledby": "view-title" });
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, id && dialogueById[id] ? dialogueById[id].title : "Dialogues");
  root.append(wrap);
  (async () => {
    const st = await loadState(ctx);
    if (!alive) return;
    const done = new Set(Object.keys(st.completed));
    const flag = el("p", { class: "draft-flag", role: "note" }, FLAG);
    const d = id && dialogueById[id];
    if (id && !d) { replaceKeepingFocus(wrap, h1, el("p", { role: "alert" }, `There is no dialogue "${id}".`), el("a", { class: "btn", href: "#/learn?dialogues=1" }, "All dialogues")); return; }
    if (!d) {
      replaceKeepingFocus(wrap, h1, flag, el("ul", { class: "alef-items" }, ...dialogues.map((x) => {
        const open = done.has(x.unlockAfter);
        return el("li", { class: "alef-item" }, el("div", { class: "alef-item-body" }, el("strong", {}, x.title), " ",
          el("span", { class: "muted" }, `${x.level} · ${x.topic}` + (open ? "" : ` · after "${byId[x.unlockAfter]?.title || x.unlockAfter}"`))),
          el("a", { class: "btn", href: `#/learn?dialogue=${x.id}` }, open ? "Open" : "Preview"));
      })), el("a", { class: "btn secondary", href: "#/learn" }, "All lessons"));
      return;
    }
    const name = Object.fromEntries(d.speakers.map((s) => [s.id, s.name]));
    let showTr = true, showEn = true;
    const list = el("ol", { class: "alef-dialogue-lines" });
    const draw = () => list.replaceChildren(...d.lines.map((l) => el("li", { class: "alef-dline", "data-speaker": l.speaker },
      el("span", { class: "muted alef-speaker" }, name[l.speaker] + ": "),
      heText(l.he, "alef-he alef-word"),
      showTr ? el("div", { class: "alef-translit" }, l.translit) : null,
      showEn ? el("div", { class: "muted" }, l.en) : null)));
    const toggle = (label, get, set) => { const b = el("button", { type: "button", class: "btn secondary", "aria-pressed": String(get()),
      onclick: () => { set(!get()); b.setAttribute("aria-pressed", String(get())); draw(); } }, label); return b; };
    draw();
    replaceKeepingFocus(wrap, h1, flag, el("p", { class: "muted" }, `${d.level} · ${d.setting}`),
      el("div", { class: "row" }, toggle("Transliteration", () => showTr, (v) => { showTr = v; }), toggle("English", () => showEn, (v) => { showEn = v; })),
      list, el("p", { class: "muted" }, "Tip: cover the English, read the Hebrew aloud, then check."),
      el("div", { class: "row" }, el("a", { class: "btn secondary", href: "#/learn?dialogues=1" }, "All dialogues"), el("a", { class: "btn secondary", href: "#/learn" }, "All lessons")));
  })().catch((e) => { wrap.replaceChildren(h1, el("p", { role: "alert" }, "Could not load: " + (e?.message || e))); });
  return () => { alive = false; wrap.remove(); };
}
