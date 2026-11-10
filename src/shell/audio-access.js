// Honest "what can I hear right now?" helper shared by every play/listen button.
// Three levels, never more than is true:
//   file   - a recorded (or pre-rendered) clip exists for this item
//   device - no clip, but the browser has (or may have) a he-IL voice that will read it: a device voice, not a teacher
//   none   - neither: show "No audio yet" and the written respelling instead of a button
// Pure of the DOM except audioButton(), which takes a `h` element factory.
import { fileLabel, STATUS_LABELS } from './audio-labels.js';
import { isAudioFree } from './audiofree.js';
export const DEVICE_LABEL = 'device voice, not recorded yet'; // the phone or browser reads it: say so, never a teacher's name or 'Israeli voice'
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
      if (s.source === 'file') return { level: 'file', label: fileLabel(s.entryStatus, s.fileTradition || s.tradition, s.entrySource) };
      if (s.source === 'tts-fallback') return { level: 'device', label: DEVICE_LABEL };
      return { level: 'none', label: NO_AUDIO, reason: s.reason || 'unavailable', checking: s.reason === 'checking audio...' };
    }
    if (typeof audio.has === 'function') return audio.has(kind, id, o) ? { level: 'file', label: fileLabel(undefined) } : { level: 'none', label: NO_AUDIO, reason: 'no-clip' };
  } catch { /* fall through */ }
  return { level: 'none', label: NO_AUDIO, reason: 'error' };
}

/** One-line status chip text for an access result ('' when nothing to say). */
export function chipText(a) { return a.level === 'none' ? NO_AUDIO : a.label; }

const VOICE_NAME = { m: 'Ari (the man’s voice)', f: 'Noa (the woman’s voice)' };
/** Plain name of a voice slot, for honest fallback labels ("Hear Noa (the woman's voice)"). */
export function voiceName(v) { return VOICE_NAME[v] || 'the other voice'; }
const otherVoice = (v) => (v === 'm' ? 'f' : 'm');

/**
 * The honest fallback ladder for an item with no clip in the learner's own
 * voice/tradition (usability review U-02: a missing recording must never be a
 * silent dead end). Pure probing — nothing plays here.
 *   1. the OTHER voice's file for the same item, honestly labelled as that voice;
 *   2. the device voice, only where the text is known and the refusal was the
 *      tradition guard (the player reads Israeli-style; the label says so).
 * @returns {{kind:'voice', voice:string, label:string}|{kind:'device', label:string}|null}
 */
export function ladderStep(audio, kind, id, o = {}, ctx) {
  if (!audio || typeof audio.status !== 'function') return null;
  const curVoice = o.voice || (ctx && ctx.settings && typeof ctx.settings.get === 'function' ? ctx.settings.get('voice') : null) || 'f';
  const alt = otherVoice(curVoice);
  try {
    const a = audioAccess(audio, kind, id, { ...o, voice: alt });
    if (a.level === 'file') return { kind: 'voice', voice: alt, label: a.label, forVoice: curVoice };
  } catch { /* fall through to the device step */ }
  const primary = audioAccess(audio, kind, id, o);
  if (primary.reason === 'tts-pronunciation-mismatch' && typeof o.text === 'string' && o.text.trim() && deviceVoiceState() !== 'no') {
    return { kind: 'device', label: DEVICE_LABEL };
  }
  return null;
}

/**
 * Play with a visible in-flight state (U-06): while the play promise is
 * unsettled the button carries data-playing + .is-playing and a stop glyph,
 * and a second tap stops the sound instead of stacking another play.
 * Resolves with the play result (or null); never throws.
 */
export async function playWithState(ctx, btn, kind, id, opts) {
  const audio = ctx && ctx.audio;
  if (!audio || typeof audio.play !== 'function') return null;
  if (btn && btn.dataset && btn.dataset.playing === '1') { try { audio.stop && audio.stop(); } catch { /* ignore */ } return null; }
  const glyph = btn && typeof btn.querySelector === 'function' ? (btn.querySelector('[data-glyph]') || btn.querySelector('span')) : null;
  const oldGlyph = glyph ? glyph.textContent : null;
  if (btn && btn.dataset) { btn.dataset.playing = '1'; if (btn.classList) btn.classList.add('is-playing'); }
  if (glyph) glyph.textContent = '■';
  try { return await audio.play(kind, id, opts); }
  catch { return null; }
  finally {
    if (btn && btn.dataset) { delete btn.dataset.playing; if (btn.classList) btn.classList.remove('is-playing'); }
    if (glyph && oldGlyph !== null) glyph.textContent = oldGlyph;
  }
}

