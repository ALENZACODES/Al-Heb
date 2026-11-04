/**
 * Intermediate lessons I-01..I-50.
 *   #/intermediate        list of the 50 lessons with progress
 *   #/intermediate/:id    one lesson: words with pronunciation lines, then the exercises one at a time
 * All ten exercise types are rendered here (recall, produce, match, order, respond, gender, dialogue, fade, spot, register);
 * grading and SRS mapping come from intermediate-adapter.js. Progress is kept under the store key `intermediate.v1`:
 *   { lessons: { [id]: { results: { [exerciseId]: boolean }, done: ms|null, score, total } } }
 * Draft content: not reviewed by a native Hebrew speaker, not tested with learners.
 */
import { el, heText, tr, storeGet, storeSet, replaceKeepingFocus, CARDS_KEY } from "./dom.js";
import { byId, lessons } from "./lessons.js";
import { loadContent } from "./content.js";
import { loadState, completeLesson } from "./actions.js";
import { applyOutcomesToCards, wordCardId, wordAudioId } from "./progress.js";
import { audioStatus, settingVoice, onKeys } from "./ex-ui.js";
import { describePlay } from "./audio-ui.js";
import * as A from "./intermediate-adapter.js";
import { sequenceExercises, fairProduceOptions, createSession, feedbackText, fireFeedback } from "./exercises.session.js";
import { progressBar, summaryNode } from "./exercises.ui.js";
import { respell } from "../pronunciation/forTradition.js";
import { uiEnglish } from "../shell/names.js";

/** English shown to the learner honours the writeGodAsGd setting (display only; grading uses the raw data). */
const G = (ctx, text) => (typeof text === "string" ? uiEnglish(ctx, text) : text);

export const STORE_KEY = "intermediate.v1";
export const TYPE_LABEL = {
  recall: "Recall", produce: "Choose the Hebrew", match: "Match", order: "Put in order", respond: "Respond", gender: "Gender pair",
  dialogue: "Dialogue", fade: "Fade-out recall", spot: "Spot the word", register: "Name the register",
};
const RATINGS = [[1, "Again"], [2, "Hard"], [3, "Good"], [4, "Easy"]];
export const REVIEW_FLAG = "Needs native review: the Hebrew, glosses and pronunciation lines have not been checked by a native speaker.";
export const DRAFT_TEXT = "Draft. This lesson has not been reviewed by a native Hebrew speaker or tested with learners. Pronunciation lines are machine transliteration, not a recording.";

export const listIntermediate = () => lessons.filter((l) => A.isIntermediateId(l.id));
const emptyStore = () => ({ lessons: {} });
const loadProgress = async (ctx) => { const s = await storeGet(ctx, STORE_KEY, null); return s && s.lessons ? s : emptyStore(); };
const tradition = (ctx, lesson) => (lesson.track === "israel" ? "israeli" : ctx?.settings?.get?.("congregation") || "sephardi");
/** Latin pronunciation line of a lesson word for the learner's tradition (falls back to the Israeli form). */
export const pronLine = (w, trad) => w?.pronunciation?.[trad] || (trad === "israeli" ? "" : respell(w?.he, trad)) || w?.pronunciation?.israeli || w?.translit || "";
const wordFor = (lesson, he) => { const i = lesson.words.findIndex((w) => A.heKey(w.he) === A.heKey(he)); return i < 0 ? null : { w: lesson.words[i], n: i + 1 }; };

function playBtn(ctx, kind, id, label, note, lesson) {
  return el("button", { type: "button", class: "btn secondary alef-play", "aria-label": label, "data-audio": `${kind}/${id}`,
    onclick: async () => {
      const voice = settingVoice(ctx), trad = tradition(ctx, lesson);
      let st = audioStatus(ctx, kind, id, voice);
      if (st.checking && typeof ctx.audio?.ensureManifest === "function") { await ctx.audio.ensureManifest(); st = audioStatus(ctx, kind, id, voice); }
      if (st.source === "none") { note.textContent = st.label; return; }
      try { note.textContent = describePlay(await ctx.audio.play(kind, id, { voice, tradition: trad })); }
      catch (e) { note.textContent = "No sound: " + (e?.message || e); }
    } }, el("span", { "aria-hidden": "true" }, "▶"), " Listen");
}

