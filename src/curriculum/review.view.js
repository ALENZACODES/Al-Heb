/**
 * Review session over due SRS cards (letters, vowels, words from completed lessons).
 * Deep links: #/learn?review=1 (all due) and #/learn?lesson=<id>&review=1 (that lesson's cards; created if missing).
 * Rating buttons 1-4 (keyboard 1-4 once the answer is shown) call srs.review via actions.rateCard.
 */
import { lessons, byId } from "./lessons.js";
import { el, heText, tr } from "./dom.js";
import { loadContent, vowelEnglish, vowelIpa } from "./content.js";
import { loadJSON } from "./data.js";
import { loadState, rateCard, addLessonCards } from "./actions.js";
import { buildQueue, parseCardId, wordAudioId, confusableMap } from "./progress.js";
import { playButton } from "./audio-ui.js";
import { hintPanel } from "./hint-ui.js";
import { errorKindForCard } from "./hints.js";
import { fade } from "./fade.js";
import { letterSound } from "../pronunciation/forTradition.js";

const RATINGS = [[1, "Again", "forgot it"], [2, "Hard", "got it with effort"], [3, "Good", "got it"], [4, "Easy", "no effort"]];

/** Lesson word -> vocab id (data/curriculum/word-vocab-map.json, built by tools/curriculum/word_ids.mjs by exact match). Empty map if the file cannot load. */
export function loadWordVocabMap() {
  return loadJSON("data/curriculum/word-vocab-map.json").then((d) => d?.map || {}, () => ({}));
}

/** Front/back description of a card. `wordVocab` (optional) adds `vocabId` to word cards that have a map entry, so the answer side can show the vocab picture. */
export function describeCard(cardId, c, congregation, wordVocab = null) {
  const p = parseCardId(cardId);
  if (!p) return null;
  if (p.kind === "letter") {
    const L = c.letters.get(p.key); if (!L) return null;
    const sets = (c.confusables?.sets || []).filter((s) => s.letters.includes(p.key));
    return { kind: "letter", prompt: "Name this letter and say its sound.", he: L.he, big: true, audio: ["letter", p.key],
      answer: [L.name + (L.nameHe ? "" : ""), letterSound(c.consonants?.get(p.key), congregation, { fallbackEn: L.sound?.en || "" }).en], answerHe: L.nameHe,
      hint: sets.length ? `Easily confused with: ${[...new Set(sets.flatMap((s) => s.letters.filter((x) => x !== p.key)))].map((x) => c.letters.get(x)?.name || x).join(", ")}. ${sets[0].hint}` : "" };
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
      answer: [e.english || e.title || ""], answerHe: e.he, hint: "Corpus text: compared with its source by a machine, not proofread by a person." };
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
    answer: [w.en], answerHe: "", hint: "", ...(vocabId ? { vocabId } : {}) };
}

