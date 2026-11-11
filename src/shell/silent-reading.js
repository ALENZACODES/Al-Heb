// @ts-check
// "Reading a prayer line without hearing it": plain steps that need no sound. Written for learners who are Deaf, hard of hearing,
// or simply reading somewhere quiet. Every step is something the app shows on screen (the English meaning, the vowel signs, the
// written respelling, the syllable beats). DRAFT: not checked by a Hebrew teacher and not tried with Deaf readers.
// Out of scope and not offered: lip-reading and sign-language content. Aleph has none.
import { isAudioFree } from './audiofree.js';

export const SILENT_READING_TITLE = 'Reading a prayer line without hearing it';

/** @returns {{title:string, text:string, href?:string, linkText?:string}[]} */
export function silentReadingSteps() {
  return [
    { title: 'Read the meaning first', text: 'The English under each line says what it means. Knowing the meaning makes the Hebrew easier to match, word by word.' },
    { title: 'Start at the right', text: 'Hebrew is read from right to left. Start with the right-most word and move left.' },
    { title: 'One word at a time', text: 'Find each letter, then the vowel sign that goes with it. Vowel signs sit under a letter, beside it, or inside a vav. The letter is read first, then its vowel.' },
    { title: 'Use the written respelling', text: 'The "sounds like" line is an approximate spelling in English letters for your chosen reading style. It was made by rules, has not been checked by a Hebrew speaker, and is not a recording. Treat it as a guide.' },
    { title: 'Break long words into beats', text: 'Split a long word into short beats (syllables) and take them one at a time.', href: '#/syllablechips', linkText: 'Syllable chips' },
    { title: 'Read how each sound is made', text: 'Each letter and vowel has a written description of how it is said, with a comparison to English.', href: '#/sounds', linkText: 'Sounds' },
    { title: 'Skip the tune marks', text: 'The small marks above and below some words are cantillation marks. They tell a singer the tune. You can read the words without them, and Aleph teaches only their names, not how they sound.' },
    { title: 'Know the limit', text: 'Words on a screen cannot tell you whether your reading matches how a community says the line. Aleph cannot check this. A teacher or reading partner who reads along with you can. Aleph has no sign-language or lip-reading material.' },
  ];
}

/**
 * A closed block on every reader page, open for a learner who chose "I do not use audio".
 * @param {Function} h element factory h(tag, attrs, ...kids) @param {any} ctx
 */
export function silentReadingNode(h, ctx) {
  const steps = silentReadingSteps();
  return h('details', { class: 'silent-reading card', id: 'silent-reading', open: isAudioFree(ctx) ? '' : null },
    h('summary', {}, h('strong', {}, SILENT_READING_TITLE)),
    h('p', { class: 'muted' }, 'Draft. Nobody who speaks Hebrew has reviewed these steps, and they have not been tried with Deaf or hard of hearing readers.'),
    h('ol', {}, ...steps.map((s) => h('li', {}, h('strong', {}, s.title + '. '), s.text, s.href ? ' ' : null, s.href ? h('a', { href: s.href }, s.linkText || s.href) : null))));
}
