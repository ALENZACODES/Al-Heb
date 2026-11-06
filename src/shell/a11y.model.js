// @ts-check
// Accessibility hub model (no DOM). The hub screen (a11y.view.js) is built from this table, and tests/a11y.gate.test.js checks it
// against src/shell/settings.js so that a setting added by any lane cannot ship without a control here (or an explicit reason it is not
// an accessibility setting). Nothing here stores anything: the only thing that is ever saved is the settings object (store key "settings").
import { DEFAULTS, ENUMS } from './settings.js';

/** Groups, in display order. */
export const GROUPS = Object.freeze([
  { id: 'hearing', label: 'Sound and hearing' },
  { id: 'seeing', label: 'Seeing the screen' },
  { id: 'colour', label: 'Colour and contrast' },
  { id: 'touch', label: 'Tapping, dragging and typing' },
  { id: 'calm', label: 'Calmer and simpler' },
  { id: 'feedback', label: 'Feedback when you answer' },
]);

/**
 * One entry per accessibility setting in settings.js. `help` is one honest sentence about what the setting changes.
 * type 'bool' -> checkbox; type 'enum' -> radio group over ENUMS[key] with `options` as the visible labels.
 * @typedef {{key:string, group:string, type:'bool'|'enum', label:string, help:string, options?:Record<string,string>}} Control
 */
/** @type {Control[]} */
export const CONTROLS = [
  // Sound and hearing
  { key: 'audioFree', group: 'hearing', type: 'bool', label: 'I do not use audio',
    help: 'Hides the Listen buttons and swaps questions that need hearing for reading questions; a skipped sound item is not counted as a miss.' },
  // Seeing the screen
  { key: 'textSize', group: 'seeing', type: 'enum', label: 'Text size', options: { normal: 'Normal', large: 'Large', larger: 'Larger', largest: 'Largest' },
    help: 'Scales the text of the whole app up in steps (the largest step is 1.5 times normal).' },
  { key: 'lineSpacing', group: 'seeing', type: 'enum', label: 'Space between lines', options: { normal: 'Normal', relaxed: 'More', wide: 'Most' },
    help: 'Adds space between lines of text.' },
  { key: 'letterSpacing', group: 'seeing', type: 'enum', label: 'Space between letters', options: { normal: 'Normal', wide: 'More', wider: 'Most' },
    help: 'Adds space between letters of English text; Hebrew text is not changed.' },
  { key: 'lineLength', group: 'seeing', type: 'enum', label: 'Line length', options: { normal: 'Normal', narrow: 'Shorter lines' },
    help: 'Makes lines of text narrower so they are shorter to read across.' },
  { key: 'readFont', group: 'seeing', type: 'enum', label: 'Reading font', options: { default: 'ALEF\'s font', clear: 'A clearer system font' },
    help: 'Switches between ALEF\'s own font and a plain font already on your device (nothing is downloaded).' },
  // Colour and contrast
  { key: 'theme', group: 'colour', type: 'enum', label: 'Colour theme',
    options: { auto: 'Follow my device', light: 'Light', dark: 'Dark', contrast: 'High contrast, black on white', 'contrast-dark': 'High contrast, white on black' },
    help: 'Chooses the page colours: light, dark, following your device, or the two high-contrast options.' },
  // Tapping, dragging and typing
  { key: 'targetSize', group: 'touch', type: 'enum', label: 'Size of buttons and fields', options: { normal: 'Normal', large: 'Large' },
    help: 'Makes buttons, links and fields bigger to tap.' },
  { key: 'bottomActions', group: 'touch', type: 'bool', label: 'Keep the main buttons at the bottom',
    help: 'Keeps main buttons at the bottom, where a thumb reaches them. Covers Review, your first 10 minutes and Word Sprint; lessons already do this.' },
  { key: 'confirmAnswers', group: 'touch', type: 'bool', label: 'Ask me to check my answer',
    help: 'Choosing an answer only marks it; a Check answer button submits it. Works in lesson quick checks today; other practice screens still answer on the tap.' },
  { key: 'untimed', group: 'touch', type: 'bool', label: 'No time limits',
    help: 'Removes time limits: Word Sprint has no clock and a Record and compare clip does not stop by itself.' },
  { key: 'keyShortcuts', group: 'touch', type: 'bool', label: 'Single-key shortcuts',
    help: 'Lets keys such as 1 to 4 and S act on a screen; turn it off if speech input or a stray key triggers them.' },
  // Calmer and simpler
  { key: 'calmMode', group: 'calm', type: 'bool', label: 'Calm mode',
    help: 'Turns off animation, sound effects and vibration and removes timer and streak pressure, where the app supports it.' },
  { key: 'shortSession', group: 'calm', type: 'bool', label: 'Short sessions',
    help: 'Shows lessons in small parts of about 2 to 3 minutes and saves your place after every part.' },
  { key: 'showStreak', group: 'calm', type: 'bool', label: 'Show my streak',
    help: 'Shows or hides every streak line; your progress is never affected.' },
  // Feedback when you answer
  { key: 'haptics', group: 'feedback', type: 'bool', label: 'Vibrate on exercise feedback',
    help: 'Vibrates after an answer on devices that support it, and never when your system asks for reduced motion.' },
  { key: 'soundEffects', group: 'feedback', type: 'bool', label: 'Sound effects on exercise feedback',
    help: 'Plays a short sound after an answer once the app has sound files; none ship yet, so today it changes nothing you can hear.' },
];

