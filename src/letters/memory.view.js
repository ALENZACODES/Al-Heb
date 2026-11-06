/**
 * DOM pieces for memory-chain retrieval practice (model: ./memory.js). Shared by the Review screen (spaced cards) and the Letters screen
 * (a short practice round). Plain DOM, no dependencies. A wrong answer is met with the chain's story and tip, not a verdict.
 */
import { el, heText, storeSet, CARDS_KEY } from "../curriculum/dom.js";
import { loadContent } from "../curriculum/content.js";
import { loadState, savePairOutcome, taughtFromCompleted } from "../curriculum/actions.js";
import { createSession, hashSeed } from "../curriculum/exercises.session.js";
import { applyOutcomesToCards } from "../curriculum/progress.js";
import { lessons } from "../curriculum/lessons.js";
import { loadMorphSvg } from "./memorycard.js";
import { buildMemoryQuestion, memoryFeedback, memCardId, spreadConfusables, partnersOf, CHOICE_TYPES, MEM_TYPES, canAsk } from "./memory.js";
import { congregationOf } from "../pronunciation/forTradition.js";
import { SCENE, picture } from "../img/scenes.js";

/**
 * The picture (assets/letters/morph/<id>.svg, shown in its picture state: the letter is hidden), fetched and sanitised by the memory card
 * module, then inlined so it follows the theme. Its <title>/<desc> are removed so a hover tooltip cannot name the letter. Until it loads, or
 * when it cannot, the picture's description in words is shown. With `toggle`, a button flips between the picture and the letter inside it.
 */
export function pictureNode(q, { cls = "alef-mem-pic", toggle = false } = {}) {
  const p = q.picture || {}, alt = p.alt || p.idea || "";
  const box = el("div", { class: cls + "-box" });
  const fallback = alt ? el("p", { class: cls + "-text muted", lang: "en" }, `Picture: ${alt}`) : null;
  if (fallback) box.append(fallback);
  if (p.src && globalThis.DOMParser) loadMorphSvg(p.src).then((clean) => {
    if (!clean) return;
    try {
      const doc = new DOMParser().parseFromString(clean, "image/svg+xml"), root = doc.documentElement;
      if (!root || root.nodeName.toLowerCase() !== "svg" || doc.querySelector("parsererror")) return;
      const svg = document.importNode(root, true);
      for (const t of svg.querySelectorAll("title, desc")) t.remove();
      svg.setAttribute("class", (svg.getAttribute("class") || "") + " " + cls); svg.removeAttribute("width"); svg.removeAttribute("height");
      svg.setAttribute("role", "img"); svg.removeAttribute("aria-hidden"); if (alt) svg.setAttribute("aria-label", alt);
      box.replaceChildren(svg);
      if (toggle) {
        const b = el("button", { type: "button", class: "btn secondary alef-mem-flip", "aria-pressed": "false", onclick: () => {
          const on = svg.classList.toggle("morph-show-a"); b.setAttribute("aria-pressed", String(on)); }}, "Show the letter inside the picture");
        box.append(b);
      }
    } catch { /* keep the words */ }
  });
  return box;
}

/** The part of the prompt that is the cue itself: a picture, a sound hook, or a Hebrew word. */
export function cueNodes(q) {
  const out = [];
  if (q.type === "pic") out.push(pictureNode(q));
  if (q.type === "hook") out.push(el("p", { class: "alef-mem-cue", lang: "en" }, q.cue));
  if (q.type === "word") out.push(heText(q.promptHe, "alef-he alef-word-big"));
  if (q.type === "recall") out.push(heText(q.promptHe, "alef-he alef-huge"));
  return out.filter(Boolean);
}

