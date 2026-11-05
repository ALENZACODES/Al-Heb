/**
 * Gender cards. #/learn?gender=pairs[&quiz=1][&seed=n]  (gr-tmh-02 pair cards + quizzes)
 *               #/learn?gender=roles                    (gr-jm-02 say-as-me / hear-as-you)
 */
import { el, heText, tr, replaceKeepingFocus, storeGet } from "./dom.js";
import { loadGender, orderFor, buildQuiz, gradeTap, genderedForms, composeParadigm } from "./gender.js";
import { GENDER_KEY, saveGender, setLearnerGender } from "./actions.js";
import { tokenize } from "./fade.js";
import { draftNotice, voiceSelector, voiceButton, audioStatus, settingVoice } from "./ex-ui.js";
import { isAudioFree, SKIP_NOTE } from "../shell/audiofree.js";

const WHO = { m: "man", f: "woman" };
const GRAMMAR_NOTE = "These sentences and forms are drafts; the Hebrew has not been checked by a native speaker.";

/** The Hebrew with the differing clusters highlighted (spans with class alef-diff); structure only, no extra letters. */
function highlighted(he, diffIdx) {
  let n = 0;
  return el("span", { class: "alef-he alef-word", dir: "rtl", lang: "he" }, ...tokenize(he).map((t) => t.type === "sep" ? t.text
    : el("span", { class: "alef-gword" }, ...t.clusters.map((cl) => { const i = n++; return diffIdx.includes(i) ? el("mark", { class: "alef-diff" }, cl.text) : cl.text; }))));
}

function audioLine(ctx, p, form, voice, note) {
  const id = p.audio[form];
  if (!id) return el("span", { class: "muted alef-noaudio" }, "No audio yet for this form.");
  const st = audioStatus(ctx, "word", id, voice());
  if (st.source === "none") return el("span", { class: "muted alef-noaudio" }, "No audio yet.");
  return voiceButton(ctx, "word", id, voice(), `Hear ${WHO[form]} form`, note);
}