/**
 * Settings in settings.js that are NOT accessibility settings (learning, content or privacy choices). The gate test requires every key
 * in DEFAULTS to be in CONTROLS or here, so a new key forces a decision.
 */
export const NOT_A11Y = Object.freeze(['voice', 'congregation', 'israelTrack', 'showUnapprovedImages', 'script', 'lat', 'lon', 'gender', 'goal', 'onboarded', 'browserVoiceAnyway', 'writeGodAsGd', 'clipRate']);

/** Controls whose key exists in this build's settings.js, grouped in GROUPS order (empty groups dropped). */
export function visibleGroups(defaults = DEFAULTS) {
  return GROUPS.map((g) => ({ ...g, controls: CONTROLS.filter((c) => c.group === g.id && c.key in defaults) })).filter((g) => g.controls.length);
}

/**
 * "Start here" buttons. Each turns on settings by key; a key that does not exist in this build is skipped and reported, never faked.
 * `set` maps setting key -> value to apply. No question about a person's condition is asked and nothing but settings is saved.
 * @typedef {{id:string, label:string, set:Record<string,any>}} Preset
 */
/** @type {Preset[]} */
export const PRESETS = [
  { id: 'hear', label: 'I can\'t hear audio', set: { audioFree: true } },
  { id: 'see', label: 'I can\'t see the screen well', set: { textSize: 'larger', theme: 'contrast', lineSpacing: 'relaxed' } },
  { id: 'colour', label: 'Colours are hard to tell apart', set: { theme: 'contrast' } },
  { id: 'touch', label: 'Tapping and dragging is hard', set: { targetSize: 'large', bottomActions: true, confirmAnswers: true, untimed: true } },
  { id: 'calm', label: 'I want a calmer, simpler app', set: { calmMode: true, shortSession: true, showStreak: false } },
];

const controlOf = (key) => CONTROLS.find((c) => c.key === key);
/** Plain label of a value for a control ("Dark", "on"). */
export function valueLabel(key, value) {
  const c = controlOf(key);
  if (c?.type === 'enum') return c.options?.[value] ?? String(value);
  return value ? 'on' : 'off';
}

/**
 * Work out what a preset would change from the current settings. Pure.
 * @param {Preset} preset @param {Record<string,any>} current
 * @returns {{changes:{key:string,label:string,from:any,to:any}[], already:string[], missing:string[]}}
 */
export function planPreset(preset, current, defaults = DEFAULTS) {
  const changes = [], already = [], missing = [];
  for (const [key, to] of Object.entries(preset.set)) {
    const c = controlOf(key);
    if (!(key in defaults) || !c) { missing.push(key); continue; }
    if (current[key] === to) already.push(c.label); else changes.push({ key, label: c.label, from: current[key], to });
  }
  return { changes, already, missing };
}

/**
 * Apply a preset through a settings object ({get, all, set}). Returns the sentence to show and an undo patch (previous values).
 * @param {Preset} preset @param {{all:()=>Record<string,any>, set:(p:Record<string,any>)=>string[]}} settings
 */
export function applyPreset(preset, settings) {
  const plan = planPreset(preset, settings.all());
  const patch = Object.fromEntries(plan.changes.map((c) => [c.key, c.to]));
  const rejected = plan.changes.length ? settings.set(patch) : [];
  const done = plan.changes.filter((c) => !rejected.includes(c.key));
  const undo = Object.fromEntries(done.map((c) => [c.key, c.from]));
  const parts = [];
  if (done.length) parts.push(`Changed: ${done.map((c) => `${c.label} (${valueLabel(c.key, c.to)})`).join('; ')}.`);
  if (plan.already.length) parts.push(`Already set: ${plan.already.join('; ')}.`);
  if (rejected.length) parts.push(`Could not save: ${rejected.join(', ')}.`);
  if (!plan.changes.length && !plan.already.length) parts.push('This app has no setting for that yet, so nothing was changed.');
  else if (plan.missing.length) parts.push('Some settings that would help are not in this version of the app, so they were not changed.');
  parts.push(done.length ? 'To undo, press "Undo", or change the same controls below.' : 'You can change any control below.');
  return { message: parts.join(' '), undo, changed: done.map((c) => c.key), rejected };
}

/** Keys the hub is missing a control for (empty when the table is complete). Used by the gate test. */
export function uncovered(defaults = DEFAULTS) {
  return Object.keys(defaults).filter((k) => !CONTROLS.some((c) => c.key === k) && !NOT_A11Y.includes(k));
}
export { ENUMS };