/** Hebrew + optional pronunciation line + optional audio, as one row. */
function heRow(ctx, lesson, note, he, { audio } = {}) {
  const hit = wordFor(lesson, he);
  const id = audio?.id ?? (hit ? wordAudioId(lesson.id, hit.n) : null);
  return el("div", { class: "alef-int-he row" }, heText(he, "alef-he alef-word"),
    hit ? el("span", { class: "alef-pron muted", "data-pron": "1" }, pronLine(hit.w, tradition(ctx, lesson))) : null,
    id ? playBtn(ctx, audio?.kind ?? "word", id, `Listen to ${G(ctx, hit?.w.en || he)}`, note, lesson) : null);
}

// ------------------------------------------------------------------------------------------------ exercise renderers
// Each renderer returns a node and calls finish(correct:boolean) exactly once. `env` = { ctx, lesson, note, corpus, seed }.
function selfRate(finish, revealed) {
  return el("div", { class: "alef-int-rate row", role: "group", "aria-label": "How did you do?" },
    ...RATINGS.map(([n, t]) => el("button", { type: "button", class: "btn secondary", "data-rating": String(n), "aria-label": `${n}: ${t}`,
      onclick: () => { if (revealed()) finish(A.gradeExercise({ type: "recall" }, n).correct); } }, `${n} ${t}`)));
}

function revealable(env, ex, promptNodes, answerNodes, finish) {
  let shown = false;
  const answer = el("div", { class: "alef-int-answer", hidden: "", "aria-live": "polite" }, ...answerNodes);
  const rate = selfRate(finish, () => shown);
  rate.setAttribute("hidden", "");
  const btn = el("button", { type: "button", class: "btn", onclick: () => { shown = true; answer.hidden = false; answer.removeAttribute?.("hidden"); rate.hidden = false; rate.removeAttribute?.("hidden"); btn.hidden = true; btn.setAttribute("hidden", ""); } }, "Show answer");
  return el("div", {}, ...promptNodes, btn, answer, rate);
}

