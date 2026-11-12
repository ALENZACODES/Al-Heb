// Sukkah Builder: build a sukkah step by step (where, walls, roof, how thick), choosing only what the rules allow. Then
// inspect the neighbours' sukkot: which one breaks a rule, and which rule? The rules are the traditional ones in plain
// words; the app's draft note says to check details with your own community.
import { mountG5, host, track, grade, draftNote, numberKeys, card, heText, button, lock } from './g5-ui.js';
import { loadData, loadVerse, excerpt, refText, g5Data, shuffle, brokenRules, randomSukkah } from './g5-core.js';

export const STORE_KEY = 'games.g5-sukkah.v1';
export const RULE_NAMES = Object.freeze({ sky: 'Open to the sky', walls: 'Enough walls', schach: 'Roof covering', shade: 'More shade than sun' });

const spec = {
  id: 'g5-sukkah', title: 'Sukkah Builder', titleHe: 'סֻכָּה',
  blurb: 'For the seven days of Sukkot people live, or at least eat, in a sukkah: a hut with a roof of branches. Build one by its rules, then check the neighbours\' work.',
  howTo: ['Build: answer each question (where, walls, roof, how thick). A choice that breaks a rule is explained and crossed out.', 'Levels 4 and 5: inspect. Find the sukkah that breaks a rule, then name the rule.', 'Number keys pick a choice.'],
  levels: [
    { name: 'Build one, rules shown', mode: 'build', n: 1, rules: true },
    { name: 'Build two', mode: 'build', n: 2, rules: false },
    { name: 'Build three', mode: 'build', n: 3, rules: false },
    { name: 'Which one breaks a rule?', mode: 'spot', n: 5 },
    { name: 'Name the rule', mode: 'name', n: 7 },
  ],
  par: (l, cfg) => (cfg.mode === 'build' ? cfg.n * 40 : cfg.n * 10),
  seconds: (l, cfg) => 40 + cfg.n * (cfg.mode === 'build' ? 30 : 18),
};

/** Short description of a finished sukkah, one line per step. */
export const describe = (steps, picks) => steps.map((s) => s.options.find((o) => o.id === picks[s.id]).en);

function setup(A) {
  const T = track(A), cfg = A.cfg, rnd = A.rnd, ctx = A.ctx;
  const prompt = A.h('p', { class: 'arc-prompt', 'aria-live': 'polite' });
  const rules = A.h('ul', { class: 'muted' });
  const area = A.h('div', { class: 'g5-grid', role: 'group', 'aria-label': 'Choices' });
  const built = A.h('ol', { class: 'tg-line', 'aria-label': 'Your sukkah so far' });
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'ari', 'Let\'s build a sukkah.'), prompt, rules, area, built, after,
    draftNote(A, 'Traditional rules in plain words, awaiting a teacher\'s check. Communities differ on the details; your own rabbi\'s guidance comes first.'));
  numberKeys(A, () => area);
  loadData(ctx, g5Data('sukkah')).then(async (d) => {
    if (!T.live()) return;
    const v = await loadVerse(ctx, d.verse.ref);
    if (!T.live()) return;
    if (cfg.rules) rules.replaceChildren(...Object.values(d.rules).map((r) => A.h('li', {}, r)));
    const verseLine = () => after.replaceChildren(heText(A, excerpt(v.he, d.verse.from, d.verse.to)), ` (${refText(d.verse.ref)}): ${d.verse.en}.`);
    let k = 0;
    const build = () => {
      if (k >= cfg.n) { T.end({ won: true }); return; }
      k += 1;
      const picks = {};
      built.replaceChildren();
      let s = 0;
      const step = () => {
        if (s >= d.steps.length) { A.addScore(10); A.announce('Your sukkah is ready. Chag sameach!'); verseLine(); T.later(1400, build); return; }
        const st = d.steps[s++];
        prompt.textContent = `Sukkah ${k} of ${cfg.n}, step ${s} of ${d.steps.length}: ${st.ask}`;
        area.replaceChildren(...shuffle(st.options, rnd).map((o) => button(A, card(A, null, o.en), (b) => {
          grade(A, o.ok, { right: `${o.en}: fine.`, wrong: d.rules[o.rule] });
          if (o.ok) { picks[st.id] = o.id; built.append(A.h('li', {}, o.en)); lock(area); T.later(500, step); }
          else { b.disabled = true; b.append(A.h('span', { class: 'g5-tag' }, ` ✗ ${RULE_NAMES[o.rule]}`)); after.textContent = d.rules[o.rule]; }
        })));
      };
      step();
    };
    const spot = () => {
      if (k >= cfg.n) { T.end({ won: true }); return; }
      k += 1;
      built.replaceChildren();
      const bad = randomSukkah(d.steps, false, rnd);
      const set = shuffle([{ picks: bad, bad: true }, { picks: randomSukkah(d.steps, true, rnd) }, { picks: randomSukkah(d.steps, true, rnd) }], rnd);
      prompt.textContent = `Street ${k} of ${cfg.n}: one of these three sukkot breaks a rule. Which?`;
      area.replaceChildren(...set.map((x, j) => button(A, card(A, null, `Sukkah ${j + 1}`, ...describe(d.steps, x.picks)), (b) => {
        const why = brokenRules(d.steps, bad).map((r) => d.rules[r]).join(' ');
        grade(A, !!x.bad, { right: `Yes. ${why}`, wrong: 'That one keeps the rules.' });
        if (x.bad) { after.textContent = why; lock(area); T.later(1300, spot); } else { b.disabled = true; b.append(A.h('span', { class: 'g5-tag' }, ' ✓ keeps the rules')); }
      })));
    };
    const name = () => {
      if (k >= cfg.n) { T.end({ won: true }); return; }
      k += 1;
      built.replaceChildren();
      const ok = rnd() < 0.3;
      const picks = randomSukkah(d.steps, ok, rnd);
      const broken = brokenRules(d.steps, picks);
      prompt.textContent = `Sukkah ${k} of ${cfg.n}: is it fine, or which rule does it break?`;
      built.append(...describe(d.steps, picks).map((x) => A.h('li', {}, x)));
      const choices = [['fine', 'It keeps every rule'], ...Object.entries(RULE_NAMES)];
      area.replaceChildren(...choices.map(([id, label]) => button(A, card(A, null, label), (b) => {
        const right = id === 'fine' ? !broken.length : broken.includes(id);
        grade(A, right, { right: broken.length ? `Yes. ${d.rules[broken[0]]}` : 'Yes: this sukkah keeps every rule.', wrong: 'Look again at each line.' });
        if (right) { after.textContent = broken.length ? d.rules[broken[0]] : ''; lock(area); T.later(1200, name); } else { b.disabled = true; b.append(A.h('span', { class: 'g5-tag' }, ' ✗')); }
      })));
    };
    ({ build, spot, name })[cfg.mode]();
  }).catch(() => A.announce('The plans did not load. Check the connection and press Start again.'));
}

export const mount = mountG5(spec, setup);
