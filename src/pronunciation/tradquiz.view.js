/**
 * Which tradition is this? (#/tradition-quiz): an eye quiz. A reading (IPA, or the Latin respelling) is shown and the learner picks
 * Israeli / Sephardi / Ashkenazi. Ten questions per round, scored, kind feedback with the rule that explains the difference.
 * Store key "pron.quiz.v1": {rounds, best, last:{score,total}, byCode:{code:{right,seen}}}.
 * No audio: there are no recordings and no browser voice for the Sephardi or Ashkenazi readings (the screen says so).
 * Rule-generated, unverified by a native speaker. ctx extras for tests: ctx.compareData {quiz, reasons}, ctx.rng.
 */
import { TRADITION_LABELS, NOTICE, TRADITIONS } from './compare.model.js';
import { createLoader } from './lookup.js';
import { buildQuiz, isCorrect, applyRound, weakCodes, optionLabel, NOTE, QUIZ_KEY, QUESTIONS } from './tradquiz.model.js';

const CSS = `
.alef-tq{max-inline-size:40rem;margin-inline:auto;overflow-wrap:anywhere}
.alef-tq *{box-sizing:border-box;max-inline-size:100%}
.alef-tq button{min-block-size:var(--tap,48px);inline-size:100%;font:inherit;padding:.5rem .9rem;margin-block:.3rem;white-space:normal}
.alef-tq .tq-shown{font-size:2rem;direction:ltr;text-align:center;margin-block:.75rem}
.alef-tq .tq-he{font-size:2rem;text-align:center}
.alef-tq .tq-opts{display:grid;gap:.4rem}
.alef-tq .tq-flag{border-inline-start:6px solid currentColor;padding-inline-start:.5rem}
.alef-tq :focus-visible{outline:3px solid currentColor;outline-offset:2px}
`;

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} */
export function mount(root, ctx) {
  const doc = root.ownerDocument || globalThis.document;
  const h = (tag, attrs = {}, ...kids) => {
    const n = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; n.setAttribute(k, v === true ? '' : String(v)); }
    for (const kid of kids.flat(Infinity)) { if (kid == null || kid === false) continue; n.append(typeof kid === 'string' ? doc.createTextNode(kid) : kid); }
    return n;
  };
  const rng = ctx?.rng || Math.random;
  const loader = createLoader(ctx);
  let alive = true, pool = null, reasons = null, stored = {}, qs = [], qi = 0, results = [];

  const title = h('h1', { id: 'view-title', tabindex: '-1' }, 'Which tradition is this?');
  const status = h('div', { role: 'status', 'aria-live': 'polite' });
  const body = h('div', {});
  const wrap = h('section', { class: 'alef-tq', 'aria-labelledby': 'view-title' }, title, h('p', { class: 'tq-flag', role: 'note' }, NOTICE), body, status);
  const style = h('style', {}, CSS);
  root.append(style, wrap);
  const setBody = (...n) => body.replaceChildren(...n.flat().filter(Boolean));
  const say = (t) => status.replaceChildren(doc.createTextNode(t));
  const btn = (label, fn, attrs = {}) => { const b = h('button', { type: 'button', ...attrs }, label); b.addEventListener('click', fn); return b; };

  function start() {
    qs = buildQuiz(pool, rng, QUESTIONS); qi = 0; results = [];
    if (!qs.length) { setBody(h('p', { role: 'alert' }, 'There are no questions available right now.')); return; }
    ask();
  }
  function renderStart() {
    const weak = weakCodes(stored, Object.fromEntries(Object.entries(reasons.codes).map(([c, v]) => [c, v.text])));
    setBody(
      h('p', {}, `${QUESTIONS} questions. A reading is shown; pick the tradition it belongs to. Wrong answers are never held against you: you see why and move on.`),
      h('p', { class: 'tq-flag' }, NOTE),
      stored.rounds ? h('p', {}, `Rounds played: ${stored.rounds}. Best score: ${stored.best} of ${stored.last?.total ?? QUESTIONS}. Last: ${stored.last?.score} of ${stored.last?.total}.`) : null,
      weak.length ? h('div', {}, h('p', {}, 'Worth another look:'), h('ul', {}, weak.map((w) => h('li', {}, reasons.codes[w.code].text)))) : null,
      btn('Start', start, { 'data-act': 'start' }),
    );
    say('Ready.');
  }
  function ask() {
    const q = qs[qi];
    const opts = q.options.map((o) => btn(optionLabel(o), () => answer(o), { 'data-option': o }));
    setBody(
      h('p', {}, `Question ${qi + 1} of ${qs.length}`),
      h('p', { class: 'tq-he', dir: 'rtl', lang: 'he' }, q.word.h),
      h('p', { class: 'tq-shown', dir: 'ltr', lang: q.mode === 'ipa' ? 'und-fonipa' : 'en' }, q.text),
      h('p', {}, q.mode === 'ipa' ? 'Which tradition reads it with these sounds?' : 'Which tradition would respell it this way?'),
      h('div', { class: 'tq-opts', role: 'group', 'aria-label': 'Choose the tradition' }, opts),
    );
    say(`Question ${qi + 1} of ${qs.length}.`);
  }
  function answer(choice) {
    const q = qs[qi];
    const ok = isCorrect(q, choice);
    const codes = (q.word.c ? q.word.c.split(' ') : []).filter((c) => reasons.codes[c]);
    results.push({ ok, codes });
    const why = codes.map((c) => reasons.codes[c].text);
    const last = qi === qs.length - 1;
    setBody(
      h('p', { class: ok ? '' : 'tq-flag', role: 'status' }, ok ? 'Yes.' : `Not this time. It was ${optionLabel(q.answer).replace(/ \(.*\)$/, '')}.`),
      h('p', { class: 'tq-he', dir: 'rtl', lang: 'he' }, q.word.h),
      h('p', {}, q.word.g),
      h('ul', {}, TRADITIONS.map((t, i) => h('li', {}, `${TRADITION_LABELS[t]}: `, h('span', { dir: 'ltr', lang: 'und-fonipa' }, q.word.i[i]), ' / ', h('span', { dir: 'ltr' }, q.word.s[t === 'ashkenazi' ? 1 : 0])))),
      why.length ? h('div', {}, h('p', {}, 'Why they differ (rule-generated):'), h('ul', {}, why.map((w) => h('li', {}, w)))) : null,
      btn(last ? 'See my score' : 'Next', last ? finish : () => { qi++; ask(); }, { 'data-act': 'next' }),
    );
    say(ok ? 'Correct.' : 'Not this time.');
  }
  async function finish() {
    stored = applyRound(stored, results);
    try { if (ctx?.store?.set) await ctx.store.set(QUIZ_KEY, stored); } catch { /* best effort */ }
    if (!alive) return;
    setBody(
      h('h2', {}, `${stored.last.score} of ${stored.last.total}`),
      h('p', {}, stored.last.score === stored.best ? 'That is your best round so far.' : `Your best is ${stored.best}.`),
      btn('Play again', start, { 'data-act': 'again' }),
    );
    say(`Round finished: ${stored.last.score} of ${stored.last.total}.`);
  }

  (async () => {
    say('Loading...');
    try {
      const [q, r] = await Promise.all([loader.json('quiz-pool.json'), loader.json('reasons.json')]);
      pool = q.pool; reasons = r;
      const s = ctx?.store?.get ? await ctx.store.get(QUIZ_KEY) : null;
      stored = s && typeof s === 'object' ? s : {};
    } catch {
      if (alive) setBody(h('p', { role: 'alert' }, 'The quiz words could not be loaded. Check your connection and reload; nothing was lost.'));
      return;
    }
    if (alive) renderStart();
  })();

  return () => { alive = false; wrap.remove?.(); style.remove?.(); };
}