const R = {
  recall(env, ex, finish) {
    const hit = wordFor(env.lesson, ex.he);
    return revealable(env, ex, [el("p", {}, "Say it aloud and think what it means."), heRow(env.ctx, env.lesson, env.note, ex.he)],
      [el("p", {}, G(env.ctx, ex.en)), hit ? el("p", { class: "muted" }, "Pronounced: " + pronLine(hit.w, tradition(env.ctx, env.lesson))) : null], finish);
  },
  produce(env, ex, finish) {
    const opts = fairProduceOptions(ex);
    const out = el("p", { role: "status", "aria-live": "polite" });
    let done = false;
    const group = el("div", { class: "alef-int-options col", role: "group", "aria-label": "Choices" }, ...opts.map((o, i) => el("button", { type: "button", class: "btn secondary alef-int-opt", "data-n": String(i + 1), lang: "he", dir: "rtl",
      onclick: () => {
        if (done) return; done = true;
        const ok = A.gradeExercise(ex, o.text).correct;
        out.textContent = ok ? "Correct." : `Not quite. The answer is ${ex.options[ex.answer]}.`;
        finish(ok);
      } }, o.text)));
    return el("div", {}, el("p", {}, "Which Hebrew means: ", el("strong", {}, G(env.ctx, ex.en)), "?"), group, out);
  },
  match(env, ex, finish) {
    const cols = A.matchColumns(ex, env.seed), chosen = {}; let done = false;
    const out = el("p", { role: "status", "aria-live": "polite" });
    const rows = ex.pairs.map((p) => {
      const btns = cols.right.map((en) => el("button", { type: "button", class: "btn secondary alef-int-opt", "aria-pressed": "false",
        onclick: () => { if (done) return; chosen[p.he] = en; btns.forEach((b) => b.setAttribute("aria-pressed", String(b.text === G(env.ctx, en)))); } }, G(env.ctx, en)));
      return el("div", { class: "alef-int-match", role: "group", "aria-label": p.he }, heText(p.he, "alef-he alef-word"), el("div", { class: "row" }, ...btns));
    });
    const check = el("button", { type: "button", class: "btn", onclick: () => {
      if (done) return;
      if (Object.keys(chosen).length < ex.pairs.length) { out.textContent = "Match every Hebrew phrase first."; return; }
      done = true; const ok = A.gradeExercise(ex, chosen).correct;
      out.textContent = ok ? "All matched." : "Not all right. " + ex.pairs.map((p) => `${p.he} = ${G(env.ctx, p.en)}`).join("; ");
      finish(ok);
    } }, "Check");
    return el("div", {}, el("p", {}, "Match each Hebrew phrase with its meaning."), ...rows, check, out);
  },
  order(env, ex, finish) {
    const pool = A.orderPuzzle(ex, env.seed), placed = []; let done = false;
    const line = el("p", { class: "alef-int-line", lang: "he", dir: "rtl", "aria-label": "Your order" });
    const out = el("p", { role: "status", "aria-live": "polite" });
    const poolBtns = pool.map((t, i) => { const b = el("button", { type: "button", class: "btn secondary alef-int-opt", lang: "he", dir: "rtl", "data-i": String(i),
      onclick: () => { if (done || b.disabled) return; placed.push({ t, b }); b.disabled = true; b.setAttribute("disabled", ""); sync(); } }, t); return b; });
    function sync() { line.textContent = placed.map((p) => p.t).join(" "); }
    const undo = el("button", { type: "button", class: "btn secondary", onclick: () => { if (done) return; const p = placed.pop(); if (p) { p.b.disabled = false; p.b.removeAttribute?.("disabled"); } sync(); } }, "Undo");
    const check = el("button", { type: "button", class: "btn", onclick: () => {
      if (done) return;
      if (placed.length < pool.length) { out.textContent = "Place every word first."; return; }
      done = true; const ok = A.gradeExercise(ex, placed.map((p) => p.t)).correct;
      out.textContent = ok ? "Right order." : `Not quite. The order is: ${ex.he}`;
      finish(ok);
    } }, "Check");
    return el("div", {}, el("p", {}, "Put the words in order: ", el("strong", {}, G(env.ctx, ex.en))), el("div", { class: "alef-int-pool row", role: "group", "aria-label": "Words" }, ...poolBtns), line, el("div", { class: "row" }, undo, check), out);
  },
  respond(env, ex, finish) {
    const prompt = ex.prompt ? [heRow(env.ctx, env.lesson, env.note, ex.prompt.he), el("p", { class: "muted" }, G(env.ctx, ex.prompt.en))] : [];
    return revealable(env, ex, [el("p", {}, G(env.ctx, ex.cue)), ...prompt, el("p", {}, "Say your reply aloud.")],
      [heRow(env.ctx, env.lesson, env.note, ex.answer.he), el("p", {}, G(env.ctx, ex.answer.en))], finish);
  },
  gender(env, ex, finish) {
    return revealable(env, ex, [el("p", {}, "Say both forms aloud: ", el("strong", {}, G(env.ctx, ex.en)), ".")],
      [el("p", {}, "Masculine: ", heText(ex.m, "alef-he alef-word")), el("p", {}, "Feminine: ", heText(ex.f, "alef-he alef-word"))], finish);
  },
  dialogue(env, ex, finish) {
    const lines = ex.lines.map((l) => el("li", { class: "alef-int-dlg" }, el("strong", {}, l.speaker.toUpperCase() + ": "), heText(l.he, "alef-he alef-word"), el("span", { class: "muted" }, " " + G(env.ctx, l.en))));
    return revealable(env, ex, [el("p", {}, G(env.ctx, ex.task)), el("p", {}, "Read the dialogue aloud, both parts."), el("ul", { class: "alef-items" }, ...ex.lines.map((l) => el("li", { lang: "he", dir: "rtl" }, l.he)))],
      [el("ul", { class: "alef-items" }, ...lines)], finish);
  },
  fade(env, ex, finish) {
    const r = env.corpus?.get(ex.line), text = r ? lineText(r, ex) : null;
    return revealable(env, ex, [el("p", {}, "Say this line from memory: ", el("strong", {}, G(env.ctx, ex.en))),
      el("p", {}, el("a", { class: "btn secondary", href: A.exerciseRoute(ex) }, "Practise with fade-out screen"))],
      [text ? heRow(env.ctx, env.lesson, env.note, text, { audio: { kind: "line", id: lineAudioId(r, ex) } }) : el("p", { class: "muted" }, `(${ex.line}: text not in the corpus build)`)], finish);
  },
  spot(env, ex, finish) {
    const r = env.corpus?.get(ex.line), text = r ? lineText(r, ex) : ex.target;
    const toks = text.split(/\s+/).flatMap((t) => t.split(/(?<=־)/)).filter(Boolean), out = el("p", { role: "status", "aria-live": "polite" }); let done = false;
    const row = el("div", { class: "alef-int-pool row", role: "group", "aria-label": "Words of the line" }, ...toks.map((t) => el("button", { type: "button", class: "btn secondary alef-int-opt", lang: "he", dir: "rtl",
      onclick: () => { if (done) return; done = true; const ok = A.gradeExercise(ex, t).correct; out.textContent = ok ? "Found it." : `Not quite. The word is ${ex.target}.`; finish(ok); } }, t)));
    return el("div", {}, el("p", {}, "Find the word that means: ", el("strong", {}, G(env.ctx, ex.en))), row, out);
  },
  register(env, ex, finish) {
    let done = false; const out = el("p", { role: "status", "aria-live": "polite" });
    const group = el("div", { class: "alef-int-options row", role: "group", "aria-label": "Register" }, ...ex.options.map((o) => el("button", { type: "button", class: "btn secondary alef-int-opt", "data-register": o,
      onclick: () => { if (done) return; done = true; const ok = A.gradeExercise(ex, o).correct; out.textContent = ok ? "Yes." : `Not quite. This is ${ex.answer}.`; finish(ok); } }, o)));
    return el("div", {}, el("p", {}, "How formal is this phrase? ", el("em", {}, G(env.ctx, ex.en))), heRow(env.ctx, env.lesson, env.note, ex.he), group, out);
  },
};
/** lineIndex is 1-based in the data (default 1), like the audio line ids. */
const lineText = (r, ex) => { const ls = r.he.split("\n"); return ls[(ex.lineIndex ?? 1) - 1] ?? ls[0]; };
const lineAudioId = (r, ex) => (r.lines > 1 ? `${r.id}-l${ex.lineIndex ?? 1}` : r.id);

