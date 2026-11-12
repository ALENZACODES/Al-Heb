// Dreidel screen shared by Beginner 1 and Beginner 2 (src/games/hanukkah-dreidel1.view.js, hanukkah-dreidel2.view.js).
// The rules live in hanukkah-dreidel.js (pure, tested); this file only draws and asks.
//   Beginner 1: every spin names the letter, its sound, the word it stands for and the rule, then counts the gelt out loud
//               (on screen). Short game: 16 spins, 6 gelt each.
//   Beginner 2: the learner reads the letter and picks the rule before the result applies, on every spin. Longer game:
//               40 spins, 10 gelt each. The Israeli dreidel (פ instead of ש) is an option.
import { h, heSpan } from '../shell/ui.js';
import { createDreidelGame, spinFace, applyFace, currentPlayer, describe, heyExplain, FACES } from './hanukkah-dreidel.js';
import { createPage, pageResults, loadHanukkah, byKey, wordLine, sayLetter, sayWord, isQuiet, fx } from './hanukkah-shell.js';
import { shuffled } from './engine.js';

export const LEVELS = Object.freeze({
  1: { id: 'hanukkah-dreidel1', title: 'Dreidel, Beginner 1', start: 6, maxSpins: 16, ask: false },
  2: { id: 'hanukkah-dreidel2', title: 'Dreidel, Beginner 2', start: 10, maxSpins: 40, ask: true },
});
const CAST = [{ id: 'you', name: 'You', human: true }, { id: 'rimon', name: 'Rimon' }, { id: 'ari', name: 'Ari' }, { id: 'noa', name: 'Noa' }];
const NAMES = Object.fromEntries(CAST.map((p) => [p.id, p.name]));
const SPIN_MS = 1200;