/**
 * A play button that is only a button when sound is possible. Otherwise a one-line "No audio yet" with the respelling.
 * @param {Function} h element factory (src/shell/ui.js h)
 * @param {any} ctx view context ({audio})
 * @param {{kind:string,id:string,label?:string,respelling?:string,text?:string,name?:string,voice?:string,tradition?:string,note?:HTMLElement,class?:string}} o
 *   `text`: the pointed Hebrew the caller shows. When the item is not in the recording list, the device voice may read this text
 *   (src/audio/player.js plan() uses it only as a last resort, after every file step and the manifest's own text).
 *   `buttonId`: DOM id for the button itself (for views whose tests or links address it).
 *   `attrs`: extra attributes for the button (e.g. a data- hook a test or stylesheet uses).
 *   `noneClass`: replaces the class of the one-line "No audio yet" span, for views whose stylesheet already styles their own class.
 *   `name`: what the item is (e.g. the English gloss), added to the accessible name so a list of Listen buttons is not all one name.
 */
export function audioButton(h, ctx, o) {
  const { kind, id, label = 'Listen', respelling } = o;
  if (isAudioFree(ctx)) return h('span', { class: 'audio-off', hidden: '' }); // "I do not use audio": no button, no "No audio yet" line
  const opt = {}; if (o.voice) opt.voice = o.voice; if (o.tradition) opt.tradition = o.tradition;
  if (typeof o.text === 'string' && o.text.trim()) opt.text = o.text;
  const a = audioAccess(ctx && ctx.audio, kind, id, opt);
  // No clip in the learner's own voice/tradition: offer the ladder (U-02)
  // before falling back to the plain "No audio yet" line.
  const noneNode = () => {
    const step = ladderStep(ctx && ctx.audio, kind, id, opt, ctx);
    if (!step) return h('span', { class: o.noneClass || 'audio-none muted', 'data-audio-state': 'none' }, NO_AUDIO, respelling ? ` - say it as written: ${respelling}` : '');
    const note = o.note || h('span', { class: 'audio-chip muted', role: 'status', 'aria-live': 'polite' }, step.label);
    const playOpts = step.kind === 'voice' ? { ...opt, voice: step.voice } : { ...opt, allowMismatchedTts: true };
    const btnLabel = step.kind === 'voice' ? `Hear ${VOICE_NAME[step.voice]}` : 'Hear the device voice';
    const lead = step.kind === 'voice' ? `No clip in ${VOICE_NAME[step.forVoice]} for this yet.` : 'No clip for this yet.';
    const btn = h('button', { type: 'button', class: o.class || 'btn secondary alef-play', ...(o.buttonId ? { id: o.buttonId } : {}), ...(o.attrs || {}), 'data-audio': `${kind}/${id}`, 'data-audio-state': 'ladder', 'data-ladder': step.kind,
      'aria-label': `${btnLabel}${o.name ? `: ${o.name}` : ''} (${step.label})`,
      onclick: async () => {
        try {
          if (ctx.audio.ensureManifest) await ctx.audio.ensureManifest();
          note.textContent = step.label;
          const r = await playWithState(ctx, btn, kind, id, playOpts);
          if (r && r.source === 'none') note.textContent = NO_AUDIO;
        } catch { note.textContent = NO_AUDIO; }
      } }, h('span', { 'aria-hidden': 'true', 'data-glyph': '' }, '▶'), ' ', btnLabel);
    return h('span', { class: 'audio-wrap' }, h('span', { class: 'audio-none muted', 'data-audio-state': 'none' }, lead), ' ', btn, ' ', note);
  };
  if (a.level === 'none' && !a.checking) return noneNode();
  const note = o.note || h('span', { class: 'audio-chip muted', role: 'status', 'aria-live': 'polite' }, a.checking ? 'Checking audio...' : a.label);
  const btn = h('button', { type: 'button', class: o.class || 'btn secondary alef-play', ...(o.buttonId ? { id: o.buttonId } : {}), ...(o.attrs || {}), 'data-audio': `${kind}/${id}`, 'data-audio-state': a.level,
    'aria-label': `${label}${o.name ? `: ${o.name}` : ''} (${a.checking ? 'checking audio' : a.label})`,
    onclick: async () => {
      try {
        if (ctx.audio.ensureManifest) await ctx.audio.ensureManifest();
        const now = audioAccess(ctx.audio, kind, id, opt);
        if (now.level === 'none') { note.textContent = respelling ? `${NO_AUDIO}. Say it as written: ${respelling}` : NO_AUDIO; return; }
        note.textContent = now.label;
        const r = await playWithState(ctx, btn, kind, id, opt);
        if (r && r.source === 'none') note.textContent = `${NO_AUDIO}${respelling ? `. Say it as written: ${respelling}` : ''}`;
      } catch { note.textContent = NO_AUDIO; }
    } }, h('span', { 'aria-hidden': 'true', 'data-glyph': '' }, '▶'), ' ', label);
  const wrap = h('span', { class: 'audio-wrap' }, btn, ' ', note);
  // The first answer can be "checking audio..." (the clip list loads the first time something asks). The shell re-renders a route once for
  // that, but not in the middle of an exercise (word tracing), so the button used to stay on "Checking audio..." until it was pressed.
  if (a.checking && ctx && ctx.audio && typeof ctx.audio.ensureManifest === 'function') {
    Promise.resolve(ctx.audio.ensureManifest()).then(() => {
      const now = audioAccess(ctx.audio, kind, id, opt);
      if (now.checking) return;
      if (now.level === 'none') { wrap.replaceWith(noneNode()); return; }
      btn.setAttribute('data-audio-state', now.level); btn.setAttribute('aria-label', `${label}${o.name ? `: ${o.name}` : ''} (${now.label})`);
      if (!o.note) note.textContent = now.label;
    }).catch(() => {});
  }
  return wrap;
}

