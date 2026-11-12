// @ts-check
// Sixty-Second Sprint (#/sprint60, D7): one minute, the learner's own lesson words, a combo multiplier for runs of right answers.
// The clock stops while the page is hidden. Logic: src/games/sprint60.model.js.
import { h, heSpan } from '../shell/ui.js';
import { recordScore } from './scores.js';
import { STORE_KEY, SPRINT_SECONDS, lessonPool, question, answer, starsFor, MAX_MULT } from './sprint60.model.js';
import { injectStyles } from './library.view.js';

export { STORE_KEY };

export function mount(root, ctx) {
  injectStyles();
  let alive = true, pool = null, st = null, left = SPRINT_SECONDS, timer = 0, q = null, rnd = Math.random, lastHe = '';
  const clock = ctx?.clock || { setInterval: (f, ms) => setInterval(f, ms), clearInterval: (id) => clearInterval(id) };
  const status = h('p', { role: 'status', 'aria-live': 'polite', class: 'gb-status' }, 'Getting your lesson words…');
  const hud = h('p', { class: 'gb-hud', 'aria-live': 'off' });
  const board = h('div', {});
  const get = (k) => { try { return ctx?.store?.get?.(k) ?? null; } catch { return null; } };
  const set = (k, v) => { try { ctx?.store?.set?.(k, v); } catch { /* storage full or blocked */ } };
  const stop = () => { if (timer) { clock.clearInterval(timer); timer = 0; } };
  const paintHud = () => { hud.textContent = `⏱ ${left}s · Score ${st?.score || 0} · Combo ×${st?.mult || 1}${st?.streak ? ` (${st.streak} in a row)` : ''}`; };

  function end() {
    stop();
    const stars = starsFor(st.right), prev = get(STORE_KEY) || {};
    set(STORE_KEY, { best: Math.max(prev.best || 0, st.score), plays: (prev.plays || 0) + 1, lastStars: stars });
    recordScore(ctx?.store, 'sprint60', st.score, stars);
    try { globalThis.document?.dispatchEvent?.(new CustomEvent('alef:game-finished', { detail: { stars } })); } catch { /* optional */ }
    board.replaceChildren(h('section', { class: 'card game-results', 'aria-labelledby': 's60-h' },
      h('h2', { id: 's60-h', tabindex: '-1' }, `Time! ${st.score} points`),
      h('p', { class: 'game-stars', 'aria-label': `${stars} of 3 stars` }, '★'.repeat(stars) + '☆'.repeat(3 - stars)),
      h('p', {}, `${st.right} right, ${st.wrong} wrong, longest run ${st.bestStreak}.`),
      h('p', { class: 'muted' }, prev.best ? (st.score > prev.best ? `New best: ${st.score - prev.best} more than your old best of ${prev.best}.` : `Your best: ${prev.best}.`) : 'Your first score here.'),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', onclick: begin }, 'One more minute'), h('a', { class: 'btn secondary', href: '#/game-library' }, 'Games Library'))));
    status.textContent = `Time is up: ${st.score} points.`;
    try { board.querySelector('h2')?.focus?.(); } catch { /* no focus */ }
  }
  function ask() {
    q = question(pool.words, rnd, lastHe); lastHe = q.target.he;
    board.replaceChildren(h('p', { class: 'gb-sprint-word' }, heSpan(q.target.he, 'he gb-big')),
      h('div', { class: 'gb-filters', role: 'group', 'aria-label': 'What does it mean?' }, ...q.options.map((o) => h('button', { type: 'button', class: 'btn secondary', onclick: () => pick(o) }, o.en))));
    try { board.querySelector('button')?.focus?.(); } catch { /* no focus */ }
  }
  function pick(o) {
    if (!timer && left > 0) return;
    const ok = o.en === q.target.en;
    st = answer(st, ok);
    status.textContent = ok ? `Right${st.mult > 1 ? `, combo ×${st.mult}` : ''}: +${st.gained}.` : `Not that one: ${q.target.he} means "${q.target.en}". The combo starts again.`;
    paintHud(); ask();
  }
  function begin() {
    stop(); st = { score: 0, streak: 0, right: 0, wrong: 0, bestStreak: 0, mult: 1, gained: 0 }; left = SPRINT_SECONDS; paintHud();
    timer = clock.setInterval(() => {
      if (!alive) return stop();
      if (globalThis.document?.hidden) return; // the clock waits while the page is hidden
      left -= 1; paintHud(); if (left <= 0) end();
    }, 1000);
    status.textContent = `Go! ${SPRINT_SECONDS} seconds. Three right in a row raises the combo, up to ×${MAX_MULT}.`;
    ask();
  }
  root.replaceChildren(h('article', { class: 'card game-card gb-lib' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Sixty-Second Sprint ', heSpan('דַּקָּה')),
    h('p', {}, 'A Hebrew word appears: pick its meaning. One minute. Every three right answers in a row raise your combo multiplier; a wrong answer resets it. Nothing is lost for a wrong answer.'),
    h('p', { class: 'muted' }, 'This is a timed game. For untimed review, use the five-minute ', h('a', { href: '#/sprint' }, 'Word Sprint'), ' or your lesson reviews.'),
    status, hud, board));
  (async () => {
    try {
      const r = await (ctx?.fetchFn ?? fetch)(new URL('../../data/curriculum/lessons.json', import.meta.url));
      if (!r || r.ok === false) throw new Error('lessons');
      const lessons = (await r.json()).lessons || [];
      if (!alive) return;
      const completed = get('curriculum.progress')?.completed || {};
      pool = lessonPool(lessons, completed);
      if (pool.words.length < 4) { status.textContent = 'Not enough lesson words to play yet.'; return; }
      status.textContent = pool.filled
        ? `You have not finished enough lessons yet, so the words come from the first reading lessons (${pool.fromLessons.join(', ')}).`
        : `${pool.words.length} words from your most recent lessons (${pool.fromLessons.slice(0, 4).join(', ')}${pool.fromLessons.length > 4 ? ' and more' : ''}).`;
      board.replaceChildren(h('button', { type: 'button', class: 'btn', onclick: begin }, 'Start the minute'));
    } catch { if (alive) status.textContent = 'The lesson words did not load. Check the connection and open the game again.'; }
  })();
  return () => { alive = false; stop(); };
}