/** Save the SRS effects of a finished lesson: misses lapse (and create) word cards; fade lines get line cards. */
export async function applyToSrs(ctx, lesson, results, now = Date.now()) {
  const st = await loadState(ctx, now);
  const outcomes = A.outcomesFor(lesson, Object.entries(results).map(([id, correct]) => ({ id, correct })));
  if (!outcomes.length) return 0;
  await storeSet(ctx, CARDS_KEY, applyOutcomesToCards(st.cards, outcomes, now));
  return outcomes.length;
}

/** Why-line shown after an answer: derived from the exercise data only (no new Hebrew is invented). */
export function whyLine(ex, lesson, trad) {
  const hit = (he) => lesson.words.find((w) => A.heKey(w.he) === A.heKey(he));
  if (ex.type === "produce") { const he = ex.options[ex.answer], w = hit(he); return `${he} is the Hebrew for "${ex.en}"${w ? ` (pronounced ${pronLine(w, trad)})` : ""}.`; }
  if (ex.type === "spot") return `${ex.target} means "${ex.en}".`;
  if (ex.type === "order") return `${ex.he} means "${ex.en}".`;
  if (ex.type === "register") return `"${ex.en}" is ${ex.answer}.`;
  if (ex.type === "match") return ex.pairs.map((p) => `${p.he} = ${p.en}`).join("; ") + ".";
  return "";
}
const exLabel = (e) => TYPE_LABEL[e.type] + ": " + (e.he || e.en || e.line || e.m || e.task || e.id);