export function mountDreidel(level) {
  const L = LEVELS[level] || LEVELS[1];
  return async function mount(root, ctx) {
    const P = createPage(root, ctx, {
      id: L.id, title: L.title, titleHe: 'סְבִיבוֹן',
      cast: 'You play against Rimon, Ari and Noa. Everyone starts with the same gelt.',
      blurb: level === 1
        ? 'Spin the dreidel and learn its four letters. Each spin shows the letter, its name, its sound, the word it stands for and what to do with the gelt.'
        : 'Read the dreidel yourself. When it lands, name the letter and choose the rule before the gelt moves. Try the Israeli dreidel too.',
      howTo: level === 1
        ? ['Everyone puts one gelt piece in the pot to start.', 'On your turn press Spin. On the others’ turns press Next Turn.', 'נ Nun: nothing. ג Gimel: take the whole pot. ה Hey: take half (round up when the pot is odd). ש Shin: put one in.', 'When the pot is empty or has one piece, everyone puts one in again. No gelt left means you are out.', 'After 16 spins the most gelt wins.']
        : ['Choose the dreidel: the one used outside Israel (ש) or the Israeli one (פ).', 'After each spin, pick the letter’s name, then pick its rule. Then the gelt moves.', 'Each right answer scores 10 points; your gelt at the end is added on.', 'The game ends when one player has all the gelt, or after 40 spins.'],
    });
    let alive = true, game = null, variant = 'diaspora', spinning = 0, turnDeg = 0, reads = 0, rights = 0;
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms); timers.add(t); return t; };
    let D, W;
    try { [D, W] = await Promise.all([loadHanukkah(ctx, 'dreidel'), loadHanukkah(ctx, 'words')]); }
    catch { P.announce('The dreidel letters could not load. Check the connection and open the game again.'); return () => { alive = false; P.destroy(); }; }
    if (!alive) return () => {};
    const words = byKey(W);
    const letter = (face) => D.letters[face];
    const lettersForDescribe = Object.fromEntries(Object.entries(D.letters).map(([k, v]) => [k, { he: v.he, name: v.name }]));

    // ---------- static teaching panel ----------
    function phraseCard() {
      const ph = D.phrase[variant];
      return h('section', { class: 'hk-face-card', 'aria-labelledby': `${L.id}-phrase-h` },
        h('h2', { id: `${L.id}-phrase-h` }, 'The Four Letters'),
        h('p', { class: 'hk-big', lang: 'he', dir: 'rtl' }, ph.he),
        h('p', {}, h('em', {}, ph.translit), ` — “${ph.en}.” The first letter of each word is on the dreidel.`),
        h('ul', { class: 'hk-legend' }, ...FACES[variant].map((f, i) => {
          const l = letter(f); const w = words.get(ph.words[i]);
          return h('li', {}, heSpan(l.he, 'he hk-he'), ` ${l.name} (`, heSpan(l.nameHe), `) — sound: ${l.sound}. Stands for `, w ? wordLine(w) : '', `. Rule: ${l.ruleEn}`);
        })),
        h('p', { class: 'muted' }, D.israelNote));
    }
    const playersList = h('ul', { class: 'hk-players', 'aria-label': 'Players and their gelt' });
    const pot = h('p', { class: 'hk-pot', 'aria-live': 'off' });
    const dreidel = h('div', { class: 'hk-dreidel', role: 'img', 'aria-label': 'The dreidel' }, heSpan('נ'));
    const face = h('div', { class: 'hk-face' });
    const ask = h('div', { class: 'hk-ask' });

    function paintTable() {
      if (!game) return;
      playersList.replaceChildren(...game.players.map((p, i) => h('li', { class: 'hk-player' + (i === game.turn && !game.over ? ' is-turn' : '') + (p.out ? ' is-out' : '') },
        h('strong', {}, p.name), i === game.turn && !game.over ? h('span', { class: 'visually-hidden' }, ', turn now') : null,
        h('div', { class: 'hk-gelt', 'aria-hidden': 'true' }, '●'.repeat(Math.min(p.gelt, 40)) || '—'),
        h('div', {}, p.out ? 'Out' : `${p.gelt} gelt`))));
      pot.textContent = `Pot: ${game.pot} gelt ${'●'.repeat(Math.min(game.pot, 40))}`;
    }

    function setControls(...btns) { P.controls.replaceChildren(...btns); const b = btns.find(Boolean); try { b?.focus?.(); } catch { /* no focus in a small DOM */ } }

    function newGame() {
      game = createDreidelGame({ players: CAST, start: L.start, variant, maxSpins: L.maxSpins });
      reads = 0; rights = 0;
      P.results.replaceChildren();
      P.board.replaceChildren(phraseCard(), playersList, pot, h('div', { style: 'text-align:center' }, dreidel), face, ask);
      face.replaceChildren(); ask.replaceChildren();
      paintTable();
      P.announce(`New game. Everyone put one gelt in. The pot has ${game.pot}. ${turnLine()}`);
      nextStep();
    }
    const turnLine = () => { const p = currentPlayer(game); return p.human ? 'Your turn: press Spin.' : `${p.name}’s turn.`; };

    function nextStep() {
      if (!alive || !game) return;
      paintTable();
      if (game.over) { finish(); return; }
      const p = currentPlayer(game);
      const btn = h('button', { type: 'button', class: 'btn hk-spin', onclick: () => spin() }, p.human ? 'Spin' : `Next Turn: ${p.name} Spins`);
      setControls(btn);
    }

    function spin() {
      if (spinning || !game || game.over) return;
      const p = currentPlayer(game);
      const landed = spinFace(variant);
      fx(ctx, 'whoosh');
      P.controls.replaceChildren();
      face.replaceChildren(); ask.replaceChildren();
      const quiet = isQuiet(ctx);
      P.announce(`${p.human ? 'You spin' : `${p.name} spins`} the dreidel…`);
      if (quiet) { land(p, landed); return; }
      // one smooth turn (a CSS transition, not a looping animation); the letter shows only when it lands
      turnDeg += 1080; // whole turns, so the letter lands upright
      dreidel.replaceChildren(h('span', { 'aria-hidden': 'true' }, '\u2726'));
      dreidel.style.transform = `rotate(${turnDeg}deg)`;
      spinning = later(() => { spinning = 0; land(p, landed); }, SPIN_MS);
    }

    function land(p, f) {
      const l = letter(f);
      dreidel.replaceChildren(heSpan(l.he));
      dreidel.setAttribute('aria-label', L.ask ? `The dreidel landed on a letter: ${l.he}` : `The dreidel landed on ${l.name}`);
      if (L.ask) askLetter(p, f); else apply(p, f);
    }

    // Beginner 2: read the letter, then choose the rule, then the gelt moves.
    function askLetter(p, f) {
      const l = letter(f);
      const opts = shuffled(FACES[variant]);
      const q = h('div', { role: 'group', 'aria-labelledby': `${L.id}-q1` },
        h('p', { id: `${L.id}-q1` }, h('strong', {}, `${p.human ? 'You' : p.name} landed on `), heSpan(l.he, 'he hk-he'), h('strong', {}, '. Which letter is it?')),
        h('div', { class: 'hk-row' }, ...opts.map((o) => h('button', { type: 'button', class: 'btn secondary', onclick: (e) => {
          reads++; const ok = o === f; if (ok) rights++;
          fx(ctx, ok ? 'success' : 'miss');
          markChoice(e.target, ok);
          P.announce(ok ? `Yes: ${l.name}.` : `Not quite: this is ${l.name} (${l.he}).`);
          sayLetter(ctx, l.letterId, l.nameHe);
          later(() => askRule(p, f, ok), isQuiet(ctx) ? 0 : 500);
        } }, letter(o).name))));
      ask.replaceChildren(q);
      try { q.querySelector('button')?.focus?.(); } catch { /* ignore */ }
    }
    function askRule(p, f, readOk) {
      const l = letter(f);
      const rules = ['none', 'all', 'half', 'put'];
      const q = h('div', { role: 'group', 'aria-labelledby': `${L.id}-q2` },
        h('p', { id: `${L.id}-q2` }, readOk ? '' : `It is ${l.name}. `, h('strong', {}, `What does `), heSpan(l.he, 'he hk-he'), h('strong', {}, ` ${l.name} tell ${p.human ? 'you' : p.name} to do?`)),
        h('div', { class: 'hk-row' }, ...rules.map((r) => h('button', { type: 'button', class: 'btn secondary', onclick: (e) => {
          reads++; const ok = r === l.rule; if (ok) rights++;
          fx(ctx, ok ? 'success' : 'miss');
          markChoice(e.target, ok);
          P.announce(ok ? `Right: ${D.rules[r]}.` : `Not quite: ${l.name} means ${D.rules[l.rule].toLowerCase()}.`);
          later(() => apply(p, f), isQuiet(ctx) ? 0 : 500);
        } }, D.rules[r]))));
      ask.replaceChildren(q);
      try { q.querySelector('button')?.focus?.(); } catch { /* ignore */ }
    }
    function markChoice(btn, ok) {
      btn?.classList?.add(ok ? 'is-good' : 'is-bad');
      for (const b of btn?.parentNode?.querySelectorAll?.('button') || []) b.disabled = true;
    }

    function apply(p, f) {
      const l = letter(f);
      const potBefore = game.pot;
      const gBefore = p.gelt;
      const ev = applyFace(game, f);
      const w = words.get(l.word);
      ask.replaceChildren();
      const counting = [];
      if (ev.rule === 'all') counting.push(`${p.human ? 'You had' : `${p.name} had`} ${gBefore}. ${gBefore} + ${ev.took} = ${gBefore + ev.took}.`);
      if (ev.rule === 'half' && potBefore) counting.push(`${heyExplain(potBefore)} ${gBefore} + ${ev.took} = ${gBefore + ev.took}.`);
      if (ev.rule === 'put' && ev.put) counting.push(`${gBefore} − 1 = ${gBefore - 1}. The pot goes from ${potBefore} to ${potBefore + 1}.`);
      if (ev.reAnte) counting.push(`The pot had ${ev.potAfter - ev.reAnte.length <= 0 ? 'nothing' : 'just one'} left, so everyone still in put one more in. Pot: ${ev.potAfter}.`);
      face.replaceChildren(h('section', { class: 'hk-face-card', 'aria-label': `${l.name}: what happened` },
        h('p', {}, heSpan(l.he, 'he hk-big'), ' ', h('strong', {}, l.name), ' (', heSpan(l.nameHe), `) — sound: ${l.sound}.`),
        w ? h('p', {}, 'Stands for ', wordLine(w), '.') : null,
        h('p', {}, h('strong', {}, `Rule: ${l.ruleEn}`)),
        ...counting.map((c) => h('p', {}, c)),
        ev.out.length ? h('p', {}, `${ev.out.map((id) => NAMES[id]).join(' and ')} ${ev.out.length > 1 ? 'are' : 'is'} out of gelt.`) : null));
      if (!L.ask) { sayLetter(ctx, l.letterId, l.nameHe); }
      else if (w) sayWord(ctx, w);
      fx(ctx, ev.took ? 'collect' : ev.put ? 'drop' : 'tick');
      P.announce(describe(ev, NAMES, lettersForDescribe) + (ev.over ? '' : ' ' + turnLine()));
      nextStep();
    }

    function finish() {
      const you = game.players.find((p) => p.human);
      const won = game.winners.includes('you');
      const gelt = you.gelt;
      const score = L.ask ? rights * 10 + gelt + (won ? 10 : 0) : gelt + (won ? 5 : 0);
      const stars = L.ask
        ? (reads ? (rights / reads >= 0.9 ? 3 : rights / reads >= 0.7 ? 2 : rights / reads >= 0.4 ? 1 : 0) : 0)
        : (won ? 3 : gelt >= L.start ? 2 : gelt > 0 ? 1 : 0);
      const winners = game.winners.map((id) => NAMES[id]).join(' and ');
      P.controls.replaceChildren();
      P.announce(`Game over. ${winners} ${game.winners.length > 1 ? 'share the win' : 'wins'}.`);
      pageResults(P, ctx, {
        id: L.id, heading: won ? 'You Win the Gelt!' : `${winners} ${game.winners.length > 1 ? 'Share the Win' : 'Wins'}`, score, stars,
        lines: [
          `You finished with ${gelt} gelt after ${game.spins} spins.`,
          L.ask ? `You read ${rights} of ${reads} letters and rules right.` : 'Every spin taught one of the four letters: נ ג ה ש.',
          h('p', {}, 'Remember: ', heSpan(D.phrase[variant].he), ` — ${D.phrase[variant].en}.`),
          `Score: ${score}.`,
        ],
        onAgain: () => newGame(),
      });
    }

    // ---------- start screen ----------
    function startScreen() {
      const start = h('button', { type: 'button', class: 'btn', onclick: () => newGame() }, 'Start the Game');
      const picker = L.ask ? h('fieldset', { class: 'hk-variant' }, h('legend', {}, 'Which dreidel?'),
        ...[['diaspora', 'Outside Israel: נ ג ה ש (Nes Gadol Hayah Sham, “a great miracle happened there”)'], ['israel', 'In Israel: נ ג ה פ (Nes Gadol Hayah Po, “a great miracle happened here”)']].map(([v, label]) =>
          h('label', { style: 'display:block' }, h('input', { type: 'radio', name: `${L.id}-variant`, value: v, checked: v === variant || undefined, onchange: () => { variant = v; P.board.replaceChildren(phraseCard()); } }), ' ', label))) : null;
      P.board.replaceChildren(phraseCard());
      P.controls.replaceChildren(...[picker, start].filter(Boolean));
      P.announce(L.ask ? 'Pick a dreidel and press Start the Game.' : 'Press Start the Game. You spin first.');
    }
    startScreen();
    return () => { alive = false; for (const t of timers) clearTimeout(t); P.destroy(); };
  };
}
