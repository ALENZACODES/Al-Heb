// @ts-check
// The "Word Notes" part of a lesson: a few short grammar notes drawn from the lesson's own words, a button for each
// lesson word (the keyboard and screen-reader way in), and word taps on the lesson's Hebrew text. Lazy.
import { morph, wordsReader, wordsPackOffered } from './morph.js';
import { armWordTaps } from './tap.js';

export const HINT = 'Tap a Hebrew word in this lesson to see how it is built, or pick one here.';
export const MAX_NOTES = 3;

/** Up to three different notes from the lesson's words, in lesson order. Pure. @param {any} m the word-notes module */
export function notesFor(m, lessonWords, unit) {
  const out = []; const seen = new Set();
  for (const w of lessonWords || []) {
    const found = m.findInUnit(unit, w.he, w.he);
    const note = found ? m.lessonNote([{ shown: w.he, a: found.a, entry: found.entry }]) : null;
    if (note && !seen.has(note.id)) { seen.add(note.id); out.push(note); if (out.length >= MAX_NOTES) break; }
  }
  return out;
}

/**
 * @param {HTMLElement} slot  where the section goes
 * @param {HTMLElement} page  the lesson page: taps on its Hebrew text open a card
 * @param {any} ctx @param {{id:string, words?:{he:string, en:string}[]}} lesson
 * @param {(tag:string, attrs?:any, ...kids:any[]) => HTMLElement} h
 * @returns {Promise<() => void>} unmount
 */
export async function mountWordNotes(slot, page, ctx, lesson, h) {
  const m = await morph();
  const unit = await m.loadUnit(lesson.id);
  if (!unit) return () => {};
  const taps = armWordTaps(page, { h, unit: lesson.id, reader: wordsReader, packOffered: await wordsPackOffered() });
  const known = (lesson.words || []).filter((w) => m.findInUnit(unit, w.he, w.he));
  const notes = notesFor(m, lesson.words, unit);
  const section = h('section', { class: 'card alef-wordnotes', 'aria-labelledby': 'l-wordnotes' },
    h('h2', { id: 'l-wordnotes' }, 'Word Notes'),
    h('p', { class: 'muted' }, HINT),
    notes.length ? h('ul', { class: 'alef-wordnotes-list' }, ...notes.map((n) => h('li', {}, h('span', { class: 'alef-he alef-word', lang: 'he', dir: 'rtl' }, n.he), ' ', h('span', {}, n.text)))) : null,
    known.length ? h('p', { class: 'row alef-wordnotes-picks' }, ...known.map((w) => {
      const b = h('button', { type: 'button', class: 'btn secondary alef-wordpick', 'aria-label': `Word notes for ${w.en}`, onclick: () => { taps.open(w.he, w.he, b); } },
        h('span', { class: 'alef-he', lang: 'he', dir: 'rtl' }, w.he));
      return b;
    })) : null);
  slot.replaceChildren(section);
  return () => { taps.off(); slot.replaceChildren(); };
}
