// Mixed English/Hebrew strings: returns an array of text and <span lang="he" dir="rtl"> nodes so screen readers and bidi layout treat
// each Hebrew run correctly. Use for prompts and explanations that embed Hebrew from data. Needs a DOM (document.createElement).
import { heText } from '../curriculum/dom.js';

const RUN = /[֐-׿]+(?:[ ־][֐-׿]+)*/g;
/** @param {string} text @param {string} [cls] @returns {(string|Node)[]} */
export function mixed(text, cls = 'alef-he') {
  const s = String(text ?? ''), out = []; let last = 0, m;
  RUN.lastIndex = 0;
  while ((m = RUN.exec(s))) { if (m.index > last) out.push(s.slice(last, m.index)); out.push(heText(m[0], cls)); last = m.index + m[0].length; }
  if (last < s.length) out.push(s.slice(last));
  return out;
}
/** Splitting only (no DOM): [{he:boolean, text}] for tests. */
export function runs(text) {
  const s = String(text ?? ''), out = []; let last = 0, m;
  RUN.lastIndex = 0;
  while ((m = RUN.exec(s))) { if (m.index > last) out.push({ he: false, text: s.slice(last, m.index) }); out.push({ he: true, text: m[0] }); last = m.index + m[0].length; }
  if (last < s.length) out.push({ he: false, text: s.slice(last) });
  return out;
}
