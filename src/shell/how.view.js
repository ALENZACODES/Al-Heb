// "How Aleph works": the two tracks, pronunciation styles, the learning methods behind the design, and privacy.
// The research summaries come from the project research notes (competitor_teardown_pedagogy.md, Key Question 5;
// torah_opener_image_program.md, B5). They describe studies of other learners, not results measured on Aleph.
import { h } from './ui.js';

const li = (...k) => h('li', {}, ...k);
const sec = (id, title, ...kids) => h('section', { class: 'card', id: `how-${id}`, 'aria-labelledby': `how-${id}-h` }, h('h2', { id: `how-${id}-h` }, title), ...kids);

export function mount(root, ctx) {
  root.replaceChildren(h('article', { class: 'stack how' },
    h('header', {}, h('h1', { id: 'view-title', tabindex: '-1' }, ctx.t('how.title')),
      h('p', { class: 'muted' }, 'What Aleph teaches, how it plans your practice, and how it looks after your data.')),

    sec('scope', 'Two Goals, Two Tracks',
      h('p', {}, 'Read the prayer book teaches you to read Hebrew with vowel marks, so you can read prayers and the Torah aloud in synagogue. Speak in Israel covers the everyday Hebrew you need to order food, get around and talk with people.'),
      h('p', {}, 'The two tracks use different Hebrew. Prayers and the Torah are written in Biblical and liturgical Hebrew; Israelis speak Modern Hebrew. Aleph keeps them apart and always shows which one you are in.')),

    sec('tradition', 'Your Pronunciation Style',
      h('p', {}, 'Choose Israeli, Sephardi or Ashkenazi in Settings. Most American synagogues read with Sephardi vowels, so that is the default. If your synagogue reads differently, pick the style that matches.'),
      h('p', {}, 'The English letters under each Hebrew word follow your style: Shabbat in Israeli and Sephardi, Shabbos in Ashkenazi. Everyday words such as aba (dad) are spelled the same in every style, because everyone says them the same way today.'),
      h('p', {}, 'Ari and Noa speak with Israeli pronunciation, whichever style you choose.')),

    sec('science', 'Built on How Memory Works',
      h('h3', {}, 'Spaced review'),
      h('p', {}, 'Every review card asks you to remember the answer before you see it, and the next review comes later each time you get it right. Studies of spaced practice (Cepeda and colleagues, 2008; Latimier, Peyre and Ramus, 2021) found that spreading reviews out helps you remember far longer than cramming.'),
      h('h3', {}, 'Look-alike letters side by side'),
      h('p', {}, 'New letters are taught one group at a time. In review, letters that look alike, such as bet and kaf or dalet and resh, appear next to each other so you learn to tell them apart. Mixing similar items this way helps most with visual material (Brunmair and Richter, 2019).'),
      h('h3', {}, 'Picture hooks'),
      h('p', {}, 'Each letter turns into a picture that shares its shape, with a word that starts with its sound. Picture hooks helped young learners pick up Hebrew letters faster (Shmidman and Ehri, 2010). Once you know a letter, you won\'t need the picture.'),
      h('h3', {}, 'Hear it from the start'),
      h('p', {}, 'Letters and vowels come with sound from the first lesson. Sounds English does not have, such as resh, chet and ayin, are learned by listening, not from the written shape alone.')),

    sec('privacy', 'Your Data Stays With You',
      h('ul', {},
        li('Your settings, lessons, review cards and streak are saved in this browser on this device. There is no account, and no analytics.'),
        li('Your location is optional. It is used only on this device to work out candle-lighting times, and you can clear it in Settings.'),
        li('Photo scan reads Hebrew on this device. Your photo is never uploaded.'),
        li('Download a backup in Settings to move your progress to another device. Clearing your browser\'s site data erases your progress.'))),

    h('p', {}, h('a', { class: 'btn secondary', href: '#/about' }, 'About Aleph'), ' ', h('a', { class: 'btn secondary', href: '#/privacy' }, 'Privacy'), ' ', h('a', { class: 'btn secondary', href: '#/' }, 'Home'))));
  return () => {};
}
