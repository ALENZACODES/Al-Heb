// @ts-check
// "How do I type vowel marks (niqqud)?" Static guide. Every platform entry below is FROM GENERAL KNOWLEDGE and was NOT TESTED on a device
// for this project; menu names change between versions. The only checked material is the AltGr table, which is read from
// data/letters/keyboard-si1452.json (itself verified against an xkeyboard-config file and a Wikipedia list, not against the standard document).
export const NOT_TESTED = "From general knowledge, not tested here.";
export const DOTTED_CIRCLE = "◌";

export const PLATFORMS = Object.freeze([
  { id: "windows", label: "Windows", status: NOT_TESTED, steps: [
    "Settings, Time & language, Language & region: add Hebrew, then check that a Hebrew keyboard is installed under its options.",
    "Switch keyboards with the Windows key + Space (or Left Alt + Shift).",
    "On the Israeli standard layout, vowel points are on Right Alt (AltGr) + a key; the table below lists which key. If your laptop has no Right Alt, Ctrl + Alt together usually acts as AltGr on Windows.",
    "Type the letter first, then the mark: the mark attaches to the letter before it."] },
  { id: "mac", label: "Mac", status: NOT_TESTED, steps: [
    "System Settings, Keyboard, Input Sources: add a Hebrew layout (more than one Hebrew layout may be offered).",
    "Switch with the Input menu in the menu bar, or Control + Space.",
    "To find vowel points on your layout, turn on Show Keyboard Viewer from the Input menu and hold the Option key (and Shift + Option): the points, if the layout has them, show on the keys. The key positions differ between layouts, so the table below may not match.",
    "Type the letter first, then the mark."] },
  { id: "ios", label: "iPhone and iPad", status: NOT_TESTED, steps: [
    "Settings, General, Keyboard, Keyboards, Add New Keyboard: choose Hebrew.",
    "Tap the globe key to switch keyboards.",
    "Whether the built-in Hebrew keyboard offers vowel points (for example by touching and holding a letter) depends on the iOS version, and this guide cannot say. If you do not find them, use a third-party keyboard that has a vowel layer, or copy marks from the practice box below and paste them where you need them.",
    "Type the letter first, then the mark."] },
  { id: "android", label: "Android", status: NOT_TESTED, steps: [
    "In your keyboard app (for example Gboard), open its settings, Languages, add keyboard: choose Hebrew.",
    "Tap the globe key (or touch and hold the space bar) to switch.",
    "Whether your keyboard has a vowel-point layer or long-press options differs by app and version, and this guide cannot say. If you do not find them, install a keyboard app that lists \"niqqud\" or \"vowel points\" in its description, or copy marks from the practice box below.",
    "Type the letter first, then the mark."] },
]);

export const GENERAL = Object.freeze([
  "Vowel points are separate characters that follow the letter they sit under. If a mark lands on the wrong letter, delete back to the letter and enter it again after the letter.",
  "Shin and sin: type shin (ש), then the right dot (shin dot) or left dot (sin dot).",
  "Shuruk (וּ) has no key of its own on the Israeli layout: type vav (ו), then dagesh.",
  "The drills in Aleph check letters only, so you never need vowel points to finish a drill.",
  "The practice box below inserts a vowel mark where your cursor is. It exists so you can copy marks into other apps; it does not check anything.",
]);

/**
 * Rows for the AltGr table, from the loaded layout. [{id, mark, codepoint, key, qwerty}]
 * `key` is the Hebrew letter printed on the physical key that carries the mark (the key you press with AltGr).
 */
export function niqqudRows(layout) {
  return Object.entries(layout?.niqqud || {}).map(([id, v]) => ({ id, name: id.replace(/-/g, " "), mark: v.char, codepoint: v.codepoint, key: v.keycapBase || "", qwerty: v.qwerty || "" }));
}
