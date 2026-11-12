/**
 * Review session over due SRS cards (letters, vowels, words from completed lessons).
 * Deep links: #/learn?review=1 (all due) and #/learn?lesson=<id>&review=1 (that lesson's cards; created only if the lesson is completed).
 * Rating buttons 1-4 (keyboard 1-4 once the answer is shown) call srs.review via actions.rateCard.
 */
import { reviewsDue } from "../lib/counts.js";
import { streakVisible } from "../shell/comfort.js";
import { hookLine, hookNode as hookParagraph } from "../letters/hookline.js";
import { lessons, byId } from "./lessons.js";
import { el, heText, heLabeled, tr, refocusIfLost } from "./dom.js";
import { shapeLabel, wordLabel } from "../letters/shapetext.js";
import { loadContent, vowelEnglish, vowelIpa } from "./content.js";
import { loadJSON } from "./data.js";
import { loadState, rateCard, addLessonCards, syncMemoryCards, savePairOutcome, snapshotRating, restoreRating } from "./actions.js";
import { buildQueue, parseCardId, wordAudioId, confusableMap } from "./progress.js";
import { playButton } from "./audio-ui.js";
import { hintPanel } from "./hint-ui.js";
import { uiEnglish } from "../shell/names.js";
import { errorKindForCard } from "./hints.js";
import { fade } from "./fade.js";
import { letterSound, respell, LABELS } from "../pronunciation/forTradition.js";
import { buildMemoryQuestion } from "../letters/memory.js";
import { choiceBlock, cueNodes, feedbackNodes, recallAnswerNodes } from "../letters/memory.view.js";
import { hashSeed } from "./exercises.session.js";
import { taughtFromCompleted } from "./actions.js";
import { isAudioFree, silentPrompt } from "../shell/audiofree.js";
import { shortcutsOn } from "../shell/motor.js";

const RATINGS = [[1, "Again", "forgot it"], [2, "Hard", "got it with effort"], [3, "Good", "got it"], [4, "Easy", "no effort"]];

/** Lesson word -> vocab id (data/curriculum/word-vocab-map.json, built by tools/curriculum/word_ids.mjs by exact match). Empty map if the file cannot load. */
export function loadWordVocabMap() {
  return loadJSON("data/curriculum/word-vocab-map.json").then((d) => d?.map || {}, () => ({}));
}

/**
 * Front/back description of a card. `wordVocab` (optional) adds `vocabId` to word cards that have a map entry, so the answer side can show the vocab picture.
 * `opts` (optional) is { seed, known } for memory-chain cards (mem:<letter>:<type>): the seed varies the choices from review to review.
 */