/** Pure: text for the full notice (the one-line banner links to it; it is also the link's title). */
export function bannerText(summary, voice) {
  const rec = (summary && (summary.recorded || 0)) || 0;
  if (rec > 0) return 'Some words have recorded audio. Anything else is read by your device voice.';
  const dev = voice === 'yes' ? 'Your device has a Hebrew voice, so ALEF can read words aloud with it in Israeli pronunciation.'
    : voice === 'unknown' ? 'ALEF will try your device\'s Hebrew voice if it has one. It reads in Israeli pronunciation.'
    : 'Your device has no Hebrew voice, so there is no sound here. Read the English-letter spelling shown with each word instead.';
  void summary;
  return dev;
}

const KEY = 'alef.audioBannerSeen.v1';
/** Pure: is the bar dismissed (remembered in storage)? Storage blocked: not dismissed. */
export function soundBarDismissed(storage = globalThis.localStorage) { try { return !!(storage && storage.getItem(KEY)); } catch { return false; } }
/**
 * Wire the ONE sound bar (index.html .sound-bar: #sound-status role=status + Details link + dismiss button).
 * The bar stays hidden while sound works (idle). It shows only for a non-idle status (a play error, "list could not be
 * loaded"), because those are things the learner needs to know. Dismiss hides it, remembers it, and moves focus to `focusTo`.
 * @returns {{show:(mode:string)=>void, dismissed:()=>boolean}|null}
 */
export function wireSoundBar(audio, { doc = globalThis.document, storage = globalThis.localStorage, speech, Utt, focusTo } = {}) {
  const bar = doc && doc.querySelector('.sound-bar'); if (!bar) return null;
  const x = bar.querySelector('.sound-bar-x'), link = bar.querySelector('.sound-bar-details');
  if (link) link.title = bannerText(audio && audio.summary, deviceVoiceState(speech, Utt));
  let gone = soundBarDismissed(storage);
  // The bar is for problems only (a play error, a list that could not load). When sound simply works there is nothing to say.
  const apply = (mode, pending = !!(audio && audio.state && audio.state.pending)) => { bar.hidden = pending || !mode || mode === 'idle'; };
  apply('idle');
  if (x) x.addEventListener('click', () => {
    gone = true; try { storage && storage.setItem(KEY, '1'); } catch { /* ignore */ }
    apply('idle'); const t = focusTo || doc.getElementById('main'); if (t && t.focus) t.focus();
  });
  return { show: apply, dismissed: () => gone };
}
