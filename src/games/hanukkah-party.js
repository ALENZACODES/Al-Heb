// Pass-the-phone party rounds shared by Hanukkah Charades and Forbidden Word.
//   charades:  the actor sees a card (Hebrew, transliteration, English) and acts it out without words. +1 when the team
//              guesses it, +2 when they say the Hebrew word.
//   forbidden: the describer explains the word without saying any of the forbidden words. +1 for a guess, +2 for the
//              Hebrew word, Mistake takes one off.
// Two teams take turns; each turn has a timer (60 or 90 seconds) or none (calm mode starts with none).
import { h, heSpan } from '../shell/ui.js';
import { createPage, pageResults, loadHanukkah, byKey, wordLine, isQuiet, fx, sayWord } from './hanukkah-shell.js';
import { shuffled } from './engine.js';

/** Pure: a deck that deals every card once before any repeats. */
export function createDeck(cards, rnd = Math.random) {
  let pile = shuffled(cards, rnd), used = 0;
  return { next() { if (!pile.length) return null; if (used >= pile.length) { pile = shuffled(cards, rnd); used = 0; } return pile[used++]; }, get left() { return pile.length - used; } };
}
/** Pure: points for one card outcome. */
export function points(mode, outcome) {
  if (outcome === 'got') return 1;
  if (outcome === 'hebrew') return 2;
  if (outcome === 'mistake') return mode === 'forbidden' ? -1 : 0;
  return 0;
}

const MODES = {
  charades: {
    id: 'hanukkah-charades', title: 'Hanukkah Charades', titleHe: 'פַּנְטוֹמִימָה',
    blurb: 'A party game for two teams and one phone. The actor sees a Hanukkah word and acts it out with no talking. The team calls out the answer, in English or, for extra points, in Hebrew.',
    howTo: ['Name the two teams and pick a turn length.', 'Pass the phone to the actor. Only the actor looks at the card.', 'Act it out: no talking, no pointing at things in the room that give it away.', 'Got It is 1 point. Said in Hebrew is 2. Skip when you are stuck.', 'When the time runs out, pass the phone to the other team.'],
    showLabel: 'I Am the Actor: Show the Card',
  },
  forbidden: {
    id: 'hanukkah-forbidden', title: 'Forbidden Word', titleHe: 'מִלָּה אֲסוּרָה',
    blurb: 'A party game for two teams and one phone. Describe the Hanukkah word so your team guesses it, without saying the word itself or any word on the forbidden list.',
    howTo: ['Name the two teams and pick a turn length.', 'Pass the phone to the describer. Only the describer looks at the card.', 'Describe the word without saying it, its Hebrew, or anything on the forbidden list.', 'Got It is 1 point, the Hebrew word is 2. If you say a forbidden word, the other team presses Mistake: minus 1.', 'When the time runs out, pass the phone to the other team.'],
    showLabel: 'I Am Describing: Show the Card',
  },
};

