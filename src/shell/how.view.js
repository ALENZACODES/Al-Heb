// "How this works": scope, pronunciation traditions, the learning-science behind the design (with the exact findings
// recorded in the project research notes; nothing here is measured on ALEF's own learners), draft-content statements, privacy.
// Sources for section 3 are the research notes competitor_teardown_pedagogy.md (Key Question 5) and torah_opener_image_program.md (B5).
import { h } from './ui.js';

const li = (...k) => h('li', {}, ...k);
const sec = (id, title, ...kids) => h('section', { class: 'card', id: `how-${id}`, 'aria-labelledby': `how-${id}-h` }, h('h2', { id: `how-${id}-h` }, title), ...kids);

export function mount(root, ctx) {
  root.replaceChildren(h('article', { class: 'stack how' },
    h('header', {}, h('h1', { id: 'view-title', tabindex: '-1' }, ctx.t('how.title')),
      h('p', { class: 'muted' }, 'What ALEF teaches, how it schedules practice, and what is and is not finished. Credits and licences are on the ', h('a', { href: '#/about' }, 'About page'), '.')),

    sec('scope', '1. Scope: Modern and Biblical Hebrew',
      h('p', {}, 'ALEF has two tracks. "Read the prayer book" teaches you to read Hebrew with vowel marks, so you can read prayers and Torah text aloud in synagogue. "Speak in Israel" covers everyday Modern Hebrew. They are different things: the reading track uses Biblical and liturgical text, the speaking track uses Modern Hebrew.'),
      h('p', {}, 'ALEF is not a Biblical Hebrew grammar course and not a complete Modern Hebrew course. The research behind it found that learners often confuse Biblical and Modern Hebrew (pronunciation and vocabulary) and that one review site recommends learning Modern Hebrew first; ALEF keeps the two tracks separate and says which one you are in.')),

    sec('tradition', '2. Pronunciation styles',
      h('p', {}, 'You choose Israeli, Sephardi or Ashkenazi. "American synagogue" in the setup screen is stored as Sephardi, because the common American-synagogue pronunciation uses Sephardi/Israeli vowel values; if your synagogue differs, pick the one that matches.'),
      h('p', {}, 'Vowel descriptions and prayer transliteration follow your choice. In the research for this project, no competing product page or review that we read stated which pronunciation style its audio uses (the one exception was a text-to-speech Bible reader offering three dialects), so ALEF names it.'),
      h('p', { id: 'how-sound' }, h('strong', {}, 'Sound, honestly. '), 'No human or studio recordings exist yet, and no synthetic voice files exist either. Every sound you hear today is your browser\'s built-in text-to-speech Hebrew voice, if your device has one. That voice reads Modern Israeli pronunciation, and its gender and accent are chosen by your device, so the Man (Ari) / Woman (Noa) choice cannot change it yet. The bar at the top of every screen tells you what played last: a recorded file, the browser voice, or nothing.')),

    sec('science', '3. What the research says, and how ALEF uses it',
      h('p', { class: 'muted' }, 'These are findings reported in the research notes for this project (study summaries read on 2026-11-03). Where the notes only had a blog or abstract summary, that is stated. They describe other learners in other settings. ALEF has not measured any learning outcome of its own.'),
      h('h3', {}, 'Spaced retrieval'),
      h('ul', {},
        li('Latimier, Peyre and Ramus (2021), 29 studies: spaced retrieval practice beat massed retrieval practice (g = 0.74). Expanding and uniform schedules did not differ (g = 0.034).'),
        li('Cepeda et al. (2008), 1,354 participants: the best gap between study and review grows with how long you want to remember, but as a shrinking fraction (about 20-40% of a one-week interval, 5-10% of a one-year interval). Optimal spacing gave a 64% recall gain over massed study at equal study time, and gaps that were too short cost more than gaps that were too long.'),
        li('Retrieval practice beat restudy across 217 studies (Adesope, Trevisan and Sundararajan, 2017; the notes only had a blog summary, without effect sizes).'),
        li(h('strong', {}, 'In ALEF: '), 'every review card makes you recall first ("Show answer" comes after you try), and the scheduler spaces the next review by how well you remembered. The scheduler is FSRS-style and written from scratch for ALEF. It is not the reference FSRS implementation, does not use FSRS\'s published weights, and its constants have not been fitted to review data. (In an open benchmark of 349.9 million reviews, FSRS-6 had lower log loss than SM-2 for 99.6% of users, with the caveat that SM-2 was not built to output probabilities. That result is about FSRS, not about ALEF\'s version.)')),
      h('h3', {}, 'Interleaving similar letters'),
      h('ul', {},
        li('Brunmair and Richter (2019), 59 studies: interleaved practice beat blocked practice overall (g = 0.42), most strongly for visual material (g = 0.67) and when categories are similar to each other. For word learning, blocking was better (g = -0.39).'),
        li(h('strong', {}, 'In ALEF: '), 'new words and letters are taught in blocks inside a lesson, but in review, letters that look alike (for example bet and kaf, dalet and resh) are placed next to each other instead of being drilled in separate blocks. The sets are in data/letters/confusables.json.')),
      h('h3', {}, 'Picture mnemonics: promising but thin'),
      h('ul', {},
        li('Manalo, Mizutani and Trafford (2004) tested picture mnemonics for Japanese kana: pass rate rose from 51% to 65%, in a self-selected group of 27 with no effect size or retention data; the authors call it preliminary.'),
        li('Shmidman and Ehri (2010), per a literacy blog and a reader comment in the notes (the paper itself was not read): English-speaking preschoolers learning ten Hebrew letters learned faster and made fewer errors with embedded picture mnemonics, where the letter shape is drawn into the picture. The same sources caution that pictures can hurt whole-word learning and that the evidence base is thin.'),
        li(h('strong', {}, 'In ALEF: '), 'mnemonic pictures are planned as a temporary scaffold to fade, with letters that have two sounds (bet, kaf, pe, shin) handled with two states. No finished mnemonic artwork is in the app yet: the images are placeholders.')),
      h('h3', {}, 'Script and sound together'),
      h('ul', {},
        li('Shepperd (2024), a review: for beginners, input in an unfamiliar script gave little benefit for learning new sound contrasts compared with audio only, and sometimes hurt; the benefit grows with proficiency. Most of the studies were small, single-session samples of English speakers.'),
        li(h('strong', {}, 'In ALEF: '), 'letters and vowels are paired with audio from the first lesson, and the hard sounds (resh, chet, ayin) are meant to be learned by listening and explicit instruction, not from the written shape alone.')),
      h('h3', {}, 'Not built'),
      h('p', {}, 'A meta-analysis (Ngo, Chen and Lai) found explicit corrective feedback from speech recognition worked better than indirect feedback (g = 0.86 vs 0.50). ALEF has no speech-recognition feedback: you cannot yet speak to it and be scored. Handwriting tracing exists but its stroke data is a draft.')),

    sec('draft', '4. What is draft or unreviewed',
      h('ul', {},
        li('Hebrew interface labels are machine-drafted and need a native speaker.'),
        li('The lesson words, their English meanings and the vowel marks have not yet been checked by a native speaker.'),
        li('Torah and prayer texts match their cited sources (checked by tests), but no Hebrew educator has proofread them and the licence labels for the prayer book sources are the source site\'s own labels, not independently verified.'),
        li('The opening prayer slot on the home screen is a placeholder pending review by clergy or an educator.'),
        li('Letter stroke data for tracing is a draft, not validated by a native writer or a school model.'),
        li('The survival phrasebook was written for this project and needs native review.'),
        li('Photo scan uses a demo engine, not real OCR; do not rely on it to read a real page.'),
        li('Not tested on iOS or Android devices, or with a screen reader.'))),

    sec('privacy', '5. Privacy: your data stays on your device',
      h('ul', {},
        li('Settings, completed lessons, review cards and your streak are stored in your browser\'s local storage on this device. There is no account, no server-side profile and no analytics in this build.'),
        li('The app\'s own requests go only to the site that serves it (pages, fonts, data files, audio files when they exist).'),
        li('Location is optional, used only to compute candle-lighting times on your device, and you can clear it in Settings.'),
        li('Photo scan: the default engine in this build is a local demo; no photo is uploaded.'),
        li('You can download a backup file from Settings and restore it on another device. Clearing site data erases your progress.'))),

    h('p', {}, h('a', { class: 'btn secondary', href: '#/about' }, 'Credits and licences'), ' ', h('a', { class: 'btn secondary', href: '#/' }, 'Home'))));
  return () => {};
}