// ------------------------------------------------------------------------------------------------ pages
function mountList(root, ctx) {
  let alive = true;
  const wrap = el("section", { class: "alef-intermediate", "aria-labelledby": "view-title" });
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, tr(ctx, "intermediate.title", "Intermediate lessons"));
  root.append(wrap);
  (async () => {
    const [prog, st] = await Promise.all([loadProgress(ctx), loadState(ctx)]);
    if (!alive) return;
    const all = listIntermediate();
    const doneN = all.filter((l) => prog.lessons[l.id]?.done).length;
    const units = [...new Set(all.map((l) => l.unit))];
    const item = (l) => {
      const p = prog.lessons[l.id], answered = p ? Object.keys(p.results || {}).length : 0, total = l.exercises.length;
      const unmet = l.prerequisites.filter((x) => !st.completed[x]);
      return el("li", { "data-lesson": l.id }, el("a", { href: `#/intermediate/${l.id}` }, `${l.id} ${l.title}`), " ",
        el("span", { class: "muted" }, p?.done ? `done, ${p.score} of ${p.total}` : answered ? `${answered} of ${total} answered` : `${total} exercises`),
        l.needsNativeReview ? el("span", { class: "alef-flag muted" }, " · needs native review") : null,
        unmet.length ? el("span", { class: "alef-locked muted" }, " · finish " + unmet.map((x) => byId[x]?.title || x).join(", ") + " first") : null);
    };
    replaceKeepingFocus(wrap, h1,
      el("p", { class: "draft-flag", role: "note" }, DRAFT_TEXT), el("p", { class: "draft-flag", role: "note" }, REVIEW_FLAG),
      el("p", { role: "status" }, `${doneN} of ${all.length} lessons finished.`),
      ...units.flatMap((u) => [el("h2", {}, u || "Lessons"), el("ul", { class: "alef-linelist" }, ...all.filter((l) => l.unit === u).map(item))]));
  })().catch((e) => wrap.replaceChildren(h1, el("p", { role: "alert" }, "Could not load the list: " + (e?.message || e))));
  return () => { alive = false; wrap.remove(); };
}

