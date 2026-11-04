// Honest "what can I hear right now?" helper shared by every play/listen button.
// Three levels, never more than is true:
//   file   - a recorded (or pre-rendered) clip exists for this item
//   device - no clip, but the browser has (or may have) a he-IL voice that will read it: a device voice, not a teacher
//   none   - neither: show "No audio yet" and the written respelling instead of a button
// Pure of the DOM except audioButton(), which takes a `h` element factory.
import { fileLabel, STATUS_LABELS } from './audio-labels.js';
export const DEVICE_LABEL = 'Device voice, not a recorded teacher; Israeli-style only';
export const NO_AUDIO = STATUS_LABELS.missing;

/** 'yes' | 'no' | 'unknown' for a he-IL browser voice. getVoices() is often empty until the browser loads them: 'unknown'. */
export function deviceVoiceState(speech = globalThis.speechSynthesis, Utt = globalThis.SpeechSynthesisUtterance) {
  if (!speech || !Utt || typeof speech.speak !== 'function') return 'no';
  let vs = [];
  try { vs = (typeof speech.getVoices === 'function' ? speech.getVoices() : []) || []; } catch { vs = []; }
  if (!vs.length) return 'unknown';
  return vs.some((v) => /^he([-_]|$)/i.test(v.lang || '')) ? 'yes' : 'no';
}

/**
 * What a play button for (kind,id) can honestly do. Never throws.
 * @returns {{level:'file'|'device'|'none', label:string, reason?:string, checking?:boolean}}
 */
export function audioAccess(audio, kind, id, o = {}) {
  if (!audio) return { level: 'none', label: NO_AUDIO, reason: 'no-audio-engine' };
  try {
    const s = typeof audio.status === 'function' ? audio.status(kind, id, o) : null;
    if (s) {
      if (s.source === 'file') return { level: 'file', label: fileLabel(s.entryStatus) };
      if (s.source === 'tts-fallback') return { level: 'device', label: DEVICE_LABEL };
      return { level: 'none', label: NO_AUDIO, reason: s.reason || 'unavailable', checking: s.reason === 'checking audio...' };
    }
    if (typeof audio.has === 'function') return audio.has(kind, id, o) ? { level: 'file', label: fileLabel(undefined) } : { level: 'none', label: NO_AUDIO, reason: 'no-clip' };
  } catch { /* fall through */ }
  return { level: 'none', label: NO_AUDIO, reason: 'error' };
}

/** One-line status chip text for an access result ('' when nothing to say). */
export function chipText(a) { return a.level === 'none' ? NO_AUDIO : a.label; }

/**
 * A play button that is only a button when sound is possible. Otherwise a one-line "No audio yet" with the respelling.
 * @param {Function} h element factory (src/shell/ui.js h)
 * @param {any} ctx view context ({audio})
 * @param {{kind:string,id:string,label?:string,respelling?:string,voice?:string,tradition?:string,note?:HTMLElement,class?:string}} o
 */
export function audioButton(h, ctx, o) {
  const { kind, id, label = 'Listen', respelling } = o;
  const opt = {}; if (o.voice) opt.voice = o.voice; if (o.tradition) opt.tradition = o.tradition;
  const a = audioAccess(ctx && ctx.audio, kind, id, opt);
  if (a.level === 'none' && !a.checking) {
    return h('span', { class: 'audio-none muted', 'data-audio-state': 'none' }, NO_AUDIO, respelling ? ` - say it as written: ${respelling}` : '');
  }
  const note = o.note || h('span', { class: 'audio-chip muted', role: 'status', 'aria-live': 'polite' }, a.checking ? 'Checking audio...' : a.label);
  const btn = h('button', { type: 'button', class: o.class || 'btn secondary alef-play', 'data-audio': `${kind}/${id}`, 'data-audio-state': a.level,
    'aria-label': `${label} (${a.checking ? 'checking audio' : a.label})`,
    onclick: async () => {
      try {
        if (ctx.audio.ensureManifest) await ctx.audio.ensureManifest();
        const now = audioAccess(ctx.audio, kind, id, opt);
        if (now.level === 'none') { note.textContent = respelling ? `${NO_AUDIO}. Say it as written: ${respelling}` : NO_AUDIO; return; }
        note.textContent = now.label;
        const r = await ctx.audio.play(kind, id, opt);
        if (r && r.source === 'none') note.textContent = `${NO_AUDIO}${respelling ? `. Say it as written: ${respelling}` : ''}`;
      } catch { note.textContent = NO_AUDIO; }
    } }, h('span', { 'aria-hidden': 'true' }, '▶'), ' ', label);
  return h('span', { class: 'audio-wrap' }, btn, ' ', note);
}

/** Pure: text for the one-time first-run banner, from the shell audio summary + device voice state. */
export function bannerText(summary, voice) {
  const rec = (summary && (summary.recorded || 0)) || 0;
  if (rec > 0) return 'Some words have recorded audio. Anything else is read by your device voice, which is not a recorded teacher.';
  const dev = voice === 'yes' ? 'Your device has a Hebrew voice, so ALEF can read words aloud with it. It is a device voice, not a recorded teacher, and Israeli-style only.'
    : voice === 'unknown' ? 'ALEF will try your device\'s Hebrew voice if it has one. It would be a device voice, not a recorded teacher, and Israeli-style only.'
    : 'Your device has no Hebrew voice, so there is no sound here. Read the written respelling shown with each word instead.';
  return `There are no recorded teacher clips yet. ${dev}`;
}

const KEY = 'alef.audioBannerSeen.v1';
/** Show the banner once (dismissal remembered in localStorage). Returns the node or null. */
export function mountAudioBanner(h, audio, { doc = globalThis.document, storage = globalThis.localStorage, speech, Utt } = {}) {
  try { if (!doc || (storage && storage.getItem(KEY))) return null; } catch { /* storage blocked: show it */ }
  const host = doc.querySelector('.sound-bar'); if (!host) return null;
  const node = h('div', { class: 'audio-banner', role: 'region', 'aria-label': 'Audio status', style: 'padding:.5rem 1rem;font-size:.9rem;border-block-end:1px solid var(--border)' },
    h('strong', {}, 'About sound: '), bannerText(audio && audio.summary, deviceVoiceState(speech, Utt)), ' ',
    h('button', { type: 'button', class: 'btn secondary', onclick: () => { try { storage && storage.setItem(KEY, '1'); } catch { /* ignore */ } node.remove(); } }, 'Got it'));
  host.after(node); return node;
}