export function mountGender(root, ctx, mode = "pairs", q = {}) {
  let alive = true;
  const wrap = el("section", { class: "alef-gender", "aria-labelledby": "view-title" });
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, mode === "roles" ? tr(ctx, "roles.title", "Say it as me, hear it as you") : tr(ctx, "gender.title", "Gender pair cards"));
  root.append(wrap);
  const sel = voiceSelector(ctx, settingVoice(ctx));
  const note = el("p", { class: "alef-audio-note muted", role: "status", "aria-live": "polite" });
  const voiceHonesty = "Voices: Man (Ari) and Woman (Noa) are the planned narrators. No recorded teacher exists. A button only plays when the audio manifest has a clip or the browser can speak that item; if it says \"No audio yet\", there is nothing to play.";

  (async () => {
    const [g, saved] = await Promise.all([loadGender(), storeGet(ctx, GENDER_KEY, {})]);
    if (!alive) return;
    const shared = ctx?.settings?.get?.("gender"); // the shared Settings choice wins; "both" or unset only affects which form is listed first (both forms are always shown)
    let iAm = shared === "f" || shared === "m" ? shared : saved?.iAm === "f" ? "f" : "m";
    const head = () => [draftNotice(ctx, GRAMMAR_NOTE, voiceHonesty), el("div", { class: "row" }, sel.node, iAmChooser())];
    function iAmChooser() {
      return el("div", { class: "alef-iam row", role: "radiogroup", "aria-label": "I am" }, el("span", { class: "muted" }, "I am: "),
        ...["m", "f"].map((v) => el("button", { type: "button", class: "btn secondary", role: "radio", "aria-checked": String(iAm === v), "data-iam": v,
          onclick: async () => { iAm = v; await setLearnerGender(ctx, v); render(); } }, v === "m" ? "A man" : "A woman")));
    }
    sel.onChange(() => { note.textContent = ""; if (mode === "roles" || !q.quiz) render(); });
    const render = () => (mode === "roles" ? renderRoles() : q.quiz ? renderQuiz() : renderPairs());

    function renderPairs() {
      const cards = g.pairs.map((p) => el("li", { class: "card alef-pair", "data-pair": p.id },
        el("p", { class: "muted" }, `${p.en} (${p.who === "speaker" ? "said by" : "said to"} a man or a woman; ${p.grammarTag})`),
        ...orderFor(iAm).map((form) => el("div", { class: "alef-pair-form alef-form-" + form, "data-form": form },
          el("strong", {}, p.who === "speaker" ? `Said by a ${WHO[form]}: ` : `Said to a ${WHO[form]}: `), highlighted(p.forms[form].he, p.differsAt[form]),
          el("span", { class: "alef-translit muted" }, " " + p.forms[form].translit), " ", audioLine(ctx, p, form, sel.get, note)))));
      replaceKeepingFocus(wrap, h1, ...head(), note,
        el("p", { class: "row" }, el("a", { class: "btn", href: "#/learn?gender=pairs&quiz=1" }, "Quiz me"), el("a", { class: "btn secondary", href: "#/learn?gender=roles" }, "Say it as me")),
        el("p", { class: "muted" }, "Your own form is shown first. Highlighted letters are the ones that differ."), el("ul", { class: "alef-pairlist" }, ...cards));
    }

    function renderQuiz() {
      const listenOk = (p, form) => !isAudioFree(ctx) && !!p.audio[form] && audioStatus(ctx, "word", p.audio[form], sel.get()).source !== "none";
      const qs = buildQuiz(g.pairs, { seed: Number(q.seed) || Date.now() % 100000, count: 8, listen: listenOk });
      const results = [];
      let pos = 0;
      const byId = new Map(g.pairs.map((p) => [p.id, p]));
      function ask() {
        if (!alive) return;
        if (pos >= qs.length) return end();
        const qu = qs[pos], p = byId.get(qu.pairId), fb = el("div", { role: "status", "aria-live": "polite" });
        const finish = (good) => {
          results.push({ id: p.id, good }); 
          fb.replaceChildren(el("p", {}, good ? "Right." : "Not quite."), el("p", {}, p.en), el("p", {}, highlighted(p.forms[qu.form].he, p.differsAt[qu.form]), " ", p.forms[qu.form].translit),
            el("button", { type: "button", class: "btn alef-next", onclick: () => { pos++; ask(); } }, pos + 1 === qs.length ? "See results" : "Next"));
          fb.children.find?.((x) => x.tag === "button")?.focus?.();
        };
        let body;
        if (qu.type === "which") {
          const label = p.who === "speaker" ? "said by" : "said to";
          const prompt = qu.mode === "listen" ? `Listen, then say who it is ${label}.` : `No audio yet for this item, so this is a reading question. Who is it ${label}?`;
          const btns = ["m", "f"].map((v) => el("button", { type: "button", class: "btn secondary alef-opt", "data-answer": v, onclick: () => { btns.forEach((b) => { b.disabled = true; }); finish(v === qu.answer); } }, `${v === "m" ? "1" : "2"}. A ${WHO[v]}`));
          const written = el("div", { class: "alef-written-alt" });
          const showWritten = () => { written.replaceChildren(heText(p.forms[qu.form].he, "alef-he alef-word-big")); showBtn.hidden = true; };
          const showBtn = el("button", { type: "button", class: "btn secondary", "data-act": "show-written", onclick: showWritten }, "I cannot listen: show the word written");
          const skipBtn = el("button", { type: "button", class: "btn secondary", "data-act": "skip", onclick: () => { pos++; ask(); } }, "Skip this question");
          body = [el("p", {}, prompt), qu.mode === "listen" ? audioLine(ctx, p, qu.form, sel.get, note) : heText(p.forms[qu.form].he, "alef-he alef-word-big"), p.who === "speaker" ? null : el("p", { class: "muted" }, "Think about who is being spoken to."), qu.mode === "listen" ? written : null, el("div", { class: "row" }, ...btns),
            qu.mode === "listen" ? el("div", { class: "row" }, showBtn, skipBtn) : null, qu.mode === "listen" ? el("p", { class: "muted" }, SKIP_NOTE) : null];
        } else {
          const chosen = new Set(); let n = 0;
          const chips = tokenize(p.forms[qu.form].he).map((t) => t.type === "sep" ? t.text : el("span", { class: "alef-gword", dir: "rtl", lang: "he" }, ...t.clusters.map((cl) => { const i = n++;
            return el("button", { type: "button", class: "alef-chip alef-he", "aria-pressed": "false", "data-cluster": String(i), onclick: (ev) => { chosen.has(i) ? chosen.delete(i) : chosen.add(i); const b = chips_btns[i]; b.setAttribute("aria-pressed", String(chosen.has(i))); } }, cl.text); })));
          const chips_btns = chips.flatMap((x) => (x.children ? x.children : [])).filter((x) => x.tag === "button");
          body = [el("p", {}, `This is the ${WHO[qu.form]} form of "${p.en}". Tap the letters that change in the ${WHO[qu.other]} form, then check.`),
            el("div", { class: "alef-chips", dir: "rtl", lang: "he" }, ...chips),
            el("button", { type: "button", class: "btn alef-check", onclick: (ev) => { chips_btns.forEach((b) => { b.disabled = true; }); finish(gradeTap(qu, chosen)); } }, "Check")];
        }
        replaceKeepingFocus(wrap, h1, ...head(), note, el("p", { class: "muted", role: "status" }, `Question ${pos + 1} of ${qs.length}`), el("div", { class: "card" }, ...body.filter(Boolean)), fb);
      }
      async function end() {
        await saveGender(ctx, results);
        if (!alive) return;
        const right = results.filter((r) => r.good).length;
        replaceKeepingFocus(wrap, h1, draftNotice(ctx, GRAMMAR_NOTE), el("h2", {}, "Quiz done"), el("p", {}, `${right} of ${results.length} right. Misses were sent to your review queue.`),
          el("div", { class: "row" }, el("a", { class: "btn", href: "#/learn?gender=pairs&quiz=1" }, "Another quiz"), el("a", { class: "btn secondary", href: "#/learn?gender=pairs" }, "Pair cards"), el("a", { class: "btn secondary", href: "#/learn?review=1" }, "Review now")));
      }
      ask();
    }

    function renderRoles() {
      let speaker = iAm, addressee = iAm === "m" ? "f" : "m", idx = 0;
      const pick = (label, val, set) => el("div", { class: "alef-chips-group row", role: "radiogroup", "aria-label": label }, el("span", { class: "muted" }, label + ": "),
        ...["m", "f"].map((v) => el("button", { type: "button", class: "btn secondary", role: "radio", "aria-checked": String(val === v), "data-role-value": v, onclick: () => { set(v); draw(); } }, v === "m" ? "A man" : "A woman")));
      function draw() {
        if (!alive) return;
        const par = g.paradigms[idx];
        const say = composeParadigm(par, speaker, addressee);                 // what I say (I am `speaker`, I address `addressee`)
        const hear = composeParadigm(par, addressee, speaker);                // what the other person says back about their side
        const pid = (c) => `${par.id}-${c.speaker}${c.addressee}`;
        const line = (label, c, voiceGender) => el("div", { class: "card alef-role-line" }, el("strong", {}, label), " ", heText(c.he, "alef-he alef-word-big"), el("span", { class: "alef-translit muted" }, " " + c.translit), " ",
          (() => { const st = audioStatus(ctx, "word", pid(c), sel.get()); return st.source === "none" ? el("span", { class: "muted alef-noaudio" }, "No audio yet.") : voiceButton(ctx, "word", pid(c), sel.get(), "Listen", note); })());
        replaceKeepingFocus(wrap, h1, ...head(), note,
          el("div", { class: "row alef-paradigm-pick" }, el("label", { for: "alef-par" }, "Phrase: "), el("select", { id: "alef-par", onchange: (e) => { idx = Number(e.target.value); draw(); } }, ...g.paradigms.map((p, i) => el("option", { value: String(i), selected: i === idx ? "" : null }, p.en)))),
          pick("I am", speaker, (v) => { speaker = v; }), pick("I am talking to", addressee, (v) => { addressee = v; }),
          el("button", { type: "button", class: "btn secondary alef-swap", onclick: () => { [speaker, addressee] = [addressee, speaker]; draw(); } }, "Swap roles"),
          line(`You say (as a ${WHO[speaker]} to a ${WHO[addressee]}):`, say),
          line(`You hear, when a ${WHO[addressee]} says it to you as a ${WHO[speaker]}:`, hear),
          el("p", { class: "muted" }, par.tag + ". The two lines differ only in the words that depend on who speaks or who is addressed."));
      }
      draw();
    }
    render();
  })().catch((e) => { wrap.replaceChildren(h1, el("p", { role: "alert" }, "Could not start this practice. Reload the page, then try again.")); });
  return () => { alive = false; wrap.remove(); };
}
