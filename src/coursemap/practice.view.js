/**
 * #/mixed-review (C3) and #/five-minutes (C7): two short sets built from the learner's own review cards, played with the lesson
 * quick-check player. Mixed review: the weakest reviewed cards. Daily set: due cards, one new item from the next open lesson, and
 * one game round. Answers update the review cards (right = Good, wrong = Again); the new item is practice only. No hearts, no XP;
 * the time shown at the end is measured.
 */
import { el, storeGet, storeSet, CARDS_KEY } from '../curriculum/dom.js';
import { lessons } from '../curriculum/lessons.js';
import { loadContent } from '../curriculum/content.js';
import { loadState } from '../curriculum/state.js';
import { mountQuiz } from '../curriculum/exercises.ui.js';
import { applyOutcomesToCards } from '../curriculum/progress.js';
import { fmtDuration } from '../curriculum/exercises.session.js';
import { weakestCards, questionsForCards, dailySet, outcomesFor } from './mixed.js';

export const MIXED_N = 8;

/** @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx) {
  const daily = ctx?.query?.set === 'daily' || ctx?.route?.name === 'five-minutes';
  let alive = true, off = () => {};
  const wrap = el('section', { class: 'alef-practice-set', 'aria-labelledby': 'view-title' });
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, daily ? 'Daily Five-Minute Set' : 'Mixed Review');
  const body = el('div', {}, el('p', {}, 'Building your set...'));
  wrap.append(h1, el('p', { class: 'muted' }, daily
    ? 'Your due review cards, one new item from your next lesson, and one game round. Five minutes is the aim, not a promise: your own time is shown at the end.'
    : `The ${MIXED_N} review cards you miss most, mixed together, from what you got wrong before. Right answers count as Good and wrong ones as Again in your review cards.`), body);
  root.append(wrap);
  (async () => {
    try {
      const [c, st] = await Promise.all([loadContent(), loadState(ctx)]);
      if (!alive) return;
      const tradition = ctx?.settings?.get?.('congregation') || 'sephardi', now = Date.now();
      let questions, set = null;
      if (daily) { set = dailySet({ cards: st.cards, completed: st.completed, lessons, content: c, now, tradition }); questions = [...set.due, ...(set.fresh ? [set.fresh] : [])]; }
      else questions = questionsForCards(weakestCards(st.cards, now, MIXED_N).map((x) => x.id), lessons, c, { tradition });
      if (!questions.length) {
        body.replaceChildren(el('p', { 'data-empty': '' }, daily ? 'Nothing is due and no new item is open right now.' : 'Not enough review history yet. Finish a lesson and review its cards, then your weakest ones show up here.'),
          set?.game ? el('p', {}, el('a', { class: 'btn', href: set.game.href }, set.game.label)) : null,
          el('p', {}, el('a', { class: 'btn secondary', href: '#/learn' }, 'All lessons')));
        return;
      }
      const host = el('div', {});
      const plan = daily ? el('ol', { class: 'alef-set-plan' },
        el('li', {}, set.due.length ? `${set.due.length} due review card${set.due.length === 1 ? '' : 's'}` : 'No review cards are due today'),
        el('li', {}, set.fresh ? `One new item from ${set.next.id}, ${set.next.title} (practice only, not saved to your cards)` : 'No new item: no open lesson has one'),
        el('li', {}, set.game ? `One game round: ${set.game.label}, after the questions` : 'No game round yet: finish a lesson first')) : null;
      body.replaceChildren(...[plan, host].filter(Boolean));
      off = mountQuiz(host, { questions, ctx, onFinish: async ({ stats, results, ms }) => {
        let saved = 0;
        try {
          const cards = await storeGet(ctx, CARDS_KEY, {}), outs = outcomesFor(questions, results);
          if (outs.length) { await storeSet(ctx, CARDS_KEY, applyOutcomesToCards(cards, outs, Date.now())); saved = outs.length; }
        } catch { if (alive) host.append(el('p', { role: 'alert' }, 'Your answers could not be saved to your review cards.')); }
        if (!alive) return;
        const missed = questions.filter((q) => results[q.id] === false);
        host.replaceChildren(el('h2', { id: 'alef-int-ex', tabindex: '-1' }, 'Set Finished'),
          el('p', { role: 'status' }, `${stats.right} of ${questions.length} right on the first try. Time: ${fmtDuration(ms)} (measured).`),
          el('p', { class: 'muted' }, `${saved} review card${saved === 1 ? '' : 's'} updated.`),
          missed.length ? el('div', {}, el('p', {}, 'Still tricky:'), el('ul', {}, ...missed.map((q) => el('li', {}, `${q.promptHe ? q.promptHe + ' ' : ''}${q.options[q.answerIndex].text} (from ${q.from})`)))) : null,
          el('div', { class: 'row' },
            set?.game ? el('a', { class: 'btn', href: set.game.href }, `Game round: ${set.game.label}`) : null,
            el('a', { class: set?.game ? 'btn secondary' : 'btn', href: daily ? '#/mixed-review' : '#/five-minutes' }, daily ? 'Mixed review' : 'Daily five-minute set'),
            el('a', { class: 'btn secondary', href: '#/learn' }, 'All lessons')));
        host.querySelector?.('#alef-int-ex')?.focus?.();
      } });
    } catch { if (alive) body.replaceChildren(el('p', { role: 'alert' }, 'This set could not be built. Reload; nothing was lost.')); }
  })();
  return () => { alive = false; off(); wrap.remove(); };
}