export function describeCard(cardId, c, congregation, wordVocab = null, opts = {}) {
  const p = parseCardId(cardId);
  if (!p) return null;
  if (p.kind === "mem") {
    const q = buildMemoryQuestion(p.type, p.letterId, { chain: c.chain || new Map(), letters: c.letters, consonants: c.consonants, confusables: c.confusables, tradition: congregation, known: opts.known }, { seed: opts.seed ?? 1 });
    if (!q) return null;
    return { kind: "mem", q, prompt: q.prompt, he: q.type === "recall" ? q.promptHe : "", big: true, audio: ["letter", p.letterId], answer: [], answerHe: "", hint: "" };
  }
  if (p.kind === "letter") {
    const L = c.letters.get(p.key); if (!L) return null;
    const sets = (c.confusables?.sets || []).filter((s) => s.letters.includes(p.key));
    return { kind: "letter", prompt: "Name this letter and say its sound.", he: L.he, frontLabel: shapeLabel(L, c.mnemonics?.get?.(p.key)), big: true, audio: ["letter", p.key],
      answer: [L.name + (L.nameHe ? "" : ""), letterSound(c.consonants?.get(p.key), congregation, { fallbackEn: L.sound?.en || "" }).en], answerHe: L.nameHe,
      hint: sets.length ? confusedHint(sets, p.key, c) : "", hook: { letterId: p.key } };
  }
  if (p.kind === "vowel") {
    const V = c.vowels.get(p.key); if (!V) return null;
    return { kind: "vowel", prompt: "Which vowel or mark is this, and how does it sound?", he: V.shape, big: true, audio: ["vowel", p.key],
      answer: [V.name, `${vowelEnglish(V, congregation)} ${vowelIpa(V, congregation)}`.trim()], answerHe: V.nameHe, hint: "" };
  }
  if (p.kind === "syllable") {
    const it = c.ladderItems?.get(p.key); if (!it) return null;
    return { kind: "syllable", prompt: "Say this syllable aloud.", he: it.glyph, big: true, audio: ["syllable", p.key], answer: [`${c.letters.get(it.letter)?.name || it.letter} + ${it.vowel} vowel`], answerHe: "", hint: "" };
  }
  if (p.kind === "prayerLine") {
    const e = c.corpus.get(p.key); if (!e) return null;
    return { kind: "prayerLine", prompt: "Say the whole line from these first letters.", he: fade(e.he, 2).text, big: false, audio: ["line", p.key],
      answer: [e.english || e.title || ""], answerHe: e.he, hint: "Prayer text: checked against its source by a computer, not proofread by a person." };
  }
  if (p.kind === "gender") {
    const g = c.genderPairs?.get(p.key); if (!g) return null;
    return { kind: "gender", prompt: g.who === "speaker" ? "Is this said by a man or a woman?" : "Is this said to a man or a woman?", he: g.forms.f.he, big: false, audio: ["word", g.audio.f || `${p.key}-f`],
      answer: [`The woman form of: ${g.en}`, `The man form: ${g.forms.m.he} (${g.forms.m.translit})`], answerHe: "", hint: "Draft sentence, not checked by a native speaker." };
  }
  if (p.kind !== "word") return null;
  const lesson = byId[p.lessonId]; const w = lesson?.words[p.n - 1]; if (!w) return null;
  const vocabId = wordVocab?.[`${p.lessonId}:${p.n}`] || null;
  return { kind: "word", prompt: "Read this word aloud, then recall what it means.", he: w.he, big: false, audio: ["word", wordAudioId(p.lessonId, p.n)],
    answer: [w.en], answerHe: "", respelling: respell(w.he, congregation) || "", hint: "", hook: { he: w.he }, frontLabel: wordLabel(w.he, congregation), ...(vocabId ? { vocabId } : {}) };
}

/** The memory hook line, the same wording and place on every letter card and example-word card. Nothing when the chain has no entry. */
export const hookNode = (hk) => hookParagraph(el, hk);

/** "Easily confused with: X, Y. <hint>"; when the set holds only this letter (a mark pair such as shin/sin) the hint stands alone, never "confused with: ." */
function confusedHint(sets, key, c) {
  const others = [...new Set(sets.flatMap((s) => s.letters.filter((x) => x !== key)))].map((x) => c.letters.get(x)?.name || x);
  const hint = sets[0].hint || "";
  return others.length ? `Easily confused with: ${others.join(", ")}. ${hint}`.trim() : hint;
}

/**
 * After "Show answer": scroll (instantly, never animated) so the whole 2x2 / 1x4 rating group sits above a fixed bottom navigation bar.
 * Plain scrollIntoView stopped with the group under the bar on 375x667 whenever the answer was long. Re-checked after layout settles.
 */
function keepRatingsInView(box) {
  const doc = globalThis.document, win = globalThis.window || globalThis;
  if (!box?.getBoundingClientRect || !win?.scrollBy) { box?.scrollIntoView?.({ block: "nearest" }); return; }
  const fit = () => {
    const nav = doc?.querySelector?.(".site-nav");
    const navH = nav && win.getComputedStyle?.(nav)?.position === "fixed" ? nav.getBoundingClientRect().height : 0;
    const over = box.getBoundingClientRect().bottom - ((win.innerHeight || 0) - navH - 8);
    if (over > 0) win.scrollBy({ top: over, left: 0, behavior: "instant" });
  };
  fit();
  win.requestAnimationFrame?.(() => fit());
  win.setTimeout?.(fit, 250);
}