function mountLesson(root, ctx, id) {
  let alive = true, offKeys = () => {};
  const wrap = el("article", { class: "alef-intermediate alef-lesson-page", "aria-labelledby": "view-title" });
  root.append(wrap);
  const stop = () => { alive = false; offKeys(); wrap.remove(); };
  const lesson = byId[id];
  if (!lesson || !A.isIntermediateId(id)) {
    wrap.append(el("h1", { id: "view-title", tabindex: "-1" }, "Lesson not found"), el("p", {}, `There is no intermediate lesson "${id}".`), el("a", { class: "btn", href: "#/intermediate" }, "All intermediate lessons"));
    return stop;
  }
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, `${lesson.id} ${lesson.title}`);
  const note = el("p", { class: "alef-audio-note muted", role: "status", "aria-live": "polite" });
  const body = el("div", { class: "alef-int-body" });
  const trad = tradition(ctx, lesson);

  (async () => {
    const [prog, content, st] = await Promise.all([loadProgress(ctx), loadContent(), loadState(ctx)]);
    if (!alive) return;
    const mine = prog.lessons[lesson.id] || { results: {}, done: null };
    const exs = sequenceExercises(lesson.exercises), corpus = content.corpus;
    const unmet = lesson.prerequisites.filter((p) => !st.completed[p]);
    let results = { ...mine.results }, session = null, t0 = 0, cardsUpdated = 0, shown = 0;
    let started = false;

    const begin = () => {
      // Resume at the first unanswered exercise; a finished lesson starts a fresh round.
      let todo = exs.filter((e) => !(e.id in results));
      if (!todo.length) { results = {}; todo = exs; }
      session = createSession(todo); t0 = Date.now(); cardsUpdated = 0; shown = exs.length - todo.length;
    };

    const intro = () => [
      el("p", { class: "muted" }, `${lesson.unit ? lesson.unit + " · " : ""}${lesson.estMinutes} min · ${lesson.track === "read" ? "Read the siddur" : "Speak in Israel"} · ${exs.length} exercises`),
      el("p", { class: "draft-flag", role: "note" }, DRAFT_TEXT),
      exs.length ? null : el("p", { class: "alef-locked", role: "note" }, "This lesson has no exercises yet, so it cannot be completed."),
      lesson.needsNativeReview ? el("p", { class: "draft-flag alef-needs-review", role: "note" }, REVIEW_FLAG) : null,
      unmet.length ? el("p", { class: "alef-locked", role: "note" }, `Finish ${unmet.map((p) => byId[p]?.title || p).join(", ")} first. You can still look around.`) : null,
      el("section", { class: "card", "aria-labelledby": "i-goals" }, el("h2", { id: "i-goals" }, "Goals"), el("ul", {}, ...lesson.goals.map((g) => el("li", {}, G(ctx, g))))),
      el("section", { class: "card", "aria-labelledby": "i-words" }, el("h2", { id: "i-words" }, "Words"),
        el("p", { class: "muted" }, lesson.track === "israel" ? "Pronunciation lines are the Israeli form." : `Pronunciation lines follow your tradition setting (${trad}).`),
        el("ul", { class: "alef-items" }, ...lesson.words.map((w, i) => el("li", { class: "alef-item" }, heText(w.he, "alef-he alef-word"),
          el("div", { class: "alef-item-body" }, el("span", {}, G(ctx, w.en)), el("div", { class: "alef-pron muted", "data-pron": "1" }, pronLine(w, trad))),
          el("div", { class: "alef-item-actions" }, playBtn(ctx, "word", wordAudioId(lesson.id, i + 1), `Listen to ${G(ctx, w.en)}`, note, lesson)))))),
      note,
      el("div", { class: "row alef-actions" }, el("button", { type: "button", class: "btn", id: "alef-int-start", disabled: exs.length ? null : "", onclick: () => { started = true; offKeys(); begin(); show(); } }, mine.done ? "Practise again" : Object.keys(results).length ? "Continue" : "Start exercises"),
        el("a", { class: "btn secondary", href: "#/intermediate" }, "All intermediate lessons")),
    ];

    async function persist(extra = {}) {
      prog.lessons[lesson.id] = { ...(prog.lessons[lesson.id] || {}), results: { ...results }, done: mine.done, ...extra };
      await storeSet(ctx, STORE_KEY, prog);
    }

    function show() {
      if (!alive) return;
      offKeys();
      if (session.done()) return summary();
      const ex = session.current(), retry = session.isRetry();
      let answered = false, pending = null;
      // The SRS update waits for "Next", so Undo costs nothing.
      const flush = async () => { if (pending) { const p = pending; pending = null; cardsUpdated += await applyToSrs(ctx, lesson, { [p.id]: p.correct }); } };
      const bar = progressBar("Lesson progress");
      const refresh = () => { const p = session.progress(), tot = p.total + shown; bar.update((p.resolved + shown) / tot, `${p.resolved + shown} of ${tot} done`); };
      refresh();
      const status = el("p", { class: "alef-int-next alef-fb", role: "status", "aria-live": "polite" });
      const why = el("p", { class: "muted alef-why" });
      const next = el("button", { type: "button", class: "btn", id: "alef-int-next", hidden: "", onclick: async () => { await flush(); show(); } }, "Next");
      const undo = el("button", { type: "button", class: "btn secondary", "data-act": "undo", hidden: "", onclick: async () => {
        if (!session.undo()) return;
        pending = null;
        if (!retry) { delete results[ex.id]; await persist(); }
        show();
      } }, "Undo");
      const skip = el("button", { type: "button", class: "btn secondary", "data-act": "skip", onclick: () => { if (!answered) { session.skip(); show(); } } }, "Skip");
      const finish = async (correct) => {
        if (answered) return; answered = true;
        const r = session.answer(!!correct);
        fireFeedback(ctx, !!correct);
        sec.setAttribute("data-result", correct ? "right" : "wrong");
        status.textContent = (retry ? feedbackText(!!correct, { retry: true }) : correct ? "Marked as known." : "Marked to review.") + (r.requeued ? " You will see it once more at the end." : "");
        why.textContent = uiEnglish(ctx, whyLine(ex, lesson, trad));
        refresh();
        for (const b of [next, undo]) { b.hidden = false; b.removeAttribute?.("hidden"); }
        skip.hidden = true; skip.setAttribute("hidden", "");
        if (!retry) { results[ex.id] = !!correct; pending = { id: ex.id, correct: !!correct }; await persist(); }
        next.textContent = session.done() ? "Finish" : "Next";
        next.focus?.();
      };
      const node = R[ex.type](Object.assign({ ctx, lesson, note, corpus, seed: (lesson.exercises.indexOf(ex) + 1) }, {}), ex, finish);
      const p0 = session.progress();
      const title = el("h2", { id: "alef-int-ex", tabindex: "-1" }, `${retry ? "Try again - " : ""}${TYPE_LABEL[ex.type] || ex.type}: ${Math.min(shown + p0.resolved + 1, p0.total + shown)} of ${p0.total + shown}`);
      const sec = el("section", { class: "card alef-ex-card", "aria-labelledby": "alef-int-ex", "data-type": ex.type, "data-ex": ex.id }, node, status, why, el("div", { class: "row" }, next, undo, skip));
      body.replaceChildren(bar.node, title, sec, note,
        el("p", {}, el("a", { href: `#/intermediate/${lesson.id}` , onclick: (e) => { e?.preventDefault?.(); offKeys(); body.replaceChildren(...intro()); } }, "Back to the words")));
      title.focus?.();
      offKeys = onKeys((e) => {
        if (/^[1-9]$/.test(e.key)) { const b = body.querySelectorAll?.(".alef-int-opt")?.[Number(e.key) - 1]; if (b && !b.disabled) b.click(); }
        else if (e.key === "Enter" && !next.hidden && document.activeElement !== next) next.click();
      });
    }

    async function summary() {
      const st2 = session.stats(), skipped = session.skippedIds();
      const all = exs.length > 0 && Object.keys(results).length === exs.length;
      const right = exs.filter((e) => results[e.id]).length, missed = exs.filter((e) => results[e.id] === false);
      if (all) {
        mine.done = Date.now();
        await persist({ done: mine.done, score: right, total: exs.length });
        await completeLesson(ctx, lesson);
      }
      if (!alive) return;
      const nextL = listIntermediate()[listIntermediate().findIndex((l) => l.id === lesson.id) + 1];
      const words = (e) => (e.type === "recall" ? e.he : e.type === "produce" ? e.options[e.answer] : null);
      const good = exs.filter((e) => results[e.id] && words(e)).map((e) => words(e));
      body.replaceChildren(summaryNode({ title: all ? "Lesson finished" : "Round finished", countText: `${right} of ${exs.length} marked as known.`, stats: { ...st2, accuracy: st2.answered ? st2.right / st2.answered : null },
        ms: Date.now() - t0, goodLabels: [...new Set(good)], missedLabels: missed.map(exLabel), skippedN: skipped.length, cardsUpdated,
        nextHref: nextL ? `#/intermediate/${nextL.id}` : null, nextLabel: "Next lesson",
        extraLinks: [el("a", { class: "btn secondary", href: "#/intermediate" }, "All intermediate lessons")] }));
      body.querySelector?.("#alef-int-ex")?.focus?.();
    }

    body.replaceChildren(...intro());
    replaceKeepingFocus(wrap, h1, body);
  })().catch((e) => wrap.replaceChildren(h1, el("p", { role: "alert" }, "Could not load lesson: " + (e?.message || e))));
  return stop;
}

/** Entry point used by the shell: ctx.query.id picks a lesson, otherwise the list is shown. */
export function mount(root, ctx = {}) {
  const id = ctx.query?.id;
  return id ? mountLesson(root, ctx, id) : mountList(root, ctx);
}
export { mountList, mountLesson, R as EXERCISE_RENDERERS };
