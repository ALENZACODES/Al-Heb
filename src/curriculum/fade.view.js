/** Fade-out recall (gr-gv-01). #/learn?fade=1 (choose a line) or #/learn?fade=<corpus id | phrasebook id>[&level=n][&seed=n]. */
import { el, heText, tr, replaceKeepingFocus } from "./dom.js";
import { loadContent } from "./content.js";
import { loadJSON } from "./data.js";
import { loadState, saveFade } from "./actions.js";
import { lineCardId } from "./progress.js";
import { fade, FADE_LEVELS, MAX_FADE, gapOptions, eligibleLines, restore } from "./fade.js";
import { draftNotice, onKeys } from "./ex-ui.js";
import { playButton } from "./audio-ui.js";
import { SCENE, picture } from "../img/scenes.js";

export function mountFade(root, ctx, which = "1", q = {}) {
  let alive = true, offKeys = () => {};
  const wrap = el("section", { class: "alef-fade", "aria-labelledby": "view-title" });
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, tr(ctx, "fade.title", "Fade-out recall"));
  root.append(wrap);

  (async () => {
    const [c, st, book] = await Promise.all([loadContent(), loadState(ctx), loadJSON("data/corpus/phrasebook.json")]);
    if (!alive) return;
    const lines = eligibleLines([...c.corpus.values()]);
    const sources = new Map([...lines.map((e) => [e.id, { ...e, audioKind: "line", origin: "corpus" }]),
      ...book.entries.filter((e) => e.pointed && !/\n/.test(e.he) && e.he.split(/\s+/).length <= 8).map((e) => [e.id, { id: e.id, he: e.he, title: e.en, english: e.en, audioKind: "word", origin: "phrasebook", status: "unreviewed", proofread: false }])]);
    const corpusNote = "Prayer text comes from the corpus registry, where it was compared with its cited source by a machine; it is not proofread by a Hebrew teacher, so a mistake is possible. Phrasebook lines are original drafts that still need a native speaker.";
    const head = [picture(el, ctx, "id", SCENE.niqqudFade, { width: 720, class: "scene-art" }), picture(el, ctx, "id", SCENE.niqqudFadeStill, { width: 720, class: "scene-art" }), picture(el, ctx, "id", SCENE.niqqudFadeStill03, { width: 720, class: "scene-art" }), picture(el, ctx, "id", SCENE.niqqudFadeStill04, { width: 720, class: "scene-art" }), draftNotice(ctx, corpusNote)];

    if (which === "1" || !sources.has(which)) {
      const missing = which !== "1" ? el("p", { role: "alert" }, `There is no practice line "${which}".`) : null;
      const prayer = [...sources.values()].filter((s) => s.origin === "corpus");
      const phrases = [...sources.values()].filter((s) => s.origin === "phrasebook").slice(0, 12);
      const row = (s) => { const card = st.cards[lineCardId(s.id)]; return el("li", { "data-line": s.id }, el("a", { href: `#/learn?fade=${s.id}` }, s.title || s.id), " ", heText(s.he), el("span", { class: "muted" }, card ? ` (fade level ${card.fadeLevel ?? 0} of ${MAX_FADE})` : " (new)")); };
      replaceKeepingFocus(wrap, h1, ...head, missing, el("p", {}, "Choose a line. Your level for each line moves one step when you recall it correctly at that level, and one step back when you miss."),
        el("h2", {}, "Prayer lines"), el("ul", { class: "alef-linelist" }, ...prayer.map(row)),
        el("h2", {}, "Israeli phrases (drafts)"), el("ul", { class: "alef-linelist" }, ...phrases.map(row)));
      return;
    }

    const src = sources.get(which), cardId = lineCardId(which);
    const stored = st.cards[cardId]?.fadeLevel ?? 0;
    let played = Math.max(0, Math.min(MAX_FADE, q.level !== undefined ? Number(q.level) : stored)), seed = Number(q.seed) || 1;
    let state = null;

    function stage() {
      if (!alive) return;
      const f = fade(src.he, played);
      state = { f, errors: 0, filled: new Set(), openGap: null, done: false, revealed: false };
      draw();
    }
    const slider = () => el("div", { class: "alef-fade-slider" },
      el("label", { for: "alef-fade-range" }, "Fade stage: "),
      el("input", { id: "alef-fade-range", type: "range", min: "0", max: String(MAX_FADE), step: "1", value: String(played),
        "aria-valuetext": FADE_LEVELS[played].name, onchange: (e) => { played = Number(e.target?.value ?? played); stage(); } }),
      el("span", { role: "status" }, ` ${FADE_LEVELS[played].name}: ${FADE_LEVELS[played].help} Your saved level for this line: ${stored} (${FADE_LEVELS[stored].name}).`),
      el("span", { class: "row" }, ...FADE_LEVELS.map((l) => el("button", { type: "button", class: "btn secondary alef-stop", "aria-pressed": String(l.level === played), onclick: () => { played = l.level; stage(); } }, `${l.level}: ${l.name}`))));

    async function complete(correct) {
      if (state.done) return; state.done = true;
      const r = await saveFade(ctx, which, played, correct);
      if (!alive) return;
      const moved = played === stored;
      const msg = correct
        ? (moved ? `Recalled. Next review of this line is one stage more faded (level ${r.level} of ${MAX_FADE}).` : "Recalled. You practised a different stage than your saved one, so the saved level did not change.")
        : (moved ? `Not this time. The line goes back one stage (level ${r.level}) and returns in your review queue.` : "Not this time. Your saved level stays; the line returns in your review queue.");
      state.result = el("div", { class: "alef-fade-result", role: "status", "aria-live": "polite" }, el("p", {}, msg), heText(restore(state.f), "alef-he alef-word-big"),
        src.english ? el("p", { class: "muted" }, src.english) : null, playButton(ctx, src.audioKind, which, "Listen to the line", el("span", {})),
        el("div", { class: "row" }, el("a", { class: "btn", href: `#/learn?fade=${which}` }, "Again"), el("a", { class: "btn secondary", href: "#/learn?fade=1" }, "Other lines"), el("a", { class: "btn secondary", href: "#/learn?review=1" }, "Review now")));
      draw();
    }

    function lineNode() {
      const { f } = state;
      if (played === 3) return el("div", { class: "alef-fade-blank card", dir: "rtl", lang: "he" }, state.revealed ? heText(restore(f), "alef-he alef-word-big") : el("span", { class: "muted", dir: "ltr", lang: "en" }, "Blank. Say the line aloud (or write it) from memory, then reveal it."));
      let gi = 0;
      return el("div", { class: "alef-fade-line card", dir: "rtl", lang: "he" }, ...f.tokens.map((t) => {
        if (t.type === "sep") return t.text.trim() ? heText(t.text) : " ";
        return el("span", { class: "alef-fade-word alef-he", dir: "rtl", lang: "he" }, ...t.clusters.map((cl) => {
          if (!cl.hidden) return cl.text;
          const n = gi++;
          if (state.filled.has(n)) return el("span", { class: "alef-gap alef-correct" }, cl.text);
          return el("button", { type: "button", class: "alef-gap" + (state.openGap === n ? " alef-gap-open" : ""), "data-gap": String(n), "aria-pressed": String(state.openGap === n),
            "aria-label": `Gap ${n + 1} of ${f.gaps.length}`, onclick: () => { state.openGap = n; draw(true); } }, "_");
        }));
      }));
    }
    function optionsNode() {
      if (state.openGap == null || state.done) return null;
      const gap = state.f.gaps[state.openGap];
      const opts = gapOptions(gap, state.f, c.confusables, { seed: seed + state.openGap, count: 4 });
      const nodes = opts.map((o, i) => el("button", { type: "button", class: "btn secondary alef-opt", "data-option": o,
        onclick: () => {
          if (o.normalize("NFC") === gap.text.normalize("NFC")) {
            state.filled.add(state.openGap); state.openGap = null;
            if (state.filled.size === state.f.gaps.length) { complete(state.errors === 0); return; }
            draw();
          } else { state.errors++; nodes[i].disabled = true; nodes[i].className += " alef-wrong"; }
        } }, el("span", { class: "alef-key" }, String(i + 1)), " ", heText(o, "alef-he alef-big")));
      state.optionNodes = nodes;
      return el("div", { class: "alef-gap-options", role: "group", "aria-label": `Choose the letters for gap ${state.openGap + 1}` }, ...nodes);
    }
    function draw(focusOpts) {
      if (!alive) return;
      const { f } = state;
      const self = played === 0 || played === 3;
      const grade = self && !state.done && (played === 0 || state.revealed)
        ? el("div", { class: "row" }, el("button", { type: "button", class: "btn", onclick: () => complete(true) }, played === 0 ? "I can read it smoothly" : "I got it all"),
            el("button", { type: "button", class: "btn secondary", onclick: () => complete(false) }, played === 0 ? "Not yet" : "I missed some"),
            el("span", { class: "muted" }, "Self-graded: the app cannot hear you.")) : null;
      replaceKeepingFocus(wrap, h1, ...head,
        el("p", {}, el("strong", {}, src.title || which), src.ref ? ` (${src.ref})` : ""), slider(),
        src.english ? el("p", { class: "muted", lang: "en" }, src.english) : null,
        lineNode(),
        played === 3 && !state.revealed && !state.done ? el("button", { type: "button", class: "btn", onclick: () => { state.revealed = true; draw(); } }, "Reveal the line") : null,
        grade, optionsNode(),
        played === 1 || played === 2 ? el("p", { class: "muted", role: "status" }, `${state.filled.size} of ${f.gaps.length} gaps filled, ${state.errors} wrong pick${state.errors === 1 ? "" : "s"}.`) : null,
        state.result || null,
        el("p", { class: "muted alef-keys" }, "Keyboard: Tab to a gap and press Enter, then 1 to 4 picks a choice."));
      if (focusOpts) state.optionNodes?.[0]?.focus?.({ preventScroll: true });
    }
    offKeys = onKeys((e) => { if (state && !state.done && state.openGap != null && /^[1-4]$/.test(e.key)) { const b = state.optionNodes?.[Number(e.key) - 1]; if (b && !b.disabled) { e.preventDefault(); b.click(); } } });
    stage();
  })().catch((e) => { wrap.replaceChildren(h1, el("p", { role: "alert" }, "Could not start this practice. Reload the page, then try again.")); });
  return () => { alive = false; offKeys(); wrap.remove(); };
}
