/** Per-word transliteration fading (gr-fsi-01). #/learn?scaffold=1. Reads your existing word cards; the Latin help fades as each word's SRS strength grows. */
import { el, heText, tr, replaceKeepingFocus, storeGet } from "./dom.js";
import { byId } from "./lessons.js";
import { parseCardId } from "./progress.js";
import { loadState, rateCard, setScaffoldPin } from "./actions.js";
import { SCAFFOLD_KEY, effectiveLevel, LEVEL_NAMES, startLevel } from "./scaffold.js";
import { transliterate } from "../pronunciation/transliterate.js";
import { draftNotice, onKeys } from "./ex-ui.js";
import { due } from "./srs.js";
import { playButton } from "./audio-ui.js";
import { wordAudioId } from "./progress.js";

const RATINGS = [[1, "Again"], [2, "Hard"], [3, "Good"], [4, "Easy"]];

export function mountScaffold(root, ctx) {
  let alive = true, offKeys = () => {};
  const wrap = el("section", { class: "alef-scaffold", "aria-labelledby": "view-title" });
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, tr(ctx, "scaffold.title", "Reading without the training wheels"));
  root.append(wrap);
  const tradition = ctx?.settings?.get?.("congregation") || "israeli";
  const start = ctx?.settings?.get?.("scaffoldStart") === "faint" ? "faint" : "full";

  (async () => {
    const st = await loadState(ctx);
    if (!alive) return;
    const head = draftNotice(ctx, "The Latin letters are produced by the app's own transliteration code from the pointed word. They are not checked by a native speaker, and the fading thresholds are hand-chosen, not fitted to learner data.");
    const words = Object.values(st.cards).filter((c) => parseCardId(c.id)?.kind === "word" && byId[parseCardId(c.id).lessonId]?.words[parseCardId(c.id).n - 1]);
    if (!words.length) {
      replaceKeepingFocus(wrap, h1, head, el("p", {}, "You have no word cards yet. Complete a lesson to add some, then come back."), el("a", { class: "btn", href: "#/learn" }, "All lessons"));
      return;
    }
    const dueNow = due(words, Date.now());
    let queue = (dueNow.length ? dueNow : words.slice().sort((a, b) => a.due - b.due)).slice(0, 10).map((c) => c.id);
    let pos = 0, tapShown = false, revealed = false, onKey = null;
    const wordOf = (id) => { const p = parseCardId(id); return { p, w: byId[p.lessonId].words[p.n - 1] }; };

    async function draw() {
      if (!alive) return;
      if (pos >= queue.length) {
        replaceKeepingFocus(wrap, h1, head, el("h2", {}, "Session done"), el("p", {}, `${queue.length} word${queue.length === 1 ? "" : "s"} practised. Words you knew well now show less Latin next time.`),
          el("div", { class: "row" }, el("a", { class: "btn", href: "#/learn?scaffold=1" }, "Again"), el("a", { class: "btn secondary", href: "#/learn?review=1" }, "Review now"), el("a", { class: "btn secondary", href: "#/learn" }, "All lessons")));
        return;
      }
      const id = queue[pos], { p, w } = wordOf(id);
      const map = (await storeGet(ctx, SCAFFOLD_KEY, {})) || {};
      if (!alive) return;
      const entry = map[id], level = effectiveLevel(entry, start);
      const latin = transliterate(w.he, { scheme: "siddur", tradition });
      tapShown = false; revealed = false;
      const latinBox = el("p", { class: "alef-latin alef-latin-" + level, "aria-live": "polite" });
      const tapBtn = el("button", { type: "button", class: "btn secondary alef-tap", onclick: () => { tapShown = true; paint(); } }, "Show the Latin letters");
      function paint() {
        latinBox.className = "alef-latin alef-latin-" + level + (level === 1 ? " alef-translit-faint" : "");
        if (level === 0 || level === 1 || (level === 2 && tapShown)) latinBox.replaceChildren(latin);
        else latinBox.replaceChildren();
        tapBtn.hidden = level !== 2 || tapShown;
      }
      const answer = el("div", { class: "alef-answer", hidden: "" });
      const ratings = el("div", { class: "alef-ratings", role: "group", "aria-label": "How well did you read it?", hidden: "" }, ...RATINGS.map(([n, label]) =>
        el("button", { type: "button", class: "btn alef-rate", "data-rating": String(n), onclick: () => rate(n) }, `${n} ${label}`)));
      const show = el("button", { type: "button", class: "btn", onclick: () => { revealed = true; answer.replaceChildren(el("strong", {}, w.en), el("p", {}, latin), playButton(ctx, "word", wordAudioId(p.lessonId, p.n), "Listen", el("span", {}))); answer.hidden = false; ratings.hidden = false; show.hidden = true; } }, "Show meaning");
      const pinned = !!entry?.pinned;
      const pin = el("button", { type: "button", class: "btn secondary alef-pin", "aria-pressed": String(pinned), onclick: async () => { await setScaffoldPin(ctx, id, !pinned); draw(); } }, pinned ? "Unpin (let it fade)" : "Pin the Latin letters on");
      async function rate(n) {
        if (!revealed) return; revealed = false;
        try { await rateCard(ctx, id, n); } catch { /* shown by session summary */ }
        pos++; draw();
      }
      onKey = (e) => { if (revealed && /^[1-4]$/.test(e.key)) { e.preventDefault(); rate(Number(e.key)); } };
      paint();
      replaceKeepingFocus(wrap, h1, head,
        el("p", { class: "muted", role: "status" }, `Word ${pos + 1} of ${queue.length}. Latin help: ${LEVEL_NAMES[level]}${pinned ? " (pinned)" : ""} (stored level ${entry?.level ?? startLevel(start)} of 3).`),
        el("div", { class: "card alef-card" }, el("p", { class: "muted" }, "Read this word aloud."), heText(w.he, "alef-he alef-word-big"), latinBox, tapBtn, show, answer, ratings, pin),
        el("p", { class: "muted alef-keys" }, "Keyboard: after showing the meaning, press 1 Again, 2 Hard, 3 Good, 4 Easy."));
      if (!alive) return;
    }
    offKeys = onKeys((e) => onKeyProxy(e));
    function onKeyProxy(e) { onKey?.(e); }
    draw();
  })().catch((e) => { wrap.replaceChildren(h1, el("p", { role: "alert" }, "Could not start: " + (e?.message || e))); });
  return () => { alive = false; offKeys(); wrap.remove(); };
}