/** What to say after an answer (words from memoryFeedback). */
export function feedbackNodes(q, correct) {
  const f = memoryFeedback(q, correct);
  return [el("p", { class: "alef-mem-lead", role: "status" }, f.lead),
    f.story ? el("p", { class: "alef-mem-story", lang: "en" }, el("strong", {}, "Story: "), f.story) : null,
    f.tip ? el("p", { class: "alef-mem-tip muted", lang: "en" }, el("strong", {}, "Tip: "), f.tip) : null,
    ...f.notes.map((n) => el("p", { class: "muted", lang: "en" }, n)),
    f.respelling ? el("p", { class: "alef-respell", lang: "en" }, `Sounds like: ${f.respelling}`) : null].filter(Boolean);
}

/**
 * Option buttons for a choice question. Calls onAnswer({correct, picked}) once; afterwards the options are locked and marked.
 * Keys 1-4 pick an option (only while unanswered). Returns { node, onKey, lock }.
 */
export function choiceBlock(q, { onAnswer }) {
  let done = false;
  const buttons = q.options.map((o, i) => el("button", { type: "button", class: "btn secondary alef-mem-opt", "data-opt": String(i), "aria-label": `${i + 1}. ${o.text}${o.sub ? `, ${o.sub}` : ""}`,
    onclick: () => pick(i) },
    el("span", { class: "alef-mem-optn", "aria-hidden": "true" }, String(i + 1)), " ",
    o.he ? heText(o.he, "alef-he alef-mem-glyph") : null,
    el("span", { class: "alef-mem-optt" }, o.text), o.sub ? el("span", { class: "alef-mem-subt muted" }, o.sub) : null));
  function pick(i) {
    if (done) return; done = true;
    const correct = i === q.answerIndex;
    buttons.forEach((b, k) => { b.disabled = true; if (k === q.answerIndex) b.classList.add("alef-mem-right"); else if (k === i) b.classList.add("alef-mem-miss"); });
    onAnswer({ correct, picked: q.options[i].id });
  }
  const node = el("div", { class: "alef-mem-opts", role: "group", "aria-label": "Choices" }, ...buttons);
  const onKey = (e) => { if (!done && /^[1-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey && Number(e.key) <= buttons.length) { e.preventDefault(); pick(Number(e.key) - 1); } };
  return { node, onKey };
}

/** The flip side of a recall card: the picture (with a button to see the letter inside it), hook, word, story. */
export function recallAnswerNodes(q) {
  return [pictureNode(q, { toggle: true }), ...q.answerLines.map((a, i) => el(i === 0 ? "strong" : "p", { lang: "en" }, a)),
    ...q.soundNotes.map((n) => el("p", { class: "muted", lang: "en" }, n)),
    q.respelling ? el("p", { class: "alef-respell", lang: "en" }, `Sounds like: ${q.respelling}`) : null,
    q.story ? el("p", { class: "alef-mem-story", lang: "en" }, q.story) : null,
    q.tip ? el("p", { class: "muted", lang: "en" }, q.tip) : null].filter(Boolean);
}

/** Everything the question builder needs, from the shared content plus the learner's setting and progress. */
export async function memoryEnv(ctx) {
  const c = await loadContent(), st = await loadState(ctx);
  return { chain: c.chain, letters: c.letters, consonants: c.consonants, confusables: c.confusables, tradition: congregationOf(ctx?.settings),
    known: taughtFromCompleted(st.completed, lessons), cards: st.cards, completed: st.completed };
}

/**
 * A short practice round for the Letters screen: choice questions on the letters the learner has met (a starter set when none yet),
 * look-alikes spread apart, first answers recorded in the spaced-review deck as mem:<letter>:<type> cards.
 */
export async function mountMemoryPractice(host, ctx, { onExit, size = 8 } = {}) {
  let alive = true;
  const env = await memoryEnv(ctx);
  if (!env.chain?.size) { host.replaceChildren(el("p", { class: "muted", role: "status" }, "Memory-chain practice is not available yet."), el("button", { type: "button", class: "btn secondary", onclick: () => onExit?.() }, "Back")); return () => {}; }
  const pool = [...env.known].filter((id) => env.chain.has(id));
  const ids = pool.length >= 3 ? pool : [...env.chain.keys()].filter((id) => !/-final$/.test(id)).slice(0, 6);
  const seed = Date.now() & 0xffff;
  const wanted = ids.flatMap((id) => CHOICE_TYPES.filter((t) => canAsk(t, env.chain.get(id), env.letters, id)).map((t) => memCardId(id, t)));
  const picked = spreadConfusables(wanted.sort((a, b) => hashSeed(a + seed) - hashSeed(b + seed)).slice(0, size), (id) => partnersOf(env.confusables, id), { gap: 3 });
  const items = picked.map((id) => { const [, letterId, type] = id.split(":"); return { id, q: buildMemoryQuestion(type, letterId, env, { seed }) }; }).filter((x) => x.q);
  const session = createSession(items.map((x) => ({ id: x.id })), { retry: true });
  const byId = new Map(items.map((x) => [x.id, x.q]));
  const outcomes = [];
  const box = el("div", { class: "alef-mem-practice" });
  const card = picture(el, ctx, "id", SCENE.storyPostcard, { width: 640, class: "scene-art" });
  const market = picture(el, ctx, "id", SCENE.storySeaside, { width: 640, class: "scene-art" });
  host.replaceChildren(box);
  if (card) box.append(card);
  if (market) box.append(market);
  let keyHandler = null;
  const done = () => { document.removeEventListener("keydown", keyHandler); keyHandler = null; };

  function step() {
    if (!alive) return;
    const cur = session.current();
    if (!cur) return finish();
    const q = byId.get(cur.id), p = session.progress();
    let block;
    const next = el("button", { type: "button", class: "btn", hidden: "", onclick: () => step() }, "Next");
    const fb = el("div", { class: "alef-mem-fb", "aria-live": "polite" });
    block = choiceBlock(q, { onAnswer: ({ correct, picked: pickedId }) => {
      const first = session.answer(correct)?.first;
      fb.replaceChildren(...feedbackNodes(q, correct));
      next.hidden = false; fb.id = "alef-mem-fb"; next.setAttribute("aria-describedby", "alef-mem-fb"); next.focus?.({ preventScroll: true }); // the verdict is the focused button's description
      if (first) {
        outcomes.push({ id: q.id, kind: "mem", good: correct, create: true });
        savePairOutcome(ctx, q.letterId, q.partners.filter((p2) => q.options.some((o) => o.id === p2)), correct ? null : pickedId).catch(() => {});
      }
    } });
    if (keyHandler) document.removeEventListener("keydown", keyHandler);
    keyHandler = (e) => block.onKey(e); document.addEventListener("keydown", keyHandler);
    box.replaceChildren(
      el("p", { class: "muted", role: "status" }, `Question ${Math.min(p.resolved + 1, p.total)} of ${p.total}`),
      el("div", { class: "card alef-card" }, el("p", { class: "alef-mem-prompt" }, q.prompt), ...cueNodes(q), block.node, fb, next),
      el("p", { class: "muted alef-keys" }, "Keyboard: press 1 to 4 to choose."));
  }
  async function finish() {
    done();
    try { const st = await loadState(ctx), now = Date.now(); await storeSet(ctx, CARDS_KEY, applyOutcomesToCards(st.cards, outcomes, now)); } catch { /* best effort */ }
    const s = session.stats();
    box.replaceChildren(el("h2", {}, "Round done"), el("p", {}, s.answered ? `${s.right} of ${s.answered} right first time. The ones you missed come back in your review.` : "Nothing answered."),
      el("button", { type: "button", class: "btn secondary", onclick: () => onExit?.() }, "Back to the letters"));
  }
  if (!items.length) { box.replaceChildren(el("p", { class: "muted", role: "status" }, "No memory questions for these letters yet."), el("button", { type: "button", class: "btn secondary", onclick: () => onExit?.() }, "Back")); return () => {}; }
  step();
  return () => { alive = false; done(); host.replaceChildren(); };
}

export { MEM_TYPES };