export function mountReview(root, ctx, { lessonId } = {}) {
  let alive = true;
  const wrap = el("section", { class: "alef-review", "aria-labelledby": "view-title" });
  root.append(wrap);
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, tr(ctx, "review.title", "Review"));
  wrap.append(h1);
  const congregation = ctx.settings?.get?.("congregation") || "sephardi";
  const stats = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let dueAtStart = 0, queue = [], pos = 0, revealed = false, content, wordVocab = {}, onKey = null, notDone = false, memKnown = new Set(), memReps = {};
  const describe = (id) => describeCard(id, content, congregation, wordVocab, { seed: hashSeed(id + ":" + (memReps[id] || 0)), known: memKnown });

  const body = el("div", { class: "alef-review-body" });
  wrap.append(body);
  // One-step undo for a slipped rating tap: puts the last card back as it was and shows it again.
  let lastRate = null;
  const undoNote = el("span", { class: "muted", role: "status", "aria-live": "polite" });
  const undoBtn = el("button", { type: "button", class: "btn secondary", id: "alef-undo-rate", onclick: async () => {
    if (!lastRate) return;
    const { snap, n } = lastRate; lastRate = null; undoBtn.hidden = true;
    let ok = false; try { ok = await restoreRating(ctx, snap); } catch { ok = false; }
    if (!alive) return;
    if (!ok) { undoNote.textContent = "Could not undo that rating."; return; }
    stats[n] = Math.max(0, stats[n] - 1); pos = Math.max(0, pos - 1);
    undoNote.textContent = "Undone. That card is back and your rating was not kept.";
    render(); h1.focus?.({ preventScroll: true });
  } }, "Undo last rating");
  undoBtn.hidden = true;
  wrap.append(el("p", { class: "row alef-undo-row" }, undoBtn, undoNote));

  async function start() {
    [content, wordVocab] = await Promise.all([loadContent(), loadWordVocabMap()]);
    if (lessonId) {
      const lesson = byId[lessonId];
      if (!lesson) { body.replaceChildren(el("p", { role: "alert" }, `There is no lesson "${lessonId}".`), el("a", { class: "btn", href: "#/learn" }, "All lessons")); return; }
      // only a completed lesson gets cards; an uncompleted one is not added to the learner's deck by a deep link
      const pre = await loadState(ctx);
      if (pre.completed[lessonId]) await addLessonCards(ctx, lesson); else notDone = true;
    }
    try { await syncMemoryCards(ctx, lessons); } catch { /* memory-chain cards are optional */ }
    const st = await loadState(ctx);
    if (!alive) return;
    memKnown = taughtFromCompleted(st.completed, lessons); memReps = Object.fromEntries(Object.values(st.cards).map((c) => [c.id, c.reps || 0]));
    queue = buildQueue(st.cards, Date.now(), { lessonId, lessons, confusables: content.confusables, limit: 20 }).map((c) => c.id);
    queue = queue.filter((id) => describe(id));
    dueAtStart = lessonId ? 0 : reviewsDue(st.cards, Date.now()); // the number Home and Learn show (src/lib/counts.js)
    render();
  }

  /** Memory-chain choice card: pick an answer; a miss shows the story and tip. Right counts as Good (or Easy on request), a miss as Again. */
  function renderMemChoice(d, note, rate) {
    const q = d.q, fb = el("div", { class: "alef-mem-fb" });
    const act = (label, n, primary) => el("button", { type: "button", class: "btn" + (primary ? "" : " secondary"), "data-rating": String(n), onclick: () => rate(n) }, label);
    const acts = el("div", { class: "row alef-mem-actions", hidden: "" });
    const block = choiceBlock(q, { onAnswer: ({ correct, picked }) => {
      revealed = true;
      fb.replaceChildren(...feedbackNodes(q, correct), playButton(ctx, d.audio[0], d.audio[1], "Listen", note));
      acts.replaceChildren(...(correct ? [act("Continue", 3, true), act("That was easy", 4)] : [act("Continue", 1, true)]));
      acts.hidden = false; { const b0 = acts.querySelector("button"); fb.id = "alef-mem-fb"; b0?.setAttribute?.("aria-describedby", "alef-mem-fb"); b0?.focus?.({ preventScroll: true }); } keepRatingsInView(acts); // Continue is focused: it carries the verdict as its description
      savePairOutcome(ctx, q.letterId, q.partners.filter((x) => q.options.some((o) => o.id === x)), correct ? null : picked).catch(() => {});
    } });
    onKey = (e) => block.onKey(e);
    body.replaceChildren(
      el("p", { class: "muted", role: "status" }, `Card ${pos + 1} of ${queue.length}${lessonId ? ` · ${byId[lessonId]?.title || lessonId}` : dueAtStart > queue.length ? ` · ${dueAtStart} due now; a session takes the first ${queue.length}` : ""}`),
      el("div", { class: "card alef-card" }, el("p", { class: "alef-mem-prompt" }, q.prompt), ...cueNodes(q), block.node, fb, acts, note),
      el("p", { class: "muted alef-keys" }, "Keyboard: press 1 to 4 to choose an answer."));
  }

  function summary() {
    const total = stats[1] + stats[2] + stats[3] + stats[4];
    loadState(ctx).then((st) => {
      if (!alive) return;
      const left = Object.values(st.cards).filter((c) => c.due <= Date.now()).length;
      body.replaceChildren(...[
        el("h2", {}, total ? "Session done" : "Nothing due"),
        total ? el("p", {}, `${total} card${total === 1 ? "" : "s"} reviewed: ${stats[1]} again, ${stats[2]} hard, ${stats[3]} good, ${stats[4]} easy.`)
          : el("p", {}, lessonId ? (notDone ? "Finish this lesson's quick check first. Its cards are added to your review when the lesson is complete." : "No cards from this lesson are due right now.") : "No reviews are due. Complete a lesson to add cards, or come back later."),
        el("p", { class: "muted" }, left ? `${left} card${left === 1 ? "" : "s"} still due (cards you rated Again return after 10 minutes).` : "All caught up."),
        !streakVisible(ctx) ? null : el("p", { class: "alef-streak" }, st.streak.count ? `Streak: ${st.streak.count} day${st.streak.count === 1 ? "" : "s"}${st.streak.activeToday ? "." : ". Study for 5 minutes today to add a day."}` : "A streak counts the days you study for 5 minutes or more."),
        el("div", { class: "row" }, left ? el("a", { class: "btn", href: "#/learn?review=1" }, "Keep reviewing") : null, el("a", { class: "btn secondary", href: "#/learn" }, "Lessons"), el("a", { class: "btn secondary", href: "#/" }, "Home"))].filter(Boolean));
    });
  }

  function render() {
    if (!alive) return;
    if (pos >= queue.length) return summary();
    revealed = false;
    const d = describe(queue[pos]);
    const note = el("p", { class: "alef-audio-note muted", role: "status", "aria-live": "polite" });
    const answerBox = el("div", { class: "alef-answer", tabindex: "-1", hidden: "" });
    const ratingBox = el("div", { class: "alef-ratings", role: "group", "aria-label": "How well did you remember it?", hidden: "" },
      ...RATINGS.map(([n, label, desc]) => el("button", { type: "button", class: "btn alef-rate alef-rate-" + n, "data-rating": String(n), "aria-label": `${n}, ${label}: ${desc}`, onclick: () => rate(n) },
        el("span", { class: "alef-rate-n" }, String(n)), " ", label)));
    const show = el("button", { type: "button", class: "btn", onclick: reveal }, tr(ctx, "review.show", "Show answer"));
    function reveal() {
      revealed = true;
      // Picture only on the answer side, and only for word cards with a vocab-id map entry and an approved image (ctx.img returns null otherwise: nothing rendered, no gap).
      const pic = d.vocabId ? ctx.img?.(el, { kind: "word", id: d.vocabId, class: "alef-review-pic", width: 400 }) : null;
      if (d.kind === "mem") answerBox.replaceChildren(...recallAnswerNodes(d.q), playButton(ctx, d.audio[0], d.audio[1], "Listen", note));
      else answerBox.replaceChildren(...[pic, ...(d.answerHe ? [heText(d.answerHe, "alef-he alef-word")] : []), ...d.answer.filter(Boolean).map((a, i) => el(i === 0 ? "strong" : "p", {}, uiEnglish(ctx, a))),
        d.respelling ? el("p", { class: "alef-respell", lang: "en" }, `Sounds like: ${d.respelling} (${LABELS[congregation] || congregation} style)`) : null,
        hookNode(d.hook ? hookLine(content.chain, congregation, d.hook) : null),
        d.hint ? el("p", { class: "muted alef-hint" }, d.hint) : null, playButton(ctx, d.audio[0], d.audio[1], "Listen", note)].filter(Boolean));
      answerBox.hidden = false; ratingBox.hidden = false; show.hidden = true;
      answerBox.focus?.({ preventScroll: true });
      keepRatingsInView(ratingBox);
    }
    async function rate(n) {
      if (!revealed) return;
      const id = queue[pos]; revealed = false;
      let snap = null; try { snap = await snapshotRating(ctx, id); } catch { snap = null; }
      try { await rateCard(ctx, id, n); lastRate = snap ? { snap, n } : null; undoBtn.hidden = !lastRate; undoNote.textContent = ""; } catch (e) {
        // A failed save must leave this card revealed and retryable: do not count the review or advance the queue.
        if (alive) { note.textContent = "Could not save: " + (e?.message || e) + ". Try rating this card again."; revealed = true; }
        return;
      }
      stats[n]++; pos++;
      try { globalThis.document?.dispatchEvent?.(new CustomEvent("alef:review-rated", { detail: { rating: n } })); } catch { /* optional: hearts and XP listen for this (src/retention/) */ }
      // Interference hint only after the learner's own miss (rating Again), at most once per error kind per session.
      let panel = null;
      if (n === 1) {
        const pc = parseCardId(id), err = pc && errorKindForCard(pc, content.confusables);
        if (err) panel = await hintPanel(ctx, { kind: err.kind, detail: err.detail }, () => { if (alive) { render(); refocusIfLost(wrap, "#view-title", h1); } });
      }
      if (!alive) return;
      if (panel) { body.replaceChildren(el("p", { class: "muted", role: "status" }, "That one will come back soon."), panel); h1.focus?.({ preventScroll: true }); return; }
      render();
      if (alive) h1.focus?.({ preventScroll: true });
    }
    if (d.kind === "mem" && d.q.type !== "recall") return renderMemChoice(d, note, rate);
    onKey = (e) => { if (revealed && shortcutsOn(ctx) && /^[1-4]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || "")) { e.preventDefault(); rate(Number(e.key)); } };
    body.replaceChildren(
      el("p", { class: "muted", role: "status" }, `Card ${pos + 1} of ${queue.length}${lessonId ? ` · ${byId[lessonId]?.title || lessonId}` : dueAtStart > queue.length ? ` · ${dueAtStart} due now; a session takes the first ${queue.length}` : ""}`),
      el("div", { class: "card alef-card" },
        el("p", { class: "muted" }, isAudioFree(ctx) ? silentPrompt(d.prompt) : d.prompt),
        heLabeled(d.he, d.frontLabel, "alef-he " + (d.big ? "alef-huge" : "alef-word-big")),
        show, answerBox, ratingBox, note),
      el("p", { class: "muted alef-keys" }, "Keyboard: after showing the answer, press 1 Again, 2 Hard, 3 Good, 4 Easy."));
  }

  const keyHandler = (e) => { if (shortcutsOn(ctx)) onKey && onKey(e); };
  globalThis.document?.addEventListener?.("keydown", keyHandler);
  start().catch((e) => { body.replaceChildren(el("p", { role: "alert" }, "The review did not start. Please reload the page and try again.")); });
  return () => { alive = false; globalThis.document?.removeEventListener?.("keydown", keyHandler); wrap.remove(); };
}
