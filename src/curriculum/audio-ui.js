import { el, tr } from "./dom.js";
import { audioAccess, NO_AUDIO } from "../shell/audio-access.js";
import { REASONS } from "../shell/audio.js";
import { isAudioFree } from "../shell/audiofree.js";
import { clipPhonetic, englishSay, learnerFields, SAY_LEGEND, FILE_RATES, SPEED_CHOICES } from "../shell/clip-labels.js";

const WORD_LINE = new Set(["word", "line"]);

/** Save the shared playback speed. Accepts settings.set({playbackRate}) and the older set(key, value) test doubles. */
export function setPlaybackRate(settings, id) {
  if (!FILE_RATES[id] || !settings || typeof settings.set !== "function") return;
  if (settings.set.length >= 2) settings.set("playbackRate", id);
  else settings.set({ playbackRate: id });
}

/** Normal / Slow / Slower. `makeEl` defaults to the curriculum element helper; other views can pass their own. */
export function playbackSpeedControl(ctx, makeEl = el) {
  const cur = ctx?.settings?.get?.("playbackRate") || "normal";
  const buttons = [];
  const group = makeEl("div", { class: "clip-speed", role: "group", "aria-label": "Playback speed" });
  for (const [id, name] of SPEED_CHOICES) {
    const b = makeEl("button", {
      type: "button", class: "clip-speed-btn", "data-rate": id,
      "aria-pressed": cur === id ? "true" : "false",
    }, name);
    b.addEventListener("click", () => {
      setPlaybackRate(ctx?.settings, id);
      for (const x of buttons) x.setAttribute("aria-pressed", x.getAttribute("data-rate") === id ? "true" : "false");
    });
    buttons.push(b);
    group.append(b);
  }
  return group;
}

function paintClip(nodes, ctx, kind, id, extra) {
  let info = null;
  try { info = ctx?.audio?.clipInfo?.(kind, id, extra) || null; } catch { info = null; }
  const fields = learnerFields(info) || { text: "", english: "", phonetic: "", say: "" };
  const trad = extra?.tradition || ctx?.settings?.get?.("congregation") || "sephardi";
  if (!fields.phonetic && typeof extra?.text === "string" && extra.text.trim()) {
    fields.phonetic = clipPhonetic(extra.text, trad);
    fields.say = englishSay(fields.phonetic);
    if (!fields.text) fields.text = extra.text.trim();
  }
  if (!fields.english && extra?.english) fields.english = String(extra.english);
  nodes.he.textContent = fields.text || "";
  nodes.en.textContent = fields.english ? `Meaning: ${fields.english}` : "";
  nodes.ph.textContent = fields.phonetic ? `Phonetic: ${fields.phonetic}` : "";
  nodes.say.textContent = fields.say ? `Say it: ${fields.say}` : "";
}

/** Pointed Hebrew, meaning, phonetic, English sounds, and a speed control, wrapped around `control`. */
export function clipFace(ctx, kind, id, extra, control) {
  const nodes = {
    he: el("p", { class: "clip-he", dir: "rtl", lang: "he" }),
    en: el("p", { class: "clip-en", lang: "en" }),
    ph: el("p", { class: "clip-ph", lang: "en" }),
    say: el("p", { class: "clip-say", lang: "en" }),
  };
  const paint = () => paintClip(nodes, ctx, kind, id, extra);
  try { ctx?.audio?.onExtended?.(() => paint()); } catch { /* ignore */ }
  try {
    const p = ctx?.audio?.ensureManifest?.();
    if (p && typeof p.then === "function") p.then(() => paint()).catch(() => {});
  } catch { /* ignore */ }
  paint();
  return el("div", { class: "clip-face", "data-clip": `${kind}/${id}` },
    nodes.he, nodes.en, nodes.ph, nodes.say,
    el("details", { class: "clip-legend" }, el("summary", {}, "How to read the English sounds"), el("p", {}, SAY_LEGEND)),
    playbackSpeedControl(ctx), control);
}

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
  const playOpts = () => {
    const key = ctx?.settings?.get?.("playbackRate");
    const rate = FILE_RATES[key];
    return rate && rate !== 1 ? { ...extra, playbackRate: rate } : extra;
  };
  const control = acc.level === "none" && !acc.checking
    ? el("span", { class: "audio-none muted", "data-audio-state": "none" }, NO_AUDIO)
    : el("button", { type: "button", class: "alef-play", "aria-label": label,
      onclick: async () => {
        if (!ctx?.audio?.play) { if (note) note.textContent = "Audio is not available in this build."; return; }
        try { const r = await ctx.audio.play(kind, id, playOpts()); if (note) note.textContent = describePlay(r); }
        catch (e) { if (note) note.textContent = "No sound: the browser could not play this."; }
      } }, el("span", { "aria-hidden": "true" }, "▶"), " ", tr(ctx, "learn.play", "Listen"));
  if (!WORD_LINE.has(kind)) return control;
  return clipFace(ctx, kind, id, extra, control);
}
