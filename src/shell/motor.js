// Touch and movement settings. Pure functions plus one small apply step, so the rules can be tested without a browser.
//
//  targetSize 'normal' | 'large'  buttons, links and fields get a bigger hit area (CSS variable --tap and data-target-size on the root)
//  bottomActions  true            the main buttons of a screen (Show answer, rating, Next, Continue) stay at the bottom of the screen,
//                                 where a thumb reaches them (data-bottom-actions on the root; assets/css/app.css reads it)
//  untimed        true            no time limit anywhere: the Word Sprint has no clock and the Record and compare clip does not stop by itself
//  confirmAnswers true            choosing an answer only marks it; a separate "Check answer" button submits it, so a slipped tap can be changed
//  keyShortcuts   false           turns off the single-key shortcuts (1 to 4, S, Enter on the page) that speech input or a stray key could trigger
//
// None of these ask about a person. Whether they help a particular person was not tested with people who use switches, eye
// trackers, voice control or who have a motor disability; they were checked only in a desktop browser and an emulated phone.

export const TARGET_PX = Object.freeze({ normal: 48, large: 64 });

/** CSS custom properties and data attributes for a settings object. @param {Record<string,any>} s */
export function motorStyle(s = {}) {
  const large = s.targetSize === 'large';
  return {
    vars: large ? { '--tap': TARGET_PX.large + 'px', '--hit': TARGET_PX.large + 'px' } : {},
    attrs: { 'data-target-size': large ? 'large' : null, 'data-bottom-actions': s.bottomActions === true ? '' : null },
  };
}
const VAR_NAMES = ['--tap', '--hit'];

/** Apply to the root element (document.documentElement). Removes anything that went back to its default. @param {any} root @param {Record<string,any>} s */
export function applyMotor(root, s) {
  if (!root || !root.style) return motorStyle(s);
  const m = motorStyle(s);
  for (const n of VAR_NAMES) { if (n in m.vars) root.style.setProperty(n, m.vars[n]); else root.style.removeProperty(n); }
  for (const [k, v] of Object.entries(m.attrs)) { if (v === null) root.removeAttribute(k); else root.setAttribute(k, v); }
  return m;
}
export const MOTOR_KEYS = Object.freeze(['targetSize', 'bottomActions', 'untimed', 'confirmAnswers', 'keyShortcuts']);

const read = (src, k) => (typeof src?.get === 'function' ? src.get(k) : src?.[k]);
/** @param {any} ctxOrSettings a view ctx ({settings}) or a settings object. */
const settingsOf = (c) => (c && c.settings ? c.settings : c);
/** No time limits. @param {any} ctx */
export const untimedOn = (ctx) => read(settingsOf(ctx), 'untimed') === true;
/** Answers need a separate confirm tap. @param {any} ctx */
export const confirmOn = (ctx) => read(settingsOf(ctx), 'confirmAnswers') === true;
/** Single-key shortcuts are on (the default). With no settings object they stay on. @param {any} [ctx] */
export const shortcutsOn = (ctx) => {
  const s = settingsOf(ctx) || globalThis.alef?.settings;
  return read(s, 'keyShortcuts') !== false;
};
