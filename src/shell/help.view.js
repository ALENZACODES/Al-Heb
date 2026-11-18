// Help (#/help): the beginner's page, in plain words. The deep explainer
// stays on #/how ("How Aleph works"); this page answers the questions a new
// learner actually asks, each in a few lines, with the way onward. Written
// for usability review U-10 — before this page, Aleph had no help at all.
import { h } from './ui.js';

const li = (...k) => h('li', {}, ...k);
const sec = (id, title, ...kids) => h('section', { class: 'card', id: `help-${id}`, 'aria-labelledby': `help-${id}-h` }, h('h2', { id: `help-${id}-h` }, title), ...kids);
export function mount(root, ctx) {
  root.replaceChildren(h('article', { class: 'stack help' },
    h('header', {}, h('h1', { id: 'view-title', tabindex: '-1' }, 'Help'),
      h('p', { class: 'muted' }, 'Quick answers to common questions. For more about the method, see ', h('a', { href: '#/how' }, 'How Aleph works'), '.')),

    sec('start', 'Where do I start?',
      h('p', {}, 'Start with ', h('a', { href: '#/firstday' }, 'Your first 10 minutes'), '. You learn one letter at a time until you can read a real word. Repeat it whenever you like; practice never undoes your progress.'),
      h('p', {}, 'Aleph has two paths. ', h('strong', {}, 'Read the prayer book'), ' teaches you to read Hebrew aloud, including prayers and the Torah. ', h('strong', {}, 'Speak in Israel'), ' teaches everyday Hebrew for travel and conversation. Choose your goal in ', h('a', { href: '#/settings' }, 'Settings'), '. You can use both.'))

    , sec('sound', 'Why can\u2019t I hear some words?',
      h('p', {}, 'When you tap Listen, one of three things happens:'),
      h('ul', {},
        li(h('strong', {}, 'Ari or Noa reads it. '), 'Letters, prayers and common words have audio in both voices.'),
        li(h('strong', {}, 'The other voice reads it. '), 'If a word has audio in only one voice, the button offers that voice and says whose it is.'),
        li(h('strong', {}, 'Your device reads it. '), 'If a word has no audio yet, your device\u2019s own Hebrew voice reads it with Israeli pronunciation.')),
      h('p', {}, 'If a button says \u201cNo audio yet\u201d, the English letters under the Hebrew show how to say it. Choose your voice (Noa or Ari) and your pronunciation style in ', h('a', { href: '#/settings' }, 'Settings'), '.'))

    , sec('words', 'Words Aleph uses',
      h('ul', {},
        li(h('strong', {}, 'Siddur:'), ' the Jewish prayer book. \u201cRead the prayers\u201d works through it line by line.'),
        li(h('strong', {}, 'Style:'), ' how Hebrew is pronounced in your community: Israeli, Sephardi or Ashkenazi. Aleph follows the one you choose.'),
        li(h('strong', {}, 'Belts and ranks:'), ' on the reading track you earn Krav Maga\u2013style belts from White to Black, each with rank patches P (Practitioner), G (Graduate) and E (Expert), such as \u201cYellow belt \u00b7 P2\u201d. Each rank is a run of lessons; finish them to earn it. These are Aleph\u2019s own ranks, not an official Krav Maga grade. The Israel track uses Stages 1 to 3.'),
        li(h('strong', {}, 'Parsha:'), ' the weekly Torah portion, shown on the ', h('a', { href: '#/calendar' }, 'Calendar'), '.')))

    , sec('progress', 'Is my progress saved?',
      h('p', {}, 'Yes, in this browser on this device. There is no account, and nothing is sent to a server. Clearing your browser\u2019s site data erases your progress, so download a backup in ', h('a', { href: '#/settings' }, 'Settings'), ' from time to time. You can restore it on another device too.'),
      h('p', {}, 'Your ', h('a', { href: '#/progress' }, 'Progress'), ' page suggests what to do next on its \u201cTomorrow\u201d card. Lesson times such as \u201cabout 20 min\u201d are a rough guide. A lesson is finished when you pass its quick check at the end. If you already know the material, use \u201cTest out\u201d on the lesson list.'))

    , sec('notyet', 'Coming soon',
      h('ul', {},
        li('Audio in both voices for every prayer and word.'),
        li('The full Torah in Hebrew and English, book by book. Until then, the Calendar names each week\u2019s portion.'),
        li('Speech checking depends on your browser. Where it cannot hear Hebrew, you check your own reading.')))

    , sec('stuck', 'Still stuck?',
      h('p', {}, 'Try ', h('a', { href: '#/search' }, 'Search'), '. It finds pages by name (try \u201cscan\u201d, \u201cprayers\u201d or \u201cgames\u201d) as well as Hebrew words and letters.'),
      h('p', {}, 'If the screen itself is hard to use (small text, too much movement, no sound), see the ', h('a', { href: '#/accessibility' }, 'Accessibility'), ' page and the \u201cCalm and quiet\u201d and \u201cReading comfort\u201d settings in ', h('a', { href: '#/settings' }, 'Settings'), '.'),
      h('p', {}, h('a', { class: 'btn secondary', href: '#/' }, 'Back to Home')))));
  return () => {};
}
