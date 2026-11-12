// Meaning Chain: every right answer adds a link to your chain, and a longer chain is worth more when you bank it.
// A wrong answer breaks the chain and loses what you had not banked. Push your luck, or bank early.
// From level 2 the questions alternate: Hebrew to English, then English to Hebrew.
import { mountArcade } from './arcade.js';
import { pickTopics, deck, options, chainValue } from './g2-core.js';
import { start, host, grade, numberKeys, draftNote, word, say, he } from './g2-ui.js';

export const STORE_KEY = 'games.g2-chain.v1';
const QUESTIONS = 20, LIVES = 3;

const spec = {
  id: 'g2-chain', title: 'Meaning Chain', titleHe: 'שַׁרְשֶׁרֶת',
  blurb: 'Answer to add links to your chain; bank the chain to turn it into points. A wrong answer snaps it, so bank before you slip.',
  howTo: ['Pick the meaning (or the Hebrew) of the word shown. Each right answer adds a link worth 2 points.', 'Press Bank to cash in the chain: 2 links make 6, 4 links make 20, 6 links make 42.', 'A wrong answer breaks the chain and costs a heart. Three hearts in all.', `The round ends after ${QUESTIONS} questions or when the hearts run out.`],
  levels: [
    { name: 'Hebrew to English', options: 3, alternate: false, tr: true, topics: ['food', 'home', 'family', 'animals'] },
    { name: 'Both ways', options: 3, alternate: true, tr: true },
    { name: 'Four choices', options: 4, alternate: true, tr: false },
    { name: 'Look-alike choices', options: 4, alternate: true, tr: false, close: true },
    { name: 'Five choices', options: 5, alternate: true, tr: false, close: true },
  ],
  par: () => 60,
  seconds: () => 180,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const big = A.h('div', { class: 'g2-big' });
  const area = A.h('div');
  const chainEl = A.h('p', { class: 'arc-prompt', 'aria-live': 'polite' });
  const bank = A.h('button', { type: 'button', class: 'btn' }, 'Bank');
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'ari', 'Keep the chain going, but bank it in time.'), prompt, big, area, chainEl, A.h('div', { class: 'g2-row' }, bank), after,
    draftNote(A, 'Words come from the app\'s word lists. A native reader has not checked them yet.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  start(A, (D, T) => {
    A.setLives(LIVES);
    const ids = cfg.topics || pickTopics(D, cfg.close ? 3 : 6, rnd, cfg.close);
    const words = deck(D, ids, QUESTIONS, rnd);
    const pool = ids.flatMap((id) => D.items(id));
    let n = 0, chain = 0;
    const showChain = () => {
      chainEl.textContent = chain ? `Chain: ${chain} link${chain === 1 ? '' : 's'}, worth ${chainValue(chain)} if you bank now.` : 'No chain yet.';
      bank.disabled = chain === 0;
      bank.textContent = chain ? `Bank ${chainValue(chain)}` : 'Bank';
    };
    bank.addEventListener('click', () => {
      if (!chain || !T.live()) return;
      A.addScore(chainValue(chain)); A.sfx('confirm');
      A.announce(`Banked ${chainValue(chain)} points for a chain of ${chain}.`);
      chain = 0; showChain();
    });
    const next = () => {
      if (n >= words.length || !T.live()) { if (chain) A.addScore(chainValue(chain)); T.end({ won: true }); return; }
      const w = words[n]; n += 1;
      const toHebrew = cfg.alternate && n % 2 === 0;
      const opts = options(w, pool, cfg.options, rnd, (x) => x.en); // one option per meaning, so "orange" never offers both the fruit and the colour
      prompt.textContent = `Question ${n} of ${words.length}: ${toHebrew ? 'which Hebrew word means' : 'what does this mean?'}`;
      big.replaceChildren(toHebrew ? A.h('span', {}, `"${w.en}"`) : word(A, w, { tr: cfg.tr }));
      const row = A.h('div', { class: 'arc-choices', role: 'group', 'aria-label': 'Choices' });
      for (const x of opts) {
        const b = A.h('button', { type: 'button', class: 'arc-choice' }, toHebrew ? he(A, x.he) : A.h('span', { lang: 'en', dir: 'ltr' }, x.en));
        b.addEventListener('click', () => {
          if (b.disabled) return;
          const ok = x.he === w.he;
          for (const y of row.querySelectorAll('button')) y.disabled = true; // one answer per question, right or wrong
          b.classList.add(ok ? 'is-good' : 'is-bad');
          if (ok) { chain += 1; grade(A, true, { points: 2, right: `${w.he} = ${w.en}. Chain of ${chain}.` }); say(A, w); }
          else {
            const lost = chain; chain = 0;
            grade(A, false, { wrong: `${w.he} means "${w.en}". ${lost ? `The chain of ${lost} broke.` : ''}` });
          }
          showChain();
          after.textContent = `${w.he}${w.tr ? ` (${w.tr})` : ''} = ${w.en}`;
          if (T.live()) T.later(ok ? 500 : 900, next);
        });
        row.append(b);
      }
      area.replaceChildren(row);
    };
    showChain(); next();
  });
}

export const mount = mountArcade(spec, setup);
