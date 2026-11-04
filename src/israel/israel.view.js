/**
 * "Sound like a local" (Israel track).
 *   #/israel                 overview
 *   #/israel/ladder          register ladder: textbook vs everyday pairs
 *   #/israel/fillers         fillers and discourse words
 *   #/israel/giveaways       15 things that give you away, each with a drill
 *   #/israel/say             "Say it" scenario trainer
 *   #/israel/etiquette       short etiquette cards
 * Everything here is a DRAFT written by an AI agent: not reviewed by a native speaker, and there is no audio.
 */
import { el, heText, replaceKeepingFocus, storeGet, storeSet } from "../curriculum/dom.js";
import { loadIsrael, validate, formFor, audioHook, lineAudioId, pickScenarios, orderedOptions, gradePick, scoreSession,
  applyResults, dueCount, CARDS_KEY, STATS_KEY } from "./model.js";
import { injectStyle } from "./style.js";

const SECTIONS = [
  ["ladder", "Register ladder"], ["fillers", "Fillers"], ["giveaways", "Gives you away"], ["say", "Say it"], ["etiquette", "Etiquette"],
];
const PREFS_KEY = "israel.prefs";
const WHO = { m: "a man", f: "a woman" };
const REG = { formal: "Formal", neutral: "Neutral", casual: "Casual", slang: "Slang" };
const ROLE_LABEL = { natural: "Natural", stiff: "Stiff", off: "Wrong register" };

export const DRAFT = "Written by an AI agent from general knowledge. No native Hebrew speaker has checked the Hebrew, pointing, transliteration, register labels or gender forms. Not tested with learners.";
export const NO_AUDIO = "There is no audio for any of this yet. Capitals in the transliteration mark the stressed syllable.";

