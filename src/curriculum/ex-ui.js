/** Shared bits for the round-4 exercise screens (ladder, fade-out, gender, scaffold). Plain DOM, no dependencies. */
import { plain } from "../shell/plain-copy.js";
import { el, tr } from "./dom.js";
import { describePlay } from "./audio-ui.js";
import { fileLabel } from "../shell/audio-labels.js";
import { isAudioFree } from "../shell/audiofree.js";
import { shortcutsOn } from "../shell/motor.js";

/** Draft / unreviewed notice shown on every exercise screen. `extra` adds screen-specific honesty lines. */
export function draftNotice(ctx, ...extra) {
  return el("div", { class: "alef-draft-notice card", role: "note" },
    el("p", {}, el("strong", {}, tr(ctx, "ex.draft", "Draft. ")),
      plain("exDraft")),
    ...extra.filter(Boolean).map((t) => el("p", { class: "muted" }, t)));
}

export const VOICE_NAMES = { m: "Man (Ari)", f: "Woman (Noa)" };

/** Current voice preference from settings ("m" | "f"), defaulting to "m". */
export function settingVoice(ctx) {
  const v = ctx?.settings?.get?.("voice") ?? ctx?.settings?.voice;
  return v === "f" ? "f" : "m";
}

/**
 * Honest status of an audio item for a voice, WITHOUT playing: { source: "file"|"tts-fallback"|"none", label }.
 * Uses ctx.audio.status when the player offers it, else ctx.audio.has.
 */
export function audioStatus(ctx, kind, id, voice) {
  const a = ctx?.audio;
  if (!a) return { source: "none", label: "No audio yet (no audio engine in this build)." };
  try {
    if (typeof a.status === "function") {
      const s = a.status(kind, id, { voice });
      if (s.source === "file") return { source: "file", label: fileLabel(s.entryStatus) + "." };
      if (s.source === "tts-fallback") return { source: "tts-fallback", label: "Only the browser's built-in voice (text-to-speech); it may not match the man/woman choice." };
      if (s.reason === "checking audio...") return { source: "none", checking: true, label: "Checking audio..." };
      return { source: "none", label: "No audio yet" + (s.reason ? ` (${s.reason})` : "") + "." };
    }
    if (typeof a.has === "function") return a.has(kind, id, { voice }) ? { source: "file", label: fileLabel(undefined) + "." } : { source: "none", label: "No audio file yet for this item." };
  } catch { /* fall through */ }
  return { source: "none", label: "No audio yet." };
}

/** A play button that plays (kind,id) in `voice` and writes the honest outcome into `note`. */
export function voiceButton(ctx, kind, id, voice, label, note) {
  if (isAudioFree(ctx)) return el("span", { class: "muted alef-noaudio" }, "Sound is switched off in Settings (I do not use audio).");
  return el("button", { type: "button", class: "btn secondary alef-play alef-voice-btn", "data-voice": voice, "data-audio": `${kind}/${id}`, "aria-label": label,
    onclick: async () => {
      let st = audioStatus(ctx, kind, id, voice);
      if (st.checking && typeof ctx.audio.ensureManifest === "function") { if (note) note.textContent = st.label; await ctx.audio.ensureManifest(); st = audioStatus(ctx, kind, id, voice); }
      if (st.source === "none") { if (note) note.textContent = st.label; return; }
      try { const r = await ctx.audio.play(kind, id, { voice }); if (note) note.textContent = describePlay(r) + (st.source === "tts-fallback" ? " The voice gender is chosen by your device, not by this button." : ""); }
      catch (e) { if (note) note.textContent = "No sound: the browser could not play this."; }
    } }, el("span", { "aria-hidden": "true" }, "▶"), " ", label);
}

/** Radio-style man/woman voice selector. Returns {node, get(), onChange(fn)}. */
export function voiceSelector(ctx, initial) {
  let value = initial === "f" ? "f" : "m";
  const subs = [];
  const btns = ["m", "f"].map((v) => el("button", { type: "button", class: "btn secondary alef-voice-choice", "data-voice": v, role: "radio",
    "aria-checked": String(v === value),
    onclick: () => { value = v; sync(); subs.forEach((f) => f(v)); } }, VOICE_NAMES[v]));
  function sync() { btns.forEach((b) => b.setAttribute("aria-checked", String(b.getAttribute("data-voice") === value))); }
  const node = el("div", { class: "alef-voice-select row", role: "radiogroup", "aria-label": "Voice" }, el("span", { class: "muted" }, "Voice: "), ...btns);
  return { node, get: () => value, onChange: (f) => subs.push(f) };
}

/** Add a keydown listener on document; returns a remover. Ignores keys typed in form fields and modified keys. */
export function onKeys(handler) {
  const f = (e) => {
    if (!shortcutsOn()) return; // Settings > "Single-key shortcuts" is off
    if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || "")) return;
    handler(e);
  };
  globalThis.document?.addEventListener?.("keydown", f);
  return () => globalThis.document?.removeEventListener?.("keydown", f);
}
