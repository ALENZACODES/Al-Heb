// @ts-check
// Hebrew typing practice (#/typing). mount(root, ctx) => unmount.
// Drills: single letters, final forms, common words (first 200 of the word order), prayer lines (unpointed). Input is a real text field in Hebrew
// (lang="he" dir="rtl"), so it works with the device's own Hebrew keyboard, with the on-screen keyboard below, or - if the learner turns it on -
// with the Israeli key positions on an English keyboard. Store key: typing.v1. Guide: src/typing/guide.js.
// Tests inject ctx.typingData, ctx.keyboard, ctx.rng, ctx.clock {now}.
import { el, storeGet, storeSet } from "../curriculum/dom.js";
import { loadJSON } from "../curriculum/data.js";
import { uiEnglish } from "../shell/names.js";
import { TYPING_KEY, DRILLS, normalizeState, recordRound, buildRound, checkAnswer, summarise, fmtClock, physicalMap, mapKeyEvent, screenRows, hasLatin, letterName } from "./typing.js";
import { PLATFORMS, GENERAL, DOTTED_CIRCLE, niqqudRows } from "./guide.js";

// On-screen key target: at least 44x44 CSS px. Wide screens (>= 32rem) keep the three physical rows (8, 10, 9 keys);
// narrower screens flow all 27 keys into a wrapping grid (7 per line at 375 px) because 10 keys of 44 px do not fit in 343 px.
export const KEY_MIN = 44;
export const CSS = `
.alef-typing{max-inline-size:40rem;margin-inline:auto;overflow-wrap:anywhere}
.alef-typing *{box-sizing:border-box;max-inline-size:100%}
.alef-typing .ty-card{border:1px solid var(--border,#999);border-radius:12px;padding:1rem;background:var(--card,#fff);margin-block:1rem}
.alef-typing .btn .muted{color:inherit}
.alef-typing .ty-grid{display:grid;gap:.5rem;margin-block:.75rem}
.alef-typing button.btn{min-block-size:var(--tap,48px);inline-size:100%;white-space:normal;text-align:center}
.alef-typing .ty-prompt{font-size:2.6rem;line-height:1.4;text-align:center;margin-block:.5rem}
.alef-typing input[type=text]{inline-size:100%;min-block-size:var(--tap,48px);font:inherit;font-size:1.6rem;padding:.4rem .6rem;border:2px solid var(--border,#999);border-radius:8px;background:var(--card,#fff);color:inherit}
.alef-typing .ty-kb{display:grid;gap:.3rem;direction:ltr;margin-block:.75rem}
.alef-typing .ty-kr{display:flex;gap:.3rem;justify-content:center}
.alef-typing .ty-key{flex:1 1 0;min-inline-size:44px;min-block-size:max(44px,var(--tap,48px));font:inherit;font-size:1.3rem;border:2px solid var(--border,#999);border-radius:8px;background:var(--card,#fff);color:inherit;padding:.1rem;display:grid;place-items:center;line-height:1.1}
.alef-typing .ty-key small{font-size:.6rem;color:var(--muted,#555)}
.alef-typing .ty-wide{flex:3 1 0}
.alef-typing .ty-check{display:flex;align-items:center;gap:.5rem;min-block-size:44px}
.alef-typing .ty-check input{inline-size:1.5rem;block-size:1.5rem;flex:none;margin:0}
@media (max-width:32rem){
.alef-typing .ty-kb{grid-template-columns:repeat(auto-fill,minmax(44px,1fr))}
.alef-typing .ty-kb>.ty-kr:not(:last-child){display:contents}
.alef-typing .ty-kb>.ty-kr:not(:last-child) .ty-key{min-inline-size:0}
.alef-typing .ty-kb>.ty-kr:last-child{grid-column:1/-1}
}
`;
function injectStyle() {
  try { if (!document.head || document.getElementById?.("alef-typing-style")) return; const s = document.createElement("style"); s.id = "alef-typing-style"; s.textContent = CSS; document.head.append(s); } catch { /* optional */ }
}
const he = (text, extra = {}) => el("span", { lang: "he", dir: "rtl", ...extra }, text);
const sr = (text) => el("span", { class: "visually-hidden" }, text);
/** Nearest key on the next/previous visual line (keys wrap on narrow screens). Null when layout is unavailable (no geometry), so callers fall back to row/column. */
function visualNeighbour(all, from, down) {
  try {
    const box = (b) => b.getBoundingClientRect(); const f = box(from); if (!f || !(f.width > 0)) return null;
    const cy = f.top + f.height / 2, cx = f.left + f.width / 2;
    const cand = all.filter((b) => { const r = box(b); return down ? r.top > cy + 1 && r.top + r.height / 2 > f.bottom - 1 : r.bottom < cy - 1 && r.top + r.height / 2 < f.top + 1; });
    if (!cand.length) return null;
    const line = (b) => Math.abs(box(b).top + box(b).height / 2 - cy), nearest = Math.min(...cand.map(line));
    const row = cand.filter((b) => line(b) - nearest < 4);
    return row.reduce((a, b) => (Math.abs(box(b).left + box(b).width / 2 - cx) < Math.abs(box(a).left + box(a).width / 2 - cx) ? b : a));
  } catch { return null; }
}
const focusNode = (n, opt) => { try { n?.focus?.(opt); } catch { /* ignore */ } };

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  injectStyle();
  const clock = ctx?.clock || { now: () => Date.now() };
  const rng = ctx?.rng || Math.random;
  const wrap = el("section", { class: "alef-typing", "aria-labelledby": "view-title" });
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, "Hebrew typing practice");
  const body = el("div", { class: "ty-body" });
  const status = el("p", { role: "status", "aria-live": "polite", id: "ty-status" });
  wrap.append(h1, body, status);
  root.append(wrap);

  let alive = true, data = null, layout = null, state = normalizeState(null), map = {};
  /** @type {null|{drill:string, items:any[], i:number, results:any[], answered:boolean, t0:number|null}} */
  let round = null, inputEl = null;
  const say = (t) => { status.textContent = t; };

  async function persist() { await storeSet(ctx, TYPING_KEY, state); }

  function insertText(ch) {
    if (!inputEl) return;
    const v = String(inputEl.value ?? ""), a = inputEl.selectionStart ?? v.length, b = inputEl.selectionEnd ?? v.length;
    inputEl.value = v.slice(0, a) + ch + v.slice(b);
    try { inputEl.setSelectionRange?.(a + ch.length, a + ch.length); } catch { /* ignore */ }
  }

  // ---------------- choose screen ----------------
  function renderChoose() {
    round = null; inputEl = null;
    const t = state.totals;
    const all = DRILLS.reduce((s, d) => ({ items: s.items + t[d.id].items, correct: s.correct + t[d.id].correct, rounds: s.rounds + t[d.id].rounds }), { items: 0, correct: 0, rounds: 0 });
    const mapBox = el("input", { type: "checkbox", id: "ty-map", checked: state.mapKeys ? true : null, onchange: async (e) => { state = { ...state, mapKeys: !!e.target.checked }; await persist(); say(state.mapKeys ? "Israeli key positions on: with an English keyboard, the keys type Hebrew letters in the typing box." : "Israeli key positions off."); } });
    body.replaceChildren(
      
      el("p", {}, "Practise typing Hebrew letters. Use your device's Hebrew keyboard, the on-screen keys, or the Israeli key positions on an English keyboard."),
      el("div", { class: "ty-grid", role: "group", "aria-label": "Choose a drill" }, DRILLS.map((d) => el("button", { type: "button", class: "btn", id: `ty-drill-${d.id}`, "data-drill": d.id, onclick: () => start(d.id) }, el("strong", {}, d.label), el("br"), el("span", { class: "muted" }, d.about)))),
      el("label", { class: "ty-check", for: "ty-map" }, mapBox, " Type Hebrew with the Israeli key positions on my English keyboard"),
      el("p", { class: "muted", id: "ty-map-note" }, "Only for keyboards set to English. On an Israeli keyboard, or with the Hebrew keyboard switched on, leave it off. The key positions are the ones shown on the on-screen keyboard."),
      el("div", { class: "ty-card", id: "ty-totals" }, el("h2", {}, "Your practice on this device"),
        all.rounds ? el("p", {}, `${all.rounds} round${all.rounds === 1 ? "" : "s"}, ${all.correct} of ${all.items} answers right (${Math.round((all.correct / Math.max(1, all.items)) * 100)}%).`) : el("p", {}, "No rounds yet."),
        el("ul", {}, DRILLS.filter((d) => t[d.id].rounds).map((d) => el("li", {}, `${d.label}: ${t[d.id].rounds} round${t[d.id].rounds === 1 ? "" : "s"}, ${t[d.id].correct} of ${t[d.id].items} right${t[d.id].ms >= 3000 ? `, about ${Math.round((t[d.id].chars / (t[d.id].ms / 60000)) * 10) / 10} characters a minute on right answers` : ""}`))),
        el("p", { class: "muted" }, "These are counts from your own practice only. Speed is the time from your first key press to Check on answers you got right. It is not a typing test and says nothing about how fluent you are.")),
      guideCard());
    say(""); 
  }

  function guideCard() {
    const rows = layout ? niqqudRows(layout) : [];
    const sandbox = el("input", { type: "text", id: "ty-sandbox", lang: "he", dir: "rtl", autocomplete: "off", autocapitalize: "off", spellcheck: "false", "aria-label": "Practice box for vowel marks" });
    const ins = (ch) => { const v = String(sandbox.value ?? ""), a = sandbox.selectionStart ?? v.length, b = sandbox.selectionEnd ?? v.length; sandbox.value = v.slice(0, a) + ch + v.slice(b); try { sandbox.setSelectionRange?.(a + ch.length, a + ch.length); } catch { /* ignore */ } focusNode(sandbox); };
    return el("details", { class: "ty-card", id: "ty-guide" },
      el("summary", {}, "How to type vowel marks (niqqud)"),
      el("p", { class: "ty-warn", role: "note" }, "Each device section below is from general knowledge and was not tested on a device for this app. Menu names change between versions."),
      ...PLATFORMS.map((p) => el("section", { "aria-labelledby": `ty-g-${p.id}`, "data-platform": p.id }, el("h3", { id: `ty-g-${p.id}` }, p.label), el("p", { class: "muted", "data-status": "1" }, p.status), el("ol", {}, p.steps.map((s) => el("li", {}, s))))),
      el("h3", {}, "For every device"), el("ul", {}, GENERAL.map((g) => el("li", {}, g))),
      el("h3", { id: "ty-altgr-h" }, "Israeli standard layout: vowel marks on AltGr"),
      el("p", { class: "muted" }, "Read from the layout data used by the Letters screen (SI-1452, 2013), checked against a keyboard-layout source file and a public list, not against the standard itself. Press AltGr together with the key that carries the Hebrew letter shown."),
      rows.length ? el("div", { class: "ty-scroll", role: "region", tabindex: "0", "aria-labelledby": "ty-altgr-h" }, el("table", {}, el("thead", {}, el("tr", {}, el("th", { scope: "col" }, "Mark"), el("th", { scope: "col" }, "Name"), el("th", { scope: "col" }, "AltGr + key with letter"), el("th", { scope: "col" }, "English-key position"))),
        el("tbody", {}, rows.map((r) => el("tr", {}, el("td", {}, he(DOTTED_CIRCLE + r.mark)), el("td", {}, r.name), el("td", {}, r.key ? he(r.key) : ""), el("td", {}, r.qwerty)))))) : el("p", {}, "The layout table could not be loaded."),
      el("h3", {}, "Practice box"),
      el("p", { class: "muted" }, "Tap a mark to insert it after the letter you typed. Copy from the box to use elsewhere."),
      sandbox,
      el("div", { class: "ty-kr", role: "group", "aria-label": "Vowel marks", style: "flex-wrap:wrap;margin-block:.5rem" }, rows.map((r) => el("button", { type: "button", class: "ty-key", style: "flex:0 0 3.2rem", "data-mark": r.id, onclick: () => ins(r.mark) }, he(DOTTED_CIRCLE + r.mark), sr(r.name)))));
  }

  // ---------------- play ----------------
  function start(drill) {
    const items = buildRound(drill, data, layout, { rng, misses: state.misses });
    if (!items.length) { say("There are no items for this drill."); return; }
    round = { drill, items, i: 0, results: [], answered: false, t0: null };
    state = { ...state, lastDrill: drill };
    renderItem(true);
  }

  function kbRows() {
    const rows = screenRows(layout);
    const press = (ch) => { insertText(ch); focusNode(inputEl, { preventScroll: true }); onInput(); };
    const rowEls = rows.map((r, ri) => el("div", { class: "ty-kr", role: "group", "aria-label": `Keyboard row ${ri + 1}` }, r.map((k, ci) => el("button", { type: "button", class: "ty-key", tabindex: ri === 0 && ci === 0 ? "0" : "-1", "data-key": k.char, "data-r": ri, "data-c": ci, "aria-label": `${k.char} ${letterName(k.name)}`, onclick: () => press(k.char) }, he(k.char), el("small", { "aria-hidden": "true" }, k.qwerty)))));
    const bottom = el("div", { class: "ty-kr", role: "group", "aria-label": "Space and delete" },
      el("button", { type: "button", class: "ty-key ty-wide", tabindex: "-1", "data-key": " ", "data-r": rows.length, "data-c": 0, "aria-label": "Space", onclick: () => press(" ") }, "Space"),
      el("button", { type: "button", class: "ty-key", tabindex: "-1", "data-key": "BS", "data-r": rows.length, "data-c": 1, "aria-label": "Delete last letter", onclick: () => { const v = String(inputEl.value ?? ""); inputEl.value = [...v].slice(0, -1).join(""); focusNode(inputEl, { preventScroll: true }); onInput(); } }, "Delete"));
    const kb = el("div", { class: "ty-kb", id: "ty-kb", role: "group", "aria-label": "On-screen Hebrew keyboard, Israeli key positions. One tab stop; arrow keys move between keys." }, ...rowEls, bottom);
    // roving tabindex: arrows move, the group is a single Tab stop
    kb.addEventListener("keydown", (ev) => {
      const t = ev.target; if (!t?.getAttribute || t.getAttribute("data-r") == null) return;
      const r = +t.getAttribute("data-r"), c = +t.getAttribute("data-c");
      const all = [...(kb.querySelectorAll?.("button") || [])];
      const at = (rr, cc) => all.find((b) => +b.getAttribute("data-r") === rr && +b.getAttribute("data-c") === cc);
      const rowLen = (rr) => all.filter((b) => +b.getAttribute("data-r") === rr).length;
      let n = null;
      if (ev.key === "ArrowRight") n = at(r, Math.min(rowLen(r) - 1, c + 1)); else if (ev.key === "ArrowLeft") n = at(r, Math.max(0, c - 1));
      else if (ev.key === "ArrowDown" || ev.key === "ArrowUp") n = visualNeighbour(all, t, ev.key === "ArrowDown") || (ev.key === "ArrowDown" ? at(Math.min(rows.length, r + 1), Math.min(c, rowLen(Math.min(rows.length, r + 1)) - 1)) : at(Math.max(0, r - 1), Math.min(c, rowLen(Math.max(0, r - 1)) - 1)));
      else if (ev.key === "Home") n = at(r, 0); else if (ev.key === "End") n = at(r, rowLen(r) - 1);
      if (n) { ev.preventDefault?.(); all.forEach((b) => b.setAttribute("tabindex", "-1")); n.setAttribute("tabindex", "0"); focusNode(n); }
    });
    return kb;
  }

  function renderItem(focusInput) {
    const it = round.items[round.i], single = it.drill === "letters" || it.drill === "finals";
    round.answered = false; round.t0 = null;
    inputEl = el("input", { type: "text", id: "ty-input", lang: "he", dir: "rtl", autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false", enterkeyhint: "done", "aria-describedby": "ty-gloss" });
    inputEl.addEventListener("input", (e) => { if (e?.isComposing) return; onInput(); });
    inputEl.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") { ev.preventDefault?.(); if (round.answered) next(); else check(); return; }
      if (state.mapKeys) { const ch = mapKeyEvent(map, ev); if (ch) { ev.preventDefault?.(); insertText(ch); onInput(); } }
    });
    const label = el("label", { for: "ty-input" }, it.label);
    body.replaceChildren(
      el("p", { id: "ty-progress" }, `Item ${round.i + 1} of ${round.items.length}`),
      el("div", { class: "ty-card" },
        el("div", { class: "ty-prompt", id: "ty-prompt" }, it.promptIsHebrew ? he(it.prompt) : it.prompt),
        el("p", { class: "muted", id: "ty-gloss" }, uiEnglish(ctx, it.gloss)), label, inputEl,
        el("div", { class: "ty-grid" },
          single ? null : el("button", { type: "button", class: "btn", id: "ty-check", onclick: () => (round.answered ? next() : check()) }, "Check"),
          el("button", { type: "button", class: "btn secondary", id: "ty-skip", onclick: () => skip() }, "Skip"),
          el("button", { type: "button", class: "btn secondary", id: "ty-stop", onclick: () => finish(true) }, "Stop and see the round"))),
      el("div", { id: "ty-feedback", class: "ty-card", hidden: true }),
      kbRows(),
      el("p", { class: "muted" }, "The keys follow the Israeli keyboard (SI-1452). Vowel points are not needed in these drills."));
    say(`Item ${round.i + 1} of ${round.items.length}. ${it.label}${it.drill === "letters" || it.drill === "finals" ? "" : ": " + uiEnglish(ctx, it.gloss)}`);
    if (focusInput) focusNode(inputEl);
  }

  function onInput() {
    if (!round || round.answered || !inputEl) return;
    if (round.t0 == null && String(inputEl.value ?? "") !== "") round.t0 = clock.now();
    const it = round.items[round.i];
    if ((it.drill === "letters" || it.drill === "finals") && String(inputEl.value ?? "").trim() !== "") check();
  }

  function feedback(kind, text) {
    const f = body.querySelector?.("#ty-feedback"); if (!f) return;
    f.hidden = false; f.replaceChildren(el("p", { "data-kind": kind }, text));
  }

  function check() {
    if (!round || round.answered) return;
    const it = round.items[round.i], raw = String(inputEl.value ?? "");
    const res = checkAnswer(raw, it.answer);
    if (res.empty) { say("Type your answer first."); focusNode(inputEl); return; }
    if (res.latin || hasLatin(raw)) {
      inputEl.value = "";
      say("Those are Latin letters, so your keyboard is not set to Hebrew. Add or switch to a Hebrew keyboard, tap the on-screen keys, or turn on Israeli key positions on the start screen. Nothing was counted.");
      feedback("latin", "Those are Latin letters. Nothing was counted. Use a Hebrew keyboard, the on-screen keys, or the Israeli key positions option.");
      focusNode(inputEl); return;
    }
    const ms = round.t0 == null ? 0 : Math.max(0, clock.now() - round.t0);
    round.answered = true;
    round.results.push({ ok: res.ok, chars: [...res.answer].length, ms, id: it.id, drill: it.drill, char: it.drill === "letters" || it.drill === "finals" ? it.answer : null, accuracy: res.accuracy });
    if (res.ok) { say("Right."); next(true); return; }
    const hint = res.finalFormOnly ? " Check the final forms: ך ם ן ף ץ are used at the end of a word, and the ordinary forms elsewhere." : "";
    feedback("wrong", `Not quite. You typed ${raw.trim() || "nothing"}; the answer is ${it.answer}.${hint}`);
    const f = body.querySelector?.("#ty-feedback");
    if (f) f.append(el("div", { class: "ty-grid" }, el("button", { type: "button", class: "btn", id: "ty-next", onclick: () => next() }, "Next")));
    const chk = body.querySelector?.("#ty-check"); if (chk) chk.textContent = "Next";
    say(`Not quite. The answer is ${it.answer}.${hint}`);
    focusNode(body.querySelector?.("#ty-next"));
  }

  function skip() { if (round) next(false); } // a skipped item is not counted either way
  function next(auto = false) {
    if (!round) return;
    if (round.i + 1 >= round.items.length) { finish(false); return; }
    round.i++; renderItem(true);
    if (auto) say(`Right. Item ${round.i + 1} of ${round.items.length}. ${round.items[round.i].label}`);
  }

  async function finish(early) {
    if (!round) return;
    const { drill, results } = round;
    const sum = summarise(results);
    if (sum.items) { state = recordRound(state, drill, clock.now(), sum, results.filter((r) => r.char).map((r) => ({ char: r.char, ok: r.ok }))); await persist(); }
    const def = DRILLS.find((d) => d.id === drill);
    round = null; inputEl = null;
    body.replaceChildren(
      el("h2", { id: "ty-done", tabindex: "-1" }, early ? "Round stopped" : "Round done"),
      sum.items ? el("div", { class: "ty-card", id: "ty-summary" },
        el("p", {}, `${def.label}: ${sum.correct} of ${sum.items} right (${Math.round(sum.accuracy * 100)}%).`),
        sum.correct ? el("p", {}, `Time on right answers: ${fmtClock(sum.ms)} for ${sum.chars} characters${sum.cpm != null ? `, about ${sum.cpm} characters a minute` : " (too short to give a speed)"}.`) : null,
        el("p", { class: "muted" }, "This is only today's practice on this device: not a typing test, and not a measure of fluency.")) : el("p", {}, "Nothing was answered, so nothing was saved."),
      el("div", { class: "ty-grid" },
        el("button", { type: "button", class: "btn", id: "ty-again", onclick: () => start(drill) }, "Another round"),
        el("button", { type: "button", class: "btn secondary", id: "ty-menu", onclick: () => { renderChoose(); focusNode(h1); } }, "Choose a drill")));
    say(sum.items ? `${early ? "Round stopped" : "Round done"}. ${sum.correct} of ${sum.items} right.` : "Nothing was answered.");
    focusNode(body.querySelector?.("#ty-done"));
  }

  async function init() {
    setBodyLoading();
    try {
      data = ctx?.typingData || await loadJSON("data/typing/drills.json");
      layout = ctx?.keyboard || await loadJSON("data/letters/keyboard-si1452.json");
      map = physicalMap(layout);
      state = normalizeState(await storeGet(ctx, TYPING_KEY, null));
    } catch (e) {
      if (alive) body.replaceChildren(el("p", { role: "alert" }, "The typing drills could not be loaded. Check your connection and reload; nothing was lost."));
      return;
    }
    if (alive) { renderChoose(); }
  }
  function setBodyLoading() { body.replaceChildren(el("p", {}, "Loading...")); }

  init();
  return () => { alive = false; };
}