export function mountParty(mode) {
  const M = MODES[mode] || MODES.charades;
  return async function mount(root, ctx) {
    const P = createPage(root, ctx, { id: M.id, title: M.title, titleHe: M.titleHe, blurb: M.blurb, howTo: M.howTo, cast: 'Team Ari and Team Noa are the default teams; Rimon keeps the time and the score.' });
    let alive = true, W, deck, teams = [], turnsEach = 3, seconds = isQuiet(ctx) ? 0 : 60, turn = 0, clock = 0, timeLeft = 0, card = null;
    try { W = await loadHanukkah(ctx, 'words'); }
    catch { P.announce('The word cards could not load. Check the connection and open the game again.'); return () => { alive = false; P.destroy(); }; }
    if (!alive) return () => {};
    const words = byKey(W);
    const cards = (W.cards || []).map((c) => ({ ...c, word: words.get(c.key) })).filter((c) => c.word);
    const stopClock = () => { if (clock) { clearInterval(clock); clock = 0; } };
    const teamOf = () => teams[turn % 2];
    const scoreLine = () => h('p', { class: 'hk-score' }, ...teams.map((t) => h('span', {}, `${t.name}: ${t.score}`)));

    function setup() {
      stopClock();
      const nameA = h('input', { type: 'text', id: `${M.id}-ta`, value: 'Team Ari', maxlength: 24 });
      const nameB = h('input', { type: 'text', id: `${M.id}-tb`, value: 'Team Noa', maxlength: 24 });
      const time = h('select', { id: `${M.id}-time` }, ...[[60, '60 seconds'], [90, '90 seconds'], [0, 'No timer']].map(([v, l]) => h('option', { value: String(v), selected: v === seconds || undefined }, l)));
      const rounds = h('select', { id: `${M.id}-rounds` }, ...[2, 3, 4].map((v) => h('option', { value: String(v), selected: v === turnsEach || undefined }, `${v} turns each`)));
      const go = h('button', { type: 'button', class: 'btn', onclick: () => {
        teams = [{ name: String(nameA.value || '').trim() || 'Team Ari', score: 0 }, { name: String(nameB.value || '').trim() || 'Team Noa', score: 0 }];
        seconds = Number(time.value) || 0; turnsEach = Number(rounds.value) || 3; turn = 0;
        deck = createDeck(cards);
        passScreen();
      } }, 'Start the Party');
      P.results.replaceChildren(); P.controls.replaceChildren();
      P.board.replaceChildren(h('div', { class: 'hk-setup' },
        h('p', {}, h('label', { for: nameA.id }, 'First team '), nameA),
        h('p', {}, h('label', { for: nameB.id }, 'Second team '), nameB),
        h('p', {}, h('label', { for: time.id }, 'Turn length '), time),
        h('p', {}, h('label', { for: rounds.id }, 'Game length '), rounds),
        h('p', { class: 'muted' }, `${cards.length} cards, each with Hebrew, how to say it and the English.`), go));
      P.announce('Set up the teams, then press Start the Party.');
    }

    function passScreen() {
      stopClock();
      if (turn >= turnsEach * 2) { finish(); return; }
      const t = teamOf();
      const show = h('button', { type: 'button', class: 'btn', onclick: () => startTurn() }, M.showLabel);
      P.board.replaceChildren(scoreLine(), h('h2', { tabindex: '-1', id: `${M.id}-pass` }, `Pass the Phone to ${t.name}`),
        h('p', {}, `Turn ${Math.floor(turn / 2) + 1} of ${turnsEach}. Only the ${mode === 'charades' ? 'actor' : 'describer'} looks at the screen now.`));
      P.controls.replaceChildren(show);
      P.announce(`Pass the phone to ${t.name}.`);
      try { show.focus(); } catch { /* ignore */ }
    }

    const timerEl = h('p', { class: 'hk-timer', role: 'timer', 'aria-live': 'off' });
    const cardEl = h('div', { class: 'hk-cardface' });
    function deal() {
      card = deck.next();
      if (!card) { endTurn('No more cards.'); return; }
      const w = card.word;
      cardEl.replaceChildren(heSpan(w.he, 'he hk-he'), h('p', {}, h('strong', {}, w.translit), ` · ${w.en}`),
        mode === 'forbidden' ? h('div', {}, h('p', { class: 'muted' }, 'Do not say:'), h('ul', { class: 'hk-forbid', 'aria-label': 'Forbidden words' }, ...[w.translit, ...card.forbidden].map((f) => h('li', {}, f)))) : null);
      P.announce(`Card: ${w.en}. Hebrew ${w.translit}.`);
    }
    function startTurn() {
      deal();
      const got = h('button', { type: 'button', class: 'btn', onclick: () => outcome('got') }, 'Got It (+1)');
      const heb = h('button', { type: 'button', class: 'btn', onclick: () => outcome('hebrew') }, 'Said in Hebrew (+2)');
      const skip = h('button', { type: 'button', class: 'btn secondary', onclick: () => outcome('skip') }, 'Skip');
      const oops = mode === 'forbidden' ? h('button', { type: 'button', class: 'btn secondary', onclick: () => outcome('mistake') }, 'Mistake (−1)') : null;
      const end = h('button', { type: 'button', class: 'btn secondary', onclick: () => endTurn('Turn ended.') }, 'End Turn');
      P.board.replaceChildren(scoreLine(), timerEl, cardEl);
      P.controls.replaceChildren(...[got, heb, skip, oops, end].filter(Boolean));
      timeLeft = seconds;
      timerEl.textContent = seconds ? `⏱ ${timeLeft}s` : 'No timer';
      if (seconds) clock = setInterval(() => {
        if (!alive) return stopClock();
        timeLeft -= 1; timerEl.textContent = `⏱ ${Math.max(0, timeLeft)}s`;
        if (timeLeft === 10) { P.announce('Ten seconds left.'); fx(ctx, 'tick'); }
        if (timeLeft <= 0) { fx(ctx, 'streak'); endTurn('Time is up!'); }
      }, 1000);
      try { got.focus(); } catch { /* ignore */ }
    }
    function outcome(kind) {
      const t = teamOf();
      const p = points(mode, kind);
      t.score += p;
      if (kind === 'got' || kind === 'hebrew') { fx(ctx, 'success'); sayWord(ctx, card?.word); }
      else if (kind === 'mistake') fx(ctx, 'error_soft');
      else fx(ctx, 'swoosh');
      const said = kind === 'mistake' ? `Mistake: ${t.name} loses a point.` : kind === 'skip' ? 'Skipped.' : `${t.name} +${p}.`;
      P.board.firstChild?.replaceWith?.(scoreLine());
      if (kind === 'mistake') { P.announce(`${said} ${t.name}: ${t.score}.`); return; } // the card stays; carry on describing
      P.announce(`${said} The answer was ${card.word.en} (${card.word.translit}).`);
      deal();
    }
    function endTurn(why) {
      stopClock();
      turn += 1;
      P.announce(`${why} ${teams.map((t) => `${t.name} ${t.score}`).join(', ')}.`);
      passScreen();
    }
    function finish() {
      stopClock();
      const [a, b] = teams;
      const win = a.score === b.score ? null : a.score > b.score ? a : b;
      P.board.replaceChildren(scoreLine()); P.controls.replaceChildren();
      const top = Math.max(a.score, b.score, 0);
      pageResults(P, ctx, {
        id: M.id, heading: win ? `${win.name} Wins!` : 'It Is a Tie!', score: top, stars: top >= 10 ? 3 : top >= 6 ? 2 : top >= 2 ? 1 : 0,
        lines: [`${a.name}: ${a.score} · ${b.name}: ${b.score}.`, h('p', {}, 'Chag sameach! ', words.get('chagsameach') ? wordLine(words.get('chagsameach')) : '')],
        onAgain: () => setup(),
      });
    }
    setup();
    return () => { alive = false; stopClock(); P.destroy(); };
  };
}