export function mountReview(root, ctx, { lessonId } = {}) {
  let alive = true;
  const wrap = el("section", { class: "alef-review", "aria-labelledby": "view-title" });
  root.append(wrap);
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, tr(ctx, "review.title", "Review"));
  wrap.append(h1);
  const congregation = ctx.settings?.get?.("congregation") || "sephardi";
  const stats = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let queue = [], pos = 0, revealed = false, content, wordVocab = {}, onKey = null;

  const body = el("div", { class: "alef-review-body" });
  wrap.append(body);

  async function start() {
    [content, wordVocab] = await Promise.all([loadContent(), loadWordVocabMap()]);
    if (lessonId) {
      const lesson = byId[lessonId];
      if (!lesson) { body.replaceChildren(el("p", { role: "alert" }, `There is no lesson "${lessonId}".`), el("a", { class: "btn", href: "#/learn" }, "All lessons")); return; }
      await addLessonCards(ctx, lesson);
    }
    const st = await loadState(ctx);
    if (!alive) return;
    queue = buildQueue(st.cards, Date.now(), { lessonId, lessons, confusables: content.confusables, limit: 20 }).map((c) => c.id);
    queue = queue.filter((id) => describeCard(id, content, congregation, wordVocab));
    render();
  }

  function summary() {
    const total = stats[1] + stats[2] + stats[3] + stats[4];
    loadState(ctx).then((st) => {
      if (!alive) return;
      const left = Object.values(st.cards).filter((c) => c.due <= Date.now()).length;
      body.replaceChildren(...[
        el("h2", {}, total ? "Session done" : "Nothing due"),
        total ? el("p", {}, `${total} card${total === 1 ? "" : "s"} reviewed: ${stats[1]} again, ${stats[2]} hard, ${stats[3]} good, ${stats[4]} easy.`)
          : el("p", {}, lessonId ? "No cards from this lesson are due right now." : "No reviews are due. Complete a lesson to add cards, or come back later."),
        el("p", { class: "muted" }, left ? `${left} card${left === 1 ? "" : "s"} still due (cards you rated Again return after 10 minutes).` : "All caught up."),
        el("p", { class: "alef-streak" }, st.streak.count ? `Streak: ${st.streak.count} day${st.streak.count === 1 ? "" : "s"}${st.streak.activeToday ? "" : ". Today counts after 5 minutes of study."}` : "A day counts toward a streak after 5 minutes of study."),
        el("div", { class: "row" }, left ? el("a", { class: "btn", href: "#/learn?review=1" }, "Keep reviewing") : null, el("a", { class: "btn secondary", href: "#/learn" }, "Lessons"), el("a", { class: "btn secondary", href: "#/" }, "Home"))].filter(Boolean));
    });
  }

  function render() {
    if (!alive) return;
    if (pos >= queue.length) return summary();
    revealed = false;
    const d = describeCard(queue[pos], content, congregation, wordVocab);
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
      answerBox.replaceChildren(...[pic, ...(d.answerHe ? [heText(d.answerHe, "alef-he alef-word")] : []), ...d.answer.filter(Boolean).map((a, i) => el(i === 0 ? "strong" : "p", {}, a)),
        d.hint ? el("p", { class: "muted alef-hint" }, d.hint) : null, playButton(ctx, d.audio[0], d.audio[1], "Listen", note)].filter(Boolean));
      answerBox.hidden = false; ratingBox.hidden = false; show.hidden = true;
      answerBox.focus?.({ preventScroll: true });
      ratingBox.scrollIntoView?.({ block: "nearest" });
    }
    async function rate(n) {
      if (!revealed) return;
      const id = queue[pos]; revealed = false;
      try { await rateCard(ctx, id, n); } catch (e) {
        if (alive) { note.textContent = "Could not save: " + (e?.message || e) + ". Try rating this card again."; revealed = true; }
        return;
      }
      stats[n]++; pos++;
      // Interference hint only after the learner's own miss (rating Again), at most once per error kind per session.
      let panel = null;
      if (n === 1) {
        const pc = parseCardId(id), err = pc && errorKindForCard(pc, content.confusables);
        if (err) panel = await hintPanel(ctx, { kind: err.kind, detail: err.detail }, () => { if (alive) { render(); h1.focus?.({ preventScroll: true }); } });
      }
      if (!alive) return;
      if (panel) { body.replaceChildren(el("p", { class: "muted", role: "status" }, "That one will come back soon."), panel); return; }
      render();
      if (alive) h1.focus?.({ preventScroll: true });
    }
    onKey = (e) => { if (revealed && /^[1-4]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || "")) { e.preventDefault(); rate(Number(e.key)); } };
    body.replaceChildren(
      el("p", { class: "muted", role: "status" }, `Card ${pos + 1} of ${queue.length}${lessonId ? ` · ${byId[lessonId]?.title || lessonId}` : ""}`),
      el("div", { class: "card alef-card" },
        el("p", { class: "muted" }, d.prompt),
        heText(d.he, "alef-he " + (d.big ? "alef-huge" : "alef-word-big")),
        show, answerBox, ratingBox, note),
      el("p", { class: "muted alef-keys" }, "Keyboard: after showing the answer, press 1 Again, 2 Hard, 3 Good, 4 Easy."));
  }

  const keyHandler = (e) => onKey && onKey(e);
  globalThis.document?.addEventListener?.("keydown", keyHandler);
  start().catch((e) => { body.replaceChildren(el("p", { role: "alert" }, "Could not start the review: " + (e?.message || e))); });
  return () => { alive = false; globalThis.document?.removeEventListener?.("keydown", keyHandler); wrap.remove(); };
}
