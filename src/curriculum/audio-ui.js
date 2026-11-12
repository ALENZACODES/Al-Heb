import { el, tr } from "./dom.js";
import { audioAccess, NO_AUDIO, ladderStep, playWithState, voiceName } from "../shell/audio-access.js";
import { isSyntheticStatus, fileLabel } from "../shell/audio-labels.js";
import { REASONS } from "../shell/audio.js";
import { isAudioFree } from "../shell/audiofree.js";

/** Human wording for a play() failure code (e.g. "speech-error"); unknown codes pass through unchanged. */
export function reasonText(code) { return REASONS[code] || code || "unavailable"; }

/** Describe a play() result for display, honestly (recorded file vs browser voice vs nothing). */
export function describePlay(r) {
  if (!r) return "";
  if (r.source === "file") return isSyntheticStatus(r.entryStatus) ? `Playing a computer-made clip, not a recording: ${fileLabel(r.entryStatus, r.fileTradition || r.tradition, r.entrySource)}.` : "Playing a recorded file.";
  if (r.source === "tts-fallback" || r.played === true) return "Israeli voice.";
  return `No sound: ${reasonText(r.reason || r.error)}.`;
}

/** A play button, or an empty hidden span when the learner turned on "I do not use audio". `note` is an element whose text receives the honest source/status message. */
export function playButton(ctx, kind, id, label, note, extra = {}) {
  if (isAudioFree(ctx)) return el("span", { class: "alef-play-off", hidden: "" }); // "I do not use audio": no Listen button; the written text next to it carries the lesson
  const acc = audioAccess(ctx?.audio, kind, id, extra);
  if (acc.level === "none" && !acc.checking) {
    // U-02 ladder: no clip in the learner's own voice/tradition is not a dead
    // end — offer the other voice's clip (labelled) or the device voice.
    const step = ladderStep(ctx?.audio, kind, id, extra, ctx);
    if (!step) return el("span", { class: "audio-none muted", "data-audio-state": "none" }, NO_AUDIO);
    const playOpts = step.kind === 'voice' ? { ...extra, voice: step.voice } : { ...extra, allowMismatchedTts: true };
    const btnLabel = step.kind === 'voice' ? `Hear ${voiceName(step.voice)}` : 'Hear the device voice';
    const btn = el("button", { type: "button", class: "alef-play", "data-audio-state": "ladder", "data-ladder": step.kind, "aria-label": `${btnLabel} (${step.label})`,
      onclick: async () => {
        if (!ctx?.audio?.play) { if (note) note.textContent = "Audio is not available in this build."; return; }
        if (note) note.textContent = step.label;
        const r = await playWithState(ctx, btn, kind, id, playOpts);
        if (note && (!r || r.source === 'none')) note.textContent = NO_AUDIO;
      } }, el("span", { "aria-hidden": "true", "data-glyph": "" }, "▶"), " ", btnLabel);
    return el("span", { class: "audio-wrap" }, el("span", { class: "audio-none muted", "data-audio-state": "none" }, step.kind === 'voice' ? `No clip in ${voiceName(step.forVoice)} for this yet.` : 'No clip for this yet.'), " ", btn);
  }
  const btn = el("button", { type: "button", class: "alef-play", "aria-label": label,
    onclick: async () => {
      if (!ctx?.audio?.play) { if (note) note.textContent = "Audio is not available in this build."; return; }
      try { const r = await playWithState(ctx, btn, kind, id, extra); if (note) note.textContent = describePlay(r); }
      catch (e) { if (note) note.textContent = "No sound: the browser could not play this."; }
    } }, el("span", { "aria-hidden": "true", "data-glyph": "" }, "▶"), " ", tr(ctx, "learn.play", "Listen"));
  return btn;
}

/**
 * D-30: a "Slow" button beside Listen (the same clip at the beginner slow speed, 0.7x, played once). Normal speed stays the
 * default; slowing down is the learner's choice. Nothing is drawn when the learner uses no audio or there is no clip to slow.
 */
export function slowButton(ctx, kind, id, label, note, extra = {}) {
  if (isAudioFree(ctx)) return null;
  const acc = audioAccess(ctx?.audio, kind, id, extra);
  if (acc.level === "none") return null;
  const btn = el("button", { type: "button", class: "alef-play alef-play-slow", "aria-label": `${label}, slowly`,
    onclick: async () => {
      if (!ctx?.audio?.play) { if (note) note.textContent = "Audio is not available in this build."; return; }
      try { const r = await playWithState(ctx, btn, kind, id, { ...extra, rate: "slow", noEcho: true }); if (note) note.textContent = r && r.source !== "none" ? `Slow speed. ${describePlay(r)}` : describePlay(r); }
      catch (e) { if (note) note.textContent = "No sound: the browser could not play this."; }
    } }, el("span", { "aria-hidden": "true", "data-glyph": "" }, "▶"), " ", tr(ctx, "learn.slow", "Slow"));
  return btn;
}
