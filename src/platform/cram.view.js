// H3 Cram (#/cram): "I have N minutes". Shows what a session of that length would hold, then opens the lesson review with it
// (#/learn?review=1&minutes=N, src/curriculum/review.view.js). Sized by the learner's own measured pace once known.
import { h } from '../shell/ui.js';
import { cramQueue, paceOf, isLeech, PACE_KEY, PACE_MIN } from './srs-tools.js';

const CHOICES = [5, 10, 15, 20, 30];

export function mount(root, ctx) {
  let cards = {}, pace = paceOf(null);
  try { const c = ctx?.store?.get?.('srs.cards', {}); cards = Array.isArray(c) ? Object.fromEntries(c.filter((x) => x?.id).map((x) => [x.id, x])) : c || {}; } catch { /* none */ }
  try { pace = paceOf(ctx?.store?.get?.(PACE_KEY, null)); } catch { /* estimate */ }
  const now = Date.now();
  const answered = Object.values(cards).filter((c) => c && c.state !== 'new' && c.lastReview != null);
  const leeches = answered.filter(isLeech).length;
  const list = h('ul', {}, ...CHOICES.map((m) => {
    const q = cramQueue(cards, now, m, pace.seconds);
    return h('li', {}, q.ids.length
      ? h('a', { class: 'btn', href: `#/learn?review=1&minutes=${m}` }, `${m} minutes`)
      : h('span', { class: 'btn secondary', 'aria-disabled': 'true' }, `${m} minutes`),
    ' ', h('span', { class: 'muted' }, q.ids.length ? `${q.ids.length} card${q.ids.length === 1 ? '' : 's'}: ${q.due} due, ${q.weak} not due yet but weak` : 'nothing to review yet'));
  }));
  root.append(h('section', { class: 'card', 'aria-labelledby': 'view-title' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Cram'),
    h('p', {}, 'Pick the time you have. The session takes your due review cards first (most overdue first), then cards that are not due yet but weak: ones you have missed five times or more, then the ones the scheduler gives the lowest chance of remembering (under 85%).'),
    h('p', {}, pace.measured ? `Sized by your own pace: about ${Math.round(pace.seconds)} seconds a card, measured on your last ${pace.n} reviewed cards.` : `Sized by an estimate of ${Math.round(pace.seconds)} seconds a card until ${PACE_MIN} of your reviews have been timed (${pace.n} so far).`),
    h('p', {}, `Lesson review cards: ${answered.length} answered at least once${leeches ? `, ${leeches} missed five times or more (these come the other way round in review)` : ''}.`),
    list,
    h('p', { class: 'muted' }, 'Cram uses the lesson review cards. Dictionary, word tracing and Sound like a local keep their own reviews on their pages.')));
  return () => {};
}
