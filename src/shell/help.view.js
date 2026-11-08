// Help (#/help): the beginner's page, in plain words. The deep explainer
// stays on #/how ("How this works"); this page answers the questions a new
// learner actually asks, each in a few lines, with the way onward. Written
// for usability review U-10 — before this page, ALEF had no help at all.
import { h } from './ui.js';

const li = (...k) => h('li', {}, ...k);
const sec = (id, title, ...kids) => h('section', { class: 'card', id: `help-${id}`, 'aria-labelledby': `help-${id}-h` }, h('h2', { id: `help-${id}-h` }, title), ...kids);
export function mount(root, ctx) {
  root.replaceChildren(h('article', { class: 'stack help' },
    h('header', {}, h('h1', { id: 'view-title', tabindex: '-1' }, 'Help'),
      h('p', { class: 'muted' }, 'Short answers, in plain words. For the long version — the research and the fine print — see ', h('a', { href: '#/how' }, 'How this works'), '.')),

    sec('start', 'Where do I start?',
      h('p', {}, 'Start with ', h('a', { href: '#/firstday' }, 'Your first 10 minutes'), ': one letter at a time until you have built a real word. You can do those steps again whenever you like — practising never takes away a finished mark.'),
      h('p', {}, 'ALEF has two paths. ', h('strong', {}, 'Read the prayer book'), ' teaches you to read Hebrew aloud — prayers and Torah. ', h('strong', {}, 'Speak in Israel'), ' teaches everyday Hebrew for travel and conversation. You pick one in ', h('a', { href: '#/settings' }, 'Settings'), ' (your goal), and you can use both.'))

    , sec('sound', 'Why can I not hear some words?',
      h('p', {}, 'Three things can happen when you tap Listen:'),
      h('ul', {},
        li(h('strong', {}, 'A clip plays. '), 'Most prayers, letters and common words have a clip in Ari’s or Noa’s voice.'),
        li(h('strong', {}, 'Another voice is offered. '), 'If a word has no clip in your chosen voice or style, the button offers the other voice’s own clip, labelled with whose voice it is. Nothing is ever swapped silently.'),
        li(h('strong', {}, 'The device voice reads it. '), 'Where no clip exists, your device’s own Hebrew voice reads the word in Israeli pronunciation.')),
      h('p', {}, 'If a button says “No audio yet”, the written spelling under the Hebrew shows how to say it. In ', h('a', { href: '#/settings' }, 'Settings'), ' you choose the voice (Noa, the woman’s voice, or Ari, the man’s) and the pronunciation style; pages follow those choices.'))

    , sec('words', 'Words ALEF uses',
      h('ul', {},
        li(h('strong', {}, 'Siddur'), ' — the Jewish prayer book. “Read the prayers” works through it line by line.'),
        li(h('strong', {}, 'Style (tradition)'), ' — how Hebrew is pronounced in your community: Israeli, Sephardi or Ashkenazi. ALEF follows the one you choose, and labels any sound that only exists in Israeli style.'),
        li(h('strong', {}, 'Belts'), ' — ALEF’s own levels, named after colours like in martial arts. A belt means you have met every letter and sign in its texts and finished its lessons. They are ALEF’s invention, not an outside qualification.'),
        li(h('strong', {}, 'Parsha'), ' — the weekly Torah portion, named on the ', h('a', { href: '#/calendar' }, 'Calendar'), ' page.')))

    , sec('progress', 'Is my progress saved?',
      h('p', {}, 'Yes — on this device, in this browser. There is no account and nothing is sent to a server. Lessons, review cards and your streak are kept here; clearing the browser’s site data erases them. In ', h('a', { href: '#/settings' }, 'Settings'), ' you can download a backup file and restore it on another device.'),
      h('p', {}, 'Your ', h('a', { href: '#/progress' }, 'Progress'), ' page plans your next visit at its “Tomorrow” card, from what this device has saved. Lesson times (“about 20 min”) are estimates — the lessons have not been timed on a learner yet. A lesson counts as finished when you pass its quick check at the end, after looking through it; the lesson list also has a “Test out” button, labelled as what it is.'))

    , sec('notyet', 'What is not finished yet?',
      h('ul', {},
        li('Some prayers and words have clips in only one voice. The button then plays the other voice.'),
        li('The full Torah text, side by side with English, is being added book by book; the Calendar names each week’s portion in the meantime.'),
        li('Speaking practice grades yourself unless your browser can hear Hebrew — and its hearing is unverified, so treat its verdict as a hint.')))

    , sec('stuck', 'Still stuck?',
      h('p', {}, 'Use ', h('a', { href: '#/search' }, 'Search'), ' — it finds pages by name (try “scan”, “prayers”, “games”) as well as Hebrew words and letters.'),
      h('p', {}, 'If reading the screen itself is the problem — small text, too much movement, no sound — the ', h('a', { href: '#/accessibility' }, 'Accessibility'), ' page and the “Calm and quiet” and “Reading comfort” groups in ', h('a', { href: '#/settings' }, 'Settings'), ' are built for that.'),
      h('p', {}, h('a', { class: 'btn secondary', href: '#/' }, 'Back to Home')))));
  return () => {};
}