const badge = (c) => el("span", { class: "il-badge" + (c === "low" ? " il-low" : ""), title: "Confidence of the author, not a review result" }, `Confidence: ${c}${c === "low" ? " (verify before use)" : ""}`);
const noAudio = (ctx, id, voice) => {
  const a = audioHook(ctx, id, voice);
  return a.available
    ? el("button", { type: "button", class: "btn secondary", onclick: () => ctx.audio.play("line", id, { voice }).catch(() => {}) }, "Play")
    : el("span", { class: "il-noaudio" }, a.label);
};
const seg = (label, value, set, items) => {
  const btns = items.map(([v, t]) => el("button", { type: "button", "aria-pressed": String(v === value()), "data-v": v,
    onclick: () => { set(v); btns.forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-v") === value()))); } }, t));
  return el("div", { class: "il-row", role: "group", "aria-label": label }, el("span", { class: "muted" }, label + ": "), el("span", { class: "il-seg" }, ...btns));
};

export function mount(root, ctx = {}) {
  injectStyle();
  let alive = true;
  const sec = ["ladder", "fillers", "giveaways", "say", "etiquette"].includes(ctx?.query?.sec) ? ctx.query.sec : "";
  const wrap = el("section", { class: "il-wrap", "aria-labelledby": "view-title" });
  const title = sec ? SECTIONS.find((s) => s[0] === sec)[1] : "Sound like a local";
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, title);
  root.append(wrap);
  const body = el("div", { class: "il-body" });
  const nav = el("nav", { class: "il-nav", "aria-label": "Sound like a local sections" },
    ...SECTIONS.map(([id, t]) => el("a", { href: `#/israel/${id}`, "aria-current": sec === id ? "page" : null }, t)));
  const notice = el("div", { class: "il-notice", role: "note" }, el("p", {}, el("strong", {}, "Draft. "), DRAFT), el("p", {}, NO_AUDIO));

  (async () => {
    const data = await loadIsrael();
    if (!alive) return;
    const problems = validate(data);
    const prefs = Object.assign({ iAm: ctx?.settings?.get?.("gender") === "f" ? "f" : "m", talkingTo: "m", voice: ctx?.settings?.get?.("voice") === "f" ? "f" : "m" }, await storeGet(ctx, PREFS_KEY, {}));
    const savePrefs = () => storeSet(ctx, PREFS_KEY, prefs);
    const cards = () => storeGet(ctx, CARDS_KEY, {});
    const show = (...nodes) => replaceKeepingFocus(wrap, h1, notice, nav, problems.length ? el("p", { role: "alert" }, `Data check found ${problems.length} problem(s): ${problems[0]}`) : null, body, ...nodes);

    const genderControls = (redraw, talking = true) => el("div", {},
      seg("I am", () => prefs.iAm, (v) => { prefs.iAm = v; savePrefs(); redraw(); }, [["m", "A man"], ["f", "A woman"]]),
      !talking ? null : seg("I am talking to", () => prefs.talkingTo, (v) => { prefs.talkingTo = v; savePrefs(); redraw(); }, [["m", "A man"], ["f", "A woman"]]));
    const lineNode = (l, label, id) => {
      const who = l.gender === "speaker" ? prefs.iAm : l.gender === "addressee" ? prefs.talkingTo : "m";
      const f = formFor(l, who);
      return el("div", { class: "il-line", "data-register": l.register, "data-side": label.toLowerCase() },
        el("div", {}, el("span", { class: "il-label" }, label), " ", el("span", { class: "il-badge" }, REG[l.register]),
          l.gender !== "none" ? el("span", { class: "il-badge" }, l.gender === "speaker" ? `Form for ${WHO[who]} speaking` : `Form for talking to ${WHO[who]}`) : null),
        heText(f.he, "alef-he il-he"), el("div", { class: "il-tr" }, f.translit), el("div", {}, l.en), noAudio(ctx, id, prefs.voice));
    };

    // ------------------------------------------------------------ overview
    function overview() {
      const n = (a) => a.length;
      body.replaceChildren(
        el("p", {}, "Textbook Hebrew is correct but not always what you hear. This section shows the same idea two ways, flags what gives learners away, and lets you practise choosing the natural reply."),
        el("ul", { class: "il-list" },
          ...[["ladder", "Register ladder", `${n(data.ladder.pairs)} textbook vs everyday pairs for greetings, cafes, markets, transport, directions, paying and phones.`],
            ["fillers", "Fillers and discourse words", `${n(data.fillers.fillers)} words like yalla, sababa and nu, with the register for each.`],
            ["giveaways", "Things that give you away", `${n(data.giveaways.items)} common learner errors, each with a quick drill.`],
            ["say", "Say it", `${n(data.scenarios.scenarios)} situations: pick the most natural reply of three.`],
            ["etiquette", "Etiquette cards", `${n(data.etiquette.cards)} short notes on Shabbat, kosher signs, tipping and haggling.`]]
            .map(([id, t, d]) => el("li", { class: "il-card" }, el("h2", {}, el("a", { href: `#/israel/${id}` }, t)), el("p", {}, d)))));
      cards().then((c) => { if (!alive) return; const k = dueCount(c); if (k) body.append(el("p", { role: "status" }, `${k} Say it ${k === 1 ? "item is" : "items are"} due for review.`)); });
      show();
    }

    // ------------------------------------------------------------ ladder
    function ladder() {
      let cat = "all";
      const sel = el("select", { class: "il-select", id: "il-cat", onchange: (e) => { cat = e.target.value; draw(); } },
        el("option", { value: "all" }, `All situations (${data.ladder.pairs.length})`), ...data.ladder.categories.map((c) => el("option", { value: c }, c)));
      const list = el("ul", { class: "il-list" });
      const controls = el("div", {});
      const draw = () => {
        controls.replaceChildren(genderControls(draw), el("div", { class: "il-row" }, el("label", { for: "il-cat" }, "Situation: "), sel));
        list.replaceChildren(...data.ladder.pairs.filter((p) => cat === "all" || p.category === cat).map((p) =>
          el("li", { class: "il-card", "data-pair": p.id },
            el("h2", {}, p.situation), el("div", {}, badge(p.confidence), el("span", { class: "il-badge" }, p.category)),
            lineNode(p.textbook, "Textbook", lineAudioId(p.id, "textbook")), lineNode(p.everyday, "Everyday", lineAudioId(p.id, "everyday")),
            el("p", {}, p.note), el("p", { class: "muted" }, "Gender: " + p.genderNote),
            p.confidence !== "high" ? el("p", { class: "muted" }, "Why not high: " + p.confidenceReason) : null,
            el("p", { class: "muted" }, "Not proofread. Needs native review."))));
      };
      body.replaceChildren(el("p", { class: "muted" }, "Left edge colour and the label show the register: formal, neutral, casual or slang. When a line changes with gender, set who you are and who you talk to."), controls, list);
      draw(); show();
    }

    // ------------------------------------------------------------ fillers
    function fillers() {
      body.replaceChildren(el("p", { class: "muted" }, "Only words whose meaning and register we are fairly sure of. Slang fits friends, not officials or elders."),
        el("ul", { class: "il-list" }, ...data.fillers.fillers.map((f) => el("li", { class: "il-card", "data-filler": f.id },
          el("h2", {}, heText(f.he, "alef-he il-he"), " ", el("span", { class: "il-tr" }, f.translit)),
          el("div", {}, badge(f.confidence), el("span", { class: "il-badge" }, REG[f.register])),
          el("p", {}, f.en), el("p", { class: "muted" }, f.usage),
          el("div", { class: "il-line", "data-register": f.register }, heText(f.example.he, "alef-he il-he"), el("div", { class: "il-tr" }, f.example.translit), el("div", {}, f.example.en)),
          el("p", {}, f.note), f.confidence !== "high" ? el("p", { class: "muted" }, "Why not high: " + f.confidenceReason) : null,
          noAudio(ctx, lineAudioId(f.id), prefs.voice)))));
      show();
    }

    // ------------------------------------------------------------ giveaways
    async function giveaways() {
      const stats = await storeGet(ctx, STATS_KEY, { sessions: [], giveaways: {} });
      if (!alive) return;
      const item = (g, n) => {
        const fb = el("div", { role: "status", "aria-live": "polite" });
        const opts = g.drill.options.map((o) => el("button", { type: "button", class: "il-opt", "data-opt": o.id,
          onclick: async () => {
            opts.forEach((b) => { b.disabled = true; if (b.getAttribute("data-opt") === g.drill.answer) b.setAttribute("data-state", "natural"); });
            const good = o.id === g.drill.answer;
            if (!good) opts.find((b) => b.getAttribute("data-opt") === o.id).setAttribute("data-state", "picked-wrong");
            fb.replaceChildren(el("p", {}, el("strong", {}, good ? "Right. " : "Not quite. "), g.drill.explain));
            const s = (stats.giveaways[g.id] ||= { right: 0, total: 0 }); s.total++; if (good) s.right++;
            await storeSet(ctx, STATS_KEY, stats);
            await storeSet(ctx, CARDS_KEY, applyResults(await cards(), "giveaway", [{ id: g.id, picked: good ? "natural" : "off" }]));
          } }, o.translit && o.translit !== o.text ? [heText(o.text, "alef-he il-he"), " ", el("span", { class: "il-tr" }, o.translit)] : [o.text.match(/[֐-׿]/) ? heText(o.text, "alef-he il-he") : o.text]));
        return el("li", { class: "il-card", "data-giveaway": g.id },
          el("h2", {}, `${n}. ${g.title}`), el("div", {}, badge(g.confidence), el("span", { class: "il-badge" }, g.category)),
          el("div", { class: "il-line" }, el("span", { class: "il-label il-wrong" }, "Gives you away"), " ", heText(g.wrong.he, "alef-he il-he"), el("div", { class: "il-tr" }, g.wrong.translit), g.wrong.note ? el("div", { class: "muted" }, "(" + g.wrong.note + ")") : null),
          el("div", { class: "il-line" }, el("span", { class: "il-label il-right" }, "Sounds local"), " ", heText(g.right.he, "alef-he il-he"), el("div", { class: "il-tr" }, g.right.translit)),
          el("p", {}, g.why), el("p", {}, el("strong", {}, "Fix: "), g.fix), el("p", {}, el("strong", {}, "Say it: "), g.say),
          g.confidence !== "high" ? el("p", { class: "muted" }, "Why not high: " + g.confidenceReason) : null,
          el("div", { role: "group", "aria-label": `Drill ${n}` }, el("p", {}, el("strong", {}, "Drill: "), g.drill.prompt), ...opts, fb),
          el("p", { class: "muted" }, "Not proofread. Needs native review."));
      };
      body.replaceChildren(el("p", { class: "muted" }, "Fifteen things that tend to mark a learner. Tap an answer in each drill. Wrong answers go into your Say it review queue."),
        el("ul", { class: "il-list" }, ...data.giveaways.items.map((g, i) => item(g, i + 1))));
      show();
    }

    // ------------------------------------------------------------ say it
    async function say(seedIn) {
      const seed = Number(seedIn) || (Date.now() % 100000);
      const c0 = await cards();
      if (!alive) return;
      const set = pickScenarios(data.scenarios.scenarios, { seed, count: 8, cards: c0 });
      const results = [];
      let pos = 0;
      const ask = () => {
        if (!alive) return;
        if (pos >= set.length) return finish();
        const s = set[pos];
        const fb = el("div", { role: "status", "aria-live": "polite" });
        const list = orderedOptions(s, seed);
        const form = (o) => formFor(o, prefs.iAm);
        const btns = list.map((o) => {
          const f = form(o);
          return el("button", { type: "button", class: "il-opt", "data-index": String(o.index), "data-role": o.role,
            onclick: () => pick(o.index) }, heText(f.he, "alef-he il-he"), el("div", { class: "il-tr" }, f.translit), el("div", { class: "muted" }, o.en));
        });
        let answered = false;
        function pick(index) {
          if (answered) return;
          answered = true;
          const g = gradePick(s, index);
          results.push({ id: s.id, picked: g.picked.role });
          btns.forEach((b) => { b.disabled = true; const o = s.options[Number(b.getAttribute("data-index"))];
            b.setAttribute("data-state", o.role === "natural" ? "natural" : o === g.picked ? "picked-wrong" : "other");
            b.append(el("div", {}, el("strong", {}, ROLE_LABEL[o.role] + ": "), o.explain)); });
          const nextBtn = el("button", { type: "button", class: "btn", id: "il-next", onclick: () => { pos++; ask(); } }, pos + 1 === set.length ? "See score" : "Next");
          fb.replaceChildren(el("p", {}, el("strong", {}, g.correct ? "Natural. " : g.picked.role === "stiff" ? "Correct Hebrew, but stiff. " : "Wrong register. "), g.correct ? "That is the reply we think is most natural." : "The natural reply is highlighted."), nextBtn);
          nextBtn.focus?.();
        }
        body.replaceChildren(
          el("p", { class: "muted", role: "status" }, `Situation ${pos + 1} of ${set.length}`),
          genderControls(() => { if (!answered) ask(); }, false),
          el("div", { class: "il-card" }, el("h2", {}, s.title), el("p", {}, s.situation),
            s.other.silent ? el("p", { class: "muted" }, s.other.en) : el("div", { class: "il-line" }, el("span", { class: "il-label" }, "They say"), " ", heText(s.other.he, "alef-he il-he"), el("div", { class: "il-tr" }, s.other.translit), el("div", {}, s.other.en)),
            s.otherGender !== "none" ? el("p", { class: "muted" }, `You are talking to ${WHO[s.otherGender]}.`) : null,
            el("p", {}, el("strong", {}, "Which reply is the most natural?"), " ", badge(s.confidence)),
            el("div", { role: "group", "aria-label": "Replies" }, ...btns), fb, el("p", { class: "muted" }, s.note + " Not proofread. Needs native review.")));
        show();
      };
      async function finish() {
        const sc = scoreSession(results);
        const next = applyResults(await cards(), "scenario", results);
        await storeSet(ctx, CARDS_KEY, next);
        const st = await storeGet(ctx, STATS_KEY, { sessions: [], giveaways: {} });
        st.sessions = [...(st.sessions || []), { at: Date.now(), right: sc.right, total: sc.total }].slice(-50);
        await storeSet(ctx, STATS_KEY, st);
        if (!alive) return;
        body.replaceChildren(el("h2", {}, "Score"), el("p", { role: "status" }, `${sc.right} of ${sc.total} natural (${sc.pct}%). Stiff: ${sc.byRole.stiff}. Wrong register: ${sc.byRole.off}.`),
          el("p", {}, sc.message), el("p", { class: "muted" }, `Your picks were scheduled for spaced review. ${dueCount(next)} due now. Stiff picks come back sooner than natural ones.`),
          el("div", { class: "il-row" }, el("button", { type: "button", class: "btn", onclick: () => say() }, "Another round"), el("a", { class: "btn secondary", href: "#/israel" }, "Back")));
        show();
      }
      ask();
    }

    // ------------------------------------------------------------ etiquette
    function etiquette() {
      body.replaceChildren(el("p", { class: "muted" }, "Short notes where we are fairly sure. Practice changes, so check locally. Every card is flagged for review."),
        el("ul", { class: "il-list" }, ...data.etiquette.cards.map((c) => el("li", { class: "il-card", "data-card": c.id },
          el("h2", {}, c.title), el("div", {}, badge(c.confidence), ...c.tags.map((t) => el("span", { class: "il-badge" }, t))),
          el("p", {}, c.body), c.confidence !== "high" ? el("p", { class: "muted" }, "Why not high: " + (c.confidenceReason || "")) : null,
          c.regionClaim ? el("p", { class: "muted" }, "A regional description. Needs native review; do not treat as fact.") : null,
          el("p", { class: "muted" }, "Not proofread. Needs native review.")))));
      show();
    }

    ({ "": overview, ladder, fillers, giveaways, say: () => say(ctx?.query?.seed), etiquette })[sec]();
  })().catch((e) => { wrap.replaceChildren(h1, el("p", { role: "alert" }, "Could not load: " + (e?.message || e))); });
  return () => { alive = false; wrap.remove(); };
}
export default mount;
