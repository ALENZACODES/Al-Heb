// Calm mode and reading comfort. Pure functions plus one small apply step, so the rules can be tested without a browser.
//
// How it works: the settings (calmMode, readFont, lineSpacing, letterSpacing, textSize, lineLength) become CSS variables and
// two data attributes on the root element. assets/css/app.css reads them. Nothing here asks about a person or labels anyone.
//
// Calm mode is a bundle of quiet choices: no animation or movement, no sound effects, no vibration, no timers or streak
// pressure, and one thing at a time. The system "reduce motion" choice is always honoured, whether calm mode is on or off.
// Only fonts that need no download are offered: the 'clear' stack lists fonts that are already on most devices, and falls back
// to the system font if none is there. No font file was added.

export const TEXT_SCALE = Object.freeze({ normal: 1, large: 1.15, larger: 1.3, largest: 1.5 });
export const LINE_HEIGHT = Object.freeze({ normal: 1.55, relaxed: 1.8, wide: 2.1 });
export const LETTER_SPACING = Object.freeze({ normal: 'normal', wide: '0.05em', wider: '0.1em' });
export const MEASURE = Object.freeze({ normal: '46rem', narrow: '36rem' });
export const CLEAR_FONT_STACK = 'Verdana, Tahoma, "Trebuchet MS", "Segoe UI", system-ui, -apple-system, "DejaVu Sans", sans-serif';

const pick = (table, v) => (Object.prototype.hasOwnProperty.call(table, v) ? table[v] : table.normal);

/** True when the system asks for reduced motion. Honoured even when calm mode is off. @param {any} [win] */
export function systemReducedMotion(win = globalThis) {
  try { return !!win?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches; } catch { return false; }
}
/** True when motion, vibration and sound effects must stay off: calm mode is on, or the system asks for reduced motion. @param {any} settingsLike @param {any} [win] */
export function quietNow(settingsLike, win = globalThis) {
  const calm = typeof settingsLike?.get === 'function' ? settingsLike.get('calmMode') === true : settingsLike?.calmMode === true;
  return calm || systemReducedMotion(win);
}
/** Calm mode on, read from a view ctx. @param {any} ctx */
export const calmOn = (ctx) => ctx?.settings?.get?.('calmMode') === true;
/** Streak lines are shown: the learner has not hidden them and calm mode is off. @param {any} ctx */
export const streakVisible = (ctx) => {
  const s = ctx?.settings; if (!s || typeof s.get !== 'function') return true;
  return s.get('showStreak') !== false && s.get('calmMode') !== true;
};
/** Lessons are shown in small parts: the short-session choice, or calm mode (one thing at a time). @param {any} ctx */
export const chunkedLessons = (ctx) => {
  const s = ctx?.settings; if (!s || typeof s.get !== 'function') return false;
  return s.get('shortSession') === true || s.get('calmMode') === true;
};

/** The CSS custom properties and data attributes for a settings object. Defaults give empty `vars` (the stylesheet defaults apply). @param {Record<string,any>} s */
export function comfortStyle(s = {}) {
  /** @type {Record<string,string>} */
  const vars = {};
  const scale = pick(TEXT_SCALE, s.textSize); if (scale !== 1) vars['--text-scale'] = String(scale);
  const lh = pick(LINE_HEIGHT, s.lineSpacing); if (lh !== LINE_HEIGHT.normal) vars['--line-height'] = String(lh);
  const ls = pick(LETTER_SPACING, s.letterSpacing); if (ls !== 'normal') vars['--letter-spacing'] = ls;
  if (s.readFont === 'clear') vars['--font-ui'] = CLEAR_FONT_STACK;
  const m = pick(MEASURE, s.lineLength); if (m !== MEASURE.normal) vars['--measure'] = m;
  return { vars, calm: s.calmMode === true };
}
const VAR_NAMES = ['--text-scale', '--line-height', '--letter-spacing', '--font-ui', '--measure'];

/** Apply to the root element (document.documentElement). Removes anything that went back to its default. @param {any} root @param {Record<string,any>} s */
export function applyComfort(root, s) {
  if (!root || !root.style) return { vars: {}, calm: false };
  const { vars, calm } = comfortStyle(s);
  for (const n of VAR_NAMES) { if (n in vars) root.style.setProperty(n, vars[n]); else root.style.removeProperty(n); }
  if (calm) root.setAttribute('data-calm', ''); else root.removeAttribute('data-calm');
  return { vars, calm };
}
export const COMFORT_KEYS = Object.freeze(['calmMode', 'readFont', 'lineSpacing', 'letterSpacing', 'textSize', 'lineLength']);
