/** Syllable ladder (gr-alh-01). #/learn?ladder=1[&level=n][&seed=n]. Hear a syllable, pick the matching written card of two. */
import { el, heText, tr, replaceKeepingFocus, storeGet } from "./dom.js";
import { loadLadder, createLadderSession, STREAK_UP } from "./ladder.js";
import { loadContent } from "./content.js";
import { LADDER_KEY, saveLadder } from "./actions.js";
import { draftNotice, audioStatus, onKeys } from "./ex-ui.js";
import { audioButton } from "../shell/audio-access.js";
import { describePlay } from "./audio-ui.js";
import { SETTING_LABELS } from "../traditions/model.js";
import { isAudioFree, SKIP_NOTE, AUDIO_FREE_NOTE, syllableByName } from "../shell/audiofree.js";

export function mountLadder(root, ctx, q = {}) {
  let alive = true, offKeys = () => {}, saveOnLeave = null;
  const wrap = el("section", { class: "alef-ladder", "aria-labelledby": "view-title" });
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, tr(ctx, "ladder.title", "Syllable ladder"));
  root.append(wrap);
  const congregation = ctx?.settings?.get?.("congregation") || "sephardi";

  (async () => {
    const [ladder, content, saved] = await Promise.all([loadLadder(), loadContent(), storeGet(ctx, LADDER_KEY, {})]);
    if (!alive) return;
    const startLevel = Number(q.level) || saved.level || 1;
    const session = createLadderSession(ladder, { seed: Number(q.seed) || Date.now() % 100000, level: startLevel });
    let locked = false, cards = [], cur = null, finished = false;
    saveOnLeave = () => { const st = session.state(); if (!finished && st.answered) saveLadder(ctx, st).catch(() => {}); };
    const note = el("p", { class: "alef-audio-note muted", role: "status", "aria-live": "polite" });
    const silent = isAudioFree(ctx);
    const fb = el("div", { class: "alef-feedback", role: "status", "aria-live": "polite" });
    

    const intro = [draftNotice(ctx,
      silent ? AUDIO_FREE_NOTE : `Sounds come from your tradition setting (${SETTING_LABELS[congregation] || congregation}). No recorded teacher exists: if there is no clip, you hear your browser's built-in voice or nothing, and the note under the cards says which.`,
      "Look-alike and sound-alike choices come from the letter and vowel data files; the sound-alike rules are drafts not checked by a native speaker.")];

    function glyphWithHighlight(item) {
      // letter-by-letter breakdown shown after an answer: letter, then the vowel family it carries
      const L = content.letters.get(item.letter);
      return el("p", { class: "alef-breakdown" }, heText(item.glyph, "alef-he alef-huge"), " = ", L ? L.name : item.letter, item.vowel ? ` + ${item.vowel}` : " (final form)");
    }
    function play() {
      if (!cur || silent) return;
      const it = cur.item;
      const st = audioStatus(ctx, it.audioKind, it.audioId, ctx?.settings?.get?.("voice"));
      if (!ctx?.audio?.play || st.source === "none") { note.textContent = st.source === "none" ? st.label + " Read the cards and guess; the answer will be shown." : ""; return; }
      ctx.audio.play(it.audioKind, it.audioId).then((r) => { if (alive) note.textContent = describePlay(r); }).catch((e) => { if (alive) note.textContent = "No sound: the browser could not play this."; });
    }
    function draw() {
      if (!alive) return;
      cur = session.current();
      if (!cur) return finish();
      locked = false;
      const s = session.state();
      cards = cur.options.map((o, i) => el("button", { type: "button", class: "alef-card-opt btn secondary", "data-option": o.id, "aria-label": `Card ${i + 1}: ${o.glyph}`, onclick: () => pick(o.id) },
        el("span", { class: "alef-key" }, String(i + 1)), " ", heText(o.glyph, "alef-he alef-huge")));
      fb.replaceChildren();
      replaceKeepingFocus(wrap, h1, ...intro,
        el("div", { class: "alef-levelbar" },
          el("progress", { max: String(ladder.levels.length), value: String(cur.level), "aria-label": "Ladder level", style: "display:block;inline-size:100%;block-size:10px" })),
        el("p", { role: "status", class: "alef-levelstatus", style: "margin:.4rem 0" }, `Level ${cur.level} of ${ladder.levels.length}. ${s.streak} of ${STREAK_UP} in a row.`),
        silent
          ? el("p", { class: "alef-silent-prompt" }, `Find the card for: ${syllableByName(content.letters.get(cur.item.letter)?.name || cur.item.letter, cur.item.vowel)}. (Reading version: you chose "I do not use audio".)`)
          : el("p", {}, tr(ctx, "ladder.prompt", "Listen, then choose the matching card.")),
        silent ? null : audioButton(el, ctx, { kind: cur.item.audioKind, id: cur.item.audioId, voice: ctx?.settings?.get?.("voice"), label: "Listen again (R)", class: "btn alef-play" }),
        el("div", { class: "row alef-cardpair", dir: "rtl" }, ...cards), note, fb,
        el("p", { class: "row" },
          el("button", { type: "button", class: "btn secondary", "data-act": "skip", onclick: () => { if (locked || finished) return; session.skip(); draw(); } }, "Skip this card"),
          el("button", { type: "button", class: "btn secondary", onclick: finish }, "Finish and save")),
        el("p", { class: "muted" }, SKIP_NOTE),
        el("p", { class: "muted alef-keys" }, "Keyboard: 1 or 2 picks a card, R plays the sound again."));
      play();
    }
    async function pick(id) {
      if (locked || finished) return; locked = true;
      const r = session.answer(id), item = cur.item;
      cards.forEach((b) => { b.disabled = true; if (b.getAttribute("data-option") === item.id) b.className += " alef-correct"; else if (b.getAttribute("data-option") === id) b.className += " alef-wrong"; });
      const msg = r.correct ? "Right." : (silent ? "Not quite: it was the other card." : "Not quite: the sound was the other card.");
      const ev = r.event === "advance" ? ` Level up to ${r.level}.` : r.event === "drop" ? ` Two misses in a row: back to level ${r.level}.` : r.event === "cleared" ? " You cleared the ladder." : "";
      fb.replaceChildren(el("p", {}, msg + ev), glyphWithHighlight(item),
        el("button", { type: "button", class: "btn alef-next", onclick: () => (r.finished ? finish() : draw()) }, r.finished ? "See results" : "Next"));
      fb.querySelector?.(".alef-next")?.focus?.();
    }
    async function finish() {
      if (finished) return; finished = true;
      const st = session.state();
      await saveLadder(ctx, st);
      if (!alive) return;
      const verse = content.corpus.get("bless-priestly-1");
      replaceKeepingFocus(wrap, h1, ...intro,
        el("h2", {}, st.cleared ? "Ladder cleared" : "Saved"),
        el("p", {}, `${st.answered} answered, ${st.missed.length} item${st.missed.length === 1 ? "" : "s"} missed (sent to your review queue), reached level ${st.best}. You resume at level ${st.cleared ? 1 : st.level}.`),
        st.cleared && verse ? el("div", { class: "card alef-unlock" }, el("p", {}, "Unlocked: the opening of the Priestly Blessing (", verse.ref, ")."), heText(verse.he, "alef-he alef-word-big"),
          el("p", { class: "muted" }, `Text status in the corpus: ${verse.status}${verse.proofread === false ? "; not proofread by a person" : ""}.`)) : null,
        el("div", { class: "row" }, el("a", { class: "btn", href: "#/learn?ladder=1" }, "Practise again"), el("a", { class: "btn secondary", href: "#/learn?review=1" }, "Review now"), el("a", { class: "btn secondary", href: "#/learn" }, "All lessons")));
    }
    offKeys = onKeys((e) => {
      if (finished || !cur) return;
      if (e.key === "1" || e.key === "2") { if (!locked) { e.preventDefault(); cur.options[Number(e.key) - 1] && pick(cur.options[Number(e.key) - 1].id); } }
      else if (e.key === "r" || e.key === "R") play();
    });
    draw();
  })().catch((e) => { wrap.replaceChildren(h1, el("p", { role: "alert" }, "Could not start the ladder. Reload the page, then try again.")); });
  return () => { alive = false; offKeys(); saveOnLeave?.(); wrap.remove(); };
}
