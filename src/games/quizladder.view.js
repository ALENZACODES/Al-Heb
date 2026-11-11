// Quiz Ladder: Ari hosts a ten-rung quiz. Each rung is worth more. Two lifelines: "halve" removes two
// wrong answers, "Noa" reads the word aloud (when a recording exists). A wrong answer drops you to the
// last safe rung (3 or 6). Stop and bank, or climb on.
import { mountArcade, choiceRow, randInt } from './arcade.js';
import { pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.quizladder.v1';

const RUNGS = [10, 20, 30, 50, 70, 100, 140, 180, 240, 300];

const spec = {
  id: 'quizladder', title: 'Quiz Ladder', titleHe: 'סֻלָּם',
  blurb: 'Ari asks, you climb. Ten rungs, each worth more than the last. Two lifelines, two safe rungs, and the nerve to bank your points or risk them on the next question.',
  howTo: ['Each rung is a question about a Hebrew word: its meaning, its sound or its first letter.', 'Pick one answer: three choices on level 1, four from level 2 on. Right climbs a rung; wrong drops you to the last safe rung (3 or 6).', 'Lifelines: Halve removes two wrong answers; Ask Noa plays the word (where a recording exists).', 'After any right answer you may Bank and stop. Reach rung 10 for the top prize.'],
  levels: [
    { name: 'Meanings', kinds: ['meaning'], options: 3 },
    { name: 'Meanings and sounds', kinds: ['meaning', 'sound'], options: 4 },
    { name: 'Plus first letters', kinds: ['meaning', 'sound', 'first'], options: 4 },
    { name: 'Hebrew to English', kinds: ['meaning', 'sound', 'first', 'reverse'], options: 4 },
    { name: 'Everything, same-theme decoys', kinds: ['meaning', 'sound', 'first', 'reverse'], options: 4, sameTheme: true },
  ],
  par: (l, cfg) => 300,
  seconds: (l, cfg) => 240,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const words = A.words; if (words.length < 20) { A.announce('Word bank did not load.'); return; }
  let rung = 0, halve = 1, ask = 1, banked = 0, current = null;
  const host = A.h('div', { class: 'arc-host' }, A.cast('ari-host', 'Ari the quiz host'), A.h('p', { class: 'arc-prompt' }));
  const q = host.lastChild;
  const ladder = A.h('div', { class: 'arc-choices', 'aria-label': 'Ladder' });
  const answers = A.h('div');
  const tools = A.h('div', { class: 'row' });
  A.board.replaceChildren(host, ladder, answers, tools);
  const drawLadder = () => ladder.replaceChildren(...RUNGS.map((v, i) => A.h('span', { class: 'arc-badge', style: i < rung ? '' : i === rung ? 'outline:2px solid currentColor' : 'background:var(--card,#eee);color:inherit;border:1px solid var(--line,#8886)' }, `${i + 1}: ${v}${i === 2 || i === 5 ? ' ✓' : ''}`)));
  const bank = () => { A.addScore(RUNGS[rung - 1] - banked); A.announce(`Banked ${RUNGS[rung - 1]} points at rung ${rung}.`); A.finish({ won: true }); };
  const nextQ = () => {
    if (rung >= RUNGS.length) { A.addScore(RUNGS[9] - banked); A.announce('Top of the ladder!'); A.finish({ won: true }); return; }
    const w = words[randInt(rnd, words.length)];
    const kind = cfg.kinds[randInt(rnd, cfg.kinds.length)];
    const pool = cfg.sameTheme ? words.filter((x) => x.theme === w.theme && x.id !== w.id) : words.filter((x) => x.id !== w.id);
    const decoys = pickSeeded(pool.length >= 3 ? pool : words.filter((x) => x.id !== w.id), cfg.options - 1, rnd);
    let prompt, render, isRight;
    if (kind === 'meaning') { prompt = ['What does ', A.heSpan(w.he), ' mean?']; render = (o) => o.en; isRight = (o) => o.id === w.id; }
    else if (kind === 'sound') { prompt = ['How does ', A.heSpan(w.he), ' sound?']; render = (o) => o.translit; isRight = (o) => o.id === w.id; }
    else if (kind === 'first') { prompt = [`Which letter starts "${w.translit}" (${w.en})?`]; const first = (x) => x.he.replace(/[֑-ׇ]/g, '')[0]; const seen = new Set([first(w)]); const opts = [w]; for (const d of words.filter((x) => !seen.has(first(x)))) { if (opts.length >= cfg.options) break; seen.add(first(d)); opts.push(d); } current = { w, opts: pickSeeded(opts, opts.length, rnd), render: (o) => first(o), isRight: (o) => o.id === w.id }; show(prompt); return; }
    else { prompt = [`Which word means "${w.en}"?`]; render = (o) => o.he; isRight = (o) => o.id === w.id; }
    current = { w, opts: pickSeeded([w, ...decoys], cfg.options, rnd), render, isRight };
    show(prompt);
  };
  const show = (prompt) => {
    q.replaceChildren(`Rung ${rung + 1} for ${RUNGS[rung]}: `, ...prompt);
    drawLadder();
    answers.replaceChildren(choiceRow(current.opts, (o) => A.h('span', {}, current.render(o)), (o) => {
      const ok = current.isRight(o);
      if (ok) { rung++; A.sfx('success'); A.announce(`Right. ${current.w.he} = ${current.w.en}.`); A.sayWord(current.w); setTimeout(nextQ, A.quiet ? 0 : 600); }
      else { const safe = rung >= 6 ? 6 : rung >= 3 ? 3 : 0; A.sfx('miss'); A.miss(); A.announce(`Wrong: ${current.w.he} means ${current.w.en}. Down to rung ${safe}.`); const pts = safe ? RUNGS[safe - 1] : 0; A.addScore(pts - banked); banked = pts; A.finish({ reason: 'done' }); }
      return ok;
    }));
    tools.replaceChildren(
      A.h('button', { type: 'button', class: 'btn secondary', disabled: !halve || undefined, onclick: () => { halve = 0; const wrong = [...answers.querySelectorAll('button')].filter((b, i) => !current.isRight(current.opts[i])); for (const b of wrong.slice(0, 2)) b.disabled = true; tools.firstChild.disabled = true; } }, `Halve (${halve})`),
      A.h('button', { type: 'button', class: 'btn secondary', disabled: !ask || undefined, onclick: () => { ask = 0; A.sayWord(current.w); A.announce(A.hasWordClip(current.w) ? 'Noa reads the word.' : `No recording for this word. It sounds like "${current.w.translit}".`); tools.children[1].disabled = true; } }, `Ask Noa (${ask})`),
      ...(rung > 0 ? [A.h('button', { type: 'button', class: 'btn', onclick: bank }, `Bank ${RUNGS[rung - 1]}`)] : [])); // replaceChildren would print a literal 'null'
  };
  A.setLives(0);
  nextQ();
}

export const mount = mountArcade(spec, setup);
