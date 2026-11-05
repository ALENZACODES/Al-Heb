import { el, tr } from "./dom.js";
import { audioAccess, NO_AUDIO } from "../shell/audio-access.js";
import { REASONS } from "../shell/audio.js";
import { isAudioFree } from "../shell/audiofree.js";

/** Human wording for a play() failure code (e.g. "speech-error"); unknown codes pass through unchanged. */
export function reasonText(code) { return REASONS[code] || code || "unavailable"; }

/** Describe a play() result for display, honestly (recorded file vs browser voice vs nothing). */
export function describePlay(r) {
  if (!r) return "";
  if (r.source === "file") return "Playing a recorded file.";
  if (r.source === "tts-fallback" || r.played === true) return "Device voice, not a recorded teacher; Israeli-style only.";
  return `No sound: ${reasonText(r.reason || r.error)}.`;
}

/** A play button, or an empty hidden span when the learner turned on "I do not use audio". `note` is an element whose text receives the honest source/status message. */
export function playButton(ctx, kind, id, label, note, extra = {}) {
  if (isAudioFree(ctx)) return el("span", { class: "alef-play-off", hidden: "" }); // "I do not use audio": no Listen button; the written text next to it carries the lesson
  const acc = audioAccess(ctx?.audio, kind, id, extra);
  if (acc.level === "none" && !acc.checking) return el("span", { class: "audio-none muted", "data-audio-state": "none" }, NO_AUDIO);
  return el("button", { type: "button", class: "alef-play", "aria-label": label,
    onclick: async () => {
      if (!ctx?.audio?.play) { if (note) note.textContent = "Audio is not available in this build."; return; }
      try { const r = await ctx.audio.play(kind, id, extra); if (note) note.textContent = describePlay(r); }
      catch (e) { if (note) note.textContent = "No sound: " + (e?.message || e); }
    } }, el("span", { "aria-hidden": "true" }, "▶"), " ", tr(ctx, "learn.play", "Listen"));
}
