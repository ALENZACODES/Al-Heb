// Hebrew Word Finder: day-zero word recognition with a real sourced lexicon.
// One tap to hear, one tap to find. No timers, typing, lives or penalties.
import { h, heSpan } from '../shell/ui.js';
import { speak } from './engine.js';
import { sfx } from '../audio/sfx.js';
import { isAudioFree } from '../shell/audiofree.js';
import { STORE_KEY, TOPIC_FIRST, TOPIC_ALL, ROUND_SIZE,
  LEVEL_DESCRIPTIONS, assertWordBank, recordFound, nextRound, choiceWords } from './wordfinder.model.js';

const URL = new URL('../../data/games/firstwords.json', import.meta.url);

export function mount(root, ctx) {
  const leaveSfx = sfx.enter(ctx);
  let alive = true;
  let bank = [], found = { version: 1, found: [], rounds: 0 };
  let topic = TOPIC_FIRST, deck = [], index = 0, phase = 'loading';
  let wrong = new Set(), hint = false, roundChoices = [];
  const status = h('p', { class: 'wf-status', role: 'status', 'aria-live': 'polite' }, 'Getting your first words ready…');
  const sound = h('p', { class: 'wf-sound muted', role: 'status', 'aria-live': 'polite' });
  const progress = h('div', { class: 'wf-progress', 'aria-label': 'Your word-finding progress' });
  const stage = h('div', { class: 'wf-stage' });
  const more = h('div', { class: 'wf-menu' });

  root.replaceChildren(h('article', { class: 'card game-card wf-game' },
    h('div', { class: 'wf-eyebrow' }, 'LEVEL 1 OF 9 · START FROM ZERO'),
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Hebrew Word Finder ', heSpan('מִלָּה')),
    h('p', { class: 'wf-intro' }, 'Never heard Hebrew before? You belong here. Listen, look at the letters, then find the same word. You do not need to read yet.'),
    h('p', { class: 'muted' }, 'Hebrew reads right to left ←. The dots help with sounds. Every word has an English meaning.'),
    progress, status, sound, stage, more,
    h('p', { class: 'muted wf-source' },
      '240 sourced words · 5 words per gentle round · vocabulary preview, not yet checked by a native Hebrew educator.')));

  const current = () => deck[index];
  const audioOff = () => isAudioFree(ctx);
  function persist(word) {
    found = recordFound(found, word.id, bank);
    found.rounds++;
    try { ctx?.store?.set?.(STORE_KEY, found); } catch { /* private mode: session remains playable */ }
  }
  function updateProgress() {
    const count = found.found.length;
    progress.replaceChildren(
      h('span', { class: 'wf-progress-label' }, count + ' / 240 words found on this device'),
      h('span', { class: 'wf-track', role: 'progressbar', 'aria-label': 'Words found', 'aria-valuemin': '0', 'aria-valuemax': '240', 'aria-valuenow': String(count) },
        h('span', { class: 'wf-track-fill', style: 'width:' + (100 * count / 240).toFixed(1) + '%' })));
  }
  function englishReadAloud(word) {
    if (audioOff()) { sound.textContent = 'Audio is off in your ALEF settings.'; return; }
    const synth = globalThis.speechSynthesis, Ctor = globalThis.SpeechSynthesisUtterance;
    if (!synth || !Ctor || typeof synth.speak !== 'function') {
      sound.textContent = 'English read-aloud is not available here. The meaning is written on the card.';
      return;
    }
    try {
      synth.cancel();
      const speech = new Ctor(word.en + '. ' + word.use);
      speech.lang = 'en-CA';
      speech.rate = 0.85;
      synth.speak(speech);
      sound.textContent = 'English meaning read by your device, not a recorded teacher.';
    } catch { sound.textContent = 'English read-aloud unavailable. The meaning is written above.'; }
  }
  async function hebrewReadAloud(word) {
    if (audioOff()) { sound.textContent = 'Audio is off in your ALEF settings.'; return; }
    const result = await speak(ctx, word.he, { kind: 'word', id: word.id,
      onStatus: (message) => { if (alive && current()?.id === word.id) sound.textContent = message; } });
    if (!alive || current()?.id !== word.id) return;
    if (result?.source === 'file') sound.textContent = 'Hebrew audio played from the ALEF library.';
    else if (result?.source === 'tts-fallback') sound.textContent = 'Spoken with your device’s Hebrew voice, not a recorded teacher.';
    else sound.textContent = result?.message || 'No Hebrew audio available; use the pointed text and pronunciation guide.';
  }
  function hearingButtons(word) {
    return h('div', { class: 'wf-actions' },
      h('button', { type: 'button', class: 'btn wf-hear', onclick: () => void hebrewReadAloud(word) }, '🔊 Hear Hebrew'),
      h('button', { type: 'button', class: 'btn secondary wf-meaning', onclick: () => englishReadAloud(word) }, '🔈 Hear meaning'));
  }
  function wordCard(word, heading) {
    return h('section', { class: 'wf-word-card' },
      h('p', { class: 'wf-step' }, heading),
      h('div', { class: 'wf-word-large' }, heSpan(word.he, 'he wf-hebrew')),
      h('p', { class: 'wf-say' }, 'Say it: ', h('strong', {}, word.translit)),
      h('p', { class: 'wf-translation' }, word.en),
      h('p', { class: 'wf-usage' }, 'Where you use it: ' + word.use));
  }
  function newRound(nextTopic = topic) {
    topic = nextTopic;
    deck = nextRound(bank, found, topic, ROUND_SIZE);
    index = 0;
    phase = deck.length ? 'learn' : 'empty';
    wrong = new Set(); hint = false; roundChoices = [];
    sound.textContent = ''; paint();
  }
  function startFind() {
    if (!alive || phase !== 'learn') return;
    phase = 'find'; hint = false; wrong = new Set();
    roundChoices = choiceWords(bank, current(), 3);
    sound.textContent = ''; paint();
  }
  function choose(word) {
    if (!alive || phase !== 'find' || wrong.has(word.id)) return;
    const target = current();
    if (word.id !== target.id) {
      wrong.add(word.id);
      status.textContent = 'Good try! That is another word. You can try again, or tap “Show me”.';
      sfx.play('miss');
      paint(false);
      return;
    }
    persist(target);
    sfx.play('success');
    phase = 'found';
    status.textContent = 'You found it! There is no penalty for trying.';
    sound.textContent = '';
    paint();
  }
  function nextWord() {
    if (phase !== 'found') return;
    index++;
    if (index >= deck.length) phase = 'done';
    else phase = 'learn';
    hint = false; wrong = new Set(); roundChoices = [];
    sound.textContent = '';
    paint();
  }
  function menuNode() {
    const themes = [...new Set(bank.map((word) => word.theme))];
    const selected = topic;
    const options = [[TOPIC_FIRST, 'My first 24 words'], [TOPIC_ALL, 'All 240 words'],
      ...themes.map((theme) => [theme, theme])];
    return h('details', { class: 'wf-explore' },
      h('summary', {}, 'Explore more gentle word groups'),
      h('p', { class: 'muted' }, 'Every group is available now. You can return to the first 24 at any time.'),
      h('div', { class: 'wf-topic-list' }, ...options.map(([value, label]) =>
        h('button', { type: 'button', class: 'wf-topic', 'aria-pressed': value === selected ? 'true' : 'false',
          onclick: () => newRound(value) }, label))));
  }
  function paint(resetStatus = true) {
    if (!alive || !bank.length) return;
    updateProgress();
    more.replaceChildren(menuNode());
    if (phase === 'empty') { stage.replaceChildren(h('p', {}, 'This group has no words. Choose another group below.')); return; }
    if (phase === 'done') {
      const names = [...new Set(deck.map((word) => word.en))];
      status.textContent = 'Five words explored. Keep your first wins!';
      stage.replaceChildren(h('section', { class: 'wf-complete' },
        h('p', { class: 'wf-finish-symbol', 'aria-hidden': 'true' }, '✦'),
        h('h2', {}, 'You found your Hebrew words!'),
        h('p', {}, names.join(' · ')),
        h('p', {}, 'You can continue with five new words, or practise the same ones again.'),
        h('button', { type: 'button', class: 'btn wf-next', onclick: () => newRound() }, 'Find five more words'),
        h('a', { class: 'btn secondary', href: '#/games' }, 'See games for Levels 1–9')));
      return;
    }
    const word = current();
    const countText = 'Word ' + (index + 1) + ' of ' + deck.length;
    if (phase === 'learn') {
      if (resetStatus) status.textContent = countText + ' · 1. LOOK & LISTEN';
      stage.replaceChildren(
        wordCard(word, '1 · Meet your word'),
        hearingButtons(word),
        h('p', { class: 'wf-reassure' }, 'Look at the shapes. You do not have to memorise everything.'),
        h('button', { type: 'button', class: 'btn wf-next', onclick: startFind }, 'Now find this word →'));
    } else if (phase === 'find') {
      if (resetStatus) status.textContent = countText + ' · 2. FIND';
      stage.replaceChildren(
        h('section', { class: 'wf-find-header' },
          h('p', { class: 'wf-step' }, '2 · Find the same Hebrew word'),
          h('p', { class: 'wf-prompt' }, 'Find: ', h('strong', {}, word.en)),
          h('p', { class: 'wf-say' }, 'It sounds like: ', h('strong', {}, word.translit)),
          hint ? h('div', { class: 'wf-hint' }, 'Look for these shapes: ', heSpan(word.he, 'he wf-hint-he')) : null),
        hearingButtons(word),
        h('div', { class: 'wf-choices', role: 'group', 'aria-label': 'Choose the matching Hebrew word' },
          ...roundChoices.map(choice => h('button', {
            type: 'button',
            class: 'wf-choice' + (hint && choice.id === word.id ? ' wf-glow' : '') + (wrong.has(choice.id) ? ' wf-not-yet' : ''),
            disabled: wrong.has(choice.id),
            'aria-label': 'Hebrew option ' + choice.he,
            onclick: () => choose(choice)
          }, heSpan(choice.he, 'he wf-choice-he'), wrong.has(choice.id) ? h('span', { class: 'wf-choice-hint' }, 'Try another') : null))),
        h('button', { type: 'button', class: 'btn secondary wf-show', onclick: () => { hint = true; status.textContent = 'A little help: the matching shapes are highlighted in gold.'; paint(false); } }, 'Show me a hint'),
        h('button', { type: 'button', class: 'btn secondary wf-back', onclick: () => { phase = 'learn'; paint(); } }, 'Look at the word again'));
    } else if (phase === 'found') {
      stage.replaceChildren(
        wordCard(word, '✦ You found it!'),
        hearingButtons(word),
        h('p', { class: 'wf-reassure' }, 'That is one more real word you can recognise.'),
        h('button', { type: 'button', class: 'btn wf-next', onclick: nextWord }, index + 1 === deck.length ? 'Finish this round ✓' : 'Next word →'));
    }
  }

  (async () => {
    try {
      const loader = ctx?.fetchFn || globalThis.fetch;
      if (typeof loader !== 'function') throw new Error('No local data access');
      const response = await loader(URL);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      bank = assertWordBank(await response.json());
      if (!alive) return;
      try { found = recordFound(ctx?.store?.get?.(STORE_KEY), '', bank); }
      catch { found = { version: 1, found: [], rounds: 0 }; }
      status.textContent = 'Ready. Your first Hebrew word is waiting.';
      newRound(TOPIC_FIRST);
    } catch {
      if (!alive) return;
      status.textContent = 'The word bank could not be opened on this device.';
      stage.replaceChildren(h('p', {}, 'Try again online or use the First 10 Minutes lesson.'),
        h('a', { class: 'btn', href: '#/firstday' }, 'Start your first 10 minutes'));
    }
  })();
  return () => {
    alive = false;
    try { leaveSfx?.(); } catch { /* optional SFX */ }
  };
}
