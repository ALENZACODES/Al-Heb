// Hebrew voice help. Words that have no recording yet are read by the device's own Hebrew voice. Phones have one;
// many computers (most Windows PCs in Chrome or Firefox) do not, so those words are silent there. When the app is
// about to speak Hebrew and this device has no Hebrew voice, show one short note with the fix. Once per session,
// and never again after "Don't show again".
import { deviceVoiceState } from './audio-access.js';

export const VOICE_HELP_KEY = 'alef:voiceHelpDismissed';
export const VOICE_HELP_TEXT = 'This word has no recording yet, and this computer has no Hebrew voice to read it aloud.';

/** Plain steps for the device in front of the learner. */
export function voiceHelpSteps(ua = globalThis.navigator?.userAgent || '') {
  if (/Edg\//.test(ua)) return ['In Edge, Hebrew voices usually appear after a moment. Reload the page and try again.'];
  if (/Windows/.test(ua)) return ['Easiest: open ALEF in Microsoft Edge, which comes with Hebrew voices.', 'Or add a Hebrew voice to Windows: Settings, Time and language, Speech, Add voices, Hebrew. Then restart the browser.'];
  if (/Mac OS X|Macintosh/.test(ua)) return ['On a Mac: System Settings, Accessibility, Spoken Content, System voice, Manage Voices, then add Hebrew (Carmit). Then restart the browser.'];
  if (/Linux/.test(ua) && !/Android/.test(ua)) return ['Open ALEF on a phone or in Microsoft Edge, which have Hebrew voices.'];
  return ['Open ALEF on a phone, or in Microsoft Edge on a computer.'];
}

const isHebrew = (u) => /^he/i.test(u?.lang || '') || /[֐-׿]/.test(u?.text || '');

/** Wraps speechSynthesis.speak so the note appears the first time Hebrew would be spoken with no Hebrew voice. */
export function installVoiceHelp(win = globalThis) {
  const synth = win.speechSynthesis, doc = win.document;
  if (!synth || typeof synth.speak !== 'function' || !doc || synth.__alefVoiceHelp) return false;
  let shown = false;
  const original = synth.speak.bind(synth);
  synth.speak = (u) => {
    try {
      if (!shown && isHebrew(u) && deviceVoiceState(synth, win.SpeechSynthesisUtterance) === 'no' && !dismissed(win)) { shown = true; showVoiceHelp(doc, win); }
    } catch { /* never block speech */ }
    return original(u);
  };
  synth.__alefVoiceHelp = true;
  return true;
}

function dismissed(win) { try { return win.localStorage?.getItem(VOICE_HELP_KEY) === '1'; } catch { return false; } }

export function showVoiceHelp(doc, win = globalThis) {
  if (!doc?.body || doc.getElementById('voice-help')) return null;
  const box = doc.createElement('div');
  box.id = 'voice-help'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
  box.style.cssText = 'position:fixed;inset-inline:1rem;inset-block-start:1rem;z-index:60;max-inline-size:36rem;margin-inline:auto;padding:.8rem 1rem;border-radius:14px;background:#123d2a;color:#f5e6b8;border:2px solid #c9a227;box-shadow:0 6px 24px rgba(0,0,0,.3);';
  const p = doc.createElement('p'); p.style.margin = '0 0 .4rem'; p.textContent = VOICE_HELP_TEXT;
  const ul = doc.createElement('ul'); ul.style.margin = '0 0 .5rem'; ul.style.paddingInlineStart = '1.2rem';
  for (const s of voiceHelpSteps(win.navigator?.userAgent)) { const li = doc.createElement('li'); li.textContent = s; ul.append(li); }
  const row = doc.createElement('div'); row.style.cssText = 'display:flex;gap:.5rem;flex-wrap:wrap;';
  const btn = (text, fn) => { const b = doc.createElement('button'); b.type = 'button'; b.textContent = text; b.style.cssText = 'min-block-size:44px;padding:.3rem .9rem;border-radius:999px;border:1px solid #c9a227;background:transparent;color:inherit;font:inherit;cursor:pointer;'; b.addEventListener('click', fn); return b; };
  row.append(btn('OK', () => box.remove()), btn("Don't show again", () => { try { win.localStorage?.setItem(VOICE_HELP_KEY, '1'); } catch { /* ignore */ } box.remove(); }));
  box.append(p, ul, row);
  doc.body.append(box);
  return box;
}
